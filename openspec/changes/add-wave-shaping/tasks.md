# Tasks — wave shaping (Phase D-T2)

Scored against `documentation/animation-roadmap.md` §5 Baseline and §6 metric 2. No task is checked
without a capture under `documentation/diagnostics/observe/` showing the number claimed.

**Approval rule.** A preset is added ONLY after the owner has opened its config link in a browser and
approved it. A passing gate is not approval. Observed-but-unapproved configs stay as links and are
recorded in the roadmap. See `.claude/skills/observe-loop`.

**Build rule.** Every app-code change is followed by a production rebuild and restart (`npm run
prod:3002`) before any capture or any link is handed over. There is no hot reload.

## 1. Fix the MuJoCo CPG sampling mapping (blocks everything else)

- [x] 1.1 Done. `this.spine` now takes `k: this.cpgSpec.oscOfSegment[j.childIndex]`. `spineSeg`/`spineGirdleDist` still use the raw `childIndex`, since girdle distance is defined in body-segment space.
- [x] 1.2 Confirmed by reading `buildCpgSpec`: `limbWiring` is remapped through `oscOfSegment` at construction, so `girdleClockPhase` was already reading fine indices and the thrust windows are unaffected by the fix.
- [x] 1.3 Captured both, 12 s at 20 Hz. The fix raises speed **1.06 → 1.36 u/s**, removes a dead spot in the middle of the body (centreline swing minimum 0.58 → 1.25 u), and drops head swing 2.16 → 1.65 u. Config links reported.
- [ ] 1.4 Awaiting the owner. The pre-fix look is NOT reachable by config — the difference is a code fix, not a lever — so the comparison offered is the new state plus the recorded pre-fix numbers, not two live links.
- [x] 1.5 Reported, not retuned. The fixed mapping puts **6 of 10 spine joints at or over their caps** (peak 102%) at the previously approved config. Lowering `muscleAlpha` to de-clip was measured (15 → still 100%, 12 → 80% but speed down to 0.72 u/s and evenness no better) and rejected as the wrong tool: it scales the whole spine when only some joints are over. The profile is the right cure.

## 2. Harness — measure §6 metric 2 before shaping to it

- [x] 2.1 Done — min, max, mean and spread of per-joint peak cap fraction, with the existing per-joint list kept.
- [x] 2.2 Done — front-girdle joint against hind-girdle joint with the ratio, the girdles identified as the joints at girdle-distance zero and ordered along the body.
- [x] 2.3 Done — head joint peak cap fraction, plus the head node's swing against the fitted centreline.
- [x] 2.4 Done — per-frame least-squares **quadratic** fit of lateral offset against arc position, with each node's peak-to-peak residual reported. Quadratic is deliberate: high enough to absorb the gross arc a turn produces, low enough to leave the roughly 1.3-wave undulation as the residual.
- [x] 2.5 ADDED, and it changed the picture. Two extra reports were needed because the cap fraction alone was misleading. **Peak bend per joint in degrees**, because "the hips should rotate approximately equal amounts" is a statement about angles, not fractions. And the **authored angle cap per joint**, which turns out to run 21°–45°, uneven by **2.2×** — so a joint can read 41% of cap while bending further than one reading 101%. Every capture now also saves its per-joint arrays into the JSON, so a run can be re-analysed against a metric that did not exist when it was taken.
- [x] 2.6 Baseline agreement checked, and one §5 number does not carry over: §5's "girdles differ 2 to 1" is a ratio of *implied body speeds* derived from foot motion, not of joint angles. Measured as joint angle the girdle pair is **0.84**, not 0.50. Both are true of the same run; they are different quantities, and only the joint-angle one is what metric 2 gates on.

## 3. The spine amplitude profile

- [x] 3.1 Done — five fields, each defaulting to `1.0`, carried in `pickSimConfig` and confirmed present in a generated link.
- [x] 3.2 Done — `waveProfile?: number[]` on `stepCpg`, with the whole block skipped when the profile is absent, shorter than two points, or entirely ones.
- [x] 3.3 Done — linear interpolation at `k/(n−1)`, applied to both chains at the same position, limb oscillators untouched.
- [x] 3.4 Done — applied after the front/back split and before the left/right side factor.
- [x] 3.5 Done — five sliders labelled with their arc position (nose 0%, shoulder 25%, hip 50%, mid-tail 75%, tail tip 100%), each tip naming what sits there on this rig.
- [x] 3.6 No-op verified. All-ones against the section-1 baseline: travel 16.064 against 16.080 u, identical per-joint cap fractions across all ten joints, head swing 1.652 against 1.650 u. Inside the D-T1 noise floor.

## 4. Head isolation

- [x] 4.1 Done — `headIsolated`, default `false`, carried in `pickSimConfig`.
- [x] 4.2 Done — the head joint is found once at construction as the spine joint with the smallest body-segment index, and its target is written as exactly 0 before the Ekeberg expression is reached.
- [x] 4.3 Done — an "Isolate head" toggle whose tip states plainly that the head is excluded from the wave and is not aimed at anything yet.
- [x] 4.4 Captured both, links reported. The head joint falls from **101% of its cap to 23%**, and it stops being the joint that clips: the peak clipper moves back to the tail. Cost elsewhere is small — the hind girdle drops 84% → 75% and speed 1.36 → 1.28 u/s.
- [x] 4.5 Residual measured and stated. Head node swing against the fitted centreline falls only **1.65 → 1.56 u**, about 5%, exactly as the design predicted: the head stops adding a bend of its own but stays rigid to a neck that still waves. Isolation is not head stabilisation, and the number says so.

## 5. Flatten the envelope

- [x] 5.1 First pass done, four variants captured and reported as links. Best so far is head isolation plus a tail cut (mid-tail and tip both 0.6): girdle ratio **0.84 → 0.94**, bend spread **27.6° → 19.9°**, max/min bend ratio **3.28 → 2.93**. Rejected: two gentler whole-spine cuts, which lowered the mean without moving the peak, because the Ekeberg ratio's response is compressive exactly as the design predicted.
- [x] 5.1b Done, and the answer is negative: **cutting drive further is exhausted.** Four more captures, one
  lever each from the head-isolated tail-0.6 baseline. Cutting the tail harder (0.60 → 0.40 → 0.25) lowers
  only j8–j9 and leaves **j7 pinned on its 22° cap in all three**, while speed falls 0.87 → 0.79 → 0.73 u/s;
  spread 19.9° → 18.5° → 15.6°. Cutting the hip instead (1.0 → 0.75 → 0.55) is worse in every respect: the
  hind girdle *rises* onto its cap (83% → 101%), the girdle ratio moves the wrong way (0.94 → 1.10 → 1.13),
  roll buzz doubles (6.0 → 8.7 → 11.5 reversals/s) and speed collapses to 0.45 u/s. All five rejected.
  **Why.** The front (j1–j4) sits at 10–15° and does not move no matter how much drive is removed behind it,
  so no downward-only profile can reach a uniform 20–21°. Reducing a control point redistributes the bend
  onto its neighbours (the compressive Ekeberg ratio) rather than removing it.
  Aid: `documentation/diagnostics/observe/dt2-51b-drive-cuts.pdf`. Captures `nodes-2026-08-08T13-04-30`
  through `13-08-03`.

- [x] 5.1c **Search the whole shape at once, instead of one lever at a time.** 5.1b showed the profile's
  response is redistributive, so single-lever steps cannot find the shape — the levers only mean anything
  together. Directed by the owner 8-Aug-2026: **raise the global drive and use the five sections to hold
  parts back**, rather than pushing individual sections above 1.0. The existing five control points are
  enough; no new sections are added, so no app code changes and no rebuild is needed.

  **The space, pinned before running.** Fixed across every sample: MuJoCo, drag on, head isolated, legs
  0.1 kg, no thrust/grip/sweep, 12 s at 20 Hz. Varied:
  - `cpgDrive` ∈ {0.39, 0.5, 0.65, 0.85, 1.1} — the global push, raised rather than shaped.
  - `muscleAlpha` ∈ {14, 18, 22} — the muscle gain that converts drive into angle.
  - `waveNose` ∈ {0.6, 0.8, 1.0}, `waveShoulder` ∈ {0.8, 1.0}, `waveHip` ∈ {0.5, 0.7, 0.9, 1.0},
    `waveTailMid` ∈ {0.2, 0.35, 0.5, 0.7}, `waveTailTip` ∈ {0.15, 0.3, 0.5}.
  - Constrained monotone non-increasing shoulder ≥ hip ≥ tail-mid ≥ tail-tip, since the envelope grows
    head→tail and a bulge in the middle is not a shape worth spending a sample on.
  - 48 samples: 4 anchors (the 5.1b baseline, and unshaped at drive 0.39 / 0.65 / 1.1, so the contribution
    of shaping stays visible against pure drive) plus 44 seeded pseudo-random draws. The seed is fixed so
    the sample list is reproducible.

  **Every sample scored on every §6 metric, not on one.** Peak bend per joint in degrees (spread, max/min,
  and the front-girdle-versus-hind-girdle ratio, which is the equivalence the owner named); peak fraction of
  each joint's own cap as the clipping guard; node swing against the fitted centreline; forward speed;
  lateral drift; roll reversals and peak roll.

  **Pass conditions.** No joint at or over its cap; bend spread across joints 2–10 below the 19.9° the
  baseline achieves; girdle ratio nearer 1.00 than the baseline's 1.13; speed not below the baseline's
  0.87 u/s; roll no worse. Where these conflict — and 5.1b showed they do — the trade-offs are presented as
  links and the owner chooses.

  **RESULT — 80 samples run (48 coarse + 32 refined), and the three §6 metrics are measurably in tension.**
  Harness: `scripts/observe-sweep.mjs` (batch) on `scripts/observe-metrics.mjs` (the shared scoring, so a
  sweep row and a single-run report cannot describe the same capture differently). Captures
  `sweep-2026-08-08T13-56-02` and `sweep-2026-08-08T14-08-12`; aid
  `documentation/diagnostics/observe/dt2-51c-sweep.pdf`.
  - **Correlations across all 80:** spread↔speed **+0.58** (an even spine is a slow one),
    spread↔girdle-imbalance **−0.33** (evening the spine makes the girdle pair *less* equal),
    girdle-imbalance↔speed −0.32. The corner where all three are good is empty, and that is now measured
    rather than suspected.
  - **Joint 7 is the binding constraint, confirmed by frequency:** it hit its cap in **35 of 48** coarse
    samples. Its 22° cap sits between neighbours capped at 28° and 30°, in the highest-amplitude part of
    the body, so the whole mid-body has to be suppressed to keep it legal. 56 of 80 samples clipped
    somewhere.
  - **Raising the global drive does not simply raise amplitude.** ν = d·e, so a higher drive also raises
    frequency; past roughly 0.65 the body flutters and travels *less*. The fastest samples sit at moderate
    drive, not the top of the range.
  - **Pushing a section above 1.0 bought nothing**, which settles the owner's stated preference with a
    measurement rather than an assumption. Variant B (shoulder 1.3) lands within 1° of variant A (every
    section ≤ 1.0) on spread, at identical speed and a marginally worse girdle ratio. Recorded so the
    option is not re-proposed.
  - **Four variants handed over**, spanning the trade: A evenest spine (spread 10.5°, girdle 1.49,
    0.32 u/s), B the same via shoulder > 1 (9.8°, 1.45, 0.32), C most cap headroom (14.8°, 1.32, 0.40,
    peak 92% of cap), D most equal girdles (22.2°, **1.11**, 0.65). All four keep every joint under its
    cap, which the baseline does not.
  - **Speed is the price and it is expected**, per task 5.3: nothing legal beats the baseline's 0.89 u/s
    and the even shapes run 0.32–0.65. Thrust is D-T3's lever, not the wave's. Flagged rather than treated
    as a failure — but it does mean §6 metric 3 cannot be judged until D-T3.
  - **Roll rises as the spine evens out**: 6.8/s at peak 0.80° on the baseline against 9–12/s at peak
    1.2–1.6° on the even shapes. Above the ~1° floor where the reversal count degrades into noise, so the
    increase is real and small. Worth watching, not yet worth acting on.

- [x] 5.1d Harness correction found while specifying 5.1c, and it changes the reported numbers.
  Peak bend in degrees was being computed **geometrically**, as the turn angle between adjacent node
  positions. That disagrees with the engine's own joint angle: at the front girdle the engine reads 89% of a
  23° cap (**20.5°**) where the geometry reads **11.2°**, because a node does not sit on its joint frame.
  Degrees are now taken as `peak cap fraction × authored cap`, which is exact by construction and cannot
  disagree with the clipping guard it is reported beside. The geometric figure is kept as a cross-check.
  This is the same failure §7 already records once: a normalised measure standing in for the un-normalised
  one it was assumed to agree with.
  Consequence: the baseline's real numbers are spread **17.0°** across joints 2–10 and girdle ratio
  **1.13**, not the 19.9° and 0.94 reported in 5.1b. Every 5.1b conclusion still stands — none of them
  turned on the absolute value — but 5.1c is gated on the corrected figures.
- [ ] 5.2 Gate: max-minus-min spread of per-joint peak cap fraction reduced against the chosen baseline, the front/hind girdle ratio moved from 2-to-1 toward 1-to-1, no joint at its cap, and head sweep reduced.
- [ ] 5.3 Report the speed change alongside every variant. Flattening the tail removes wave amplitude and will cost speed; that is expected and is D-T3's problem, not a reason to abandon a variant.
- [ ] 5.4 Report whether the head-to-tail phase lag moved as the profile flattened. The design predicts it will, because the multiplier scales frequency as well as amplitude. If the distortion is large enough to change the gait's look, present the muscle-side variant from `design.md` beside it with numbers.
- [ ] 5.5 Present the variants to the owner and record which is chosen and why. Metrics 1, 2 and 3 conflict here by design and the priority is the owner's to set, per §6.
- [x] 5.6 SETTLED 8-Aug-2026 by the owner: **even bend angles**, not even cap fractions. §6 metric 2 rewritten — degrees is the gate, cap fraction stays as the clipping guard only, and both are reported every run.
- [x] 5.7 SETTLED 8-Aug-2026 by the owner: **the caps are frozen and are not a lever.** They are the real range of motion of the printed 3D model, and exceeding one makes that segment clip into its neighbour. The proposal to smooth them into one value per region was rejected on that basis. Consequence, now the concrete target for 5.1b: with joint 7 at 22° binding and the head joint isolated, aim for a **uniform 20–21° bend across joints 2–10**. Lift the front (joints 2–4 currently 11–14°) and hold the tail down (joints 8–9 currently 28–30°). Recorded in §6 and §7.

- [x] 5.1e **Joint 7's cap raised 22° → 28° by the owner, thrust restored, and the §6 conflict turns out to
  have been an artefact of a barely-moving body.** With the cap change the mid-body reads 28/28/28/30/30 and
  the binding joint moves forward to joint 2 at 23°, which is also the front girdle.
  **The headline: on one fixed wave shape, raising thrust from 0 to 4 N per foot improves all three metrics
  at once** — speed 0.32 → 2.85 u/s, bend spread 10.5° → 6.0°, girdle ratio 1.49 → 1.10, nothing clipping.
  The anti-correlations measured in 5.1c (spread↔speed +0.58, spread↔girdle −0.33) held only in the
  no-thrust regime, where the body barely advanced and the drag load on the two girdles was nothing like
  the load it carries while swimming. **Do not cite those correlations as a property of the rig.**
  **Best config so far, and it passes every 5.1c pass condition:** drive 0.39, α14, profile 1/1/0.7/0.5/0.3,
  head isolated, thrust 4, legs 0.1 kg. Joints 2–9 read 20.2–24.3° — the uniform 20–22° target — with
  spread 6.0° against the baseline's 17.0°, girdle 1.10 against 1.18, speed 2.85 against 0.90, path
  curvature 0.53% against 0.82%, nothing at a cap where the baseline over-bends three joints. The one
  regression is roll: peak 1.40° against 0.80°.
  Variants also captured: same shape at thrust 2 (the slower rung), a girdle-targeted shape (ratio 0.84 but
  spread 17.8°) and an amplitude-targeted one (mean bend 22.6°, spread 10.4°). Aid
  `documentation/diagnostics/observe/dt2-thrust.pdf`; captures `sweep-2026-08-08T15-11-03` (the gain ladder)
  and `sweep-2026-08-08T15-32-29` (the finalists, on the corrected harness).

- [x] 5.1f **Three harness defects found and fixed while running 5.1e. Each one had already produced a
  wrong number, and the first two were caught only by disbelieving a result.**
  1. **Thrust gain range taken from the wrong place.** The first 60-sample thrust run used gains 8/16/28,
     read off the slider bounds (−40..40) rather than the range D-T1 actually worked in. The body launched:
     83 units in 12 s, roughly 5 body lengths per second, with head isolation overpowered — the head joint
     read **91% of its cap against the 23% it holds normally**, which is the tell. Calibration puts the
     usable range at 0–6 N per foot. Those 60 samples are void on the thrust axis; their gain-0 rows stand.
  2. **The first run after a page load is not repeatable.** Six identical runs of one config read 8.3° of
     bend spread on the first and 5.9–6.0° on the other five, with speed and girdle ratio identical
     throughout. The MuJoCo driver is built lazily on the first Run, so that sample straddles the build.
     The sweep now runs and discards a warm-up. **Every single-run capture in this change is a first
     sample**, so single-run bend spreads carry up to about 2.4° of error; the batch numbers do not.
  3. **Straightness conflated heading with curvature.** Lateral travel as a fraction of distance reports a
     body swimming dead straight a few degrees off the reference axis as 8% "drift". Splitting it — fit a
     line to the path, report the worst perpendicular deviation — shows the thrust configs curve
     **0.35–0.53%** against the baseline's 0.82%, i.e. straighter, not worse. Both numbers are now reported.
     Without this the best config would have been rejected for a defect it does not have.

- [ ] 5.1g Foot stillness (§6 metric 1) is still not in the batch scorer, so the finalists have not been
  scored on it. It needs the CPG-clocked plant window with SEPARATE front and hind shifts; deriving a window
  from body motion, or sharing one shift, is the error §7 already records. Measure the chosen config on the
  single-run `--events` path, which handles the two girdles correctly, before it becomes a preset.

## 6. Land it

- [ ] 6.1 Add the approved configuration as a preset, carrying its `legWeight` and its measured metric-2 numbers in the description.
- [ ] 6.2 Record the D-T2 result as a dated entry in `documentation/animation-roadmap.md` §7: the numbers, the control points that won, the variants rejected, and the owner's baseline choice from task 1.4.
- [ ] 6.3 Update `documentation/locomotion-handover.md` §5 so the next session reads the achieved state and D-T3 as next.
- [ ] 6.4 Run `openspec validate --strict` and archive.
