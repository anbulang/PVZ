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
