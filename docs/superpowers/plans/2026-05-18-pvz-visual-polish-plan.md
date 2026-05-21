# PVZ 本地对战视觉精修实施计划

> **给 agentic workers:** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行。本计划使用 checkbox（`- [ ]`）追踪进度。

**目标:** 在不大改现有版式和玩法规则的前提下，修复当前 PVZ 本地对战画面的 HUD 对齐、素材完整性、僵尸死亡方向、小鬼成本和多窗口截图验收问题。

**架构：** 保留当前 Canvas 2D 渲染、固定逻辑坐标和现有模块边界。输入命中区继续由 `src/game/input.js` 统一导出，渲染层只读取这些矩形；素材优先走 `generated-assets/` 和 `src/game/assets.js` manifest；行为改动必须先写 `node:test` 失败用例。

**技术栈：** JavaScript ES modules、Canvas 2D、Node `node:test`、Playwright、`scripts/verify-browser.js`、`generated-assets/` 精灵图资源。

---

## 文件结构

- 修改 `src/game/config.js`
  - 小鬼僵尸成本从 `60` 调整为 `40`。
- 修改 `src/game/input.js`
  - 精修太阳、铲子、植物卡牌、中央信息、僵尸卡牌、投放区的命中矩形。
- 修改 `src/game/render.js`
  - 使用同一组输入矩形绘制 HUD；替换脑力手绘符号；调整投放区、房屋、小车、卡牌图标和死亡动画绘制。
- 修改 `src/game/assets.js`
  - 确保太阳、脑力图标、左房子、双发射手和死亡 spritesheet 的生成素材位于首选路径。
- 修改 `src/game/systems.js`
  - 给 `zombieDeath` effect 增加地面锚点和下落方向元数据。
- 修改 `scripts/remaster-imagegen-assets.py`
  - 生成或归一化太阳、脑力图标、左房子、双发射手、僵尸死亡动画关键素材。
- 修改 `scripts/verify-browser.js`
  - 支持测试动作文件配置 viewport 和截图文件名，覆盖 1280x720、1440x900、大窗口。
- 修改 `tests/commands.test.js`
  - 覆盖小鬼成本为 `40`。
- 修改 `tests/layout.test.js`
  - 覆盖 HUD 矩形不重叠、太阳铲子同属左侧工具区、中央信息对齐、投放区和草坪行对齐。
- 修改 `tests/assets.test.js`
  - 覆盖关键生成素材存在、spritesheet 尺寸合法、死亡动画不回退旧资源。
- 修改 `tests/systems.test.js`
  - 覆盖僵尸死亡 effect 使用 `anchor: "ground"` 和 `motion: "fall-down"`。
- 新增 `tests/browser-visual-polish-1280-actions.json`
  - 1280x720 主验收截图流程。
- 新增 `tests/browser-visual-polish-1440-actions.json`
  - 1440x900 截图流程。
- 新增 `tests/browser-visual-polish-large-actions.json`
  - 大窗口截图流程，用于近似全屏验证。

## 任务 1：小鬼僵尸成本改为 40

**文件:**
- 修改 `tests/commands.test.js`
- 修改 `src/game/config.js`

- [ ] **步骤 1：先写失败测试**

把 `tests/commands.test.js` 中 `imp zombie is a fast low-cost pressure option` 改为：

```js
test("imp zombie is a fast low-cost pressure option", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "imp", row: 4 });
  assert.equal(state.resources.zombie.brain, 60);
  assert.equal(state.zombies[0].type, "imp");
  assert.equal(state.zombies[0].hp, 90);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test tests/commands.test.js
```

预期：失败，失败点为实际剩余脑力 `40` 不等于期望 `60`。

- [ ] **步骤 3：实现最小改动**

在 `src/game/config.js` 中只改小鬼成本：

```js
imp: { side: "zombie", name: "小鬼僵尸", cost: 40, cooldown: 3.5, hp: 90, speed: 46, biteDps: 30 },
```

- [ ] **步骤 4：运行测试确认通过**

运行：

```bash
node --test tests/commands.test.js
```

预期：`tests/commands.test.js` 全部通过。

- [ ] **步骤 5：提交**

```bash
git add src/game/config.js tests/commands.test.js
git commit -m "balance: lower imp zombie brain cost"
```

## 任务 2：锁定 HUD 布局契约

**文件:**
- 修改 `tests/layout.test.js`
- 修改 `src/game/input.js`

- [ ] **步骤 1：写太阳、铲子和卡牌不重叠的失败测试**

在 `tests/layout.test.js` 增加：

```js
test("plant tool shelf groups sun and shovel away from plant cards", () => {
  const plantCards = getPlantCardRects().filter((card) => card.kind === "plant");
  assert.equal(plantCards.some((card) => intersects(card, SUN_COUNTER_RECT)), false);
  assert.equal(plantCards.some((card) => intersects(card, SHOVEL_CARD_RECT)), false);
  assert.equal(intersects(SUN_COUNTER_RECT, SHOVEL_CARD_RECT), false);
  assert.equal(Math.abs(SUN_COUNTER_RECT.x - SHOVEL_CARD_RECT.x) <= 36, true);
});
```

- [ ] **步骤 2：写中央信息栏对齐测试**

继续在 `tests/layout.test.js` 增加：

```js
test("timer brain and threat widgets share a compact center column", () => {
  assert.equal(TIMER_RECT.y, BRAIN_COUNTER_RECT.y);
  assert.equal(TIMER_RECT.h, BRAIN_COUNTER_RECT.h);
  assert.equal(BRAIN_COUNTER_RECT.w <= 92, true);
  assert.equal(THREAT_PANEL_RECT.x, TIMER_RECT.x);
  assert.equal(THREAT_PANEL_RECT.w, TIMER_RECT.w + BRAIN_COUNTER_RECT.w + 8);
});
```

- [ ] **步骤 3：写僵尸投放区和草坪行对齐测试**

继续在 `tests/layout.test.js` 增加：

```js
test("zombie deploy lane remains aligned to grid rows", () => {
  assert.equal(GRID.deployLeft > GRID.left + GRID.cols * GRID.cellWidth, true);
  assert.equal(GRID.deployWidth >= 112, true);
  for (let row = 0; row < GRID.rows; row += 1) {
    const point = { x: GRID.deployLeft + GRID.deployWidth / 2, y: GRID.top + row * GRID.cellHeight + GRID.cellHeight / 2 };
    assert.equal(deployLaneFromPoint(point), row);
  }
});
```

同步修改 `tests/layout.test.js` 的 import：

```js
import { GRID } from "../src/game/config.js";
import {
  BRAIN_COUNTER_RECT,
  PLANT_PANEL_RECT,
  SHOVEL_CARD_RECT,
  SUN_COUNTER_RECT,
  THREAT_PANEL_RECT,
  TIMER_RECT,
  ZOMBIE_PANEL_RECT,
  commandFromPoint,
  deployLaneFromPoint,
  getPlantCardRects,
  getZombieCardRects,
} from "../src/game/input.js";
```

- [ ] **步骤 4：运行测试确认失败**

运行：

```bash
node --test tests/layout.test.js
```

预期：至少 `timer brain and threat widgets share a compact center column` 失败，因为当前 `THREAT_PANEL_RECT.w` 不是 `TIMER_RECT.w + BRAIN_COUNTER_RECT.w + 8`。

- [ ] **步骤 5：调整输入矩形**

在 `src/game/input.js` 中使用以下矩形。它们保留当前顶部三段结构，只收紧中央信息栏和左侧工具槽：

```js
export const SUN_COUNTER_RECT = { x: 18, y: 18, w: 132, h: 46 };
export const SHOVEL_CARD_RECT = { id: "shovel", kind: "shovel", x: 42, y: 78, w: 82, h: 56 };
export const PLANT_PANEL_RECT = { x: 160, y: 12, w: 430, h: 132 };
export const STATUS_PANEL_RECT = { x: 606, y: 12, w: 178, h: 132 };
export const TIMER_RECT = { x: 612, y: 18, w: 78, h: 42 };
export const BRAIN_COUNTER_RECT = { x: 698, y: 18, w: 88, h: 42 };
export const THREAT_PANEL_RECT = { x: 612, y: 72, w: 174, h: 58 };
export const ZOMBIE_PANEL_RECT = { x: 798, y: 12, w: 460, h: 132 };
```

同步保持卡牌生成逻辑不越出面板：

```js
export function getPlantCardRects() {
  const ids = Object.keys(PLANTS);
  const cards = ids.map((id, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    return { id, kind: "plant", x: PLANT_PANEL_RECT.x + 14 + col * 82, y: 20 + row * 62, w: 66, h: 54 };
  });
  cards.push(SHOVEL_CARD_RECT);
  return cards;
}

export function getZombieCardRects() {
  return Object.keys(ZOMBIES).map((id, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return { id, x: ZOMBIE_PANEL_RECT.x + 18 + col * 108, y: 20 + row * 62, w: 82, h: 58 };
  });
}
```

- [ ] **步骤 6：运行测试确认通过**

运行：

```bash
node --test tests/layout.test.js
```

预期：`tests/layout.test.js` 全部通过。

- [ ] **步骤 7：提交**

```bash
git add src/game/input.js tests/layout.test.js
git commit -m "ui: define polished hud layout contract"
```

## 任务 3：精修 HUD 绘制和点击热区一致性

**文件:**
- 修改 `src/game/render.js`
- 修改 `tests/layout.test.js`

- [ ] **步骤 1：写卡牌视觉框和点击框一致测试**

在 `tests/layout.test.js` 增加：

```js
test("card hit boxes have stable dimensions for visual frames", () => {
  for (const card of getPlantCardRects()) {
    assert.equal(Number.isInteger(card.x), true);
    assert.equal(Number.isInteger(card.y), true);
    assert.equal(card.w >= 60 && card.w <= 84, true);
    assert.equal(card.h >= 52 && card.h <= 60, true);
  }
  for (const card of getZombieCardRects()) {
    assert.equal(Number.isInteger(card.x), true);
    assert.equal(Number.isInteger(card.y), true);
    assert.equal(card.w >= 76 && card.w <= 90, true);
    assert.equal(card.h >= 54 && card.h <= 62, true);
  }
});
```

- [ ] **步骤 2：运行测试确认当前约束**

运行：

```bash
node --test tests/layout.test.js
```

预期：通过。这个测试锁定后续 `render.js` 必须使用 `getPlantCardRects()` 和 `getZombieCardRects()` 的矩形，不允许另设视觉位置。

- [ ] **步骤 3：让 HUD 绘制完全引用输入矩形**

在 `src/game/render.js` 中确认 `drawHud()` 只通过以下入口画卡牌：

```js
for (const card of getPlantCardRects()) drawCard(ctx, state, card, "plant");
for (const card of getZombieCardRects()) drawCard(ctx, state, card, "zombie");
```

如果渲染里存在额外硬编码卡牌位置，删除硬编码，改为使用 `card.x`、`card.y`、`card.w`、`card.h`。

- [ ] **步骤 4：精修资源槽绘制**

在 `drawResourceCounter()` 中把脑力图标从手绘 fallback 改为优先素材，太阳和脑力都使用同一套图标槽规则：

```js
const iconX = x + (kind === "brain" ? 22 : 24);
const iconY = y + height / 2;
const iconSize = kind === "brain" ? 31 : 38;
if (kind === "sun") {
  if (!drawAsset(ctx, ASSET_PATHS.ui.sun, iconX, iconY, iconSize, iconSize)) drawSunGlyph(ctx, iconX, iconY, 14);
} else {
  if (!drawAsset(ctx, ASSET_PATHS.ui.brainCounter, iconX, iconY, iconSize, iconSize)) drawBrainGlyph(ctx, iconX, iconY);
}
ctx.textAlign = "right";
drawOutlinedText(ctx, String(value), x + width - 10, y + height / 2 + 8, kind === "brain" ? 20 : 23, "#fff7c2", "#342719", 4);
```

- [ ] **步骤 5：精修铲子槽**

在 `drawCard()` 的铲子分支保持使用 `ASSET_PATHS.ui.shovelSlot`，并将铲子图标绘制在卡牌中心：

```js
if (card.id === "shovel") {
  drawShovelIcon(ctx, centerX, centerY - 2, true);
  drawCostChip(ctx, centerX, card.y + card.h - 8, "铲", "plant");
}
```

植物和僵尸卡牌不进入这个分支。

- [ ] **步骤 6：运行布局和命令测试**

运行：

```bash
node --test tests/layout.test.js tests/commands.test.js
```

预期：全部通过。

- [ ] **步骤 7：提交**

```bash
git add src/game/render.js tests/layout.test.js
git commit -m "ui: polish hud rendering against hit boxes"
```

## 任务 4：补齐关键生成素材契约

**文件:**
- 修改 `tests/assets.test.js`
- 修改 `src/game/assets.js`
- 修改 `scripts/remaster-imagegen-assets.py`
- 更新 `generated-assets/`

- [ ] **步骤 1：写关键素材存在测试**

在 `tests/assets.test.js` 增加：

```js
test("visual polish generated assets are present", () => {
  [
    GENERATED_ASSET_PATHS.ui.sun,
    GENERATED_ASSET_PATHS.ui.resourceBrain,
    GENERATED_ASSET_PATHS.scene.houseLeft,
    SPRITESHEET_MANIFEST.plants.repeater.idle.src,
    SPRITESHEET_MANIFEST.plants.repeater.attack.src,
    SPRITESHEET_MANIFEST.zombies.basic.death.src,
    SPRITESHEET_MANIFEST.zombies.imp.death.src,
    SPRITESHEET_MANIFEST.zombies.cone.death.src,
    SPRITESHEET_MANIFEST.zombies.bucket.death.src,
    SPRITESHEET_MANIFEST.zombies.runner.death.src,
  ].forEach(assertExists);
});
```

- [ ] **步骤 2：写素材路径优先级测试**

继续在 `tests/assets.test.js` 增加：

```js
test("visual polish assets are first-choice manifest paths", () => {
  assert.equal(ASSET_PATHS.ui.sun[0], GENERATED_ASSET_PATHS.ui.sun);
  assert.equal(ASSET_PATHS.ui.brainCounter[0], GENERATED_ASSET_PATHS.ui.resourceBrain);
  assert.equal(ASSET_PATHS.scene.houseLeft[0], GENERATED_ASSET_PATHS.scene.houseLeft);
  assert.equal(ASSET_PATHS.plantIdle.repeater[0], SPRITESHEET_MANIFEST.plants.repeater.idle.src);
});
```

- [ ] **步骤 3：运行测试确认失败或确认现状**

运行：

```bash
node --test tests/assets.test.js
```

预期：如果素材已经存在且路径已接入则通过；如果缺少新素材或路径没接好则失败，失败信息会指出具体路径。

- [ ] **步骤 4：归一化素材输出**

在 `scripts/remaster-imagegen-assets.py` 中确保输出这些文件：

```text
generated-assets/ui/sun-original-padded.gif
generated-assets/ui/resource-brain.png
generated-assets/scene/house-left.png
generated-assets/sprites/plants/repeater-idle.png
generated-assets/sprites/plants/repeater-attack.png
generated-assets/sprites/zombies/basic-death.png
generated-assets/sprites/zombies/imp-death.png
generated-assets/sprites/zombies/flag-death.png
generated-assets/sprites/zombies/cone-death.png
generated-assets/sprites/zombies/screen-death.png
generated-assets/sprites/zombies/bucket-death.png
generated-assets/sprites/zombies/zamboni-death.png
generated-assets/sprites/zombies/runner-death.png
```

双发射手生成规范写入脚本内的素材描述字符串：

```text
repeater: pea shooter variant, one pea cannon mouth only, almond-shaped eyes, different expression from peashooter, no second barrel
```

太阳归一化要求写入脚本内的处理函数：输出图像四周保留透明边距，渲染时不会裁掉光芒。

- [ ] **步骤 5：确认 manifest 首选路径**

在 `src/game/assets.js` 中确认这些值保持一致：

```js
resourceBrain: `${GENERATED}/ui/resource-brain.png`,
sun: `${GENERATED}/ui/sun-original-padded.gif`,
houseLeft: `${GENERATED}/scene/house-left.png`,
```

并确认 `ASSET_PATHS.ui.brainCounter[0]`、`ASSET_PATHS.ui.sun[0]`、`ASSET_PATHS.scene.houseLeft[0]` 使用 `GENERATED_ASSET_PATHS`。

- [ ] **步骤 6：运行素材测试**

运行：

```bash
node --test tests/assets.test.js
```

预期：全部通过。

- [ ] **步骤 7：提交**

```bash
git add src/game/assets.js scripts/remaster-imagegen-assets.py tests/assets.test.js generated-assets
git commit -m "art: refresh visual polish generated assets"
```

## 任务 5：修正僵尸死亡方向

**文件:**
- 修改 `tests/systems.test.js`
- 修改 `src/game/systems.js`
- 修改 `src/game/render.js`
- 修改 `tests/assets.test.js`

- [ ] **步骤 1：写死亡 effect 元数据失败测试**

在 `tests/systems.test.js` 增加：

```js
test("zombie death effect keeps a ground anchored fall direction", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.zombies[0].hp = 0;
  step(state, 0.1);
  const death = state.effects.find((effect) => effect.type === "zombieDeath");
  assert.equal(Boolean(death), true);
  assert.equal(death.anchor, "ground");
  assert.equal(death.motion, "fall-down");
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
node --test tests/systems.test.js
```

预期：失败，原因是当前 `zombieDeath` effect 没有 `anchor` 和 `motion` 字段。

- [ ] **步骤 3：给死亡 effect 增加地面锚点**

在 `src/game/systems.js` 的 `cleanupDeadEntities()` 中把死亡 effect 改为：

```js
state.effects.push({
  id: nextId(state, "effect"),
  type: "zombieDeath",
  zombieType: zombie.type,
  x: zombie.x,
  y: rowCenterY(zombie.row),
  ttl: 1.05,
  maxTtl: 1.05,
  anchor: "ground",
  motion: "fall-down",
});
```

- [ ] **步骤 4：删除死亡动画上移绘制**

在 `src/game/render.js` 的 `effect.type === "zombieDeath"` 分支中，禁止使用 `y - 8` 和 `y - progress * 22`。改成固定地面锚点和轻微向下沉降：

```js
const progress = 1 - effect.ttl / effect.maxTtl;
const size = effect.zombieType === "imp" ? [74, 82] : effect.zombieType === "runner" ? [112, 118] : [96, 118];
const deathY = y + Math.min(10, progress * 10);
const alpha = Math.max(0, Math.min(1, effect.ttl / effect.maxTtl));
const paths = ASSET_PATHS.zombieDeath[effect.zombieType] ?? ASSET_PATHS.zombieDeath.basic;
const sheet = SPRITESHEET_MANIFEST.zombies[effect.zombieType]?.death;
if (drawSpritesheet(ctx, sheet, x, deathY, size[0], size[1], { progress, alpha, anchor: { x: 0.5, y: 0.9 } })) {
  ctx.globalAlpha = 1;
  continue;
}
if (!drawAsset(ctx, paths, x, deathY, size[0], size[1], { alpha })) {
  drawFloatingValue(ctx, "击倒", x, y + 4, alpha, "#f5e6c8", "#5b1c1c", 22);
}
ctx.globalAlpha = 1;
continue;
```

- [ ] **步骤 5：确认死亡素材不回退旧资源**

保留 `tests/assets.test.js` 中已有的：

```js
test("zombie death animations do not fall back to legacy gifs", () => {
  Object.entries(ASSET_PATHS.zombieDeath).forEach(([type, paths]) => {
    assert.deepEqual(paths, [SPRITESHEET_MANIFEST.zombies[type].death.src]);
    assert.match(paths[0], /^generated-assets\/sprites\/zombies\/.+-death\.png$/);
  });
});
```

- [ ] **步骤 6：运行系统和素材测试**

运行：

```bash
node --test tests/systems.test.js tests/assets.test.js
```

预期：全部通过。

- [ ] **步骤 7：提交**

```bash
git add src/game/systems.js src/game/render.js tests/systems.test.js tests/assets.test.js
git commit -m "animation: keep zombie death grounded"
```

## 任务 6：优化房子、小车和投放区绘制

**文件:**
- 修改 `src/game/render.js`
- 修改 `tests/layout.test.js`

- [ ] **步骤 1：写左侧房子和草坪边界测试**

在 `tests/layout.test.js` 增加：

```js
test("house and mower lane stay left of the lawn", () => {
  assert.equal(GRID.left >= 128, true);
  assert.equal(SHOVEL_CARD_RECT.x + SHOVEL_CARD_RECT.w < GRID.left, true);
  assert.equal(SUN_COUNTER_RECT.x + SUN_COUNTER_RECT.w <= GRID.left + 18, true);
});
```

- [ ] **步骤 2：运行测试确认约束**

运行：

```bash
node --test tests/layout.test.js
```

预期：通过。这个测试锁定左侧工具和房屋车道不能侵入草坪主体。

- [ ] **步骤 3：精修房屋绘制**

在 `src/game/render.js` 的 `drawHouseFacade(ctx)` 中，优先绘制生成房屋素材。素材中心和尺寸使用固定值，避免和草坪重叠：

```js
const x = 0;
const y = GRID.top - 30;
const w = GRID.left - 8;
const h = GRID.rows * GRID.cellHeight + 70;
if (drawAsset(ctx, ASSET_PATHS.scene.houseLeft, x + 66, y + h / 2, 132, 520)) return;
```

fallback 程序化房屋保留，但只作为缺素材时的兜底。

- [ ] **步骤 4：精修小车绘制**

在 `drawLaneMowers()` 中保证小车视觉中心和 `rowCenterY(row)` 对齐，并使用统一尺寸：

```js
const mowerWidth = mower.active ? 72 : 58;
const mowerHeight = mower.active ? 54 : 48;
const drawX = mower.active ? mower.x : GRID.left - 54;
const drawY = rowCenterY(mower.row);
drawAsset(ctx, ASSET_PATHS.ui.mower, drawX, drawY, mowerWidth, mowerHeight);
```

如果函数当前已有相同结构，只保留一处计算，不再使用分散魔法数字。

- [ ] **步骤 5：精修投放区绘制**

在绘制投放区的函数中使用 `GRID.deployLeft`、`GRID.deployWidth`、`GRID.top`、`GRID.cellHeight`、`GRID.rows`。背景、边框和行分隔都由这些值计算：

```js
const x = GRID.deployLeft;
const y = GRID.top;
const w = GRID.deployWidth;
const h = GRID.rows * GRID.cellHeight;
roundRectPath(ctx, x, y, w, h, 14);
ctx.fillStyle = "rgba(87, 92, 62, 0.88)";
ctx.fill();
ctx.strokeStyle = "rgba(70, 55, 32, 0.92)";
ctx.lineWidth = 4;
ctx.stroke();
for (let row = 1; row < GRID.rows; row += 1) {
  const lineY = GRID.top + row * GRID.cellHeight;
  ctx.strokeStyle = "rgba(224, 221, 157, 0.22)";
  ctx.beginPath();
  ctx.moveTo(x + 8, lineY);
  ctx.lineTo(x + w - 8, lineY);
  ctx.stroke();
}
```

- [ ] **步骤 6：运行布局测试**

运行：

```bash
node --test tests/layout.test.js
```

预期：全部通过。

- [ ] **步骤 7：提交**

```bash
git add src/game/render.js tests/layout.test.js
git commit -m "scene: polish house mower and deploy lane"
```

## 任务 7：让浏览器验证覆盖多个窗口尺寸

**文件:**
- 修改 `scripts/verify-browser.js`
- 新增 `tests/browser-visual-polish-1280-actions.json`
- 新增 `tests/browser-visual-polish-1440-actions.json`
- 新增 `tests/browser-visual-polish-large-actions.json`

- [ ] **步骤 1：写 1280x720 动作文件**

新增 `tests/browser-visual-polish-1280-actions.json`：

```json
{
  "viewport": { "width": 1280, "height": 720 },
  "screenshotName": "visual-polish-1280.png",
  "steps": [
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 210, "mouse_y": 49 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 266, "mouse_y": 374 },
    { "command": { "type": "setResources", "brain": 260 }, "frames": 1 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 852, "mouse_y": 47 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 1110, "mouse_y": 374 },
    { "buttons": [], "advanceMs": 900 }
  ],
  "expect": {
    "audioUnlocked": true,
    "musicActive": true,
    "sceneAssetIncludes": "day-lawn.png",
    "uiAssetIncludes": "resource-sun.png",
    "anyZombieAnimationSource": "spritesheet",
    "selectionNull": true,
    "noDamageNumbers": true
  }
}
```

- [ ] **步骤 2：写 1440x900 动作文件**

新增 `tests/browser-visual-polish-1440-actions.json`：

```json
{
  "viewport": { "width": 1440, "height": 900 },
  "screenshotName": "visual-polish-1440.png",
  "steps": [
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 210, "mouse_y": 49 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 266, "mouse_y": 374 },
    { "command": { "type": "setResources", "brain": 260 }, "frames": 1 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 852, "mouse_y": 47 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 1110, "mouse_y": 374 },
    { "buttons": [], "advanceMs": 900 }
  ],
  "expect": {
    "audioUnlocked": true,
    "musicActive": true,
    "anyZombieAnimationSource": "spritesheet",
    "selectionNull": true,
    "noDamageNumbers": true
  }
}
```

- [ ] **步骤 3：写大窗口动作文件**

新增 `tests/browser-visual-polish-large-actions.json`：

```json
{
  "viewport": { "width": 1600, "height": 1000 },
  "screenshotName": "visual-polish-large.png",
  "steps": [
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 210, "mouse_y": 49 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 266, "mouse_y": 374 },
    { "command": { "type": "setResources", "brain": 260 }, "frames": 1 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 852, "mouse_y": 47 },
    { "buttons": ["left_mouse_button"], "frames": 2, "mouse_x": 1110, "mouse_y": 374 },
    { "buttons": [], "advanceMs": 900 }
  ],
  "expect": {
    "audioUnlocked": true,
    "musicActive": true,
    "anyZombieAnimationSource": "spritesheet",
    "selectionNull": true,
    "noDamageNumbers": true
  }
}
```

- [ ] **步骤 4：让浏览器验证脚本读取 viewport 和截图名**

在 `scripts/verify-browser.js` 中替换固定 viewport 和截图路径：

```js
const viewport = actions.viewport ?? { width: 1280, height: 720 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
```

把截图路径改为：

```js
const screenshotPath = path.join("test-results", actions.screenshotName ?? "local-versus-game.png");
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
await page.locator("#game").screenshot({ path: screenshotPath });
```

- [ ] **步骤 5：运行浏览器验证**

先确认本地游戏服务在 `http://localhost:5174` 可访问，然后运行：

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1280-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1440-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-large-actions.json
```

预期：三条命令都退出 `0`，并生成：

```text
test-results/visual-polish-1280.png
test-results/visual-polish-1440.png
test-results/visual-polish-large.png
```

- [ ] **步骤 6：提交**

```bash
git add scripts/verify-browser.js tests/browser-visual-polish-1280-actions.json tests/browser-visual-polish-1440-actions.json tests/browser-visual-polish-large-actions.json
git commit -m "test: add visual polish viewport checks"
```

## 任务 8：全量验证和截图人工检查

**文件:**
- 修改 `progress.md`

- [ ] **步骤 1：运行单元测试**

运行：

```bash
npm test
```

预期：所有 `node:test` 测试通过。

- [ ] **步骤 2：运行空白字符检查**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 `0`。

- [ ] **步骤 3：运行既有浏览器回归**

运行：

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json
```

预期：三条命令都退出 `0`。

- [ ] **步骤 4：运行新增多窗口浏览器验证**

运行：

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1280-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1440-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-large-actions.json
```

预期：三条命令都退出 `0`。

- [ ] **步骤 5：人工检查截图**

打开并检查：

```text
test-results/visual-polish-1280.png
test-results/visual-polish-1440.png
test-results/visual-polish-large.png
```

必须逐项确认：

- 太阳完整，不缺边。
- 铲子在槽位里，不突兀。
- 时间、脑力、压力对齐。
- 脑力图标能看出是脑子。
- 植物和僵尸卡牌费用不压图。
- 僵尸投放区和 5 行草坪对齐。
- 左侧房子和小车自然贴合。
- 双发射手只有一个炮口。
- 僵尸死亡不向上飞。

- [ ] **步骤 6：记录验证结果**

在 `progress.md` 增加一条中文记录：

```markdown
## 视觉精修验证

- `npm test`: 通过。
- `git diff --check`: 通过。
- `browser-actions`: 通过。
- `browser-layout-actions`: 通过。
- `browser-visual-assets-actions`: 通过。
- `browser-visual-polish-1280-actions`: 通过，截图 `test-results/visual-polish-1280.png`。
- `browser-visual-polish-1440-actions`: 通过，截图 `test-results/visual-polish-1440.png`。
- `browser-visual-polish-large-actions`: 通过，截图 `test-results/visual-polish-large.png`。
- 人工截图检查：太阳、铲子、HUD、投放区、房子、小车、双发射手、僵尸死亡方向均符合设计。
```

- [ ] **步骤 7：提交**

```bash
git add progress.md
git commit -m "docs: record visual polish verification"
```

## 最终完成门禁

在声称完成之前，必须新跑以下命令并读取输出：

```bash
npm test
git diff --check
node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1280-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-1440-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-polish-large-actions.json
```

完成报告必须包含：

- 修改了哪些文件。
- 哪些测试通过。
- 三张截图路径。
- 仍未处理的后续玩法问题：取消自动刷怪、完整双人对战逻辑、植物过强平衡。

## 执行建议

推荐使用 `superpowers:subagent-driven-development`：

- 工作者 A：任务 1、2、3，负责 HUD、输入命中区、小鬼成本。
- 工作者 B：任务 4、5，负责生成素材、manifest、死亡动画。
- 工作者 C：任务 6、7、8，负责场景绘制、浏览器验证和截图验收。

如果不使用 subagent，则使用 `superpowers:executing-plans` 逐任务执行。每个任务都要先看到失败测试，再实现，再运行通过测试，再提交。
