# Wave shaping (Phase D-T2)

## Why

The body wave grows head-to-tail. On the measured baseline (`docs/animation-roadmap.md` §5) the
tail swings **2.4×** the front, and the two girdles rotate by amounts differing **2 to 1** — the front
girdle implies a body speed of 0.80 u/s while the hind implies 1.64 u/s. That envelope is correct for
swimming and wrong for walking: because the girdles demand different speeds, **no single body speed can
plant both**, which is why D-T1's plant slip bottomed out at 59% and no thrust gain went below it.
Flattening the envelope is the blocker on both §6 metric 1 (foot stillness) and §6 metric 2 (amplitude
quality), and `animation-roadmap.md` **Decision 11** is the locked answer to it.

Front-versus-back drive, the one shaping lever that exists today, is too coarse. It splits the spine at a
single index, so pulling the tail down pulls the mid-body down with it — the very region that must stay
high.

**A defect found while scoping this, which must be fixed first.** The CPG runs at a fixed fine resolution
of 25 oscillators, decoupled from the body's joint count, and `CpgSpec.oscOfSegment` maps each body
segment to the fine oscillator it should sample. The Rapier runtime applies that map
(`useLocomotion.ts`). **The MuJoCo runtime does not** — it passes each joint's body-segment index
straight into `oscillatorOutput` as if it were a fine index. On the current 11-segment rig the body
therefore reads only fine oscillators 0–10 of 25: it samples **44% of the chain**, holds roughly
**0.66 body waves instead of 1.58**, and crowds every joint into the head end of the wave. Two
consequences: the two engines are not running the same wave despite sharing `cpg.ts`, and — decisive for
this change — **a profile indexed by position along the spine would be applied at the wrong places**. Any
shaping built on the broken mapping would be tuning around the defect.

Fixing it will change how the approved MuJoCo `base swim` preset looks, so the fix is presented as a
side-by-side pair of config links for the owner to choose from, not applied silently.

## What Changes

- Fix the MuJoCo runtime to sample the fine CPG chain through `oscOfSegment`, as Rapier already does.
- Add a **five-point amplitude profile** along the spine — control points at normalised arc positions
  0, 0.25, 0.5, 0.75 and 1.0, linearly interpolated, each a drive multiplier defaulting to 1.0. The
  paper already drives by region (front 3 segments at 0.6 against 1.0 for the rest); this is more
  regions, not a new mechanism.
- Add **head isolation**: a switch that commands the head joint's servo target to zero, excluding the
  head from the wave outright rather than damping it, as Decision 11 requires.
- Extend the observation harness to measure §6 metric 2: the spread of per-joint peak angle as a
  fraction of each joint's own cap, the front-versus-hind girdle comparison, head sweep, and node
  travel against a **fitted curved centreline** rather than a straight axis.
- Expose all of it in the studio, in shareable links and in presets.

## Non-goals

- **No speed work.** Finding slow/medium/fast is D-T3. This change alters speed as a side effect of
  changing the wave, and reports it, but does not tune for it.
- No leg sweep (D-T4), no turning (D-T5), no preset grid (D-T6).
- **No head aiming.** Isolation means the head stops adding its own swing to the wave. Aiming it at a
  focal point is a later layer, and until it exists the head still yaws with the neck it is rigid to.
- No Rapier implementation of head isolation. The profile lands on both engines because it lives in
  `cpg.ts`; head isolation is at the MuJoCo servo, and Rapier is out of scope.
- No change to the couplings, the phase bias, `BODY_WAVES`, the muscle constants, the drag model, the
  angle caps, or the thrust term.
- No new preset until the owner has opened a link and approved it.

## Capabilities

### Modified Capabilities

- `locomotion`: corrects the MuJoCo CPG sampling mapping, and adds the spine amplitude profile and head
  isolation as wave-shaping levers.

## Impact

- `app/game/locomotion/mujocoRuntime.ts` — the `oscOfSegment` remap and the head-joint override.
- `app/game/locomotion/cpg.ts` — the per-oscillator profile multiplier in `stepCpg`.
- `app/admin/animate/animateStore.ts` — six new `SimConfig` fields with defaults.
- `app/admin/animate/AnimateSidebar.tsx` — the profile controls and the isolation switch.
- `scripts/observe.mjs` — the metric-2 reporting.
- `docs/animation-roadmap.md` — the D-T2 result recorded in §7.
