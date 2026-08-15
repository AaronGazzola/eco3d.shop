# Tasks

## 1. Verifying the token

- [x] 1.1 `app/game/platform/token.ts`: `verifyChannelToken(token, secret, nowS)` implementing HS256
      verification with `node:crypto` — reject any algorithm but HS256, compare signatures with
      `timingSafeEqual`, reject an expiry in the past, a foreign issuer and a token naming no channel.
      Returns the claims or null, and throws on nothing.
- [x] 1.2 `scripts/check-platform-token.ts`: ten checks, all passing. A token signed with our secret
      verifies and carries its installation; a foreign secret, a payload edited after signing, an `alg`
      of `none`, an expiry in the past, a foreign issuer, an empty channel, five shapes of rubbish and an
      absent secret are each refused.
- [x] 1.3 `app/game/platform/page.actions.ts`: `verifyChannelTokenAction(token)` reading
      `VIDSTUBE_OVERLAY_SECRET` on the server. The secret verifies tokens for this overlay on every
      channel, so a browser holding it could mint one naming any channel it liked.
- [x] 1.4 The secret is set in eco3d's Doppler `prd` config, piped from the host's `overlay_secrets` row
      by `../Vids.Tube/scripts/share-overlay-secret.ts` without being printed, put on a command line, or
      written to disk. 44 characters, no trailing whitespace, confirmed by length rather than by value.

      This is the manual step a developer portal replaces once strangers write overlays.

## 2. Speaking the protocol

- [x] 2.1 `app/game/platform/channel.ts`: `connectPlatform()` written from the specification rather than
      from the host's SDK. Announces `ready` to the parent, accepts a message only from the parent
      window, only in the `vidstube-overlay` namespace, only at version 1.
- [x] 2.2 Same file: returns a disconnect that removes the listener and stops the retry, and does nothing
      at all when there is no parent, so the page standing alone waits for nothing.
- [x] 2.3 Same file: **re-announces every half second until answered.** Announcing once is a race the
      frame always loses, and losing it leaves it silent for the rest of the stream. Found by this
      change; recorded in design.md; the same bug fixed in the host's SDK, where a third party would have
      hit it too.
- [x] 2.4 `scripts/check-platform-channel.ts`: nine checks, all passing. It announces itself, to a
      wildcard because it cannot know the host's origin; `hello` brings the channel, the settings and the
      box; a later settings change and an event are delivered; a stranger, a foreign namespace, an
      unknown version and rubbish are ignored; disconnecting stops delivery; and it keeps announcing
      while nobody answers, then stops once answered.

## 3. Turning an event into a game action

- [x] 3.1 `app/game/platform/actions.ts`: `actionForCommand(keyword)` mapping `feed` to `{ kind: 'feed' }`
      and returning null for anything else. The one place a command becomes an action.
- [x] 3.2 `app/game/hosts.ts`: `createPlatformHost` exposes `applyPlatformSettings`, so `world.tick`'s
      existing re-read of `getSettings()` carries a change to the creature with no further plumbing.
- [x] 3.3 Same file: `deliver` raises the action on behalf of an actor built from the event's opaque
      actor and display name, with `kind: 'viewer'`. The core needed no change to accept one.
- [x] 3.4 Same file: a command with no mapping is ignored and logged, never guessed at.

## 4. The overlay page

- [x] 4.1 `app/game/embed/page.tsx`: reads the token from the query string and verifies it through the
      action. An unverified token leaves the creature rendering, because a blank frame on a live stream
      is a worse failure than a creature nobody can feed.
- [x] 4.2 Same file: the protocol is connected **only once a channel has verified**, so a page that
      frames this overlay cannot feed the dragon by pretending to be the platform. Settings feed into the
      host; each event becomes an action.
- [x] 4.3 `app/game/hosts.ts` maps `creatureName` onto `GameSettings`, ignoring every key eco3d does not
      know and falling back to the default when it is absent or empty.
- [x] 4.4 A read-only `__game` observation handle, in the spirit of `__studio` and
      `docs/observation-loop.md`. A creature being fed changes nothing a camera can see, so without it the
      only way to claim this works would be to assert that it must. It exposes state and no way to change
      it.

## 5. The declaration on the host

- [x] 5.1 `../Vids.Tube/scripts/seed-dragon-overlay.ts` declares a `creatureName` text setting and a
      `feed` command on the dragon's row, and registers the command on the installed channel the same way
      installing does. Run twice: `registry rows: 1, installations: 1, secrets: 1, commands: 1` both
      times.

      The first run reported `commands: 0`, because the upsert selected only `id` and the declaration was
      never read back.
- [x] 5.2 Confirmed by the end-to-end run below rather than by eye: the `feed` command exists on the
      channel, because a command event naming it is routed to the overlay.

## 6. Verify

- [x] 6.1 `npx tsc --noEmit` and `npx eslint` both clean across eco3d.
- [x] 6.2 `doppler run -- npx next build` completes.
- [x] 6.3 The signing secret's name appears in none of the 52 client chunks under `.next/static`, so no
      server-only module reached a browser bundle.
- [x] 6.4 `../Vids.Tube/tests/e2e/overlay-feeds-dragon.spec.ts`, run three consecutive times, all
      passing. Against the real overlay route framing the real eco3d overlay, with nothing stubbed: the
      channel verifies, a chat message and its command event are inserted, the creature is fed, hunger
      drops, and the credit reads the chatter's display name. A second chatter takes the credit, and no
      command arrives that the game cannot map.
- [x] 6.5 `npx tsx scripts/check-game-core.ts` and `check-motion-vocabulary.ts` both pass, so the core is
      still host-agnostic and still names no preset. The home page and the studio are untouched.
