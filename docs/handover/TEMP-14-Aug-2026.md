# Handover — DELETE AFTER READING

**Written 14-Aug-2026. Disposable by design.**

This is a one-shot baton, not a reference. Read it once, act on it, then delete it. Never cite it as a
source and never update it in place in a later session.

> `TEMP-12-Aug-2026.md` may still sit beside this file. It is **superseded**; everything durable from it
> is carried forward here. Read this one, delete both.

## Where the durable record lives

- `docs/game-architecture.md` — the platform seam and eleven locked decisions with their reasoning. All
  architecture questions end here.
- `../Vids.Tube/docs/overlay-platform.md` — the host side of the same contract, six decisions.
- `docs/roadmap.md` — the two-track split and the G phases.
- `docs/animation-roadmap.md` — decisions, phases, the measured baseline, the dated status log.
- `docs/dragon-genetics.md` — **read before planning any genetics work.** Far more has landed than the
  roadmap's E2 entry suggests.
- `openspec/specs/` — `game-core`, `motion-vocabulary`, `dragon-rendering`, `dragon-embed`, `locomotion`
  now describe the running code, because both changes archived today.

## What this session finished

**The eco3d half of the foundation is complete, and there is a game you can look at.**

- `app/game/core/` holds the game core: world state, an explicit tick, one `feed` action, and a
  `GameHost` interface with four members. It imports nothing outside itself, asserted rather than
  assumed.
- `app/game/motion/resolve.ts` resolves a motion name to a preset. `cruise` is the Phase T1 flight
  baseline; every other name falls back to cruise and records that it did.
- The home page and `/game/embed` both mount that core through `StandaloneHost` and `PlatformHost`.
- The creature is painted piece by piece from a piece-to-colour map in three matte PHA colours, with no
  node skeleton, no grid and no diagnostics.
- **Both OpenSpec changes archived:** `add-game-core-and-hosts` and `add-flight-tank`. No change is
  active. Nothing is half-written.

**Owner decisions today:** the flight baseline is approved as good enough for this phase, and the depth
cue check left the flight change for Linear as **AZ-257** rather than lingering unchecked.

## Pick up here — the Vids.Tube platform contract

This is the next foundation piece and it lives in `../Vids.Tube`. Read
`../Vids.Tube/docs/overlay-platform.md` first; §5 and §6 are the work list. Promote it into an OpenSpec
change in that repository before writing code.

- An overlay registry: id, owner, declared origins, declared permissions, status. One row in it.
- Token minting: short-lived, signed, naming the overlay, the channel and an opaque per-channel viewer.
- Settings stored per channel per overlay as an opaque blob the overlay owns, plus the streamer-facing
  editor.
- The two-way message channel between page and frame, and the small SDK the frame loads.
- Event routing by subscription, wired to the existing command registry.
- Replace `NEXT_PUBLIC_GAME_EMBED_URL`, which carries one streamer's whole configuration and cannot
  serve two, with a per-channel frame carrying a token.

**Deferred by decision, not oversight:** the wildcard subdomain and proxy, the review flow, the
permissions UI, the catalogue. An overlay cannot tell whether it is proxied, so adding the proxy later is
work rather than a rewrite — **but only while the four foundation points above are honoured.**

Then, on the eco3d side, `PlatformHost` stops reading the link and verifies the token, and the pairing
claim binds a channel to an account.

## Traps

- **`npm run build` fails**, prerendering `/` on a missing Supabase variable. Use
  `doppler run -- npx next build`.
- **Someone else works in `../Vids.Tube`.** Files unrelated to this work changed there during this
  session, and a change was archived there mid-session. Never commit that repository wholesale; stage
  your own files by name.
- **`filament_colors` is not the PHA palette.** Nine rows, all flagged available, all demo or test
  colours. Reading it paints the creature in developer colours. The three PHA colours are named in
  `app/game/palette.ts` and marked provisional until E2 seeds the real ones.
- **The pitch limits are placeholders.** Every group of both rigs reads exactly 30.0°, the code default,
  while sideways limits are genuinely measured and vary 17°–39°. AZ-246 tracks measuring them. Say
  "placeholder" in any report that uses 30°.
- **A capture that ends before the failure is not evidence of its absence.** A 30 s flight run was read
  as a pass; a 90 s run of the same configuration showed the body destroyed by 45 s.
- **The overlay is watchable for about 22 seconds**, then presses into the glass and rolls. Accepted;
  turning is the fix.
- **`AnimatedModel` still accepts `showNodes`.** The game-facing components expose no such prop, but the
  underlying renderer can still draw one. Do not describe the guarantee as stronger than that.
- **AZ-183 and AZ-184 are closed but describe a codebase that does not exist.** Both carry a correction
  note; read the correction, not the body.

## Tried and rejected — do not re-propose

- **Twitch's uploaded-bundle hosting model.** No review capacity, no matching threat model, and it would
  put animation code behind the host's dev server.
- **Signing into eco3d through the overlay.** Storage is partitioned, so a session in a tab is invisible
  in the frame, and an OBS browser source is barely interactive. Replaced by a one-time pairing claim.
- **Reading `filament_colors` for the game palette.** See the traps above.
- **Colouring a creature by role.** A print is many small pieces each in one filament, so role-wide
  blocks read as three painted zones, which is a different object.
- **Foot grip as a solver pin, keyframe pose cycles, foot planting as a goal, elastic tank walls, active
  roll control.** Reasons in `docs/animation-roadmap.md`.

## How to run it

From PowerShell, never the bash sandbox, which resets Supabase auth. Never observe a dev server.

```
doppler run -- npx next build
doppler run -- npx next start -p 3002        # run detached; stop the old one first, the port stays bound
node scripts/capture-home.mjs 10             # home page game surface
node scripts/verify-embed.mjs <rig-id> 15    # overlay, fresh context, no session
npx tsx scripts/check-game-core.ts
npx tsx scripts/check-motion-vocabulary.ts
doppler run -- npx tsx scripts/list-rigs.ts  # rig ids, role tag counts, available filaments
```

- **Rebuild and restart after every app-code change.** There is no hot reload; a running production
  server keeps serving the old bundle. This bit twice today.
- Discard a warm-up run before any measurement that will be compared.
- Auth is cached in `scripts/.observe-auth.json`. Forward axis is **−X**, lateral is **Z**.

## Repository state

- eco3d: everything committed and pushed on `main`. Working tree clean. No active OpenSpec change.
- Vids.Tube: the platform document and its roadmap entry are committed. Other work there is not mine.
- One branch, `dev`, untouched since 13-Feb-2026. Confirm nothing is wanted, then delete it.
