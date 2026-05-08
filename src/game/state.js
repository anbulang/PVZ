import { GRID, INITIAL_RESOURCES, PLANTS, ROUND, ZOMBIES } from "./config.js";
import { ASSET_MANIFEST, ASSET_PATHS, primaryAssetPath, zombieVisualFor } from "./assets.js";

export function createGameState() {
  return {
    mode: "playing",
    grid: { rows: GRID.rows, cols: GRID.cols },
    time: 0,
    timer: { remaining: ROUND.duration },
    resources: {
      plant: { sun: INITIAL_RESOURCES.sun, passiveSunClock: 0 },
      zombie: { brain: INITIAL_RESOURCES.brain },
    },
    cards: {
      plant: Object.fromEntries(Object.keys(PLANTS).map((id) => [id, { cooldownRemaining: 0 }])),
      zombie: Object.fromEntries(Object.keys(ZOMBIES).map((id) => [id, { cooldownRemaining: 0 }])),
    },
    selection: null,
    plants: [],
    zombies: [],
    projectiles: [],
    sunPickups: [],
    effects: [],
    audioEvents: [],
    laneMowers: Array.from({ length: GRID.rows }, (_, row) => ({ row, available: true, active: false, x: GRID.left - 58 })),
    director: {
      waveClock: 6,
      warning: null,
      waveCount: 0,
      threat: 0,
    },
    commandQueue: [],
    nextEntityId: 1,
    status: "植物方选择卡牌种植，僵尸方选择卡牌投放。",
    paused: false,
    winner: null,
  };
}

export function resetGameState(state) {
  Object.assign(state, createGameState());
}

export function nextId(state, prefix) {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}

export function serializeGameState(state) {
  return JSON.stringify({
    mode: state.mode,
    paused: state.paused,
    gameOver: Boolean(state.winner),
    winner: state.winner,
    coordinateSystem: "origin top-left; x grows right; y grows down; grid row 0..4 top-bottom col 0..8 left-right",
    timeRemaining: Number(state.timer.remaining.toFixed(2)),
    resources: {
      sun: Math.floor(state.resources.plant.sun),
      brain: Math.floor(state.resources.zombie.brain),
    },
    selection: state.selection,
    status: state.status,
    entities: {
      plants: state.plants.map((plant) => ({
        id: plant.id,
        type: plant.type,
        row: plant.row,
        col: plant.col,
        hp: Math.ceil(plant.hp),
        armed: Boolean(plant.armed),
        visualState: plant.armed ? "armed" : "idle",
        visualAsset: primaryAssetPath(plant.armed && ASSET_PATHS.plantArmed[plant.type] ? ASSET_PATHS.plantArmed[plant.type] : ASSET_PATHS.plantIdle[plant.type]),
      })),
      zombies: state.zombies.map((zombie) => ({
        id: zombie.id,
        type: zombie.type,
        row: zombie.row,
        x: Math.round(zombie.x),
        hp: Math.ceil(zombie.hp),
        slowed: zombie.slowTimer > 0,
        eating: Boolean(zombie.eating),
        armorDropped: Boolean(zombie.armorDropped),
        visualState: zombieVisualFor(zombie).state,
        visualAsset: zombieVisualFor(zombie).paths[0] ?? null,
        animationSource: zombieVisualFor(zombie).animationSource,
      })),
      projectiles: state.projectiles.map((projectile) => ({ id: projectile.id, type: projectile.type, row: projectile.row, x: Math.round(projectile.x) })),
      sunPickups: state.sunPickups.map((sun) => ({ id: sun.id, x: Math.round(sun.x), y: Math.round(sun.y), amount: sun.amount })),
      laneMowers: state.laneMowers.map((mower) => ({ row: mower.row, available: mower.available, active: mower.active, x: Math.round(mower.x) })),
      effects: state.effects.map((effect) => ({
        type: effect.type,
        x: Math.round(effect.x ?? 0),
        y: Math.round(effect.y ?? 0),
        amount: effect.amount ?? null,
        visualAsset: effect.type === "zombieDeath" ? primaryAssetPath(ASSET_PATHS.zombieDeath[effect.zombieType] ?? ASSET_PATHS.zombieDeath.basic) : null,
      })),
    },
    visualAssets: {
      scene: primaryAssetPath(ASSET_MANIFEST.scene.day.paths),
      ui: {
        shop: primaryAssetPath(ASSET_MANIFEST.ui.shop.paths),
        seedChooser: primaryAssetPath(ASSET_MANIFEST.ui.seedChooser.paths),
        sunCounter: primaryAssetPath(ASSET_MANIFEST.ui.sunCounter.paths),
        shovelSlot: primaryAssetPath(ASSET_MANIFEST.ui.shovelSlot.paths),
        flagMeter: primaryAssetPath(ASSET_MANIFEST.ui.flagMeter.empty.paths),
      },
    },
    director: {
      waveCount: state.director.waveCount,
      threat: Math.round(state.director.threat),
      warning: state.director.warning,
    },
    audio: globalThis.__audioDebug ? globalThis.__audioDebug() : { audioUnlocked: false, musicActive: false, musicPath: null },
  });
}
