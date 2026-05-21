import { enqueueCommand } from "../game/commands.js";
import { createGameState, serializeGameState } from "../game/state.js";
import { updateGame } from "../game/systems.js";

const SIDES = ["plant", "zombie"];
const PLANT_COMMANDS = new Set(["placePlant", "shovel", "collectSun", "collectAllSun"]);
const ZOMBIE_COMMANDS = new Set(["deployZombie"]);
const NEUTRAL_COMMANDS = new Set(["restart", "togglePause"]);

export function createOnlineRoom(options = {}) {
  const now = options.now ?? Date.now();
  return {
    code: options.code ?? randomRoomCode(),
    state: createGameState(),
    clients: new Map(),
    createdAt: now,
    updatedAt: now,
    commandSequence: 0,
  };
}

export function joinOnlineRoom(room, { clientId = randomClientId(), requestedSide = null } = {}) {
  const existing = room.clients.get(clientId);
  if (existing) return { ok: true, clientId, side: existing.side };

  const side = resolveSide(room, requestedSide);
  if (!side) {
    const reason = requestedSide && SIDES.includes(requestedSide) ? `${requestedSide} already taken` : "room already has two players";
    return { ok: false, reason };
  }

  room.clients.set(clientId, { clientId, side, joinedAt: Date.now(), lastSeenAt: Date.now() });
  room.updatedAt = Date.now();
  return { ok: true, clientId, side };
}

export function submitOnlineCommand(room, clientId, command) {
  const client = room.clients.get(clientId);
  if (!client) return { ok: false, reason: "unknown client" };

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

export function tickOnlineRoom(room, dt) {
  updateGame(room.state, dt);
  room.state.audioEvents = [];
  room.updatedAt = Date.now();
}

export function serializeOnlineRoom(room, clientId = null) {
  const client = clientId ? room.clients.get(clientId) : null;
  return {
    online: {
      roomCode: room.code,
      clientId,
      side: client?.side ?? null,
      peerCount: room.clients.size,
      sides: sideAssignments(room),
      commandSequence: room.commandSequence,
    },
    state: clonePlain(room.state),
    summary: JSON.parse(serializeGameState(room.state)),
  };
}

function resolveSide(room, requestedSide) {
  if (requestedSide && !SIDES.includes(requestedSide)) return null;
  if (requestedSide) return isSideTaken(room, requestedSide) ? null : requestedSide;
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
