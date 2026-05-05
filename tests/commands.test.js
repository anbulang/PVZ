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
