## 1. CPG core module

- [ ] 1.1 Create `app/game/locomotion/cpg.ts`. Export types `AxialOscState`, `LimbOscState`, `CpgState`, `Coupling`, `CpgNetwork`.
- [ ] 1.2 Implement `tickCpg(state: CpgState, network: CpgNetwork, drive: number, steer: number, dt: number): { state: CpgState; axialYaws: number[]; limbPhases: number[] }`. Pure function. Updates phase and amplitude per the two ODEs in `documentation/locomotion.md` §2. Returns the new state plus per-axial yaw outputs and per-limb phases.
- [ ] 1.3 Implement `buildCpgNetwork(groups: BodyGroup[]): CpgNetwork`. Reads `buildCascadeChain`, `findFrontHip`, `findRearHip`, `findLegsForHip` to derive topology. Creates axial-neighbour couplings (chain adjacency) and limb-to-girdle couplings (limb owner → hip's axial index). Bakes diagonal-trot initial phases into limb oscillators (front-left = 0, front-right = π, rear-left = π, rear-right = 0).
- [ ] 1.4 Implement `initCpgState(network: CpgNetwork): CpgState`. Sets all axial phases to zero, all amplitudes to zero, all amplitude derivatives to zero. Limb phases are seeded to their gait-offset initial values from the network.
- [ ] 1.5 Implement `axialYawWithSteer(yaw: number, steer: number, capYaw: number, steerScale: number): number`. Applies `steer * steerScale` as a bias and clamps to `[-capYaw, +capYaw]`.
- [ ] 1.6 Constants exported from the module: `DEFAULT_NU_WALK = 1.0`, `DEFAULT_W_AXIAL = 5.0`, `DEFAULT_W_LIMB = 5.0`, `DEFAULT_PHI_AXIAL = 0.2`, `DEFAULT_A_GAIN = 10`, `DEFAULT_STRIDE_FORWARD = 0.5`, `DEFAULT_STEER_SCALE = 0.5`.
- [ ] 1.7 `npx tsc --noEmit` passes.

## 2. Foot phase-driven stepping

- [ ] 2.1 Rewrite `app/game/locomotion/foot.ts`. Replace the `FootState` shape: remove `restOffsetX/Z`, retain `plantedX/Y/Z`. Add `lastPhase` for swing/stance transition detection.
- [ ] 2.2 Remove `STRAIN_THRESHOLD`, `computeStrain`, `footTargetWorld`. Retain `LIFT_HEIGHT`, `easeInOut`. Remove `STEP_DURATION` (swing duration now derives from CPG frequency).
- [ ] 2.3 Implement `updateFootFromPhase(foot: FootState, phase: number, hipWorldX: number, hipWorldY: number, hipWorldZ: number, hipWorldYaw: number, restOffsetX: number, restOffsetZ: number, restY: number, bodyForwardX: number, bodyForwardZ: number, strideForward: number): { phase: 'stance' | 'swing'; worldX: number; worldY: number; worldZ: number }`. Reads `sin(phase)` to determine stance/swing. On stance→swing transition latches next planted position. On swing→stance plants at current position. Computes lift via `LIFT_HEIGHT * sin(swing_band_fraction * π)`.
- [ ] 2.4 `npx tsc --noEmit` passes.

## 3. Wire CPG into useLocomotion

- [ ] 3.1 In `app/game/locomotion/useLocomotion.ts`, remove imports of `computeCascadeRotations`, `projectLegConstraints`, `CascadeSegment`, `LegConstraint`, `computeStrain`, `footTargetWorld`, `STRAIN_THRESHOLD`, `STEP_DURATION`.
- [ ] 3.2 Import `buildCpgNetwork`, `initCpgState`, `tickCpg`, `axialYawWithSteer`, default constants from `./cpg`. Import `updateFootFromPhase`, `LIFT_HEIGHT`, `easeInOut` from `./foot`.
- [ ] 3.3 Replace the cascade-related `useMemo` hooks (`caps`, `cascadeIds`, `cascadeIdxFor`, `cascadeSegments`, `frontLegLengths`, `rearLegLengths`) with `network = useMemo(() => buildCpgNetwork(groups), [groups])` plus retained `chain`, `skeletonGroups`, `allLegs`, `frontHip`, `rearHip`, `frontLegs`, `rearLegs`.
- [ ] 3.4 Replace `frontRuntimeRef`/`rearRuntimeRef` with `cpgStateRef = useRef(initCpgState(network))`. On `network` change, reset the ref via `useEffect`.
- [ ] 3.5 In the `useFrame` body (non-playback, non-calibrating branch), compute `drive` and `steer` from the attractor per `documentation/locomotion.md` §6.
- [ ] 3.6 Call `tickCpg(cpgStateRef.current, network, drive, steer, effectiveDt)`. Save returned state. Take `axialYaws` and `limbPhases`.
- [ ] 3.7 For each axial pivot, set the slerp target quaternion using `axialYawWithSteer(axialYaws[i], steer, effectiveAngleCaps(group).yaw, DEFAULT_STEER_SCALE)` rotated around the Y axis.
- [ ] 3.8 For each limb oscillator, look up its leg and foot. Call `updateFootFromPhase` with the hip socket's current world position (via the hip pivot's `matrixWorld`) and the leg's rest offset (`nodeHipLeft`/`nodeHipRight` to `nodeFoot` in model space). Use the result to update foot state and write marker positions.
- [ ] 3.9 Call `applyHipLegs` for each hip as today; it reads the current foot state and renders the leg via `applyLegBone`. No change to `applyHipLegs` or `applyLegBone`.
- [ ] 3.10 Update the per-frame snapshot to use the new `FrameSnapshot` shape (see section 4).
- [ ] 3.11 `npx tsc --noEmit` passes.

## 4. Diagnostics shape update

- [ ] 4.1 In `app/game/locomotion/diagnostics.ts`, update `FrameSnapshot` shape. Remove `cascadeOutRaw`, `cascadeOut`, `caps`, `desiredHeadYaw`, the prior `frontHip`/`rearHip` `HipSnapshot` fields. Retain `t`, `attractor`, `modelRotation`, `chain`, `pivots`.
- [ ] 4.2 Add `drive: number`, `steer: number` top-level fields.
- [ ] 4.3 Add `axialOscillators: { id: string; name: string; phase: number; amplitude: number; intrinsicFrequency: number; outputYaw: number }[]` and `limbOscillators: { id: string; hipId: string; side: 'left' | 'right'; phase: number; amplitude: number; stanceOrSwing: 'stance' | 'swing'; plantedX: number; plantedY: number; plantedZ: number }[]`.
- [ ] 4.4 Remove `FootSnapshot.strain`, `targetX`, `targetZ`, `restOffsetX`, `restOffsetZ`, `swingStartX/Z`, `swingTargetX/Z`, `swingT`. Foot data is now embedded in `limbOscillators`; `FootSnapshot` type may be removed entirely if no consumer needs the old shape.
- [ ] 4.5 `npx tsc --noEmit` passes.

## 5. Remove deprecated overlays

- [ ] 5.1 In `app/admin/animate/animateStore.ts`, remove `overlays: OverlayState`, `OverlayState` type, `setShowWantedCascade`, `setShowStrainLines`, and the default `overlays` initial value.
- [ ] 5.2 In `app/admin/animate/AnimateScene.tsx`, remove `WantedCascadeStick`, `StrainLines`, `writeWantedSkeleton`, `getActiveSnapshot` (used only by overlays), and the conditional rendering of those components in `SceneContent`. Retain attractor click handler, AnimatedModel render, and AttractorMarker.
- [ ] 5.3 Remove unused imports introduced by the prior overlays (e.g., `buildCascadeChain`, `STRAIN_THRESHOLD`).
- [ ] 5.4 In `app/admin/animate/AnimateSidebar.tsx`, remove the "Scene overlays" section, the `DiagnosticsPanel` cascade table and feet rows, and the `getActiveSnap` helper if no longer used elsewhere in the file. Replace the diagnostics panel content with a placeholder (filled by tasks in §6).
- [ ] 5.5 `npx tsc --noEmit` passes.

## 6. New diagnostics panel content

- [ ] 6.1 Add `DriveSteerReadout` to the sidebar — two readouts: `drive` (with progress bar), `steer` (with bar centered at 0).
- [ ] 6.2 Add `OscillatorsTable` — list of axial oscillators with columns: name, phase (degrees, mod 360), amplitude, intrinsic frequency, output yaw (degrees), cap (degrees).
- [ ] 6.3 Add `LimbsTable` — list of limb oscillators with columns: hip + side, phase (degrees, mod 360), amplitude, stance/swing badge, planted XZ (rounded).
- [ ] 6.4 The panel ticks at 100 ms via the existing setInterval pattern in `DiagnosticsPanel`.
- [ ] 6.5 `npx tsc --noEmit` passes.

## 7. Delete dead locomotion code

- [ ] 7.1 Delete `app/game/locomotion/cascade.ts` if no exports remain referenced from outside the locomotion folder. Otherwise reduce to re-exports of any retained helpers (none are expected).
- [ ] 7.2 Grep for any remaining references to `computeCascadeRotations`, `projectLegConstraints`, `LegConstraint`, `CascadeSegment`, `STRAIN_THRESHOLD`, `computeStrain`, `footTargetWorld`, `STEP_DURATION`, `cascadeIdxFor`, `cascadeIds`. Resolve each (delete or replace).
- [ ] 7.3 `npx tsc --noEmit` passes; `npm run lint` (if configured) passes.

## 8. Browser verification

- [ ] 8.1 Run `npm run dev`, open the studio Animate step with a two-hip lizard rig.
- [ ] 8.2 With attractor unset: creature stands still, no spine oscillation, no foot stepping. Time scale slider at 1x.
- [ ] 8.3 Place attractor directly in front, mid-range: creature walks forward, body oscillates in a standing wave, feet step in diagonal-couplet pattern.
- [ ] 8.4 Place attractor off to one side at mid-range: creature curves while walking, eventually faces the attractor.
- [ ] 8.5 Place attractor close to the creature: creature stops walking; head's cosmetic head-gaze (separate from CPG) tracks the attractor if enabled.
- [ ] 8.6 Place attractor far behind: creature turns through a half-circle while walking, ends up facing and walking toward the attractor. No "stuck" or oscillating-in-place states.
- [ ] 8.7 Drag attractor in a circle around the creature: creature continuously curves to track, stride pattern remains diagonal-couplet.
- [ ] 8.8 Slow time scale to 0.1x: walking is visibly continuous, every step shows the lift arc, body wave is visibly a standing wave with nodes near the hips.
- [ ] 8.9 Use Copy snapshot to confirm the new `FrameSnapshot` shape contains `drive`, `steer`, `axialOscillators`, `limbOscillators`.
- [ ] 8.10 No regressions in the studio's Calibrate tab — CPG ticking is bypassed during calibration as the existing calibrating-group code already does for the cascade.

## 9. Validate the OpenSpec change

- [ ] 9.1 Run `openspec validate replace-locomotion-with-cpg --strict` and resolve reported issues.
- [ ] 9.2 Run `openspec status --change replace-locomotion-with-cpg` and confirm all artifacts are `done`.
