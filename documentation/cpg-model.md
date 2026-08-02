# The oscillator model, in plain language

Last settled 2-Aug-2026. What the salamander controller does and why, without equations.
Every number, coupling and formula lives in `reference/locomotion-reference.md`, which
wins any disagreement with this file.

**The one idea**

- Movement is not commanded joint by joint.
- A network of coupled oscillators runs continuously and settles into a rhythm.
- The rhythm becomes body bending, and the bending becomes motion.
- A single scalar, the drive, selects the behaviour.

**One oscillator**

- Each oscillator holds a phase, meaning where in its cycle it currently is.
- Each oscillator holds an amplitude, meaning how strongly it is firing.
- Drive sets both.
  - Higher drive runs the oscillator faster.
  - Higher drive raises the target amplitude, until a threshold.
  - Past the threshold the amplitude collapses toward zero, which is how limbs switch off at speed.

**The network**

- The axial body carries a double chain: one oscillator on the left and one on the right of each segment.
- Left and right of the same segment are held in antiphase, so together they give that joint a signed bend.
- Neighbouring segments are coupled with a small phase offset, so the bend arrives later further down the body.
- The offset produces a wave travelling from head to tail.
- Head-to-tail coupling is deliberately stronger than tail-to-head, which is what makes the wave travel in that direction.
- Four more oscillators drive the limbs, one per leg, coupled to each other and to the axial chain.

**Limbs and gait**

- Each leg is driven by a single oscillator, giving a one-degree-of-freedom sweep at the hip.
- The leg oscillator's phase decides when the leg is in stance and when it is in swing.
- Limb coupling puts diagonal legs in phase and same-girdle legs in antiphase, giving a trot.
- Raising the drive past the limb threshold shuts the limbs down, leaving pure axial undulation.
- That shutdown is why swimming and walking are one system, not two.

**Turning**

- Turning is not a separate mechanism.
- The drive is applied unequally to the left and right sides.
- The stronger side bends and steps further, and the body curves away from it.

**What this project takes and what it replaces**

- Taken: the oscillator equations, the couplings, the drive relationship, and the gait pattern.
- Replaced: everything downstream of the oscillator.
  - The paper converts oscillator output into muscle torques and simulates a physical body.
  - This project instead reads the oscillator as a target bend per joint, applied kinematically.
  - Ground contact is asserted through planted feet, not derived from forces.
- The reason for the replacement, and the geometry that governs the replacement, are in
  `animation-criteria.md`.
