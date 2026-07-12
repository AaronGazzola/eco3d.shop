## Why

Phase 0 (`validate-articulated-locomotion-mujoco`) proved, in an offline oracle, that a reduced-coordinate servo model of our node skeleton — driven by the real `cpg.ts` — walks upright where Rapier's springy legs could not (roadmap Decision 9). That result lives only in a Node script; the studio's lizard still runs the old Rapier path. This change brings the proven mechanics **into the animate studio** so the lizard actually walks on the animate page with the new engine, is steerable from the same `SimConfig`, and is reproducible from a shareable config link — the deliverable the user is waiting to see.

The shipping-grade lightweight solver (a custom articulated-body/Featherstone engine for mobile bundle size) is deferred: this change embeds **MuJoCo-WASM** (already validated in Phase 0, and it reuses the exact model + tuned settings), which is the fastest path to a working, viewable in-app walk. Swapping the runtime to a custom ABA later does not change the CPG, the model builder, or the render mapping.

## What Changes

- **Share the model builder with the app.** Move the engine-agnostic MJCF string builder into app code (`app/game/locomotion/mjcf.ts`, ported from `scripts/mujoco/skeleton-to-mjcf.ts`) so the studio and the script both build the model from `groups` at runtime — node-skeleton-driven, no per-model hard-coding.
- **Add a client-side MuJoCo runtime** (`app/game/locomotion/mujocoRuntime.ts`): dynamically import `@mujoco/mujoco` in the browser, compile the model from the current groups, and expose a fixed-step `advance(config)` that runs the CPG → Ekeberg-equilibrium spine servo + gait leg servos + grip spring (ported verbatim from `scripts/mujoco/validate.ts`), returning per-body world transforms. Serve the `.wasm` asset through Next.
- **Render the rig from MuJoCo transforms.** Map each MuJoCo body's world position/orientation onto the existing render scaffolding (the same body→mesh mapping the Rapier path uses), so meshes and legs follow the reduced-coordinate body.
- **Add an engine switch.** A `simEngine: 'rapier' | 'mujoco'` field on `SimConfig` (default unchanged so existing links/behaviour are untouched) selects the driver in the studio; the config link carries it so a shared URL reproduces the MuJoCo walk. Both engines share the CPG, `SimConfig`, freeze/seek playback, and overlays.

Non-goals: a custom ABA solver, mobile bundle-size optimisation, terrain/climbing, the steering/attractor layer, and any change to the CPG or muscle math.

## Capabilities

### New Capabilities

- `locomotion-reduced-coordinate`: an in-studio reduced-coordinate locomotion engine — MuJoCo-WASM compiled from the live node skeleton, driven by the existing CPG through position servos and the grip, rendered onto the rig and selectable via a `SimConfig` engine switch, so the studio lizard walks with the Phase-0-validated mechanics.

## Impact

- **New app code:** `app/game/locomotion/mjcf.ts` (shared builder), `app/game/locomotion/mujocoRuntime.ts` (client runtime + step loop), a MuJoCo driver path wired into `AnimateScene`/`AnimatedModel`/`useLocomotion` (or a sibling `useMujocoLocomotion`).
- **Config/build:** `SimConfig` gains `simEngine`; `next.config` serves `@mujoco/mujoco/mujoco.wasm`; `@mujoco/mujoco` moves from devDependency to dependency.
- **Refactor:** `scripts/mujoco/skeleton-to-mjcf.ts` re-exports from the shared `mjcf.ts` (single source of truth).
- **Unchanged:** `cpg.ts`, `muscles.ts`, the Rapier path (kept behind the switch for A/B), presets, node authoring, calibrate.
