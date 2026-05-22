## ADDED Requirements

### Requirement: Rigid leg as a hard distance constraint on the cascade

For each planted foot, the solver SHALL treat its leg as a hard distance constraint between the leg's hip socket (the studio-saved `nodeHipLeft` or `nodeHipRight` on the leg's owning spine group, transported through that spine group's pivot in the chain) and the foot's world position. The constraint is `|hipSocketWorld − plantedFootWorld| − legLength` SHALL be within a distance tolerance (default `0.05` model units). The constraint is *hard*: when the cascade's candidate spine pose would violate it, the cascade SHALL be adjusted to satisfy it before the pivots are slerped, not after.

#### Scenario: Cascade candidate satisfies the constraint
- **WHEN** `computeCascadeRotations` produces candidate yaws AND for every planted foot the candidate spine pose places its hip socket within tolerance of `legLength` from the foot
- **THEN** the projection makes no changes and the slerp targets the original cascade yaws

#### Scenario: Cascade candidate violates a planted foot's constraint
- **WHEN** the candidate spine pose places the hip socket farther from or closer to a planted foot than `legLength ± tolerance`
- **THEN** the projection reduces one or more cascade yaws along the chain between that hip and the head until the constraint is satisfied or the iteration budget is exhausted
- **AND** each reduced yaw stays within `[-effectiveAngleCaps(g).yaw, +effectiveAngleCaps(g).yaw]` for its segment `g`

#### Scenario: Stepping foot's constraint is excluded
- **WHEN** a foot is in the `stepping` phase
- **THEN** its leg is excluded from the projection for the duration of the swing
- **AND** the spine is free to bend through the gap previously held by that foot, subject to the remaining planted feet's constraints

### Requirement: Saved angle caps are the only source of joint limits during projection

The projection SHALL read joint limits exclusively from `effectiveAngleCaps(group)` (which reads `BodyGroup.angleCaps` from the studio configuration with fallback to `DEFAULT_ANGLE_CAPS`). The projection SHALL NOT use any hardcoded numeric limits, SHALL NOT override the saved caps, and SHALL NOT widen a joint's range beyond the saved cap. Reductions during projection are always within `[-cap, +cap]`.

#### Scenario: User-tuned cap is respected during projection
- **WHEN** the user has tuned a spine joint's `angleCaps.yaw` in the studio to a value smaller than the default
- **THEN** the projection uses the tuned value as the clamping limit for that joint
- **AND** any reduction the projection makes to that joint's yaw remains within the tuned range

#### Scenario: Default cap is used when no saved value
- **WHEN** a `BodyGroup` has no saved `angleCaps`
- **THEN** the projection falls back to `DEFAULT_ANGLE_CAPS` via `effectiveAngleCaps`
- **AND** the fallback is identical to the value used elsewhere in the cascade

### Requirement: Projection runs as a pure function over arrays

The projection logic SHALL be expressed as a pure function taking the candidate yaws, the chain's angle caps, the chain's per-segment node positions, the hip socket positions, the planted feet positions, and the leg lengths, and returning the projected yaws. The function SHALL NOT read or write three.js scene-graph state directly. Reading scene state and writing the slerp targets remains in `useLocomotion.ts`.

#### Scenario: Pure-function call shape
- **WHEN** the projection is invoked
- **THEN** its inputs are arrays/objects of plain numbers and its output is an array of the same shape as `cascadeOut`
- **AND** no `THREE.Group`, `THREE.Quaternion`, or `matrixWorld` is mutated during the call

#### Scenario: Single forward pass computes hip socket candidate positions
- **WHEN** the projection needs the candidate world position of a hip socket under a candidate set of yaws
- **THEN** it computes that position via a forward pass through the chain in pure math (segment translations + yaw rotations) without touching the scene graph

### Requirement: Iteration is bounded and falls back to strain-based stepping

The projection SHALL run at most a bounded number of iterations per frame (default `4`). If after the iteration budget some constraint is still violated, the residual violation SHALL surface as strain via the existing `computeStrain` pathway, which triggers a foot step at the configured threshold. The projection SHALL NOT block the frame on convergence.

#### Scenario: Convergence within budget
- **WHEN** the projection converges to all constraints within tolerance in fewer than the iteration budget passes
- **THEN** it returns early with the projected yaws

#### Scenario: Budget exhausted with residual violation
- **WHEN** the iteration budget is reached and some constraint is still violated
- **THEN** the projection returns the best-effort projected yaws
- **AND** the residual hip socket displacement is implicitly visible as elevated strain on the affected foot
- **AND** that foot lifts on a subsequent frame once `computeStrain` exceeds `STRAIN_THRESHOLD`

### Requirement: Stepping logic and foot state semantics are unchanged

`app/game/locomotion/foot.ts` SHALL NOT be modified by this change. `FootState` shape, `STEP_DURATION`, `LIFT_HEIGHT`, `STRAIN_THRESHOLD`, `makeFootState`, `footTargetWorld`, `computeStrain`, and `easeInOut` retain their existing behavior. The strain calculation continues to use the world-anchored formulation introduced in the prior change. The decision of *when* to step is unchanged; this change only affects *what spine pose* the cascade renders against.

#### Scenario: foot.ts is untouched
- **WHEN** the change is applied
- **THEN** `git diff` shows no modifications to `app/game/locomotion/foot.ts`

#### Scenario: Strain threshold continues to drive stepping
- **WHEN** a foot's strain exceeds `STRAIN_THRESHOLD` after the projection has applied
- **THEN** the existing `runHipStep` logic transitions that foot from `planted` to `stepping`
- **AND** the swing target is the same world-anchored value `footTargetWorld` produces today

### Requirement: applyLegBone is unchanged

The leg rendering logic in `applyLegBone` SHALL NOT be modified by this change. The leg mesh continues to be rotated to point from its hip socket toward its foot's world position. The change in observable behavior comes from the spine pose the leg renders against — the leg appears no longer to stretch because the spine pose now respects leg length.

#### Scenario: applyLegBone code path unchanged
- **WHEN** the change is applied
- **THEN** the body of `applyLegBone` matches its pre-change form (modulo formatting)
- **AND** the leg mesh's `quaternion` and `position` continue to be set from the rotate-around-hip logic that points the leg at the foot
