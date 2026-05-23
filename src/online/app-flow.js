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

export function inviteUrl(pathname, roomCode, locationLike, networkInfo = null) {
  const route = roomUrl(pathname, roomCode);
  const currentBase = locationHref(locationLike, pathname);
  const lanBase = preferredLanBase(locationLike, networkInfo);
  return new URL(route, lanBase ?? currentBase).href;
}

function preferredLanBase(locationLike, networkInfo) {
  if (!isLoopbackHost(locationHostname(locationLike))) return null;
  return normalizeBaseUrl(networkInfo?.preferredInviteBaseUrl ?? networkInfo?.lanUrls?.[0] ?? null);
}

function locationHref(locationLike, pathname) {
  if (locationLike?.href) return locationLike.href;
  if (locationLike?.protocol && locationLike?.host) return `${locationLike.protocol}//${locationLike.host}${pathname ?? "/"}`;
  return `http://127.0.0.1${pathname ?? "/"}`;
}

function locationHostname(locationLike) {
  if (locationLike?.hostname) return String(locationLike.hostname).toLowerCase();
  try {
    return new URL(locationLike?.href ?? "http://127.0.0.1").hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLoopbackHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  const text = String(value);
  return text.endsWith("/") ? text : `${text}/`;
}
