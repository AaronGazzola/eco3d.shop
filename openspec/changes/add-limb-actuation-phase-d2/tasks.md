# Tasks — Phase D2 limb actuation

## 1. Transfer function

- [ ] 1.1 Create `app/game/locomotion/limbActuation.ts` with `phaseToTarget(φ, capStance, capSwing,
  duty = 0.77)` — two linear pieces (slow stance 77%, fast swing 23%), continuous at the wrap, output
  clamped to `[−capSwing, +capStance]`. (Port the faithful version.)
- [ ] 1.2 Unit-check the shape headlessly: φ=0 → +capStance; φ=2π·0.77 → −capSwing (kink); wraps back
  to +capStance; never exceeds caps over 1000 samples.

## 2. Motorize the land-mode hips

- [ ] 2.1 In `body3d.ts` land mode, build each hip as a **revolute joint about vertical** with
  `configureMotorModel(ForceBased)` (replacing the fixed joint). Set limits from the leg's
  `angleCaps` (`-yawBack`, `+yawForward`).
- [ ] 2.2 Add a `hipJoints: { joint, limbIdx, capStance, capSwing }[]` field to `Body3D`, populated in
  land mode (limbIdx = LF/RF/LH/RH from girdle order + leg side).

## 3. Drive from a test oscillator (land only)

- [ ] 3.1 In `useLocomotion.ts`, in land mode each substep compute `φ = trot phase for this leg at the
  test frequency`; `target = phaseToTarget(φ, capStance, capSwing)`; `configureMotorPosition(target,
  kStiff, delta)` (start `300 / 12`); wake the thighs. At amplitude 0 / step off, hold the rest angle.
- [ ] 3.2 Add `stepEnabled` + step frequency/amplitude to `animateStore`; expose a Step on/off (and
  freq) control in the Simulate sidebar (land mode only). Add a `step(on)` studio hook for the harness.

## 4. Diagnostics

- [ ] 4.1 Capture per-hip: oscillator phase, `phaseToTarget` target, actual joint angle, angle/cap
  fraction over time (extend the coupled capture or a dedicated land capture).

## 5. Typecheck + lint

- [ ] 5.1 `npx tsc --noEmit` passes.
- [ ] 5.2 `npx eslint app/game/locomotion app/admin/animate` passes (no new warnings).

## 6. Gate — one leg steps on the transfer-function shape

- [ ] 6.1 Headless: a hip driven by `phaseToTarget` tracks the target within tolerance and shows the
  slow-stance / fast-swing profile; realised stance fraction ≈ 0.77.
- [ ] 6.2 Re-verify F0 standing still holds: at step-off / amplitude 0 the body still stands (motor
  holds stance, comY settles, tilt small).

## 7. Manual visual gate (browser) — HAND OFF TO USER

- [ ] 7.1 Land mode, Step on (low freq): the legs visibly sweep — slow backward stance, fast forward
  swing — in the diagonal-trot phasing. Foot **scrub** (no lift) is expected and acceptable for D2.
- [ ] 7.2 Step off: the body stands still on its legs (no collapse).

## 8. Documentation + validation

- [ ] 8.1 `documentation/animation-roadmap.md` §4: dated entry — transfer function, motorized hips,
  test-oscillator drive, the step gate result, foot-lift deferred to D3.
- [ ] 8.2 `npx openspec validate add-limb-actuation-phase-d2 --strict` passes.
