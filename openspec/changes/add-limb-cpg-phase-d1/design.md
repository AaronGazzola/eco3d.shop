# Design — Phase D1 (limb CPG signal)

## Context

The axial CPG (`cpg.ts`) is a double chain: `n` segments × {left, right} = `2n` oscillators, with
intra/intersegmental couplings and per-oscillator excitability `e` and saturation threshold `d_th`.
B1 proved the axial wave in signal alone before any body. D1 does the same for the **limbs** — add the
limb oscillators and couplings, verify the gait rhythm, attach nothing physical yet. Reference: Knüsel
2020 §3 (Table 2 couplings), §7 (Table 3 params).

## Decisions

1. **Four single limb oscillators (not left/right pairs).** Left-fore, right-fore, left-hind,
   right-hind — one oscillator each, appended after the `2n` axial oscillators. (The axial segments
   are doubled because the muscle is an antagonist L/R pair; the limb is driven by *one* phase as a
   desired position, per the paper — so one oscillator per limb.)

2. **Per-limb excitability + threshold (faithful).** `e`: forelimbs `0.8`, hindlimbs `0.5` (axial
   `1.1`). `d_th`: limbs `1.27` (axial `3`). Stored in the existing per-oscillator `e[]` / `dTh[]`
   arrays, extended for the four limb indices.

3. **Interlimb couplings — Table 2, all antiphase (`φ=π`).** Lateral (the two limbs of one girdle)
   `w=10`; rostrocaudal fore→hind `w=3`; caudorostral hind→fore `w=30`. The 10× caudorostral makes
   the hind legs lead; working it through, **LF+RH** move together, antiphase to **RF+LH** — the
   diagonal trot, emergent from the couplings (not hand-set initial phases).

4. **Limb↔axial couplings at the girdles.** Each limb couples bidirectionally to *its girdle axial
   segment's* oscillator(s): limb→axial `w=30, φ=4` (strong, near the girdle only — the paper's
   Hypothesis 1), axial→limb `w=2.5, φ=−4` (weak). The girdle segment is the leg group's
   `attachedToSpineId`. This is the lever that drags the trunk toward a **standing wave** when limbs
   are active.

5. **Signal only — no body.** D1 changes `cpg.ts` (+ CPG capture/preview) only. No legs, no transfer
   function, no joints, no environment.

## Resolved during the build

- **Limb→girdle wiring.** `buildCpgSpec` now takes `(segmentLengths, groups?, chainGroupIds?)`. When
  the rig has both hips + four legs, it identifies `{LF, RF, LH, RH}` via `findFrontHip`/`findRearHip`
  + `findLegsForHip` and locates each girdle's axial index by matching the hip's group id against
  `chainGroupIds` (which the caller derives from the same chain `body3d` uses).
- **Limb→axial target: ipsilateral, single side.** Each limb couples to *one* axial oscillator of
  its girdle segment: LF, LH → the **left** axial (index `k`); RF, RH → the **right** axial
  (index `k + n`). Rationale: preserves L/R symmetry (each side gets the same total drive from its
  ipsilateral limb), matches the standard salamander-CPG interpretation, and avoids double-counting
  the limb→axial weight that a bilateral coupling would introduce.
- **Fore vs hind identification.** `findFrontHip` returns the first spine group with `nodeHipLeft`
  or `nodeHipRight`; `findRearHip` returns the second. Chain order from `flattenSkeleton` is
  `[head, ...spines, tail]` so fore is rostral, hind is caudal by construction.

## Gate

A CPG capture (signal only, no body) shows: the four limb oscillators settle into the **diagonal-trot
phase relationship** (LF+RH in phase, antiphase to RF+LH) **from the couplings alone**; with limbs
active the **axial phase lag shifts toward a standing wave**; and raising the drive makes the **limbs
saturate first** (amplitude → 0) while the axial keeps oscillating.
