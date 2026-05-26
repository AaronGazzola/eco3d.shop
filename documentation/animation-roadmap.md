# Animation Roadmap

The living plan for recreating the Knüsel et al. (2020) salamander locomotion on our
node-skeleton rig. We grow this document as we go: each time we work through a piece of
the paper or settle a decision, it gets written here so nothing is lost between sessions.

**End goal:** a realistic lizard that tracks an object with its head and uses its body and
feet to orient and move toward it — where the motion *emerges* from the paper's
controller + physics, not from hand-authored keyframes.

## Document map

Four documents, each with one job:

- **`reference/locomotion-reference.md`** — the source of truth. Verified, equation-by-
  equation extraction of the paper. Every number, coupling, and formula comes from here.
- **`reference/knusel-2020-salamander-cpg.pdf` / `.txt`** — the paper itself.
- **`locomotion.md`** — how the paper maps onto our rig: the invariants we keep, the
  pipeline, and the L0–L8 layer decomposition.
- **`animation-roadmap.md`** (this file) — the plan + our shared understanding + the
  decision log + progress. This is the entry point and the durable record.

When a formula or number is involved, the reference doc wins. When it's about how a piece
applies to *our* rig, `locomotion.md` wins. This file is where understanding and sequencing
live.

---

## 1. The model in plain language

Our own walkthrough of the paper, distilled as we go. Plain language, no shortcuts. Grows
one section at a time.

**Provenance tags:** **[paper]** = verified from the source (via `locomotion-reference.md`);
**[interp]** = our explanation or intuition — consistent with the paper but not stated in
it; **[ours]** = our design choice or addition, not in the paper. Metaphors and analogies
are **[interp]** by default unless tagged otherwise.

### Part 1 — The one big idea: movement is emergent, not commanded

The salamander both swims (whole-body undulation, like an eel) and walks on land (legs +
body) using **one** nervous system, switching behaviors by turning a single knob. **[paper]**

That knob is **drive** — a simple, steady scalar the brain sends down: *how much* effort
and *where* on the body. No rhythm, no timing — a throttle, not a drummer. **[paper]**

The spinal cord turns that steady throttle into rhythm. This is the **CPG (Central Pattern
Generator)**: a network of small *oscillators* in the spine. Each is a self-sustaining
rhythm generator. Given a constant drive, they produce coordinated, repeating, wave-like
muscle activation on their own. This mirrors real biology — rhythmic movement is generated
locally in the spinal cord, not micromanaged by the brain. **[paper]**

The control hierarchy:

```
Brain  →  simple "drive" signal (throttle + bias, no timing)
            │
Spinal CPG →  network of coupled oscillators
            │   turns steady drive into a TRAVELING WAVE of
            │   rhythmic left/right muscle commands
            ▼
Muscles    →  convert commands into joint torques (forces)
            │
Body + Environment →  those forces push against water / ground;
                      the environment pushes BACK; that reaction
                      is what actually translates the animal forward
```

**The crucial point:** the CPG only makes the body *bend* in a traveling wave. It never
says "move forward." Forward motion is produced entirely by the body pushing against the
environment and the environment pushing back. **No environment reaction → no locomotion,
just wiggling in place.** This is exactly why the earlier kinematic version felt wrong: it
computed no forces and no reaction, so the forward slide had to be faked — looking like a
swimming lizard pulled onto a slippery surface, anchored and dragging. There was nothing
for it to push against. **[paper/interp]** (the slippery-surface comparison is our own
project history — **[ours]**)

**How the wiggle becomes thrust** *(physical intuition — **[interp]**; the paper supplies
the underlying reactive + resistive hydrodynamics and ground-contact forces — **[paper]**)*:
- *In water:* as the bending wave travels head→tail, each segment pushes the water mostly
  sideways and backward. Water resists much harder *across* a slender segment than *along*
  it (anisotropic drag). Summed along the traveling wave, the net is forward thrust — eel/
  snake swimming.
- *On land:* legs plant during stance and push backward; ground friction resists, so the
  body goes forward. The body's side-to-side wave adds reach to each stride. Body wave and
  leg stepping are coordinated into a gait (diagonal trot).

**Why a traveling wave** (not everyone bending together): the oscillators are coupled, and
the coupling is *asymmetric* — head→tail influence is stronger than tail→head. A phase lag
accumulates down the body, so the bend travels head→tail like a wave down a rope **[paper]**.

**Important nuance** (corrects the emphasis above): that head→tail *traveling* wave is the
**swimming** pattern. During **terrestrial stepping** the paper finds the axial pattern is
closer to a **standing wave** (or a tail→head caudorostral wave) — there the **limbs** do
the propelling and the body mostly adds reach. So "propulsive traveling wave" is the
swimming picture specifically; on land the body does something different **[paper]**.

**Turning has no separate system:** feed *different drive* to different parts (less to the
front segments, or more to one side) and the body curves. Differential drive = steering. **[paper]**

**Head-tracking** sits on top as a thin layer: a tiny "brain" that reads where the
attractor is relative to the lizard's heading and outputs (a) more drive when the target is
far, and (b) a left/right drive bias to turn toward it. The paper *assumes* drive is given;
we add the piece that *computes* drive from the attractor. **[ours]**

### Part 2 — One oscillator

Isolate a single oscillator with no neighbors and no feedback (coupling is Part 3;
feedback `s` is 0 in v1, so those terms drop out). The atom has **two state variables**:

- **Phase `θ`** — where in the cycle it is; a clock hand sweeping 0→2π and wrapping. It
  always keeps spinning.
- **Amplitude `r`** — how big the swing is.

**Three equations** (reference §2, coupling/feedback terms dropped):

1. **Phase advances at a steady rate:** `θ̇ = 2π·ν`. The hand sweeps at constant speed;
   `ν` is the frequency in Hz, `2π` converts cycles→radians. Higher `ν` = faster. **[paper]**
2. **Amplitude eases toward a target:** `ṙ = a·(R − r)`. `r` chases target `R` at gain
   `a` (=5) **[paper]**. Change drive and amplitude *glides* to the new value (~0.2–0.4 s,
   the `1/a` time constant) instead of jumping — this is what keeps transitions smooth **[interp]**.
3. **Output is a one-sided rhythmic pulse:** `x = r·(1 + cos θ)`.
   - `(1 + cos θ)` swings between **0 and 2**, never negative — a **muscle activation**
     (muscles pull, never push). This is *why* each joint needs a **left + right** pair
     (antagonists); the joint bend is their *difference* (Part 3).
   - `r` scales it, so output swings between **0 and 2r**. Bigger amplitude = bigger bend.
     (The one-sided output and the left/right antagonist pairing are both the paper's — **[paper]**.)

So one oscillator emits a smooth pulse rising/falling between 0 and 2r at frequency ν.

**The single drive knob `d` sets both frequency and amplitude:**

- **Frequency:** `ν = d·e`. Drive times **excitability `e`** (axial 1.1, forelimb 0.8,
  hindlimb 0.5) — a fixed per-oscillator gearing. More drive → proportionally faster.
  Those differing `e` values mean axial wants to run faster than limbs at the same drive —
  which matters later for keeping limbs locked to the body wave. The equation and constants
  are the paper's **[paper]**; that `e` therefore acts as a frequency control independent of
  amplitude (since `R` doesn't depend on `e`) is our reading **[interp]**.
- **Amplitude target with a saturation switch:** `R = d·P(d, d_th)`, where
  `P = 1/(1 + e^(b·(d − d_th)))` is a **steep decreasing S-curve** (steepness `b`=500, near
  a hard switch) centered on threshold `d_th`:
  - `d < d_th` → `P ≈ 1`, so `R ≈ d`: amplitude grows with drive.
  - `d > d_th` → `P ≈ 0`, so `R ≈ 0`: amplitude is **driven toward zero** — on the way down
    the oscillator goes low-amplitude and gets entrained to its neighbours before falling
    silent (not a hard binary flip) **[paper]**.

**Why the shut-off matters — gait transitions:** thresholds differ by region (limbs
`d_th ≈ 1.27`, axial `d_th ≈ 3`). Raise *one global drive*: at low drive both body and
limbs oscillate (stepping); as drive rises the **limbs saturate first** (lower threshold) —
their amplitude is driven toward zero — while the axial network keeps going, giving
**swimming**. This is the paper's explicitly stated **Hypothesis 3** **[paper]**. On the
way to saturation the limbs don't snap off; they go low-amplitude and get entrained to the
faster trunk rhythm first **[paper]**. *Caveat:* on the physical robot, torque limits meant
some swimming runs **lowered the limb threshold** or **silenced the limbs artificially**
rather than relying on pure saturation — the clean "just raise the drive" story is the
**simulation** behaviour **[paper]**. Our forward-stepping regime sits at drive ≈ 0.6–1.0,
well below the axial threshold of 3, so `P ≈ 1` and amplitude just tracks drive **[paper]**.

**The atom in one line:** drive in → frequency *and* amplitude out; turned into a smooth,
non-negative rhythmic pulse that glides rather than jumps, with a steep threshold that can
cut a region off (the basis for gait switching). **[paper]**

### Part 3 — The network (double chain + couplings + traveling wave)

**The cast — 54 oscillators.** The axial body is a **double chain**: 25 segments (N
segments on our rig), each with a **left** and a **right** oscillator → a left chain and a
right chain. Plus **4 limb oscillators**, one per leg (a leg gets a single oscillator, not a
pair). [paper]

**Two one-sided pulses → one signed bend.** Each oscillator's output is one-sided (≥ 0) — a
muscle that only pulls. A joint has a left and a right muscle, and the segment's left/right
oscillators are coupled in **antiphase** (preferred offset π): when left peaks, right
troughs. The joint bend is their **difference** `∝ (x_left − x_right)`, swinging smoothly
+→−→+ as the cycle turns. Two one-sided pulses become one two-sided bend. [paper]

**How a coupling works.** The coupling term `Σⱼ rⱼ·wᵢⱼ·sin(θⱼ − θᵢ − φᵢⱼ)` nudges
oscillator *i* until its phase sits at a **preferred offset φᵢⱼ** from neighbour *j* — the
`sin(...)` is zero exactly when `θⱼ − θᵢ = φᵢⱼ`, and any deviation produces a restoring
push. So **`φ` = desired phase lag**, **`w` = how strongly it's enforced**, and **`rⱼ`
scales the pull by the *source's* amplitude** (a saturated, low-amplitude neighbour barely
pulls). That last factor is the hinge for the walk/swim switch below. [paper]

**Axial couplings → the traveling wave** (Table 2):
- *Intrasegmental* (left↔right, same segment): `w=10`, `φ=π`. Strongest local coupling —
  makes the signed bend.
- *Intersegmental* (adjacent segments, same side): head→tail `w=5`, `φ≈+0.415 rad`
  (≈ +6.6% of a cycle); tail→head `w=1`, `φ≈−0.415`. Each segment prefers to lag slightly
  behind the one ahead, and **head→tail is 5× stronger than tail→head** (the paper's
  Hypothesis 2). A steady per-segment lag accumulating down the chain *is* a head→tail
  traveling wave, and the asymmetry keeps that lag **uniform** (symmetric coupling would
  smear into a standing wave). Dictionary: **positive lag = head→tail wave, zero = standing
  wave, negative = tail→head wave.** [paper]
- **Adapting the bias to our rig:** keeping `φ` fixed per segment would put more wave crests
  on a longer spine and fewer on a short one. Instead, **hold the total head→tail phase lag
  constant and distribute it along the body in proportion to each segment's length** — equal
  segments reduce to the paper's uniform bias; uneven segments get a proportionally larger
  bias across longer pieces. This keeps the spatial wave smooth and the number of body-waves
  invariant to node count/spacing. [interp/ours — see Part 8 + §2 decision 6]

**Same wiring, two patterns** (the elegant part — and the Part 1 correction). Why is walking
a standing wave but swimming a traveling wave? The `rⱼ` amplitude factor. The **limb
oscillators project strongly onto the axial oscillators near the girdles** (limb→axial
`w=30`, and only near the girdles — the paper's Hypothesis 1):
- *Walking* — active limbs (high amplitude) pull hard and impose their slower rhythm,
  dragging the axial pattern toward a **standing wave**.
- *Swimming* — drive rises, limbs saturate (amplitude→0), their pull vanishes, and the
  body's intrinsic asymmetric coupling produces a clean **head→tail traveling wave**.

The paper states it: *"a standing wave when limb oscillators were active (during stepping),
or a rostrocaudal wave when limbs were saturated (during swimming),"* with *"effective
connection strength proportional to amplitude."* One fixed network gives both gaits,
selected by limb amplitude — which is selected by drive (Part 2). [paper]

**Limb couplings (preview — detail in Part 5).** The 4 limbs are coordinated by interlimb
couplings (all antiphase, `φ=π`): fore→hind `w=3`, hind→fore `w=30`, left↔right `w=10` →
the diagonal (trot) footfall pattern. The limb↔axial link (strong `w=30` limb→axial, weak
`w=2.5` axial→limb) is the lever that ties legs to the body. [paper]

**Part 3 in one line:** left/right antiphase makes each joint's signed bend; asymmetric
head→tail coupling makes those bends a traveling wave; and because coupling strength scales
with amplitude, the same network gives swimming (traveling wave) or walking (standing wave)
depending on whether the limbs are active or saturated.

### Part 4 — From oscillator to motion (muscles → body → environment → thrust)
_To be written._

### Part 5 — Limbs & gait (transfer function, duty factor, diagonal trot)
_To be written._

### Part 6 — Turning & the behavior table (differential drive)
_To be written._

### Part 7 — Feedback (optional; v1 skips it)
_To be written._

### Part 8 — Mapping onto our rig

The paper's network is fixed (25 segments + 4 limbs); our rig has a **variable spine** but a
fixed gross shape: a central spine with **head + tail**, and **2 hips, each with a left and
right leg** (always 4 legs). The adaptation rules (full reasoning in Part 3):

1. **Same topology, any size.** For N spine segments, build N left/right pairs; couple each
   adjacent pair (head→tail `w=5`, tail→head `w=1`) and each segment's left/right antiphase
   (`w=10`). Always 4 limb oscillators. Coupling **weights are per-connection constants —
   independent of N**. [paper, generalized]
2. **Physical numbers from the rig.** Segment length from node spacing; mass/inertia from
   each segment's mesh. The body dynamics adapt automatically. [ours/established]
3. **Length-weighted phase bias.** Hold the total head→tail phase lag constant and
   distribute it along the body in proportion to segment length, so the wave shape is
   invariant to node count/spacing. [interp/ours]
4. **Hips/legs by position, not index.** Locate each girdle at its hip node and attach that
   leg's limb→axial coupling to the **nearest** spine segment. [paper, located by geometry]

Only model-specific inputs: **N**, **node spacing**, **mesh-derived masses**, and **which
spine segment each hip sits on**. Applies to **both swimming and walking** (one network):
the length-weighted bias shapes *swimming* most, while *walking* leans on the 4-limb
coordination + hip placement. _Expand into the full render/sim mapping when we reach it._

---

## 2. Decisions locked

A dated log of decisions, with reasoning. Settled one at a time as we work through them.

_None locked yet._

**Pending (to settle):**
1. **Dimensionality** — planar (2D top-down) vs full 3D. _Lean: planar first._
2. **Solver** — custom reduced-order integrator vs a physics library. _Lean: custom._
3. **Environment first** — swimming vs walking. _Lean: swimming first._
4. **Rule-6 reinterpretation** — foot contact emerges from the contact model rather than a
   scripted plant/lift. _Lean: confirm._
5. **Control surface** — expose drive `d` plus a global excitability multiplier (frequency)
   and optionally an amplitude gain as separate sliders, vs a single drive knob. _Lean:
   expose `d` + a global `e` multiplier — stays within the paper's model (see §1 Part 2)._
6. **Phase-bias scaling** — distribute the total head→tail phase lag along the body in
   proportion to segment length, vs a uniform per-segment bias. _Lean: length-weighted —
   keeps the wave shape invariant to node count/spacing (see §1 Part 3 / Part 8)._

---

## 3. Build phases

The ordered steps. Each phase is its own OpenSpec change (proposal → design → spec →
tasks) and ends in a **visual verification gate** in the animate studio before the next
begins. This is the current draft, refined as understanding firms up.

- **Phase A — Body model + minimal solver:** derive the multibody body from the rig (L1);
  stand up a minimal dynamics integrator (L4) with no actuation; verify the passive chain
  behaves and respects joint limits.
- **Phase B — CPG + muscles:** build the CPG (L2) from the reference; add Ekeberg muscles
  (L3 axial) → torques into the solver; verify the body undulates under muscle drive (in
  place, no environment).
- **Phase C — Swimming:** add hydrodynamic reactive + resistive forces (L5 water); verify
  it swims forward — the first emergent locomotion.
- **Phase D — Walking:** add limbs (transfer function + limb joints) + ground contact +
  friction (L5 land); verify terrestrial stepping.
- **Phase E — Turning + behaviors:** differential drive; behavior presets matching Table 4.
- **Phase F — Attractor tracking:** the thin "brain" layer — attractor → drive magnitude +
  left/right bias; head tracks the target; body and feet orient and move toward it.
- **Phase G — Feedback (optional):** close the CPG loop (reference §9).
- **Phase H — UI:** rebuild the Simulate tab for this model.

Map each phase to the L0–L8 layers in `locomotion.md §3`; pull all math/params from the
reference.

---

## 4. Status

- **2026-05-26** — Clean slate. The old kinematic animation is removed; the rig renders its
  rest pose and the Calibrate tab works. Roadmap created; walked through Part 1 (emergence)
  and Part 2 (one oscillator), verified the gait-transition claim against the paper text,
  and added provenance tags. Wrote Part 3 (the network) and seeded Part 8 with the four
  rig-adaptation rules. Parts 4–7 still to do (Part 8 to expand) before the first phase spec.
