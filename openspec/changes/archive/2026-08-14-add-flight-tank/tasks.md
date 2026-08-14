# Tasks — the flight tank (Phase T1)

Scored against `docs/animation-roadmap.md` §6. Metric 1 (foot stillness) is parked and is not scored
here. Metric 4 (attitude) is new, so section 4 builds it before section 5 reads it.

**Build rule.** There is no hot reload. Every app-code change is followed by a production rebuild before
any capture is taken or any link handed over. A running production server keeps serving the old bundle,
so skipping the rebuild captures the previous version of the code and reports it as the new one.

**Evidence rule.** A box is checked only with a result that would have failed had the work not been done.
Every number claimed comes from a capture under `docs/diagnostics/observe/`.

**Warm-up rule.** The first run after a page load straddles the lazy engine build and is not repeatable.
Discard a warm-up before any measurement that will be compared against another.

## 1. Gravity becomes a lever

- [x] 1.1 Done. A gravity value on the config, default −9.81, carried through to a shared link and
      confirmed present in a generated one.
- [x] 1.2 Done — read in the model builder, where the downward pull had been hard-coded.
- [x] 1.3 Done, via a structural key covering gravity and the tank only. The key is shared by the rebuild
      check and the build itself, so the two cannot drift about which levers are structural, and an
      unchanged key does not rebuild.
- [x] 1.4 **Proven inert.** The base swim reproduces its recorded behaviour with the lever added: 16.14 u
      travelled in 12 s, peak 102% of cap, 6 of 10 joints at or over their caps, bend spread 26.5°, girdle
      ratio 0.84 — matching the post-mapping-fix figures already in roadmap §7.
- [x] 1.5 Proven both ways. Gravity at zero with the wave stopped: the body does not fall. Gravity at its
      default with the wave stopped: it does.

## 2. The tank replaces the floor

- [x] 2.1 Done — a tank toggle and three dimensions, defaulting to 60 × 30 × 40 for a 17.8 u body.
- [x] 2.2 Done, and **not as written** in two respects. The six planes sit on their own contact group
      rather than the existing one, for the reason recorded in 2.7. And the tank is centred on the
      creature vertically rather than rested on the old ground height: the overlay showed that a body
      flying at its start height sits along the bottom edge of the window when the tank only extends
      upward. The comparison that anchoring was meant to protect does not need the tank at all, since a
      floor run is simply a run with the tank off.
- [x] 2.3 **Contained, with a stated imperfection.** 90 s at 20 Hz, every sample inside the bounds except
      an overhang of about 2.0 u where the body bulges between hull spheres. Closest approach to each of
      the six walls is now reported on every run.
- [x] 2.4 Half met, and the other half rejected on evidence. No code sets a velocity in response to a
      wall, so containment is contact alone. A visible rebound is **not** achieved — see 2.7.
- [x] 2.5 Confirmed — a 400 × 200 × 400 tank and a 60 × 30 × 40 tank confine the body to correspondingly
      different bounds.
- [x] 2.6 Confirmed by construction: the physics geometry is never rendered, only the rig groups are, and
      the planes additionally carry zero alpha.
- [x] 2.7 **ADDED. Elastic walls were built, measured and rejected.** Contacts are inelastic by default
      and the body simply parked against the glass, so the walls were made springy — first through the
      direct stiffness form, then through the mass-normalised form. Both destabilised the solver
      identically and at the same moment, and that identical failure is what proved elasticity was never
      the variable. Isolating one lever at a time then showed flight alone runs 90 s stable, and a tank
      too large to reach runs 90 s stable, so the destabiliser was **sustained contact** — and the contact
      set was far larger than intended, with every trunk capsule, every belly sphere and all four feet
      striking all six planes at once. The tank now owns a contact group touched by one massless hull
      sphere per segment and nothing else. **This repository had already recorded that failure once**, in
      the note explaining why belly support is off by default, and it was not read before it was repeated.

## 3. The legs are confirmed inert

- [x] 3.1 Confirmed by reading both: drag iterates the trunk list only, and the leg capsules collide with
      nothing.
- [x] 3.2 **Dropped as uninformative.** The legs were already confirmed inert by 3.1 and by the thrust
      impulse reading exactly zero on every capture, so a leg-weight sweep would have measured nothing.
- [x] 3.3 Dropped with 3.2 — it existed only to give 3.2 a comparison.
- [x] 3.4 Confirmed — the reported impulse from foot thrust is zero on every flight capture.

## 4. The harness reports attitude

- [x] 4.1 Done, and it needed a **fix rather than an addition**. Roll was already peak-held and already
      reported through the shared scorer, but measured about a world axis, which equals roll about the
      body only while the body heads along that axis. In a tank the body turns at every wall, so an
      upright body flying across the tank would have read as fully rolled over. Now measured about the
      body's own forward axis, with a near-vertical body returning zero rather than an arbitrary angle.
- [x] 4.2 Done — peak and reversal count print together, with an explicit tumble verdict past 90°.
- [x] 4.3 Proven on a real case rather than a manufactured one: the post-wall runs report a peak roll of
      90.5° and are flagged as tumbling.
- [x] 4.4 Both paths read the same peak-held values from the same capture, so they cannot disagree.

## 5. The flight baseline, and what it actually does

- [x] 5.1 Done — a flight baseline preset carrying its measured numbers and its caveat.
- [x] 5.2 Captured, 90 s at 20 Hz. Numbers recorded in roadmap §7 under 10-Aug-2026.
- [x] 5.3 **Answered, and the anticipated answer was wrong.** Free flight does not tumble: 90 s dead
      level, peak roll 2.67° at 0.7 reversals per second, height drift under 0.13 u. Level flight turns
      out to be a property of the wave and needs no active control, so the trap Decision 15 anticipated
      did not bite. What tumbles the body is a **sustained wall press**, which reaches 90° of roll and
      ends with the body against the ceiling. Consequence: level flight is **not** pulled forward.
      Turning is what the phase needs next.
- [x] 5.4 Reported. Flight is faster (2.16 u/s against 1.53), evener (girdle ratio 1.00 against 0.84,
      bend spread 22.3° against 26.5°) and clips harder (8 of 10 joints at or over cap against 6).

## 6. The overlay

- [x] 6.1 Done — the follow camera is replaced by a fixed camera square-on to the tank, its distance
      fitted once from the near face so the near corners cannot fall outside the frustum.
- [x] 6.2 Confirmed — camera position and aim identical at the first and last frame of a run, with
      re-fitting on viewport change only.
- [x] 6.3 **Moved to Linear as AZ-257 and removed from this change**, per the governance rule that a task
      which cannot be finished in this cycle leaves the change rather than lingering unchecked. The size
      cue is still argued rather than shown: perspective is in force and the fit is measured from the near
      face, but no near-face against far-face pair was photographed. Nothing depends on it, and the
      overlay's framing is re-checked end to end once the Vids.Tube contract exists, so photographing it
      now would prove it for a configuration that is about to change.
- [x] 6.4 The studio camera path is untouched; the fixed camera is used by the overlay page alone.
- [x] 6.5 **PASS** on a fresh context with no session: no login form, no sidebar, no grid, page and
      document both fully transparent, alpha drawing buffer, creature moving between two screenshots, no
      console errors.

## 7. Land it

- [x] 7.1 Done — recorded in `docs/animation-roadmap.md` §7 as the 10-Aug-2026 entry, including both
      wrong turns.
- [x] 7.2 Done, at a new location. The handover convention moved to `docs/handover/`, one file per
      session named `TEMP` plus the date, written by `/handover` and read then deleted by `/sync`. The
      old single file at `docs/locomotion-handover.md` was read and deleted on 11-Aug-2026. This
      session's handover is `docs/handover/TEMP-12-Aug-2026.md`.
- [x] 7.3 **Approved by the owner, 14-Aug-2026:** the flight is good enough for now. Recorded as
      approval-for-this-phase rather than as a finished result. Flight refinement is the next phase, and
      the wall press at about 22 seconds is accepted as the known limit that turning fixes.
- [x] 7.4 `openspec validate --strict` reports the change valid, and it is archived.

## Settled by the owner, 12-Aug-2026

- [x] 8.1 **Tank size stays at 60 × 30 × 40.** _Owner, 12-Aug-2026._ A 17.8 u dragon reading small in a
      480 × 320 window is accepted. Shrinking the tank would enlarge the dragon but bring the wall press
      forward from about 22 s, and the wall press is being fixed by turning rather than by geometry. Both
      dimensions remain levers on the config; no further work is carried by this change.
- [x] 8.2 **Recorded, and carried by T2 rather than by this change.** _Owner, 12-Aug-2026._ The gate asked
      for a creature that flies around the tank and bounces off the glass. It flies and it is contained,
      but it does not bounce and it does not turn, so it is watchable for about 22 s. Turning is the
      smallest change that fixes this and wall-aware steering is the real fix; both are refined and built
      under T2, tracked by AZ-218.
