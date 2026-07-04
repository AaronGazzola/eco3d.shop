Implementation is split into two increments. **Increment A** is the freeze-frame + shareable-link backbone, written to leave the per-tick physics math byte-identical at 1x speed when not frozen (verifiable by static checks). **Increment B** is the work that must be developed and visually verified against the running studio (deterministic seek, canvas overlays) plus the runtime gates, per the project rule "look at the frames, do not trust numbers."

## 1. View/playback state in the store (Increment A)

- [x] 1.1 Add a view slice to `animateStore` (`frozen`, `simTime`, `playSpeed`, `overlays: string[]`, `isolateLimb: string | null`, `stepRequest`) with setters, kept separate from `SimConfig`; reuse the existing `animateTab` for the tab.
- [x] 1.2 Add `encodeSimConfig(config): string` (base64 of JSON) and `decodeSimConfig(str): Partial<SimConfig>` helpers; route decode through the existing `applySimConfig` so unknown/missing keys are ignored.

## 2. Freeze / slow-motion / step-forward (Increment A)

- [x] 2.2 Honor the view slice in the `useLocomotion` accumulator: `intake = frozen ? 0 : min(realDt, MAX_FRAME) * clamp(playSpeed,0.1,1)`, plus any pending `stepRequest` ticks; the existing per-tick `while (acc >= TIMESTEP)` math is unchanged, so 1x-unfrozen behavior is byte-identical. Skip the grip/friction block on no-advance frames.
- [x] 2.4a `step(+n)` forward via `stepRequest`; advance `c.simTime` per tick and publish it.

## 3. `window.__studio` playback + link API (Increment A)

- [x] 3.1 Extend the `__studio` hook in `AnimateScene.tsx` with `pause()`, `play()`, `frameStep(n)` (named to avoid the existing `step` locomotion controller), `speed(x)`, `setOverlays(names)`, `isolateLimb(id)`, `buildLink()`/`copyLink()`, mapping onto the view slice. (`seek` lands in Increment B.)
- [x] 3.2 `speed(x)` clamps to 0.1-1.0; `setOverlays`/`isolateLimb` are pure view changes (no physics writes).

## 4. URL parsing + Copy link (Increment A)

- [x] 4.1 On the animate page, parse `tab`, `sim`, `overlay` query params on mount: select tab, apply decoded config, set overlays. (`t=` run-and-freeze lands with seek in Increment B.)
- [x] 4.2 Add a Copy link button to the Simulate sidebar that builds the link (current config encoded + tab + overlays) and writes it to the clipboard.

## 5. Sidebar freeze controls (Increment A)

- [x] 5.1 Add Simulate-tab controls: Freeze/Play toggle, Step +1 button, a speed slider (0.1x-1x), and overlay toggles (wave, stance) + isolate-limb select, bound to the view slice. (Step -1 and seek-to-time land in Increment B.)
- [x] 5.2 Show the current `simTime` and frozen/playing state next to the controls.

## 6. Published observation state (Increment A)

- [x] 6.1 In `useLocomotion`, publish per-frame read-only observation state into a preallocated `window.__locObs` (per-girdle measured phase + max-forward-reach world position from `updateMechPhase`; per-leg stance/swing flag from the grip-window `rel`/`inWindow` test). No per-frame object literals.

## 7. Deterministic seek + per-tick refactor (Increment B - against live studio)

- [ ] 7.1 Extract the grip/friction block + physics tick into one `advanceTick()` (dt = TIMESTEP) so grip/phase update once per tick; drive live, step, and seek all through it.
- [ ] 7.2 Implement `seek(t)`: free + rebuild (reseed CPG) then run `round(t/TIMESTEP)` `advanceTick()`; set `simTime=t`, `frozen=true`. Wire `step(-n)` to `seek(simTime - n*dt)`, `__studio.seek`, the sidebar seek input, and the `?t=` param.
- [ ] 7.3 Verify presets unchanged after the refactor (Swim, Walk drift/tilt) via the observe harness before trusting seek.

## 8. Canvas overlays (Increment B - against live studio) — DONE, verified live

- [x] 8.1 `wave` overlay in `AnimateScene` (`LocomotionOverlays`): an octahedron marker at each girdle's max-forward-reach point, hue by phase, reading `window.__locObs`; gated by `overlays.includes("wave")`.
- [x] 8.2 `stance` overlay: a sphere at each foot, green (grip/power-stroke) / red (swing). Implemented as a self-contained marker layer rather than tinting the merged group meshes (the body is one merged mesh per group; markers are non-intrusive and restore on toggle off automatically).
- [x] 8.3 `isolateLimb`: ghost the whole body (effective opacity 0.12 in `SceneContent`) and show only the selected limb's markers; restore on clear.

## 9. Headless harness + verification (Increment B)

- [ ] 9.1 Extend `scripts/observe*.mjs` to use `__studio.seek/step/setOverlays/isolateLimb` for a freeze-and-capture flow.
- [ ] 9.2 Determinism + no-perturbation invariant check via the harness (same sim-time → same transforms; overlays on == off).
- [ ] 9.3 Regression check: Swim and Walk presets drift/tilt unchanged. `tsc` + eslint clean; a shared `?sim=...&overlay=...` link reproduces config + tab + overlays on reload.
