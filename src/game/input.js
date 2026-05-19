import { GRID, PLANTS, SUN_PICKUP, ZOMBIES } from "./config.js?v=20260519-versus1";
import { enqueueCommand } from "./commands.js?v=20260519-versus1";

export const SUN_COUNTER_RECT = { x: 18, y: 18, w: 132, h: 46 };
export const SHOVEL_CARD_RECT = { id: "shovel", kind: "shovel", x: 42, y: 78, w: 82, h: 56 };
export const PLANT_PANEL_RECT = { x: 160, y: 12, w: 430, h: 132 };
export const STATUS_PANEL_RECT = { x: 606, y: 12, w: 178, h: 132 };
export const TIMER_RECT = { x: 612, y: 18, w: 78, h: 42 };
export const BRAIN_COUNTER_RECT = { x: 698, y: 18, w: 88, h: 42 };
export const THREAT_PANEL_RECT = { x: 612, y: 72, w: 174, h: 58 };
export const ZOMBIE_PANEL_RECT = { x: 798, y: 12, w: 460, h: 132 };

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
  if (hitSunCounter(point) && state.sunPickups.length > 0) return { type: "collectAllSun" };

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
  return state.sunPickups
    .map((sun) => {
      const dx = sun.x - point.x;
      const dy = sun.y - point.y;
      return { sun, distance: Math.hypot(dx, dy) };
    })
    .filter((candidate) => candidate.distance <= Math.max(34, SUN_PICKUP.radius))
    .sort((a, b) => a.distance - b.distance)[0]?.sun;
}

function hitSunCounter(point) {
  return (
    point.x >= SUN_COUNTER_RECT.x &&
    point.x <= SUN_COUNTER_RECT.x + SUN_COUNTER_RECT.w &&
    point.y >= SUN_COUNTER_RECT.y &&
    point.y <= SUN_COUNTER_RECT.y + SUN_COUNTER_RECT.h
  );
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
  if (point.x < GRID.deployLeft || point.x > GRID.deployLeft + GRID.deployWidth) return null;
  const row = Math.floor((point.y - GRID.top) / GRID.cellHeight);
  return row >= 0 && row < GRID.rows ? row : null;
}

export function getPlantCardRects() {
  const ids = Object.keys(PLANTS);
  const cards = ids.map((id, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    return { id, kind: "plant", x: PLANT_PANEL_RECT.x + 14 + col * 82, y: 20 + row * 62, w: 66, h: 54 };
  });
  cards.push(SHOVEL_CARD_RECT);
  return cards;
}

export function getZombieCardRects() {
  return Object.keys(ZOMBIES).map((id, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return { id, x: ZOMBIE_PANEL_RECT.x + 18 + col * 108, y: 20 + row * 62, w: 82, h: 58 };
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
