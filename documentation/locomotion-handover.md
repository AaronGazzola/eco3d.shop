# Locomotion handover — where the work stands

Status as of 2026-08-03, branch `feat/e1-walk-cycle`. This is the "resume without re-deriving it"
record: what runs, what is proven with numbers, what was tried and rejected, and the next step.
Companion records: `animation-roadmap.md` (phases, decisions, the measured baseline in §5),
`locomotion.md` (how the paper maps onto our rig), `reference/locomotion-reference.md` (the paper),
`observation-loop.md` (how to see the system rather than infer it).

> Superseded: this document previously (2026-06-29) described a grip-pin walk driven by levers
> (`legClock`, `bodyWaves`, `sweepReverse`, `stanceMuscleBoost`) that no longer exist in the code.
> Grip itself is retired by **roadmap Decision 10**. Nothing from that version should be resumed.

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

**Next (D-T2).** Per-region drive multipliers along the spine (roadmap Decision 11), head multiplier
zero. The tail swings 2.4× the front and the two girdles rotate by amounts differing 2 to 1; that
unevenness is why no single body speed suits both girdles, so it is the blocker on both metric 1 and
metric 2. Front-vs-back drive is too coarse — pulling the tail down pulls the middle down with it.

**Then:** the speed ladder using every lever together → leg sweep (no thrust, foot stillness only) →
turn levels → land the grid. See `animation-roadmap.md` §3, Phase D-T.

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
known swim. Captures land in `documentation/diagnostics/observe/` with the exact config embedded.

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
- Phase D-T1 is tracked by the OpenSpec change `add-foot-thrust`.
