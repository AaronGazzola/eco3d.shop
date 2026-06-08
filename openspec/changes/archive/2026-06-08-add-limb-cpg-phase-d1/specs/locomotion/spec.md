# Locomotion — Phase D1 limb CPG (delta)

## ADDED Requirements

### Requirement: Four limb oscillators with faithful parameters

The CPG SHALL include four single limb oscillators (left-fore, right-fore, left-hind, right-hind)
appended to the axial double chain, with per-limb excitability (fore `e=0.8`, hind `e=0.5`) and limb
saturation threshold (`d_th≈1.27`) per the reference.

#### Scenario: Limb oscillators present and parameterised

- **WHEN** the CPG spec is built for a rig with four legs
- **THEN** four limb oscillators exist with fore/hind excitability `0.8`/`0.5` and limb threshold
  `1.27`, distinct from the axial `1.1`/`3`

### Requirement: Diagonal-trot gait emerges from interlimb couplings

The four limb oscillators SHALL be coupled by the reference Table 2 interlimb weights (lateral `w=10`,
rostrocaudal `w=3`, caudorostral `w=30`, all `φ=π`) such that a diagonal-trot phase relationship
emerges without per-limb phases being set by hand.

#### Scenario: Diagonal pairs lock in antiphase

- **WHEN** the limb oscillators run with the Table 2 interlimb couplings
- **THEN** left-fore + right-hind settle in phase, antiphase to right-fore + left-hind (the diagonal
  trot), with the hind legs leading

### Requirement: Limb↔axial coupling pulls the trunk toward a standing wave

Each limb SHALL couple to its girdle axial segment (limb→axial `w=30, φ=4`; axial→limb `w=2.5, φ=−4`)
so that active limbs shift the axial rhythm toward a standing wave.

#### Scenario: Trunk wave responds to active limbs

- **WHEN** the limbs are active and coupled to the girdle segments
- **THEN** the axial head→tail phase lag shifts toward a standing wave relative to the swimming
  traveling wave

### Requirement: Limbs saturate before the axis

Because limbs have lower excitability and a lower saturation threshold, raising the drive SHALL drive
the limb amplitudes to zero before the axial amplitudes.

#### Scenario: Limbs fold first at high drive

- **WHEN** the descending drive is raised past the limb saturation threshold (≈1.27) but below the
  axial one (3)
- **THEN** the limb oscillator amplitudes collapse toward zero while the axial oscillators keep
  oscillating
