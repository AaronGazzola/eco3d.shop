## 1. Oscillator network

- [x] 1.1 Create `app/game/locomotion/oscillator.types.ts`: `Oscillator { phase, amplitude, drive, excitability, saturationThreshold }`, `Coupling { from, to, weight, phaseBias }`, `OscillatorNetwork { oscillators: Oscillator[], couplings: Coupling[], jointCount }`, `NetworkOutput { bends: number[] }`
- [x] 1.2 Create `app/game/locomotion/oscillator.ts` with the paper's constants transcribed from `documentation/reference/locomotion-reference.md` §7 (`a = 5`, `b = 500`, axial excitability `1.1`, forelimb `0.8`, hindlimb `0.5`, axial in-vivo `d_th = 3`, limb in-vivo `d_th = 1.27`), a `stepNetwork(network, dt)` that integrates phase `θ̇ᵢ = 2πνᵢ + Σⱼ rⱼwᵢⱼsin(θⱼ − θᵢ − φᵢⱼ)` and amplitude `ṙᵢ = a(Rᵢ − rᵢ)` with feedback `sᵢ = 0`, plus `νᵢ = dᵢeᵢ` and `Rᵢ = dᵢ·P(dᵢ, d_th)` where `P(d, d_th) = 1/(1 + e^(b(d − d_th)))`; fixed-step integration at 1 ms substeps, no `Math.random`, no `Date.now`
- [x] 1.3 In `app/game/locomotion/oscillator.ts`: `oscillatorOutput(o) = o.amplitude * (1 + Math.cos(o.phase))` and `jointBends(network, gain)` returning one signed bend per joint as `gain * (leftOutput − rightOutput)`

## 2. Rig mapping

- [x] 2.1 Create `app/game/locomotion/network.ts`: `buildNetwork(groups, drive)` walks `flattenSkeleton(buildSkeletonTree(groups))`, creates one left/right oscillator pair per axial joint (head→spine→tail order) and four silent limb oscillators, and returns an `OscillatorNetwork`
- [x] 2.2 In `app/game/locomotion/network.ts`: build couplings from `documentation/reference/locomotion-reference.md` §3 — intrasegmental left↔right (`w = 10`, `φ = π`), intersegmental rostrocaudal (`w = 5`) and caudorostral (`w = 1`) — with the rostrocaudal bias scaled as `0.066·2π·(25 − 1)/(jointCount − 1)` and the caudorostral bias its negation, so total head-to-tail lag is constant across rigs
- [x] 2.3 In `app/game/locomotion/network.ts`: `networkToPose(groups, bends)` writes each joint's bend to that group's `yawRad` in a `Pose`, leaves `pitchRad` at zero, and leaves leg joints at zero

## 3. Swim thrust

- [x] 3.1 Create `app/game/locomotion/swim.ts`: `segmentVelocities(previousPose, currentPose, groups, dt)` returning each axial segment's midpoint velocity in body space
- [x] 3.2 In `app/game/locomotion/swim.ts`: `swimSpeed(velocities, groups, { thrustGain, drag })` summing `thrustGain * lateralComponent * segmentLength` over segments and dividing by `drag`; pure, no state, no integration of forces
- [x] 3.3 In `app/game/locomotion/swim.ts`: advance the pose root by `speed * dt` along a fixed forward heading, writing to `pose.root.x`

## 4. Driver

- [x] 4.1 Create `app/game/locomotion/useLocomotion.ts`: a hook taking `{ groups, drive, bendGain, thrustGain, drag, running }`, holding the network in a ref, rebuilding it when the rig changes, stepping it by the frame delta, producing a `Pose` via `networkToPose` plus the swim advance, and exposing `{ poseSource, reset, getStats, getPose }`. Tuning lives in the studio store rather than being duplicated in the hook.
- [x] 4.2 In `app/game/AnimatedDragon.tsx`: add an optional `poseSource?: (dt: number) => Pose` prop; when present `useFrame` calls it instead of `evaluateCycle` and the `cycle` prop is ignored; when absent behaviour is unchanged, so the Animate studio is unaffected

## 5. Studio

- [x] 5.1 Create `app/admin/locomotion/locomotionStore.ts` (zustand): `drive`, `bendGain`, `thrustGain`, `drag`, `running`, `cameraPreset`, and their setters
- [x] 5.2 Create `app/admin/locomotion/LocomotionScene.tsx`: `StudioCanvas` + `AnimatedDragon` driven by `useLocomotion`'s `poseSource`, inside `<group rotation={modelRotation}>`, plus `CameraController`
- [x] 5.3 Create `app/admin/locomotion/LocomotionSidebar.tsx`: run/pause, a drive slider (0 to 2), a bend-gain slider, thrust-gain and drag sliders, and a readout of wave frequency, head-to-tail lag and current speed
- [x] 5.4 Create `app/admin/locomotion/page.tsx`: `AdminFrame({ scene: <LocomotionScene/>, sidebar: <LocomotionSidebar/> })`
- [x] 5.5 In `app/admin/_lib/SidebarShell.tsx`: add step 4 `{ n: 4, label: 'Locomotion', path: '/admin/locomotion' }`; `pathToStep` returns 4 for `/admin/locomotion`; `canEnterStep(4)` requires `groups.length > 0`; widen the `Step` type

## 6. Observation

- [x] 6.1 In `app/admin/locomotion/LocomotionScene.tsx`: publish `window.__loco` per frame with `{ t, drive, speed, joints: [{ id, bendRad }], nodes: [{ id, x, y, z }] }` for headless capture; guard on `typeof window !== 'undefined'`
- [x] 6.2 Rewrite `documentation/observation-loop.md` against `window.__loco`: how to drive the studio headlessly, what to capture, and how to render a top-down node skeleton from the capture; remove the superseded banner

## 7. Verify

- [x] 7.1 Create `scripts/check-oscillator.ts` asserting, with no browser: a settled network holds left and right of a joint in antiphase within 0.05 rad; phase lag increases monotonically head to tail; total head-to-tail lag stays within 0.02 of the paper's across joint counts of 6, 10 and 24; raising drive raises frequency; raising drive past `d_th` collapses amplitude toward zero; `swimSpeed` is zero for a straight body and rises with both wave amplitude and frequency
- [x] 7.2 `doppler run -- npm run build` passes; `npx tsc --noEmit` and `npx eslint app/game/locomotion app/admin/locomotion` are clean; `rg -i "rapier|mujoco|Math.random|Date.now" app/game/locomotion` returns no matches
- [ ] 7.3 Headless capture through `window.__loco` at a fixed drive, saved under `documentation/diagnostics/`, showing the travelling wave and a non-zero forward speed; the capture is the evidence for the Stage 1 success test
