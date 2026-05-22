# PVZ Login Room Game Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建稳定的登录页 -> 房间设置页 -> 游戏页闭环，让两台设备先完成轻量身份和房间准备，再进入在线对战。

**Architecture:** 保留现有 `index.html`、Canvas、WebSocket 在线客户端和权威服务器模型，新增单 app shell 的三段 view 控制层。可测试的玩家资料、URL view 推导、房间 profile 同步拆成小模块或现有在线模块的清晰函数，再由 DOM 绑定层驱动页面切换。

**Tech Stack:** JavaScript ES modules、HTML/CSS、Canvas 2D、Node `node:test`、WebSocket `ws`、Playwright、Codex 生成 PNG 视觉资产。

---

## 文件结构

- Create: `src/online/profile.js` - 轻量玩家资料默认值、校验、保存和读取。
- Create: `src/online/app-flow.js` - 从 URL、profile、online snapshot 推导当前 view 和跳转 URL。
- Modify: `src/online/room.js` - `joinOnlineRoom()` 接收并保存轻量 profile，序列化到 `roomSnapshot.players.<side>.profile`。
- Modify: `src/online/ws-server.js` - 从 `createRoom` 和 `joinRoom` 消息读取 `profile` 并传给 room core。
- Modify: `src/online/client.js` - 暴露当前 online snapshot，发送 profile，支持 `onOnlineChange`。
- Modify: `src/main.js` - 初始化 app flow，把登录、房间、游戏三段 DOM 和在线客户端串起来。
- Modify: `index.html` - 改为 `login-view`、`room-view`、`game-view` 三段结构。
- Modify: `src/styles.css` - 新增三段 view 的响应式页面样式。
- Create: `generated-assets/ui/login-hero.png` - Codex 生成原创登录背景图。
- Create: `generated-assets/ui/room-panel-hero.png` - Codex 生成原创房间设置页背景图。
- Modify: `scripts/verify-online-browser.js` - 真实页面流程验证：登录、创建、邀请、加入、准备、进入游戏、同步操作。
- Test: `tests/online-profile.test.js` - profile 存储和 view 推导。
- Test: `tests/online-room.test.js` - profile 序列化。
- Test: `tests/online-ws-server.test.js` - WebSocket profile 广播。
- Test: `tests/online-client.test.js` - app shell DOM、online state access、游戏页控件隐藏。

## Task 1: Profile And View State Core

**Files:**
- Create: `src/online/profile.js`
- Create: `src/online/app-flow.js`
- Test: `tests/online-profile.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/online-profile.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AVATAR_ID, loadPlayerProfile, normalizePlayerProfile, savePlayerProfile } from "../src/online/profile.js";
import { gameUrl, nextViewState, roomUrl, viewUrl } from "../src/online/app-flow.js";

test("player profile normalizes names avatars and timestamps", () => {
  assert.deepEqual(normalizePlayerProfile({ playerName: "  Chaucer Mini  ", avatarId: "cone" }, 1779420000000), {
    playerName: "Chaucer Mini",
    avatarId: "cone",
    lastUpdatedAt: 1779420000000,
  });
});

test("blank player profile falls back to a local nickname", () => {
  const profile = normalizePlayerProfile({ playerName: "   ", avatarId: "missing" }, 1779420000001);
  assert.equal(profile.playerName.startsWith("玩家"), true);
  assert.equal(profile.avatarId, DEFAULT_AVATAR_ID);
});

test("player profile persists to storage", () => {
  const storage = new MapStorage();
  const saved = savePlayerProfile(storage, { playerName: "Plant One", avatarId: "sunflower" }, 1779420000002);
  assert.deepEqual(loadPlayerProfile(storage), saved);
});

test("view state starts at login without profile then returns to room after login", () => {
  assert.equal(nextViewState({ locationLike: { search: "?room=ABCD" }, profile: null, online: null }).view, "login");
  const profile = { playerName: "Plant One", avatarId: "sunflower", lastUpdatedAt: 1 };
  const state = nextViewState({ locationLike: { search: "?room=ABCD" }, profile, online: null });
  assert.equal(state.view, "room");
  assert.equal(state.pendingRoomCode, "ABCD");
});

test("view state enters game only when online room is playing", () => {
  const profile = { playerName: "Plant One", avatarId: "sunflower", lastUpdatedAt: 1 };
  assert.equal(nextViewState({ locationLike: { search: "?view=game&room=ABCD" }, profile, online: { roomCode: "ABCD", phase: "ready" } }).view, "room");
  assert.equal(nextViewState({ locationLike: { search: "?view=game&room=ABCD" }, profile, online: { roomCode: "ABCD", phase: "playing", side: "plant" } }).view, "game");
});

test("view URL helpers preserve room codes", () => {
  assert.equal(viewUrl("/index.html", "login"), "/index.html?view=login");
  assert.equal(roomUrl("/index.html", "room"), "/index.html?view=room&room=ROOM");
  assert.equal(gameUrl("/index.html", "room"), "/index.html?view=game&room=ROOM");
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
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/online-profile.test.js`

Expected: FAIL because `src/online/profile.js` and `src/online/app-flow.js` do not exist.

- [ ] **Step 3: Implement profile storage**

Create `src/online/profile.js`:

```js
export const PLAYER_PROFILE_KEY = "pvz-player-profile";
export const DEFAULT_AVATAR_ID = "sunflower";
export const AVATAR_IDS = ["sunflower", "peashooter", "wallnut", "basic", "cone", "bucket"];

export function normalizePlayerProfile(input = {}, now = Date.now()) {
  const trimmedName = String(input.playerName ?? "").trim().slice(0, 18);
  const playerName = trimmedName || `玩家${String(now).slice(-4)}`;
  const avatarId = AVATAR_IDS.includes(input.avatarId) ? input.avatarId : DEFAULT_AVATAR_ID;
  return { playerName, avatarId, lastUpdatedAt: now };
}

export function savePlayerProfile(storage, input, now = Date.now()) {
  const profile = normalizePlayerProfile(input, now);
  storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function loadPlayerProfile(storage) {
  const raw = storage?.getItem(PLAYER_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizePlayerProfile(parsed, parsed.lastUpdatedAt ?? Date.now());
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Implement view state helpers**

Create `src/online/app-flow.js`:

```js
export function nextViewState({ locationLike, profile, online }) {
  const params = new URLSearchParams(locationLike?.search ?? "");
  const pendingRoomCode = params.get("room")?.toUpperCase() ?? online?.roomCode ?? null;
  if (!profile) return { view: "login", pendingRoomCode, errorMessage: "" };
  if (online?.phase === "playing" && online?.roomCode && online?.side) {
    return { view: "game", pendingRoomCode: online.roomCode, errorMessage: "" };
  }
  if (params.get("view") === "login") return { view: "login", pendingRoomCode, errorMessage: "" };
  return { view: "room", pendingRoomCode, errorMessage: "" };
}

export function viewUrl(pathname, view) {
  const params = new URLSearchParams();
  params.set("view", view);
  return `${pathname}?${params.toString()}`;
}

export function roomUrl(pathname, roomCode) {
  const params = new URLSearchParams();
  params.set("view", "room");
  params.set("room", roomCode.toUpperCase());
  return `${pathname}?${params.toString()}`;
}

export function gameUrl(pathname, roomCode) {
  const params = new URLSearchParams();
  params.set("view", "game");
  params.set("room", roomCode.toUpperCase());
  return `${pathname}?${params.toString()}`;
}
```

- [ ] **Step 5: Run test to verify GREEN**

Run: `node --test tests/online-profile.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/online/profile.js src/online/app-flow.js tests/online-profile.test.js
git commit -m "feat: add online profile flow state"
```

## Task 2: Room Profile Propagation

**Files:**
- Modify: `src/online/room.js`
- Modify: `src/online/ws-server.js`
- Modify: `src/online/client.js`
- Test: `tests/online-room.test.js`
- Test: `tests/online-ws-server.test.js`

- [ ] **Step 1: Write failing room core test**

Add to `tests/online-room.test.js`:

```js
test("online room serializes lightweight player profiles", () => {
  const room = createOnlineRoom({ code: "PROF" });
  joinOnlineRoom(room, { clientId: "plant-device", requestedSide: "plant", profile: { playerName: "Plant One", avatarId: "sunflower" } });
  joinOnlineRoom(room, { clientId: "zombie-device", requestedSide: "zombie", profile: { playerName: "Zombie Two", avatarId: "cone" } });
  const snapshot = serializeOnlineRoom(room, "plant-device");
  assert.deepEqual(snapshot.room.players.plant.profile, { playerName: "Plant One", avatarId: "sunflower" });
  assert.deepEqual(snapshot.room.players.zombie.profile, { playerName: "Zombie Two", avatarId: "cone" });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/online-room.test.js`

Expected: FAIL because serialized players do not include `profile`.

- [ ] **Step 3: Store and serialize profile in room core**

Modify `joinOnlineRoom()` in `src/online/room.js` to accept `profile = null`. For existing clients, update `existing.profile = sanitizeProfile(profile)` when profile is provided. For new clients, store `profile: sanitizeProfile(profile)`.

Add helper:

```js
function sanitizeProfile(profile) {
  if (!profile) return { playerName: "玩家", avatarId: "sunflower" };
  return {
    playerName: String(profile.playerName ?? "玩家").trim().slice(0, 18) || "玩家",
    avatarId: String(profile.avatarId ?? "sunflower").slice(0, 24),
  };
}
```

Update `serializePlayer()` so empty seats return `profile: null`, and occupied seats return `profile: player.profile ?? { playerName: "玩家", avatarId: "sunflower" }`.

- [ ] **Step 4: Run room test to verify GREEN**

Run: `node --test tests/online-room.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing WebSocket profile test**

Add to `tests/online-ws-server.test.js`:

```js
test("websocket room snapshots include player profiles", async (t) => {
  const server = createOnlineHttpServer({ rootDir: process.cwd(), tickMs: 0 });
  await listen(server);
  t.after(() => closeOnlineServer(server));
  const baseUrl = `ws://127.0.0.1:${server.address().port}/ws`;
  const plant = await connectClient(baseUrl);
  const zombie = await connectClient(baseUrl);
  t.after(() => plant.close());
  t.after(() => zombie.close());
  await exchange(plant, { type: "hello", clientId: "plant-device" }, "welcome");
  plant.send(JSON.stringify({ type: "createRoom", side: "plant", profile: { playerName: "Plant One", avatarId: "sunflower" } }));
  const created = await waitForMessage(plant, "roomSnapshot");
  await exchange(zombie, { type: "hello", clientId: "zombie-device" }, "welcome");
  zombie.send(JSON.stringify({ type: "joinRoom", roomCode: created.room.roomCode, side: "zombie", profile: { playerName: "Zombie Two", avatarId: "cone" } }));
  const joined = await waitForMessage(zombie, "roomSnapshot");
  assert.deepEqual(joined.room.players.plant.profile, { playerName: "Plant One", avatarId: "sunflower" });
  assert.deepEqual(joined.room.players.zombie.profile, { playerName: "Zombie Two", avatarId: "cone" });
});
```

- [ ] **Step 6: Pass profile through WebSocket and client**

Modify `src/online/ws-server.js` so both `createRoom` and `joinRoom` pass `profile: message.profile` into `joinOnlineRoom()`.

Modify `src/online/client.js` so `hostRoom(side, profile)` sends `{ type: "createRoom", side, profile }`, and `joinRoom(roomCode, side, profile)` sends `{ type: "joinRoom", roomCode, side, profile, clientId }`.

- [ ] **Step 7: Run online tests**

Run: `node --test tests/online-room.test.js tests/online-ws-server.test.js tests/online-client.test.js`

Expected: PASS. If sandbox blocks local listen, rerun with elevated permissions.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/online/room.js src/online/ws-server.js src/online/client.js tests/online-room.test.js tests/online-ws-server.test.js
git commit -m "feat: sync online player profiles"
```

## Task 3: App Shell Markup And Styles

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Test: `tests/online-client.test.js`

- [ ] **Step 1: Write failing DOM shell test**

In `tests/online-client.test.js`, import `fs`, load `index.html`, then assert these ids exist: `login-view`, `player-name`, `avatar-sunflower`, `login-continue`, `room-view`, `room-name`, `room-code-entry`, `room-create`, `room-join`, `room-copy-link`, `room-ready`, `game-view`, `online-panel`, `game`.

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/online-client.test.js`

Expected: FAIL because the new view ids are missing.

- [ ] **Step 3: Replace body with three view sections**

Modify `index.html` so `<main id="app-shell" class="app-shell" data-view="login">` contains `#login-view`, `#room-view`, and `#game-view`. Move the existing `#online-panel`, `#game`, and `#screen-reader-state` inside `#game-view`. Keep old create/join controls hidden in game view to preserve `createOnlineClient()` bindings during transition.

- [ ] **Step 4: Add responsive styles**

Add `.app-shell`, `.app-view`, `.login-view`, `.room-view`, `.login-panel`, `.room-card`, `.seat-grid`, and `.seat-card` styles. Use `generated-assets/ui/login-hero.png` and `generated-assets/ui/room-panel-hero.png` as background images. Keep existing `.game-shell`, `.online-panel`, and `canvas` rules compatible with game view.

- [ ] **Step 5: Run test to verify GREEN**

Run: `node --test tests/online-client.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add index.html src/styles.css tests/online-client.test.js
git commit -m "feat: add login room game shell"
```

## Task 4: Browser Flow Controller

**Files:**
- Modify: `src/main.js`
- Modify: `src/online/client.js`
- Modify: `src/online/app-flow.js`
- Test: `tests/online-client.test.js`
- Test: `tests/online-profile.test.js`

- [ ] **Step 1: Write failing online state test**

Add to `tests/online-client.test.js` a test that creates `createOnlineClient({ root: null })`, expects `client.getOnline()` to start as `null`, calls `hydrateSnapshot()` with an online room, then expects `client.getOnline().roomCode === "ROOM"`.

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/online-client.test.js tests/online-profile.test.js`

Expected: FAIL because `getOnline()` is not returned by `createOnlineClient()`.

- [ ] **Step 3: Expose online state and callback**

Modify `createOnlineClient()` options to include `onOnlineChange = () => {}`. Add `getOnline: () => online` to the returned object. Invoke `onOnlineChange(online)` after `hydrateSnapshot()`, `roomSnapshot`, and `gameSnapshot` update the panel.

- [ ] **Step 4: Wire app flow in `src/main.js`**

Import `gameUrl`, `nextViewState`, `roomUrl`, `viewUrl`, `loadPlayerProfile`, and `savePlayerProfile`. Bind `#login-form`, `#player-name`, `#room-code-entry`, `#room-create`, `#room-join`, `#room-ready`, `#room-copy-link`, and `#room-message`. Login saves profile then navigates to room view. Create calls `onlineClient.hostRoom("plant", playerProfile)`. Join calls `onlineClient.joinRoom(roomCode, "zombie", playerProfile)`. Ready toggles `onlineClient.setReady()`. `renderAppFlow()` hides non-current views, renders seats, and switches to `gameUrl()` when `online.phase === "playing"`.

- [ ] **Step 5: Run flow tests**

Run: `node --test tests/online-client.test.js tests/online-profile.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/main.js src/online/client.js src/online/app-flow.js tests/online-client.test.js tests/online-profile.test.js
git commit -m "feat: wire login room game flow"
```

## Task 5: Generated Page Art Assets

**Files:**
- Create: `generated-assets/ui/login-hero.png`
- Create: `generated-assets/ui/room-panel-hero.png`
- Modify: `tests/assets.test.js`

- [ ] **Step 1: Write failing asset test**

Add to `tests/assets.test.js`:

```js
test("login and room flow generated images are present", () => {
  assert.equal(fs.existsSync("generated-assets/ui/login-hero.png"), true);
  assert.equal(fs.existsSync("generated-assets/ui/room-panel-hero.png"), true);
});
```

If needed, import `fs` with `import fs from "node:fs";`.

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/assets.test.js`

Expected: FAIL because both PNG files are missing.

- [ ] **Step 3: Generate images with Codex**

Generate and save:

- `generated-assets/ui/login-hero.png`
  - Prompt: `Original 2D game background for a Plants-vs-Zombies-inspired browser game login page, cozy garden gate at dusk, friendly sunflower and pea-shooter silhouettes on the left, playful zombie silhouettes on the right, clear center space for HTML login controls, painterly cartoon style, warm greens and golds, no text, no logo, 16:9.`
- `generated-assets/ui/room-panel-hero.png`
  - Prompt: `Original 2D game lobby background for a LAN online battle room, garden table with invitation card, split plant side and zombie side seating hints, top-down lawn map details, readable empty center area for HTML room controls, cartoon strategy game style, green and amber palette, no text, no logo, 16:9.`

- [ ] **Step 4: Run asset test to verify GREEN**

Run: `node --test tests/assets.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add generated-assets/ui/login-hero.png generated-assets/ui/room-panel-hero.png tests/assets.test.js
git commit -m "feat: add login room flow art"
```

## Task 6: Browser Verification For Full Flow

**Files:**
- Modify: `scripts/verify-online-browser.js`

- [ ] **Step 1: Update browser verifier to use real UI**

Replace direct `window.__onlineClient.hostRoom()` setup with UI operations: plant page opens app, fills `#player-name`, clicks `#login-continue`, fills `#room-name`, clicks `#room-create`, reads `window.__gameState.online.roomCode`; zombie page opens invite URL, fills `#player-name`, clicks `#login-continue`, clicks `#room-join`, waits for side `zombie`; both click `#room-ready`, then both wait for `#game-view:not([hidden])`. Keep existing command dispatch and entity sync checks after both pages enter game view.

- [ ] **Step 2: Add mobile smoke check**

Add a 390px wide page that logs in, enters room view, and fails if body text contains `undefined`.

- [ ] **Step 3: Run browser verification**

Run: `npm run verify:online-browser -- http://127.0.0.1:5191`

Expected: PASS with `consoleErrors: []`, plant side `plant`, zombie side `zombie`, both pages `phase: "playing"`, and no `undefined`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/verify-online-browser.js
git commit -m "test: verify login room game browser flow"
```

## Task 7: Final Regression And Service Refresh

**Files:**
- No source file changes expected.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS with all tests passing.

- [ ] **Step 2: Run browser online verification**

Run: `npm run verify:online-browser -- http://127.0.0.1:5191`

Expected: PASS with `consoleErrors: []`.

- [ ] **Step 3: Restart local LaunchAgent service**

Run: `launchctl kickstart -k gui/501/com.codex.pvz-online-5191`

Expected: exit 0.

- [ ] **Step 4: Verify local and LAN URLs**

Run:

```bash
curl -I --max-time 3 http://127.0.0.1:5191/
curl -I --max-time 3 http://192.168.2.15:5191/
```

Expected: both return `HTTP/1.1 200 OK`.

- [ ] **Step 5: Open in-app browser**

Open `http://127.0.0.1:5191/`.

Expected: page title is `花园攻防在线双人版`; first screen is the login page.

## Self-Review

- Spec coverage: 轻量昵称登录由 Task 1/3/4/6 覆盖；核心房间设置页由 Task 3/4/6 覆盖；一方植物一方僵尸由 Task 2/6 和既有剩余阵营测试覆盖；双方准备后进入游戏页由 Task 4/6 覆盖；profile 同步由 Task 2 覆盖；Codex 生成配套图片由 Task 5 覆盖；手机和桌面无 `undefined` 由 Task 6 覆盖。
- Placeholder scan: 没有未定占位、空泛的“补充处理”步骤；每个实现任务都包含具体测试、代码方向、命令和期望结果。
- Type consistency: `playerName`、`avatarId`、`lastUpdatedAt`、`profile`、`view`、`pendingRoomCode` 在所有任务中保持一致。
