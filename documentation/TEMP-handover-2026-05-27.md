# TEMP Handover — 2026-05-27 — Walkthrough complete; next is the Phase A spec

Transient session pointer. The **durable** plan + understanding lives in
`documentation/animation-roadmap.md`; this file just says *where we are in the process* and
*how we're working*, so the next chat can pick up cleanly. Delete + replace this each session.

## Read order to get back up to speed

1. `documentation/animation-roadmap.md` — the living doc: the plain-language walkthrough
   (§1, now Parts 1–8 complete), decisions (§2), build phases (§3), status (§4). **Start here.**
2. `documentation/locomotion.md` — how the paper maps onto our rig (invariants + L0–L8).
3. `documentation/reference/locomotion-reference.md` — the verified math/params (source of
   truth). §4 now carries the Table 5 muscle constants.
4. The paper itself: `documentation/reference/knusel-2020-salamander-cpg.{pdf,txt}`.

## The goal (unchanged)

A realistic lizard that tracks an object with its head and uses its body + feet to orient
and move toward it, where the motion **emerges** from a faithful recreation of the Knüsel
et al. 2020 salamander CPG + physics — applied to our node-skeleton rig. Adapts to any rig
(variable spine count/lengths; fixed shape: central spine + head + tail + 2 hips, each with
a left & right leg = always 4 legs).

## How we are working (the process rules — keep following these)

- **Walk through the paper one "Part" at a time**, in concise plain language, *before* any
  code. (Parts 1–8 are now done — see below.)
- **Do NOT write a section into the roadmap until the user has confirmed it's correct.**
  Walk it through verbally in chat first; only write on confirmation.
- **Provenance tags on every claim:** `[paper]` (verified from the source),
  `[interp]` (our explanation — consistent but not stated), `[ours]` (our addition). Legend
  is at the top of roadmap §1.
- **Verify against the paper text** (`knusel-2020-salamander-cpg.txt`) whenever a claim goes
  beyond the bare equations.
- Build phases come **after** the walkthrough + the gating decisions, each as its own
  OpenSpec change with a visual verification gate (roadmap §3).

## Exactly where we are

**Walkthrough (roadmap §1) — COMPLETE.** Parts 1–8 are all written, confirmed, and tagged:
- Part 1 (emergence), Part 2 (one oscillator), Part 3 (the network) — confirmed earlier.
- Part 4 (oscillator → motion: the 5-stage muscle→torque→free-body→environment→integration
  pipeline) — written + confirmed 2026-05-27.
- Part 5 (limbs & gait: single oscillator/leg, phase→transfer-function position at 77%
  stance, diagonal trot, limbs fold first into swimming) — written + confirmed 2026-05-27.
- Part 6 (turning = differential drive; five behaviors = drive settings on one network) —
  written + confirmed.
- Part 7 (feedback closes the loop; optional; v1 runs open-loop, `s=0`) — written + confirmed.
- Part 8 (rig mapping) — now fully expanded with the sim/render mapping.

**Decisions (roadmap §2):**
- **Locked 2026-05-27:** 1) planar (2D top-down), 2) custom reduced-order solver,
  3) swimming-first, 4) foot contact emerges from the contact model (no scripted plant/lift).
- **Still pending:** 5) control surface (drive `d` + global `e` multiplier vs single knob —
  settle at Phase H/UI), 6) phase-bias scaling (length-weighted vs uniform — settle when
  building the CPG / L2, lean length-weighted).

**Documentation:** Table 5 muscle constants transcribed into reference §4
(α=0.4, β=1.2, γ=0.2, δ≈0.1). ⚠ The damping `δ` was reconstructed from the Results prose
(stable region 0.05–0.15) + the table cell because the text-layer cell was blank — confirm
the exact figure against the PDF Table 5 screenshot before/while building Phase B.
(`pdftoppm` is not available in this environment, so the PDF could not be rendered here.)

## OpenSpec is now set up

- CLI installed (`@fission-ai/openspec`, v1.3.1). Project **not** formally `init`-ed (no
  `openspec/config.yaml`), but the CLI works off the default `spec-driven` schema. Commands:
  `openspec list`, `openspec status --change <name>`, `openspec validate <name> --strict`,
  `openspec instructions apply --change <name> --json`. Run from the repo root in PowerShell.
- Optional: `openspec init --tools claude` to add `config.yaml` + Claude integration (will
  modify `CLAUDE.md` and regenerate `.claude/skills/openspec-*` — confirm before running).

## Phase A status — implemented, headless-verified, visual gate pending

Change `add-locomotion-body-solver` (validates `--strict`, 33/34 tasks; the 1 open is the
in-studio visual eyeball). What landed:
- `app/game/locomotion/types.ts`, `body.ts` (rig → planar `BodySpec`), `solver.ts`
  (floating-base planar dynamics: full mass matrix, FD-Christoffel Coriolis, joint damping +
  penalty limit-stops, semi-implicit sub-stepped Euler), and updated `useLocomotion.ts`.
- Studio wiring: root group in `AnimateScene.tsx`, sim branch + render mapping in
  `useLocomotion.ts`, minimal Run/Perturb/Reset + diagnostics in `AnimateSidebar.tsx`,
  `simulation` slice in `animateStore.ts`.
- **Verification:** `npx tsx scripts/locomotion-solver-check.ts` (COM conserved, energy
  decays, caps hold, frame-rate independent) and `scripts/locomotion-body-check.ts` both pass;
  `npx tsc --noEmit` clean. **TODO:** open the Simulate tab in the studio, Run + Perturb, and
  confirm visually (chain writhes, COM stays put, settles; Calibrate unchanged).

## Open items / next actions

1. **Finish the Phase A visual gate** in the animate studio (tasks 7.1 + 7.6), then
   `/opsx:archive add-locomotion-body-solver`.
2. **Phase B — CPG + Ekeberg muscles** (next OpenSpec change): build the oscillator network
   (L2) + muscle torques (L3) feeding the existing solver. Body undulates in place, no
   environment.
3. **Confirm the Table 5 damping `δ`** against the PDF (reference §4 flag) before Phase B.
4. **Lock Decision 6** (phase-bias scaling) when building the CPG.

## Codebase state

Foundation unchanged; Phase A added the locomotion solver + a minimal Simulate tab on top.
The **Calibrate tab is untouched** (angle-cap authoring, sliders, save/load). The Simulate tab
now has Run/Perturb/Reset verification controls (Phase A scaffolding; full controls in Phase
H). Rig still renders rest pose until Run is pressed. Home page uses `StaticPosedModel`
(unaffected by the solver). Foundation kept: node skeleton + config schema, mesh loading,
pivot/render scaffolding (`AnimatedModel`), `chain.ts`, `legs.ts`.
