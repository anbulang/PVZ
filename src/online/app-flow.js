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
