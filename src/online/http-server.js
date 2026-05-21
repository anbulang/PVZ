import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {
  createOnlineRoom,
  joinOnlineRoom,
  serializeOnlineRoom,
  setOnlineReady,
  submitOnlineCommand,
  tickOnlineRoom,
} from "./room.js";
import { attachOnlineWebSocketServer } from "./ws-server.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ogg": "audio/ogg",
};

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

async function handleRequest({ request, response, rooms, root }) {
  setCorsHeaders(response);
  if (request.method === "OPTIONS") return end(response, 204);

  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname.startsWith("/api/")) {
    return handleApi({ request, response, rooms, url });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, 405, { error: "method not allowed" });
  }
  return serveStatic({ response, root, pathname: url.pathname, headOnly: request.method === "HEAD" });
}

async function handleApi({ request, response, rooms, url }) {
  if (request.method === "POST" && url.pathname === "/api/rooms") {
    const body = await readJson(request);
    const room = createUniqueRoom(rooms);
    const joined = joinOnlineRoom(room, { requestedSide: body.side ?? body.requestedSide });
    if (!joined.ok) return sendJson(response, 409, { error: joined.reason });
    rooms.set(room.code, room);
    return sendJson(response, 201, serializeOnlineRoom(room, joined.clientId));
  }

  const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
  if (request.method === "POST" && joinMatch) {
    const room = rooms.get(joinMatch[1].toUpperCase());
    if (!room) return sendJson(response, 404, { error: "room not found" });
    const body = await readJson(request);
    const joined = joinOnlineRoom(room, { clientId: body.clientId, requestedSide: body.side ?? body.requestedSide });
    if (!joined.ok) return sendJson(response, 409, { error: joined.reason });
    return sendJson(response, 200, serializeOnlineRoom(room, joined.clientId));
  }

  const commandMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/commands$/);
  if (request.method === "POST" && commandMatch) {
    const room = rooms.get(commandMatch[1].toUpperCase());
    if (!room) return sendJson(response, 404, { error: "room not found" });
    const body = await readJson(request);
    const submitted = submitOnlineCommand(room, body.clientId, body.command);
    if (!submitted.ok) return sendJson(response, 403, { error: submitted.reason });
    tickOnlineRoom(room, 0);
    return sendJson(response, 200, serializeOnlineRoom(room, body.clientId));
  }

  const readyMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ready$/);
  if (request.method === "POST" && readyMatch) {
    const room = rooms.get(readyMatch[1].toUpperCase());
    if (!room) return sendJson(response, 404, { error: "room not found" });
    const body = await readJson(request);
    const ready = setOnlineReady(room, body.clientId, Boolean(body.ready));
    if (!ready.ok) return sendJson(response, 403, { error: ready.reason });
    return sendJson(response, 200, serializeOnlineRoom(room, body.clientId));
  }

  const snapshotMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/snapshot$/);
  if (request.method === "GET" && snapshotMatch) {
    const room = rooms.get(snapshotMatch[1].toUpperCase());
    if (!room) return sendJson(response, 404, { error: "room not found" });
    return sendJson(response, 200, serializeOnlineRoom(room, url.searchParams.get("clientId")));
  }

  return sendJson(response, 404, { error: "not found" });
}

async function serveStatic({ response, root, pathname, headOnly }) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return sendJson(response, 403, { error: "forbidden" });
  }

  try {
    const data = await fs.readFile(resolved);
    const contentType = MIME_TYPES[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
    if (!headOnly) response.write(data);
    response.end();
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") return sendJson(response, 404, { error: "not found" });
    throw error;
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createUniqueRoom(rooms) {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const room = createOnlineRoom();
    if (!rooms.has(room.code)) return room;
  }
  throw new Error("failed to allocate room code");
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

function setCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function end(response, status) {
  response.writeHead(status);
  response.end();
}
