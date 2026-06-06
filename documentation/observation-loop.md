# Observation loop — getting visual eyes on the locomotion animation

This is the repeatable process for **seeing** what the locomotion actually does in the real app —
multi-angle screenshots of the running 3D studio, driven headlessly. Point a fresh chat at this
file when you need eyes on the animation.

**Why it exists:** the top-down diagnostic numbers (KE, COM drift, comY) are blind to vertical
lift-off and tumble, and an earlier render bug drew a *kinematic puppet* instead of the simulated
body — so screenshots could lie. The studio now renders each segment at its **actual Rapier body
transform** (truthful render), and this harness captures it from several angles so the picture
matches the physics.

---

## TL;DR (the loop)

```
# 1. Server up with the CURRENT build (rebuild after any code change):
#    (run these from the PowerShell tool — see "Environment gotchas")
doppler run -- npx --no-install next build         # rebuild after code changes
doppler run -- npx --no-install next start -p 3002 # start (detach it; see below)

# 2. One-time per session: cache the login
npm run observe -- login

# 3. Capture a run (drag on, 14s, default drive/exc):
npm run observe -- run 14 on

# 4. Look at the output:
#    documentation/diagnostics/frames/contact-sheet.png   <- whole run, 3 angles, one image
#    documentation/diagnostics/frames/f<NN>_<angle>.png   <- individual frames
```

`run [seconds] [on|off] [drive] [exc]` — e.g. `npm run observe -- run 20 off 1.2 0.08`.

---

## Environment gotchas (these cost hours to rediscover — read them)

- **Run everything from the PowerShell tool, NOT the Bash sandbox.** The Bash sandbox reaches
  `localhost` but **resets the external Supabase auth fetch**, so login fails with
  `ERR_CONNECTION_RESET`. PowerShell runs on the real host and reaches both the app and Supabase.
- **Use `127.0.0.1`, not `localhost`.** Node/chromium resolve `localhost` to IPv6 `::1` first; the
  Next server binds IPv4 only → `ECONNREFUSED`. The harness already uses `127.0.0.1`.
- **`next` is not on PATH for bare `doppler run`.** npm adds `node_modules/.bin`; doppler doesn't.
  Use `doppler run -- npx --no-install next ...`.
- **Detach the server so it survives the shell.** Each PowerShell tool call is a fresh session, so
  `Start-Job` dies with it. Launch detached:
  ```powershell
  $proj = "C:\Users\azgaz\Documents\Projects\eco3d.shop"
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command",
    "Set-Location '$proj'; doppler run -- npx --no-install next start -p 3002 *> '$proj\.next-server.log'" `
    -WindowStyle Hidden
  ```
  Restart after a rebuild: kill the listener on 3002 first
  (`Get-NetTCPConnection -LocalPort 3002 -State Listen` → `Stop-Process`), then relaunch.
- **Rebuild after any app code change.** The studio is a prod build; `next start` serves the last
  `next build`. The observe loop will silently show stale behaviour otherwise.

---

## One-time setup (already done, listed for a clean machine)

- `npm install -D playwright-core` (no browser download needed).
- A chromium under `%LOCALAPPDATA%\ms-playwright\chromium-*` (the harness auto-finds the newest;
  if missing: `npx playwright install chromium`). The MCP Playwright tool is unused — it demands a
  `chrome` channel that needs admin; this harness drives the bundled chromium directly.
- Credentials: defaults are baked for the dev admin, over/set via env if needed:
  `OBSERVE_EMAIL`, `OBSERVE_PASS`, `OBSERVE_RIG` (default rig `baby cyber dragon`),
  `OBSERVE_URL` (default `http://127.0.0.1:3002`).
- Auth is cached to `scripts/.observe-auth.json` (gitignored — holds session tokens).

---

## What you get + how to read it

`documentation/diagnostics/frames/` (gitignored, transient):

- **`contact-sheet.png`** — the whole run as a grid: rows = time, columns = camera angles, each cell
  stamped with `KE`, `drift`, `maxJ%`. Read this first.
- **`f<NN>_<angle>.png`** — full-res individual frames for detail.

Camera angles (the body lies along **X**):

| angle    | preset pos      | shows                                            |
|----------|-----------------|--------------------------------------------------|
| `front`  | `[0,4,22]`      | lengthwise **side profile** → spot lift-off/tilt |
| `top`    | `[0,30,0.01]`   | top-down → the planar undulation wave / turning  |
| `reset`  | `[0,8,16]`      | 3/4 overview                                     |

(`side` `[22,4,0]` looks *down the spine* — axial, not used.)

Per-frame diagnostics also print to stdout: `KE` (kinetic energy), `drift` (snout-projected COM
drift = forward progress), `maxJ%` (joint angle as % of its cap — **~100% means joints are railed /
over-driven**, the current main tuning issue, tracked in Linear AZ-33).

---

## The dev hook the harness drives

The studio exposes `window.__studio` (admin page only, set in `app/admin/animate/AnimateScene.tsx`):

```js
window.__studio.setCam('front'|'top'|'side'|'reset'|'front')  // camera preset
window.__studio.drive(true|false)                              // start/stop the sim
window.__studio.drag(true|false)                               // toggle swimming drag
window.__studio.tune(drive, excitability)                      // set CPG params
window.__studio.diag()                                         // { kineticEnergy, comDriftFromStart, maxJointFracOfCap, ... }
```

The harness loads the saved rig via the wizard (Pick Model → Load → `<rig>` → Animate), waits for
`window.__studio`, then uses it — no DOM scraping for control.

---

## Harness commands

`scripts/observe-swim.mjs` (also `npm run observe -- <cmd>`):

| command                                  | does                                                    |
|------------------------------------------|---------------------------------------------------------|
| `login`                                  | sign in once, cache session to `scripts/.observe-auth.json` |
| `controls`                               | dump the visible clickable controls (UI debugging)      |
| `run [secs] [on\|off] [drive] [exc]`     | load rig, run sim, multi-angle screenshot every ~1s + contact sheet |

---

## Troubleshooting

- **Login fails / `ERR_CONNECTION_RESET`** → you're in the Bash sandbox. Run from PowerShell.
- **`ECONNREFUSED` to the app** → server not up, or you used `localhost`. Check `127.0.0.1:3002`,
  tail `.next-server.log`.
- **Frames look unchanged after a code edit** → you didn't rebuild + restart the server.
- **`no chromium found`** → `npx playwright install chromium`.
- **Stale `window.__studio` / auth** → delete `scripts/.observe-auth.json` and `login` again.
