# 素材动画和音频升级迭代记录

## 目标

继续提升游戏质感，重点修正小车粗糙、缺少声音、啃食/受击反馈不足的问题。

## 设计决策

- 小车直接使用素材库中的 `小推车.png`。
- 素材库没有音频文件，因此先使用 Web Audio 程序化生成背景音乐和事件音效。
- 僵尸啃食使用素材库中对应的啃食 GIF。
- 植物被啃食时不仅闪烁，还要出现形变、抖动和咬痕。
- 路障/铁桶/橄榄球类僵尸受击到阈值后触发护甲掉落反馈，并切换成无帽普通僵尸外观。

## 实现内容

- 新增 `src/game/audio.js`，提供背景音乐和种植、阳光、生成、啃食、命中、掉甲、爆炸、割草机、波次预警音效。
- 扩展 `src/game/assets.js`，增加小推车、僵尸啃食动图和僵尸反馈素材映射。
- 扩展 `src/game/systems.js`，记录 eating、bitePulse、armorDropped，并发出音频事件。
- 扩展 `src/game/render.js`，绘制素材小车、啃食动图、植物咬痕和地面掉落护甲。
- 扩展 `scripts/verify-browser.js`，支持直接注入 command 和验证 eating/armorDropped 状态。
- 新增 `tests/browser-feedback-actions.json`，专门验证啃食、植物受击和护甲掉落。

## 验证

- `npm test`: 19 个测试全部通过。
- `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`: 通过。
- `node scripts/verify-browser.js http://localhost:5174 tests/browser-feedback-actions.json`: 通过。
- 截图检查确认：素材小车、啃食 GIF、植物咬痕/形变、掉落护甲均可见。
