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
- [ ] 5.1b Continue from the tail cut. Three joints still clip (arc 0.58–0.76, between the hip and mid-tail control points), so the next variant cuts that span harder rather than cutting the whole spine.
- [ ] 5.2 Gate: max-minus-min spread of per-joint peak cap fraction reduced against the chosen baseline, the front/hind girdle ratio moved from 2-to-1 toward 1-to-1, no joint at its cap, and head sweep reduced.
- [ ] 5.3 Report the speed change alongside every variant. Flattening the tail removes wave amplitude and will cost speed; that is expected and is D-T3's problem, not a reason to abandon a variant.
- [ ] 5.4 Report whether the head-to-tail phase lag moved as the profile flattened. The design predicts it will, because the multiplier scales frequency as well as amplitude. If the distortion is large enough to change the gait's look, present the muscle-side variant from `design.md` beside it with numbers.
- [ ] 5.5 Present the variants to the owner and record which is chosen and why. Metrics 1, 2 and 3 conflict here by design and the priority is the owner's to set, per §6.
- [x] 5.6 SETTLED 8-Aug-2026 by the owner: **even bend angles**, not even cap fractions. §6 metric 2 rewritten — degrees is the gate, cap fraction stays as the clipping guard only, and both are reported every run.
- [x] 5.7 SETTLED 8-Aug-2026 by the owner: **the caps are frozen and are not a lever.** They are the real range of motion of the printed 3D model, and exceeding one makes that segment clip into its neighbour. The proposal to smooth them into one value per region was rejected on that basis. Consequence, now the concrete target for 5.1b: with joint 7 at 22° binding and the head joint isolated, aim for a **uniform 20–21° bend across joints 2–10**. Lift the front (joints 2–4 currently 11–14°) and hold the tail down (joints 8–9 currently 28–30°). Recorded in §6 and §7.

## 6. Land it

- [ ] 6.1 Add the approved configuration as a preset, carrying its `legWeight` and its measured metric-2 numbers in the description.
- [ ] 6.2 Record the D-T2 result as a dated entry in `documentation/animation-roadmap.md` §7: the numbers, the control points that won, the variants rejected, and the owner's baseline choice from task 1.4.
- [ ] 6.3 Update `documentation/locomotion-handover.md` §5 so the next session reads the achieved state and D-T3 as next.
- [ ] 6.4 Run `openspec validate --strict` and archive.
