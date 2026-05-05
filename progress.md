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
