# Add the limb CPG (Phase D1 — signal)

## Why

Phase D (walking) is split, mirroring Phase B's **signal → actuation → coupling** three-beat:

- **D1 (this change) — limb CPG signal:** the four limb oscillators + their couplings, in the CPG
  signal only (no legs, no body). Gate: the diagonal-trot phase pattern emerges.
- **D2 — limb actuation:** the piece-wise-linear 77%-duty transfer function → one physical 1-DOF
  rotational hip, isolated. *(Future change.)*
- **D3 — terrestrial coupled walking:** couple D1 → D2 across four legs + the axial wave, gravity +
  ground. *(Future change.)*

D1 isolates the **limb central pattern generator** exactly as B1 isolated the axial CPG: prove the
network produces the correct rhythm before any actuation or body is attached. Faithful to Knüsel 2020
(reference §3 Table 2, §7 Table 3): four limb oscillators, the interlimb and limb↔axial couplings,
and the limb-specific excitability/saturation parameters.

## What Changes

- **Four limb oscillators.** Extend `cpg.ts` `buildCpgSpec` with four single limb oscillators
  (left-fore, right-fore, left-hind, right-hind) — one each, unlike the axial left/right segment
  pairs (the limb is position-driven by one phase, per the paper).
- **Interlimb couplings (Table 2, all `φ=π`).** Lateral (left↔right of a girdle) `w=10`; rostrocaudal
  (fore→hind) `w=3`; caudorostral (hind→fore) `w=30`. The caudorostral being 10× stronger makes the
  hind legs lead → the diagonal trot.
- **Limb↔axial couplings.** Each limb couples to its girdle axial segment (from the leg group's
  `attachedToSpineId`): limb→axial `w=30, φ=4` (strong), axial→limb `w=2.5, φ=−4` (weak), `−φ`/`5.5`
  variants reserved for backward stepping.
- **Faithful limb parameters.** Excitability fore `e=0.8`, hind `e=0.5` (vs axial `1.1`); limb
  saturation threshold `d_th≈1.27` (vs axial `3`) — so limbs run slower and saturate first.
- **CPG capture extended** to show the limb oscillator phases/activations alongside the axial wave.

Out of scope (→ D2/D3): the transfer function, physical legs, hip joints, ground, gravity, contact.

## Impact

- **Specs:** `locomotion` — add limb-CPG-network requirements.
- **Code:** `cpg.ts` (limb oscillators + couplings + limb params), `diagnostics.ts` / CPG capture
  (surface limb phases), CPG-preview UI.
- **Reuses unchanged:** the axial CPG equations, the coupling/phase machinery (limbs are more
  oscillators in the same network).
