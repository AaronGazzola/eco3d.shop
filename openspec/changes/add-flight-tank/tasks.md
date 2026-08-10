# Tasks — the flight tank (Phase T1)

Scored against `docs/animation-roadmap.md` §6. Metric 1 (foot stillness) is parked and is not scored
here. Metric 4 (attitude) is new and nothing measures it yet, so section 4 builds it before section 5
reads it.

**Build rule.** There is no hot reload. Every app-code change is followed by `npm run prod:3002` (studio
and harness) or `npm run prod:3001` (the overlay page) before any capture is taken or any link is handed
over. A running production server keeps serving the old bundle, so skipping the rebuild captures the
previous version of the code and reports it as the new one. Confirm the rebuild took by checking the
reported config contains the lever just added.

**Evidence rule.** A box is checked only with a result that would have failed had the work not been done.
"It should work" is not a result. Every number claimed comes from a capture under
`docs/diagnostics/observe/`.

**Warm-up rule.** The first run after a page load straddles the lazy engine build and is not repeatable —
it reads up to about 2.4° of bend spread more than the five runs after it. Discard a warm-up run before
any measurement that will be compared against another.

## 1. Gravity becomes a lever

- [ ] 1.1 Add `gravityY` to `SimConfig` in `animateStore.ts`, defaulting to `-9.81`, carried through
      `pickSimConfig` so it reaches a shared link. Confirm by generating a link and decoding it.
- [ ] 1.2 Read the value in `mjcf.ts` where `gravity="0 -9.81 0"` is currently hard-coded into the
      generated model.
- [ ] 1.3 Treat a change in the value as structural in `mujocoRuntime.ts`, forcing a model rebuild the way
      the other structural toggles already do, and NOT rebuilding when the value is unchanged. Confirm the
      no-op case by asserting the model is not rebuilt across a step where nothing changed.
- [ ] 1.4 Prove the default is inert: run the MuJoCo `base swim` preset before and after this section and
      show travel, per-joint peak bend and speed unchanged within the harness noise floor. A capture, not
      an assertion.
- [ ] 1.5 Prove the lever works: with the wave stopped and gravity at zero, the body's vertical position
      does not fall over 10 s. With gravity at its default and the wave stopped, it does.

## 2. The tank replaces the floor

- [ ] 2.1 Add `tankWidth`, `tankHeight` and `tankDepth` to `SimConfig`, each defaulting to a size that
      holds the current rig with room to travel, carried in `pickSimConfig`.
- [ ] 2.2 In `mjcf.ts`, replace the single `floor` plane with six bounded surfaces forming a closed
      rectangular volume centred on the rig's start position. Keep the existing contact groups so the foot
      spheres still behave exactly as they do today.
- [ ] 2.3 Confirm the body is contained: gravity off, wave running, 60 s at 20 Hz, every sampled position
      inside the bounds. Report the closest approach to each of the six surfaces.
- [ ] 2.4 Confirm the rebound comes from contact and not from code: show that no line in the runtime sets a
      velocity in response to a wall, and capture a wall strike showing the normal component of velocity
      reversing sign across it.
- [ ] 2.5 Confirm the tank is resizable: two links differing only in the dimensions confine the body to
      correspondingly different bounds.
- [ ] 2.6 Confirm the surfaces are not drawn in the overlay. The tank reads as glass there.

## 3. The legs are confirmed inert

This section verifies rather than builds. If any check fails, stop and report — it means something already
believed about the base swim is wrong.

- [ ] 3.1 Read `mujocoRuntime.ts` and confirm the drag loop iterates trunk segments only, naming the list
      it iterates. Read `mjcf.ts` and confirm the leg capsules carry `contype="0" conaffinity="0"`.
- [ ] 3.2 Run one flight configuration at the lightest leg weight and at ten times that weight, and show
      the distance travelled differs by less than the run-to-run variation measured in 3.3.
- [ ] 3.3 Establish that run-to-run variation first, by running one configuration six times and discarding
      the warm-up. Without this number, 3.2 has nothing to compare against.
- [ ] 3.4 Confirm no force is applied at any foot while foot thrust is disabled. Foot thrust remains in
      the codebase as a lever and is expected to be off, not absent.

## 4. The harness reports attitude

- [ ] 4.1 Add peak roll angle and roll reversals per second to `observe-metrics.mjs`, the shared scorer, so
      the batch path and the single-run path cannot disagree. Roll is measured about the body's own long
      axis, not about a world axis, because a turning body's long axis is not the reference axis.
- [ ] 4.2 Report both figures together everywhere either appears, since the reversal count degrades into
      noise below roughly 1° of peak.
- [ ] 4.3 Prove the measure on a known case: score a capture in which the body rolls past 90° and show the
      reported peak exceeds 90°. Manufacture the case if no natural one has appeared yet.
- [ ] 4.4 Score one capture through both the batch path and the single-run path and show the roll figures
      are identical.

## 5. The flight baseline, and what it actually does

- [ ] 5.1 Add a `flight base` preset for the MuJoCo engine: the approved `base swim` configuration with
      gravity zero, inside the default tank, legs at 0.1 kg. Carry its measured numbers in the description
      the way the existing presets do.
- [ ] 5.2 Capture it, 60 s at 20 Hz, and report against §6: speed, straightness as worst perpendicular
      deviation from a fitted path line, per-joint peak bend in degrees with the spread and the girdle
      ratio, per-joint peak as a fraction of its own limit as the clipping guard, and the new roll pair.
- [ ] 5.3 **Answer the roll question explicitly, because it decides what is built next.** Nothing resists
      roll once the floor and gravity are gone, and the engine applies no angular drag — the angular slots
      of its external-force buffer are written as zero every step. State plainly whether the body flies
      level, drifts in roll, or tumbles.
      - If it tumbles, say so and stop: T3 (level flight and banking) is pulled forward ahead of T2, and
        that is a report to the owner, not a fix to improvise here.
- [ ] 5.4 Report how the flight numbers differ from the same configuration with gravity on and the floor
      present. This is the only comparison in the change that is genuinely informative, since it is the one
      pair measured on the same code.

## 6. The overlay

- [ ] 6.1 Replace `FollowCamera` in `app/game/embed/page.tsx` with a fixed camera positioned side-on to the
      tank and aimed at the tank's centre, its distance fitted once so all eight tank corners project
      inside the viewport.
- [ ] 6.2 Re-fit on resize only. Confirm by capturing at two aspect ratios and showing the tank framed in
      both, and by capturing 30 s of flight and showing the camera position and aim identical to the first
      frame.
- [ ] 6.3 Prove perspective is doing its job: capture the creature near the far face and near the near
      face, and report the fraction of the frame it occupies in each. A pair of screenshots, not a claim.
- [ ] 6.4 Confirm the studio is untouched: its camera still starts at its default position and still
      responds to the presets and to dragging.
- [ ] 6.5 Drive the overlay page with `scripts/verify-embed.mjs` in a fresh context with no session, and
      confirm what the earlier change already proved still holds: no login form, no sidebar, no grid,
      transparent page and alpha drawing buffer, no console errors, and the creature moving.

## 7. Land it

- [ ] 7.1 Record the T1 result as a dated entry in `docs/animation-roadmap.md` §7: the flight baseline
      numbers, the roll answer from 5.3, and the gravity-on against gravity-off comparison from 5.4.
- [ ] 7.2 Rewrite `docs/locomotion-handover.md` so the next session reads the achieved state and the next
      increment, per its delete-after-reading rule.
- [ ] 7.3 Hand the owner an overlay link for the flight baseline, and record whether it was approved. A
      passing gate is not approval.
- [ ] 7.4 Run `openspec validate --strict` and archive.
