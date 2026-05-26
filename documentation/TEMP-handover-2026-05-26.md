# TEMP Handover — 2026-05-26 — Continuing the locomotion walkthrough

Transient session pointer. The **durable** plan + understanding lives in
`documentation/animation-roadmap.md`; this file just says *where we are in the process* and
*how we're working*, so the next chat can pick up cleanly. Delete + replace this each
session.

## Read order to get back up to speed

1. `documentation/animation-roadmap.md` — the living doc: the plain-language walkthrough
   (§1), decisions (§2), build phases (§3), status (§4). **Start here.**
2. `documentation/locomotion.md` — how the paper maps onto our rig (invariants + L0–L8).
3. `documentation/reference/locomotion-reference.md` — the verified math/params (source of
   truth).
4. The paper itself: `documentation/reference/knusel-2020-salamander-cpg.{pdf,txt}`.

## The goal (unchanged)

A realistic lizard that tracks an object with its head and uses its body + feet to orient
and move toward it, where the motion **emerges** from a faithful recreation of the Knüsel
et al. 2020 salamander CPG + physics — applied to our node-skeleton rig. Adapts to any rig
(variable spine count/lengths; fixed shape: central spine + head + tail + 2 hips, each with
a left & right leg = always 4 legs).

## How we are working (the process rules — keep following these)

- **Walk through the paper one "Part" at a time**, in concise plain language, *before* any
  code. The Parts are §1 of the roadmap (Part 1 … Part 8).
- **Do NOT write a section into the roadmap until the user has confirmed it's correct.**
  Walk it through verbally in chat first; only write on confirmation.
- **Provenance tags on every claim:** `[paper]` (verified from the source),
  `[interp]` (our explanation — consistent but not stated), `[ours]` (our addition). Legend
  is at the top of roadmap §1.
- **Verify against the paper text** (`knusel-2020-salamander-cpg.txt`) whenever a claim goes
  beyond the bare equations. (We did this for the gait-transition / saturation claim.)
- Build phases come **after** the walkthrough + the gating decisions, each as its own
  OpenSpec change with a visual verification gate (roadmap §3).

## Exactly where we are

**Walkthrough (roadmap §1):**
- **Part 1 (emergence)** — written, confirmed, tagged. (Corrected: head→tail traveling wave
  = swimming; walking body = standing wave.)
- **Part 2 (one oscillator)** — written, confirmed, tagged. (Gait-transition claim verified
  against the paper = its Hypothesis 3; robot torque-limit caveat recorded.)
- **Part 3 (the network)** — written, confirmed, tagged. Includes the length-weighted
  phase-bias rig-adaptation point.
- **Part 8 (mapping onto our rig)** — *seeded* with the 4 adaptation rules (same topology
  any size · physical numbers from rig · length-weighted phase bias · hips/legs by
  position). To be fully expanded later.
- **Part 4 (oscillator → motion)** — ⚠ **walked through verbally in chat but NOT yet
  written or confirmed.** This is the immediate next action. Summary of what was covered:
  the 4-stage pipeline — (1) output→activation with 10 ms delay; (2) Ekeberg virtual-muscle
  pair → joint **torque** `Tᵢ = α(Mˡ−Mʳ) − β(Mˡ+Mʳ+γ)φᵢ − δφ̇ᵢ` (active + variable-stiffness
  spring + damping; torque, not a commanded angle); (3) free rigid-body chain (no root — this
  is why the paper needs no render root and we do); (4) **environment forces** = the crux:
  water = reactive + resistive (anisotropic drag → thrust), land = contact + friction;
  (5) integration → emergence. This is the layer the old kinematic version faked.

**Parts still to walk through:** 4 (confirm + write), 5 (limbs & gait), 6 (turning &
behaviors), 7 (feedback), then expand 8.

## Open items / next actions

1. **Confirm + write Part 4** into roadmap §1 (with tags). First thing next session.
2. **Decisions 1–3 not locked.** Part 4 forces them; recommendation on the table:
   **planar (2D) + custom reduced-order solver + swimming-first.** Decisions 4 (rule-6
   reinterpretation), 5 (control surface: drive + global-`e` sliders), 6 (length-weighted
   phase bias) are also pending in roadmap §2. Lock them as we go; record reasoning in §2.
3. **Documentation gap — transcribe Table 5** (muscle constants `α, β, γ, δ`) from the PDF
   into `locomotion-reference.md`. Only `α ≈ 0.4` (swimming) is in our notes so far. Needed
   before building Part 4 / Phase B.

## Codebase state

Clean slate. Old kinematic animation removed; rig renders its **rest pose**; the
**Calibrate tab fully works** (angle-cap authoring, sliders, save/load). The **Simulate tab
is a placeholder** pointing at the roadmap. No locomotion runs yet. Foundation kept: node
skeleton + config schema, mesh loading, pivot/render scaffolding (`AnimatedModel`),
`chain.ts`, `legs.ts`, `useLocomotion.ts` reduced to rest-pose + Calibrate preview.
