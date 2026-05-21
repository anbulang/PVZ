import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createOnlineHttpServer } from "../src/online/http-server.js";

test("websocket room flow creates, joins, readies, and syncs gameplay", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => closeOnlineServer(server));

  const baseUrl = `ws://127.0.0.1:${server.address().port}/ws`;
  const plant = await connectClient(baseUrl);
  const zombie = await connectClient(baseUrl);
  t.after(() => plant.close());
  t.after(() => zombie.close());

  const plantWelcome = await exchange(plant, { type: "hello", clientId: "plant-device" }, "welcome");
  assert.equal(plantWelcome.clientId, "plant-device");

  plant.send(JSON.stringify({ type: "createRoom", side: "plant" }));
  const created = await waitForMessage(plant, "roomSnapshot");
  assert.equal(created.room.side, "plant");
  assert.equal(created.room.phase, "lobby");

  zombie.send(JSON.stringify({ type: "hello", clientId: "zombie-device" }));
  await waitForMessage(zombie, "welcome");
  zombie.send(JSON.stringify({ type: "joinRoom", roomCode: created.room.roomCode, side: "zombie" }));
  const joined = await waitForMessage(zombie, "roomSnapshot");
  assert.equal(joined.room.phase, "ready");

  plant.send(JSON.stringify({ type: "setReady", ready: true }));
  zombie.send(JSON.stringify({ type: "setReady", ready: true }));
  await waitForRoomPhase(plant, "playing");
  await waitForRoomPhase(zombie, "playing");

  const gamePromise = waitForGameSnapshot(plant, ({ summary }) => summary.entities.plants.length === 1 && summary.entities.zombies.length === 1);

  plant.send(JSON.stringify({ type: "command", sequence: 1, command: { type: "placePlant", plantType: "peashooter", row: 2, col: 1 } }));
  zombie.send(JSON.stringify({ type: "command", sequence: 1, command: { type: "deployZombie", zombieType: "basic", row: 2 } }));
  await waitForAck(plant, 1, true);
  await waitForAck(zombie, 1, true);
  const game = await gamePromise;
  assert.equal(game.summary.entities.plants[0].type, "peashooter");
  assert.equal(game.summary.entities.zombies[0].type, "basic");
});

test("websocket room pauses on disconnect and resumes same client id", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => closeOnlineServer(server));

  const baseUrl = `ws://127.0.0.1:${server.address().port}/ws`;
  const plant = await connectClient(baseUrl);
  const zombie = await connectClient(baseUrl);
  t.after(() => plant.close());

  await exchange(plant, { type: "hello", clientId: "plant-device" }, "welcome");
  plant.send(JSON.stringify({ type: "createRoom", side: "plant" }));
  const created = await waitForMessage(plant, "roomSnapshot");

  await exchange(zombie, { type: "hello", clientId: "zombie-device" }, "welcome");
  zombie.send(JSON.stringify({ type: "joinRoom", roomCode: created.room.roomCode, side: "zombie" }));
  await waitForRoomPhase(zombie, "ready");

  plant.send(JSON.stringify({ type: "setReady", ready: true }));
  zombie.send(JSON.stringify({ type: "setReady", ready: true }));
  await waitForRoomPhase(plant, "playing");
  await waitForRoomPhase(zombie, "playing");

  zombie.close();
  await waitForRoomPhase(plant, "pausedForReconnect");

  const reconnectedZombie = await connectClient(baseUrl);
  t.after(() => reconnectedZombie.close());
  await exchange(reconnectedZombie, { type: "hello", clientId: "zombie-device" }, "welcome");
  reconnectedZombie.send(JSON.stringify({ type: "joinRoom", roomCode: created.room.roomCode, side: "zombie" }));

  const resumed = await waitForRoomPhase(plant, "playing");
  assert.equal(resumed.room.players.zombie.online, true);
});

function connectClient(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function exchange(socket, payload, expectedType) {
  socket.send(JSON.stringify(payload));
  return waitForMessage(socket, expectedType);
}

function waitForAck(socket, sequence, accepted) {
  return waitForMessage(socket, "commandAck", (message) => message.sequence === sequence && message.accepted === accepted);
}

function waitForRoomPhase(socket, phase) {
  return waitForMessage(socket, "roomSnapshot", (message) => message.room.phase === phase);
}

function waitForGameSnapshot(socket, predicate) {
  return waitForMessage(socket, "gameSnapshot", predicate);
}

function waitForMessage(socket, type, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for ${type}`));
    }, 1500);

    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      if (message.type !== type || !predicate(message)) return;
      cleanup();
      resolve(message);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function closeOnlineServer(server) {
  for (const socket of server.onlineWebSocket.wss.clients) socket.terminate();
  return close(server);
}
