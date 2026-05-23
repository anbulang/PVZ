import { enqueueCommand } from "./game/commands.js?v=20260519-tempo1";
import { getAudioDebugState, processAudioEvents, unlockAudio } from "./game/audio.js?v=20260519-tempo1";
import { attachInput } from "./game/input.js?v=20260521-online1";
import { renderGame } from "./game/render.js?v=20260519-tempo1";
import { createGameState, serializeGameState } from "./game/state.js?v=20260519-tempo1";
import { updateGame } from "./game/systems.js?v=20260519-tempo1";
import { copyText } from "./online/clipboard.js?v=20260523-controls1";
import { createOnlineClient, roomControlState } from "./online/client.js?v=20260523-controls1";
import { gameUrl, inviteUrl, nextViewState, roomUrl, viewUrl } from "./online/app-flow.js?v=20260523-invite1";
import { loadPlayerProfile, savePlayerProfile } from "./online/profile.js?v=20260522-flow1";

const appShell = document.querySelector("#app-shell");
const loginView = document.querySelector("#login-view");
const roomView = document.querySelector("#room-view");
const gameView = document.querySelector("#game-view");
const loginForm = document.querySelector("#login-form");
const loginContinue = document.querySelector("#login-continue");
const playerNameInput = document.querySelector("#player-name");
const roomCodeEntry = document.querySelector("#room-code-entry");
const roomCreateButton = document.querySelector("#room-create");
const roomJoinButton = document.querySelector("#room-join");
const roomReadyButton = document.querySelector("#room-ready");
const roomCopyLinkButton = document.querySelector("#room-copy-link");
const roomMessage = ensureRoomMessage();
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const srState = document.querySelector("#screen-reader-state");
const state = createGameState();
let playerProfile = loadPlayerProfile(localStorage);
const onlineClient = createOnlineClient({
  state,
  localDispatch: (command) => enqueueCommand(state, command),
  onOnlineChange: () => renderAppFlow(),
  autoJoin: false,
});
let accumulator = 0;
let lastTime = performance.now();
const fixedDt = 1 / 60;

hydrateProfileForm();
bindAppFlowControls();
renderAppFlow();

attachInput(canvas, state, (command) => onlineClient.dispatchCommand(command), {
  getSelection: () => onlineClient.getSelection(),
});
canvas.addEventListener("pointerdown", () => unlockAudio(state));
window.addEventListener("keydown", () => unlockAudio(state));

function frame(now) {
  const elapsed = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (onlineClient.isOnline()) {
    accumulator = 0;
  } else {
    accumulator += elapsed;
    while (accumulator >= fixedDt) {
      updateGame(state, fixedDt);
      processAudioEvents(state.audioEvents, state);
      accumulator -= fixedDt;
    }
  }
  renderGame(ctx, state);
  srState.textContent = state.status;
  requestAnimationFrame(frame);
}

window.__gameState = state;
window.__enqueueGameCommand = (command) => onlineClient.dispatchCommand(command);
window.advanceTime = (ms) => {
  if (onlineClient.isOnline()) return;
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) updateGame(state, fixedDt);
  processAudioEvents(state.audioEvents, state);
  renderGame(ctx, state);
};
window.render_game_to_text = () => serializeGameState(state);
window.__audioDebug = () => getAudioDebugState();
window.__onlineClient = onlineClient;
window.__onlineDebug = () => ({
  isOnline: onlineClient.isOnline(),
  selection: onlineClient.getSelection(),
  online: onlineClient.getOnline(),
});

renderGame(ctx, state);
requestAnimationFrame(frame);

function bindAppFlowControls() {
  loginForm?.addEventListener("submit", handleLogin);
  loginContinue?.addEventListener("click", handleLogin);
  roomCreateButton?.addEventListener("click", () => {
    const profile = ensurePlayerProfile();
    onlineClient.hostRoom("plant", profile).then(clearRoomMessage).catch((error) => showRoomMessage(`创建房间失败：${error.message}`));
  });
  roomJoinButton?.addEventListener("click", () => {
    const profile = ensurePlayerProfile();
    const roomCode = (roomCodeEntry?.value || nextViewState({ locationLike: location, profile: playerProfile, online: onlineClient.getOnline() }).pendingRoomCode || "").trim();
    if (!roomCode) {
      showRoomMessage("请输入房间码。");
      return;
    }
    onlineClient.joinRoom(roomCode, "zombie", profile).then(clearRoomMessage).catch((error) => showRoomMessage(`加入房间失败：${error.message}`));
  });
  roomReadyButton?.addEventListener("click", () => {
    const online = onlineClient.getOnline();
    const currentReady = online?.players?.[online.side]?.ready ?? false;
    onlineClient.setReady(!currentReady).then(clearRoomMessage).catch((error) => showRoomMessage(`准备失败：${error.message}`));
  });
  roomCopyLinkButton?.addEventListener("click", () => {
    const online = onlineClient.getOnline();
    if (!online?.roomCode) {
      showRoomMessage("创建或加入房间后再复制邀请链接。");
      return;
    }
    buildInviteUrl(online.roomCode).then(copyInviteUrl).catch(() => showRoomMessage("邀请链接生成失败，请刷新后重试。"));
  });
}

async function buildInviteUrl(roomCode) {
  return inviteUrl(location.pathname, roomCode, location, await fetchNetworkInfo());
}

async function fetchNetworkInfo() {
  try {
    const response = await fetch(new URL("/api/network", location.href), { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function copyInviteUrl(url) {
  copyText(url).then((result) => {
    showRoomMessage(result.ok ? "邀请链接已复制。" : "复制失败，请检查浏览器权限。");
  }).catch(() => showRoomMessage("复制失败，请检查浏览器权限。"));
}

function handleLogin(event) {
  event?.preventDefault();
  playerProfile = savePlayerProfile(localStorage, readProfileInput());
  const pendingRoomCode = nextViewState({ locationLike: location, profile: playerProfile, online: onlineClient.getOnline() }).pendingRoomCode;
  replaceUrl(pendingRoomCode ? roomUrl(location.pathname, pendingRoomCode) : viewUrl(location.pathname, "room"));
  renderAppFlow();
}

function renderAppFlow() {
  if (!appShell) return;
  const online = onlineClient.getOnline();
  const viewState = nextViewState({ locationLike: location, profile: playerProfile, online });
  appShell.dataset.view = viewState.view;
  if (loginView) loginView.hidden = viewState.view !== "login";
  if (roomView) roomView.hidden = viewState.view !== "room";
  if (gameView) gameView.hidden = viewState.view !== "game";
  renderRoomControls(online, viewState.pendingRoomCode);
  renderSeats(online);
  syncFlowUrl(viewState.view, viewState.pendingRoomCode, online);
}

function renderRoomControls(online, pendingRoomCode) {
  if (roomCodeEntry && document.activeElement !== roomCodeEntry) {
    roomCodeEntry.value = online?.roomCode ?? pendingRoomCode ?? roomCodeEntry.value;
  }
  const controls = roomControlState(online);
  const currentReady = online?.players?.[online.side]?.ready ?? false;
  if (roomCreateButton) roomCreateButton.disabled = !controls.canCreate;
  if (roomJoinButton) roomJoinButton.disabled = !controls.canJoin;
  if (roomCodeEntry) roomCodeEntry.disabled = !controls.canJoin;
  if (roomReadyButton) {
    roomReadyButton.disabled = !controls.canReady;
    roomReadyButton.textContent = currentReady ? "取消准备" : "准备开始";
  }
  if (roomCopyLinkButton) roomCopyLinkButton.disabled = !controls.canCopyInvite;
}

function renderSeats(online) {
  renderSeat("plant", "植物方", online?.players?.plant);
  renderSeat("zombie", "僵尸方", online?.players?.zombie);
}

function renderSeat(side, label, player) {
  const seat = appShell?.querySelector(`[data-side="${side}"]`);
  if (!seat) return;
  const title = seat.querySelector("strong");
  const detail = seat.querySelector("span");
  if (title) title.textContent = label;
  if (!detail) return;
  if (!player?.clientId) {
    detail.textContent = "等待加入";
    return;
  }
  const profileName = player.profile?.playerName || "已加入";
  const onlineLabel = player.online === false ? "离线" : player.ready ? "已准备" : "未准备";
  detail.textContent = `${profileName} · ${onlineLabel}`;
}

function syncFlowUrl(view, pendingRoomCode, online) {
  if (view === "game" && online?.roomCode) {
    replaceUrl(gameUrl(location.pathname, online.roomCode));
    return;
  }
  if (view === "room" && (online?.roomCode || pendingRoomCode)) {
    replaceUrl(roomUrl(location.pathname, online?.roomCode ?? pendingRoomCode));
    return;
  }
  if (view === "login" && !pendingRoomCode) replaceUrl(viewUrl(location.pathname, "login"));
}

function hydrateProfileForm() {
  if (!playerProfile) return;
  if (playerNameInput) playerNameInput.value = playerProfile.playerName;
  const avatarInput = document.querySelector(`input[name="avatarId"][value="${CSS.escape(playerProfile.avatarId)}"]`);
  if (avatarInput) avatarInput.checked = true;
}

function ensurePlayerProfile() {
  if (!playerProfile) playerProfile = savePlayerProfile(localStorage, readProfileInput());
  return playerProfile;
}

function readProfileInput() {
  const avatarInput = document.querySelector('input[name="avatarId"]:checked');
  return {
    playerName: playerNameInput?.value ?? "",
    avatarId: avatarInput?.value,
  };
}

function replaceUrl(url) {
  if (`${location.pathname}${location.search}` === url) return;
  history.replaceState(null, "", url);
}

function ensureRoomMessage() {
  const existing = document.querySelector("#room-message");
  if (existing) return existing;
  const roomCard = document.querySelector(".room-card");
  const roomFooter = document.querySelector(".room-footer");
  if (!roomCard && !roomFooter) return null;
  const roomMessage = document.createElement("p");
  roomMessage.id = "room-message";
  roomMessage.className = "room-message";
  roomMessage.setAttribute("aria-live", "polite");
  (roomFooter ?? roomCard).append(roomMessage);
  return roomMessage;
}

function clearRoomMessage() {
  if (roomMessage) roomMessage.textContent = "";
}

function showRoomMessage(message) {
  if (roomMessage) roomMessage.textContent = message;
  state.status = message;
  if (srState) srState.textContent = message;
}
