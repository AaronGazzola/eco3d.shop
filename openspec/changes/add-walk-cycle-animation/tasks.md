## 1. Data model + persistence

- [ ] 1.1 Add cycle types to `app/admin/_lib/types.ts` (or a new `app/game/animation.types.ts`): `Pose { root: { x, z, yawRad }, joints: Record<string, { yawRad, pitchRad }> }`, `Cycle { keyframes: Pose[], speed: number, amplitude: number }`, `Animations = Record<string, Cycle>`
- [ ] 1.2 Migration via `npx supabase migration new add_dragon_models_animations`: add nullable JSON column `animations` to `dragon_models` default `'{}'`; push with `npx supabase db push`; regenerate `supabase/types.ts`
- [ ] 1.3 In `app/admin/_lib/actions.ts`: `saveAnimationsAction(id, animations)` (update only `animations` on the `dragon_models` row, assert admin) and include `animations` in the rig read (`getDragonRigAction`/`listDragonRigsAction` + `DragonRigRow`)

## 2. Animation runtime

- [ ] 2.1 Create `app/game/animation.ts`: pure `evaluateCycle(cycle, phase): Pose` — advance a looping phase, interpolate between adjacent keyframes, scale by `amplitude`; clamp every joint yaw/pitch to `effectiveAngleCaps` (from `app/game/skeleton.ts`); no physics/`Math.random`/`Date.now`
- [ ] 2.2 Create `app/game/AnimatedDragon.tsx`: walk `flattenSkeleton(buildSkeletonTree(groups))`; render one pivot `<group>` per body group at its node anchor (axial: `nodeBack`/`nodeFront`; legs: `nodeHipLeft`/`nodeHipRight` via `attachedToSpineId`), rotation set each frame from `evaluateCycle` in `useFrame`; render merged per-group meshes like `StaticPosedModel`; unresolved leg → root + `console.error`
- [ ] 2.3 Author the built-in `walk` cycle (keyframes) as a default/seed used when a rig has no saved `walk`: alternating leg stride + axial sway, in place, seamless loop

## 3. Animate studio

- [ ] 3.1 Create `app/admin/animate/animateStore.ts` (zustand): `selectedCycle`, `selectedKeyframeIndex`, `playing`, `speed`, `scrubPhase`, `cycles: Animations`, and actions (load from rig, set/add/delete/reorder keyframe, set joint offset, set root offset, save-ready selector)
- [ ] 3.2 Create `app/admin/animate/AnimateScene.tsx`: `StudioCanvas` + `AnimatedDragon` driven by `animateStore` (playing/scrub) reading the shared store rig, inside `<group rotation={modelRotation}>`, plus `CameraController`
- [ ] 3.3 Create `app/admin/animate/AnimateSidebar.tsx`: transport (play/pause, speed, scrub), keyframe list (add/delete/reorder/select), and the per-joint pose editor (Calibrate accordion order head→spine→attached legs→tail, one yaw + one pitch control per joint, bounded by `effectiveAngleCaps`)
- [ ] 3.4 Create `app/admin/animate/page.tsx`: `AdminFrame({ scene: <AnimateScene/>, sidebar: <AnimateSidebar/> })`
- [ ] 3.5 Wire save: `useSaveAnimations` hook → `saveAnimationsAction`; invalidate the rig query on success; load existing `animations` into `animateStore` when a rig loads

## 4. Stepper

- [ ] 4.1 In `app/admin/_lib/SidebarShell.tsx`: add step 3 `{ n: 3, label: 'Animate', path: '/admin/animate' }`; `pathToStep` returns 3 for `/admin/animate`; `canEnterStep(3)` requires `groups.length > 0`; restore 3-step nav casts

## 5. Verify

- [ ] 5.1 `doppler run -- npm run build` passes; `rg -i "rapier|mujoco|Math.random|Date.now" app/game/animation.ts app/game/AnimatedDragon.tsx` returns no matches
- [ ] 5.2 Studio round-trip in the browser: load a rig with legs, author a walk keyframe, play, save, reload — walk replays, `groups`/`role_tags` untouched, multiple instances animate
