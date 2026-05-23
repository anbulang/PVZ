import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AVATAR_ID, loadPlayerProfile, normalizePlayerProfile, savePlayerProfile } from "../src/online/profile.js";
import { gameUrl, inviteUrl, nextViewState, roomUrl, viewUrl } from "../src/online/app-flow.js";

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

test("invite URL prefers LAN addresses when opened from loopback", () => {
  const networkInfo = { preferredInviteBaseUrl: "http://192.168.2.15:5191" };

  assert.equal(
    inviteUrl("/", "rk4v", { href: "http://127.0.0.1:5191/?view=room&room=RK4V", hostname: "127.0.0.1" }, networkInfo),
    "http://192.168.2.15:5191/?view=room&room=RK4V",
  );
  assert.equal(
    inviteUrl("/", "rk4v", { href: "http://localhost:5191/?view=room&room=RK4V", hostname: "localhost" }, networkInfo),
    "http://192.168.2.15:5191/?view=room&room=RK4V",
  );
});

test("invite URL keeps current host when opened from a reachable address", () => {
  assert.equal(
    inviteUrl("/", "rk4v", { href: "http://192.168.2.15:5191/?view=room&room=RK4V", hostname: "192.168.2.15" }, { preferredInviteBaseUrl: "http://10.0.0.2:5191" }),
    "http://192.168.2.15:5191/?view=room&room=RK4V",
  );
});

test("login view keeps pending room codes for invite links", () => {
  const state = nextViewState({ locationLike: { search: "?view=game&room=ABCD" }, profile: null, online: null });
  assert.equal(state.view, "login");
  assert.equal(state.pendingRoomCode, "ABCD");
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
