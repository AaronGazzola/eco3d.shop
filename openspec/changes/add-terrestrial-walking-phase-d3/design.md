## Context

F0 stands the body on its legs; D1 built the limb CPG (signal); D2 drove a single motorized hip with
the transfer function from a test oscillator. D3 couples them: the real limb CPG drives the hips, the
trot emerges from the Table 2 couplings, and the body walks forward under gravity + ground + friction.
The one piece the paper leaves to hardware — foot clearance — is added as a small CPG-phased lift DOF
(user decision), because a 1-DOF vertical hip only scrubs (the axial wave is lateral and can't lift a
foot vertically; the residual tilt is asymmetric, not a gait-phased lift).

## Goals / Non-Goals

**Goals:**
- Build the coupled `cpgSpec` **with limbs**; drive each hip's **sweep** from `phaseToTarget(limbPhase)`.
- Add a **lift DOF** per hip (second revolute, transverse axis) driven from the same limb phase: up in
  swing, down in stance → foot clears → net forward walk.
- Run axial muscle + limbs together at the forward-stepping drive regime; gravity + ground + friction.
- Gate: net forward, upright, diagonal trot emergent, energy bounded.

**Non-Goals (→ E/F/G):** turning / differential drive, behavior presets (Table 4), attractor
head-tracking, proprioceptive feedback, speed/efficiency tuning.

## Decisions

- **Couple via the existing modules — no new controller.** Pass `groups` + `chainGroupIds` to
  `buildCpgSpec` in the land coupled handle so the limb oscillators + couplings run; the sweep target
  is `phaseToTarget(limbPhase(...))`. The trot/standing-wave behavior was already gated in D1; D3 just
  lets it drive the body. Faithful — the paper's CPG owns rhythm + coordination.
- **Foot clearance = a CPG-phased lift DOF (2-DOF limb).** Two revolutes in series at the hip: sweep
  (vertical axis, transfer function) + lift (transverse axis, phase-gated raise). *Alternatives:*
  tilt the single axis (1-DOF, less control of lift height) — rejected for tunability/naturalness;
  pure body-wave lift — rejected (lateral wave can't lift, tilt residual is asymmetric). The 2-DOF is
  a flagged deviation from the paper's 1-DOF robot, justified: control stays the paper's CPG, 1-DOF
  was a hardware simplification, and real salamanders lift their feet.
- **Lift law.** `lift(φ) = liftAmp · raise(φ)` where `raise` is ~0 across the stance window and rises
  to 1 over the swing window (smooth, continuous at the wrap), `φ` = the same `limbPhase` driving the
  sweep. Stance/swing split matches the transfer function's 77/23.
- **Drive regime.** Forward terrestrial stepping (rostral ≈0.6 / body+limbs ≈1.0, below the limb
  saturation threshold 1.27 so limbs stay active) — reference §7 Table 4. Start from the swim drive and
  retune as needed for land.

## Risks / Trade-offs

- **Lift breaks standing if it fires at rest** → Mitigation: lift holds 0 (down) outside the swing
  window and when walking is off; verify the stand gate still passes.
- **Two motors per hip can fight / be unstable at the fixed step** → Mitigation: reuse the energy-stable
  ForceBased motor pattern + the D2 `kStiff/delta`; tune lift stiffness separately; watch KE.
- **Net forward may still be weak/erratic** (foot timing vs lift) → Mitigation: tune liftAmp, the
  swing window, and the drive; the gate is *net forward + upright*, not speed. If erratic, iterate on
  the lift phase window before touching the CPG.
- **Series 2-revolute hip geometry is fiddly** (anchor frames, axes) → Mitigation: a small massless-ish
  carrier body between the two joints; verify no NaN/explosion on build.

## Migration Plan

- Land hip build: 1 revolute → 2 revolutes in series (carrier body). `useLocomotion` drives both from
  `limbPhase`. The D2 test-oscillator step path is removed (or kept as a diagnostic). No data
  migration; rollback = revert (D2 standing/sweep remains the fallback).
