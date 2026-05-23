# PVZ 本地双人对战规则实施计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。本计划使用 checkbox（`- [ ]`）追踪进度。

**目标：** 移除自动僵尸波次，让僵尸压力完全来自本地双人模式中僵尸玩家的手动投放。

**架构：** 继续由 `state.js` / `systems.js` 保存和推进模拟状态，由 `commands.js` 执行命令突变。渲染层基本不改，只保留现有 director 序列化字段。`director` 从自动刷怪器调整为压力和调试模型。

**技术栈：** JavaScript ES modules、Canvas 2D、Node `node:test`、Playwright 浏览器验证。

---

## 文件结构

- 修改 `src/game/config.js`：增加僵尸脑力恢复常量。
- 修改 `src/game/state.js`：增加并序列化 `director.autoWaves` 和 `director.manualDeployCount`。
- 修改 `src/game/commands.js`：手动投放僵尸时增加投放计数和压力值。
- 修改 `src/game/systems.js`：移除自动 warning / spawn 行为，并根据场上僵尸计算压力。
- 修改 `tests/systems.test.js`：用本地对战压力测试替换自动波次测试。
- 修改 `tests/browser-actions.json`：移除 `minWaveCount` 期望。
- 运行既有浏览器场景，确认视觉和动画流程不退化。

## 任务 1：停止自动僵尸波次

- [ ] 写一个失败系统测试，证明 `updateGame()` 在已开始的长时间模拟后不会自动生成僵尸。
- [ ] 将 `updateDirector()` 的自动 warning / spawn 逻辑替换为只计算压力的逻辑。
- [ ] 确认新增测试通过。

## 任务 2：记录手动僵尸压力

- [ ] 写一个失败系统测试，证明手动 `deployZombie` 会增加 `manualDeployCount`。
- [ ] 更新命令和状态序列化，暴露 `manualDeployCount` 和 `autoWaves: false`。
- [ ] 手动投放僵尸时适度提高压力值。
- [ ] 确认新增测试通过。

## 任务 3：保持浏览器主流程通过

- [ ] 从 `tests/browser-actions.json` 中移除 `minWaveCount`。
- [ ] 运行 `npm test`。
- [ ] 运行 `node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json`。
- [ ] 运行布局和视觉精修相关浏览器验证。
