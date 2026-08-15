## Why

Vids.Tube now offers everything `docs/game-architecture.md` §4 promised: a signed token naming the
channel, settings the streamer edits, and chat commands delivered to the frame. The overlay ignores all
of it, exactly as it ignored the installation id before that.

This is the change where a chatter types `!feed` and the dragon is fed. Everything either side needs
already exists; nothing has been connected.

## What Changes

- `PlatformHost` verifies the token in its address and learns which channel it is serving. Verification
  happens on the server, because the signing secret is eco3d's and must not reach a browser.
- The overlay speaks the platform protocol: it announces itself, and receives the channel, the settings
  and each chat command run for it.
- A `!feed` from chat feeds the creature, credited to a **viewer** actor rather than the streamer. The
  `viewer` actor kind has existed since the core was written and has never been used.
- The creature's name becomes a setting the streamer edits in Vids.Tube rather than a constant.
- The protocol is implemented in eco3d's own TypeScript rather than by loading the host's SDK. That is
  the claim the platform makes about itself, and building the second implementation is how it is tested.
- On the Vids.Tube side, the dragon's registry row declares what it has: a `creatureName` setting and a
  `feed` command. The declaration belongs to the overlay's owner, and eco3d is the owner.

## Capabilities

### New Capabilities

- `platform-contract`: the overlay proves which channel it serves, receives settings and chat events
  over the platform protocol, and turns a chatter's command into a game action by a pseudonymous actor.

### Modified Capabilities

- `dragon-embed`: the address carries a token as well as a rig, and the page speaks the protocol.
- `game-core`: an action may be raised by a viewer rather than only by the local player.

## Impact

- `app/game/platform/` holds the token verifier, the protocol client and the mapping from a command to a
  game action.
- One environment value, the overlay's signing secret, read on the server only.
- `app/game/hosts.ts` and `app/game/embed/page.tsx` change; the home page and the studio do not.
- **Not in this change:** the pairing claim that binds a channel to an eco3d account. It needs an account
  model and a save model, neither of which exists, and the anonymous-session work it depends on was
  deliberately deferred. Until then the overlay knows its channel and does not yet belong to anyone.
- **Not in this change:** the tank taking the shape of its box. The protocol now delivers the box size,
  and using it is the separate G2b work.
