import { readFileSync } from 'fs'
import { resolve } from 'path'
import loadMujoco from '@mujoco/mujoco'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton } from '@/app/game/locomotion/chain'
import {
  buildCpgSpec,
  initCpgState,
  stepCpg,
  oscillatorOutput,
  girdleClockPhase,
} from '@/app/game/locomotion/cpg'
import { createDelayBuffer, pushAndReadDelayed, GAMMA } from '@/app/game/locomotion/muscles'
import { findSimPreset } from '@/app/admin/animate/simPresets'
import type { MjcfMeta } from './skeleton-to-mjcf'

const TIMESTEP = 1 / 120
const CPG_TO_MUSCLE_GAIN = 1
const GRIP_FOOT_BY_LIMB = ['FL', 'FR', 'BL', 'BR'] as const

// MuJoCo mjtObj enum values (mj_name2id's second arg).
const OBJ = { BODY: 1, JOINT: 3, SITE: 6, EQUALITY: 17, ACTUATOR: 19 }

const DIAG = resolve(process.cwd(), 'documentation/diagnostics/mujoco')
const FIXTURE = resolve(process.cwd(), 'documentation/diagnostics/creature-groups.json')

// axialChain replicated from body3d.ts (kept off RAPIER so this runs as a plain node script).
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

async function main(): Promise<void> {
  const presetName = process.argv[2] ?? 'base walk'
  const seconds = Number(process.argv[3] ?? 14)
  const warmup = Number(process.argv[4] ?? 4)

  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { groups: BodyGroup[] }
  const groups = fixture.groups
  const meta = JSON.parse(readFileSync(resolve(DIAG, 'model.meta.json'), 'utf8')) as MjcfMeta
  const xml = readFileSync(resolve(DIAG, 'model.xml'), 'utf8')

  const preset = findSimPreset(presetName, 'mujoco') ?? findSimPreset(presetName, 'rapier')
  if (!preset) throw new Error(`unknown preset "${presetName}"`)
  const cfg = preset.config

  const drive = num(cfg.cpgDrive, 0.4)
  const exc = num(cfg.cpgExcitability, 1)
  const frontDrive = num(cfg.frontDrive, 0)
  const frontSegments = num(cfg.frontSegments, 0)
  const turnBias = num(cfg.turnBias, 0)
  const limbDrive = num(cfg.limbDrive, 0)
  const fbIpsi = num(cfg.feedbackIpsi, 0)
  const fbContra = num(cfg.feedbackContra, 0)
  const alpha = num(cfg.muscleAlpha, 11)
  const beta = num(cfg.muscleBeta, 35)
  const muscleDamping = num(cfg.muscleDamping, 6)
  const limbsOn = bool(cfg.limbCpgEnabled, false)
  const stepEnabled = bool(cfg.stepEnabled, true)
  const sweepAmount = num(cfg.sweepAmount, 0)
  const liftAmount = num(cfg.liftAmount, 0)
  const gripEnabled = bool(cfg.gripEnabled, false)
  const gripShift = num(cfg.gripShift, 0.61)
  const gripDuration = num(cfg.gripDuration, 0.5)
  const stepShift = gripShift
  const stepDuty = Math.min(0.95, Math.max(0.05, gripDuration))
  const gripFeet = (cfg.gripFeet ?? { FL: false, FR: false, BL: false, BR: false }) as Record<string, boolean>

  // --- CPG (the real one) ---
  const axial = axialChain(groups)
  const spec = buildCpgSpec(axial.lengths, groups, axial.groupIds, limbsOn)
  const state = initCpgState(spec)
  const delays = meta.spineJoints.map(() => createDelayBuffer(TIMESTEP))

  // --- MuJoCo ---
  const mujoco = await loadMujoco()
  const model = mujoco.MjModel.from_xml_string(xml)
  const data = new mujoco.MjData(model)
  mujoco.mj_forward(model, data)

  const qpos = data.qpos as Float64Array
  const ctrl = data.ctrl as Float64Array
  const siteXpos = data.site_xpos as Float64Array
  const xfrc = data.xfrc_applied as Float64Array
  const bodyMass = model.body_mass as Float64Array
  const xipos = data.xipos as Float64Array
  const jntQadr = model.jnt_qposadr as Int32Array

  // Grip = a stiff spring pinning the foot to its captured world point, applied as a foot-point
  // force via xfrc_applied (float64 view — this build does not register the bool eq_active view
  // needed to toggle a `connect` equality at runtime). Physically the same "peg pinned, free to
  // rotate" behaviour as the app's spherical-joint grip.
  const K_GRIP = Number(process.env.KGRIP ?? 300)
  const D_GRIP = Number(process.env.DGRIP ?? 10)

  const id = (type: number, name: string): number => mujoco.mj_name2id(model, type, name)

  // spine joint address + actuator ctrl index
  const spine = meta.spineJoints.map((j) => {
    const jid = id(OBJ.JOINT, j.name)
    return { k: j.childIndex, qadr: jntQadr[jid], act: id(OBJ.ACTUATOR, j.actuator) }
  })

  // legs: actuators, leg body (for the grip force), foot site
  const legs = meta.legs.map((l) => ({
    limbIdx: l.limbIdx,
    liftAct: id(OBJ.ACTUATOR, l.liftActuator),
    sweepAct: id(OBJ.ACTUATOR, l.sweepActuator),
    capStance: l.capStance,
    capSwing: l.capSwing,
    liftSign: l.liftSign,
    legBody: id(OBJ.BODY, l.legBody),
    footSite: id(OBJ.SITE, l.footSite),
    planted: false,
    pin: [0, 0, 0] as [number, number, number],
    footPrev: [0, 0, 0] as [number, number, number],
  }))

  const nBody = model.nbody as number
  const totalMass = (() => {
    let m = 0
    for (let b = 0; b < nBody; b++) m += bodyMass[b]
    return m
  })()
  const com = (): [number, number, number] => {
    let x = 0, y = 0, z = 0
    for (let b = 0; b < nBody; b++) {
      x += bodyMass[b] * xipos[3 * b]
      y += bodyMass[b] * xipos[3 * b + 1]
      z += bodyMass[b] * xipos[3 * b + 2]
    }
    return [x / totalMass, y / totalMass, z / totalMass]
  }
  // root (seg0) tilt from world-up: freejoint quat is qpos[3..6] in (w,x,y,z)
  const rootTiltDeg = (): number => {
    // body local +Y in world = rotate (0,1,0) by the freejoint quat (w,x,y,z) at qpos[3..6];
    // its world-y component is 1 − 2(x²+z²). Angle from upright = acos of that.
    const x = qpos[4], z = qpos[6]
    const uy = 1 - 2 * (x * x + z * z)
    return (Math.acos(Math.max(-1, Math.min(1, uy))) * 180) / Math.PI
  }

  const totalSteps = Math.round(seconds / TIMESTEP)
  const warmupSteps = Math.round(warmup / TIMESTEP)
  let comStart: [number, number, number] | null = null
  let maxTilt = 0
  let tiltSum = 0
  let measured = 0
  const jointAmpMax = new Array(spine.length).fill(0)
  const gripCounts = new Array(legs.length).fill(0)
  let minRootY = Infinity

  for (let s = 0; s < totalSteps; s++) {
    stepCpg(state, spec, drive, exc, TIMESTEP, frontDrive, frontSegments, turnBias, limbDrive, undefined, fbIpsi, fbContra)

    // spine: Ekeberg muscle as an implicit position servo with live varying stiffness
    for (let i = 0; i < spine.length; i++) {
      const sp = spine[i]
      const mL = oscillatorOutput(state, sp.k) * CPG_TO_MUSCLE_GAIN
      const mR = oscillatorOutput(state, sp.k + spec.n) * CPG_TO_MUSCLE_GAIN
      const d = pushAndReadDelayed(delays[i], mL, mR)
      const kStiff = beta * (d.mL + d.mR + GAMMA)
      const phiEq = kStiff > 1e-9 ? (alpha * (d.mL - d.mR)) / kStiff : 0
      ctrl[sp.act] = phiEq
    }

    // legs: sweep/lift position targets from the gait clock (girdle CPG phase)
    for (const lg of legs) {
      if (!stepEnabled) {
        ctrl[lg.sweepAct] = 0
        ctrl[lg.liftAct] = 0
        continue
      }
      const ph = girdleClockPhase(state, spec, lg.limbIdx)
      const rel = (((ph - stepShift) % 1) + 1) % 1
      const amt = Math.min(1, Math.max(0, sweepAmount))
      const fwd = lg.capStance
      const back = lg.capSwing
      let sweep: number
      let lift = 0
      if (rel < stepDuty) {
        const t = rel / stepDuty
        sweep = fwd - t * (fwd + back)
      } else {
        const t = (rel - stepDuty) / (1 - stepDuty)
        sweep = -back + t * (fwd + back)
        lift = liftAmount * Math.sin(Math.PI * t)
      }
      ctrl[lg.sweepAct] = sweep * amt
      ctrl[lg.liftAct] = lg.liftSign * lift
    }

    // grip: stiff foot-point spring toward the captured pin, on the gait clock
    if (gripEnabled) {
      for (const lg of legs) {
        const bid = lg.legBody
        const selected = gripFeet[GRIP_FOOT_BY_LIMB[lg.limbIdx]] ?? false
        const ph = girdleClockPhase(state, spec, lg.limbIdx)
        const rel = (((ph - gripShift) % 1) + 1) % 1
        const gripping = selected && rel < gripDuration
        const fx = siteXpos[3 * lg.footSite], fy = siteXpos[3 * lg.footSite + 1], fz = siteXpos[3 * lg.footSite + 2]
        if (gripping) {
          if (!lg.planted) { lg.pin = [fx, fy, fz]; lg.footPrev = [fx, fy, fz]; lg.planted = true }
          const vx = (fx - lg.footPrev[0]) / TIMESTEP, vy = (fy - lg.footPrev[1]) / TIMESTEP, vz = (fz - lg.footPrev[2]) / TIMESTEP
          const Fx = K_GRIP * (lg.pin[0] - fx) - D_GRIP * vx
          const Fy = K_GRIP * (lg.pin[1] - fy) - D_GRIP * vy
          const Fz = K_GRIP * (lg.pin[2] - fz) - D_GRIP * vz
          // force at the foot = force at COM + torque r×F (r = foot − body COM)
          const rx = fx - xipos[3 * bid], ry = fy - xipos[3 * bid + 1], rz = fz - xipos[3 * bid + 2]
          xfrc[6 * bid] = Fx; xfrc[6 * bid + 1] = Fy; xfrc[6 * bid + 2] = Fz
          xfrc[6 * bid + 3] = ry * Fz - rz * Fy
          xfrc[6 * bid + 4] = rz * Fx - rx * Fz
          xfrc[6 * bid + 5] = rx * Fy - ry * Fx
          lg.footPrev = [fx, fy, fz]
        } else {
          lg.planted = false
          xfrc[6 * bid] = 0; xfrc[6 * bid + 1] = 0; xfrc[6 * bid + 2] = 0
          xfrc[6 * bid + 3] = 0; xfrc[6 * bid + 4] = 0; xfrc[6 * bid + 5] = 0
        }
      }
    }

    mujoco.mj_step(model, data)

    if (s >= warmupSteps) {
      if (!comStart) comStart = com()
      const tilt = rootTiltDeg()
      maxTilt = Math.max(maxTilt, tilt)
      tiltSum += tilt
      measured++
      minRootY = Math.min(minRootY, qpos[1])
      for (let i = 0; i < spine.length; i++) jointAmpMax[i] = Math.max(jointAmpMax[i], Math.abs(qpos[spine[i].qadr]))
      for (let i = 0; i < legs.length; i++) if (legs[i].planted) gripCounts[i]++
    }
  }

  const comEnd = com()
  const cs = comStart ?? comEnd
  const dx = comEnd[0] - cs[0]
  const dz = comEnd[2] - cs[2]
  const travel = Math.hypot(dx, dz)
  const forward = -dx // head is toward −X, so forward progress is −Δx
  const meanTilt = measured ? tiltSum / measured : 0
  const peakAmpDeg = (Math.max(...jointAmpMax) * 180) / Math.PI
  const meanAmpDeg = ((jointAmpMax.reduce((a, b) => a + b, 0) / jointAmpMax.length) * 180) / Math.PI

  console.log(`\n=== MuJoCo oracle — preset "${presetName}" (${seconds}s, warmup ${warmup}s) ===`)
  console.log(`  drive=${drive} exc=${exc} α=${alpha} β=${beta} δ=${muscleDamping}  grip=${gripEnabled} sweep=${sweepAmount} stepDuty=${stepDuty.toFixed(2)}`)
  console.log(`  COM travel: ${travel.toFixed(3)} u  (forward=${forward.toFixed(3)}, side Δz=${dz.toFixed(3)})  over ${(seconds - warmup).toFixed(0)}s`)
  console.log(`  forward speed: ${(forward / (seconds - warmup)).toFixed(3)} u/s`)
  console.log(`  body tilt from upright: mean=${meanTilt.toFixed(1)}°  peak=${maxTilt.toFixed(1)}°   min root Y=${minRootY.toFixed(3)}`)
  console.log(`  spine wave amplitude: mean=${meanAmpDeg.toFixed(1)}°  peak=${peakAmpDeg.toFixed(1)}° (alive if > ~2°)`)
  console.log(`  grip duty per foot: ${gripCounts.map((c, i) => `${GRIP_FOOT_BY_LIMB[legs[i].limbIdx]}=${((c / measured) * 100).toFixed(0)}%`).join('  ')}`)
}

main().then(() => process.exit(0))
