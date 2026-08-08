# Tasks — foot thrust (Phase D-T1)

Every gate is scored against `documentation/animation-roadmap.md` §5 Baseline. No task is checked
without a capture under `documentation/diagnostics/observe/` showing the number claimed.

**Approval rule.** A preset is added ONLY after the owner has opened its config link in a browser and
approved it. A passing gate is not approval. Configs that are observed but not approved stay as links
and are recorded in the roadmap, never in the preset list. See `.claude/skills/observe-loop`.

## 1. Make configs actually reproducible (blocks everything else)

- [x] 1.1 Add `legWeight: number` to `SimPreset` in `app/admin/animate/simPresets.ts`; applying a preset SHALL set every leg group's `nodeWeight` to it, so a preset no longer depends on a slider the viewer may not have set.
- [x] 1.2 Change preset application to be absolute, not a merge: reset to `DEFAULT_SIM_CONFIG` first, then apply the preset, so preset B after preset A equals preset B from a fresh load.
- [x] 1.3 Keep `SimPreset.config` as `Partial<SimConfig>` but make omission safe: absolute application resolves every omitted key to its DEFAULT, so a partial can no longer inherit from the previous state. Widening the type was unnecessary once application stopped merging, and the existing presets compose from a shared base object.
- [x] 1.4 Prove it: apply a preset in a fresh browser context, capture, then apply a different preset and return to the first, capture again, and confirm the two captures of the first preset match.

## 2. Clear the MuJoCo preset list

- [x] 2.1 Delete all eight existing MuJoCo presets (`wave-slow`, `wave-mid`, `swim-slow`, `swim-mid`, `timing`, `grip-walk`, `sweep-only`, `grip-sweep-walk`) — they encode the retired grip direction and would teach the wrong ladder.
- [x] 2.2 Leave the Rapier presets untouched; `base swim` there remains the visual reference the MuJoCo baseline is judged against.

## 3. Establish the MuJoCo base configuration (owner-approved, before any thrust work)

- [x] 3.1 Capture the Rapier `base swim` for 12 s at 20 Hz as the reference, and record it against §5 Baseline.
- [x] 3.2 Sweep drive and muscle gain under MuJoCo to find the base wave that matches the Rapier reference on stroke shape and amplitude envelope, with drag OFF. Report each candidate as a config link with its numbers.
- [x] 3.3 Repeat with drag ON to find the MuJoCo base swim. Report as config links with numbers.
- [x] 3.4 Owner approved the drag-ON baseline on 8-Aug-2026 and dropped the drag-off variant as not worth pursuing. Recorded as the MuJoCo `base swim` preset with its measured numbers. No `base wave` preset is recorded, by that decision.
- [x] 3.5 If no MuJoCo configuration holds the body flat (vertical drift under 0.05 u, max tilt under 3°) and straight (lateral drift under 5% of distance travelled), STOP and report — thrust must not be built on a baseline that does not match.

## 4. Config levers

- [x] 4.1 Add `footThrustEnabled: boolean` (default `false`), `footThrustGain: number` (default `0`, signed) and `footThrustShift: number` (default `0.36`) to `SimConfig` in `app/admin/animate/animateStore.ts`.
- [x] 4.2 Confirmed 8-Aug-2026. `encodeSimConfig` base64s the whole `SimConfig` as JSON and `decodeSimConfig` parses it back, so all four thrust fields (the fourth, `footThrustShiftHind`, was added during 5.3's fix) round-trip exactly once they are in `SimConfig` and `pickSimConfig`. Links predating the change decode to a `Partial` missing those keys; absolute application resolves each missing key to its DEFAULT, and `footThrustEnabled` defaults to `false`, so an old link replays with thrust off.

## 5. The thrust force

- [x] 5.1 In `mujocoRuntime.ts` `step()`, read the three levers with the same `num`/`bool` defaulting the other levers use.
- [x] 5.2 Add a per-leg thrust loop immediately after the drag loop. For each entry in `this.legs`: `ph = girdleClockPhase(state, spec, lg.limbIdx)`, `rel = ((ph − footThrustShift) mod 1 + 1) mod 1`, `w = Math.max(0, Math.sin(2π·rel))`, take the hip body's local `+x` in world from `this.xquat[4·lg.hipBody …]` using the same quaternion-to-axis expression the drag loop uses, and add `−footThrustGain · w · f̂` into `this.xfrc[6·lg.legBody + 0..2]`.
- [x] 5.3 CORRECTED 8-Aug-2026. The original task said to ACCUMULATE into `xfrc_applied`; that was wrong and blew the sim up at every gain tried. MuJoCo never clears `xfrc_applied`, and leg bodies sit outside the drag loop, so nothing zeroed their slots and the force grew by one increment per substep (about 1440 over 12 s). Every leg body’s six components are now zeroed unconditionally at the start of each substep, before the thrust is written.
- [x] 5.4 Leave the torque components `xfrc_applied[3..5]` at zero for every leg body.
- [x] 5.5 Verified 8-Aug-2026, with the wording corrected. "Sample-for-sample" is not measurable through this harness: samples are taken on the wall clock, so two runs land on different sim times even though the physics itself is fixed-step. What was measured instead, from three 12 s captures. Two runs of the same thrust-OFF config travel an identical **12.527 u** and differ by **0.091 u** mean node position — that spread is pure sampling jitter and is the noise floor. Thrust ON at gain 0 travels **12.545 u** (0.14% higher, accounted for by three extra trailing samples) and differs from OFF by **0.110 u** mean, inside the noise floor. Accumulated foot-thrust impulse is exactly **(0, 0, 0)** in both. Peak cap fraction, per-joint profile and roll reversals are identical. Gain 0 is a true no-op.

## 6. Impulse accounting

- [x] 6.1 Add `footImpulseX/Y/Z` and `dragImpulseX/Y/Z` to `MjDiag` and the diagnostics snapshot.
- [x] 6.2 Accumulate each source's `force · TIMESTEP` in world coordinates across all bodies every substep; reset wherever the simulation resets.
- [x] 6.3 Do not project either accumulator onto a forward direction — store and report raw world-frame vectors.
- [x] 6.4 Print both vectors at the end of a harness run and write them into the generated node report.

## 7. Studio surface

- [x] 7.1 Add an enable toggle, a signed gain slider and a shift slider to `AnimateSidebar.tsx`, grouped and labelled as foot thrust.
- [x] 7.2 Remove the grip controls (enable, per-foot selectors, softness, duration, shift) from the sidebar, leaving the config fields and runtime path intact.
- [x] 7.3 Confirmed 8-Aug-2026. `gripEnabled` remains a `SimConfig` field carried by `pickSimConfig`, and the runtime still reads it and runs the equality-constraint path, so a stored link decodes and replays the grip with no control rendered. Note for whoever reads this next: grip is retired by Decision 10 and this only guarantees old links do not silently change meaning.

## 8. Iterate thrust against the approved baselines (one lever per step, owner-approved)

> **Section 8 was written against a success metric the owner has since retired.** On 8-Aug-2026 the
> target was restated (roadmap §6): body surge, and therefore the body-speed-to-foot-sweep coupling
> correlation and response lag that 8.1/8.3/8.4 gate on, is **not** what this work is optimised for.
> Foot stillness in the CPG-clocked plant window is. The sweep itself was run and is recorded below
> against the new metric; the tasks that only exist to serve the retired gate are dropped with reasons.

- [x] 8.1 Done 8-Aug-2026, reported against the new metric. Six gains (−1, 0, 0.5, 1, 2, plus the OFF
      control) with drag ON and drive fixed at 0.39, each 12 s at 20 Hz, each handed over as a config
      link. Speed spans **0.58 → 2.18 u/s** from the gain alone. Peak cap fraction holds between **88%
      and 97%** throughout, so the wave is provably untouched by the thrust. Plant slip falls
      monotonically **159% → 59%**. Body stays flat and straight at every gain.
- [~] 8.2 DROPPED 8-Aug-2026 by owner decision: the drag-off variant was rejected on look, so thrust is
      only ever tuned on top of drag. The contribution of thrust is instead read from the impulse split,
      which separates the two sources without needing a drag-off run.
- [~] 8.3 DROPPED — gates on the retired coupling metric. The gain-versus-drive pairing it asks for is
      not lost: it is the substance of **D-T3, the speed ladder**, which sweeps drive, the region
      profile and the gain together against the §6 metrics rather than against coupling.
- [~] 8.4 DROPPED — every threshold in it (coupling above 0.18, lag below 0.41 s, speed within 10% of
      1.03 u/s) belongs to the retired body-surge target. Holding speed near baseline is now actively
      wrong: spanning a speed range is the deliverable. Replaced by the §6 metrics.
- [x] 8.5 Confirmed. With equal gains on all four feet the body tracks straight at every gain tried;
      lateral drift stays far under the 5% bar, matching the §5 Baseline's 0.025 u over 8.6 u.
- [~] 8.6 DROPPED as written. One preset was approved — the MuJoCo `base swim` (task 3.4) — and it is
      recorded. The owner did not approve the thrust rungs as presets, because a gain rung on its own is
      not a grid cell; presets are authored at D-T6 once speed, wave shape and turn are settled
      together. The drag-off half of the task is void via 8.2.
- [x] 8.7 Escalation honoured, and it fired. The front/hind imbalance was confirmed as the binding
      cause exactly as predicted: plant slip bottoms out at **59%** and no gain goes below it, because
      the residue is the foot's sideways swing, which no amount of forward body travel cancels. Scope
      was not widened — flattening the envelope is handed to **D-T2**.

## 9. Land it

- [x] 9.1 Recorded as the dated 8-Aug-2026 entry in `documentation/animation-roadmap.md` **§7** (the
      Phase D-T status log, which is where D-T entries live; §4 holds the older phases). It carries the
      speed span, the two timing bugs, the plant-slip floor and the restated goal.
- [x] 9.2 `documentation/locomotion-handover.md` §3 and §5 rewritten to the achieved state: §3 records
      the free diagonal-couplet rhythm and the body/foot decoupling, §5 opens on the preset grid, marks
      D-T1 done with its numbers, and names D-T2 as next.
- [x] 9.3 Verified and archived 8-Aug-2026.
