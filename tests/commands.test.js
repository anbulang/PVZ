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
  assert.equal(state.effects.some((effect) => effect.type === "sunDelta" && effect.amount === -100), true);
  assert.match(state.status, /消耗 100 阳光，剩余 50/);
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

test("imp zombie is a fast low-cost pressure option", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "imp", row: 4 });
  assert.equal(state.resources.zombie.brain, 40);
  assert.equal(state.zombies[0].type, "imp");
  assert.equal(state.zombies[0].hp, 90);
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

test("collecting sun pickup increases plant resources", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-test", x: 200, y: 200, amount: 25, ttl: 10 });
  applyCommand(state, { type: "collectSun", id: "sun-test" });
  assert.equal(state.resources.plant.sun, 175);
  assert.equal(state.sunPickups.length, 0);
  assert.equal(state.effects.some((effect) => effect.type === "sunDelta" && effect.amount === 25), true);
  assert.match(state.status, /当前 175/);
  assert.equal(state.audioEvents.some((event) => event.type === "collectSun"), true);
});
