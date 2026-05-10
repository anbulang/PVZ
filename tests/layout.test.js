import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import { commandFromPoint, getPlantCardRects, getZombieCardRects, SUN_COUNTER_RECT } from "../src/game/input.js";

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

test("sun counter has a dedicated hud slot and does not overlap plant cards", () => {
  assert.equal(getPlantCardRects().some((card) => intersects(card, SUN_COUNTER_RECT)), false);
});

test("plant and zombie card rails stay in their hud panels", () => {
  assert.equal(getPlantCardRects().every((card) => card.x >= 104 && card.x + card.w <= 530 && card.y >= 18 && card.y + card.h <= 122), true);
  assert.equal(getZombieCardRects().every((card) => card.x >= 836 && card.x + card.w <= 1260 && card.y >= 18 && card.y + card.h <= 122), true);
});

test("clicking sun counter collects all visible sun", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-test", x: 300, y: 300, amount: 25, ttl: 10 });
  const command = commandFromPoint(state, { x: SUN_COUNTER_RECT.x + 8, y: SUN_COUNTER_RECT.y + 8 });
  assert.equal(command.type, "collectAllSun");
});
