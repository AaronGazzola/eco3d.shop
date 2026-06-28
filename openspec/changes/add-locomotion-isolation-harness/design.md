## Context

The animate studio (`/admin/animate`) runs the locomotion sim through `useLocomotion` and renders the rig from real Rapier transforms. State lives in `animateStore` (`SimConfig` + playback flags); the headless observe harness drives the studio through `window.__studio`. Today the studio can only run/pause, presets are localStorage/UI-only (no URL), and the sole canvas overlay is the per-foot grip glow. This change adds observation tooling on top of that surface without touching gait logic, so each later gait increment can be isolated and shared as a link.

Two existing properties make this cheap: the sim already steps physics at a fixed `TIMESTEP = 1/120`, and the CPG starts from seeded `initialPhases` — so a run from t=0 to a given sim-time is reproducible if (and only if) stepping is decoupled from wall-clock.

## Goals / Non-Goals

**Goals:**
- Open the Simulate tab with an exact config applied from a URL, optionally frozen at a sim-time, with named overlays on.
- Freeze on a chosen frame, step ±1 frame, seek to a sim-time, and play in slow motion — both from the sidebar and from `window.__studio`.
- Visually isolate the body-wave phase and individual limbs (stance/swing coloring, dim-others) without inferring from numbers.
- Keep every addition read-only with respect to physics.

**Non-Goals:**
- Force-vector arrows, criteria-card/contact-sheet generation, server-saved scenarios (later harness increment).
- Any change to gait, CPG, muscle, contact, or coupling behavior.
- A redesigned product Simulate UI (that is AZ-83).

## Decisions

**1. Config link = full `SimConfig`, base64 in `?sim=`.**
Encode the whole `SimConfig` JSON as base64 in the query string rather than referencing a named preset. Rationale: the per-increment loop produces one-off tuned states; requiring a named preset per state would force a code edit each time. `SimConfig` is ~30 scalar/bool fields, so the encoded string stays well within URL limits. Decode on load and feed it through the **existing** `applySimConfig` path (which already ignores unknown keys), so malformed/foreign keys degrade safely. Alternatives: named-preset-only (rejected — too heavy for one-offs); JSON in the URL un-encoded (rejected — breaks on quotes/spaces).

**2. Deterministic seek via a fixed-step accumulator, not wall-clock `useFrame` dt.**
Introduce a single stepping primitive `stepSim(nSteps)` that advances exactly `nSteps` fixed `1/120` ticks of the existing pipeline. The live loop runs this from a time accumulator (`accumulator += clamp(realDt); while accumulator >= dt: stepSim(1)`), and `seek(t)` resets to t=0 and calls `stepSim(round(t/dt))`. Freeze = stop pumping the accumulator; step ±1 = `stepSim(±1)` (a backward step replays from t=0 to t−dt, since the sim is not reversible). Slow-mo = scale the accumulator intake by the speed multiplier. Rationale: makes "frozen at t" identical for the live view, a shared link, and the headless harness. Alternative: freeze by toggling a paused flag on the existing variable-dt loop (rejected — frozen frame would not be reproducible across machines/refresh, defeating the shared-link purpose).

**3. Overlays are a separate read-only r3f layer keyed off published sim state.**
`useLocomotion` publishes per-frame observation state it already computes — measured reach/phase per girdle (`updateMechPhase`) and each leg's stance/swing classification (the grip-window `rel`/`inWindow` test) — into a lightweight store slice or ref. Overlay components in `AnimateScene` read that and draw: phase markers + a max-forward-reach indicator per girdle; and tint leg materials (green=stance/gripping, red=swing), with `isolate=<limb>` lowering the opacity of all other segment/leg materials. No overlay writes to a rigid body, joint, or motor. Rationale: keeps the physics path untouched and lets overlays be toggled/removed freely. Alternative: compute overlay geometry inside the physics loop (rejected — couples rendering concerns into the solver).

**4. View/playback/overlay state lives in `animateStore`, separate from `SimConfig`.**
Add a `view` slice (`tab`, `frozen`, `simTime`, `speed`, `overlays: string[]`, `isolateLimb`) distinct from `SimConfig` so the config link encodes only the simulation, while `?tab/?t/?overlay` encode the view. `window.__studio` gains `pause()/play()/step(n)/seek(t)/speed(x)/setOverlays(list)/isolateLimb(id)/copyLink()` mapping onto this slice. Rationale: separable concerns; the harness can set view without perturbing the config and vice-versa.

## Risks / Trade-offs

- **The live loop currently uses variable `useFrame` dt** → routing it through the fixed-step accumulator is a behavioral change to the loop. Mitigation: keep the same effective real-time rate (1× speed pumps the same number of 1/120 steps per second on average); verify swim/walk presets still look identical before/after via the observe harness (top-down + drift/tilt unchanged).
- **Backward step / seek replays from t=0** (sim is not reversible) → seeking to large t could be momentarily expensive. Mitigation: cap practical seek targets to the recorded run length; the gaits of interest stabilize within a few seconds, so replay cost is small.
- **Publishing observation state every frame could add GC/alloc pressure** → use preallocated arrays/refs, not per-frame object literals.
- **Overlay material tinting must restore on toggle-off** → keep originals and swap, rather than mutating shared materials irreversibly.
- **Config base64 drift if `SimConfig` shape changes** → decoding tolerates unknown/missing keys via `applySimConfig`, so old links degrade gracefully rather than throwing.
