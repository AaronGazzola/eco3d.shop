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

## Open questions (resolve during the build)

- **Limb→girdle wiring.** `buildCpgSpec` currently takes only `segmentLengths`; it now needs the
  leg→spine attachment (which axial segment is each girdle, fore vs hind) to place the limb↔axial
  couplings. Pass the chain groups (or a derived limb-attachment map) into `buildCpgSpec`.
- **Limb→axial target: which oscillator(s)?** Each axial segment has L/R oscillators; decide whether
  the limb couples to one side, both, or the segment's mean — pick what reproduces the standing-wave
  pull; verify against the §3 description.
- **Fore vs hind identification.** Map the rig's leg groups (`leg-left`/`leg-right` + their
  `attachedToSpineId` order along the chain) to {LF, RF, LH, RH}.

## Gate

A CPG capture (signal only, no body) shows: the four limb oscillators settle into the **diagonal-trot
phase relationship** (LF+RH in phase, antiphase to RF+LH) **from the couplings alone**; with limbs
active the **axial phase lag shifts toward a standing wave**; and raising the drive makes the **limbs
saturate first** (amplitude → 0) while the axial keeps oscillating.
