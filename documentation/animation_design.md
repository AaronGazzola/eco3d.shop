# Animation Design — Constraint-Based Procedural Creature

Canonical design doc for the dragon animation system and its authoring interface. Audience: Aaron and future AI agents continuing this work.

## 1. Design principle

This system is **constraint-based procedural animation**: motion is not authored *on top of* the skeleton; it *emerges* from the skeleton's constraint-solving response to a moving input. A chain of joints with distance and angle constraints, with its body anchored to four world-anchored feet, produces serpentine locomotion as a side effect of those constraints. Legs walk because the per-foot state machine, the swing arc, and the hip derivation from feet positions are set up to walk.

Every visual behavior must be expressible as one of:

- a property of a node (per-joint stiffness, damping, mass, …),
- a kind of constraint between nodes or between a node and the world (distance, angle, spring-damper, ground, secondary chain, look-ahead, …),
- a target / input picker (where the intent point is steering, where each foot wants to be), or
- a state machine over the above (planted / swinging, grounded / airborne / held).

The dragon's character — heavy, whippy, nervous, calm — emerges from how those parameters and constraints differ across regions of the same skeleton.

The reference projects that ground this approach are listed in § 11.

## 2. Hard rules the animation must not break

These are the invariants the animation system preserves. Detailed in `skeleton_to_model_mapping.md`; summarized here.

1. **Bone lengths are constant.** Distance between consecutive `joints[i]` and `joints[i+1]` always equals `segmentLengths[i]`, derived from the studio's node placement. `Chain3D.resolve()` and `Chain3D.resolveDualAnchor()` enforce this.
2. **Hips are welded to the spine.** Each leg's hip is locked to a spine joint via the studio-placed offset rotated by the live spine pose. Legs do not float off the body.
3. **Angle constraints prevent breaking bends.** Each joint's bend relative to its parent is clamped to its `angleConstraint`. This protects the visual continuity between adjacent rigid segments.
4. **One BodyGroup = one rigid bone.** The animation granularity is the studio grouping. To bend mid-piece, the user splits into two groups in studio with a shared node.
5. **Renderer reads only `joints`, `limb.anchor`, `limb.currentTarget`.** Whatever the animator writes into these three buckets *is* the visual. Nothing else feeds the renderer.

Rules 1–5 are invariants. The animation system's degrees of freedom live entirely within them.

## 3. Vocabulary

The animation panel and runtime split into two halves: **Intrinsic** (how nodes relate to their neighbors) and **Extrinsic** (how the rig engages with the world).

### Intrinsic dynamics

- **Distance constraint** — fixed segment length. Hard rule, not tunable at animation time.
- **Angle constraint** — max bend between adjacent segments. Hard cap per joint or per region; tunable but bounded by what the 3D mesh tolerates without visible breakage.
- **Stiffness** — how strongly a joint resists deviating from rest. High stiffness = neck-like; low stiffness = tail-like.
- **Damping** — how quickly oscillations settle. High damping = no wobble; low damping = follow-through and overshoot.
- **Catch-up rate** — how quickly a joint moves toward its constraint solution per frame. Low catch-up = lag, weight, sluggishness; high catch-up = snappy, energetic.
- **Per-region asymmetry** — the same parameter takes different values along the chain (e.g. neck stiff, mid-body medium, tail loose). This is where creature character comes from.

### Extrinsic response

- **Attractor** — the input. A world point produced by mouse pick.
- **Intent** — an internal state (`{position, heading, velocity}`) that steers toward the attractor each frame and represents *where the creature wants to be*. The attractor does not drive joints directly; the intent does. Intent has no rendered representation; it is the system's internal "ghost" the creature is chasing. When no attractor is set, intent stands still or meanders (idle drift).
- **Arrival / anticipation** — built into the intent's steering rule. Intent decelerates as it approaches the attractor; its velocity vector is what foot-step targets lead by (anticipation). Properties of the steering rule, not separate mechanisms.
- **Plant point** — a foot's world-anchored position. A foot in the **planted** state has a plant point that does not move across frames; the only reader is the leg IK, which positions the leg between the hip and the plant point. The plant point only changes at the end of a swing.
- **Foot planting (state machine)** — each foot is either **planted** (plant point fixed in world space) or **swinging** (interpolating along a parabolic arc from the old plant point to a new one over `swingDuration`). The transition is local to the foot: when a planted foot's drift from its desired position exceeds the step threshold, it transitions to swinging. New plant point = desired position + `intent.velocity × predictionGain`.
- **Swing arc** — during swing, the foot follows a parabola: height = `liftHeight × 4 × t × (1 − t)`, peaking at the swing midpoint.
- **Ground constraint** — plant points snap to ground height (initially a flat plane at `y = 0`; later raycast against terrain).
- **Body-derived spine roots** — the spine joints that own hip nodes (front pair and rear pair) are positioned each frame from their respective foot plant points, not from chain-pull. They are the *anchored roots* of the spine solve: feet → hips → spine, not head → spine → feet.
- **Dual-anchor solve** — between the two hip-anchored spine roots, the mid-spine joints are solved with both ends pinned (forward + backward FABRIK passes, iterated). Head joints trail forward off the front hip; tail joints trail back off the rear hip — both as standard one-anchored chains.
- **Gaze (head joint only)** — the head joint rotates within its angle constraint to point at the attractor. Local rotation; does not translate the body. Body translation only progresses as fast as feet plant and replant. Gaze and locomotion are naturally separated.
- **External force on root** — the body root can be displaced (pick-up, jump, fall). The chain resolves to its new root under the same intrinsic dynamics. Pick-up, drop, jump, climb, burrow, fly are all variants of this single mechanism.

### Constraint kinds (extensible)

The solver enforces two universal constraints (distance + angle) and one structural mode (dual-anchor). Additional constraint kinds plug in as entries in the solver:

- **Spring-damper** between a joint and its rest position — gives weight, overshoot, follow-through.
- **Look-ahead** — a joint aims at a velocity-vector projection rather than at a literal target.
- **Ground** — per-joint Y clamp; eventually a raycast against terrain.
- **Secondary chain** — a child chain hanging off the main spine (dewlap, whisker, ear, dorsal fin). Same `Chain3D` logic, anchored to a parent joint.
- **Reactive** — a constraint that activates only under a world condition (recoil when something approaches, brace under impact).

## 4. The animation interface

The interface has two surfaces: a **viewport** (visual feedback) and a **panel** (configuration). Both are required.

### Viewport

The studio Animate viewport renders the translucent 3D dragon with the procedural skeleton drawn over it as debug visualization:

- **Joint dots** at each `chain.joints[i]`, color-coded or sized by inspectable state (selected, stiffness, etc.).
- **Segment lines** between consecutive joints, showing the rigid bones.
- **Angle-limit arcs** at each joint showing the bend constraint.
- **Hip anchors** as gizmos at each `limb.anchor`.
- **Foot markers** at each `limb.currentTarget`, with a separate ghost marker for `limb.desiredTarget`.
- **Foot state badges** ("planted" / "swinging") per foot, with a step-trigger circle on the ground.
- **Swing arc preview** when a foot is swinging — the predicted parabolic path.
- **Intent marker** at `intent.position` with a heading arrow.
- **Hip-derivation lines** from each hip joint to its feet midpoint.
- **Head gaze vector** — an arrow from the head joint along its local heading.
- **Selected node highlight** — clicking a joint in the panel highlights the corresponding viewport joint.

All overlays are independently toggleable so the user can declutter when needed.

### Panel

Top-level split: **Intrinsic** vs **Extrinsic** tabs.

**Intrinsic tab:**

- Node selector (click a viewport joint or pick from a list keyed by the studio's group names: Head, Neck, Spine-1, Spine-2, Tail-base, Tail-mid, Tail-tip, etc.).
- Per-node fields: angle constraint, stiffness, damping, catch-up rate.
- Region presets ("apply to all tail joints", "apply to all spine joints") for bulk tuning.
- Read-only display of the hard invariants set at node placement (segment length, hip offset) so the user understands what they cannot change here.

**Extrinsic tab:**

- **Feet** subsection: per-foot or per-pair step threshold, swing duration, lift height, prediction gain, ground height.
- **Head / Target** subsection: intent steering (wander radius, wander speed, max speed, follow distance), arrival radius, idle-drift amplitude + frequency.
- **Body** subsection: body height (hip height above feet midpoint).
- **External** subsection: pick-up offset, jump impulse, etc. (later slices).

The panel reads from and writes to `AnimationConfig`, persisted via `useStudioStore`. Live changes propagate to the running `Solver` without a chain rebuild.

## 5. Visual feedback requirement (per slice)

Every roadmap slice has a viewport visualization obligation. A slice ships when the user can *see* what changed — not just *tune* it. Each slice below lists the gizmos it adds.

## 6. Roadmap

Each slice is a self-contained increment: a small set of param additions, a viewport visualization, a panel surface. Build one, test in the browser, iterate until it feels right, move to the next.

### Slice 1 — Foot-anchored locomotion model

**Mechanism:**

1. **Intent state** — `{position, heading, velocity}` steers toward the attractor with a seek + arrival rule. Intent is the only consumer of attractor input.
2. **Feet plant in world space.** Each foot has a state machine: *planted* (plant point fixed) or *swinging* (parabolic arc to a new plant point). A foot transitions from planted to swinging when its drift from its desired position (computed from intent + per-foot rest offset) exceeds `stepThreshold`. The swing target leads the desired position by `intent.velocity × predictionGain`. On swing completion, replant.
3. **Hip joints derive from feet.** The two spine joints that own hip nodes (front pair and rear pair) are positioned each frame from their respective foot plant points: hip position = midpoint of the pair's feet, lifted by `bodyHeight`.
4. **Spine resolves in three sections.**
   - **Mid-spine** (between the front and rear hip joints): dual-anchor FABRIK — forward pass from the front hip, backward pass from the rear hip, iterate until distance and angle constraints converge.
   - **Head section** (front hip outward to joint 0): one-anchored FABRIK with the head joint biased toward the attractor within its own angle constraint. The head joint *gazes* — it rotates locally, not by translating.
   - **Tail section** (rear hip outward to the last joint): one-anchored Chain3D with no target — distance + angle constraints alone, naturally trailing.
5. **Leg IK.** With hip positions and plant points both available, the existing FABRIK leg solver (`fabrik3d.ts`) resolves the 3-joint leg between them.

**Config additions:**

- Intent steering: `arrivalRadius`, `maxIntentSpeed`, `intentDamping`, `idleDriftAmplitude`, `idleDriftFrequency`.
- Per-foot: `stepThreshold` (with optional directional offset curve — more tolerance behind than to the side), `swingDuration`, `liftHeight`, `predictionGain`, `groundY`.
- Body: `bodyHeight`.

**Solver capability added:**

- `Chain3D.resolveDualAnchor(startAnchor, endAnchor)` — two-end-pinned FABRIK iteration that respects `angleConstraint` between consecutive joints. The existing `Chain3D.resolve()` is preserved for the head and tail sections.

**Viewport visualizations:**

- Foot state badge ("planted" / "swinging") next to each foot gizmo.
- Step-trigger ring at radius `stepThreshold` around each planted foot's plant point.
- Swing arc preview: dashed parabola from `swingFrom` to `swingTo` during swing.
- Intent marker at `intent.position` with a heading arrow along `intent.heading`.
- Hip-derivation indicator: a faint line from each hip joint to its feet midpoint.

**Panel additions:**

- Extrinsic → Feet: sliders for `stepThreshold`, `swingDuration`, `liftHeight`, `predictionGain`, plus the existing foot angle offset and step smoothing.
- Extrinsic → Head / Target: existing wander/max-speed/follow-distance sliders bind to intent (labels unchanged). New sliders for `arrivalRadius`, `idleDriftAmplitude`, `idleDriftFrequency`.
- Extrinsic → Body: `bodyHeight`.

**Renderer:** `AnimatedModel.tsx` reads `joint.y` and `anchor.y` (instead of hardcoding `y = 0`) for spine and leg groups, and the leg group's rotation accounts for the vertical difference between anchor and `currentTarget` so the leg tracks the foot through swing arcs.

**Done when:**

- All four feet visibly plant and step. No continuous sliding.
- The body does not drift laterally when the attractor sweeps across the front of the head. The head rotates to gaze; the body waits for a step.
- The dragon can be driven backwards, sideways, and forwards by attractor placement.
- The system runs identically on at least two rigs with different spine joint counts, hip placements, and segment lengths — no per-rig code adjustment.
- At all times the user can see which foot is planted vs swinging, where intent is, where each foot wants to be, and the predicted arc of any swinging foot.

### Slice 2 — Per-node intrinsic tuning

**Mechanism:**

- `CreatureConfig` gains per-joint arrays for stiffness, damping, catch-up, angle constraint (with the global value as a default backfill where per-joint values aren't specified).
- `Solver` applies per-joint values when present.
- Spring-damper integration on each joint's rest deviation (new constraint kind).

**Config additions:**

- `nodeStiffness[]`, `nodeDamping[]`, `nodeCatchUp[]`, `nodeAngleConstraint[]`.

**Viewport visualizations:**

- Joint dots color-coded by stiffness (or a selectable parameter).
- Selected-node highlight on click.
- Per-joint rest-deviation arrow showing the spring-damper's current pull.

**Panel:**

- Intrinsic tab fully functional.
- Click a joint dot in viewport → panel jumps to that node.
- Region presets (apply to spine / tail / neck).

**Done when:** the user can sculpt a heavy-bodied creature, a whippy snake, and a stiff lizard from the same node skeleton purely by tuning per-node intrinsics.

### Slice 3 — Lift body root to full 3D

**Mechanism:**

- The body root (the midpoint between hip anchors, or the intent point — pick at implementation time) becomes a *driven* point in 3D. External forces (input handlers, physics events) write to it.
- Each joint's rest position gains a Y component so the body has an internal vertical shape relative to the root.
- The chain resolves the same way — distance + angle constraints + intrinsic dynamics — now in genuine 3D.

**Config additions:**

- `rootMass`, `rootGravity` (active during airborne state), per-joint `restYOffset`.
- A small state machine: `grounded` / `airborne` / `held`.

**Viewport visualizations:**

- Root marker (distinct from joint 0).
- Ground-plane reference grid.
- Gravity vector indicator when airborne.

**Panel:**

- Extrinsic → External subsection: drag-to-pick-up handle, drop button, jump impulse slider.

**Done when:** the user can pick the dragon up with the mouse, drop it, watch it fall and land with the body's intrinsic dynamics producing convincing follow-through.

### Slice 4 — New constraint kinds (extensibility proven)

**Mechanism:**

- A small `Constraint` interface in the solver: `apply(chain, dt, params)`.
- Migrate existing constraints (distance, angle, dual-anchor) into this shape.
- Add: **spring-damper** (formalized from Slice 2), **look-ahead**, **ground** (per-joint Y clamp), **secondary chain** (a child `Chain3D` anchored to a parent joint — for dewlaps, whiskers, dorsal fins).

**Config additions:**

- An array of constraint specs per region or per joint.
- Secondary chain configurations (count, segment lengths, anchor joint).

**Viewport visualizations:**

- Each constraint kind has a distinct gizmo (ground = a small ground-plane patch; secondary chain = its own joint dots in a subtler color; etc.).

**Panel:**

- New "Constraints" section under Intrinsic, listing applied constraints with mute/enable toggles per node or per region.

**Done when:** adding the next constraint kind (a "soft cap" or "muscle pull") is a single new file in `app/game/animations/constraints/` plus a panel entry, with no changes to the solver core.

### Slice 5 — Environmental reactivity

**Mechanism:**

- World signals derived from runtime state: nearby objects, recent impacts, idle time, distance to cursor.
- These feed into extrinsic params: a recoil multiplier on `catchUp`, a `look-at` overriding gaze when something gets close, a brace activating spring-dampers under impact.

**Config additions:**

- Signal definitions and bindings to existing extrinsic params.

**Viewport visualizations:**

- Active signal indicators (overlay icons near the dragon when a signal fires).

**Panel:**

- A signals subsection under Extrinsic (or its own tab if it grows).

**Done when:** the dragon visibly notices and responds to the cursor and to placed scene objects without scripted behavior trees.

### Future slices (out of scope until 1–5 ship)

- **Climbing** — surface contact + foot planting on non-horizontal ground (extension of ground constraint).
- **Burrowing** — root moves into the ground; body trails behind, segments occluded by terrain.
- **Flying** — root has 3D velocity; legs retract or assume an idle pose; secondary motion on wings (if present).
- **Behavior switching** — multiple behaviors registered with `Director`, transitions on world signals.
- **Multi-creature** — same system, multiple instances.

## 7. Development loop

For each slice:

1. **Define the config additions.** What new fields does `AnimationConfig` need? Where do defaults live? Add types.
2. **Implement the mechanism.** Update `Solver` (and possibly `Director`, `Chain3D`, `fabrik3d`) to consume the new fields.
3. **Add the viewport visualization.** New debug gizmos drawn over the translucent model. Toggleable.
4. **Add the panel surface.** Tab section + controls bound to the new config fields. Live updates without chain rebuild.
5. **Iterate in the browser.** Tune live until the slice's "done when" condition is met.
6. **Lock in.** Commit. Move to the next slice.

The contract between slices is the renderer (it never changes) and the hard rules in § 2. Anything inside that envelope is fair game.

## 8. File map

Structural files relevant to this work:

- `app/game/chain3d.ts` — `Chain3D.resolve()` (one-anchored) and `Chain3D.resolveDualAnchor()` (two-anchored). Rigid distance + per-joint angle constraints.
- `app/game/fabrik3d.ts` — 3-joint FABRIK leg solver.
- `app/game/animations/types.ts` — `DragonDrive`, `BehaviorContext`, `Behavior`.
- `app/game/animations/director.ts` — behavior registry + cross-fade.
- `app/game/animations/blend.ts` — per-field blend used by Director.
- `app/game/animations/solver.ts` — per-frame solver: intent → feet → hip joints → mid-spine → head section → tail section → legs.
- `app/game/animations/dragon/wandering.ts` — current single behavior; writes to `targetRef`.
- `app/game/animations/dragon/index.ts` — behavior registry factory.
- `app/game/animations/dragon/constants.ts` — intentionally minimal defaults.
- `app/game/useCreature.ts` — frame-loop driver, owns `Solver` + `Director`.
- `app/game/AnimatedModel.tsx` — renderer; locks each studio BodyGroup to its joint pair / anchor+target pair.
- `app/game/modelConfigToCreatureConfig.ts` — converts saved studio nodes into runtime parameters; derives `hipJointFrontIndex` and `hipJointBackIndex` along with segment lengths, hip offsets, leg reach.
- `app/studio/StepAnimate.tsx` — animation panel: overlay-toggle row + Intrinsic / Extrinsic tabs.
- `app/studio/AnimationDebugOverlay.tsx` — overlay gizmos drawn over the translucent dragon.
- `app/studio/StudioScene.tsx` — scene composition for studio steps including the animate step.
- `app/studio/page.stores.ts` — `useStudioStore` (zustand + persist); holds `animationConfig` and `overlayToggles`.
- `app/studio/page.types.ts` — `AnimationConfig`, `OverlayToggles`, `CreatureConfig`-adjacent shapes.

Supporting doc — read alongside this one:

- `documentation/skeleton_to_model_mapping.md` — the renderer ↔ skeleton contract. The "three-bucket" output the animator writes to and the renderer reads from.

## 9. Out of scope (intentionally)

- 3D pose editor / pose libraries.
- Motion-capture clip blending.
- Drag-and-drop timeline editing.
- Server-side persistence of animation configs beyond the existing `ModelConfigRow`.
- Mood-space / personality-dial 2D blend pads.
- Sound or particle reactivity coupled to motion.
- Multi-creature simultaneous animation.

These are not rejected — they're simply not in the path to a polished single-creature procedural animation. They can be reconsidered after Slice 5.

## 10. Adapting across rigs

Every per-rig dimension is derived from the studio's node placement in `modelConfigToCreatureConfig`. The runtime contains no hardcoded joint indices, no hardcoded segment counts, no per-rig switches.

- **Spine joint count** — derived from the chain of spine groups (head + spine[*] + tail).
- **Segment lengths** — derived from each group's `nodeFront` → `nodeBack` distance.
- **Hip joint indices** (`hipJointFrontIndex`, `hipJointBackIndex`) — the spine joints whose owning group carries `nodeHipLeft` / `nodeHipRight`. The first such spine group walking head-to-tail is the front; the next is the back.
- **Hip offsets, leg reach, leg segment lengths, parent rest angle** — derived per leg from the studio's nodeHip and nodeFoot placements.

The same code path runs on any rig matching the topology of head + spine[*] + tail with two leg pairs attached to specific spine groups.

## 11. References

The constraint-based procedural paradigm and the foot-anchored locomotion model draw on a small set of public reference projects. Read these to ground understanding of the system.

### Primary references

- **`argonautcode/animal-proc-anim`** — https://github.com/argonautcode/animal-proc-anim
  Processing sketches of a fish, snake, and lizard rigged on a 2D chain with distance + angle constraints. Foundational for "the rig is the animation."

- **Trifox — "Exploring procedural animation in Trifox"** — https://www.trifox-game.com/exploring-procedural-animation-in-trifox/
  Dev article on a shipped 3D lizard game's procedural animation system. Introduces the **Intent → Action → Reaction → Follow Through** pipeline. The body's visible pose (vertical bob, rotational sway) is derived from the feet via averaging. Feet step when their drift from a reference position exceeds a directional threshold; new step positions are predicted ahead by the movement direction. This is the model the dragon's locomotion implements.

- **zalo — "Constraints"** — https://zalo.github.io/blog/constraints/
  The underlying math: "the essence of constraint is projection. Find the minimum movement that satisfies the constraint." Distance, collision, and volume-preservation constraints explained as projections onto admissible-set manifolds. Background for why iterative passes (FABRIK, dual-anchor solves) converge.

### Supporting references

- **Quadruped Animation (Skrba et al., Eurographics 2008 STAR)** — http://www-evasion.inrialpes.fr/Publications/2008/SRHCO08/skrba_et_al-eg2008-star.pdf
  Survey of quadruped animation approaches, including the body/legs subsystem split and the role of IK + foot contact constraints.

- **80.lv — "Animating Beasts Using The Procedural Way in Unity"** — https://80.lv/articles/animating-beasts-using-the-procedural-way-in-unity
  Interview-format article covering the "Manipulation Points" authoring approach.

- **Roblox IKPF (Inverse Kinematics Procedural Footplanting)** — https://devforum.roblox.com/t/r6-ikpf-inverse-kinematics-procedural-footplanting/1472311
  Community implementation of foot-planting IK for a humanoid. Useful as a minimal working implementation reference.

### How the references map to the slices

- **Slice 1** (foot-anchored locomotion): primarily Trifox's Intent / Action / Reaction split.
- **Slice 2** (per-node intrinsic tuning): the constraint-projection mindset from zalo. Spring-damper formalization is standard physics.
- **Slice 3** (lift body root to 3D): no specific reference; standard rigid-body-on-chain.
- **Slice 4** (new constraint kinds): the extensibility shape — a uniform `Constraint.apply(chain, dt, params)` interface — is the pattern zalo's blog implies.
- **Slice 5** (environmental reactivity): emerges from signal definitions feeding extrinsic params.
