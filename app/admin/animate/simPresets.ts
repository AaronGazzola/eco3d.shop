import { SimConfig, SimEngine } from './animateStore'

export interface SimPreset {
  name: string
  description: string
  // The engine this preset was tuned for. The preset dropdown is scoped to the active engine, and
  // applying a preset also switches the engine to this one so a shared link reproduces it exactly.
  engine: SimEngine
  config: Partial<SimConfig>
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

// MuJoCo baseline: the same rigid-leg, no-grip, no-drag CPG wave as BASE_FL but flagged for the MuJoCo
// engine. Under MuJoCo the leg gains ARE live (they map to the hip position-servo kp/kv): the Rapier
// values (200000/37000/120) are so stiff+underdamped they make the legs BUZZ, rocking the body. Calm
// MuJoCo gains (kp 3000 / kv 400) hold the legs as rigid pegs without vibrating.
const MUJOCO_BASE: Partial<SimConfig> = {
  ...BASE_FL,
  simEngine: 'mujoco',
  muscleAlpha: 11,
  sweepSpeed: 3000,
  legStiffness: 3000,
  legDamping: 400,
}

export const SIM_PRESETS: SimPreset[] = [
  // The pure CPG body wave with the legs built and held rigid, no grip, no drag. With no drag the body
  // just undulates in place (no net travel) — this is the clean traveling wave the grip timing is read
  // against, and the baseline every grip experiment is compared to.
  {
    name: 'base wave',
    description: 'Stiff legs, no grip, no drag — the pure CPG traveling wave undulating in place (no thrust). The reference wave. α11 → peak 99% of the angle cap (max amplitude, no clip).',
    engine: 'rapier',
    config: { ...BASE_FL, muscleAlpha: 11 },
  },
  // Same as base wave but with body drag ON: the anisotropic resistance turns the same traveling wave
  // into forward swimming. Drag damps the lateral bend, so α is raised (16 vs 11) to push the joints back
  // up to just under the cap for the same near-max wave amplitude.
  {
    name: 'base swim',
    description: 'base wave + drag ON — the wave now swims the body forward. α16 (raised, drag damps the bend) → peak 97% of the cap.',
    engine: 'rapier',
    config: { ...BASE_FL, environmentEnabled: true, muscleAlpha: 16 },
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
  },

  // ── MuJoCo (reduced-coordinate servo engine) ──────────────────────────────────────────────────────
  // Stage 1 (base wave, no grip, no drag): high amplitude at three frequencies, none clipping the angle
  // cap, body flat, legs rigid & non-vibrating. Tuned for LIGHT legs (~0.1 kg — set in the Calibrate tab
  // or via the `legw=0.1` link param; leg weight can't ride in a preset). Higher drive raises frequency
  // but drops amplitude, so α climbs with drive. New MuJoCo presets are appended as each stage is approved.
  {
    name: 'wave-slow',
    description: 'MuJoCo Stage 1 — base wave, low frequency, high amplitude (drive 0.39 / α5 → ~98% of cap). No grip, no drag; body undulates in place. Assumes light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.39, muscleAlpha: 5 },
  },
  {
    name: 'wave-mid',
    description: 'MuJoCo Stage 1 — base wave, mid frequency (~2×), high amplitude (drive 0.80 / α12 → ~98% of cap). No grip, no drag. Assumes light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.8, muscleAlpha: 12 },
  },
  // Stage 2 (base swim): the base wave + anisotropic drag → forward swimming. Drag damps the lateral bend,
  // so α is raised vs the dry wave to keep the stroke near the angle cap. Light legs (~0.1 kg).
  {
    name: 'swim-slow',
    description: 'MuJoCo Stage 2 — base swim, low frequency (drive 0.39 / α18, drag ON → ~90% of cap). Strong slow stroke; swims forward fastest of the three. Assumes light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, environmentEnabled: true, cpgDrive: 0.39, muscleAlpha: 18 },
  },
  {
    name: 'swim-mid',
    description: 'MuJoCo Stage 2 — base swim, mid frequency (drive 0.80 / α16, drag ON → ~86% of cap). Swims forward, straight. Assumes light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, environmentEnabled: true, cpgDrive: 0.8, muscleAlpha: 16 },
  },
  // Stage 4 (timing indicators only — grip + sweep NOT actuating, legs rigid): the foot glow + sweep arrow
  // visualise the CPG-clocked gait. gripShift 0.36 = φ_fwd of the mid wave, so the grip window opens at
  // max-forward reach and closes at max-back; the sweep arrow flips in lockstep (verified IN SYNC).
  {
    name: 'timing',
    description: 'MuJoCo Stage 4 — grip/sweep timing indicators (grip+sweep OFF). Mid wave; grip glow lights at max-forward reach → off at max-back (gripShift 0.36), sweep arrow orange(back)↔green(fwd) in lockstep. Light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.8, muscleAlpha: 12, gripShift: 0.36, gripDuration: 0.5, gripFeet: { FL: true, FR: true, BL: true, BR: true } },
  },
  // Stage 5 (grip ON, no sweep): the four feet grip on the CPG clock (timed to the backward power stroke),
  // legs held rigid & perpendicular. The timed plant/release converts the standing wave into a forward
  // walk (Δx ~−10/14s, straight, flat) — grip is the sole thrust. Base walk.
  {
    name: 'grip-walk',
    description: 'MuJoCo Stage 5 — timed 4-foot grip, no sweep (gripShift 0.36 / gripDuration 0.5). Walks forward from grip alone (~0.8 u/s), straight & flat; legs stay rigid pegs. Light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.8, muscleAlpha: 12, gripEnabled: true, gripShift: 0.36, gripDuration: 0.5, gripFeet: { FL: true, FR: true, BL: true, BR: true } },
  },
  // Stage 6 (sweep ON, no grip): the leg sweep swings fore/aft off the CPG clock while no foot grips. The
  // MuJoCo position-servo spine keeps tracking the CPG regardless of the leg motion, so the wave survives
  // (cap holds 98-100%) and the body stays flat — but with no grip there is no anchor, so no net travel.
  // sweepSpeed 10000 is the fore/aft servo bandwidth needed for the sweep to reach its full angle cap.
  {
    name: 'sweep-only',
    description: 'MuJoCo Stage 6 — full leg sweep, no grip (sweepAmount 1 / sweepSpeed 10000). The sweep momentum does NOT break the spine wave (cap 98-100%), body flat; no grip = no thrust, minimal travel. Light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.8, muscleAlpha: 12, sweepAmount: 1, sweepSpeed: 10000 },
  },
  // Stage 7 (grip + sweep = walk): the timed 4-foot grip pins each planted foot with a real solver
  // `connect` equality (toggled via mj_setState/mjSTATE_EQ_ACTIVE — the reduced-coordinate analogue of
  // Rapier's spherical-joint pin), so the sweeping leg drives the BODY over the planted foot instead of
  // dragging the foot. Stable (no blowup), moves forward, legs sweep at 56-72% of cap. NOT yet flat: the
  // body still climbs/pitches up as it walks (comY +1.35, tilt →25° over 14s) — the next tuning target is
  // keeping the belly on the ground. Light legs (~0.1 kg).
  {
    name: 'grip-sweep-walk',
    description: 'MuJoCo Stage 7 — grip + sweep walk (no leg lift). Real solver foot pin + timed sweep drives the body forward, no explosion. Not flat yet (body rears up) — tuning target. Light legs (~0.1 kg).',
    engine: 'mujoco',
    config: { ...MUJOCO_BASE, cpgDrive: 0.8, muscleAlpha: 12, gripEnabled: true, gripShift: 0.36, gripDuration: 0.5, gripFeet: { FL: true, FR: true, BL: true, BR: true }, sweepAmount: 0.6, sweepSpeed: 10000, liftAmount: 0 },
  },
]

export function presetsForEngine(engine: SimEngine): SimPreset[] {
  return SIM_PRESETS.filter((p) => p.engine === engine)
}

export function findSimPreset(name: string, engine: SimEngine): SimPreset | undefined {
  return SIM_PRESETS.find((p) => p.name === name && p.engine === engine)
}
