import * as THREE from 'three'
import { CreatureConfig } from '../../page.types'
import { Chain3D } from '../chain3d'
import { DragonDrive } from './types'

export interface LimbState {
  joints: THREE.Vector3[]
  anchor: THREE.Vector3
  currentTarget: THREE.Vector3
  desiredTarget: THREE.Vector3
  plantPos: THREE.Vector3
  plantState: 'planted' | 'swinging'
  swingFrom: THREE.Vector3
  swingTo: THREE.Vector3
  swingT: number
  restOffsetFromIntent: THREE.Vector3
}

export interface IntentState {
  position: THREE.Vector3
  heading: THREE.Vector3
  velocity: THREE.Vector3
}

function makeLimb(): LimbState {
  return {
    joints: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    anchor: new THREE.Vector3(),
    currentTarget: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
    plantPos: new THREE.Vector3(),
    plantState: 'planted',
    swingFrom: new THREE.Vector3(),
    swingTo: new THREE.Vector3(),
    swingT: 0,
    restOffsetFromIntent: new THREE.Vector3(),
  }
}

type FootStateChar = 'P' | 'S'
type FootSample = [FootStateChar, number, number, number, number, number, number]
type Sample = [number, number, number, number, number, number, number, number, number, FootSample[]]
type Event = [number, number, FootStateChar, number, number, number]

const TEL_SAMPLE_INTERVAL = 0.05
const TEL_MAX_SAMPLES = 100
const TEL_MAX_EVENTS = 100
const r = (x: number) => Math.round(x * 1000) / 1000

export class Solver {
  config: CreatureConfig
  chain: Chain3D
  limbs: LimbState[]
  intent: IntentState

  private _telT = 0
  private _telSampleAcc = TEL_SAMPLE_INTERVAL
  private _telSamples: Sample[] = []
  private _telEvents: Event[] = []
  private _telPrevStates: Array<'planted' | 'swinging'> = []
  private _telPrevIntent = new THREE.Vector3()
  private _headTargetVec = new THREE.Vector3()
  private _restHipOffsetFront = new THREE.Vector3()
  private _restHipOffsetBack = new THREE.Vector3()

  constructor(config: CreatureConfig) {
    this.config = config
    const groundY = config.groundY ?? 0
    const bodyHeight = config.bodyHeight ?? 0.6
    const ox = config.chainOrigin?.x ?? 0
    const oy = config.chainOrigin?.y ?? (groundY + bodyHeight)
    const oz = config.chainOrigin?.z ?? 0
    const origin = new THREE.Vector3(ox, oy, oz)
    const segmentLengths =
      config.segmentLengths ?? Array(config.segmentCount - 1).fill(config.segmentLength)
    this.chain = new Chain3D(origin, config.segmentCount, segmentLengths, config.angleConstraint)

    let initialHeading = 0
    if (config.initialJoints && config.initialJoints.length > 0) {
      for (let i = 0; i < this.chain.joints.length; i++) {
        const ij = config.initialJoints[Math.min(i, config.initialJoints.length - 1)]
        const y = ij.y ?? oy
        this.chain.joints[i].set(ij.x, y, ij.z)
      }
      const j0 = this.chain.joints[0]
      const j1 = this.chain.joints[Math.min(1, this.chain.joints.length - 1)]
      initialHeading = Math.atan2(j0.z - j1.z, j0.x - j1.x)
      for (let i = 0; i < this.chain.angles.length; i++) this.chain.angles[i] = initialHeading
    }

    this.intent = {
      position: new THREE.Vector3(this.chain.joints[0].x, groundY, this.chain.joints[0].z),
      heading: new THREE.Vector3(Math.cos(initialHeading), 0, Math.sin(initialHeading)),
      velocity: new THREE.Vector3(),
    }

    const phaseScale = 0.4 * config.stepThreshold
    const PHASE_PATTERN: Array<{ x: number; z: number }> = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -0.5, z: -0.5 },
    ]

    this.limbs = config.limbNodes.map((limbNode, idx) => {
      const limb = makeLimb()
      const jointIdx = Math.min(limbNode.index, this.chain.joints.length - 1)
      const spineJoint = this.chain.joints[jointIdx]
      const nextJoint = this.chain.joints[Math.min(jointIdx + 1, this.chain.joints.length - 1)]
      const boneAngle = Math.atan2(nextJoint.z - spineJoint.z, nextJoint.x - spineJoint.x)
      const effectiveBoneAngle = (nextJoint.x !== spineJoint.x || nextJoint.z !== spineJoint.z)
        ? boneAngle
        : initialHeading

      if (limbNode.hipOffset && limbNode.parentRestAngle !== undefined) {
        const parentRot = limbNode.parentRestAngle + Math.PI - effectiveBoneAngle
        const cos = Math.cos(parentRot)
        const sin = Math.sin(parentRot)
        limb.anchor.set(
          spineJoint.x + limbNode.hipOffset.x * cos + limbNode.hipOffset.z * sin,
          spineJoint.y + limbNode.hipOffset.y,
          spineJoint.z - limbNode.hipOffset.x * sin + limbNode.hipOffset.z * cos,
        )
      } else {
        const halfWidth = limbNode.bodyHalfWidth ?? config.bodyHalfWidth
        const sideAngle = effectiveBoneAngle + (Math.PI / 2) * limbNode.side
        limb.anchor.set(
          spineJoint.x + Math.cos(sideAngle) * halfWidth,
          spineJoint.y,
          spineJoint.z + Math.sin(sideAngle) * halfWidth,
        )
      }

      if (limbNode.restFootOffset) {
        limb.plantPos.set(
          limb.anchor.x + limbNode.restFootOffset.x,
          groundY,
          limb.anchor.z + limbNode.restFootOffset.z,
        )
      } else {
        const reach = limbNode.limbReach ?? config.limbReach
        const sideAngle = initialHeading + (Math.PI / 2) * limbNode.side
        limb.plantPos.set(
          spineJoint.x + Math.cos(sideAngle) * reach,
          groundY,
          spineJoint.z + Math.sin(sideAngle) * reach,
        )
      }
      limb.currentTarget.copy(limb.plantPos)
      limb.desiredTarget.copy(limb.plantPos)
      limb.swingFrom.copy(limb.plantPos)
      limb.swingTo.copy(limb.plantPos)

      const phase = PHASE_PATTERN[idx % PHASE_PATTERN.length]
      limb.restOffsetFromIntent.set(
        limb.plantPos.x - this.intent.position.x + phase.x * phaseScale,
        0,
        limb.plantPos.z - this.intent.position.z + phase.z * phaseScale,
      )

      return limb
    })

    const fIdx = config.hipJointFrontIndex
    const bIdx = config.hipJointBackIndex
    if (fIdx !== undefined) {
      let mx = 0, mz = 0, n = 0
      for (let i = 0; i < this.limbs.length; i++) {
        if (config.limbNodes[i]?.index === fIdx) {
          mx += this.limbs[i].plantPos.x
          mz += this.limbs[i].plantPos.z
          n++
        }
      }
      if (n > 0) {
        this._restHipOffsetFront.set(
          this.chain.joints[fIdx].x - mx / n,
          0,
          this.chain.joints[fIdx].z - mz / n,
        )
      }
    }
    if (bIdx !== undefined) {
      let mx = 0, mz = 0, n = 0
      for (let i = 0; i < this.limbs.length; i++) {
        if (config.limbNodes[i]?.index === bIdx) {
          mx += this.limbs[i].plantPos.x
          mz += this.limbs[i].plantPos.z
          n++
        }
      }
      if (n > 0) {
        this._restHipOffsetBack.set(
          this.chain.joints[bIdx].x - mx / n,
          0,
          this.chain.joints[bIdx].z - mz / n,
        )
      }
    }
  }

  apply(drive: DragonDrive, dt: number): void {
    const config = this.config
    const groundY = config.groundY ?? 0
    const bodyHeight = config.bodyHeight ?? 0.6
    const hipY = groundY + bodyHeight
    const frontIdx = config.hipJointFrontIndex
    const backIdx = config.hipJointBackIndex

    const tdx = drive.headTarget.x - this.intent.position.x
    const tdz = drive.headTarget.z - this.intent.position.z
    const tdist = Math.hypot(tdx, tdz)
    if (tdist > 0.05) {
      const step = Math.min(config.maxSpeed * dt, tdist)
      this.intent.position.x += (tdx / tdist) * step
      this.intent.position.z += (tdz / tdist) * step
    }

    for (let li = 0; li < this.limbs.length; li++) {
      const limb = this.limbs[li]
      const refX = this.intent.position.x + limb.restOffsetFromIntent.x
      const refZ = this.intent.position.z + limb.restOffsetFromIntent.z

      if (limb.plantState === 'planted') {
        const drift = Math.hypot(limb.plantPos.x - refX, limb.plantPos.z - refZ)
        if (drift > config.stepThreshold) {
          limb.swingFrom.copy(limb.plantPos)
          limb.swingTo.set(refX, groundY, refZ)
          limb.swingT = 0
          limb.plantState = 'swinging'
          this._pushEvent(li, 'S', limb.swingTo.x, limb.swingTo.z, drift)
        } else {
          limb.currentTarget.copy(limb.plantPos)
        }
      }

      if (limb.plantState === 'swinging') {
        limb.swingT += dt / Math.max(0.001, config.swingDuration)
        if (limb.swingT >= 1) {
          limb.plantPos.copy(limb.swingTo)
          limb.currentTarget.copy(limb.plantPos)
          limb.plantState = 'planted'
          limb.swingT = 0
          this._pushEvent(li, 'P', limb.plantPos.x, limb.plantPos.z, 0)
        } else {
          const t = limb.swingT
          const lift = config.liftHeight * 4 * t * (1 - t)
          limb.currentTarget.set(
            limb.swingFrom.x * (1 - t) + limb.swingTo.x * t,
            groundY + lift,
            limb.swingFrom.z * (1 - t) + limb.swingTo.z * t,
          )
        }
      }
    }

    if (frontIdx !== undefined && backIdx !== undefined) {
      this._headTargetVec.set(drive.headTarget.x, drive.headTarget.y, drive.headTarget.z)
      this._resolveHips(frontIdx, backIdx, hipY, this._headTargetVec)
    }

    this._sampleTelemetry(dt, frontIdx, backIdx)
  }

  private _resolveHips(frontIdx: number, backIdx: number, hipY: number, headTarget: THREE.Vector3): void {
    const config = this.config
    let newFrontX = 0, newFrontZ = 0, nFront = 0
    let newBackX = 0, newBackZ = 0, nBack = 0
    for (let i = 0; i < this.limbs.length; i++) {
      const ln = config.limbNodes[i]
      if (!ln) continue
      if (ln.index === frontIdx) {
        newFrontX += this.limbs[i].currentTarget.x
        newFrontZ += this.limbs[i].currentTarget.z
        nFront++
      } else if (ln.index === backIdx) {
        newBackX += this.limbs[i].currentTarget.x
        newBackZ += this.limbs[i].currentTarget.z
        nBack++
      }
    }
    if (nFront > 0) {
      newFrontX = newFrontX / nFront + this._restHipOffsetFront.x
      newFrontZ = newFrontZ / nFront + this._restHipOffsetFront.z
    } else {
      newFrontX = this.chain.joints[frontIdx].x
      newFrontZ = this.chain.joints[frontIdx].z
    }
    if (nBack > 0) {
      newBackX = newBackX / nBack + this._restHipOffsetBack.x
      newBackZ = newBackZ / nBack + this._restHipOffsetBack.z
    } else {
      newBackX = this.chain.joints[backIdx].x
      newBackZ = this.chain.joints[backIdx].z
    }

    const dxFront = newFrontX - this.chain.joints[frontIdx].x
    const dzFront = newFrontZ - this.chain.joints[frontIdx].z
    const dxBack = newBackX - this.chain.joints[backIdx].x
    const dzBack = newBackZ - this.chain.joints[backIdx].z

    this.chain.joints[frontIdx].set(newFrontX, hipY, newFrontZ)
    this.chain.joints[backIdx].set(newBackX, hipY, newBackZ)

    this.chain.resolveDualAnchor(frontIdx, backIdx)
    this.chain.resolveHeadSection(frontIdx, headTarget)
    this.chain.resolveTailSection(backIdx)

    const frontHipY = this.chain.joints[frontIdx].y
    const backHipY = this.chain.joints[backIdx].y
    for (let i = 0; i < this.limbs.length; i++) {
      const ln = config.limbNodes[i]
      if (!ln) continue
      const limb = this.limbs[i]
      const hipOffsetY = ln.hipOffset?.y ?? 0
      if (ln.index === frontIdx) {
        limb.anchor.x += dxFront
        limb.anchor.z += dzFront
        limb.anchor.y = frontHipY + hipOffsetY
      } else if (ln.index === backIdx) {
        limb.anchor.x += dxBack
        limb.anchor.z += dzBack
        limb.anchor.y = backHipY + hipOffsetY
      }
    }
  }

  private _pushEvent(footIdx: number, ev: FootStateChar, x: number, z: number, drift: number): void {
    if (this._telEvents.length >= TEL_MAX_EVENTS) this._telEvents.shift()
    this._telEvents.push([r(this._telT), footIdx, ev, r(x), r(z), r(drift)])
  }

  private _sampleTelemetry(dt: number, frontIdx: number | undefined, backIdx: number | undefined): void {
    this._telT += dt
    this._telSampleAcc += dt
    if (this._telSampleAcc < TEL_SAMPLE_INTERVAL) {
      this._telPrevIntent.copy(this.intent.position)
      return
    }
    this._telSampleAcc = 0

    const dvx = (this.intent.position.x - this._telPrevIntent.x) / Math.max(dt, 0.0001)
    const dvz = (this.intent.position.z - this._telPrevIntent.z) / Math.max(dt, 0.0001)
    this._telPrevIntent.copy(this.intent.position)

    const hf = frontIdx !== undefined ? this.chain.joints[frontIdx] : null
    const hb = backIdx !== undefined ? this.chain.joints[backIdx] : null

    const feet: FootSample[] = this.limbs.map((l) => {
      const refX = this.intent.position.x + l.restOffsetFromIntent.x
      const refZ = this.intent.position.z + l.restOffsetFromIntent.z
      const drift = Math.hypot(l.plantPos.x - refX, l.plantPos.z - refZ)
      return [
        l.plantState === 'planted' ? 'P' : 'S',
        r(l.currentTarget.x),
        r(l.currentTarget.y),
        r(l.currentTarget.z),
        r(l.anchor.x),
        r(l.anchor.z),
        r(drift),
      ]
    })

    const sample: Sample = [
      r(this._telT),
      r(this.intent.position.x),
      r(this.intent.position.z),
      r(dvx),
      r(dvz),
      r(hf?.x ?? 0),
      r(hf?.z ?? 0),
      r(hb?.x ?? 0),
      r(hb?.z ?? 0),
      feet,
    ]
    if (this._telSamples.length >= TEL_MAX_SAMPLES) this._telSamples.shift()
    this._telSamples.push(sample)
  }

  dumpTelemetry(): string {
    const config = this.config
    const feetMeta = this.config.limbNodes.map((ln, i) => ({
      i,
      jointIdx: ln.index,
      side: ln.side,
      pair: ln.index === config.hipJointFrontIndex
        ? 'front'
        : ln.index === config.hipJointBackIndex
          ? 'back'
          : 'other',
    }))
    const obj = {
      legend: {
        sample: '[t, ipx, ipz, ivx, ivz, hfx, hfz, hbx, hbz, [foot0..foot3]] foot=[s,tx,ty,tz,ax,az,drift] s=P|S',
        event: '[t, footIdx, ev, x, z, driftAtTrigger] ev=S(swingStart)|P(plant)',
      },
      config: {
        stepThreshold: config.stepThreshold,
        swingDuration: config.swingDuration,
        liftHeight: config.liftHeight,
        predictionGain: config.predictionGain,
        maxSpeed: config.maxSpeed,
        bodyHeight: config.bodyHeight,
      },
      feetMeta,
      durationS: r(this._telT),
      samples: this._telSamples,
      events: this._telEvents,
    }
    return JSON.stringify(obj)
  }

  dumpSkeletonSnapshot(): string {
    const config = this.config
    const joints = this.chain.joints.map((j) => [r(j.x), r(j.y), r(j.z)])
    const initialJoints = (config.initialJoints ?? []).map((j) => [
      r(j.x),
      j.y === undefined ? null : r(j.y),
      r(j.z),
    ])
    const segmentLengths = this.chain.segmentLengths.map((s) => r(s))
    const limbs = this.limbs.map((l, i) => {
      const ln = config.limbNodes[i]
      return {
        i,
        jointIdx: ln?.index ?? null,
        side: ln?.side ?? null,
        pair: ln?.index === config.hipJointFrontIndex
          ? 'front'
          : ln?.index === config.hipJointBackIndex
            ? 'back'
            : 'other',
        anchor: [r(l.anchor.x), r(l.anchor.y), r(l.anchor.z)],
        target: [r(l.currentTarget.x), r(l.currentTarget.y), r(l.currentTarget.z)],
        plant: [r(l.plantPos.x), r(l.plantPos.y), r(l.plantPos.z)],
        state: l.plantState === 'planted' ? 'P' : 'S',
        hipOffset: ln?.hipOffset
          ? [r(ln.hipOffset.x), r(ln.hipOffset.y ?? 0), r(ln.hipOffset.z)]
          : null,
        restFootOffset: ln?.restFootOffset
          ? [r(ln.restFootOffset.x), r(ln.restFootOffset.z)]
          : null,
        restOffsetFromIntent: [r(l.restOffsetFromIntent.x), r(l.restOffsetFromIntent.z)],
        parentRestAngle: ln?.parentRestAngle ?? null,
      }
    })
    const obj = {
      legend: {
        joints: '[ [x,y,z] per chain joint, in order from head to tail ]',
        initialJoints: '[ [x,y,z] from studio buildChainJoints — what they were placed at; y may be null if not set in studio ]',
        segmentLengths: '[ rest distance between consecutive joints ]',
        limbs: 'anchor=hip-side attach point, target=current foot, plant=planted foot ref, state=P|S, hipOffset/restFootOffset/parentRestAngle from limbNode config',
      },
      config: {
        groundY: config.groundY,
        bodyHeight: config.bodyHeight,
        hipJointFrontIndex: config.hipJointFrontIndex,
        hipJointBackIndex: config.hipJointBackIndex,
        angleConstraint: config.angleConstraint,
      },
      restHipOffsetFront: [
        r(this._restHipOffsetFront.x),
        r(this._restHipOffsetFront.z),
      ],
      restHipOffsetBack: [
        r(this._restHipOffsetBack.x),
        r(this._restHipOffsetBack.z),
      ],
      intent: {
        pos: [r(this.intent.position.x), r(this.intent.position.y), r(this.intent.position.z)],
        vel: [r(this.intent.velocity.x), r(this.intent.velocity.z)],
      },
      joints,
      initialJoints,
      segmentLengths,
      limbs,
    }
    return JSON.stringify(obj)
  }
}
