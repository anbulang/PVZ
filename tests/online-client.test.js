import test from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/game/state.js";
import {
  applyLocalSelectionCommand,
  applyOnlineSnapshot,
  applyRoomSnapshot,
  canSendOnlineCommand,
  loadOnlineIdentity,
  onlinePanelViewModel,
  roomMatchesJoinRequest,
  saveOnlineIdentity,
  webSocketUrlForLocation,
} from "../src/online/client.js";

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

test("websocket URL builder keeps the current host and uses /ws", () => {
  assert.equal(webSocketUrlForLocation({ protocol: "http:", host: "192.168.2.15:5191" }), "ws://192.168.2.15:5191/ws");
  assert.equal(webSocketUrlForLocation({ protocol: "https:", host: "game.example.test" }), "wss://game.example.test/ws");
});

test("client identity storage persists client id and room", () => {
  const storage = new MapStorage();
  saveOnlineIdentity(storage, { clientId: "client-a", roomCode: "ROOM", side: "plant" });
  assert.deepEqual(loadOnlineIdentity(storage), { clientId: "client-a", roomCode: "ROOM", side: "plant" });
});

test("online room snapshot updates room metadata without replacing local selection", () => {
  const state = createGameState();
  const selection = { side: "plant", kind: "plant", type: "peashooter" };
  applyRoomSnapshot(state, {
    roomCode: "ROOM",
    phase: "playing",
    side: "plant",
    peerCount: 2,
    players: {
      plant: { clientId: "plant-device", online: true, ready: true, playAgainReady: false, disconnectedAt: null },
      zombie: { clientId: "zombie-device", online: true, ready: true, playAgainReady: false, disconnectedAt: null },
    },
  }, selection);

  assert.equal(state.online.roomCode, "ROOM");
  assert.equal(state.online.phase, "playing");
  assert.deepEqual(state.selection, selection);
});

test("online panel view model exposes ready reconnect and play again states", () => {
  const ready = onlinePanelViewModel({
    roomCode: "ROOM",
    phase: "ready",
    side: "plant",
    peerCount: 2,
    players: {
      plant: { ready: false, playAgainReady: false, online: true },
      zombie: { ready: true, playAgainReady: false, online: true },
    },
  });
  assert.equal(ready.phaseLabel, "等待准备");
  assert.equal(ready.showReady, true);
  assert.equal(ready.readyText, "准备");
  assert.equal(ready.showPlayAgain, false);

  const paused = onlinePanelViewModel({ roomCode: "ROOM", phase: "pausedForReconnect", side: "plant", reconnectRemainingMs: 55000 });
  assert.equal(paused.phaseLabel, "等待重连");
  assert.match(paused.detail, /55s/);

  const finished = onlinePanelViewModel({
    roomCode: "ROOM",
    phase: "finished",
    side: "zombie",
    players: {
      plant: { ready: false, playAgainReady: true, online: true },
      zombie: { ready: false, playAgainReady: false, online: true },
    },
  });
  assert.equal(finished.phaseLabel, "本局结束");
  assert.equal(finished.showReady, false);
  assert.equal(finished.showPlayAgain, true);
  assert.equal(finished.playAgainText, "再来一局");
});

test("online panel view model does not render undefined before joining a room", () => {
  const pending = onlinePanelViewModel({ clientId: "client-a" });

  assert.equal(pending.phaseLabel, "连接中");
  assert.equal(pending.statusText.includes("undefined"), false);
  assert.equal(pending.roomBadge, "");
  assert.equal(pending.detail, "请选择创建房间或加入房间。");
});

test("client join matcher accepts server-assigned remaining side", () => {
  assert.equal(roomMatchesJoinRequest({ roomCode: "ROOM", side: "zombie" }, "room"), true);
  assert.equal(roomMatchesJoinRequest({ roomCode: "OTHER", side: "zombie" }, "room"), false);
});

class MapStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, value);
  }
}
