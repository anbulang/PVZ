# PVZ 本地双人公平性与 UI 实施计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。本计划使用 checkbox（`- [ ]`）追踪进度。

**目标：** 把当前偏向植物方的防守原型调整为更公平的本地双人对战，同时清理最显眼的 HUD、场景和精灵图问题。

**架构：** 保留现有 Canvas 渲染器和可序列化游戏状态。规则变化通过 `src/game/config.js`、`src/game/systems.js`、`src/game/commands.js` 落地；视觉和点击热区变化通过 `src/game/input.js`、`src/game/render.js`、生成素材和浏览器截图验证落地。规则改动和视觉精修分开推进，避免一次改动同时破坏数值和界面。

**技术栈：** JavaScript ES modules、Canvas 2D、Node `node:test`、本地 HTTP server、`scripts/verify-browser.js` 浏览器验证。

---

## 范围

本计划把用户反馈的问题合并为一轮本地双人对战体验修复：

- 小范围平衡修复：小鬼僵尸脑力值下调到 `40`。
- 核心规则调整：取消自动僵尸波次，僵尸方负责所有僵尸投放。
- 双人节奏调整：植物方不能只靠等待过早获胜。
- HUD 清理：太阳和铲子归入同一植物工具区；脑力、时间、压力归入对齐的中央信息区。
- 美术清理：左侧房子、脑力图标、双发射手轮廓、僵尸死亡方向和右侧投放区。

本计划不新增单位、地图、在线多人、账号系统，也不迁移到 Phaser。

## 文件结构

- 修改 `src/game/config.js`
  - 调整单位成本、回合时长和资源节奏常量。
- 修改 `src/game/systems.js`
  - 关闭 director 自动刷怪，改为手动对战压力模型；调整胜负逻辑；修复死亡 effect 元数据。
- 修改 `src/game/commands.js`
  - 保持投放校验严格；为僵尸方手动决策补充必要状态提示。
- 修改 `src/game/input.js`
  - 重新整理植物工具区、植物卡牌、中央信息块、僵尸卡牌和僵尸投放热区。
- 修改 `src/game/render.js`
  - 绘制新版 HUD、更清晰脑力图标、整合铲子槽、对齐僵尸侧界面、修正死亡和场景表现。
- 修改 `src/game/assets.js`
  - 优先使用生成素材中的房子、脑力、双发射手和死亡相关资源。
- 修改 `scripts/remaster-imagegen-assets.py`
  - 重新生成或归一化房子、脑力图标、双发射手、僵尸死亡条和投放区 UI 素材，确保锚点稳定。
- 修改 `tests/commands.test.js`
  - 覆盖成本和可负担性。
- 修改 `tests/systems.test.js`
  - 覆盖无自动刷怪、手动僵尸压力、植物超时胜利和死亡方向元数据。
- 修改 `tests/layout.test.js`
  - 覆盖 HUD 不重叠和点击热区对齐。
- 修改 `tests/assets.test.js`
  - 覆盖房子、脑力、双发射手和死亡条的生成素材 manifest。
- 修改浏览器动作文件
  - 覆盖 HUD、投放区、手动双人流程和视觉素材验证。

## 任务 1：小鬼僵尸成本改为 40

- [ ] 在 `tests/commands.test.js` 中更新小鬼僵尸成本测试，期望初始 `100` 脑力投放后剩余 `60`。
- [ ] 运行 `node --test tests/commands.test.js`，确认当前实现先失败。
- [ ] 在 `src/game/config.js` 中把 `imp` 成本改为 `40`。
- [ ] 重新运行 `node --test tests/commands.test.js`，确认通过。
- [ ] 提交信息建议：`balance: lower imp zombie brain cost`。

## 任务 2：取消自动僵尸波次

- [ ] 在 `tests/systems.test.js` 中用“已开始模拟 90 秒后不会自动生成僵尸”的测试替换旧自动波次测试。
- [ ] 移除或旁路 `updateDirector()` 的自动 warning / spawn 行为。
- [ ] 将 pressure 改成场上僵尸和僵尸资源节奏的可视化指标。
- [ ] 确认 `state.director.waveCount` 不再因自动刷怪增加。
- [ ] 运行 `node --test tests/systems.test.js`。

## 任务 3：重调双人回合节奏

- [ ] 增加测试：倒计时归零但场上仍有僵尸时，植物方不能立即获胜。
- [ ] 增加测试：僵尸方在手动对战模式下可以稳定恢复足够脑力，持续投放低成本压力单位。
- [ ] 调整 `ROUND.duration`、`ROUND.zombieRampTime`、被动阳光、脑力恢复和上限。
- [ ] 保持胜负规则清晰：僵尸突破左侧则僵尸方胜；时间结束且没有存活僵尸时植物方胜。
- [ ] 运行 `node --test tests/systems.test.js`。

## 任务 4：锁定 HUD 和点击热区契约

- [ ] 在 `tests/layout.test.js` 中覆盖太阳、铲子、植物卡牌不重叠。
- [ ] 覆盖时间、脑力、压力中央信息块高度和宽度对齐。
- [ ] 覆盖僵尸投放区与 5 条草坪行中心对齐。
- [ ] 在 `src/game/input.js` 中集中导出所有 HUD 矩形，作为渲染和点击命中共同来源。
- [ ] 运行 `node --test tests/layout.test.js`。

## 任务 5：精修 HUD 绘制

- [ ] 让 `src/game/render.js` 只读取 `input.js` 中的 HUD 矩形绘制卡牌、资源和状态块。
- [ ] 太阳与铲子显示为同一植物工具区的一组控件。
- [ ] 中央信息列展示剩余时间、脑力和压力，不再出现过大的空白脑力框。
- [ ] 僵尸卡牌区使用更大的可读缩略图和统一费用 chip。
- [ ] 运行布局测试和主浏览器流程。

## 任务 6：修复关键生成素材

- [ ] 在 `scripts/remaster-imagegen-assets.py` 中生成或重建左侧房子条、脑力图标、双发射手和僵尸死亡条。
- [ ] 确保生成素材有稳定透明边距和底部锚点。
- [ ] 在 `tests/assets.test.js` 中覆盖素材存在、尺寸合法和 manifest 路径。
- [ ] 运行 `python3 scripts/remaster-imagegen-assets.py`。
- [ ] 运行 `node --test tests/assets.test.js`。

## 任务 7：修正僵尸死亡方向

- [ ] 在 `tests/systems.test.js` 中覆盖 `zombieDeath` effect 带有 `anchor: "ground"` 和 `motion: "fall-down"`。
- [ ] 在 `src/game/systems.js` 中生成带地面锚点的死亡 effect。
- [ ] 在 `src/game/render.js` 中让死亡动画向前或向下倒地，不向上漂移。
- [ ] 覆盖普通、小鬼、旗帜、路障、铁门、铁桶、冰车、橄榄球等当前可玩僵尸。
- [ ] 运行系统测试和 unit-state 浏览器验证。

## 任务 8：浏览器验收

- [ ] 更新 `tests/browser-actions.json`，保留手动双人流程：植物放置、僵尸投放、战斗推进。
- [ ] 更新 `tests/browser-layout-actions.json`，检查 HUD、投放区、房子和小车。
- [ ] 更新 `tests/browser-visual-assets-actions.json`，检查房子、脑力、双发射手和死亡动画资源。
- [ ] 运行 `npm test`。
- [ ] 运行 `git diff --check`。
- [ ] 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`。
- [ ] 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json`。
- [ ] 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json`。

## 完成标准

- 小鬼僵尸成本为 `40`，且命令层测试覆盖该行为。
- 没有自动僵尸波次，僵尸压力来自玩家手动投放。
- 植物方无法在场上仍有僵尸时靠倒计时立即获胜。
- HUD 视觉框和点击热区一致，太阳、铲子、卡牌、中央信息和僵尸面板不重叠。
- 左侧房子、小车、脑力图标、双发射手和僵尸死亡动画在截图中可读。
- `npm test`、`git diff --check` 和主要浏览器验证通过。
