# Locomotion — Phase F0 walking foundation (delta)

## MODIFIED Requirements

### Requirement: Deterministic fixed-step physics world

The system SHALL run one `RAPIER.World` at a **fixed timestep**, stepped a whole number of fixed substeps per frame with accumulated `dt` clamped, so that a given run reproduces its diagnostic capture on the same machine/build. World gravity SHALL depend on the coupled mode: `(0, 0, 0)` in **swim** mode (neutral-buoyancy water) and `(0, −9.81, 0)` in **land** mode. `RAPIER.init()` SHALL complete before the world is built; the frame loop SHALL no-op until the world and rig are ready. No nondeterministic inputs (`Math.random`, wall-clock time) SHALL enter the step loop.

#### Scenario: World steps at a fixed timestep

- **GIVEN** a built 3D body
- **WHEN** the simulation runs for frames of varying real `dt`
- **THEN** the world advances in fixed-size substeps (frame-rate-independent), and two identical runs produce matching captures on the same machine

#### Scenario: Loop is inert until ready

- **GIVEN** `RAPIER.init()` has not resolved or no rig is loaded
- **THEN** the frame loop performs no stepping and does not throw

#### Scenario: Gravity follows the mode

- **GIVEN** the coupled handle is built
- **WHEN** the mode is `swim`
- **THEN** world gravity is `(0, 0, 0)`
- **WHEN** the mode is `land`
- **THEN** world gravity is `(0, −9.81, 0)` and a static ground plane is present

## ADDED Requirements

### Requirement: No forced planar projection

The system SHALL NOT apply any per-step override of body position or orientation (no "planar projection" that snaps height, zeroes out-of-plane velocity, or strips pitch/roll). The 3D body's pose SHALL be the integrated result of the physics alone. The swim SHALL remain usable without such an override: over a coupled swim run of at least 10 s with the drag environment on, the body SHALL stay bounded and roughly in-plane (no float-off or tumble) and SHALL still translate forward head-first (per the existing forward-translation requirement).

#### Scenario: Swim is stable with no projection

- **GIVEN** a coupled swim run with the drag environment on and no planar projection in the loop
- **WHEN** it runs for at least 10 s
- **THEN** the body translates forward head-first, vertical COM drift stays small, and maximum body tilt stays bounded (no float-off, no tumble)

#### Scenario: No projection code path exists

- **WHEN** the coupled step loop runs in either mode
- **THEN** no function snaps body height, zeroes out-of-plane velocity, or strips pitch/roll, and no "planar lock" control is exposed

### Requirement: Axial muscle torque acts about the segment-local bend axis

Each axial revolute joint's axis SHALL be the **child segment's local up** — world-up with its along-segment component removed (perpendicular to the segment, a principal axis of the capsule) — stored in the body's local frame so it follows the segment when the segment later pitches. For a horizontal segment this equals world-up. The joint-angle readback SHALL project the relative rotation onto this axis.

#### Scenario: Bend axis is perpendicular to the segment

- **GIVEN** a segment whose rest forward is tilted off horizontal (from the rig's node heights)
- **THEN** its joint's bend axis is perpendicular to that forward (not fixed world-up), and the muscle torque bends the joint within the segment's own plane

### Requirement: Coupled mode selects swim or land

The animate store SHALL carry a `coupledMode: 'swim' | 'land'` (default `'swim'`), exposed in the Simulate sidebar and on the `window.__studio` hook. Changing the mode while a coupled run is active SHALL free and rebuild the coupled handle (new world, gravity, body). There SHALL be no hardcoded gravity/ground flag in the build path; the mode is the single switch.

#### Scenario: Mode toggle rebuilds the world

- **GIVEN** a coupled run in `swim` mode
- **WHEN** the user switches to `land`
- **THEN** the coupled handle is rebuilt with gravity on and a ground plane, and the body falls onto the ground

#### Scenario: Default is swim

- **GIVEN** a freshly loaded studio
- **THEN** `coupledMode` is `'swim'` (gravity off, no ground plane)

### Requirement: Legs are built from the hip socket and nodeFoot

In **land** mode the body builder SHALL create one physics capsule per leg group, spanning the parent girdle's hip socket (`nodeHipLeft` for `leg-left`, `nodeHipRight` for `leg-right`) to the leg group's `nodeFoot`, with mass from the leg's authored `nodeWeight` and a foot contact collider with friction. It SHALL NOT use `nodeFront`/`nodeBack` for legs (those are undefined on the rig). The hip joint SHALL be a **rigid (fixed)** joint in this phase (standing only — no actuation). In swim mode legs remain non-physical passengers.

#### Scenario: Leg geometry comes from socket → nodeFoot

- **GIVEN** a rig whose legs carry `nodeFoot` and whose girdles carry `nodeHipLeft/Right`
- **WHEN** the body is built in land mode
- **THEN** each leg is a capsule from its girdle hip socket to its `nodeFoot`, and no leg references `nodeFront`/`nodeBack`

### Requirement: Body stands on its legs under gravity

In **land** mode the system SHALL place a static ground plane just below the lowest foot, render each leg from its physics body transform, and the body SHALL settle and rest on its feet: vertical COM SHALL stop dropping (no fall-through), maximum body tilt SHALL stay small (≤ ~5° at rest), and kinetic energy SHALL decay toward rest. Switching back to swim mode SHALL still swim forward with no regression.

#### Scenario: Dragon stands at rest

- **GIVEN** land mode with no muscle drive (or low drive)
- **WHEN** the simulation runs to settle
- **THEN** the body drops a small amount onto its feet and rests: COM height stabilizes, tilt stays ≤ ~5°, kinetic energy decays toward zero, and no segment clips through the floor

#### Scenario: Swim unregressed after land

- **GIVEN** a run was in land mode
- **WHEN** the mode is switched back to swim and the coupled drive runs
- **THEN** the body swims forward head-first as before (forward-translation requirement still met)
