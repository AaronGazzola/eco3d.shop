# Locomotion Reference — Knüsel et al. 2020 (verified extraction)

This is a faithful extraction of the CPG model from the source paper. It exists so we
build from the paper, not from memory. Every equation and number here is transcribed
from the PDF in this folder. Cells I could not read unambiguously from the text layer
are flagged **⚠ verify against PDF** with the page to check.

## Source

- **Knüsel, J., Crespi, A., Cabelguen, J-M., Ijspeert, A. J., Ryczko, D. (2020).**
  *Reproducing Five Motor Behaviors in a Salamander Robot With Virtual Muscles and a
  Distributed CPG Controller Regulated by Drive Signals and Proprioceptive Feedback.*
  Frontiers in Neurorobotics, 14:604426.
- DOI: 10.3389/fnbot.2020.604426
- Local copy: `knusel-2020-salamander-cpg.pdf` (open access), text layer in
  `knusel-2020-salamander-cpg.txt`.
- Equations and parameters are in **Materials and Methods → CPG Model** (PDF p.5–7).

> Note: the previous `documentation/locomotion.md` cited this as "Thandiackal et al."
> That attribution is wrong; the first author is Knüsel.

---

## 1. Network structure

- A **double chain**: 25 axial segments, each with a **left** and a **right**
  hemisegmental oscillator → 50 axial oscillators.
- **4 limb oscillators** (left-fore, right-fore, left-hind, right-hind).
- Each oscillator has two state variables: phase `θᵢ` and amplitude `rᵢ`.
- Couplings act on the **phase difference** between connected oscillators.

The body bend at a joint comes from the **antagonist pair** (left vs right) of that
segment — see §4.

---

## 2. Core equations (verbatim, PDF p.5)

Phase:
```
θ̇ᵢ = 2π·νᵢ  +  Σⱼ rⱼ·wᵢⱼ·sin(θⱼ − θᵢ − φᵢⱼ)  −  (sᵢ / rᵢ)·sin θᵢ
```

Amplitude (first-order):
```
ṙᵢ = a·(Rᵢ − rᵢ)  +  sᵢ·cos θᵢ
```

Output (one-sided muscle activation, always ≥ 0):
```
xᵢ = rᵢ·(1 + cos θᵢ)
```

Intrinsic frequency from drive:
```
νᵢ = dᵢ·eᵢ
```

Target amplitude from drive, with saturation:
```
Rᵢ = dᵢ·P(dᵢ, d_th)
P(d, d_th) = 1 / (1 + e^( b·(d − d_th) ))
```
`P` is a decreasing sigmoid: `Rᵢ` rises with drive `dᵢ`, then collapses toward 0 once
`dᵢ` passes the saturation threshold `d_th`. `b` is the saturation rate.

> ✅ The five equations above (phase, amplitude, output, νᵢ, Rᵢ) are confirmed
> letter-for-letter against the PDF equation-block screenshot. `P(d, d_th)` comes from
> the running text on the same page (not the equation stack) but is unambiguous.

**Notation warning:** the paper reuses the symbol φ for two different things —
`φᵢⱼ` (two subscripts) is the *coupling phase bias* in the phase equation above;
`φᵢ` (one subscript) is the *physical joint angle* used in the muscle and feedback
equations (§4, §9). They are unrelated. Oscillator *phase* is always `θ`.

Symbols:
- `dᵢ` — descending drive to oscillator i (the scalar control input).
- `eᵢ` — oscillator excitability (sets how fast it runs for a given drive).
- `wᵢⱼ`, `φᵢⱼ` — coupling strength and phase bias from oscillator j to i.
- `a` — amplitude convergence gain.
- `sᵢ` — proprioceptive feedback (see §5). With no feedback, `sᵢ = 0` and the last
  term in each equation drops out.

The `(sᵢ/rᵢ)·sin θᵢ` and `sᵢ·cos θᵢ` terms are the polar-coordinate form of adding the
feedback to the oscillator's Cartesian derivative (derivation in the paper's
Supplementary Materials).

---

## 3. Couplings (Table 2, PDF p.6)

| Coupling | Strength `w` | Phase bias `φ` (rad) |
|---|---|---|
| Intersegmental, rostrocaudal (head→tail) | 5 | +0.066·2π ≈ +0.415 |
| Intersegmental, caudorostral (tail→head) | 1 | −0.066·2π ≈ −0.415 |
| Intrasegmental, lateral (left↔right of same segment) | 10 | π (antiphase) |
| Interlimb, rostrocaudal | 3 | π |
| Interlimb, caudorostral | 30 | π |
| Interlimb, lateral | 10 | π |
| Limb → axial | 30 | 4 (backward stepping: 5.5) |
| Axial → limb | 2.5 | −4 (backward stepping: −5.5) |

Head-to-tail coupling (5) is stronger than tail-to-head (1) — this asymmetry is one of
the paper's main hypotheses (it makes the body wave travel head→tail).

> ✅ Confirmed against the PDF Table 2 screenshot. All cells above are exact.

---

## 4. From oscillator output to a joint (PDF p.6)

This is the **physics block** in the paper — and the one part we will replace, because
our rig is kinematic.

The paper feeds the two outputs of a segment, `xᵢ` (left, = `Mᵢˡ`) and `xᵢ₊₂₅` (right,
= `Mᵢʳ`), into an Ekeberg spring-damper muscle pair to get a joint torque (✅ confirmed
against PDF screenshot):

```
Tᵢ = α·(Mᵢˡ − Mᵢʳ)  −  β·(Mᵢˡ + Mᵢʳ + γ)·φᵢ  −  δ·φ̇ᵢ
```
- `α` active gain, `β` stiffness gain, `γ` tonic stiffness, `δ` damping (Table 5, below).
- `φᵢ` is the **physical joint angle**, `φ̇ᵢ` its velocity (not the oscillator phase θ).
- The active term is the left−right activation difference; the stiffness term pulls the
  joint toward 0 with a stiffness that grows with total activation; the last term damps.
- A 10 ms delay sits between output `xᵢ` and activation `Mᵢ`.
- That torque then drives a physics simulation (ODE / Webots) to produce the joint angle.

**Muscle constants (Table 5, PDF p.8).** The paper reports both a robot column and a
simulation column. We recreate the **simulation**, so the simulation values are ours:

| Name | Symbol | Value (simulation) | Notes |
|---|---|---|---|
| Muscle active gain | `α` | **0.4** N·m | Robot/sim base. "A value of 0.4 proved optimal" (Results). |
| Muscle stiffness gain | `β` | **1.2** N·m/rad | Robot used 0.5; sim settled 1.2. |
| Muscle tonic stiffness | `γ` | **0.2** (dimensionless) | "We settled on β = 1.2, γ = 0.2." |
| Muscle damping | `δ` | **0.1** N·m·s/rad | ✅ confirmed: the PDF text layer (Table 5) lists `0.1` on the Muscle-damping row, directly below tonic stiffness `0.2`; consistent with the stated stable region δ ∈ [0.05, 0.15]. |

> ✅ `α`, `β`, `γ` are confirmed from the Results prose ("For the active gain, a value of
> 0.4 proved optimal"; "We settled on β = 1.2, γ = 0.2"). ✅ `δ = 0.1` confirmed against the
> PDF Table 5 text layer (verified 2026-05-29 while scoping Phase B).

**Two behaviour-dependent overrides** (not our target regime, recorded so we don't trip on
them): backward terrestrial stepping and struggling multiply `α` and `β` **×10** (→ 4 and
12) for stronger torques; and the **tail taper** multiplies `α`,`β` in the last three
modules (6,7,8) by **0.7, 0.5, 0.2** to emulate the body thinning toward the tail. Forward
stepping and swimming — what we build — use the base values above.

**How we recreate this (faithful, not substituted).** We implement this block as written:
the two segment outputs (`Mᵢˡ`, `Mᵢʳ`) drive an Ekeberg virtual-muscle pair producing the
joint **torque** above, and that torque actuates a **simulated** rigid joint inside our own
multibody dynamics (build layers L3–L4 in `documentation/locomotion.md`). The joint angle
written to the node-skeleton pivot is therefore the **physics-integrated** angle `φᵢ`,
clamped to the studio `angleCap` (the cap acts as the joint's range limit). We do **not**
short-circuit this to a direct kinematic bend — movement must emerge from the integrated
dynamics, as it does in the paper.

---

## 5. Limbs (PDF p.7)

- The limb oscillator's **phase `θᵢ` is used directly** as the desired leg position,
  through a piecewise-linear transfer function tuned to a **77% stance / 23% swing**
  duty factor (duty factor = fraction of the cycle the foot is on the ground).
- ✅ The paper **does** describe the transfer function (§"Limb Joints", PDF p.7): *"the
  oscillator phase θᵢ is used directly as a representation of the desired position, with a
  piece-wise linear transfer function that **modulates the swing and stance rotation speeds**
  such as to obtain a duty factor of 77%."* So the **construction is the paper's** — a
  piece-wise-linear, asymmetric (slow-stance / fast-swing) phase→angle map. The exact slopes are
  then determined by the 77/23 split + the leg's rotation **amplitude**; only the amplitude is a
  free tuning choice. (Earlier note "the formula is ours" was an overstatement — corrected.)
- **Backward stepping**: use `−θᵢ` instead of `θᵢ` (flips rotation direction).
- Foot-ground contact in the paper emerges from physics. We recreate that: the limb is a
  **simulated 1-DOF joint** driven toward the transfer-function position, and the foot's
  contact/slip/lift **emerges from our contact model** — not a scripted plant/lift arc.

---

## 6. Turning (PDF p.7, Table 4)

Turning is produced by **differential drive** — giving different `dᵢ` to different
oscillators. The paper has explicit "differential drive" runs (e.g. swimming and
forward stepping with differential drive in Table 4), where rostral segments (Seg 1–3)
get a different drive than the rest (Seg 4–25). Applying asymmetric drive left vs right
likewise curves the body. So steering is in-scope and source-backed; the exact mapping
from our attractor to a left/right drive split is ours to choose.

---

## 7. Parameters (Tables 3 & 4, PDF p.6–7)

Constants (Table 3):

| Name | Symbol | Value |
|---|---|---|
| Amplitude convergence gain | `a` | 5 |
| Saturation rate | `b` | 500 |
| Excitability, axial | `eᵢ` | 1.1 ± 0.07 |
| Excitability, forelimbs | `eᵢ` | 0.8 ± 0.05 |
| Excitability, hindlimbs | `eᵢ` | 0.5 ± 0.03 |
| Saturation threshold, axial (in vivo) | `d_th` | 3 |
| Saturation threshold, axial (in vitro) | `d_th` | 0.3 |
| Saturation threshold, limbs (in vivo) | `d_th` | 1.27 ± 0.02 |
| Saturation threshold, limbs (in vitro) | `d_th` | 0.09 ± 0.02 |
| Drive random-walk convergence | `c` | 0.001 (in vitro), 0 (in vivo) |
| Drive random-walk step | `σ` | 0.03 (in vitro), 0 (in vivo) |
| Contralateral feedback weight | `w_contra` | = −`w_ipsi` |

Drives per behaviour (Table 4) — ✅ confirmed against PDF screenshot. The rows that
matter for us:

| Behaviour | Seg 1–3 | Seg 4–25 | Limbs | feedback |
|---|---|---|---|---|
| **Forward terrestrial stepping** (robot, 5 individuals) | 0.60 ± 0.02 | 1.00 ± 0.04 | 1.00 ± 0.04 | 0 |
| Forward stepping, single drive (sim, Fig 6A) | 0.98 | 0.98 | 0.98 | 0 |
| Forward stepping, differential drive (sim, Fig 6B) | 0.63 | 0.98 | 0.98 | 0 |

The headline gait is **differential**: the 3 rostral (head-end) segments get a *lower*
drive (≈0.60) than the rest of the body and limbs (≈1.00). This is the same lever we'd
use for **turning** — biasing drive across the body (or left vs right) bends it.

In vivo runs (the salamander/robot, not the isolated spinal cord) set the random-walk
terms to zero — i.e. **a fixed tonic drive**, no noise. That's the regime we want.

---

## 8. What is fully specified vs what we adapt

**Fully specified by the paper (build 1:1):**
- The oscillator network (double chain + 4 limbs).
- All five state/output equations (§2).
- Drive → frequency and drive → amplitude (with saturation).
- Coupling topology and weights (§3, modulo the flagged phase-bias cells).
- The constants in §7.

We recreate the full pipeline — CPG → Ekeberg muscles → multibody dynamics → environment
forces — faithfully (§4, §5, and `documentation/locomotion.md §2–§3`).

**Where we necessarily differ (bounded, and not in the controller):**
- **Body parameters come from our rig**, not the salamander robot: segment length from
  node spacing, **mass from an authored per-node weight (default uniform, mesh-decoupled)
  with inertia derived from weight + length** (roadmap Decision 7 — the paper likewise used
  uniform segments; mesh-derived mass was replaced after its ≈10:1 head:tail ratio broke the
  Phase C swimming gate), joint axes at the nodes, joint limits = the studio `angleCaps`.
  (How we adapt to any model.)
- **Output is the node skeleton**, not motors/Webots: the integrated joint angles drive
  the pivots (clamped to caps); the body's world pose drives the root frame.
- **Reduced dimensionality / custom solver** is a likely engineering choice (planar,
  custom integrator) to make the paper's force laws tractable in-browser — to be
  finalized in the plan, not a change to the model itself.

**We omit for v1 (optional in the paper):**
- Proprioceptive feedback `sᵢ` (set to 0). It adapts gait to terrain; not needed first.
- The random-walk drive noise (in-vivo runs already zero it).

---

## 9. Sensory feedback (omitted for v1 — recorded for completeness, PDF p.6)

Set `sᵢ = 0` and `w_limb = 0` and none of this runs. Captured so we never re-derive it.

**Axial proprioceptive feedback** — `sᵢ` is built from the joint angle `φᵢ` via
simulated stretch receptors:
```
sᵢ = w_ipsi·[φᵢ]₊ + w_contra·[−φᵢ]₊          (left side; signs swap for the right side)
```
where `[·]₊` is the positive part (`max(0, ·)`), and `w_contra = −w_ipsi` (Table 3).
This `sᵢ` is what feeds the last term of the phase and amplitude equations in §2.

**Limb excitatory feedback** — in some runs an extra term is added to the *limb*
oscillators' phase equation:
```
θ̇ᵢ (limb) = 2π νᵢ + Σⱼ rⱼ wᵢⱼ sin(θⱼ − θᵢ − φᵢⱼ)  +  w_limb·max(0, 1 − |φᵢ − φᵢ⁰| / (π/2))
```
`φᵢ⁰` is the joint angle at the stance→swing transition. The term is maximal at end of
stance and ramps linearly to zero over half the leg rotation; it is always ≥ 0, so it
can only *accelerate* the cycle.
</content>
</invoke>
