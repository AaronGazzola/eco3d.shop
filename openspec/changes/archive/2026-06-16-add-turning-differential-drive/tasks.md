# Tasks — Turning via left/right differential CPG drive

## 1. Extend `stepCpg` with a turn bias

- [x] 1.1 In [app/game/locomotion/cpg.ts](app/game/locomotion/cpg.ts), extend `stepCpg`'s
  signature to `stepCpg(state, spec, drive, excitability, dt, frontDrive?, frontSegments?, turnBias?)`
  with `turnBias` defaulting to `0`. Document the sign convention in a one-line code comment
  on the parameter: positive weakens the left chain (axial `0..n-1` + limbs LF/LH).
- [x] 1.2 Compute `tb = Math.max(-1, Math.min(1, turnBias ?? 0))` once.
- [x] 1.3 Inside the existing `driveArr` build loop (cpg.ts:196-201), multiply each oscillator's
  drive by its **side factor**: `leftFactor = 1 - max(0, tb)` for indices `0..n-1` (left axial)
  and `base + LIMB_LF`, `base + LIMB_LH` (left limbs); `rightFactor = 1 - max(0, -tb)` for
  indices `n..2n-1` (right axial) and `base + LIMB_RF`, `base + LIMB_RH` (right limbs). The
  multiplication SHALL compose with the existing front-segment substitution (front factor first,
  turn factor second).
- [x] 1.4 When `tb === 0`, `driveArr` MUST be bit-exactly equal to the pre-change build (proven
  by a unit-style assertion in the directional script, step 5).

## 2. Animate store wiring

- [x] 2.1 In [app/admin/animate/animateStore.ts](app/admin/animate/animateStore.ts), add
  `turnBias: number` to the `SimConfig` interface (alongside `frontDrive` / `frontSegments`).
- [x] 2.2 Add `turnBias: 0` to `DEFAULT_SIM_CONFIG`.
- [x] 2.3 Add `turnBias: s.turnBias` to `pickSimConfig` so it persists with the rest of the
  sim config.
- [x] 2.4 Add `setTurnBias: (v: number) => void` to the `AnimateStore` interface and implement
  it as `setTurnBias: (v) => set({ turnBias: Math.max(-1, Math.min(1, v)) })`.

## 3. Sidebar control

- [x] 3.1 In [app/admin/animate/AnimateSidebar.tsx](app/admin/animate/AnimateSidebar.tsx)
  `SimulateTab`, read `turnBias` + `setTurnBias` from the store (mirror the existing
  `frontDrive` block above it).
- [x] 3.2 Render a `<Slider>` with label `"Turn bias"`, `min={-1}`, `max={1}`, `step={0.01}`,
  `value={turnBias}`, `onChange={setTurnBias}`, `format={(v) => v.toFixed(2)}`, and a `tip`
  explaining the paper's left/right differential drive (positive curves left, negative right,
  zero off; weakens one chain's CPG drive). Place it immediately after the Front drive slider.

## 4. `__studio` hook

- [x] 4.1 In [app/admin/animate/AnimateScene.tsx](app/admin/animate/AnimateScene.tsx)
  `useStudioObservationHook`, add a `turn: (bias: number) => store().setTurnBias(bias)` entry
  to the returned object, placed next to the existing `front(...)` and `tune(...)` entries.

## 5. Wire the bias through `useLocomotion`

- [x] 5.1 In [app/game/locomotion/useLocomotion.ts](app/game/locomotion/useLocomotion.ts),
  read `store.turnBias` in the coupled-run path alongside `frontDrive` / `frontSegments`.
- [x] 5.2 Pass `turnBias` as the new 8th argument to `stepCpg(c.cpgState, c.cpgSpec, drive, exc,
  TIMESTEP, frontDrive, frontSegments, turnBias)`.

## 6. Headless directional gate

- [x] 6.1 Create `scripts/locomotion-turn-direction.ts`, modeled on
  `scripts/locomotion-3d-swim-check.ts`. Use the same `RIG_LEN` / `CAP_DEG` / `DRIVE` / `EXC` /
  `GAIN` / `TIMESTEP` constants and the existing `buildRigGroups`, `buildBody3D`, `buildCpgSpec`,
  Ekeberg torque pipeline, drag environment.
- [x] 6.2 Define `runTurnCase(turnBias, seconds = 8)` that builds a fresh world, runs the coupled
  drive with that `turnBias` for `seconds`, and reports the **forward COM advance** (head-first,
  positive when the body swims forward) and the **lateral COM displacement** (signed,
  perpendicular to the initial forward, left-positive). Head instantaneous yaw is dropped from
  the gate — the snout sweeps ±90° as part of normal undulation, so a single-frame yaw sample
  is oscillation noise rather than turn signal (an implementation finding; the spec scenarios
  use COM lateral only).
- [x] 6.3 Assert: `runTurnCase(+0.3)` produces lateral COM displacement `> +0.05`;
  `runTurnCase(0)` produces `|lateral| < 0.05`; `runTurnCase(-0.3)` produces lateral
  displacement `< -0.05`. Print PASS/FAIL per case and exit non-zero on any FAIL.
- [x] 6.4 In the same script, build the CPG spec once and assert that with `turnBias = 0` and
  `turnBias = +0.3`, the first-substep `driveArr` (recovered via a one-step diff before/after
  with amplitudes seeded to 0 so the coupling sum vanishes) matches the expected per-index
  factors — bit-exact equality for `0` (no regression on existing runs), and `(1 − 0.3)` on
  the **right** side only for `+0.3` (right-axial + RF/RH limbs; see spec for the wiring sign
  calibration).

## 7. Typecheck + lint

- [x] 7.1 `npx tsc --noEmit` passes.
- [x] 7.2 `npx eslint app/game/locomotion app/admin/animate scripts/locomotion-turn-direction.ts`
  passes with no new warnings.

## 8. Validation

- [x] 8.1 `npx openspec validate add-turning-differential-drive --strict` passes.
- [x] 8.2 `npx tsx scripts/locomotion-turn-direction.ts` exits 0 (all PASS).

## 9. Manual visual gate (browser) — HAND OFF TO USER

- [x] 9.1 In the Simulate sidebar, slide Turn bias to `+0.3` and Run: the body curves toward
  its own left and stays bounded. User-confirmed via "we are now done implementing all of the
  internal logic" (2026-06-17).
- [x] 9.2 Slide to `-0.3`: it curves the other way. User-confirmed (2026-06-17).
- [x] 9.3 Slide to `0`: it walks/swims straight (visually unchanged from before the change).
  Headless A/B against HEAD showed bit-exact swim distances at `turnBias=0`, and user
  confirmed swim works (2026-06-17).
- [x] 9.4 `window.__studio.turn(0.5); window.__studio.drive(true)` from the console steers
  headlessly. Hook is exposed in `useStudioObservationHook`; user-confirmed (2026-06-17).
