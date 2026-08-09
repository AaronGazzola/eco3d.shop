# TEMP — 2026-08-09 — locomotion handover — DELETE AFTER READING

Disposable. Everything durable here belongs in `openspec/changes/add-wave-shaping/tasks.md` (which has the
detail) and in `docs/animation-roadmap.md` §7 (which does not yet, because the stage is not
finished). Delete this file once read.

---

## Where the work stands

Phase **D-T2**, tracked by the OpenSpec change **`add-wave-shaping`**. The stage shapes the axial body wave;
it is the last step before the preset grid. Sections 1–4 of that change are done. Section 5 is the
shaping itself, and it is now essentially solved — one config passes every pass condition that was pinned
in advance. Nothing has been approved, so **there are still no new presets**.

The owner has not yet opened the candidate links, so the choice in section 5.5 is still open.

## What happened on 8-Aug

Two things changed the picture, one of them the owner's.

**1. The owner raised spine joint 7's cap from 22° to 28°.** That was the choke point. Its 22° limit sat
between neighbours allowed 28° and 30°, in the busiest part of the body, so keeping it legal meant
suppressing the whole mid-body. It clipped in 35 of 48 coarse samples. With it at 28° the mid-body reads
28/28/28/30/30 and the binding joint moves forward to **joint 2 at 23°, which is also the front girdle**.

**2. Foot thrust went back on, and it changes the physics of the problem.** Before thrust, the three §6
metrics were measurably anti-correlated across 80 samples — evening the spine cost speed (+0.58) and made
the girdle pair *less* equal (−0.33). With thrust those correlations do not hold. On one fixed wave shape,
raising thrust 0 → 4 N per foot improves all three at once:

| thrust | speed u/s | bend spread | girdle ratio |
| --- | --- | --- | --- |
| 0 | 0.32 | 10.5° | 1.49 |
| 2 | 1.61 | 6.9° | 1.29 |
| 4 | 2.85 | 6.0° | 1.10 |

The conflict was an artefact of measuring a body that was barely advancing: the drag load on the two
girdles at 0.3 u/s is nothing like the load they carry while actually swimming. **Do not carry the 5.1c
correlations forward as a property of the rig.** They are true only of the no-thrust regime.

## The current best config

Passes every 5.1c pass condition. Not approved — the owner has not opened it.

```
engine mujoco · drag ON · head isolated · legs 0.1 kg
cpgDrive 0.39 · cpgExcitability 0.74 · muscleAlpha 14 · muscleBeta 35 · muscleDamping 6
wave profile  nose 1.0 / shoulder 1.0 / hip 0.7 / tailMid 0.5 / tailTip 0.3
footThrustEnabled true · footThrustGain 4 · shift 0.138 front / 0.638 hind
no grip, no sweep, no lift, no friction
```

| metric | this | old baseline |
| --- | --- | --- |
| per-joint bend, joints 2–9 | **20.2–24.3°** | 13.3–30.3° |
| bend spread | **6.0°** | 17.0° |
| girdle ratio (hind/front) | **1.10** | 1.18 |
| speed | **2.85 u/s** | 0.90 |
| path curvature | **0.53%** | 0.82% |
| joints at their cap | **none** | three |
| roll | 7.0/s at peak 1.40° | 6.1/s at peak 0.80° |

Roll is the one regression. Small, real, above the ~1° floor where the reversal count degrades into noise.
Worth watching, not yet worth acting on.

Three other finalists were captured and are recorded in the change with full numbers: the same shape at
thrust 2 (the slower rung, spread 6.9°, girdle 1.29, 1.61 u/s); a girdle-targeted shape (ratio 0.84 but
spread 17.8°); and an amplitude-targeted one (mean bend 22.6°, spread 10.4°). Note the girdle-targeted
shape is **beaten on girdle equality** by the config above.

Config links were handed over during the session but point at `127.0.0.1:3002`, so they die with that
server. Rebuild them by applying the values above and calling `window.__studio.buildLink()`.

## Corrections to earlier records — read before trusting an old number

1. **Degrees are now taken from the engine, not from node geometry.** The old geometric measure read the
   front girdle at 11.2° where the engine's own joint angle is 20.5°, because a node does not sit on its
   joint frame. Any "peak bend in degrees" figure written before 8-Aug is the geometric one. The 5.1b
   baseline's real figures are spread **17.0°** and girdle **1.13**, not 19.9° and 0.94.
2. **The first run after a page load is not repeatable.** Six identical runs read 8.3° of bend spread on
   the first and 5.9–6.0° on the other five. The MuJoCo driver builds lazily on the first Run, so that
   sample straddles the build. The batch runner now discards a warm-up. **Every single-run capture in this
   change is a first sample**, so single-run bend spreads carry up to ~2.4° of error. Batch numbers do not.
3. **Straightness had two things mixed together.** Lateral travel over distance reports a body swimming
   dead straight a few degrees off the reference axis as 8% "drift". It is now split: heading, and the
   worst perpendicular deviation from a fitted line, which is the real curvature. This nearly caused the
   best config to be rejected for a defect it does not have.
4. **Thrust gain range.** The slider allows −40..40. The usable range is **0–6 N per foot**; 16 launches
   the body at roughly 5 body lengths per second. The tell that something is wrong is head isolation being
   overpowered — the head joint reads ~91% of its cap instead of the ~23% it holds normally. One 60-sample
   sweep was run at gains 8/16/28 and is void on the thrust axis; its gain-0 rows are still good.

## What is next

1. **Owner opens the four finalist links and picks one** (task 5.5). The metrics no longer conflict much,
   so this is mostly a choice about how the wave *looks*: evenest, or largest.
2. **Measure foot stillness on the chosen config** (task 5.1g, the one open item in section 5). It is §6
   metric 1 and it is not in the batch scorer, because it needs the CPG-clocked plant window with
   **separate front and hind shifts** — sharing one shift puts the hind window on the swing, which this
   project has already been burned by once. Use the single-run `--events` path, which handles it correctly.
3. **Then section 6:** add the approved config as a preset carrying its `legWeight`, write the dated D-T2
   entry into roadmap §7, update `docs/locomotion-handover.md` §5, validate and archive.
4. **Then D-T3**, the preset grid: 3 speeds × turn levels. Thrust gain is now the obvious speed axis — it
   spans 0.32 to ~4 u/s on one shape without touching the wave — and `turnBias` is the untested heading
   axis.

## Running the harness

Nothing here needs an app rebuild; the wave sections and thrust already existed, and the joint cap lives in
the rig data, not code. A rebuild IS needed for any change under `app/`.

```
npm run prod:3002                      # from PowerShell, not the bash sandbox
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --legw 0.1 --config path\to\config.json
node scripts/observe-sweep.mjs --n 30 --seconds 12 --legw 0.1 --space scripts/spaces/<file>.json
```

`scripts/observe-metrics.mjs` holds every §6 measurement, shared by both paths so a batch row and a
single-run report cannot describe the same capture differently. `scripts/spaces/` holds the search spaces
that were actually run, each with a note saying why it was aimed where it was.

Captures land in `docs/diagnostics/observe/`, which is gitignored — the JSON carries the exact
config, the per-joint arrays and the link for every run, so an old capture can be re-scored against a metric
that did not exist when it was taken. Today's key ones:

- `sweep-2026-08-08T15-11-03` — the thrust gain ladder on one shape
- `sweep-2026-08-08T15-32-29` — the finalists, on the corrected harness
- `dt2-thrust.pdf`, `dt2-51c-sweep.pdf`, `dt2-51b-drive-cuts.pdf` — the visual aids
