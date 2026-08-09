---
name: observe-loop
description: Establish and iterate an observation harness so an AI can SEE a system's behaviour (not infer it from numbers), change one lever at a time, and report each step to a human with a one-click demo and a visual aid. Use for any project where success is visual/behavioural and tuning is iterative (animation, simulation, layout, rendering, robotics, data viz). Invoke with /observe-loop.
---

# /observe-loop — observation harness + iteration protocol

Generic protocol for building eyes onto a running system and improving it one small,
verified step at a time. Project-agnostic: the examples use a character walk cycle, but the
shape applies to any system whose correctness is judged by watching it.

## The core idea

You cannot tune what you cannot see. Numbers lie (a render bug can draw the wrong thing
while the metrics look fine). So before tuning anything, build a harness that lets you
**observe the real running system**, then iterate: change ONE lever, observe the isolated
effect, report it with a demo + a visual aid, get a human's approval, continue.

Two readers consume your output: the **AI** (you, next turn) and the **human**. Both need
the same thing — clear observations, clear expectations, clear instructions. Write for
clarity, not for volume.

## Part 1 — Establish the harness

Build these capabilities once; reuse them every iteration.

1. **A control + read hook on the running system.** Expose a small programmatic surface on
   the live app (e.g. a `window.__debug` object, a CLI flag, a test endpoint) that can: set
   the full configuration, start/stop, read current state, and capture signals. Drive the
   real system through this — never scrape the UI, never reconstruct a parallel "puppet"
   that can drift from reality.
2. **Determinism.** Make a given input reproduce the same state: fixed time-step, seeded
   randomness, an explicit "advance N steps" primitive. Without this, a frozen frame is not
   reproducible and shared links/comparisons are meaningless.
3. **Freeze + step + slow-motion.** The single most useful observation tool is the ability
   to stop on a chosen frame, step one unit at a time, and play slowly. Most "everything
   moves at once, I can't tell what's wrong" pain dissolves once you can freeze and step.
4. **Focused signals, not raw dumps.** Capture the *minimum* that reveals the behaviour:
   - a **simplified skeleton/wireframe screenshot** (joints, key points, contact markers)
     beats a full-fidelity render for seeing structure;
   - when the real render is too **visually dense** to read (a detailed model, an overlapping
     scene), ghost it down to low opacity and show only key-point markers, or render a bare
     skeleton — fidelity hides structure, structure is what you are judging;
   - a few **overlays** that isolate one concern (phase markers, state coloring, force
     arrows, a single highlighted part with everything else dimmed);
   - a couple of scalar **gates** (drift, tilt, timing error) — as a cross-check, not the
     verdict.
5. **A headless capture path.** A headless browser/driver (e.g. Playwright + bundled
   Chromium) that loads the app via the control hook, runs to a state, toggles overlays, and
   screenshots from fixed camera angles. This is how you get eyes without a human in the
   loop.

6. **Isolate the period of interest, then sample it densely and repeatedly.** Do not sample
   on a coarse fixed clock (e.g. one frame per second) across the whole run. Detect the exact
   sub-interval that matters (one cycle, one grip window, one transition), take **N evenly
   spaced snapshots across just that interval** (about 10), and **capture the interval many
   times** (many cycles). Then **compare the instances**, state a **conclusion** from the
   spread (mean/range/consistency), **pick the single instance closest to the median** as the
   representative to show, and mark the snapshots that carry the conclusion. Present that one
   instance as the sequence — comparison gives confidence, the representative gives clarity.

Expand the harness whenever an iteration reveals something you could not isolate. A new
question → a new overlay or signal. The harness grows toward exactly what the work needs.

## Part 2 — Output format (for AI comprehension AND the human)

Optimise every artifact for **signal density that stays human-readable**:

- **Minimise character count / output density.** Short labels, small tables, no walls of
  text. A skeleton screenshot or a 4-frame strip carries more than paragraphs of prose.
- **Keep concepts clear and plainly named.** Even though the primary reader is an AI, it
  still needs unambiguous observations, expectations, and instructions. Name what each
  signal means in one line.
- **Prefer the right visual aid for the idea:**
  - a **left-to-right image sequence** for a cycle or motion (e.g. a walk cycle: 4–6
    freeze-frames at key phases), each frame **highlighting the relevant location** and a
    one-line caption below saying *what to look at and why it matters*;
  - a **chart** when comparing a scalar across configs;
  - a **flow chart** for a branching decision or pathway;
  - a plain **table** for several items across the same dimensions.
  Do not add a visual that merely restates a list.
- **Package decisions, not just pixels.** The artifact should record: the observation, why
  it is relevant, the change made, and the resulting effect.
- **Lay the artifact out for the screen it will be read on.** Find out the target display
  width and scale to it; do not assume a wide landscape page.
  - For a narrow screen (e.g. about 400px), use a **vertical (portrait) layout**: large-font
    `/plain` notes (bold one-line title, then short bullets), and the **sequence images
    cascading/staggered down one side** rather than a wide row that shrinks illegibly.
  - For a wide screen, a landscape row of frames is fine.
  - Either way: large enough fonts to read at the target width, one verdict line per step
    (colour-code good / none / bad), and a short caption under each frame.
  - Default the artifacts to a **dark theme** (black background, light text, dark frame
    panels) unless the human prefers otherwise.

## Part 3 — Share the live resource with the human

Numbers and PDFs are one-way. Always also give the human a way to **see exactly what you
see, instantly**:

- Encode the current configuration into a **shareable link** (e.g. `?config=<encoded>` plus
  view flags like the tab, a freeze time, and which overlays are on). One click reopens the
  exact state you observed.
- Prefer **full-config-in-link** over named-preset-in-link, so any one-off tuned state is
  shareable without first saving it.

### Every iteration ends with a clickable config link — mandatory

The link is the deliverable, not a courtesy. A report without one asks the human to take your
description of the behaviour on trust, which is exactly what this protocol exists to avoid.

- **One link per config observed**, every iteration, without exception. If three gains were
  swept, three links are handed over, not just the winner's.
- **Rendered as a clickable link in the human's surface**, never as a bare URL and never as a
  fenced code block — both render dead, and a long encoded config is unusable to copy by hand.
  Use markdown link syntax with a short label: `[base swim](http://…)`.
- **Labelled with what it is**, so a list of links is readable without opening them: the lever
  value that distinguishes it, plus the one number that matters. Not "link 1, link 2, link 3".
- **Served by the build the capture came from.** Rebuild before handing it over, or the human
  opens a different build than the one you measured.
- **Never hand over a link you have not produced from the running system** — build it through
  the app's own link builder so it cannot drift from what the app actually accepts.

### The completeness rule — non-negotiable

A link or preset that reproduces *most* of the state is worse than none, because it produces
silent disagreement: the human believes they are looking at your run and they are not.

- **Absolute, never relative.** Applying a link or preset must reset the world to a known
  state and then apply it. If application *merges* onto whatever is currently loaded, the
  result depends on what was loaded before, so preset B after preset A is not preset B.
  Start from defaults, then apply.
- **Sweep up the state that lives outside the config object.** Almost every system has some
  parameter that is not in the config blob — one held in a different store, a slider, an
  environment variable. Enumerate them once and carry them explicitly. A config that assumes
  "the human already set X" is broken by construction.
- **Prove it, do not assert it.** Before handing over the first link of a session, apply it
  in a clean context and confirm the run reproduces. Re-prove whenever a new parameter is added.
- **State what is pinned.** Every handover says which parameters the link fixes, so an
  omission is visible rather than invisible.
- **Make every artifact link click-to-open in the human's surface.** Link generated files
  (PDFs, images) in whatever form *their* tool resolves on click — there is no universal one,
  so match the surface:
  - in an **IDE chat** (e.g. VS Code), use a **workspace-relative path** (`docs/aid.pdf`),
    which the IDE turns into a clickable link that opens the file;
  - in a **browser** surface, use a **served `http(s)` URL** or an absolute `file://` URL.
  Avoid the mismatch cases (a bare relative path in a browser, or a `file://` URL in some IDE
  chats) — both render as dead links. The point is one click opens the PDF/image next to the
  demo link; verify the form works in the human's environment.

## Part 4 — The iteration loop

Run this loop per step. Keep each step tiny so cause and effect stay isolated.

1. **State the micro-goal** in one line, the **single lever** you will move, and the **one
   gate** that decides pass/fail. One lever at a time — if you move three knobs you learn
   nothing about any of them.
2. **Make the minimal change.** Prefer configuration. When the behaviour genuinely *needs*
   something configuration cannot express (a new mechanism, a phase-dependent term), add it
   as a new, off-by-default lever and flag it as a deviation.
3. **Observe in isolation.** Freeze at the key moments, enable only the overlays relevant to
   this lever, capture the focused signals (skeleton frames + the gate numbers).
4. **Report to the human**, concisely:
   - the **demo link** (one click to the exact state),
   - the **visual aid** (the annotated sequence / chart),
   - the **expectation** (what they should see),
   - the **quality gate** (what must be true for them to approve this step and continue),
   - the **next step** (one line).
5. **Get approval, then continue.** Approval is the human's, given after they open the link
   themselves — never inferred from silence, from a passing gate, or from your own reading of
   the capture. On approval, lock the result as a named preset (see Part 5). If a code
   mechanism was added, fold it into the change/PR record. On rejection, keep the capture and
   record what was rejected, so the same config is not re-proposed.

## Part 5 — The preset ledger

The presets are the durable output of the loop. By the end they should read as a ladder that
someone else can walk up, each rung a state a human looked at and accepted.

- **One approved step, one preset.** Nothing is added to the preset list until the human has
  opened its link and said so. An unapproved config stays a link.
- **A preset is the complete state**, under the completeness rule in Part 3 — including the
  parameters that live outside the config object. A preset that only works if some other
  slider happens to be right is not a preset.
- **Name for the position on the ladder**, not for the mechanism. The reader is choosing what
  to look at, not reading the implementation.
- **The description carries the measurement**, not a claim: the gate numbers this state
  achieved, so the list doubles as the result record.
- **Retire superseded presets rather than accumulating them.** A list containing states from
  three abandoned directions teaches the next reader the wrong thing. Delete on direction
  change; git holds the history.
- **Cover the axes, not just the winners.** Keep the off/low/high rungs of each lever, so the
  contribution of that lever stays visible by comparison. The failures that bound the useful
  range are worth keeping; the ones that taught nothing are not.

## Part 6 — When to stop

- Stop and **report a verified step** when the current micro-goal's gate passes and you have
  a clean next direction.
- Keep iterating autonomously while you have a clear short-term direction and the gates keep
  passing.
- Stop and **ask for direction** (a short sit-rep + specific question) when you are blocked,
  the gate is ambiguous, two reasonable paths diverge, or repeated attempts fail. Do not
  thrash — a focused question beats five blind tries.

## Technical specifics (generic, adapt per project)

- **Driver:** a headless browser via Playwright (bundled Chromium) for web apps; the
  equivalent automation harness otherwise. Cache auth/session so runs are non-interactive.
- **Control hook:** an in-app object (e.g. `window.__debug`) exposing `applyConfig`,
  `getConfig`, `start/stop`, `pause/play/step(n)/seek(t)/speed(x)`, `setOverlays`, and a
  state read (`diag`). Capture buffers (positions/state over time) live here too.
- **Determinism:** fixed time-step accumulator; `step(n)` runs exactly n ticks; `seek(t)`
  rebuilds from t=0 and runs `round(t/dt)` ticks. Avoid wall-clock-coupled stepping for
  anything you want to reproduce.
- **Capture:** screenshot fixed camera angles (front/top/side); render a simplified skeleton
  from captured key-point positions rather than the full model when structure is what
  matters; write raw samples as compact JSON for re-analysis.
- **Visual aid generation:** assemble captured frames into an HTML page (images left→right,
  highlight boxes, captions) and print to a **landscape PDF** via the headless browser's
  print-to-PDF. Charts/flowcharts the same way.
- **Observe a production build, never a dev server.** Dev-mode tooling (hot reload, strict-mode
  double rendering, per-module runtime proxies) can make the system visibly slower or
  differently-timed than the real thing, so what you observe is not what the code does. Find the
  project's existing production script and use it verbatim rather than assembling your own.
- **Rebuild and restart after every code change, before observing.** A running production server
  keeps serving the old bundle. Skipping this captures the previous version of the code and
  reports it as the new one — the easiest way to produce a confidently wrong result. Verify the
  rebuild took by checking that the lever you just added appears in the reported config.
- **Run environment notes:** run the driver and the app server from a shell that preserves
  the app's auth/network (some sandboxes reset it); use a loopback IP the server actually
  binds; stop the previous server before restarting (the port stays bound); launch the server
  detached so it survives across separate command invocations.

## Anti-patterns

- Trusting metrics without looking at the frames.
- Moving multiple levers in one step.
- Dumping raw, dense output instead of a focused signal.
- Reporting without a one-click demo the human can open.
- Handing over a bare URL or a link inside a code block, which renders dead.
- Handing over only the winning config, when the sweep is what makes the winner meaningful.
- Reconstructing a separate visualisation that can disagree with the real system.
- Adding a preset the human never opened.
- Handing over a link that depends on a setting the human is assumed to already have.
- Treating a passing gate as approval.
- Observing a dev server, or a production server that predates the change under test.

---

# Project binding — eco3d.shop creature locomotion

The generic protocol above, pinned to this project. Update this section when any of it moves.

## What is being observed

The creature locomotion runtime in the admin studio (`/admin/animate`). Movement is generated
by a CPG driving virtual muscles inside a physics simulation; it is never hand-authored. The
governing documents are `docs/locomotion.md` (how the paper maps onto the rig),
`docs/reference/locomotion-reference.md` (every equation and constant — it wins any
disagreement), and `docs/animation-roadmap.md` (the plan, the locked decisions, and
**§5 Baseline**, the measured numbers every iteration is scored against).

## Running the harness

**Never observe a dev server.** `/admin/animate` is unusable under `next dev` — r3f reconciliation
under Strict Mode plus Turbopack's per-module runtime proxy makes the animation lag badly enough
that what you see is not what the code does. Everything observed, and every link handed to the
human, must come from a **production build**.

The project script is the contract. Use it, not a hand-assembled equivalent:

```
npm run prod:3002        # = doppler run -- next build && doppler run -- next start -p 3002
```

**Rebuild and restart after EVERY app-code change**, before observing and before handing over any
link. There is no hot reload here: a running production server keeps serving the old bundle, so
skipping the rebuild means capturing the previous version of the code and reporting it as the new
one. That is the single easiest way to produce a confidently wrong result in this loop.

The cycle per iteration is therefore: **edit → rebuild+restart → observe → report link**.

Practical notes:

- Run it from PowerShell, not the bash sandbox — the sandbox resets Supabase auth.
- Launch it in the background/detached so the server survives across separate commands, and stop
  the previous server first (the port stays bound otherwise).
- Changes to `scripts/observe*.mjs` are harness-side and need no rebuild; anything under `app/`
  does.
- Verify the rebuild actually took before trusting a capture — the reported config should contain
  any lever you just added.

```
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --events --legw 0.1 --config path\to\config.json
```

Auth is cached in `scripts/.observe-auth.json`. Captures land in
`docs/diagnostics/observe/` with the exact config embedded in the JSON. Forward axis
is **−X**, lateral is **Z**, both confirmed from a known swim.

## What "complete config" means here

Per the completeness rule in Part 3, a run is reproduced by **two** things, not one:

- The `SimConfig` object — every simulation lever, carried in the link's `sim=` parameter.
- The **leg weight**, which lives in the rig's group store and NOT in `SimConfig`. It rides
  in the link as `legw=` and in the harness as `--legw`. MuJoCo behaviour depends strongly on
  it (light legs, about 0.1 kg). A config without a leg weight is not reproducible.

`window.__studio.buildLink()` assembles both plus the tab and overlays. Hand over that link,
never a hand-assembled one. A preset must carry the leg weight too, and must apply from
defaults rather than merging onto whatever is currently loaded.

## The two engines

Presets are scoped per engine and are not interchangeable — the same behaviour needs
different tunings on each.

- **Rapier** — maximal-coordinate impulse solver. Joint motors behave like springs, so the
  legs are compliant. Drag is applied to spine **and** leg bodies.
- **MuJoCo** — reduced-coordinate, every joint a force-limited position servo. The legs are
  genuinely rigid (measured 0.00 rad of sweep). Drag is applied to **spine segments only**, so
  any forward impulse from the feet is cleanly attributable. Engine binaries are served from
  `public/mujoco/`; if MuJoCo silently does nothing, check those two files are being served.

## What is being optimised — read this before choosing a lever

The authoritative definition is **`docs/animation-roadmap.md` §6**. It supersedes any pass
condition written anywhere else, including earlier sections of this skill. In summary:

The deliverable is a **grid of presets**: 3 speeds × 3 turn levels × direction, each cell satisfying
three metrics at once. The presets are guideposts for a later system that blends between them, so the
grid needs to span the range cleanly rather than any one cell being perfect.

- **Foot stillness in the plant window.** Each foot stays roughly in one place between its maximum
  forward reach and its maximum backward reach. The window is **CPG-clocked, never derived from body
  motion**, and the front and hind girdles need **separate phase shifts** because they sit half a cycle
  apart. Reported as the foot's world travel during the window, in units and as a percentage of how far
  the body advanced. Perfect planting is not the target; less movement is.
- **Amplitude quality.** The wave reads as pronounced and is **even along the whole spine including the
  tail**, with the front and hind hips rotating by about the same amount, nothing touching an angle cap,
  and the **head excluded from the wave outright**, because the head is aimed at a focal point later so
  the creature can track prey independently of the body. **Gate on peak bend in DEGREES**, with the
  spread and max/min ratio across the spine joints — not on cap fraction. The two were assumed to agree
  and do not: this rig's authored caps run 21°–45°, so a joint can read 41% of its cap while bending
  further than one reading 101%. Cap fraction stays as the **clipping guard only**. Describe the look
  with node travel measured against a **fitted curved centreline**, not a straight axis, so the number
  survives turning.
- **Velocity and direction.** Speeds come out ordered slow below medium below fast, turn rates low below
  medium below high, and straight presets stay straight. Leg sweep must **not** move speed — if it does,
  it has become a thrust term and this metric is compromised.

**No fixed priority.** These pull against each other by design: faster currently plants better than
slower, and flattening the tail will change speed. Do not silently pick a winner. Present variants that
trade differently, with the numbers for each, and let the owner choose by looking. Record the choice.

## Follow the roadmap, one stage at a time

The stage ladder is `animation-roadmap.md` §3, Phase D-T. Work the current stage only; do not reach
ahead. Each stage moves ONE thing, ends in a config link the owner opens, and becomes presets only on
approval. When a stage completes, write a dated entry into the roadmap's Phase D-T status section (§7)
with the numbers, the levers that won, and the variants that were rejected — that entry is how the next
session knows where the work stands instead of re-deriving it.

Four failures this project has already paid for. The first two were caught by measuring rather than
reasoning; the last two by reading the code rather than trusting that two things agreed.

- A metric that looked sensible but measured the wrong thing (body surge instead of foot stillness).
  Restate the goal in the owner's words before trusting any number.
- A diagnostic and an actuator reading different clocks, so the measurement quietly described the wrong
  half of the stroke. Whenever a window drives behaviour, make the report use the same window.
- Two runtimes sharing one controller but indexing it differently: MuJoCo read the CPG chain by
  body-segment index where Rapier remapped by arc position, so the two engines ran different waves for
  months. When two paths consume the same module, check they consume it the same way.
- A normalised measure hiding an un-normalised one: cap *fraction* looked like a fair evenness metric
  until the caps themselves turned out to be uneven by 2.2×. Before gating on a ratio, look at its
  denominator.

Also: save enough per-run data to answer a question you have not thought of yet. Captures now carry the
per-joint arrays in the JSON precisely because a new metric arrived and every earlier run had to be redone.

## Signals worth capturing

The three §6 metrics first: foot world travel during the CPG plant window, in units and as a
percentage of body advance, per foot; per-joint peak bend in **degrees**, with the spread, the max/min
ratio and the front-versus-hind girdle comparison; forward speed, turn rate, lateral drift.

Then the supporting signals: per-joint peak angle as a fraction of its own cap (the clipping guard, no
longer the evenness gate) alongside the authored caps themselves, since a fraction cannot be read without
its denominator; node travel measured against a fitted centreline (how pronounced the wave looks);
accumulated impulse split by source (whether the feet or the drag are doing the work); vertical drift and
maximum tilt (the body must stay flat); roll reversals per second (the buzz detector — and note it
degrades on a small signal, counting noise crossings when peak roll is under about 1°, so read it beside
the peak rather than alone).

And a **window placement check** confirming every plant window starts at the foot's max-forward reach
and ends at max-backward. This one is not optional: a window half a cycle out reads the swing as the
stance, and every other number silently inherits the error. It has already happened once here.

## The cycle in this project

1. Pick the single lever for the CURRENT roadmap stage, and state the gate in §6 metric terms.
2. If any app code changed, **rebuild and restart the production server** before capturing.
3. Run the harness, capture, analyse offline from the saved JSON.
4. Report: the config link, the numbers against baseline, what to look for, the gate.
5. **Wait for the human to open the link and approve.** Never assume.
   - The link they open is served by the same server the capture came from, so the rebuild in
     step 2 is what makes their view and yours the same build.
6. On approval, add the preset with its measured numbers in the description.
7. Record the result in the roadmap's Phase D-T status log (§7) when a stage completes — numbers, the
   levers that won, and the variants that were rejected.
