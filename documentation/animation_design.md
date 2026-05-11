# Animation Design — Constraint-Based Procedural Creature

**Status:** canonical design doc for the dragon animation system and its authoring interface. Supersedes `motion_composer_design.md` and `handover_studio_live_tuning_panel.md`.

**Audience:** Aaron + future Claude Code agents continuing this work.

## 1. Context

### What exists today

- A node skeleton placed in studio steps 1 & 2 (segment selection + node assignment). Each node represents a joint where 3D segments physically connect.
- A runtime `Chain3D` spine with rigid distance constraints and per-joint angle constraints (`app/game/chain3d.ts`).
- A 3-joint FABRIK leg per limb (`app/game/fabrik3d.ts`).
- A `Solver` (`app/game/animations/solver.ts`) that, per frame: turns the head toward a target, advances it a small step, resolves the chain, then resolves each leg toward a desired foot position.
- One behavior — `wandering` (`app/game/animations/dragon/wandering.ts`) — which simply sets the head's target to whatever `targetRef` (mouse pick) is pointing at.
- A `Director` (`app/game/animations/director.ts`) capable of cross-fading between behaviors, with only one currently registered.
- An attractor controller and click-to-target on the floor.
- A studio Animate step (`app/studio/StepAnimate.tsx`) with 8 sliders covering stiffness, foot angle offset, step threshold, step smoothing, wander radius/speed, max speed, follow distance.
- A renderer (`app/game/AnimatedModel.tsx`) that locks each grouped piece of the 3D model to a (joint pair) or (anchor, foot target) pair so the model always conforms to the skeleton.

### What works

- The body chain bends and flows naturally as the head moves — distance and angle constraints behave as intended.
- 3D segments stay connected at their nodes; nothing visually drifts apart or breaks the segment chain.
- Translucent mode reveals the underlying mesh + node alignment cleanly.
- The renderer-to-skeleton contract is solid; swapping the animation source has no effect on rendering (see `skeleton_to_model_mapping.md`).

### What's broken / underdeveloped

- **Leg motion** — feet continuously lerp toward a moving desired position. There is no plant/swing state, no vertical arc, no real gait. Feet appear to slide rather than walk.
- **Attractor + head behavior** — the head lerps mechanically toward the target with constant angular speed. No anticipation, no arrival deceleration, no idle drift when nothing is set.
- **Dimensionality** — although `Chain3D` stores `y` on each joint, every driver operates in the XZ plane and Y is snapped back to rest. The creature lives on a flat plane.
- **No per-node tuning** — almost every dynamic parameter is one global number applied to the whole chain. The creature has only one personality.
- **No insight surface** — the panel exposes 8 numbers. The viewport shows the textured dragon but no joints, no targets, no constraints, no foot states. The user has no inspection tools.

## 2. Design principle

This system follows **constraint-based procedural animation**, as introduced by:

- `argonautcode/animal-proc-anim` — https://github.com/argonautcode/animal-proc-anim
- `zalo.github.io/blog/constraints` — https://zalo.github.io/blog/constraints/

**The rig is the animation.** Motion is not authored *on top of* the skeleton; it *emerges* from the skeleton's constraint-solving response to a moving target. A chain of joints with distance and angle constraints, dragged by its head, produces serpentine motion as a side effect of the constraints. Legs with FABRIK and a step-target rule walk because they're set up to walk.

This design is the antithesis of the "stack of additive wiggle layers" paradigm. There is no Spine Wave sinusoid added on top of locomotion, no clip-blending, no pose interpolation. Every visual behavior must be expressible as either:

- a property of a node (per-joint stiffness, damping, mass…),
- a kind of constraint between nodes or between a node and the world (distance, angle, spring-damper, look-ahead, ground, secondary chain…),
- a target/input picker (where the head looks, where each foot wants to be), or
- a state machine over the above (planted/swinging, idle/active, grounded/airborne).

The dragon's character — heavy / whippy / nervous / calm — emerges from how those parameters and constraints differ across regions of the same skeleton.

## 3. Hard rules the animation must not break

These are the invariants the animation system must preserve. Detailed in `skeleton_to_model_mapping.md`; summarized here.

1. **Bone lengths are constant.** Distance between consecutive `joints[i]` and `joints[i+1]` must always equal `segmentLengths[i]` (derived from the studio's node placement). `Chain3D.resolve()` enforces this and any animation work should preserve it.
2. **Hips are welded to the spine.** A leg's hip is locked to its parent spine joint via the studio-placed offset rotated by the live spine angle. Anything that moves the spine moves the hips; legs do not float off the body.
3. **Angle constraints prevent breaking bends.** Each joint's bend relative to its parent is clamped to `angleConstraint` (or a per-region equivalent). This protects the visual continuity between adjacent rigid segments.
4. **One BodyGroup = one rigid bone.** The animation granularity is the studio grouping. If the user wants a bend mid-piece, they split into two groups in studio with a shared node.
5. **Renderer reads only `joints`, `limb.anchor`, `limb.currentTarget`.** Whatever the animation writes into these three buckets *is* the visual. Nothing else feeds the renderer.

Rules 1–5 are invariants. The animation system's degrees of freedom live entirely *within* them.

### Current-state caveat (not an invariant)

The renderer today (`AnimatedModel.tsx`) places body groups with `position.y = 0`, effectively ignoring the Y component of `joints` and `limb.anchor`. This is the *present* state of the renderer, not a hard rule. Slice 1 (foot stepping with vertical arc) and Slice 4 (3D body root) both require relaxing this: the renderer will need to read `joint.y` and `anchor.y` when those slices land. Updating this is a small, localized renderer change and does not violate rules 1–5 (the renderer still reads only the same three buckets — just including their Y components).

## 4. Vocabulary

The animation panel and runtime split into two halves.

### Intrinsic dynamics — how nodes relate to their neighbors

- **Distance constraint** — fixed segment length. Hard rule, not tunable at animation time.
- **Angle constraint** — max bend between adjacent segments. Hard cap per joint or per region; tunable but bounded by what the 3D mesh tolerates without visible breakage.
- **Stiffness** — how strongly a joint resists deviating from rest. High stiffness = neck-like; low stiffness = tail-like.
- **Damping** — how quickly oscillations settle. High damping = no wobble; low damping = follow-through and overshoot.
- **Catch-up rate** — how quickly a joint moves toward its constraint solution per frame. Low catch-up = lag, weight, sluggishness; high catch-up = snappy, energetic.
- **Per-region asymmetry** — the same parameter takes different values along the chain (e.g. neck stiff, mid-body medium, tail loose). This is where creature character comes from.

### Extrinsic response — how the whole rig engages with the world

- **Head target** — the lead point. Currently `targetRef` (mouse pick).
- **Anticipation / look-ahead** — head aims slightly ahead of the body's velocity vector, so turns read as deliberate rather than reactive.
- **Arrival smoothing** — head decelerates as it approaches the target instead of stopping abruptly.
- **Idle drift** — when no target is set, the head meanders on a low-frequency curve rather than freezing or running off.
- **Gaze vs heading** — the head can *look at* one thing while the body's heading moves toward another. Separates the look-at constraint on the head joint from the locomotion target.
- **Foot planting** — feet have a binary state per foot: **planted** (stationary on the ground while the body moves over it) or **swinging** (lifted, traveling in a vertical arc to a new plant point). Triggered when the planted foot's body-anchor has dragged past a per-foot threshold.
- **Swing arc** — during swing, the foot follows a parabola: height = step length × lift factor at the midpoint of the swing.
- **Ground constraint** — feet snap to ground height (initially a flat plane at y=0; later raycast against terrain).
- **External force on root** — the chain's origin can be displaced (pick-up, jump, fall). The chain resolves to its new origin under the same intrinsic dynamics. Pick-up, drop, jump, climb, burrow, fly are all variants of this single mechanism.

### Constraint kinds (extensible)

The current system has two: distance + angle. Future ones plug in as new entries in the solver:

- **Spring-damper** between a joint and its rest position (gives weight, overshoot, follow-through).
- **Look-ahead** on the head (head aims at velocity-vector projection, not at the literal target).
- **Ground** on feet (and eventually belly when burrowing).
- **Secondary chain** — a child chain hanging off the main spine (dewlap, whisker, ear). Same `Chain3D` logic, anchored to a parent joint.
- **Reactive** — a constraint that activates only under a world condition (recoil when something gets close, brace when external force is large).

## 5. The animation interface

The interface has two surfaces: a **viewport** (visual feedback) and a **panel** (configuration). Both are required; one without the other is the current state.

### Viewport

A scene that renders the existing translucent 3D dragon model *with the procedural skeleton drawn over it as debug visualization*. Specifically:

- **Joint dots** at each `chain.joints[i]`, color-coded or sized by something inspectable (selected, stiffness, etc.).
- **Segment lines** drawn between consecutive joints, showing the rigid bones.
- **Angle-limit arcs** at each joint showing the bend constraint.
- **Hip anchors** as gizmos at each `limb.anchor`.
- **Foot target ghosts** at each `limb.currentTarget`, with a separate marker for `limb.desiredTarget`.
- **Foot state badges** — "planted" or "swinging" per foot, with the step-trigger circle drawn on the ground.
- **Swing arc preview** when a foot is swinging — the predicted parabolic path.
- **Head look-ahead vector** — an arrow showing where the head is aiming vs where the target actually is.
- **Selected node highlight** — when the user clicks a node in the panel, the corresponding viewport joint gets a distinct highlight.

All debug overlays toggleable (one set of toggles) so the user can declutter when needed.

### Panel

Top-level split — **Intrinsic** vs **Extrinsic** tabs.

**Intrinsic tab:**
- Node selector (click a viewport joint or pick from a list keyed by the studio's group names: Head, Neck, Spine-1, Spine-2, Tail-base, Tail-mid, Tail-tip, etc.).
- Per-node fields: angle constraint, stiffness, damping, catch-up rate.
- Region presets ("apply to all tail joints", "apply to all spine joints") for fast bulk tuning.
- Read-only display of the hard invariants set at node placement (segment length, hip offset) — visible so the user understands what they cannot change here.

**Extrinsic tab:**
- **Target / head** section: anticipation amount, arrival smoothing range, idle-drift amplitude + frequency, gaze separation toggle.
- **Feet** section: per-foot or per-pair step threshold, swing duration, lift height, ground height (initially constant). Gait pattern selector once two feet are in play (alternating / pacing / trotting).
- **External** section (later slices): pick-up offset, jump impulse, etc.

The panel reads from and writes to a `CreatureConfig` extension or a dedicated `AnimationConfig` shape, persisted via `useStudioStore`. Live changes propagate to the running `Solver` without a chain rebuild (split the memo as described in `handover_studio_animate_step.md`).

## 6. Visual feedback / insight requirements (per slice)

Each roadmap slice has a viewport visualization obligation. Without the visualization, the slice doesn't ship — "I made it tunable but you still can't see what changed" is the current failure mode and must not repeat.

For each slice below, the required visualizations are listed.

## 7. Roadmap

Each slice is a self-contained increment: a small set of param additions, a viewport visualization, a panel surface. Build one, test in the browser, iterate until it feels right, move to the next.

### Slice 1 — Foot stepping rework (and Y-axis graduation for legs)

**Problem solved:** legs slide; no real walk cycle; no foot planting; everything happens on a flat plane.

**Mechanism:**
- Each foot gets a state: **planted** or **swinging**.
- While planted: foot position is fixed in world space; body moves over it.
- Trigger swing: when the foot's hip anchor drags past `stepThreshold` from the foot's current world position.
- Swing: interpolate foot position from old to new target over `swingDuration` seconds; height = `liftHeight × 4 × t × (1 - t)` (parabola, peak at midpoint).
- On swing end: plant at new target.
- Per-foot phase offset so paired feet alternate.

**Config additions (per-foot):**
- `stepThreshold` (already exists, lift to per-foot).
- `swingDuration` (new).
- `liftHeight` (new).
- `phaseOffset` (new).
- `groundY` (new, initially 0 for all feet).

**Viewport visualizations:**
- Foot state badge: "planted" / "swinging" near each foot gizmo.
- Step-trigger circle: ring around each planted foot at radius `stepThreshold`.
- Swing arc preview: dashed parabola from current to target during swing.
- Distinct color for `desiredTarget` vs `currentTarget`.

**Panel:**
- Extrinsic → Feet section.
- Per-pair or per-foot tuning of the new params.

**Renderer update required:** `AnimatedModel.tsx` currently positions leg groups at `(anchor.x, 0, anchor.z)`. Update to use `anchor.y` so the hip sits at the actual joint height. The leg's rotation calculation must also account for vertical difference between anchor and `currentTarget` so the leg visibly tracks the foot through its swing arc. This is a small, localized change.

**Done when:** all four feet plant and lift visibly, with proper arc, and the gait reads as walking rather than sliding. User can see foot state at all times.

### Slice 2 — Attractor + head behavior rework

**Problem solved:** head tracks mechanically; no anticipation, no arrival, no idle behavior.

**Mechanism:**
- Replace head's lerp-toward-target with a steering model:
  - **Arrival**: deceleration radius around the target.
  - **Anticipation**: head aims at `target + k × velocity` (lead).
  - **Idle drift**: when no target is set or distance is below a threshold, generate a low-frequency curve (Perlin or summed sines) that the head follows.
  - **Gaze vs heading**: optional separate look-at constraint on the head joint that operates independently of the body's locomotion heading.

**Config additions:**
- `arrivalRadius`, `anticipationGain`, `idleDriftAmplitude`, `idleDriftFrequency`, `gazeSeparation` (toggle/amount).

**Viewport visualizations:**
- Arrow from head to target.
- Second arrow from head along the look-ahead vector (`target + k × velocity`).
- Idle-drift wandering target visible when active.
- If gaze is separated, a separate "look-at" arrow from head.

**Panel:**
- Extrinsic → Target / head section.

**Done when:** the dragon behaves like a creature deciding where to look, not a body chasing a dot.

### Slice 3 — Per-node intrinsic tuning

**Problem solved:** the whole chain has one stiffness / one angle constraint; the dragon can't have character.

**Mechanism:**
- `CreatureConfig` gains per-joint arrays for stiffness, damping, catch-up, angle constraint (with the existing global value as a default backfilled where regions aren't specified).
- `Solver` applies per-joint values when present.
- Spring-damper integration on each joint's rest deviation (new constraint kind).

**Config additions:**
- `nodeStiffness[]`, `nodeDamping[]`, `nodeCatchUp[]`, `nodeAngleConstraint[]`.

**Viewport visualizations:**
- Joint dots color-coded by stiffness (or selectable param).
- Selected-node highlight on click.
- Per-joint rest-deviation arrow (shows the spring-damper's current pull).

**Panel:**
- Intrinsic tab fully functional.
- Click a joint dot in viewport → panel jumps to that node.
- Region presets (apply to spine / tail / neck).

**Done when:** the user can sculpt a heavy-bodied creature, a whippy snake, and a stiff lizard from the same node skeleton purely by tuning per-node intrinsics.

### Slice 4 — Lift body root to full 3D

**Problem solved:** the body lives on a plane; can't be picked up, dropped, jumped.

**Mechanism:**
- The chain's origin (currently `chainOrigin`) becomes a *driven* point in 3D, not a static one.
- External forces (input handlers, physics events) write to the root position.
- Each joint's `restY` becomes a per-joint Y profile (relative to root) so the body has an internal vertical shape.
- The chain resolves the same way — distance + angle constraints + intrinsic dynamics — just now in genuine 3D.

**Config additions:**
- `rootMass`, `rootGravity` (when in falling state), per-joint `restYOffset`.
- A small state machine: `grounded` / `airborne` / `held`.

**Viewport visualizations:**
- Root marker (distinct from joint 0).
- Ground-plane reference grid.
- Gravity vector indicator when airborne.

**Panel:**
- Extrinsic → External section (initial controls: drag-to-pick-up handle, drop button, jump impulse slider for testing).

**Renderer update required:** `AnimatedModel.tsx` currently positions spine groups at `(joint.x, 0, joint.z)`. Update to use `joint.y` so the body visibly lifts when the root displaces in Y. Same change shape as Slice 1's renderer update, applied to spine groups.

**Done when:** the user can pick the dragon up with the mouse, drop it, watch it fall and land with the body's intrinsic dynamics producing convincing follow-through.

### Slice 5 — New constraint kinds (extensibility proven)

**Problem solved:** all expressive variations have to be coded as solver tweaks; no general extensibility.

**Mechanism:**
- A small `Constraint` interface in the solver: `apply(chain, dt, params)`.
- Migrate existing constraints (distance, angle) into this shape.
- Add: **spring-damper** (formalized from Slice 3), **look-ahead** (formalized from Slice 2), **ground** (per-joint Y clamp), **secondary chain** (a child `Chain3D` anchored to a parent joint — for dewlaps, whiskers, dorsal fins, etc.).

**Config additions:**
- An array of constraint specs per region or per joint.
- Secondary chain configurations (count, segment lengths, anchor joint).

**Viewport visualizations:**
- Each constraint kind has a distinct gizmo (ground = a small ground-plane patch, secondary chain = its own joint dots in a subtler color, etc.).

**Panel:**
- New "Constraints" section under Intrinsic, listing applied constraints with mute/enable toggles per node or per region.

**Done when:** adding the next constraint kind (say, a "soft cap" or "muscle pull") is a single new file in `app/game/animations/constraints/` + a panel entry, with no changes to the solver core.

### Slice 6 — Environmental reactivity

**Problem solved:** the dragon reacts only to its assigned target; doesn't notice the world.

**Mechanism:**
- World signals derived from runtime state: nearby objects, recent impacts, idle time, distance to user cursor, etc.
- These feed into extrinsic params: a recoil multiplier on `catchUp`, a `look-at` overriding gaze when something gets close, a brace activating spring-dampers under impact.

**Config additions:**
- Signal definitions and bindings to existing extrinsic params.

**Viewport visualizations:**
- Active signal indicators (overlay icons near the dragon when a signal fires).

**Panel:**
- A signals subsection under Extrinsic (or its own tab if it grows).

**Done when:** the dragon visibly notices and responds to the cursor and to placed scene objects without scripted behavior trees.

### Future slices (out of scope until 1–6 ship)

- **Climbing** — surface contact + foot planting on non-horizontal ground (extension of ground constraint).
- **Burrowing** — root moves into the ground; body trails behind, segments occluded by terrain.
- **Flying** — root has 3D velocity; legs retract or assume idle pose; secondary motion on wings (if present in skeleton).
- **Behavior switching** — multiple behaviors registered with `Director`, transitions on world signals. Today the Director can already cross-fade; only one behavior is registered.
- **Multi-creature** — same system, multiple instances.

## 8. Development loop

For each slice:

1. **Define the config additions.** What new fields does `CreatureConfig` (or `AnimationConfig`) need? Where do their defaults live? Add types.
2. **Implement the mechanism.** Update `Solver` (and possibly `Director`, `Chain3D`, `fabrik3d`) to consume the new fields.
3. **Add the viewport visualization.** New debug gizmos drawn over the translucent model. Toggleable.
4. **Add the panel surface.** Tab section + controls bound to the new config fields. Live updates without chain rebuild.
5. **Iterate in the browser.** Tune live until the slice's "done when" condition is met.
6. **Lock in.** Commit. Update this doc's "What works" list. Move to the next slice.

The contract between slices is the renderer (it never changes) and the hard rules in §3. Anything inside that envelope is fair game.

## 9. File map

Structural files relevant to this work:

- `app/game/chain3d.ts` — `Chain3D.resolve()` (rigid distance + angle constraints).
- `app/game/fabrik3d.ts` — 3-joint FABRIK leg solver.
- `app/game/animations/types.ts` — `DragonDrive`, `BehaviorContext`, `Behavior`.
- `app/game/animations/director.ts` — behavior registry + cross-fade.
- `app/game/animations/blend.ts` — per-field blend used by Director.
- `app/game/animations/solver.ts` — current per-frame solver (chain + legs).
- `app/game/animations/dragon/wandering.ts` — the only behavior today.
- `app/game/animations/dragon/index.ts` — behavior registry factory.
- `app/game/animations/dragon/constants.ts` — `DEFAULT_BLEND_MS` (intentionally minimal).
- `app/game/useCreature.ts` — frame-loop driver, owns `Solver` + `Director`.
- `app/game/AnimatedModel.tsx` — renderer; locks each studio BodyGroup to its joint pair / anchor+target pair.
- `app/game/modelConfigToCreatureConfig.ts` — converts saved studio nodes into runtime parameters.
- `app/studio/StepAnimate.tsx` — current animation panel (8 sliders, to be replaced by the new interface).
- `app/studio/StudioScene.tsx` — scene composition for studio steps including the animate step.
- `app/studio/page.stores.ts` — `useStudioStore` (zustand + persist); holds `animationConfig`.
- `app/studio/page.types.ts` — `AnimationConfig`, `CreatureConfig`-adjacent shapes.

Supporting doc — not deprecated, still authoritative:

- `documentation/skeleton_to_model_mapping.md` — the renderer ↔ skeleton contract. Read first; this doc builds on it.
- `documentation/handover_studio_animate_step.md` — engineering history of how step 3 was wired in + perf investigation. Suspect #2 (split the memo) is still worth applying as a prerequisite to the new panel.

## 10. Deprecated documentation

These documents describe an earlier direction (additive layer composition) that was abandoned in favor of the constraint-based procedural approach captured here. They are kept for historical context only.

- `documentation/motion_composer_design.md` — **SUPERSEDED**. The layer / signal / pose / trigger / timeline composer is not the chosen paradigm.
- `documentation/handover_studio_live_tuning_panel.md` — **SUPERSEDED**. Its core proposition (slider-tune the existing `DragonDrive` constants + bake back to code) assumes the current scalar control surface is the destination. The new design replaces that surface.

The wireframe at `app/wireframe/page.tsx` corresponds to the deprecated motion composer design. It can be kept as a visual reference for what the panel does *not* aim to become.

## 11. Out of scope (intentionally)

- 3D pose editor / pose libraries.
- Motion-capture clip blending.
- Drag-and-drop timeline editing.
- Server-side persistence of animation configs beyond the existing `ModelConfigRow`.
- Mood-space / personality-dial 2D blend pads.
- Sound or particle reactivity coupled to motion.
- Multi-creature simultaneous animation.

These are not rejected — they're simply not in the path to a polished single-creature procedural animation. They can be reconsidered after Slice 6.
