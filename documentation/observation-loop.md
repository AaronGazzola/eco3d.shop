# Observation loop — watching locomotion headlessly

The repeatable process for seeing what locomotion actually does, rather than inferring it
from code. Required by the process rules in `animation-criteria.md`: every claim about
behaviour is backed by an observation.

**The loop**

- Isolate the thing of interest, so one behaviour is on screen and nothing else.
- Drive the real studio headlessly, never a separate test rig.
- Capture focused signals, not screenshots, unless the question is visual.
- Change one lever, and only one.
- Compare against the previous capture and against the paper.
- Report with the numbers, then iterate.

**What the page exposes**

- The locomotion studio (`/admin/locomotion`) publishes `window.__loco` every frame.
- The snapshot carries:
  - `t`: seconds since the run started.
  - `drive`: the current drive value.
  - `speed`: the computed forward speed, in world units per second.
  - `totalLagRad`: summed head-to-tail phase lag across the axial chain.
  - `joints`: one entry per axial group, with the group id and its current bend in radians.
  - `nodes`: one entry per axial segment midpoint, in world position, including the root offset.
- Bend and node ordering is head to tail, matching the skeleton chain.

**Capturing a run**

- Build first. The studio is unusable under `next dev`; see the README.
- Open `/admin/locomotion`, load a rig, set the levers, and press Run.
- Sample `window.__loco` on an interval and collect the samples into an array.
- A sampling period of 20 ms over 6 seconds is enough to resolve a wave at normal drive.
- Save the collected array under `documentation/diagnostics/` with the date and the lever
  values in the filename.

**What to look for**

- A travelling wave: each joint's bend peaks later than the joint ahead of it.
  - Plot bend against time per joint, or read the peak times directly.
  - Lag between adjacent joints should be positive and roughly equal along the body.
- Total lag: `totalLagRad` should sit near 9.95 radians whatever the rig's joint count.
- Speed: non-zero and positive while the wave runs, zero when the body is straight.
- Drive response: raising drive should raise both frequency and speed, until drive passes 3,
  where the wave collapses by design.

**Reporting a change**

- State the lever that changed and its before and after values.
- Give the measured numbers, not an impression.
- Include the capture file path so the run can be re-read.
- Where the change is visual, add one image; otherwise numbers are the report.
