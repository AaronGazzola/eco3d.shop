# Locomotion

The creature's body is animated by a **central pattern generator (CPG)**: a small network of coupled phase oscillators that produces walking, turning, and standing-in-place behaviour from two scalar inputs (`drive`, `steer`) derived from an attractor. This file is the single source of truth for the locomotion design.

---

## 1. Rules

These hold for every rig, every pose, every frame. Code that violates one is broken.

1. **Bone lengths are constant.** Each body group is a rigid bone — its mesh never stretches.
2. **Hips are welded to the spine.** `nodeHipLeft` / `nodeHipRight` are fixed offsets in their owning spine group's local frame.
3. **One BodyGroup = one rigid bone.** To bend mid-piece, split into two groups in the studio — never at runtime.
4. **Nodes are the only authoring surface.** Animation moves studio-placed nodes only; it does not invent attach points or bypass the skeleton.
5. **Studio angle caps are sacred.** The CPG's output is clamped to each joint's `angleCap` before being applied. Code may clamp tighter for a single frame; it never raises, overrides, or substitutes caps.
6. **Feet stay grounded during stance and lift smoothly during swing.** A foot never teleports. Its world position changes only via a swing arc between stance phases.

---

## 2. Model

The CPG is a network of phase oscillators. Each oscillator carries two state variables:

- **`θ_i`** — phase, in radians.
- **`r_i`** — amplitude (envelope).

Each oscillator has two intrinsic parameters that the controller writes each frame:

- **`ν_i`** — intrinsic frequency (Hz).
- **`R_i`** — target amplitude.

### State equations

The phase rotates at its intrinsic frequency and is pulled toward each neighbour `j` it is coupled to:

```
dθ_i / dt = 2π · ν_i  +  Σ_j  w_ij · r_j · sin(θ_j − θ_i − φ_ij)
```

The amplitude relaxes toward its target via a critically-damped second-order response:

```
d²r_i / dt²  =  a · ( (a / 4) · (R_i − r_i)  −  dr_i / dt )
```

`a` is a gain constant (`≈ 10`); the exact form is from Thandiackal et al. (2020) §2 and produces a smooth amplitude transition without overshoot.

### Output

Per-segment yaw and per-leg phase are read out as:

```
yaw_i        = r_i · cos(θ_i)                  (axial oscillators)
foot_phase_i = θ_i mod 2π                      (limb oscillators)
```

Yaws are then clamped to the segment's studio `angleCap.yaw` before being applied.

---

## 3. Topology

The oscillator network is built once from the studio's group config.

- **Axial oscillators**: one per body group in the cascade chain (`buildCascadeChain` — head → spines, ordered head-first to tail-first hip).
- **Limb oscillators**: one per hip socket that has an attached leg. A studio segment with both `nodeHipLeft` and `nodeHipRight` and matching `leg-left`/`leg-right` groups contributes two limb oscillators.

### Couplings

| Coupling | Connects | Phase bias `φ` | Strength `w` |
|---|---|---|---|
| Axial-neighbour | each axial oscillator ↔ its next-toward-tail neighbour | small (≈ 0.2 rad) | high (≈ 5) |
| Limb-to-girdle | each limb oscillator ↔ the axial oscillator of its owning hip segment | 0 | high (≈ 5) |
| Limb-pair (gait) | the four limb oscillators carry static phase offsets baked into their `θ_i` initial values | — | — |

The phase offsets between limbs determine gait. Default = **diagonal trot**: front-left and rear-right share phase 0; front-right and rear-left share phase π.

---

## 4. Inputs and outputs

### Inputs (per frame)

| Symbol | Range | Meaning |
|---|---|---|
| `drive` | `[0, 1]` | locomotion speed; 0 = stand still, 1 = full walk |
| `steer` | `[-1, 1]` | turn rate; negative = left, positive = right |
| `dt` | seconds | frame time |

### Outputs (per frame)

- Per-axial-segment target yaw (radians) — fed to the existing pivot quaternion logic.
- Per-limb phase (radians) — fed to the foot logic to schedule stance and swing.

Outputs are pure functions of CPG state. No solver, no projection, no strain calculation.

---

## 5. Studio mapping

The CPG network is fully derived from studio data. No hand-wiring per rig.

| Studio concept | CPG role |
|---|---|
| Spine group in cascade chain | one axial oscillator |
| Hip socket (`nodeHipLeft` / `nodeHipRight` + matching leg group) | one limb oscillator |
| Group adjacency in cascade chain | axial neighbour coupling |
| Hip socket parent segment | limb-to-girdle coupling target |
| `angleCap.yaw` | amplitude clamp for the axial output |
| `angleCap.yaw` / `angleCap.yawBack` on leg groups | leg IK rotation clamp (unchanged from existing rig code) |
| `nodeFoot` rest offset | foot home position for stride placement |

Adding a spine segment in the studio adds an oscillator. Removing a leg removes a limb oscillator. Changing bone lengths changes the rendered geometry but does not change the oscillator math. The same code path runs for a snake (no limb oscillators), a four-legged lizard, or a centipede (many limb oscillators with evenly spaced phase offsets).

---

## 6. Attractor mapping

The attractor is a world-space target. Each frame the controller converts it into `drive` and `steer`.

```
distance     = |attractor_xz − head_xz|
signedAngle  = signedAngleBetween(head_forward, attractor_dir)   ∈ [-π, π]

drive  = clamp( (distance − close_radius) / drive_falloff, 0, 1 )
steer  = clamp( signedAngle / steer_falloff, -1, 1 )
```

Steer is applied as a static yaw bias added to every axial oscillator's output (proportional to `steer`, clamped to each segment's cap). Combined with the oscillation, this produces a curved-while-walking trajectory rather than a discrete "turn then walk" gait.

`drive = 0` freezes the network at its current pose. The creature stops walking; the head's separate attractor-tracking overlay (decorative, decoupled from CPG) can still rotate within its cap.

---

## 7. Foot stepping

Each limb oscillator's phase determines stance vs swing:

- **Stance band** (`sin(θ) ≥ 0`): foot is grounded at its planted world position.
- **Swing band** (`sin(θ) < 0`): foot is mid-arc, lifting and translating from its previous planted position to its next.

On entering the swing band, the next planted position is computed as:

```
next_planted = hip_socket_world  +  (rest_offset rotated by hip_world_yaw)  +  stride_forward · body_forward
```

`stride_forward` scales with `drive` (faster = longer stride). The forward replant is what translates the body in world over successive step cycles.

On entering the stance band, the foot is registered as planted at its current swing position; it then stays put until the next swing.

---

## 8. Parameters

Starting values for a lizard rig. Tune in the studio's animate panel.

| Parameter | Value | Meaning |
|---|---|---|
| `ν_walk` | 1.0 Hz | oscillator frequency at full drive |
| `c_ν` | 1.0 | drive-to-frequency scaling (`ν = c_ν · drive · ν_walk`) |
| `R_axial_max` | scales to segment cap | maximum amplitude of axial oscillator output |
| `R_limb_max` | 1.0 | maximum amplitude of limb oscillator |
| `w_axial` | 5.0 | axial-neighbour coupling strength |
| `w_limb` | 5.0 | limb-to-girdle coupling strength |
| `φ_axial` | 0.2 rad | axial-neighbour phase bias (small ⇒ standing wave, walking) |
| `φ_limb` | 0 | limb phase lag from its girdle |
| `a` | 10 | amplitude relaxation gain |
| `close_radius` | 1.5 (model units) | attractor distance below which drive = 0 |
| `drive_falloff` | 5.0 | distance over which drive ramps to 1 |
| `steer_falloff` | π/4 rad | angle at which steer saturates at ±1 |
| `stride_forward` | 0.5 (model units) at full drive | foot replant offset per step |
| `lift_height` | 0.3 (model units) | swing-arc peak height |

Gait pattern: diagonal trot by default. Initial phases:

```
front-left  : 0
front-right : π
rear-left   : π
rear-right  : 0
```

---

## 9. Reference

Thandiackal, R., Melo, K., Paez, L., Herault, J., Kano, T., Akiyama, K., Boyer, F., Ryczko, D., Ishiguro, A., Ijspeert, A. J. (2020). *Reproducing Five Motor Behaviors in a Salamander Robot With Virtual Muscles and a Distributed CPG Controller Regulated by Drive Signals and Proprioceptive Feedback.* **Frontiers in Neurorobotics**, 14:604426.

https://www.frontiersin.org/journals/neurorobotics/articles/10.3389/fnbot.2020.604426/full

Equations in §2 (Methods, "CPG Model"). Open access, full PDF available without login.
