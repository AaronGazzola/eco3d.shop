## 0. Stage 0 — Clean slate, authoring intact

- [x] 0.1 Abandon the superseded `replace-locomotion-with-cpg` change (folder removed in the cleanup commit)
- [x] 0.2 Strip the broken CPG/foot logic: empty `cpg.ts` and `foot.ts` to minimal stubs and reduce the live branch of `useLocomotion.ts` to hold every pivot at its rest pose
- [x] 0.3 Keep the calibration code path and the playback branch in `useLocomotion.ts` working unchanged
- [x] 0.4 Confirm type check passes (`npx tsc --noEmit`) and no references to removed symbols remain
- [ ] 0.5 VERIFY (gate): studio loads; creature stands in rest pose; calibrate tab still rotates a group and authors caps; recording/playback still function

## 1. Stage 1 — One oscillator pair on one joint

- [x] 1.1 Implement the pure CPG core in `cpg.ts` from the reference: phase eq, first-order amplitude `ṙ = a(R−r)`, output `x = r(1+cos θ)`, `ν = d·e`, `R = d·P(d, d_th)`
- [x] 1.2 Add a left/right oscillator pair on a single chosen spine joint, antiphase (`φ = π`), with a fixed test `drive`
- [x] 1.3 Apply that joint's bend as a LOCAL rotation `k·(x_left − x_right)` clamped to `effectiveAngleCaps(group).yaw`
- [ ] 1.4 VERIFY (gate): that one joint sways smoothly to both sides within its cap; no other group moves; use the time-scale slider to inspect

## 2. Stage 2 — Coupled axial chain (body wave) through the tail

- [x] 2.1 Extend `chain.ts` so the body chain spans head → spines → tail (remove the stop-at-last-hip behaviour)
- [x] 2.2 Implement `buildCpgNetwork(groups)`: a left/right axial pair per chain group; rostrocaudal, caudorostral, and intrasegmental couplings using the reference Table 2 weights/biases
- [x] 2.3 Tick all axial oscillators each frame; apply each group's local bend clamped to its cap
- [ ] 2.4 VERIFY (gate): a travelling S-wave runs head→tail; every joint stays within its cap; no cumulative explosion; the tail participates

## 3. Stage 3 — Drive via saturation + manual control

- [x] 3.1 Wire the saturation drive mapping (`ν = d·e`, `R = d·P(d, d_th)`) so amplitude/frequency follow `drive`
- [x] 3.2 Add a manual `drive` slider to `animateStore.ts` + `AnimateSidebar.tsx` for verification without an attractor
- [ ] 3.3 VERIFY (gate): drive 0 = rest pose; raising drive makes the wave faster and larger; behaviour driven entirely by the slider

## 4. Stage 4 — Limbs and gait

- [x] 4.1 Add limb oscillators (one per hip socket with a leg) and limb-to-girdle couplings in `buildCpgNetwork`
- [x] 4.2 Bake diagonal-trot initial phases (front-left/rear-right vs front-right/rear-left offset by π)
- [x] 4.3 Rebuild `foot.ts`: stance/swing from `sin(θ)`, swing-arc with lift; reuse the existing easing
- [x] 4.4 Render legs via the unchanged `applyLegBone` pointing at the phase-driven foot world position
- [ ] 4.5 VERIFY (gate): diagonal footfalls synced to the body wave; feet plant and lift; no foot teleports (rule 6)

## 5. Stage 5 — Forward translation

- [x] 5.1 Derive a stable body-forward from the root/tail segment's world frame (never the head)
- [x] 5.2 Latch the next planted foot position along that stable body-forward on stance→swing; `stride` scales with drive
- [ ] 5.3 VERIFY (gate): the creature walks straight forward at `drive > 0`; no drift or spasm; head not used for any bearing

## 6. Stage 6 — Attractor drive and turning

- [ ] 6.1 Compute `drive` from attractor distance using the stable body frame; `drive = 0` when null/within close radius
- [ ] 6.2 Implement turning via differential drive (left/right drive asymmetry) toward the attractor bearing; tune the mapping
- [ ] 6.3 VERIFY (gate): the creature walks toward and turns to face a moving attractor; `steer`/turning signal is smooth (no per-frame flip); no feedback spasm

## 7. Stage 7 — Diagnostics, polish, optional head gaze

- [ ] 7.1 Reshape `FrameSnapshot` in `diagnostics.ts` to the rebuilt state (axial L/R oscillators + applied bend; limb phase/amplitude/stance-swing + foot position; `drive`, turning signal)
- [ ] 7.2 Update `AnimateSidebar.tsx` readouts to the new state; confirm recording/playback/copy still work
- [ ] 7.3 Optionally re-enable a decoupled decorative head-gaze overlay (or drop `headGaze.ts`)
- [ ] 7.4 Re-tune parameters (coupling, drive falloff, stride, lift) on a real lizard rig
- [ ] 7.5 VERIFY (gate): full walk + turn behaviour; recording reproduces it on playback

## 8. Finalize

- [ ] 8.1 `npx tsc --noEmit` clean; lint clean
- [ ] 8.2 `openspec validate rebuild-cpg-locomotion --strict` passes
- [ ] 8.3 Update `documentation/locomotion.md` open-decisions section to record the choices made (stable root frame, `k` mapping, turning curve)
- [ ] 8.4 Do NOT archive until all stage gates have passed user verification in the studio
