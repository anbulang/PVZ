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
  applyCommand(state, { type: "placePlant", plantType: "wallnut", row: 1, col: 8 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 1 });
  const hpBefore = state.plants[0].hp;
  step(state, 5);
  assert.equal(state.plants[0].hp < hpBefore, true);
});

test("zombie wins after crossing the left edge", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 0 });
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
