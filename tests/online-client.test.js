import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import { applyLocalSelectionCommand, applyOnlineSnapshot, canSendOnlineCommand } from "../src/online/client.js";

test("online snapshot preserves the local device selection", () => {
  const state = createGameState();
  const serverState = createGameState();
  serverState.resources.plant.sun = 75;
  serverState.status = "服务器状态";
  const localSelection = { side: "plant", kind: "plant", type: "peashooter" };

  applyOnlineSnapshot(state, {
    online: { roomCode: "ROOM4", clientId: "plant-device", side: "plant", peerCount: 2 },
    state: serverState,
  }, localSelection);

  assert.equal(state.resources.plant.sun, 75);
  assert.equal(state.status, "服务器状态");
  assert.deepEqual(state.selection, localSelection);
  assert.deepEqual(state.online, { roomCode: "ROOM4", clientId: "plant-device", side: "plant", peerCount: 2 });
});

test("local online selection is restricted to the assigned side", () => {
  const state = createGameState();
  const zombieResult = applyLocalSelectionCommand(state, "plant", null, { type: "select", side: "zombie", kind: "zombie", unitType: "basic" });
  assert.equal(zombieResult.accepted, false);
  assert.equal(zombieResult.selection, null);
  assert.match(state.status, /当前设备控制植物方/);

  const plantResult = applyLocalSelectionCommand(state, "plant", null, { type: "select", side: "plant", kind: "plant", unitType: "peashooter" });
  assert.equal(plantResult.accepted, true);
  assert.deepEqual(plantResult.selection, { side: "plant", kind: "plant", type: "peashooter" });
});

test("online command send filter matches player sides", () => {
  assert.equal(canSendOnlineCommand("plant", { type: "placePlant" }), true);
  assert.equal(canSendOnlineCommand("plant", { type: "collectAllSun" }), true);
  assert.equal(canSendOnlineCommand("plant", { type: "deployZombie" }), false);
  assert.equal(canSendOnlineCommand("zombie", { type: "deployZombie" }), true);
  assert.equal(canSendOnlineCommand("zombie", { type: "placePlant" }), false);
  assert.equal(canSendOnlineCommand("zombie", { type: "togglePause" }), true);
});
