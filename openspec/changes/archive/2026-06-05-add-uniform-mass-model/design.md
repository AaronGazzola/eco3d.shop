## Context

The solver, CPG, and muscles are correct; the body model that feeds them is not. `buildBodySpec` computes each segment's `mass` from the mesh's axis-aligned bounding-box volume (`BODY_DENSITY × extentX·extentY·extentZ`) and its `inertiaAboutComY` from the mesh extents ([body.ts:130-132](app/game/locomotion/body.ts#L130-L132)). This is the only place the 3D art touches the physics, and it is the cause of the head-anchored / tail-whip failure that blocked the Phase C swimming gate: the head mesh's large volume yields ≈78.7 kg vs 7–22 kg tail segments (≈10:1), and internal muscle torques cannot translate that heavy head.

Roadmap **Decision 7** (2026-06-04) resolves this: weight is authored per node (default uniform, mesh-decoupled), inertia is derived from weight + length, the scale is anchored on a medium-dog head, and the legs are ganged. The paper itself used uniform segments, so this is also more faithful, not just more tractable. This change implements Decision 7 and re-runs the swimming gate on the resulting uniform body.

## Goals / Non-Goals

**Goals.**
- Sever the mesh→mass leak: `PlanarSegment.mass` comes from an authored `BodyGroup.nodeWeight`, never from mesh geometry. The mesh remains a render-only passenger.
- Keep what should stay rig-derived: segment **length** still comes from node spacing, node **count** stays dynamic. Only mass/inertia is decoupled from the art.
- Derive `inertiaAboutComY` from `mass` + `length` (rod about COM) so dynamic node spacing still shapes rotation without the mesh.
- Author per-node weight in Calibrate, reusing the angle-cap slider pattern; gang the 4 legs to one value.
- Re-tune the drag and CPG→muscle constants for the new ~50× lighter, uniform scale.
- Pass the swimming gate that Phase C could not: B3 coupled + environment on → **head-leading** monotonic translation.

**Non-Goals.**
- No per-node *length* or *width* authoring — length stays node-spacing-derived; the cross-section width `W` for the inertia formula is a single documented constant, not per-node.
- No non-uniform default profile (e.g. a deliberately heavier head). The default is uniform; a user can author a heavier head by hand, but the shipped default is flat. (A future change can add default profiles if wanted.)
- No change to the CPG, Ekeberg muscle math, or the solver's equations of motion. The solver already reads `mass`/`inertiaAboutComY` from the spec; it needs no edit.
- No data-migration script. Configs without `nodeWeight` fall back to defaults (which is the desired uniform behaviour).
- No environment *tuning UI* — `DRAG_*` and `CPG_TO_MUSCLE_GAIN` stay code constants (UI is Phase H).

## Approach

**The type + default constants.** Add `nodeWeight?: number` to `BodyGroup` (kilograms). In `body.ts`:
```
DEFAULT_AXIAL_WEIGHT = 1.5     // head/spine/tail, ~a medium-dog head
DEFAULT_LEG_WEIGHT   = 0.4     // each leg; lighter, ganged
STD_SEGMENT_WIDTH    = W       // documented cross-section for the inertia rod formula
```
The dog-head anchor sets `DEFAULT_AXIAL_WEIGHT`; a uniform body of ~11 axial nodes ≈ 16 kg total ≈ a medium dog's mass. Both defaults are tunable constants.

**Mass and inertia per segment.** In `buildBodySpec`, replace lines 130-132:
```
const mass = group.nodeWeight ?? defaultWeightFor(group.type)
const inertiaAboutComY = mass * (length * length + STD_SEGMENT_WIDTH * STD_SEGMENT_WIDTH) / 12
```
`length` is unchanged (node spacing, with the existing tail mesh-extent fallback). The mesh stats (`extentX/Y/Z`, centroid) are still read for `restComX/restComZ` (render COM offset) — that is a *render* quantity, not a dynamics one, so it stays. Only the `volume → mass` and `extent → inertia` lines are removed.

**Authoring UI.** Calibrate already renders angle-cap sliders per group via `LimitSlider`. Add a weight slider per chain group bound to `nodeWeight` (range e.g. `0.1–10` kg, default = the type default). The 4 leg groups share one logical control: editing any leg writes `nodeWeight` to **all** leg groups (left + right, fore + hind) so they stay equal — this is the "legs ganged" rule. Persist `nodeWeight` through `sharedStore`'s config save/load exactly as `angleCaps` is persisted.

**Re-tune.** With masses dropping ~50× and becoming uniform, the force balance changes completely:
- The Ekeberg torque needed to bend a 1.5 kg segment is far smaller than for a 78 kg one, so `CPG_TO_MUSCLE_GAIN` (was 80) comes **down** to keep per-joint amplitude inside the caps.
- The drag magnitudes (`DRAG_NORMAL=30, DRAG_TANGENT=2.5, DRAG_ANGULAR=1.5`) were fit to brake a 78 kg head; at 1.5 kg they would over-damp, so they also come down. The **anisotropy ratio** (`DRAG_NORMAL / DRAG_TANGENT`) is the physics and is preserved (~10:1); only the absolute scale is re-fit against the gate.

**Gate.** Same instrument as Phase C (`serializeCoupledCapture`): run B3 coupled drive at drive≈1.0, exc≈1.0, environment on, record ≥3 s. The uniform body should now bend with roughly even per-segment amplitude (no 10:1 mass ratio forcing the tail to do all the moving), producing a coherent head→tail traveling wave whose lateral-velocity integral nets **head-leading** forward translation. Success = heading-projected COM displacement positive and growing, `maxCOMdrift` ≥ ~0.5 body-lengths over the recording, CPG space-time still a clean wave.

## Trade-offs

- **Uniform-per-node vs length-proportional default.** Decision 7 chose uniform per node. Length-proportional (constant linear density) would make total body mass invariant to node count, which is marginally cleaner for re-sliced rigs — but uniform is what the paper used and what the user chose, and it is the simplest baseline to verify the controller against. Per-node authoring lets anyone override toward proportional by hand.
- **Derive inertia from length vs hold it constant.** Deriving from `mass + length` keeps a long neck segment physically more resistant to rotation than a stubby toe, honoring the dynamic node spacing we keep. Holding inertia constant would be more uniform but would make a long and a short segment rotate identically, fighting the variable-length goal. We derive (user-confirmed).
- **Keep mesh stats for render COM vs drop the mesh read entirely.** We still read the mesh centroid for `restComX/restComZ`, which positions the visual mass center for rendering — purely cosmetic and not in the equations of motion. Dropping it would shift the render, not the physics. Keep it; the leak was specifically `volume → mass`, and that is the only line removed from the mesh path.
- **Migrate old configs vs fall back to defaults.** Fall back. A missing `nodeWeight` resolving to the uniform default *is* the intended new behaviour, so no migration is needed and old configs improve automatically.

## Open Questions

- Final values of `DEFAULT_AXIAL_WEIGHT`, `DEFAULT_LEG_WEIGHT`, and `STD_SEGMENT_WIDTH`. The dog-head anchor sets the axial default near 1.5 kg; the width `W` mostly affects how much a segment resists rotation about its own COM and is small relative to `length`, so it is a secondary tuning knob — start with `W ≈ a typical segment width from the rig` and adjust only if the body feels too torsionally stiff/loose at the gate.
- Final re-tuned `CPG_TO_MUSCLE_GAIN` and `DRAG_NORMAL/TANGENT/ANGULAR`. Determined empirically at the gate; the design fixes only the *direction* of change (all down from the 78 kg-scale values) and the preserved anisotropy ratio.
- Leg default weight relative to axial. `0.4` kg is a guess; legs barely matter for the swimming gate (they saturate/fold) but will matter for Phase D walking. Pick a value that reads as plausibly limb-like; refine in Phase D.
- Does a uniform body still show *any* residual tail emphasis? The free end of a chain always has the largest amplitude, even at uniform mass — that is correct physics, not the old pathology. The gate is "head-leading net translation," not "perfectly even amplitude"; confirm the residual is mild enough that the net thrust is still forward.
