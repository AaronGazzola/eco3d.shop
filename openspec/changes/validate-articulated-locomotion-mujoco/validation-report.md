# MuJoCo oracle — validation verdict

**Date:** 2026-07-11
**Verdict: GO.** A reduced-coordinate (MuJoCo) model of our exact node skeleton, driven by the real `cpg.ts` through position servos plus the grip, produces **sustained, upright locomotion** — the walk the springy Rapier legs never achieved. This validates roadmap Decision 9 (move the solver to reduced-coordinate articulated physics).

Committed here (not in the gitignored `documentation/diagnostics/`) so the evidence lands in git.

## How to reproduce

```
npx tsx scripts/mujoco/dump-groups.ts        # once: dump the creature to the fixture (needs doppler/DB)
npx tsx scripts/mujoco/export-mjcf.ts         # skeleton → model.xml + model.meta.json
npx tsx scripts/mujoco/validate.ts "base walk" 16 4   # run a preset for 16s, 4s warmup
```

The runner imports the **real** `cpg.ts` (`buildCpgSpec`/`stepCpg`/`oscillatorOutput`/`girdleClockPhase`) and `muscles.ts` — no controller was reimplemented. Only the physics engine differs from the app.

## Results (16 s run, 4 s warmup, "baby cyber dragon" rig)

| preset | grip | COM travel | speed | tilt mean / peak | spine wave mean / peak | outcome |
|---|---|---|---|---|---|---|
| base wave | off | 1.2 u | 0.09 u/s | 95° / 160° | 30.6° / 40.8° | wave alive; tips (nothing holds it up) |
| base swim | off (drag on) | 1.7 u | 0.13 u/s | 68° / 127° | 31.3° / 46.1° | wave alive; tips |
| **base walk** | **4 feet** | **13.4 u** | **1.11 u/s** | **16° / 24°** | **26.9° / 36.3°** | **walks, stays upright** |
| base FL grip | 1 foot | 1.0 u | 0.06 u/s | 107° / 180° | 23.3° / 33.0° | pivots/tips (one foot can't support) |
| sweep & grip timing | off | 1.2 u | 0.09 u/s | 95° / 160° | 30.6° / 40.8° | = base wave |

**Reading it:**
- The **spine wave is faithful and healthy** everywhere — ~30° amplitude, in the same ballpark as the app's near-cap tuning. The CPG → Ekeberg-equilibrium → body-bend path reproduces on the new solver.
- **base walk locomotes upright**: 13.4 u in 12 measured seconds (~1.1 u/s) at only 16° mean tilt. The four gripped feet hold the body up and the grip ratchet propels it — with **no sweep** (sweepAmount 0). This is the core proof: rigid-but-force-exerting servo joints + grip give a real walk, where Rapier's springy legs bounced and collapsed.
- base wave / base swim **tip over** (tilt → 90°+) because, with the belly-support crutch removed, nothing holds the long chain up without grip. That's physical, not a failure — and it confirms the wave itself is intact.

## What the oracle uses (the ABA starting point)

- **Engine:** `@mujoco/mujoco` (Google-DeepMind official WASM), runs under **Node** (no browser harness needed). Integrator `implicitfast`, solver `Newton`, dt 1/120.
- **Model:** floating-base trunk chain, one hinge per spine joint, a two-hinge (lift+sweep) hip per leg, **no carrier body** — all derived from the node skeleton via the same helpers `body3d.ts` uses (rig-general; not hard-coded per model).
- **Spine actuation:** fixed-gain implicit position servo (kp≈40, kv≈3.3) tracking the Ekeberg equilibrium angle φEq = α(mL−mR)/(β(mL+mR+γ)), computed from the real CPG with the 10 ms muscle delay.
- **Leg actuation:** position servos (kp≈40, force limit 60) driven to the gait sweep/lift targets from `girdleClockPhase`.
- **Grip:** stiff foot-point spring (K≈300, D≈10) toward the captured plant point, applied via `xfrc_applied` as a force + r×F torque.
- **Contacts:** small foot spheres (r=0.06), floor `condim=1` frictionless, **no belly support** (the legs hold the body).

## Honest caveats (approximations, not the app verbatim)

1. **Spine is a fixed-gain servo to φEq**, not the app's per-step *varying*-stiffness Ekeberg. The varying-gain version destabilised MuJoCo's implicit linearisation; the fixed-gain servo to the same equilibrium angle is stable and carries the identical wave. Faithful in shape/amplitude, not in instantaneous stiffness.
2. **Grip is a soft spring**, not a hard pin. MuJoCo's `connect` equality would be the exact analogue, but this WASM build does not register the `eq_active` bool view needed to toggle it at runtime. The spring is the same "peg pinned, free to rotate" behaviour and is stable.
3. **No belly support.** It was a Rapier crutch for floppy legs; 22 redundant coplanar contacts also destabilise MuJoCo's contact solver. In the reduced-coordinate model the legs support the body, as intended.
4. **Walk direction** came out +X (tail-leading by our sign convention). That's a grip-timing/sign detail to tune, not a validity issue — it locomotes directionally and stably.

## Debugging log (what it took to get stable)

- Explicit Ekeberg torque injects energy → blew up. Fix: implicit position servo (mirrors the app's use of Rapier's implicit ForceBased motor).
- Belly-support contacts (22 redundant) destabilise the contact solver. Fix: remove them; legs hold the body.
- Big 0.27 foot balls on light legs eject violently. Fix: small (0.06) foot contact spheres.
- Frictionless `condim=3` contacts are ill-conditioned. Fix: `condim=1` (normal-only).
- Grip spring K≥1500 too stiff for explicit `xfrc`. Fix: K≈300, D≈10.

## Recommendation

Proceed with Decision 9. The physics is proven: our CPG walks a servo-driven reduced-coordinate body built from the node skeleton. Next phase — build the shipping runtime (a small custom ABA, or MuJoCo-WASM) at runtime from the node skeleton, and validate its walk against this oracle.
