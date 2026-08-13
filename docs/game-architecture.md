# Game architecture — the platform seam, the game, and the two tracks

Written 12-Aug-2026, after the overlay-platform direction session. This document holds the
**foundational decisions and the reasons behind them**. It is durable: it is re-read, not deleted.

Where this disagrees with `docs/roadmap.md`, this file wins on architecture and the roadmap wins on
sequencing. Where it touches creature motion, `docs/animation-roadmap.md` wins.

Nothing here is an OpenSpec change. Each phase below is promoted into its own small change when it is
built, per the governance rules in `CLAUDE.md`.

---

## 1. Two products, not one codebase

The recurring confusion is that "the dragon game on stream" sounds like one thing. It is two.

- **Vids.Tube is an overlay platform.** Its product is the slot: a catalogue of overlays a streamer can
  browse, a toggle, a settings panel, and a route that carries stream events and chat commands into
  whatever is running in the slot. Some overlays are games. Eventually some are written by strangers.
- **eco3d.shop is a game.** Its product is creatures, genetics, breeding, and a compostable print at the
  end. It is playable standalone at eco3d.shop and it does not need a stream to exist.

The decision is therefore not *which repository holds the game*. It is **what contract sits between a
host and a game**, and the answer makes the two repositories cheap to keep apart.

**eco3d is tenant one of that platform, and uses only the public contract.** A contract shaped around
eco3d's conveniences would break on the second game, and the whole point of building a platform is that
the second game costs a game rather than a second integration.

---

## 2. The two facts that constrain everything

Both were confirmed against current browser and OBS behaviour on 12-Aug-2026.

- **The frame is a stranger.** An overlay is eco3d content running inside a Vids.Tube page. Browsers
  partition cookies and storage by top-level site, so an eco3d session held in a normal tab is invisible
  inside that frame. The frame loads signed out, always, however signed in the streamer is.
- **The overlay has no hands.** An OBS browser source is a headless browser painting onto the stream.
  Interaction exists only through the Interact window, which is fiddly and routinely fails on login
  flows, and a login form rendered on the overlay is a login form the audience watches being filled in.

**Consequence, and it is not negotiable:** the overlay must be *handed* a credential when it loads, and
the actual signing in happens once, elsewhere, in a real browser.

---

## 3. Decisions locked

### Decision 1 — Vids.Tube is a general overlay-game platform. _Owner, 12-Aug-2026._

Not a bespoke dragon integration. Streamers browse a library, toggle overlays on and off, and configure
them. Third-party overlays are an explicit long-term goal.

**Why it matters here:** third-party code can never be rendered directly inside the Vids.Tube app, so
**the sandboxed frame is permanent architecture rather than a temporary inconvenience**. The credential
handoff is therefore platform infrastructure, built once and built properly, not a cost to be dodged.

### Decision 2 — One capability tier. Tiers separate review and distribution, never power. _12-Aug-2026._

Every overlay, eco3d included, gets the same contract. eco3d ships unlisted and unreviewed, but through
the same API a stranger would use.

**Why:** capability granted later costs nothing; capability withdrawn later breaks every installed
overlay. One tier is the reversible choice. A first-party fast path would also become permanent, because
the privileged route is always the easier one to extend.

**Accepted consequences:**

- The dragon game is a stranger too, and gets no reach a stranger would not get.
- The ceiling is set by the least trusted overlay.
- Overlays cannot see each other or share state, so anything spanning several games — a common currency,
  for instance — is a platform feature and never an overlay feature.
- Everything crosses a message boundary, so tight coupling to Vids.Tube internals is ruled out: no
  querying its database, no importing its components, no calling its server actions, no sharing its
  session.

### Decision 3 — Viewers are pseudonymous by default; identity is opt-in. _12-Aug-2026._

Each viewer is given an opaque id, stable per overlay per channel, revealing nothing. The real account
id is released only after that viewer consents.

**Why:** a chatter never agreed to hand their identity to a game developer, and default-deny stops every
overlay quietly profiling viewers across channels. Retrofitting this later means *taking identity away*
from overlays that already have it, which is the one direction that breaks installations.

**Worked example.** A chatter types `!feed`. The overlay learns viewer `V_7f3a` and the display name
`bob123` — enough to feed the dragon, put the moment on screen, and rate limit bob, because the id is
stable. It learns nothing about whether bob has an eco3d account. Only when bob wants to *own* an egg
does bob follow a link, sign in, and bind `V_7f3a` to his account. **The streamer clicks once, ever. Most
chatters never click at all, and the game is designed to work for the ones who never do.**

### Decision 4 — Overlays are self-hosted and proxied through a fixed platform origin. _12-Aug-2026._

Modelled on Discord Activities rather than Twitch Extensions. The developer keeps hosting the overlay;
Vids.Tube proxies it through a per-overlay subdomain and permits framing that one wildcard.

**Why Twitch's upload model was rejected:** Twitch requires uploads because Twitch distrusts thousands of
unknown developers and employs a review team. That threat model and that review capacity do not exist
here, so the upload model would buy nothing and would cost the development loop — the animation would
end up compiled by the host's dev server, where frame rate collapses.

**Why Twitch's identity model was kept:** it costs almost nothing now and is painful to retrofit. See
Decision 3.

**Shape:**

- A registry in Vids.Tube holds each overlay: name, owner, declared upstream origins, declared
  permissions, review status.
- Each overlay gets a fixed address on a wildcard subdomain, which also isolates one overlay's storage
  from another's.
- The framing policy carries a single wildcard entry, so it stays build-time and never becomes
  per-installation.
- **Only the entry document is proxied.** Discord proxies every byte because Discord also wants to hide
  player addresses from developers; that is not a goal here. Meshes, WebAssembly and game data are
  fetched straight from eco3d, permitted by the overlay's own declared origin list.
- What gets reviewed is the declared origin list, not an uploaded bundle.

**What this preserves:** eco3d keeps serving its own overlay page, so `npm start` in eco3d stays the
development loop and Vids.Tube never compiles animation code.

### Decision 5 — The streamer binds a channel to an account once, by claim. _12-Aug-2026._

Vids.Tube signs a short-lived token naming the channel and hands it to the frame. eco3d verifies it. On
first sight of an unbound channel the overlay renders a "not linked" state carrying a short pairing code,
which the streamer claims once from a normal eco3d tab.

**Why by claim rather than by automatic account creation:** the pairing step is the standard answer for
input-limited surfaces, and it keeps eco3d's account model its own rather than making Vids.Tube an
identity provider for it. After the claim, the binding lives in eco3d and the overlay works on any
machine with no secret pasted anywhere.

**This is what replaces the current per-streamer configuration blob.** Today the whole overlay
configuration rides in one build-time environment variable, which cannot serve two streamers.

### Decision 6 — Settings and save switching happen in Vids.Tube, over the contract. _12-Aug-2026._

The streamer edits overlay settings in the Vids.Tube UI, in a real browser, signed into Vids.Tube. Those
settings reach the running overlay live over the two-way message channel, and are readable on load for a
frame that started later.

**Why not in the overlay:** see §2. The overlay has no hands.

**The limit to respect:** messaging only works while a page is open, so anything that must work while the
stream is down goes through the eco3d API instead, not through the message channel.

### Decision 7 — Slow state is server-held and resolved from timestamps; motion is simulated client-side. _12-Aug-2026._

Hunger, age, eggs, inventory and *what the creature is currently doing* live in Supabase as timestamps
resolved against the server clock on read. Flight and motion are simulated in the browser, for looks.

**Why:** this is what offline-progression games settle on, and resolving against the server clock rather
than the device clock is what makes it honest. It means **time passes with nobody watching, and a chat
command works while the stream is down**, without paying for server-side physics.

**Accepted cost, stated plainly:** two viewers see the same creature doing the same thing in different
positions. Position is not synchronised. The alternative is running the physics server-side, which is a
different and much larger product.

### Decision 8 — Anonymous play uses real anonymous sessions, not local storage. _12-Aug-2026._

A visitor to the home page is signed in anonymously and gets a real user id immediately, so rows and
row-level security work unchanged. Linking an email later keeps the same id and everything bred so far.

**Why:** one code path for anonymous and signed-in players. The alternatives either need bespoke access
rules with no user to check against, or lose the creature on a cache clear.

**Known costs, all to be handled when built:** a per-address sign-in rate limit, no automatic cleanup of
abandoned anonymous users, a bot check to prevent bloat, policies that must check the anonymous claim,
and dynamic rendering so metadata is never cached across anonymous visitors.

### Decision 9 — The game render and the studio render are separate paths. _12-Aug-2026._

The game shows a creature with no node skeleton, no grid, no debug overlay, coloured by its genetics in
the available PHA filament colours. The studio keeps every development affordance.

**Why this is small:** the genetics-coloured path already exists — segments are split by role and one
merged mesh is drawn per role colour, with a neutral fallback for untagged components. It is currently
**static**, while the animated path colours by mechanical group and can draw nodes. The work is joining
the physics pose to the genetics dressing, not writing a renderer.

### Decision 10 — The two tracks meet at a published vocabulary, not at a shared config blob. _12-Aug-2026._

The overlay is today a wandering copy of the Simulate tab because the tuned configuration rides in the
link as an encoded blob.

- The **animation track publishes named, versioned presets** stored server-side, and named **movement
  primitives**: cruise, turn to heading, pursue a point, flee a point, hold station, rest.
- The **gameplay track consumes them by name** and never by tuning value. A behaviour such as hunting is
  written as a sequence of primitives plus game state, never as a set of oscillator constants.

**Why:** this is the seam that lets the two tracks run in parallel without blocking each other. Gameplay
asks for a motion by name; animation makes that motion real and improves it later without gameplay
changing.

**Every name falls back to cruise.** _Added 14-Aug-2026._ A primitive the animation track has not built
yet resolves to cruising rather than to an error. Gameplay is therefore never blocked waiting on an
animation, and the animation track is never rushed by a gameplay deadline. An improved primitive reaches
the game by being republished, with no gameplay change at all.

### Decision 11 — The game core talks to a Host interface. _14-Aug-2026._

The core holds world state, rules and actions, and knows nothing about where it is running. Everything
environmental arrives through one interface: who is acting, what the settings are, what events arrived,
and which save to load.

- **StandaloneHost** backs the home page. Actions come from the page's own UI, there is one actor, and
  settings come from eco3d.
- **PlatformHost** backs the overlay. Identity comes from the signed token, settings arrive over the
  message channel, chat commands arrive as actions, and there are many actors, all pseudonymous.

**Why:** "the same gameplay mechanics in both places" becomes true by construction rather than by
discipline. It also dissolves the question of what an *augmented* overlay version is: the overlay is not
a second build, it is the same core given a host that can deliver things the standalone host cannot,
such as five hundred actors and a chat command stream.

**It also defers the save question safely.** A save is whatever the host asks the core to load, by id.
Whether a save is one habitat or a whole world is a game-design question this wiring does not need
answered.

---

## 4. The connection, end to end

```
Vids.Tube page (streamer signed in)
   │  mints short-lived signed token: channel + opaque viewer id + permissions
   ▼
dragon.overlays.vids.tube          ← fixed origin, framing policy is one wildcard
   │  proxies entry document only
   ▼
eco3d.shop /game/overlay           ← self-hosted, still served by eco3d
   │  verifies token, resolves channel → eco3d account
   │
   ├── unbound channel → renders pairing code
   │                     streamer claims it once from a normal eco3d tab
   │
   └── bound channel  → loads that streamer's habitat
                        assets + game data fetched direct from eco3d
                        settings arrive live over the message channel
                        chat commands arrive as pushed events
```

---

## 5. The layer stack

```
                eco3d GAME CORE
       world state, rules, actions. Knows no host.
                       |
        +--------------+--------------+
        |                             |
    RENDERER                    MOTION LAYER
  genetics dressing,         named primitives, asks
  no dev affordances         the animation track by name
        |
        +---- mounted twice, same core both times ----+
        |                                             |
   /  (home page)                            /game/overlay
   StandaloneHost                            PlatformHost
   - actions from the page UI                - signed token from Vids.Tube
   - one actor: the player                   - settings over the message channel
   - settings from eco3d                     - chat commands arrive as actions
                                             - many actors, all pseudonymous
```

## 6. The two tracks, and how they stay parallel

```
   ANIMATION TRACK                          GAME TRACK
   studio + observation loop                game page + overlay
          |                                        |
   named configurations                     asks for motion BY NAME
   named primitives:                        pursue(target), rest(), flee(x)
   cruise, turn to heading,   ---------->          |
   pursue, flee, hold, rest                 missing name falls back
                                            to cruise, game still runs
```

**Animation track, in two stages.** First, base movement is refined in the simulation: turning, level
flight, banking, climb and dive, then a speed and turn grid. The output is a library of named
configurations covering a range of movement. Second, a dynamic layer selects and blends those
configurations in response to the environment, giving object tracking, fleeing, and curling up to rest.
Both stages publish into the same vocabulary, so integration is continuous rather than a hand-over.

**Game track.** The tamagotchi core first: a creature on screen, a few actions, state that persists.
Then genetics and breeding, feeding, ownership and trading, credits, chat commands, purchasing. Each is
added to a core that already runs in both surfaces, so nothing is built twice.

## 7. Foundation now, and what is deliberately deferred

Both tracks stand on the foundation, so it comes first. After it, the tracks run at the same time and
meet only at the motion vocabulary.

**Must be right now, or the multi-game future is blocked:**

- Overlays are identified by an id from day one, and a registry row exists even with one overlay in it.
- The token names the overlay, the channel and an opaque viewer, even though only one overlay exists.
- Settings are stored per channel per overlay as an opaque blob owned by the overlay. Modelling dragon
  settings as Vids.Tube columns would force a migration when the second game arrives.
- Events are delivered by subscription rather than by hardcoded routing.

**Safe to defer, because adding it later is work rather than a rewrite:**

- The wildcard subdomain and the proxy. The framed origin can stay a single build-time entry for now,
  because the overlay's own code cannot tell whether it is being proxied. This holds **only** while the
  four points above are honoured.
- The review flow, the permissions UI, the public catalogue, and developer documentation.

**No forward implementation.** Nothing above is built ahead of need. The rule is only that today's
choices must not foreclose it.

## 8. What is deliberately not decided yet

- The exact contents of the first playable game loop, beyond it being small.
- Habitat rotation, currency naming, egg price tiers, and every economy number.
- Whether chatter-owned creatures arrive with breeding or later.
- Which of the movement primitives the gameplay track needs first.

These are settled when the phase that needs them is specced, not before.
