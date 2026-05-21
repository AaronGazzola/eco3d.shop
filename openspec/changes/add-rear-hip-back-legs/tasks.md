## 1. Cascade chain extension

- [ ] 1.1 In `app/game/locomotion/chain.ts`, extend `buildCascadeChain` to slice spines at the index of the *second* hip-bearing spine group + 1 (instead of the first). If only one hip-bearing spine exists, preserve today's behavior. If zero, return `[head, ...spines]` as today.
- [ ] 1.2 `npx tsc --noEmit` passes.

## 2. Rear hip discovery

- [ ] 2.1 In `app/game/locomotion/legs.ts`, add `findRearHip(groups: BodyGroup[]): BodyGroup | null` returning the second spine group whose `nodeHipLeft` or `nodeHipRight` is set, or `null` if fewer than two exist.
- [ ] 2.2 Do not modify `findFrontHip` or `findLegsForHip`.
- [ ] 2.3 `npx tsc --noEmit` passes.

## 3. Per-hip locomotion state restructure

- [ ] 3.1 In `app/game/locomotion/useLocomotion.ts`, refactor `feetRef` from `{ left: FootState | null; right: FootState | null }` to `{ front: { left: FootState | null; right: FootState | null } | null; rear: { left: FootState | null; right: FootState | null } | null }`.
- [ ] 3.2 Refactor `hipStateRef` from a single `HipState` to `{ front: HipState; rear: HipState }`.
- [ ] 3.3 Refactor `initIdRef` from a single string to `{ front: string | null; rear: string | null }` so each hip's initialization is tracked independently.
- [ ] 3.4 Replace the `frontHip` `useMemo` with two `useMemo`s — `frontHip` (unchanged signature) and `rearHip` (using `findRearHip`).
- [ ] 3.5 Add `rearLegs` `useMemo` mirroring `frontLegs`, using `findLegsForHip(groups, rearHip.id)` when `rearHip` is non-null.
- [ ] 3.6 `npx tsc --noEmit` passes.

## 4. Per-hip step decision loop

- [ ] 4.1 Extract the existing front-hip step-decision body (lines roughly 208–303 of `useLocomotion.ts` — `if (hipInChain && frontHip && frontHip.nodeBack && !calibrating)` block) into a local helper function `runHipStep(hipGroup, hipState, feetPair, legsPair, hipCascadeIdx, dt)` returning `{ appliedHipYaw, leftStrain, rightStrain }`. The helper SHALL initialize `feetPair` and `hipState` lazily when its `initIdRef[slot]` does not match the current hip id, mirroring today's logic.
- [ ] 4.2 In the per-frame body, compute `frontHipIdx` (cascade index of front hip if present) and `rearHipIdx` (cascade index of rear hip if present).
- [ ] 4.3 Call `runHipStep` once for the front hip (using `frontHipIdx`) and once for the rear hip (using `rearHipIdx`), each guarded by that hip's presence in the cascade. Front-hip call SHALL NOT block on rear-hip swing state and vice versa.
- [ ] 4.4 Within `runHipStep`, preserve the existing "only one foot per hip swings at a time" rule (compute `stepping` for that hip's pair only).
- [ ] 4.5 Confirm that the front-hip behavior is unchanged when the rig has only one hip (the rear-hip branch is skipped, all front-hip state is identical to today).
- [ ] 4.6 `npx tsc --noEmit` passes.

## 5. Per-pivot render loop applies per-hip yaw

- [ ] 5.1 In the `for (const sg of skeletonGroups)` loop, where `r = i === hipIdx && hipInChain ? appliedHipYaw : cascadeOut[i]` is computed today, generalize so the loop checks whether `i === frontHipIdx` (use front `appliedHipYaw`), `i === rearHipIdx` (use rear `appliedHipYaw`), or neither (use `cascadeOut[i]`).
- [ ] 5.2 Remove the single `hipIdx` / `hipInChain` derived state; replace with the two indices from task 4.2.
- [ ] 5.3 `npx tsc --noEmit` passes.

## 6. Back-leg rendering

- [ ] 6.1 In the foot-marker / `applyLegBone` block (currently guarded by `hipInChain && frontHip && frontHip.nodeBack`), add a parallel block for the rear hip: guarded by `rearHip` present in cascade and `rearHip.nodeBack` set, call `applyLegBone` twice (left + right) with the rear-hip pivot, rear-hip `nodeBack`, rear-hip `nodeHipLeft`/`nodeHipRight`, and the rear foot states.
- [ ] 6.2 Confirm `applyLegBone` is not modified (it is already generic over which hip).
- [ ] 6.3 `npx tsc --noEmit` passes.

## 7. Foot marker plumbing

- [ ] 7.1 In `app/game/locomotion/useLocomotion.ts`, change `FootMarkerRefs` from `{ left, right }` to `{ front: { left, right }; rear: { left, right } }`. Each pair's refs may be null when that hip is absent.
- [ ] 7.2 Update the marker-writing code to write each pair from its corresponding hip's foot states, gated on the marker ref's presence.
- [ ] 7.3 In `app/game/AnimatedModel.tsx`, add a `hasRearLegs` `useMemo` analogous to `hasFrontLegs`, using `findRearHip`.
- [ ] 7.4 Create rear-pair marker refs (`rearLeftFootMarkerRef`, `rearRightFootMarkerRef`) alongside the existing front refs.
- [ ] 7.5 Render `<FootMarker>` for each present pair with four distinct colors (existing two for front, two new for rear).
- [ ] 7.6 Pass the new `FootMarkerRefs` shape into `useLocomotion`.
- [ ] 7.7 `npx tsc --noEmit` passes.

## 8. Diagnostics snapshot restructure

- [ ] 8.1 In `app/game/locomotion/diagnostics.ts`, define `HipSnapshot` with fields: `id: string`, `hipBack: { x: number; z: number } | null`, `cascadeIndex: number`, `wantedYaw: number`, `appliedYaw: number`, `plantedYaw: number`, `targetYaw: number`, `leftFoot: FootSnapshot | null`, `rightFoot: FootSnapshot | null`.
- [ ] 8.2 Modify `FrameSnapshot`: remove `frontHipId`, `hipBack`, `hipState`, `wantedHipYaw`, `appliedHipYaw`, `leftFoot`, `rightFoot`. Add `frontHip: HipSnapshot | null` and `rearHip: HipSnapshot | null`.
- [ ] 8.3 In `useLocomotion.ts`, update the snapshot-building code in the `if (shouldSnapshot && pivotSnapshots)` block to populate `frontHip` and `rearHip` per the new shape. Use the strain values returned from each hip's `runHipStep` call.
- [ ] 8.4 The `pivots` array continues to include every cascade member (including the rear hip when present) — no code change there since the existing loop iterates `cascadeIds`.
- [ ] 8.5 `npx tsc --noEmit` passes.

## 9. Studio sidebar updates

- [ ] 9.1 In `app/admin/animate/StepAnimate.tsx`, update the snapshot/recording display to render `frontHip` and `rearHip` sections side-by-side or stacked. Each section shows: hip id, planted yaw, target yaw, applied yaw, wanted yaw, and a row per foot (phase, plantedX/Z, swingT, strain).
- [ ] 9.2 If `rearHip` in the snapshot is `null`, do not render the rear section (no placeholder).
- [ ] 9.3 Preserve the existing Clear attractor, Copy snapshot, Start/Stop recording, Copy recording, Clear recording controls. Their behavior is unchanged; the copied payload reflects the new shape.
- [ ] 9.4 `npx tsc --noEmit` passes.

## 10. Browser verification

- [ ] 10.1 Run `npm run dev`, open the Animate step with a two-hip dragon configuration.
- [ ] 10.2 Click directly in front of the dragon: head tracks, body still — no regression from Step 5.
- [ ] 10.3 Click far to one side: head reaches cap, spine cascades, front-hip strain rises, a front foot lifts and replants. Continue: rear-hip strain rises as the spine S-curves, a back foot lifts and replants.
- [ ] 10.4 Click directly behind the dragon: full-body cascade engages, multiple feet step in sequence; the dragon should rotate substantially toward the attractor.
- [ ] 10.5 Click in a circle around the dragon (several clicks in sequence): observe whether diagonal-couplet alternation emerges (front-left + back-right tending to step together, then front-right + back-left).
- [ ] 10.6 Confirm all four foot markers render and track their respective feet's world positions correctly through swings (XZ interpolation + vertical lift).
- [ ] 10.7 Confirm back-leg bone lengths are preserved across swings (visually no stretch). Confirm back-leg hip ends stay welded to rear-hip sockets.
- [ ] 10.8 Confirm the tail remains at rest throughout (Step 8 territory).
- [ ] 10.9 Use the sidebar's Copy snapshot to capture a representative frame for both a planted state and a mid-swing state. Confirm the JSON contains `frontHip` and `rearHip` with the expected fields.
- [ ] 10.10 If diagonal-couplet alternation does NOT emerge, record a representative session (Start/Stop recording, Copy recording), paste the recording into a note, and document the observed gait + suggested tuning hypothesis in `documentation/animation_design.md` § Current Status. This is a finding, not a blocker.

## 11. Documentation update

- [ ] 11.1 In `documentation/animation_design.md`, update the "Current status" header date and bullets to reflect Step 6 completion. Note which sub-bullets of Step 6's "passes if" criteria are met and which (if any) require follow-up tuning.
- [ ] 11.2 Update the "Pick up here" bullet to point at Step 7 (or Step 8 if Step 7 — emergent walking — is also verified during browser verification, since the doc notes Step 7 adds no new code).

## 12. Validate the OpenSpec change

- [ ] 12.1 Run `npx openspec validate add-rear-hip-back-legs --strict` and resolve any reported issues.
- [ ] 12.2 Run `npx openspec status --change add-rear-hip-back-legs` and confirm all artifacts are `done`.
