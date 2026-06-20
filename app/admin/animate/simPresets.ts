import { DEFAULT_SIM_CONFIG, SimConfig } from './animateStore'

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

export const SIM_PRESETS: SimPreset[] = [
  {
    name: 'Default',
    description: 'Store default (walking foundation baseline).',
    config: { ...DEFAULT_SIM_CONFIG },
  },
  {
    name: 'Swim energy — low',
    description: 'Low energy: slow undulation, still full amplitude (drive 0.7). KE ~15.',
    config: { ...SWIM_ENERGY_BASE, cpgDrive: 0.7 },
  },
  {
    name: 'Swim energy — mid',
    description: 'Mid energy: faster wave, full amplitude (drive 1.5). KE ~120.',
    config: { ...SWIM_ENERGY_BASE, cpgDrive: 1.5 },
  },
  {
    name: 'Swim energy — high',
    description: 'High energy: fast vigorous wave, full amplitude (drive 2.6). KE ~300.',
    config: { ...SWIM_ENERGY_BASE, cpgDrive: 2.6 },
  },
  {
    name: 'Stage1 — fast',
    description: 'High-frequency swim sweep result (drive 2.4, exc 0.88, strong muscle).',
    config: { ...SWIM_BASE, cpgDrive: 2.4, cpgExcitability: 0.88, muscleAlpha: 42, muscleBeta: 25.2, muscleDamping: 10 },
  },
  {
    name: 'Stage1 — steady',
    description: 'Mid-frequency swim sweep result (drive 2.85, exc 1.0).',
    config: { ...SWIM_BASE, cpgDrive: 2.85, cpgExcitability: 1.0, muscleAlpha: 18, muscleBeta: 35, muscleDamping: 2 },
  },
  {
    name: 'Stage1 — slow-straight',
    description: 'Low-frequency, straight swim sweep result (drive 2.0, exc 0.5).',
    config: { ...SWIM_BASE, cpgDrive: 2.0, cpgExcitability: 0.5, muscleAlpha: 18, muscleBeta: 35, muscleDamping: 30 },
  },
]

export function findSimPreset(name: string): SimPreset | undefined {
  return SIM_PRESETS.find((p) => p.name === name)
}
