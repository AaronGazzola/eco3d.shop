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

> **⚠ Planar-era note:** Parts 1–8 below were written when the plan was **planar (2D) on a custom
> solver**. The dynamics are now **full 3D on the Rapier engine** (§2 **Decision 8**), with gravity +
> ground contact for land. Where the text says "planar state," "one yaw angle per joint," or "custom
> reduced-order solver," read it as the 3D-on-Rapier equivalent. The *control logic* (CPG, Ekeberg
> muscle, transfer function) is unchanged — only the body/solver re-platformed.

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

Part 3 ended with the CPG producing, at each joint, a pair of one-sided rhythmic pulses
(left `xᵢ`, right `xᵢ₊₂₅`). Those are still just **neural signals**. Part 4 is the
five-stage pipeline that turns signals into actual movement — and it is the layer the old
kinematic version faked.

**Stage 1 — Output → muscle activation (10 ms delay).** The oscillator output
`x = r(1+cos θ)` is a *command*, not a force. A 10 ms first-order delay converts each output
into a muscle activation `M` (`xᵢ→Mᵢˡ`, `xᵢ₊₂₅→Mᵢʳ`), modeling the fact that real muscle
force lags the neural signal — contraction is a low-pass-filtered version of the command. **[paper]**

**Stage 2 — Ekeberg virtual-muscle pair → joint torque.** The segment's two activations feed
an antagonist spring-damper muscle pair producing a joint **torque** (reference §4;
constants α=0.4, β=1.2, γ=0.2, δ≈0.1):

```
Tᵢ = α·(Mˡ − Mʳ)  −  β·(Mˡ + Mʳ + γ)·φᵢ  −  δ·φ̇ᵢ
```
Three pieces, each with a clear job **[paper]**:
- **Active term `α(Mˡ − Mʳ)`** — the net pull. Left pulls one way, right the other; their
  *difference* is the commanded bending torque. This is where Part 3's left/right antiphase
  becomes a signed effort.
- **Variable-stiffness spring `−β(Mˡ + Mʳ + γ)φᵢ`** — pulls the joint back toward straight
  (`φᵢ=0`), but its stiffness is not fixed: it grows with the *total* activation `(Mˡ+Mʳ)`
  plus a tonic baseline `γ`. Co-contraction stiffens the joint — fire both muscles hard and
  it resists deflection more.
- **Damping `−δφ̇ᵢ`** — opposes joint angular velocity; bleeds energy and keeps it stable.

The decisive point: **this is a torque, not a commanded angle.** The resulting angle is
whatever the dynamics work out. The old kinematic version skipped straight to *setting* the
angle — that substitution is exactly what we remove. **[paper/interp]**

**Stage 3 — Free rigid-body chain (no root).** The body is a chain of rigid segments joined
by 1-DOF rotational joints, floating **free** in the world — nothing pinned. The muscle
torques are *internal* (between adjacent segments), so by Newton's third law they can only
rearrange the body's *shape* — internal torques alone can never translate the center of
mass. **[paper]** This is the deep reason the paper needs no render-root: the body's world
pose is an *output* of integration. **We** still need a root frame because our rig is
authored around a skeleton root — the one spot where our setup structurally differs.
**[paper; the "they don't need a root, we do" contrast is ours]**

**Stage 4 — Environment forces (the crux).** Since internal torques only bend the body, net
translation must come from *external* forces — the environment pushing back:
- *Water:* reactive + resistive hydrodynamics (paper uses the Porez et al. 2014 model). A
  slender segment feels far more drag *across* it than *along* it (anisotropic). As the
  head→tail wave shoves each segment sideways-and-back, the summed normal reaction nets out
  as **forward thrust**. **[paper]**
- *Land:* contact (normal force / no penetration) + friction (tangential). Feet plant and
  push backward; friction resists; the body goes forward. **[paper]**
- **No environment reaction → no locomotion, just wiggling in place.** The Part 1 claim made
  concrete: *this* is the layer that supplies the reaction the kinematic version never had.
  **[paper/interp]**

**Stage 5 — Integration → emergence.** Step everything forward together each tick: CPG
states `(θ,r)` → activations `M` → torques `T` → rigid-body accelerations under torques +
environment forces → integrate to velocities and positions. Locomotion is the *integrated
result* of forces — never prescribed. **[paper]**

**Part 4 in one line:** the CPG's rhythmic pulses become muscle activations (10 ms lag), an
Ekeberg pair turns each segment's left−right difference into a joint *torque* (active pull +
variable-stiffness spring + damping), those torques bend a free rigid-body chain, and only
the environment's reaction to that bending produces net motion — integrated forward,
locomotion emerges. This pipeline is what locks Decisions 1–3 (§2): planar, custom solver,
swimming-first.

### Part 5 — Limbs & gait (transfer function, duty factor, diagonal trot)

**Four legs, one oscillator each.** Each leg is a single 1-DOF rotational joint at the hip —
in our planar world a fore-aft protraction/retraction sweep. A leg gets a *single*
oscillator, not the left/right pair the axial segments use. **[paper]**

**Legs are driven differently from the axial body — the key contrast.** The axial joints go
through the full Ekeberg torque path (Part 4). The limbs do **not**: the limb oscillator's
**phase `θᵢ` is used directly as the desired leg position**, mapped through a
**piecewise-linear transfer function**. The leg joint is then driven toward that target
position, not via a muscle-activation difference. **[paper]**

**Duty factor and the transfer function.** The map is shaped to hit a **77% stance / 23%
swing** duty factor (= fraction of the cycle the foot is on the ground). As phase sweeps
0→2π the leg spends ~77% sweeping *backward slowly* (stance — foot planted, propelling) and
~23% swinging *forward fast* (swing — foot lifted, resetting); the two slopes *are* the duty
factor. The paper gives the 77% target but **not the formula**, so the piecewise-linear map
is **ours** to design. Backward stepping uses `−θᵢ`. **[paper target; transfer function is ours]**

**Foot contact emerges — it is not scripted.** No keyframed plant/lift. The limb is a
simulated 1-DOF joint driven toward the transfer-function position, and the foot's
contact / slip / lift **emerges from the contact model** (Part 4's land forces). This is the
reinterpretation of the old kinematic "rule 6" (§2 decision 4). **[paper/ours]**

**The four legs coordinate into a diagonal trot** via interlimb couplings — all **antiphase
(`φ=π`)**, three kinds (Table 2): left↔right (lateral) `w=10`; fore→hind (rostrocaudal)
`w=3`; hind→fore (caudorostral) `w=30`. The two legs on a girdle are antiphase, and fore/hind
on a side are antiphase with the **hind legs leading** (caudorostral coupling is 10×
stronger). Working the relations through: **left-fore + right-hind move together, antiphase
to right-fore + left-hind** — the diagonal trot. **[paper]**

**Legs tie to the body wave** through the limb↔axial coupling: **limb→axial `w=30`** (strong,
only near the girdles — Hypothesis 1) and **axial→limb `w=2.5`** (weak), phase bias `φ=4`
rad. This is the Part 3 lever — active limbs impose their slower rhythm on the nearby axial
segments, dragging the body toward a **standing wave** during walking. **[paper]**

**Why limbs run slower and saturate first.** Limb excitability is lower (forelimb `e=0.8`,
hindlimb `e=0.5`) than axial (`e=1.1`), and the limb saturation threshold is lower
(`d_th≈1.27` vs axial `3`). At low drive both step (walking); raise the drive and the
**limbs saturate first** — amplitude→0, they fold away — and the body switches to swimming.
(Part 2's gait transition, now located in the limbs.) **[paper]**

**Where this sits in our build:** Part 5 is **Phase D (walking), after swimming.** For
swimming-first the limbs saturate and contribute nothing, so we understand them now and
build them later. **[ours]**

**Part 5 in one line:** each leg is a single oscillator whose phase drives a 1-DOF hip joint
through a 77%-stance transfer function; antiphase interlimb couplings produce the diagonal
trot; a strong limb→axial coupling ties legs to the body and forces a standing wave when
walking; and lower limb excitability/threshold makes the limbs fold first into swimming.

### Part 6 — Turning & the behavior table (differential drive)

**Turning has no separate system — it is just uneven drive.** Send a different drive value to
different parts of the body and it curves. Two flavors: **front-vs-back** (rostral segments
get less drive than the rest) and **left-vs-right** (one side gets more → the body bends
toward the weaker side). Steering = drive asymmetry. **[paper]**

**The headline forward gait is already differential.** Even going straight, the paper's
forward stepping gives the **front 3 segments a lower drive (~0.6) than the rest of the body
and legs (~1.0)** to tune the body wave. The same knob, pushed left/right, is what turns. **[paper]**

**All five behaviors come from drive settings alone** (Table 4) — one fixed network, no
rewiring:
- **Swimming** — high drive (legs saturate, body undulates).
- **Forward terrestrial stepping** — 0.6 front / 1.0 body+legs.
- **Forward underwater stepping** — same shape, lower drives (~0.42 / 0.71).
- **Backward stepping** — lower still, plus legs run on `−θ` and muscle gains ×10.
- **Struggling** — low drive + muscle gains ×10.

**[paper]**

**Our regime is fixed tonic drive, no noise** — the paper's in-vivo runs zero out the
random-walk drive terms. That is the regime we use. **[paper]**

**Where this sits:** **Phase E (turning + behavior presets matching Table 4)**, after
swimming and walking. The actual *attractor → left/right drive split* (how the lizard
decides how hard to turn toward a target) is **ours** to design — that is Phase F
(head-tracking). **[ours]**

**Part 6 in one line:** turning is differential drive, not a new system; the same drive
table that selects gait also steers; the five behaviors are all just drive settings on one
fixed network; we run fixed tonic drive and add the attractor→drive mapping ourselves later.

### Part 7 — Feedback (optional; v1 skips it)

**So far the CPG is open-loop:** drive goes in, rhythm comes out, and the controller never
*senses* what the body actually did. Feedback closes that loop — the body's real joint
angles flow back into the oscillators. **[paper]**

**Two kinds** (reference §9): **[paper]**
- **Axial proprioceptive feedback** — simulated stretch receptors read each joint's actual
  angle and nudge that segment's oscillator (`sᵢ = w_ipsi·[φᵢ]₊ + w_contra·[−φᵢ]₊`, with
  `w_contra = −w_ipsi`; it feeds the last term of the phase + amplitude equations). Effect:
  the CPG entrains to the real body motion — sharpens the wave, pulls the swimming phase lag
  toward more physiological values, and adapts to load/terrain.
- **Limb feedback** — an extra term on the leg oscillators that is strongest at end-of-stance
  and can only *accelerate* the cycle (always ≥ 0). It ties the stepping rhythm to where the
  leg actually is.

**Why we skip it for v1:** the open-loop CPG already produces all the behaviors on its own —
feedback is an *enhancement* (better swimming phase lag, recovery from perturbation), not a
requirement. Set `sᵢ = 0` and `w_limb = 0` and none of it runs. **[paper]**

**Where this sits:** **Phase G (optional), last.** It is fully recorded in reference §9 so we
never re-derive it. **[ours]**

**Part 7 in one line:** feedback closes the loop by feeding real joint angles back into the
oscillators to refine and stabilize the gait; it is optional, so v1 runs fully open-loop
(`s=0`) and we keep it in our back pocket for Phase G.

### Part 8 — Mapping onto our rig

The paper's network is fixed (25 segments + 4 limbs); our rig has a **variable spine** but a
fixed gross shape: a central spine with **head + tail**, and **2 hips, each with a left and
right leg** (always 4 legs). The adaptation rules (full reasoning in Part 3):

1. **Same topology, any size.** For N spine segments, build N left/right pairs; couple each
   adjacent pair (head→tail `w=5`, tail→head `w=1`) and each segment's left/right antiphase
   (`w=10`). Always 4 limb oscillators. Coupling **weights are per-connection constants —
   independent of N**. [paper, generalized]
2. **Physical numbers from the rig.** Segment length from node spacing; **weight authored
   per node (default uniform, mesh-decoupled), inertia derived from weight + length** — *not*
   from the mesh (superseded; see Decision 7). The body dynamics adapt to node geometry
   without the 3D art leaking in. [ours/Decision 7]
3. **Length-weighted phase bias.** Hold the total head→tail phase lag constant and
   distribute it along the body in proportion to segment length, so the wave shape is
   invariant to node count/spacing. [interp/ours]
4. **Hips/legs by position, not index.** Locate each girdle at its hip node and attach that
   leg's limb→axial coupling to the **nearest** spine segment. [paper, located by geometry]

Only model-specific inputs: **N**, **node spacing**, **per-node authored weights (default
uniform)**, and **which spine segment each hip sits on**. Applies to **both swimming and walking** (one network):
the length-weighted bias shapes *swimming* most, while *walking* leans on the 4-limb
coordination + hip placement.

**The full sim/render mapping** (ties the L0–L8 layers of `locomotion.md §3` to the concrete
rig, in planar mode — Decision 1):

- **Inputs read from the rig** (and nothing else): **N** → build N left/right axial
  oscillator pairs + always 4 limb oscillators; **node spacing** → segment lengths; **per-node
  authored weights** → mass + (with length) rotational inertia; **hip node positions** → attach each leg's coupling
  to the nearest spine segment; **`angleCaps`** → joint-limit stops. **[ours]**
- **Network is size-independent.** Coupling *weights* are per-connection constants (Table 2),
  unchanged by N. Only the **phase bias** scales with the rig — spread along the body in
  proportion to segment length so the number of body-waves is invariant to node count
  (Decision 6 lean). **[paper + ours]**
- **Simulation state (planar).** Per tick we integrate: one **yaw angle per axial joint**
  (plus one per leg in walking), and the body's **free planar pose `(x, y, heading)`** — the
  piece the paper gets for free with no root, which we read out into our skeleton root. The
  step: CPG → activations → Ekeberg torques (axial) / transfer-function targets (legs) →
  planar rigid-body accelerations under those + environment forces, clamped by the caps →
  integrate. **[paper + ours]**
- **Render mapping (L6 — the bridge back).** Integrated joint angles → node-skeleton
  **pivots** (clamped to caps); the body's planar `(x, y, heading)` → the **root frame**;
  meshes and legs are passengers that follow. Dynamics are 2D; the mesh still renders in 3D —
  we drive the rig's yaw pivots + root transform from a planar solve. **[ours]**

**One network, both gaits, any rig:** the length-weighted phase bias shapes *swimming*; the
4-limb coordination + hip placement drive *walking*. Same controller, sized to whatever rig
is loaded.

---

## 2. Decisions locked

A dated log of decisions, with reasoning. Settled one at a time as we work through them.

**Locked:**

1. **Dimensionality → planar (2D, top-down).** _2026-05-27._ **⚠ SUPERSEDED by Decision 8
   (2026-06-06): full 3D.** The paper's robot runs with its axial joints "restricted to the
   horizontal plane" (PDF p.8) — the locomotion physics is fundamentally in-plane yaw. Planar
   is both faithful to the paper and far more tractable in-browser. (Forced by Part 4: we must
   commit to how the body is built.) *Reversed because planar cannot represent foot lift /
   emergent ground contact (Decision 4) and blocks 3D movement (climbing); the rig nodes
   already carry Y.*
2. **Solver → custom reduced-order integrator.** _2026-05-27._ **⚠ SUPERSEDED by Decision 8
   (2026-06-06): Rapier physics engine.** We need the paper's exact force laws — Ekeberg
   torque, anisotropic resistive-force hydrodynamics, friction. A general physics library does
   not provide resistive-force hydrodynamics out of the box and is heavier than required. A
   custom integrator implements the model directly. *Reversed: the paper's body ran in ODE /
   Webots (reference §4) — a physics engine is the *faithful* choice; we keep RFT as custom
   external forces applied to the engine bodies.*
3. **Environment first → swimming.** _2026-05-27._ Cleanest "wiggle → thrust": limbs
   saturate and fold away (Part 2), so there is no gait/leg coordination to get right yet.
   Walking (limbs + contact + friction) comes after, in Phase D.
4. **Rule-6 reinterpretation → foot contact emerges from the contact model.** _2026-05-27._
   The old kinematic "rule 6" scripted feet grounded during stance / lifted during swing.
   In the paper, limbs are 1-DOF sweeps driven toward a transfer-function position and the
   foot's plant / slip / lift emerges from the physics. We adopt that: no scripted plant or
   lift arc (Part 5). (Forced by Part 5: settles how the limb joint is actuated.)

5. **Control surface → drive `d` + a global excitability `e` multiplier.** _2026-05-29._
   The two exposed knobs are: a global axial **drive** `d` (sets both frequency `ν=d·e` and
   amplitude `R≈d` in the forward regime), and a global **excitability** multiplier `e`
   (default 1.0). Because `R` does not depend on `e`, the `e` knob changes *frequency
   independently of amplitude* — the wave speeds up or slows while the bend depth holds —
   which stays inside the paper's model (§1 Part 2). No separate amplitude gain. Differential
   drive (rostral vs caudal, left vs right) is the **turning** lever and is deferred to Phase
   E; Phase B applies one global `d` to all axial segments. (Settled while scoping Phase B.)
6. **Phase-bias scaling → length-weighted, total lag held constant.** _2026-05-29._ Each
   adjacent-pair head→tail phase bias is `φₖ = (segmentₖ length / Σ lengths) · Φ_total`, where
   `Φ_total = 2π · BODY_WAVES` and **`BODY_WAVES ≈ 1.58`** matches the paper's 25-equal-segment
   total lag (24 × 0.415 ≈ 9.96 rad ≈ 1.58 body waves). Equal segments reduce exactly to the
   paper's uniform `±0.415` bias; uneven segments get bias proportional to length, so the
   spatial wave shape is invariant to node count and spacing. `BODY_WAVES` is a single named
   constant, tunable when we eyeball the undulation in Phase B3. (See §1 Part 3 / Part 8.)
   The tail→head bias keeps the same length-weighting with the paper's 1:5 strength ratio.
7. **Mass model → uniform per-node authored weight, mesh-decoupled; inertia derived from
   weight + length.** _2026-06-04._ Supersedes the original "mass/inertia from each segment's
   mesh" rule (Part 8 rule 2 / L1 / §1 rule 7 / reference §8). That rule **leaked the 3D art
   into the dynamics**: each segment's mass was `BODY_DENSITY · (mesh bounding-box volume)`
   ([body.ts:130-132](app/game/locomotion/body.ts#L130-L132)), so the large head mesh became
   ≈78.7 kg against 7–22 kg tail segments (≈10:1). Internal muscle torques cannot move that
   heavy head (Newton's third law), so the CPG wave collapsed into a head-anchored / tail-whip
   paddle and the Phase C swimming gate could not pass — the "morphological limitation" logged
   in §4 (2026-06-04) is *this leak*, not an intrinsic rig flaw. The new model:
   - **Weight is authored per node, not derived from the mesh.** Default is a single uniform
     constant shared by all axial nodes (head/spine/tail), identical between models and
     independent of the STL art. The mesh becomes a pure render passenger — it no longer
     feeds the dynamics in *either* direction (what `locomotion.md` rule 4 always intended).
   - **Inertia is derived from weight + actual segment length** (rod `I ≈ m·L²/12` about the
     COM, with a standard cross-section). Node spacing (kept dynamic) still shapes rotation;
     node count stays dynamic; the mesh never enters the dynamics.
   - **Configurable like angle caps.** A per-node weight control in the Calibrate tab reusing
     `LimitSlider`; a new `nodeWeight?` field on `BodyGroup` beside `angleCaps`. The 4 legs
     are **ganged** to one shared value (edit one → all four stay equal) with their own
     default, separate from the axial default.
   - **Realistic scale anchored on a medium-dog head.** Head ≈ 1.5 kg (was 78.7); uniform
     axial nodes ≈ 1.5 kg each → ~16 kg total over ~11 nodes ≈ a medium dog's body mass.
     ~50× lighter than the old scale, so every constant tuned at the old scale
     (`CPG_TO_MUSCLE_GAIN`, `DRAG_NORMAL/TANGENT/ANGULAR`) is **re-fit from scratch** when
     Phase C re-opens — the point being that a light, *uniform* body is the regime where the
     traveling wave should finally net clean head-leading thrust. The dog-head anchor is a
     default, configurable per model.
   This matches the paper, which used **uniform segments** (PDF Methods, "uniform" runs).
   (Settled in an explore session; implemented via the Phase C re-open change — see §4.)
8. **Dimensionality & solver → full 3D on the Rapier physics engine (supersedes Decisions 1
   & 2).** _2026-06-06._ **⚠ The SOLVER half is SUPERSEDED by Decision 9 (2026-07-11):
   reduced-coordinate articulated-body physics. The FULL-3D half still stands.** The body is rebuilt as a chain of **3D rigid bodies in Rapier**
   (`@dimforge/rapier3d-compat`, WASM, run in deterministic fixed-step mode), one body per
   segment (mass from `nodeWeight`, geometry/inertia from a collider sized by node spacing +
   `STD_SEGMENT_WIDTH`), joined by joints whose axes and limits come from the node skeleton +
   `angleCaps`. **Why this is the *faithful* choice, not a compromise:** the paper's body ran
   in **ODE via Webots** (reference §4); planar + a custom integrator were the pragmatic
   deviations. **Why now:** (a) planar fundamentally cannot represent foot lift / emergent
   ground contact, so walking was never faithfully achievable in 2D (the planar "phase-gated
   stance" idea was a workaround); (b) the end goal needs **3D movement including climbing by
   surface adhesion**, which requires the body to operate in any orientation under gravity +
   arbitrary-surface contact — exactly what an engine provides; (c) the rig nodes already
   carry **Y**, so the 3D rest pose is authored (`buildBodySpec` currently discards it).
   **What carries over unchanged:** the controller — CPG (`cpg.ts`), Ekeberg torque
   (`muscles.ts`), the transfer function (to build), `nodeWeight`, `angleCaps`, the studio
   Simulate scaffolding, and the diagnostic-capture methodology. **What re-platforms:** the
   body dynamics (custom planar `solver.ts` → Rapier), and the swimming **RFT drag**, which
   stays a custom per-segment external force but is now generalized to 3D and applied to the
   Rapier bodies. **Determinism:** Rapier runs at a fixed timestep in deterministic mode so
   captures stay reproducible (the whole gate methodology depends on it). **Gravity:** off for
   the 3D swimming re-proof (neutral-buoyancy water); on for walking. **Adhesion** (climbing)
   is a later phase — foot/body contact anchors with an adhesion force — but the 3D engine is
   the substrate that makes it possible. (Settled in an explore session, 2026-06-06.)
9. **Solver → reduced-coordinate articulated-body physics; every joint a position servo
   (supersedes the solver half of Decision 8).** _2026-07-11._ Full-3D (Decision 8) stands;
   only the *engine class* changes. **Why:** Rapier is a **maximal-coordinate impulse
   solver** — its joint motors act as springs, so position-servo limbs sag and store/release
   energy under load instead of holding their angle and driving the body. The paper's limbs
   (and, on the robot, every joint) are **position-controlled servos**; a reduced-coordinate
   (Featherstone / articulated-body) solver represents joints in generalized coordinates so an
   actuated joint is rigid **and** force-exerting — the faithful model of a servo. **What:**
   every joint (spine + legs) becomes a force-limited position servo; the CPG is unchanged and
   drives the servo targets. **Validation first:** the physics is proved with **MuJoCo**
   (`@mujoco/mujoco`, Google-DeepMind's official WASM build) as a throwaway oracle, driven by
   the *real* `cpg.ts` — confirmed loading and compiling our node-derived model under Node
   (nq=25, nu=18, neq=4). **Shipping runtime:** a small custom ABA (or MuJoCo-WASM) built **at
   runtime from the node skeleton** — rig-generality (rule 7 / Part 8) is **unchanged**; the
   model is derived from nodes, never hard-coded per dragon. **Honest caveat (logged, not
   ignored):** the paper ran on **ODE/Webots, also maximal-coordinate**, so maximal-coordinate
   *can* walk a servo robot — our floppiness is likely worsened by our **2-DOF carrier hip**
   (the paper and Phase D2 specify a **1-DOF** hip) and the added grip pin (Decision 4 wants
   emergent contact). A faithful **1-DOF Rapier hip** therefore remains a viable fallback if
   the reduced-coordinate move proves not worth its cost. (User authorized changing Decision 8;
   tracked by OpenSpec change `validate-articulated-locomotion-mujoco`.)

---

## 3. Build phases

The ordered steps. Each phase is its own OpenSpec change (proposal → design → spec →
tasks) and ends in a **visual verification gate** in the animate studio before the next
begins. This is the current draft, refined as understanding firms up.

- **Phase A — Body model + minimal solver:** derive the multibody body from the rig (L1);
  stand up a minimal dynamics integrator (L4) with no actuation; verify the passive chain
  behaves and respects joint limits. **Done** — re-decomposed and shipped as A2 (FK
  renderer), A3 (zero-force solver), A4 (joint damping + soft limit stops).
- **Phase B — CPG + muscles (axial only; no limbs, no environment).** Split, mirroring A,
  into signal → actuation → coupling, each with its own gate:
  - **B1 — CPG network (signal).** The axial double chain (N segments × {left, right})
    from the reference §2–§3: phase + amplitude ODEs (`s=0`), output `x=r(1+cosθ)`, drive→
    frequency/amplitude, intra/intersegmental couplings with the length-weighted phase bias
    (Decision 6). Runs on its own fixed-step clock, no body. Gate: a space-time capture of
    the per-segment signed activation shows a head→tail traveling wave (phase lag ∝ length,
    amplitude tracks drive). Locks Decision 6's `BODY_WAVES`.
  - **B2 — Ekeberg muscles (actuation).** The muscle torque `Tᵢ = α(Mˡ−Mʳ) − β(Mˡ+Mʳ+γ)φᵢ
    − δφ̇ᵢ` (reference §4, Table 5: α=0.4, β=1.2, γ=0.2, δ=0.1) wired into the solver's
    generalized forces, driven by a **clean test sinusoid** (not the CPG). Gate: a joint
    bends sinusoidally and the β stiffness restores it toward 0 — the restoring force A4
    deliberately lacked. Isolates the muscle params from the CPG.
  - **B3 — Couple CPG → muscles → body.** Feed B1's real outputs into B2's muscles into the
    solver (with the 10 ms activation delay). Gate: the body undulates in a head→tail
    travelling wave in place (no environment → no net thrust). Tune `BODY_WAVES` here.
- **Phase C — Swimming:** add hydrodynamic reactive + resistive forces (L5 water); verify
  it swims forward — the first emergent locomotion. **Done (planar)** — `add-uniform-mass-model`
  shipped forward head-first swimming; the reversed CPG→joint mapping was the real blocker.
- **Phase C-3D — Re-platform onto Rapier; re-prove swimming in 3D (Decision 8).** _Next._
  Rebuild the body as 3D Rapier rigid bodies from the node skeleton (using node Y), wire the
  proven CPG → Ekeberg torque controller onto the engine's axial joints, generalize the RFT
  drag to 3D as external forces, render the rig from the engine transforms, retire the custom
  planar `solver.ts`. Gravity off (neutral-buoyancy). **Legs stay passengers.** Gate: the body
  swims forward head-first in 3D, reproducing the planar result. This is the new foundation —
  like Phase A was — and everything below depends on it.
- **Phase D — Walking.** Split, mirroring B, into **signal → actuation → coupling**, each with its
  own gate:
  - **D1 — Limb CPG (signal).** Four limb oscillators (one each — position-driven, not L/R pairs) +
    Table 2 interlimb couplings (lateral `w=10`, rostrocaudal `w=3`, caudorostral `w=30`, all `φ=π`)
    → diagonal trot; limb↔axial couplings (limb→axial `w=30, φ=4`; axial→limb `w=2.5, φ=−4`) at the
    girdles; faithful limb params (`e` fore `0.8` / hind `0.5`, `d_th` `1.27`). No legs. Gate: a CPG
    capture shows the diagonal-trot phases emerging, the trunk pulled toward a standing wave, and the
    limbs saturating first at high drive.
  - **D2 — Limb actuation (one leg steps).** The paper's **piece-wise-linear transfer function** —
    limb phase → desired 1-DOF *rotational* hip position, modulating swing vs stance rotation speeds
    to a **77% duty factor** (reference "Limb Joints" section; the construction is the paper's, only
    the leg amplitude is ours) — driving a single physical hip on the ground under gravity, isolated
    with a test oscillator (like B2's test sinusoid). **Position-driven via the joint motor, NOT the
    Ekeberg muscle.** Gate: one leg steps — slow stance plant that grips/propels, fast swing; foot
    lift/slip **emerges from contact** (1-DOF, no scripted lift, no second DOF).
  - **D3 — Terrestrial coupled walking.** Couple D1 → D2 across the four legs + the axial wave;
    gravity + ground + friction. Gate: diagonal-trot walk, forward, upright, energy bounded.
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
- **2026-05-27** — Transcribed Table 5 muscle constants (α=0.4, β=1.2, γ=0.2, δ≈0.1) into
  reference §4 (damping flagged for a final PDF check). Confirmed and wrote Part 4 (oscillator
  → motion: the 5-stage muscle → torque → free body → environment → integration pipeline).
  Locked Decisions 1–3: **planar**, **custom reduced-order solver**, **swimming-first**.
  Then wrote Part 5 (limbs & gait: single oscillator per leg, phase→transfer-function
  position at 77% stance, diagonal trot, limbs fold first into swimming) and locked Decision
  4 (foot contact emerges from the contact model). Wrote Part 6 (turning = differential
  drive; five behaviors = drive settings on one network; fixed tonic drive, no noise) and
  Part 7 (feedback closes the loop; optional; v1 runs open-loop, `s=0`). Expanded Part 8 with
  the full sim/render mapping (rig inputs → size-independent network → planar state →
  render). **Walkthrough complete (Parts 1–8); Decisions 1–4 locked.** Next step is the
  Phase A OpenSpec change (body model + minimal solver); Decisions 5 (control surface) and 6
  (phase-bias scaling) still to lock as their phases come up.
- **2026-05-27** — **Phase A implemented** (`openspec/changes/add-locomotion-body-solver`).
  Built the planar body model (`app/game/locomotion/body.ts`) and the custom reduced-order
  solver (`solver.ts`): floating-base planar dynamics with the full mass matrix, Coriolis
  via finite-difference Christoffel terms, joint damping + penalty limit-stops, semi-implicit
  sub-stepped integration. Wired into the studio (root group in `AnimateScene`, sim branch in
  `useLocomotion`, minimal Run/Perturb/Reset + diagnostics in the Simulate tab).
  **Solver physics verified headless** (`scripts/locomotion-solver-check.ts`): COM conserved
  under internal motion (drift 5.5e-3), energy decays monotonically to rest, limit stops hold,
  frame-rate independent (30 vs 120 fps). `tsc` clean. **Remaining:** in-studio visual gate
  (rest pose / Calibrate-unchanged eyeball). Next: Phase B (CPG + Ekeberg muscles); confirm
  the Table 5 damping `δ` and lock Decision 6 (phase-bias) then.
- **2026-05-28** — **Phase A's visual gate failed.** A diagnostic capture tool was added
  to record solver state alongside render state into a compact text artifact
  (`app/game/locomotion/diagnostics.ts`, `app/api/diagnostics/route.ts`). The first
  capture revealed the solver was numerically stable but joints ran at 3–5× their caps
  every frame while the render hard-clamped them; KE held near 400 instead of decaying.
  Root cause was not the solver constants — it was the renderer wiring. The `rootRef`
  `useLocomotion` wrote to was never bound to any visible `<group>` (`AnimateScene` did
  not pass one in, and `AnimatedModel`'s outer group did not bind it), so the body's
  bodily motion was computed and thrown away. Legs were rendered as world-level siblings
  of `ChainNode` rather than children of their attached spine pivot, so they stayed
  glued in world space when the spine bent. **Phase A is being re-decomposed.** The
  single Phase A commit (`ab3314a`) was reverted along with the OpenSpec change and its
  headless scripts; the diagnostic capture's serializer + API route survive as latent
  scaffolding for A3+. The split: **A2** FK renderer + leg parenting + manual pose
  sliders (no solver), **A3** zero-force solver loop with a free-flight-drift gate,
  **A4** joint damping + soft limit stops with a visible-settle gate, **A5** re-wire
  the diagnostic capture. Sec. 3 (Build phases) will be rewritten with the full A1–A5
  layout once the split has been observed end-to-end through A5.
- **2026-05-28 (A2 implemented)** — `openspec/changes/add-fk-renderer-phase-a2` lands
  `body.ts` (extraction reintroduced), reparents leg groups under their attached spine's
  pivot in `AnimatedModel`, binds a `rootRef` on the model's outer group, and exposes
  manual pose sliders in the Simulate tab (root x / z / yaw + per-chain-joint yaw,
  joint sliders fixed at ±π/2 so dragging past a cap reveals the render-side clamp).
  Calibrate path preserved. **Visual gate passed** (root sliders translate/yaw; joint
  sliders bend at each segment's parent `nodeBack`; cap overshoot visibly clamps; legs
  follow their parent spine; Reset pose works; Calibrate unchanged). One fix during
  verification: pivot resolution is `parent.nodeBack → self.nodeBack → self.nodeFront`,
  matching the group editor's node convention (joints live on the parent's back; only
  the head carries a `nodeFront`; stale `nodeFront` values on other groups are ignored
  and no longer rendered as ghost spheres). Archived as
  `2026-05-28-add-fk-renderer-phase-a2`; its 5 requirements merged into
  `openspec/specs/locomotion/spec.md`.
- **2026-05-29 (A3 implemented)** — `openspec/changes/add-zero-force-solver-phase-a3`
  re-introduces the planar multibody solver (`solver.ts` + `types.ts`) **with all
  generalized forces returning zero** — no joint damping, no limit stops, no actuation;
  the damping/limit constants are exported as `0` so A4 can flip them on without
  restructuring. `useLocomotion` gains a solver branch that, on Run, seeds solver state
  from the current `manualPose` and steps each frame, writing root + chain pivots from
  solver state; pausing falls back to the A2 manual-pose path. A **Kick translation**
  button seeds `rootVelX = 0.5` once per click. The diagnostic capture pipeline is
  re-wired (`buildSample` / `buildCaptureSpec` re-added to `diagnostics.ts`, Record/Stop
  posts to `/api/diagnostics`). Diagnostics (KE, COM drift) push to the store every
  100 ms. The Simulate sidebar gains Run/Pause, Reset, Kick, Record/Stop, a diagnostics
  readout, and dims the manual sliders while running. Gate is the free-body straight-line
  drift test: one kick → rootX grows linearly, rootZ ≈ 0, heading fixed, no joint motion,
  KE flat. **Gate passed** via capture (rootX slope 0.5, KE flat at 33.3, posed bend held
  rigidly, head bone len 3.35 after the nodeFront anchor fix). Archived as
  `2026-05-29-add-zero-force-solver-phase-a3`.
- **2026-05-29 (A4 implemented)** — `openspec/changes/add-joint-damping-limits-phase-a4`
  turns the two passive force terms back on (the constants A3 left at `0`):
  `generalizedForces` applies per-joint viscous damping plus one-sided penalty limit stops
  at each `angleCaps`. Adds `perturbJointRates` (momentum-balanced alternating joint-rate
  kick → **Kick joints** button) and a `maxJointFracOfCap` diagnostic (live **Max joint /
  cap** readout). Gate is the damped-settle test: kick → chain whips → settles to rest
  with KE → ≈0 and joints inside caps, COM ~stationary (no actuation/environment, so no
  locomotion). **Tuned across captures:** started `(JOINT_DAMPING, LIMIT_STOP_STIFFNESS,
  LIMIT_STOP_DAMPING) = (8, 3000, 100)` — settled too slowly with joints parked ~115%
  past caps and a late KE uptick (stiff explicit end-stop pumping energy). Final
  **`(20, 8000, 150)`**: joints rest at exactly 100% of cap, KE 102 → 0.43, no uptick, no
  oscillation. Expected behaviour: with no muscles the body curls from the kick and rests
  bent against its caps — the restoring force toward a target pose arrives with the Ekeberg
  muscles in Phase B. `tsc` + eslint clean. Phase A (body model + passive solver) is now
  complete across A2–A4; A5 (diagnostics) folded into A3's capture re-wire.
- **2026-05-29 (Phase B scoped)** — Explore session mapped the Knüsel CPG + Ekeberg muscle
  math onto our rig and split Phase B into **B1 (CPG signal) → B2 (Ekeberg muscles,
  actuation) → B3 (couple → body)**, mirroring A's signal/integrator/forces decomposition;
  each sub-step has its own gate (see §3). Locked **Decision 5** (control surface = drive
  `d` + global excitability `e`; differential drive deferred to E) and **Decision 6**
  (length-weighted phase bias, `BODY_WAVES ≈ 1.58`). Verified `δ = 0.1` against the PDF
  Table 5 text layer and cleared that flag in the reference. Scope note: Phase B is
  **axial-only** — no limb oscillators (Phase D) and no environment (Phase C), so the body
  undulates in place rather than swimming. OpenSpec changes drafted:
  `add-cpg-network-phase-b1`, `add-ekeberg-muscles-phase-b2`, `add-cpg-muscle-coupling-phase-b3`.
- **2026-06-02 (B1 implemented)** — `openspec/changes/add-cpg-network-phase-b1` builds the
  axial double-chain CPG in isolation (`app/game/locomotion/cpg.ts`): `buildCpgSpec`,
  `initCpgState`, `stepCpg` (2 ms substeps, dt clamped to 50 ms), `oscillatorOutput`,
  `signedActivation`. Intrasegmental left↔right `w=10, φ=π`; intersegmental head→tail `w=5`
  with length-weighted `φₖ = (lenₖ/Σlen)·2π·BODY_WAVES` (`BODY_WAVES = 1.58`); tail→head
  `w=1, −φ`. Constants per Knüsel Table 3: `a=5, b=500, e_axial=1.1, d_th_axial=3`.
  `feedback s=0` (term dropped, not stubbed). Store gains `cpgDrive/cpgExcitability/
  cpgRunning/cpgRecording`; sidebar gains a **CPG (Phase B1)** section (drive + excitability
  sliders 0–2, Run/Pause, Record/Stop). `useLocomotion` steps the CPG each frame on Simulate
  without touching any pivot or root — the body stays at rest. `diagnostics.ts` gains
  `buildCpgCaptureSpec`/`buildCpgSample`/`serializeCpgCapture` with a space-time ASCII grid
  (rows = segments head→tail, cols = time, signed-activation glyph ramp) + per-segment phase
  snapshot + measured fundamental frequency. **Two empirical fixes during the gate run:**
  (a) all-zero phase init left the system in a symmetric equilibrium — neither bilateral
  antiphase nor head→tail asymmetry could escape it — so `buildCpgSpec` now emits
  `initialPhases` seeded at the target steady state (right chain at `π`, left chain a
  cumulative head→tail ramp of `−Σφₖ` mod `2π`); design.md had flagged the lean and the
  empirical answer is "yes, seed both"; (b) the 50 ms record throttle lost data when a
  single useFrame tick ate a huge `dt` (HMR/throttle), so we now push a sample every frame
  and let `subsampleCpgSamples` cap the output. **Gate passed:** at `drive=exc=1.0`,
  measured frequency 1.100 Hz (= `drive·exc·1.1` ✓), maxAbsSignedActivation 2.0, total
  head→tail lag 9.93 rad ≈ `2π·1.58` ✓, space-time grid shows clear diagonal stripes,
  body unmoved.
- **2026-06-02 (B2 implemented)** — `openspec/changes/add-ekeberg-muscles-phase-b2` adds the
  Ekeberg virtual-muscle pair (`app/game/locomotion/muscles.ts`): `ekebergTorque(mL,mR,φ,φ̇)
  = α(Mˡ−Mʳ) − β(Mˡ+Mʳ+γ)φ − δφ̇` with Table 5 constants `α=0.4, β=1.2, γ=0.2, δ=0.1`, a
  10 ms per-segment activation ring buffer, and a test-sinusoid activation source
  (`testActivation(t,k,freq,amp,phasePerSeg)` → antiphase `(1+cos)` pair). `stepSolver`
  gains optional `jointTorques?: number[]` and `jointDampingScale?: number` (default 1 →
  unchanged A4; muscle test passes 0.1) — generalized forces add the muscle torque
  alongside damping + limit stops. `useLocomotion` gains a muscle-test branch
  (mutually exclusive with A-phase Run; CPG preview still independent), a Pause→release
  flag that keeps the muscle solver active with `amp=0` so the body **springs back to rest
  under the β·γ·φ stiffness** (the restoring force A4 lacked), and reuses the existing
  solver capture for recording. Store + sidebar gain
  `muscleTestRunning/Freq/Amplitude/PhasePerSeg` controls; the sidebar Muscle test block
  now has a co-located Record/Stop button. **Two empirical fixes during the gate run:**
  (a) at our rig's scale (`BODY_DENSITY=1` × mesh volume → ~80 kg head segment, ~6 kg·m²
  tail inertia) the paper's `amp=1` produces invisible ~0.5° amplitude — bumped the
  default to `amp=20` and the slider range to `0–50` so the muscle is strong enough
  for our mass scale, while keeping Table 5 constants paper-faithful; (b) fully
  suppressing A4's `JOINT_DAMPING=20` left the spring-back at damping ratio ζ≈0.03
  (slow ooze, visually indistinguishable from "stuck"), so the muscle test now passes
  `jointDampingScale=0.1` (= effective `D=2`) which makes the active drive still visible
  (~9° per joint) AND the release spring-back nearly critically damped — KE decays
  5 → 0.13 in ~3 s in capture. **Gate passed:** all 10 joints oscillate within caps,
  KE bounded, body wriggles in place (`maxCOMdrift = 5×10⁻⁴` over 18 s), Pause produces
  visible spring-back. The A4/muscle damping interplay open question in the design.md
  resolved in B2 itself via `jointDampingScale` (rather than deferred to B3).
- **2026-06-04 (B3 implemented — Phase B complete)** —
  `openspec/changes/add-cpg-muscle-coupling-phase-b3` couples the B1 CPG to the B2 Ekeberg
  muscles into the A4 body solver: `useLocomotion.ts` gains a coupled branch that runs the
  pipeline `stepCpg → oscillatorOutput · CPG_TO_MUSCLE_GAIN → delay buffer → ekebergTorque
  → stepSolver(…, jointDampingScale=0.1)` each frame, with one clock and two integrators
  (CPG state ≠ body state; `s=0`, no body feedback into CPG). `jointToCpgSegment[i] =
  bodySpec.joints[i].segmentIndex` (the joint's child axial segment); off-by-one would
  manifest as a wave that doesn't travel head→tail, so we pin the indexing once and reuse
  it. Store gains `coupledRunning` plus mutual-exclusion setters (A-phase Run / CPG
  preview / Muscle test / Coupled are now four modes, exactly one active at a time, with
  `setAnimateTab('calibrate')` clearing all). The standalone CPG preview branch suppresses
  itself while coupled runs so the CPG isn't double-stepped. Sidebar gains a **CPG drive
  (Phase B3)** block with Run/Pause + co-located Record/Stop, reusing the B1 drive +
  excitability sliders. `diagnostics.ts` gains `serializeCoupledCapture` that emits the
  A3/A4 body section (per-joint angle, KE, COM, `maxJointFracOfCap`, node polyline, ASCII
  top-down) followed by the B1 CPG space-time section, so the commanded wave and the
  body's response are side-by-side in one file. **Empirical fix during the gate run:**
  raw CPG output (`r·(1+cosθ)`, max ≈ 2 at `drive=1`) is the same magnitude as B2's
  rejected `amp=1` baseline and produced ±1–4° per-joint motion at our rig's mass scale;
  added `CPG_TO_MUSCLE_GAIN = 60` (matching the empirical B2 finding — Table 5 constants
  stay paper-faithful, the gain absorbs the body-mass mismatch). At `gain=60, drive=1.0,
  exc=1.0`, the verified behaviour: CPG space-time is a clean head→tail wave (max
  activation 2.0 per segment); the body undulates with head-anchored / tail-whipping
  amplitude (j0..j6 ±1–3°, j7 ±8°, j8 ±18°, j9 ±14°) — the classic undulation pattern of a
  free chain whipping at its lighter end, expected without environment (Phase C). KE
  bounded peak 16.4 → 3.5, `maxCOMdrift = 9×10⁻⁴` over 2.8 s, all joints inside caps,
  no NaN. `BODY_WAVES = 1.58` (paper value) kept — the wave clearly travels through the
  body; finer wave-count tuning is a Phase C concern once drag shapes the body's
  response. **Phase B complete (B1 + B2 + B3): controller + actuation + coupling are
  built, gated separately, and gated together.** Next: Phase C (environment / drag / net
  thrust) — only then will the body translate.
- **2026-06-04 (Phase C implemented; rig-morphology limitation discovered)** —
  `openspec/changes/add-environment-phase-c` adds the anisotropic resistive-force drag
  environment: `app/game/locomotion/environment.ts` computes per-segment
  `F_drag = −L · (C_n · v_⊥ + C_t · v_∥ · t̂)` and an angular drag `τ_drag = −L · C_ω · ω`
  reusing the solver's existing kinematic Jacobians, then assembles a generalized-force
  contribution `τ_env[c] = Σᵢ (Jᵥₓ[i]·Fₓ + Jᵥz[i]·F_z + Jω[i]·τ_drag)`. `stepSolver` gains
  an optional `environmentEnabled?: boolean` threaded through `integrateSubstep` →
  `generalizedForces` so drag is recomputed inside the substep loop and tracks the
  substep-current `(q, qd)`. With the flag off, all prior A4/B2/B3 captures reproduce
  unchanged. Store + sidebar add a single `environmentEnabled` toggle (default off,
  independent of the four run modes, sticky across mode switches). The A-phase / muscle
  test / coupled branches all pass the flag through to `stepSolver`. **Limitation
  discovered during the gate run:** the implemented model is correct per the paper's
  swimming math, but the **rig is a four-legged lizard with a head-heavy mass
  distribution** (segment 0 head mass `78.7` vs tail segments `7–22`, ≈10× ratio).
  Knüsel 2020 / Lighthill RFT assume the body bends as a **continuous travelling wave
  with roughly uniform per-segment amplitude** — the wave's lateral velocity, integrated
  along the entire body, produces forward thrust. With our rig the CPG-driven wave
  collapses into a **head-anchored / tail-whip** mode: head + chest joints wag ±3°, tail
  joints wag ±15–25°. That is not a coherent travelling wave; it is a paddle stroke.
  Lateral-velocity integration along the body therefore gives near-zero net thrust, and
  the tiny net drift that does appear is in the wrong direction relative to head heading
  (tail-leading rather than head-leading). Tuning attempts: `(C_n, gain) = (12, 60)` →
  tiny correct-direction drift `4×10⁻²` units (≈ 0.001 BL/s); `(60, 60)` → over-damped,
  motion collapses; `(60, 240)` → chaotic standing-wave mode (every-other-joint flipping,
  joint 6 saturates at `t=0.01`, KE peaks 418, drift 0.73 in wrong direction); `(30, 80)`
  current — clean coordinated wave but still tail-whip-dominated, drift 0.34 in wrong
  direction. No tuning of `C_n, C_t, C_ω, CPG_TO_MUSCLE_GAIN` produces clean head-leading
  swimming, because the limitation is **morphological**, not parametric: the rig cannot
  bend evenly enough along its length. **Phase C is therefore marked complete as
  implemented (every spec requirement passes, every scenario is mechanically reproducible)
  but the visual swimming gate is not achievable on this rig.** It would re-test on an
  eel- or salamander-shaped rig with uniform per-segment mass. Final constants:
  `DRAG_NORMAL = 30, DRAG_TANGENT = 2.5, DRAG_ANGULAR = 1.5, CPG_TO_MUSCLE_GAIN = 80`.
  **Next: Phase D (limbs + ground contact + friction)** — the lizard rig was authored
  for walking, not undulatory swimming. Phase D adds the actuation path the rig actually
  matches.
- **2026-06-04 (explore — mass model reworked; Phase C re-opens before Phase D)** — Traced
  the "segment size affects locomotion" symptom to its root: animation never touches the
  meshes (rule 4 holds in the render direction), but `buildBodySpec` derives each segment's
  **mass from the mesh bounding-box volume** ([body.ts:130-132](app/game/locomotion/body.ts#L130-L132)),
  so the 3D art leaks into the dynamics — the ≈10:1 head:tail mass ratio is what produced the
  head-anchored tail-whip and blocked the Phase C swimming gate. **Locked Decision 7** (§2):
  weight is authored per node (default uniform, mesh-decoupled, ~1.5 kg medium-dog-head
  anchor), inertia derived from weight + length, configurable in Calibrate (reuse
  `LimitSlider`; new `BodyGroup.nodeWeight?`; legs ganged). Amended the now-wrong
  "mass/inertia from the mesh" wording in Part 8 rule 2, L1, §1 rule 7, `locomotion.md` rule 4,
  and reference §8. **Decision: re-open Phase C (swimming) on the new uniform body before
  Phase D.** Sketch of the Phase C re-open change (to be drafted as its own OpenSpec change
  when we exit explore):
  1. **Body model** — add `nodeWeight?` to `BodyGroup`; in `buildBodySpec` replace
     mesh-volume mass with `nodeWeight` (default `DEFAULT_AXIAL_WEIGHT ≈ 1.5`, plus a leg
     default), and derive `inertiaAboutComY` from weight + segment length (rod `m·L²/12` with
     a standard cross-section) instead of mesh extents. Mesh stays render-only.
  2. **Authoring UI** — a per-node weight slider in `CalibrateTab` reusing `LimitSlider`; the
     4 legs share one ganged value; persists in the saved config like `angleCaps`.
  3. **Re-tune** — re-fit `CPG_TO_MUSCLE_GAIN` and `DRAG_NORMAL/TANGENT/ANGULAR` from scratch
     at the new ~50× lighter, uniform scale.
  4. **Gate** — the swimming gate that Phase C could not pass: a clean head→tail traveling
     wave that nets **head-leading** forward translation (not tail-whip), COM advancing along
     heading. This is the gate Decision 7 exists to unblock.
  Phase C's original change is left archived as-is; the re-open is a *new* change that
  supersedes its mass model. Phase D follows once swimming passes.
- **2026-06-05 (`add-uniform-mass-model` implemented; swimming passes — the real bug was a
  reversed CPG→joint mapping)** — Implemented Decision 7: `BodyGroup.nodeWeight` authored in
  Calibrate (legs ganged), `buildBodySpec` mass from weight (default uniform `1.5`) + inertia
  from weight·length, mesh fully off the dynamics. Re-tuned at the new ~50× lighter scale:
  `CPG_TO_MUSCLE_GAIN = 12`, `DRAG_NORMAL/TANGENT/ANGULAR = 0.6 / 0.05 / 0.03` (ratio 12 kept).
  **But the uniform body still swam backward** — and a headless first-principles test
  (`scripts/locomotion-drag-direction.ts`) isolated why: the drag is correct (a clean head→tail
  wave nets head-first thrust), the free-body recoil is fine, morphology is fine, COM offset is
  fine — the defect was a **reversed CPG→joint mapping** in `useLocomotion.ts:205`,
  `jointToCpgSegment = n - 1 - segmentIndex`, which fed the head→tail CPG wave onto the body
  **tail→head**, so it swam backward. This was **pre-existing** (added in Phase B3/C, probably
  to mask the heavy-body tail-whip backward drift) — not caused by the mass change, but it was
  the actual reason the Phase C swimming gate never passed. Fixed to `jointToCpgSegment =
  segmentIndex`. **Result: the body swims forward (head-first), graceful, no sloshing.** Best
  look at `cpgDrive = 2.0` (large amplitude) + `cpgExcitability = 0.09` (slow ~0.2 Hz beat) —
  set as the new store defaults. Forward COM drift ~0.2 body-lengths over ~4 s; **direction +
  monotonicity are the gate, absolute thrust speed is deferred** (joints currently ride their
  caps at these settings — amplitude is cap-limited; thrust/look fine-tuning happens after
  Phase D). The headless test is kept as a swim-direction regression guard. Next: finish/
  archive this change, then **Phase D (walking — limbs + ground contact)**; legs are still
  pure render passengers (no dynamics) until then.
- **2026-06-06 (`replatform-body-rapier-3d` implemented — Phase C-3D; Decision 8)** — The body
  is rebuilt as a chain of **3D Rapier rigid bodies** (`body3d.ts`) from the node skeleton, the
  proven CPG→Ekeberg controller drives the engine's **axial revolute joints** (yaw-only), the
  RFT drag is generalized to 3D (`environment.ts`), and the rig renders from engine transforms;
  the planar `solver.ts`/`body.ts` are deleted. Rapier world: gravity off (neutral buoyancy),
  fixed timestep `1/120` with a substep accumulator, `f32` deterministic same-machine. Mass =
  `nodeWeight` via `collider.setMass` (engine derives inertia; head yaw inertia ≈ 1.49). Four
  stability fixes were needed to make the real curved rig behave (see the change's design.md
  "Stability findings"): **(1) world-aligned bodies** — only the capsule collider is rotated to
  the segment forward, so every joint's yaw axis stays world-up and a curved rest pose doesn't
  snap; **(2) `JOINT_DAMPING_3D = 2`** to match the planar mode's effective joint damping;
  **(3) gain 12 → 1** because Rapier's revolute limits are soft and the planar gain blew through
  them; **(4) semi-implicit drag** — the resistive drag is applied as exponential velocity
  damping (`v ·= exp(−C·L·dt/m)`) **after** `world.step()`, not as an explicit pre-step force.
  The explicit force was dissipative at every sample yet ran kinetic energy away (KE 79,000 by
  45 s, body floating/tumbling) because forward-Euler overshoots between steps — worse at high
  `C_n`, so lowering `C_n` was not an option (it would kill the ≥10:1 anisotropy thrust needs).
  The semi-implicit form is unconditionally stable and strictly dissipative at any coefficient,
  so `0.6/0.05/0.03` hold and the body swims **head-first** with KE bounded (30–440 over 60 s)
  and no out-of-plane float (`comY` pinned at 0). Validated headless on straight + curved +
  3D-curved rigs (`scripts/locomotion-3d-swim-check.ts`). Remaining before archive: the
  **browser visual gate** (task 8 — confirm in-studio the rig swims head-first and stays
  bounded over a long run) and OpenSpec validation. Swim speed/feel tuning is deferred (AZ-33).
  Next: pass the browser gate, archive, then **Phase D (walking — limbs + gravity + ground
  contact)**.
- **2026-06-06 (observation loop built; truthful render fix; swim drive re-tuned)** — Built a
  repeatable **visual observation loop** (`documentation/observation-loop.md`, `npm run observe`,
  `scripts/observe-swim.mjs`): a headless chromium drives the real studio and screenshots the 3D
  canvas from front/top/3-4 angles over time, so behaviour is *seen*, not inferred from top-down
  numbers that are blind to vertical lift-off. Using it immediately exposed that the studio drew a
  **kinematic puppet** (joint yaw-angles hung under a root set to the head body's full 3D tilt),
  not the simulated body — so the head tilting swung the whole drawn creature into the air and it
  *looked* like it flew off and went insane, while the physics stayed bounded and low. Fixed: each
  chain segment is now drawn at its **actual Rapier body transform** (`AnimatedModel` BodyMount +
  `useLocomotion`), so the render equals the simulation. With that, the body verifiably stays
  grounded and bounded. Then ran a **drive/excitability tuning sweep** through the loop: the old
  defaults (drive 2.0, exc 0.09, ~0.2 Hz) gave a slow, tightly-curled, cap-saturated undulation;
  **drive 3.0 / exc 0.15 (~0.5 Hz)** roughly triples forward drift with a cleaner, more extended
  traveling wave, still grounded and bounded — set as the new store defaults. The CPG is finicky
  (e.g. 3.5/0.13 and 4/0.12 are dead zones — no oscillation; exc ≳ 0.18 collapses to a standing
  wave). Remaining for AZ-33: front-end bunching, occasional joint-cap saturation, slow late-run
  yaw wander, and leg passengers splaying (Phase D). The observation loop is now the standard way
  to evaluate any locomotion change.
- **2026-06-06 (root-cause: out-of-plane instability; planar projection fix)** — The swim was
  still "going crazy / floating off the floor / uncoordinated after the first impulse." Instrumented
  the diagnostics with **per-body tilt° (off-horizontal) and comY (vertical drift)** — previously the
  live diagnostics had no vertical metric at all, so floating was invisible. Fine-grained onset
  capture (0.3s cadence, via `observe-swim.mjs fine`) gave the mechanism unambiguously:
  the body **tips out of the horizontal plane within ~0.6s** (tilt 0.8°→6.5°→16°) — *before* any
  joint hits its cap — and this is **internal** (identical with drag OFF). The float and the
  decoherence are both **downstream of the tilt**: with drag on, thrust along the now-tilted body
  has a vertical component → it "swims upward" (comY climbs only when drag is on); and the
  yaw-only joint angle/rate readback + torque axis become invalid off-plane → the wave decoheres
  and caps get slammed. Root cause: nothing constrains the swimmer to its plane (gravity off, free
  6-DOF head), and the actuation torque (about each body's own tilting up-axis) + the non-horizontal
  rig seed the tilt. **Isolating experiment:** hard per-body DOF locks (`setEnabledTranslations/
  Rotations`) — *enforced* planarity (tilt/comY→0) but **over-constrained the revolute chain and
  blew up** (KE 1e23, NaN). **Fix:** a **soft post-step planar projection** (`planarProject` in
  body3d, called like the drag after `world.step()`): per body zero the out-of-plane velocity, snap
  height to rest, strip pitch/roll (keep yaw). Result: **tilt = 0.0° and comY = 0.000 for the whole
  run**, no explosion, and forward drift *improved* (~11.5 over 14s). Floating and floor-orientation
  loss are resolved; the body stays flat and swims. `PLANAR_SWIM` flag gates it — full 6-DOF (flag
  off) returns for the climbing phase, which will need its own out-of-plane stability work. Still
  remaining (now a *separable in-plane* problem): joints still saturate at peaks and the front
  bunches — amplitude tuning, AZ-33.
- **2026-06-07 (ROOT CAUSE found + fixed: explicit muscle torque pumped energy → Rapier motor)** —
  The "uncoordinated feedback loop / joints slamming caps" was finally isolated on the headless
  bench (`locomotion-3d-swim-check.ts`, energy-conservation mode: no browser, no projection, no
  drag, no gravity, flat rig). With **zero external energy source the KE still climbed from ~0 to
  hundreds** and the joints hit their caps — proving the core CPG→muscle→body loop was *creating*
  energy. Ruled out everything else by isolation: widening the caps to ±180° gave an identical
  runaway (caps were a *symptom*); a 4× finer timestep slowed it (numerical fingerprint); more
  damping fought it but killed the motion. **Cause: the Ekeberg torque was applied as an explicit
  external torque each Rapier step, and explicit integration injects energy** (same class as the
  earlier drag runaway). The prior `JOINT_DAMP = 2` was a band-aid that only slowed it. **Fix:**
  the Ekeberg law `T = α(mL−mR) − β(mL+mR+γ)φ − δφ̇` is algebraically a spring-damper
  `−kStiff(φ−φEq) − δφ̇` (`kStiff = β(mL+mR+γ)`, `φEq = α(mL−mR)/kStiff`); drive it through the
  revolute joint's **ForceBased motor** (`configureMotorPosition`), which Rapier integrates
  **implicitly** → energy-stable. This is **faithful** — identical equation and constants; the
  explicit application was the actual deviation. Dropped `JOINT_DAMP`, restored the paper's
  **δ = 0.1**. Result (headless + browser): KE flat ~0.1 (was → hundreds); joints undulate 20–34%
  of cap with drag on (no slamming); smooth monotonic swim (drift 0→3.47/14s); and **out-of-plane
  tilt fell from 180° to 4–9° even with the planar lock OFF** — the tumble was mostly the same
  pump. The body now does a coordinated, extended, stable traveling wave. Bodies must be kept awake
  (`wakeUp` each step) since the motor doesn't auto-wake. Next: tune swim amplitude/speed up from
  this stable foundation (the planar projection is now a gentle cleanup, not a band-aid).
- **2026-06-07 (swim calibrated on the stable foundation)** — With the energy pump gone, tuned via
  the observation loop. Frequency is *not* the lever (raising it collapses amplitude — the body
  can't undulate faster than its mechanical bandwidth); **amplitude is**, via the muscle active
  gain α. Swept α at the best (low) frequency: α 0.4→1.0 takes drift 2.3→8.7 with the joints using
  their *full* range (peak 100%, avg 95%) but **not pinned**; α≥1.3 just rides the cap for marginal
  gain. New calibrated store defaults: **`cpgDrive = 2.0`** (was 3.0 — 2.0 gives more amplitude
  R=2 and sits safely below the d_th=3 saturation cliff, where 3.5 goes dead), `cpgExcitability =
  0.15`, **`muscleAlpha = 1.0`**, `muscleBeta = 1.2`, `muscleDamping = 0.1`. Result: clean,
  coordinated, extended traveling-wave swim, KE flat ~1.5, planar, **drift 23 over 16s** (travels
  >1 body length). **Faithfulness ledger** — *unchanged from the paper:* CPG double-chain +
  Table 2 couplings, Ekeberg muscle equation, β=1.2, γ=0.2, δ=0.1, e_axial=1.1, d_th=3,
  BODY_WAVES=1.58, 10 ms muscle delay. *Adapted to our engine/body scale (logic & design intact):*
  (1) muscle integrated via Rapier's ForceBased motor instead of an explicit torque — same equation,
  energy-stable; (2) **α = 1.0 vs the paper's 0.4** — α is a *tuned* gain the paper calls "optimal
  for [its] robot"; our heavier uniform-mass body + our drag have a different optimum; (3) the
  `excitability` knob runs the body-wave slower than the paper's ν=d·e because our body can't follow
  the paper's rate; (4) soft planar projection + `wakeUp`. Remaining cosmetic/non-foundational
  (AZ-33): chunky meshes overlap at bends (thin colliders vs fat meshes), some head yaw.
- **2026-06-08 (planar projection removed; tilt root-caused; gravity+floor standing foundation)** —
  Exploratory branch `fix/local-plane-muscle-axis` (off main, **not yet an OpenSpec change** — to be
  promoted). Removed the **soft planar projection** entirely (function, per-step call, store flag, UI
  "Planar lock", studio hook): it was the last leftover crutch and the swim no longer needs it — with
  the energy pump already gone, the body swims fully (drift ~23/16s) and stays roughly flat (comY ≈ 0)
  on its own. **Root-caused the residual 3–9° out-of-plane tilt:** it is **not** drag (worse with drag
  off), not joint-cap slamming (persists off-cap), but the **rig's non-coplanar rest spine** — the
  authored node heights make the centerline zig-zag, so a flat lateral wave physically rocks the body.
  Decisive test: zeroing the physics node heights drops tilt to **exactly 0.0°** with the swim otherwise
  unchanged. (A segment-local hinge axis was tried — perpendicular-to-segment, a principal axis — and is
  kept for future up/down flex, but it did **not** reduce the tilt; the cause is geometry, not the
  torque axis.) **Gravity + a ground plane** then keep the body down and flat naturally (tilt 2–6°),
  which is the real land foundation — the floor is genuine contact, not a forced projection. **Legs now
  stand:** the rig is authored to stand (sprawled legs, `nodeFoot` at y≈0, body above; hips on the
  spine's `nodeHipLeft/Right` sockets — **the old walk branch built legs from the wrong fields
  `nodeFront/nodeBack`, which were undefined**). Built legs as real capsules from hip socket → `nodeFoot`
  with foot contact + friction, **rigid (fixed) hips**, floor just below the feet; the dragon drops onto
  its feet and rests stably (comY −0.14, tilt ~2°, KE≈0). A motorized-hip *test-sine* gait was prototyped
  then **reverted** — improvised, not the paper's method. **Next (faithful):** read the paper's limb-joint
  section to settle the hip axis + emergent lift, then drive the legs with the paper's **limb CPG +
  piecewise-linear transfer function** (let the diagonal trot emerge from the couplings), and **promote
  this foundation work into a proper OpenSpec change**. All gated by a temporary `GRAVITY_TEST` flag.
- **2026-06-08 (Phase F0 specced + productized; paper limb section read)** — Promoted the foundation
  spike into a proper OpenSpec change **`add-walking-foundation`** (proposal/design/specs/tasks,
  `validate --strict` clean) — the missing rung between 3D swim and walking. Replaced the hardcoded
  `GRAVITY_TEST` flag with a real **`coupledMode: 'swim' | 'land'`** (store + `__studio.mode` +
  sidebar toggle, default swim); world gravity + ground + physics legs are built only in land mode.
  Both verified via the observation loop: **swim unregressed** (drift ~10.7/8s, comY≈0, tilt 5–9°),
  **land stands** (comY settles −0.14, tilt ~2°, KE→~0, sprawled lizard stance, no fall-through).
  Read the paper's **Limb Joints** section and recorded the **paper-vs-ours split** in reference §5:
  the paper fixes the limb *control* (1-DOF, phase→piecewise-linear transfer function, 77% duty by
  speed, PD/position control, trot emerges from Table 2 couplings) but **not** the hip *axis* or any
  foot-lift mechanism (robot hardware) — those are ours to choose and stay flagged. Cadence going
  forward: one spec at a time (F0 → D1 limb CPG → D2 actuation → D3 coupled). Remaining on F0: the
  manual visual gate is a user hand-off.
- **2026-06-08 (Phase F0 archived; Phase D1 limb CPG implemented)** — F0 gate signed off (swim swims
  with a small accepted lean; land stands on its legs; mode toggle rebuilds cleanly) and **archived**
  (`2026-06-08-add-walking-foundation`; +5/~1 requirements merged into `specs/locomotion`). Started
  **D1 (limb CPG signal)** by **porting the faithful limb CPG** from the abandoned walk branch (not
  re-inventing): `buildCpgSpec(segmentLengths, groups?, chainGroupIds?)` appends four single limb
  oscillators (LF/RF/LH/RH) with per-limb excitability (fore `0.8` / hind `0.5`) and `d_th = 1.27`;
  Table 2 interlimb couplings (lateral `w=10`, fore→hind `w=3`, hind→fore `w=30`, all `φ=π`);
  ipsilateral limb↔axial at the girdles (limb→axial `w=30, φ=4`; axial→limb `w=2.5, φ=−4`). Added
  `axialChain` (lengths + group ids), wired the browser CPG preview to build limbs, ported the limb
  diagnostics surfacing + the headless gate `locomotion-3d-walk-cpg-check.ts`. **Signal gates PASS**
  (drive 1.0 vs 2.0): 4.1 diagonal trot emerges from the couplings alone (LF≈RH, RF≈LH, diagonals
  antiphase, hind leads); 4.2 axial lag collapses toward a standing wave when limbs are active
  (−0.06 vs swim 2.64); 4.3 limbs fold first across `d_th=1.27` (limb max 1.07→0, axial holds 2.04).
  No body/legs/actuation (that's D2/D3). tsc + eslint clean.
- **2026-06-09 (Phase D2 — limb actuation, transfer function drives motorized hips)** — Ported the
  faithful piecewise-linear transfer function `phaseToTarget(φ, capStance, capSwing, 0.77)` into
  `limbActuation.ts` (slow stance 77% / fast swing 23%, continuous at the wrap, clamped to caps).
  Land-mode hips changed **rigid → revolute about vertical + ForceBased motor** (`Body3D.hipJoints`
  with `limbIdx`); `useLocomotion` drives each hip to `phaseToTarget(testPhase)` at the diagonal-trot
  offsets (LF+RH together, antiphase to RF+LH) from a **test oscillator** (`stepEnabled` + `stepFreqHz`
  in the store; Step toggle + freq slider in the sidebar; `__studio.step`); step-off holds the rest
  angle so it still stands. **Isolated from the D1 CPG + axial coupling — that's D3.** Gates: the
  headless single-hip bench passes (tracking RMS 5.73°, cap respected, realised stance fraction in
  [0.72,0.82]); on the rig, land+Step-on shows all four legs sweeping (KE pulses, comY≈−0.13 stable,
  tilt ~2°), step-off stands (KE→0). **Foot scrub (no lift) is expected and deferred to D3** (the
  1-DOF vertical hip can't lift; the paper doesn't specify a lift mechanism — ours to choose). tsc +
  eslint clean. Manual visual gate is a user hand-off.
- **2026-06-09 (Phase D3 — coupled walking; IN PROGRESS, not passing, handed off)** — `add-terrestrial-
  walking-phase-d3` is **active/unfinished**. Built: the coupled CPG now drives the land hips (fixed a
  bug — build the CPG from the **axial chain only**; `body.segLength` had the legs appended, corrupting
  the oscillator count). Sweep = `phaseToTarget(limbPhase)`; the trot emerges from the couplings.
  **Foot-lift decision: a *tilted single hip hinge* (option B), NOT the 2-DOF lift in the D3 spec.**
  The 2-DOF series hip (carrier body + lift joint) was tried first and **abandoned** — too compliant to
  hold the body weight (it sank to comY −0.39 / tilt 15°). The tilted single hinge (`HIP_AXIS_TILT=0.5`,
  mirrored L/R) is sturdy (stands at comY −0.147 / tilt 2°) and gives clearance from the sweep arc. **⚠
  The D3 spec/design/tasks still describe the 2-DOF lift and MUST be rewritten to the tilted-hinge +
  step-phase approach before archiving.**
  **Timing fix (the key finding, user-driven):** the legs were stepping *ipsilateral* to the body yaw
  (reinforcing the wander). Added a live **`stepPhase`** offset (store + sidebar slider + `__studio.phase`)
  that re-anchors the transfer function vs the limb oscillator. Swept it: **`stepPhase = π`** (half-cycle
  → *contralateral* footfall) ~doubles forward drift (2.8 vs 1.5 / 12s) and straightens it; set as the
  default. New diagnostic (`serializeLimbTiming`, in the coupled capture): **limb-reach vs girdle-flex**
  table — confirms the right legs now reach forward as their girdle flexes left (contralateral), the rule
  we wanted. Harness: down-spine `side` angle (roll), `MODE/STEP/PHASE` envs on `run`, walk-mode `record`.
  **STILL LOOKS BAD / open problem (the real next step):** in walk mode the **body undulation is
  suppressed** — feet pinned to the floor (friction 0.9) anchor the girdles, and active limbs pull the
  axis toward a standing wave, so the nice swim-mode stride (where the *traveling body wave* swings the
  passive legs forward-on-the-outside / back-on-the-inside) is lost. **Direction for the next agent:**
  stop driving the legs as the primary stride generator; let the **body wave carry the legs** (swim-mode
  look is the target), with the limb CPG doing mainly **foot-lift/clearance + stance**, not a fore-aft
  sweep that fights the wave. Try: much **lower foot friction**, a **weaker/rethought hip sweep**, and
  re-check the **limb→axial coupling strength** (w=30 may over-damp the wave). All committed on branch
  `fix/local-plane-muscle-axis` (latest: step-phase fix `43e2b22` + the girdle-flex diagnostic). D3 gate
  (net-forward + upright + bounded, *looking* like a walk) **not met**. Tilted hinge + step-phase are
  flagged deviations to record in reference §5 when D3 is finalized.
- **2026-06-12 (D3 reset — legs rebuilt around a servo-style hip; horizontal-hold baseline reached)** —
  Stripped the studio back to first principles after the active-sweep approach turned chaotic. Key
  realizations from this session, in order:
  - **The active fore-aft sweep fights the body wave.** The trunk undulation already swings the legs
    (pseudo-stepping); an independently-timed sweep motor layered on top collides with it → jerky
    chaos. The paper avoids this because legs *and* spine are one coupled CPG network (phase-locked),
    not two independent motions. (Restating the prior D3 "next direction" note, now understood.)
  - **Standing wave ≠ a calmer body.** Walking and swimming bend the trunk by the *same* amount; the
    paper's "standing wave" is only a *phase* difference (the bend stops travelling head→tail), not a
    quieter body. So walking = the swim undulation **plus** coordinated legs, exactly as the user argued.
  - **The legs must hold their angle like the robot's servos.** Our hip used a force-based spring motor
    (sags under load → flop) routed through a 2-DOF *carrier* body (the motor gripped a flimsy middle
    link, not the leg). No gain fixed it.
  - **Fix that gave the baseline:** rebuilt each hip as **one direct revolute** (girdle→thigh, mirrored
    vertical axis, capped to the leg's calibrated `[-capSwing,+capStance]`), driven by an
    **acceleration-based** motor (mass-normalized PD = servo-like firm hold). Carrier + lift joint
    removed for now (`Body3DHip.liftJoint` nullable). `Sweep speed` = that motor's gain.
  - **Gate REACHED (horizontal hold):** with Step on, Sweep amount 0, Sweep speed ~3000, the legs stay
    rigidly perpendicular to their girdle while the body undulates — they ride the body wave like the
    paper's servo legs, no flop/lag. Verified visually in the running studio.
  - **Studio cleanup this stretch:** Simulate tab rebuilt as isolated switches/sliders + tooltips,
    sticky Run/Record, persisted config + Reset/Copy; per-foot grip toggles (FL/FR/BL/BR); grip reverted
    to the spherical-joint **pin** (the functional stand-in for friction, since our feet bear no
    belly-borne load); stepping/CPG-preview/swim-land-mode removed earlier.
  - **Still to do (the walk):** (1) **swing** — drive the sweep from the limb CPG phase with proper
    timing so it doesn't fight the wave; (2) **lift** — foot clearance during swing (re-add the second
    DOF, or an offset on the one joint); (3) **standing-wave coupling** — lean on the limb→axial
    couplings so legs + body move as one network. Branch `fix/local-plane-muscle-axis`.
- **2026-06-17 (swim "energy" knob — amplitude/frequency decoupling; managed preset system)** — Two
  pieces of tooling + a tuning result, all on the swim regime (gravity on + ground on + bodyFriction 0
  keeps the body planar; legs off, drag on). **(A) Managed configs in app code (replaces copy/paste):**
  new `app/admin/animate/simPresets.ts` holds a typed named list (`SIM_PRESETS`); a Preset `<select>` in
  the Simulate sidebar applies one via `applySimConfig`; `__studio.preset(name)`/`applyConfig(obj)` hooks
  + harness `PRESET=` / `MUSCLE="a:b:d"` envs let the observation loop apply a full named config or sweep
  the Ekeberg muscle in one call. The old "Paste config" textarea was retired (superseded); "Copy config"
  stays (how a tuned state is read out into the file). The three `documentation/sim-presets/*.json` are
  now seeded into the TS list and are redundant. **(B) The energy result (the user's goal):** the user
  wanted one knob where high energy = high amplitude + high frequency and low energy = low frequency but
  *still high amplitude*. The blocker was that at fixed drive, raising **excitability** (frequency)
  *collapsed* amplitude (maxJ 90%→52%→31% as exc 0.3→0.9) — the muscle couldn't follow at speed
  (mechanical bandwidth). **Fix: make the muscle strong + elastic so joint amplitude saturates at the
  angle cap across the whole drive range** — then **Drive itself becomes the energy knob** (it still sets
  ν=d·e, so frequency + KE scale with it) while amplitude stays maxed. Tuned **α=22, β=35, δ=6** (raise α
  for high-freq reach, drop δ from ~30 so fast motion isn't damped out, keep β=35 elastic to stop cap
  overshoot). Verified drive 0.5→2.5 at exc 0.5: **maxJ pinned ~100%** at every drive, planar (comY~0,
  tilt 1–4°), KE scales ~20× (15→300). Saved as presets **Swim energy — low/mid/high** (drive 0.7/1.5/2.6).
  *Faithfulness:* no internal CPG/muscle logic changed — α/β/δ are the paper's exposed Ekeberg gains
  (α "optimal for its robot"; ours is a documented scale adaptation, same as the α=1.0-vs-0.4 note above).
  *Caveat:* gravity-OFF pure swim (no floor) tumbles at high amplitude+frequency (comY→1–4, tilt 30–137°)
  because nothing constrains the plane — the floor is the planar constraint, so the swim regime keeps
  gravity+ground on with zero body friction. *Open:* the render still clumps at bends (AZ-33 chunky-mesh
  overlap) so the wave is hard to read visually though the physics is clean; and the single "energy"
  slider itself is not yet wired into the UI (Drive is the de-facto knob with this muscle).
