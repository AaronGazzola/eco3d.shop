## 1. Y-axis migration (additive, no visible change)

- [x] 1.1 Edit `app/game/chain3d.ts`: in `resolve()`, after computing `curr.x` and `curr.z`, set `curr.y = prev.y` so y propagates down the chain
- [x] 1.2 Edit `app/game/AnimatedModel.tsx` line 328: change `obj.position.set(joint0.x, 0, joint0.z)` to `obj.position.set(joint0.x, joint0.y, joint0.z)`
- [x] 1.3 Edit `app/game/AnimatedModel.tsx` line 342: change `obj.position.set(limb.anchor.x, 0, limb.anchor.z)` to `obj.position.set(limb.anchor.x, limb.anchor.y, limb.anchor.z)`
- [ ] 1.4 Verify the home page renders identically to before (joint y values are still 0 at this point — this step only proves the plumbing change is non-breaking)

## 2. Animation subsystem skeleton

- [x] 2.1 Create `app/game/animations/types.ts` with `DragonDrive`, `Behavior`, `BehaviorContext`, `BehaviorId` exports per the design doc
- [x] 2.2 Create `app/game/animations/blend.ts` exporting `blendDrive(a: DragonDrive, b: DragonDrive, t: number): DragonDrive` (per-field scalar lerp; `headTarget` lerps componentwise; `bodyRoll` lerps each subfield)
- [x] 2.3 Create `app/game/animations/dragon/constants.ts` with: `EGG_DEPTH`, `HATCHING_DURATION_MS`, `HATCH_TO_WANDER_BLEND_MS`, `DEFAULT_BLEND_MS`, `FOOT_ARC_DEFAULT_HEIGHT`, `BANK_GAIN`
- [x] 2.4 Create `app/game/animations/dragon/index.ts` exporting an empty registry placeholder (`export const DRAGON_BEHAVIORS = {} as Record<BehaviorId, Behavior>`)

## 3. Solver

- [x] 3.1 Create `app/game/animations/solver.ts` with a `Solver` class that owns a `Chain3D` and a `LimbState[]` (move the makeLimb helper here from `useCreature.ts`)
- [x] 3.2 Implement `Solver.apply(drive: DragonDrive)` whose body is a literal port of the current `useCreature` `useFrame`: heading constraint, head-target step toward `drive.headTarget`, `chain.resolve()`, per-limb hip math, foot-target math, lerp, FABRIK
- [x] 3.3 In `Solver.apply()`, after `chain.resolve()`, add `rootYOffset` to every joint's y
- [x] 3.4 In `Solver.apply()`, after rootYOffset, apply `bodyRoll` per-joint y wave (`amp * sin(time * freq + i * phase)`)
- [x] 3.5 In the per-limb step block, replace the flat lerp with a tracked `stepT` per limb; advance `stepT` at rate `stepSmoothing * legCadence`; compute `base = lerp(stepStart, stepEnd, stepT)` and `base.y += 4 * legLiftAmplitude * stepT * (1 - stepT)`; assign `limb.currentTarget = base`
- [x] 3.6 Expose `Solver.chainRef` and `Solver.limbStatesRef` matching the shape `useCreature` currently returns (solver exposes `.chain`/`.limbs`; `useCreature` wraps them in MutableRefObjects so AnimatedModel's prop surface is unchanged)
- [x] 3.7 Confirm solver returns x/z motion identical to current implementation when fed a drive with `legLiftAmplitude: 0`, `bankAngle: 0`, `rootYOffset: 0`, `bodyRoll.amp: 0` (head-target, heading constraint, hip math, FABRIK call are all literal ports; foot stepping is path-equivalent — straight-line lerp at amp=0)

## 4. Director

- [x] 4.1 Create `app/game/animations/director.ts` with a `Director` class holding `active: Behavior`, `target: Behavior | null`, `blendT: number`, `blendDuration: number`
- [x] 4.2 Implement `Director.setBehavior(id, opts?)`: looks up behavior in `DRAGON_BEHAVIORS`, sets it as `target` (or `active` if no current active), records `blendDuration = opts?.blendMs ?? DEFAULT_BLEND_MS`, resets `blendT = 0`
- [x] 4.3 Implement `Director.update(ctx, dt)`: calls `active.update`, conditionally calls `target.update`, blends with `blendDrive`, advances `blendT`, swaps when `blendT >= 1`; if `target === null` and `active.isComplete?.(ctx)` returns true, automatically `setBehavior('wandering')`
- [x] 4.4 Constructor accepts `{ initial: BehaviorId }` and an explicit registry argument so the director isn't directly coupled to dragon-specific imports

## 5. Wandering behavior

- [x] 5.1 Create `app/game/animations/dragon/wandering.ts` exporting a `Behavior` with `id: 'wandering'`
- [x] 5.2 In `update(ctx, dt)`: read `ctx.targetRef.current` and emit `headTarget` from it, with `headTarget.y` left at 0
- [x] 5.3 Track previous heading inside the behavior closure; emit `bankAngle = clamp(headingDelta * BANK_GAIN, -maxBank, +maxBank)`
- [x] 5.4 Emit `legCadence: 1` and `legLiftAmplitude: FOOT_ARC_DEFAULT_HEIGHT`
- [x] 5.5 Register in `dragon/index.ts` (`createDragonBehaviors()` factory; behaviors instantiated per-creature so state doesn't leak across instances)

## 6. Wire useCreature to director + solver

- [x] 6.1 Replace the body of `app/game/useCreature.ts` with: instantiate `Solver` and `Director` in `useEffect`; in `useFrame` call `director.update(ctx, dt)` then `solver.apply(drive)`; return `chainRef` and `limbStatesRef` from the solver
- [ ] 6.2 Verify the home page wandering looks visually identical to before (foot arc + banking are now active — this is the first visible change; if it looks worse than before, fall back to overriding `legLiftAmplitude: 0` and `bankAngle: 0` and re-tune)
- [ ] 6.3 Tune `FOOT_ARC_DEFAULT_HEIGHT` and `BANK_GAIN` against the live home page until both upgrades read as natural

## 7. Hatching behavior

- [x] 7.1 Create `app/game/animations/dragon/hatching.ts` exporting a `Behavior` with `id: 'hatching'`
- [x] 7.2 Track elapsed time in the behavior closure; on first `update` capture `startTime`
- [x] 7.3 Compute `t = clamp(elapsed / HATCHING_DURATION_MS, 0, 1)`; emit `rootYOffset = -EGG_DEPTH * (1 - easeOutCubic(t))` so it rises from `-EGG_DEPTH` to `0`
- [x] 7.4 Emit `headPitch` as a triangular curve peaking at `t = 0.5` then settling to 0 by `t = 1`
- [x] 7.5 Emit `legCadence: 0` for the entire duration
- [x] 7.6 Implement `isComplete(ctx)` returning `t >= 1`
- [x] 7.7 Register in `dragon/index.ts` (via the `createDragonBehaviors()` factory)

## 8. Wire HatchingDragon to the director

- [x] 8.1 Edit `app/HatchingDragon.tsx`: remove the `useFrame` body that interpolates `g.scale` and `g.position`; the dragon's group is no longer scale-animated (scale stays constant at `DRAGON_SCALE_FINAL`, the resting display scale)
- [x] 8.2 Pass a `directorRef` through `AnimatedModel` to `useCreature`; on `phase === 'emerging'` call `director.setBehavior('hatching', { blendMs: 0 })`
- [x] 8.3 On `phase === 'live'` transition, call `director.setBehavior('wandering', { blendMs: HATCH_TO_WANDER_BLEND_MS })`
- [x] 8.4 Remove `DRAGON_SCALE_INITIAL` and `EMERGE_DURATION_MS` from `app/page.constants.ts`. (`DRAGON_SCALE_FINAL` retained — it's the resting display scale used by `HatchingDragon` and `FloorClickHandler`, not animation-related.) `EMERGE_DURATION_MS` usage in `HomeScene.tsx` replaced with `HATCHING_DURATION_MS` from `dragon/constants.ts`
- [ ] 8.5 Verify the egg-emerge sequence on the home page: dragon rises from below ground level, looks up, settles, then begins wandering with a smooth blend

## 9. Verification

- [ ] 9.1 Visual diff: free wandering on the home page reads at least as good as the pre-refactor implementation (foot arc + banking should be a strict improvement; if not, tune `dragon/constants.ts`)
- [ ] 9.2 Behavior switch is visibly smooth: no joint pop when hatching → wandering blend runs
- [ ] 9.3 Studio Animate panel still tunes motion — Stiffness, Step Threshold, Step Smoothing, Max Speed, Follow Distance, Wander Radius/Speed, Foot Angle Offset all produce the same effect on the live preview as before
- [x] 9.4 Codebase search confirms no rig writes outside `solver.ts`: `chain.joints[`, `limb.anchor.set`, `limb.currentTarget.copy` only appear in `app/game/animations/solver.ts` (AnimatedModel only reads `chain.joints[i]` for rendering — no writes)
- [x] 9.5 `useCreature.ts` body contains no `chain.resolve`, `fabrikResolve`, or per-limb geometry calls (verified by codebase search; total file is 61 lines including imports/dep array; the function body is the thin director+solver wrapper described in design)

## 10. Validate the OpenSpec change

- [x] 10.1 Run `openspec validate add-dragon-animation-system --strict` and resolve any reported issues
- [x] 10.2 Run `openspec status --change add-dragon-animation-system` and confirm all artifacts are `done`

## 11. Visual verification (deferred to user — auto mode cannot run dev server interactively)

The following require running the home page in a browser. Each is listed as unchecked above:
- 1.4 — y-axis plumbing renders identically (no visible diff expected)
- 6.2 — wandering reads at least as good as pre-refactor (foot arc + banking are new visible additions)
- 6.3 — tune `FOOT_ARC_DEFAULT_HEIGHT` and `BANK_GAIN` if upgrades look unnatural
- 8.5 — emerge sequence: dragon rises from below ground (`EGG_DEPTH = 2.2` chosen to give ~0.4m world rise at the 0.18 scale; tune if it reads too shallow/deep)
- 9.1 / 9.2 / 9.3 — visual A/B and panel sanity check

Run `pnpm dev` (or `npm run dev`) and verify each. Tune `app/game/animations/dragon/constants.ts` as needed.
