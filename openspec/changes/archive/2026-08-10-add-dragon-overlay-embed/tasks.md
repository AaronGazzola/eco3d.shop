# Tasks — dragon overlay embed page

**Build rule.** There is no hot reload in the target setup. Every app-code change is followed by
`npm run prod:3001` before any check is run or any link is handed over. Port 3001 keeps the page clear of
Vids.Tube on port 3000.

**Evidence rule.** A box is checked only with a result that would have failed had the work not been done.
The page is verified by driving a real browser with `playwright-core`, which is already a dependency and
is already how `scripts/observe.mjs` drives the studio. "It should work" is not a result.

## 1. Confirm the page can read a rig with no session

- [x] 1.1 Proven. With the anonymous publishable key and no session, all **3** saved rigs read back with
      their groups and variant names. Exactly one is usable — the adult rig, 15 groups; the other two are
      an egg stage and a 0-group test row.
- [x] 1.2 Proven. The mesh route returns **200 and 18,898,284 bytes** for that rig's mesh with no session.
- [x] 1.3 Not needed — neither read was refused, so no policy migration is in scope.

## 2. Overlay presentation on the studio canvas

- [x] 2.1 Done — background colour, grid and orbit controls are now props, each defaulting to what the
      studio uses today.
- [x] 2.2 Done. The renderer's alpha buffer was already on by default, so the CSS background alone was
      enough; confirmed rather than assumed by reading the live context back — the drawing buffer reports
      `alpha: true` and both the page and the document element compute to `rgba(0, 0, 0, 0)`.
- [x] 2.3 Confirmed by opening the studio after the change: grey background, floor grid and dragging all
      behave as before.

## 3. The follow camera

- [x] 3.1 Done, but NOT as written: the rendered root is pinned to the origin every frame by the
      locomotion loop — it is an anchor, not a position — so a camera offset from it never moves. The
      creature is found instead from the world bounds of the root's descendants, whose matrices the
      simulation does write.
- [x] 3.2 Superseded, and better. A fixed offset was measured and rejected: at the window's 480 by 320 it
      clipped the creature at both ends. The distance is now fitted to the creature's own bounds each
      frame, against the narrower of the two field-of-view angles, so any rig at any window aspect frames
      itself. A bounding sphere was tried first and pushed the camera much too far back — its radius is
      half the body's diagonal, which on something as long and thin as a dragon reduced the creature to a
      speck. Width and height are now fitted separately, at 1.15 padding, direction (0, 0.35, 1).
- [x] 3.3 The studio's camera preset controller is untouched.

## 4. The embed page

- [x] 4.1 Done at `/game/embed`.
- [x] 4.2 Done — the studio's own rig loader is reused, so there is one loader.
- [x] 4.3 Done. The studio's observation hook, sidebar and admin gate are all absent. Debug overlays are
      also deliberately not read from the link: stance and reach markers belong in the studio, not on a
      stream.
- [x] 4.4 Done — logged and nothing rendered.
- [x] 4.5 Done — nothing renders until both the rig and its mesh have arrived.

## 5. The link carries the rig

- [x] 5.1 Done, by collapsing the two link builders into one. The studio had two copies of the builder —
      one behind the sidebar button, one on the observation hook — so adding the rig to both would have
      been the larger change as well as the more fragile one.
- [x] 5.2 Done — the same builder takes the embed path.
- [x] 5.3 Written — `Copy overlay link`, disabled until a saved rig is loaded. The builder behind it is
      the one proven in section 6; the button itself has not been clicked, because the studio is behind
      the admin login. Carried into 7.1.
- [x] 5.4 Written — the studio now consumes `rig` as well, so a shared studio link shows the sender's
      creature, and links carrying no rig keep working on whatever is loaded. Not exercised, for the same
      reason. Carried into 7.1.

## 6. Prove it renders

- [x] 6.1 Done. `scripts/verify-embed.mjs` drives the page in a fresh context with no session. Screenshots
      land in `docs/diagnostics/observe/`.
- [x] 6.2 Confirmed at 20 s apart: the creature has moved and is still framed. The check fails if the two
      shots are byte-identical.
- [x] 6.3 Confirmed: no login form, no sidebar, no grid, and the page computes transparent with an alpha
      drawing buffer. No console errors.
- [x] 6.4 Recorded. The address is the embed path with the adult rig's identity in the hash, served from
      `http://localhost:3001`; the Vids.Tube change was configured and verified against exactly that value.

## 7. Land it

- [x] 7.1 Raised as **AZ-248** in the Eco3D.Shop project, covering both: how the window reads composited
      over live video, which needs a running stream and the owner's eye; and the two studio buttons behind
      the admin login, which need one signed-in click each. The ticket also notes both are better judged
      against the Phase T tank than against the follow camera, since that camera is being replaced.
- [x] 7.2 Validated and archived 10-Aug-2026.
