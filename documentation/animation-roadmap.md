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
coordination + hip placement.

**The full sim/render mapping** (ties the L0–L8 layers of `locomotion.md §3` to the concrete
rig, in planar mode — Decision 1):

- **Inputs read from the rig** (and nothing else): **N** → build N left/right axial
  oscillator pairs + always 4 limb oscillators; **node spacing** → segment lengths; **segment
  meshes** → mass + rotational inertia; **hip node positions** → attach each leg's coupling
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

1. **Dimensionality → planar (2D, top-down).** _2026-05-27._ The paper's robot runs with its
   axial joints "restricted to the horizontal plane" (PDF p.8) — the locomotion physics is
   fundamentally in-plane yaw. Planar is both faithful to the paper and far more tractable
   in-browser. (Forced by Part 4: we must commit to how the body is built.)
2. **Solver → custom reduced-order integrator.** _2026-05-27._ We need the paper's exact
   force laws — Ekeberg torque, anisotropic resistive-force hydrodynamics, friction. A
   general physics library does not provide resistive-force hydrodynamics out of the box and
   is heavier than required. A custom integrator implements the model directly.
3. **Environment first → swimming.** _2026-05-27._ Cleanest "wiggle → thrust": limbs
   saturate and fold away (Part 2), so there is no gait/leg coordination to get right yet.
   Walking (limbs + contact + friction) comes after, in Phase D.
4. **Rule-6 reinterpretation → foot contact emerges from the contact model.** _2026-05-27._
   The old kinematic "rule 6" scripted feet grounded during stance / lifted during swing.
   In the paper, limbs are 1-DOF sweeps driven toward a transfer-function position and the
   foot's plant / slip / lift emerges from the physics. We adopt that: no scripted plant or
   lift arc (Part 5). (Forced by Part 5: settles how the limb joint is actuated.)

**Pending (to settle):**
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
  Calibrate path preserved. `tsc` clean, eslint clean. Hand-verified visual gate pending.
