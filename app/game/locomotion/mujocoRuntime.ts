import type { BodyGroup } from '@/app/admin/_lib/types'
import type { SimConfig } from '@/app/admin/animate/animateStore'
import { buildMjcf, MjcfMeta } from './mjcf'
import { buildSkeletonTree, flattenSkeleton } from './chain'
import {
  buildCpgSpec,
  initCpgState,
  stepCpg,
  oscillatorOutput,
  girdleClockPhase,
  signedActivation,
  CpgSpec,
  CpgState,
} from './cpg'
import { createDelayBuffer, pushAndReadDelayed, GAMMA, MuscleDelayBuffer } from './muscles'

// The MuJoCo WASM engine, loaded once in the browser. Both the glue (`mujoco.js`) and the `.wasm` are
// served from public/mujoco/ and loaded at RUNTIME — the glue via a bundler-ignored dynamic import so
// neither webpack nor Turbopack tries to parse its Node built-in imports (`module`/`fs`/…), and the
// wasm handed to the factory as `wasmBinary`. The type is taken from the (type-only, never bundled)
// package import.
type MujocoModule = Awaited<ReturnType<Awaited<typeof import('@mujoco/mujoco')>['default']>>

let enginePromise: Promise<MujocoModule> | null = null

export function loadMujocoEngine(): Promise<MujocoModule> {
  if (!enginePromise) {
    enginePromise = (async () => {
      // @ts-expect-error — '/mujoco/mujoco.js' is served from public/ and loaded at runtime, not bundled
      const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '/mujoco/mujoco.js')
      const factory = (mod as { default: (opts: { wasmBinary: ArrayBuffer }) => Promise<MujocoModule> }).default
      const resp = await fetch('/mujoco/mujoco.wasm')
      if (!resp.ok) throw new Error(`failed to fetch mujoco.wasm: ${resp.status}`)
      const wasmBinary = await resp.arrayBuffer()
      return factory({ wasmBinary })
    })()
  }
  return enginePromise
}

const TIMESTEP = 1 / 120
const CPG_TO_MUSCLE_GAIN = 1
const GRIP_FOOT_BY_LIMB = ['FL', 'FR', 'BL', 'BR'] as const
const OBJ = { BODY: 1, JOINT: 3, SITE: 6, ACTUATOR: 19 }
// MuJoCo per-actuator parameter strides (mjNGAIN / mjNBIAS). A `<position>` servo stores kp in
// gainprm[0] and (−kp, −kv) in biasprm[1..2]; writing those live restiffens the leg servos without a
// model rebuild.
const NGAIN = 10
const NBIAS = 10
// Grip = a stiff foot-point spring toward the captured plant point (the app's spherical-joint pin
// analogue), applied via xfrc_applied. Tuned in Phase 0: stiffer than ~1500 is unstable under
// explicit application at 1/120; K≈300 / D≈10 holds the foot and stays stable.
const K_GRIP = 300
const D_GRIP = 10
// Anisotropic swimming drag (paper Fig 6 forward thrust): resist across-body motion far more than
// along-body, so the undulation nets forward travel. Same coefficients as the Rapier path
// (environment.ts) but applied as an explicit resistive FORCE via xfrc_applied (F = −C·L·v_component)
// rather than velocity damping — MuJoCo's reduced coordinates have no per-body setLinvel. Velocity is a
// one-step finite difference of the trunk body position; the implicitfast integrator keeps it stable.
const DRAG_NORMAL = 0.6
const DRAG_TANGENT = 0.05
// Roll/pitch damping on the free-base rotational DOFs (local X = roll, local Z = pitch; local Y = yaw is
// left free for turning). The frictionless contacts give the body no roll damping, so it rocks/vibrates
// about its long axis; this adds it. Set as dof_damping (integrated IMPLICITLY by implicitfast → stable
// at any magnitude, unlike an explicit force). Terrain-neutral — it damps the body, not the ground.
const ROLL_DAMP = 12
const PITCH_DAMP = 6
// Init settle: step the freshly-built model this many ticks at rest (zero ctrl) so it comes to rest on
// its contacts before the animation starts — removes the startup roll bounce.
const SETTLE_STEPS = 60

// axialChain replicated from body3d.ts (kept off RAPIER so this module doesn't pull the Rapier engine).
function axialChain(groups: BodyGroup[]): { lengths: number[]; groupIds: string[] } {
  const chain = flattenSkeleton(buildSkeletonTree(groups))
  const lengths: number[] = []
  const groupIds: string[] = []
  for (let i = 0; i < chain.length; i++) {
    const g = chain[i]
    const parent = i > 0 ? chain[i - 1] : null
    const n = parent ? parent.nodeBack : (g.nodeFront ?? g.nodeBack)
    const e = g.nodeBack
    if (!n || !e) continue
    const dx = e.x - n.x
    const dy = (e.y ?? 0) - (n.y ?? 0)
    const dz = e.z - n.z
    lengths.push(Math.max(Math.hypot(dx, dy, dz), 1e-3))
    groupIds.push(g.id)
  }
  return { lengths, groupIds }
}

const num = (v: unknown, d: number): number => (typeof v === 'number' ? v : d)
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)

export interface BodyTransform {
  groupId: string
  pos: [number, number, number]
  quat: [number, number, number, number] // three.js order (x,y,z,w)
  restCenter: [number, number, number]
}

interface SpineDrive {
  k: number
  qadr: number
  act: number
  capF: number
  capB: number
}
interface LegDrive {
  limbIdx: number
  leg: string
  groupId: string
  liftAct: number
  sweepAct: number
  capStance: number
  capSwing: number
  liftSign: number
  legBody: number
  hipBody: number
  footSite: number
  planted: boolean
  pin: [number, number, number]
  footPrev: [number, number, number]
}
interface TrunkDrag {
  body: number
  L: number
  prev: [number, number, number] | null
}

export interface MjDiag {
  kineticEnergy: number
  comX: number
  comZ: number
  comDriftFromStart: number
  maxJointFracOfCap: number
  comYDrift: number
  maxTiltDeg: number
}

export interface MjLegObs {
  leg: string
  limbIdx: number
  groupId: string
  phase: number
  hipX: number
  footX: number
  footY: number
  footZ: number
}

// A reduced-coordinate locomotion driver: a MuJoCo model compiled from the node skeleton, driven by
// the real CPG through the Ekeberg-equilibrium spine servo, gait leg servos, and the grip spring —
// the exact logic validated offline in Phase 0. Step it from the studio's fixed-1/120 accumulator.
export class MujocoLocomotion {
  private cpgSpec: CpgSpec
  private cpgState: CpgState
  private delays: MuscleDelayBuffer[]
  private spine: SpineDrive[]
  private legs: LegDrive[]
  private trunkDrag: TrunkDrag[]
  private bodyOf: { groupId: string; body: number; restCenter: [number, number, number] }[]
  private nodeBodies: number[]
  private nodeGroupIds: string[]
  private nodeSegLength: number[]
  private rootBody: number
  private simTime = 0
  private diagPrevNodes: number[][] | null = null
  private diagPrevT = 0
  private gainprm: Float64Array
  private biasprm: Float64Array
  private legGain = { lift: -1, sweep: -1, damp: -1 }
  private qpos: Float64Array
  private ctrl: Float64Array
  private siteXpos: Float64Array
  private xfrc: Float64Array
  private xipos: Float64Array
  private xpos: Float64Array
  private xquat: Float64Array

  constructor(
    private mujoco: MujocoModule,
    private model: ReturnType<MujocoModule['MjModel']['from_xml_string']>,
    private data: InstanceType<MujocoModule['MjData']>,
    meta: MjcfMeta,
    groups: BodyGroup[]
  ) {
    const axial = axialChain(groups)
    const limbsOn = groups.some((g) => g.type === 'leg-left' || g.type === 'leg-right')
    this.cpgSpec = buildCpgSpec(axial.lengths, groups, axial.groupIds, false)
    void limbsOn
    this.cpgState = initCpgState(this.cpgSpec)
    this.delays = meta.spineJoints.map(() => createDelayBuffer(TIMESTEP))

    const id = (t: number, name: string): number => mujoco.mj_name2id(model, t, name)
    const jntQadr = model.jnt_qposadr as unknown as Int32Array
    this.spine = meta.spineJoints.map((j) => ({
      k: j.childIndex,
      qadr: jntQadr[id(OBJ.JOINT, j.name)],
      act: id(OBJ.ACTUATOR, j.actuator),
      capF: j.capForward,
      capB: j.capBackward,
    }))
    this.legs = meta.legs.map((l) => ({
      limbIdx: l.limbIdx,
      leg: GRIP_FOOT_BY_LIMB[l.limbIdx] ?? `L${l.limbIdx}`,
      groupId: l.groupId,
      liftAct: id(OBJ.ACTUATOR, l.liftActuator),
      sweepAct: id(OBJ.ACTUATOR, l.sweepActuator),
      capStance: l.capStance,
      capSwing: l.capSwing,
      liftSign: l.liftSign,
      legBody: id(OBJ.BODY, l.legBody),
      hipBody: id(OBJ.BODY, `seg${l.parentSegIndex}`),
      footSite: id(OBJ.SITE, l.footSite),
      planted: false,
      pin: [0, 0, 0],
      footPrev: [0, 0, 0],
    }))
    this.bodyOf = meta.segmentBodies.map((s) => ({ groupId: s.groupId, body: id(OBJ.BODY, s.body), restCenter: s.restCenter }))

    // Observation infrastructure (harness parity): the per-node render/spec list, the trunk drag bodies
    // with their segment lengths, and the root body used for tilt. `axial` maps each trunk group to its
    // segment length; leg nodes get length 0 (unused by the reports).
    const Lmap = new Map<string, number>()
    for (let i = 0; i < axial.groupIds.length; i++) Lmap.set(axial.groupIds[i], axial.lengths[i])
    this.nodeBodies = meta.segmentBodies.map((s) => id(OBJ.BODY, s.body))
    this.nodeGroupIds = meta.segmentBodies.map((s) => s.groupId)
    this.nodeSegLength = meta.segmentBodies.map((s) => Lmap.get(s.groupId) ?? 0)
    this.trunkDrag = meta.segmentBodies
      .filter((s) => Lmap.has(s.groupId))
      .map((s) => ({ body: id(OBJ.BODY, s.body), L: Lmap.get(s.groupId) ?? 0.1, prev: null }))
    this.rootBody = id(OBJ.BODY, meta.segmentBodies[0].body)

    // Damp the free-base roll (local X) + pitch (local Z) DOFs so the body doesn't rock/vibrate on the
    // frictionless contacts. The freejoint's 6 DOFs are [tx,ty,tz, rx,ry,rz] starting at the root joint's
    // dofadr; ry (local Y = yaw) is left undamped for turning. dof_damping is integrated implicitly.
    const jntDofadr = model.jnt_dofadr as unknown as Int32Array
    const bodyJntadr = model.body_jntadr as unknown as Int32Array
    const dofDamping = model.dof_damping as unknown as Float64Array
    const rootDof = jntDofadr[bodyJntadr[this.rootBody]]
    dofDamping[rootDof + 3] = ROLL_DAMP
    dofDamping[rootDof + 5] = PITCH_DAMP

    this.gainprm = model.actuator_gainprm as unknown as Float64Array
    this.biasprm = model.actuator_biasprm as unknown as Float64Array
    this.qpos = data.qpos as unknown as Float64Array
    this.ctrl = data.ctrl as unknown as Float64Array
    this.siteXpos = data.site_xpos as unknown as Float64Array
    this.xfrc = data.xfrc_applied as unknown as Float64Array
    this.xipos = data.xipos as unknown as Float64Array
    this.xpos = data.xpos as unknown as Float64Array
    this.xquat = data.xquat as unknown as Float64Array
  }

  // Advance one fixed 1/120 tick under the given config (the studio's live SimConfig).
  step(cfg: SimConfig): void {
    const spec = this.cpgSpec
    const state = this.cpgState
    const drive = num(cfg.cpgDrive, 0.4)
    const exc = num(cfg.cpgExcitability, 1)
    const alpha = num(cfg.muscleAlpha, 11)
    const beta = num(cfg.muscleBeta, 35)
    const stepEnabled = bool(cfg.stepEnabled, true)
    const sweepAmount = num(cfg.sweepAmount, 0)
    const liftAmount = num(cfg.liftAmount, 0)
    const gripEnabled = bool(cfg.gripEnabled, false)
    const environmentEnabled = bool(cfg.environmentEnabled, false)
    const gripShift = num(cfg.gripShift, 0.61)
    const gripDuration = num(cfg.gripDuration, 0.5)
    const stepDuty = Math.min(0.95, Math.max(0.05, gripDuration))
    const gripFeet = (cfg.gripFeet ?? { FL: false, FR: false, BL: false, BR: false }) as Record<string, boolean>

    // Leg servo stiffness/damping from the live config (lift = legStiffness, sweep = sweepSpeed, both
    // damped by legDamping) — written into the actuator gain/bias params, not the fixed MJCF kp. This is
    // what makes the legs rigid pegs; the reduced-coordinate solver stays stable at high, CONSTANT gain
    // (only rewritten when a value actually changes, never per-step, to keep the linearization fresh).
    const liftKp = num(cfg.legStiffness, 40)
    const sweepKp = num(cfg.sweepSpeed, 40)
    const legKv = num(cfg.legDamping, 3)
    if (liftKp !== this.legGain.lift || sweepKp !== this.legGain.sweep || legKv !== this.legGain.damp) {
      for (const lg of this.legs) {
        this.setPosGain(lg.liftAct, liftKp, legKv)
        this.setPosGain(lg.sweepAct, sweepKp, legKv)
      }
      this.legGain = { lift: liftKp, sweep: sweepKp, damp: legKv }
    }

    stepCpg(
      state,
      spec,
      drive,
      exc,
      TIMESTEP,
      num(cfg.frontDrive, 0),
      num(cfg.frontSegments, 0),
      num(cfg.turnBias, 0),
      num(cfg.limbDrive, 0),
      undefined,
      num(cfg.feedbackIpsi, 0),
      num(cfg.feedbackContra, 0)
    )

    // spine: Ekeberg equilibrium angle φEq → fixed-gain position servo (target only; gains from MJCF)
    for (let i = 0; i < this.spine.length; i++) {
      const sp = this.spine[i]
      const mL = oscillatorOutput(state, sp.k) * CPG_TO_MUSCLE_GAIN
      const mR = oscillatorOutput(state, sp.k + spec.n) * CPG_TO_MUSCLE_GAIN
      const d = pushAndReadDelayed(this.delays[i], mL, mR)
      const kStiff = beta * (d.mL + d.mR + GAMMA)
      this.ctrl[sp.act] = kStiff > 1e-9 ? (alpha * (d.mL - d.mR)) / kStiff : 0
    }

    // legs: sweep/lift position targets from the gait clock (girdle CPG phase)
    for (const lg of this.legs) {
      if (!stepEnabled) {
        this.ctrl[lg.sweepAct] = 0
        this.ctrl[lg.liftAct] = 0
        continue
      }
      const ph = girdleClockPhase(state, spec, lg.limbIdx)
      const rel = (((ph - gripShift) % 1) + 1) % 1
      const amt = Math.min(1, Math.max(0, sweepAmount))
      const fwd = lg.capStance
      const back = lg.capSwing
      let sweep: number
      let lift = 0
      if (rel < stepDuty) {
        sweep = fwd - (rel / stepDuty) * (fwd + back)
      } else {
        const t = (rel - stepDuty) / (1 - stepDuty)
        sweep = -back + t * (fwd + back)
        lift = liftAmount * Math.sin(Math.PI * t)
      }
      this.ctrl[lg.sweepAct] = sweep * amt
      this.ctrl[lg.liftAct] = lg.liftSign * lift
    }

    // grip: stiff foot-point spring toward the captured pin, on the gait clock
    if (gripEnabled) {
      for (const lg of this.legs) {
        const bid = lg.legBody
        const selected = gripFeet[GRIP_FOOT_BY_LIMB[lg.limbIdx]] ?? false
        const ph = girdleClockPhase(state, spec, lg.limbIdx)
        const rel = (((ph - gripShift) % 1) + 1) % 1
        const gripping = selected && rel < gripDuration
        const fx = this.siteXpos[3 * lg.footSite]
        const fy = this.siteXpos[3 * lg.footSite + 1]
        const fz = this.siteXpos[3 * lg.footSite + 2]
        if (gripping) {
          if (!lg.planted) {
            lg.pin = [fx, fy, fz]
            lg.footPrev = [fx, fy, fz]
            lg.planted = true
          }
          const vx = (fx - lg.footPrev[0]) / TIMESTEP
          const vy = (fy - lg.footPrev[1]) / TIMESTEP
          const vz = (fz - lg.footPrev[2]) / TIMESTEP
          const Fx = K_GRIP * (lg.pin[0] - fx) - D_GRIP * vx
          const Fy = K_GRIP * (lg.pin[1] - fy) - D_GRIP * vy
          const Fz = K_GRIP * (lg.pin[2] - fz) - D_GRIP * vz
          const rx = fx - this.xipos[3 * bid]
          const ry = fy - this.xipos[3 * bid + 1]
          const rz = fz - this.xipos[3 * bid + 2]
          this.xfrc[6 * bid] = Fx
          this.xfrc[6 * bid + 1] = Fy
          this.xfrc[6 * bid + 2] = Fz
          this.xfrc[6 * bid + 3] = ry * Fz - rz * Fy
          this.xfrc[6 * bid + 4] = rz * Fx - rx * Fz
          this.xfrc[6 * bid + 5] = rx * Fy - ry * Fx
          lg.footPrev = [fx, fy, fz]
        } else {
          lg.planted = false
          for (let c = 0; c < 6; c++) this.xfrc[6 * bid + c] = 0
        }
      }
    } else {
      // Grip fully off: clear any leftover foot force so a previously-gripped foot exerts nothing.
      for (const lg of this.legs) {
        lg.planted = false
        for (let c = 0; c < 6; c++) this.xfrc[6 * lg.legBody + c] = 0
      }
    }

    // Anisotropic drag on the trunk segments (swim thrust). Force = −C·L·v per along/across component,
    // v from a one-step finite difference of the body position. Cleared when drag is off.
    for (const td of this.trunkDrag) {
      const b = td.body
      const px = this.xpos[3 * b]
      const py = this.xpos[3 * b + 1]
      const pz = this.xpos[3 * b + 2]
      if (environmentEnabled) {
        if (td.prev) {
          const vx = (px - td.prev[0]) / TIMESTEP
          const vy = (py - td.prev[1]) / TIMESTEP
          const vz = (pz - td.prev[2]) / TIMESTEP
          const w = this.xquat[4 * b]
          const qx = this.xquat[4 * b + 1]
          const qy = this.xquat[4 * b + 2]
          const qz = this.xquat[4 * b + 3]
          // segment long axis (local +x) in world
          const fx = 1 - 2 * (qy * qy + qz * qz)
          const fy = 2 * (qx * qy + w * qz)
          const fz = 2 * (qx * qz - w * qy)
          const vPar = vx * fx + vy * fy + vz * fz
          const perpX = vx - vPar * fx
          const perpY = vy - vPar * fy
          const perpZ = vz - vPar * fz
          this.xfrc[6 * b] = -DRAG_TANGENT * td.L * vPar * fx - DRAG_NORMAL * td.L * perpX
          this.xfrc[6 * b + 1] = -DRAG_TANGENT * td.L * vPar * fy - DRAG_NORMAL * td.L * perpY
          this.xfrc[6 * b + 2] = -DRAG_TANGENT * td.L * vPar * fz - DRAG_NORMAL * td.L * perpZ
          this.xfrc[6 * b + 3] = 0
          this.xfrc[6 * b + 4] = 0
          this.xfrc[6 * b + 5] = 0
        }
        td.prev = [px, py, pz]
      } else {
        if (td.prev) for (let c = 0; c < 6; c++) this.xfrc[6 * b + c] = 0
        td.prev = null
      }
    }

    this.mujoco.mj_step(this.model, this.data)
    this.simTime += TIMESTEP
  }

  // ── Observation (harness parity) ────────────────────────────────────────────────────────────────
  // Sim time (seconds) advanced by step(); mirrors the Rapier handle's simTime for diagnostics.
  get time(): number {
    return this.simTime
  }

  // Node-capture spec: one entry per rig group (trunk segments then legs), matching nodePositions order.
  nodeSpec(): { count: number; groupIds: string[]; segLength: number[] } {
    return { count: this.nodeBodies.length, groupIds: this.nodeGroupIds, segLength: this.nodeSegLength }
  }

  // Every rig group's world origin (x,y,z) — the per-node skeleton the top-down harness render reads.
  nodePositions(): { x: number; y: number; z: number }[] {
    return this.nodeBodies.map((b) => ({ x: this.xpos[3 * b], y: this.xpos[3 * b + 1], z: this.xpos[3 * b + 2] }))
  }

  // Instantaneous roll of the trunk about its long (forward) axis, in degrees — signed. Read every frame
  // so the harness can peak-hold it and count reversals (the roll rocking/vibration the once/sec tilt
  // sample can't resolve). 0 = upright; ± = rolled left/right. Derived from the root body's up-axis
  // (local +Y in world): roll = atan2(up.z, up.y).
  rollDegNow(): number {
    const rb = this.rootBody
    const w = this.xquat[4 * rb]
    const x = this.xquat[4 * rb + 1]
    const y = this.xquat[4 * rb + 2]
    const z = this.xquat[4 * rb + 3]
    const upY = 1 - 2 * (x * x + z * z)
    const upZ = 2 * (y * z + w * x)
    return (Math.atan2(upZ, upY) * 180) / Math.PI
  }

  // Instantaneous worst spine-joint fraction of its angle cap — read every frame for a peak-hold so the
  // harness can report the TRUE peak over a run (the once/sec diag sample aliases the wave period).
  capFracNow(): number {
    let m = 0
    for (const sp of this.spine) {
      const ang = this.qpos[sp.qadr]
      const cap = ang >= 0 ? sp.capF : sp.capB
      const frac = cap > 1e-6 ? Math.abs(ang) / cap : 0
      if (frac > m) m = frac
    }
    return m
  }

  // Per-axial-segment signed CPG activation (left−right) — the neural signal, distinct from curvature.
  cpgSigned(): number[] {
    const out: number[] = []
    for (let k = 0; k < this.cpgSpec.n; k++) out.push(signedActivation(this.cpgState, this.cpgSpec, k))
    return out
  }

  // Per-leg gait phase + world hip/foot fore-aft positions, for the harness grip/sweep timing + reach
  // reports. Phase is the girdle CPG clock (the same clock the grip/sweep controller uses).
  legObs(): MjLegObs[] {
    return this.legs.map((lg) => ({
      leg: lg.leg,
      limbIdx: lg.limbIdx,
      groupId: lg.groupId,
      phase: girdleClockPhase(this.cpgState, this.cpgSpec, lg.limbIdx),
      hipX: this.xpos[3 * lg.hipBody],
      footX: this.siteXpos[3 * lg.footSite],
      footY: this.siteXpos[3 * lg.footSite + 1],
      footZ: this.siteXpos[3 * lg.footSite + 2],
    }))
  }

  // The same diagnostics the Rapier path publishes: COM drift, a kinetic-energy proxy (node-velocity
  // finite difference, for explosion detection), the worst spine-joint fraction of its angle cap (the
  // clip guard), vertical COM drift, and body tilt. `base` is the COM captured at the first frame.
  diag(base: [number, number, number]): MjDiag {
    const nodes = this.nodePositions()
    const nInv = 1 / Math.max(1, nodes.length)
    let cx = 0, cy = 0, cz = 0
    for (const n of nodes) { cx += n.x; cy += n.y; cz += n.z }
    cx *= nInv; cy *= nInv; cz *= nInv

    let ke = 0
    if (this.diagPrevNodes) {
      const dt = Math.max(1e-4, this.simTime - this.diagPrevT)
      for (let i = 0; i < nodes.length; i++) {
        const p = this.diagPrevNodes[i]
        const vx = (nodes[i].x - p[0]) / dt
        const vy = (nodes[i].y - p[1]) / dt
        const vz = (nodes[i].z - p[2]) / dt
        ke += 0.5 * (vx * vx + vy * vy + vz * vz)
      }
    }
    this.diagPrevNodes = nodes.map((n) => [n.x, n.y, n.z])
    this.diagPrevT = this.simTime

    let maxFrac = 0
    for (const sp of this.spine) {
      const ang = this.qpos[sp.qadr]
      const cap = ang >= 0 ? sp.capF : sp.capB
      const frac = cap > 1e-6 ? Math.abs(ang) / cap : 0
      if (frac > maxFrac) maxFrac = frac
    }

    const rb = this.rootBody
    const qx = this.xquat[4 * rb + 1]
    const qz = this.xquat[4 * rb + 3]
    const uy = 1 - 2 * (qx * qx + qz * qz)
    const maxTiltDeg = (Math.acos(Math.max(-1, Math.min(1, uy))) * 180) / Math.PI

    return {
      kineticEnergy: ke,
      comX: cx,
      comZ: cz,
      comDriftFromStart: Math.hypot(cx - base[0], cz - base[2]),
      maxJointFracOfCap: maxFrac,
      comYDrift: cy - base[1],
      maxTiltDeg,
    }
  }

  // Step the model at rest (zero control) so it settles onto its contacts before the animation begins —
  // removes the startup roll bounce. Time/energy trackers are reset so t=0 starts from the settled state.
  settle(steps = SETTLE_STEPS): void {
    for (let i = 0; i < this.ctrl.length; i++) this.ctrl[i] = 0
    for (let s = 0; s < steps; s++) this.mujoco.mj_step(this.model, this.data)
    this.simTime = 0
    this.diagPrevNodes = null
  }

  // Live-set a position actuator's stiffness/damping (kp in gainprm[0]; −kp, −kv in biasprm[1..2]).
  private setPosGain(act: number, kp: number, kv: number): void {
    this.gainprm[act * NGAIN] = kp
    this.biasprm[act * NBIAS + 1] = -kp
    this.biasprm[act * NBIAS + 2] = -kv
  }

  // Free the WASM-side model + data. Call when rebuilding or tearing down.
  dispose(): void {
    try {
      ;(this.data as unknown as { delete?: () => void }).delete?.()
      ;(this.model as unknown as { delete?: () => void }).delete?.()
    } catch {
      /* already freed */
    }
  }

  // Per-rig-group world transform for rendering. MuJoCo quat is (w,x,y,z); returned as (x,y,z,w).
  transforms(): BodyTransform[] {
    return this.bodyOf.map(({ groupId, body, restCenter }) => ({
      groupId,
      pos: [this.xpos[3 * body], this.xpos[3 * body + 1], this.xpos[3 * body + 2]],
      quat: [this.xquat[4 * body + 1], this.xquat[4 * body + 2], this.xquat[4 * body + 3], this.xquat[4 * body]],
      restCenter,
    }))
  }
}

// Compile a reduced-coordinate model from the live node skeleton and return a ready driver.
export async function createMujocoLocomotion(groups: BodyGroup[]): Promise<MujocoLocomotion> {
  const mujoco = await loadMujocoEngine()
  const { xml, meta } = buildMjcf(groups)
  const model = mujoco.MjModel.from_xml_string(xml)
  const data = new mujoco.MjData(model)
  mujoco.mj_forward(model, data)
  const driver = new MujocoLocomotion(mujoco, model, data, meta, groups)
  driver.settle()
  return driver
}
