## ADDED Requirements

### Requirement: The MuJoCo runtime samples the fine CPG chain by arc position

Every runtime that reads the axial CPG chain SHALL map each body segment to its fine oscillator through
`CpgSpec.oscOfSegment`. The chain runs at a fixed fine resolution (`CPG_AXIAL_SEGMENTS`) decoupled from
the body's joint count, and `oscOfSegment` places each body segment at its fractional arc position along
that chain.

The MuJoCo runtime (`app/game/locomotion/mujocoRuntime.ts`) SHALL remap each spine joint's body-segment
index through `oscOfSegment` before using it as an oscillator index, matching the Rapier runtime. A
body-segment index SHALL NOT be passed to `oscillatorOutput` as if it were a fine index.

Body-segment indices SHALL still be retained separately for the girdle-distance metadata
(`spineSeg`, `spineGirdleDist`), which is defined in body-segment space and is not an oscillator index.

#### Scenario: Body spans the whole fine chain

- **GIVEN** a rig with fewer body segments than `CPG_AXIAL_SEGMENTS`
- **WHEN** the MuJoCo runtime is built
- **THEN** the oscillator indices its spine joints read span the fine chain in proportion to arc length,
  rather than occupying only the leading `nBody` entries

#### Scenario: Both engines read the same point of the wave

- **GIVEN** the same rig and the same config under Rapier and under MuJoCo
- **THEN** a given spine joint reads the same fine oscillator index in both runtimes

### Requirement: Spine amplitude profile

`SimConfig` SHALL carry five control points defining a drive multiplier along the spine — `waveNose`,
`waveShoulder`, `waveHip`, `waveTailMid`, `waveTailTip` — at normalised arc positions 0, 0.25, 0.5, 0.75
and 1.0 respectively. Each SHALL default to `1.0`.

`stepCpg` SHALL accept the control points as an optional parameter and, for each axial oscillator `k` of
`n`, multiply that oscillator's drive by the value obtained by linear interpolation of the control points
at position `k/(n−1)`. Both the left and the right chain SHALL receive the same multiplier at the same
position.

The multiplier SHALL be applied after the front/back drive split and before the left/right turn factor,
so that shaping and turning compose.

Limb oscillators SHALL NOT be multiplied by the profile; they carry their own drive.

#### Scenario: Default profile is inert

- **GIVEN** every control point at its default of `1.0`
- **THEN** the drive array is identical to the drive array computed with no profile at all

#### Scenario: Profile is omitted entirely

- **GIVEN** a `stepCpg` call with no profile argument
- **THEN** behaviour is identical to the prior runtime

#### Scenario: A control point scales its region

- **GIVEN** `waveTailTip = 0.5` with every other control point at `1.0`
- **THEN** the oscillator at the tail tip receives half the drive
- **AND** the oscillator at the hind control point receives full drive
- **AND** an oscillator midway between them receives three quarters

#### Scenario: Profile composes with turning

- **GIVEN** a non-uniform profile and a non-zero `turnBias`
- **THEN** each oscillator's drive is the product of its profile multiplier and its side factor, with
  neither replacing the other

### Requirement: Head isolation

`SimConfig` SHALL carry `headIsolated: boolean`, defaulting to `false`.

When `headIsolated` is true, the MuJoCo runtime SHALL command a servo target of exactly zero for the head
joint — the spine joint whose child is axial segment 0 — bypassing the Ekeberg equilibrium-angle
expression rather than scaling its inputs. The head is thereby excluded from the wave outright rather
than damped.

Isolation SHALL NOT be implemented as a control point of the spine amplitude profile, because linear
interpolation between control points cannot hold a multiplier at zero across the head segment.

Isolation SHALL NOT be claimed to hold the head steady in world space. The head joint is held straight
relative to the segment behind it, and that segment still waves, so the head continues to yaw with the
neck. Aiming the head at a focal point is a separate, later capability.

#### Scenario: Head contributes no bend of its own

- **GIVEN** `headIsolated = true`
- **THEN** the head joint's commanded target is zero at every timestep regardless of drive, amplitude or
  muscle constants

#### Scenario: Isolation defaults off

- **GIVEN** a config that omits `headIsolated`
- **THEN** it resolves to `false` and the head joint is driven by the wave exactly as before

#### Scenario: The rest of the spine is unaffected

- **GIVEN** `headIsolated = true`
- **THEN** no other spine joint's commanded target changes as a direct result of the switch

### Requirement: Harness reports amplitude quality

`scripts/observe.mjs` SHALL report, for every run, the measurements that `animation-roadmap.md` §6
metric 2 gates on:

- The **spread** of per-joint peak angle as a fraction of each joint's own cap: minimum, maximum, mean,
  and maximum minus minimum across the spine joints.
- The **girdle pair**: the peak cap fraction of the front-girdle joint, that of the hind-girdle joint,
  and the ratio between them.
- **Head sweep**: the head node's lateral travel per stroke and the head joint's peak angle as a
  fraction of its cap.
- Each node's sideways travel measured against a **fitted curved centreline** rather than a straight
  axis, so the measurement stays meaningful while the body is turning.

#### Scenario: Reports appear on a normal run

- **GIVEN** `node scripts/observe.mjs run 12`
- **THEN** the console output and the written report both include the spread, the girdle pair, the head
  sweep and the centreline-relative node travel

#### Scenario: Centreline measure survives a turn

- **GIVEN** two runs of the same wave settings, one straight and one with a non-zero `turnBias`
- **THEN** the centreline-relative node travel is comparable between them, rather than inflated by the
  body's curvature in the turning run
