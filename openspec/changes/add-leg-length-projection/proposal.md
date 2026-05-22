## Why

Per `documentation/animation_design.md` § 1.1 and § 2, the legs are rigid bones constrained to their planted feet; the spine cannot bend in ways that violate that rigidity. The current implementation ships `applyLegBone` as a *visual* rotation that points the leg mesh at the foot without enforcing `|hipSocket − plantedFoot| = legLength`. With no push-back from the legs, the cascade bends the spine freely through every joint's full angle cap, the body never has a reason to translate, and walking cannot emerge — the dragon bends in place while its feet shuffle to chase the bending spine. Step 4 of the roadmap was supposed to make this constraint hard ("hip rotation is *blocked*") but was implemented as strain-reading only. This change closes that gap.

## What Changes

- Add a per-frame PBD-style projection pass that treats each rigid leg as a distance constraint between its hip socket (model-space `nodeHipLeft` / `nodeHipRight` transported through the front/rear hip pivot) and its foot's world position.
- The projection runs after `computeCascadeRotations` produces candidate spine yaws but before the pivots are slerped. For each planted foot, if the candidate pose places the hip socket at a world distance from the planted foot that is not equal to leg length (within tolerance), the cascade yaws are clamped along the cascade chain until the constraint is satisfied within each joint's *existing* angle cap.
- The strain-and-step logic in `app/game/locomotion/foot.ts` is unchanged. The cascade computation in `app/game/locomotion/cascade.ts` may grow a clamping helper but its existing greedy fill remains the starting point.
- The studio-configured angle caps (from `BodyGroup.angleCaps`) are the clamping limits for the projection. No hardcoded caps, no overrides; the projection only ever reduces yaws below the saved caps, never above them.
- Update `documentation/animation_design.md` Current Status to record the Step 4 gap, this change, and the prediction that walking emerges from Steps 5–7 once the constraint is hard.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dragon-animation`: cascade output is now a projection-corrected spine pose rather than a free greedy fill. Adds a hard leg-length constraint as a structural rule of the solver. Stepping logic and foot state are unchanged.

## Impact

- `app/game/locomotion/cascade.ts` — likely grows a constraint-aware variant or post-projection helper. Existing `computeCascadeRotations` may be reused inside the projection loop.
- `app/game/locomotion/useLocomotion.ts` — per-frame loop calls the projection between cascade computation and pivot slerp. `applyLegBone` is unchanged (still renders the leg pointing at the foot; the difference is the spine pose it renders against now respects leg length).
- `app/game/locomotion/foot.ts` — unchanged.
- `documentation/animation_design.md` — Current Status updated.
- No new dependencies. No new files required (helpers may be co-located in `cascade.ts`).
- Saved `BodyGroup.angleCaps` continue to drive joint limits; this change introduces no overrides.
