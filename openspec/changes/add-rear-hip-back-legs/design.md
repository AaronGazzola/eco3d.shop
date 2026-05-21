## Context

The dragon animation system is being built incrementally per the roadmap in `documentation/animation_design.md` § 4. Steps 1–5 are complete and visually verified: a clicked attractor is captured, the head gazes at it within its angle cap, the cascade propagates through pre-hip spine joints, the front hip strains against planted feet, and a strained front foot lifts and replants while the front hip's yaw eases from `plantedYaw` to `targetYaw`.

The runtime is built on five invariants (`documentation/animation_design.md` § 1) that hold every frame, every pose:

1. Bone lengths are constant.
2. Hips are welded to the spine.
3. Adjacent bones bend only within an angle cap.
4. One BodyGroup = one rigid bone.
5. Nodes are the only authoring surface.

These constrain leg topology specifically. A leg is one rigid segment from hip to foot. No knee node, no thigh+shank split, no multi-bone analytic IK. The leg's foot end traces an arc on a sphere around its hip socket — if the foot marker is closer or farther than the bone length, the bone aims at the marker but does not touch it. That is correct behavior under §1.1 and §1.4; the swing trajectory must be designed so the marker stays on the sphere of reachable foot positions.

Step 6's purpose is to add the rear hip + back legs to the same constraint solver and observe whether the diagonal-couplet alternation predicted by the design (§ 2 "How motion happens", § 4 Step 6 "passes if") falls out of the geometry. If it does not, that is a tuning signal (spine joint caps, strain threshold), not a logic bug.

## Goals / Non-Goals

**Goals:**

- The cascade chain reaches the rear hip. The rear hip receives cascading yaw demand exactly like the front hip does today.
- Each back foot tracks a planted world position, lifts when its strain exceeds threshold, arcs to the rest offset rotated by the rear hip's wanted yaw, replants.
- Each back leg's transform is derived entirely from two skeleton nodes (rear hip's hip-left/right node transported through the rear-hip pivot's quaternion, and the foot marker), with segment length preserved.
- A single front foot and a single back foot may swing simultaneously (independent supports); within each hip, only one foot swings at a time.
- The studio sidebar displays both hip states and all four feet in the snapshot/recording display.
- Diagonal-couplet alternation can be empirically tested by clicking the attractor in a circle around the dragon.

**Non-Goals:**

- Tail joints stay frozen. Tail unfreezing is Step 8.
- No new per-joint or per-foot tuning sliders. Tuning surface is Step 9.
- No multi-bone leg IK. Single-rigid-bone legs are invariant §1.1 + §1.4 — adding joints would break the design.
- No changes to studio steps 1 and 2 (segment grouping, node placement). Studio data shape is unchanged.
- No changes to head behavior. `headGaze.ts` is untouched.
- No new external dependencies, no database changes.
- No backward compatibility for the in-memory `FrameSnapshot` shape. Diagnostics is internal tooling for live debugging; recordings are not persisted.

## Decisions

### Decision 1: Extend the cascade chain to include the rear hip — do not run a second cascade

`buildCascadeChain` currently stops at the first hip-bearing spine group. It will be extended to stop at the *second* hip-bearing spine group instead. Both hips become regular members of the same cascade, each with its own `cascadeOut[i]` slot.

**Alternative considered:** Run two separate cascades — one head → front hip, one front hip → rear hip — and compose their outputs. Rejected because (a) `computeCascadeRotations` already greedily distributes remaining yaw demand down a chain of arbitrary length, so one longer chain achieves the same result with less code; (b) treating the front and rear hips as peers in a single cascade better matches the design's "one constraint solver, no special cases" framing (§ 2); (c) composing two cascades introduces an ordering question (which hip's strain is read first?) that the single-cascade approach sidesteps — each hip's strain is read against its own slot of the same cascade output.

### Decision 2: Per-hip strain decisions, independent swing interlock between hips

Front and back hips each maintain their own `HipState` (`plantedYaw`, `targetYaw`) and their own pair of `FootState`s. Each hip independently:

1. Reads `wantedYaw = cascadeOut[itsIndex]`.
2. If neither of its feet is swinging, computes strain on both, picks the cheapest one to step if either is strained, transitions it to swinging.
3. If one of its feet is swinging, eases its `appliedHipYaw` from `plantedYaw` toward `targetYaw` by `easeInOut(swingT)`.

Front-foot swing does not gate back-foot swing or vice versa. This is the source of diagonal-couplet alternation: when the front hip rotates and its inside foot steps, the spine's S-curve rotates the rear hip in the opposite direction; the rear hip's diagonally opposite foot is now the most strained and steps next.

**Alternative considered:** A global "only one foot swings at a time" rule across all four. Rejected because (a) it would prevent the natural diagonal pair (front-left + back-right) from swinging together, which is the lizard trot the design predicts; (b) it would force one hip to wait on the other's swing to complete, breaking the "each hip is just another joint trying to satisfy its constraints" framing; (c) two simultaneous swings on opposite hips do not visually destabilize the body because two feet remain planted (one per hip).

### Decision 3: `feetRef` restructured to a per-hip map, not parallel front/back fields

`feetRef.current` is currently `{ left: FootState | null, right: FootState | null }` (implicitly front). It will become `{ front: { left, right } | null, rear: { left, right } | null }`, with each entry initialized only if that hip exists in the chain and both its legs have `nodeFoot` placements.

**Alternative considered:** Add `rearLeft`, `rearRight` at the same level as `left`, `right`. Rejected — it leaves "left" and "right" without a hip qualifier and would force every read site to know whether a leg is front or rear by naming convention rather than structure. The nested form mirrors how the code already reasons about hips (`frontHip`, future `rearHip`) and how the cascade indexes them.

### Decision 4: `applyLegBone` is already generic — no change to it

`applyLegBone` accepts a hip pivot, a hip-back position, a leg group, a hip node, and a foot state. It does not assume "front." The only adjustment needed is to call it a second time per frame with rear-hip parameters. This is intentional — Step 5 was implemented with Step 6 in mind.

### Decision 5: Cascade extension stops at the rear hip, not the tail

`buildCascadeChain` walks `head, spine[0]..spine[N-1]` and currently slices at the first hip-bearing index + 1. It will slice at the second hip-bearing index + 1. The tail remains excluded. `buildSkeletonTree` (which renders the whole skeleton, not just the cascade) continues to include the tail. The tail's pivot receives `targetQuat.current.identity()` in the existing render loop and so stays at rest — no behavior change for the tail.

When Step 8 unfreezes the tail, `buildCascadeChain` will extend further (or a separate post-hip cascade will run for tail joints — that decision belongs to Step 8, not this change).

### Decision 6: Diagnostics `FrameSnapshot` shape changes; no migration

`FrameSnapshot` currently has `leftFoot`, `rightFoot`, `hipState`, `hipBack`, `wantedHipYaw`, `appliedHipYaw`, `frontHipId` as top-level fields. It will be restructured to a per-hip nested form: `frontHip`, `rearHip`, each carrying `{ id, hipBack, wantedYaw, appliedYaw, plantedYaw, targetYaw, leftFoot, rightFoot }` (or `null` if that hip isn't present).

Diagnostics is internal tooling. The recording buffer lives in-memory and is reset on page reload. Step 5 recordings pasted into chat cannot be replayed against this code change anyway because they describe a one-hip world. No backward compatibility code, no parser shim, no version field.

### Decision 7: Four foot markers in `AnimatedModel.tsx`, gated by per-hip presence

`AnimatedModel.tsx` currently renders two markers when `hasFrontLegs` is true. It will render up to four — front pair gated by `hasFrontLegs`, rear pair gated by an analogous `hasRearLegs`. Each pair has its own color so they are visually distinguishable in the viewport. `FootMarkerRefs` becomes `{ front: { left, right }, rear: { left, right } }`. The hook signature for `useLocomotion` accepts the new shape.

## Risks / Trade-offs

- **Diagonal couplet may not emerge cleanly with current angle caps and strain threshold.** → Roadmap § 4 Step 6 explicitly flags this as a tuning signal, not a bug. The design states that if alternation doesn't fall out, joint caps and strain threshold need tuning; geometry should produce the pattern. If it does not after reasonable tuning, that is a finding worth documenting in `documentation/animation_design.md` and addressing in a follow-up change — not blocking this one.

- **Two simultaneous swings (one per hip) could produce visually unstable poses if their target yaws are far apart.** → Each hip's `appliedHipYaw` only moves within its own swing window, and during the swing the spine cascade still respects per-joint angle caps. The cascade re-runs every frame against the current `desired` head yaw, so divergent hip targets are absorbed by the spine joints between them within their caps. If the spine cannot accommodate the difference, that surfaces as a strained mid-spine joint clamped at its cap — visible but not catastrophic.

- **`FrameSnapshot` shape change breaks any saved-to-disk recordings.** → Recordings are not persisted; they live in the in-memory ring buffer until copied to clipboard. Pasted recordings are debugging context for chat conversations only, not a stable format. Acceptable.

- **`buildCascadeChain` returning a longer chain may surface previously-hidden bugs in `computeCascadeRotations` or in the per-pivot rendering loop.** → `computeCascadeRotations` has been chain-length-generic since Step 3; the rendering loop in `useLocomotion.ts` already iterates `cascadeIds` generically. No code path treats the chain length as a fixed value. Low risk, but worth confirming during browser verification.

- **Mistaking the second hip-bearing spine for "the rear hip" when the studio has more than two hip-bearing spines.** → Today's `findFrontHip` returns the first match and ignores any others. The design data model permits at most one front + one rear hip on the dragon rig. If a future rig (snake, centipede) had more, that is a separate refactor (variable-leg-pair support); for the dragon, "first hip-bearing spine" and "second hip-bearing spine" are unambiguous and stable.
