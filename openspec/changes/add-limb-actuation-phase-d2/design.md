## Context

F0 left the body standing on **rigid (fixed)** hips in land mode. D1 added the limb CPG signal. D2 is
the actuation beat: drive a **real motorized hip** with the paper's piecewise-linear transfer function
so a leg visibly steps — isolated from the four-leg CPG coupling (a test oscillator), exactly as B2
isolated the Ekeberg muscle from the CPG. The faithful `phaseToTarget` already exists on the abandoned
walk branch and is ported, not re-invented.

## Goals / Non-Goals

**Goals:**
- Port `phaseToTarget` (piecewise-linear, 77% duty) into `limbActuation.ts`.
- Motorize the land-mode hips (revolute about vertical + ForceBased motor); the motor holds stance at
  rest (still stands) and tracks the transfer-function target when stepping.
- Drive the hips from a **test oscillator** at the diagonal-trot phase offsets (tunable freq/amp),
  land-mode only, with a sidebar step toggle.
- Diagnostics: per-hip phase, target, actual angle, cap fraction.

**Non-Goals (→ D3):** coupling the hips to the D1 limb CPG, the axial-wave coupling, real foot
clearance, net forward walking, turning.

## Decisions

- **Port the transfer function verbatim.** `phaseToTarget(φ, capStance, capSwing, 0.77)` is the
  paper's construction (slow stance / fast swing, two linear pieces, continuous at the wrap). Caps
  come from the leg's `angleCaps`.
- **Motorize the hips, replacing F0's fixed joints.** Revolute about vertical + `configureMotorPosition`
  (the energy-stable pattern already used for the axial muscle and verified in the spike). At rest the
  target is the stance angle so the body keeps standing.
- **Test oscillator, not the CPG.** D2 isolates *actuation* from *signal*. A per-leg phase clock at the
  trot offsets (fore-left & hind-right together) drives `phaseToTarget`. D3 will replace this clock with
  the real D1 limb CPG + axial coupling. (This is the faithful version of the spike's sine — the sine is
  replaced by the paper's transfer function.)
- **Foot-lift deferred to D3 (user decision).** A 1-DOF vertical hip can't lift the foot, so it scrubs.
  D2 gates only on the *joint* following the 77% transfer-function shape; clearance + net walking are a
  D3 concern. Recorded so the scrub is not mistaken for a D2 failure.

## Risks / Trade-offs

- **Foot scrub → no net forward motion in D2** → expected and out of scope; gate is the joint profile,
  not displacement. [Risk] reviewer reads "doesn't walk" as failure → Mitigation: the spec's
  "Foot clearance is out of scope" requirement states it explicitly.
- **Stiff motor on a light thigh can be unstable at the fixed step** → Mitigation: reuse the spike's
  tuned `kStiff/delta` (≈300/12) and verify KE stays bounded; back off if it rings.
- **Motorized hips change the standing behavior vs F0's rigid struts** → Mitigation: the motor holds
  the rest angle at amplitude 0; re-verify it still stands (the F0 standing gate must still pass).

## Migration Plan

- Land-mode hip joints change fixed → revolute+motor; expose them on `Body3D` so `useLocomotion` can
  drive them. No data migration. Rollback = revert; F0 (rigid standing) is the fallback.
