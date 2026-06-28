## Why

Tuning the dragon's gait is slow because everything on the body moves at once, so it is hard to isolate which part of a stride is right or wrong, and there is no way to hand someone a link that reproduces an exact simulation state. The animate studio can run and pause, but it cannot freeze on a chosen frame, replay a specific config, or visually separate one limb or the body-wave phase from the rest. This harness is the prerequisite for every later gait increment: it makes each small change checkable in isolation and shareable as a link.

## What Changes

- Add a **shareable config link** to the animate page: query params apply a full simulation config and view state on load — `?tab=simulate` selects the Simulate tab, `?sim=<base64 SimConfig>` decodes and applies the config through the existing apply path, `?t=<seconds>` runs to that sim-time then freezes, `?overlay=<csv>` enables named overlays. A **Copy link** action in the Simulate sidebar builds this URL from the current state.
- Add **freeze-frame controls**: pause, step ±1 frame, seek-to-sim-time, and a slow-motion speed multiplier (0.1×–1×). These exploit the existing deterministic fixed-step sim (seek = replay N steps then halt). Exposed both in the Simulate sidebar and on `window.__studio` so the headless observe harness can drive them.
- Add **two read-only canvas overlays**, toggleable and URL-addressable:
  - **wave/phase overlay** — draws the measured body-wave phase and a max-forward-reach marker per girdle (from the existing measured-reach signal);
  - **stance/swing leg coloring** — colors each leg green while gripping/power-stroking and red while swinging, with an *isolate limb* option that dims all but one selected limb.
- All overlays and controls are **observation-only**: they read solver/CPG state and must not alter locomotion physics.

Non-goals (deferred to a later change): force-vector arrows, criteria-card/contact-sheet generation, server-saved scenarios, and any change to the gait/CPG/muscle logic itself.

## Capabilities

### New Capabilities

- `locomotion-observation`: the isolation harness for inspecting the locomotion simulation — URL-encoded config links, freeze-frame/seek/slow-motion playback controls, and read-only canvas overlays (wave/phase, stance/swing leg coloring, limb isolation), surfaced in the Simulate sidebar and on the `window.__studio` headless API.

### Modified Capabilities

<!-- None. The existing `locomotion` capability's gait/CPG/muscle requirements are unchanged; this change only adds observation tooling that reads its state. -->

## Impact

- **Code:** `app/admin/animate/AnimateScene.tsx` (extend the `window.__studio` hook; add overlay meshes to the r3f scene), `app/admin/animate/AnimateSidebar.tsx` (freeze/seek/speed/overlay controls + Copy link in the Simulate tab), `app/admin/animate/animateStore.ts` (view/overlay/playback state alongside `SimConfig`; URL encode/decode of `SimConfig`), `app/game/locomotion/useLocomotion.ts` (expose measured reach/phase + stance/swing state for overlays; honor a playback speed / frozen flag — read-only, no physics change).
- **Harness:** `scripts/observe*.mjs` gain access to the new `window.__studio` freeze/seek/overlay methods for headless capture.
- **No data/schema/API changes.** No change to gait, CPG, muscle, or contact physics — overlays and freeze are non-intrusive.
