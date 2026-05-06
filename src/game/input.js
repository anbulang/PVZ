import { GRID, PLANTS, SUN_PICKUP, ZOMBIES } from "./config.js";
import { enqueueCommand } from "./commands.js";

export function attachInput(canvas, state) {
  canvas.addEventListener("click", (event) => {
    const point = canvasPoint(canvas, event);
    const command = commandFromPoint(state, point);
    if (command) enqueueCommand(state, command);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "p") enqueueCommand(state, { type: "togglePause" });
    if (event.key === "r" && state.winner) enqueueCommand(state, { type: "restart" });
    if (event.key === "f") toggleFullscreen(canvas);
  });
}

export function commandFromPoint(state, point) {
  const sun = hitSunPickup(state, point);
  if (sun) return { type: "collectSun", id: sun.id };

  const plantCard = hitCard(point, "plant");
  if (plantCard) return toggleSelection(state, { type: "select", side: "plant", kind: plantCard.kind, unitType: plantCard.id });
  const zombieCard = hitCard(point, "zombie");
  if (zombieCard) return toggleSelection(state, { type: "select", side: "zombie", kind: "zombie", unitType: zombieCard.id });

  const cell = gridCellFromPoint(point);
  if (cell && state.selection?.side === "plant") {
    if (state.selection.kind === "shovel") return { type: "shovel", row: cell.row, col: cell.col };
    return { type: "placePlant", plantType: state.selection.type, row: cell.row, col: cell.col };
  }

  const lane = deployLaneFromPoint(point);
  if (lane !== null && state.selection?.side === "zombie") {
    return { type: "deployZombie", zombieType: state.selection.type, row: lane };
  }

  return { type: "clearSelection" };
}

function hitSunPickup(state, point) {
  return state.sunPickups.find((sun) => {
    const dx = sun.x - point.x;
    const dy = sun.y - point.y;
    return Math.hypot(dx, dy) <= SUN_PICKUP.radius;
  });
}

function toggleSelection(state, command) {
  if (state.selection?.side === command.side && state.selection?.type === command.unitType && state.selection?.kind === command.kind) {
    return { type: "clearSelection" };
  }
  return command;
}

export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export function gridCellFromPoint(point) {
  const col = Math.floor((point.x - GRID.left) / GRID.cellWidth);
  const row = Math.floor((point.y - GRID.top) / GRID.cellHeight);
  if (row < 0 || row >= GRID.rows || col < 0 || col >= GRID.cols) return null;
  return { row, col };
}

export function deployLaneFromPoint(point) {
  if (point.x < GRID.deployLeft || point.x > GRID.deployLeft + 150) return null;
  const row = Math.floor((point.y - GRID.top) / GRID.cellHeight);
  return row >= 0 && row < GRID.rows ? row : null;
}

export function getPlantCardRects() {
  const ids = Object.keys(PLANTS);
  const cards = ids.map((id, index) => {
    const col = index % 6;
    const row = Math.floor(index / 6);
    return { id, kind: "plant", x: 22 + col * 76, y: 20 + row * 58, w: 68, h: 54 };
  });
  const shovelIndex = ids.length;
  cards.push({ id: "shovel", kind: "shovel", x: 22 + (shovelIndex % 6) * 76, y: 20 + Math.floor(shovelIndex / 6) * 58, w: 68, h: 54 });
  return cards;
}

export function getZombieCardRects() {
  return Object.keys(ZOMBIES).map((id, index) => {
    const col = index % 6;
    const row = Math.floor(index / 6);
    return { id, x: 842 + col * 68, y: 20 + row * 58, w: 62, h: 54 };
  });
}

function hitCard(point, side) {
  const cards = side === "plant" ? getPlantCardRects() : getZombieCardRects();
  return cards.find((card) => point.x >= card.x && point.x <= card.x + card.w && point.y >= card.y && point.y <= card.y + card.h);
}

function toggleFullscreen(canvas) {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    canvas.requestFullscreen();
  }
}
