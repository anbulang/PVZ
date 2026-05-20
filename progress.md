Original prompt: [@superpowers](plugin://superpowers@openai-curated) 做一款植物大战僵尸的游戏

# Progress

- 已确认方向：本地双人，植物方 vs 僵尸方，架构预留未来 WebSocket 同步。
- 已确认约束：不打包原作素材或游戏本体，使用原创 Canvas 绘制素材，保留用户本地素材替换入口。
- 当前实现：核心状态、命令队列、模拟系统、输入映射、Canvas 渲染和 Node 测试已写入。

## Verification

- Ran `npm test`: PASS, 13 tests.
- Ran browser verification against `http://localhost:5173`: PASS.
- Browser state contained 2 plants, 1 zombie, and active projectiles.
- Console errors: none.
- Screenshot checked: cards, 5-lane grid, plants, zombie, projectiles, deployment strip, and status bar are visible.
- Replaced procedural unit/card/projectile rendering with assets loaded from `/assets`.
- Ran browser verification against `http://localhost:5174` after asset replacement: PASS.
- Screenshot checked: plant cards, zombie cards, placed plants, deployed zombie, and projectiles use the downloaded asset pack.

## Next Suggestions

- Add real WebSocket room transport using the existing command queue.
- Add optional user-supplied asset manifest under `assets/manifest.json`.
- Add balance presets for short, normal, and long matches.

## 2026-05-05 Gameplay Polish Iteration

- Added collectible sun pickups for passive sun and sunflower production.
- Added lane mowers as one-time breakthrough protection per lane.
- Added director waves with lane warning, automatic pressure spawns, wave count, and threat meter.
- Added cherry bomb and imp zombie as new tactical units.
- Improved HUD, card cooldown/resource feedback, lane warning, shadows, mower visuals, sun visuals, and explosion effects.
- Ran `npm test`: PASS, 18 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS.
- Screenshot checked: expanded cards, collectible sun, mowers, pressure meter, units, projectiles, and status bar visible.

## 2026-05-05 Asset Animation And Audio Iteration

- Replaced hand-drawn lane mowers with the asset pack `小推车.png`.
- Added procedural Web Audio background music and event sounds for planting, sun collection, zombie spawn, hit, bite, armor drop, explosion, mower, and wave warning.
- Added zombie eating animation mapping for basic, imp, cone, bucket, and runner zombies.
- Added plant bite deformation, bite marks, and stronger eaten feedback.
- Added armor drop state: armored zombies switch to a no-armor body after damage threshold and leave visible dropped armor near their feet.
- Extended browser verifier to support command-driven scenarios and expectations for eating/armor-drop state.
- Ran `npm test`: PASS, 19 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS.
- Screenshot checked: mower asset, eating animation, plant bite deformation, bite marks, and armor drop feedback visible.

## 2026-05-05 Real GIF Animation And OGG Audio Fix

- Replaced the previous procedural oscillator audio with real OGG playback from `assets/音效`, including background music, planting, growth, bite, hit, armor, explosion, mower, and wave sounds.
- Split asset mappings into `plantIdle`, `zombieWalk`, `zombieEat`, `zombieFeedback`, `ui`, `sfx`, and `music`, preferring `assets/图片/...` with compatibility fallbacks.
- Removed continuous artificial plant/zombie wobble; zombies now switch between walking/eating GIFs through `zombie.eating`, and plants only use a short restrained bite pulse.
- Added audio debug state to `render_game_to_text` and extended browser verification to fail on missing critical GIF/OGG assets or audio loading errors.
- Ran `npm test`: PASS, 20 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS, with `audioUnlocked: true`, `musicActive: true`, no missing assets, and no console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS, with eating and armor-drop state verified.
- Screenshot checked: mower asset, GIF units, cone zombie eating state, bite marks, and dropped armor are visible without large artificial wobble.

## 2026-05-05 Sun Feedback And Non-Vocal BGM Fix

- Changed background music from `ZombiesOnYourLawn.ogg` to low-volume `rain.ogg` with `phonograph.ogg` fallback.
- Moved sun pickup rendering above plants, added visible pickup amounts, and placed sunflower-produced sun above the plant head.
- Added `+25` collection feedback with amount data in state serialization for browser verification.
- Restored restrained plant idle sway only for real planted units; card icons stay still and bite compression remains dominant.
- Added tests for sunflower sun amount, collect feedback amount, non-vocal music mapping, and multi-frame zombie walking GIFs.
- Ran `npm test`: PASS, 24 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS, music path `assets/音效/rain.ogg`, no missing assets or console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-sun-actions.json`: PASS, sun resource 125 and active `collectSun` effect amount 25.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS, eating and armor-drop regression still verified.
- Screenshot checked: sunflower sun value `25`, collection `+25`, walking zombies, and field units are visible.

## 2026-05-05 User-Selected Background Music

- Changed background music to `assets/音效/ZombiesOnYourLawn.ogg`.
- Kept `mainmusic.mo3` out of the browser audio path because HTMLAudio does not natively play MO3 files without an additional decoder or conversion step.

## 2026-05-05 Plant Sun Balance Visibility

- Added a persistent top-layer plant-side sun balance badge so the current sun total is not hidden by seed cards.
- Added HUD-adjacent `+/-` sun delta feedback for planting costs and sun collection income.
- Updated plant placement and sun collection status text to include spent/gained sun and current balance.
- Ran `npm test`: PASS, 24 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-sun-actions.json`: PASS, current sun 125 and positive sun delta verified.
- Screenshot checked: visible `阳光 125`, field sun `25`, collect `+25`, and status text with current balance.

## 2026-05-05 Zombie Scenario GIF Selection Fix

- Centralized zombie visual selection so `walk` and `eat` states map directly to their scenario GIFs.
- Fixed armored zombies in eating state to keep their original eating GIF, such as `路障僵尸啃食.gif`, even after armor-drop feedback.
- Added serialized `visualState` and `visualAsset` fields for browser verification.
- Added unit and browser assertions for `普通僵尸走路.gif` and `路障僵尸啃食.gif`.
- Ran `npm test`: PASS, 25 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS, walking zombies report `普通僵尸走路.gif`.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS, eating cone zombie reports `路障僵尸啃食.gif`.

## 2026-05-05 Combat Readability Feedback

- Added floating damage numbers for pea hits, frost hits, cherry bomb damage, and zombie bite damage.
- Added short `击倒` feedback when zombies are defeated.
- Serialized effect targets so browser tests can distinguish zombie damage from plant damage.
- Added a dedicated browser hit scenario for projectile damage readability.
- Ran `npm test`: PASS, 25 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-hit-actions.json`: PASS, zombie damage number captured.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS, plant bite damage number and eating GIF captured.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS, normal flow unchanged.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-sun-actions.json`: PASS, sun flow unchanged.

## 2026-05-05 Remove Damage Numbers

- Removed all combat damage number generation and rendering per user request.
- Kept health bars, hit flashes, bite GIFs, armor drops, and non-numeric `击倒` feedback.
- Removed the dedicated browser hit-number scenario.
- Ran `npm test`: PASS, 25 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS, no `damageNumber` effects remain.
- Ran normal and sun browser flows: PASS.
- Screenshot checked: no `-24` / `-26` damage numbers visible.

## 2026-05-05 Asset-Driven Foundation Pass

- Added `ASSET_MANIFEST` while keeping `ASSET_PATHS` compatibility, covering scene, UI, plant, zombie, projectile, and audio groupings.
- Switched the canvas background to the daytime scene asset and made HUD elements use seed/shop, sun counter, shovel slot, and FlagMeter assets where available.
- Added serialized `visualAssets.scene` and `visualAssets.ui` debug fields so browser verification can prove the canvas is using real asset paths.
- Replaced zombie defeat text with `zombieDeath` effects that render death GIFs such as `僵尸死.gif`, `小鬼死亡.gif`, and `橄榄球僵尸死.gif`.
- Added browser scenarios for visual asset wiring and unit death-state GIF verification.
- Ran `npm test`: PASS, 26 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json`: PASS, with scene/UI assets, BGM, walking GIF, no missing assets, and no console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-unit-states-actions.json`: PASS, with `zombieDeath` using `僵尸死.gif`.
- Ran normal, feedback/eating, and sun browser flows: PASS.
- Screenshot checked: daytime background, asset HUD, sun counter, FlagMeter, mower assets, plant idle motion, and walking zombie GIF are visible without damage numbers.

## 2026-05-07 Expanded Unit And Special State Pass

- Converted plant and zombie card rails to compact two-row layouts so more units fit without leaving the canvas.
- Added new plants with distinct roles: `repeater` burst damage, `twinSunflower` economy, `torchwood` pea-to-firepea upgrade, `potatoMine` arming/trap burst, and `jalapeno` lane clear.
- Added new zombies with distinct pressure patterns: `flag` faster pressure, `screen` shielded armor target, and `zamboni` vehicle crush behavior.
- Wired corresponding assets for new plants, zombies, fire peas, potato mine armed state, iron-door bite/walk GIFs, zamboni GIF, and jalapeno/ignite/potato/zamboni sound events.
- Added `plant.visualState` and `plant.visualAsset` serialization for browser verification.
- Added `rowFire` lane-clearing visual feedback and made it visible in screenshots.
- Added browser scenarios for expanded units and special plants.
- Ran `npm test`: PASS, 32 tests.
- Ran browser verification for normal, sun, feedback/eating, expanded-unit, visual-asset, unit-death, and special-plant scenarios: PASS with no missing assets or console errors.
- Ran the `develop-web-game` Playwright client against the expanded-unit scenario after linking the project `node_modules` into the skill script folder.
- Screenshot checked: compact cards, torchwood, armed potato mine, fire peas, iron-door zombie, zamboni, and jalapeno row fire are visible.

## 2026-05-08 Layout And Zombie GIF Verification Pass

- Moved HUD card hot zones and the sun counter into separate slots so the plant balance no longer overlaps seed cards.
- Added a dedicated mower lane overlay and adjusted daytime background cropping so the mower row stays clear of the house texture.
- Kept every playable zombie on its own scenario GIF for walk/eat states; armor-drop feedback no longer downgrades visuals to a basic zombie, and zamboni remains a special driving state.
- Added state-keyed image records for zombie drawing and serialized `animationSource: "gif"` for browser verification.
- Added layout and GIF animation tests, including a browser pixel-diff check for live GIF frame changes.
- Ran `npm test`: PASS, 35 tests.
- Ran browser verification for layout, GIF animation, normal, sun, feedback/eating, visual-asset, expanded-unit, and special-plant scenarios: PASS with no missing assets or console errors.
- Screenshot checked: mower lane is clean, sun counter does not overlap cards, and zombie GIF animation is visible and measurable.

## 2026-05-11 Chrome Playtest Fun Pass

- Used Chrome/Playwright to play an opening sequence with sunflower, peashooter, manual zombie deployment, sun collection, and auto wave pressure.
- Found two play-feel issues: visible sun stacked around sunflowers and was tedious to click; auto waves could hit empty lanes instead of the defended lane, making the board feel inactive.
- Added a sun-counter click shortcut that collects all visible sun pickups at once while preserving individual `+amount` feedback.
- Spread overlapping sun pickups around their source so sunflower output is easier to read and click.
- Changed the director to prioritize rows that already contain plant defenses, while avoiding over-stacking zombies in the same lane.
- Added an inline favicon to eliminate the browser favicon 404 during Chrome playtests.
- Ran `npm test`: PASS, 39 tests.
- Ran browser verification for normal, sun collection, feedback/eating, visual assets, and GIF animation scenarios: PASS with no missing assets or console errors.
- Chrome screenshot checked: same-lane combat is active, one-click sun collection clears pickups, and the board has a clearer early-game rhythm.

## 2026-05-12 Game Studio Playtest Foundation Pass

- Applied the `game-studio:web-game-foundations` frame: kept simulation, rendering, input, and asset boundaries intact while improving the core loop.
- Playtested an opening sequence and found that the game could advance waves before the player made a first move, which made refreshed tabs feel unfair and confusing.
- Added a `started` simulation flag so timers, resources, waves, and zombie movement wait until the first player interaction.
- Added a ready overlay that says `准备开始` and explains that selecting a card starts the timer.
- Moved sunflower-generated sun higher above the plant so pickups are easier to read and no longer cover the sunflower head.
- Added cache-busting query versions for the browser module graph so Chrome loads the current gameplay code after refresh.
- Ran `npm test`: PASS, 40 tests.
- Ran browser verification for normal, sun, feedback/eating, and GIF animation scenarios: PASS with no missing assets or console errors.
- Screenshot checked: ready overlay holds at 180 seconds with 0 waves and 0 zombies; first card selection starts the match.

## 2026-05-12 Game Studio Midgame Readability Pass

- Used the Game Studio playtest workflow on an opening-to-midgame sequence with economy, manual zombie pressure, auto waves, and mower activation.
- Found the main playability issue was visual noise from many separate sun pickups around sunflowers, which pulled attention away from lane combat.
- Added simulation-level sun pickup merging: nearby same-kind sun pickups combine into one higher-value pickup up to 100, preserving total economy while reducing clutter.
- Updated browser module cache versions to force Chrome to load the current optimized simulation and render code.
- Added/updated tests so repeated sunflower production now verifies a merged 50-sun pickup instead of two overlapping 25-sun pickups.
- Ran `npm test`: PASS, 40 tests.
- Ran browser verification for normal, sun, feedback/eating, and GIF animation scenarios: PASS with no missing assets or console errors.
- Screenshot checked: midgame visible sun pickups dropped from six small overlapping items to four clearer pickups including a `50`, with combat lanes easier to read.

## 2026-05-12 UI And Generated Sprite Remaster Pass

- Generated a commit-friendly original asset set under `generated-assets/`, including the lawn scene, card/resource/status panels, sun/mower/shovel UI, projectiles, effects, plant sheets, and zombie walk/eat/death sheets.
- Added `SPRITESHEET_MANIFEST` with frame size, frame count, fps, loop, and anchor metadata; Canvas now prefers generated PNG spritesheets and keeps the local `assets/...` GIF/PNG files as fallback.
- Rebuilt the HUD into fixed slots for sun, plant cards, timer/pressure, brain, and zombie cards; card labels were removed from the cards, leaving icon + cost/cooldown only.
- Added plant visual pulses for attack, production, activation, arming, and bite damage; zombies now report and render `animationSource: "spritesheet"` for walk/eat/death states.
- Updated browser verification to measure spritesheet frame changes, and updated visual assertions to target generated assets.
- Ran `npm test`: PASS, 42 tests.
- Ran browser verification for normal, layout, visual assets, spritesheet animation, sun, feedback/eating, expanded units, special plants, and unit death: PASS with no missing assets or console errors.
- Screenshot checked: ready overlay, opening placement, midgame sun/combat, eating/armor feedback, and explosion effect all render clearly at 1280x720.

## 2026-05-12 Codex Imagegen Asset Remaster

- Replaced the procedural placeholder art with Codex image-generated atlases for units, UI, plant animation strips, and zombie animation strips.
- Added `generated-assets/source/` atlas records and `scripts/remaster-imagegen-assets.py` to remove chroma-key backgrounds, crop atlas cells, normalize sprite anchors, and rewrite the shipped PNG spritesheets.
- Preserved the existing `SPRITESHEET_MANIFEST` contract, but bumped generated asset URLs with an imagegen cache version so the browser refreshes the new art.
- Made disabled card overlays semi-transparent so icons remain readable when unaffordable or cooling down.
- Ran `npm test`: PASS, 42 tests.
- Ran browser verification for normal, layout, visual assets, spritesheet animation, sun, feedback/eating, expanded units, special plants, and unit death: PASS with no missing assets or console errors.
- Browser frame-diff for the basic zombie spritesheet reported more than 3000 changed pixels, confirming the new sprite strips animate in Canvas.

## 2026-05-13 Game Studio Layout Repair Pass

- Replaced the stretched generated HUD/status/overlay panel images with stable Canvas-drawn boards so card slots, resource numbers, cooldowns, and modal text no longer depend on imperfect atlas crops.
- Kept generated icons, cards, mowers, sun, projectiles, and spritesheets, but moved the large generated UI panels to manifest/fallback use only.
- Added a visible left-side house facade behind the mower bays, including roof trim, siding, windows, and a door, so the board again reads as plants defending the house.
- Reworked mower bays into semi-transparent garage slots, keeping each mower aligned with its lane while letting the house context remain visible.
- Rebuilt resource counters, timer, pressure meter, status bar, and ready/pause modal as fixed-size text-safe slots.
- Ran `npm test`: PASS, 42 tests.
- Ran browser verification for layout, visual assets, spritesheet frame-diff, feedback/eating, and unit-state scenarios: PASS with no missing assets or console errors.
- Screenshot checked: ready overlay, normal play HUD, left-side house/mower lane, sun value pickup, walking zombie, and cone zombie eating feedback are readable at 1280x720.

## 2026-05-13 Game Studio Alignment Polish Pass

- Generated a new Codex-image house/backyard strip and saved the shipped crop as `generated-assets/scene/house-left.png`.
- Replaced the hand-drawn left house facade with the generated house strip, then constrained it to the mower lane so it no longer bleeds into the first lawn column.
- Added `generated-assets/ui/sun-padded.png` and routed the sun icon through it so sun rays are not clipped in counters or pickups.
- Moved the brain counter out of the zombie card board and aligned timer/pressure boxes as a clean vertical pair.
- Moved the zombie card board to the right card cluster only, removing the large empty box behind the brain counter.
- Re-anchored plant and zombie sprites to their cell floor instead of center points, fixing the visible mismatch between sprites and grid tiles.
- Prevented unaffordable plant/zombie cards and cooling cards from becoming selected at the command layer.
- Added regression coverage for unaffordable plant selection and included the new house/sun assets in asset and browser verification checks.
- Ran `npm test`: PASS, 43 tests.
- Ran browser verification for layout, feedback/eating, and spritesheet frame-diff scenarios: PASS with no missing assets or console errors.
- Screenshot checked: unaffordable repeater click leaves selection empty, the generated house stays behind the mower lane, sun pickups render complete, and row sprites sit on tile baselines.

## 2026-05-13 Game Studio Second Alignment Audit

- Re-audited the eight remaining visual complaints with custom browser screenshots for all plants, all playable zombies, death effects, low-sun selection, and the normal layout.
- Regenerated `generated-assets/scene/house-left.png` with a cleaner Codex-image house/path/grass strip inspired by the original backyard composition, removing the previous stacked garage-panel look.
- Shifted the grass grid to `x=136`, narrowed cells to `100px`, and moved the deploy zone to `x=1050` so the generated house has enough width and no longer fights the first lawn column.
- Removed the heavy mower bay panels; mower lanes now sit on the generated stone path with only subtle separators.
- Moved plant and zombie anchors further upward inside each tile so sprites no longer sit below the grid baseline.
- Compressed the brain counter and made the timer/pressure panels equal-width/equal-height, aligned as a neat vertical pair.
- Forced all zombie death animation paths to generated spritesheets only, with a regression test to prevent fallback to legacy GIF death assets.
- Ran `npm test`: PASS, 44 tests.
- Ran browser verification for layout, visual assets, unit states, expanded units, feedback/eating, and spritesheet frame-diff scenarios: PASS with no missing assets or console errors.
- Screenshot checked: all playable zombies are complete in cards and on the field, death effects serialize generated `*-death.png`, sun icon rays are intact, and low-sun repeater click leaves `selection: null`.

## 2026-05-13 Card/HUD Fit And Old-Asset Sweep

- Tightened plant and zombie card composition so unit art stays in the upper card area and the cost chip stays in the lower slot.
- Collapsed timer, brain, and pressure into one aligned center column; the brain value no longer occupies a large empty HUD box.
- Removed plant and zombie health bars from field rendering, matching the no-damage-number readability direction.
- Rebuilt the shipped sun and mower icons as padded generated PNGs so sun rays and mower wheels are not clipped.
- Kept the improved generated house/path strip and verified mowers sit on the left path without covering the lawn grid.
- Re-ran the all-zombie browser sweep: all 8 playable zombies use generated walk/drive spritesheets, and all death effects serialize generated `*-death.png` assets.
- Ran `npm test`: PASS, 44 tests.
- Ran browser verification for layout, feedback/eating, visual assets, unit states, expanded units, and spritesheet frame-diff scenarios: PASS with no missing assets or console errors.
- Screenshot checked: `game-studio-layout4-layout.png`, `game-studio-layout4-feedback.png`, `game-studio-layout4-all-units.png`, `game-studio-layout4-unaffordable.png`, and `game-studio-layout4-death.png`.

## 2026-05-13 Screenshot Annotation Fix Pass

- Replaced the generated smiley sun with the original PVZ-style sun GIF, repacked as `generated-assets/ui/sun-original-padded.gif` with transparent margin so rays are not clipped.
- Replaced the opaque generated selected-card overlay with a Canvas-drawn highlight stroke, keeping selected unit art visible.
- Narrowed and re-centered the zombie deployment strip, then aligned manual/director spawn positions and projectile cleanup with the new `GRID.deployWidth`.
- Moved the zombie card rail left so the top HUD no longer leaves a large empty gap between the status column and zombie cards.
- Removed the permanent small controls line from the bottom status bar during active play, leaving one readable status line.
- Reduced dropped armor size and moved it down to the tile floor so it no longer covers plants or zombie bodies.
- Slightly reduced field zombie sprite sizes and changed card scaling to fit each zombie within its card frame.
- Ran `npm test`: PASS, 44 tests.
- Ran browser verification for layout, visual assets, feedback/eating, and spritesheet frame-diff scenarios: PASS with no missing assets or console errors.
- Screenshot checked: `game-studio-layout5-layout.png`, `game-studio-layout5-feedback.png`, `game-studio-layout5-all-units.png`, and `game-studio-layout5-annotated-match.png`.

## 2026-05-14 Code Review Fix Pass

- Requested an independent Superpowers code review for the current visual/spritesheet worktree.
- Fixed the critical review finding: successful plant placement and zombie deployment now clear the matching selected card so cooling or newly unaffordable cards cannot remain visually selected.
- Added unit regressions for clearing selected plant/zombie cards after successful spend/cooldown.
- Added browser verification support for `selectionNull` and enabled it in layout/visual-asset flows.
- Added `/assets` to `.gitignore` so the local absolute symlink to the user's asset pack cannot be committed accidentally.
- Documented hand-authored generated assets in `scripts/remaster-imagegen-assets.py`, added output validation, and added `requirements.txt` for Pillow.
- Ran `python3 scripts/remaster-imagegen-assets.py`: PASS.
- Ran `npm test`: PASS, 46 tests.
- Ran browser verification for layout, visual assets, feedback/eating, and spritesheet frame-diff scenarios: PASS with no missing assets or console errors.

## 2026-05-15 Single Sun Collection Feedback Fix

- Root cause: collecting one sun created both a `collectSun` effect and a positive `sunDelta` effect, so the same `+25` could render twice.
- Added a failing regression for one sun pickup producing exactly one positive amount feedback, confirmed it failed with `2 !== 1`.
- Removed positive `sunDelta` effects from `collectSun` and `collectAllSun`; plant spending still uses negative `sunDelta` for cost feedback.
- Updated browser sun verification to require no positive `sunDelta` during collection.
- Ran `npm test`: PASS, 47 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-sun-actions.json`: PASS with no missing assets or console errors.
- Ran a targeted Playwright check for one pickup: PASS, state had exactly one positive `collectSun +25` effect and no positive `sunDelta`; screenshot saved as `test-results/single-sun-collect.png`.

## 2026-05-16 Zombie Death Asset Sweep

- Root cause: `scripts/remaster-imagegen-assets.py` still generated zombie death strips through the old generic `transformed_frames(..., "death")` path, so several death animations looked like procedural fades instead of Codex-generated character art.
- Rebuilt all playable zombie death strips from Codex imagegen atlas frames or Codex static zombie crops using `death_frames_from_codex_art`, with drop pieces, collapse, dust, and remains frames.
- Forced `ASSET_PATHS.zombieDeath` to generated spritesheet paths only and added tests blocking legacy GIF fallback and the old transformed-death generator path.
- Added a system regression that kills every playable zombie type and verifies serialized `zombieDeath` effects point to `generated-assets/sprites/zombies/<type>-death.png` with `animationSource: "spritesheet"`.
- Ran `python3 scripts/remaster-imagegen-assets.py`: PASS.
- Ran `npm test`: PASS, 49 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-unit-states-actions.json`: PASS with `basic-death.png`, no missing assets, and no console errors.
- Screenshot/contact sheet checked: `test-results/death-sheets-contact-v2.png` and `test-results/all-zombie-death-runtime.png` show all eight zombie death sheets using Codex art-derived frames rather than the old one-size-fits-all fade.

## 2026-05-16 Cone Armor Drop Fix

- Root cause: `generated-assets/fx/armor-cone.png` was cropped from the same atlas area as `armor-bucket.png`, so road-cone armor loss displayed a broken bucket-like piece.
- Rebuilt `armor-cone.png` from the Codex-generated cone zombie hat crop, rotated it into a fallen piece, added chip/crack detail, and kept bucket/screen/runner armor assets separate.
- Added asset coverage so cone armor and bucket armor cannot be byte-identical again.
- Ran `python3 scripts/remaster-imagegen-assets.py`: PASS.
- Ran `npm test`: PASS, 50 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS with no missing assets and no console errors.
- Screenshot checked: `test-results/local-versus-game.png` shows cone zombie armor loss leaving a broken orange cone piece near the zombie instead of a bucket fragment.

## 2026-05-17 Full Armor Drop Audit

- Generalized the prior cone fix across every armor-dropping zombie: cone, bucket, screen-door, and runner.
- Root cause found for runner: `armor-runner.png` also reused the bucket crop in `scripts/remaster-imagegen-assets.py`, so football zombies could drop a bucket-like fragment.
- Rebuilt `armor-runner.png` from the Codex-generated football helmet crop, masked out the zombie face/background, rotated it into a fallen helmet, and added crack detail.
- Centralized runtime armor-drop asset lookup with `armorDropAssetFor()` and serialized armor-drop `visualAsset` in `render_game_to_text()` so future browser checks can prove the exact asset path.
- Strengthened tests: all four armor-drop assets must be distinct, and each armored zombie must emit its matching `hatType` and matching serialized asset path.
- Ran `python3 scripts/remaster-imagegen-assets.py`: PASS.
- Ran `npm test`: PASS, 51 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: PASS with no missing assets and no console errors.
- Screenshot/contact sheet checked: `test-results/armor-drop-contact.png` and `test-results/all-armor-drops-runtime.png` show broken cone, bucket, screen-door, and football helmet as separate pieces.

## 2026-05-17 HUD Card Area Rebalance

- Applied the Game Studio UI pass to rebalance the top HUD: shovel moved into a separate far-left tool slot under the sun counter, plant card board narrowed from the old wide rail, and zombie card board expanded into the freed right-side space.
- Centralized HUD rects in `src/game/input.js` so rendered panels, click hitboxes, and layout tests share one coordinate source.
- Reworked the center status column: timer and brain counters now sit as compact aligned chips above a wider pressure meter.
- Enlarged zombie card hitboxes and card art scale so the zombie selection side reads as a first-class control surface instead of a small cramped rail.
- Updated browser click scenarios for the new zombie-card position.
- Ran `npm test`: PASS, 51 tests.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json`: PASS with no missing assets and no console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json`: PASS with no missing assets and no console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: PASS, confirming plant selection, placement, zombie selection, and deployment still work.
- Screenshot checked: `test-results/local-versus-game.png` shows the smaller plant board, left shovel tool slot, compact timer/brain/pressure column, and larger zombie board.

## 2026-05-18 Visual Polish Verification

- Lowered 小鬼僵尸 brain cost to `40` and verified the command-layer balance regression.
- Locked HUD hit boxes and drawing to the same layout contract: left tool shelf, compact plant panel, aligned timer/brain/pressure column, and larger zombie card panel.
- Added generated-asset coverage for the visual polish pass, including padded sun, brain counter, house strip, mower, repeater, armor drops, and generated zombie death sheets.
- Changed zombie death effects to stay ground-anchored and fall downward instead of moving upward.
- Added multi-window browser verification actions for 1280x720, 1440x900, and a larger viewport, with logical Canvas click scaling.
- Ran `npm test`: PASS, 59 tests.
- Ran `git diff --check`: PASS.
- Ran browser verification for normal, layout, visual assets, unit states, sun, feedback/eating, expanded units, special plants, and spritesheet frame-diff scenarios: PASS with no missing assets and no console errors.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1280-actions.json`: PASS, screenshot `test-results/visual-polish-1280.png`.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1440-actions.json`: PASS, screenshot `test-results/visual-polish-1440.png`.
- Ran `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-large-actions.json`: PASS, screenshot `test-results/visual-polish-large.png`.
- Screenshot checked: sun icon is complete, shovel sits in its tool slot, timer/brain/pressure are aligned, zombie deploy lane matches the five grass rows, house and mowers stay left of the lawn, and the basic zombie walk animation reports `changedPixels: 3000`.
- Still open for a later gameplay design pass: remove automatic zombie waves, redesign full two-player versus economy, and rebalance plants so the plant side cannot win too quickly.

## 2026-05-19 Local Versus Rules Pass

- Added Chinese design and implementation notes for the local-versus rule pass under `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- Changed director behavior from automatic zombie waves to a pressure-only model: `autoWaves: false`, no warning, no automatic `spawnZombie()`.
- Manual zombie deployment now increments `director.manualDeployCount`, clears warning state, and nudges the pressure meter.
- Zombie brain now regenerates continuously at a fixed local-versus rate and is capped by `ROUND.maxZombieBrain`.
- Browser verification now supports `directorAutoWaves`, `maxWaveCount`, and `minManualDeployCount` expectations.
- Ran `npm test`: PASS, 60 tests.
- Ran `git diff --check`: PASS.
- Ran browser verification for normal, layout, visual-polish, sun, feedback/eating, and spritesheet frame-diff scenarios: PASS with no missing assets and no console errors.
- Normal browser state confirmed `autoWaves: false`, `manualDeployCount: 1`, `waveCount: 0`, and one manually deployed walking zombie.
- Still open for the next gameplay pass: deeper plant/zombie balance tuning and clearer two-player turn/role prompts in the HUD.

## 2026-05-19 Balance and Versus Tempo Pass

- Committed the previous visual and local-versus foundation before starting the balance pass: `02002e0 feat: add local versus visual and rule foundation`.
- Slowed plant-side snowballing: passive sky sun cadence is now 10s, sunflowers and twin sunflowers produce less frequently, and core shooter damage was reduced.
- Strengthened zombie-side sustained pressure: brain regeneration is faster, max brain is higher, and manual mixed deployments can earn a short-window combo brain refund.
- Added zombie combo state to serialized debug output so browser checks can verify combo count, last deployed type, and row.
- Added command/system/state regressions for combo refund, delayed passive sky sun, updated sunflower production cadence, and serialized zombie combo resources.
- Added `tests/browser-versus-balance-actions.json` to verify two manual zombie deployments, combo refund, manual-only pressure, and spritesheet walking zombies in the browser.
- Ran `npm test`: PASS, 62 tests.
- Ran `git diff --check`: PASS.
- Ran browser verification for normal, versus-balance, and visual-polish 1280 scenarios: PASS with no missing assets and no console errors.
- In-app browser screenshot checked: `test-results/in-app-balance-check.png` opens at `http://localhost:5174/` with no console errors.

## 2026-05-19 Timer Clarity and Zombie Pressure Pass

- Clarified the current win condition: plant side wins by surviving the full countdown and clearing the field; zombie side wins by breaking through the left defense.
- Made the timer HUD explicitly read `剩余 210s` instead of a bare number, and added the win condition to `render_game_to_text()` for browser verification.
- Shifted tempo further toward the zombie side: round duration is now 210s, initial plant sun is lower, passive sky sun and sunflower production are slower, and core shooter damage was reduced again.
- Strengthened zombie pressure: initial brain is higher, brain regen and max brain are higher, combo refund is larger, zombie stats were modestly buffed, and the final minute gives zombies extra brain regen and movement speed.
- Updated tests and browser scenarios for the new economy and timer rules.
- Ran `npm test`: PASS, 63 tests.
- Ran `git diff --check`: PASS.
- Ran browser verification for versus-balance, sun, normal flow, and visual-polish 1280 scenarios: PASS with no missing assets and no console errors.
- In-app browser was hard-refreshed after detecting cached old `index.html`; screenshot confirms the visible HUD now shows `剩余 210s`, initial sun `125`, and initial brain `120`.

## 2026-05-20 Persistent Local Server

- Root cause: prior `localhost:5174` runs depended on Codex/Terminal foreground processes, so the service disappeared when those processes ended.
- Added `scripts/com.pvz.localserver.plist` to run `/usr/bin/python3 -m http.server 5174 --bind 127.0.0.1 --directory /Users/chaucermini/Code/PVZ/.worktrees/local-versus-game` as a user LaunchAgent.
- Loaded the service with `launchctl bootstrap gui/501 ...` and started it with `launchctl kickstart -k gui/501/com.pvz.localserver`.
- Verified `launchctl print gui/501/com.pvz.localserver`: state `running`, pid `23165`.
- Verified `curl -I http://localhost:5174/`: HTTP 200.
- Refreshed in-app browser: page title `花园攻防本地双人版`, console errors empty.

## 2026-05-20 LAN Server Exposure

- User explicitly approved exposing the PVZ local server to the LAN.
- Changed `scripts/com.pvz.localserver.plist` from `--bind 127.0.0.1` to `--bind 0.0.0.0`.
- Reloaded LaunchAgent with `launchctl bootout`, `launchctl bootstrap`, and `launchctl kickstart -k`.
- Verified actual service arguments include `--bind 0.0.0.0`.
- Verified `curl -I http://localhost:5174/`: HTTP 200.
- Verified `curl -I http://192.168.2.15:5174/`: HTTP 200.
- Refreshed in-app browser: page title `花园攻防本地双人版`, console errors empty.
