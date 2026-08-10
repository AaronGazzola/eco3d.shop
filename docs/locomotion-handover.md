# Locomotion handover — DELETE AFTER READING

**Written 10-Aug-2026, at the direction change. Disposable by design.**

This is a one-shot baton, not a reference. It exists so the next session can resume without re-deriving
the last one, and it goes **stale the moment that session changes anything**. Read it once, act on it,
then **delete it and write a fresh one** describing where you left off. Never cite it as a source, never
update it in place, and never treat an undated claim in it as current.

Everything durable lives elsewhere, and those documents ARE meant to be re-read:

- `animation-roadmap.md` — decisions (§2), phases (§3), the measured baseline (§5), the success metrics
  (§6), and the dated status log (§7). This is the record. Where it disagrees with this file, it wins.
- `locomotion.md` — how the paper maps onto our rig.
- `reference/locomotion-reference.md` — the paper. Wins any disagreement about an equation or constant.
- `observation-loop.md` — how to see the system rather than infer it.

> A previous version of this file (2026-06-29) described a grip-pin walk driven by levers that no longer
> exist in the code, and it survived long enough to mislead. That is exactly the failure this
> delete-after-reading rule exists to prevent.

## 1. The direction changed on 10-Aug-2026. Read this before anything else.

**The dragons FLY. Walking is parked.** Decided by the owner. Stepping could not be made to work: foot
plant timing and foot thrust produced complication after complication, while the base swim with drag on
has been reliable since D-T1. Flight **is** that base swim with gravity removed — the wave pushes
against direction-dependent drag, and drag does not care whether the fluid is water or air.

The deliverable is a rectangular window on the Vids.Tube overlay that reads as a transparent fish tank,
with dragons flying inside it, seen through a **fixed side-on camera** so a dragon approaching the glass
grows and one departing shrinks. **The overlay outranks the tuning.** The owner streams while working on
eco3d with the overlay along the bottom, so viewers watch work in progress: a rough dragon that is
visible beats a good one that is not.

Full reasoning in roadmap §2 **Decisions 12–15**. The plan is roadmap §3 **Phase T**. Phase D-T is marked
parked in the same section — **do not resume D-T3 to D-T6 from those boxes.**

## 2. What carries over, and it is almost everything

- **The whole controller.** CPG, Ekeberg muscle law, anisotropic drag, the five-point spine amplitude
  profile, head isolation. All of it is wave work and the wave is the same wave in air.
- **The measurement harness.** `scripts/observe-sweep.mjs` over `scripts/observe-metrics.mjs`, the shared
  scorer, and the three defect fixes recorded in roadmap §7 (thrust gain range, the unrepeatable first
  run after a page load, heading conflated with curvature).
- **Turning already works and is already verified.** One signed lever weakens one whole side of the
  oscillator chain and the body curves (`turnBias` in `SimConfig`, checked by
  `scripts/locomotion-turn-direction.ts`). It reaches the MuJoCo path. T2 needs a control surface and a
  measured turn rate, not a mechanism.
- **Rigid, inert legs need no work.** Drag is applied to trunk segments only under MuJoCo, and the leg
  capsules already carry `contype="0" conaffinity="0"` so they collide with nothing. Only four small
  foot spheres touch the floor, and the floor is being removed.
- **The overlay page exists and is proven.** `/game/embed` renders a saved rig with no session, on a
  transparent background, and its address is already configured and verified inside Vids.Tube.

**Foot thrust is KEPT as a lever, defaulted off.** _Owner, 10-Aug-2026._ It is no longer a success
criterion and no longer the mechanism the phase is built around, but nothing about it is deleted.

## 3. What is new, and the two traps waiting in it

- **Gravity is not a lever on the working engine.** It is written into the generated model as a fixed
  `gravity="0 -9.81 0"` in `mjcf.ts`, so making it switchable forces a model rebuild on toggle. The
  Rapier path already has a live toggle; MuJoCo does not.
- **The floor is one infinite plane and there are no walls.** The tank needs bounded surfaces and needs
  the floor gone. Bouncing off a wall is ordinary contact and needs no code.
- **The overlay camera chases the creature and refits its distance every frame.** It must become a fixed
  camera framing the tank. *Verified, so do not re-investigate:* the creature genuinely moves in world
  coordinates. The parent group is held at the origin every frame, but each body segment carries its own
  absolute world matrix, so a static camera will see the movement.
- **⚠ TRAP 1 — nothing resists roll.** The MuJoCo drag loop writes the three angular slots of its
  external-force buffer as **zero every step**. With the floor and gravity both gone, an uncontrolled
  body is free to tumble. **This is the first thing T1's capture is read for.** If it tumbles, T3 (level
  flight and banking) is pulled forward ahead of T2.
- **⚠ TRAP 2 — the pitch limits are placeholders, not measurements.** The rig schema carries `pitchUp`
  and `pitchDown` per group and the Calibrate tab edits them, so the physics can read a pitch limit
  today. But **every one of them reads exactly 30.0° on every group of both saved rigs** — the code
  default — while the sideways limits are genuinely measured and vary 17° to 39°. Under Decision 11 the
  caps are the real range of motion of the print, so the pitch limits are **not physical** until the
  owner measures them. Use 30° as an explicit placeholder and say so in any report.
- **The spine is yaw-only today.** Every spine joint is a single hinge about a near-vertical axis, so the
  body cannot bend upward at all. Climb and dive need a **second hinge per spine joint** (Decision 14).
  The bend axis is carried in each segment's own frame, so a pitched body carries its wave with it.
- **Roll is a controlled quantity** (Decision 15): flat in level flight, banked into turns. Per-segment
  roll limits come later and need a **schema addition** — there is no roll field on the rig today.

## 4. What was tried and rejected (do not re-propose)

- **Foot grip as a solver pin** (built twice). A constraint steals joint authority from the muscles: a
  pinned foot reflects the travelling wave into a standing wave with zero travel. The *timing* was never
  wrong. Retired by Decision 10.
- **Keyframe pose cycles for locomotion.** The root translates independently of the feet, so the creature
  slides by construction. Locomotion is never keyframed.
- **Planting as a goal at all.** 36% of foot motion is sideways and uncancellable, and the two girdles
  demand speeds differing 2 to 1. No single body velocity plants both. Now parked outright.
- **Single-lever stepping through the wave profile.** The profile's response is redistributive: lowering
  one control point pushes bend onto its neighbours. The shape must be searched whole. See roadmap §7,
  9-Aug-2026.
- **Pushing a wave section above 1.0.** Measured as buying nothing — within 1° of the best all-below-1.0
  variant on spread, at identical speed and a worse girdle ratio.

## 5. Pick up here — Phase T1, the tank

Build the tank and get something flying in it on the overlay, before any behaviour work. Concretely:
gravity becomes a lever and goes off; the floor plane goes and bounded walls replace it; the overlay's
follow camera becomes a fixed side-on camera; the approved MuJoCo **base swim** preset flies inside it
with the legs rigid. Gate: a dragon flies around the tank on the overlay and bounces off the glass, seen
in a capture rather than asserted, with the roll trap above explicitly checked.

**The D-T2 numbers do not carry into the tank.** Every one was taken with gravity on and a floor beneath
the body, and the configuration that won also used foot thrust. The grid is **re-measured** in T5, not
converted. This is also why the four handed-over wave variants were never chosen between: the choice was
between shapes measured under a load the tank does not have.

**Before observing anything:** rebuild. `npm run prod:3002` from PowerShell, detached. Any config link
from a previous session is dead once its server is gone — regenerate from the harness.

## 6. How to run

From PowerShell (not the bash sandbox — it resets Supabase auth). **Never observe a dev server:**
`/admin/animate` lags badly enough under `next dev` that what you see is not what the code does.

```
npm run prod:3002        # build + serve on 3002; run it detached so it survives across commands
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --events --legw 0.1 --config path\to\config.json
```

**Rebuild and restart after every app-code change, before observing and before handing over any link.**
There is no hot reload: a running production server keeps serving the old bundle, so skipping this
captures the previous version of the code and reports it as the new one. Stop the previous server first
— the port stays bound. Harness changes (`scripts/observe*.mjs`) need no rebuild. Confirm the rebuild
took by checking the reported config contains the lever you just added.

The overlay page has its own driver: `scripts/verify-embed.mjs` drives `/game/embed` in a fresh context
with no session and screenshots it. Use that for anything overlay-facing, not the studio harness.

Auth is cached in `scripts/.observe-auth.json`. The saved rig is listed as **"Demo Dragon — <stage>"** in
the Pick step's Load tab. Forward axis = **−X**, lateral = **Z**, both confirmed from a known swim.
Captures land in `docs/diagnostics/observe/` with the exact config embedded.

## 7. Key files

- `app/admin/animate/animateStore.ts` — `SimConfig`, every lever, encode/decode for shareable links.
- `app/admin/animate/simPresets.ts` — the named presets, scoped per engine.
- `app/admin/animate/AnimateScene.tsx` — `window.__studio`, overlays.
- `app/game/embed/page.tsx` — the overlay page and the follow camera that T1 replaces.
- `app/game/locomotion/cpg.ts` — the oscillator network; `girdleClockPhase` is the limb clock.
- `app/game/locomotion/mujocoRuntime.ts` — the MuJoCo sim loop and the drag loop (angular slots zeroed).
- `app/game/locomotion/mjcf.ts` — the per-rig MJCF model; gravity and the floor plane are written here.
- `app/game/locomotion/body3d.ts` — the Rapier body build; reads only the yaw caps today.
- `app/admin/_lib/types.ts` — `AngleCaps`: `yaw`, `yawBack`, `pitchUp`, `pitchDown`. No roll field.

## 8. Governance status

- **Both active changes were archived on 10-Aug-2026**, leaving no active change with unchecked boxes.
  - `add-wave-shaping` — its stepping-era tasks were closed out as dropped-with-reason rather than
    silently checked, and its full result is recorded in roadmap §7 under 9-Aug-2026. Read that entry,
    not the archived boxes.
  - `add-dragon-overlay-embed` — code-complete; the two checks no script can perform were moved to
    Linear before archiving.
- The locomotion capability spec (`openspec/specs/locomotion/spec.md`) describes the running code and
  contains no grip requirements.
- `AZ-183` and `AZ-184` are closed but describe the deleted keyframe runtime; both still need correcting.
- Per repo governance, promote a Linear ticket into a **new** OpenSpec change before writing code. Never
  implement directly from a ticket.
