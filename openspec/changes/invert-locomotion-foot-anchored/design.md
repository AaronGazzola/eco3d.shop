## Context

The constraint-based procedural animation system (`documentation/animation_design.md`) was built on a head-driven chain model derived from `argonautcode/animal-proc-anim`. In that model the head joint is the prime mover: it lerps toward the attractor each frame, and the rest of the chain follows via distance + angle constraints. Legs follow the moving body by FABRIK-resolving toward foot targets computed from the live hip positions.

This shape produces two structural bugs that no parameter tuning can fix:

1. **Feet slide rather than plant.** A foot's target moves every frame with the moving body, so the foot lerps continuously and never anchors to the world. There is no concept of a planted foot.
2. **The body slides laterally on head pivot.** When the attractor sweeps across the front, the head rotates and the distance-constraint chain whips the whole body sideways. The body translates with no foot-step to justify it. The chain has no world anchor — only the head does.

Both stem from the same root cause: **the body has no world anchor**. Only the head is connected to the world (via the attractor pull).

The reference landscape for fixing this is well-published. **Trifox** (a shipped 3D lizard game) uses an "Intent → Action → Reaction → Follow Through" pipeline: intent positions desired foot targets; feet step when drift exceeds threshold (with directional tolerance and lookahead prediction); the body's visible pose is *computed from* the feet. **argonautcode** uses the head-driven model — it is what we have today and what we are moving away from. **zalo's "Constraints" blog** is the underlying projection-based math that both approaches share.

This change ports the Trifox model into our existing rig — same studio workflow, same renderer contract, same `Chain3D` + FABRIK primitives, with one solver capability addition (dual-anchor FABRIK) and a small set of new runtime state.

### Constraints

- **Renderer contract is frozen.** The renderer reads `chain.joints[i]`, `limb.anchor`, `limb.currentTarget` and nothing else. The change is allowed to position those values differently inside the animator, but must not change what the renderer consumes. The only relaxation: the renderer begins reading the `y` component of joints and anchors, which `documentation/skeleton_to_model_mapping.md` already flags as a "current-state caveat, not an invariant."
- **Studio workflow is frozen.** Steps 1 (segment selection) and 2 (node placement) are untouched. The same studio node data feeds the new runtime.
- **Hard rules from `animation_design.md` § 3 are invariants.** Bone lengths constant. Hips welded to spine. Angle constraints respected. One BodyGroup = one rigid bone. Renderer reads only the three buckets.
- **Rig generality is preserved.** No hardcoded joint indices. Every per-rig value (spine joint count, hip joint indices, hip offsets, leg reach, segment lengths) is derived from studio nodes via `modelConfigToCreatureConfig`. The new runtime works on any rig matching the head + spine + tail + 2 leg pairs topology.
- **Existing animation panel structure preserved.** The Intrinsic / Extrinsic tab shell and the debug overlay system from Slice 0 are extended, not rebuilt. New sliders join existing subsections; new overlay gizmos join existing toggles.

## Goals / Non-Goals

**Goals:**

- Eliminate foot-sliding by making feet world-anchored (plant/swing state machine).
- Eliminate body lateral-slide on head pivot by anchoring the body's hip joints to the planted feet.
- Replace head-driven locomotion with intent-driven locomotion (intent state + foot-step prediction + body-derived hips + gaze-only head).
- Add a dual-anchor FABRIK mode to `Chain3D` so the mid-spine can be solved between two pinned hip joints.
- Support backwards, sideways, and forward motion as a natural consequence of the intent's velocity vector being unconstrained in direction.
- Preserve rig generality: same code path runs on any studio-authored rig regardless of segment count, segment length, hip placement, or leg geometry.
- Extend the debug overlay with foot state, step-trigger rings, swing arc previews, intent marker, hip-derivation lines.

**Non-Goals:**

- No per-foot tuning beyond a global set of foot params shared by all four feet (per-foot overrides + region presets are Slice 2's territory).
- No per-node intrinsic tuning (stiffness, damping per joint). That is Slice 2.
- No external-force-on-root state machine (pick-up, jump, fall). That is Slice 3.
- No new constraint kinds beyond the existing distance + angle + the new dual-anchor mode. Spring-damper, look-ahead, secondary chains are Slice 4.
- No environmental reactivity (recoil, brace, look-at overrides). Slice 5.
- No changes to step 1, step 2, or the studio's node placement workflow.
- No `ModelConfigRow` shape changes, no Supabase schema changes.
- No new external dependencies.

## Decisions

### 1. Intent is a single struct, not per-joint

The intent state is one `{position, heading, velocity}` for the whole creature, not a per-joint look-ahead. The whole creature has one notion of "where I want to be." Distributing intent across joints would be the wrong abstraction — it would re-introduce head-driven dynamics under a different name.

**Why over per-joint look-ahead:** Trifox's model and every other published procedural quadruped use a single body-level intent point. Per-joint look-ahead is conceptually closer to additive-layer animation (the deprecated paradigm). One intent point also keeps the runtime state minimal and the tuning surface small.

**Alternative considered:** make the head joint itself the intent, and have it not pull the chain. Rejected — the head joint is a *rendered* part of the rig; intent is internal-only. Conflating them muddies the model and produces edge cases when the head is far from where the intent point actually is (during swing transitions, idle drift, etc.).

### 2. Feet are world-anchored, not body-anchored

A planted foot's position is stored in world space (`plantPos`) and does not move across frames until the foot enters the swinging state. The foot's *desired* position (where it would want to be given current intent) is recomputed every frame, but the *actual* position only changes during swing.

**Why over today's continuous-lerp approach:** without world-anchoring, the foot has no concept of "I am here, the world is moving past me." World-anchored plant points are the mechanism that makes feet stop sliding. This is the central architectural insight of the Trifox model and of every published foot-planted IK system (Roblox IKPF, etc.).

### 3. Hip joints are positioned from feet, not from head pull

Each frame, the two spine joints that own hip nodes (front pair and rear pair) get their positions computed from the midpoint of their respective feet, lifted by `bodyHeight`. This is what stops lateral body-slide on head pivot: the hips physically cannot move until feet step.

**Why over today's chain-pull positioning:** the body needs a world anchor. Foot midpoints are the only available anchor. Anchoring the hip joints directly is the simplest realization of "body position is constrained by feet" — it requires no new physics, no center-of-mass calculation, no balance algorithm.

**Alternative considered:** maintain an explicit "body center" entity that is steered by intent and constrained by feet. Rejected — it adds a layer of indirection that the runtime does not need. The hip joints themselves can serve as the body's world anchors directly; foot midpoints + `bodyHeight` give us their positions without an intermediate "body" object.

**Alternative considered:** position a single body center as the midpoint of all four feet, then place hip joints relative to it. Rejected for this slice — it forces front hips and rear hips to move together, which prevents the body from naturally S-bending when one hip pair has stepped and the other has not. Per-pair anchoring (front hips from front feet, rear hips from rear feet) is more lifelike and not measurably harder to implement.

### 4. Spine resolves in three sections

- **Mid-spine** (joints strictly between `J_front` and `J_back`): dual-anchor FABRIK with both hips pinned.
- **Head section** (joints from `J_front` outward toward joint 0): one-anchored FABRIK with the head joint angle-biased toward the attractor.
- **Tail section** (joints from `J_back` outward toward the last joint): one-anchored Chain3D resolve, no target.

**Why three sections over a single solve:** the constraints differ. The mid-spine has two anchors; the head end has one anchor + a gaze target on the far end; the tail has one anchor and trails naturally. Folding all three into a single FABRIK pass would force the same anchor topology everywhere and lose the gaze behavior on the head.

**Why the dual-anchor mode is in `Chain3D`** (rather than a separate solver): the existing `Chain3D.resolve` already does FABRIK's forward pass with distance + angle constraints. The dual-anchor mode is the same passes, applied twice (forward then backward), iterated. The math is shared.

### 5. Head joint gazes, does not translate

The head joint sits at the far end of the head section. It does not pull the chain. Instead, in the head section's one-anchored FABRIK pass, the head joint's angle relative to its parent is biased toward the attractor — clamped by the existing per-joint angle constraint. The body's translation is decoupled from the head's gaze direction entirely.

**Why over a separate "look-at" constraint:** the head joint's local rotation *is* the gaze. No additional constraint kind needed. The angle constraint that already exists on every joint becomes the head's gaze clamp — the cap on how far it can rotate to look at something.

**Side effect, intentional:** "anticipation," "arrival," "idle drift," and "gaze vs heading separation" — previously framed as separate Slice 2 mechanisms — all become properties of either the intent steering rule or the head joint's local rotation. They no longer need to be added as separate features.

### 6. Foot stepping rule uses a directional drift threshold

A foot transitions from planted to swinging when its drift from desired position exceeds `stepThreshold`. The "drift" measurement may optionally use a *directional curve* (more tolerance for "behind the foot," less for "to the side"). Initial implementation: a single scalar threshold (no directional curve). The curve is a tuning surface added when needed.

**Why directional:** Trifox uses a directional curve. The asymmetry is what produces lifelike behavior — a real lizard tolerates a trailing foot longer than a sideways foot. Starting with a scalar threshold keeps the first implementation simple; the curve can be added in tuning once the baseline works.

**Step destination prediction:** the swing target leads the desired position by `intent.velocity × predictionGain`. With `predictionGain = 0` the foot lands exactly at the desired position; with `predictionGain > 0` it lands where the body is going to be, which produces a more natural "the foot reaches forward as I'm moving forward" appearance.

### 7. No scheduled gait, no phase offsets

Each foot decides independently from its own local state (`plantPos`, current drift, swing progress). There is no shared clock, no scheduled stepping order, no phase offset between paired feet.

**Why:** the design doctrine in `animation_design.md` § 2 is explicit: motion *emerges* from constraints; it is not scheduled. Adding a gait scheduler would re-introduce the additive-layer mindset the doctrine rejects. Whatever stepping pattern emerges from four independent feet with the same local rule is the dragon's "gait." If a specific pattern is wanted (e.g. diagonal pairs), it should emerge from the parameters, not from a scheduler.

**Trade-off accepted:** at very low intent speeds, two feet on the same side might both be drift-out-of-tolerance simultaneously and both start swinging. This can produce a brief moment where only the diagonal pair is planted. That is acceptable — and in fact what real lizards do under similar conditions. If it produces visual artifacts in practice, the fix is parameter tuning (different `stepThreshold` per foot to bias which one steps first), not a scheduler.

### 8. Obsolete controls are removed; one rename for clarity

The previous panel exposes several controls whose underlying mechanics do not exist in the new model. They are removed rather than retained as inert sliders.

- **`limbAngleOffset` (Foot Angle Offset) — removed.** The previous foot target was computed as `spineJoint + limbReach × (heading + limbAngleOffset × side)`, biasing each side's foot by a global angle. The new model derives each foot's desired position from `intent.position + hipOffset + restFootOffset rotated by intent.heading`. `restFootOffset` is the per-foot `nodeHip → nodeFoot` vector taken directly from the studio's node placement, so the asymmetry between left and right is already encoded in the rig itself — there is no global offset to tune.
- **`stepSmoothing` — removed.** The previous foot motion was a continuous lerp toward a desired position; `stepSmoothing` was the lerp factor. The new model has no continuous lerp. A foot is either planted (its `currentTarget` equals its world-anchored `plantPos`) or swinging (its `currentTarget` interpolates along a parabolic arc parametrized by `swingDuration`). Smoothness during swing is a function of `swingDuration` and `liftHeight`; the old slider has no surface to act on.
- **`followDistance` → `arrivalRadius` — renamed.** Same role conceptually (radius at which the body decelerates and arrives at its target), name aligned with the steering literature this slice draws from. A one-time read at store hydration seeds `arrivalRadius` from any persisted `followDistance` value, then the old key is dropped.

**Why removal over inert retention:** keeping a slider whose underlying mechanic no longer exists would mislead users. They would tune it and see no effect, or worse, see effects that come from confounding factors. The Slice 0 panel's design (`documentation/animation_design.md` § 4) is explicit that controls and gizmos are paired surfaces: every panel control corresponds to a visible system behavior. Sliders without behavior break that contract.

**Persistence cost:** users lose their tuned values for `limbAngleOffset` and `stepSmoothing`. This is acceptable — tuning is fast in the live panel, and the new defaults are designed to produce reasonable starting motion.

### 9. Renderer reads Y for spine and leg groups

`AnimatedModel.tsx` currently positions spine groups at `(joint.x, 0, joint.z)` and leg groups at `(anchor.x, 0, anchor.z)`. This change updates both to read the `y` component. Leg group rotation also accounts for the vertical difference between anchor and `currentTarget` so the leg visibly tracks the foot's swing arc.

**Why this is not a renderer-contract change:** `documentation/skeleton_to_model_mapping.md` § 3 already flags the y=0 hardcoding as a "current-state caveat, not an invariant." The contract is "renderer reads joints, anchors, and targets"; reading their Y component is a localized internal change.

**Smallest change shape:** four numeric assignments in `useFrame` — `position.y` reads from the joint/anchor for spine and leg groups, and the leg's rotation calculation gains a Y-axis component. No new component, no new abstraction.

## Risks / Trade-offs

- **Risk:** Dual-anchor FABRIK may fail to converge when the two hip anchors are placed more than `Σ segmentLengths` apart along the spine (the chain is "stretched flat"). → **Mitigation:** clamp the actual hip-to-hip distance into a reachable range derived from the spine's total length minus head/tail allowance. In studio-authored rigs this is a non-issue because hip positions are derived from foot positions which are derived from studio offsets, and the studio's geometry is by construction reachable.
- **Risk:** During a swing, a foot's `currentTarget` includes a vertical lift component, which means `limb.currentTarget.y > 0` for the first time in the runtime. The renderer assumes `limb.currentTarget.y = 0` today (it ignores Y in leg rotation math). → **Mitigation:** the renderer update in this slice reads Y. Verified during browser verification.
- **Risk:** With four feet's plant points anchored in world space, an attractor that moves faster than `maxIntentSpeed` will cause feet to lag arbitrarily far from the dragon. → **Mitigation:** the directional drift threshold + step prediction handles this naturally — feet step at high cadence when the body is moving fast. If extreme attractor speed causes visible lag, tune `maxIntentSpeed` or `stepThreshold`. No architectural fix needed.
- **Risk:** Intent-driven locomotion fundamentally changes what `wandering.ts` and any future `Behavior` does. Today behaviors write the attractor; under the new model they should write to intent. → **Mitigation:** `wandering.ts` is the only behavior. It already writes to `targetRef` (the attractor), which `Solver` consumes. The change is purely inside `Solver` — `Solver` now feeds intent from `targetRef`, and behaviors continue writing to `targetRef`. No behavior code needs to change.
- **Trade-off:** Persisted tuned values partially survive. `angleConstraint`, `stepThreshold`, `wanderRadius`, `wanderSpeed`, `maxSpeed`, `showAttractor` continue under the same field names with the same UX labels (their *effect* on the dragon shifts because the underlying solver is different, but the persistence is preserved). `followDistance` is migrated to `arrivalRadius` at store hydration. `limbAngleOffset` and `stepSmoothing` are dropped — users who had tuned those two values lose them. → **Acceptable** — re-tuning is unavoidable when locomotion fundamentally changes, the new defaults are designed to produce a usable starting point, and the Slice 0 panel makes re-tuning fast.
- **Trade-off:** The new overlay gizmos (foot state badges, step-trigger rings, swing arc previews, intent marker, hip-derivation lines) add visual clutter when all are on. → **Mitigation:** each is independently toggleable via `overlayToggles`. Default new gizmos to ON because the slice's purpose is making the new mechanics legible, but the user can declutter immediately.
- **Trade-off:** The renderer now reads Y, which means anything that currently relies on the dragon being on the y=0 plane (camera, floor click plane, attractor pick-plane) needs to verify it still behaves correctly. → **Mitigation:** the floor click-plane logic in `StudioScene.tsx` works against a fixed y=0 ground plane, which is unaffected; the dragon's body simply lifts off it by `bodyHeight`. Verified in browser verification.

## Migration Plan

Each step keeps the studio runnable and the home-page dragon visible. Each is a single commit.

1. **Type + store additions.** Add the new fields to `AnimationConfig`, `OverlayToggles`, and `CreatureConfig`-adjacent shapes in `app/studio/page.types.ts`. Add defaults in `app/studio/page.stores.ts` and to `partialize`. No runtime change yet.
2. **Add `Chain3D.resolveDualAnchor`.** New method on `Chain3D` taking two anchors. Unit-tested with a small inline harness if helpful; not yet called from the solver. Old `resolve` preserved.
3. **Implement the new solver pipeline.** Replace the body of `Solver` (or add a sibling solver pipeline behind a flag in `useCreature.ts`) with the seven-step pipeline above: intent → feet → hip joints → mid-spine → head section → tail section → legs. Flagged behind a config field so the old solver remains runnable for A/B comparison during development.
4. **Switch the runtime to the new pipeline.** Flip the flag default in `useCreature.ts`. Home page and studio step 3 both use the new pipeline. Old pipeline code preserved for one commit, then deleted.
5. **Renderer update.** Update `AnimatedModel.tsx` to read joint.y and anchor.y for spine and leg groups, and adjust leg rotation for vertical difference. Browser-verify the home-page dragon still renders correctly.
6. **Add the new overlay gizmos.** Extend `AnimationDebugOverlay.tsx` with the foot state badges, step-trigger rings, swing arc previews, intent marker, and hip-derivation lines, each gated by a new toggle. Extend the overlay-toggle row in `StepAnimate.tsx`.
7. **Add the new sliders.** Extend the Extrinsic tab's Feet and Head/Target subsections; add the new Body subsection with `bodyHeight`.
8. **Verify across two distinct rigs.** Open the studio with two different model configs (different spine joint counts, different hip placements, different leg lengths) and verify the new pipeline produces correct behavior on both without code changes.

**Rollback:** the dual-anchor method on `Chain3D` is additive — old `resolve` is preserved across the entire change. The solver pipeline is replaceable end-to-end. The renderer change is a localized read of an additional field. The new config fields default to values that approximate the old behavior closely enough that reverting the solver to the old pipeline (with the old code path still in git history) yields a working state at any point.

## Open Questions

1. **Should the directional drift threshold curve ship in this slice or be deferred?** This slice's tasks specify a scalar threshold initially (simpler implementation). The directional curve is a small follow-up (one new config field of curve points + a sample function). Deferring it to a follow-up commit *inside this slice* feels right — get the baseline working, then add the curve. Resolved by the implementer.

2. **What happens during the very first frame after the studio loads, before any foot has been "planted"?** Initial plant points are seeded from each foot's studio-defined rest position (`spineCentroid + limbReach × (rest heading)`). All four feet start in the planted state. This is correct: nothing visible happens until intent starts moving.

3. **Should idle drift (intent meandering when no attractor) ship in Slice 1 or defer to a tuning pass?** It is small (a sum-of-sines or Perlin sample feeding `intent.velocity` when the attractor distance is below a threshold). Including it in Slice 1 means the new sliders for `idleDriftAmplitude` / `idleDriftFrequency` need values that produce visible-but-not-distracting motion. Recommended: ship it but default amplitude to 0 (no idle motion) until a tuning pass sets sensible defaults.

4. **Should the spine middle section use multiple iterations of dual-anchor FABRIK?** A single forward+backward pass may not fully converge when both anchors move significantly in one frame. The standard FABRIK approach iterates until distance error is below a threshold (typically 2–4 iterations). Recommended: a small fixed iteration count (e.g. 3) initially; expose as a hidden config if convergence problems appear.
