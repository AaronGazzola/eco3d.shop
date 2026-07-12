## Context

The animate studio renders the rig in `AnimatedModel`/`AnimateScene` from physics-body transforms produced by `useLocomotion` (Rapier). The CPG (`cpg.ts`) and Ekeberg muscle (`muscles.ts`) are engine-agnostic. Phase 0 built, offline, a MuJoCo model from the same node skeleton and a runner that drives it with the real CPG to a stable upright walk; the exact model builder, servo/grip step loop, and tuned settings are in `scripts/mujoco/` and the Phase 0 validation report. This change lifts that runner into the browser and wires it to the render, behind an engine switch so it can be A/B'd against Rapier.

## Goals / Non-Goals

**Goals:**
- The studio lizard walks with the reduced-coordinate engine on the animate page.
- Driven by the same CPG + `SimConfig`; reproducible from a shareable config link.
- Node-skeleton-driven and rig-general (any loaded creature), not hard-coded.
- Rapier path preserved behind a switch for comparison.

**Non-Goals:**
- Custom ABA solver / mobile bundle optimisation (later phase).
- Terrain/climbing, steering/attractor, any CPG or muscle-math change.

## Decisions

**1. Runtime = MuJoCo-WASM in the browser (single-thread build).**
Reuses the Phase-0-validated model, step loop, and tuned gains verbatim — the shortest path to an in-app walk. The single-thread build needs no cross-origin isolation headers. Cost: a multi-MB `.wasm` in the studio bundle, accepted for now and flagged for a later custom-ABA swap. The swap is insulated: CPG, `mjcf.ts`, and the render mapping are engine-independent.

**2. One shared model builder (`app/game/locomotion/mjcf.ts`).**
The MJCF string builder is pure (groups → XML + meta) and already lives in `scripts/mujoco/skeleton-to-mjcf.ts`. Move it into app code and have the script re-export it, so the studio and the oracle compile the identical model and can never drift.

**3. Port the step loop verbatim from `validate.ts`.**
The per-step logic — `stepCpg`; spine position servo to the Ekeberg equilibrium angle φEq with the 10 ms delay; leg lift/sweep servos from `girdleClockPhase`; grip as a foot-point spring via `xfrc_applied` — is already validated. Port it unchanged into `mujocoRuntime.ts`, reading the same `SimConfig` fields. Keep the tuned constants (implicitfast/Newton, kp≈40, grip K≈300/D≈10, small foot contacts, condim=1, no belly support) from the Phase 0 report.

**4. Fixed-step stepping decoupled from the render frame.**
Drive MuJoCo from the same fixed-`1/120` accumulator the studio already uses for playback (freeze/seek/slow-mo), so the MuJoCo path honours the existing playback controls and stays deterministic. The render reads the latest body transforms each frame.

**5. Engine switch on `SimConfig` (`simEngine`, default `'rapier'`).**
Additive and defaulted so existing links and the current lizard are byte-unchanged. The studio picks the driver from it; the config link already round-trips `SimConfig`, so a shared URL with `simEngine: 'mujoco'` reproduces the MuJoCo walk. Lets us A/B the two engines on the same rig/config.

**6. Render mapping mirrors the Rapier path.**
MuJoCo bodies are built world-aligned from the same segment centres as the Rapier bodies, so the body→mesh render mapping is the same shape: per body, world position + orientation → the rig's render transform. Reuse the existing scaffolding rather than a new render path.

## Risks / Trade-offs

- **Browser load + `.wasm` serving in Next 15** is the crux unknown → de-risk first (Task 2) with a minimal client load before building on it; single-thread build avoids COOP/COEP.
- **Bundle size** (multi-MB wasm) → acceptable in the studio; the custom-ABA swap is the mobile answer, insulated by Decisions 1–2.
- **Determinism across the r3f loop** → step from the fixed accumulator, not raw frame dt (Decision 4).
- **Grip spring stability** was timestep-sensitive in Phase 0 → carry the tuned K/D and the small-contact/condim settings exactly; don't re-tune blind.
- **Two physics engines in one build** → gate cleanly on `simEngine`; never run both at once.
