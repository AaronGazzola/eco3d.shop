## Context

The coupled loop in `useLocomotion` drives each axial joint through an Ekeberg spring-damper motor: `kStiff = beta*(mL+mR+GAMMA)`, `phiEq = alpha*(mL-mR)/kStiff`, applied via `configureMotorPosition(phiEq, kStiff, jointDamping)`. `alpha` (active gain) sets how hard the muscle bends the joint toward its target; it is currently a single constant for all joints at all times. The measured per-girdle gait phase already exists (`c.mechPhase[h].phase`), and stance is `rel = ((phase - gripShift) % 1) < gripDuration`.

## Goals / Non-Goals

**Goals:**
- Make the spine push harder during the propulsive (stance) phase, scaled by one knob, off by default.
- Zero behavior change when the knob is 0 (presets + swim identical).

**Non-Goals:**
- Per-side (L/R) gating, travelling-vs-standing-wave control, compliant grip anchor (separate Stage-1 steps).

## Decisions

**1. Gate by stance fraction, globally, in v1.**
Compute `stanceFrac` = (count of hips with `rel < stepDuty`) / hipCount, once per frame from `c.mechPhase`. Scale the active gain: `alphaEff = alpha * (1 + stanceMuscleBoost * stanceFrac)`. Rationale: simplest isolatable lever that ties spine push to "feet are planted." Alternatives considered: per-joint gating by local body-wave phase (more faithful, more complex — deferred); boosting `beta`/stiffness instead of `alpha` (stiffer hold, not more push — `alpha` is the push term).

**2. Boost `alpha` only, not `beta`.**
`alpha` is the active drive (push); `beta` is passive restoring stiffness. Pushing during stance is an active-gain change, so only `alphaEff` feeds `phiEq`. `kStiff` (from `beta`) is unchanged, so joint stability/stiffness is preserved.

**3. Default 0, clamped non-negative.**
`stanceMuscleBoost = 0` reproduces the current single-gain behavior exactly. The slider ranges 0..3.

## Risks / Trade-offs

- **Too much boost destabilizes the body** (overdriven spine whips) → start small (0.5-1.0), verify tilt/drift via the harness before raising; the knob is the mitigation.
- **Global gating pushes during any stance, not just the propulsive side** → acceptable for v1; per-side gating is the next step if the look needs it.
- **Stance fraction is frame-granular** → it changes slowly (gait period >> frame), so per-frame computation is fine.
