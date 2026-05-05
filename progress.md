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
