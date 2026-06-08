# Tasks — Phase D3 terrestrial coupled walking

## 1. Couple the limb CPG into the body

- [ ] 1.1 In `useLocomotion.ts` `buildCoupled`, build the coupled `cpgSpec` **with limbs** in land mode
  (pass `groups` + `chainGroupIds` to `buildCpgSpec`), so the limb oscillators + Table 2 + limb↔axial
  couplings run inside the body sim. (Swim stays axial-only.)
- [ ] 1.2 Drive each hip **sweep** from its limb oscillator: `target = phaseToTarget(limbPhase(
  cpgState, hip.limbIdx), capStance, capSwing)`; remove the D2 test-oscillator drive (or keep gated as
  a diagnostic). Axial Ekeberg muscle keeps running concurrently.

## 2. Add the lift DOF

- [ ] 2.1 In `body3d.ts` land mode, build each hip as **two revolutes in series**: a carrier body
  between girdle and thigh; joint A = **lift** (transverse-horizontal axis), joint B = **sweep**
  (vertical axis). Both ForceBased motors. Extend `Body3DHip` with the lift joint.
- [ ] 2.2 In `useLocomotion.ts`, drive the **lift** joint from the same `limbPhase`: `lift = liftAmp ·
  raise(φ)` where `raise` ≈ 0 across the stance window and rises to 1 over the swing window (smooth,
  continuous at the wrap). Hold 0 when walking is off.
- [ ] 2.3 Add `liftAmp` (+ reuse `stepFreq`/drive) to the store + a sidebar control.

## 3. Drive regime

- [ ] 3.1 Apply the forward-stepping drive (rostral ≈0.6 / body+limbs ≈1.0, below limb `d_th`=1.27 so
  limbs stay active). Start from the swim drive; expose/retune as needed.

## 4. Diagnostics

- [ ] 4.1 Walk capture: per-leg sweep + lift phase/angle, footfall (which feet are down), COM forward
  drift in the heading direction, realised duty.

## 5. Typecheck + lint

- [ ] 5.1 `npx tsc --noEmit` passes.
- [ ] 5.2 `npx eslint app/game/locomotion app/admin/animate` passes (no new warnings).

## 6. Gate — emergent forward walk (headless + numbers)

- [ ] 6.1 Build is stable (no NaN/explosion) with the 2-DOF hips + CPG drive under gravity.
- [ ] 6.2 Diagonal trot emerges from the CPG (LF+RH vs RF+LH antiphase) — read from the capture.
- [ ] 6.3 Net **forward** COM translation over ≥ several seconds (not scrubbing in place); body upright
  (bounded tilt, no fall-through); KE bounded.

## 7. Manual visual gate (browser) — HAND OFF TO USER

- [ ] 7.1 Land mode, walk on: the dragon **walks forward** in a diagonal trot — feet **lift** during
  swing and **plant** during stance, body upright. Walk off → stands.

## 8. Documentation + validation

- [ ] 8.1 `documentation/reference/locomotion-reference.md` §5: record the 2-DOF lift as a flagged
  paper-vs-ours deviation (control = paper's CPG; lift = ours for clearance).
- [ ] 8.2 `documentation/animation-roadmap.md` §4: dated entry — coupling, lift DOF, drive regime, walk
  gate result.
- [ ] 8.3 `npx openspec validate add-terrestrial-walking-phase-d3 --strict` passes.
