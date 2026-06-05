## MODIFIED Requirements

### Requirement: Body spec is derived from the rig

The system SHALL provide `buildBodySpec(groups, segments)` returning a `BodySpec | null`.

The rig's canonical node convention (mirrored by the group editor at `/admin/group` — see `NodeOverlay.tsx`'s `getCanonicalNodes`) places each chain joint at the **parent's `nodeBack`**. Only the head exposes a `nodeFront` (its snout, not a joint). All non-head chain groups carry a `nodeBack` that simultaneously marks the joint to the next downstream segment.

The rotation center for each chain segment SHALL therefore be resolved in this order: (1) the *parent* chain segment's `nodeBack` (the canonical joint location), (2) the segment's own `nodeBack` as a fallback when no parent exists or the parent has no `nodeBack`, (3) the segment's own `nodeFront` as a final fallback. Any stale `nodeFront` value on a non-head chain segment SHALL NOT participate in pivot selection — it is treated as residue from earlier rig conventions and ignored.

When the rig has at least one chain group whose center can be resolved this way, the function SHALL return a non-null `BodySpec`. When no chain group resolves, the function SHALL return `null`.

Each `PlanarSegment` SHALL carry the segment's `groupId`, `length` (distance to the next chain segment's rotation center, with a mesh-extent fallback at the tail), `mass`, `inertiaAboutComY`, and rest-pose XZ positions of both the rotation center and the mesh centroid.

`mass` SHALL be the group's authored `nodeWeight` (kilograms) when present, otherwise a documented default for the group's type (`DEFAULT_AXIAL_WEIGHT` for head/spine/tail, `DEFAULT_LEG_WEIGHT` for legs). `mass` SHALL NOT be derived from mesh geometry — segment mass is independent of the 3D mesh size, so resizing or swapping a segment's mesh SHALL NOT change its mass.

`inertiaAboutComY` SHALL be derived from `mass` and the segment's `length` via a rigid-rod-about-COM formula with a documented standard cross-section width `W`: `inertiaAboutComY = mass · (length² + W²) / 12`. It SHALL NOT be derived from mesh extents.

The mesh centroid MAY still be read to position `restComX`/`restComZ` (a render quantity); the mesh SHALL NOT otherwise feed any dynamics quantity.

Each `PlanarJoint` SHALL carry `segmentIndex` (the child segment's index in the chain), `coordIndex = 3 + (segmentIndex - 1)`, `yawForwardLimit`, and `yawBackwardLimit` taken from `effectiveAngleCaps(childGroup)`.

The output SHALL be deterministic for the same input — equal `groups` and `segments` produce equal `BodySpec` values, segment ordering follows `flattenSkeleton(buildSkeletonTree(groups))`.

#### Scenario: A chainless rig returns null

- **WHEN** `buildBodySpec` is called with `groups` containing no `head` group
- **THEN** the function returns `null` without throwing

#### Scenario: Chain segments map to PlanarSegments in head→tail order

- **WHEN** `buildBodySpec` is called with a rig whose chain is head → spine1 → spine2 → tail
- **THEN** the returned `BodySpec.segments` has length 4 with `groupId` values in that order

#### Scenario: A joint inherits its child segment's angle caps

- **WHEN** `buildBodySpec` is called for a rig whose `spine1.angleCaps` is `{ yaw: 0.5, pitchUp: 0.3, pitchDown: 0.3 }`
- **THEN** the joint at `segmentIndex === 1` has `yawForwardLimit === 0.5` and `yawBackwardLimit === 0.5`

#### Scenario: Mass comes from nodeWeight, not the mesh

- **GIVEN** two rigs identical except that one head group's mesh is scaled 2× larger in every dimension
- **WHEN** `buildBodySpec` is called on each with no `nodeWeight` authored
- **THEN** both head `PlanarSegment.mass` values are equal to `DEFAULT_AXIAL_WEIGHT` (the larger mesh does not produce a larger mass)

#### Scenario: Default masses are uniform across axial segments

- **WHEN** `buildBodySpec` is called for a rig whose chain groups carry no `nodeWeight`
- **THEN** every head/spine/tail `PlanarSegment.mass` equals `DEFAULT_AXIAL_WEIGHT` and no axial segment is more than a small multiple heavier than any other (no ~10:1 head-to-tail ratio)

#### Scenario: Authored nodeWeight overrides the default

- **GIVEN** a spine group with `nodeWeight = 3.0`
- **WHEN** `buildBodySpec` is called
- **THEN** that segment's `PlanarSegment.mass === 3.0` and its `inertiaAboutComY === 3.0 · (length² + W²) / 12`

#### Scenario: Inertia tracks segment length at fixed mass

- **GIVEN** two segments of equal `mass` but where segment A's `length` is twice segment B's
- **THEN** segment A's `inertiaAboutComY` is larger than segment B's (inertia is derived from length, so dynamic node spacing still shapes rotation)

### Requirement: Anisotropic resistive-force environment

The system SHALL provide an environment module at `app/game/locomotion/environment.ts` that computes a per-segment anisotropic resistive drag on the axial chain. For each axial segment `i` with length `L_i`, tangent direction `t̂_i = (cos θ_i, sin θ_i)` (where `θ_i` is the segment's cumulative heading), world-frame COM velocity `v_i = (jacLinX[i] · qd, jacLinZ[i] · qd)`, and angular rate `ω_i = jacAng[i] · qd`, the drag SHALL be:

```
v_∥ = v_i · t̂_i
v_⊥ = v_i − v_∥ · t̂_i
F_drag_i = −L_i · (C_n · v_⊥ + C_t · v_∥ · t̂_i)
τ_drag_i = −L_i · C_ω · ω_i
```

The coefficients `C_n` (`DRAG_NORMAL`), `C_t` (`DRAG_TANGENT`), and `C_ω` (`DRAG_ANGULAR`) SHALL be documented constants **re-fit for the uniform per-node mass scale** (the prior Phase C values `30 / 2.5 / 1.5` were fit to the ~50× heavier mesh-derived masses and over-damp the uniform body). The absolute magnitudes are tuned against the swimming gate; the **anisotropy ratio** `C_n / C_t` SHALL be preserved at a slender-body value (≥ ~10:1) because that ratio — not the absolute scale — is what converts undulation into forward thrust. `computeEnvironmentTau(spec, q, qd)` SHALL return a `dof`-length generalized-force vector built by `τ_env[c] = Σ_i (jacLinX[i][c]·F_drag_i.x + jacLinZ[i][c]·F_drag_i.z + jacAng[i][c]·τ_drag_i)`.

#### Scenario: Stationary body has zero drag

- **GIVEN** a body at rest (`qd = 0`)
- **THEN** `computeEnvironmentTau` returns the zero vector (drag is purely velocity-dependent)

#### Scenario: Sideways-moving segment feels stronger drag than along-axis

- **GIVEN** a single segment moving at unit speed perpendicular to its tangent
- **WHEN** compared to the same segment moving at unit speed along its tangent
- **THEN** the magnitude of the perpendicular drag force is `C_n / C_t` times larger than the along-axis drag force, and `C_n / C_t ≥ ~10` (this anisotropy is what produces forward thrust from undulation)

### Requirement: Emergent forward translation under coupled drive

When B3 coupled drive is running with the environment toggle on (default `cpgDrive = 2.0`, `cpgExcitability = 0.09`, re-tuned default constants), the body SHALL translate monotonically in its **head-first** direction. With the uniform per-node mass model and the correct CPG→joint spatial mapping, the body bends as a head→tail travelling wave that nets a head-leading push: the body's center-of-mass displacement projected onto the snout (head-forward) axis SHALL be positive (head leading, not tail leading) and SHALL grow monotonically over time. Over a recording of at least 3 seconds the capture's `maxCOMdrift` SHALL be a clear non-zero forward drift (order ~0.2 body-lengths at the default settings; the absolute magnitude is a tuning concern deferred past the next phase — direction and monotonicity are the gate).

The CPG space-time section in the same capture SHALL still show a clean head→tail traveling wave: the body's motion does not feed back into the CPG (`s = 0`), so adding the environment does not alter the commanded wave.

#### Scenario: B3 + environment swims forward, head leading

- **GIVEN** a rig loaded with the uniform mass model, B3 coupled drive running, and `environmentEnabled = true`
- **WHEN** the user records ≥ 3 seconds
- **THEN** the snout-projected COM motion increases monotonically in the **head-forward** direction (real head-leading translation, not wriggle and not tail-leading drift); the absolute drift magnitude is a deferred tuning concern

#### Scenario: B3 + environment off matches Phase B

- **GIVEN** a B3 coupled run with `environmentEnabled = false`
- **THEN** the body wriggles in place exactly as in Phase B (`maxCOMdrift ≪ body-length`), confirming the toggle controls the only thrust source

## ADDED Requirements

### Requirement: CPG output maps to joints in head→tail spatial order

In the coupled drive, each body joint SHALL be driven by the CPG segment that matches its own position along the body, so the CPG's head→tail traveling wave lands on the body in head→tail order. `jointToCpgSegment[i]` SHALL equal `bodySpec.joints[i].segmentIndex` (the joint's child axial segment), NOT a reversed index. A reversed mapping (`n - 1 - segmentIndex`) feeds the head→tail wave onto the body tail→head, which makes the body swim **backward** (tail-first) under the drag — the pre-existing Phase B3/C defect this change corrects.

#### Scenario: Forward swim requires the non-reversed mapping

- **GIVEN** the coupled CPG→muscle→body→drag pipeline on a uniform body
- **WHEN** `jointToCpgSegment[i] = segmentIndex` (head→tail)
- **THEN** the body's center of mass drifts head-first (forward)

#### Scenario: Reversed mapping swims backward

- **GIVEN** the same pipeline with `jointToCpgSegment[i] = n - 1 - segmentIndex`
- **THEN** the body's center of mass drifts tail-first (backward), reproducing the prior defect (verified headless in `scripts/locomotion-drag-direction.ts`)

### Requirement: Per-node weight is authored in Calibrate

`BodyGroup` SHALL carry an optional `nodeWeight?: number` (kilograms) beside `angleCaps`. The Calibrate tab SHALL expose a per-chain-group weight control reusing the angle-cap slider pattern (`LimitSlider`), bound to `nodeWeight`, with the type default shown when no value is authored. `nodeWeight` SHALL persist in the saved model config exactly as `angleCaps` does (save/load through `sharedStore`).

The four leg groups SHALL be **ganged**: editing the weight of any leg group SHALL write the same `nodeWeight` to all four leg groups (left + right, fore + hind) so the legs always remain equal. Head, spine, and tail groups are authored independently of one another.

When a group has no authored `nodeWeight`, `buildBodySpec` SHALL substitute the documented type default (`DEFAULT_AXIAL_WEIGHT` for head/spine/tail, `DEFAULT_LEG_WEIGHT` for legs), so an un-authored rig is uniform by default.

#### Scenario: Weight slider authors and persists nodeWeight

- **GIVEN** the Calibrate tab with a rig loaded
- **WHEN** the user sets the spine1 weight slider to a value and saves the config
- **THEN** `spine1.nodeWeight` holds that value and reloading the config restores it

#### Scenario: Editing one leg sets all four legs

- **GIVEN** a rig with four leg groups
- **WHEN** the user changes the weight on one leg's control
- **THEN** all four leg groups' `nodeWeight` are set to the same value (legs stay equal)

#### Scenario: Un-authored groups fall back to uniform defaults

- **GIVEN** a saved config with no `nodeWeight` on any group
- **WHEN** the rig is loaded and `buildBodySpec` runs
- **THEN** all axial segments take `DEFAULT_AXIAL_WEIGHT` and all legs take `DEFAULT_LEG_WEIGHT` (uniform default, no migration required)
