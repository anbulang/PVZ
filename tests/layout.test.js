import test from "node:test";
import assert from "node:assert/strict";
import { getPlantCardRects, getZombieCardRects } from "../src/game/input.js";

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

test("sun counter has a dedicated hud slot and does not overlap plant cards", () => {
  const sunCounter = { x: 18, y: 86, w: 84, h: 38 };
  assert.equal(getPlantCardRects().some((card) => intersects(card, sunCounter)), false);
});

test("plant and zombie card rails stay in their hud panels", () => {
  assert.equal(getPlantCardRects().every((card) => card.x >= 104 && card.x + card.w <= 530 && card.y >= 18 && card.y + card.h <= 122), true);
  assert.equal(getZombieCardRects().every((card) => card.x >= 836 && card.x + card.w <= 1260 && card.y >= 18 && card.y + card.h <= 122), true);
});
