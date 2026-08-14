## ADDED Requirements

### Requirement: The game renders an animated creature painted piece by piece

A game render path SHALL draw a creature whose transforms come from the running simulation and whose
colours come from a map from piece to colour, by bucketing each group's pieces by their own colour and
drawing one merged mesh per bucket inside the posed container. A piece absent from the map SHALL use a
neutral fallback.

Colour SHALL belong to the piece, not to the body part. A printed creature is assembled from many small
pieces, each printed in a single filament, so one body part SHALL be able to carry every filament colour
at once. Colouring a whole body part uniformly is a different object and SHALL NOT be what the game draws.

The map SHALL be the render path's only colour input, so that replacing a provisional palette with a
genotype-derived one requires no change to the renderer.

#### Scenario: One body part carries several colours

- **WHEN** the game surface renders a body part assembled from many pieces
- **THEN** the pieces within that one part are drawn in different colours, rather than the part being
  drawn as a single block of one colour

#### Scenario: The creature moves while painted

- **WHEN** the game surface renders a creature
- **THEN** the creature's pieces move under simulation and each keeps its own colour

### Requirement: The game's material is matte

The game render path SHALL draw its meshes with a matte material, with no specular sheen. The studio's
preview material SHALL be unaffected.

#### Scenario: No sheen on a printed creature

- **WHEN** the game surface renders a creature
- **THEN** the surface reads as unfinished print material rather than as glossy plastic

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

### Requirement: The geometry helpers have exactly one home

`partitionSegmentsByColor`, `RoleColoredGroupBody`, `PosedDragon` and the merge helpers SHALL exist only
in `app/game/StaticDragon.tsx`. The unused duplicates in `app/game/AnimatedModel.tsx` SHALL be removed,
and the game render path SHALL reuse the exported merge helpers rather than copying them a third time.

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
