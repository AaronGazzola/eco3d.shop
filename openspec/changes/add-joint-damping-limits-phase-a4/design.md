## Context

Phases A2 (renderer) and A3 (zero-force integrator) are verified and archived. A3's capture showed a kicked free body drifting in a straight line with KE flat to 3 sig figs and joints frozen — momentum is conserved, the integrator is sound. A4 adds the two passive force terms the original bundled Phase A got wrong: joint damping and penalty limit stops.

The original failure mode (capture `2026-05-28T10-34-51`): with `LIMIT_STOP_STIFFNESS = 80`, `LIMIT_STOP_DAMPING = 3`, `JOINT_DAMPING = 0.6`, a 2 rad/s × 10-joint perturb drove joints to 3–5× their caps; the stops were far too soft to contain segment inertias of ~15 kg·m², and the only energy sink (joint damping) had a ~25 s time constant. The chain thrashed indefinitely. Crucially we could not tell if the integrator was also at fault — A3 has since cleared the integrator, so A4 is purely a force-law + tuning problem.

## Goals / Non-Goals

**Goals.**
- Re-enable `generalizedForces` with viscous joint damping and one-sided penalty limit stops at each joint's `angleCaps`.
- A kicked or past-cap-posed body settles to rest: KE → ≈0, all joints pulled inside caps, COM stationary.
- Constants tuned so settling is visibly damped (no sustained oscillation, no blow-through, no jitter) within a few seconds.
- A live `Max joint / cap` readout and the existing capture make the settle measurable, not just eyeballed.

**Non-Goals.**
- No actuation / muscle torques (Phase B), no environment forces (Phase C+). The body cannot self-propel in A4 — COM must stay put.
- No hard render-side clamp. Caps are enforced dynamically by the penalty stops, matching the torque-driven-body model in `locomotion.md`. (The old kinematic hard-clamp is not reintroduced.)
- No per-joint constant tuning UI. Constants live in `solver.ts`, tuned by edit + capture.

## Approach

**Force law.** Re-enable the original form in `generalizedForces`, per joint coordinate `c`:
```
tau[c] -= JOINT_DAMPING * rate
if (angle > yawForwardLimit)   tau[c] -= K * (angle - yawForwardLimit) + C * rate
else if (angle < -yawBackwardLimit) tau[c] -= K * (angle + yawBackwardLimit) + C * rate
```
where `K = LIMIT_STOP_STIFFNESS`, `C = LIMIT_STOP_DAMPING`. The stop is one-sided (active only past the cap) and adds its own damping so the joint doesn't bounce.

**Constant sizing (starting point, tuned by capture).** Segment inertias are ~5–80 kg·m². For a limit stop to behave like a near-critically-damped spring against a representative `I ≈ 15`: pick `K = 3000` (stiff enough that steady overshoot under the perturb is a few degrees, since `overshoot ≈ τ/K`), and `C ≈ 2·√(K·I) ≈ 2·√(45000) ≈ 425` for critical — but since the stop only acts intermittently and joint damping also helps, start lower at `C = 100` and raise if the stop rings. `JOINT_DAMPING = 8` gives a global settle time constant `I/c ≈ 2 s`, fast enough to see settling in the gate window. These are first-pass; the capture's KE-decay curve and `maxJointFracOfCap` peak drive the final values.

**Perturbation.** `perturbJointRates(state, spec, magnitude)` reuses the original `perturb`: set `jointRates[j] = magnitude · (j even ? +1 : −1)`, then solve the 3×3 floating-base block of the mass matrix so the root rates cancel the joints' net linear + angular momentum (the body recoils but its COM does not translate). This keeps the A4 gate honest — COM staying put is a pass criterion, so the excitation must not inject net momentum.

**Two ways to excite the gate.** (1) **Kick joints** → perturbation → chain whips, then damps to rest inside caps. (2) Pose a joint *past* its cap with the manual sliders (range is ±90°, caps are smaller) → Run → the limit stop immediately pushes that joint back inside its cap and it settles. Both should end at rest within caps.

**Diagnostics.** `diagnostics` gains `maxJointFracOfCap = max_j(|angle_j| / cap_j)`. Surfaced live in the sidebar and already present per-joint in the capture. A healthy settle shows this rising during the transient then falling to ≤ 1.0 (or to whatever the posed steady state is, ≤ 1.0 if no posed overshoot).

## Trade-offs

- **Penalty (soft) stops vs hard constraints.** Penalty stops are simple, differentiable, and integrate with the existing explicit scheme — but allow a small transient overshoot and demand stiffness/damping tuning. Hard constraints (projected/impulse) would eliminate overshoot but need a constraint solver and complicate the muscle torques coming in B. Penalty stops match the paper's joint-limit treatment and the original design intent; we accept tunable overshoot.
- **Explicit Euler + stiff stops.** A stiff `K` with explicit semi-implicit Euler risks instability if `K·h²/I` gets large. At `h = 2 ms`, `K = 3000`, `I = 5` (smallest), `K·h²/I = 3000·4e-6/5 ≈ 0.0024` — far below 1, so stable. If we later need much stiffer stops, the substep or an implicit treatment is the lever. Documented so A-future knows the headroom.
- **Start-soft-and-raise vs start-critical.** Starting `C = 100` (under critical) risks a little ring; starting at critical `~425` risks over-damping that masks whether `K` is right. Starting soft makes the first capture diagnostic (if it rings, raise `C`); cheaper to converge.

## Open Questions

- Final constant values — settled empirically from the first A4 captures, recorded in the roadmap status note. Starting `(8, 3000, 100)`.
- Should `PERTURB_MAGNITUDE` (joint-rate kick) be UI-exposed? *Lean: constant `1.5` rad/s for A4; expose only if the gate needs sweeping.*
- Should there be a combined "settle quality" diagnostic (e.g. time-to-rest)? *Lean: no; KE-decay in the capture + the live `maxJointFracOfCap` are enough for A4.*
