# platform-contract Specification

## Purpose
TBD - created by archiving change add-platform-contract-client. Update Purpose after archive.
## Requirements
### Requirement: The overlay proves which channel it serves

The overlay SHALL read the token from its address and SHALL verify its signature before believing any
claim in it. Verification SHALL happen on the server, so that the signing secret is never present in a
browser.

An absent, malformed, expired or wrongly signed token SHALL leave the overlay running and unattached
rather than blank. A creature that refuses to render because a token expired is a worse failure on a
live stream than one that keeps swimming and cannot be fed.

The overlay SHALL NOT act on a claim from a token it has not verified.

#### Scenario: A valid token names a channel

- **WHEN** the overlay loads with a token signed by the overlay's own secret
- **THEN** the channel named in that token is known to the overlay

#### Scenario: A forged token is not believed

- **WHEN** the overlay loads with a token signed by anything else
- **THEN** no channel is known, and the creature still renders

#### Scenario: An expired token is not believed

- **WHEN** the overlay loads with a token past its expiry
- **THEN** no channel is known, and the creature still renders

#### Scenario: The secret is not in the browser

- **WHEN** the overlay's client bundle is searched
- **THEN** the signing secret does not appear in it

### Requirement: A verified channel gates the conversation

The overlay SHALL NOT act on any settings or any event until it holds a channel from a token it has
verified. Until then, messages SHALL be ignored.

A page that frames this overlay is not, by that act alone, its host. The protocol deliberately accepts
messages from whatever framed the overlay, because an overlay cannot know its host's origin and will know
less once overlays are proxied. The token is therefore the only thing that ties a message to the platform
rather than to whoever put the overlay in an iframe.

The creature SHALL still render while unverified. Refusing to draw is a worse failure on a live stream
than a creature nobody can feed.

#### Scenario: An unverified frame is not fed

- **GIVEN** the overlay has no verified channel
- **WHEN** a well-formed feed event arrives from the page that framed it
- **THEN** the creature is not fed, and the refusal is logged

#### Scenario: Settings from an unverified frame are ignored

- **GIVEN** the overlay has no verified channel
- **WHEN** settings arrive naming the creature
- **THEN** the creature keeps its default name

#### Scenario: Verifying opens the conversation

- **GIVEN** a token that verifies and names a channel
- **WHEN** an event arrives afterwards
- **THEN** it is acted on

#### Scenario: The creature renders regardless

- **WHEN** no token verifies
- **THEN** the creature still renders and still moves

### Requirement: The overlay speaks the platform protocol

The overlay SHALL announce itself to its host, and SHALL accept messages only from the window that
framed it, only in the protocol's namespace, and only in a version it understands.

The overlay SHALL accept the channel, the settings and the events its host sends. A message it does not
understand SHALL be ignored rather than guessed at.

The overlay SHALL NOT require the host's SDK. The protocol is the contract.

#### Scenario: Announcing brings the state back

- **WHEN** the overlay announces itself to a host that speaks the protocol
- **THEN** it receives the channel, the settings and the size of its box

#### Scenario: A stranger is ignored

- **WHEN** a message arrives from a window that is not the overlay's parent
- **THEN** it is ignored

#### Scenario: Another protocol is ignored

- **WHEN** a message arrives in a namespace or a version the overlay does not know
- **THEN** it is ignored

#### Scenario: Standing alone still works

- **WHEN** the overlay is opened outside any frame
- **THEN** the creature renders and nothing waits for a host that will never answer

### Requirement: A chatter's command feeds the creature, as a viewer

An event naming a command the overlay handles SHALL become the matching game action, raised by an actor
whose kind is a viewer.

The actor's identity SHALL be the opaque actor the host supplied, and the actor's display name SHALL be
used for display only. The overlay SHALL NOT key anything to the display name, which is neither stable
nor unique.

An event naming a command the overlay does not handle SHALL be ignored, and the fact SHALL be logged.

#### Scenario: Feeding from chat

- **WHEN** a `feed` event arrives for the overlay
- **THEN** the creature is fed, and the feeding is credited to a viewer

#### Scenario: The creature knows who fed it, without knowing who they are

- **WHEN** the same chatter feeds twice
- **THEN** both feedings carry the same actor identity, and that identity is not the chatter's account

#### Scenario: An unknown command is ignored, loudly

- **WHEN** an event arrives naming a command this overlay does not handle
- **THEN** nothing happens to the creature, and the fact is logged

### Requirement: The streamer names the creature

The overlay SHALL take the creature's name from the settings its host supplies, and SHALL fall back to
its own default where the setting is absent or empty.

A setting the overlay does not recognise SHALL be ignored rather than breaking the game, so that the
host may carry keys this version has never heard of.

#### Scenario: A named creature

- **WHEN** the streamer sets a creature name and the overlay receives it
- **THEN** the creature carries that name

#### Scenario: An unset name falls back

- **WHEN** no creature name is set
- **THEN** the creature carries the default name

#### Scenario: An unknown setting is harmless

- **WHEN** the settings carry a key the overlay does not know
- **THEN** the game runs unchanged

