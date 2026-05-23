import test from "node:test";
import assert from "node:assert/strict";
import { GRID } from "../src/game/config.js";
import { createGameState } from "../src/game/state.js";
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

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

test("sun counter has a dedicated hud slot and does not overlap plant cards", () => {
  assert.equal(getPlantCardRects().some((card) => intersects(card, SUN_COUNTER_RECT)), false);
});

test("plant and zombie card rails stay in their hud panels", () => {
  const plantCards = getPlantCardRects().filter((card) => card.kind === "plant");
  assert.equal(plantCards.every((card) => inside(card, PLANT_PANEL_RECT)), true);
  assert.equal(getZombieCardRects().every((card) => inside(card, ZOMBIE_PANEL_RECT)), true);
  assert.equal(SHOVEL_CARD_RECT.x + SHOVEL_CARD_RECT.w < PLANT_PANEL_RECT.x, true);
  assert.equal(ZOMBIE_PANEL_RECT.w > PLANT_PANEL_RECT.w, true);
  assert.equal([TIMER_RECT, BRAIN_COUNTER_RECT, THREAT_PANEL_RECT].every((rect) => !intersects(rect, PLANT_PANEL_RECT) && !intersects(rect, ZOMBIE_PANEL_RECT)), true);
});

test("plant tool shelf groups sun and shovel away from plant cards", () => {
  const plantCards = getPlantCardRects().filter((card) => card.kind === "plant");
  assert.equal(plantCards.some((card) => intersects(card, SUN_COUNTER_RECT)), false);
  assert.equal(plantCards.some((card) => intersects(card, SHOVEL_CARD_RECT)), false);
  assert.equal(intersects(SUN_COUNTER_RECT, SHOVEL_CARD_RECT), false);
  assert.equal(Math.abs(SUN_COUNTER_RECT.x - SHOVEL_CARD_RECT.x) <= 36, true);
});

test("house and mower lane stay left of the lawn", () => {
  assert.equal(GRID.left >= 128, true);
  assert.equal(SHOVEL_CARD_RECT.x + SHOVEL_CARD_RECT.w < GRID.left, true);
  assert.equal(SUN_COUNTER_RECT.x + SUN_COUNTER_RECT.w <= GRID.left + 18, true);
});

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

test("timer brain and threat widgets share a compact center column", () => {
  assert.equal(TIMER_RECT.y, BRAIN_COUNTER_RECT.y);
  assert.equal(TIMER_RECT.h, BRAIN_COUNTER_RECT.h);
  assert.equal(BRAIN_COUNTER_RECT.w <= 92, true);
  assert.equal(THREAT_PANEL_RECT.x, TIMER_RECT.x);
  assert.equal(THREAT_PANEL_RECT.w, TIMER_RECT.w + BRAIN_COUNTER_RECT.w + 8);
});

test("zombie deploy lane remains aligned to grid rows", () => {
  assert.equal(GRID.deployLeft > GRID.left + GRID.cols * GRID.cellWidth, true);
  assert.equal(GRID.deployWidth >= 112, true);
  for (let row = 0; row < GRID.rows; row += 1) {
    const point = { x: GRID.deployLeft + GRID.deployWidth / 2, y: GRID.top + row * GRID.cellHeight + GRID.cellHeight / 2 };
    assert.equal(deployLaneFromPoint(point), row);
  }
});

test("clicking sun counter collects all visible sun", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-test", x: 300, y: 300, amount: 25, ttl: 10 });
  const command = commandFromPoint(state, { x: SUN_COUNTER_RECT.x + 8, y: SUN_COUNTER_RECT.y + 8 });
  assert.equal(command.type, "collectAllSun");
});

test("commandFromPoint can use a local online selection", () => {
  const state = createGameState();
  const point = {
    x: GRID.left + GRID.cellWidth * 1.5,
    y: GRID.top + GRID.cellHeight * 2.5,
  };
  const command = commandFromPoint(state, point, { selection: { side: "plant", kind: "plant", type: "peashooter" } });
  assert.deepEqual(command, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  assert.equal(state.selection, null);
});

function inside(inner, outer) {
  return inner.x >= outer.x && inner.x + inner.w <= outer.x + outer.w && inner.y >= outer.y && inner.y + inner.h <= outer.y + outer.h;
}
