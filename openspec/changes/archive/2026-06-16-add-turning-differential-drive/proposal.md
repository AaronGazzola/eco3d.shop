# Add turning via left/right differential CPG drive

## Why

The forward walk is logic-complete on `fix/local-plane-muscle-axis`: coupled axial + limb CPG,
servo hips, lift, grip-pin, and the paper's **front/back differential drive** (rostral segments on
a lower drive, shaping the walking wave; landed `e6c3c66`). The next missing piece toward
target-tracking is **turning**.

Knüsel et al. (2020, Part 6) implement turning as **left/right asymmetry of the descending drive**:
no separate steering system, no new oscillators, no new couplings. The body curves toward the
**less-driven side** because the weaker chain's contraction phase is shorter/shallower. This is
the same machinery we just added for front/back differential drive — `stepCpg` already builds a
per-oscillator `driveArr[size]` (cpg.ts:196-201); we extend it with a single L/R turn bias.

This is the **prerequisite** for the target-tracking brain (Linear AZ-issue, future change): the
brain produces a `turnBias` signal that drives the body; without the bias path the brain has
nothing to actuate.

## What Changes

- **CPG (`stepCpg`):** add an optional `turnBias` parameter (default `0`) that multiplies the
  per-oscillator drive by a side factor on top of the existing front/back factor — both axial
  chains AND limbs. **User-facing convention:** positive turns the body left, negative turns
  right, zero is off; magnitude in `[0, 1]` scales the weakening (the side that gets weakened
  is calibrated empirically against the body's drift under Ekeberg + drag — see design.md).
- **Animate store:** add `turnBias: number` (default `0`) to `SimConfig`, `DEFAULT_SIM_CONFIG`,
  `pickSimConfig`, plus `setTurnBias` on the store; persisted with the rest of the sim config.
- **Sidebar:** a **Turn bias** slider in the Simulate tab (range `[-1, +1]`, step `0.01`,
  default `0`), placed adjacent to the Front segments / Front drive sliders.
- **`window.__studio` hook:** add `turn(bias)` mirroring `front(...)` for headless tuning.
- **`useLocomotion`:** read `store.turnBias` and pass it through to `stepCpg` alongside the
  existing `frontDrive` / `frontSegments` args.
- **Headless gate:** new `scripts/locomotion-turn-direction.ts` — coupled run, drag on, asserts
  `turnBias = +0.3` curves the COM trajectory left (integrated yaw of snout axis > 0),
  `turnBias = 0` stays straight (|yaw| < ε), `turnBias = -0.3` curves right (sign flips). This
  is the same shape as the existing `locomotion-3d-swim-check.ts` directional gate.

## Capabilities

### New Capabilities
<!-- none — all behavior fits the existing locomotion capability -->

### Modified Capabilities
- `locomotion`: extend the CPG's differential-drive path with a left/right turn bias on top of
  the front/back front-segments split; expose as a sidebar slider, store field, and `__studio`
  hook; add a behavioral gate that the bias steers the body.

## Impact

- **Specs:** `locomotion` — ADD turning requirement (L/R differential drive, applied to axial
  + limbs, composes multiplicatively with front/back). MODIFY the existing CPG differential-drive
  requirement only if needed to mention the new factor (likely a small wording delta).
- **Code:**
  - [app/game/locomotion/cpg.ts](app/game/locomotion/cpg.ts) — extend `stepCpg` signature and
    `driveArr` build.
  - [app/admin/animate/animateStore.ts](app/admin/animate/animateStore.ts) — `turnBias`,
    setter, default, `pickSimConfig`.
  - [app/admin/animate/AnimateSidebar.tsx](app/admin/animate/AnimateSidebar.tsx) — Turn bias
    slider in `SimulateTab`.
  - [app/admin/animate/AnimateScene.tsx](app/admin/animate/AnimateScene.tsx) — `turn(bias)` on
    `window.__studio`.
  - [app/game/locomotion/useLocomotion.ts](app/game/locomotion/useLocomotion.ts) — read +
    forward `turnBias` to `stepCpg`.
  - `scripts/locomotion-turn-direction.ts` — new headless directional gate.
- **Out of scope (→ future changes / Linear):** the target-tracking brain that produces the
  bias signal; turning under foot-grip (the grip switch already lives in `useLocomotion`, the
  bias just rides on top); per-limb asymmetry beyond a single global L/R split; tuning the
  bias magnitude for a given turn radius.
