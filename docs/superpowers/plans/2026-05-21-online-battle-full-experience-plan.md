# PVZ 在线对战完整体验实施计划

> **给 agentic workers：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。所有步骤使用 checkbox（`- [ ]`）跟踪。

**目标：** 把当前 LAN 在线对战基础升级为 WebSocket 房间完整体验，支持双方准备、短线重连、掉线暂停、超时判负和双方确认再来一局。

**架构：** 继续让 `src/online/room.js` 作为不依赖传输层的权威房间核心，并把它扩展成显式状态机。新增基于 `ws` 的传输层，负责 WebSocket 消息、快照广播、心跳和断线处理，并挂载到现有静态 HTTP 服务器上。浏览器端改为 WebSocket client，同时保留本地卡牌 selection 和离线本地双人模式。

**技术栈：** JavaScript ES modules、Node `http`、`ws`、Canvas 2D、Node `node:test`、Playwright。

---

## 文件范围

- 修改 `package.json`、`package-lock.json`：新增运行时依赖 `ws`。
- 修改 `src/online/room.js`：新增房间阶段、准备状态、再来一局状态、断线/重连计时、阶段门禁和快照 helper。
- 新建 `src/online/ws-server.js`：处理 WebSocket 消息、连接映射、快照广播、心跳和断线。
- 修改 `src/online/http-server.js`：共享 room registry，挂载 `ws-server.js`，保留静态文件服务。
- 修改 `src/online/client.js`：从 HTTP polling 改为 WebSocket，增加 `localStorage` 身份、房间快照、准备/再来一局动作和重连状态。
- 修改 `index.html`：在现有在线面板中增加准备和再来一局控件。
- 修改 `src/styles.css`：补充在线阶段、准备、重连和结束状态样式。
- 修改 `src/main.js`：在线局继续由服务器驱动，补充浏览器验收 debug helper。
- 修改 `scripts/verify-online-browser.js`：覆盖创建/加入、准备、命令同步、刷新重连和再来一局。
- 修改 `tests/online-room.test.js`：扩展 room core 覆盖。
- 新建 `tests/online-ws-server.test.js`：WebSocket 协议集成测试。
- 修改 `tests/online-client.test.js`：覆盖 WebSocket helper 和本地身份。
- 修改 `tests/online-server.test.js`：确认静态 HTTP server 可挂载 WebSocket。
- 修改 `progress.md`：记录实现和验证证据。

## 任务 1：新增 `ws` 依赖

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`

- [ ] **步骤 1：安装依赖**

运行：

```bash
npm install ws
```

预期：`package.json` 和 `package-lock.json` 中出现 `ws` 依赖。

- [ ] **步骤 2：验证现有测试仍可运行**

运行：

```bash
npm test
```

预期：当前已有测试全部通过。如果沙箱拦截本机端口监听，按权限流程用 escalation 重跑，并记录原因。

- [ ] **步骤 3：提交依赖变更**

```bash
git add package.json package-lock.json
git commit -m "chore: add websocket dependency"
```

## 任务 2：扩展房间核心状态机

**文件：**
- 修改：`tests/online-room.test.js`
- 修改：`src/online/room.js`

- [ ] **步骤 1：先写失败测试**

在 `tests/online-room.test.js` 中补充：

```js
test("online room waits for both players to be ready before starting", () => {
  const room = createOnlineRoom({ code: "READY", now: 1000 });
  const plant = joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", now: 1000 });
  const zombie = joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 1000 });

  assert.equal(room.phase, "ready");
  assert.equal(setOnlineReady(room, plant.clientId, true, { now: 1100 }).ok, true);
  assert.equal(room.phase, "ready");
  assert.equal(setOnlineReady(room, zombie.clientId, true, { now: 1200 }).ok, true);
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

function createPlayingRoom() {
  const room = createOnlineRoom({ code: "PLAY", now: 1000 });
  joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", now: 1000 });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", now: 1000 });
  setOnlineReady(room, "plant-device", true, { now: 1100 });
  setOnlineReady(room, "zombie-device", true, { now: 1200 });
  return room;
}
```

同步更新 import：

```js
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
```

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
node --test tests/online-room.test.js
```

预期：失败，原因是缺少新导出或 `phase` 断言失败。

- [ ] **步骤 3：实现 room 阶段和核心 API**

在 `src/online/room.js` 中新增：

```js
export const ROOM_PHASES = {
  lobby: "lobby",
  ready: "ready",
  playing: "playing",
  pausedForReconnect: "pausedForReconnect",
  finished: "finished",
};

export const RECONNECT_TIMEOUT_MS = 60_000;
```

新增导出函数：

```js
export function setOnlineReady(room, clientId, ready, options = {}) { /* 按 ready/lobby 阶段设置准备状态 */ }
export function markOnlineClientDisconnected(room, clientId, options = {}) { /* 标记离线，playing 中进入 pausedForReconnect */ }
export function expireOnlineReconnects(room, options = {}) { /* 60 秒超时后设置 winner 并进入 finished */ }
export function requestOnlinePlayAgain(room, clientId, ready, options = {}) { /* 双方确认后 resetGameState 并回到 ready */ }
export function serializeRoomSnapshot(room, clientId = null, options = {}) { /* 生成 roomSnapshot */ }
export function serializeGameSnapshot(room) { /* 生成 state + summary */ }
```

`joinOnlineRoom()` 必须支持同一 `clientId` 重连：原 client 存在时恢复 `online: true`、更新 `lastSeenAt`、清空 `disconnectedAt`，并调用 `updateRoomPhase()`。

`tickOnlineRoom(room, dt, options)` 只在 `room.phase === "playing"` 时调用 `updateGame()`。`submitOnlineCommand()` 在非 `playing` 阶段返回：

```js
{ ok: false, code: "room_not_playing", reason: "room is not playing" }
```

- [ ] **步骤 4：运行 room 测试确认绿灯**

运行：

```bash
node --test tests/online-room.test.js
```

预期：`online-room` 测试全部通过。

- [ ] **步骤 5：提交 room core**

```bash
git add src/online/room.js tests/online-room.test.js
git commit -m "feat: add online room lifecycle state"
```

## 任务 3：新增 WebSocket 服务端协议

**文件：**
- 新建：`tests/online-ws-server.test.js`
- 新建：`src/online/ws-server.js`
- 修改：`src/online/http-server.js`

- [ ] **步骤 1：先写失败的 WebSocket 协议测试**

新建 `tests/online-ws-server.test.js`，至少覆盖：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createOnlineHttpServer } from "../src/online/http-server.js";

test("websocket room flow creates, joins, readies, and syncs gameplay", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => close(server));

  const baseUrl = `ws://127.0.0.1:${server.address().port}/ws`;
  const plant = await connectClient(baseUrl);
  const zombie = await connectClient(baseUrl);

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

  plant.send(JSON.stringify({ type: "command", sequence: 1, command: { type: "placePlant", plantType: "peashooter", row: 2, col: 1 } }));
  zombie.send(JSON.stringify({ type: "command", sequence: 1, command: { type: "deployZombie", zombieType: "basic", row: 2 } }));
  const game = await waitForMessage(plant, "gameSnapshot");
  assert.equal(game.summary.entities.plants.length, 1);
  assert.equal(game.summary.entities.zombies.length, 1);
});
```

同文件继续加入断线重连测试：创建 playing 房间后关闭僵尸端 socket，植物端应收到 `pausedForReconnect`；僵尸端用同一 `clientId` 重新连接并 `joinRoom` 后，房间恢复 `playing`。

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
node --test tests/online-ws-server.test.js
```

预期：失败，原因是 `/ws` upgrade 未处理，或 `src/online/ws-server.js` 不存在。

- [ ] **步骤 3：实现 `src/online/ws-server.js`**

新建 `src/online/ws-server.js`，导出：

```js
export function attachOnlineWebSocketServer(server, { rooms = new Map(), tickMs = 1000 / 30 } = {}) {
  // 返回 { wss, rooms, sockets }
}
```

必须处理客户端消息：

- `hello`
- `createRoom`
- `joinRoom`
- `setReady`
- `command`
- `playAgainReady`

必须发送服务端消息：

```js
send(socket, { type: "welcome", clientId });
send(socket, { type: "roomSnapshot", room: serializeRoomSnapshot(room, clientId, { now }) });
send(socket, { type: "gameSnapshot", state: serializeGameSnapshot(room).state, summary: serializeGameSnapshot(room).summary });
send(socket, { type: "commandAck", sequence, accepted: result.ok, code: result.code ?? null });
send(socket, { type: "error", code, message });
```

- [ ] **步骤 4：在 HTTP server 上挂载 WebSocket**

修改 `src/online/http-server.js`：

```js
import { attachOnlineWebSocketServer } from "./ws-server.js";

export function createOnlineHttpServer({ rootDir = process.cwd(), tickMs = 1000 / 60 } = {}) {
  const rooms = new Map();
  const root = path.resolve(rootDir);
  const server = http.createServer((request, response) => {
    handleRequest({ request, response, rooms, root }).catch((error) => {
      sendJson(response, 500, { error: error.message });
    });
  });

  const onlineWebSocket = attachOnlineWebSocketServer(server, { rooms, tickMs });
  server.onlineRooms = rooms;
  server.onlineWebSocket = onlineWebSocket;
  return server;
}
```

删除 `http-server.js` 中旧的 `setInterval()`，由 WebSocket 层负责 tick 和广播。

- [ ] **步骤 5：运行 WebSocket 测试确认绿灯**

运行：

```bash
node --test tests/online-ws-server.test.js
```

预期：WebSocket 测试全部通过。

- [ ] **步骤 6：运行现有在线 server 测试**

运行：

```bash
node --test tests/online-server.test.js tests/online-ws-server.test.js
```

预期：HTTP 兼容测试和 WebSocket 测试都通过。

- [ ] **步骤 7：提交 WebSocket server**

```bash
git add src/online/ws-server.js src/online/http-server.js tests/online-ws-server.test.js tests/online-server.test.js
git commit -m "feat: add websocket online room transport"
```

## 任务 4：浏览器在线客户端改为 WebSocket

**文件：**
- 修改：`tests/online-client.test.js`
- 修改：`src/online/client.js`
- 修改：`src/main.js`

- [ ] **步骤 1：先写失败的 client 测试**

在 `tests/online-client.test.js` 中加入：

```js
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
```

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
node --test tests/online-client.test.js
```

预期：失败，原因是缺少 `webSocketUrlForLocation`、`saveOnlineIdentity`、`loadOnlineIdentity`、`applyRoomSnapshot` 等导出。

- [ ] **步骤 3：实现浏览器 WebSocket helper**

在 `src/online/client.js` 中增加：

```js
const IDENTITY_KEY = "pvz-online-identity";

export function webSocketUrlForLocation(locationLike = globalThis.location) {
  const protocol = locationLike.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${locationLike.host}/ws`;
}

export function saveOnlineIdentity(storage, identity) {
  storage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function loadOnlineIdentity(storage) {
  const raw = storage.getItem(IDENTITY_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function applyRoomSnapshot(state, room, localSelection = null) {
  state.online = { ...(state.online ?? {}), ...clonePlain(room) };
  state.selection = localSelection;
}
```

- [ ] **步骤 4：把 HTTP polling 替换为 WebSocket**

重构 `createOnlineClient()`：建立 `new WebSocket(webSocketUrlForLocation())`，连接后发送 `hello`，收到 `welcome` 保存 `clientId`，收到 `roomSnapshot` 调用 `applyRoomSnapshot()`，收到 `gameSnapshot` 调用现有 `applyOnlineSnapshot()`。

`hostRoom(side)` 发送：

```js
send({ type: "createRoom", side });
```

`joinRoom(roomCode, side)` 发送：

```js
send({ type: "joinRoom", roomCode: roomCode.toUpperCase(), side, clientId: online?.clientId });
```

返回对象新增：

```js
setReady(ready) { send({ type: "setReady", ready }); }
setPlayAgainReady(ready) { send({ type: "playAgainReady", ready }); }
```

`dispatchCommand(command)` 在 `canSendOnlineCommand()` 为真且 `state.online.phase === "playing"` 时发送：

```js
send({ type: "command", sequence: nextClientSequence(), command });
```

- [ ] **步骤 5：保持本地模式不变**

在 `src/main.js` 中保留本地 tick 分支；在线时只渲染服务器快照，不本地推进模拟。新增：

```js
window.__onlineDebug = () => ({
  isOnline: onlineClient.isOnline(),
  selection: onlineClient.getSelection(),
  online: window.__gameState.online ?? null,
});
```

- [ ] **步骤 6：运行 client 测试**

运行：

```bash
node --test tests/online-client.test.js
```

预期：client 测试全部通过。

- [ ] **步骤 7：提交 client 传输更新**

```bash
git add src/online/client.js src/main.js tests/online-client.test.js
git commit -m "feat: use websocket client for online rooms"
```

## 任务 5：新增准备、重连和再来一局 UI

**文件：**
- 修改：`index.html`
- 修改：`src/styles.css`
- 修改：`src/online/client.js`

- [ ] **步骤 1：增加面板元素**

在 `index.html` 的 `#online-panel` 内增加：

```html
<button id="online-ready" type="button" hidden>准备</button>
<button id="online-play-again" type="button" hidden>再来一局</button>
<span id="online-detail" class="online-detail"></span>
```

- [ ] **步骤 2：接入面板控件**

更新 `bindOnlinePanel()`，增加 `readyButton`、`playAgainButton`、`detail`。准备按钮调用 `setReady()`，再来一局按钮调用 `setPlayAgainReady()`。

- [ ] **步骤 3：渲染在线阶段文案**

`updatePanel()` 使用：

```js
const phaseLabel = {
  lobby: "等待加入",
  ready: "等待准备",
  playing: "对局中",
  pausedForReconnect: "等待重连",
  finished: "本局结束",
}[online.phase] ?? "在线";
```

`ready` 阶段显示准备按钮；`finished` 阶段显示再来一局按钮；未在线时显示创建/加入输入。

- [ ] **步骤 4：补充样式**

追加到 `src/styles.css`：

```css
.online-detail {
  color: #dacb96;
  font-size: 12px;
  white-space: nowrap;
}

.online-panel button[hidden] {
  display: none;
}

.online-panel[data-phase="pausedForReconnect"] {
  border-color: rgba(226, 103, 72, 0.8);
  background: rgba(62, 38, 25, 0.94);
}

.online-panel[data-phase="finished"] {
  border-color: rgba(239, 220, 154, 0.82);
  background: rgba(39, 53, 35, 0.96);
}
```

- [ ] **步骤 5：运行布局和 client 测试**

运行：

```bash
node --test tests/online-client.test.js tests/layout.test.js
```

预期：全部通过。

- [ ] **步骤 6：提交 UI 状态控件**

```bash
git add index.html src/styles.css src/online/client.js tests/online-client.test.js
git commit -m "feat: add online room state controls"
```

## 任务 6：升级双浏览器验收

**文件：**
- 修改：`scripts/verify-online-browser.js`
- 修改：`package.json`

- [ ] **步骤 1：更新浏览器验收流程**

`scripts/verify-online-browser.js` 需要覆盖：植物端创建房间、僵尸端加入、双方准备、双方命令同步、刷新僵尸端并恢复原阵营。

核心流程：

```js
await plantPage.goto(baseUrl, { waitUntil: "networkidle" });
await zombiePage.goto(baseUrl, { waitUntil: "networkidle" });

const hosted = await plantPage.evaluate(() => window.__onlineClient.hostRoom("plant"));
await zombiePage.evaluate((roomCode) => window.__onlineClient.joinRoom(roomCode, "zombie"), hosted.room?.roomCode ?? hosted.online?.roomCode);

await plantPage.evaluate(() => window.__onlineClient.setReady(true));
await zombiePage.evaluate(() => window.__onlineClient.setReady(true));
await plantPage.waitForFunction(() => window.__gameState.online?.phase === "playing");
await zombiePage.waitForFunction(() => window.__gameState.online?.phase === "playing");
```

随后分别提交 `placePlant` 和 `deployZombie`，等待两端 `render_game_to_text()` 中都有 1 个植物和 1 个僵尸。

- [ ] **步骤 2：增加重连和再来一局断言**

刷新僵尸页面：

```js
await zombiePage.reload({ waitUntil: "networkidle" });
await zombiePage.waitForFunction(() => window.__gameState.online?.phase === "playing" && window.__gameState.online?.side === "zombie");
```

结束状态可通过测试 helper 触发，然后让双方调用 `setPlayAgainReady(true)`，等待双方回到 `ready`。

- [ ] **步骤 3：运行浏览器验收**

启动服务器：

```bash
npm run online -- 5191
```

运行：

```bash
node scripts/verify-online-browser.js http://127.0.0.1:5191
```

预期：JSON 输出中 `consoleErrors: []`，两个页面在同一房间，双方已准备，植物/僵尸实体一致，刷新后恢复僵尸方身份。

- [ ] **步骤 4：提交浏览器验收更新**

```bash
git add scripts/verify-online-browser.js src/online/client.js package.json
git commit -m "test: verify websocket online browser flow"
```

## 任务 7：全量验证和进度记录

**文件：**
- 修改：`progress.md`

- [ ] **步骤 1：运行全量测试**

```bash
npm test
```

预期：所有 Node 测试通过。如果沙箱拦截端口监听，用 approved escalation 重跑并记录原因。

- [ ] **步骤 2：运行主浏览器回归**

```bash
node scripts/verify-browser.js http://127.0.0.1:5191 tests/browser-actions.json
```

预期：无 console errors、无 missing assets、至少一个植物和一个僵尸、`director.autoWaves === false`、`manualDeployCount >= 1`。

- [ ] **步骤 3：运行双浏览器 WebSocket 验收**

```bash
node scripts/verify-online-browser.js http://127.0.0.1:5191
```

预期：无 console errors；两个页面共享同一房间；植物方和僵尸方分配正确；对局中双方 ready 为 true；刷新后恢复僵尸方；gameplay entities 一致。

- [ ] **步骤 4：检查空白问题**

```bash
git diff --check
```

预期：无输出，exit code 为 0。

- [ ] **步骤 5：更新进度记录**

追加到 `progress.md`：

```markdown
## 2026-05-21 WebSocket 在线对战完整体验

- 使用 `ws` 将 LAN 在线对战从 HTTP polling 升级为 WebSocket 房间传输。
- 新增显式房间阶段：`lobby`、`ready`、`playing`、`pausedForReconnect`、`finished`。
- 新增双方准备、60 秒同 clientId 重连、掉线暂停、超时判负和双方确认再来一局。
- 更新浏览器房间面板，显示在线阶段、准备状态、重连暂停和再来一局控件。
- 已验证 room core、WebSocket 协议、现有本地流程和双浏览器在线流程。
```

- [ ] **步骤 6：提交验证记录**

```bash
git add progress.md
git commit -m "docs: record websocket online battle verification"
```

## 最终验证清单

- [ ] `npm test`
- [ ] `node scripts/verify-browser.js http://127.0.0.1:5191 tests/browser-actions.json`
- [ ] `node scripts/verify-online-browser.js http://127.0.0.1:5191`
- [ ] `git diff --check`
- [ ] `git status --short --branch`
