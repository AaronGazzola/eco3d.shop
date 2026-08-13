# Handover — DELETE AFTER READING

**Written 14-Aug-2026. Disposable by design.**

This is a one-shot baton, not a reference. Read it once, act on it, then delete it. Never cite it as a
source and never update it in place in a later session.

> `TEMP-12-Aug-2026.md` may still sit beside this file. It is **superseded**: its work is committed as
> `f1f1105` and its open items are either closed or restated below. Everything in it worth keeping has
> been carried forward here. Read this one, delete both.

## Where the durable record lives

These win wherever this file disagrees with them:

- `docs/game-architecture.md` — **new this session.** The platform seam, eleven locked decisions with
  reasoning, the layer stack, the two tracks, and what is deferred. Architecture questions end here.
- `../Vids.Tube/docs/overlay-platform.md` — **new this session.** The host side of the same contract.
- `docs/roadmap.md` — the two-track split and the G phases.
- `docs/animation-roadmap.md` — decisions, phases, the measured baseline, the dated status log.
- `docs/dragon-genetics.md` — what the genetics layer already does. **Read it before planning genetics
  work;** far more exists than the roadmap's E2 entry suggests.
- `docs/locomotion.md`, `docs/reference/locomotion-reference.md`, `docs/observation-loop.md`.

## What this session changed

**Direction, and it is large.** Vids.Tube becomes a general overlay-game platform; eco3d is tenant one
and gets no privileges a stranger would not get. Written up in the two architecture documents above,
with the reasoning, because these decisions will otherwise be re-litigated.

**A change was promoted and is half implemented:** `add-game-core-and-hosts`, 15 of 22 tasks.

- `app/game/core/` holds the game core: world state, an explicit tick, one `feed` action, and the
  `GameHost` interface with exactly four members.
- `app/game/motion/resolve.ts` maps a primitive name to a preset. `cruise` resolves to the Phase T1
  `flight base`; every other name falls back to cruise and records the fallback.
- The render seam is closed: `GroupBody` in `AnimatedModel.tsx` reads dressing from a context, so the
  whole posed hierarchy becomes role-coloured. `GameCreature.tsx` is the game-facing component.
- Six dead functions were deleted from `AnimatedModel.tsx`, duplicates left behind when the static
  renderer was extracted to `StaticDragon.tsx`.
- `scripts/check-game-core.ts` and `scripts/check-motion-vocabulary.ts` both pass.

**Earlier in the session, already committed as `f1f1105`:** the handover convention moved to
`docs/handover/`, `/sync` reads and deletes handovers and now refreshes skills before it runs rather than
during, `/handover` was added, and the flight tank change reached 32 of 35 tasks.

## What was decided

- **Vids.Tube is a general overlay-game platform**, not a bespoke dragon integration. _Owner,
  12-Aug-2026._ Third-party overlays are an explicit goal, so sandboxed frames are permanent.
- **One capability tier.** Tiers separate review and distribution, never power. Capability granted later
  costs nothing; capability withdrawn later breaks installed overlays.
- **Viewers are pseudonymous until they consent.** The streamer clicks once; most chatters never click,
  and the game must work for the ones who never do.
- **Overlays are self-hosted and proxied through a fixed platform origin**, Discord-style rather than
  Twitch-style. Twitch's upload model would force eco3d's animation code through Vids.Tube's dev server,
  where frame rate collapses.
- **Tank size stays at 60 × 30 × 40**, and the no-turn gap is carried by T2. _Owner, 12-Aug-2026._

## Decisions still owed

- **Owner approval of the flight baseline on the overlay.** A passing gate is not approval, and
  `add-flight-tank` cannot be archived without it.
- **What the base game loop actually is**, beyond the placeholder hunger-and-feed used to prove the core
  runs. Deliberately deferred, but G1 cannot be specced without it.
- **What "augmented" means for the overlay version**, and what a save is when a streamer switches saves.
  Both named as open in `docs/game-architecture.md` §8.

## Pick up here

Finish `add-game-core-and-hosts`, groups 5 to 7. Nothing is half-written: the tree builds, type-checks,
and both check scripts pass, so this is a clean resumption point rather than a repair job.

- **Group 5** is the real work: `StandaloneHost` and `PlatformHost`, the home page replaced by the game
  surface, and `/game/embed` re-pointed at the core.
  - **The scene is not the hard part, and this was checked.** `SceneContent` in
    `app/admin/animate/AnimateScene.tsx` is about 35 lines: it assembles a `ModelConfigRow` from the
    shared store and renders `AnimatedModel` with `showNodes` hardcoded true. A game scene is the same
    shape with `GameCreature`, dressing, and no node flag. Physics keeps running inside `AnimatedModel`
    through `useLocomotion` and `useMujocoLocomotion`, which read `animateStore`, so the simulation is
    still driven by that store and the surface applies the resolved preset into it. `applyPreset` in
    `simPresets.ts` already does exactly that write, including the leg weight, so reuse it rather than
    reproducing it.
  - **The genuine unknown is where the dressing comes from.** `GameCreature` needs `roleTags` and a
    resolved `Phenotype`. `role_tags` live on `dragon_models`, and a phenotype comes from
    `resolveGenotype` over a genotype plus that variant's genes, roles, alleles and filaments. The
    overlay link carries only a rig identity today, which is not the same thing as a dragon. **Settle
    what the save resolves to before writing the hosts:** a `dragons` row, or a variant with a rolled
    genotype. `app/game/dragons/[id]/page.*` already loads this data and is the model to copy.
- **Group 6** changes the studio's overlay link to carry the rig and leg weight but no encoded
  `SimConfig`. It is the one deliberate edit inside `app/admin/animate/`.
- **Group 7** is the proof: rebuild, `scripts/verify-embed.mjs`, a capture of the home page and the
  overlay against the same save, and `openspec validate --strict`.
- **Task 4.4 is still open** and is the one visual claim not yet backed: a capture showing the game
  render moving between two frames with distinct role colours. It is blocked until group 5 gives it a
  surface.

## Traps

- **`npm run build` fails.** It dies prerendering `/` on a missing Supabase environment variable. Use
  `doppler run -- npx next build`. This cost time this session.
- **The pitch limits are placeholders, not measurements.** Every group of both saved rigs reads exactly
  30.0°, the code default, while the sideways limits are genuinely measured and vary 17°–39°. Pitch is
  not physical until the owner measures it (AZ-246). Say "placeholder" in any report using 30°.
- **The D-T2 numbers do not carry into the tank.** All were taken with gravity on, a floor, and foot
  thrust active. The grid is re-measured, never converted.
- **A capture that ends before the failure is not evidence of its absence.** A 30 s flight run was read
  as a pass; a 90 s run of the same configuration showed the body destroyed by 45 s.
- **`AnimatedModel` still accepts `showNodes`.** The game-facing `GameCreature` exposes no such prop, but
  the underlying renderer can still draw nodes. Do not describe the guarantee as stronger than that.
- **AZ-183 and AZ-184 are closed but their bodies describe a codebase that does not exist.** Both carry a
  correction note dated 12-Aug-2026. Read the correction, not the body.
- **Someone else is working in `../Vids.Tube`.** Four files unrelated to this work were modified there
  during this session. Do not commit that repository wholesale.

## Tried and rejected — do not re-propose

- **Twitch's uploaded-bundle hosting model.** Rejected because the review capacity and threat model do
  not exist here, and it would put the animation code behind the host's dev server.
- **Signing into eco3d through the overlay.** Impossible in practice: the frame gets its own partitioned
  storage so an eco3d session in a tab is invisible to it, and an OBS browser source is barely
  interactive. Replaced by a one-time pairing claim from a real browser.
- **Foot grip as a solver pin** (built twice), **keyframe pose cycles for locomotion**, **foot planting
  as a goal**, and **elastic tank walls**. Reasons in `docs/animation-roadmap.md`.
- **Active roll control for level flight.** Measured: free flight holds roll near zero for 90 s unaided.

## How to run it

From PowerShell, never the bash sandbox, which resets Supabase auth. Never observe a dev server: the
studio lags badly enough under `next dev` that what is seen is not what the code does.

```
npm run prod:3002        # build + serve on 3002; run detached so it survives across commands
$env:OBSERVE_RIG='Demo Dragon'
node scripts/observe.mjs run 12 --hz 20 --events --legw 0.1 --config path\to\config.json
npx tsx scripts/check-game-core.ts
npx tsx scripts/check-motion-vocabulary.ts
```

- **Rebuild and restart after every app-code change**, before observing and before handing over any link.
  There is no hot reload; a running production server keeps serving the old bundle. Stop the previous
  server first, the port stays bound. Scripts under `scripts/` need no rebuild.
- **Discard a warm-up run.** The first run after a page load straddles the lazy engine build.
- `scripts/verify-embed.mjs` drives `/game/embed` in a fresh context with no session. Use it for anything
  overlay-facing.
- Auth is cached in `scripts/.observe-auth.json`. Forward axis is **−X**, lateral is **Z**. Captures land
  in `docs/diagnostics/observe/`.

## Repository state

**Nothing below is committed.** The tree builds and every check passes, so committing is safe.

- eco3d: the two new architecture documents, the roadmap edits, the whole
  `openspec/changes/add-game-core-and-hosts/` directory, `app/game/core/`, `app/game/motion/`,
  `GameCreature.tsx`, the edits to `AnimatedModel.tsx` and `StaticDragon.tsx`, and the two check scripts.
- Vids.Tube: `docs/overlay-platform.md` and the roadmap edit are this session's. **The four modified
  files under `app/(app)/live/` are not** and belong to whoever else is working there.
- One branch, `dev`, has been untouched since 13-Feb-2026. Confirm nothing is wanted from it, then delete
  it locally and on the remote.
