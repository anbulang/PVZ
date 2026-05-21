import test from "node:test";
import assert from "node:assert/strict";
import {
  createOnlineRoom,
  joinOnlineRoom,
  serializeOnlineRoom,
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

test("online room applies commands from both devices to one authoritative state", () => {
  const room = createOnlineRoom({ code: "ROOM2" });
  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant" });
  const zombie = joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie" });

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
  const room = createOnlineRoom({ code: "ROOM3" });
  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant" });
  const zombie = joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie" });

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
