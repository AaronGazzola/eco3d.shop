import { SimConfig } from './animateStore'

export interface SimPreset {
  name: string
  description: string
  config: Partial<SimConfig>
}

const SWIM_BASE: Partial<SimConfig> = {
  gravityEnabled: true,
  landLegsEnabled: false,
  landGroundEnabled: true,
  limbCpgEnabled: true,
  legsLocked: true,
  environmentEnabled: true,
  frontDrive: 0,
  frontSegments: 0,
  turnBias: 0,
  bodyFriction: 0,
  legFriction: 0.05,
  gripEnabled: false,
  gripShift: 0.27,
  gripDuration: 0.41,
  releaseFriction: 0,
  gripGlowEnabled: true,
  gripFeet: { FL: true, FR: true, BL: true, BR: true },
  stepEnabled: false,
  sweepAmount: 0.2,
  sweepSpeed: 37000,
  liftAmount: 0.3,
  legStiffness: 3000,
  legDamping: 120,
}

// "Energy" swim family — the muscle is tuned strong+elastic (α22, β35, δ6) so the joint amplitude
// saturates at its cap across the WHOLE drive range, decoupling amplitude from frequency. With this
// muscle the Drive knob behaves as a single "energy" control: it sets the undulation frequency (and
// motion energy / KE) while amplitude stays maxed — low drive = slow but still full-amplitude wave,
// high drive = fast full-amplitude wave. Verified via the observation loop (drive 0.5→2.5 all hold
// maxJ ~100%, planar comY~0, tilt 1–4°). Stay below the axial saturation threshold d_th=3.
const SWIM_ENERGY_BASE: Partial<SimConfig> = {
  ...SWIM_BASE,
  cpgExcitability: 0.5,
  muscleAlpha: 22,
  muscleBeta: 35,
  muscleDamping: 6,
}

// Fully-isolated axial spine: legs OFF *and* the four limb oscillators OFF (limbCpgEnabled:false),
// so the central wave is a single continuous undulation with nothing coupling into it — the truest
// "core CPG" the rig can produce. Verified in isolation via the observe harness (11 axial nodes,
// planar tilt ~1°). Two orthogonal knobs were mapped here:
//   • Drive sets FREQUENCY + energy (ν = drive·exc·1.1) while the strong/elastic muscle holds joint
//     amplitude at the angle cap. Drive 0.6→2.8 scales the swim smoothly; raising EXCITABILITY past
//     ~1.0 instead collapses amplitude (muscle-bandwidth limit), and drive ≥3.0 falls off the axial
//     saturation cliff (d_th=3) — so Drive is the reliable single "swim-strength" control.
//   • α/β ratio sets the wave AMPLITUDE (tail Z-span 0.9 at α4/β35 → 5.2 at α40/β18), independent of
//     frequency, with the joint angle cap as the ceiling.
const AXIAL_ISO_BASE: Partial<SimConfig> = {
  ...SWIM_ENERGY_BASE,
  limbCpgEnabled: false,
}

// Walking on the measured-undulation timing. The grip/sweep window is clocked off each foot's MEASURED
// body-wave reach (useLocomotion.updateMechPhase, 0 = max-forward reach), NOT the CPG phase — so a single
// gripShift/gripDuration keeps the foot planting at max-forward and releasing at max-backward across ANY
// drive/muscle (validated: max-forward reach lands at phase ~0 for drive 0.8-2.4). Gentle leg-motor
// params (vs the stiff "locked-leg" hold values) keep the step stable; the body runs a traveling wave
// (our compliant body can't hold the paper's standing wave) and that wave carries the legs through swing.
const WALK_BASE: Partial<SimConfig> = {
  gravityEnabled: true,
  landLegsEnabled: true,
  landGroundEnabled: true,
  limbCpgEnabled: true,
  legsLocked: false,
  environmentEnabled: false,
  cpgExcitability: 0.5,
  frontDrive: 0,
  frontSegments: 0,
  turnBias: 0,
  limbDrive: 0,
  feedbackIpsi: 0,
  feedbackContra: 0,
  muscleAlpha: 22,
  muscleBeta: 35,
  muscleDamping: 6,
  bodyFriction: 0.05,
  legFriction: 0.6,
  releaseFriction: 0,
  gripEnabled: true,
  gripShift: 0.05,
  gripDuration: 0.5,
  gripGlowEnabled: true,
  gripFeet: { FL: true, FR: true, BL: true, BR: true },
  stepEnabled: true,
  sweepAmount: 0.3,
  sweepSpeed: 37000,
  liftAmount: 0.25,
  legStiffness: 3000,
  legDamping: 120,
}

export const SIM_PRESETS: SimPreset[] = [
  // ── WALK — legs stepping on the measured-undulation timing (grip plants at max-forward reach,
  // releases at max-backward; one timing config holds across drive). The body wave carries the legs.
  {
    name: 'Walk — slow',
    description: 'Stable walk, slow body wave (drive 0.8). Grip/sweep timed to the measured reach. ~12 units/14s.',
    config: { ...WALK_BASE, cpgDrive: 0.8 },
  },
  {
    name: 'Walk — mid',
    description: 'Stable walk (drive 1.5). Same grip timing as slow/fast — invariant to drive. ~9 units/14s.',
    config: { ...WALK_BASE, cpgDrive: 1.5 },
  },
  {
    name: 'Walk — fast',
    description: 'Faster walk (drive 2.4). Same grip timing. ~14 units/14s, stays planar (tilt ~3°).',
    config: { ...WALK_BASE, cpgDrive: 2.4 },
  },

  // ── Isolated spine — WAVE SHAPE (drag OFF: the body oscillates in place so you can watch the
  // amplitude/frequency of the pure undulation without it swimming out of frame). α/β sets amplitude.
  {
    name: 'Spine wave — small',
    description: 'Isolated spine, drag off. Shallow undulation (α8/β35 → tail span ~1.5). Watch in place.',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: false, cpgDrive: 1.5, muscleAlpha: 8, muscleBeta: 35, muscleDamping: 6 },
  },
  {
    name: 'Spine wave — medium',
    description: 'Isolated spine, drag off. Mid undulation (α15/β35 → tail span ~2.5).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: false, cpgDrive: 1.5, muscleAlpha: 15, muscleBeta: 35, muscleDamping: 6 },
  },
  {
    name: 'Spine wave — broad',
    description: 'Isolated spine, drag off. Broad slow wave at the angle cap (drive 1.0, α22/β35 → tail span ~3.5).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: false, cpgDrive: 1.0, muscleAlpha: 22, muscleBeta: 35, muscleDamping: 6 },
  },
  {
    name: 'Spine wave — huge eel',
    description: 'Isolated spine, drag off. Maximum-amplitude eel bend (α40/β18 → tail span ~5.2, ~1.5 wavelengths).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: false, cpgDrive: 1.2, muscleAlpha: 40, muscleBeta: 18, muscleDamping: 4 },
  },
  {
    name: 'Spine wave — fast buzz',
    description: 'Isolated spine, drag off. High frequency, small amplitude via excitability (exc 1.5 → tail span ~0.5).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: false, cpgDrive: 1.5, cpgExcitability: 1.5 },
  },

  // ── Isolated spine — SWIM STRENGTH (drag ON: the single-knob energy ladder. Same muscle, only Drive
  // changes — speed scales smoothly while the wave stays planar (tilt ~1°). This is the candidate for a
  // single "swim strength" slider.) Forward travel over 10s noted in each description.
  {
    name: 'Spine swim — 1 idle',
    description: 'Isolated spine, drag on. Gentle cruise (drive 0.6 → ~14 units/10s).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: true, cpgDrive: 0.6 },
  },
  {
    name: 'Spine swim — 2 cruise',
    description: 'Isolated spine, drag on. Steady swim (drive 1.2 → ~28 units/10s).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: true, cpgDrive: 1.2 },
  },
  {
    name: 'Spine swim — 3 brisk',
    description: 'Isolated spine, drag on. Brisk swim (drive 2.0 → ~45 units/10s).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: true, cpgDrive: 2.0 },
  },
  {
    name: 'Spine swim — 4 sprint',
    description: 'Isolated spine, drag on. Fast sprint, still planar (drive 2.8 → ~58 units/10s; stay below the d_th=3 cliff).',
    config: { ...AXIAL_ISO_BASE, environmentEnabled: true, cpgDrive: 2.8 },
  },
]

export function findSimPreset(name: string): SimPreset | undefined {
  return SIM_PRESETS.find((p) => p.name === name)
}
