# Handover — DELETE AFTER READING

**Written 15-Aug-2026. Disposable by design.**

A one-shot baton, not a reference. Read it once, act on it, then delete it. Never cite it as a source and
never update it in place. Where it disagrees with a spec or a roadmap, those win.

This replaces an earlier file of the same name written the same day, whose plan item 1 is now built and
whose central claim about that item was wrong.

## Where the durable record lives

- `docs/animation-roadmap.md` — Decision 16 and the 15-Aug status entry carry the grounded creature, the
  measured numbers and both corrections. This is the source, not this file.
- `docs/game-architecture.md` — the platform seam and the eleven locked decisions.
- `../Vids.Tube/docs/overlay-platform.md` — the host side.
- `openspec/specs/` — both repositories. `locomotion`, `motion-vocabulary` and `dragon-embed` were all
  updated on 15-Aug.

## The one thing to action first

**Fourteen fake `!feed` chat messages are sitting in a real stream's chat, and they are mine.**

- The end-to-end test writes a real `chat_messages` row and a real `command_events` row against the
  **production** database, and cleaned up only the event. Every run left a `!feed` behind, authored
  `Bob` or `Ada`, attached to the newest stream on the first channel.
- Fourteen accumulated on 15-Aug between 08:23 and 12:40 UTC. They show in the activity panel and in the
  stream's chat, and they read as though a viewer typed them.
- **They are not in any broadcast and nothing was published.** They are rows in `chat_messages` keyed by
  `stream_id`. Nothing was streamed, nothing reached YouTube, no video contains them.
- **The leak is fixed** (`../Vids.Tube` commit 2aef63c): the test now tracks its message ids and deletes
  them in `afterAll`, events first because an event references its message. Verified by re-running it and
  watching the count stay at fourteen instead of going to sixteen.
- **The fourteen already written were deliberately left alone.** They are the owner's data, on the
  owner's channel, and deleting production rows was not something to do unasked. They are exactly
  identifiable: `body = '!feed'` **and** `external_author_id` starting `external-`. Nothing a real viewer
  types can carry that prefix. Delete them on the owner's word, not before.

## What is finished

**The two products are connected and the creature is grounded.**

- A chatter types `!feed` and the dragon is fed, credited by the name chat shows. Proven end to end with
  nothing stubbed, most recently 15-Aug.
- The overlay creature swims along the floor of a tank, watched from directly above, confined on all
  sides. `cruise` resolves to `ground tank`. Flight is sidelined, not abandoned.

## Commands: what works, and what has to be running

**Registered on the owner's channel right now** (`chat_commands`): `!feed` is the only `kind=overlay`
command, 30 s cooldown, bound to the `dragon` overlay. Alongside it are nine builtins (`!rank`, `!top`,
`!goal`, `!uptime`, `!tts`, `!voices`, `!ask`, `!catchup`, `!clip`) and nine custom text replies (`!pc`,
`!apps`, `!discord`, `!model`, `!keyboard`, `!age`, `!job`, `!skills`, `!topic`). All enabled.

**The chain a real `!feed` travels, and every link that must be up:**

1. A viewer types it in YouTube chat. The chat bridge has to be connected, which means a **live** stream.
2. The **worker** (`npm run worker` in `../Vids.Tube`) runs `processCommands` and writes a
   `command_events` row with `status: 'executed'`. **Nothing happens without the worker running.**
3. The overlay page reads executed events whose keyword is registered to the installed overlay
   (`lib/overlay-events.ts`), turning the participant into an opaque per-overlay actor id.
4. It posts them over the `postMessage` channel into the framed game, which feeds the creature.

**So: can people use `!feed` today? Only in a narrow sense.** The command is registered and the whole
chain works, but step 4 lands on `localhost:3001` — see the next section. Nobody but the owner's own
machine can render the dragon.

## The overlay: how it actually runs, and how to test it with nothing streaming

- The overlay is an ordinary page: `/overlay/<channel-slug>?token=<overlay_layouts.token>`. **No stream
  is needed to look at it.** The Overlays tab on `/live` composes the same renderer.
- **`overlays.entry_url` currently points at `http://localhost:3001`.** That is the address Vids.Tube
  frames. It follows that the dragon renders only on a machine running eco3d locally on port 3001. An OBS
  browser source on another machine, or any other viewer, gets an empty box. **This is the single biggest
  thing standing between the current state and a real stream.**
- **Two settings control the framed address and both must agree.** `NEXT_PUBLIC_GAME_EMBED_URL` in
  Vids.Tube's Doppler contributes only its **origin**, to the security policy, and is build-time so a
  database row can never introduce a foreign origin. `overlays.entry_url` is the actual per-overlay
  address. There is no UI for either. `scripts/seed-dragon-overlay.ts` writes the row and normalises it,
  keeping only the rig and leg weight out of the link.
- **To fire a `!feed` yourself with nothing streaming**, write a `command_events` row with
  `status: 'executed'` for the keyword. `tests/e2e/overlay-feeds-dragon.spec.ts` is the working reference.
  `command_events.stream_id` is NOT NULL, so it needs a stream row, though not a live one.
  **Now that the test cleans up after itself, copy its cleanup too** if you hand-roll this.
- The signing secret lives in eco3d's Doppler `prd` as `VIDSTUBE_OVERLAY_SECRET`, shared from the host's
  row by `../Vids.Tube/scripts/share-overlay-secret.ts`. Never print it.

## Resizing: what is true today, and what is not

This is the area most likely to be misremembered, so it is spelled out.

**The overlay's game window cannot change shape today.**

- `lib/demo-overlay.ts` `OVERLAY_BASE_DIMS.game` is a fixed **480 × 320**, and the saved layout carries a
  **scale only**. There is no width or height in the box model.
- `components/overlay/game-window.tsx` pins the iframe to those exact numbers. Scaling in the composer is
  a CSS transform on an ancestor, so **the game still renders at 480 × 320** and is stretched up or down.
  The camera never sees a viewport change, so it never refits.

**The tank does not follow the box, at all.**

- The tank is **60 × 30 × 40**, fixed in the `ground tank` preset. Nothing derives it from anything.
- Making the overlay box smaller does **not** make the creature's world smaller and does **not** make it
  bump into nearer walls. It just draws the same tank smaller on screen.

**What IS already built, and will not need doing again:**

- The protocol already carries the box. The `box` message has `width`, `height` and `scale`, the host
  already sends it, and eco3d's `connectPlatform` already exposes `onBox`. **The game simply ignores it** —
  the embed page subscribes to `onSettings` and `onEvent` only. Wiring it is a listener, not a protocol
  change.
- The camera already refits on a genuine viewport change, and that is checked at aspect ratios 0.5, 1.0,
  1.78 and 3.0 over three tank shapes by `scripts/check-tank-fit.ts`. Once the iframe is really resized,
  framing follows on its own.
- **Overhead framing no longer depends on tank height at all.** The camera fits the tank's *floor*, not
  its near face. This was measured: fitting the near face overhead means fitting the ceiling, which put
  the creature thirty units beyond the framed plane at about a fifth of the window. So headroom is now
  free, and the room-size setting only has to think about the floor.
- Tank dimensions are already store values written into the MJCF, and `tankBounds` is already published.

**The known cost, which the owner should hear before dragging a handle live:** the tank walls are geometry
inside the MuJoCo model, so changing tank size rebuilds the model and the creature restarts from the
middle. That is a property of the engine, not a bug to be patched around cheaply.

## Still outstanding from the approved plan

> Still outstanding from the approved plan — the feed button in the Overlays panel, the resizable box on
> Vids.Tube, the tank taking the box's shape, and the pairing claim. Item 4 is where "how large the dragon
> is within its container" gets its setting; the camera work here already made tank height irrelevant to
> that, so it will not fight you.

Detail on each, in the order they were approved:

### 2. A feed button in the Overlays panel

- `app/(app)/live/overlay-install-list.tsx`, beside the installed overlay, matching the Play buttons that
  already exist for highlights, TTS and asks in `overlays-tab.tsx`.
- It writes a `command_events` row with `status: 'executed'` for that overlay's keyword, exactly as the
  worker would. The end-to-end test is the reference.
- **Why it is needed:** firing a command otherwise needs a live stream with real chat. This makes the
  whole loop testable from one screen.
- **Do not repeat the leak.** A button that writes a `chat_messages` row would put fake chat on the
  owner's stream every click. Either write only the `command_events` row and accept a null author name, or
  decide deliberately what the credit should read as.

### 3. A resizable box on Vids.Tube

- The box model needs width and height rather than scale alone, and the composer needs a drag handle.
- The iframe must be given the real dimensions instead of the pinned 480 × 320, or the camera will still
  never see a resize.

### 4. The tank takes the box's shape

- Subscribe to `onBox` in `app/game/embed/page.tsx` and derive tank width and depth from the box's aspect,
  so a narrower box is a narrower tank and the creature bumps into the nearer wall.
- **Size the tank, never the dragon.** Rescaling a physics rig changes mass and inertia and would need the
  locomotion retuned. The setting reads as room in creature-lengths; a smaller number looks like a bigger
  dragon.
- Height can be whatever is convenient. Nothing overhead depends on it any more.

### 5. The pairing claim

- Per `docs/game-architecture.md` decision 5.
- **What exists:** `profiles` for accounts, and a `dragons` table with `user_id`, `name`, `stage` and
  `genotype`. The overlay already verifies a channel id.
- **What is missing:** a row binding a Vids.Tube channel to an eco3d account, and the game core reading
  and writing a `dragons` row instead of naming a rig from a URL.
- The flow: on first sight of an unbound channel the overlay shows a short pairing code; the streamer
  claims it once from a normal eco3d tab; the binding lives in eco3d.
- **State the cost plainly when starting it.** Anonymous sessions were deliberately excluded from the game
  core, and a home-page visitor still has no identity. Decide whether pairing covers only the overlay or
  the home page too.

## Traps

- **Rebuild and restart eco3d after every app change.** No hot reload; a running production server keeps
  serving the old bundle. This applies to the studio on 3002 as well as the game on 3001. Vids.Tube's dev
  server does hot reload and needs neither.
- **A capture taken with `--set` flags is not a capture of a preset.** A 90 s run taken with twenty flags
  silently carried `frontDrive` 0.6, `liftAmount` 0.3 and a stale grip window, because every lever the
  flags did not name kept the browser's persisted store value. Use
  `npx tsx scripts/dump-preset-config.ts "<preset>" mujoco out.json` then `observe --config out.json`.
- **The observation harness's default rig name is stale.** It looks for `baby cyber dragon`; the rigs are
  called `Demo Dragon`. Set `OBSERVE_RIG='Demo Dragon'` until the default is fixed. It fails as an
  eight-second click timeout, which does not look like a naming problem.
- **Another session works in `../Vids.Tube`.** Stage your own files by name. `git add -A` swept their
  in-progress change into a commit once already. `worker/maintain.ts` is currently modified and is theirs.
- **A capture that ends before the failure is not evidence of its absence.**
- **The pitch limits are placeholders.** Every group reads exactly 30.0°, the code default. AZ-246.
- **Redundant coplanar contacts destabilise this solver.** Recorded three times now. Do not widen a
  contact mask to make one surface serve two purposes.

## Open tickets, not forgotten work

- **AZ-257** — verify the tank depth cue on the real overlay. Note this predates the overhead camera and
  may need rewording or closing: overhead is a plan view and has no depth cue by design.
- **AZ-258** — rate limit the overlay token exchange endpoint.

## How to run it

From PowerShell, never the bash sandbox.

```
# eco3d — the game, framed by the overlay
doppler run -- npx next build
doppler run -- npx next start -p 3001

# eco3d — the studio, for the observation harness
doppler run -- npx next start -p 3002

# checks
npx tsx scripts/check-tank-world.ts
npx tsx scripts/check-tank-fit.ts
npx tsx scripts/check-motion-vocabulary.ts
npx tsx scripts/check-game-core.ts
npx tsx scripts/check-platform-token.ts
npx tsx scripts/check-platform-channel.ts

# look at the overlay
node scripts/verify-embed.mjs <rig-id> 20

# measure a preset properly
npx tsx scripts/dump-preset-config.ts "ground tank" mujoco docs/diagnostics/observe/ground-tank.json
$env:OBSERVE_URL='http://127.0.0.1:3002'; $env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs login
node scripts/observe.mjs run 90 --hz 4 --config docs/diagnostics/observe/ground-tank.json

# Vids.Tube
doppler run -- npx vitest run
doppler run -- npx playwright test tests/e2e/overlay-feeds-dragon.spec.ts
doppler run -- npx tsx scripts/seed-dragon-overlay.ts
npm run worker      # required for a real chat command to become an event
```

The adult rig id used for captures is `5621e00d-0a85-401a-ad68-4384be69535a`.

## Repository state

- eco3d: committed and pushed through `7b4ade4`. No active OpenSpec change;
  `ground-the-overlay-creature` is archived as `2026-08-15-ground-the-overlay-creature`.
- Vids.Tube: the test fix is committed and pushed as `2aef63c`. Two active changes belong to the other
  session, `add-live-quality-ladder` and `scheduled-maintenance-runner`. Neither is yours.
- No dev servers should be running. They were stopped at the end of this session.
