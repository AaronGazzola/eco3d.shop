# Dragon overlay embed page

## Why

The dragon is only visible inside the admin studio (`/admin/animate`), behind a login, wrapped in a
sidebar, on a grey background, over a floor grid, framed by a camera the operator pans by hand. None of
that can be put on a stream.

Vids.Tube needs a window in its stream overlay showing the dragon moving. The overlay is an OBS browser
source, so whatever it shows must be a URL that renders the creature and nothing else.

**Why an embedded frame rather than porting the animation into Vids.Tube.** The animation is Three.js,
Rapier and MuJoCo plus the CPG controller, the rig loader and the whole `SimConfig` surface — none of
which exists in Vids.Tube. Copying it there forks the locomotion work across two repositories, which is
the one outcome `docs/animation-roadmap.md` cannot absorb. A frame keeps locomotion here, keeps the
overlay in Vids.Tube, and is also how the full game will be hosted later, so the seam is built once.

**The link machinery already exists.** `buildLink`/`decodeSimConfig` already round-trip a whole
`SimConfig` through the URL hash, and `Copy link` in the Simulate sidebar already produces one. The
embed page is a second reader of that same link, not a second way to configure a run — so a
configuration that has been observed and approved in the studio is exactly the configuration the stream
shows.

## What Changes

- Add a public, login-free page that renders one rig with locomotion running and nothing else
  (`/game/embed`): no sidebar, no grid, no orbit controls, transparent background.
- Extend the shared link to carry the rig identity, so one copied link names both the rig and its motion
  configuration. Today a link carries the configuration only, because the studio reads the rig from the
  operator's own saved studio state — which an OBS browser source does not have.
- Add a `Copy overlay link` button to the Simulate sidebar, producing that link against the embed page.
- Add a camera that follows the creature, since a walking or swimming dragon leaves a fixed frame within
  seconds and the overlay has nobody to pan it.
- Give the studio canvas optional overlay presentation (transparent background, no grid, no controls);
  the studio's own appearance is unchanged by default.

## Non-goals

- **No game.** No interaction, no input, no state, no scoring, no stream data reaching the dragon.
- **No new motion behaviour.** No controller, muscle, drag, cap or preset is touched. The embed page is a
  second viewer of the existing simulation, and a link that looks one way in the studio must look the
  same way in the overlay.
- **No deployment.** The page is served from a local production build on port 3001
  (`npm run prod:3001`). No hosted origin, no domain, no dev server.
- **No overlay-side work.** The window, its position and the security policy that permits the frame are
  specified separately, in the Vids.Tube change `add-overlay-game-window`.
- **No authentication or rate limiting on the page.** The rigs it reads are already world-readable, and
  the page is reachable only on the local machine.
- **No rig picker in the overlay.** The rig is named by the link; choosing one is the studio's job.

## Capabilities

### Added Capabilities

- `dragon-embed`: a public page that renders a named rig, running, with no studio chrome, configured
  entirely by the URL, plus the studio button that produces its link.

## Impact

- A new page under `app/game/` and three optional presentation props on the studio canvas.
- `app/admin/animate/AnimateScene.tsx` — the rig identity added to the shared link, and the new button's
  handler.
- `app/admin/animate/AnimateSidebar.tsx` — the `Copy overlay link` button.
- No database migration: `dragon_models` and `dragon_variants` already carry a `select using (true)`
  policy applying to anonymous readers, so the page can read a rig with no session. This is confirmed as
  a task rather than assumed.
- The mesh download route is already public and is unchanged.

## Deferred, not tasked

- Confirming the window looks right composited over live video in OBS requires a running stream and the
  owner's eye. That is a Linear verification issue in the Eco3D.Shop project, not a task box here.
