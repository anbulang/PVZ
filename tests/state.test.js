import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";
import { INITIAL_RESOURCES, ROUND } from "../src/game/config.js";

test("createGameState builds the initial local versus state", () => {
  const state = createGameState();
  assert.equal(state.mode, "playing");
  assert.equal(state.started, false);
  assert.equal(state.grid.rows, 5);
  assert.equal(state.grid.cols, 9);
  assert.equal(state.resources.plant.sun, INITIAL_RESOURCES.sun);
  assert.equal(state.resources.zombie.brain, INITIAL_RESOURCES.brain);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.timer.remaining, ROUND.duration);
  assert.equal(state.winner, null);
  assert.match(state.status, /守满 210 秒/);
});

test("serializeGameState returns concise JSON for automation", () => {
  const state = createGameState();
  const payload = JSON.parse(serializeGameState(state));
  assert.equal(payload.mode, "playing");
  assert.equal(payload.started, false);
  assert.deepEqual(payload.winCondition, {
    plant: "守满倒计时并清空场上僵尸",
    zombie: "突破左侧防线",
  });
  assert.equal(payload.coordinateSystem, "origin top-left; x grows right; y grows down; grid row 0..4 top-bottom col 0..8 left-right");
  assert.deepEqual(payload.resources, {
    sun: INITIAL_RESOURCES.sun,
    brain: INITIAL_RESOURCES.brain,
    zombieCombo: { count: 0, lastType: null, lastRow: null },
  });
  assert.equal(payload.entities.plants.length, 0);
  assert.equal(payload.entities.zombies.length, 0);
  assert.deepEqual(payload.audio, { audioUnlocked: false, musicActive: false, musicPath: null });
});
