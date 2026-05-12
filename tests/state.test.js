import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";

test("createGameState builds the initial local versus state", () => {
  const state = createGameState();
  assert.equal(state.mode, "playing");
  assert.equal(state.started, false);
  assert.equal(state.grid.rows, 5);
  assert.equal(state.grid.cols, 9);
  assert.equal(state.resources.plant.sun, 150);
  assert.equal(state.resources.zombie.brain, 100);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.timer.remaining, 180);
  assert.equal(state.winner, null);
});

test("serializeGameState returns concise JSON for automation", () => {
  const state = createGameState();
  const payload = JSON.parse(serializeGameState(state));
  assert.equal(payload.mode, "playing");
  assert.equal(payload.started, false);
  assert.equal(payload.coordinateSystem, "origin top-left; x grows right; y grows down; grid row 0..4 top-bottom col 0..8 left-right");
  assert.deepEqual(payload.resources, { sun: 150, brain: 100 });
  assert.equal(payload.entities.plants.length, 0);
  assert.equal(payload.entities.zombies.length, 0);
  assert.deepEqual(payload.audio, { audioUnlocked: false, musicActive: false, musicPath: null });
});
