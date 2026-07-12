All tasks are build-now code plus a recorded verdict. The verdict is an output (a committed report), not a deferred decision — a no-go conclusion still completes the change.

## 1. Skeleton fixture + MJCF export

- [x] 1.1 Export the active studio creature's `groups` to `documentation/diagnostics/creature-groups.json` via `scripts/mujoco/dump-groups.ts` (reads `model_configs` through the Supabase secret client, picks the legged config — "baby cyber dragon", 15 groups: 11 axial + 4 legs — and writes the fixture). Chose the standalone script over a `window.__studio` addition to avoid touching app code.
- [x] 1.2 `scripts/mujoco/skeleton-to-mjcf.ts` (`buildMjcf`) + `scripts/mujoco/export-mjcf.ts` CLI: read `creature-groups.json`, reuse `buildSkeletonTree`/`flattenSkeleton`/`effectiveAngleCaps` + `weights.ts` (the same helpers `body3d.ts` uses) and emit MJCF — a ground plane, a floating-base trunk chain (capsule geoms via `fromto`, mass from `weights.ts`), one hinge per spine joint about the same bend axis with range `[−capBackward, capForward]`, and a two-hinge (lift then sweep) hip per leg with sweep range `[−capSwing, capStance]` and no carrier body. Foot balls + belly support spheres mirror `body3d.ts` so contact matches the app. Emits `model.xml` (11 segments, 10 spine hinges, 4 legs) + a `model.meta.json` sidecar mapping each joint to its CPG segment/limb + signs/caps for the runner.
- [x] 1.3 `position` actuator for every hinge with `forcerange` = a per-region stall torque (`spineStall`/`hipStall`, tunable) and shared `kp`; `kv` via per-joint `damping`. `ctrlrange` = the joint's cap.
- [x] 1.4 Four `equality/connect` grip constraints (leg body ↔ per-foot mocap anchor body), authored `active="false"`; the runner repositions each mocap to the foot's world point and toggles the constraint on.

## 2. CPG-driven runner

- [x] 2.1 `scripts/mujoco/validate.ts` (run via `tsx`): loads `@mujoco/mujoco` and the exported MJCF; imports `buildCpgSpec`/`initCpgState`/`stepCpg`/`oscillatorOutput`/`girdleClockPhase` from `cpg.ts` + `createDelayBuffer`/`pushAndReadDelayed` from `muscles.ts` (no controller reimplemented); reads config from `findSimPreset`.
- [x] 2.2 Per 1/120 step: `stepCpg`; drive each spine joint as an implicit position servo to the Ekeberg equilibrium angle φEq = α(mL−mR)/(β(mL+mR+γ)) (with the 10 ms delay); drive each leg lift/sweep to the `girdleClockPhase` gait targets exactly as `useLocomotion`; grip = a stiff foot-point spring on the same clock (the app's spherical-joint pin analogue — see report caveat 2, the `eq_active` bool view is unregistered in this WASM build). CPG unchanged.
- [x] 2.3 MuJoCo-WASM runs under **Node** — no browser/Puppeteer needed. Recorded in the report.

## 3. Metrics + verdict

- [x] 3.1 Recorded COM travel, forward speed, body tilt, and spine-wave amplitude for `base wave`, `base swim`, `base walk`, `base FL grip`, and `sweep & grip timing` over a fixed 16 s / 4 s-warmup run. (Amplitude + travel + tilt settle the go/no-go; full spectral coherence + a headless render pass are enhancements to file in Linear, not blockers for this change.)
- [x] 3.2 Metrics captured as a table in the report (numeric state; no renderer wired in this WASM build — a headless render pass is a later nicety, not needed for the verdict).
- [x] 3.3 Wrote `openspec/changes/validate-articulated-locomotion-mujoco/validation-report.md` (committed location — `documentation/diagnostics/` is gitignored): metrics table, the tuned servo/grip/contact settings as the ABA starting point, honest caveats, and an explicit **GO**.

## 4. Verify + archive

- [x] 4.1 `tsc` + eslint clean on the new scripts; deterministic (repeat runs reproduce the metrics).
- [ ] 4.2 Run `openspec-verify-change`; archive.
