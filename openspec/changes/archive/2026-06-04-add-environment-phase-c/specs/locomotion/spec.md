## ADDED Requirements

### Requirement: Anisotropic resistive-force environment

The system SHALL provide an environment module at `app/game/locomotion/environment.ts` that computes a per-segment anisotropic resistive drag on the axial chain. For each axial segment `i` with length `L_i`, tangent direction `t̂_i = (cos θ_i, sin θ_i)` (where `θ_i` is the segment's cumulative heading), world-frame COM velocity `v_i = (jacLinX[i] · qd, jacLinZ[i] · qd)`, and angular rate `ω_i = jacAng[i] · qd`, the drag SHALL be:

```
v_∥ = v_i · t̂_i
v_⊥ = v_i − v_∥ · t̂_i
F_drag_i = −L_i · (C_n · v_⊥ + C_t · v_∥ · t̂_i)
τ_drag_i = −L_i · C_ω · ω_i
```

with constants `C_n = 12`, `C_t = 1.0`, `C_ω = 0.6` (anisotropy ratio `C_n / C_t = 12`). `computeEnvironmentTau(spec, q, qd)` SHALL return a `dof`-length generalized-force vector built by `τ_env[c] = Σ_i (jacLinX[i][c]·F_drag_i.x + jacLinZ[i][c]·F_drag_i.z + jacAng[i][c]·τ_drag_i)`.

#### Scenario: Stationary body has zero drag

- **GIVEN** a body at rest (`qd = 0`)
- **THEN** `computeEnvironmentTau` returns the zero vector (drag is purely velocity-dependent)

#### Scenario: Sideways-moving segment feels stronger drag than along-axis

- **GIVEN** a single segment moving at unit speed perpendicular to its tangent
- **WHEN** compared to the same segment moving at unit speed along its tangent
- **THEN** the magnitude of the perpendicular drag force is `C_n / C_t = 12` times larger than the along-axis drag force (this anisotropy is what produces forward thrust from undulation)

### Requirement: Solver accepts an environment-enabled flag

`stepSolver(state, spec, dt, jointTorques?, jointDampingScale?, environmentEnabled?)` SHALL accept an optional `environmentEnabled: boolean`. When `true`, `generalizedForces` SHALL add `computeEnvironmentTau(spec, q, qd)` to its returned generalized-force vector after the existing damping, limit-stop, and joint-torque terms. When omitted or `false`, behaviour SHALL be byte-for-byte identical to the prior A4/B2/B3 solver.

The drag SHALL be recomputed inside the sub-step loop so it tracks the sub-step-current `(q, qd)`.

#### Scenario: Environment off reproduces A4 behaviour

- **GIVEN** a perturbed chain stepped with `environmentEnabled` omitted
- **THEN** it settles to rest identically to its Phase A4 behaviour (no drag contribution)

#### Scenario: Environment on dissipates kinetic energy

- **GIVEN** a freely coasting body with non-zero `qd` and `environmentEnabled = true`
- **WHEN** the solver steps with no actuation
- **THEN** the body's kinetic energy strictly decreases (drag is dissipative, `F · v ≤ 0` per segment)

### Requirement: Environment toggle in the store

`animateStore` SHALL expose `environmentEnabled: boolean` (default `false`) and `setEnvironmentEnabled(v)`. The toggle SHALL be independent of the four run modes (A-phase / CPG preview / muscle test / coupled): flipping it while any mode is running SHALL take effect on the next frame's `stepSolver` call.

Switching the active tab to Calibrate SHALL NOT reset `environmentEnabled` — the environment is a persistent preference, not a mode.

#### Scenario: Toggle persists across mode switches

- **GIVEN** `environmentEnabled = true` and the user switches between A-phase Run, muscle test, and coupled modes
- **THEN** the environment stays on in each mode (the user does not need to re-enable it per mode)

### Requirement: Emergent forward translation under coupled drive

When B3 coupled drive is running with the environment toggle on (drive ≈ 1.0, excitability ≈ 1.0, default constants), the body SHALL translate monotonically in its heading direction. Specifically, over a recording of at least 3 seconds, the body's center-of-mass displacement projected onto its initial heading direction SHALL be positive and SHALL grow over time (not oscillate around zero as in Phase B). The capture's `maxCOMdrift` SHALL be order ≥ 0.5 body-lengths over the recording.

The CPG space-time section in the same capture SHALL still show a clean head→tail traveling wave: the body's motion does not feed back into the CPG (`s = 0`), so adding the environment does not alter the commanded wave.

#### Scenario: B3 + environment swims forward

- **GIVEN** a rig loaded with B3 coupled drive running and `environmentEnabled = true`
- **WHEN** the user records ≥ 3 seconds
- **THEN** the body section's `rootX` (or heading-projected COM motion) increases monotonically and `maxCOMdrift` is large relative to a body-length, indicating real translation rather than wriggle

#### Scenario: B3 + environment off matches Phase B

- **GIVEN** a B3 coupled run with `environmentEnabled = false`
- **THEN** the body wriggles in place exactly as in Phase B (`maxCOMdrift ≪ body-length`), confirming the toggle controls the only Phase C addition

### Requirement: Sidebar exposes the environment toggle

The Simulate tab in `AnimateSidebar` SHALL render an **Environment (Phase C)** block (visually placed at the top of the tab, above the A-phase controls) with a single toggle button bound to `environmentEnabled` and a one-line hint identifying the drag coefficients. When the environment is on, the toggle SHALL be visually distinct from its off state.

#### Scenario: Environment toggle is present and live

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks the Environment toggle
- **THEN** `environmentEnabled` updates and the change is reflected in the next frame's solver step
