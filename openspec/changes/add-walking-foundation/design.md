## Context

Phase C-3D re-platformed the body onto Rapier and re-proved swimming, but only with **gravity off**
and a per-step **planar projection** (`planarProject`) that overwrote each body's height/velocity/
orientation every step to force the swim flat. That projection is a non-paper crutch and is
incompatible with walking (gravity must pull the body down; the body must be free in 3D). The energy
pump that originally caused the body to tumble was separately fixed (Ekeberg torque → Rapier's
implicit motor, commit history 2026-06-07), so the big instability is already gone.

This change establishes the **land foundation**: remove the crutch, confirm the 3D swim is stable
without it, and stand the body on its legs under gravity via real foot/ground contact. The rig is
already authored to stand (sprawled legs, `nodeFoot` at y≈0, body above). Work is spiked behind a
hardcoded `GRAVITY_TEST` flag (commit `8a045a4`); this change productizes it into a real mode.

## Goals / Non-Goals

**Goals:**
- Remove `planarProject` entirely; swim stays stable + forward without it (verified: drift ~23/16s,
  comY≈0, tilt 3–9°).
- A real `coupledMode: 'swim' | 'land'` switch (no hardcoded gravity/ground flag).
- In land mode: gravity + ground; legs are physics capsules (hip socket → `nodeFoot`) with foot
  contact + friction and **rigid** hips; the body stands and rests stably.
- Render legs from their physics transforms in land mode.

**Non-Goals (→ D1/D2/D3):** the limb CPG, the piecewise-linear transfer function, motorized/driven
hips, stepping, the diagonal trot, and the walking hip-axis / foot-lift choice.

## Decisions

- **Remove the planar projection rather than keep it swim-only.** It is a forced kinematic override
  that masks the real dynamics and cannot coexist with gravity. With the energy pump already fixed,
  the swim no longer needs it. *Alternative (keep as a swim cosmetic): rejected* — it would re-hide
  the genuine tilt and block the land regime.
- **Accept the residual swim tilt (3–9°); do not force-flatten the physics centerline.** Root cause is
  the rig's **non-coplanar rest spine** (authored node heights), confirmed by a test that zeroed the
  heights and drove tilt to exactly 0. *Alternative (flatten the dynamics centerline, decouple from
  render): deferred* — under gravity the floor naturally holds the body flat, and flattening would
  compromise hinge fidelity for the future up/down-flex phase. Recorded as a known swim-mode residual.
- **Bend axis = segment-local up (a principal axis).** Gives a clean in-segment-plane bend and follows
  the segment when it later pitches. *Honest:* it does not by itself reduce the tilt (the cause is
  geometry, not the torque axis); kept because it is the correct axis for the up/down phase.
- **Rigid (fixed) hips this phase.** Isolates "can it stand" from actuation, exactly as the standing
  gate intends. Motorized hips driven by the limb CPG + transfer function arrive in D2/D3.
- **Floor at foot level, just below the lowest `nodeFoot`.** So the feet bear weight and the body is
  held up off its belly. Foot contact + friction (0.9) so the stance is stable.

## Risks / Trade-offs

- **Residual swim tilt 3–9°** → accepted; the floor handles it in land mode; revisit only if it
  visibly degrades swimming.
- **Thin standardized colliders vs. chunky mesh** → the belly/leg mesh can visually clip the floor even
  though the collider rests on it; cosmetic, tracked under AZ-33, not addressed here.
- **Rigid hips mean the legs cannot articulate** → by design this phase; "stand," not "step."
- **Hip axis + foot-lift for walking are unspecified by the paper** → deferred and flagged in the
  reference doc; not decided here.

## Migration Plan

- Replace the hardcoded `GRAVITY_TEST` const with `coupledMode` in the store; build path reads the mode.
- No data/schema migration. Rollback = revert the change's commits; the archived Phase C-3D swim is
  unaffected (swim mode reproduces it).
