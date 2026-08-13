## ADDED Requirements

### Requirement: The game renders an animated, role-coloured creature

A game render path SHALL draw a creature whose per-segment transforms come from the running simulation
and whose colours come from the resolved genotype, by partitioning each group's segments by their
`role_tags` role and applying the simulation's transforms to the partitioned meshes. Components with no
role tag SHALL use the neutral fallback.

#### Scenario: The creature moves and is coloured by its genetics

- **WHEN** the game surface renders a creature whose genotype resolves to distinct role colours
- **THEN** the creature's segments move under simulation and each is painted its role's resolved colour

#### Scenario: The static preview is unaffected

- **WHEN** the dragon detail page renders `PosedDragon`
- **THEN** it renders exactly as before, self-fitting and without simulation

### Requirement: The game render carries no development affordances

The game render path SHALL NOT draw skeleton node spheres, a grid, stance markers, reach markers, or any
other studio diagnostic. Their absence SHALL be structural: the game surface SHALL NOT pass a flag that
enables them.

#### Scenario: Nothing developmental is drawn on the game surface

- **WHEN** the game surface renders a creature
- **THEN** no node sphere, grid, stance marker or reach marker appears in the scene

#### Scenario: The studio keeps every affordance

- **WHEN** the research studio renders the same rig
- **THEN** node spheres, the grid and the diagnostic overlays are all still available there

### Requirement: The role-colour helpers have exactly one home

`partitionSegmentsByColor`, `RoleColoredGroupBody` and `PosedDragon` SHALL exist only in
`app/game/StaticDragon.tsx`. The unused duplicates of all three in `app/game/AnimatedModel.tsx` SHALL be
removed, and the game render path SHALL reuse the canonical helpers rather than copying them a third
time.

#### Scenario: No duplicate definition remains

- **WHEN** the repository is searched for `partitionSegmentsByColor`
- **THEN** exactly one definition is found, in `app/game/StaticDragon.tsx`

## MODIFIED Requirements

### Requirement: Home page is a static landing

`app/page.tsx` SHALL render the game surface for an anonymous visitor: the game core mounted through
`StandaloneHost`, drawing an animated role-coloured creature with no development affordances, with the
existing auth-aware header preserved. It SHALL NOT render a marketing landing page with no scene.

#### Scenario: Landing renders the game

- **WHEN** a visitor loads `/`
- **THEN** the game surface renders with a moving, genetics-coloured creature and the existing header

#### Scenario: No account is required to see the game

- **WHEN** a visitor with no session loads `/`
- **THEN** the game surface renders rather than a sign-in prompt
