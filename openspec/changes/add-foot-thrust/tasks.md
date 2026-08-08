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
- [ ] 4.2 Confirm the three fields survive `encodeSimConfig`/`decodeSimConfig` round-tripping and that links generated before this change still apply cleanly.

## 5. The thrust force

- [x] 5.1 In `mujocoRuntime.ts` `step()`, read the three levers with the same `num`/`bool` defaulting the other levers use.
- [x] 5.2 Add a per-leg thrust loop immediately after the drag loop. For each entry in `this.legs`: `ph = girdleClockPhase(state, spec, lg.limbIdx)`, `rel = ((ph − footThrustShift) mod 1 + 1) mod 1`, `w = Math.max(0, Math.sin(2π·rel))`, take the hip body's local `+x` in world from `this.xquat[4·lg.hipBody …]` using the same quaternion-to-axis expression the drag loop uses, and add `−footThrustGain · w · f̂` into `this.xfrc[6·lg.legBody + 0..2]`.
- [x] 5.3 CORRECTED 8-Aug-2026. The original task said to ACCUMULATE into `xfrc_applied`; that was wrong and blew the sim up at every gain tried. MuJoCo never clears `xfrc_applied`, and leg bodies sit outside the drag loop, so nothing zeroed their slots and the force grew by one increment per substep (about 1440 over 12 s). Every leg body’s six components are now zeroed unconditionally at the start of each substep, before the thrust is written.
- [x] 5.4 Leave the torque components `xfrc_applied[3..5]` at zero for every leg body.
- [ ] 5.5 Verify at `footThrustGain = 0` that node positions match the approved MuJoCo baseline sample-for-sample within floating-point tolerance.

## 6. Impulse accounting

- [x] 6.1 Add `footImpulseX/Y/Z` and `dragImpulseX/Y/Z` to `MjDiag` and the diagnostics snapshot.
- [x] 6.2 Accumulate each source's `force · TIMESTEP` in world coordinates across all bodies every substep; reset wherever the simulation resets.
- [x] 6.3 Do not project either accumulator onto a forward direction — store and report raw world-frame vectors.
- [x] 6.4 Print both vectors at the end of a harness run and write them into the generated node report.

## 7. Studio surface

- [x] 7.1 Add an enable toggle, a signed gain slider and a shift slider to `AnimateSidebar.tsx`, grouped and labelled as foot thrust.
- [x] 7.2 Remove the grip controls (enable, per-foot selectors, softness, duration, shift) from the sidebar, leaving the config fields and runtime path intact.
- [ ] 7.3 Confirm a stored link with `gripEnabled = true` still replays the grip behaviour with no control shown.

## 8. Iterate thrust against the approved baselines (one lever per step, owner-approved)

- [ ] 8.1 Sweep `footThrustGain` with drag ON, drive fixed, at least five values, 12 s at 20 Hz each. Record per run: coupling correlation, response lag, mean speed, peak cap fraction, roll reversals per second, impulse split. Report each as a config link.
- [~] 8.2 DROPPED 8-Aug-2026 by owner decision: the drag-off variant was rejected on look, so thrust is only ever tuned on top of drag. The contribution of thrust is instead read from the impulse split, which separates the two sources without needing a drag-off run.
- [ ] 8.3 Sweep drive against the best gain to find the pair that raises coupling while holding mean speed near the baseline. Record every pair tried, not only the winner.
- [ ] 8.4 Confirm the gate on the winning pair: coupling above the 0.18 baseline, response lag below 0.41 s, mean forward speed within 10% of 1.03 u/s, peak cap fraction within 3 points of the approved MuJoCo baseline, roll reversals per second not increased.
- [ ] 8.5 Confirm no heading drift with equal gains on all four feet: lateral drift under 5% of distance travelled over a 20 s run.
- [ ] 8.6 Owner opens the links and approves. Add each approved state as a preset with its measured numbers in the description, covering the off / low / high rungs of the thrust lever, both with and without drag.
- [ ] 8.7 If the gate cannot be met at any gain and drive pair, STOP and report the sweep rather than widening scope — the front/hind imbalance (0.80 against 1.64 u/s) is the expected cause and belongs to Phase D-T2.

## 9. Land it

- [ ] 9.1 Record the D-T1 result as a dated entry in `documentation/animation-roadmap.md` §4, with the numbers, the winning pair, and the configs the owner rejected.
- [ ] 9.2 Update `documentation/locomotion-handover.md` §3 and §5 so the next session reads the achieved state, not the planned one.
- [ ] 9.3 Run `openspec-verify-change` and archive.
