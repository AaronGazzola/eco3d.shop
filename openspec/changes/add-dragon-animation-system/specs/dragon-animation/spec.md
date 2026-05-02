## ADDED Requirements

### Requirement: Drive-signal contract

The system SHALL define a `DragonDrive` struct and a `Behavior` interface in `app/game/animations/types.ts`. Behaviors SHALL produce `DragonDrive` values; behaviors MUST NOT write directly to `chain.joints`, `limb.anchor`, or `limb.currentTarget` except via the optional `overrideJoints` escape hatch.

`DragonDrive` MUST contain at least the fields: `headTarget` (x/y/z), `headPitch`, `rootYOffset`, `bodyRoll` (amp/freq/phase), `legCadence`, `legLiftAmplitude`, `bankAngle`, `breath`, `weight`. All numeric fields default to `0` semantically; behaviors omit fields they do not care about (returning the zero value).

#### Scenario: Behavior returns a zero-initialized drive
- **WHEN** a behavior's `update` returns a drive with only `headTarget` populated
- **THEN** the solver treats every other field as `0` and produces motion with no foot lift, no banking, no roll, and no root y offset

#### Scenario: Behavior never touches rig state directly
- **WHEN** the codebase is searched for writes to `chain.joints`, `limb.anchor`, or `limb.currentTarget` outside `app/game/animations/solver.ts`
- **THEN** no matches exist in `app/game/animations/dragon/**`

### Requirement: Solver consumes drives and writes rig state

A `Solver` class in `app/game/animations/solver.ts` SHALL be the single component that reads a `DragonDrive` and writes to `chain.joints`, `limb.anchor`, and `limb.currentTarget`. The solver SHALL run exactly one `Chain3D.resolve()` per frame and exactly one `fabrikResolve()` per leg per frame.

The solver SHALL apply, in order: spine resolve → `rootYOffset` to all joint y values → `bodyRoll` per-joint y wave → per-limb hip placement (carrying spine-joint y) → per-limb foot target with `legCadence`-scaled stepping → foot-arc parabolic y-lift driven by `legLiftAmplitude` → FABRIK leg solve.

The solver SHALL expose a `chainRef` and `limbStatesRef` consumable by `AnimatedModel.tsx` with the same shape currently exported from `useCreature.ts`.

#### Scenario: Single chain solve per frame
- **WHEN** the solver's `apply()` runs once
- **THEN** `Chain3D.resolve()` is invoked exactly once and `fabrikResolve` is invoked exactly once per limb

#### Scenario: Foot arc only when behavior opts in
- **WHEN** a drive has `legLiftAmplitude: 0`
- **THEN** the solver writes `limb.currentTarget.y = 0` and motion is identical to a flat-lerp foot

#### Scenario: Foot arc lifts mid-step
- **WHEN** a drive has `legLiftAmplitude: 0.4` and `legCadence: 1` and a step is in progress at `stepT = 0.5`
- **THEN** `limb.currentTarget.y` is approximately `4 * 0.4 * 0.5 * (1 - 0.5) = 0.4` (peak of the parabola)

#### Scenario: Frozen legs
- **WHEN** a drive has `legCadence: 0`
- **THEN** the solver does not advance any leg's `stepT` and `limb.currentTarget` stays at its prior position

### Requirement: Director coordinates and blends behaviors

A `Director` class in `app/game/animations/director.ts` SHALL hold an active `Behavior` and an optional target `Behavior`. It SHALL expose `setBehavior(id, opts?)` and `update(ctx, dt)`. When a target behavior is set, the director SHALL cross-fade the two behaviors' drive outputs over `opts.blendMs` (default in `dragon/constants.ts`) using a per-field scalar lerp from `app/game/animations/blend.ts`. When the blend completes, the director SHALL set `active = target` and clear `target`.

The director SHALL also detect when an active one-shot behavior reports `isComplete()` and SHALL automatically fall back to a default behavior (`wandering` for dragons) with a default cross-fade.

#### Scenario: Behavior swap with cross-fade
- **WHEN** `setBehavior('hatching')` runs, then 300 ms later `setBehavior('wandering', { blendMs: 600 })` runs
- **THEN** the director outputs `blend(hatchingDrive, wanderingDrive, t)` with `t` rising from 0 to 1 across the next 600 ms, then `active === wandering` and `target === null`

#### Scenario: One-shot behavior auto-completes
- **WHEN** the active behavior's `isComplete(ctx)` returns `true` and no target is set
- **THEN** the director invokes `setBehavior('wandering')` automatically with the default cross-fade duration

#### Scenario: Drive blending is per-field scalar lerp
- **WHEN** drives `{ rootYOffset: 1, legCadence: 0 }` and `{ rootYOffset: 0, legCadence: 1 }` are blended at `t = 0.5`
- **THEN** the blended drive has `rootYOffset === 0.5` and `legCadence === 0.5`

### Requirement: Y-axis support across the rig

`Chain3D.resolve()` SHALL carry the y component through joint placement (each joint's y SHALL inherit from its parent unless modified by a solver layer). `AnimatedModel`'s `useFrame` SHALL read `joint.y` and `limb.anchor.y` instead of writing `0` for the y component of group positions. Foot targets SHALL accept a non-zero y value supplied by the solver's foot-arc layer.

The 2D angle constraint logic in `Chain3D` SHALL remain x/z only; vertical motion SHALL be applied as additive layers after `chain.resolve()` returns.

#### Scenario: Spine joints carry y
- **WHEN** the head's target has `y = 2`
- **THEN** every joint's `y` after `Chain3D.resolve()` equals `2`

#### Scenario: Renderer plants groups at joint y
- **WHEN** a spine joint has `y = 1.5`
- **THEN** the corresponding `BodyGroup`'s world position has `position.y === 1.5`

#### Scenario: Angle constraint is plane-only
- **WHEN** two consecutive joints differ in y but lie on the same x/z line
- **THEN** `constrainAngle` produces the same result as if both joints were at `y = 0`

### Requirement: Wandering behavior

A `wandering` behavior in `app/game/animations/dragon/wandering.ts` SHALL reproduce the current target-following motion. It SHALL output a `DragonDrive` whose `headTarget` derives from `targetRef.current`, whose `legCadence` and `legLiftAmplitude` enable normal stepping, and whose `bankAngle` is proportional to recent heading change.

When `legLiftAmplitude` and `bankAngle` are forced to `0`, the resulting motion SHALL be visually identical to the pre-refactor `useCreature.ts` behavior.

#### Scenario: Baseline parity
- **WHEN** the wandering behavior runs with `legLiftAmplitude: 0` and `bankAngle: 0` overrides
- **THEN** the rendered dragon's joint positions match the pre-refactor implementation within floating-point tolerance for the same input `targetRef`, config, and timestep

#### Scenario: Banking on turn
- **WHEN** the head's heading changes by more than the threshold within a frame
- **THEN** the next emitted drive has `bankAngle` non-zero with the sign matching the turn direction

### Requirement: Hatching behavior

A `hatching` behavior in `app/game/animations/dragon/hatching.ts` SHALL be a one-shot that, over a duration in `dragon/constants.ts`, raises `rootYOffset` from `-eggDepth` to `0` on an ease-out cubic, briefly raises `headPitch` then settles to `0`, holds `legCadence: 0` for the entire duration, and reports `isComplete() === true` once the duration has elapsed.

#### Scenario: Rise on ease-out cubic
- **WHEN** half of the hatching duration has elapsed
- **THEN** `rootYOffset` equals `-eggDepth + eggDepth * (1 - (1 - 0.5)^3) = -eggDepth * 0.125`

#### Scenario: Frozen legs during emerge
- **WHEN** the hatching behavior is active at any point during its duration
- **THEN** the emitted drive has `legCadence === 0`

#### Scenario: Auto-completes
- **WHEN** the hatching duration has elapsed
- **THEN** `isComplete()` returns `true` and the director swaps to wandering

### Requirement: Hatching replaces scale-pop

`app/HatchingDragon.tsx` SHALL no longer interpolate `g.scale` between `DRAGON_SCALE_INITIAL` and `DRAGON_SCALE_FINAL`. The constants `DRAGON_SCALE_INITIAL`, `DRAGON_SCALE_FINAL`, and `EMERGE_DURATION_MS` SHALL be removed from `app/page.constants.ts`. `HatchingDragon` SHALL call `director.setBehavior('hatching')` when `phase === 'emerging'` begins, and `director.setBehavior('wandering', { blendMs: 600 })` when `phase === 'live'` begins.

#### Scenario: No scale interpolation
- **WHEN** the home page transitions from `phase === 'emerging'` to `phase === 'live'`
- **THEN** `g.scale` remains `DRAGON_SCALE_FINAL` throughout (no 0→1 ramp); the rise comes from `rootYOffset` instead

#### Scenario: Behavior switch on phase change
- **WHEN** `phase` changes to `'emerging'`
- **THEN** `director.setBehavior('hatching')` has been called

### Requirement: Thin useCreature wrapper

`app/game/useCreature.ts` SHALL contain at most ~30 lines of body, instantiating a `Director` and `Solver`, calling `director.update()` then `solver.apply()` per frame, and returning the solver's `chainRef` and `limbStatesRef`. It SHALL NOT contain any chain solve, FABRIK call, hip math, or foot-target math directly.

#### Scenario: useCreature stays thin
- **WHEN** `useCreature.ts` is read
- **THEN** it contains no calls to `chain.resolve`, `fabrikResolve`, `Math.atan2` against joint positions, or any per-limb hip/foot geometry

### Requirement: AI-friendly extension surface

To add a new dragon behavior, the developer SHALL only need to (1) create a new file in `app/game/animations/dragon/`, (2) export it as a `Behavior`, and (3) register it in `app/game/animations/dragon/index.ts`. No changes to the solver, director, blend module, renderer, studio, or `CreatureConfig` shape SHALL be required.

#### Scenario: New behavior in two files
- **WHEN** a developer adds a hypothetical `idle.ts` Behavior and registers it
- **THEN** the only files changed are `dragon/idle.ts` (new) and `dragon/index.ts` (one-line registry add)

### Requirement: Studio Animate panel unchanged

The change SHALL NOT modify `app/studio/StepAnimate.tsx`, `app/studio/page.stores.ts`'s `animationConfig` shape, or any studio-side store fields. The fields it edits (`angleConstraint`, `limbAngleOffset`, `stepThreshold`, `stepSmoothing`, `wanderRadius`, `wanderSpeed`, `maxSpeed`, `followDistance`) SHALL continue to be consumed by the solver and the wandering behavior with identical semantics.

#### Scenario: Panel still tunes motion
- **WHEN** a user adjusts the "Stiffness" slider in the studio
- **THEN** `angleConstraint` updates and the solver's chain produces the same response as before the refactor
