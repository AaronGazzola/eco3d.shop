## Context

The overlay renders a dragon in a frame whose address carries `?t=<jwt>`. It reads the rig from its own
hash, ignores the token, and has no idea whose channel it is on.

On the host side: the token is HS256, signed with a secret held per overlay, naming the overlay, the
channel, the installation and an opaque subject. Settings arrive over a `postMessage` protocol. Each
chat command run for this overlay arrives the same way, carrying an actor that is opaque and stable per
channel per overlay.

`docs/game-architecture.md` decision 5 already fixes the shape: *"Vids.Tube signs a short-lived token
naming the channel and hands it to the frame. eco3d verifies it."*

## Goals / Non-Goals

**Goals:**

- The overlay knows which channel it serves, and can prove it rather than assume it.
- A chatter's `!feed` feeds the creature, credited to that chatter without eco3d learning who they are.
- The streamer names the creature from Vids.Tube.
- The second implementation of the protocol exists, written from the specification.

**Non-Goals:**

- The pairing claim. Binding a channel to an eco3d account needs an account model and a save model.
  Neither exists, and the anonymous sessions they rest on were deliberately excluded from the game core.
- Using the box size. Delivered by the protocol now, spent by G2b.
- Any change to the home page or the studio. The core is host-agnostic precisely so this touches one
  host.
- Rate limiting a viewer. The command registry's cooldown and per-stream limit are the streamer's, are
  enforced before eco3d sees anything, and duplicating them here would be a second opinion nobody asked
  for.

## Decisions

### The token is verified on the server, and only the claims cross to the browser

The signing secret is eco3d's. A browser that held it could mint tokens for any channel on this overlay.
`verifyChannelTokenAction` takes the token, verifies it with `node:crypto`, and returns the claims or
null. The secret never leaves the server, and the page holds only what the claims said.

**Alternative rejected — trusting the token without verifying it.** The claims are readable without a
signature, and for a name-only token the practical difference is small today. It is exactly the shortcut
that becomes a vulnerability the moment the channel decides what a save is, which is the next thing that
happens.

### The protocol is implemented here, not loaded from the host

The host serves an SDK and states plainly that the protocol is the contract and the SDK is a
convenience. Writing eco3d's own client is how that claim gets tested, and it costs about forty lines.

It also avoids a runtime dependency on the host being reachable to render a creature, and avoids a
cross-origin script in a page that will eventually be proxied through somebody else's domain.

**Alternative rejected — vendoring the host's file.** Same forty lines, plus a copy that drifts silently.

### A chatter is a viewer, and the creature is fed by them

The event's `actor` is opaque, stable per channel per overlay, and is used as the actor id. The display
name is used for display and nothing else, which is what the host's own documentation asks for.

`ActorKind` has had `viewer` in it since the core was written, unused. This is the change that uses it,
and the core needed no modification to accept it: `dispatch` already credits `actor.displayName` and
`raise` already takes an actor.

### A verified channel gates the conversation, and that is what the secret is for

The protocol accepts messages from whatever framed the overlay. That is deliberate — an overlay cannot
know its host's origin, and will know less once overlays are proxied — but it means a page that frames
this overlay could send fake settings and fake feed events.

Today that costs nothing, because nothing persists. It stops costing nothing the moment a channel owns a
save, so the rule is written now while it is twenty lines: **no settings and no events are acted on until
a token has verified and named a channel.**

This changes what the signing secret is. It was going to be a nicety for the pairing claim later; it is
in fact the only thing that makes the message channel trustworthy, and the overlay is inert without it.

### Announcing once is a race the frame always loses

Found by this change, not reasoned about. Gating the conversation moved the announcement later by one
server round trip, and the feed stopped arriving.

The host attaches its listener when its own state is ready. An announcement landing a moment earlier is
heard by nobody, and a frame that announces exactly once is then silent for the rest of the stream. The
only symptom is that chat appears to do nothing, which is close to undebuggable from the outside.

The frame therefore re-announces every half second until it is answered. The same single-shot bug was in
the host's own SDK, where a third party would have hit it too, and is fixed there as well.

### Settings are mapped, not adopted

The host hands over an opaque object. eco3d maps `creatureName` onto its own `GameSettings` and ignores
everything else, so a key added to the blob later cannot break the game and a key removed falls back to
the default.

`world.tick` already re-reads `host.getSettings()` every tick, so a settings change reaches the running
creature with no further plumbing.

### The rig stays in the hash; the token says nothing about it

The token names a channel, not a creature. The rig is eco3d's own configuration, authored into the entry
address by eco3d, and the host carries it through untouched by design.

That stops being true when a channel names a save, which is the pairing work.

### What the declaration says lives on the host

The dragon's registry row declares one setting and one command. That declaration is authored by the
overlay's owner, which is eco3d, but stored on the host because that is where the streamer's editor and
the streamer's command registry read it.

It is written by the host's seed script, which is how the first-party row has been authored throughout.

## Risks / Trade-offs

- **Two implementations of one protocol will drift** → the drift is what the version number exists for,
  and a second implementation existing at all is the evidence that a third party could write one.
- **A missing or invalid token leaves the overlay running but anonymous** → deliberate. A creature that
  refuses to render because a token expired is a worse failure on a live stream than one that keeps
  swimming and cannot be fed.
- **The creature name arrives after the first frame** → it is a label, and the default is the creature's
  name today.
- **eco3d cannot test the host end without the host running** → the end-to-end test skips when the host
  is not reachable, and says so, rather than passing on a stub.

## Migration Plan

1. Declare the setting and the command on the host's registry row, by its seed script.
2. Deploy eco3d. An overlay with no token keeps rendering exactly as it does now.
