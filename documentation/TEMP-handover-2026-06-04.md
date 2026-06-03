# TEMP Handover — 2026-06-04 — Phase A + Phase B + Phase C complete; next is Phase D (walking)

Transient session pointer. The **durable** plan + understanding lives in
`documentation/animation-roadmap.md`; this file just says *where we are in the process* and
*how we're working*, so the next chat can pick up cleanly. Delete + replace this each session.

## Read order to get back up to speed

1. `documentation/animation-roadmap.md` — the living doc. **§4 Status** is freshly updated
   through Phase C (2026-06-04 entry). The §1 walkthrough (Parts 1–8) is unchanged from
   the prior handover. Start here.
2. `documentation/reference/locomotion-reference.md` — verified math/params.
3. The paper: `documentation/reference/knusel-2020-salamander-cpg.{pdf,txt}`.
4. The archived OpenSpec changes under `openspec/changes/archive/` — each phase has its own
   change folder (proposal, design, tasks, specs) describing what was built and gated:
   - `2026-05-28-add-fk-renderer-phase-a2/`
   - `2026-05-29-add-zero-force-solver-phase-a3/`
   - `2026-05-29-add-joint-damping-limits-phase-a4/`
   - `2026-06-02-add-cpg-network-phase-b1/`
   - `2026-06-02-add-ekeberg-muscles-phase-b2/`
   - `2026-06-04-add-cpg-muscle-coupling-phase-b3/`
   - `2026-06-04-add-environment-phase-c/`

## Exactly where we are

**Phase A — DONE.** A2 (FK renderer), A3 (zero-force solver), A4 (joint damping + soft
limit stops). Body model + passive solver shipped and gated.

**Phase B — DONE.** B1 (CPG axial double-chain network), B2 (Ekeberg muscles + test
sinusoid), B3 (couple CPG → muscles → body). Verified at `drive=1.0, exc=1.0`: CPG produces
clean head→tail traveling wave; muscle test produces bounded oscillation that springs back
on pause; B3 couples them, body undulates head-anchored / tail-whip-style (no environment).

**Phase C — DONE (with a rig-morphology limitation).** Anisotropic resistive-force drag
implemented per paper. Every spec requirement passes mechanically. **But the visual
swimming gate is not achievable on this rig**: the rig is a four-legged lizard with
head mass ≈10× tail mass (head segment mass 78.7 vs tail segments 7–22). Knüsel /
Lighthill RFT assumes a uniformly-massed body that bends as a continuous traveling wave.
Our rig instead collapses into a head-anchored / tail-whip mode and produces near-zero
or wrong-direction net thrust. Tuning constants does not fix it (the limitation is
morphological, not parametric). Full constants + tuning attempts are documented in the
roadmap §4 entry dated 2026-06-04. **This is a real finding, not a regression — Phase C
would re-test on an eel-shaped rig.**

Final Phase C constants: `DRAG_NORMAL = 30, DRAG_TANGENT = 2.5, DRAG_ANGULAR = 1.5,
CPG_TO_MUSCLE_GAIN = 80`.

## How we are working (the process rules — keep following these)

Same as before. The new addition is in `CLAUDE.md` (user-authored, 2026-06-04): the
"Spec & task governance" section. Read it. Key rules:

1. Active OpenSpec changes are **build-now-only** — no future / blocked tasks left
   unchecked.
2. Non-code work goes to Linear, not into `tasks.md`.
3. Archive when code-complete + verified.
4. Linear is the idea channel; never implement directly from Linear.
5. No silent checking of task boxes.

## Where to continue

**Next: Phase D — Walking (limbs + ground contact + friction).** The lizard rig was
authored for walking, not undulatory swimming. Phase D adds:

- Per-leg single-oscillator CPG (one oscillator per leg, not the left/right pair the
  axial segments use; reference §3 / roadmap Part 5).
- Transfer function: oscillator phase → leg position at 77% stance duty (roadmap Part 5).
- Diagonal trot coordination between the four legs (roadmap Part 5).
- Ground contact: normal force / no penetration + tangential friction (roadmap Part 5 /
  Part 4 Stage 4 *Land*).
- Limbs do **not** flow through the full Ekeberg torque path — they use the transfer
  function directly (roadmap Part 5).
- The axial CPG / Ekeberg / body solver from Phase B stays as-is and is reused.
- The Phase C environment toggle stays as-is; Phase D adds a separate land-contact path
  (drag environment is for water; ground contact is for land — exclusive in a single
  scene but both can coexist as toggles).

No Phase D OpenSpec change exists yet. The next step is to draft one (proposal + design +
tasks + specs) before any code. Roadmap Part 5 already has the math; the proposal mostly
just translates that into a build plan + visual gate (the body walks forward).

## What is uncommitted / unpushed

**Local main is 2 commits ahead of `origin/main` (Phase B3 + Phase C).** The push has been
blocked by Auto Mode in both prior turns (classifier denies direct push to main; suggests
feature branch + PR). The commits themselves are safe locally. To publish:

```
git push origin main
```

(run by the user, since the agent is blocked from pushing to main).

## Files touched in the last session

- New: `app/game/locomotion/cpg.ts`, `app/game/locomotion/muscles.ts`,
  `app/game/locomotion/environment.ts`
- Modified: `app/game/locomotion/solver.ts` (added `jointTorques`, `jointDampingScale`,
  `environmentEnabled` to `stepSolver`; exported `computeKinematics`),
  `app/game/locomotion/useLocomotion.ts` (added CPG preview / muscle test / coupled
  branches; mutual-exclusion logic),
  `app/admin/animate/animateStore.ts` (added `cpgRunning`, `muscleTestRunning`,
  `coupledRunning`, `environmentEnabled` + setters),
  `app/admin/animate/AnimateSidebar.tsx` (added CPG, Muscle test, B3 coupled, and
  Environment blocks),
  `app/game/locomotion/diagnostics.ts` (added CPG capture + coupled capture serializers)
- `documentation/animation-roadmap.md` §4 — three new dated entries (2026-06-02 B1, B2;
  2026-06-04 B3, C)
- `openspec/specs/locomotion/spec.md` — synced deltas from B1 (5), B2 (4), B3 (4), C (5)
  = **32 requirements total**

## Anything the next agent should re-check before building Phase D

1. **Verify Phase B + C still work end-to-end** in the browser before adding limbs. The
   coupled B3 mode should still produce a clean head→tail wave on the body; the
   environment toggle should still produce (broken) translation. If either is broken,
   something regressed in this session that we missed.
2. **Decide whether to keep the environment toggle as a global preference or move it into
   a Phase D land/water radio.** The current toggle is on/off for water drag; Phase D
   adds ground contact. They are mutually exclusive in physical reality (the lizard is
   on land OR in water, not both). A three-state radio (off / water / land) might be
   cleaner than two independent toggles.
3. **The mass-distribution finding from Phase C is a constraint on Phase D too** — the
   lizard's heavy head means the body wave on land will also have the tail-whip
   character. That is fine for walking (legs do the propulsion; the body wave is just
   reach), but worth keeping in mind when tuning.
