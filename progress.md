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
