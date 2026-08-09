# Locomotion handover — DELETE AFTER READING

**Written 8-Aug-2026. Disposable by design.**

This is a one-shot baton, not a reference. It exists so the next session can resume without re-deriving
the last one, and it goes **stale the moment that session changes anything**. Read it once, act on it,
then **delete it and write a fresh one** describing where you left off. Never cite it as a source, never
update it in place, and never treat an undated claim in it as current.

Everything durable lives elsewhere, and those documents ARE meant to be re-read:

- `animation-roadmap.md` — decisions (§2), phases (§3), the measured baseline (§5), the success metrics
  (§6), and the dated Phase D-T status log (§7). This is the record. Where it disagrees with this file,
  it wins.
- `locomotion.md` — how the paper maps onto our rig.
- `reference/locomotion-reference.md` — the paper. Wins any disagreement about an equation or constant.
- `observation-loop.md` — how to see the system rather than infer it.

> A previous version of this file (2026-06-29) described a grip-pin walk driven by levers that no longer
> exist in the code, and it survived long enough to mislead. That is exactly the failure this
> delete-after-reading rule exists to prevent.

## 1. Goal and approach

Make the dragon walk like a real lizard, built in small **observable** steps measured against the
Knusel et al. 2020 salamander CPG paper. Movement emerges from controller → muscles → body dynamics →
environment forces. Never hand-authored. Evolution pathway: swim → walk → turn → seek a target.

Method = the observation loop: isolate one behaviour, drive the real studio headlessly, capture
focused signals, change ONE lever, compare against the previous capture and the paper, report with
numbers. Every claim about behaviour is backed by a capture, never by reading the code.

## 2. What runs today

- **Two engines**, chosen by `simEngine` in `SimConfig`, with presets scoped per engine.
  - **Rapier** (maximal-coordinate impulse solver). The `base swim` preset lives here and is the
    current visual foundation. Joint motors behave like springs, so the legs are somewhat compliant.
  - **MuJoCo** (reduced-coordinate, every joint a force-limited position servo; Decision 9). The legs
    are genuinely rigid here — measured sweep 0.00 rad at both caps. Engine binaries are served from
    `public/mujoco/`; if MuJoCo silently does nothing, check those two files are being served.
- **The CPG is engine-independent** (`cpg.ts`): axial double chain, limb oscillators, Table 2
  couplings, length-weighted phase bias. Both engines drive the same network.
- **Drag** is anisotropic (across-body resisted 12× more than along-body) and is what turns the wave
  into forward travel. Rapier applies it to spine **and** leg bodies; MuJoCo applies it to spine
  segments only — so under MuJoCo any forward impulse from the feet is cleanly attributable.
- **The studio** (`/admin/animate`) exposes every lever, presets, overlays, and `window.__studio` for
  the harness. Rig loading now goes through the unified `dragon_models` table: a variant and a stage
  must be chosen in the Pick step before a rig can be saved.

## 3. What is proven, with numbers

Full set in `animation-roadmap.md` §5. The load-bearing results:

- **The swim works and looks right.** 1.03 u/s cruise, dead straight (0.025 u lateral over 8.6 u),
  flat (0.001 u vertical drift, 0.7° max tilt), joints at 51–96% of cap without clipping.
- **The walking rhythm already exists, free.** With no limb oscillator running, diagonal feet move in
  phase (0.10 s apart on a 3.19 s stroke) and every other pairing opposes (1.54–1.64 s). That is the
  diagonal-couplet gait. Thrust only has to decide how hard each foot pushes, never when.
- **The feet are passengers.** Foot height varies < 0.01 u; no foot is ever still (< 0.10 s below 10%
  of body speed in a 6 s window); foot ground speed 1.30 front / 1.76 hind against a body at 1.03.
- **The body is decoupled from the feet.** Body speed varies 13% of its mean, foot sweep varies 45%,
  correlation **0.18**, body responding **0.41 s late**. This — not slip distance — is what reads as
  sliding, and it is the gap Phase D-T exists to close.

## 4. What was tried and rejected (do not re-propose)

- **Foot grip as a solver pin** (built twice, most recently as a MuJoCo `connect` equality). It walks,
  but a constraint steals joint authority from the muscles: a pinned foot reflects the traveling wave
  into a **standing wave with zero travel**. The *timing* was never wrong — with grip off, the windows
  were verified opening at max-forward reach and closing at max-backward. Retired by Decision 10.
- **Keyframe pose cycles for locomotion.** The root translates independently of the feet, so the
  creature slides by construction. The runtime and studio are recoverable from git history if static
  poses are ever wanted; locomotion is never keyframed.
- **Solving each frame for the body placement that cancels foot slip.** Measured: removes only **29%**
  of slip, **halves** the speed, demands a **5.6 deg/s** yaw wobble. It also needs a forward direction
  as an input, and the body has no heading — heading is emergent (Decision 4).
- **Planting as a goal at all.** 36% of foot motion is sideways and uncancellable, and the two girdles
  demand speeds differing 2 to 1 (front 0.80, hind 1.64 u/s). No single body velocity plants both.

## 5. Next step — Phase D-T2, wave shaping

**The goal is the preset grid**, defined in `animation-roadmap.md` **§6**: 3 speeds × 3 turn levels ×
direction, each cell satisfying three metrics at once — foot stillness in the CPG-clocked plant window,
an even high-amplitude wave with the head excluded, and ordered speeds and turn rates. Read §6 before
touching anything; it is the authoritative definition and it supersedes every earlier pass condition.

**Done (D-T1).** Foot thrust ships. The gain alone spans 0.58 → 2.18 u/s with the wave untouched, and
plant slip falls from 159% to 59%. Front and hind carry separate phase shifts (0.138 / 0.638) because
the girdles are half a cycle apart — sharing one put the hind push on the swing.

**In progress (D-T2).** Tracked by the OpenSpec change `add-wave-shaping`. Full record with numbers in
roadmap §7, 8-Aug-2026. Read that before touching anything; the summary here is only the shape of it.

- **A sampling defect was found and fixed.** MuJoCo was reading only the front 44% of the CPG chain,
  holding 0.66 body waves instead of 1.58, because it used body-segment indices as fine-oscillator
  indices while Rapier remapped through `oscOfSegment`. The two engines were running different waves.
  Fixing it made the body faster (1.06 → 1.36 u/s) and removed a dead spot mid-body — and pushed 6 of 10
  spine joints to their caps at the previously approved config. **The pre-fix look cannot be reproduced
  from a config link**, because the difference is code.
- **The five-point spine profile and head isolation ship**, both off by default and verified inert there.
  Head isolation takes the head joint from 101% of its cap to 23%, but head *swing* falls only 5% — the
  head is rigid to a neck that still waves, so this is not head stabilisation.
- **Evenness is now measured in degrees, not cap fraction** (owner's decision, §6 rewritten). Forced by
  finding the authored caps uneven by 2.2×, which made the two measures different targets.

**The angle caps are frozen — settled, not open.** They read 21, 23, 37, 39, 28, 28, 22, 30, 30° along the
spine and 45° at the tail, and they are the **real range of motion of the printed 3D model**: exceeding one
makes that segment clip into its neighbour. A proposal to smooth them was rejected on that basis. **Never
raise a cap to make the wave fit.**

**Pick up here.** With the caps frozen and evenness measured in degrees, the target is now concrete: a
**uniform 20–21° bend across joints 2–10**, set by joint 7's 22° cap (joint 2's 23° is next; the head
joint's 21° does not bind because isolation holds it near zero). The current best variant runs 10–30°, so
the job is to **lift the front** (joints 2–4, at 11–14°) and **hold the tail down** (joints 8–9, at
28–30°). The five profile control points sit at arc 0, 0.25, 0.5, 0.75 and 1.0; the three joints still
clipping sit between arc 0.58 and 0.76, so the hip-to-mid-tail span is where to cut. Expect a compressive
response — the Ekeberg equilibrium angle is a ratio whose tonic term does not scale, so overshoot rather
than assuming a 20% cut buys 20%.

**Then:** the speed ladder using every lever together → leg sweep (no thrust, foot stillness only) → turn
levels → land the grid. See `animation-roadmap.md` §3, Phase D-T, and the open tasks in
`openspec/changes/add-wave-shaping/tasks.md`.

**Before observing anything:** rebuild. `npm run prod:3002` from PowerShell, detached. The server from the
last session was killed deliberately, so every config link in that session's report is dead — regenerate
them from the harness rather than reusing an old one.

**The floor to beat.** 59% plant slip is the best rigid legs achieve. The residue is the foot's sideways
swing, which no amount of forward body motion cancels. Shrinking the girdle rotation (D-T2) and adding
sweep (D-T4) are the two levers that can go below it.

## 6. How to run

From PowerShell (not the bash sandbox — it resets Supabase auth). **Never observe a dev server:**
`/admin/animate` lags badly enough under `next dev` that what you see is not what the code does.

```
npm run prod:3002        # build + serve on 3002; run it detached so it survives across commands
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --events --legw 0.1 --config path\to\config.json
```

**Rebuild and restart after every app-code change, before observing and before handing over any
link.** There is no hot reload: a running production server keeps serving the old bundle, so
skipping this captures the previous version of the code and reports it as the new one. Stop the
previous server first — the port stays bound. Harness changes (`scripts/observe*.mjs`) need no
rebuild. Confirm the rebuild took by checking the reported config contains the lever you just added.

Auth is cached in `scripts/.observe-auth.json`. The saved rig is
listed as **"Demo Dragon — <stage>"** in the Pick step's Load tab (the old "baby cyber dragon" label
is gone; set `OBSERVE_RIG` accordingly). Forward axis = **−X**, lateral = **Z**, both confirmed from a
known swim. Captures land in `docs/diagnostics/observe/` with the exact config embedded.

## 7. Key files

- `app/admin/animate/animateStore.ts` — `SimConfig`, every lever, encode/decode for shareable links.
- `app/admin/animate/simPresets.ts` — the named presets, scoped per engine.
- `app/admin/animate/AnimateScene.tsx` — `window.__studio`, overlays.
- `app/game/locomotion/cpg.ts` — the oscillator network; `girdleClockPhase` is the limb clock.
- `app/game/locomotion/useLocomotion.ts` — the Rapier sim loop.
- `app/game/locomotion/mujocoRuntime.ts` — the MuJoCo sim loop; the drag loop is where thrust belongs.
- `app/game/locomotion/mjcf.ts` — the per-rig MJCF model generated from the node skeleton.
- `app/game/locomotion/environment.ts` — the anisotropic drag coefficients.

## 8. Governance status

- The locomotion capability spec (`openspec/specs/locomotion/spec.md`) was deleted by the rig rebuild
  and has been restored. It describes the running code and contains no grip requirements.
- Four locomotion changes were in flight when the rebuild deleted them, holding 8 unchecked tasks
  between them. They were **not** restored — open task boxes are the poisoning vector the repo rules
  forbid. Their outcome is recorded in the roadmap's 2026-06-18 → 2026-07-26 status entry instead.
- `AZ-183` and `AZ-184` are closed but describe the deleted keyframe runtime; both need correcting.
- Phase D-T1's change `add-foot-thrust` was verified and **archived** on 8-Aug-2026, merging eight
  requirements into the locomotion capability spec. Its section 8 was rewritten before archiving: those
  tasks gated on the retired body-surge metric, so the sweep that was actually run is recorded against the
  new metric and the tasks that only served the old gate are marked dropped with reasons.
- Phase D-T2 is tracked by the OpenSpec change `add-wave-shaping`, currently active with sections 1.4,
  5.1b–5.5 and 5.7 open. 5.7 is the angle-cap decision and needs the owner.
