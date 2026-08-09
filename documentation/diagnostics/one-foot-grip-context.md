# One-foot-grip observation — context handoff (no hypothesis)

Context collected for a follow-up analysis. Facts and measurements only; no interpretation or
hypothesis is formed here.

## Setup

Isolated single-leg gait: **FL** is the only leg that grips and steps (sweeps + lifts). FR/BL/BR
are rigid (held at rest, `legStiffness` 50000), not gripping, not stepping.

Config (`documentation/diagnostics/one-foot-grip.json`):
- `gripEnabled: true`, `gripFeet: { FL:true, FR:false, BL:false, BR:false }`
- `stepEnabled: true`, `stepFeet: { FL:true, FR:false, BL:false, BR:false }`
- `sweepAmount: 1`, `sweepSpeed: 3000`, `liftAmount: 0.3`, `legStiffness: 50000`
- clock: `gripShift 0.05`, `gripDuration 0.5` (stepDuty clamps to 0.5, so grip == stance window)

Per-leg step control was added in code this session:
- `app/admin/animate/animateStore.ts` — `stepFeet` in `SimConfig` (+ `setStepFoot`, pick/apply/reset).
- `app/game/locomotion/useLocomotion.ts:549` — sweep/lift loop gated on `stepEnabled && stepFeet[foot]`;
  off-feet fall to the rigid-hold `else` branch.
- `app/admin/animate/AnimateSidebar.tsx` — "Step feet" toggle grid.

Demo link (localhost:3005, the rebuilt server carrying `stepFeet`): see chat message.

## Artifacts (run 2026-07-04T15-15-28, 12s @ 10 samples/s, `--event-shots`)

- `documentation/diagnostics/observe/nodes-2026-07-04T15-15-28-topdown.png` — overhead node skeleton:
  overlay of all 116 frames + COM path, plus 12 time-spaced snapshots. X = forward (head = -X, red
  node), Z = lateral.
- `documentation/diagnostics/observe/nodes-2026-07-04T15-15-28-events.png` — overhead skeleton at every
  grip/sweep/lift window boundary, colour-coded (grip=blue, sweep=green, lift=orange).
- `documentation/diagnostics/observe/nodes-2026-07-04T15-15-28-events.md` — per-leg ON-intervals + edges.
- `documentation/diagnostics/observe/nodes-2026-07-04T15-15-28-reach.md` — measured-phase alignment.
- `documentation/diagnostics/observe/nodes-2026-07-04T15-15-28.json` — raw samples (node xyz + CPG).

## FL window timing (from events.md)

- grip == sweep (stance, `rel<0.5`): [1.87→3.10] [4.01→5.12] [5.91→7.35] [8.08→9.15] [10.32→11.18]
- lift (swing, `rel>=0.5`): [0.51→1.87] [3.10→4.01] [5.12→5.91] [7.35→8.08] [9.15→10.32] [11.18→11.92]
- Cycle period ≈ 1.9–2.0 s.

## Measured displacement per window (COM = mean of all 15 nodes; FL foot = node 11)

Forward progress = travel in -X (head direction). Horizontal = |Δx,Δz|. Units = world units.

| phase (summed over run) | COM forward | COM horizontal | FL-foot horizontal |
|-------------------------|-------------|----------------|--------------------|
| GRIP windows (planted)  | 1.158       | 1.586          | 0.677              |
| SWING windows (released)| 0.443       | 1.265          | 2.689              |

Per-window detail is in the analysis printout (grip windows show small FL-foot travel 0.03–0.23;
swing windows show large FL-foot travel 0.31–0.62). Net COM over the 12.08 s run: forward 1.611,
lateral 0.954, horizontal 1.872.

## Reach / phase alignment (reach.md)

- FL measured max-forward phase φ_fwd = 0.165 (amp 0.209); amplitude-weighted mean across legs 0.176.
- `gripShift` 0.05 vs mean φ_fwd 0.176 → grip opens **-0.126 cycles** off max-forward (start and end).

## What the human asked to look at (verbatim, not evaluated here)

- "the way that the leg is held still during the grip then sweeps when it releases"
- "it's not really moving the body at all while it's gripping"

No hypothesis or conclusion is drawn. The above numbers and images are the observed context for a
follow-up owner to reason over.
