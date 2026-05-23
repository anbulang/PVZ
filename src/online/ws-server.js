import { WebSocketServer } from "ws";
import {
  createOnlineRoom,
  joinOnlineRoom,
  markOnlineClientDisconnected,
  requestOnlinePlayAgain,
  serializeGameSnapshot,
  serializeRoomSnapshot,
  setOnlineReady,
  submitOnlineCommand,
  tickOnlineRoom,
} from "./room.js";

export function attachOnlineWebSocketServer(server, { rooms = new Map(), tickMs = 1000 / 30 } = {}) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const sockets = new Map();

  wss.on("connection", (socket) => {
    sockets.set(socket, { clientId: null, roomCode: null });

    socket.on("message", (data) => {
      handleMessage({ socket, data, rooms, sockets });
    });

    socket.on("close", () => {
      const meta = sockets.get(socket);
      sockets.delete(socket);
      if (!meta?.clientId || !meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      markOnlineClientDisconnected(room, meta.clientId);
      broadcastRoomSnapshot({ room, sockets });
    });
  });

  const interval = tickMs > 0
    ? setInterval(() => {
      for (const room of rooms.values()) {
        const beforePhase = room.phase;
        tickOnlineRoom(room, tickMs / 1000);
        if (room.phase !== beforePhase) broadcastRoomSnapshot({ room, sockets });
        broadcastGameSnapshot({ room, sockets });
      }
    }, tickMs)
    : null;

  server.on("close", () => {
    if (interval) clearInterval(interval);
    for (const socket of wss.clients) socket.terminate();
    wss.close();
  });

  return { wss, rooms, sockets };
}

function handleMessage({ socket, data, rooms, sockets }) {
  const meta = sockets.get(socket);
  const message = parseMessage(data);
  if (!message) return send(socket, { type: "error", code: "invalid_json", message: "invalid JSON message" });

  if (message.type === "hello") {
    meta.clientId = message.clientId || randomClientId();
    return send(socket, { type: "welcome", clientId: meta.clientId });
  }

  if (!meta.clientId) {
    meta.clientId = randomClientId();
    send(socket, { type: "welcome", clientId: meta.clientId });
  }

  if (message.type === "createRoom") {
    const room = createUniqueRoom(rooms);
    const joined = joinOnlineRoom(room, { clientId: meta.clientId, requestedSide: message.side, profile: message.profile });
    if (!joined.ok) return send(socket, { type: "error", code: "join_failed", message: joined.reason });
    rooms.set(room.code, room);
    meta.roomCode = room.code;
    broadcastRoomSnapshot({ room, sockets });
    return;
  }

  if (message.type === "joinRoom") {
    const room = rooms.get(String(message.roomCode ?? "").toUpperCase());
    if (!room) return send(socket, { type: "error", code: "room_not_found", message: "room not found" });
    const joined = joinOnlineRoom(room, { clientId: message.clientId ?? meta.clientId, requestedSide: message.side, profile: message.profile });
    if (!joined.ok) return send(socket, { type: "error", code: "join_failed", message: joined.reason });
    meta.clientId = joined.clientId;
    meta.roomCode = room.code;
    broadcastRoomSnapshot({ room, sockets });
    return;
  }

  const room = meta.roomCode ? rooms.get(meta.roomCode) : null;
  if (!room) return send(socket, { type: "error", code: "not_in_room", message: "client is not in a room" });

  if (message.type === "setReady") {
    const ready = setOnlineReady(room, meta.clientId, Boolean(message.ready));
    if (!ready.ok) return send(socket, { type: "error", code: "ready_failed", message: ready.reason });
    broadcastRoomSnapshot({ room, sockets });
    return;
  }

  if (message.type === "command") {
    const result = submitOnlineCommand(room, meta.clientId, message.command);
    send(socket, { type: "commandAck", sequence: message.sequence ?? null, accepted: result.ok, code: result.code ?? null });
    if (!result.ok) return;
    tickOnlineRoom(room, 0);
    broadcastGameSnapshot({ room, sockets });
    return;
  }

  if (message.type === "playAgainReady") {
    const ready = requestOnlinePlayAgain(room, meta.clientId, Boolean(message.ready));
    if (!ready.ok) return send(socket, { type: "error", code: "play_again_failed", message: ready.reason });
    broadcastRoomSnapshot({ room, sockets });
    broadcastGameSnapshot({ room, sockets });
    return;
  }

  if (message.type === "ping") {
    return send(socket, { type: "pong" });
  }

  send(socket, { type: "error", code: "unknown_type", message: `unknown message type: ${message.type ?? "missing"}` });
}

function broadcastRoomSnapshot({ room, sockets }) {
  for (const [socket, meta] of sockets) {
    if (meta.roomCode !== room.code) continue;
    send(socket, { type: "roomSnapshot", clientId: meta.clientId, room: serializeRoomSnapshot(room, meta.clientId) });
  }
}

function broadcastGameSnapshot({ room, sockets }) {
  const snapshot = serializeGameSnapshot(room);
  for (const [socket, meta] of sockets) {
    if (meta.roomCode !== room.code) continue;
    send(socket, { type: "gameSnapshot", ...snapshot });
  }
}

function parseMessage(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function send(socket, payload) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function createUniqueRoom(rooms) {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const room = createOnlineRoom();
    if (!rooms.has(room.code)) return room;
  }
  throw new Error("failed to allocate room code");
}

function randomClientId() {
  return `client-${Math.random().toString(36).slice(2, 10)}`;
}
