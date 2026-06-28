## Why

The walk is stable and the footfall timing is correct, but it does not look like a real walk: the body reads as the travelling wave dragging the legs rather than the legs and spine actively driving the body. The user's intent (and salamander biomechanics) is that the step force comes from both the leg sweep and the axial muscle at the spine pushing during stance. Today the axial muscle is one fixed gain for the whole body at all times, so there is no extra spine push during the propulsive phase. This change adds that — the first Stage-1 lever toward a convincing walk.

## What Changes

- Add a **phase-gated axial muscle boost during stance**: a new `stanceMuscleBoost` config (default `0` = off, so every existing preset is byte-identical). When > 0, the axial muscle's active gain is scaled up in proportion to how much of the gait is currently in stance, so the spine pushes harder while feet are planted and relaxes during swing.
- Expose `stanceMuscleBoost` as a slider in the Simulate sidebar.
- Observation-driven: tuned and verified with the existing freeze + stance/wave overlays + the cycle PDF; one lever, isolated.

Non-goals (later Stage-1 steps, separate changes): per-side (left/right) stance gating, keeping the trunk in a travelling wave vs standing wave, and the compliant (spring) grip anchor.

## Capabilities

### Modified Capabilities

- `locomotion`: the coupled CPG to Ekeberg axial muscle drive gains an optional stance-phase gain term; the existing behavior is unchanged when `stanceMuscleBoost = 0`.

## Impact

- **Code:** `app/admin/animate/animateStore.ts` (`stanceMuscleBoost` in `SimConfig` + setter), `app/game/locomotion/useLocomotion.ts` (compute stance fraction per frame; scale the axial active gain `alpha` in the muscle loop), `app/admin/animate/AnimateSidebar.tsx` (slider).
- **No data/schema/API changes.** Default `0` preserves all presets and the swim path.
