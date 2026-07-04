# Locomotion handover — observation harness + paper-grounded walk

Status as of 2026-06-29. Working branch `feat/locomotion-isolation-harness` (off `dev`). This captures
the goal, what was built, what is proven, the current diagnosis, and the next decision, so the work can
resume without re-deriving it. Companion records: `documentation/animation-roadmap.md` (phases A-H,
decisions), `documentation/reference/knusel-2020-salamander-cpg.{pdf,txt}` (the paper),
`documentation/observation-loop.md`, and the `.claude/skills/observe-loop` skill.

## 1. Goal and approach

Make the dragon walk like a real lizard, built in small, **observable** steps measured against the
Knusel et al. 2020 salamander CPG paper. Each change is verified visually + numerically before the next.
Evolution pathway: stable walk -> turn left/right -> seek/flee a (moving) target.

Method = the **observation loop** (see the skill): isolate the thing of interest, drive the real studio
headlessly, capture focused signals (top-down node skeletons, phase metrics), change ONE lever, compare
to the paper, report with a one-click demo link + a dark vertical visual aid, then iterate.

## 2. The observation harness (what was built)

In-app (`/admin/animate`), the `window.__studio` hook (`app/admin/animate/AnimateScene.tsx`) and the
`window.__locObs` per-frame snapshot (`app/game/locomotion/useLocomotion.ts`) drive and read the sim.

- **Increment A (shipped, verified live):** freeze-frame / slow-mo / step-forward, a full-config-in-URL
  shareable link (`?tab=&sim=<base64 SimConfig>&overlay=`), and `window.__studio` methods
  `pause/play/frameStep/speed/setOverlays/isolateLimb/buildLink/copyLink`. View state in `animateStore`
  (`frozen`, `playSpeed`, `overlays`, `isolateLimb`, `simTime`). 10/10 live checks passed.
- **Increment B (overlays):** `LocomotionOverlays` in `AnimateScene` draws, from `__locObs`, the
  `stance` overlay (feet green=pinned / amber=stance / red=swing) and `wave` overlay (max-forward-reach
  markers); `isolateLimb` ghosts the body. `__locObs` publishes per-frame: per-leg phase/stance/gripped,
  foot + hip + max-forward-reach world positions, and the trunk skeleton (publishes even with legs off).
- **NOT yet built:** deterministic `seek(t)` + `?t=` (replay to a sim-time); captures are therefore not
  perfectly reproducible run-to-run, so absolute magnitudes drift while qualitative findings are stable.

### Config levers added this cycle (all in `SimConfig`, `animateStore.ts`)

- `legClock`: `'body' | 'limb' | 'time'`. Clock for grip+sweep. `body` = measured body-wave phase
  (old default); `limb` = limb CPG (diagonal trot); `time` = independent sim-time oscillator with a
  diagonal-trot offset (lets the legs run with the CPG off). `stepFreqHz` sets the time clock rate.
- `sweepReverse`: flips the stance sweep direction (normal sign confirmed correct).
- `bodyWaves`: the axial intersegmental phase lag in cycles = the paper's gait signature.
  **1.58 = traveling wave (swim); 0 = standing wave (terrestrial walk/trot).** Wired through
  `buildCpgSpec(..., bodyWaves)` in `cpg.ts`; rebuilds the CPG on change. Sidebar slider "Body waves".
- `stanceMuscleBoost`: phase-gated axial active-gain boost during stance (spine pushes harder while feet
  are planted). Default 0 = unchanged. (Built in the `add-stance-phase-spine-drive` change.)

### Observe scripts (run from PowerShell; server on 127.0.0.1:3002)

- `scripts/observe-skeleton.mjs` — 3-condition top-down skeleton slideshow.
- `scripts/observe-step.mjs` — one foot's grip window, 10 snaps, multi-step compare, representative pick.
- `scripts/observe-mech.mjs` — the two isolation tests (leg pull / writhe).
- `scripts/observe-trot.mjs` — diagonal-trot leg-pull node map (legs only).
- `scripts/observe-spine.mjs` — **spine phase-lag monitor**: per-segment curvature phase vs the paper's
  standing(0)/traveling(1.58) targets (currently set to sweep `bodyWaves`).
- `scripts/observe-combine.mjs` — standing spine + diagonal-trot legs together; forward/lag/tilt + node map.
- `scripts/observe-stride.mjs` — **one FL stride up close**: girdle bend (convex/concave) + leg line.
- `scripts/observe-cycle.mjs`, `scripts/observe-wave.mjs` — earlier walk-cycle / standing-vs-traveling tools.

All emit dark-mode vertical aids (note left, image right) under `documentation/diagnostics/<tool>/`
(gitignored) plus a one-click studio link.

## 3. What is proven (with numbers)

- **Legs pull (diagonal trot, CPG off):** `legClock=time`, all 4 feet, body straight. Forward +2.56 to
  +2.73 over ~8s (~0.35 u/s), lateral ~0 (the diagonal pair cancels the per-foot lateral push), tilt <2deg.
  A SINGLE foot only pivots/veers (one anchor cannot stop yaw) — the diagonal pair is the valid unit.
- **Spine standing wave achievable:** isolated spine, sweeping `bodyWaves` 1.58 -> 1.0 -> 0.5 -> 0.0 gives
  mechanical lag 1.02 -> 0.85 -> 0.44 -> **0.01 (STANDING)**. This DISPROVES the old "standing wave is a
  dead end" note — driving the CPG phase bias to 0 directly reaches it cleanly (the old failure was
  fighting the limb coupling). Metric validated: swim reads lag ~1.0+ (traveling), matching the paper.
- **Combine (standing spine + diagonal-trot legs):** `bodyWaves=0`, `legClock=time` freq-matched to the
  body, limb oscillators off, `gripShift` phase-tuned. Forward +4.76 (~0.5 u/s, faster than legs-alone),
  spine lag -0.07 (standing, matches paper), tilt 1.6deg, clean diagonal trot. The relative phase
  (legs vs body wave) is the lever: a `gripShift` sweep flips it from backward to +3.0 forward.

## 4. The paper target (the measuring stick)

Knusel 2020 characterizes gait by **intersegmental phase lag** (Fig 2C, trimodal): positive = traveling
wave = swim; **zero = standing wave = terrestrial walk/trot**; negative = backward. Our walk historically
used a traveling wave (lag ~1.0) = "swimming on land". Win condition for the walk spine = **lag ~ 0
(standing)**, measured by `observe-spine.mjs` via per-segment **curvature** (translation/rotation
invariant, like the paper's joint angles).

## 5. Current diagnosis (the open problem)

`observe-stride.mjs` on the combine walk, one FL grip window: the leg works (foot pinned, hip arcs over
it, body advances 0->0.46 across the step) but the **FL girdle bend stays ~5deg convex the whole stance —
it never flips convex->concave.** A forceful lizard step needs the girdle to swing **convex at plant ->
concave at release** (the girdle yaw that extends stride and the spine push that drives the body forward).

Two causes:
1. With `bodyWaves=0` the standing wave is one symmetric whole-body C: antinode mid-body, **nodes near
   the girdles** — so the girdle (the most important joint) is where the bend is smallest.
2. The **limb->axial coupling is off** (limbCpg off), so nothing actively rotates the girdle in time with
   the step.

A passive standing wave cannot produce a forceful step: the girdle bend must be **driven by the step**.

### Design note (settled): keep the fixed grip pin

The grip is a spherical-joint pin of the foot to a fixed ground anchor (rubber-foot-on-stiff-leg). This is
correct and biologically faithful — real lizard feet plant and do not slip; friction would creep (wet-tile
look). The pin is NOT the problem; it holds (slip ~0.006) and the diagonal trot pulls forward with it.

## 6. Next decision (recommended: Option A)

To make the girdle swing convex->concave forcefully, drive the spine FROM the step. Two ways:

- **Option A (paper-faithful, recommended):** re-enable the **limb->axial coupling** (limbCpg on,
  `legClock='limb'` so legs + girdle bend share one CPG and are auto-coordinated). The coupling
  (`cpg.ts`, limb->axial `w=30, phi=4` at the girdles) rotates each girdle convex as its leg plants,
  concave as it retracts. Add **`stanceMuscleBoost`** so the stance-side spine contracts forcefully.
  Tasks: re-find the forward leg phase on the limb clock (single-foot limb-clock went backward until
  phased), expose/tune the limb->axial `phi` for convex-at-plant, raise `muscleAlpha` + `stanceMuscleBoost`
  for swing size + force. Verify with `observe-stride.mjs` (girdle should swing ~0.3-0.6 rad convex->concave)
  AND `observe-spine.mjs` (keep whole-body lag near standing). Risk: more coupled knobs to co-tune; the
  `w=30` coupling can over-pull toward a traveling wave — balance the two measured signals.
- **Option B (direct, fallback):** add a dedicated phase-gated girdle-yaw drive locked to each stance leg,
  independent of the standing wave. More direct control, a new non-paper mechanic (flag it).

## 7. OpenSpec + governance status

- `openspec/changes/add-locomotion-isolation-harness` — Increment A + B implemented (tasks checked).
  `seek` + `?t=` remain (Increment B group 7/9). Run `openspec-verify-change` before archiving.
- `openspec/changes/add-stance-phase-spine-drive` — `stanceMuscleBoost` implemented; its observation
  (back-loaded single-foot pull) was superseded by the diagonal-trot finding. Revisit/retune under
  Option A, then archive.
- Stage 2 (turning) = promote Linear `AZ-79`; Stage 3 (target seeking) = promote `AZ-81`.
- No new gait capability spec written yet for the standing-wave walk; once Option A lands a real walk,
  capture it as an OpenSpec change before archiving.

## 8. How to run

From PowerShell (NOT the bash sandbox — it resets Supabase auth), with the studio as a prod build:

```
doppler run -- npx --no-install next build
# start detached on 3002:
Start-Process doppler -ArgumentList 'run','--','npx','--no-install','next','start','-p','3002' -WindowStyle Hidden
node scripts/observe-combine.mjs        # or any observe-*.mjs
```

Rebuild after any app code change (the studio is a prod build). Auth is cached in
`scripts/.observe-auth.json`; rig = "baby cyber dragon". Forward axis = **-X** (confirmed via a known
swim). Lateral = Z.

## 9. Key files

- `app/admin/animate/animateStore.ts` — `SimConfig` (all levers), view slice, `encode/decodeSimConfig`.
- `app/admin/animate/AnimateScene.tsx` — `window.__studio`, `LocomotionOverlays`.
- `app/admin/animate/AnimateSidebar.tsx` — Simulate controls (playback, overlays, leg clock, body waves, etc.).
- `app/admin/animate/page.tsx` — URL param parsing.
- `app/game/locomotion/useLocomotion.ts` — the sim loop, `legPhaseOf`, grip/sweep, `__locObs` publish.
- `app/game/locomotion/cpg.ts` — `buildCpgSpec(..., bodyWaves)`, limb->axial coupling (`w=30, phi=4`).
- `app/game/locomotion/body3d.ts` — hip joints (vertical sweep axis, `capStance/capSwing`, foot pin).
