## Context

B1 (CPG wave) and B2 (Ekeberg muscle path) are each independently verified. B3 is the join: CPG outputs → muscle activations → joint torques → body. Every piece already exists and passed a gate; B3 adds only the wiring and the combined verification. This is the payoff of the split — if the undulation is wrong, the wave and the muscle are both already known-good, so the fault is in how they connect (indexing, scaling, delay, sign).

The Phase B end state: with no environment, internal torques only bend the body; there is no thrust, so the body undulates roughly in place (small incidental COM drift from the asymmetric reaction is acceptable). Forward swimming is Phase C.

## Goals / Non-Goals

**Goals.**
- One coupled driving mode: CPG steps, its outputs feed the muscles (through the 10 ms delay), the muscles torque the body, the body integrates — all on one frame clock, two separate integrators.
- Verify correspondence: the body's bend at each joint tracks the CPG's signed activation at that segment, lagged by muscle/body dynamics — a head→tail travelling undulation.
- A combined capture (body section + CPG space-time section) for side-by-side verification.
- Finalize `BODY_WAVES` against the visible body.

**Non-Goals.**
- No environment / thrust (Phase C). In-place undulation is the gate; net translation is not required and not a pass criterion.
- No limbs (Phase D), no turning / differential drive (Phase E), no feedback (Phase G).
- No new physics — B3 introduces no new equations, only the coupling.

## Approach

**Indexing the join.** The CPG segment `k` (with left osc `k`, right osc `k+N`) maps to the axial joint whose child segment is the `k`-th axial segment. The solver's `spec.joints[i]` has `segmentIndex` into `spec.segments`; the axial segments are the chain segments. B3 builds, once, a map `joint i → CPG segment k` so activations line up with joints. (The head segment has no parent joint; the first joint is between head and segment 1, so the activation for joint `i` comes from the CPG segment on its child side — the exact offset is pinned down and asserted, since an off-by-one here is the most likely coupling bug.)

**Per-frame pipeline.**
```
stepCpg(cpgState, cpgSpec, drive, excitability, dt)          // controller
for each joint i:
    k   = jointToCpgSegment[i]
    mL  = oscillatorOutput(cpgState, k)                       // ≥ 0
    mR  = oscillatorOutput(cpgState, k + N)                   // ≥ 0
    (mLd, mRd) = delayBuffer[k].pushAndReadDelayed(mL, mR)    // 10 ms
    torques[i] = ekebergTorque(mLd, mRd, angle[i], rate[i])
stepSolver(bodyState, spec, dt, torques)                     // body
writePivotsFromSolver()
```
Two integrators, one clock. The CPG never reads body state (s=0), so order (CPG first, then body) is unambiguous.

**Combined capture.** Reuse the A3/A4 body capture (per-joint angle, KE, COM drift, cap fraction, node polyline, ASCII top-down) and append the B1 CPG space-time section computed from the same run. The verification read: the CPG space-time stripes (commanded wave) and the body's per-joint angle rows (resulting wave) should show the same head→tail progression, the body lagging by the muscle/body response. If the body wave is flat while the CPG wave travels, the coupling/scaling is wrong; if they travel oppositely, a sign or indexing flip.

**Mutual exclusion of modes.** A-phase Run (passive kick/drift), B1 CPG-preview (no body), B2 muscle-test (sinusoid), and B3 coupled-run all live in `useLocomotion`. Only one drives the body per frame. B3 makes the coupled run the primary Phase-B mode; the branch order guards that enabling it supersedes the B2 test, and that B1 preview (no-body) and B3 (body) aren't both stepping the CPG into different consumers. Simplest rule: a single enum-like selection in the store (`activeSimMode`) rather than independent booleans — B3 may refactor the B1/B2 booleans into that to avoid ambiguous combinations.

## Trade-offs

- **Refactor B1/B2 booleans into one mode enum vs leave them independent.** Independent booleans risk nonsense combinations (CPG preview + muscle test + coupled run all on). A single `activeSimMode` ('off' | 'passive' | 'cpgPreview' | 'muscleTest' | 'coupled') is clearer and prevents double-stepping. B3 is the natural point to consolidate, since it's the first time all modes coexist. Cost: touches the store + sidebar wiring done in A/B1/B2. Worth it.
- **CPG output directly as activation vs rescaling.** The paper feeds `x = r(1+cosθ)` straight in as `M`. We do the same — no rescale — so amplitudes are whatever B1 produces (`r≈drive`). B2 already defaulted its test amplitude to ~1.0 to match, so the swap is clean. If the body barely bends or slams its caps, that's a `BODY_WAVES`/drive/α interplay to tune, not a reason to rescale the activation.
- **Retune `BODY_WAVES` in B3 vs accept the paper value.** The paper's 1.58 is for a 25-segment salamander; our ~10-segment rig with different proportions may look better with fewer crests. B3 is the first time we can judge it on the actual body, so the tuning lever lives here.

## Open Questions

- The joint↔CPG-segment offset (head has no joint). Pin it with an assertion and verify in the first capture that joint count == CPG segment count − (head ? 1 : 0). Most likely bug site.
- Does in-place undulation drift the COM noticeably without environment? Some drift is physical (asymmetric reaction with no drag to cancel it). Record how much; large drift might indicate an asymmetry bug vs just missing hydrodynamics. Not a gate failure either way.
- Final `BODY_WAVES` value — recorded once the undulation looks salamander-like.
