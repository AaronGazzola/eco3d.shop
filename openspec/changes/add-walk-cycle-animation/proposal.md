# Walk-cycle animation

## Why

E1 deleted the procedural-locomotion program (Rapier/MuJoCo/CPG) and left dragons rendered as static posed meshes. Creatures now need to move. The roadmap calls for simple, cheap, loopable pose-cycle animation over the preserved skeleton binding (AZ-184). This change builds the animation runtime and its authoring UX end-to-end for a single cycle — `walk` — to nail the physical movement and lay the foundation the remaining cycles (idle, eat, sleep) and the habitat/game wiring will build on.

## What Changes

- Add a kinematic animation runtime (no physics engine): a pure `app/game/animation.ts` that, given a cycle and a time value, returns a per-joint angle map with each angle clamped to the joint's `effectiveAngleCaps`; and an `app/game/AnimatedDragon.tsx` component that walks the skeleton chain, composes parent→child rotations from the tweened pose each frame (react-three-fiber `useFrame`), and renders the same merged per-group meshes as `StaticPosedModel`.
- Define the cycle data model: a cycle is an ordered list of keyframe poses (per-joint yaw/pitch offsets) plus per-cycle `speed` and `amplitude`; poses are tweened and looped. Ship one authored cycle: `walk`.
- Persist authored cycles in a new `animations` JSON column on `dragon_models` (mirrors the existing `role_tags` column); authored per rig (variant × stage).
- Revive `/admin/animate` as a simple pose-cycle studio reusing the existing studio frame (`AdminFrame` + `StudioCanvas` + collapsible sidebar): rig picker, transport (play/pause, speed, scrub), keyframe list, per-joint pose editor (the Calibrate-tab accordion pattern with one cap-clamped slider per joint), and save.
- Re-add "Animate" as step 3 in the `SidebarShell` stepper (Pick → Group → Animate), gated on groups existing.

## Capabilities

### New Capabilities

- `creature-animation`: the kinematic pose-cycle runtime — cycle/keyframe/pose data model, per-joint angle map clamped to angle caps, tween+loop playback, and the `AnimatedDragon` render component (multi-instance capable).
- `animation-authoring`: the admin Animate studio (pose editor, transport, keyframe editing) and persistence of cycles to `dragon_models.animations`.

### Modified Capabilities

- `rig-authoring`: the studio stepper (`SidebarShell`) gains a third step, "Animate".

## Impact

- New: `app/game/animation.ts`, `app/game/AnimatedDragon.tsx`, `app/admin/animate/**` (page, scene, sidebar, store), a migration adding `dragon_models.animations` (JSON), regenerated `supabase/types.ts`.
- Modified: `app/admin/_lib/SidebarShell.tsx` (step 3), `app/admin/_lib/actions.ts` / `hooks.ts` (save/read animations), `app/admin/_lib/types.ts` (cycle/pose types).
- Reused unchanged: `app/game/skeleton.ts`, `app/game/StaticDragon.tsx` (mesh structure), `app/admin/_lib/StudioCanvas.tsx`, `AdminFrame.tsx`.
