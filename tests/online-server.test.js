import test from "node:test";
import assert from "node:assert/strict";
import { createOnlineHttpServer } from "../src/online/http-server.js";

test("online HTTP server creates a room and syncs two device commands", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => close(server));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const created = await postJson(`${baseUrl}/api/rooms`, { side: "plant" });
  const joined = await postJson(`${baseUrl}/api/rooms/${created.online.roomCode}/join`, { side: "zombie" });

  assert.equal(created.online.side, "plant");
  assert.equal(joined.online.side, "zombie");
  assert.equal(joined.online.peerCount, 2);

  await postJson(`${baseUrl}/api/rooms/${created.online.roomCode}/commands`, {
    clientId: created.online.clientId,
    command: { type: "placePlant", plantType: "peashooter", row: 2, col: 1 },
  });
  const afterZombieCommand = await postJson(`${baseUrl}/api/rooms/${created.online.roomCode}/commands`, {
    clientId: joined.online.clientId,
    command: { type: "deployZombie", zombieType: "basic", row: 2 },
  });

  assert.equal(afterZombieCommand.summary.entities.plants.length, 1);
  assert.equal(afterZombieCommand.summary.entities.zombies.length, 1);
  assert.equal(afterZombieCommand.online.commandSequence, 2);

  const snapshotResponse = await fetch(`${baseUrl}/api/rooms/${created.online.roomCode}/snapshot?clientId=${created.online.clientId}`);
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.online.side, "plant");
  assert.equal(snapshot.state.plants[0].type, "peashooter");
  assert.equal(snapshot.state.zombies[0].type, "basic");
});

test("online HTTP server serves the browser client", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => close(server));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<canvas id="game"/);
  assert.match(response.headers.get("content-type"), /text\/html/);
});

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(response.status < 400, true, JSON.stringify(payload));
  return payload;
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
