# Tasks — the game core and its two surfaces

**Build rule.** There is no hot reload. Every app-code change is followed by a production rebuild before
any capture is taken or any link handed over. A running production server keeps serving the old bundle,
so skipping the rebuild captures the previous version of the code and reports it as the new one.

**Evidence rule.** A box is checked only with a result that would have failed had the work not been
done. A visual claim is backed by a capture under `docs/diagnostics/observe/`.

**Scope rule.** The research studio is the animation track's tool. No task here changes
`app/admin/animate/**` except where a task says so explicitly, and none changes
`app/game/locomotion/**`, the rig pipeline, or the observation harness.

## 1. Remove the duplicate renderer

- [x] 1.1 **Confirmed, and the duplication was wider than the task assumed.** A search for imports of
      `@/app/game/AnimatedModel` across the repository returns exactly one line, `AnimateScene.tsx`
      importing `AnimatedModel`. Every other export of that module was therefore dead, which was six
      functions rather than three: `StaticPosedModel`, `StaticGroupBody`, `useModelFit`,
      `partitionSegmentsByColor`, `RoleColoredGroupBody` and `PosedDragon`, plus `NEUTRAL_ROLE_COLOR`.
- [x] 1.2 All six deleted, along with the now-unused `RoleTags` and `Phenotype` imports. A search for
      each definition now returns exactly one hit, all in `app/game/StaticDragon.tsx`. `npx tsc --noEmit`
      passes, and `doppler run -- npx next build` completes with exit code 0. **Note for anyone
      repeating this:** `npm run build` alone fails while prerendering `/` on a missing Supabase
      environment variable; the build must run under Doppler.

## 2. The game core

- [x] 2.1 Done. `app/game/core/` holds `types.ts`, `host.ts` and `world.ts`. The world carries hunger,
      energy, the requested motion and a feed count; `tick` advances it and `dispatch` applies the one
      action, `feed`. A non-finite or negative delta is logged and thrown rather than ignored.
- [x] 2.2 Done. `GameHost` exposes exactly four members: the save, the settings, the acting actor, and
      the events since the previous tick. Nothing environmental reaches the core by another route.
- [x] 2.3 `scripts/check-game-core.ts`. Two worlds given identical ticks produce byte-identical state,
      elapsed accumulates exactly, and a fed creature's relief is attributed to the actor the host
      reported rather than to a default. **One assertion was wrong and the code was right:** a creature
      ticked 600 s is both hungry and tired, and rest correctly outranks pursuit, so the check now
      asserts pursuit at 300 s and rest at 600 s while still hungry.
- [x] 2.4 In the same script, and stronger than asked: every file under `app/game/core/` is asserted to
      import **only** from within the core, so the transitive graph is the three files themselves. React,
      zustand, three and anything under `app/admin` are each separately named and asserted absent.

## 3. The motion layer

- [x] 3.1 Done. `app/game/motion/resolve.ts` holds the only published-name table and is the only place a
      preset is looked up. It returns the preset rather than applying it, so nothing in the motion layer
      writes to a store.
- [x] 3.2 Done. `cruise` resolves to the `flight base` preset on the MuJoCo engine, which is the Phase T1
      baseline.
- [x] 3.3 Done. An unrecognised name returns the cruise preset with `fellBack` true and the original
      request preserved for reporting. The only throw left is a genuinely missing cruise preset, which
      would be a defect rather than an unbuilt primitive.
- [x] 3.4 `scripts/check-motion-vocabulary.ts`, **kept separate from the core check on purpose**: the
      motion layer imports the studio's preset module, so importing it into the core check would muddy
      the very import-graph claim that check exists to make. It asserts cruise resolves without falling
      back, that all six of `pursue`, `flee`, `rest`, `hold`, `turn` and a nonsense name fall back to the
      cruise configuration while recording the fallback, and that no core file so much as names
      `SimConfig` or a preset.

## 4. The render seam

- [x] 4.1 Done, and **the mechanism is simpler than the design assumed.** The design described applying
      per-segment world matrices; the animated path is in fact a pivot chain of nested scene-graph
      groups, and `GroupBody` is the single place any group's geometry is drawn, used by every posed
      container. Dressing is therefore read there, from a context provided by `AnimatedModel`, and the
      whole posed hierarchy becomes role-coloured without a prop threaded through five components.
      `RoleColoredGroupBody` is exported from `app/game/StaticDragon.tsx` and reused rather than copied.
      Untagged components take that module's existing neutral fallback.
- [x] 4.2 Done at the API level: `app/game/GameCreature.tsx` is what the game mounts, and it exposes no
      node, grid, stance or reach prop for anyone to set. **Stated precisely rather than overclaimed:**
      `AnimatedModel` still accepts `showNodes` because the studio needs it, so the guarantee is that the
      game-facing component has no such affordance, not that the underlying renderer cannot draw one.
- [x] 4.3 Confirmed by inspection: the only change to `app/game/StaticDragon.tsx` is the `export` keyword
      on `RoleColoredGroupBody`. `PosedDragon`, `useModelFit` and the dragon detail page are untouched.
- [x] 4.4 Captured on both surfaces, and **the capture caught a defect the type check could not.** The
      first home-page capture showed a stray cyan dot and an orange marker beside the creature: the foot
      glow and sweep arrow are locomotion diagnostics, mounted hidden and made visible by the locomotion
      hooks, so they surfaced on a dressed creature. Both are now skipped entirely when dressing is
      present, and the re-capture is clean. The creature renders in white, black and tan with no node
      skeleton, no grid and no markers, and moves between frames.

## 5. The two hosts

- [x] 5.1 Done, in `app/game/hosts.ts`. Both hosts share one factory, so they cannot drift apart in what
      they expose.
- [x] 5.2 Done. `readPlatformLink` reads the rig and leg weight, logs and ignores a `sim` parameter, and
      logs a non-numeric leg weight rather than passing NaN into the physics.
- [x] 5.3 Done. The home page mounts the core through `StandaloneHost` and renders the game surface with
      a creature name, a hunger read-out and a Feed button that raises an action into the core. The
      auth-aware admin link is preserved and no sign-in is required. **The one rig that is authored is
      chosen explicitly**, not fallen back to: the standalone game has no link to name one and there is
      exactly one to name.
- [x] 5.4 Done. `/game/embed` mounts the core through `PlatformHost` and no longer imports the studio's
      scene. The tank camera moved to `app/game/TankCamera.tsx` so both surfaces share one fixed camera
      rather than two copies. The link-reading effect became a render-time memo, which removed a real
      lint error rather than suppressing it.

- [x] 5.5 **ADDED. Role tags had to be plumbed through first.** The rig select, `DragonRigRow` and the
      shared store all dropped `role_tags`, so a creature could not be coloured by role at all. All three
      now carry it. The persisted store needs no migration: a persisted state without the field keeps the
      empty default.
- [x] 5.6 **ADDED, and it reversed a plan.** The palette was going to read `filament_colors` filtered to
      available, so the printable set stayed the source of truth. Queried live, that table holds nine
      rows, every one flagged available, and all of them demo or test colours — reading it paints the
      creature in exactly the bright developer colours this change exists to remove. The palette is now
      three named PHA colours in `app/game/palette.ts`, marked provisional, assigned across the variant's
      roles by display order. It is deleted when E2 seeds the palette properly and a creature carries a
      genotype; nothing else changes, because the renderer only ever sees a role-to-colour map.

## 6. The studio's overlay link

- [x] 6.1 Done in `buildConfigLink`. An overlay link now carries the rig, the leg weight and the controls
      flag, and no `sim`, `tab` or `overlay` parameter.
- [x] 6.2 Confirmed by construction: the studio branch of the same function is unchanged, so a studio
      link still carries the tab, the full encoded configuration and the overlay list.

## 7. Prove it

- [x] 7.1 **PASS**, against a link carrying only a rig identity and no configuration: no login form,
      480x320 canvas with an alpha drawing buffer, page and document both fully transparent, creature
      moved over 15 s, no console errors.
- [x] 7.2 Both captured against the same rig by `scripts/capture-home.mjs` and `scripts/verify-embed.mjs`.
      The same creature appears on both, in the same three colours, moving.
- [ ] 7.3 Confirm the studio still runs unchanged: node spheres, grid and diagnostic overlays all still
      available, and a tuning run still reproducible from a studio configuration link. **Not done.** The
      studio needs a signed-in admin session, which the headless drivers used here do not carry, so this
      is a manual check rather than a scripted one.
- [x] 7.4 `openspec validate --strict` reports the change valid.
