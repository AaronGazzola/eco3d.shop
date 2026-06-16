## Context

`stepCpg` already builds a per-oscillator `driveArr[size]` where `size = 2n + limbs`. The existing
front/back path (cpg.ts:194-201) takes a global `drive` and replaces it with `frontDrive` for the
first `frontSegments` indices of each chain. Left/right turning is the same idea on the orthogonal
axis: pick a side, multiply its oscillators' drive by a `< 1` factor. The paper's intuition is
that the weaker side spends less time / amplitude pulling, so the body curves toward it.

The CPG's index layout makes the L/R split trivial:
- left axial chain: `0 .. n-1`
- right axial chain: `n .. 2n-1`
- limbs (base `= 2n`): `LIMB_LF = 0`, `LIMB_RF = 1`, `LIMB_LH = 2`, `LIMB_RH = 3` — so left limbs
  are `base + {0, 2}`, right limbs are `base + {1, 3}`.

## Goals / Non-Goals

**Goals:**
- Single signed slider `turnBias ∈ [-1, +1]` that curves the body in a predictable direction.
- Bias applies to the **whole CPG** (axial chains + limb oscillators), faithful to the paper.
- Composes multiplicatively with the existing front/back factor: a front-front-left oscillator
  gets `drive · (frontDrive/drive) · (1 − |turnBias|)`.
- Off when `turnBias = 0` (bit-exact same `driveArr` as today).
- Headless gate proves the bias actually steers (no "the slider moves but nothing happens").

**Non-Goals:**
- The target-tracking brain that produces `turnBias` (separate, later change; needs a sensor +
  controller spec).
- Asymmetric L/R magnitudes — one knob is the paper's mechanism; two knobs is overfitting.
- Per-limb steering vs. axial-only steering — both are bundled (one signal, whole CPG).
- Tuning a specific turn radius. The gate is **direction + monotonicity**, mirroring how the
  forward-translation gate works for swim (AZ-33 is the tuning home).

## Decisions

- **Signed bias, not two drives.** `turnBias > 0` weakens the **left** chain (left axial + LF/LH)
  → body curves left. `turnBias < 0` weakens the **right** chain. `0` is off. One slider, sign
  picks the side. *Alternative (two `leftDrive` / `rightDrive` sliders mirroring the front pair):
  rejected* — adds a second knob without a behavior the brain needs; the brain will produce one
  signed signal, not two independent drives.

- **Per-side factor `f = 1 − max(0, ±turnBias)`.** For each oscillator on the weakened side,
  `driveArr[i] *= f`. The other side is unchanged. This keeps the un-biased side at the user's
  intended `drive` (the brain shouldn't have to compensate for both sides when it only wants to
  turn). *Alternative (subtract bias from one side AND add to the other): rejected* — would
  over-drive the outside chain past `cpgDrive`, leaving the user's slider no longer the body's
  effective drive.

- **Sign calibrated empirically, not biologically.** The naive biological argument ("less drive
  on the inside of the turn → body turns toward the less-driven side") does NOT hold for this
  pipeline: the Ekeberg active term `α(mL − mR)` plus implicit-motor integration plus the drag
  environment produces a net drift toward the SIDE WITH WEAKER CPG output, not away from it
  (an asymmetric reduction in left-side amplitude leaves the right-side wave dominant and the
  body drifts left). The directional script `scripts/locomotion-turn-direction.ts` was added
  specifically because this could not be predicted from the muscle equations alone. The
  user-facing convention (positive `turnBias` = left turn) is the priority; the implementation
  wires `turnBias > 0` to weaken the **right** CPG chain (axial `n..2n-1` + limbs RF/RH) so
  that the body's empirical drift matches the convention. Naming the chains "left" / "right"
  is internal CPG nomenclature; the spec captures the wiring formula and the calibration is
  protected by the headless gate.

- **Multiplicative composition with front/back.** Front factor (already built per-index) and
  turn factor (new per-index) multiply: `driveArr[i] = base · frontFactor(i) · turnFactor(i)`.
  Two orthogonal asymmetries, independent. *Alternative (additive, or front/back overrides turn):
  rejected* — multiplicative is the right algebra for "two independent reductions"; either
  alone wins back when the other is `1`.

- **Whole CPG, not axial only.** Paper splits the global descending drive; limbs share that
  drive. Splitting axial only would leave the limbs on the symmetric global drive and the
  stepping cadence would NOT shorten on the inside, which is part of why salamander turns work.
  *Honest:* the legs in our rig currently scrub a horizontal arc (D2 leg model), so limb-side
  asymmetry's contribution to actual turn rate may be small until lift gets richer. The wiring
  is still the faithful one and matches the paper.

- **Headless directional gate.** A new `scripts/locomotion-turn-direction.ts` records a 4 s
  coupled run with drag on and asserts the integrated yaw of the head's forward axis grows in
  the expected direction for `turnBias ∈ {-0.3, 0, +0.3}`. Mirror of the existing
  `locomotion-3d-swim-check.ts` directional gate. Manual studio gate (browser) on the slider
  remains the user-facing check.

## Risks / Trade-offs

- **Sign convention ambiguity.** "Left" depends on the body's forward axis. We standardize on:
  positive `turnBias` weakens the left chain (oscillator indices `0..n-1` and limbs LF/LH),
  which curves the body **toward its own left** (positive yaw if forward is +x and up is +y).
  Documented in the requirement's sign-convention scenario.
- **`|turnBias| → 1`.** Drives one whole side to zero drive → that side's amplitudes collapse
  (sigmoid saturation off the bottom) → the body locks to one shape. This is the documented
  limit, not a bug; we slider-clamp to `[-1, +1]` and let `±1` be the "spin in place" extreme.
- **No automated turn-radius gate.** Same trade-off as swim direction vs. swim speed: speed
  belongs to AZ-33 tuning. Radius will land there too.

## Migration Plan

- Pure additive change. `turnBias = 0` (the default) makes `stepCpg`'s `driveArr` identical to
  today — every previously recorded simulation reproduces bit-exactly.
- No data/schema migration. `SimConfig` gets one new field; existing saved configs without
  `turnBias` fall back to the default through normal store hydration.
- Rollback = revert the change's commits; no specs are torn down (this is an ADD to an existing
  capability).
