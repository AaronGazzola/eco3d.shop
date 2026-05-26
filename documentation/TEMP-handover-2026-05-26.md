# TEMP Handover — 2026-05-26 — Faithful physics recreation of the paper's locomotion

**Status: clean slate.** The previous kinematic CPG animation has been removed. The rig
now renders statically (rest pose) and the Calibrate tab still fully works. This document
is the entry point for rebuilding locomotion as a **faithful recreation of the Knüsel et
al. 2020 salamander system**, applied to our node-skeleton rig.

Read these together, in order:
1. This file (goal + process + what's left in the codebase).
2. `documentation/locomotion.md` (foundation we keep + the paper pipeline + the L0–L8
   decomposition + the open architecture decisions).
3. `documentation/reference/locomotion-reference.md` (the verified paper extraction — the
   single source of truth for every equation, coupling, and parameter).

---

## The goal

Recreate the paper's **complete locomotion system** and apply it to our model:
descending drive → **CPG** → **Ekeberg virtual muscles** → **multibody rigid-body
dynamics** → **environment forces (hydrodynamic / ground contact)** → emergent motion,
with optional proprioceptive feedback. Movement must **emerge** from integrated forces,
exactly as in the paper — not be hand-authored.

"Faithful" = the same model/equations producing the same *kind* of emergent locomotion on
*our* body. It will not pixel-match their specific robot (different proportions, segment
counts, caps).

## Hard constraints (from the app — never violated)

Only these carry over from the existing app; everything else about locomotion is from the
paper. Full list in `locomotion.md §1`. In short:
- The **node skeleton** is the only thing animated; **3D meshes follow the nodes**.
- **Angle caps are sacred** (clamp every applied joint angle; they become joint limits).
- **Limbs stay attached**; bone lengths constant; hips welded to spine.
- **Adapts to any rig** — body parameters (length, mass, inertia, joint axes, limits) are
  **derived from the rig geometry**, never hard-coded per model.
- **Keep** node authoring, the Calibrate tab, `LimitSlider`, angle-cap authoring,
  `sharedStore`, save/load. Only the **Simulate tab** is being rebuilt.
- Old "rule 6" (scripted foot plant/lift) is **reinterpreted**: foot contact emerges from
  the physics contact model. Confirm before the limb phase.

## The decomposition (build layers — see `locomotion.md §3`)

L0 foundation (keep) · L1 physical body derived from rig · L2 CPG controller · L3 actuation
(muscles + limb transfer) · L4 dynamics solver · L5 environment forces · L6 render mapping
(sim → node skeleton, clamped to caps) · L7 feedback (later) · L8 UI.

## Architecture decisions to finalize first (they gate everything)

Recorded in `locomotion.md §4` with the leaning recommendation for each:
1. **Planar (2D top-down) vs full 3D.** Lean: planar first.
2. **Custom reduced-order solver vs physics library.** Lean: custom (the paper's exact
   force laws).
3. **Swimming first vs land first.** Lean: swimming first (cleanest "wiggle → thrust").
4. **Confirm the rule-6 reinterpretation** (physics contact, not scripted lift).

Decide these before writing the first phase spec.

## Intended process (how to proceed in the next session)

Work **one phase at a time**, each as its own **OpenSpec change** (proposal → design →
spec → tasks), each ending in a **visual verification gate** in the studio before the next.
Suggested phase order (refine as you go):

- **Phase A — Body model + minimal solver:** derive the multibody body from the rig (L1);
  stand up a minimal dynamics integrator (L4) with no actuation; verify the passive chain
  behaves and respects joint limits.
- **Phase B — CPG + muscles:** rebuild the CPG (L2) from the reference, add Ekeberg muscles
  (L3 axial) → torques into the solver; verify the body undulates under muscle drive (in
  place, no environment).
- **Phase C — Swimming:** add hydrodynamic reactive+resistive forces (L5 water); verify it
  **swims forward** — first emergent locomotion.
- **Phase D — Walking:** add limbs (transfer function + limb joints) + ground contact +
  friction (L5 land); verify terrestrial stepping.
- **Phase E — Turning + behaviors:** differential drive; behavior presets matching Table 4.
- **Phase F — Feedback (optional):** close the CPG loop (reference §9).
- **Phase G — UI:** rebuild the Simulate tab for this model.

Map each phase to the layers in `locomotion.md §3`; pull all math/params from the reference.

---

## What the cleanup removed (and what remains)

**Removed (kinematic-approach code + Simulate UI):**
- `app/game/locomotion/cpg.ts`, `foot.ts`, `diagnostics.ts`, `headGaze.ts` (deleted).
- `chain.ts`: removed `buildCascadeChain` (kinematic chain ordering).
- `useLocomotion.ts`: reduced to **rest pose + the Calibrate preview path** only.
- `AnimatedModel.tsx`: removed foot markers.
- Simulate-tab UI + its plumbing: drive slider, time-scale, diagnostics/recording/playback,
  attractor — removed from `AnimateSidebar.tsx`, `AnimateScene.tsx`, `animateStore.ts`.
- OpenSpec: removed the superseded `rebuild-cpg-locomotion` and
  `invert-locomotion-foot-anchored` changes. (Other older changes left as history; archive
  if desired.)

**Kept (foundation + reusable):**
- Node skeleton + config schema (`app/admin/_lib/types.ts`), node authoring, mesh loading.
- Rendering scaffolding (`AnimatedModel`, `useStlSegments`); `useLocomotion.ts` reduced to
  rest pose + the Calibrate preview path.
- `chain.ts` (skeleton tree, flatten, `effectiveAngleCaps`, default caps) and `legs.ts`
  (hip/leg lookup) — foundational utilities.
- Calibrate tab, `LimitSlider`, angle-cap authoring, `sharedStore`, save/load.

**Recoverable if needed:** the previous faithful CPG implementation and the single-bone
leg IK (`applyLegBone`) live in git history (commit `f01006f`: `cpg.ts`, and the old
`useLocomotion.ts`) and can be lifted when rebuilding L2 / the render-mapping layer — but
the reference doc is the authoritative source.
