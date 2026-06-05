# Locomotion (project design)

This doc describes **how we apply the paper's locomotion model to our rig** — the goal,
the foundation we keep, and how the paper's system decomposes onto our node skeleton.

**Goal:** a **faithful recreation of the Knüsel et al. (2020) salamander system**, applied
to our model. Their locomotion (swimming, terrestrial stepping, underwater stepping,
turning) is the *emergent output* of a CPG controller driving virtual muscles inside a
physics simulation. We recreate that whole pipeline — controller → muscles → body
dynamics → environment forces → motion — so that movement **emerges** the way it does in
the paper, rather than being hand-authored.

> **Math + parameters live in one place:**
> `documentation/reference/locomotion-reference.md` — the verified extraction of the
> source paper. It is the single source of truth. If anything here restates a formula or
> number, the reference wins.

> **Current build state + the staged plan:** see `documentation/animation-roadmap.md`
> (the living plan + decision log + progress). Phases are tracked as OpenSpec changes.

---

## 1. Foundation we keep (the fixed substrate)

These hold for every rig, every frame. They are the *only* things we carry over from the
existing app; everything about locomotion itself comes from the paper.

1. **The node skeleton is the authoring surface.** Each `BodyGroup` carries studio-placed
   node offsets (`nodeFront/Back`, `nodeHipLeft/Right`, `nodeFoot`) and `angleCaps`. Nodes
   are the only thing animation moves.
2. **Bone lengths are constant.** Each body group is one rigid bone; its mesh never
   stretches. To bend mid-piece, split into two groups in the studio — never at runtime.
3. **Hips are welded to the spine.** `nodeHipLeft/Right` are fixed offsets in their owning
   spine group's local frame.
4. **3D meshes are passengers.** STL segments are assigned to groups and rendered
   positioned relative to the node skeleton. Animation never touches meshes directly — and
   the mesh never feeds the *dynamics* either: physical weight is authored per node, not
   derived from mesh size (roadmap Decision 7).
5. **Angle caps are sacred.** Every joint angle written to a pivot is clamped to its
   `angleCaps`. Code may clamp tighter for a frame; it never raises, overrides, or
   substitutes caps. (In a torque-driven body these become joint-limit stops.)
6. **Limbs stay attached** to their hips.
7. **Adapts to any rig.** Variable spine counts and segment lengths; same
   head→spine→tail topology with legs on hip sockets. Physical body parameters are derived
   from the rig: segment length and joint axes from **node geometry**; **mass from an
   authored per-node weight (default uniform across models, independent of the 3D mesh) and
   inertia from that weight + length** (roadmap Decision 7). Never hard-coded per model, and
   never read from the mesh art.

Preserved app surfaces: node authoring (`app/admin/group/*`), the **Calibrate tab**,
`LimitSlider`, angle-cap authoring, `sharedStore`, save/load config, mesh loading, and the
pivot/render scaffolding. Only the **Simulate tab** is being replaced.

> **Note on the old "rule 6" (feet grounded during stance / lift during swing):** that was
> a *kinematic stepping* rule. In the paper, limbs are 1-DOF sweeps and foot–ground contact
> *emerges from the physics*. So in this direction, foot contact comes from the contact
> model, not a scripted plant/lift. Reinterpretation to confirm before the limb phase.

---

## 2. The paper's system, as a pipeline

Their locomotion is produced by this chain (reference §2–§7):

1. **Descending drive `dᵢ`** — scalar tonic input per region (Seg 1–3, Seg 4–25, limbs).
   Sets speed/gait; asymmetry (left/right or rostral/caudal) turns.
2. **CPG network** — coupled phase oscillators: a **left + right oscillator per axial
   segment** (double chain) + **one per limb**. Phase + first-order amplitude equations,
   output `x = r(1+cos θ)`, Table 2 couplings, drive→(frequency, amplitude) saturation.
3. **Actuation** — axial: the segment's two outputs feed an **Ekeberg virtual-muscle pair**
   → a **joint torque** (uses the physical joint angle/velocity). Limbs: phase → a
   **piecewise-linear transfer function** → desired 1-DOF position (77% stance duty).
4. **Mechanical body** — a chain of rigid segments (mass, inertia, length), 1 rotational
   DOF per joint, passive damping. The body is **free in the world**; its pose is
   integrated, not assigned.
5. **Environment forces** — **hydrodynamics** (reactive + resistive) for water; **ground
   contact + friction** for land. These turn body-bending into net translation.
6. **Integration** advances all of the above; **locomotion emerges.**
7. **(Optional) proprioceptive feedback** — joint angles → stretch signals back into the CPG.

The CPG is the "brain"; everything from step 3 down is the body + world. Movement is never
prescribed — it is the integrated result of forces.

---

## 3. Decomposition onto our rig (the layers to build)

- **L0 — Foundation (keep):** node skeleton, caps, mesh-follows-nodes, calibrate, config.
- **L1 — Physical body from the rig:** derive a multibody spec — segment lengths from node
  spacing, **mass from an authored per-node weight (default uniform, mesh-decoupled) and
  inertia derived from that weight + length** (roadmap Decision 7 — *not* from the mesh),
  joint axes at the nodes (axial = 1-DOF yaw; limb = 1-DOF at the hip), joint limits = the
  caps. (This is what makes it adapt.)
- **L2 — CPG controller:** the oscillator network (reference §2–§3, §7).
- **L3 — Actuation:** Ekeberg muscles → axial torques; limb transfer function → limb
  targets (reference §4, §5).
- **L4 — Dynamics solver:** integrate equations of motion under actuation + joint limits +
  damping → joint motion + the body's free-frame motion.
- **L5 — Environment forces:** hydrodynamic (swim) / contact + friction (walk) (reference
  §5; the paper's Webots model uses reactive + resistive hydrodynamics).
- **L6 — Render mapping:** sim joint angles → node-skeleton pivots (clamped to caps); body
  world-pose → root frame; meshes and limbs follow.
- **L7 — (later) feedback:** close the CPG loop (reference §9).
- **L8 — UI:** Simulate-tab controls for this model (drive, behavior/environment, readouts).

---

## 4. Key architecture decisions (to finalize per the handover)

- **Dimensionality** — planar (2D top-down) vs full 3D. *Lean: planar first* (captures the
  in-plane physics that produces locomotion; far more tractable in-browser).
- **Solver** — custom reduced-order vs a physics library. *Lean: custom* (implements the
  paper's exact force laws — Ekeberg muscles, resistive-force hydrodynamics, friction).
- **Environment first** — water vs land. *Lean: swimming first* (cleanest "wiggle → thrust";
  limbs fold, no leg/gait coordination yet).

> "Faithful" means **the same system/equations producing the same kind of emergent
> locomotion, applied to our rig** — not a pixel-match of their specific salamander robot
> (our model has different proportions, segment counts, and caps).

---

## 5. Sources

- **`documentation/reference/locomotion-reference.md`** — verified model; single source of
  truth for all math and parameters.
- **`documentation/reference/knusel-2020-salamander-cpg.pdf`** — the paper (Knüsel et al.
  2020, *Frontiers in Neurorobotics* 14:604426). Open access.
- **`documentation/animation-roadmap.md`** — the living plan, decision log, and the
  plain-language walkthrough of the model. The entry point for this work.
