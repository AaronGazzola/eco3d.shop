# The flight tank (Phase T1)

## Why

The direction changed on 10-Aug-2026: the dragons fly instead of walking (`docs/animation-roadmap.md`
Decisions 12–15, Phase T). Flight is the base swim with gravity removed — the body wave pushes against
direction-dependent drag, and drag does not care whether the fluid is water or air — so the controller
does not change and the tuning carries over.

What does not exist yet is somewhere to fly. The world today is one infinite floor plane with a fixed
downward pull baked into the generated model, and the overlay's camera chases the creature and refits its
distance every frame. None of that is a tank.

**The overlay outranks the tuning.** The owner streams while working on eco3d with the overlay along the
bottom of the stream, so viewers watch the work in progress. This change exists to put a flying dragon in
front of that audience before any behaviour work begins; every later increment is tuned against something
already visible rather than against a promise.

## What Changes

- Make gravity a configuration lever on the MuJoCo path, defaulting to the current downward pull so no
  existing preset or link changes. It is baked into the generated model today, so it is not switchable.
- Replace the infinite floor plane with a bounded tank of six surfaces whose size is a lever. Bouncing off
  a wall is ordinary contact and needs no code beyond the surfaces existing.
- Replace the overlay's creature-following camera with a camera fixed side-on to the tank, framing the
  whole tank once, so a dragon flying toward the glass grows and one flying away shrinks.
- Add a `flight base` preset: the approved MuJoCo base swim with gravity off, inside the tank.
- Confirm — rather than build — that the legs contribute nothing. Drag is already applied to trunk
  segments only and the leg capsules already collide with nothing, so this is a verification task.

## Non-goals

- **No new motion behaviour.** No turning control surface, no climb, no dive, no roll control, no roaming.
  Those are T2 to T6. The wave that flies in the tank is the wave that swims today, unmodified.
- **No pitch hinge.** The spine stays yaw-only in this change. Climb and dive are T4 and are blocked on
  the pitch limits being measured off the print (AZ-246).
- **No fix for roll, only a measurement of it.** Nothing resists roll once the floor and gravity are gone,
  and the working engine applies no angular drag. This change measures and reports what the body actually
  does. Correcting it is T3, and if the body tumbles, T3 is pulled forward ahead of T2.
- **No re-tuning and no new preset grid.** The D-T2 numbers were all taken with gravity on and a floor
  beneath the body and do not transfer; re-measuring them is T5, not this change.
- **No deletion of stepping code.** Foot thrust, plant hold, grip and leg sweep all stay, switched off.
  Foot thrust is explicitly retained as a lever.
- **No Rapier work.** The tank is built on MuJoCo, which is where the approved base swim lives. The Rapier
  path already has a live gravity toggle and is left alone.
- **No deployment.** Served from a local production build, as the overlay page already is.

## Capabilities

### Modified Capabilities

- `locomotion`: gravity becomes a lever rather than a constant, and the world becomes a bounded volume
  rather than an infinite plane.
- `dragon-embed`: the overlay camera becomes fixed and tank-framed rather than creature-following.

## Impact

- `app/game/locomotion/mjcf.ts` — gravity and the floor plane are written here; the tank surfaces replace
  the plane.
- `app/game/locomotion/mujocoRuntime.ts` — the new levers read into the generated model, and the rebuild
  that a structural change forces.
- `app/admin/animate/animateStore.ts` — the new levers on `SimConfig`, carried in the shared link.
- `app/admin/animate/AnimateSidebar.tsx` — controls for the new levers.
- `app/admin/animate/simPresets.ts` — the `flight base` preset.
- `app/game/embed/page.tsx` — the follow camera replaced.
- `scripts/observe-metrics.mjs` — roll reported, since §6 metric 4 is new and nothing measures it yet.
- No database migration. The tank is a simulation property, not rig data.

## Deferred, not tasked

- Judging how the tank window reads composited over live video needs a running stream and the owner's
  eye. Tracked as AZ-248.
- Measuring the real pitch limits off the printed model is owner work and blocks T4. Tracked as AZ-246.
