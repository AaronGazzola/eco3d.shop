import { SimConfig, SimEngine } from './animateStore'
import { DEFAULT_LEG_WEIGHT } from '@/app/game/locomotion/weights'
import { useAnimateStore } from './animateStore'
import { useSharedStore } from '../_lib/sharedStore'

export interface SimPreset {
  name: string
  description: string
  // The engine this preset was tuned for. The preset dropdown is scoped to the active engine, and
  // applying a preset also switches the engine to this one so a shared link reproduces it exactly.
  engine: SimEngine
  // The COMPLETE config, not a partial. Applying a preset resets to DEFAULT_SIM_CONFIG first, so any
  // key omitted here lands on the default rather than inheriting from whatever was loaded before —
  // that inheritance is what made preset B after preset A stop being preset B.
  config: Partial<SimConfig>
  // Leg mass in kg. This lives in the RIG group store, not in SimConfig, so it cannot ride in the
  // config blob — and MuJoCo behaviour depends strongly on it (light legs, ~0.1 kg). Without it a
  // preset silently depends on wherever the viewer left the Calibrate slider, which means the viewer
  // is not seeing the run the preset was recorded from. Applying a preset writes this to every leg.
  legWeight: number
}

// Shared base for the grip-diagnosis presets: legs BUILT and held genuinely RIGID (legStiffness 200000
// via the step-motor hold path — legsLocked alone lets the legs flop), the axial CPG running a
// full-amplitude wave (β35/δ6), and body drag OFF so the ONLY horizontal force on the body is whatever a
// gripped foot supplies. One front foot (FL) is the grip candidate; grip is off in the base. muscleAlpha
// is set PER PRESET so the wave sits just under the joint angle cap (highest amplitude with NO clipping):
// the drag load (swim) and the grip clamp change how hard the joints are pushed, so each regime needs a
// different α — verified via the observe harness (peak maxJointFracOfCap 97-99%, never 100).
const BASE_FL: Partial<SimConfig> = {
  gravityEnabled: true,
  landLegsEnabled: true,
  landGroundEnabled: true,
  limbCpgEnabled: false,
  legsLocked: true,
  environmentEnabled: false,
  cpgDrive: 0.39,
  cpgExcitability: 0.74,
  frontDrive: 0,
  frontSegments: 0,
  turnBias: 0,
  limbDrive: 0,
  feedbackIpsi: 0,
  feedbackContra: 0,
  muscleAlpha: 22,
  muscleBeta: 35,
  muscleDamping: 6,
  bodyFriction: 0,
  legFriction: 0.05,
  gripEnabled: false,
  gripClockCpg: true,
  gripShift: 0.27,
  gripDuration: 1,
  releaseFriction: 0,
  gripGlowEnabled: true,
  gripFeet: { FL: true, FR: false, BL: false, BR: false },
  stepEnabled: true,
  sweepAmount: 0,
  sweepSpeed: 37000,
  liftAmount: 0,
  legStiffness: 200000,
  legDamping: 120,
}

// The MuJoCo base swim: the approved foundation for the walk (owner-approved 2026-08-08). Rigid legs
// perpendicular to the body, no sweep, no lift, no friction, drag ON, body flat. Everything in Phase
// D-T is this config plus one thrust lever, and every D-T gate is scored against its numbers.
//
// Tuned by sweeping muscleAlpha at the Rapier reference drive (0.39): α18 peaks at 90% of the angle cap,
// α20 clips. Legs must be light (0.1 kg) — that rides in legWeight, not the config, because leg mass
// lives in the rig group store. footThrustShift 0.138 is the MEASURED max-forward-reach phase for this
// config (all four feet agreeing to within 0.019 cycles), so thrust starts exactly at the back stroke.
const MUJOCO_BASE_SWIM: Partial<SimConfig> = {
  gravityEnabled: true,
  landLegsEnabled: true,
  landGroundEnabled: true,
  limbCpgEnabled: false,
  legsLocked: true,
  environmentEnabled: true,
  cpgDrive: 0.39,
  cpgExcitability: 0.74,
  frontDrive: 0,
  frontSegments: 0,
  turnBias: 0,
  limbDrive: 0,
  feedbackIpsi: 0,
  feedbackContra: 0,
  muscleAlpha: 18,
  muscleBeta: 35,
  muscleDamping: 6,
  bodyFriction: 0,
  legFriction: 0.05,
  gripEnabled: false,
  gripClockCpg: true,
  gripShift: 0.27,
  gripDuration: 1,
  gripSoftness: 0,
  girdleBoost: 0,
  releaseFriction: 0,
  gripGlowEnabled: true,
  gripFeet: { FL: true, FR: false, BL: false, BR: false },
  stepEnabled: true,
  stepFeet: { FL: true, FR: true, BL: true, BR: true },
  sweepAmount: 0,
  sweepSpeed: 3000,
  liftAmount: 0,
  legStiffness: 3000,
  legDamping: 400,
  simEngine: 'mujoco',
  footThrustEnabled: false,
  footThrustGain: 0,
  footThrustShift: 0.138,
  footThrustShiftHind: 0.638,
}
const MUJOCO_LEG_WEIGHT = 0.1

export const SIM_PRESETS: SimPreset[] = [
  // ── MuJoCo — the approved walk ladder ─────────────────────────────────────────────────────────────
  {
    name: 'base swim',
    description: 'APPROVED BASELINE 8-Aug-2026. Rigid legs, no grip/sweep/lift, drag ON. Swims forward 1.53 u/s, straight (lateral 1.7% of travel), flat (comY 0.002, tilt 0.6°). Joints peak at 90% of cap, never clip. Coupling between body speed and backward foot sweep 0.24-0.27 at a 0.30 s lag — that gap is what foot thrust exists to close. Light legs (0.1 kg).',
    engine: 'mujoco',
    config: MUJOCO_BASE_SWIM,
    legWeight: MUJOCO_LEG_WEIGHT,
  },

  // Phase T1. The same approved swim with the pull of gravity removed and a tank around it — nothing
  // else differs, deliberately, so any change in how the body moves is attributable to the medium and
  // not to a retune. The description carries no measured numbers yet; they are filled in from the T1
  // capture, and until then this preset is a starting point rather than a result.
  {
    name: 'flight base',
    description: 'PHASE T1, measured 10-Aug-2026. The approved base swim with gravity off inside a 60x30x40 tank; every other lever identical, so any difference is the medium and not a retune. Flies level and dead flat: unobstructed cruise 2.16 u/s against 1.53 on the floor, height drift under 0.13 u over 90 s, peak roll 2.7° at 0.7 reversals/s. The wave also evens out — girdle ratio 1.00 against 0.84, bend spread 22.3° against 26.5° — but clips harder, 8 of 10 joints at or over cap against 6. CAVEAT: it flies clean for about 22 s, then reaches a wall, and a sustained press against the glass pitches it up to the ceiling. Watchable until the first wall; steering (T2/T6) is what fixes that, not this preset. Light legs (0.1 kg), rigid, no thrust, no drag.',
    engine: 'mujoco',
    config: {
      ...MUJOCO_BASE_SWIM,
      gravityY: 0,
      tankEnabled: true,
      tankWidth: 60,
      tankHeight: 30,
      tankDepth: 40,
    },
    legWeight: MUJOCO_LEG_WEIGHT,
  },

  // The grounded counterpart, and what the overlay's `cruise` resolves to. `flight base` with its weight
  // put back: the same approved swim, the same tank, and gravity left at the default rather than zeroed.
  // Omitting gravityY is not an oversight — applySimConfigAbsolute fills every absent key from the
  // defaults, so this preset pins Earth's pull as firmly as `flight base` pins zero, and the pair differs
  // by exactly one lever.
  //
  // Under gravity the tank keeps the walking floor and contributes only its walls and ceiling, so the
  // feet still find the ground; see the world surface in mjcf.ts for why that is not the same code path
  // as the flying tank.
  {
    name: 'ground tank',
    description: 'MEASURED 15-Aug-2026, 90 s. The approved base swim inside the same 60x30x40 tank as `flight base`, with gravity left on — the pair differs by that one lever and nothing else. Swims along the floor: builds to 2.02 u/s (fastest 3 s window) against 1.53 on the open plane, holds its height to 0.044 u of drift over 90 s, peak roll 2.42° at 4.0 reversals/s. CONTAINED — closest approach to any wall 0.81 u, never outside, feet included. CAVEAT: it reaches the far wall at about 16 s, slides ~13 u along it into a corner, and parks there for the remaining 45 s drifting under 1 u. Watchable until the first wall, exactly as `flight base` is; steering is what fixes that, not this preset. Unlike flight, a sustained press cannot pitch it into the ceiling — weight opposes it. Clips 8 of 10 joints at or over cap. Light legs (0.1 kg), rigid, no thrust, drag ON.',
    engine: 'mujoco',
    config: {
      ...MUJOCO_BASE_SWIM,
      tankEnabled: true,
      tankWidth: 60,
      tankHeight: 30,
      tankDepth: 40,
    },
    legWeight: MUJOCO_LEG_WEIGHT,
  },

  // What the overlay actually runs. The grounded tank preset with wall-aware steering switched on, and
  // nothing else changed. It is a separate preset rather than three more lines on the grounded preset
  // because that preset and the flight one are required to differ by exactly one lever, so any difference
  // between them is the medium rather than a retune. Steering one of the pair would destroy that
  // comparison and every measurement taken through it.
  //
  // Steering sets turnBias and nothing else, so the wave, the muscles and the couplings are the approved
  // base swim untouched.
  {
    name: 'bounded',
    description:
      "STEERED, measured 17-Aug-2026, 90 s. `ground tank` with wall-aware steering on and no other change. The creature turns away from the glass instead of parking against it: closest approach 1.21 u, 7% of the run within 2 u of a wall, 63% of the floor visited, worst 15 s excursion 9.90 u — against 0.81 u, 84%, 25% and 0.24 u unsteered, where it reached the far wall at about 16 s and parked for the remaining 45. Peak roll unchanged at about 2°. The margin is deliberately larger than the tank is deep: at 2 u/s against a turn of about 7°/s a creature that waits until it is near the glass cannot come round in time, so the turn is under way for most of the crossing, and the damping is what stops that becoming a permanent hard turn. CAVEAT: turning costs forward speed on this rig (1.86 u/s at zero bias against 0.41 at 0.6), so the creature loops rather than crossing end to end. CAVEAT: the margin is a fixed distance and will need restating as a fraction of the tank once the tank is sized from the overlay box.",
    engine: 'mujoco',
    config: {
      ...MUJOCO_BASE_SWIM,
      tankEnabled: true,
      tankWidth: 60,
      tankHeight: 30,
      tankDepth: 40,
      roamMargin: 45,
      roamGain: 2,
      roamDamping: 0.3,
    },
    legWeight: MUJOCO_LEG_WEIGHT,
  },

  // The opposite arrangement to `bounded`, for a creature that should read as going about its business
  // rather than patrolling. It turns at random while inside a soft boundary set in from the glass, and
  // only once that boundary has actually been crossed does anything bring it back.
  //
  // The soft boundary is inset rather than drawn on the walls because the walls are solid: a boundary the
  // creature could never cross would make the returning behaviour unobservable.
  //
  // The wander is a sum of three incommensurate sines, not a random number generator, so a capture can be
  // re-run and used as evidence.
  {
    name: 'unbounded',
    description: 'MEASURED 18-Aug-2026, 90 s. Free wandering with a return once the soft boundary is crossed, in the same 60x30x40 tank as . Turns at random inside the boundary and turns back outside it, setting turnBias and nothing else. Never parks: worst 15 s excursion 12.31 u, 54% of the floor visited, 14% of the run within 2 u of a wall, closest approach 1.06 u, turn rate 6.89 deg/s. Against  (1.21 u, 7%, 63%, 5.49 deg/s) the creature spends more time near the glass and covers slightly less floor, in exchange for a path that wanders rather than patrolling. CAVEAT: the boundary is inset 45 u, larger than the tank is deep, because a correction that waits until the boundary is genuinely crossed cannot come round in time on this rig at about 7 deg/s against 2 u/s of travel - every late-correction setting tested parked against the glass. CAVEAT: the inset is a fixed distance and needs restating as a fraction once the tank is sized from the overlay box.',
    engine: 'mujoco',
    config: {
      ...MUJOCO_BASE_SWIM,
      tankEnabled: true,
      tankWidth: 60,
      tankHeight: 30,
      tankDepth: 40,
      roamInset: 45,
      roamWander: 0.2,
      roamGain: 2,
      roamDamping: 0.3,
    },
    legWeight: MUJOCO_LEG_WEIGHT,
  },
  // ── Rapier — the earlier reference tunings ────────────────────────────────────────────────────────
  // The pure CPG body wave with the legs built and held rigid, no grip, no drag. With no drag the body
  // just undulates in place (no net travel) — this is the clean traveling wave the grip timing is read
  // against, and the baseline every grip experiment is compared to.
  {
    name: 'base wave',
    description: 'Stiff legs, no grip, no drag — the pure CPG traveling wave undulating in place (no thrust). The reference wave. α11 → peak 99% of the angle cap (max amplitude, no clip).',
    engine: 'rapier',
    config: { ...BASE_FL, muscleAlpha: 11 },
    legWeight: DEFAULT_LEG_WEIGHT,
  },
  // Same as base wave but with body drag ON: the anisotropic resistance turns the same traveling wave
  // into forward swimming. Drag damps the lateral bend, so α is raised (16 vs 11) to push the joints back
  // up to just under the cap for the same near-max wave amplitude.
  {
    name: 'base swim',
    description: 'base wave + drag ON — the wave now swims the body forward. α16 (raised, drag damps the bend) → peak 97% of the cap.',
    engine: 'rapier',
    config: { ...BASE_FL, environmentEnabled: true, muscleAlpha: 16 },
    legWeight: DEFAULT_LEG_WEIGHT,
  },
  // The current one-foot experiment: FL grips continuously (gripDuration 1 = never releases) with the
  // rigid leg and no drag. The rigid anchor pins the front girdle as a fixed node, reflecting the wave
  // into a standing wave with zero travel. The clamp amplifies the girdle joint, so α is LOWERED (6 vs
  // 11) to keep the peak just under the cap.
  {
    name: 'base FL grip',
    description: 'base wave + FL gripping continuously (rigid leg, no drag). Fixed node → standing wave, no travel. α6 (lowered, clamp amplifies the joint) → peak 98% of the cap.',
    engine: 'rapier',
    config: { ...BASE_FL, gripEnabled: true, muscleAlpha: 6 },
    legWeight: DEFAULT_LEG_WEIGHT,
  },
  // base wave with the grip STILL OFF but the FL foot glow timed to the backward power stroke, clocked
  // off the CPG phase (gripClockCpg, the default). The window opens at FL max-forward reach (CPG-clock
  // φ_fwd≈0.61) and closes at max-backward (gripDuration 0.5), so the cyan foot marker lights up exactly
  // while the foot is travelling backward — the grip timing made visible without the grip firing. Same
  // dynamics as base wave (grip off), so same α11.
  {
    name: 'base FL grip timing',
    description: 'base wave, grip OFF — FL foot glow shows the CPG-clocked grip window: lights at max-forward, off at max-backward (the backward power stroke). gripShift 0.61 / gripDuration 0.5. α11 → peak 99% of the cap.',
    engine: 'rapier',
    config: { ...BASE_FL, gripShift: 0.61, gripDuration: 0.5, muscleAlpha: 11 },
    legWeight: DEFAULT_LEG_WEIGHT,
  },
  // All four feet gripping on the CPG clock, timed to each foot's backward power stroke (gripShift 0.61,
  // gripDuration 0.5). No sweep yet (sweepAmount 0). The gripped feet anchor on the backward stroke and
  // release on the forward stroke, so the body inches forward and stays roughly straight — the first
  // whole-body walk built on the CPG-timed grip.
  {
    name: 'base walk',
    description: 'All 4 feet grip on the CPG clock, timed to the backward power stroke (gripShift 0.61 / gripDuration 0.5). No sweep. Inches forward, stays roughly straight — the base walk.',
    engine: 'rapier',
    config: { ...BASE_FL, gripEnabled: true, gripShift: 0.61, gripDuration: 0.5, muscleAlpha: 11, gripFeet: { FL: true, FR: true, BL: true, BR: true } },
    legWeight: DEFAULT_LEG_WEIGHT,
  },
  // base walk with grip and sweep OFF (gripEnabled false, sweepAmount 0) so the body runs the clean
  // undulation, but BOTH timing indicators are live: the cyan grip glow shows the grip window and the
  // sweep arrow shows the sweep direction (green = would sweep forward, orange = would sweep backward),
  // clocked off the CPG phase. They are locked together (both use gripShift 0.61 / gripDuration 0.5), so
  // the arrow flips to orange exactly when the grip glow turns on and back to green when it turns off.
  {
    name: 'sweep & grip timing',
    description: 'base wave (grip+sweep OFF) with BOTH timing indicators: grip glow + sweep arrow (green fwd / orange back). Sweep flips to back exactly when grip starts, to fwd when grip ends. CPG-clocked.',
    engine: 'rapier',
    config: { ...BASE_FL, gripEnabled: false, gripShift: 0.61, gripDuration: 0.5, muscleAlpha: 11, gripFeet: { FL: true, FR: true, BL: true, BR: true }, sweepAmount: 0 },
    legWeight: DEFAULT_LEG_WEIGHT,
  },

]

export function presetsForEngine(engine: SimEngine): SimPreset[] {
  return SIM_PRESETS.filter((p) => p.engine === engine)
}

export function findSimPreset(name: string, engine: SimEngine): SimPreset | undefined {
  return SIM_PRESETS.find((p) => p.name === name && p.engine === engine)
}

// Apply a preset ABSOLUTELY: every SimConfig key the preset omits lands on its default rather than
// inheriting from whatever was loaded before, and the leg weight — which lives in the rig group store,
// outside SimConfig — is written to every leg. Both halves are required for the preset to reproduce the
// run it was recorded from; without them the viewer silently sees a different simulation.
export function applyPreset(preset: SimPreset): void {
  useAnimateStore.getState().applySimConfigAbsolute({ ...preset.config, simEngine: preset.engine })
  const shared = useSharedStore.getState()
  const leg = shared.groups.find((g) => g.type === 'leg-left' || g.type === 'leg-right')
  if (leg) shared.setGroupNodeWeight(leg.id, preset.legWeight)
}
