# PVZ Local Versus Fairness And UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current plant-favored defense prototype into a fair local two-player versus game while cleaning up the most visible HUD, scene, and sprite issues.

**Architecture:** Keep the existing Canvas renderer and serializable game state. Separate rule changes from visual polish: simulation changes go through `src/game/config.js`, `src/game/systems.js`, and `src/game/commands.js`; visual and hit-target changes go through `src/game/input.js`, `src/game/render.js`, generated assets, and browser screenshot checks.

**Tech Stack:** Plain JavaScript modules, Canvas 2D, Node `node:test`, local HTTP server, `scripts/verify-browser.js` browser verification.

---

## Scope

This plan intentionally covers the user-reported issues as one coherent versus-game pass:

- Small immediate balance fix: 小鬼僵尸脑力值下调到 `40`.
- Core game rule shift: no automatic zombie waves; zombie side places all zombies.
- Fairer two-player pacing: plant side no longer wins too easily by waiting.
- HUD cleanup: sun and shovel become one plant tool shelf; brain/time/pressure become aligned compact status widgets.
- Art cleanup: left house, brain icon, repeater silhouette, zombie death direction, zombie deploy zone.

This plan does not add new units, maps, online multiplayer, or Phaser migration.

## Files

- Modify: `src/game/config.js`
  - Unit costs, round timers, resource pacing constants.
- Modify: `src/game/systems.js`
  - Disable director auto-spawns, update manual-versus threat logic, adjust win conditions, fix death effect metadata.
- Modify: `src/game/commands.js`
  - Keep deploy validation strict; add any needed status text for manual zombie-side decisions.
- Modify: `src/game/input.js`
  - Re-layout plant tool shelf, plant cards, status widgets, zombie cards, and zombie deploy hit areas.
- Modify: `src/game/render.js`
  - Draw revised HUD, better brain icon, integrated shovel, aligned zombie side, revised death and scene visuals.
- Modify: `src/game/assets.js`
  - Point house, brain, repeater, and death-related visuals at generated assets when available.
- Modify: `scripts/remaster-imagegen-assets.py`
  - Regenerate house, brain icon, repeater, zombie death strips, and deploy-zone UI assets with stable anchors.
- Modify: `tests/commands.test.js`
  - Cost and affordability tests.
- Modify: `tests/systems.test.js`
  - No auto-spawn, manual zombie victory pressure, plant timeout victory, death direction metadata.
- Modify: `tests/layout.test.js`
  - HUD non-overlap and hit-target alignment.
- Modify: `tests/assets.test.js`
  - Generated asset manifest coverage for house, brain, repeater, and death strips.
- Modify: `tests/browser-layout-actions.json`
  - Screenshot workflow for HUD and deploy-zone layout.
- Modify: `tests/browser-actions.json`
  - Manual two-player flow: plant places, zombie places, battle resolves.
- Modify: `tests/browser-visual-assets-actions.json`
  - Visual asset verification for house, brain icon, repeater, and death frame behavior.

## Task 1: Lower Imp Cost To 40

**Files:**
- Modify: `src/game/config.js`
- Modify: `tests/commands.test.js`

- [ ] **Step 1: Write the failing cost test**

Change `tests/commands.test.js` test `imp zombie is a fast low-cost pressure option` to expect the zombie side to spend `40` brain from the initial `100`:

```js
test("imp zombie is a fast low-cost pressure option", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "imp", row: 4 });
  assert.equal(state.resources.zombie.brain, 60);
  assert.equal(state.zombies[0].type, "imp");
  assert.equal(state.zombies[0].hp, 90);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/commands.test.js
```

Expected: FAIL on `imp zombie is a fast low-cost pressure option` because current cost is `60`, leaving `40` brain instead of `60`.

- [ ] **Step 3: Implement the minimal config change**

Change only the imp cost in `src/game/config.js`:

```js
imp: { side: "zombie", name: "小鬼僵尸", cost: 40, cooldown: 3.5, hp: 90, speed: 46, biteDps: 30 },
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- tests/commands.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/config.js tests/commands.test.js
git commit -m "balance: lower imp zombie brain cost"
```

## Task 2: Remove Automatic Zombie Spawns

**Files:**
- Modify: `src/game/systems.js`
- Modify: `tests/systems.test.js`

- [ ] **Step 1: Replace director auto-spawn tests with manual-versus tests**

Remove or rewrite the tests named `director warns and then spawns pressure zombies` and `director pressures rows that already have a defense`. Add this behavior test:

```js
test("zombies do not auto spawn in local versus mode", () => {
  const state = createGameState();
  state.started = true;
  step(state, 90);
  assert.equal(state.director.warning, null);
  assert.equal(state.director.waveCount, 0);
  assert.equal(state.zombies.length, 0);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/systems.test.js
```

Expected: FAIL because `updateDirector()` currently creates warnings and spawns zombies.

- [ ] **Step 3: Remove director spawning from the update loop**

In `src/game/systems.js`, remove this call from `updateGame()`:

```js
updateDirector(state, dt);
```

Keep the old `updateDirector()`, `chooseDirectorZombie()`, and `choosePressureLane()` functions only if another test still references them. If no code references them, delete them in the same task.

- [ ] **Step 4: Keep pressure as a manual-side pacing meter**

Move pressure growth into `updateResources()` and make it reflect available zombie initiative, not automatic waves:

```js
const brainRate = state.time > ROUND.zombieRampTime ? 4.8 : 3.0;
state.resources.zombie.brain += brainRate * dt;
const activeZombiePressure = state.zombies.length * 3;
state.director.threat = Math.min(100, state.director.threat + dt * 0.45 + activeZombiePressure * dt * 0.04);
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/systems.test.js
```

Expected: PASS with no automatic zombie creation after 90 seconds.

- [ ] **Step 6: Commit**

```bash
git add src/game/systems.js tests/systems.test.js
git commit -m "rules: make zombie attacks fully player driven"
```

## Task 3: Rebalance Two-Player Round Pacing

**Files:**
- Modify: `src/game/config.js`
- Modify: `src/game/systems.js`
- Modify: `tests/systems.test.js`

- [ ] **Step 1: Add tests for non-trivial plant victory and zombie comeback pressure**

Add these tests to `tests/systems.test.js`:

```js
test("plant side does not win while zombies are still attacking at timeout", () => {
  const state = createGameState();
  state.started = true;
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.timer.remaining = 0.05;
  step(state, 0.1);
  assert.equal(state.winner, null);
});

test("manual zombie economy can afford repeated low cost pressure", () => {
  const state = createGameState();
  state.started = true;
  state.resources.zombie.brain = 0;
  step(state, 14);
  assert.equal(state.resources.zombie.brain >= 40, true);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/systems.test.js
```

Expected: At least the economy test should fail if the current brain curve is too slow for the intended manual-zombie pressure.

- [ ] **Step 3: Tune resource and round constants**

In `src/game/config.js`, change `ROUND` to favor active two-player pacing:

```js
export const ROUND = {
  duration: 210,
  fixedDt: 1 / 60,
  passiveSunInterval: 10,
  passiveSunAmount: 25,
  zombieRampTime: 55,
  waveEvery: 18,
  waveWarning: 3,
};
```

In `src/game/systems.js`, use the brain pacing from Task 2:

```js
const brainRate = state.time > ROUND.zombieRampTime ? 4.8 : 3.0;
state.resources.zombie.brain += brainRate * dt;
```

- [ ] **Step 4: Keep plant victory explicit**

Keep this behavior in `updateWinConditions()`:

```js
if (state.timer.remaining <= 0 && state.zombies.length === 0) {
  state.winner = "plant";
  state.mode = "gameOver";
  state.status = "植物方守住了最后进攻。";
}
```

Do not grant plant victory while any zombie remains.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/systems.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/config.js src/game/systems.js tests/systems.test.js
git commit -m "balance: tune local versus pacing"
```

## Task 4: Rebuild HUD Layout Around Two Sides

**Files:**
- Modify: `src/game/input.js`
- Modify: `src/game/render.js`
- Modify: `tests/layout.test.js`
- Modify: `tests/browser-layout-actions.json`

- [ ] **Step 1: Add layout tests for integrated plant tools and larger zombie panel**

Add or update `tests/layout.test.js`:

```js
test("plant tool shelf groups sun counter and shovel without overlapping plant cards", () => {
  const plantCards = getPlantCardRects().filter((card) => card.kind === "plant");
  assert.equal(plantCards.some((card) => intersects(card, SUN_COUNTER_RECT)), false);
  assert.equal(plantCards.some((card) => intersects(card, SHOVEL_CARD_RECT)), false);
  assert.equal(SHOVEL_CARD_RECT.y >= SUN_COUNTER_RECT.y + SUN_COUNTER_RECT.h + 4, true);
});

test("zombie card rail is wider than plant card rail for active placement", () => {
  assert.equal(ZOMBIE_PANEL_RECT.w >= PLANT_PANEL_RECT.w + 60, true);
  assert.equal(getZombieCardRects().every((card) => inside(card, ZOMBIE_PANEL_RECT)), true);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/layout.test.js
```

Expected: FAIL if shovel placement or card panels do not satisfy the new constraints.

- [ ] **Step 3: Update layout constants**

In `src/game/input.js`, use a clear left tool shelf, compact plant rail, compact center status, and wide zombie rail:

```js
export const SUN_COUNTER_RECT = { x: 16, y: 18, w: 132, h: 46 };
export const SHOVEL_CARD_RECT = { id: "shovel", kind: "shovel", x: 40, y: 76, w: 84, h: 58 };
export const PLANT_PANEL_RECT = { x: 156, y: 12, w: 430, h: 132 };
export const STATUS_PANEL_RECT = { x: 598, y: 12, w: 178, h: 132 };
export const TIMER_RECT = { x: 606, y: 18, w: 78, h: 42 };
export const BRAIN_COUNTER_RECT = { x: 692, y: 18, w: 76, h: 42 };
export const THREAT_PANEL_RECT = { x: 606, y: 72, w: 162, h: 56 };
export const ZOMBIE_PANEL_RECT = { x: 788, y: 12, w: 476, h: 132 };
```

Keep card hit targets generated from these constants. Do not hard-code separate visual positions in `render.js`.

- [ ] **Step 4: Update render drawing to match hit targets**

In `src/game/render.js`, draw sun, shovel, plant cards, status, and zombie cards using the exported rects from `input.js`. The visual card bounds must match `getPlantCardRects()` and `getZombieCardRects()`.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/layout.test.js
```

Expected: PASS.

- [ ] **Step 6: Browser screenshot verification**

Run the local server if needed, then:

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json
```

Expected: PASS and screenshot shows no overlap between sun, shovel, plant cards, time, brain, pressure, zombie cards, and zombie deploy zone.

- [ ] **Step 7: Commit**

```bash
git add src/game/input.js src/game/render.js tests/layout.test.js tests/browser-layout-actions.json
git commit -m "ui: align versus hud and card rails"
```

## Task 5: Replace Brain Icon, House, And Repeater Art

**Files:**
- Modify: `scripts/remaster-imagegen-assets.py`
- Modify: `src/game/assets.js`
- Modify: `src/game/render.js`
- Modify: `tests/assets.test.js`

- [ ] **Step 1: Add asset manifest tests**

Add this to `tests/assets.test.js`:

```js
test("generated versus polish assets exist", () => {
  const required = [
    "generated-assets/ui/resource-brain.png",
    "generated-assets/scene/house-left.png",
    "generated-assets/plants/repeater-idle.png",
    "generated-assets/plants/repeater-attack.png",
  ];
  for (const assetPath of required) {
    assert.equal(fs.existsSync(path.join(process.cwd(), assetPath)), true, assetPath);
  }
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/assets.test.js
```

Expected: FAIL if any required generated asset is missing or not wired.

- [ ] **Step 3: Regenerate or normalize assets**

Update `scripts/remaster-imagegen-assets.py` so it writes:

```text
generated-assets/ui/resource-brain.png
generated-assets/scene/house-left.png
generated-assets/plants/repeater-idle.png
generated-assets/plants/repeater-attack.png
```

The repeater prompt/spec must describe one pea-shooter-like head with narrower almond-shaped eyes and one mouth barrel, not two barrels.

- [ ] **Step 4: Wire assets into render**

In `src/game/assets.js`, ensure the generated paths are first-choice assets. In `src/game/render.js`, replace the hand-drawn brain glyph with the generated `resource-brain.png` through existing asset-loading helpers.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/assets.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/remaster-imagegen-assets.py src/game/assets.js src/game/render.js tests/assets.test.js generated-assets
git commit -m "art: polish brain house and repeater assets"
```

## Task 6: Fix Zombie Death Direction And Anchors

**Files:**
- Modify: `scripts/remaster-imagegen-assets.py`
- Modify: `src/game/render.js`
- Modify: `src/game/systems.js`
- Modify: `tests/systems.test.js`
- Modify: `tests/assets.test.js`

- [ ] **Step 1: Add death metadata test**

Add this to `tests/systems.test.js`:

```js
test("zombie death effect keeps ground anchored fall direction", () => {
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

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- tests/systems.test.js
```

Expected: FAIL because current `zombieDeath` effects do not carry `anchor` and `motion`.

- [ ] **Step 3: Add stable death effect metadata**

In `src/game/systems.js`, update the `zombieDeath` effect:

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

- [ ] **Step 4: Render death without upward travel**

In `src/game/render.js`, ensure `zombieDeath` uses a fixed ground y-position and only eases downward or fades. Do not apply negative y offsets as the animation progresses.

- [ ] **Step 5: Regenerate death strips if needed**

Update `scripts/remaster-imagegen-assets.py` so death strips are bottom-center normalized and visually fall to the side/downward. Avoid floating frames.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- tests/systems.test.js tests/assets.test.js
```

Expected: PASS.

- [ ] **Step 7: Browser visual verification**

Run:

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json
```

Expected: PASS and death frames do not rise upward.

- [ ] **Step 8: Commit**

```bash
git add scripts/remaster-imagegen-assets.py src/game/render.js src/game/systems.js tests/systems.test.js tests/assets.test.js generated-assets
git commit -m "animation: ground anchor zombie death"
```

## Task 7: Verify Full Manual Versus Flow

**Files:**
- Modify: `tests/browser-actions.json`
- Modify: `tests/browser-layout-actions.json`
- Modify: `tests/browser-visual-assets-actions.json`
- Modify: `docs/superpowers/plans/2026-05-17-local-versus-fairness-ui-plan.md`

- [ ] **Step 1: Update browser scenarios**

Ensure `tests/browser-actions.json` covers:

```json
[
  { "type": "click", "x": 210, "y": 44 },
  { "type": "click", "x": 190, "y": 205 },
  { "type": "click", "x": 820, "y": 48 },
  { "type": "click", "x": 1100, "y": 374 },
  { "type": "advance", "ms": 8000 },
  { "type": "snapshot" }
]
```

Coordinates must be adjusted to current card and deploy rects after Task 4.

- [ ] **Step 2: Run full unit tests**

Run:

```bash
npm test
```

Expected: all `node:test` tests pass.

- [ ] **Step 3: Run browser checks**

Run:

```bash
node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json
```

Expected: all browser verification scripts pass and screenshots are written under `test-results/`.

- [ ] **Step 4: Manual screenshot review**

Inspect screenshots for:

- Sun and shovel are visually grouped.
- Brain icon is readable and not cartoonishly wrong.
- Time, brain, and pressure are aligned.
- Zombie deploy zone is aligned with the lane grid.
- Left house does not look pasted or distorted.
- Repeater has one cannon-like mouth and different eyes, not two cannons.
- Zombie death motion falls down or settles, never rises.

- [ ] **Step 5: Commit verification updates**

```bash
git add tests/browser-actions.json tests/browser-layout-actions.json tests/browser-visual-assets-actions.json docs/superpowers/plans/2026-05-17-local-versus-fairness-ui-plan.md
git commit -m "test: verify manual versus visual flow"
```

## Final Verification Gate

Before claiming completion, run all fresh:

```bash
npm test
git diff --check
node scripts/verify-browser.js http://localhost:5174 tests/browser-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-layout-actions.json
node scripts/verify-browser.js http://localhost:5174 tests/browser-visual-assets-actions.json
```

Completion can only be claimed if:

- `npm test` exits `0`.
- `git diff --check` exits `0`.
- All browser verification commands exit `0`.
- Current screenshots have been inspected after the final code changes.

## Superpowers Execution Notes

- Use `superpowers:test-driven-development` for every behavior change.
- Use `superpowers:subagent-driven-development` if implementing this with separate workers:
  - Worker A: rules and balance, owns `config.js`, `systems.js`, `commands.js`, and related unit tests.
  - Worker B: HUD and input layout, owns `input.js`, `render.js`, layout tests, and browser layout actions.
  - Worker C: generated assets and animation anchors, owns `scripts/remaster-imagegen-assets.py`, `assets.js`, generated assets, and asset tests.
- Use `superpowers:verification-before-completion` before reporting any task complete.
- Do not move to the next task until the current task has a failing test, a passing test, and either a commit or an explicit decision not to commit.
