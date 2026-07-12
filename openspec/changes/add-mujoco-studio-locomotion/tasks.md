Build-now only. Each task lands in code this cycle; the visual gate (Task 6) is the studio walk.

## 1. Shared model builder

- [x] 1.1 Moved the MJCF builder into `app/game/locomotion/mjcf.ts` (pure `buildMjcf` + `MjcfMeta`, added `segmentBodies` body→group map for rendering). `scripts/mujoco/skeleton-to-mjcf.ts` now re-exports it (single source of truth).
- [x] 1.2 `tsc`/eslint clean; `npx tsx scripts/mujoco/export-mjcf.ts` still emits the same model.

## 2. Client MuJoCo load + wasm serving (de-risk first)

- [x] 2.1 `@mujoco/mujoco` installed; **glue + wasm served from `public/mujoco/`** and loaded at runtime (a bundler-ignored dynamic import of `/mujoco/mujoco.js` + `wasmBinary` fetch) — no bundler Node-builtin stubbing needed, works under **both webpack and Turbopack** (the app default). `next.config` reverted to minimal.
- [x] 2.2 `app/game/locomotion/mujocoRuntime.ts` (`loadMujocoEngine`): verified in a headless browser via the temporary `/mjtest` route + `scripts/mujoco/browser-check.mjs` — `OK nq=22 nv=21 nbody=17 nu=15 neq=4`, model built from the node skeleton. (`/mjtest` removed at Task 6.)

## 3. Port the CPG servo/grip step loop

- [x] 3.1 `MujocoLocomotion` in `mujocoRuntime.ts` ports the `validate.ts` loop verbatim: `stepCpg`; spine servo to φEq (10 ms delay); leg lift/sweep servos from `girdleClockPhase`; grip foot-point spring via `xfrc_applied`; reads the same `SimConfig` fields; tuned constants (K≈300/D≈10) carried from Phase 0.
- [x] 3.2 Exposes `step(config)` (one fixed 1/120 tick) and `transforms()` (per-group world pos/quat, MuJoCo w,x,y,z → three x,y,z,w). Verified in-browser: driver stepped 240× on a walk config, 12 bodies, stayed upright (seg0 y≈0.16). Wiring to the studio's fixed accumulator lands in Task 4.

## 4. Render mapping

- [x] 4.1 `useMujocoLocomotion` hook (`app/game/locomotion/useMujocoLocomotion.ts`), called in `AnimatedModel` alongside `useLocomotion`: when `simEngine==='mujoco'` it builds the driver, steps it from the shared fixed-1/120 accumulator (freeze/step/slow-mo honoured), and writes each `bodyRefs` group's matrix via the identical `Translate(t)·Rotate(q)·Translate(−restCenter)` mapping (restCenter exposed per body in `MjcfMeta.segmentBodies`). `useLocomotion`'s Rapier block is gated off when MuJoCo is active so the two never fight over `bodyRefs`.
- [x] 4.2 Confirmed against MuJoCo state via the observe screenshot capture — the rig renders coherently and the body translates (see 6.1).

## 5. Engine switch + config link

- [x] 5.1 Added `simEngine: SimEngine` (`'rapier' | 'mujoco'`) to `SimConfig`/`DEFAULT_SIM_CONFIG` (default `'rapier'`)/`pickSimConfig` + a `setSimEngine` store action; the studio selects the driver from it.
- [x] 5.2 Rapier/MuJoCo segmented toggle in the Simulate sidebar header; `simEngine` flows through `pickSimConfig` → the config link, so a shared URL reproduces the MuJoCo walk (verified: applying the encoded config via `__studio.apply` switched the studio to MuJoCo).

## 6. Verify (visual gate)

- [x] 6.1 Loaded the `base walk` config with `simEngine: 'mujoco'` via the observe harness against a dev server — the studio lizard **renders from MuJoCo and walks**: the top-down capture shows the dragon translating across the plane over 12 s. (The Rapier-published diag/node-capture read 0 because that path is gated off under MuJoCo; the screenshots are the gate. Posture polish — a cleaner horizontal profile — is a follow-up tuning pass.)
- [x] 6.2 A/B is structurally safe: the Rapier path is unchanged except for one added `&& simEngine !== 'mujoco'` gate on `coupledRunning`, so `'rapier'` restores prior behaviour exactly; `tsc`/eslint clean (only a pre-existing `_segments` warning in `useLocomotion.ts`).
- [ ] 6.3 Run `openspec-verify-change`; archive.
