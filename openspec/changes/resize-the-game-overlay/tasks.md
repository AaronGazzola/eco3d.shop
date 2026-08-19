## 1. The tank takes the window's shape (eco3d)

- [x] 1.1 Create `app/game/tankForBox.ts` exporting `tankForBox({ width, height, roominess })`, pure and
  free of React and three. Return `{ tankWidth, tankHeight, tankDepth }` where `tankWidth` is
  `60 * roominess` clamped to 20..240, `tankDepth` is `tankWidth / (width / height)` clamped to 20..240,
  and `tankHeight` is a constant 30. Treat a non-finite or non-positive `width`, `height` or `roominess`
  as the defaults 480, 320 and 1, so a malformed box cannot produce a malformed world.
- [x] 1.2 Write `scripts/check-tank-for-box.ts` asserting: a 480 by 320 box at roominess 1 gives exactly 60
  by 40; a box twice as wide as tall gives a width twice its depth; two boxes of equal width and different
  heights give equal tank widths and the taller box the deeper tank; tank height is the same for every box;
  an extreme aspect stays inside the clamp; and a room figure that is zero, negative, or not a number falls
  back to 1.
- [x] 1.3 In `app/game/hosts.ts`, map a `roominess` key alongside `creatureName` in
  `createPlatformHost`'s `applyPlatformSettings`, holding 1 whenever the incoming value is absent, not a
  number, or outside 0.25..2.5. Expose the mapped value through the host so the page can read it.
- [x] 1.4 In `app/game/embed/page.tsx`, add `onBox` to the `connectPlatform` call, holding the reported box
  in state. Derive the tank with `tankForBox` from that box and the host's room figure, and write
  `tankWidth`, `tankHeight` and `tankDepth` into the animate store. Leave the store untouched while no box
  has been reported, and do not log a failure for that case.

## 2. The box carries a width and a height (Vids.Tube)

- [x] 2.1 In `app/(app)/live/demo.types.ts`, add optional `w` and `h` to `DemoBox`, accept them in `isBox`
  when present and numeric, and give the default `game` box `w: 480, h: 320`. Leave `DEMO_LAYOUT_VERSION`
  and every other default box alone: a box with no `w` or `h` keeps meaning exactly what it meant.
- [x] 2.2 In `lib/overlay-resize.ts`, add `resizeFreeFromCorner` and `resizeFromEdge`, which move the
  dragged corner or edge against the opposite corner or edge and return a box carrying `w` and `h` rather
  than a changed `scale`. Clamp each dimension to a minimum of 80 canvas units. Leave `resizeFromCorner`
  untouched, since every other overlay resizes through it.
- [x] 2.3 Extend `tests/unit` with a test for the two new functions: dragging a corner changes both
  dimensions independently, dragging an edge changes one and leaves the other, the anchor corner or edge
  stays put in both cases, and neither dimension falls below the minimum. Written as
  `tests/unit/overlay-free-resize.test.ts`. NOT RUN: Vitest cannot load its config in this working tree,
  failing with `ERR_REQUIRE_ESM` on `std-env`, and an untouched existing test fails identically, so the
  breakage predates this change and belongs to whoever owns that dependency state.

## 3. The handles (Vids.Tube)

- [x] 3.1 In `components/overlay/overlay-container.tsx`, render four edge handles beside the existing four
  corner handles, and route both to the free functions when the box carries `w` and `h`, or to
  `resizeFromCorner` when it does not. Size and label them as the corner handles already are, and give each
  a `data-testid` following the existing `overlay-handle-<key>-<corner>` pattern.
- [x] 3.2 In `components/overlay/overlay-container.tsx`, apply a box carrying `w` and `h` as an explicit
  width and height on the container rather than as a `scale` transform, so the game's frame is genuinely
  resized rather than stretched. Keep the transform path for every box without them.

## 4. The frame and the message (Vids.Tube)

- [x] 4.1 In `components/overlay/game-window.tsx`, size the iframe from the `box` prop's width and height
  rather than from `OVERLAY_BASE_DIMS.game`, falling back to those constants when the box carries neither.
- [x] 4.2 In `components/overlay/overlay-stage.tsx`, pass the game box's `w` and `h` into `GameWindow`'s
  `box` prop in place of the two constants, so the message the host sends carries the real size.

## 5. The room control (Vids.Tube)

Amended from a bespoke slider in the Overlays tab. Overlay settings are already field-driven: an overlay
declares its fields, the host stores them without interpreting them, and the streamer's editor renders the
control. A hand-built slider would reimplement that and would not reach the settings message.

- [x] 5.1 In `scripts/seed-dragon-overlay.ts`, declare a `roominess` field on the dragon overlay's
  `settings_fields`: type number, default 1, minimum 0.25, maximum 2.5, step 0.01, with help text saying a
  lower number means a smaller tank and so a larger creature.
- [x] 5.2 Re-run `doppler run -- npx tsx scripts/seed-dragon-overlay.ts` so the published overlay row
  carries the new field and the streamer's editor renders it. Run 18-Aug-2026 with the owner approving the
  production write. The published row now declares `creatureName` and `roominess`, the latter a number from
  0.25 to 2.5 in steps of 0.01, which the settings panel renders as a slider because both bounds are given.
- [x] 5.3 Confirm the room figure reaches the game through the settings message the host already sends,
  with no change to the message shape. Confirmed by reading the chain: the installation's saved settings
  reach the game window, which posts them to the frame as a `settings` message on first contact and again
  whenever they change, and the game maps `roominess` beside `creatureName`. Not yet exercised by a live
  drag of the slider, which needs the running composer.

## 6. Proving it

- [x] 6.1 Run `npx tsx scripts/check-tank-for-box.ts` and confirm it passes, alongside the rest of the
  eco3d check suite. The Vids.Tube unit tests could not be run; see the note on 2.3.
- [x] 6.2 Extend `scripts/verify-embed.mjs` with a `--box=<w>x<h>` argument that sets the browser viewport
  to those dimensions, and confirm the creature renders and moves at 480x320, at a wide box and at a tall
  box, so a reshaped window is proven to run rather than argued to. All three pass and the canvas matches
  the requested viewport in each, so the camera reframes to the window.
