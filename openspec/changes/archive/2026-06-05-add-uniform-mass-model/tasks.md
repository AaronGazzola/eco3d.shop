## 1. Type + defaults

- [x] 1.1 Add `nodeWeight?: number` to `BodyGroup` in `app/admin/_lib/types.ts`.
- [x] 1.2 In `body.ts`, add `DEFAULT_AXIAL_WEIGHT = 1.5`, `DEFAULT_LEG_WEIGHT = 0.4`, `STD_SEGMENT_WIDTH = 0.5`, and a `defaultWeightFor(type)` helper.
- [x] 1.3 `npx tsc --noEmit` passes.

## 2. Body spec — mass from weight, inertia from weight + length

- [x] 2.1 `buildBodySpec` sets `mass = group.nodeWeight ?? defaultWeightFor(group.type)` (mesh-volume mass path removed).
- [x] 2.2 `inertiaAboutComY = mass * (length² + STD_SEGMENT_WIDTH²) / 12` (mesh-extent inertia removed).
- [x] 2.3 Mesh centroid kept only for `restComX/restComZ`; no mesh extent feeds any dynamics quantity.
- [x] 2.4 Solver unchanged — it already reads `mass`/`inertiaAboutComY` from the spec.
- [x] 2.5 `npx tsc --noEmit` and `npx eslint` pass. (Verified uniform `1.5` per segment in capture.)

## 3. Calibrate — per-node weight authoring (legs ganged)

- [x] 3.1 Per-chain-group weight control in `CalibrateTab.tsx` (numeric + range, `0.1–10` kg), bound to `nodeWeight`. (Note: used a single-value control, not the 3-thumb `LimitSlider`, which is for caps.)
- [x] 3.2 `setGroupNodeWeight` gangs all four legs (edit one → all four equal); head/spine/tail independent.
- [x] 3.3 `nodeWeight` persists via the existing `groups` save/load path (same as `angleCaps`). _Visual confirmation pending — see §7.2._
- [x] 3.4 `npx tsc --noEmit` and `npx eslint` pass.

## 4. Re-tune for the uniform, ~50× lighter scale

- [x] 4.1 `CPG_TO_MUSCLE_GAIN = 12` (was 80) in `useLocomotion.ts`.
- [x] 4.2 `DRAG_NORMAL/TANGENT/ANGULAR = 0.6 / 0.05 / 0.03` (was 30 / 2.5 / 1.5) in `environment.ts`; anisotropy ratio 12 preserved.
- [x] 4.3 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Fix the reversed CPG→joint mapping (the real blocker)

- [x] 5.1 `useLocomotion.ts:205` `jointToCpgSegment` changed from `n - 1 - j.segmentIndex` (reversed → swims backward) to `j.segmentIndex` (head→tail → swims forward).
- [x] 5.2 Add `scripts/locomotion-drag-direction.ts`: headless first-principles test proving the drag is correct, and that the natural mapping swims forward while the reversed one swims backward. Kept as a regression guard.
- [x] 5.3 Set store defaults `cpgDrive = 2.0`, `cpgExcitability = 0.09` (large amplitude + slow ~0.2 Hz beat — the graceful look).
- [x] 5.4 `npx tsc --noEmit` passes.

## 6. Documentation

- [x] 6.1 `animation-roadmap.md` §4 status entry (2026-06-05): nodeWeight model + constants, the reversed-mapping discovery/fix, the forward-swim result, the default drive/exc, and the deferred thrust tuning.
- [x] 6.2 Reference §8, `locomotion.md`, roadmap Part 8 rule 2 + Decision 7 read correctly against shipped code.

## 7. Visual gates

- [x] 7.1 **Swimming forward** — coupled drive + Drag ON at default drive/exc: COM drifts monotonically head-first (capture `capture-2026-06-05T10-57-17`, `rootX` −35.4 → −40.0, head leading, no sloshing). Direction + monotonicity are the gate; absolute speed deferred (§8).
- [x] 7.2 **Calibrate weight UI** — confirmed in the studio: weight slider edits a node, legs gang together, values persist. (User-verified 2026-06-05.)

## 8. Deferred (moved to Linear — not built in this change)

- Thrust-speed and cap-riding fine-tuning (raise drag for faster forward drift; lower gain so joints stop riding their caps). Explicitly deferred past Phase D per the user. Tracked as **[AZ-33](https://linear.app/gazzola/issue/AZ-33)** — **not** a lingering task here.

## 9. OpenSpec validation

- [x] 9.1 `npx openspec validate add-uniform-mass-model --strict` passes (re-run after the spec/proposal edits).
