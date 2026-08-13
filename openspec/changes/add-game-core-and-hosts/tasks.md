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
- [ ] 4.4 Capture the game render of a creature whose genotype resolves to distinct role colours, showing
      motion between two frames and the role colours in force. Blocked until the game surface exists in
      group 5; the plumbing above is proven only by the type check so far.

## 5. The two hosts

- [ ] 5.1 Implement `StandaloneHost`: one actor, actions raised by the page's interface, settings read
      from eco3d, save supplied directly.
- [ ] 5.2 Implement `PlatformHost` reading the rig identity and leg weight from the overlay link, and
      ignoring any `sim` parameter with a `console.error` naming it, so stale studio links are visible
      rather than silently half-honoured.
- [ ] 5.3 Replace the home page with the game surface: the core mounted through `StandaloneHost`, the
      game render path, the existing auth-aware header preserved, and no sign-in required to see it.
- [ ] 5.4 Re-point `/game/embed` at the core through `PlatformHost`, so it no longer mounts the studio's
      scene component and no longer applies a decoded `SimConfig`.

## 6. The studio's overlay link

- [ ] 6.1 Change the studio's overlay link to carry the rig identity and, where set, the leg weight, and
      no encoded `SimConfig`. This is the one deliberate change inside `app/admin/animate/`.
- [ ] 6.2 Confirm the studio's own shareable configuration link is untouched and still restores every
      tuned value in the studio.

## 7. Prove it

- [ ] 7.1 Rebuild, then run `scripts/verify-embed.mjs` against the re-pointed overlay in a fresh context
      with no session: no login form, no sidebar, no grid, page and document transparent, creature moving
      between two screenshots, no console errors.
- [ ] 7.2 Capture the home page and the overlay against the same save and show the same creature doing
      the same thing, which is the evidence that both surfaces mount one core.
- [ ] 7.3 Confirm the studio still runs unchanged: node spheres, grid and diagnostic overlays all still
      available, and a tuning run still reproducible from a studio configuration link.
- [ ] 7.4 Run `openspec validate --strict`.
