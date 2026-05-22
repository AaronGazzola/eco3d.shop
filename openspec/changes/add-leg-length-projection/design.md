## Context

The locomotion solver in `app/game/locomotion/` is a constraint-projection system modeled on argonaut-code's chain animation + PBD + FABRIK (see `documentation/animation_references.md`). The design's five invariants in `documentation/animation_design.md` § 1 include "Bone lengths are constant" — this applies to the legs as much as to the spine and tail. § 2 lists the constraint set: bone lengths fixed, hips welded to spine, angle caps, feet planted (= pinned in world).

Today's implementation ships these as a mix of hard and soft constraints. The spine cascade in `cascade.ts` enforces angle caps as a hard greedy fill. Foot planting is hard (planted feet store their world position and don't move). But the leg-length constraint between a hip socket and its planted foot is **not enforced** — `applyLegBone` in `useLocomotion.ts` rotates the leg mesh to *point at* the foot without checking or correcting the distance between them. The spine therefore bends through its full cap budget on every cascade flip, the body never has a structural reason to translate, and walking does not emerge.

Step 4 of the design's roadmap ("Allow hip joint rotation, blocked by planted feet") was supposed to introduce this constraint as hard. It shipped as "read strain, don't block." Step 5 added stepping (which relaxes the constraint for a swinging foot) but the underlying constraint was never present, so stepping just chases the bending spine. The "torso anchor from foot centroid" approach proposed and rejected during diagnosis would have imposed body translation from outside the constraint set, violating § 5 ("not a stride controller or scripted gait").

## Goals / Non-Goals

**Goals:**

- Treat each rigid leg as a hard distance constraint `|hipSocketWorld − plantedFootWorld| = legLength` whenever the foot is in the planted phase.
- When the cascade's candidate spine pose violates a leg constraint, project: clamp cascade yaws (within each joint's saved `angleCaps`) until the constraint is satisfied.
- Preserve the design's emergence property — body translation arises from leg-constraint pushback plus foot stepping, never from an external position formula.
- Keep saved `angleCaps` authoritative. The projection only ever clamps yaws *below* the saved cap; it never raises them, never overrides them, never substitutes hardcoded limits.
- Leave the strain-and-step logic in `foot.ts` and the leg rendering in `applyLegBone` unchanged in shape — `applyLegBone` continues to point the leg at the foot; the difference is that the spine pose it renders against now respects leg length.

**Non-Goals:**

- Translating the body via an external formula (foot centroid, mean position, etc.). Rejected upstream in the conversation that produced this change.
- Multi-bone IK or knee nodes. Legs remain single rigid bones per § 1.1 and § 1.4 of the design and per saved memory `feedback-animation-rigid-bones`.
- Rewriting the cascade. The greedy fill in `computeCascadeRotations` remains the starting candidate; the projection only adjusts it.
- Changing the stepping decision (when a foot lifts). Stepping logic and `STRAIN_THRESHOLD` are unchanged. The leg constraint affects the *spine pose*, not the *step trigger*.
- Adding a body translation degree of freedom in this change. If the projection determines that no spine pose within the angle caps satisfies the leg constraints, strain will rise and a foot will lift through the existing pathway. Body translation emerges over multiple stepping cycles, not by introducing a new state.

## Decisions

**Decision 1: Project after the cascade, before the slerp.**

The frame loop today is:

1. Compute desired head yaw from attractor
2. `computeCascadeRotations(caps, desiredHeadYaw)` → greedy yaws per chain member
3. `runHipStep` for each hip (reads strain, may trigger step)
4. Slerp each chain pivot's quaternion toward its target
5. `applyLegBone` for each leg

The projection is inserted between steps 2 and 4. It reads the candidate `cascadeOut`, evaluates the leg-length constraint for each planted foot, and *reduces* the cascade yaws until satisfied. The slerp in step 4 then targets the projected yaws rather than the raw greedy yaws.

Alternative considered: project *during* the slerp by running the projection every frame and letting the slerp ease toward whichever yaws are currently admissible. Rejected because the projection result is what the slerp should target — running them interleaved makes the convergence non-deterministic and harder to reason about.

**Decision 2: PBD-style iterative projection, capped iterations.**

Each iteration:

1. Compute candidate hip socket world position from current cascade yaws (forward pass through the chain, applying yaws to each segment).
2. For each planted foot: measure `d = |hipSocket − plantedFoot|`. If `|d − legLength|` exceeds tolerance, this is a violated constraint.
3. For the violating constraint, walk *backward* from the hip up the cascade chain, reducing each spine joint's yaw by a fraction (proportional to its contribution to the displacement) until the violation is corrected. Each reduction is clamped so the joint's yaw stays within `[-angleCap, +angleCap]`.
4. Repeat steps 1–3 until all constraints are within tolerance or iteration budget (e.g., 4 passes) is exhausted.

Alternative considered: closed-form solve. Rejected because the chain has multiple feet and angle caps; the admissible set is not generally a single point. Iteration is the standard PBD approach for this shape of problem.

**Decision 3: Tolerance and iteration budget.**

- Distance tolerance: `0.05` model units (small relative to a typical leg length of ~3 units).
- Iteration budget: `4` per frame. Beyond this, the residual violation is implicitly converted to strain via the existing `computeStrain` call, which triggers stepping through the existing pathway.

These numbers are configurable constants in the projection module and tuneable in Step 9 of the roadmap.

**Decision 4: Operate on cascade yaws, not on pivot quaternions.**

The projection adjusts the *cascade output* array of yaws — the same array `cascadeOut` that `computeCascadeRotations` produces. It does *not* read or write the three.js pivot quaternions. This keeps the projection isolated from rendering and slerp state, and makes the unit test surface a pure function: `project(caps, candidateYaws, hipSockets, plantedFeet, legLengths) → projectedYaws`.

**Decision 5: Compute hip socket positions via a single forward pass through the chain.**

The chain is `[head, spine, …, spine-N]` with each segment's `nodeBack` and (for hip-bearing segments) `nodeHipLeft`/`nodeHipRight`. A forward pass takes the candidate yaws and the segment node positions and produces the world position of each hip socket. The pass is the same logic that `applyLegBone` reads from three.js's `matrixWorld` chain at render time — replicated in pure code so the projection can evaluate candidate poses without mutating the scene graph.

Alternative considered: mutate the scene graph, read `matrixWorld`, then revert. Rejected because mutation-and-revert risks order-of-operation bugs and is much slower than a few dozen vec3 multiplies. The pure forward pass also makes the projection testable in isolation.

**Decision 6: Saved `BodyGroup.angleCaps` are the only source of joint limits.**

The projection clamps yaws to `[-effectiveAngleCaps(g).yaw, +effectiveAngleCaps(g).yaw]` (using the existing `effectiveAngleCaps` helper from `chain.ts` which reads `BodyGroup.angleCaps` with fallback to `DEFAULT_ANGLE_CAPS`). No hardcoded numbers, no overrides, no new tuning surface. If the user tunes a joint's cap in the studio, the projection respects the tuned value.

**Decision 7: Leg length is computed from the saved rig nodes at init.**

`legLength = |nodeHipLeft − nodeFoot|` (or `nodeHipRight − nodeFoot`) in model space, computed once per hip-leg pair when the runtime initializes. This is consistent with the design's "bone lengths are constant" invariant — leg length is structural data from the studio rig.

## Risks / Trade-offs

- **Risk: the projection's iterative reduction may oscillate or converge slowly when multiple feet constrain the same hip.** → Mitigation: cap iterations at 4, fall back to strain-based stepping for residual violation. The existing strain threshold (`0.2`) is well above the projection tolerance (`0.05`) so the system naturally escalates to stepping when projection plateaus.

- **Risk: clamping spine yaws may leave the head's direction goal unmet, producing a visible "stuck" pose until a foot steps.** → This is the intended behavior per design § 2 cost ordering: bending spine joints is expensive, and when expense exceeds the strain threshold the foot lifts. A momentary "stuck" pose followed by a step is the expected visual; this is how walking emerges.

- **Risk: front and rear hip constraints may fight each other (rotating the spine to satisfy one moves the other).** → The iterative projection handles this naturally — each pass reduces the most-violated constraint, eventually settling. If no admissible pose exists within all caps, the most-strained foot lifts.

- **Risk: regression of Step 5 single-hip behavior.** → The projection reduces to a no-op for a single planted hip whose foot was just stepped to its rest position (constraint already satisfied at candidate). Step 5 should behave identically. Verify in browser with a single-hip rig.

- **Trade-off: the projection adds a small per-frame cost (a forward pass + up to 4 iterations × a few vec ops).** → Negligible at the chain lengths used here (~7 segments, 4 feet). Worth measuring after browser verification but not a concern for shipping.

- **Trade-off: introducing a new module (or growing `cascade.ts`) for the projection logic.** → Acceptable. The alternative (inline in `useLocomotion`) would tangle the projection with rendering state. Keeping it as a pure function over arrays preserves testability.
