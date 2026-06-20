# Observation loop — monitoring the locomotion animation

The repeatable process for **observing** what the locomotion does in the real app, headlessly. The
default mode reads the **world position of every body node over time** (no screenshots) and renders a
**top-down node skeleton** from those positions. Screenshots are opt-in. You also get total control
over every simulation parameter, and optional timing capture for the grip/sweep/lift primitives.

Harness: `scripts/observe.mjs` (`npm run observe`). Cross-platform (macOS + Windows + Linux).
The old screenshot-first harness is kept as `npm run observe:legacy` (`scripts/observe-swim.mjs`).

---

## TL;DR (the loop)

```bash
# 1. Server up with the CURRENT build (rebuild after any app code change):
doppler run -- npx --no-install next build
doppler run -- npx --no-install next start -p 3002   # detach it (see "Server")

# 2. One-time per session: cache the login
npm run observe -- login

# 3. Capture a run (8s, node positions @ 4/s, no screenshots):
npm run observe -- run 8

# 4. Read the output in documentation/diagnostics/observe/:
#    nodes-<ts>-topdown.png   <- top-down node skeleton: overlay + snapshots over time
#    nodes-<ts>.md            <- per-node per-axis ranges + COM travel + config used
#    nodes-<ts>.json          <- raw samples
```

---

## Commands

`npm run observe -- <cmd>`:

| command   | does                                                                       |
|-----------|----------------------------------------------------------------------------|
| `login`   | sign in once, cache session to `scripts/.observe-auth.json`                |
| `config`  | print the full live sim config (every tunable parameter) as JSON           |
| `run [seconds] [flags]` | load rig, run sim, capture node positions, render outputs     |

### `run` flags

| flag                | default | does                                                              |
|---------------------|---------|-------------------------------------------------------------------|
| `--hz N`            | `4`     | node-position sample rate (samples/sec), decoupled from render Hz  |
| `--shots`           | off     | ALSO take multi-angle screenshots + a contact sheet               |
| `--events`          | off     | track grip/sweep/lift window start/end timing (see below)         |
| `--event-shots`     | off     | `--events` + a node snapshot at each window boundary, rendered     |
| `--set key=value`   | —       | override any one sim parameter (repeatable)                        |
| `--config file.json`| —       | override many parameters from a JSON file (`--set` wins over file) |

Examples:

```bash
npm run observe -- run 12 --hz 10 --set cpgDrive=2.4 --set turnBias=0.3
npm run observe -- run 8 --shots --config documentation/sim-presets/stage1-fast.json
npm run observe -- run 8 --event-shots --set gripEnabled=false --set stepEnabled=false
```

---

## What you get + how to read it

`documentation/diagnostics/observe/` (gitignored, transient):

- **`nodes-<ts>-topdown.png`** — the top-down node skeleton. **X = forward (body length) → horizontal,
  Z = lateral ↓ vertical** (Y is vertical height, not shown here). Two parts: an **overlay** of all
  frames (faint→bright over time) with the COM path, and a **grid of snapshots** over time. The head
  node is red. Bounds are shared across frames so motion is visible. Read this first.
- **`nodes-<ts>.md`** — per-node min/max on each axis (X/Y/Z), COM start/end/travel, and the exact
  config used for the run.
- **`nodes-<ts>.json`** — raw `{ config, spec, samples, events }`.
- **`shots-<ts>.png`** (only with `--shots`) — multi-angle screenshot contact sheet.

### Axes / "top-down" note

The body lies along **X** (forward). Top-down = the **X×Z** horizontal plane; **Y** is vertical
height. The `.md` reports all three dimensions per node, so vertical motion is never lost even though
the top-down image only draws X and Z.

---

## Primitive-window timing (grip / sweep / lift) — `--events`

The grip, sweep, and lift windows are derived from each leg's **limb-CPG phase** and the timing
params (`gripShift`, `gripDuration`) **only** — NOT from the `gripEnabled` / `stepEnabled` switches.
So you can observe exactly when each foot *would* grip / sweep / lift **without turning the behaviour
on**, meaning the capture never perturbs the rest of the animation. Run with `gripEnabled=false` and
`stepEnabled=false` to watch pure timing against the undisturbed body wave.

Per leg, each frame (~60 Hz, for precise edges):

- **grip** window = `rel < gripDuration`
- **sweep** (power stroke / stance) = `rel < stepDuty`
- **lift** (active during swing) = `rel >= stepDuty`

where `rel = (limbPhase − gripShift) mod 1`. Their edges interlock: grip/sweep start = stance begin →
sweep end = lift start → lift end = next stance.

- `--events` writes **`nodes-<ts>-events.md`**: ON-intervals per leg × primitive `[tStart→tEnd (dur)]`
  plus a raw edge list (`t / leg / primitive / edge / rel / phase`).
- `--event-shots` additionally captures the **node positions at each boundary instant** and renders
  **`nodes-<ts>-events.png`** — a top-down skeleton at every grip-start/end, sweep-start/end,
  lift-start/end, colour-coded by primitive (grip=blue, sweep=green, lift=orange), labelled with leg
  and time.

---

## Total config control

The studio exposes the full config to the harness, so any parameter can be changed without touching
the simulation logic (only its tunable values move):

- `--set key=value` / `--config file.json` apply overrides before the run via `window.__studio.apply`,
  which only writes keys that exist in `SimConfig`.
- `npm run observe -- config` prints the current values and exact key names.

Tunable keys (see `app/admin/animate/animateStore.ts` `SimConfig` for the authoritative list):
`cpgDrive, cpgExcitability, frontDrive, frontSegments, turnBias, muscleAlpha, muscleBeta,
muscleDamping, bodyFriction, legFriction, releaseFriction, gravityEnabled, landLegsEnabled,
landGroundEnabled, limbCpgEnabled, legsLocked, environmentEnabled, gripEnabled, gripShift,
gripDuration, gripGlowEnabled, gripFeet, stepEnabled, sweepAmount, sweepSpeed, liftAmount,
legStiffness, legDamping`.

---

## Environment

- **Chromium** is discovered automatically via `playwright-core`'s resolver, with a per-OS
  `ms-playwright` cache fallback. One-time on a clean machine: `npm i -D playwright-core` then
  `npx playwright install chromium`.
- **Use `127.0.0.1`, not `localhost`** (Next binds IPv4 only; chromium resolves `localhost`→IPv6
  first → `ECONNREFUSED`). The harness already uses `127.0.0.1`; override with `OBSERVE_URL`.
- **`next` is not on PATH for bare `doppler run`** — use `doppler run -- npx --no-install next ...`.
- **Rebuild after any app code change.** The studio is served from the last `next build`; otherwise
  the harness silently shows stale behaviour.
- **Network for login.** `login` reaches Supabase. On macOS run it on the real host (a restricted
  sandbox can reset the Supabase auth fetch). Auth is cached to `scripts/.observe-auth.json`
  (gitignored).
- Credentials/overrides via env: `OBSERVE_EMAIL`, `OBSERVE_PASS`, `OBSERVE_RIG`
  (default `baby cyber dragon`), `OBSERVE_URL` (default `http://127.0.0.1:3002`).

### Server (detach so it survives the shell)

macOS / Linux:
```bash
doppler run -- npx --no-install next start -p 3002 > .next-server.log 2>&1 &
```

Windows (PowerShell):
```powershell
$proj = "C:\Users\azgaz\Documents\Projects\eco3d.shop"
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command",
  "Set-Location '$proj'; doppler run -- npx --no-install next start -p 3002 *> '$proj\.next-server.log'" `
  -WindowStyle Hidden
```
Restart after a rebuild: kill the listener on 3002 first, then relaunch.

---

## The dev hook the harness drives

`window.__studio` (admin animate page only, `app/admin/animate/AnimateScene.tsx`):

```js
window.__studio.setCam('front'|'top'|'side'|'reset')   // camera preset (only used with --shots)
window.__studio.drive(true|false)                       // start/stop the sim
window.__studio.getConfig()                             // full SimConfig
window.__studio.apply({ cpgDrive: 2.4, turnBias: 0.3 }) // override any subset of SimConfig
window.__studio.diag()                                  // { kineticEnergy, comDriftFromStart, ... }
window.__studio.nodeCaptureStart({ hz, maxSamples, events, eventSnapshots })
window.__studio.nodeCaptureStop()                       // { samples, events, spec }
```

The frame loop (`app/game/locomotion/useLocomotion.ts`) fills `window.__nodeCapture` each frame:
periodic node samples (hz-gated) and, when `events` is on, grip/sweep/lift edge detection (every
frame) computed from the CPG phase alone.

---

## Troubleshooting

- **`WARNING: no node samples captured`** → rig not loaded or sim not running. Check the rig name
  (`OBSERVE_RIG`) and that the server is the current build.
- **`ECONNREFUSED`** → server not up, or `localhost` instead of `127.0.0.1`. Tail `.next-server.log`.
- **Frames/positions unchanged after an edit** → you didn't rebuild + restart the server.
- **`no chromium found`** → `npx playwright install chromium`.
- **Stale auth** → delete `scripts/.observe-auth.json` and `login` again.
- **`events: none detected`** → the rig has no hip joints, or the limb CPG didn't advance (drive off).
```
