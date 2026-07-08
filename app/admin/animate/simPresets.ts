import { SimConfig } from './animateStore'

export interface SimPreset {
  name: string
  description: string
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

export const SIM_PRESETS: SimPreset[] = [
  // The pure CPG body wave with the legs built and held rigid, no grip, no drag. With no drag the body
  // just undulates in place (no net travel) — this is the clean traveling wave the grip timing is read
  // against, and the baseline every grip experiment is compared to.
  {
    name: 'base wave',
    description: 'Stiff legs, no grip, no drag — the pure CPG traveling wave undulating in place (no thrust). The reference wave. α11 → peak 99% of the angle cap (max amplitude, no clip).',
    config: { ...BASE_FL, muscleAlpha: 11 },
  },
  // Same as base wave but with body drag ON: the anisotropic resistance turns the same traveling wave
  // into forward swimming. Drag damps the lateral bend, so α is raised (16 vs 11) to push the joints back
  // up to just under the cap for the same near-max wave amplitude.
  {
    name: 'base swim',
    description: 'base wave + drag ON — the wave now swims the body forward. α16 (raised, drag damps the bend) → peak 97% of the cap.',
    config: { ...BASE_FL, environmentEnabled: true, muscleAlpha: 16 },
  },
  // The current one-foot experiment: FL grips continuously (gripDuration 1 = never releases) with the
  // rigid leg and no drag. The rigid anchor pins the front girdle as a fixed node, reflecting the wave
  // into a standing wave with zero travel. The clamp amplifies the girdle joint, so α is LOWERED (6 vs
  // 11) to keep the peak just under the cap.
  {
    name: 'base FL grip',
    description: 'base wave + FL gripping continuously (rigid leg, no drag). Fixed node → standing wave, no travel. α6 (lowered, clamp amplifies the joint) → peak 98% of the cap.',
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
    config: { ...BASE_FL, gripShift: 0.61, gripDuration: 0.5, muscleAlpha: 11 },
  },
  // All four feet gripping on the CPG clock, timed to each foot's backward power stroke (gripShift 0.61,
  // gripDuration 0.5). No sweep yet (sweepAmount 0). The gripped feet anchor on the backward stroke and
  // release on the forward stroke, so the body inches forward and stays roughly straight — the first
  // whole-body walk built on the CPG-timed grip.
  {
    name: 'base walk',
    description: 'All 4 feet grip on the CPG clock, timed to the backward power stroke (gripShift 0.61 / gripDuration 0.5). No sweep. Inches forward, stays roughly straight — the base walk.',
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
    config: { ...BASE_FL, gripEnabled: false, gripShift: 0.61, gripDuration: 0.5, muscleAlpha: 11, gripFeet: { FL: true, FR: true, BL: true, BR: true }, sweepAmount: 0 },
  },
]

export function findSimPreset(name: string): SimPreset | undefined {
  return SIM_PRESETS.find((p) => p.name === name)
}
