import { GRID, INITIAL_RESOURCES, PLANTS, ROUND, ZOMBIES } from "./config.js?v=20260519-versus1";
import { ASSET_MANIFEST, ASSET_PATHS, armorDropAssetFor, plantVisualFor, primaryAssetPath, primaryVisualPath, zombieVisualFor } from "./assets.js?v=20260519-versus1";

export function createGameState() {
  return {
    mode: "playing",
    started: false,
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
      autoWaves: false,
      manualDeployCount: 0,
      waveClock: 6,
      warning: null,
      waveCount: 0,
      threat: 0,
    },
    commandQueue: [],
    nextEntityId: 1,
    status: "选择卡牌开始攻防。",
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
    started: state.started,
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
      plants: state.plants.map((plant) => {
        const visual = plantVisualFor(plant);
        return {
          id: plant.id,
          type: plant.type,
          row: plant.row,
          col: plant.col,
          hp: Math.ceil(plant.hp),
          armed: Boolean(plant.armed),
          visualState: visual.state,
          visualAsset: primaryVisualPath(visual),
          animationSource: visual.animationSource,
        };
      }),
      zombies: state.zombies.map((zombie) => {
        const visual = zombieVisualFor(zombie);
        return {
          id: zombie.id,
          type: zombie.type,
          row: zombie.row,
          x: Math.round(zombie.x),
          hp: Math.ceil(zombie.hp),
          slowed: zombie.slowTimer > 0,
          eating: Boolean(zombie.eating),
          armorDropped: Boolean(zombie.armorDropped),
          visualState: visual.state,
          visualAsset: primaryVisualPath(visual),
          animationSource: visual.animationSource,
        };
      }),
      projectiles: state.projectiles.map((projectile) => ({ id: projectile.id, type: projectile.type, row: projectile.row, x: Math.round(projectile.x) })),
      sunPickups: state.sunPickups.map((sun) => ({ id: sun.id, x: Math.round(sun.x), y: Math.round(sun.y), amount: sun.amount })),
      laneMowers: state.laneMowers.map((mower) => ({ row: mower.row, available: mower.available, active: mower.active, x: Math.round(mower.x) })),
      effects: state.effects.map((effect) => ({
        type: effect.type,
        x: Math.round(effect.x ?? 0),
        y: Math.round(effect.y ?? 0),
        amount: effect.amount ?? null,
        visualAsset: effectVisualAsset(effect),
        animationSource: effect.type === "zombieDeath" ? "spritesheet" : effect.type === "armorDrop" ? "image" : null,
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
      autoWaves: state.director.autoWaves,
      manualDeployCount: state.director.manualDeployCount,
      waveCount: state.director.waveCount,
      threat: Math.round(state.director.threat),
      warning: state.director.warning,
    },
    audio: globalThis.__audioDebug ? globalThis.__audioDebug() : { audioUnlocked: false, musicActive: false, musicPath: null },
  });
}

function effectVisualAsset(effect) {
  if (effect.type === "zombieDeath") return primaryAssetPath(ASSET_PATHS.zombieDeath[effect.zombieType] ?? ASSET_PATHS.zombieDeath.basic);
  if (effect.type === "armorDrop") return armorDropAssetFor(effect.hatType);
  return null;
}
