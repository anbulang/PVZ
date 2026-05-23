# 类 PVZ 本地双人对战实施计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。本计划使用 checkbox（`- [ ]`）追踪进度。

**目标：** 构建一个可玩的浏览器本地双人横向泳道塔防游戏：植物方种植防守，僵尸方投放进攻，同时保留未来 WebSocket 联机同步所需的命令队列边界。

**架构：** 使用纯 HTML、CSS 和 JavaScript。游戏逻辑拆分为配置、状态、命令、系统、输入和渲染模块；所有玩家操作先进入 command queue，再由固定 tick 推进；渲染层只读取状态，不修改规则。

**技术栈：** 静态 HTML、CSS、ES Modules、Canvas 2D、Node.js 内置 `node:test`、本地静态服务器、Playwright 网页游戏验证。

---

## 文件结构

- 新增 `index.html`：页面入口，只包含 Canvas 和少量说明容器。
- 新增 `src/styles.css`：页面布局、背景、Canvas 尺寸和无障碍隐藏文本。
- 新增 `src/main.js`：启动游戏、固定步长循环、连接输入、命令、系统和渲染，暴露测试钩子。
- 新增 `src/game/config.js`：网格尺寸、单位数值、资源、冷却、颜色和时间常量。
- 新增 `src/game/state.js`：创建和重置 `GameState`，分配实体 ID，序列化文本状态。
- 新增 `src/game/commands.js`：定义并执行植物方和僵尸方命令。
- 新增 `src/game/systems.js`：推进资源、冷却、攻击、弹丸、移动、啃咬、伤害和胜负。
- 新增 `src/game/input.js`：把鼠标和键盘事件转换成命令，处理坐标映射。
- 新增 `src/game/render.js`：Canvas 绘制战场、HUD、卡牌、单位和特效。
- 新增 `tests/state.test.js`：验证初始状态、重置和文本序列化。
- 新增 `tests/commands.test.js`：验证种植、铲除、僵尸投放、非法命令和冷却。
- 新增 `tests/systems.test.js`：验证资源、攻击、移动、啃咬、死亡和胜负。
- 新增 `tests/integration.test.js`：验证命令队列和固定 tick 的完整小循环。
- 新增 `tests/browser-actions.json`：Playwright 验证用点击和等待动作。
- 新增或更新 `progress.md`：记录原始提示、实现进度、验证结果和剩余建议。

## 任务 1：项目骨架和测试入口

- [ ] 创建 `index.html`，使用 `zh-CN` 页面语言，包含 `#game` Canvas 和 `#screen-reader-state`。
- [ ] 创建 `src/styles.css`，让页面居中显示 1280x720 Canvas，并提供 `.sr-only` 无障碍样式。
- [ ] 创建 `src/game/config.js`，定义 `GRID`、`ROUND`、`PLANTS`、`ZOMBIES`、`PROJECTILES` 和初始资源。
- [ ] 创建 `src/main.js` 的启动占位，绘制启动画面，暴露 `window.render_game_to_text()` 和 `window.advanceTime()`。
- [ ] 初始化 `progress.md`。
- [ ] 运行 `python3 -m http.server 5173`，打开 `http://localhost:5173` 确认启动画面可见。
- [ ] 提交信息建议：`feat: scaffold local versus game`。

## 任务 2：状态模型和文本序列化

- [ ] 创建 `src/game/state.js`，提供 `createGameState()`、`resetGameState()`、`nextEntityId()` 和 `renderGameToText()`。
- [ ] 状态中包含植物、僵尸、弹丸、效果、资源、冷却、倒计时、选择状态、命令队列、暂停和胜负状态。
- [ ] `renderGameToText()` 返回稳定 JSON，包含坐标系说明、资源、可见实体、当前选择和胜利方。
- [ ] 编写 `tests/state.test.js`，覆盖初始资源、空实体列表、重置行为和序列化字段。
- [ ] 运行 `node --test tests/state.test.js`。
- [ ] 提交信息建议：`feat: add game state model`。

## 任务 3：命令层

- [ ] 创建 `src/game/commands.js`，实现 `enqueueCommand()` 和 `applyCommand()`。
- [ ] 支持 `selectPlant`、`placePlant`、`selectZombie`、`deployZombie`、`selectShovel`、`shovelPlant`、`togglePause`、`restart`。
- [ ] 非法命令不抛异常，只更新简短状态消息并保持状态不变。
- [ ] 命令层负责资源扣减、冷却设置、占格检查、投放行检查和胜负后拒绝操作。
- [ ] 编写 `tests/commands.test.js`，覆盖种植、铲除、僵尸投放、资源不足、冷却、占用格和非法行。
- [ ] 运行 `node --test tests/commands.test.js`。
- [ ] 提交信息建议：`feat: add local versus commands`。

## 任务 4：模拟系统

- [ ] 创建 `src/game/systems.js`，用固定步长推进资源、冷却、倒计时和战斗。
- [ ] 植物自动攻击同一行最近僵尸，豌豆类弹丸直线飞行。
- [ ] 僵尸向左移动，遇到植物后停下啃咬。
- [ ] 处理伤害、减速、死亡、弹丸清理和胜负判断。
- [ ] 植物方胜利条件：倒计时归零且场上没有存活僵尸。
- [ ] 僵尸方胜利条件：任意僵尸突破左侧防线。
- [ ] 编写 `tests/systems.test.js`，覆盖资源增长、向日葵产阳光、攻击、弹丸命中、僵尸啃咬、死亡和胜负。
- [ ] 运行 `node --test tests/systems.test.js`。
- [ ] 提交信息建议：`feat: simulate lane combat`。

## 任务 5：输入映射和主循环

- [ ] 创建 `src/game/input.js`，把鼠标点击映射为卡牌选择、格子种植、铲除和僵尸投放命令。
- [ ] 支持键盘快捷键：`p` 暂停或继续、`r` 重开、`f` 切换全屏。
- [ ] 在 `src/main.js` 中接入状态、命令、系统、输入和渲染。
- [ ] 使用 accumulator 固定 tick 推进模拟，避免帧率影响规则。
- [ ] 暴露 `window.advanceTime(ms)` 供测试确定性推进。
- [ ] 更新 `window.render_game_to_text()`，返回真实游戏状态摘要。
- [ ] 编写 `tests/integration.test.js`，覆盖命令队列和主循环的小闭环。
- [ ] 运行 `npm test`。
- [ ] 提交信息建议：`feat: wire game loop and input`。

## 任务 6：Canvas 渲染

- [ ] 创建 `src/game/render.js`，绘制背景、5x9 草坪、投放区、卡牌、资源、倒计时、状态栏和胜负 overlay。
- [ ] 每种植物和僵尸用原创 Canvas 卡通形状表现，轮廓和颜色要容易区分。
- [ ] 绘制弹丸、受击闪烁、冷却遮罩、资源不足遮罩、当前选择和非法操作提示。
- [ ] 渲染逻辑只读取状态，不直接修改规则。
- [ ] 保留 `assets/` 映射入口，后续用户可自行替换本地素材。
- [ ] 用浏览器打开页面，人工检查卡牌、战场、植物、僵尸、弹丸、投放区和状态栏可见。
- [ ] 提交信息建议：`feat: render local versus canvas game`。

## 任务 7：浏览器自动化验证

- [ ] 创建 `tests/browser-actions.json`，描述植物选择、种植、僵尸选择、投放和推进时间的流程。
- [ ] 使用 Playwright 或项目验证脚本打开本地页面。
- [ ] 检查 `window.render_game_to_text()` 中至少包含 2 个植物、1 个僵尸和活动弹丸。
- [ ] 检查浏览器 console 无新增错误。
- [ ] 截图确认卡牌、5 行草坪、植物、僵尸、弹丸、投放区和状态栏都可见。
- [ ] 运行 `npm test`。
- [ ] 运行 `node scripts/verify-browser.js http://localhost:5173 tests/browser-actions.json` 或等价浏览器验证命令。
- [ ] 提交信息建议：`test: verify browser game flow`。

## 需求追踪

- 5 x 9 战场：任务 1 配置，任务 6 渲染。
- 植物种植、铲子和僵尸投放：任务 3 命令，任务 5 输入。
- 阳光和脑力资源：任务 4 系统。
- 自动攻击、移动、啃咬、伤害和死亡：任务 4 系统。
- 胜负条件：任务 4 系统。
- 固定 tick、命令队列和未来联网边界：任务 3 命令，任务 5 主循环。
- `advanceTime` 和 `render_game_to_text`：任务 2 状态，任务 5 主入口。
- 原创 Canvas 美术：任务 6 渲染。
- 自动化验证和截图检查：任务 7 浏览器验证。

## 完成标准

- 页面能在本地浏览器打开并完成一局本地双人攻防。
- 植物方和僵尸方资源、选择、冷却和非法操作提示可读。
- 战斗循环包含种植、投放、攻击、移动、啃咬、死亡和胜负。
- 所有核心逻辑由 Node 测试覆盖。
- 浏览器验证能证明真实页面可交互、状态正确、截图可读、console 无错误。
- 不打包原作 PVZ 受版权保护素材或游戏本体。
