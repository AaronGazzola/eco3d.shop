## Why

There is no game. There is a research studio at `/admin/animate`, and an overlay page that mounts that
same studio scene with a different camera, so the thing on stream is a wandering copy of the Simulate
tab wearing mechanical group colours and, until recently, a follow camera. The home page is a static
landing.

Everything in `docs/game-architecture.md` stands on a game that exists separately from the studio and
runs unchanged in two places. This change builds that foundation and nothing else. Both development
tracks are blocked on it: the gameplay track has nothing to add features to, and the animation track has
no published seam to deliver improvements through.

## What Changes

- A **game core** is introduced: world state, rules and actions, holding no React and knowing nothing
  about where it is running.
- A **Host interface** is defined as the core's only route to its environment: which save to load, who is
  acting, what the settings are, and what events arrived.
- **StandaloneHost** is implemented for the home page: one actor, actions from the page's own UI,
  settings from eco3d.
- **PlatformHost** is implemented for the overlay, reading its inputs from the link exactly as the embed
  does today. The signed token, the channel-to-account binding and live settings are explicitly **not**
  in this change; they arrive with the platform contract and this host is the seat they plug into.
- The **render seam** is closed: the physics pose is joined to the genetics dressing, so a creature
  renders animated and role-coloured with no node skeleton, no grid and no debug overlay. The
  genetics-coloured renderer exists today but is static; the animated renderer colours by mechanical
  group. Neither is replaced, and the studio keeps every development affordance.
- A **motion layer** is added: motion is requested by name, and a name the animation track has not built
  yet resolves to cruising rather than to an error.
- The home page **stops being a static landing** and becomes the game surface. **BREAKING** against the
  existing `dragon-rendering` requirement that fixes it as a static landing.
- The overlay page stops applying a studio configuration blob from its link and instead mounts the core
  through its host. **BREAKING** against the existing `dragon-embed` requirement that the hash names the
  motion configuration.

Not in this change: anonymous sessions, any gameplay feature beyond what proves the core runs, the
platform contract, and any new movement primitive beyond cruise.

## Capabilities

### New Capabilities
- `game-core`: host-agnostic world state, rules and actions, plus the Host interface and its two
  implementations. Defines what the core may and may not know about its surroundings.
- `motion-vocabulary`: motion requested by name, the fallback rule, and how a named configuration
  published by the animation track is resolved.

### Modified Capabilities
- `dragon-rendering`: the home page is no longer a static landing, and a game render path is added that
  animates a role-coloured creature with no development affordances.
- `dragon-embed`: the overlay becomes a mount of the game core through a host, rather than a studio
  scene configured by its link.

## Impact

- New: the game core module, the Host interface and its two implementations, the motion layer, the game
  surface on the home page.
- Changed: `app/game/embed/page.tsx` mounts the core rather than the studio scene;
  `app/game/AnimatedModel.tsx` gains an animated role-coloured path alongside the two that exist;
  `app/page.tsx` stops being a static landing.
- Unchanged and deliberately so: `app/admin/animate/**` and every development affordance in it,
  `app/game/locomotion/**`, the rig authoring pipeline, and the observation harness under `scripts/`.
- Note: `dragon-embed` still carries a requirement that the camera follows the creature, which the
  unarchived `add-flight-tank` change already replaced with a fixed tank camera. That delta lands when
  that change is archived and is not restated here.
