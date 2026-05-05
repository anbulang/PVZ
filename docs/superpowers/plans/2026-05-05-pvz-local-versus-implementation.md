# 类 PVZ 本地双人对战 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可玩的浏览器本地双人横向泳道塔防游戏，植物方种植防守，僵尸方投放进攻，并保留未来联机同步的命令队列边界。

**Architecture:** 使用纯 HTML/CSS/JavaScript。游戏逻辑拆成配置、状态、命令、系统、输入和渲染模块；所有玩家操作先进入 command queue，再由固定 tick 推进，渲染层只读状态。

**Tech Stack:** 静态 HTML、CSS、ES Modules、Canvas 2D、Node.js 内置 `node:test`、本地静态服务器、Playwright web game client。

---

## 文件结构

- Create: `index.html`，页面入口，只包含 Canvas 和少量说明容器。
- Create: `src/styles.css`，页面布局、背景、Canvas 尺寸和无障碍隐藏文本。
- Create: `src/main.js`，启动游戏、固定步长循环、连接输入/命令/系统/渲染、暴露测试钩子。
- Create: `src/game/config.js`，网格尺寸、单位数值、资源、冷却、颜色和时间常量。
- Create: `src/game/state.js`，创建/重置 `GameState`，实体 ID 分配，序列化文本状态。
- Create: `src/game/commands.js`，定义并执行植物方和僵尸方命令。
- Create: `src/game/systems.js`，推进资源、冷却、攻击、弹丸、移动、啃咬、伤害和胜负。
- Create: `src/game/input.js`，把鼠标/键盘转换成命令，处理坐标映射。
- Create: `src/game/render.js`，Canvas 绘制战场、HUD、卡牌、单位和特效。
- Create: `tests/state.test.js`，验证初始状态、重置和文本序列化。
- Create: `tests/commands.test.js`，验证种植、铲除、僵尸投放、非法命令和冷却。
- Create: `tests/systems.test.js`，验证资源、攻击、移动、啃咬、死亡和胜负。
- Create: `tests/integration.test.js`，验证命令队列加固定 tick 的完整小循环。
- Create: `tests/browser-actions.json`，Playwright 验证用的点击/等待动作。
- Create/Update: `progress.md`，记录原始提示、实现进度、验证结果和剩余建议。

## Task 1: 项目骨架和测试入口

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`
- Create: `src/game/config.js`
- Create: `progress.md`

- [ ] **Step 1: 写入最小静态页面**

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>花园攻防本地双人版</title>
    <link rel="stylesheet" href="./src/styles.css" />
  </head>
  <body>
    <main class="game-shell">
      <canvas id="game" width="1280" height="720" aria-label="本地双人横向泳道塔防游戏"></canvas>
      <p id="screen-reader-state" class="sr-only" aria-live="polite"></p>
    </main>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: 写入基础样式**

Create `src/styles.css`:

```css
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  background: #24331f;
  color: #f7f0cf;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.game-shell {
  width: min(100vw, 1280px);
  height: min(100vh, 720px);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: #7db64f;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 3: 写入配置常量**

Create `src/game/config.js`:

```js
export const GRID = {
  rows: 5,
  cols: 9,
  left: 110,
  top: 160,
  cellWidth: 104,
  cellHeight: 86,
  deployLeft: 1060,
};

export const ROUND = {
  duration: 180,
  fixedDt: 1 / 60,
  passiveSunInterval: 10,
  passiveSunAmount: 25,
  zombieRampTime: 60,
};

export const PLANTS = {
  sunflower: { side: "plant", name: "向日葵", cost: 50, cooldown: 5, hp: 180, produceEvery: 8, produceAmount: 25 },
  peashooter: { side: "plant", name: "豌豆射手", cost: 100, cooldown: 6, hp: 260, fireEvery: 1.45, damage: 24, projectile: "pea" },
  wallnut: { side: "plant", name: "坚果墙", cost: 50, cooldown: 12, hp: 1150 },
  frostshooter: { side: "plant", name: "寒冰射手", cost: 175, cooldown: 8, hp: 240, fireEvery: 1.8, damage: 16, projectile: "frost" },
};

export const ZOMBIES = {
  basic: { side: "zombie", name: "普通僵尸", cost: 50, cooldown: 3, hp: 160, speed: 20, biteDps: 42 },
  cone: { side: "zombie", name: "路障僵尸", cost: 100, cooldown: 5, hp: 320, speed: 18, biteDps: 48 },
  bucket: { side: "zombie", name: "铁桶僵尸", cost: 175, cooldown: 7, hp: 620, speed: 15, biteDps: 55 },
  runner: { side: "zombie", name: "冲刺僵尸", cost: 125, cooldown: 6, hp: 210, speed: 36, biteDps: 38 },
};

export const PROJECTILES = {
  pea: { speed: 360, radius: 8, color: "#70d44b", slow: 0 },
  frost: { speed: 320, radius: 8, color: "#8bd9ff", slow: 0.45, slowDuration: 3 },
};

export const INITIAL_RESOURCES = {
  sun: 150,
  brain: 100,
};
```

- [ ] **Step 4: 写入可运行的启动占位**

Create `src/main.js`:

```js
import { GRID } from "./game/config.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

function renderBootScreen() {
  ctx.fillStyle = "#7db64f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#26391f";
  ctx.font = "700 42px system-ui";
  ctx.fillText("花园攻防本地双人版", 360, 330);
  ctx.font = "20px system-ui";
  ctx.fillText(`战场：${GRID.rows} 行 x ${GRID.cols} 列`, 520, 370);
}

renderBootScreen();

window.render_game_to_text = () => JSON.stringify({
  mode: "boot",
  note: "origin is top-left; x grows right; y grows down",
});

window.advanceTime = () => {
  renderBootScreen();
};
```

- [ ] **Step 5: 初始化进度文件**

Create `progress.md`:

```markdown
Original prompt: [@superpowers](plugin://superpowers@openai-curated) 做一款植物大战僵尸的游戏

# Progress

- 已确认方向：本地双人，植物方 vs 僵尸方，架构预留未来 WebSocket 同步。
- 已确认约束：不打包原作素材或游戏本体，使用原创 Canvas 绘制素材，保留用户本地素材替换入口。
- 当前计划：先完成核心状态和命令测试，再接入系统、渲染和浏览器验证。
```

- [ ] **Step 6: 运行页面冒烟检查**

Run:

```bash
python3 -m http.server 5173
```

Expected: terminal prints `Serving HTTP on :: port 5173` or `Serving HTTP on 0.0.0.0 port 5173`. Open `http://localhost:5173` and see the boot screen.

- [ ] **Step 7: Commit**

```bash
git add index.html src/styles.css src/main.js src/game/config.js progress.md
git commit -m "feat: scaffold local versus game"
```

## Task 2: 状态模型和文本序列化

**Files:**
- Create: `src/game/state.js`
- Create: `tests/state.test.js`

- [ ] **Step 1: 写失败测试**

Create `tests/state.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";

test("createGameState builds the initial local versus state", () => {
  const state = createGameState();
  assert.equal(state.mode, "playing");
  assert.equal(state.grid.rows, 5);
  assert.equal(state.grid.cols, 9);
  assert.equal(state.resources.plant.sun, 150);
  assert.equal(state.resources.zombie.brain, 100);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.timer.remaining, 180);
  assert.equal(state.winner, null);
});

test("serializeGameState returns concise JSON for automation", () => {
  const state = createGameState();
  const payload = JSON.parse(serializeGameState(state));
  assert.equal(payload.mode, "playing");
  assert.equal(payload.coordinateSystem, "origin top-left; x grows right; y grows down; grid row 0..4 top-bottom col 0..8 left-right");
  assert.deepEqual(payload.resources, { sun: 150, brain: 100 });
  assert.equal(payload.entities.plants.length, 0);
  assert.equal(payload.entities.zombies.length, 0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/state.test.js
```

Expected: FAIL with module not found for `src/game/state.js`.

- [ ] **Step 3: 实现状态模型**

Create `src/game/state.js`:

```js
import { GRID, INITIAL_RESOURCES, PLANTS, ROUND, ZOMBIES } from "./config.js";

export function createGameState() {
  return {
    mode: "playing",
    grid: { rows: GRID.rows, cols: GRID.cols },
    time: 0,
    timer: { remaining: ROUND.duration },
    resources: {
      plant: { sun: INITIAL_RESOURCES.sun, passiveSunClock: 0 },
      zombie: { brain: INITIAL_RESOURCES.brain },
    },
    cards: {
      plant: Object.fromEntries(Object.keys(PLANTS).map((id) => [id, { cooldownRemaining: 0 }])),
      zombie: Object.fromEntries(Object.keys(ZOMBIES).map((id) => [id, { cooldownRemaining: 0 }])),
    },
    selection: null,
    plants: [],
    zombies: [],
    projectiles: [],
    effects: [],
    commandQueue: [],
    nextEntityId: 1,
    status: "植物方选择卡牌种植，僵尸方选择卡牌投放。",
    paused: false,
    winner: null,
  };
}

export function nextId(state, prefix) {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}

export function serializeGameState(state) {
  return JSON.stringify({
    mode: state.mode,
    paused: state.paused,
    gameOver: Boolean(state.winner),
    winner: state.winner,
    coordinateSystem: "origin top-left; x grows right; y grows down; grid row 0..4 top-bottom col 0..8 left-right",
    timeRemaining: Number(state.timer.remaining.toFixed(2)),
    resources: {
      sun: Math.floor(state.resources.plant.sun),
      brain: Math.floor(state.resources.zombie.brain),
    },
    selection: state.selection,
    status: state.status,
    entities: {
      plants: state.plants.map((plant) => ({ id: plant.id, type: plant.type, row: plant.row, col: plant.col, hp: Math.ceil(plant.hp) })),
      zombies: state.zombies.map((zombie) => ({ id: zombie.id, type: zombie.type, row: zombie.row, x: Math.round(zombie.x), hp: Math.ceil(zombie.hp), slowed: zombie.slowTimer > 0 })),
      projectiles: state.projectiles.map((projectile) => ({ id: projectile.id, type: projectile.type, row: projectile.row, x: Math.round(projectile.x) })),
    },
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test tests/state.test.js
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/state.js tests/state.test.js
git commit -m "feat: add game state model"
```

## Task 3: 命令队列和操作校验

**Files:**
- Create: `src/game/commands.js`
- Create: `tests/commands.test.js`

- [ ] **Step 1: 写失败测试**

Create `tests/commands.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import { enqueueCommand, applyCommand, drainCommandQueue } from "../src/game/commands.js";

test("plant placement spends sun and occupies a grid cell", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  assert.equal(state.resources.plant.sun, 50);
  assert.equal(state.plants.length, 1);
  assert.equal(state.plants[0].type, "peashooter");
  assert.equal(state.cards.plant.peashooter.cooldownRemaining > 0, true);
});

test("invalid plant placement leaves state unchanged and sets status", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "frostshooter", row: 0, col: 0 });
  assert.equal(state.plants.length, 0);
  assert.equal(state.resources.plant.sun, 150);
  assert.match(state.status, /阳光不足/);
});

test("zombie deployment spends brain and creates zombie", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 3 });
  assert.equal(state.resources.zombie.brain, 50);
  assert.equal(state.zombies.length, 1);
  assert.equal(state.zombies[0].type, "basic");
});

test("shovel removes an occupied plant cell", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 1, col: 1 });
  applyCommand(state, { type: "shovel", row: 1, col: 1 });
  assert.equal(state.plants.length, 0);
});

test("queued commands drain in order", () => {
  const state = createGameState();
  enqueueCommand(state, { type: "placePlant", plantType: "sunflower", row: 0, col: 0 });
  enqueueCommand(state, { type: "deployZombie", zombieType: "basic", row: 0 });
  drainCommandQueue(state);
  assert.equal(state.commandQueue.length, 0);
  assert.equal(state.plants.length, 1);
  assert.equal(state.zombies.length, 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/commands.test.js
```

Expected: FAIL with module not found for `src/game/commands.js`.

- [ ] **Step 3: 实现命令模块**

Create `src/game/commands.js`:

```js
import { GRID, PLANTS, ZOMBIES } from "./config.js";
import { nextId } from "./state.js";

export function enqueueCommand(state, command) {
  state.commandQueue.push(command);
}

export function drainCommandQueue(state) {
  while (state.commandQueue.length > 0) {
    applyCommand(state, state.commandQueue.shift());
  }
}

export function applyCommand(state, command) {
  if (command.type === "restart") return Object.assign(state, command.createFreshState());
  if (command.type === "togglePause") {
    state.paused = !state.paused;
    state.status = state.paused ? "已暂停。" : "继续游戏。";
    return;
  }
  if (state.winner) {
    state.status = "游戏已结束，按 r 重新开始。";
    return;
  }
  if (command.type === "select") return selectCard(state, command);
  if (command.type === "clearSelection") {
    state.selection = null;
    state.status = "已取消选择。";
    return;
  }
  if (command.type === "placePlant") return placePlant(state, command);
  if (command.type === "shovel") return shovelPlant(state, command);
  if (command.type === "deployZombie") return deployZombie(state, command);
  state.status = "未知命令。";
}

function selectCard(state, command) {
  state.selection = { side: command.side, kind: command.kind, type: command.unitType };
  state.status = `已选择 ${command.unitType}。`;
}

function placePlant(state, command) {
  const config = PLANTS[command.plantType];
  if (!config) return setStatus(state, "未知植物。");
  if (!isGridCell(command.row, command.col)) return setStatus(state, "目标格子无效。");
  if (state.plants.some((plant) => plant.row === command.row && plant.col === command.col)) return setStatus(state, "格子已占用。");
  if (state.resources.plant.sun < config.cost) return setStatus(state, "阳光不足。");
  if (state.cards.plant[command.plantType].cooldownRemaining > 0) return setStatus(state, "植物卡牌冷却中。");

  state.resources.plant.sun -= config.cost;
  state.cards.plant[command.plantType].cooldownRemaining = config.cooldown;
  state.plants.push({
    id: nextId(state, "plant"),
    type: command.plantType,
    row: command.row,
    col: command.col,
    hp: config.hp,
    maxHp: config.hp,
    actionClock: 0,
    flash: 0,
  });
  state.status = `${config.name} 已种植。`;
}

function shovelPlant(state, command) {
  if (!isGridCell(command.row, command.col)) return setStatus(state, "目标格子无效。");
  const before = state.plants.length;
  state.plants = state.plants.filter((plant) => plant.row !== command.row || plant.col !== command.col);
  state.status = state.plants.length < before ? "已铲除植物。" : "这里没有植物。";
}

function deployZombie(state, command) {
  const config = ZOMBIES[command.zombieType];
  if (!config) return setStatus(state, "未知僵尸。");
  if (command.row < 0 || command.row >= GRID.rows) return setStatus(state, "投放行无效。");
  if (state.resources.zombie.brain < config.cost) return setStatus(state, "脑力不足。");
  if (state.cards.zombie[command.zombieType].cooldownRemaining > 0) return setStatus(state, "僵尸卡牌冷却中。");

  state.resources.zombie.brain -= config.cost;
  state.cards.zombie[command.zombieType].cooldownRemaining = config.cooldown;
  state.zombies.push({
    id: nextId(state, "zombie"),
    type: command.zombieType,
    row: command.row,
    x: GRID.deployLeft + 38,
    hp: config.hp,
    maxHp: config.hp,
    slowTimer: 0,
    biteClock: 0,
    flash: 0,
  });
  state.status = `${config.name} 已投放。`;
}

function isGridCell(row, col) {
  return row >= 0 && row < GRID.rows && col >= 0 && col < GRID.cols;
}

function setStatus(state, status) {
  state.status = status;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --test tests/commands.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/commands.js tests/commands.test.js
git commit -m "feat: add command queue"
```

## Task 4: 核心模拟系统

**Files:**
- Create: `src/game/systems.js`
- Create: `tests/systems.test.js`
- Modify: `src/game/config.js`

- [ ] **Step 1: 写失败测试**

Create `tests/systems.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import { applyCommand } from "../src/game/commands.js";
import { updateGame } from "../src/game/systems.js";

function step(state, seconds) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i += 1) updateGame(state, 1 / 60);
}

test("cooldowns and resources advance over time", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 0, col: 0 });
  assert.equal(state.cards.plant.sunflower.cooldownRemaining > 0, true);
  step(state, 8.1);
  assert.equal(state.cards.plant.sunflower.cooldownRemaining, 0);
  assert.equal(state.resources.plant.sun >= 125, true);
  assert.equal(state.resources.zombie.brain > 100, true);
});

test("shooters create projectiles that damage zombies", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 0 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  const hpBefore = state.zombies[0].hp;
  step(state, 4);
  assert.equal(state.projectiles.length >= 0, true);
  assert.equal(state.zombies[0].hp < hpBefore, true);
});

test("zombies bite blocking plants", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "wallnut", row: 1, col: 7 });
  applyCommand(state, { type: "deployZombie", zombieType: "runner", row: 1 });
  const hpBefore = state.plants[0].hp;
  step(state, 5);
  assert.equal(state.plants[0].hp < hpBefore, true);
});

test("zombie wins after crossing the left edge", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "runner", row: 0 });
  state.zombies[0].x = 10;
  step(state, 1);
  assert.equal(state.winner, "zombie");
});

test("plant wins when timer ends and field is clear", () => {
  const state = createGameState();
  state.timer.remaining = 0.05;
  step(state, 0.1);
  assert.equal(state.winner, "plant");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/systems.test.js
```

Expected: FAIL with module not found for `src/game/systems.js`.

- [ ] **Step 3: 实现模拟系统**

Create `src/game/systems.js` with these exported functions and internal helpers:

```js
import { GRID, PLANTS, PROJECTILES, ROUND, ZOMBIES } from "./config.js";
import { drainCommandQueue } from "./commands.js";
import { nextId } from "./state.js";

export function updateGame(state, dt) {
  drainCommandQueue(state);
  if (state.paused || state.winner) return;
  state.time += dt;
  state.timer.remaining = Math.max(0, state.timer.remaining - dt);
  updateCooldowns(state, dt);
  updateResources(state, dt);
  updatePlantActions(state, dt);
  updateProjectiles(state, dt);
  updateZombies(state, dt);
  cleanupDeadEntities(state);
  updateEffects(state, dt);
  updateWinConditions(state);
}

function updateCooldowns(state, dt) {
  for (const card of Object.values(state.cards.plant)) card.cooldownRemaining = Math.max(0, card.cooldownRemaining - dt);
  for (const card of Object.values(state.cards.zombie)) card.cooldownRemaining = Math.max(0, card.cooldownRemaining - dt);
}

function updateResources(state, dt) {
  state.resources.plant.passiveSunClock += dt;
  if (state.resources.plant.passiveSunClock >= ROUND.passiveSunInterval) {
    state.resources.plant.passiveSunClock -= ROUND.passiveSunInterval;
    state.resources.plant.sun += ROUND.passiveSunAmount;
  }
  const brainRate = state.time > ROUND.zombieRampTime ? 4.2 : 2.4;
  state.resources.zombie.brain += brainRate * dt;
}

function updatePlantActions(state, dt) {
  for (const plant of state.plants) {
    plant.actionClock += dt;
    const config = PLANTS[plant.type];
    if (config.produceEvery && plant.actionClock >= config.produceEvery) {
      plant.actionClock = 0;
      state.resources.plant.sun += config.produceAmount;
      state.effects.push({ id: nextId(state, "effect"), type: "sunPop", row: plant.row, col: plant.col, ttl: 0.8 });
    }
    if (config.fireEvery && plant.actionClock >= config.fireEvery && hasZombieAhead(state, plant)) {
      plant.actionClock = 0;
      state.projectiles.push({
        id: nextId(state, "projectile"),
        type: config.projectile,
        row: plant.row,
        x: cellCenterX(plant.col) + 24,
        y: rowCenterY(plant.row),
        damage: config.damage,
      });
    }
  }
}

function hasZombieAhead(state, plant) {
  const origin = cellCenterX(plant.col);
  return state.zombies.some((zombie) => zombie.row === plant.row && zombie.x > origin);
}

function updateProjectiles(state, dt) {
  for (const projectile of state.projectiles) {
    const projectileConfig = PROJECTILES[projectile.type];
    projectile.x += projectileConfig.speed * dt;
    const hit = state.zombies.find((zombie) => zombie.row === projectile.row && Math.abs(zombie.x - projectile.x) < 26);
    if (hit) {
      hit.hp -= projectile.damage;
      hit.flash = 0.12;
      if (projectileConfig.slow > 0) {
        hit.slowTimer = projectileConfig.slowDuration;
      }
      projectile.remove = true;
      state.effects.push({ id: nextId(state, "effect"), type: "hit", x: projectile.x, y: projectile.y, ttl: 0.25 });
    }
    if (projectile.x > GRID.deployLeft + 120) projectile.remove = true;
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.remove);
}

function updateZombies(state, dt) {
  for (const zombie of state.zombies) {
    const config = ZOMBIES[zombie.type];
    zombie.slowTimer = Math.max(0, zombie.slowTimer - dt);
    const blocker = findBlockingPlant(state, zombie);
    if (blocker) {
      blocker.hp -= config.biteDps * dt;
      blocker.flash = 0.1;
    } else {
      const slowFactor = zombie.slowTimer > 0 ? 0.55 : 1;
      zombie.x -= config.speed * slowFactor * dt;
    }
    zombie.flash = Math.max(0, zombie.flash - dt);
  }
}

function findBlockingPlant(state, zombie) {
  return state.plants.find((plant) => plant.row === zombie.row && Math.abs(cellCenterX(plant.col) - zombie.x) < 42);
}

function cleanupDeadEntities(state) {
  state.plants = state.plants.filter((plant) => plant.hp > 0);
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0);
}

function updateEffects(state, dt) {
  for (const effect of state.effects) effect.ttl -= dt;
  state.effects = state.effects.filter((effect) => effect.ttl > 0);
}

function updateWinConditions(state) {
  if (state.zombies.some((zombie) => zombie.x < GRID.left - 55)) {
    state.winner = "zombie";
    state.mode = "gameOver";
    state.status = "僵尸方突破防线。";
    return;
  }
  if (state.timer.remaining <= 0 && state.zombies.length === 0) {
    state.winner = "plant";
    state.mode = "gameOver";
    state.status = "植物方守住了最后一波。";
  }
}

export function cellCenterX(col) {
  return GRID.left + col * GRID.cellWidth + GRID.cellWidth / 2;
}

export function rowCenterY(row) {
  return GRID.top + row * GRID.cellHeight + GRID.cellHeight / 2;
}
```

- [ ] **Step 4: 运行系统测试**

Run:

```bash
node --test tests/systems.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 5: 运行全部核心测试**

Run:

```bash
node --test tests/*.test.js
```

Expected: PASS for state, commands, systems.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems.js tests/systems.test.js src/game/config.js
git commit -m "feat: add combat simulation systems"
```

## Task 5: 输入映射和集成循环

**Files:**
- Create: `src/game/input.js`
- Modify: `src/main.js`
- Create: `tests/integration.test.js`

- [ ] **Step 1: 写集成测试**

Create `tests/integration.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";
import { enqueueCommand } from "../src/game/commands.js";
import { updateGame } from "../src/game/systems.js";

test("command queue plus fixed ticks produces serializable gameplay", () => {
  const state = createGameState();
  enqueueCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  enqueueCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  for (let i = 0; i < 240; i += 1) updateGame(state, 1 / 60);
  const payload = JSON.parse(serializeGameState(state));
  assert.equal(payload.entities.plants.length, 1);
  assert.equal(payload.entities.zombies.length, 1);
  assert.equal(payload.timeRemaining < 180, true);
});
```

- [ ] **Step 2: 实现输入模块**

Create `src/game/input.js`:

```js
import { GRID, PLANTS, ZOMBIES } from "./config.js";
import { enqueueCommand } from "./commands.js";

export function attachInput(canvas, state, createFreshState) {
  canvas.addEventListener("click", (event) => {
    const point = canvasPoint(canvas, event);
    const command = commandFromPoint(state, point);
    if (command) enqueueCommand(state, command);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "p") enqueueCommand(state, { type: "togglePause" });
    if (event.key === "r" && state.winner) enqueueCommand(state, { type: "restart", createFreshState });
    if (event.key === "f") toggleFullscreen(canvas);
  });
}

export function commandFromPoint(state, point) {
  const plantCard = hitCard(point, "plant");
  if (plantCard) return toggleSelection(state, { type: "select", side: "plant", kind: plantCard.kind, unitType: plantCard.id });
  const zombieCard = hitCard(point, "zombie");
  if (zombieCard) return toggleSelection(state, { type: "select", side: "zombie", kind: "zombie", unitType: zombieCard.id });

  const cell = gridCellFromPoint(point);
  if (cell && state.selection?.side === "plant") {
    if (state.selection.kind === "shovel") return { type: "shovel", row: cell.row, col: cell.col };
    return { type: "placePlant", plantType: state.selection.type, row: cell.row, col: cell.col };
  }

  const lane = deployLaneFromPoint(point);
  if (lane !== null && state.selection?.side === "zombie") {
    return { type: "deployZombie", zombieType: state.selection.type, row: lane };
  }

  return { type: "clearSelection" };
}

function toggleSelection(state, command) {
  if (state.selection?.side === command.side && state.selection?.type === command.unitType && state.selection?.kind === command.kind) {
    return { type: "clearSelection" };
  }
  return command;
}

export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export function gridCellFromPoint(point) {
  const col = Math.floor((point.x - GRID.left) / GRID.cellWidth);
  const row = Math.floor((point.y - GRID.top) / GRID.cellHeight);
  if (row < 0 || row >= GRID.rows || col < 0 || col >= GRID.cols) return null;
  return { row, col };
}

export function deployLaneFromPoint(point) {
  if (point.x < GRID.deployLeft || point.x > GRID.deployLeft + 130) return null;
  const row = Math.floor((point.y - GRID.top) / GRID.cellHeight);
  return row >= 0 && row < GRID.rows ? row : null;
}

export function getPlantCardRects() {
  const ids = Object.keys(PLANTS);
  const cards = ids.map((id, index) => ({ id, kind: "plant", x: 22 + index * 92, y: 24, w: 82, h: 104 }));
  cards.push({ id: "shovel", kind: "shovel", x: 22 + ids.length * 92, y: 24, w: 82, h: 104 });
  return cards;
}

export function getZombieCardRects() {
  return Object.keys(ZOMBIES).map((id, index) => ({ id, x: 874 + index * 92, y: 24, w: 82, h: 104 }));
}

function hitCard(point, side) {
  const cards = side === "plant" ? getPlantCardRects() : getZombieCardRects();
  return cards.find((card) => point.x >= card.x && point.x <= card.x + card.w && point.y >= card.y && point.y <= card.y + card.h);
}

function toggleFullscreen(canvas) {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    canvas.requestFullscreen();
  }
}
```

- [ ] **Step 3: 改造启动循环**

Modify `src/main.js` to:

```js
import { enqueueCommand } from "./game/commands.js";
import { attachInput } from "./game/input.js";
import { renderGame } from "./game/render.js";
import { createGameState, serializeGameState } from "./game/state.js";
import { updateGame } from "./game/systems.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const srState = document.querySelector("#screen-reader-state");
let state = createGameState();
let accumulator = 0;
let lastTime = performance.now();
const fixedDt = 1 / 60;

function createFreshState() {
  state = createGameState();
  attachTestHooks();
  return state;
}

attachInput(canvas, state, createFreshState);

function frame(now) {
  const elapsed = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  while (accumulator >= fixedDt) {
    updateGame(state, fixedDt);
    accumulator -= fixedDt;
  }
  renderGame(ctx, state);
  srState.textContent = state.status;
  requestAnimationFrame(frame);
}

function attachTestHooks() {
  window.__gameState = state;
  window.__enqueueGameCommand = (command) => enqueueCommand(state, command);
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) updateGame(state, fixedDt);
    renderGame(ctx, state);
  };
  window.render_game_to_text = () => serializeGameState(state);
}

attachTestHooks();
renderGame(ctx, state);
requestAnimationFrame(frame);
```

- [ ] **Step 4: 暂时创建渲染占位以解除导入错误**

Create `src/game/render.js`:

```js
export function renderGame(ctx, state) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#7db64f";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#24331f";
  ctx.font = "700 32px system-ui";
  ctx.fillText("花园攻防本地双人版", 440, 70);
  ctx.font = "20px system-ui";
  ctx.fillText(`阳光 ${Math.floor(state.resources.plant.sun)} | 脑力 ${Math.floor(state.resources.zombie.brain)} | 剩余 ${Math.ceil(state.timer.remaining)} 秒`, 360, 110);
  ctx.fillText(state.status, 360, 650);
}
```

- [ ] **Step 5: 运行集成测试**

Run:

```bash
node --test tests/integration.test.js
```

Expected: PASS, 1 test.

- [ ] **Step 6: 运行全部测试**

Run:

```bash
node --test tests/*.test.js
```

Expected: PASS for all tests.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/game/input.js src/game/render.js tests/integration.test.js
git commit -m "feat: connect input and fixed tick loop"
```

## Task 6: Canvas 成品渲染

**Files:**
- Modify: `src/game/render.js`

- [ ] **Step 1: 替换完整渲染器**

Modify `src/game/render.js` to export:

```js
import { GRID, PLANTS, PROJECTILES, ZOMBIES } from "./config.js";
import { cellCenterX, rowCenterY } from "./systems.js";
import { getPlantCardRects, getZombieCardRects } from "./input.js";

export function renderGame(ctx, state) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
  drawHud(ctx, state);
  drawGrid(ctx, state);
  drawProjectiles(ctx, state);
  drawPlants(ctx, state);
  drawZombies(ctx, state);
  drawEffects(ctx, state);
  drawStatus(ctx, state);
  if (state.paused || state.winner) drawOverlay(ctx, state);
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#d7ef94");
  gradient.addColorStop(0.55, "#7fb64f");
  gradient.addColorStop(1, "#476b37");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + i * 118, 142 + Math.sin(i) * 16, 55, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state) {
  drawPanel(ctx, 16, 16, 552, 120, "#f7e8a6");
  drawPanel(ctx, 712, 16, 552, 120, "#ded6c9");
  ctx.fillStyle = "#26391f";
  ctx.font = "700 22px system-ui";
  ctx.fillText(`阳光 ${Math.floor(state.resources.plant.sun)}`, 34, 48);
  ctx.fillText(`脑力 ${Math.floor(state.resources.zombie.brain)}`, 730, 48);
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(state.timer.remaining)} 秒`, 640, 58);
  ctx.textAlign = "left";
  for (const card of getPlantCardRects()) drawCard(ctx, state, card, "plant");
  for (const card of getZombieCardRects()) drawCard(ctx, state, card, "zombie");
}

function drawCard(ctx, state, card, side) {
  const selected = state.selection?.side === side && state.selection?.type === card.id;
  drawPanel(ctx, card.x, card.y, card.w, card.h, selected ? "#fff0a8" : "#f9f2d0");
  ctx.save();
  ctx.translate(card.x + card.w / 2, card.y + 45);
  if (side === "plant" && card.id !== "shovel") drawPlantIcon(ctx, card.id, 0, 0, 0);
  if (side === "zombie") drawZombieIcon(ctx, card.id, 0, 0, 0);
  if (card.id === "shovel") drawShovel(ctx, 0, 0);
  ctx.restore();
  const config = side === "plant" ? PLANTS[card.id] : ZOMBIES[card.id];
  ctx.fillStyle = "#26391f";
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(card.id === "shovel" ? "铲子" : config.name, card.x + card.w / 2, card.y + 84);
  ctx.fillText(card.id === "shovel" ? "移除" : String(config.cost), card.x + card.w / 2, card.y + 101);
  ctx.textAlign = "left";
  const cooldown = card.id === "shovel" ? 0 : state.cards[side][card.id].cooldownRemaining;
  if (cooldown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(card.x, card.y, card.w, card.h * Math.min(1, cooldown / config.cooldown));
  }
}

function drawGrid(ctx, state) {
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      const x = GRID.left + col * GRID.cellWidth;
      const y = GRID.top + row * GRID.cellHeight;
      ctx.fillStyle = (row + col) % 2 === 0 ? "#8bc85a" : "#7cba4e";
      ctx.fillRect(x, y, GRID.cellWidth, GRID.cellHeight);
      ctx.strokeStyle = "rgba(42,74,32,0.3)";
      ctx.strokeRect(x, y, GRID.cellWidth, GRID.cellHeight);
    }
  }
  ctx.fillStyle = "rgba(85,73,64,0.65)";
  ctx.fillRect(GRID.deployLeft, GRID.top, 132, GRID.rows * GRID.cellHeight);
  ctx.fillStyle = "#fff7c2";
  ctx.font = "700 16px system-ui";
  ctx.fillText("僵尸投放区", GRID.deployLeft + 18, GRID.top - 12);
}

function drawPlants(ctx, state) {
  for (const plant of state.plants) {
    drawPlantIcon(ctx, plant.type, cellCenterX(plant.col), rowCenterY(plant.row), state.time, plant);
    drawHealth(ctx, cellCenterX(plant.col) - 32, rowCenterY(plant.row) + 34, 64, plant.hp / plant.maxHp, "#3b8f2d");
  }
}

function drawZombies(ctx, state) {
  for (const zombie of state.zombies.toSorted((a, b) => a.x - b.x)) {
    drawZombieIcon(ctx, zombie.type, zombie.x, rowCenterY(zombie.row), state.time, zombie);
    drawHealth(ctx, zombie.x - 32, rowCenterY(zombie.row) + 38, 64, zombie.hp / zombie.maxHp, "#8e2f2b");
  }
}

function drawProjectiles(ctx, state) {
  for (const projectile of state.projectiles) {
    const config = PROJECTILES[projectile.type];
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y - 12, config.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(38,57,31,0.45)";
    ctx.stroke();
  }
}

function drawEffects(ctx, state) {
  for (const effect of state.effects) {
    ctx.globalAlpha = Math.max(0, effect.ttl);
    ctx.fillStyle = effect.type === "sunPop" ? "#ffd64d" : "#ffffff";
    const x = effect.x ?? cellCenterX(effect.col);
    const y = effect.y ?? rowCenterY(effect.row);
    ctx.beginPath();
    ctx.arc(x, y - 22, 18 + (1 - effect.ttl) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawStatus(ctx, state) {
  drawPanel(ctx, 220, 628, 840, 58, "#f7e8a6");
  ctx.fillStyle = "#26391f";
  ctx.font = "700 20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(state.status, 640, 665);
  ctx.textAlign = "left";
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = "rgba(20, 30, 18, 0.52)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#fff5bd";
  ctx.font = "800 48px system-ui";
  ctx.textAlign = "center";
  const text = state.winner ? (state.winner === "plant" ? "植物方胜利" : "僵尸方胜利") : "暂停";
  ctx.fillText(text, 640, 335);
  ctx.font = "22px system-ui";
  ctx.fillText(state.winner ? "按 r 重新开始" : "按 p 继续", 640, 378);
  ctx.textAlign = "left";
}

function drawPlantIcon(ctx, type, x, y, time = 0, plant = null) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 4 + x) * 2);
  if (plant?.flash > 0) ctx.globalAlpha = 0.55;
  if (type === "sunflower") drawSunflower(ctx);
  if (type === "peashooter") drawPeashooter(ctx, "#65b84d");
  if (type === "wallnut") drawWallnut(ctx);
  if (type === "frostshooter") drawPeashooter(ctx, "#72c8d8");
  ctx.restore();
}

function drawZombieIcon(ctx, type, x, y, time = 0, zombie = null) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 6 + x) * 2);
  if (zombie?.flash > 0) ctx.globalAlpha = 0.55;
  ctx.fillStyle = type === "runner" ? "#7d9c72" : "#8f987e";
  ctx.fillRect(-18, -30, 36, 58);
  ctx.fillStyle = "#5e6a5a";
  ctx.beginPath();
  ctx.arc(0, -42, 23, 0, Math.PI * 2);
  ctx.fill();
  if (type === "cone") {
    ctx.fillStyle = "#db7e2b";
    ctx.beginPath();
    ctx.moveTo(-20, -58);
    ctx.lineTo(20, -58);
    ctx.lineTo(0, -94);
    ctx.closePath();
    ctx.fill();
  }
  if (type === "bucket") {
    ctx.fillStyle = "#9fa8b3";
    ctx.fillRect(-22, -70, 44, 22);
  }
  ctx.fillStyle = "#1f241f";
  ctx.beginPath();
  ctx.arc(-8, -45, 3, 0, Math.PI * 2);
  ctx.arc(8, -45, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunflower(ctx) {
  ctx.fillStyle = "#ffd24b";
  for (let i = 0; i < 10; i += 1) {
    ctx.rotate(Math.PI / 5);
    ctx.beginPath();
    ctx.ellipse(0, -25, 9, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#8b5c33";
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeashooter(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-8, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(24, -2, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f3322";
  ctx.beginPath();
  ctx.arc(-15, -7, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallnut(ctx) {
  ctx.fillStyle = "#b8874b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 39, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6e4f31";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#2c2118";
  ctx.beginPath();
  ctx.arc(-9, -8, 3, 0, Math.PI * 2);
  ctx.arc(10, -8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShovel(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#826a4a";
  ctx.fillRect(-4, -30, 8, 54);
  ctx.fillStyle = "#b6c0c7";
  ctx.beginPath();
  ctx.ellipse(0, -38, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, color) {
  ctx.fillStyle = "rgba(53, 68, 35, 0.25)";
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#5e6d36";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}

function drawHealth(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), 7);
}
```

- [ ] **Step 2: 运行全部测试，捕获语法错误**

Run:

```bash
node --test tests/*.test.js
```

Expected: PASS for all tests.

- [ ] **Step 3: Commit**

```bash
git add src/game/render.js
git commit -m "feat: draw polished canvas battlefield"
```

## Task 7: 浏览器验证和调平

**Files:**
- Create: `tests/browser-actions.json`
- Modify: `progress.md`
- Modify: balance files only if verification exposes issues: `src/game/config.js`, `src/game/systems.js`, `src/game/render.js`, `src/game/input.js`

- [ ] **Step 1: 写 Playwright 动作文件**

Create `tests/browser-actions.json`:

```json
{
  "steps": [
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 68, "mouse_y": 70 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 266, "mouse_y": 374 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 160, "mouse_y": 70 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 370, "mouse_y": 374 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 915, "mouse_y": 70 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 1110, "mouse_y": 374 },
    { "buttons": [], "frames": 240 }
  ]
}
```

- [ ] **Step 2: 启动本地服务器**

Run:

```bash
python3 -m http.server 5173
```

Expected: `http://localhost:5173` serves `index.html`.

- [ ] **Step 3: 运行网页游戏客户端**

Run:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export WEB_GAME_CLIENT="$CODEX_HOME/skills/develop-web-game/scripts/web_game_playwright_client.js"
node "$WEB_GAME_CLIENT" --url http://localhost:5173 --actions-file tests/browser-actions.json --iterations 1 --pause-ms 250
```

Expected:

- Browser console has no new JavaScript errors.
- `render_game_to_text()` shows at least one plant and one zombie after clicks.
- Screenshot shows lawn grid, cards, deployed units, projectiles or combat feedback.

- [ ] **Step 4: 检查截图**

Open the latest screenshot produced by the web game client. Expected visual state:

- Top left plant cards are readable.
- Top right zombie cards are readable.
- Middle battlefield is 5 visible lanes.
- At least one plant appears in a grid cell.
- At least one zombie appears in the same row after deployment.
- Status bar text does not overlap important UI.

- [ ] **Step 5: 修复验证暴露的问题**

If clicks miss cards or lanes, adjust only `src/game/input.js` card rectangles or grid constants.

If combat does not begin within four seconds, adjust only `src/game/config.js` projectile speed, zombie spawn x, or shooter cadence.

If text overlaps, adjust only `src/game/render.js` HUD positions or font sizes.

After each fix, rerun:

```bash
node --test tests/*.test.js
node "$WEB_GAME_CLIENT" --url http://localhost:5173 --actions-file tests/browser-actions.json --iterations 1 --pause-ms 250
```

Expected: tests pass and screenshot matches Step 4.

- [ ] **Step 6: 更新进度文件**

Append to `progress.md`:

```markdown

## Verification

- Ran `node --test tests/*.test.js`: PASS.
- Ran web game Playwright client against `http://localhost:5173`: PASS.
- Screenshot checked: cards, grid, plants, zombies, and status bar visible.

## Next Suggestions

- Add real WebSocket room transport using the existing command queue.
- Add optional user-supplied asset manifest under `assets/manifest.json`.
- Add more balance presets for short, normal, and long matches.
```

- [ ] **Step 7: Final commit**

```bash
git add tests/browser-actions.json progress.md src/game/config.js src/game/systems.js src/game/render.js src/game/input.js
git commit -m "test: verify playable local versus flow"
```

## 自检

Spec coverage:

- 5 x 9 战场：Task 1 config、Task 6 render。
- 植物种植、铲子、僵尸投放：Task 3 commands、Task 5 input。
- 阳光和脑力资源：Task 4 systems。
- 自动攻击、移动、啃咬、伤害、死亡：Task 4 systems。
- 胜负条件：Task 4 systems。
- 固定 tick、命令队列、未来联网边界：Task 3 commands、Task 5 main loop。
- `advanceTime` 和 `render_game_to_text`：Task 2 state、Task 5 main。
- 原创 Canvas 美术：Task 6 render。
- 自动化验证和截图检查：Task 7 browser verification。

Completeness scan:

- Plan contains no unresolved markers or unspecified implementation steps.

Type consistency:

- Command names used consistently: `placePlant`, `shovel`, `deployZombie`, `select`, `clearSelection`, `togglePause`, `restart`.
- State properties used consistently: `resources.plant.sun`, `resources.zombie.brain`, `cards.plant`, `cards.zombie`, `plants`, `zombies`, `projectiles`, `winner`.
- Test hooks used consistently: `window.advanceTime(ms)`, `window.render_game_to_text()`, `window.__enqueueGameCommand(command)`.
