## Context

Phase A is complete: a trusted renderer (A2), a momentum-conserving integrator (A3), and a stable passive force law (A4). Phase B adds the controller. The reference (`docs/reference/locomotion-reference.md` §2–§3, §7) fully specifies the CPG: five equations, Table 2 couplings, Table 3 constants. B1 builds the **axial double chain** in isolation — the signal, no body, no muscles — so the wave can be verified before anything consumes it.

The CPG is the single most novel piece of math in the whole project and the one most likely to be subtly wrong (coupling signs, phase-bias direction, drive→amplitude saturation). Verifying it against a space-time plot — where a head→tail traveling wave is unmistakable as diagonal stripes — is the cheapest way to de-risk Phase B before B2/B3.

## Goals / Non-Goals

**Goals.**
- The axial double chain (N×{left,right}) with the exact equations and constants from the reference, feedback term dropped (`s=0`).
- Length-weighted intersegmental phase bias (Decision 6) so the wave shape is invariant to segment count/spacing; equal segments reduce to the paper's uniform `±0.415`.
- Drive + global excitability as the only control knobs (Decision 5).
- A space-time capture that makes "is this a head→tail traveling wave?" a yes/no read, plus a numeric phase-lag and frequency summary.
- The CPG runs on its own clock and does **not** move the body in B1.

**Non-Goals.**
- No limb oscillators, no limb↔axial coupling (Phase D).
- No muscles, no torque, no body actuation (B2/B3).
- No proprioceptive feedback `s` (v1 omits it; the term is dropped, not stubbed).
- No differential / left-right drive (Phase E turning); B1 applies one global drive to every axial oscillator.
- No drive random-walk noise (in-vivo runs zero it).

## Approach

**Oscillator indexing.** Mirror the paper: segment `k ∈ [0,N)` has a left oscillator at index `k` and a right oscillator at index `k+N`. The lateral (intrasegmental) coupling pairs `k ↔ k+N` with `φ=π`. The intersegmental couplings act within each chain between adjacent segments `k ↔ k+1` (and `k+N ↔ k+1+N`).

**Length-weighted phase bias.** For the head→tail coupling from segment `k` to `k+1`, `φ = (len_k / Σlen) · Φ_total` where `Φ_total = 2π·BODY_WAVES`, `BODY_WAVES=1.58`. The tail→head coupling uses `−φ` with strength `w=1` (vs `w=5` head→tail) — the paper's 1:5 asymmetry preserved. With equal segments, `len_k/Σlen = 1/(N-1)` per interval and the total lag is `Φ_total`, matching the paper's 24×0.415≈9.96 rad at N=25.

**Integration.** Phase + amplitude are a first-order ODE system. Step with the same fixed 2 ms sub-step pattern as the solver (frame `dt` clamped to 50 ms, integer sub-steps). Phases wrap mod 2π for numerical hygiene. Amplitude `r` is initialized at 0 (or a small seed) and converges to `R` at gain `a=5` (≈0.2 s time constant) — so the wave fades in smoothly when drive is applied, which is itself a verification signal.

**Why it doesn't touch the body.** With `s=0` the CPG equations have no body-state input, so `stepCpg` is a pure function of `(state, drive, excitability, dt)`. It runs in the same `useFrame` callback as the solver for convenience (one clock), but writes nothing to the pivots. The rig renders its manual/rest pose throughout B1.

**Space-time capture.** The gate needs to show a wave in space (segment index) and time. The capture records, per sample (~50 ms), the signed activation `x_left − x_right` for every segment. The serializer renders an ASCII grid: one row per segment (head at top), columns marching in time, glyph chosen by sign and magnitude bucket (e.g. `+`/`-`/space, or a small ramp). A head→tail traveling wave appears as stripes sloping down-and-right. Alongside it: a numeric table of each segment's phase at a snapshot (showing monotonic head→tail lag) and the measured fundamental frequency (zero-crossing interval of segment 0's signed activation) checked against `ν = drive·excitability·e`.

## Trade-offs

- **Run the CPG inside the solver's `useFrame` vs a separate hook.** Reusing the existing `useFrame` avoids a second RAF loop and keeps one time source; the cost is `useLocomotion` grows a CPG branch. Acceptable — it already branches on tab/run state. A separate hook would duplicate the clock plumbing.
- **Space-time ASCII vs a live on-screen strip.** ASCII-in-capture reuses the whole diagnostics pipeline (write file → I read it) with zero new render code, and gives a durable artifact to compare across tuning runs. A live WebGL strip would be prettier but is render work irrelevant to the math. Choose ASCII for B1; a live view can come with the UI phase (H) if wanted.
- **Amplitude seed 0 vs small ε.** Seeding `r=0` means the very first steps have zero coupling influence (coupling scales by `rⱼ`), so the wave organizes as amplitude grows. That's faithful and a nice fade-in. If convergence to the correct phase lag is too slow to see, seed a small `r` — noted as a tuning lever.

## Open Questions

- `BODY_WAVES = 1.58` (paper-matched) is the default; B3 may retune it once we see the body undulate. B1 just needs the wave to *travel* with monotonic lag — the exact wave count is a B3 aesthetic call.
- Phase initialization: all phases at 0, or a small head→tail ramp to bias the wave direction from frame 1? *Lean: all 0; the asymmetric coupling should establish head→tail on its own — and whether it does is part of what B1 verifies.*
- Glyph scheme for the space-time plot (binary sign vs magnitude ramp). *Lean: a short magnitude ramp (e.g. ` .:-=+*#`) so amplitude growth is visible too.*
