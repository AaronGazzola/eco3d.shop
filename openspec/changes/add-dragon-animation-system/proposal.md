## Why

The current dragon animation is a single monolithic `useFrame` loop in `app/game/useCreature.ts` that tangles "what should the creature do" with "how to solve the rig," moves only in the x/z plane, and uses a flat-lerp foot motion that visibly reads as wrong. Iterating on motion or adding a new movement (e.g. the "rise out of egg" hatching beat the home page already calls for) requires editing the whole loop, and the eventual game (breeding, training, and racing dragons) needs many distinct movements that can blend into one another.

A behavior-layered architecture is the popular pattern for procedural creature games (Spore, No Man's Sky fauna, Sonic Frontiers locomotion). It keeps the procedural fluidity the studio's per-model node skeleton was designed for while making each individual movement a small, isolated, AI-friendly file.

## What Changes

- **Split animation into two layers**: behaviors (one file per movement, output a small `DragonDrive` struct of scalar signals) and a solver (single file that consumes `DragonDrive` and writes `joints` / `limb.anchor` / `limb.currentTarget`). A director coordinates which behavior is active and cross-fades drive signals when switching.
- **New `app/game/animations/` subsystem** with `types.ts`, `solver.ts`, `director.ts`, `blend.ts`, `dragon/index.ts`, `dragon/wandering.ts`, `dragon/hatching.ts`, `dragon/constants.ts`.
- **Y-axis support across the rig**: `Chain3D.resolve` carries y through its joint-placement loop; `AnimatedModel`'s `useFrame` reads `joint.y` and `limb.anchor.y` instead of writing 0; foot targets accept a y component (used by the solver's foot-arc layer).
- **Two initial behaviors**:
  - `wandering` — port of the existing target-following logic, visually identical to current motion when no upgrades are applied.
  - `hatching` — one-shot: rises from `-eggDepth` to 0 on ease-out cubic, head pitches up then settles, legs frozen (`legCadence: 0`).
- **Two always-on solver upgrades**: foot arc (parabolic y-lift during step transit) and body banking (lean into corners on heading change). Driven by `DragonDrive` fields so any behavior can scale or disable them.
- **Director cross-fade**: scalar lerp of every `DragonDrive` field over a configurable duration, allowing behaviors to blend without two solvers fighting.
- **Thin `useCreature`**: ~20 lines that instantiate the director and call `director.update() → solver.apply()` per frame.
- **BREAKING (internal)**: `app/HatchingDragon.tsx` no longer scales the dragon from `DRAGON_SCALE_INITIAL → DRAGON_SCALE_FINAL`. The hatching behavior owns the emerge motion. `EMERGE_DURATION_MS` and the scale constants in `app/page.constants.ts` are removed.
- **Studio Animate panel restructure deferred** as an explicit non-goal. The existing `StepAnimate.tsx` sliders keep working unchanged; behavior-specific tuning lives in `dragon/constants.ts` until enough behaviors exist to justify a panel redesign.
- **Non-goals**: tail lag, spine sinusoidal wave, idle micro-noise, behaviors beyond hatching + wandering, any non-dragon creature support, persisting per-dragon behavior tuning to the database.

## Capabilities

### New Capabilities
- `dragon-animation`: the layered behavior/solver/director system that drives dragon motion, plus the initial hatching and wandering behaviors and the y-axis-capable rig solver.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/ -->

## Impact

- **New files** (7): `app/game/animations/types.ts`, `solver.ts`, `director.ts`, `blend.ts`, `dragon/index.ts`, `dragon/wandering.ts`, `dragon/hatching.ts`, `dragon/constants.ts`.
- **Edited files**: `app/game/chain3d.ts` (carry y in `resolve()`), `app/game/useCreature.ts` (collapse to thin director + solver wrapper), `app/game/AnimatedModel.tsx` (read `joint.y` / `anchor.y` in `useFrame`), `app/HatchingDragon.tsx` (drop scale interpolation, switch director behavior on phase change), `app/page.constants.ts` (remove emerge scale constants), `app/page.types.ts` (add `BehaviorId` if needed by the director's external API).
- **Untouched**: `app/game/fabrik3d.ts`, `app/game/modelConfigToCreatureConfig.ts`, all studio code (`app/studio/**`), `CreatureConfig` field shape.
- **Renderer contract preserved**: `AnimatedModel` still reads only `joints`, `limb.anchor`, `limb.currentTarget`. The y additions are purely "now non-zero" — no new fields, no new shape.
- **No external dependencies added.**
- **No database / Supabase changes.**
