# CPG swim — Stage 1 of locomotion

## Why

Locomotion is now oscillator-driven and solved kinematically (AZ-218, governed by
`documentation/animation-criteria.md`). Stage 1 of `documentation/animation-roadmap.md` is
swimming: the one behaviour that carries no foot constraints, so the oscillator can be
built and proven on its own before the planted-foot geometry is attempted.

Nothing in this change touches feet, planting or walking. If Stage 2 later fails, the
oscillator, the rig mapping and the pose seam built here remain valid.

## What Changes

- Build the Knüsel oscillator network as a pure module: per-oscillator phase and amplitude
  integrated from the paper's five equations, with the paper's coupling topology, weights
  and constants read from `documentation/reference/locomotion-reference.md`.
- Size the network from the loaded rig rather than the paper's 25 segments, scaling the
  intersegmental phase bias so the total head-to-tail lag is constant whatever the spine
  count.
- Convert oscillator output into a signed bend per axial joint and emit it as a `Pose`, the
  same shape the existing renderer already consumes.
- Add a pose-source seam to `AnimatedDragon` so the same pivot chain can be driven by the
  oscillator instead of interpolated keyframes. The pivot chain, hip attachment and leg
  handling are reused unchanged.
- Advance the creature through water by a closed-form thrust expression evaluated once per
  frame from each segment's sideways velocity. No forces are integrated.
- Add a Locomotion step to the studio with drive as the single control, kept separate from
  the Animate step so the two systems never blur.
- Expose a per-frame observation hook carrying node world positions, so behaviour claims
  can be backed by capture rather than by reading the code.

## Capabilities

### New Capabilities

- `creature-locomotion`: the oscillator network, the rig-to-network mapping, oscillator
  output as a pose, and swimming thrust.

### Modified Capabilities

- `creature-animation`: `AnimatedDragon` gains a pose-source seam so a driver other than a
  keyframe cycle can pose the skeleton.
- `rig-authoring`: the studio stepper gains a fourth step, "Locomotion".

## Impact

- New: `app/game/locomotion/oscillator.ts`, `app/game/locomotion/network.ts`,
  `app/game/locomotion/swim.ts`, `app/game/locomotion/useLocomotion.ts`,
  `app/admin/locomotion/**`, `scripts/check-oscillator.ts`.
- Modified: `app/game/AnimatedDragon.tsx` (pose source), `app/admin/_lib/SidebarShell.tsx`
  (step 4).
- Unchanged: the keyframe runtime, the Animate studio, the rig save path, the node
  skeleton, and every stored rig.
- No migration. Nothing in this change is persisted.
