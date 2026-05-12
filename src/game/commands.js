import { GRID, PLANTS, ZOMBIES } from "./config.js?v=20260512-ready2";
import { nextId, resetGameState } from "./state.js?v=20260512-ready2";

export function enqueueCommand(state, command) {
  state.commandQueue.push(command);
}

export function drainCommandQueue(state) {
  while (state.commandQueue.length > 0) {
    applyCommand(state, state.commandQueue.shift());
  }
}

export function applyCommand(state, command) {
  if (command.type === "restart") {
    resetGameState(state);
    return;
  }
  if (command.type === "togglePause") {
    state.paused = !state.paused;
    state.status = state.paused ? "已暂停。" : "继续游戏。";
    return;
  }
  if (state.winner) {
    state.status = "游戏已结束，按 r 重新开始。";
    return;
  }
  if (!state.started) state.started = true;
  if (command.type === "select") return selectCard(state, command);
  if (command.type === "clearSelection") {
    state.selection = null;
    state.status = "已取消选择。";
    return;
  }
  if (command.type === "placePlant") return placePlant(state, command);
  if (command.type === "shovel") return shovelPlant(state, command);
  if (command.type === "deployZombie") return deployZombie(state, command);
  if (command.type === "collectSun") return collectSun(state, command);
  if (command.type === "collectAllSun") return collectAllSun(state);
  state.status = "未知命令。";
}

function selectCard(state, command) {
  state.selection = { side: command.side, kind: command.kind, type: command.unitType };
  const config = command.side === "plant" ? PLANTS[command.unitType] : ZOMBIES[command.unitType];
  state.status = command.kind === "shovel" ? "已选择铲子。" : `已选择 ${config?.name ?? command.unitType}。`;
}

function placePlant(state, command) {
  const config = PLANTS[command.plantType];
  if (!config) return setStatus(state, "未知植物。");
  if (!isGridCell(command.row, command.col)) return setStatus(state, "目标格子无效。");
  if (state.plants.some((plant) => plant.row === command.row && plant.col === command.col)) return setStatus(state, "格子已占用。");
  if (state.resources.plant.sun < config.cost) return setStatus(state, "阳光不足。");
  if (state.cards.plant[command.plantType].cooldownRemaining > 0) return setStatus(state, "植物卡牌冷却中。");

  state.resources.plant.sun -= config.cost;
  state.cards.plant[command.plantType].cooldownRemaining = config.cooldown;
  state.plants.push({
    id: nextId(state, "plant"),
    type: command.plantType,
    row: command.row,
    col: command.col,
    hp: config.hp,
    maxHp: config.hp,
    actionClock: 0,
    armed: !config.armTime,
    flash: 0,
    bitePulse: 0,
  });
  pushSunDeltaEffect(state, -config.cost);
  state.audioEvents.push({ type: "plant" });
  state.status = `${config.name} 已种植，消耗 ${config.cost} 阳光，剩余 ${Math.floor(state.resources.plant.sun)}。`;
}

function shovelPlant(state, command) {
  if (!isGridCell(command.row, command.col)) return setStatus(state, "目标格子无效。");
  const before = state.plants.length;
  state.plants = state.plants.filter((plant) => plant.row !== command.row || plant.col !== command.col);
  state.status = state.plants.length < before ? "已铲除植物。" : "这里没有植物。";
}

function deployZombie(state, command) {
  const config = ZOMBIES[command.zombieType];
  if (!config) return setStatus(state, "未知僵尸。");
  if (command.row < 0 || command.row >= GRID.rows) return setStatus(state, "投放行无效。");
  if (state.resources.zombie.brain < config.cost) return setStatus(state, "脑力不足。");
  if (state.cards.zombie[command.zombieType].cooldownRemaining > 0) return setStatus(state, "僵尸卡牌冷却中。");

  state.resources.zombie.brain -= config.cost;
  state.cards.zombie[command.zombieType].cooldownRemaining = config.cooldown;
  spawnZombie(state, command.zombieType, command.row);
  if (command.zombieType === "zamboni") state.audioEvents.push({ type: "zamboni" });
  state.status = `${config.name} 已投放。`;
}

function collectSun(state, command) {
  const sun = state.sunPickups.find((pickup) => pickup.id === command.id);
  if (!sun) return setStatus(state, "阳光已经消失。");
  state.resources.plant.sun += sun.amount;
  state.sunPickups = state.sunPickups.filter((pickup) => pickup.id !== command.id);
  state.effects.push({ id: nextId(state, "effect"), type: "collectSun", x: sun.x, y: sun.y, amount: sun.amount, ttl: 1.25, maxTtl: 1.25 });
  pushSunDeltaEffect(state, sun.amount);
  state.audioEvents.push({ type: "collectSun" });
  state.status = `收集 ${sun.amount} 阳光，当前 ${Math.floor(state.resources.plant.sun)}。`;
}

function collectAllSun(state) {
  if (state.sunPickups.length === 0) return setStatus(state, "没有可收集的阳光。");
  const pickups = state.sunPickups;
  const total = pickups.reduce((sum, sun) => sum + sun.amount, 0);
  state.resources.plant.sun += total;
  state.sunPickups = [];
  for (const sun of pickups) {
    state.effects.push({ id: nextId(state, "effect"), type: "collectSun", x: sun.x, y: sun.y, amount: sun.amount, ttl: 1.0, maxTtl: 1.0 });
  }
  pushSunDeltaEffect(state, total);
  state.audioEvents.push({ type: "collectSun" });
  state.status = `一键收集 ${total} 阳光，当前 ${Math.floor(state.resources.plant.sun)}。`;
}

function pushSunDeltaEffect(state, amount) {
  state.effects.push({
    id: nextId(state, "effect"),
    type: "sunDelta",
    x: 142,
    y: 148,
    amount,
    ttl: 1.35,
    maxTtl: 1.35,
  });
}

function isGridCell(row, col) {
  return row >= 0 && row < GRID.rows && col >= 0 && col < GRID.cols;
}

function setStatus(state, status) {
  state.status = status;
}

export function spawnZombie(state, zombieType, row, options = {}) {
  const config = ZOMBIES[zombieType];
  state.zombies.push({
    id: nextId(state, "zombie"),
    type: zombieType,
    row,
    x: options.x ?? GRID.deployLeft + 38,
    hp: config.hp,
    maxHp: config.hp,
    slowTimer: 0,
    biteClock: 0,
    chargeTimer: config.chargeDuration ?? 0,
    eating: false,
    biteSoundClock: 0,
    armorDropped: false,
    flash: 0,
  });
  state.audioEvents.push({ type: "zombieSpawn" });
}
