import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import { enqueueCommand, applyCommand, drainCommandQueue } from "../src/game/commands.js";

test("plant placement spends sun and occupies a grid cell", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  assert.equal(state.started, true);
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

test("unaffordable plant cards cannot be selected", () => {
  const state = createGameState();
  applyCommand(state, { type: "select", side: "plant", kind: "plant", unitType: "repeater" });
  assert.equal(state.selection, null);
  assert.match(state.status, /阳光不足/);
});

test("successful plant placement clears selected cooling card", () => {
  const state = createGameState();
  applyCommand(state, { type: "select", side: "plant", kind: "plant", unitType: "peashooter" });
  assert.deepEqual(state.selection, { side: "plant", kind: "plant", type: "peashooter" });
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  assert.equal(state.selection, null);
  assert.equal(state.cards.plant.peashooter.cooldownRemaining > 0, true);
});

test("zombie deployment spends brain and creates zombie", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 3 });
  assert.equal(state.started, true);
  assert.equal(state.resources.zombie.brain, 50);
  assert.equal(state.zombies.length, 1);
  assert.equal(state.zombies[0].type, "basic");
});

test("successful zombie deployment clears selected cooling card", () => {
  const state = createGameState();
  applyCommand(state, { type: "select", side: "zombie", kind: "zombie", unitType: "basic" });
  assert.deepEqual(state.selection, { side: "zombie", kind: "zombie", type: "basic" });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 3 });
  assert.equal(state.selection, null);
  assert.equal(state.cards.zombie.basic.cooldownRemaining > 0, true);
});

test("imp zombie is a fast low-cost pressure option", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "imp", row: 4 });
  assert.equal(state.resources.zombie.brain, 60);
  assert.equal(state.zombies[0].type, "imp");
  assert.equal(state.zombies[0].hp, 90);
});

test("mixed zombie deployments earn a combo brain refund", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.time = 3;
  applyCommand(state, { type: "deployZombie", zombieType: "imp", row: 3 });
  assert.equal(state.resources.zombie.brain, 22);
  assert.equal(state.resources.zombie.combo.count, 2);
  assert.equal(state.director.manualDeployCount, 2);
  assert.equal(state.status.includes("连携 x2"), true);
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
  assert.equal(state.effects.some((effect) => effect.type === "collectSun" && effect.amount === 25), true);
  assert.equal(state.effects.some((effect) => effect.type === "sunDelta" && effect.amount > 0), false);
  assert.match(state.status, /当前 175/);
  assert.equal(state.audioEvents.some((event) => event.type === "collectSun"), true);
});

test("collecting one sun pickup creates one positive amount feedback", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-test", x: 200, y: 200, amount: 25, ttl: 10 });
  applyCommand(state, { type: "collectSun", id: "sun-test" });
  const positiveFeedback = state.effects.filter((effect) => effect.amount > 0);
  assert.equal(positiveFeedback.length, 1);
  assert.equal(positiveFeedback[0].type, "collectSun");
  assert.equal(positiveFeedback[0].amount, 25);
});

test("collect all sun picks up visible sun in one action", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-a", x: 200, y: 200, amount: 25, ttl: 10 });
  state.sunPickups.push({ id: "sun-b", x: 280, y: 220, amount: 50, ttl: 10 });
  applyCommand(state, { type: "collectAllSun" });
  assert.equal(state.resources.plant.sun, 225);
  assert.equal(state.sunPickups.length, 0);
  assert.equal(state.effects.filter((effect) => effect.type === "collectSun" && effect.amount > 0).length, 2);
  assert.equal(state.effects.some((effect) => effect.type === "sunDelta" && effect.amount > 0), false);
  assert.match(state.status, /一键收集 75 阳光，当前 225/);
});
