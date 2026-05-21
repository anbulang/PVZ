import { PLANTS, ZOMBIES } from "../game/config.js";

const PLANT_COMMANDS = new Set(["placePlant", "shovel", "collectSun", "collectAllSun"]);
const ZOMBIE_COMMANDS = new Set(["deployZombie"]);
const NEUTRAL_COMMANDS = new Set(["restart", "togglePause"]);

export function createOnlineClient({
  state,
  localDispatch,
  root = typeof document !== "undefined" ? document : null,
  requestJson = defaultRequestJson,
  pollMs = 160,
} = {}) {
  let online = null;
  let localSelection = null;
  let polling = false;
  let pollTimer = null;
  const panel = bindOnlinePanel(root);

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

  autoJoinFromUrl().catch((error) => showError(error));
  updatePanel();

  return {
    dispatchCommand,
    getSelection: () => (online ? localSelection : state.selection),
    hostRoom,
    hydrateSnapshot,
    isOnline: () => Boolean(online?.clientId),
    joinRoom,
  };

  function dispatchCommand(command) {
    if (!online?.clientId) {
      localDispatch(command);
      return;
    }
    if (command.type === "select" || command.type === "clearSelection") {
      const result = applyLocalSelectionCommand(state, online.side, localSelection, command);
      localSelection = result.selection;
      updatePanel();
      return;
    }
    if (!canSendOnlineCommand(online.side, command)) {
      setStatus(`当前设备控制${sideLabel(online.side)}。`);
      return;
    }
    requestJson(`/api/rooms/${encodeURIComponent(online.roomCode)}/commands`, {
      method: "POST",
      body: { clientId: online.clientId, command },
    })
      .then((snapshot) => hydrateSnapshot(snapshot))
      .catch((error) => showError(error));
  }

  async function hostRoom(side = "plant") {
    const snapshot = await requestJson("/api/rooms", { method: "POST", body: { side } });
    hydrateSnapshot(snapshot, { clearSelection: true });
    syncUrl();
    startPolling();
    return snapshot;
  }

  async function joinRoom(roomCode, side = "zombie") {
    const snapshot = await requestJson(`/api/rooms/${encodeURIComponent(roomCode.toUpperCase())}/join`, {
      method: "POST",
      body: { side },
    });
    hydrateSnapshot(snapshot, { clearSelection: true });
    syncUrl();
    startPolling();
    return snapshot;
  }

  function hydrateSnapshot(snapshot, options = {}) {
    online = snapshot.online;
    if (options.clearSelection) localSelection = null;
    applyOnlineSnapshot(state, snapshot, localSelection);
    updatePanel();
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!online?.clientId || polling) return;
      polling = true;
      requestJson(`/api/rooms/${encodeURIComponent(online.roomCode)}/snapshot?clientId=${encodeURIComponent(online.clientId)}`, { method: "GET" })
        .then((snapshot) => hydrateSnapshot(snapshot))
        .catch((error) => showError(error))
        .finally(() => {
          polling = false;
        });
    }, pollMs);
  }

  async function autoJoinFromUrl() {
    if (typeof location === "undefined") return;
    const params = new URLSearchParams(location.search);
    const roomCode = params.get("room");
    const side = params.get("side") ?? "plant";
    if (roomCode) {
      if (panel?.roomInput) panel.roomInput.value = roomCode.toUpperCase();
      if (panel?.sideInput) panel.sideInput.value = side;
      await joinRoom(roomCode, side);
    } else if (params.get("online") === "1") {
      await hostRoom(side);
    }
  }

  function syncUrl() {
    if (!online?.roomCode || typeof history === "undefined" || typeof location === "undefined") return;
    const params = new URLSearchParams(location.search);
    params.set("room", online.roomCode);
    params.set("side", online.side);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  function updatePanel() {
    if (!panel) return;
    if (online?.clientId) {
      panel.status.textContent = `在线 ${sideLabel(online.side)}`;
      panel.roomBadge.textContent = `房间 ${online.roomCode} · ${online.peerCount}/2`;
      if (panel.roomInput) panel.roomInput.value = online.roomCode;
      if (panel.sideInput) panel.sideInput.value = online.side;
    } else {
      panel.status.textContent = "本地双人";
      panel.roomBadge.textContent = "";
    }
  }

  function setStatus(message) {
    state.status = message;
    updatePanel();
  }

  function showError(error) {
    setStatus(`联机失败：${error.message}`);
  }
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

async function defaultRequestJson(url, options = {}) {
  const init = {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? response.statusText);
  return payload;
}

function bindOnlinePanel(root) {
  if (!root) return null;
  const panel = root.querySelector("#online-panel");
  if (!panel) return null;
  return {
    hostButton: panel.querySelector("#online-host"),
    joinButton: panel.querySelector("#online-join"),
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
