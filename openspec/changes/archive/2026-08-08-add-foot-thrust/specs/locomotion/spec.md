## ADDED Requirements

### Requirement: Foot thrust config levers

`SimConfig` (`app/admin/animate/animateStore.ts`) SHALL carry three additional fields:

- `footThrustEnabled: boolean` — master switch. Default `false`.
- `footThrustGain: number` — signed peak force in newtons applied per foot at maximum backward sweep. Positive propels, negative brakes. Default `0`.
- `footThrustShift: number` — phase offset in cycles locating the start of the back stroke, in `[0, 1)`. Default `0.36` (the measured max-forward-reach phase of the MuJoCo mid wave).

All three SHALL be additive and defaulted, so a `SimConfig` object or a shared `sim=` link that omits them produces behaviour byte-for-byte identical to the prior runtime.

#### Scenario: Omitted fields leave behaviour unchanged

- **GIVEN** a config object with none of the three fields present
- **WHEN** it is applied to the studio
- **THEN** `footThrustEnabled` resolves `false` and no thrust force is applied at any timestep

#### Scenario: Gain of zero applies no force

- **GIVEN** `footThrustEnabled = true` and `footThrustGain = 0`
- **THEN** every per-leg thrust force is the zero vector, and the impulse accumulators stay at zero

### Requirement: Per-foot backward thrust in the MuJoCo runtime

The MuJoCo runtime (`app/game/locomotion/mujocoRuntime.ts`) SHALL, once per physics substep and only when `footThrustEnabled` is true, apply a force to each leg body.

For leg `l` with limb index `i`, hip body `h` (the leg's parent spine segment) and leg body `b`:

```
ph  = girdleClockPhase(state, spec, i)                  // ∈ [0,1), the limb-CPG girdle clock
rel = ((ph − footThrustShift) mod 1 + 1) mod 1          // 0 = max-forward reach, 0.5 = max-backward
w   = max(0, sin(2π · rel))                             // ∝ backward sweep rate; 0 on the forward stroke
f̂   = hip body h's local +x expressed in world, from xquat
F   = −footThrustGain · w · f̂
```

MuJoCo does not clear `xfrc_applied` between steps; the caller owns it. Every leg body's six components SHALL therefore be **zeroed at the start of each substep**, unconditionally, before `F` is written. Accumulating into a slot that is never cleared makes the force grow by one increment per substep and the body diverges within seconds. The unconditional zeroing SHALL also cover the cases where thrust is disabled and where the leg is on its forward stroke, so both genuinely apply no force rather than holding the previous substep's value. The applied torque components SHALL be left at zero.

#### Scenario: Applied force does not accumulate across substeps

- **GIVEN** `footThrustEnabled = true` at a constant gain
- **WHEN** the leg's phase returns to the same value one stroke later
- **THEN** the force written to that leg body is the same magnitude as one stroke earlier, not a multiple of it

#### Scenario: Disabling thrust mid-run applies no residual force

- **GIVEN** a run with thrust active
- **WHEN** `footThrustEnabled` is switched to false
- **THEN** every leg body's applied force is zero on the next substep

The clock SHALL be the same `girdleClockPhase` used by the retired grip windows. No separate oscillator, no measured-velocity clock, and no per-leg phase state SHALL be introduced.

#### Scenario: Thrust is zero across the whole forward stroke

- **GIVEN** `footThrustEnabled = true`, `footThrustGain > 0`
- **WHEN** a leg's `rel` lies in `(0.5, 1)` (the foot is sweeping forward)
- **THEN** that leg's thrust force is the zero vector

#### Scenario: Thrust peaks at mid back stroke

- **GIVEN** a leg sweeping backward
- **WHEN** `rel = 0.25`
- **THEN** that leg's thrust magnitude equals `|footThrustGain|`, and no other value of `rel` produces a larger magnitude

#### Scenario: Direction follows the hip, not a heading

- **GIVEN** a hip segment whose forward axis has yawed by angle `θ` from the world x-axis
- **THEN** the thrust on its legs is directed along `−(cos θ, 0, sin θ)` scaled by `footThrustGain · w`
- **AND** no world heading, travel direction, or body-average axis is read anywhere in the computation

#### Scenario: Negative gain reverses the push

- **GIVEN** `footThrustGain < 0`
- **WHEN** a leg is sweeping backward
- **THEN** the force on that leg points along `+f̂` (forward), decelerating the body

### Requirement: Foot thrust does not disturb the axial wave

Enabling foot thrust SHALL NOT change the joint trajectories produced by the CPG and muscles. No degree of freedom is removed, no equality constraint is activated, and no actuator target is overridden by the thrust term.

#### Scenario: Peak joint load is unchanged by thrust

- **GIVEN** a capture of the MuJoCo swim baseline with thrust off
- **WHEN** the same config is run with `footThrustEnabled = true` at the tuned gain
- **THEN** peak `maxJointFracOfCap` differs by no more than 3 percentage points between the two runs

#### Scenario: No equality constraint is activated

- **GIVEN** `footThrustEnabled = true` and `gripEnabled = false`
- **THEN** the `mjSTATE_EQ_ACTIVE` vector stays all-zero for the whole run

### Requirement: Applied impulse is accounted for by source

`MjDiag` SHALL carry six additional fields: `footImpulseX`, `footImpulseY`, `footImpulseZ`, `dragImpulseX`, `dragImpulseY`, `dragImpulseZ`. Each SHALL be the world-frame vector sum of `force · timestep` over every substep since the run started, accumulated separately for the foot-thrust term and the drag term, over all bodies.

The accumulators SHALL reset to zero when the simulation resets. They SHALL be reported as raw world-frame vectors and SHALL NOT be projected onto any forward direction, since the body has no heading and the travel direction is a measured output rather than a runtime input.

#### Scenario: Drag-only run attributes nothing to the feet

- **GIVEN** `environmentEnabled = true` and `footThrustEnabled = false`
- **THEN** the three foot-impulse components stay at zero while the drag components grow

#### Scenario: Impulse accumulates monotonically in magnitude per source

- **GIVEN** a run with both drag and thrust active
- **WHEN** two diagnostics snapshots are taken at times `t1 < t2`
- **THEN** each source's accumulated impulse at `t2` includes every substep contribution up to `t2`, with no per-frame reset

### Requirement: Observation harness reports the impulse split

`scripts/observe.mjs` SHALL print the accumulated foot-thrust and drag impulse vectors at the end of a run, alongside the existing peak-cap, roll and sweep reports, and SHALL include them in the saved node-capture report.

#### Scenario: Impulse split appears in a normal run

- **GIVEN** `node scripts/observe.mjs run 12`
- **THEN** the console output includes both accumulated impulse vectors
- **AND** the written report file records the same two vectors

### Requirement: A preset reproduces a run absolutely

`SimPreset` (`app/admin/animate/simPresets.ts`) SHALL carry the complete state needed to reproduce a run:

- `config` SHALL be a complete `SimConfig`, not a `Partial`, so no key can inherit from whatever was loaded before.
- `SimPreset` SHALL carry a `legWeight: number`, and applying a preset SHALL write it to every leg group's `nodeWeight`. Leg weight lives in the rig group store rather than in `SimConfig`, and MuJoCo behaviour depends strongly on it, so a preset that omits it is not reproducible.

Applying a preset SHALL be **absolute**: the simulation config is reset to `DEFAULT_SIM_CONFIG` and then the preset is applied. Applying a preset SHALL NOT merge onto the currently loaded values.

#### Scenario: Preset application is order-independent

- **GIVEN** preset A is applied, then preset B, then preset A again
- **THEN** the resulting config and leg weight are identical to applying preset A from a fresh page load

#### Scenario: Preset sets leg weight

- **GIVEN** the leg weight slider is at some arbitrary value
- **WHEN** a preset is applied
- **THEN** every leg group's `nodeWeight` equals the preset's `legWeight`

### Requirement: MuJoCo presets record the approved ladder

The existing MuJoCo presets (`wave-slow`, `wave-mid`, `swim-slow`, `swim-mid`, `timing`, `grip-walk`, `sweep-only`, `grip-sweep-walk`) SHALL be removed — they encode the retired grip direction. The Rapier presets SHALL be left untouched.

MuJoCo presets SHALL be added only for states the owner has opened and approved, one per approved step, and SHALL cover the off / low / high rungs of each lever rather than winners alone. Each description SHALL state the measured coupling, response lag and mean speed that state achieved.

#### Scenario: Applying a preset switches engine and levers together

- **GIVEN** a MuJoCo preset is selected in the studio
- **THEN** the engine switches to MuJoCo and every lever plus the leg weight is applied, so the run matches the capture the preset was recorded from

### Requirement: Grip is retired from the studio surface

The grip controls SHALL be removed from the simulate sidebar, and `gripEnabled` SHALL default to `false`. The grip config fields, the runtime grip path, and the per-foot equality constraints SHALL remain in place and functional, so existing captures and shared links stay reproducible.

The grip timing machinery (`girdleClockPhase`, `gripShift`, `gripDuration`, and the `--events` window reporting) is NOT retired — it is the clock foot thrust is driven from.

#### Scenario: A stored config with grip on still replays

- **GIVEN** a shared link whose config sets `gripEnabled = true`
- **WHEN** it is applied
- **THEN** the grip path runs as before, with no control shown for it in the sidebar
