# Handover — DELETE AFTER READING

**Written 15-Aug-2026. Disposable by design.**

A one-shot baton, not a reference. Read it once, act on it, then delete it. Never cite it as a source and
never update it in place. Where it disagrees with a spec or a roadmap, those win.

## Where the durable record lives

- `docs/game-architecture.md` — the platform seam, eleven locked decisions, and §7b on the tank taking
  the shape of its box.
- `../Vids.Tube/docs/overlay-platform.md` — the host side. §7 is the planned work and what would block it.
- `docs/roadmap.md` — the two tracks and the G phases, including G2b.
- `openspec/specs/` — both repositories. Five new capabilities describe running code.

## What is finished

**The platform's four foundation points are all built, and the two products are connected.** A chatter
types `!feed` and the dragon is fed. Proven three consecutive times against the real overlay framing the
real game, with nothing stubbed.

- Vids.Tube: overlay registry, signed per-overlay tokens with opaque per-channel subjects, settings as an
  opaque blob with a streamer editor, chat commands routed by subscription, and a page-to-frame message
  channel. Five changes archived.
- eco3d: the overlay verifies its token on the server, speaks the protocol in its own TypeScript, and
  turns a chat command into a game action credited to a viewer. One change archived.

## The approved plan, in order

The owner approved all of this on 15-Aug-2026. Nothing here is started.

### 1. Grounded swim and a top-down camera

- **This is a subtraction, not new tuning.** `base swim` in `app/admin/animate/simPresets.ts` is the
  approved grounded baseline: gravity on, drag on, 1.53 u/s, straight and flat. `flight base` is that
  same preset with gravity removed and a tank added. The grounded tank preset is `base swim` plus
  `tankEnabled`.
- Point `cruise` in `app/game/motion/resolve.ts` at it. Nothing in the game changes — that is what naming
  motions bought.
- `app/game/TankCamera.tsx` sits square-on to the tank's +Z face. It needs a top-down variant looking
  down −Y, fitting width and depth rather than width and height.
- Flight is **sidelined, not abandoned.** The owner intends to revisit walking later.

### 2. A feed button in the Overlays panel

- `app/(app)/live/overlay-install-list.tsx`, beside the installed overlay, matching the Play buttons that
  already exist for highlights, TTS and asks in `overlays-tab.tsx`.
- It writes a `command_events` row with `status: 'executed'` for that overlay's keyword, exactly as the
  worker would. `tests/e2e/overlay-feeds-dragon.spec.ts` already does this and is the reference.
- **Why it is needed:** firing a command otherwise requires a live stream with real chat. This makes the
  whole loop testable from one screen with nothing streaming.
- `command_events.stream_id` is NOT NULL, so it needs a stream row — any stream, not a live one.

### 3. A resizable box on Vids.Tube

- `lib/demo-overlay.ts` `OVERLAY_BASE_DIMS.game` is a fixed size and the saved layout carries a scale
  only, so the box's aspect ratio cannot change. The box model needs width and height, and the composer
  needs a drag handle.
- **The protocol needs nothing.** The `box` message already carries width, height and scale.

### 4. The tank takes the box's shape

- Derive tank width and depth from the box's aspect so a narrower box is a narrower tank and the creature
  bumps into the nearer wall.
- **Size the tank, never the dragon.** Rescaling a physics rig changes mass and inertia and would need
  the locomotion retuned. The setting reads as room in creature-lengths; a smaller number looks like a
  bigger dragon.
- **Known cost, tell the owner before they drag a handle live:** the tank walls are geometry inside the
  MuJoCo model, so resizing rebuilds the model and the creature restarts from the middle.
- Checked, not assumed: tank dimensions are already store values written into the MJCF, and `TankCamera`
  already refits on viewport change. What is missing is only that nothing derives the tank from the box.

### 5. The pairing claim

- The owner approved implementing the intended design from `docs/game-architecture.md` decision 5.
- **What exists:** `profiles` for accounts, and a `dragons` table with `user_id`, `name`, `stage` and
  `genotype`. The overlay already verifies a channel id.
- **What is missing:** a row binding a Vids.Tube channel to an eco3d account, and the game core reading
  and writing a `dragons` row instead of naming a rig from a URL.
- The flow: on first sight of an unbound channel the overlay shows a short pairing code; the streamer
  claims it once from a normal eco3d tab; the binding lives in eco3d.
- **State the cost plainly when starting it.** Anonymous sessions were deliberately excluded from the
  game core, and a home-page visitor still has no identity. Decide whether pairing covers only the
  overlay or the home page too.

## Traps

- **Rebuild and restart eco3d after every app change.** No hot reload; a running production server keeps
  serving the old bundle. Vids.Tube's dev server does hot reload and needs neither.
- **eco3d must be running on port 3001** for anything on the overlay to work. That is what
  `overlays.entry_url` points at.
- **Two settings control the framed address and both must agree.** `NEXT_PUBLIC_GAME_EMBED_URL` in
  Vids.Tube's Doppler contributes only its **origin**, to the security policy; `overlays.entry_url` is
  the actual address. There is no UI for either. The seed script writes the row and now normalises it.
- **Another session works in `../Vids.Tube`.** Stage your own files by name. `git add -A` swept their
  in-progress change into a commit this session; it was put back to untracked, but do not repeat it.
- **The masking hook missed a Doppler service token** in `doppler configure --json` output this session.
  It is in the transcript. Worth rotating and worth a masking rule.
- **A capture that ends before the failure is not evidence of its absence.**
- **The pitch limits are placeholders.** Every group reads exactly 30.0°, the code default. AZ-246.

## Open tickets, not forgotten work

- **AZ-257** — verify the tank depth cue on the real overlay.
- **AZ-258** — rate limit the overlay token exchange endpoint.

## How to run it

From PowerShell, never the bash sandbox.

```
# eco3d, framed by the overlay
doppler run -- npx next build
doppler run -- npx next start -p 3001

# checks
npx tsx scripts/check-platform-token.ts
npx tsx scripts/check-platform-channel.ts
npx tsx scripts/check-game-core.ts
npx tsx scripts/check-motion-vocabulary.ts
node scripts/capture-home.mjs 10

# Vids.Tube
doppler run -- npx vitest run
doppler run -- npx playwright test tests/e2e/overlay-feeds-dragon.spec.ts
doppler run -- npx tsx scripts/check-overlay-registry-rls.ts
doppler run -- npx tsx scripts/seed-dragon-overlay.ts
```

- The overlay is an ordinary page: `/overlay/<channel-slug>?token=<overlay_layouts.token>`. No stream
  needed. The Overlays tab on `/live` composes the same renderer.
- The signing secret is in eco3d's Doppler `prd` as `VIDSTUBE_OVERLAY_SECRET`, shared from the host's row
  by `../Vids.Tube/scripts/share-overlay-secret.ts`. Never print it.

## Repository state

- Both repositories committed and pushed. No active OpenSpec change in eco3d.
- Vids.Tube has two active changes belonging to the other session: `add-live-quality-ladder` and
  `scheduled-maintenance-runner`. Neither is yours.
