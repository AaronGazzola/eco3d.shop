# Handover — 2026-06-06 — Phase C-3D (Rapier) — debugging a drag energy-runaway

Transient pointer to resume in a fresh chat. Durable record lives in
`documentation/animation-roadmap.md` (§2 Decisions, §3 phases, §4 status) and the OpenSpec
change `openspec/changes/replatform-body-rapier-3d/`. Delete this file after use.

## Where we are in one line

The locomotion body has been **re-platformed from the planar custom solver onto the Rapier 3D
physics engine** (roadmap **Decision 8**). It swims head-first in isolated tests, but on the
real rig it has an **energy-runaway bug**: with the swimming drag ON, kinetic energy grows
without bound and the body eventually floats and rotates. **That is the one open bug.**

## Read order to get up to speed

1. `documentation/animation-roadmap.md` — §2 **Decision 8** (full 3D on Rapier, supersedes
   Decisions 1 & 2), §3 phases (Phase **C-3D** is the current one, before Phase D walking).
2. `openspec/changes/replatform-body-rapier-3d/` — **proposal.md**, **design.md** (read the
   "Spike findings" and "Stability findings" sections — they have the Rapier API + the fixes
   already applied), **tasks.md** (1–7 done, 8 = browser gate in progress, 9–10 pending),
   **specs/locomotion/spec.md** (the delta).
3. This file's "The open bug" section below.

## What is built and working (committed)

- **`app/game/locomotion/body3d.ts`** — builds the axial chain (head/spine/tail, legs
  excluded) as Rapier rigid bodies from the node skeleton (uses node x/y/z). **Bodies are
  world-aligned (identity orientation); only the capsule collider is rotated to the segment
  forward** — this keeps every revolute joint's yaw axis = world up, so a curved rest pose
  doesn't snap the chain. Mass = `nodeWeight` via `collider.setMass` (engine derives inertia;
  verified head yaw inertia ≈ 1.49). Joint limits from `angleCaps`. Helpers: `jointAngle`,
  `jointRate`, `worldAxis`, `axialLengths`.
- **`app/game/locomotion/useLocomotion.ts`** — deterministic fixed-step Rapier world (gravity
  off), coupled CPG→Ekeberg→engine-joint-torque + 3D drag, renders the rig from engine
  transforms. The old planar A-phase/Muscle-test/Kick modes are **gone**. CPG preview kept.
- **`app/game/locomotion/environment.ts`** — `applyEnvironment3D(body)`: 3D anisotropic drag
  as per-body forces. **← this is where the bug lives (see below).**
- **`app/game/locomotion/diagnostics.ts`** — `buildCaptureSpec3D` / `buildSample3D` read from
  Rapier bodies (top-down x/z + `outOfPlaneY`); serializers unchanged. CPG capture kept.
- **`app/game/locomotion/cpg.ts`** — `buildCpgSpec(segmentLengths: number[])` (decoupled from
  the old BodySpec). CPG + Ekeberg math unchanged.
- **`app/game/locomotion/weights.ts`** — `nodeWeight` defaults (kept out of the UI bundle).
- **`app/admin/animate/animateStore.ts` + `AnimateSidebar.tsx`** — Simulate tab trimmed to:
  Environment (Drag) toggle, **CPG drive (3D)** Run/Record, CPG preview, Diagnostics.
- **Deleted:** `solver.ts`, `body.ts` (planar), `scripts/locomotion-drag-direction.ts`.
- **`scripts/locomotion-3d-swim-check.ts`** — headless harness. Run: `npx tsx
  scripts/locomotion-3d-swim-check.ts`. It currently traces a 60s KE run on a curved synthetic
  rig and reproduces the bug. This is the main debugging tool — no browser/login needed.

### Key constants (in code now)
`CPG_TO_MUSCLE_GAIN = 1`, `JOINT_DAMPING_3D = 2`, `TIMESTEP = 1/120` (useLocomotion);
`DRAG_NORMAL/TANGENT/ANGULAR = 0.6 / 0.05 / 0.03` (environment); default `cpgDrive = 2.0`,
`cpgExcitability = 0.09`, `STD_SEGMENT_WIDTH = 0.5` (weights).

## The open bug — drag energy-runaway

**Symptom (user, in browser):** both drag on/off get "progressively more crazy" — energy
builds up and the body eventually floats and rotates in the air. The early seconds look calm,
so captures taken early look fine.

**Reproduced headless** (`locomotion-3d-swim-check.ts`, 60s, curved rig, gain 1):
- **Drag ON** → KE grows unbounded: 4.6 → 98 → 4,040 → 12,400 → **79,200** by 45s, and comY
  rises to ~1.08 (starts floating).
- **Drag OFF** → KE rises then **saturates** ~700 (bounded, but the body still thrashes hard).

**Diagnosis so far:**
- Rotational inertia is fine (1.49 yaw) — not the cause.
- **The resistive drag is the energy source**, not the dissipator: drag-off saturates, drag-on
  runs away. Analytically `F·v ≤ 0` per segment (it *should* dissipate), so the runaway is
  likely a positive-feedback / numerical-overshoot effect: thrust → forward motion → more
  thrust, and/or explicit per-substep drag overshooting at the tail's larger `C_n·L`.
- Secondary: even drag-off saturates at a too-hot amplitude (~700 KE) — the muscle-drive vs
  damping balance needs more dissipation for a calm steady amplitude.

**Next steps (planned, not yet done):**
1. **Bisect the drag** headless: set `C_ω = 0`, then linear-only, then lower `C_n`, and watch
   whether KE still grows — isolate which term pumps energy.
2. **Fix the drag** to be strictly dissipative in practice — likely clamp the per-substep drag
   impulse so it can't exceed/flip the segment velocity, and/or recompute against the correct
   relative velocity. Consider applying drag once per frame vs per substep.
3. **Raise overall dissipation** (joint damping and/or drag) so the steady amplitude is calm.
4. Then re-run the browser gate (rebuild `npm run prod:3002`, Drag off = gentle undulation in
   place; Drag on = slow head-first swim, **energy stays bounded over a long run**).

## How to run the gate (browser)

`npm run prod:3002` (rebuild — code changed). Diagnostic recording needs
`ENABLE_DIAGNOSTICS_CAPTURE=true`, already set in `.env.local` (gitignored). In the studio:
Simulate tab → **Drag ON** → **Run CPG drive** → settle → **Record** ~5–10s (run it LONG to
catch the runaway). Captures land in `documentation/diagnostics/`.

## Governance / backlog

- Deferred tuning is in **Linear** (Az team, AzAnything.dev project): **AZ-33** (swim thrust
  speed + joints riding caps), **AZ-34** (merge segment meshes perf). Idea-channel only —
  promote to a new OpenSpec change to build.
- Phase C-3D's tasks 8–10 (browser gate, determinism check, docs, final validate) remain.
  **Do not archive** until the energy-runaway is fixed and the swim gate passes.

## Git state

Branch `main`. Recent commits: `cdb5919` (Decision 8 + proposal), `5cc7e8e` (body3d
foundation + headless proof), `3d46731` (studio integration), `d2a2147` (stability fix:
world-aligned bodies + joint damping + gain 12→1). This handover + the long-run trace are the
latest commit. Pushes to `origin/main` may be blocked by Auto Mode (classifier) — if so, the
user pushes manually.
