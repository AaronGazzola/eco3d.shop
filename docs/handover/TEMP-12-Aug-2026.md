# Handover — DELETE AFTER READING

**Written 12-Aug-2026. Disposable by design.**

This is a one-shot baton, not a reference. Read it once, act on it, then delete it. Never cite it as a
source and never update it in place in a later session.

## Where the durable record lives

These win wherever this file disagrees with them:

- `docs/animation-roadmap.md` — decisions (§2), phases (§3), the measured baseline (§5), the success
  metrics (§6), and the dated status log (§7). This is the record.
- `docs/locomotion.md` — how the paper maps onto our rig.
- `docs/reference/locomotion-reference.md` — the paper. Wins any disagreement about an equation or constant.
- `docs/observation-loop.md` — how to see the system rather than infer it.
- `openspec/changes/add-flight-tank/tasks.md` — Phase T1, its evidence, and what it did not deliver.

## What this session changed

Nothing in the simulation, the rig or the overlay was touched. The whole session was process work.

- **The handover convention moved.** One file per session now lives in `docs/handover/`, named `TEMP`
  plus the date. `/handover` writes it; `/sync` reads it at the start of the next session and deletes it.
- **`/sync` reads and deletes handover documents.** It searches `docs/handover/` first, then the repo
  root and the rest of `docs/`, matching either a `TEMP`-and-date filename or any Markdown file whose
  opening lines declare it delete-after-reading. Deleting one is now a permitted write.
- **`/sync` refreshes the skills before it runs, not during.** The shared-skills comparison used to sit
  in the gather phase, so a newer `/sync` landed on disk after its own instructions were already in
  context and only took effect the following run. It now runs immediately after the access gate and
  re-reads its own file from disk when that file was replaced.
- **`/handover` was added.** It sweeps the conversation for open items, splits them into do-now and
  next-session, waits for an answer, does the confirmed items, then writes this file.
- Both skills are pushed to the shared `AI-Resources` repository and the two copies are identical.
- **Three stale records were corrected.** The 11-Aug-2026 overlay work now has a roadmap entry; AZ-183 and
  AZ-184 carry correction notes; `CLAUDE.md` documents the handover convention.
- **Three task boxes were closed in `add-flight-tank`**, taking it to 32 of 35. Two were owner decisions
  and one was the handover rewrite, done at the new location.

## What was decided

- **Tank size stays at 60 × 30 × 40.** _Owner, 12-Aug-2026._ A 17.8 u dragon reading small in a 480 × 320
  window is accepted. Shrinking the tank would enlarge the dragon but bring the wall press forward from
  about 22 s, and the wall press is being fixed by turning, not by geometry.
- **The no-turn, no-bounce gap is carried by T2, not by T1.** _Owner, 12-Aug-2026._ It is refined and
  built under turning, tracked by AZ-218, rather than reopened inside the flight tank change.
- **The old handover file was deleted, deliberately.** _11-Aug-2026._ It was written at the direction
  change, before the tank was built, and had gone stale. Its durable content was already in the roadmap.

## Decisions still owed

- **Owner approval of the flight baseline on the overlay.** A passing gate is not approval. Until the
  owner has looked at a link, T1 cannot be archived.

## Pick up here

Three boxes remain in `add-flight-tank`, and none needs new simulation work:

- **6.3 — the depth cue is argued, not shown.** Perspective is on and the camera fit is measured from the
  tank's near face, but no near-face against far-face pair was ever photographed. Capture one pair and
  attach it. Requires a production rebuild first.
- **7.3 — hand the owner an overlay link** for the flight baseline and record whether approval was given.
- **7.4 — `openspec validate --strict`, then archive.**

Then promote turning into a **new** OpenSpec change under AZ-218. Never implement straight from the
ticket.

## Traps

- **The pitch limits are placeholders, not measurements.** Every group of both saved rigs reads exactly
  30.0°, which is the code default, while the sideways limits are genuinely measured and vary 17°–39°.
  Under Decision 11 a cap is the real range of motion of the print, so pitch is not physical until the
  owner measures it. AZ-246 tracks the measurement. Say "placeholder" in any report that uses 30°.
- **The D-T2 numbers do not carry into the tank.** Every one was taken with gravity on, a floor beneath
  the body, and foot thrust active. The grid is re-measured, never converted.
- **A capture that ends before the failure is not evidence of its absence.** A 30 s flight run was read
  as a pass; a 90 s run of the same configuration showed the body destroyed by 45 s.
- **The body overhangs the glass by about 2 u** in a 60 u tank, because the hull spheres sit at segment
  ends and the body bulges between them. Known, stated, not fixed.
- **Foot thrust is kept as a lever, defaulted off.** _Owner, 10-Aug-2026._ Not a success criterion any
  more, but nothing about it is deleted.
- **AZ-183 and AZ-184 are closed but their bodies describe a codebase that does not exist.** Both now
  carry a correction note at the top, dated 12-Aug-2026. AZ-183's **Delete** list was never carried out:
  `app/game/locomotion/`, `app/admin/animate/` and `AnimatedModel.tsx` all still exist and are the live
  core. AZ-184 claims the pose-cycle runtime was retained; it was deleted. Read the correction, not the
  body.

## Tried and rejected — do not re-propose

- **Foot grip as a solver pin** (built twice). A constraint steals joint authority from the muscles and
  reflects the travelling wave into a standing wave with zero travel. Retired by Decision 10.
- **Keyframe pose cycles for locomotion.** The root translates independently of the feet, so the creature
  slides by construction.
- **Foot planting as a goal.** 36% of foot motion is sideways and uncancellable, and the two girdles
  demand speeds differing 2 to 1. Parked outright with walking.
- **Elastic tank walls.** Made springy twice, through both the direct and the mass-normalised stiffness
  form, and both destabilised the solver identically. The destabiliser was **sustained contact** across a
  far larger contact set than intended, not elasticity. The tank now owns a contact group touched by one
  massless hull sphere per segment.
- **Active roll control for level flight.** Decision 15 expected tumbling with no floor and no angular
  drag. Measured, free flight holds roll near zero for 90 s unaided. Level flight is a property of the
  wave.

## How to run it

From PowerShell, never the bash sandbox, which resets Supabase auth. Never observe a dev server: the
studio lags badly enough under `next dev` that what is seen is not what the code does.

```
npm run prod:3002        # build + serve on 3002; run detached so it survives across commands
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --events --legw 0.1 --config path\to\config.json
```

- **Rebuild and restart after every app-code change**, before observing and before handing over any link.
  There is no hot reload; a running production server keeps serving the old bundle. Stop the previous
  server first, the port stays bound. Harness changes under `scripts/` need no rebuild. Confirm the
  rebuild took by checking the reported config contains the lever just added.
- **Discard a warm-up run.** The first run after a page load straddles the lazy engine build and is not
  repeatable.
- The overlay page has its own driver: `scripts/verify-embed.mjs` drives `/game/embed` in a fresh context
  with no session and screenshots it. Use it for anything overlay-facing.
- Auth is cached in `scripts/.observe-auth.json`. Forward axis is **−X**, lateral is **Z**. Captures land
  in `docs/diagnostics/observe/` with the exact config embedded.

## Repository state

- Everything above is committed on `main`. The working tree was clean at the end of the session.
- One branch, `dev`, has been untouched since 13-Feb-2026 and holds a single commit labelled only as work
  in progress. Confirm nothing is wanted from it, then delete it locally and on the remote.
