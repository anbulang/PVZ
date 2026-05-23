import { PLANTS, ZOMBIES } from "../game/config.js";

const PLANT_COMMANDS = new Set(["placePlant", "shovel", "collectSun", "collectAllSun"]);
const ZOMBIE_COMMANDS = new Set(["deployZombie"]);
const NEUTRAL_COMMANDS = new Set(["restart", "togglePause"]);
const IDENTITY_KEY = "pvz-online-identity";

export function createOnlineClient({
  state,
  localDispatch,
  root = typeof document !== "undefined" ? document : null,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  locationLike = typeof location !== "undefined" ? location : null,
  historyLike = typeof history !== "undefined" ? history : null,
  createSocket = (url) => new WebSocket(url),
  onOnlineChange = () => {},
  autoJoin = true,
} = {}) {
  let online = null;
  let localSelection = null;
  let socket = null;
  let connecting = null;
  let clientSequence = 0;
  const roomWaiters = [];
  const panel = bindOnlinePanel(root);
  const storedIdentity = storage ? loadOnlineIdentity(storage) : null;

  panel?.hostButton?.addEventListener("click", () => {
    hostRoom(panel.sideInput?.value ?? "plant").catch((error) => showError(error));
  });
  panel?.joinButton?.addEventListener("click", () => {
    const roomCode = panel.roomInput?.value?.trim();
    if (!roomCode) {
      setStatus("请输入房间码。");
      return;
    }
    joinRoom(roomCode, panel.sideInput?.value ?? "zombie").catch((error) => showError(error));
  });
  panel?.readyButton?.addEventListener("click", () => {
    const current = online?.players?.[online.side]?.ready ?? false;
    setReady(!current).catch((error) => showError(error));
  });
  panel?.playAgainButton?.addEventListener("click", () => {
    const current = online?.players?.[online.side]?.playAgainReady ?? false;
    setPlayAgainReady(!current).catch((error) => showError(error));
  });

  if (autoJoin) autoJoinFromUrl().catch((error) => showError(error));
  updatePanel();

  return {
    dispatchCommand,
    getOnline: () => online,
    getSelection: () => (online?.roomCode ? localSelection : state.selection),
    hostRoom,
    hydrateSnapshot,
    isOnline: () => Boolean(online?.roomCode),
    joinRoom,
    setPlayAgainReady,
    setReady,
  };

  function dispatchCommand(command) {
    if (!online?.roomCode) {
      localDispatch(command);
      return;
    }
    if (command.type === "select" || command.type === "clearSelection") {
      const result = applyLocalSelectionCommand(state, online.side, localSelection, command);
      localSelection = result.selection;
      updatePanel();
      return;
    }
    if (online.phase !== "playing") {
      setStatus("等待双方准备后开始。");
      return;
    }
    if (!canSendOnlineCommand(online.side, command)) {
      setStatus(`当前设备控制${sideLabel(online.side)}。`);
      return;
    }
    send({ type: "command", sequence: nextClientSequence(), command }).catch((error) => showError(error));
  }

  async function hostRoom(side = "plant", profile) {
    await ensureConnected();
    const snapshotPromise = waitForRoomSnapshot((room) => room.side === side);
    await send({ type: "createRoom", side, profile });
    const room = await snapshotPromise;
    syncUrl();
    return { room, online: room };
  }

  async function joinRoom(roomCode, side = "zombie", profile) {
    await ensureConnected();
    const normalizedRoom = roomCode.toUpperCase();
    const snapshotPromise = waitForRoomSnapshot((room) => roomMatchesJoinRequest(room, normalizedRoom));
    await send({ type: "joinRoom", roomCode: normalizedRoom, side, profile, clientId: online?.clientId });
    const room = await snapshotPromise;
    syncUrl();
    return { room, online: room };
  }

  async function setReady(ready) {
    await send({ type: "setReady", ready });
  }

  async function setPlayAgainReady(ready) {
    await send({ type: "playAgainReady", ready });
  }

  function hydrateSnapshot(snapshot, options = {}) {
    online = snapshot.online;
    if (options.clearSelection) localSelection = null;
    applyOnlineSnapshot(state, snapshot, localSelection);
    updatePanel();
    onOnlineChange(online);
  }

  async function ensureConnected() {
    if (socket?.readyState === WebSocket.OPEN) return;
    if (connecting) return connecting;
    connecting = new Promise((resolve, reject) => {
      socket = createSocket(webSocketUrlForLocation(locationLike ?? globalThis.location));
      socket.addEventListener("open", () => {
        sendRaw({ type: "hello", clientId: storedIdentity?.clientId ?? online?.clientId ?? null });
      });
      socket.addEventListener("message", (event) => {
        handleSocketMessage(event.data);
      });
      socket.addEventListener("error", () => {
        reject(new Error("WebSocket 连接失败"));
      }, { once: true });
      socket.addEventListener("close", () => {
        if (online?.clientId) setStatus("联机连接已断开，正在等待重连。");
      });
      const welcomeWaiter = waitForRoomlessWelcome(resolve);
      socket.__welcomeWaiter = welcomeWaiter;
    }).finally(() => {
      connecting = null;
    });
    return connecting;
  }

  function handleSocketMessage(raw) {
    const message = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    if (message.type === "welcome") {
      online = { ...(online ?? {}), clientId: message.clientId };
      socket.__welcomeWaiter?.(message.clientId);
      return;
    }
    if (message.type === "roomSnapshot") {
      const room = { ...message.room, clientId: online?.clientId ?? null };
      online = room;
      applyRoomSnapshot(state, room, localSelection);
      if (storage && room.clientId && room.roomCode) saveOnlineIdentity(storage, { clientId: room.clientId, roomCode: room.roomCode, side: room.side });
      updatePanel();
      onOnlineChange(online);
      resolveRoomWaiters(room);
      return;
    }
    if (message.type === "gameSnapshot") {
      applyOnlineSnapshot(state, { state: message.state, online }, localSelection);
      updatePanel();
      onOnlineChange(online);
      return;
    }
    if (message.type === "error") {
      const error = new Error(serverErrorMessage(message));
      rejectRoomWaiters(error);
      setStatus(`联机失败：${error.message}`);
    }
  }

  function send(payload) {
    return ensureConnected().then(() => sendRaw(payload));
  }

  function sendRaw(payload) {
    socket.send(JSON.stringify(payload));
  }

  function waitForRoomSnapshot(predicate) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = roomWaiters.indexOf(waiter);
        if (index >= 0) roomWaiters.splice(index, 1);
        reject(new Error("等待房间快照超时"));
      }, 2500);
      const waiter = { predicate, resolve, reject, timeout };
      roomWaiters.push(waiter);
    });
  }

  function resolveRoomWaiters(room) {
    for (const waiter of [...roomWaiters]) {
      if (!waiter.predicate(room)) continue;
      clearTimeout(waiter.timeout);
      roomWaiters.splice(roomWaiters.indexOf(waiter), 1);
      waiter.resolve(room);
    }
  }

  function rejectRoomWaiters(error) {
    for (const waiter of [...roomWaiters]) {
      clearTimeout(waiter.timeout);
      roomWaiters.splice(roomWaiters.indexOf(waiter), 1);
      waiter.reject(error);
    }
  }

  function waitForRoomlessWelcome(resolve) {
    return () => resolve();
  }

  async function autoJoinFromUrl() {
    if (!locationLike) return;
    const params = new URLSearchParams(locationLike.search);
    const roomCode = params.get("room");
    const side = params.get("side") ?? storedIdentity?.side ?? "plant";
    if (roomCode) {
      if (panel?.roomInput) panel.roomInput.value = roomCode.toUpperCase();
      if (panel?.sideInput) panel.sideInput.value = side;
      await joinRoom(roomCode, side);
    } else if (params.get("online") === "1") {
      await hostRoom(side);
    }
  }

  function syncUrl() {
    if (!online?.roomCode || !historyLike || !locationLike) return;
    const params = new URLSearchParams(locationLike.search);
    params.set("room", online.roomCode);
    params.set("side", online.side);
    historyLike.replaceState(null, "", `${locationLike.pathname}?${params.toString()}`);
  }

  function updatePanel() {
    if (!panel) return;
    if (online?.clientId) {
      const view = onlinePanelViewModel(online);
      panel.panel.dataset.phase = view.phase;
      panel.status.textContent = view.statusText;
      panel.roomBadge.textContent = view.roomBadge;
      panel.detail.textContent = view.detail;
      panel.readyButton.hidden = !view.showReady;
      panel.readyButton.textContent = view.readyText;
      panel.playAgainButton.hidden = !view.showPlayAgain;
      panel.playAgainButton.textContent = view.playAgainText;
      if (view.hasRoom && panel.roomInput) panel.roomInput.value = online.roomCode;
      if (view.hasRoom && panel.sideInput) panel.sideInput.value = online.side;
      setLobbyControlsHidden(panel, view.hasRoom);
    } else {
      panel.panel.dataset.phase = "local";
      panel.status.textContent = "本地双人";
      panel.roomBadge.textContent = "";
      panel.detail.textContent = "";
      panel.readyButton.hidden = true;
      panel.playAgainButton.hidden = true;
      setLobbyControlsHidden(panel, false);
    }
  }

  function setStatus(message) {
    state.status = message;
    updatePanel();
  }

  function showError(error) {
    setStatus(`联机失败：${error.message}`);
  }

  function nextClientSequence() {
    clientSequence += 1;
    return clientSequence;
  }
}

function serverErrorMessage(message) {
  if (message.code === "room_not_found") return "房间不存在或已失效";
  return message.message ?? message.code ?? "未知错误";
}

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

export function applyOnlineSnapshot(state, snapshot, localSelection = null) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, clonePlain(snapshot.state));
  state.selection = localSelection;
  state.online = clonePlain(snapshot.online);
}

export function applyLocalSelectionCommand(state, assignedSide, currentSelection, command) {
  if (command.type === "clearSelection") {
    state.selection = null;
    state.status = "已取消选择。";
    return { accepted: true, selection: null };
  }
  if (command.type !== "select") return { accepted: false, selection: currentSelection };
  if (command.side !== assignedSide) {
    state.selection = currentSelection;
    state.status = `当前设备控制${sideLabel(assignedSide)}。`;
    return { accepted: false, selection: currentSelection };
  }

  const config = command.side === "plant" ? PLANTS[command.unitType] : ZOMBIES[command.unitType];
  if (!config && command.kind !== "shovel") {
    state.selection = null;
    state.status = "未知卡牌。";
    return { accepted: false, selection: null };
  }
  if (command.kind !== "shovel") {
    const resource = command.side === "plant" ? state.resources.plant.sun : state.resources.zombie.brain;
    const cooldown = state.cards[command.side]?.[command.unitType]?.cooldownRemaining ?? 0;
    if (resource < config.cost) {
      state.selection = null;
      state.status = command.side === "plant" ? "阳光不足，无法选择植物。" : "脑力不足，无法选择僵尸。";
      return { accepted: false, selection: null };
    }
    if (cooldown > 0) {
      state.selection = null;
      state.status = command.side === "plant" ? "植物卡牌冷却中。" : "僵尸卡牌冷却中。";
      return { accepted: false, selection: null };
    }
  }
  const selection = { side: command.side, kind: command.kind, type: command.unitType };
  state.selection = selection;
  state.status = command.kind === "shovel" ? "已选择铲子。" : `已选择 ${config?.name ?? command.unitType}。`;
  return { accepted: true, selection };
}

export function canSendOnlineCommand(side, command) {
  if (NEUTRAL_COMMANDS.has(command?.type)) return true;
  if (side === "plant") return PLANT_COMMANDS.has(command?.type);
  if (side === "zombie") return ZOMBIE_COMMANDS.has(command?.type);
  return false;
}

export function roomMatchesJoinRequest(room, roomCode) {
  return room?.roomCode === roomCode.toUpperCase() && (room.side === "plant" || room.side === "zombie");
}

export function onlinePanelViewModel(online) {
  const hasRoom = Boolean(online?.roomCode);
  const phase = hasRoom ? online?.phase ?? "lobby" : online?.clientId ? "connecting" : "local";
  const phaseLabel = {
    connecting: "连接中",
    local: "本地双人",
    lobby: "等待加入",
    ready: "等待准备",
    playing: "对局中",
    pausedForReconnect: "等待重连",
    finished: "本局结束",
  }[phase] ?? "在线";
  const currentPlayer = online?.players?.[online?.side] ?? {};
  const readySummary = `植物 ${readyLabel(online?.players?.plant?.ready)} · 僵尸 ${readyLabel(online?.players?.zombie?.ready)}`;
  const playAgainSummary = `再来一局：植物 ${confirmLabel(online?.players?.plant?.playAgainReady)} · 僵尸 ${confirmLabel(online?.players?.zombie?.playAgainReady)}`;
  const remainingSeconds = Math.ceil((online?.reconnectRemainingMs ?? 0) / 1000);
  const detail = {
    connecting: "请选择创建房间或加入房间。",
    lobby: "等待另一名玩家加入。",
    ready: readySummary,
    playing: online?.players?.[oppositeSide(online?.side)]?.online === false ? "对手离线。" : "双方在线。",
    pausedForReconnect: `等待重连 ${remainingSeconds}s。`,
    finished: playAgainSummary,
  }[phase] ?? "";
  const statusText = hasRoom ? `在线 ${sideLabel(online.side)} · ${phaseLabel}` : phaseLabel;
  const roomBadge = hasRoom ? `房间 ${online.roomCode} · ${online.peerCount}/2` : "";

  return {
    hasRoom,
    phase,
    phaseLabel,
    roomBadge,
    statusText,
    detail,
    showReady: phase === "ready",
    readyText: currentPlayer.ready ? "取消准备" : "准备",
    showPlayAgain: phase === "finished",
    playAgainText: currentPlayer.playAgainReady ? "取消再来" : "再来一局",
  };
}

function bindOnlinePanel(root) {
  if (!root) return null;
  const panel = root.querySelector("#online-panel");
  if (!panel) return null;
  return {
    panel,
    detail: panel.querySelector("#online-detail"),
    hostButton: panel.querySelector("#online-host"),
    joinButton: panel.querySelector("#online-join"),
    playAgainButton: panel.querySelector("#online-play-again"),
    readyButton: panel.querySelector("#online-ready"),
    roomBadge: panel.querySelector("#online-room-badge"),
    roomInput: panel.querySelector("#online-room-code"),
    sideInput: panel.querySelector("#online-side"),
    status: panel.querySelector("#online-status"),
  };
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function sideLabel(side) {
  return side === "zombie" ? "僵尸方" : "植物方";
}

function oppositeSide(side) {
  return side === "plant" ? "zombie" : "plant";
}

function readyLabel(ready) {
  return ready ? "已准备" : "未准备";
}

function confirmLabel(ready) {
  return ready ? "已确认" : "未确认";
}

function setLobbyControlsHidden(panel, hidden) {
  panel.hostButton.hidden = hidden;
  panel.joinButton.hidden = hidden;
  panel.roomInput.hidden = hidden;
  panel.sideInput.hidden = hidden;
}
