# Animation Design — Emergent Locomotion via Constraint Solving

Canonical design doc for the creature animation system. Audience: Aaron and future AI agents working on this codebase. See `animation_references.md` for supporting literature.

---

## Current status (2026-05-22)

- **Step 4 + Step 6 — leg-length constraint projection**: code landed under OpenSpec change `add-leg-length-projection`. Each rigid leg is now a hard distance constraint `|hipSocketWorld − plantedFootWorld| = legLength` between its hip socket (welded to the spine) and its planted foot's world position. The cascade in `cascade.ts` now exposes `projectLegConstraints`, a pure-function PBD-style iterative projection (CCD-style per-foot adjustment with analytical Jacobian, bounded to 4 iterations at tolerance 0.05). `useLocomotion` runs the projection after `computeCascadeRotations` and before the pivot slerp; the slerp targets the projected yaws. `runHipStep` continues to receive the *original* (un-projected) `cascadeOut[hipIdx]` as `wantedYaw` so strain reflects the unmet demand between desired and projected pose — that is the signal that triggers a foot to step. `applyLegBone`, `foot.ts`, and the stepping/strain logic are unchanged.
- **Why this closes a gap**: Step 4 of the roadmap was supposed to ship the constraint as *hard* ("hip rotation is *blocked*"). The earlier implementation shipped it as "read strain, don't block." Without leg-length pushback the cascade bent the spine through its full angle-cap budget on every cascade flip, the body had no structural reason to translate, and walking could not emerge — the dragon bent in place while feet shuffled to chase the bending spine. With the projection in place, spine bending displaces hip sockets *only* as far as the planted feet permit; when the head-direction goal demands more rotation than the constraint allows, residual strain rises and a foot lifts, relaxing one leg's constraint, allowing the spine to bend further into the freed direction, the foot replants at a new world position, and the cumulative effect across step cycles is body translation. Walking emerges from constraints + stepping, not from any external position formula.
- **Prediction**: Steps 5–7 should now produce walking on their own without further code changes. Step 7 of the roadmap is explicit that "walking emerges — no new code." This change is the missing rule that makes that prediction hold.
- **Done**: Steps 1–6 mechanical and (with this change) the Step 4 hard-constraint rule that was missing. Pending: browser verification that walking emerges per Step 7.
- **What Step 5 does in code**: front hip joins the cascade chain (gets a pivot). Each front foot tracks a *world* planted position + swing phase (world-anchored since the prior `invert-locomotion-foot-anchored` change). When `computeStrain` exceeds `STRAIN_THRESHOLD`, the inside-of-turn foot (sign of `wantedYaw − plantedYaw`) lifts, arcs to its rest offset rotated by the wanted hip yaw, and replants. Each front leg group's transform is derived entirely from two skeleton nodes — its hip end (read from `spine-2.nodeHipLeft/Right` and transported through the front-hip pivot's `matrixWorld`) and its foot end (in world). The leg rotates rigidly around the hip to point at the foot; bone length preserved (rule §1.1), hip end welded to the hip socket (rule §1.2). With the leg-length projection in place, the spine pose the leg renders against now also respects leg length — the leg no longer "stretches" because the hip socket is held within `legLength` of the foot.
- **What Step 6 adds in code**: `buildCascadeChain` extends to the second hip-bearing spine. `findRearHip` mirrors `findFrontHip`. `useLocomotion` restructured around `HipRuntime { state, feet, initId }` per hip, with `runHipStep` as the shared per-hip step decision loop and `applyHipLegs` as the shared rendering call. Front and rear hips run independently; within a hip only one foot swings at a time, but front and rear may swing simultaneously. With the leg-length projection, both hips' planted feet enter the projection together — projecting against four feet (when all four planted) tightly anchors the body's pose in world.
- **Authoritative angle caps**: the projection clamps yaws to `[-effectiveAngleCaps(g).yaw, +effectiveAngleCaps(g).yaw]` for each cascade member `g`. This reads the saved `BodyGroup.angleCaps` (or `defaultAngleCapsFor` fallback) — same source used elsewhere in the cascade. The projection only ever *reduces* yaws below the saved cap; it never raises them, never overrides them, never substitutes hardcoded limits. Studio-tuned caps remain authoritative.
- **Precondition note**: the leg-length projection relies on `FootState.plantedX`/`plantedZ` being true world coordinates. The prior `invert-locomotion-foot-anchored` change moved foot state to world frame; the projection inherits that. If foot state ever regresses to hip-local, the projection's distance measurements break.
- **Bugs fixed during Step 5 verification**:
  - `footTargetAt` was using the standard 2D CCW rotation matrix `[c,-s;s,c]` instead of three.js's Y-axis rotation `[c,s;-s,c]`, so the foot target rotated opposite to the body. Diagnosed by recording per-frame snapshots in the studio sidebar (see "Diagnostics tooling" below) and comparing the spine pivot's `appliedEulerY` against the foot target direction.
  - Front leg meshes were initially translated rigidly to follow the marker, which broke the hip-socket weld. Replaced with a rotation-around-hip transform driven only by the two skeleton nodes — restoring rule §1.5 (nodes are the only authoring surface).
- **Bugs fixed during Step 6 verification**:
  - `applyLegBone` originally used only `hipPivot.quaternion` (local rotation) when computing the hip socket and the leg's render transform. When the front hip's tree-parents (spine-3..6) joined the cascade in Step 6, those parents started rotating — translating the front hip in world while its local quaternion barely changed. Result: legs rendered at their model-space rest pose while the body bent away around them. Fixed by reading `hipPivot.matrixWorld` for the socket position, `hipPivot.getWorldQuaternion()` for the leg's world rotation, and `hipPivot.parent.matrixWorld` for the foot's rest-frame transform. The leg's angle-cap clamp still happens in the pivot's local frame, so per-leg caps mean the same thing as before (commit `c82f6eb`).
- **Diagnostics tooling**: Animate sidebar (`app/admin/animate/AnimateSidebar.tsx`) exposes Clear attractor, Copy snapshot (current frame state), Start/Stop recording, Copy recording, Clear recording buffer. Recording samples at ~10 Hz from `app/game/locomotion/diagnostics.ts`; payload captures rig config plus per-frame attractor, desired head yaw, chain ids, caps, cascade output, **both hips' state nested as `frontHip` / `rearHip` with their own `HipSnapshot` containing wantedYaw / appliedYaw / planted+targetYaw / left+right `FootSnapshot`**, and each chain pivot's requested yaw + applied quaternion + euler.y + world position. The Step 5 single-hip snapshot shape was broken in Step 6 (no persisted recordings to migrate). This is the channel for diagnosing future visual issues — copy a recording, paste it back into the conversation.
- **Pick up here**: browser verification of Steps 5–7 with the leg-length projection active. Test in the studio Animate panel: (1) small turns — head tracks, body still; (2) large turns — head reaches its cap, spine bends less than before, a front foot lifts, body shifts on replant, repeat; (3) attractor behind — full-body cascade engages over multiple step cycles, dragon walks toward attractor; (4) circular path — observe diagonal-couplet alternation. Use the sidebar Copy snapshot to compare the original `wantedYaw` and the projected `appliedYaw` per hip — when they differ, the projection is actively clamping. If walking does not emerge, tune the projection's iteration count (down) or tolerance (up), or revisit per-joint caps. After verification, proceed to Step 8 (unfreeze tail).
- **Key files**: `app/game/locomotion/{foot,chain,cascade,legs,headGaze,diagnostics,useLocomotion}.ts`, `app/game/AnimatedModel.tsx`, `app/admin/animate/AnimateSidebar.tsx`.

---

## 1. The five invariants

These hold at every step, in every pose. They are structural rules, not preferences. An animation that violates one is broken.

1. **Bone lengths are constant.** Each body group is a rigid bone — the distance between its `nodeFront` and `nodeBack` never changes.
2. **Hips are welded to the spine.** `nodeHipLeft` and `nodeHipRight` are fixed in their owning spine group's local frame. They rotate with the spine; legs attach there.
3. **Adjacent bones bend only within an angle cap.** Two groups sharing a node may rotate relative to each other only within a per-joint limit, so adjacent segments do not visibly tear at the shared node.
4. **One BodyGroup = one rigid bone.** Animation granularity is the studio grouping. To bend mid-piece, split into two groups sharing a node — never subdivide at runtime.
5. **Nodes are the only authoring surface.** Animation drives the model by moving studio-placed nodes (subject to rules 1–4). It does not bypass the node skeleton or invent attach points not present in the studio data.

---

## 2. The architecture: one solver, one set of constraints

There is no wave generator, no stride controller, no CPG, no scripted gait. There is **one constraint solver** that runs every frame. It tries to satisfy a small fixed set of rules. The visible locomotion — head tracking, body bending, legs stepping in diagonal sequence — is what emerges when the solver iterates toward a solution.

This is the **argonaut chain** approach (rigid-bone segments with angle limits) extended with a directional goal and foot-stepping. The body shape is whatever the constraints currently force it to be, not anything explicitly generated.

### The constraint set

Each frame, the solver tries to satisfy all of these simultaneously:

- **Goal: head gaze.** The head node's local heading points at the attractor, within the head's angle cap (rule §1.3).
- **Bone lengths fixed** (rule §1.1).
- **Joint angle caps** (rule §1.3) — each spine joint can rotate only within its limit relative to its neighbor.
- **Hips welded to spine** (rule §1.2) — each hip node lives in a fixed offset within its owning spine group's local frame.
- **Feet near rest offset.** Each planted foot has a preferred position expressed in its hip's local frame (the studio-saved `nodeFoot` offset from `nodeHip`). The constraint is satisfied while the foot is within a small radius of that preferred position.
- **Planted feet do not move.** A foot in the *planted* state is pinned to its current world position. It cannot be dragged; it must be lifted to relocate.

### How motion happens

The attractor moves (user clicks elsewhere). The "head gaze" goal becomes unsatisfied. The solver searches for the cheapest way to satisfy it again. The cost ordering, by construction, is:

1. **Rotate the head within its cap.** Free — no other constraints affected. The body stays still.
2. **Rotate the neck joint behind the head within its cap.** Cheap — affects only the head's reach.
3. **Rotate further spine joints.** More expensive as the cascade moves down the body, because each rotation displaces hip nodes and strains planted feet.
4. **Step a foot.** Most expensive — the foot leaves planted state, swings to a new world position, replants. Only triggered when the foot's strain (distance from its rest offset in hip-local frame) exceeds a threshold.

Each frame the solver climbs this ladder only as far as it has to. If the head's cap is enough, nothing else moves. If it isn't, the cascade propagates through the spine; if a planted foot resists too hard, that foot steps; if multiple feet strain past the threshold, multiple steps queue. **There is no separate logic deciding "now we take a step" — it is just the solver finding that stepping is now the cheapest way to satisfy the goal.**

### What you see

- **At rest:** the creature is frozen. The attractor is wherever the head is already pointing, or close enough that the head's cap covers it.
- **Small attractor change:** only the head rotates. The body is still.
- **Attractor moves past the head's cap:** the neck rotates to let the head keep tracking, then further spine joints, then the cascade reaches a hip.
- **Hip rotation tries to drag a foot through the ground:** the foot lifts, steps to its hip-local rest offset projected onto the ground at the new hip orientation, and replants.
- **Stepping unlocks the hip:** the hip rotates fully, the cascade continues, the head reaches the attractor.
- **The body is now S-curved.** Not because a wave was generated — because the spine joints rotated through their caps to support the head reaching, and the foot stepping reoriented the hips. The S-curve is the *fingerprint* of the cascade.
- **The opposite-diagonal foot is now strained** (its hip rotated along with everything else). On the next attractor update, that foot is the cheapest one to step. Diagonal-couplet coordination emerges from geometry, not from any explicit phase rule.

---

## 3. Biological correspondence

This is not biomimicry of the neural circuit. It is biomimicry of the **observable behavior** of a real lizard, achieved kinematically. Real lizards have spinal CPGs that generate rhythmic patterns; we are not modeling that circuitry. What we model is what the lizard *looks like doing*:

- Standing still while watching.
- Head turning to track movement.
- Body straining when the head reaches its limit.
- A single foot stepping when the body strain exceeds its tolerance.
- The opposite diagonal foot stepping next, because that's where the strain has shifted.
- The whole sequence emerging from geometric pressure, not from a clock.

A real lizard's CPG, when you look at it through the lens of mechanics rather than neurons, is essentially solving the same constraint problem with feedback loops. We are solving it directly, in code, with a deterministic iterative solver.

---

## 4. Development roadmap

Each step is a small, testable change that produces a visible behavior in the studio's Animate step. Tests are concrete — what the user clicks, what they should see, what fails if a rule is broken.

### Step 1 — Read attractor, render frozen rest pose

The viewport already shows the static creature. Add an attractor: clicking on the floor sets a world-space target point, drawn as a small marker.

**Test.** Click around the floor. The marker moves where you click. The creature does not move (yet). The attractor's saved position survives across frames.

**Passes if.** The marker tracks the click reliably. The creature still renders correctly.

### Step 2 — Head gaze, no body motion

Implement the first rule of the solver: the head node rotates around its `nodeBack` (its joint with the next spine group) to point its local "forward" axis at the attractor, capped at its `angleCap`. The rest of the body is frozen.

**Test.**
- Click directly in front of the head. The head rotates to face it.
- Click far to one side. The head rotates as far as it can but stops at the cap. The head visibly stops short of the attractor when the angle exceeds the cap.
- Click directly behind the head. The head reaches its cap and stays there. The body does not move.

**Passes if.** The head smoothly tracks the attractor when within its cap, and clamps cleanly when past it. Rule §1.3 (angle cap) is respected. No other body motion happens. Bone lengths visibly unchanged.

### Step 3 — Cascade rotation through the spine, feet still pinned

Unfreeze every spine joint except the front and rear hip joints. When the head reaches its cap, propagate the unmet rotation demand backward: the next joint rotates within *its* cap to let the head reach further, then the next, etc. The hip joints and tail remain frozen. All four feet remain in their initial planted positions (the solver will fight this in a moment).

**Test.**
- Click far to the side. The head reaches its cap and the neck/spine joints begin to bend, S-curving the front of the body to let the head get further around.
- Click directly behind the creature. The body bends progressively as the cascade reaches further back, but does *not* propagate into the hip joints. The spine looks strained but the hips and tail are still.
- Click again at the original head-facing direction. The body relaxes back toward the rest pose as the cascade unwinds.

**Passes if.** Bone lengths stay fixed (§1.1). Each spine joint respects its angle cap (§1.3). The body bend is a clean, propagating cascade — no joint exceeds its limit, no segment stretches. The hips remain at their rest positions because they are frozen.

### Step 4 — Allow hip joint rotation, blocked by planted feet

Unfreeze the front hip joint. It receives the cascade like any other joint, but the hip is welded to the spine and the legs are anchored at the planted feet. When the hip tries to rotate, it must drag the planted feet through the ground — which the "planted feet do not move" constraint forbids. The hip rotation is *blocked*.

This step adds no visible motion compared to Step 3. What it adds is the *strain reading*: each planted foot now has a measurable distance from its preferred position in the hip's local frame (its `restFootOffset`). When the hip wants to rotate, that distance increases.

**Test.** Expose a debug overlay showing each foot's strain (its current displacement from its hip-local rest offset). Click around the floor. Watch the strain numbers grow as the cascade pushes the front hip joint to rotate further.

**Passes if.** Strain values rise smoothly as the attractor moves past the head's reach. The visible pose is identical to Step 3 (because the hip can't actually rotate yet, only push against the feet).

### Step 5 — Front legs can step

When a planted foot's strain exceeds a threshold, transition it from *planted* to *stepping*. During stepping, the foot interpolates over a short duration from its current world position to a new world position — the position its hip-local rest offset would project to on the ground given the hip's *current* desired rotation. On step completion, the foot replants. Only one front foot can step at a time.

**Test.**
- Click far to the side. The head and spine cascade as in Step 3. The front hip strains. The front foot on the inside of the turn lifts, swings, and replants further forward. The hip can now complete its rotation; the head reaches the attractor.
- Click back to neutral. The opposite front foot may step to relieve the new strain.

**Passes if.** Steps happen only when strain exceeds the threshold, not on every click. The stepping foot lifts, arcs to its new position, replants — no teleporting. The body's S-curve becomes visibly persistent after a step (the spine doesn't snap back, because the hip has new permanent rotation).

### Step 6 — Rear hip and back legs

Repeat Steps 4–5 for the rear hip and back legs. Now both hip joints can receive cascading rotation, and both back feet step when strained. The tail joints remain frozen for now.

**Test.**
- Click directly behind the creature. The full body cascade propagates from head to tail. The front feet step, then the back feet step. The creature should rotate substantially toward the attractor.
- Click several times in succession around a circle. The creature should turn in place, stepping with whichever foot is currently strained.

**Passes if.** Diagonally opposite feet tend to step in alternation (because rotating one hip strains the diagonally opposite foot on the other hip via the spine S-curve). If they don't, the spine joint caps or the strain threshold need tuning — geometry should produce this naturally.

### Step 7 — Walking emerges

When the attractor is far enough that head reach + body cascade can never satisfy it, the creature keeps stepping. Each step rotates the hips a little more toward the attractor; the next attractor reading is still unsatisfied; the next step happens.

No new code — just verifying the cascade chain runs to completion repeatedly.

**Test.**
- Click somewhere across the floor. The creature should take a sequence of steps toward it, alternating feet, until the attractor is within its head's gaze cap.
- Click on a moving target (mouse drag). The creature should follow.

**Passes if.** Strides chain smoothly. No frame-rate dependence — the same behavior at 30 fps and 144 fps. No stuck states (a foot strained past threshold that never steps).

### Step 8 — Unfreeze tail, verify passive trailing

Unfreeze the tail joints. They receive cascade like the spine but have no feet — so they only respond to rotation propagating from the rear hip.

**Test.** Walk the creature around. The tail should curve behind in a passive, lagging way, never overshoot, never visibly stretch.

**Passes if.** Tail bends visibly behind the body during turns, settles to straight when at rest.

### Step 9 — Tuning pass

Now that the full pipeline runs, expose parameters in the studio panel:
- Foot strain threshold (when does a foot decide it must step).
- Step duration and lift height.
- Per-joint angle caps (overrides of the default).
- Smoothing on the cascade (how quickly the spine relaxes back to rest).

**Test.** Iterate live in the browser. The creature should be tunable from "twitchy and reactive" to "languid and dragging" without code changes.

**Passes if.** Each parameter has a visible, predictable effect on the gait.

---

## 5. What this design is *not*

- It is **not** a central pattern generator, oscillator, or wave generator. There is no clock driving the body.
- It is **not** a stride controller or scripted gait state machine. There are no "this is a step now" branches.
- It is **not** a foot-planted model with the body floating above. The body and feet are both part of one solver; their interaction produces the gait.
- It is **not** a head-dragged chain (pure argonaut). The head's *direction* is the goal, not its position. The body propels itself toward the attractor by stepping, not by the head pulling it.
- It is **not** specialized per-creature. The same solver handles any rig that respects the §1 invariants — snake (no legs), lizard (four legs), or anything in between (centipede, etc., once leg topology generalizes).

---

## 6. File map

- `app/studio/page.types.ts` — `BodyGroup`, `NodeType`, `ModelConfigRow`
- `app/studio/page.stores.ts` — `useStudioStore`
- `app/studio/NodeOverlay.tsx` — node placement / editing UI (step 2)
- `app/studio/StudioScene.tsx` — three-step scene composition
- `app/studio/StepAnimate.tsx` — step 3 panel (will grow with each milestone)
- `app/game/AnimatedModel.tsx` — `StaticPosedModel`, the renderer

To be added per step:
- `app/game/locomotion/attractor.ts` — Step 1: world-space attractor state
- `app/game/locomotion/headGaze.ts` — Step 2: head rotation toward attractor within cap
- `app/game/locomotion/cascade.ts` — Steps 3, 6, 8: spine and tail joint cascade
- `app/game/locomotion/foot.ts` — Steps 4–6: per-foot plant/step state, strain calculation
- `app/game/locomotion/solver.ts` — the per-frame orchestrator that runs all of the above
- `app/game/locomotion/useLocomotion.ts` — the React hook the renderer attaches to

Each module is small, has a single responsibility, and reads only from data structures defined by modules below it in the dependency chain.
