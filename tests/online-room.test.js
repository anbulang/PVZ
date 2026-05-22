import test from "node:test";
import assert from "node:assert/strict";
import {
  createOnlineRoom,
  expireOnlineReconnects,
  joinOnlineRoom,
  markOnlineClientDisconnected,
  requestOnlinePlayAgain,
  serializeOnlineRoom,
  setOnlineReady,
  submitOnlineCommand,
  tickOnlineRoom,
} from "../src/online/room.js";

test("online room pairs one plant device with one zombie device", () => {
  const room = createOnlineRoom({ code: "ROOM1" });

  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant" });
  const zombie = joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie" });
  const duplicate = joinOnlineRoom(room, { clientId: "extra-device", requestedSide: "plant" });

  assert.equal(plant.ok, true);
  assert.equal(plant.side, "plant");
  assert.equal(zombie.ok, true);
  assert.equal(zombie.side, "zombie");
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.reason, /already taken/);

  const snapshot = serializeOnlineRoom(room, plant.clientId);
  assert.equal(snapshot.online.roomCode, "ROOM1");
  assert.equal(snapshot.online.clientId, "plant-device");
  assert.equal(snapshot.online.side, "plant");
  assert.equal(snapshot.online.peerCount, 2);
  assert.deepEqual(snapshot.online.sides, { plant: "plant-device", zombie: "zombie-device" });
});

test("online room assigns the remaining side when requested side is already taken", () => {
  const room = createOnlineRoom({ code: "ROOM4" });

  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant" });
  const secondPlant = joinOnlineRoom(room, { clientId: "second-device", requestedSide: "plant" });

  assert.equal(plant.ok, true);
  assert.equal(secondPlant.ok, true);
  assert.equal(secondPlant.side, "zombie");
  assert.equal(room.clients.get("second-device").side, "zombie");
});

test("online room serializes lightweight player profiles", () => {
  const room = createOnlineRoom({ code: "PROF" });
  joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", profile: { playerName: "Plant One", avatarId: "sunflower" } });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", profile: { playerName: "Zombie Two", avatarId: "cone" } });
  const snapshot = serializeOnlineRoom(room, "plant-device");
  assert.deepEqual(snapshot.room.players.plant.profile, { playerName: "Plant One", avatarId: "sunflower" });
  assert.deepEqual(snapshot.room.players.zombie.profile, { playerName: "Zombie Two", avatarId: "cone" });
});

test("online room snapshots do not expose mutable player profile references", () => {
  const room = createOnlineRoom({ code: "SAFE" });
  joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", profile: { playerName: "Plant One", avatarId: "sunflower" } });

  const snapshot = serializeOnlineRoom(room, "plant-device");
  snapshot.room.players.plant.profile.playerName = "Mutated";

  assert.equal(room.clients.get("plant-device").profile.playerName, "Plant One");
});

test("online room applies commands from both devices to one authoritative state", () => {
  const room = createPlayingRoom({ code: "ROOM2" });
  const plant = room.clients.get("plant-device");
  const zombie = room.clients.get("zombie-device");

  assert.equal(submitOnlineCommand(room, plant.clientId, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 }).ok, true);
  assert.equal(submitOnlineCommand(room, zombie.clientId, { type: "deployZombie", zombieType: "basic", row: 2 }).ok, true);
  tickOnlineRoom(room, 1 / 60);

  const snapshot = serializeOnlineRoom(room, plant.clientId);
  assert.equal(snapshot.state.plants.length, 1);
  assert.equal(snapshot.state.plants[0].type, "peashooter");
  assert.equal(snapshot.state.zombies.length, 1);
  assert.equal(snapshot.state.zombies[0].type, "basic");
  assert.equal(snapshot.state.director.manualDeployCount, 1);
  assert.equal(snapshot.summary.entities.plants.length, 1);
  assert.equal(snapshot.summary.entities.zombies.length, 1);
});

test("online room rejects commands from the wrong device side", () => {
  const room = createPlayingRoom({ code: "ROOM3" });
  const plant = room.clients.get("plant-device");
  const zombie = room.clients.get("zombie-device");

  const plantDeploy = submitOnlineCommand(room, plant.clientId, { type: "deployZombie", zombieType: "basic", row: 1 });
  const zombiePlant = submitOnlineCommand(room, zombie.clientId, { type: "placePlant", plantType: "peashooter", row: 1, col: 1 });
  tickOnlineRoom(room, 1 / 60);

  assert.equal(plantDeploy.ok, false);
  assert.match(plantDeploy.reason, /plant client cannot deployZombie/);
  assert.equal(zombiePlant.ok, false);
  assert.match(zombiePlant.reason, /zombie client cannot placePlant/);
  assert.equal(room.state.plants.length, 0);
  assert.equal(room.state.zombies.length, 0);
});

test("online room waits for both players to be ready before starting", () => {
  const room = createOnlineRoom({ code: "READY", now: 1000 });
  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", now: 1000 });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 1000 });

  assert.equal(room.phase, "ready");
  assert.equal(setOnlineReady(room, plant.clientId, true, { now: 1100 }).ok, true);
  assert.equal(room.phase, "ready");
  assert.equal(setOnlineReady(room, "zombie-device", true, { now: 1200 }).ok, true);
  assert.equal(room.phase, "playing");

  const snapshot = serializeOnlineRoom(room, plant.clientId, { now: 1200 });
  assert.equal(snapshot.room.phase, "playing");
  assert.equal(snapshot.room.players.plant.ready, true);
  assert.equal(snapshot.room.players.zombie.ready, true);
});

test("online room rejects gameplay commands before playing", () => {
  const room = createOnlineRoom({ code: "BLOCK", now: 1000 });
  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", now: 1000 });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 1000 });

  const result = submitOnlineCommand(room, plant.clientId, { type: "placePlant", plantType: "peashooter", row: 2, col: 1 });

  assert.equal(result.ok, false);
  assert.equal(result.code, "room_not_playing");
  assert.equal(room.state.plants.length, 0);
});

test("online room pauses on disconnect and resumes when the same client reconnects", () => {
  const room = createPlayingRoom();
  const disconnected = markOnlineClientDisconnected(room, "zombie-device", { now: 5000 });
  const beforeRemaining = room.state.timer.remaining;

  assert.equal(disconnected.ok, true);
  assert.equal(room.phase, "pausedForReconnect");
  assert.equal(tickOnlineRoom(room, 1, { now: 5100 }).ok, true);
  assert.equal(room.state.timer.remaining, beforeRemaining);

  const reconnected = joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 5900 });

  assert.equal(reconnected.ok, true);
  assert.equal(room.phase, "playing");
  assert.equal(room.clients.get("zombie-device").online, true);
});

test("online room forfeits the disconnected side after reconnect timeout", () => {
  const room = createPlayingRoom();
  markOnlineClientDisconnected(room, "plant-device", { now: 5000 });

  expireOnlineReconnects(room, { now: 65001 });

  assert.equal(room.phase, "finished");
  assert.equal(room.state.winner, "zombie");
  assert.match(room.state.status, /植物方掉线超时/);
});

test("online room resets after both players request play again", () => {
  const room = createPlayingRoom();
  markOnlineClientDisconnected(room, "plant-device", { now: 5000 });
  expireOnlineReconnects(room, { now: 65001 });

  assert.equal(requestOnlinePlayAgain(room, "plant-device", true, { now: 66000 }).ok, true);
  assert.equal(room.phase, "finished");
  assert.equal(requestOnlinePlayAgain(room, "zombie-device", true, { now: 66100 }).ok, true);

  assert.equal(room.phase, "ready");
  assert.equal(room.state.winner, null);
  assert.equal(room.state.started, false);
  assert.equal(room.clients.get("plant-device").ready, false);
  assert.equal(room.clients.get("zombie-device").ready, false);
});

function createPlayingRoom(options = {}) {
  const room = createOnlineRoom({ code: options.code ?? "PLAY", now: 1000 });
  joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", now: 1000 });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 1000 });
  setOnlineReady(room, "plant-device", true, { now: 1100 });
  setOnlineReady(room, "zombie-device", true, { now: 1200 });
  return room;
}
