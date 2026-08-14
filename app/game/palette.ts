import { Phenotype } from './dragons.genetics'
import { DragonRole } from './dragons.types'

// PROVISIONAL, and the whole module is the placeholder that genetics replaces.
//
// The printed material is PHA in three colours, so those three are what a creature can ever be made of.
// They are named here rather than read from `filament_colors` on purpose: that table currently holds
// nine rows, every one of them flagged available, and all of them demo or test colours left over from
// authoring. Reading it today paints the creature in bright developer colours, which is the exact thing
// this module exists to stop.
//
// When E2 seeds the palette against the real PHA rules, and when a creature carries a genotype, this is
// deleted and `resolveGenotype` supplies the phenotype instead. Nothing else has to change, because the
// renderer only ever sees a map from role to colour.
export const PHA_COLORS = ['#ece7dd', '#1b1917', '#b08968'] as const

export function paletteForRoles(roles: DragonRole[]): Phenotype {
  if (roles.length === 0) {
    console.error('palette: the variant has no roles, so no part of a creature can be coloured')
    throw new Error('palette: the variant has no roles, so no part of a creature can be coloured')
  }

  const ordered = [...roles].sort((a, b) => a.display_order - b.display_order)
  const phenotype: Phenotype = {}
  ordered.forEach((role, index) => {
    phenotype[role.key] = PHA_COLORS[index % PHA_COLORS.length]
  })
  return phenotype
}
