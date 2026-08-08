# Foot thrust (Phase D-T1)

## Why

The swim works and looks alive; the walk does not exist. The measured reason is not that the feet slide a long way — it is that the body is **decoupled** from the feet. Over a steady 6 s window of the base swim (`documentation/animation-roadmap.md` §5): body forward speed varies 13% of its mean, total backward foot sweep varies 45%, their correlation is **0.18**, and the body's best response to the feet arrives **0.41 s late** because the anisotropic drag is a low-pass filter. A body gliding at near-constant speed while the feet churn is exactly what the eye reads as sliding.

Two things are already solved and must not be rebuilt. The **rhythm is free**: with no limb oscillator running, diagonal feet move in phase (0.10 s apart on a 3.19 s stroke) and every other pairing opposes (1.54–1.64 s) — the diagonal-couplet gait sprawling tetrapods walk with. And the **timing machinery is verified**: with grip switched off, the grip/sweep windows were confirmed opening at max-forward reach and closing at max-backward.

Grip was the previous answer and it failed for a structural reason, not a tuning one. A grip pin is a solver constraint, and a constraint removes a degree of freedom the muscles were driving — a pinned foot reflects the traveling wave into a standing wave with zero travel (recorded in the `base FL grip` preset). Grip and the axial wave were competing for the same joints.

Foot **thrust** is a force, not a constraint. It enters as a generalized force, removes no degree of freedom, and overrides no joint target, so the wave is provably untouched. It is retired-grip's replacement under `animation-roadmap.md` **Decision 10**.

Planting was evaluated as an alternative and rejected on measurement, not preference: solving each frame for the body placement that cancels foot slip removes only **29%** of slip, **halves** the speed, and demands a **5.6 deg/s** yaw wobble — because 36% of foot motion is sideways and uncancellable, and the two girdles demand speeds differing 2 to 1 (front 0.80, hind 1.64 u/s). It also requires a forward *direction* as an input, and the body has no heading; heading is emergent (Decision 4).

## What Changes

- Add a per-foot backward thrust to the MuJoCo runtime, clocked off the limb-CPG girdle phase, applied along the foot's own hip segment's forward axis, with magnitude proportional to how fast that foot is sweeping backward.
- Add three simulation levers: an enable switch, a **signed** gain (negative brakes, so Phase D-T4 needs no schema change), and a phase offset for the push window.
- Add cumulative applied-impulse accounting to the MuJoCo diagnostics, split by source (foot thrust vs drag), so "are the feet contributing" is a number rather than an impression.
- Add a MuJoCo swim baseline preset and a thrust preset, both pinned from observation runs.
- Report the impulse split in the observation harness output.
- Mark grip as retired in the studio: the grip controls are hidden and `gripEnabled` defaults off.

## Non-goals

- No sweep, no lift, no planting, no root transposition, no velocity correction.
- No front/hind gain split (Phase D-T2), no turning (D-T3), no braking tuning (D-T4), no drive coupling (D-T5).
- No Rapier implementation. MuJoCo only, for the reasons in `design.md`.
- No deletion of grip code. Grip is made inert and hidden; removal is a separate change.
- No change to the CPG, the muscles, the drag model, or any angle cap.

## Capabilities

### Modified Capabilities

- `locomotion`: adds foot thrust as a land-propulsion mechanism, its three config levers, its impulse accounting, and its presets.

## Impact

- `app/game/locomotion/mujocoRuntime.ts` — the thrust loop and the impulse accumulators.
- `app/admin/animate/animateStore.ts` — three new `SimConfig` fields with defaults.
- `app/admin/animate/AnimateSidebar.tsx` — thrust controls added, grip controls hidden.
- `app/admin/animate/simPresets.ts` — two new MuJoCo presets.
- `scripts/observe.mjs` — prints the impulse split.
- `documentation/animation-roadmap.md` — the D-T1 result recorded in §4.
