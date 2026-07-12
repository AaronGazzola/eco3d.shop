## ADDED Requirements

### Requirement: The studio can run locomotion on a reduced-coordinate engine

The animate studio SHALL be able to drive the rig with a reduced-coordinate physics engine (MuJoCo-WASM) compiled at runtime from the current node skeleton, selectable via a `SimConfig.simEngine` field (`'rapier' | 'mujoco'`, default `'rapier'`). When `simEngine` is `'mujoco'`, the rig SHALL be simulated and rendered from the reduced-coordinate engine; when `'rapier'`, behaviour SHALL be unchanged from before this change.

#### Scenario: Engine selected from config

- **WHEN** the studio loads a config with `simEngine: 'mujoco'`
- **THEN** the lizard is simulated by the MuJoCo runtime built from the current groups, and rendered from its body transforms

#### Scenario: Default is unchanged

- **WHEN** a pre-existing config or link without `simEngine` is loaded
- **THEN** the studio runs the Rapier path exactly as before (default `'rapier'`)

### Requirement: The reduced-coordinate model is built from the node skeleton

The MuJoCo model SHALL be built from the loaded creature's `groups` via a shared, engine-agnostic builder (`app/game/locomotion/mjcf.ts`) used by both the studio and the offline oracle, deriving geometry, mass, bend axes, and angle limits from the same skeleton helpers `body3d.ts` uses. It SHALL NOT hard-code any per-model values.

#### Scenario: Any loaded rig builds its own model

- **WHEN** a different creature is loaded
- **THEN** the MuJoCo model reflects that creature's segment count, lengths, hips, and caps, with no code change

### Requirement: The CPG drives the reduced-coordinate body

The reduced-coordinate runtime SHALL drive the model with the existing `cpg.ts` unchanged: the spine as a position servo to the Ekeberg equilibrium angle (with the 10 ms muscle delay), the legs as position servos to the `girdleClockPhase` gait targets, and the grip as a foot-point spring on the CPG clock — the same logic validated offline in Phase 0, reading the same `SimConfig` fields. Stepping SHALL use the fixed `1/120` accumulator so freeze/seek/slow-motion apply.

#### Scenario: Same CPG, in the studio

- **WHEN** the MuJoCo engine runs `base walk`
- **THEN** the lizard walks upright with the CPG-driven wave and grip, honouring pause/step/seek like the Rapier path

### Requirement: Shareable link reproduces the engine choice

The config link SHALL carry `simEngine`, so opening a shared URL reproduces the same engine, config, and resulting motion.

#### Scenario: Link round-trips the engine

- **WHEN** a user copies the link while running `simEngine: 'mujoco'` and reopens it
- **THEN** the studio loads the MuJoCo engine with the same config and reproduces the walk
