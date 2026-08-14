// PROVISIONAL, and the whole module is the placeholder that genetics replaces.
//
// The printed material is PHA in three colours, so those three are what a creature can ever be made of.
// They are named here rather than read from `filament_colors` on purpose: that table currently holds
// nine rows, every one of them flagged available, and all of them demo or test colours left over from
// authoring. Reading it today paints the creature in bright developer colours, which is the exact thing
// this module exists to stop.
//
// Colour is assigned per PIECE, not per role. A printed creature is assembled from many small pieces,
// each one printed in a single filament, so a mosaic of small pieces in three colours is what the object
// actually looks like. Role-wide blocks read as three painted zones, which is a different object.
//
// When E2 seeds the palette against the real PHA rules and a creature carries a genotype, this is
// deleted and the map is produced from the genotype instead. Nothing else changes, because the renderer
// only ever sees a map from piece to colour.
export const PHA_COLORS = {
  eggshell: '#efe7d6',
  obsidian: '#232122',
  natural: '#cfbfa4',
} as const

const PALETTE = [PHA_COLORS.eggshell, PHA_COLORS.obsidian, PHA_COLORS.natural]

// A stable scatter rather than a cycle: cycling the detection order bands the body into stripes, which
// reads as a pattern nobody chose. The hash is deterministic, so a piece keeps its colour across loads.
function hashToIndex(id: string, buckets: number): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % buckets
}

export function paintSegments(segmentIds: string[]): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const id of segmentIds) colors[id] = PALETTE[hashToIndex(id, PALETTE.length)]
  return colors
}
