## Context

B1 verifies the CPG wave with no body. B2 verifies the actuation path — oscillator output → Ekeberg torque → joint motion — with no CPG, using a clean test sinusoid as the activation source. The two are independent: B1 has no body, B2 has no CPG. B3 connects them. This mirrors Phase A (renderer A2 / integrator A3 / forces A4 each gated alone) and is the reason the eventual coupled system is debuggable.

The muscle model is reference §4: `Tᵢ = α(Mˡ−Mʳ) − β(Mˡ+Mʳ+γ)φᵢ − δφ̇ᵢ`. The three terms are an **active** pull (left−right activation difference), a **variable-stiffness spring** pulling the joint toward 0 (stiffness grows with total activation `Mˡ+Mʳ+γ`), and a **damper**. Constants (Table 5, simulation): α=0.4, β=1.2, γ=0.2, δ=0.1 (δ now confirmed against the PDF). A 10 ms delay separates the oscillator output `x` from the activation `M`.

## Goals / Non-Goals

**Goals.**
- The Ekeberg torque exactly as written, fed into the existing A4 solver as an added generalized force on each axial joint.
- A clean test-sinusoid activation source so the muscle is verified without the CPG.
- Gate: a single joint (or the whole chain, all-in-phase) driven by the sinusoid bends sinusoidally and the β stiffness visibly restores it toward 0 when drive stops; δ damps the return.
- The 10 ms activation delay present and correct (even if its effect on a smooth test signal is small).

**Non-Goals.**
- No CPG (B3). The activation source is a hand-specified sinusoid.
- No environment (Phase C). With muscles but no drag the body wiggles in place; net translation here is incidental and not a gate criterion.
- No limbs (Phase D).
- No tail-taper or behaviour overrides (the ×10 α,β for backward/struggling, the 0.7/0.5/0.2 tail-module taper) — forward regime base constants only.

## Approach

**Torque computation.** Per axial joint `i` (matching `spec.joints[i]`, whose child segment is `k`): read the joint angle `φ = state.jointAngles[i]` and rate `φ̇ = state.jointRates[i]`. Get `(Mˡ, Mʳ)` for segment `k` from the activation source (after the delay buffer). Compute `T = α(Mˡ−Mʳ) − β(Mˡ+Mʳ+γ)φ − δφ̇`. Assemble a `jointTorques` array indexed to match the solver's generalized-coordinate joints, and pass it to `stepSolver`.

**Solver hook.** `generalizedForces` currently returns damping + limit stops. B2 adds an optional `jointTorques` argument threaded from `stepSolver`: `tau[joint.coordIndex] += jointTorques[i]`. Absent → identical to A4. This keeps A4's gate intact and makes the muscle purely additive.

**Activation delay.** A small per-segment ring buffer holds the last ~10 ms of `(Mˡ, Mʳ)` inputs; the torque reads the delayed value. At 2 ms sub-steps that's ~5 samples. The delay is in the muscle module, parameterized (`DELAY_MS = 10`), applied to whatever activation source feeds it (test sinusoid in B2, CPG in B3).

**Test sinusoid.** `Mˡ = amp·(1+cos(ωt − kφ_seg))`, `Mʳ` the same shifted by π, with `ω = 2π·freq`. With `phasePerSeg = 0`, every segment gets the same antiphase pair → the whole chain flexes together (the cleanest single-DOF read: pick one joint, watch it trace a sinusoid bounded by its caps, and watch it spring back to 0 when amplitude → 0). With `phasePerSeg > 0`, a fake travelling input lets us sanity-check multi-joint behaviour before B3 supplies the real wave.

**Restoring-force gate.** The key new behaviour vs A4: set amplitude > 0, let a joint reach a bent steady oscillation; then drop amplitude to 0 (Pause the test) — the β term (now `−β·γ·φ`, since `Mˡ+Mʳ→0`) plus joint damping should pull the joint back toward 0 and hold it there. That return-to-zero is exactly the restoring force A4 lacked, and is the headline thing B2 proves.

## Trade-offs

- **`jointTorques` arg vs a muscle callback inside the solver.** Passing a precomputed array keeps the solver agnostic to where torques come from (muscles now, anything later) and keeps `solver.ts` free of muscle/CPG imports. The cost: the caller recomputes torques each frame outside the sub-step loop, so the torque is held constant across a frame's sub-steps (it doesn't update with `φ` within the 2 ms sub-steps). At 2 ms that intra-frame staleness is negligible; if it ever matters, the torque can move inside the sub-step via a callback. Documented.
- **Test sinusoid vs reusing B1's CPG.** Using a hand sinusoid is the whole point — it isolates the muscle. Reusing the CPG would re-entangle the two pieces B2 exists to separate.
- **All-in-phase default vs travelling default.** Default `phasePerSeg=0` (all joints in phase) gives the simplest possible verification (one joint, clean sinusoid, clean spring-back). A travelling default would look more lifelike but muddies the single-DOF read. Start in-phase.

## Open Questions

- Does the β stiffness at `γ=0.2`, `β=1.2` produce a visibly firm return, or is it swamped by `JOINT_DAMPING=20` from A4? If the joint oozes back too slowly, that is a signal about the A4/B2 constant interplay to note for B3 — not necessarily a fix in B2.
- Amplitude scaling: the test `amp` and the eventual CPG amplitude `r` should live in comparable ranges so B3 is a smooth swap. Default `amp=1.0` matches `r≈drive≈1.0`. Confirm in B2 so B3 inherits sane magnitudes.
- Should the muscle torque be clamped to a max magnitude for safety against a stiff transient? *Lean: no clamp in B2; rely on the solver's stability margin and the limit stops. Revisit only if a capture shows a torque spike destabilising the step.*
