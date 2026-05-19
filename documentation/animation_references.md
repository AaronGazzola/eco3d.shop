# Animation References

Annotated bibliography for the constraint-solver locomotion system described in `animation_design.md`. Each entry says **what it is**, **what we use it for**, and **what we do not use it for**. The negative entries are load-bearing — they prevent the architecture from regressing toward incompatible models.

---

## Foundational — read these first

### argonautcode/animal-proc-anim

- https://github.com/argonautcode/animal-proc-anim
- Companion video: "Procedural Animation in 5 Minutes" — https://www.youtube.com/watch?v=qlfh_rv6khY

**What it is.** Processing sketches of a fish, snake and lizard rigged on a 2D chain of nodes with distance and angle constraints. A head target drives the chain; the body follows kinematically; legs step alongside when their strain exceeds a threshold.

**What we use it for.** Direct precedent for the whole architecture. The chain math (distance + angle constraints), the foot strain-and-step rule, the head-as-goal pattern — all of these come from argonaut. Our system is argonaut's lizard with two changes: the head's *direction* is the goal instead of its *position*, and the spine-foot coupling is explicit (hip rotation strains feet, stepping unblocks rotation).

**What we do not use it for.** Argonaut's leg-step rule treats feet as independent of the spine — they step when they drift, but they do not constrain or unblock body motion. In our system feet and spine are coupled through the hip-welded constraint, which is what produces emergent diagonal coupling and the visible S-curve of stride. Take the chain math; add the spine-foot interaction.

### zalo — "Constraints"

- https://zalo.github.io/blog/constraints/

**What it is.** Short, visual blog post explaining geometric constraints (distance, collision, volume preservation) as projection operations: "find the minimum movement that satisfies the constraint."

**What we use it for.** The mental model for the whole solver. Every rule in our constraint set is a projection. Iterating them in a loop relaxes the body to a satisfying pose. This is the core paradigm.

**What we do not use it for.** Specific algorithms — we will pick one chain-solving method (FABRIK-like, or a custom iterative projection loop) and stick with it.

### Position-Based Dynamics — Müller et al.

- Original paper "Position Based Dynamics" (2007): https://matthias-research.github.io/pages/publications/posBasedDyn.pdf
- Author's site with later refinements: https://matthias-research.github.io/pages/

**What it is.** A framework for real-time character and cloth simulation where every behavioral rule is expressed as a position-correcting projection, applied iteratively until the system relaxes. Distance constraints, angle constraints, collision constraints, target constraints — all in the same shape.

**What we use it for.** Direct conceptual blueprint for the per-frame solver. Each frame: read goals, compute desired corrections, project onto admissible-pose manifold, iterate until converged (or step budget exhausted). PBD's stability and frame-rate independence are the properties we want for our locomotion.

**What we do not use it for.** Mass / dynamics / physical force integration. We are purely kinematic — there is no momentum, no gravity in the body solver. We borrow PBD's *projection* discipline, not its full physical-simulation pipeline.

### FABRIK and multi-end-effector IK

- "FABRIK: A fast, iterative solver for the Inverse Kinematics problem" — Aristidou & Lasenby (2011): http://andreasaristidou.com/FABRIK.html

**What it is.** A simple, fast iterative inverse-kinematics algorithm: place the end-effector at the target, walk back up the chain maintaining segment lengths, then walk forward from the anchor. Handles joint angle limits naturally. Extensions handle multiple end-effectors.

**What we use it for.** The leg IK in Step 5 onwards (3-joint leg solving from hip to foot). Also useful as a reference implementation for the spine cascade if we choose to phrase it as a multi-anchor chain solve.

**What we do not use it for.** As the *whole* engine. FABRIK alone is a single-chain solver with end-effector targets; our system has additional rules (foot strain → step transition, hip-welded constraint) that sit on top.

---

## Background — biology and biomechanics

We do not implement any of these. They explain why a constraint solver with hip-welded feet produces realistic-looking locomotion — which is useful when something looks wrong and we need to understand whether the rule set itself is incomplete.

### Reilly & Delancey — sprawling locomotion in *Sceloporus*

- *Journal of Zoology*
- https://zslpublications.onlinelibrary.wiley.com/doi/abs/10.1111/j.1469-7998.1997.tb02791.x

**What it is.** Empirical kinematics paper on speed, gait, hindlimb motion, and axial bending in a lizard.

**What we use it for.** Empirical numbers for stride length, foot strain at step initiation, body bend amplitude during walking. Useful when tuning thresholds in Step 9.

### Karakasiliotis et al. — fire salamander muscle activity

- *Integrative Organismal Biology*
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7671131/

**What it is.** EMG study of what axial and limb muscles actually do during walking in a fire salamander.

**What we use it for.** Sanity-check that the body bend during walking is concentrated between the girdles (matches our cascade behavior with planted feet pinning the hips). Reassurance that the visible S-curve we get for free is the visible S-curve a real animal makes.

### Ijspeert et al. 2007 — "From Swimming to Walking with a Salamander Robot"

- *Science*, 315(5817):1416–1420
- https://pubmed.ncbi.nlm.nih.gov/17347441/

**What it is.** A central-pattern-generator robot that produces swimming, slithering, and walking with one architecture and a single drive parameter.

**What we use it for.** **Background only.** Ijspeert's robot is the canonical demonstration that a single mechanism unifies the gaits of fish, salamanders, and lizards. Our solver is not a CPG — it is a kinematic constraint solver — but the *property* we are reaching for (one model, multiple gaits, no per-gait code) is the same one Ijspeert achieves neurally.

**What we do not use it for.** As an implementation reference. Ijspeert solves the problem with oscillators and descending drive; we solve it with constraints and an attractor. The math is different, the architecture is different. Borrow the goal, not the method.

### "Undulatory locomotion" — Wikipedia

- https://en.wikipedia.org/wiki/Undulatory_locomotion

**What it is.** Overview of axial undulation across taxa, with anguilliform / carangiform / subcarangiform terminology.

**What we use it for.** Plain-language vocabulary for talking about the visible body wave that emerges from the cascade. Useful when describing what we want a tuning pass to produce.

---

## Explicitly excluded (do not cite in future docs)

- **Trifox / "Exploring procedural animation in Trifox"** — biped-style foot-planted character. Wrong substrate for sprawling tetrapods; the body shape is treated as decorative rather than load-bearing. Removed from the architecture; do not reintroduce.
- **Roblox IKPF** — humanoid bipedal foot-planting reference. Same category mistake.
- **80.lv "Animating Beasts in Unity" / manipulation-point tutorials** — pose-authoring, not procedural locomotion. Useful for entirely different problems.
- **Skrba et al. 2008 quadruped survey** — survey paper; not a primary reference.
- **Sebastian Lague procedural animation videos** — general procedural-generation content; nothing specific to constraint-based locomotion.
- **Game-industry "motion matching" / motion-capture blending systems** — entirely different problem (selecting from animation libraries based on motion descriptors). Wrong toolset.

These approaches are not wrong in general — they are wrong *for this creature, with this architecture*. Future work that drifts toward any of them is regressing the design.
