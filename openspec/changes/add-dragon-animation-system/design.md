## Context

The studio's per-model node skeleton drives the runtime 3D model through three values per frame: `chain.joints[i]`, `limb.anchor`, and `limb.currentTarget` (see `documentation/skeleton_to_model_mapping.md`). The current animation source — `app/game/useCreature.ts` — is the only producer of those values, and it does so in a single ~70-line `useFrame` that interleaves: heading selection, head-target picking, chain solve, hip placement, foot-target picking, foot smoothing, and FABRIK leg solve. The renderer (`AnimatedModel.tsx:318–345`) hardcodes `obj.position.set(joint.x, 0, joint.z)` and the foot target's y is pinned to 0, so the rig has no vertical degree of freedom at all.

The eventual game (breeding, training, racing) needs many distinct movements (hatching, wandering, idle, sleep, dash, eat, jump, fly...) that can blend smoothly. Authoring each as its own bespoke `useFrame` would duplicate the rig math and entangle everything that touches it. Skeletal-clip animation (Mixamo-style) doesn't fit either: per-model node placement is the whole point of the studio, and clips bind to a fixed armature.

Constraints:
- Must preserve the procedural feel — animations adapt to whatever dragon the studio produces.
- Must stay frame-coherent: only one chain solve per frame, no two physics simulations fighting.
- The renderer's contract (joints, limb anchors, limb targets) is locked. We can change *what* writes to those buckets, not the bucket shape.
- AI-friendliness: adding or tuning an animation should require reading 2–3 small files, not the whole rig.

## Goals / Non-Goals

**Goals:**
- Isolate "what the creature should do" (behaviors) from "how the rig solves" (solver), so a new movement is a single new file plus one registry line.
- Enable y-axis motion across the rig with the smallest possible delta to existing code.
- Ship the two behaviors needed by the current game flow: `hatching` (replaces the home-page scale-pop) and `wandering` (port of current motion).
- Ship two always-on solver upgrades that visibly lift the realism baseline: foot-arc and body-banking.
- Make blending between behaviors a built-in capability of the system, not a per-behavior concern.
- Preserve the current visual look of free wandering as the *baseline* output of the new architecture, so the refactor is verifiable independently of the visual upgrades.

**Non-Goals:**
- Tail-lag dynamics, spine sinusoidal wave, idle micro-noise (deferred to follow-up changes).
- Additional behaviors beyond hatching + wandering.
- Any non-dragon creature support. The architecture leaves room for `app/game/animations/<creature>/` siblings, but only `dragon/` is created.
- Restructuring the studio Animate panel. Behavior-specific tuning lives in `dragon/constants.ts` until enough behaviors exist to justify a panel redesign.
- Persisting per-dragon behavior tuning to the database.
- Any change to studio code, `modelConfigToCreatureConfig`, `fabrik3d`, or the `CreatureConfig` field shape.

## Decisions

### 1. Drive-signal contract over joint-deltas

A behavior outputs a small struct of high-level scalars (`DragonDrive`) — not joint positions. The solver consumes the struct and produces joints. Blending is then a per-field scalar lerp.

```ts
interface DragonDrive {
  headTarget: { x: number; y: number; z: number }
  headPitch: number
  rootYOffset: number
  bodyRoll: { amp: number; freq: number; phase: number }
  legCadence: number          // 0 = feet frozen, 1 = normal stepping
  legLiftAmplitude: number    // peak height of foot arc
  bankAngle: number           // forward-axis lean (radians); positive = lean right on right turn
  breath: number              // reserved for future spine micro-pulse; unused for now
  weight: number              // 0..1, set by director during cross-fade
}
```

**Why over joint-deltas**: blending two sets of joint positions can violate bone-length constraints and produces fighting solvers. Blending scalars and running a single solve is dimensionally small (~10 numbers), physically consistent, and matches the procedural-creature approach used by Spore and modern reactive-locomotion games.

**Alternative considered**: each behavior writes joint positions directly and the director picks one. Rejected — no smooth transitions, and behaviors have to re-derive rig math each time.

**Escape hatch**: the `Behavior` interface reserves an optional `overrideJoints?(ctx, drive): JointOverrides` for the rare cinematic case where drive-signals can't express the motion (e.g. a curl-up-and-die pose). Not used by either initial behavior.

### 2. Behaviors are TS functions, not JSON

```ts
interface Behavior {
  id: string
  update(ctx: BehaviorContext, dt: number): DragonDrive
  isComplete?(ctx: BehaviorContext): boolean
}
```

Tuning numbers live in `dragon/constants.ts`. Behaviors are pure-ish: they take a context object and emit a drive struct.

**Why over JSON keyframes**: procedural game animation needs state (one-shot timers, randomized phase, conditional output based on heading) that's awkward in data. Code gives type safety and lets `dragon/constants.ts` be the tunable surface. A keyframe pipeline is overkill for movements that are themselves procedural.

### 3. Director owns the active/target behavior pair and the blend curve

Single source of truth for "which behavior is currently driving the dragon" and "are we mid-blend." Per frame:

1. Call `active.update(ctx, dt)` → `driveA`.
2. If a `target` exists, call `target.update(ctx, dt)` → `driveB`, then `drive = blendDrive(driveA, driveB, ease(blendT))`. Otherwise `drive = driveA`.
3. Pass `drive` to `solver.apply(drive)`.
4. If `blendT >= 1`, swap `active = target`, clear target.

External API:
```ts
director.setBehavior(id: BehaviorId, opts?: { blendMs?: number }): void
director.update(ctx, dt): DragonDrive   // for tests / debugging
```

`HatchingDragon.tsx` calls `director.setBehavior('hatching')` on `phase === 'emerging'` and `director.setBehavior('wandering', { blendMs: 600 })` on `phase === 'live'`.

### 4. Solver wraps Chain3D + FABRIK; foot-arc and banking are always-on layers

The solver is the only consumer of `Chain3D` and `fabrikResolve`. Pseudocode:

```
function apply(drive):
  // 1. Spine
  headTarget = drive.headTarget   // includes y
  heading    = atan2 from current head joint to headTarget (constrained by angleConstraint)
  step       = drive-controlled head movement (uses existing maxSpeed/followDistance)
  chain.resolve(headTarget, heading)
  apply rootYOffset to all joint y values
  apply bodyRoll wave: joint[i].y += amp * sin(t * freq + i * phase)
  apply bankAngle: rotate spine joints around the forward axis (visual via renderer)

  // 2. Limbs
  for each limb:
    anchor   = (existing hip math, now carrying spineJoint.y)
    desired  = (existing foot-target math at y=0)
    if |desired - lastDesired| > stepThreshold * legCadence:
      record stepStart = limb.currentTarget; stepEnd = desired; stepT = 0
    advance stepT toward 1 at rate = stepSmoothing * legCadence
    base = lerp(stepStart, stepEnd, stepT)
    foot-arc: base.y += 4 * legLiftAmplitude * stepT * (1 - stepT)
    limb.currentTarget = base
    fabrikResolve(limb.joints, limb.currentTarget, anchor, segLen)
```

**Why "always-on layers driven by drive scalars"**: rather than each behavior re-implementing foot lift or banking, the solver provides the capability and behaviors *opt in* by setting `legLiftAmplitude > 0` or `bankAngle != 0`. Wandering enables both; hatching disables foot motion entirely via `legCadence: 0`.

**Why bodyRoll rides on the solver, not the renderer**: the renderer already reads `joint.y`. Once spine joints have y values, banking and roll are free.

### 5. Y-axis migration: 3 minimal touch points

- `Chain3D.resolve()` (lines 39–52) — currently writes only x/z to `curr`. Carry y: `curr.y = prev.y` after the angle math. (`target.y` is the head's y, propagating to subsequent joints means a flat dragon at any height; the solver's bodyRoll layer adds per-joint variation.)
- `useCreature.ts:73–78` — `headTarget` is built from `head.y`. Replace with `drive.headTarget.y` once the drive layer exists.
- `AnimatedModel.tsx:328` — `obj.position.set(joint0.x, 0, joint0.z)` becomes `obj.position.set(joint0.x, joint0.y, joint0.z)`. Same change at line 342 for limb anchors.

The foot's y at `useCreature.ts:116` (currently hardcoded `0`) is replaced by the solver's foot-arc layer; the renderer's leg-group code at line 342 reads `limb.anchor.y` for the hip, and the leg mesh stretches to the (now possibly-elevated) `currentTarget` via FABRIK without further renderer changes.

### 6. `useCreature.ts` becomes a thin shell

Final shape:

```ts
export function useCreature(config, targetRef) {
  const directorRef = useRef<Director | null>(null)
  const solverRef   = useRef<Solver | null>(null)

  useEffect(() => {
    solverRef.current   = new Solver(config)
    directorRef.current = new Director({ initial: 'wandering' })
  }, [/* config keys */])

  useFrame((_, dt) => {
    const d = directorRef.current; const s = solverRef.current
    if (!d || !s) return
    const drive = d.update({ targetRef, config, time: performance.now() }, dt)
    s.apply(drive)
  })

  return { chainRef: solverRef.current?.chainRef, limbStatesRef: solverRef.current?.limbStatesRef }
}
```

The returned `chainRef` and `limbStatesRef` come from the solver, preserving `AnimatedModel`'s existing prop surface.

### 7. File layout

```
app/game/animations/
  types.ts              # DragonDrive, Behavior, BehaviorContext, BehaviorId
  solver.ts             # Solver class wrapping Chain3D + FABRIK + always-on layers
  director.ts           # Director class: active/target behavior, cross-fade
  blend.ts              # blendDrive(a, b, t): per-field scalar lerp
  dragon/
    index.ts            # registry: { wandering, hatching }
    wandering.ts        # Behavior — port of current target-following logic
    hatching.ts         # Behavior — one-shot rise + look-up
    constants.ts        # tuning numbers (foot arc h, bank gain, hatching duration, blend ms)
```

The AI's "to add or tune a dragon animation" reading list: `types.ts` (the contract), the closest existing behavior in `dragon/`, and `dragon/constants.ts`. Three short files.

### 8. Hatching replaces the scale-pop

`HatchingDragon.tsx` currently lerps `g.scale` from `DRAGON_SCALE_INITIAL` to `DRAGON_SCALE_FINAL` over `EMERGE_DURATION_MS`. After this change:

- Scale stays at `DRAGON_SCALE_FINAL` throughout.
- On `phase === 'emerging'`, `HatchingDragon` calls `director.setBehavior('hatching')`.
- The `hatching` behavior outputs `rootYOffset` rising from `-eggDepth` (a constant in `dragon/constants.ts`) to `0` on ease-out cubic, plus `headPitch` looking up briefly then settling to 0, with `legCadence: 0`.
- On `phase === 'live'` (or when `hatching.isComplete()` returns true), `director.setBehavior('wandering', { blendMs: 600 })`.

`DRAGON_SCALE_INITIAL`, `DRAGON_SCALE_FINAL`, and `EMERGE_DURATION_MS` are removed from `app/page.constants.ts`. `HatchingDragon` no longer touches `g.scale` or `g.position` (the y-aware solver puts the dragon at the right height).

## Risks / Trade-offs

- **Risk**: porting current wandering doesn't reproduce the exact look frame-for-frame. → Mitigation: keep all current scalars (`maxSpeed`, `followDistance`, `stepThreshold`, `stepSmoothing`, `angleConstraint`, `limbAngleOffset`) on `CreatureConfig` and have the solver/wandering behavior consume them with identical math. Acceptance criterion: `legLiftAmplitude: 0` and `bankAngle: 0` produce visually identical motion to the current implementation.
- **Risk**: blending hatching → wandering produces a visible pop because `headTarget` differs sharply between the two. → Mitigation: 600 ms cross-fade with cubic ease, plus the hatching behavior's final-frame `headTarget` is constructed to match wandering's first-frame target (both look toward `targetRef`). The blend is on drive scalars, not joints, so no bone-length violations regardless.
- **Risk**: y in `Chain3D.resolve` interacts unexpectedly with `constrainAngle`, which is a 2D operation. → Mitigation: angle constraint stays in the x/z plane (heading is a flat-plane concept). Y propagates independently as `curr.y = prev.y` plus per-joint deltas applied *after* `chain.resolve()` returns. Documented in solver code.
- **Trade-off**: drive-signal contract is fixed at 8 fields. Adding a new always-on layer (e.g. tail damping when tail-lag lands) requires a `DragonDrive` field addition, touching the solver, blend, every behavior, and the registry. → Acceptable: the 8 fields cover the planned dragon-only roadmap, and field addition is a localized change (4–5 files) rather than a refactor.
- **Trade-off**: behaviors can't share state with each other directly. → Acceptable: the director holds `BehaviorContext` (which can carry shared values like the `targetRef`); behaviors that need history hold it in their own closure.
- **Trade-off**: `breath` field on `DragonDrive` is reserved but unused in this change. → Accepted: keeping the slot now avoids the field-addition cost the first time we ship a breath layer; default value is 0 and the solver ignores 0.

## Migration Plan

Order of operations (each step keeps the app runnable):

1. **Add y to `Chain3D.resolve`** — purely additive (writes a field that was already on the joint). No visible change.
2. **Add y reads in `AnimatedModel.useFrame`** — `joint.y` and `limb.anchor.y`. No visible change since solvers still write 0.
3. **Create `app/game/animations/types.ts`, `solver.ts`, `blend.ts`, `director.ts`** — solver's first iteration is a literal lift of the current `useCreature` body, parameterized by `DragonDrive`.
4. **Create `dragon/wandering.ts`** — outputs a `DragonDrive` whose values reproduce current motion when fed to the solver.
5. **Rewire `useCreature.ts`** — replace its body with director + solver. Verify the home page wandering looks identical to before.
6. **Add foot-arc and bank layers** in solver, keyed off `legLiftAmplitude` and `bankAngle`. Wandering opts in.
7. **Create `dragon/hatching.ts`** plus the eggDepth + duration constants.
8. **Edit `HatchingDragon.tsx`** to switch behaviors on phase change; remove scale lerp and the constants in `app/page.constants.ts`.

Rollback: each step is a separate commit; revert any individual commit cleanly. The hardest step (5) is the only one that changes runtime behavior even when nothing else has shifted, and it's verifiable by visual diff against the current home-page wandering.

## Open Questions

None blocking. Decisions on tail-lag, spine wave, idle noise, and panel restructuring are explicitly deferred to follow-up changes.
