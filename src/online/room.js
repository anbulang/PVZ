import { enqueueCommand } from "../game/commands.js";
import { createGameState, resetGameState, serializeGameState } from "../game/state.js";
import { updateGame } from "../game/systems.js";

const SIDES = ["plant", "zombie"];
const PLANT_COMMANDS = new Set(["placePlant", "shovel", "collectSun", "collectAllSun"]);
const ZOMBIE_COMMANDS = new Set(["deployZombie"]);
const NEUTRAL_COMMANDS = new Set(["restart", "togglePause"]);

export const ROOM_PHASES = {
  lobby: "lobby",
  ready: "ready",
  playing: "playing",
  pausedForReconnect: "pausedForReconnect",
  finished: "finished",
};

export const RECONNECT_TIMEOUT_MS = 60_000;

export function createOnlineRoom(options = {}) {
  const now = options.now ?? Date.now();
  return {
    code: options.code ?? randomRoomCode(),
    state: createGameState(),
    clients: new Map(),
    phase: ROOM_PHASES.lobby,
    createdAt: now,
    updatedAt: now,
    commandSequence: 0,
  };
}

export function joinOnlineRoom(room, { clientId = randomClientId(), requestedSide = null, now = Date.now() } = {}) {
  const existing = room.clients.get(clientId);
  if (existing) {
    existing.online = true;
    existing.lastSeenAt = now;
    existing.disconnectedAt = null;
    room.updatedAt = now;
    updateRoomPhase(room, now);
    return { ok: true, clientId, side: existing.side };
  }

  const side = resolveSide(room, requestedSide);
  if (!side) {
    const reason = requestedSide && SIDES.includes(requestedSide) ? `${requestedSide} already taken` : "room already has two players";
    return { ok: false, reason };
  }

  room.clients.set(clientId, {
    clientId,
    side,
    online: true,
    ready: false,
    playAgainReady: false,
    joinedAt: now,
    lastSeenAt: now,
    disconnectedAt: null,
  });
  room.updatedAt = now;
  updateRoomPhase(room, now);
  return { ok: true, clientId, side };
}

export function submitOnlineCommand(room, clientId, command) {
  const client = room.clients.get(clientId);
  if (!client) return { ok: false, reason: "unknown client" };
  if (room.phase !== ROOM_PHASES.playing) {
    return { ok: false, code: "room_not_playing", reason: "room is not playing" };
  }

  client.lastSeenAt = Date.now();
  const side = sideForCommand(command);
  if (!side) return { ok: false, reason: `${command?.type ?? "unknown"} is local-only or unsupported` };
  if (side !== "neutral" && side !== client.side) {
    return { ok: false, reason: `${client.side} client cannot ${command.type}` };
  }

  enqueueCommand(room.state, { ...command, onlineClientId: clientId, onlineSide: client.side, sequence: ++room.commandSequence });
  room.updatedAt = Date.now();
  return { ok: true, sequence: room.commandSequence };
}

export function tickOnlineRoom(room, dt, options = {}) {
  expireOnlineReconnects(room, options);
  if (room.phase !== ROOM_PHASES.playing) return { ok: true, skipped: true };
  updateGame(room.state, dt);
  room.state.audioEvents = [];
  room.updatedAt = options.now ?? Date.now();
  if (room.state.winner) room.phase = ROOM_PHASES.finished;
  return { ok: true };
}

export function setOnlineReady(room, clientId, ready, options = {}) {
  const client = room.clients.get(clientId);
  if (!client) return { ok: false, reason: "unknown client" };
  if (![ROOM_PHASES.lobby, ROOM_PHASES.ready].includes(room.phase)) {
    return { ok: false, reason: "room cannot change ready state now" };
  }
  client.ready = Boolean(ready);
  client.lastSeenAt = options.now ?? Date.now();
  room.updatedAt = client.lastSeenAt;
  updateRoomPhase(room, client.lastSeenAt);
  return { ok: true };
}

export function markOnlineClientDisconnected(room, clientId, options = {}) {
  const client = room.clients.get(clientId);
  if (!client) return { ok: false, reason: "unknown client" };
  const now = options.now ?? Date.now();
  client.online = false;
  client.disconnectedAt = now;
  client.lastSeenAt = now;
  room.updatedAt = now;
  if (room.phase === ROOM_PHASES.playing) room.phase = ROOM_PHASES.pausedForReconnect;
  updateRoomPhase(room, now);
  return { ok: true };
}

export function expireOnlineReconnects(room, options = {}) {
  const now = options.now ?? Date.now();
  if (room.phase !== ROOM_PHASES.pausedForReconnect) return { ok: true, expired: false };
  const expiredClient = Array.from(room.clients.values()).find((client) => !client.online && client.disconnectedAt !== null && now - client.disconnectedAt > RECONNECT_TIMEOUT_MS);
  if (!expiredClient) return { ok: true, expired: false };

  const winner = expiredClient.side === "plant" ? "zombie" : "plant";
  room.phase = ROOM_PHASES.finished;
  room.state.winner = winner;
  room.state.mode = "gameOver";
  room.state.status = `${sideLabel(expiredClient.side)}掉线超时，${sideLabel(winner)}获胜。`;
  room.updatedAt = now;
  return { ok: true, expired: true, winner };
}

export function requestOnlinePlayAgain(room, clientId, ready, options = {}) {
  const client = room.clients.get(clientId);
  if (!client) return { ok: false, reason: "unknown client" };
  if (room.phase !== ROOM_PHASES.finished) return { ok: false, reason: "room is not finished" };
  const now = options.now ?? Date.now();
  client.playAgainReady = Boolean(ready);
  client.lastSeenAt = now;
  room.updatedAt = now;

  const players = assignedPlayers(room);
  if (players.length === 2 && players.every((player) => player.playAgainReady)) {
    resetGameState(room.state);
    for (const player of players) {
      player.ready = false;
      player.playAgainReady = false;
      player.online = true;
      player.disconnectedAt = null;
      player.lastSeenAt = now;
    }
    room.phase = ROOM_PHASES.ready;
  }

  return { ok: true };
}

export function serializeOnlineRoom(room, clientId = null, options = {}) {
  const client = clientId ? room.clients.get(clientId) : null;
  return {
    room: serializeRoomSnapshot(room, clientId, options),
    online: {
      roomCode: room.code,
      clientId,
      side: client?.side ?? null,
      peerCount: room.clients.size,
      sides: sideAssignments(room),
      commandSequence: room.commandSequence,
      phase: room.phase,
    },
    state: clonePlain(room.state),
    summary: JSON.parse(serializeGameState(room.state)),
  };
}

export function serializeRoomSnapshot(room, clientId = null, options = {}) {
  const client = clientId ? room.clients.get(clientId) : null;
  return {
    roomCode: room.code,
    phase: room.phase,
    side: client?.side ?? null,
    peerCount: room.clients.size,
    commandSequence: room.commandSequence,
    reconnectTimeoutMs: RECONNECT_TIMEOUT_MS,
    reconnectRemainingMs: reconnectRemainingMs(room, options.now ?? Date.now()),
    players: Object.fromEntries(SIDES.map((side) => [side, serializePlayer(room, side)])),
  };
}

export function serializeGameSnapshot(room) {
  return {
    state: clonePlain(room.state),
    summary: JSON.parse(serializeGameState(room.state)),
  };
}

function resolveSide(room, requestedSide) {
  if (requestedSide && !SIDES.includes(requestedSide)) return null;
  if (requestedSide && !isSideTaken(room, requestedSide)) return requestedSide;
  return SIDES.find((side) => !isSideTaken(room, side)) ?? null;
}

function isSideTaken(room, side) {
  return Array.from(room.clients.values()).some((client) => client.side === side);
}

function sideAssignments(room) {
  const assignments = {};
  for (const side of SIDES) {
    assignments[side] = Array.from(room.clients.values()).find((client) => client.side === side)?.clientId ?? null;
  }
  return assignments;
}

function serializePlayer(room, side) {
  const player = Array.from(room.clients.values()).find((client) => client.side === side);
  if (!player) {
    return { clientId: null, online: false, ready: false, playAgainReady: false, disconnectedAt: null };
  }
  return {
    clientId: player.clientId,
    online: Boolean(player.online),
    ready: Boolean(player.ready),
    playAgainReady: Boolean(player.playAgainReady),
    disconnectedAt: player.disconnectedAt ?? null,
  };
}

function assignedPlayers(room) {
  return SIDES.map((side) => Array.from(room.clients.values()).find((client) => client.side === side)).filter(Boolean);
}

function updateRoomPhase(room, now = Date.now()) {
  if (room.phase === ROOM_PHASES.finished) return;
  const players = assignedPlayers(room);
  const hasBothSides = players.length === 2;
  const hasOfflinePlayer = players.some((player) => !player.online);

  if (hasOfflinePlayer && [ROOM_PHASES.playing, ROOM_PHASES.pausedForReconnect].includes(room.phase)) {
    room.phase = ROOM_PHASES.pausedForReconnect;
    room.updatedAt = now;
    return;
  }

  if (!hasBothSides) {
    room.phase = ROOM_PHASES.lobby;
    room.updatedAt = now;
    return;
  }

  if (room.phase === ROOM_PHASES.pausedForReconnect && !hasOfflinePlayer) {
    room.phase = ROOM_PHASES.playing;
    room.updatedAt = now;
    return;
  }

  if (room.phase === ROOM_PHASES.playing) return;

  if (players.every((player) => player.ready)) {
    room.phase = ROOM_PHASES.playing;
    room.state.started = true;
  } else {
    room.phase = ROOM_PHASES.ready;
  }
  room.updatedAt = now;
}

function reconnectRemainingMs(room, now) {
  if (room.phase !== ROOM_PHASES.pausedForReconnect) return null;
  const disconnectedAt = Math.min(...Array.from(room.clients.values()).filter((client) => !client.online && client.disconnectedAt !== null).map((client) => client.disconnectedAt));
  if (!Number.isFinite(disconnectedAt)) return null;
  return Math.max(0, RECONNECT_TIMEOUT_MS - (now - disconnectedAt));
}

function sideForCommand(command) {
  if (!command?.type) return null;
  if (PLANT_COMMANDS.has(command.type)) return "plant";
  if (ZOMBIE_COMMANDS.has(command.type)) return "zombie";
  if (NEUTRAL_COMMANDS.has(command.type)) return "neutral";
  return null;
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function randomClientId() {
  return `client-${Math.random().toString(36).slice(2, 10)}`;
}

function sideLabel(side) {
  return side === "plant" ? "植物方" : "僵尸方";
}
