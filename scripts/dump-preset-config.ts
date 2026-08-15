import { writeFileSync } from 'node:fs'
import { DEFAULT_SIM_CONFIG, SimEngine, SimConfig } from '@/app/admin/animate/animateStore'
import { findSimPreset } from '@/app/admin/animate/simPresets'

// Writes a preset's ABSOLUTE configuration to JSON so the observation harness can be handed the preset
// itself rather than a hand-typed list of --set flags.
//
// This exists because a hand-typed list is a silent lie. A 90 s capture of the grounded tank was taken
// with twenty --set flags and the config it actually ran carried frontDrive 0.6, liftAmount 0.3 and a
// grip window from whatever the studio had been left on — every lever the flags did not name kept the
// browser's persisted value. The numbers were real; they just were not the preset's.
//
//   npx tsx scripts/dump-preset-config.ts "ground tank" mujoco out.json
//   node scripts/observe.mjs run 90 --config out.json

const [, , name, engine = 'mujoco', out] = process.argv
if (!name || !out) {
  console.error('usage: dump-preset-config.ts <preset name> [engine] <out.json>')
  process.exit(1)
}

const preset = findSimPreset(name, engine as SimEngine)
if (!preset) {
  console.error(`no preset "${name}" for engine ${engine}`)
  process.exit(1)
}

// The same fill the store does when a preset is applied: every absent key takes its default, so an
// omitted lever is pinned rather than inherited.
const absolute: Record<string, unknown> = {}
for (const key of Object.keys(DEFAULT_SIM_CONFIG) as Array<keyof SimConfig>) {
  absolute[key] =
    key in preset.config
      ? (preset.config as Record<string, unknown>)[key]
      : (DEFAULT_SIM_CONFIG as unknown as Record<string, unknown>)[key]
}
absolute.simEngine = preset.engine

writeFileSync(out, JSON.stringify(absolute, null, 2))
console.log(`${preset.name} (${preset.engine}) → ${out}`)
console.log(`legWeight ${preset.legWeight} — set it with the harness's own rig weight, it is not a sim config field`)
