## Context

A-phase built a body that conserves momentum (internal forces alone cannot translate the COM). B-phase added the controller, muscles, and coupling — the body bends in a head→tail wave but cannot move forward because there is nothing to push against. Phase C supplies that missing reaction force as **anisotropic drag**: a per-segment external force whose perpendicular component is much larger than its parallel component, so a sideways-shoving wave nets out forward motion. This is the "Stage 4" of the roadmap's Part 4 and the L5 water layer of `locomotion.md`; it is also the headline emergent-locomotion gate.

The paper uses Porez et al. (2014) hydrodynamics, which is more elaborate than what we need to demonstrate the principle. The resistive-force theory (Lighthill / Gray-Hancock, used widely for slender swimmers) reproduces forward thrust from undulation with the same essential mechanism — anisotropic drag coefficients — and is two equations per segment. We use the resistive-force form; if Phase C2 ever needs reactive (added-mass) terms for accuracy, they can be layered in.

## Goals / Non-Goals

**Goals.**
- A per-segment anisotropic resistive drag, integrated as an external generalized force inside the existing A4 solver substep loop. No change to the rest of the solver math.
- A single store toggle that turns the environment on/off without disturbing any prior mode. With the toggle off, A-phase / B1 / B2 / B3 captures are bit-exactly reproducible (modulo the rng-free integrator).
- A visible swimming gate: with B3 coupled + environment on, the body translates monotonically in its heading direction at order ≥ 0.5 body-lengths per second (rough target, refined in tuning). Phase C is the first phase where `maxCOMdrift` is the gate metric *rising*, not the gate metric staying small.

**Non-Goals.**
- No reactive (added-mass) hydrodynamics. Resistive only.
- No turning / yaw control beyond what the body's own asymmetry produces. Differential drive is Phase E.
- No ground contact / friction / limbs. Walking is Phase D.
- No environment for the head's `nodeFront` or any other non-axial nodes. Drag is applied to the axial segments only — those are the parts of the body whose motion is supposed to net thrust under the wave.
- No environment tuning UI beyond on/off. `C_n`, `C_t`, `C_ω` are constants in `environment.ts`; if a gate calibration needs sliders later, they can be added in Phase H (UI rebuild).

## Approach

**Per-segment kinematics.** The solver already computes, in `computeKinematics(spec, q)`:
- `comX[i], comZ[i]` — the segment COM positions
- `jacLinX[i], jacLinZ[i]` — DOF→COM-velocity Jacobians
- `jacAng[i]` — DOF→segment-angular-rate Jacobian

We reuse all three. The COM velocity is `v_i = (jacLinX[i] · qd, jacLinZ[i] · qd)`; the angular rate is `ω_i = jacAng[i] · qd`. The segment tangent direction is the cumulative heading `θ_i = q[2] + Σ_{k<i} q[3+k]`, giving `t̂_i = (cos θ_i, sin θ_i)`.

**Drag force per segment.**
```
v_∥ = v_i · t̂_i           (scalar)
v_⊥ = v_i − v_∥·t̂_i        (2-vector, perpendicular to tangent)
F_drag_i = −length_i · (C_n · v_⊥ + C_t · v_∥ · t̂_i)
τ_drag_i = −length_i · C_ω · ω_i
```
The asymmetry `C_n >> C_t` is what produces thrust. With `C_n = 12, C_t = 1.0`, ratio 12:1, comfortably in the slender-body regime (Gray-Hancock typical 1.5–2; biological swimmers often higher when accounting for boundary-layer effects). The angular term resists segment rotation and is small (`C_ω = 0.6`) — its main role is to damp parasitic high-frequency rotation modes that resistive drag alone doesn't constrain.

**Generalized-force assembly.** Standard virtual-work mapping:
```
τ_env[c] = Σ_i ( jacLinX[i][c] · F_drag_i.x
               + jacLinZ[i][c] · F_drag_i.z
               + jacAng[i][c]  · τ_drag_i )
```
This is one matrix-vector dot per coordinate per segment — cheap. We compute it inside `generalizedForces` so it sees the substep-current `(q, qd)`, identical pattern to how damping and limit stops already work.

**Stability.** Drag is dissipative (`F · v ≤ 0`), so it cannot inject energy — adding it can only stabilize the integrator, not destabilize it. The existing 2 ms fixed substep is fine.

**Why a flag, not a constant.** The whole point of the phased gates is that prior phases stay reproducible. A flag at `stepSolver` lets the muscle test (B2) and CPG preview captures from earlier still run with environment off. The flag is at the lowest level (solver), not at the mode level, so the muscle test could also be run with environment on for sanity-checking — though the gate run is B3 + environment.

## Trade-offs

- **Resistive-force theory vs Porez et al.** RFT is two terms per segment, no integral history, no added mass; Porez is more accurate (boundary-layer-aware) but harder to verify against and harder to tune. The roadmap target is "emergent forward motion" — RFT achieves that. Upgrading to Porez is a future Phase C2 if accuracy demands it.
- **`computeKinematics` already exposes the Jacobians — reuse vs recompute.** Reuse. The drag computation is a pure read; it doesn't need its own Jacobian path and would just diverge from the solver's view if duplicated.
- **Solver-internal flag vs caller-built `additionalTau` array.** A flag lets the drag see the substep-current `(q, qd)` for free. Pre-building a `tau` array in `useLocomotion` would freeze drag at the frame-start state, which is wrong at any non-trivial speed. We already do the muscle torque outside the substep (constant across substeps) but the muscle inputs change at frame rate, not substep rate — drag changes faster because `qd` evolves within the substep loop. Better to compute it where the substep can see the current state.
- **Apply drag to axial only vs include legs.** Axial only. The legs in our rig are visual decoration today (no dynamics in Phase C); applying drag to them would add force from limbs that aren't moving via the solver, which would be wrong. When Phase D adds leg dynamics, the environment for limbs becomes ground contact + friction, not water drag.

## Open Questions

- Final drag coefficients (`C_n, C_t, C_ω`). The starting guess `(12, 1, 0.6)` is from RFT defaults scaled by the empirical Phase B finding that muscle force must be order ~16 N·m peak to bend our rig (we want drag to dissipate energy at a similar order of magnitude per body-cycle, otherwise the body either flies away or never moves). If the body translates absurdly fast at the gate, raise `C_n`; if it barely moves, lower it.
- Net thrust direction relative to body heading. The wave establishes from B1 traveling head→tail; the expected thrust direction is **opposite the wave** — i.e. the head moves forward, the tail trails. Verify with a capture that `rootX` (or the heading-projected COM motion) is positive and not negative (which would indicate a sign error in the drag mapping).
- Should there be a residual stationary drag (a tiny floor that prevents pure rotational drift when activations → 0 during a pause)? Probably yes — `C_ω` provides this. Confirm by running B3 → environment on → pause and verifying the body comes to rest without indefinite spin.
- Tail-end whip from B3 (j7/j8/j9 ±18°) is large; with drag on, the tail's high transverse velocity dumps energy fastest, so the body's net motion may be driven more by mid-body bending than the tail whip. Confirm this in capture — if the tail is *all* the thrust, that's a hint that `C_n` may need to scale with segment length differently than linear.
