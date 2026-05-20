import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";
import { enqueueCommand } from "../src/game/commands.js";
import { updateGame } from "../src/game/systems.js";
import { ROUND } from "../src/game/config.js";

test("command queue plus fixed ticks produces serializable gameplay", () => {
  const state = createGameState();
  enqueueCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
  enqueueCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  for (let i = 0; i < 240; i += 1) updateGame(state, 1 / 60);
  const payload = JSON.parse(serializeGameState(state));
  assert.equal(payload.entities.plants.length, 1);
  assert.equal(payload.entities.zombies.length, 1);
  assert.equal(payload.timeRemaining < ROUND.duration, true);
});
