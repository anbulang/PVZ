import { CANVAS, GRID, PLANTS, PROJECTILES, ROUND, SUN_PICKUP, ZOMBIES } from "./config.js";
import { drainCommandQueue, spawnZombie } from "./commands.js";
import { nextId } from "./state.js";

export function updateGame(state, dt) {
  drainCommandQueue(state);
  if (state.paused || state.winner) return;
  state.time += dt;
  state.timer.remaining = Math.max(0, state.timer.remaining - dt);
  updateCooldowns(state, dt);
  updateResources(state, dt);
  updateDirector(state, dt);
  updateSunPickups(state, dt);
  updatePlantActions(state, dt);
  updateProjectiles(state, dt);
  updateZombies(state, dt);
  updateLaneMowers(state, dt);
  cleanupDeadEntities(state);
  updateEffects(state, dt);
  updateWinConditions(state);
}

function updateCooldowns(state, dt) {
  for (const card of Object.values(state.cards.plant)) card.cooldownRemaining = Math.max(0, card.cooldownRemaining - dt);
  for (const card of Object.values(state.cards.zombie)) card.cooldownRemaining = Math.max(0, card.cooldownRemaining - dt);
}

function updateResources(state, dt) {
  state.resources.plant.passiveSunClock += dt;
  if (state.resources.plant.passiveSunClock >= ROUND.passiveSunInterval) {
    state.resources.plant.passiveSunClock -= ROUND.passiveSunInterval;
    createSunPickup(state, GRID.left + 100 + seededLane(state, 7) * 95, GRID.top - 10, ROUND.passiveSunAmount, "sky");
  }
  const brainRate = state.time > ROUND.zombieRampTime ? 4.2 : 2.4;
  state.resources.zombie.brain += brainRate * dt;
  state.director.threat = Math.min(100, state.director.threat + dt * (state.time > ROUND.zombieRampTime ? 1.4 : 0.8));
}

function updateDirector(state, dt) {
  if (state.director.warning) {
    state.director.warning.remaining -= dt;
    if (state.director.warning.remaining <= 0) {
      const { row, zombieType } = state.director.warning;
      spawnZombie(state, zombieType, row, { x: GRID.deployLeft + 78 });
      state.director.warning = null;
      state.director.waveCount += 1;
      state.director.threat = Math.max(0, state.director.threat - 18);
      state.status = `第 ${state.director.waveCount} 波：${ZOMBIES[zombieType].name} 入场。`;
    }
    return;
  }

  state.director.waveClock -= dt;
  if (state.director.waveClock <= 0) {
    const row = seededLane(state, state.director.waveCount + 3);
    const zombieType = chooseDirectorZombie(state);
    state.director.warning = { row, zombieType, remaining: ROUND.waveWarning };
    state.director.waveClock = Math.max(8, ROUND.waveEvery - state.director.waveCount * 0.9);
    state.status = `第 ${state.director.waveCount + 1} 波预警：第 ${row + 1} 路有 ${ZOMBIES[zombieType].name}。`;
  }
}

function chooseDirectorZombie(state) {
  if (state.time > 95 && state.director.waveCount % 4 === 3) return "bucket";
  if (state.time > 55 && state.director.waveCount % 3 === 2) return "cone";
  if (state.time > 35 && state.director.waveCount % 3 === 1) return "runner";
  if (state.director.waveCount % 2 === 1) return "imp";
  return "basic";
}

function seededLane(state, salt) {
  return Math.abs(Math.floor(Math.sin(state.time * 1.7 + salt * 9.31) * 1000)) % GRID.rows;
}

function updateSunPickups(state, dt) {
  for (const sun of state.sunPickups) {
    sun.ttl -= dt;
    if (sun.kind === "sky") {
      sun.y = Math.min(sun.targetY, sun.y + 28 * dt);
    }
  }
  state.sunPickups = state.sunPickups.filter((sun) => sun.ttl > 0);
}

function createSunPickup(state, x, y, amount, kind = "plant") {
  const row = Math.max(0, Math.min(GRID.rows - 1, Math.floor((y - GRID.top) / GRID.cellHeight)));
  state.sunPickups.push({
    id: nextId(state, "sun"),
    x,
    y,
    amount,
    kind,
    ttl: SUN_PICKUP.ttl,
    targetY: kind === "sky" ? rowCenterY(row) : y - 26,
  });
}

function updatePlantActions(state, dt) {
  for (const plant of state.plants) {
    plant.actionClock += dt;
    plant.flash = Math.max(0, plant.flash - dt);
    const config = PLANTS[plant.type];
    if (config.produceEvery && plant.actionClock >= config.produceEvery) {
      plant.actionClock = 0;
      createSunPickup(state, cellCenterX(plant.col), rowCenterY(plant.row) - 14, config.produceAmount);
      state.effects.push({ id: nextId(state, "effect"), type: "sunPop", row: plant.row, col: plant.col, ttl: 0.8 });
    }
    if (config.explodeAfter && plant.actionClock >= config.explodeAfter) {
      explodePlant(state, plant, config);
      plant.hp = 0;
    }
    if (config.fireEvery && plant.actionClock >= config.fireEvery && hasZombieAhead(state, plant)) {
      plant.actionClock = 0;
      state.projectiles.push({
        id: nextId(state, "projectile"),
        type: config.projectile,
        row: plant.row,
        x: cellCenterX(plant.col) + 24,
        y: rowCenterY(plant.row),
        damage: config.damage,
      });
    }
  }
}

function explodePlant(state, plant, config) {
  const x = cellCenterX(plant.col);
  const y = rowCenterY(plant.row);
  for (const zombie of state.zombies) {
    const dy = Math.abs(rowCenterY(zombie.row) - y);
    const dx = Math.abs(zombie.x - x);
    if (dx <= config.blastRadius && dy <= GRID.cellHeight * 1.2) {
      zombie.hp -= config.blastDamage;
      zombie.flash = 0.2;
    }
  }
  state.effects.push({ id: nextId(state, "effect"), type: "explosion", x, y, ttl: 0.75 });
  state.status = `${config.name} 爆炸。`;
}

function hasZombieAhead(state, plant) {
  const origin = cellCenterX(plant.col);
  return state.zombies.some((zombie) => zombie.row === plant.row && zombie.x > origin);
}

function updateProjectiles(state, dt) {
  for (const projectile of state.projectiles) {
    const projectileConfig = PROJECTILES[projectile.type];
    projectile.x += projectileConfig.speed * dt;
    const hit = state.zombies.find((zombie) => zombie.row === projectile.row && Math.abs(zombie.x - projectile.x) < 26);
    if (hit) {
      hit.hp -= projectile.damage;
      hit.flash = 0.12;
      if (projectileConfig.slow > 0) hit.slowTimer = projectileConfig.slowDuration;
      projectile.remove = true;
      state.effects.push({ id: nextId(state, "effect"), type: "hit", x: projectile.x, y: projectile.y, ttl: 0.25 });
    }
    if (projectile.x > GRID.deployLeft + 140) projectile.remove = true;
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.remove);
}

function updateZombies(state, dt) {
  for (const zombie of state.zombies) {
    const config = ZOMBIES[zombie.type];
    zombie.slowTimer = Math.max(0, zombie.slowTimer - dt);
    zombie.chargeTimer = Math.max(0, (zombie.chargeTimer ?? 0) - dt);
    zombie.flash = Math.max(0, zombie.flash - dt);
    const blocker = findBlockingPlant(state, zombie);
    if (blocker) {
      blocker.hp -= config.biteDps * dt;
      blocker.flash = 0.1;
    } else {
      const slowFactor = zombie.slowTimer > 0 ? 0.55 : 1;
      const chargeFactor = zombie.chargeTimer > 0 ? config.chargeMultiplier ?? 1 : 1;
      zombie.x -= config.speed * slowFactor * chargeFactor * dt;
    }
  }
}

function updateLaneMowers(state, dt) {
  for (const mower of state.laneMowers) {
    const trigger = state.zombies.some((zombie) => zombie.row === mower.row && zombie.x < GRID.left - 28);
    if (mower.available && trigger) {
      mower.available = false;
      mower.active = true;
      mower.x = GRID.left - 46;
      state.effects.push({ id: nextId(state, "effect"), type: "mowerStart", x: mower.x, y: rowCenterY(mower.row), ttl: 0.5 });
      state.status = `第 ${mower.row + 1} 路割草机启动。`;
    }
    if (mower.active) {
      mower.x += 520 * dt;
      for (const zombie of state.zombies) {
        if (zombie.row === mower.row && Math.abs(zombie.x - mower.x) < 46) {
          zombie.hp = 0;
          state.effects.push({ id: nextId(state, "effect"), type: "hit", x: zombie.x, y: rowCenterY(zombie.row), ttl: 0.35 });
        }
      }
      if (mower.x > CANVAS.width + 80) mower.active = false;
    }
  }
}

function findBlockingPlant(state, zombie) {
  return state.plants.find((plant) => plant.row === zombie.row && Math.abs(cellCenterX(plant.col) - zombie.x) < 42);
}

function cleanupDeadEntities(state) {
  state.plants = state.plants.filter((plant) => plant.hp > 0);
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0);
}

function updateEffects(state, dt) {
  for (const effect of state.effects) effect.ttl -= dt;
  state.effects = state.effects.filter((effect) => effect.ttl > 0);
}

function updateWinConditions(state) {
  if (state.zombies.some((zombie) => zombie.x < GRID.left - 70 && !state.laneMowers[zombie.row]?.available && !state.laneMowers[zombie.row]?.active)) {
    state.winner = "zombie";
    state.mode = "gameOver";
    state.status = "僵尸方突破防线。";
    return;
  }
  if (state.timer.remaining <= 0 && state.zombies.length === 0) {
    state.winner = "plant";
    state.mode = "gameOver";
    state.status = "植物方守住了最后一波。";
  }
}

export function cellCenterX(col) {
  return GRID.left + col * GRID.cellWidth + GRID.cellWidth / 2;
}

export function rowCenterY(row) {
  return GRID.top + row * GRID.cellHeight + GRID.cellHeight / 2;
}
