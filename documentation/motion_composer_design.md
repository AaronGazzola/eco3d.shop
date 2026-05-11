# Motion Composer — Design Intent and Workflow

> **⚠ SUPERSEDED — DO NOT USE FOR NEW WORK.**
>
> The "stack of additive layers + signals + poses + triggers + timeline" paradigm described below was abandoned in favor of constraint-based procedural animation following `argonautcode/animal-proc-anim` and `zalo.github.io/blog/constraints`. The canonical design is now in `documentation/animation_design.md`. This file is kept for historical context only; the wireframe at `app/wireframe/page.tsx` corresponds to this deprecated direction.

**Status:** wireframe at `/wireframe`. No production code touched.
**Audience:** Aaron + future agents picking up this conversation.

## Why this exists

Today's dragon animation has one input (`targetRef`) and one expression (FABRIK chain chasing the head target). It's reactive on a single axis. Adding a behavior means writing TypeScript in `app/game/animations/`. Tuning a behavior means editing magic numbers in `dragon/constants.ts`, hot-reloading, watching, guessing.

That collapses three separate things into "edit the code":

1. **Skeleton authorship** (already split — handled by step 2 node placement).
2. **Motion composition** (currently in code).
3. **Reactivity & character** (currently absent — the dragon doesn't *react*, it tracks).

The Motion Composer separates motion composition and reactivity from code, exposes them as data, and gives Aaron a UI to author them at the speed of a slider drag instead of a code reload.

## Core paradigm

Motion is a **stack of layers** that each contribute to a per-frame "drive" struct, applied to the skeleton coming out of step 2. Layers have:

- A **kind** (Spine Wave, Foot Planter, Pose Blend, Tail Curl, etc.).
- A **target**: which part of *this* skeleton it addresses, named by the user's actual placed groups (`Hips`, `Tail base`, `Front legs · Shoulders`).
- A **weight** (0–1.5) and a **mute** toggle (for instant A/B testing).
- **Timing** (phase delay, optional driven-by another layer's clock).
- **Parameters** that can be in one of three modes:
  - `=` constant (today's behavior),
  - `↗` curve along the chain (head→tail interpolation),
  - `~` bound to a signal (personality dial or world signal).
- Optional **timeline placement** (start time, duration, ease in/out) when the parent behavior is in Timeline mode.

A **behavior** is a named composition of layers in one of two modes:

- **Loop** — every layer runs forever, evaluated each frame against the world. This is the procedural baseline.
- **Timeline** — layers have explicit start/duration on a fixed-length track. This is for one-shots: hatching, flinches, bows, scripted reveals.

Behaviors are stored as data (JSON exported by the panel). Loading a behavior is loading a stack of layer specs, not running new code.

## Concepts

### Skeleton

Read-only in step 3. Comes from step 2's node placement. Specifies:

- spine groups (head + N spine + tail), each with `front`/`back` nodes,
- leg pairs (`leg-left` / `leg-right` body groups, each with `attachedToSpineId`, hipLeft/hipRight nodes, foot node),
- per-group **springs** (stiffness, damping) — physical properties of the body. The composer only displays/tweaks these as overrides; the source of truth is the model config.

Layer targets reference groups by their user-given names. When a model preset switches, every layer's target list re-derives. Layers whose previous target no longer exists fall back to that layer kind's default.

### Layers

Procedural sources — most "live" (always-on contributors) but a few are different in nature:

- **Spine Wave** — sinusoidal lateral deflection along the spine. The serpent/lizard motion baseline.
- **Head Track** — head aims at the world target (existing system).
- **Foot Planter** — phased foot-stepping per limb pair, with gait pattern (walk/trot/pace/gallop).
- **Hip Sway** — lateral hip translation tied to gait cadence.
- **Tail Curl** — extra tail-end curvature with travel speed.
- **Idle Breath** — slow scale pulse on the body (rib expansion).
- **Spine Curl** — bend along the chain with adjustable easing.
- **Eye Blink** — periodic eyelid closure on the head.
- **Pose Blend** — drives toward an authored pose by some weight (the off-ramp from procedural).
- **Motion Noise** — Perlin-style jitter on top of any other layer's contribution.
- **Custom Node** — escape hatch for in-code layer kinds the composer hasn't generalized.

Layer kinds are extensible: the composer is a frontend over a registry. Adding a new kind is a new entry in the registry plus an implementation in the solver.

### Signals

Inputs the layers can bind to. Two categories:

- **World signals** — derived from runtime state: `velocity`, `distanceToTarget`, `turnRate`, `idleTime`, etc. These come from the existing `useCreature` frame loop.
- **Personality dials** — user-controlled state per creature: `energy`, `alertness`, `weight`, `mood`. Stored on the model config; can be modulated at runtime by triggers.

A signal binding on a parameter looks like: `amplitude = base × normalize(signal) × gain`. Signals are normalized to 0–1 before they're applied. The result: `Spine Wave amplitude bound to energy` makes the dragon undulate more when its energy is high. Same composer, infinitely more expression.

### Poses

Authored body snapshots. A pose stores:

- per-spine-group lateral deflection (position relative to rest),
- a curvature factor (overall body bend),
- (eventually) per-leg foot position and head orientation.

Poses can be **captured** from the live preview state (or eventually from a 3D pose editor) and **applied** as a `Pose Blend` layer. In Timeline mode, poses become keyframes — drop two poses on the timeline and the system blends through them.

Poses are the Disney off-ramp: when procedural composition can't get you the *exact* moment you want, you author the moment.

### Triggers

Event → action rules. An event fires when a world condition matches; an action takes effect.

- Events: `click_target`, `idle_seconds`, `velocity_above`, `distance_below`, `turn_above`.
- Actions: `switch:<behaviorName>`, `fire:<timelineBehaviorName>`, `modulate:<signalId>`.

Triggers turn the dragon from "always doing one thing" into a state machine driven by world events. Click near it → fires the Hatch clip. Idle for 4 seconds → switches to Idle behavior. Velocity above 3 → modulates `energy` upward (which then ripples through any layers bound to `energy`).

### Timeline mode

When a behavior is in Timeline mode, the layer stack gets a horizontal track view above it. Each layer occupies a horizontal slot showing its `start`, `duration`, and ease curves. The behavior plays through once when fired (via a trigger), then either holds the final state or returns to the previous behavior.

Timeline mode unlocks one-shots without leaving the composer paradigm: a Hatch behavior is just a Wander-shaped data structure that plays linearly instead of looping.

## Workflows

### Tune the existing wander
1. Open the `Wander` tab.
2. Mute one layer at a time to feel its contribution.
3. Drag weights and parameters until the dragon feels right.
4. Drag `Spine Wave > amplitude` slider to mode `↗` and set `head: 0.2 / tail: 0.9` — body is calm at the shoulders, whippy at the tail.
5. Hit Export. Paste JSON.

### Make the dragon respond to speed
1. In the `Wander` tab, expand `Spine Wave`. Toggle `amplitude` to `~` mode. Bind to `velocity`. Set gain to 1.2.
2. Toggle `Foot Planter > cadence` to `~`. Bind to `velocity`. Now gait speeds up automatically as the dragon moves faster.
3. Open the **Signals** sidebar tab. Drag the personality `energy` dial. The dragon's whole demeanor changes through one input.
4. Hit Export.

### Author the hatching sequence
1. Switch the `Hatch` tab to Timeline mode (already on by default in the wireframe). Set duration 4s.
2. Use the `Poses` sidebar tab to apply the `Curled` pose at the start, `Alert` pose near the end.
3. On each Pose Blend layer, set `start`, `duration`, `ease in`, `ease out` to script the transition.
4. Add an `Idle Breath` layer with weight that ramps in over 0.5s.
5. Add a `Spine Curl` layer that fires at 0.6s for 1.6s — that's the unfurl moment.
6. Open the **Triggers** sidebar tab. Add a trigger: `click_target → fire:Hatch`.
7. Hit Export. Now clicking the egg fires the timeline.

### Add a flinch reaction
1. Create a new behavior, name it `Flinch`. Set Timeline mode, duration 0.6s.
2. Add a `Pose Blend` layer with the `Crouched` pose, easing in fast and out slow.
3. Add a `Tail Curl` layer with high curvature, brief duration.
4. In Triggers, add `distance_below` event with threshold 1, action `fire:Flinch`.
5. Hit Export. Cursor gets close → dragon flinches → returns to wandering.

### Tune for personality variation
1. Set personality `weight` to 0.85. Reflexively, layers bound to `weight` get heavier (slower cadence, smaller amplitudes).
2. Compare against `weight = 0.2` (a sprightlier creature).
3. With one signal, the same composition produces multiple character feels.

## Working with AI assistance

The composer is the right interface because it splits the job into the part each side does well:

**Aaron does:**
- Watch the dragon. Decide if motion looks right.
- Drag sliders until it does.
- Mute layers to A/B-test contributions.
- Bind parameters to signals to make the dragon's character emerge.
- Capture poses for moments worth preserving.
- Wire triggers so the dragon reacts to environment.

**The AI does:**
- Implement layer kinds in the solver (one new file per kind, signature-stable).
- Wire signals from `useCreature` state into the bus.
- Implement the trigger event detector (subscribes to world state, runs rules each frame).
- Wire pose data → joint targets in the solver.
- Translate Timeline mode into a clip player on top of the existing director.
- Refactor `dragon/constants.ts` and per-behavior code into the new "behavior is data" shape.

Each round-trip:

1. Aaron tunes in the panel until a behavior feels right.
2. Hits Export. Pastes the JSON into chat.
3. AI bakes the JSON into a `Behavior` factory + any new layer implementations needed.
4. Reload. Verify the live dragon matches the panel preview.

The contract between human and AI is the JSON spec. The wireframe defines its shape and proves it can express the motion design. The implementation work then becomes mechanical.

## How this enables better animation development

Three multipliers, each independently valuable:

**1. Iteration speed.** Slider drag at 60fps replaces edit-reload-watch-guess. Behavior tuning sessions go from minutes-per-attempt to seconds-per-attempt. Aaron can A/B layers (mute, unmute) instantly. The AI's "guess a number" task disappears entirely.

**2. Expressive ceiling.** The current system can do one thing: track a target with a wiggle. With layers + signals + poses + triggers + timeline, the same dragon can:
- gait-shift based on speed,
- look around when alert,
- relax when bored,
- flinch from threats,
- play scripted moments (hatch, bow, roar) on cue,
- look like a different creature with different personality dials.
None of that requires writing more behavior code — it's all data composition.

**3. Skeleton-agnostic motion library.** Because targets reference user-named groups, a behavior authored for one model can be reapplied (with auto-corrected targets) to another. A library of "moods" (Alert, Tired, Curious) becomes shareable across dragons.

## Layout principles (for the wireframe)

The composer covers a lot of surface. Clutter is the enemy. The wireframe applies these rules:

- **One context at a time in the sidebar.** Tabs (Components / Poses / Signals / Triggers) — never two stacked panels.
- **Progressive disclosure on every layer.** Collapsed: just type, target, weight, mute. Expanded: target chips, timing, params with mode toggles.
- **Mode flags surface visually.** A layer with bound parameters shows a small `~` indicator in its collapsed header. Curve mode shows `↗`. Phase delay shows `+0.15s`. You don't need to expand to know there's something there.
- **Timeline UI only appears when relevant.** Loop-mode behaviors don't show timeline tracks.
- **Springs are collapsed by default.** Most users won't tune physics; the few who do can expand the section.
- **Personality dials live in the Signals tab, not the main view.** The header shows compact glyphs for each (`⚡◎⊕♡`) so the values are visible at all times without claiming real estate.

## Out of scope (intentionally)

- 3D pose editor (poses are captured from runtime state for now).
- Drag-and-drop layer reordering (up/down arrows for now).
- Drag-and-drop timeline editing (text-based start/duration in the wireframe).
- Multi-creature behaviors (single dragon at a time).
- Server-side persistence of behaviors (export JSON → bake into code; no DB schema yet).
- Curve editor for ease functions (linear/cubic ease only for now).
- Ref-clip (motion capture) layers.
- Mood spaces (2D blend pads). The personality dials are the simplification.

## Path to production

This wireframe is at `app/wireframe/page.tsx` for design validation only. When the OpenSpec proposal lands, the production version replaces `app/studio/StepAnimate.tsx`, with:

- The Motion Composer state lives in `useStudioStore` (per-config, persisted).
- Behavior specs are saved alongside `ModelConfigRow` in Supabase.
- The solver in `app/game/animations/solver.ts` is generalized: each layer kind is a small module in `app/game/animations/layers/`. The director runs the active behavior's layer stack each frame.
- The director gains a clip-player for Timeline-mode behaviors and a trigger evaluator that maps world events to actions.
- Step 3's right sidebar mirrors the wireframe's tabbed layout (Components / Poses / Signals / Triggers).
