## 1. Limb oscillators (`cpg.ts`)

- [x] 1.1 Extend `buildCpgSpec` to also receive the chain groups / leg→girdle attachment (not just
  `segmentLengths`), and identify the four legs as {LF, RF, LH, RH} from `leg-left`/`leg-right` +
  `attachedToSpineId` order along the chain.
- [x] 1.2 Append four single limb oscillators after the `2n` axial oscillators; extend `e[]` with
  fore `0.8` / hind `0.5` and `dTh[]` with limb `1.27` for those indices.
- [x] 1.3 `npx tsc --noEmit` + `npx eslint` pass; existing axial CPG behaviour unchanged.

## 2. Couplings

- [x] 2.1 Interlimb (Table 2, all `φ=π`): lateral `w=10`, rostrocaudal fore→hind `w=3`, caudorostral
  hind→fore `w=30`.
- [x] 2.2 Limb↔axial at each girdle (the leg's `attachedToSpineId`): limb→axial `w=30, φ=4`;
  axial→limb `w=2.5, φ=−4` (resolve the "which axial oscillator(s)" open question).

## 3. Diagnostics

- [x] 3.1 Extend the CPG capture / preview to surface the four limb oscillator phases + signed
  activations alongside the axial space-time.

## 4. Gate — diagonal-trot rhythm (signal only)

- [x] 4.1 Headless CPG capture: confirm the diagonal-trot phase relationship emerges (LF+RH in phase,
  antiphase to RF+LH; hind legs lead) **from the couplings alone**, no hand-set phases.
- [x] 4.2 Confirm active limbs shift the axial phase lag toward a standing wave (vs the swim's
  traveling wave).
- [x] 4.3 Confirm limbs saturate first: raise the drive past `≈1.27` and watch limb amplitude → 0
  while axial keeps oscillating.

## 5. Documentation + validation

- [x] 5.1 `documentation/animation-roadmap.md` §4: dated entry — limb oscillators, Table 2 couplings,
  limb↔axial wiring, limb params, the diagonal-trot signal-gate result.
- [x] 5.2 `npx openspec validate add-limb-cpg-phase-d1 --strict` passes.
