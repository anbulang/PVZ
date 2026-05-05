import { GRID, PLANTS, PROJECTILES, ROUND, ZOMBIES } from "./config.js";
import { drainCommandQueue } from "./commands.js";
import { nextId } from "./state.js";

export function updateGame(state, dt) {
  drainCommandQueue(state);
  if (state.paused || state.winner) return;
  state.time += dt;
  state.timer.remaining = Math.max(0, state.timer.remaining - dt);
  updateCooldowns(state, dt);
  updateResources(state, dt);
  updatePlantActions(state, dt);
  updateProjectiles(state, dt);
  updateZombies(state, dt);
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
    state.resources.plant.sun += ROUND.passiveSunAmount;
  }
  const brainRate = state.time > ROUND.zombieRampTime ? 4.2 : 2.4;
  state.resources.zombie.brain += brainRate * dt;
}

function updatePlantActions(state, dt) {
  for (const plant of state.plants) {
    plant.actionClock += dt;
    plant.flash = Math.max(0, plant.flash - dt);
    const config = PLANTS[plant.type];
    if (config.produceEvery && plant.actionClock >= config.produceEvery) {
      plant.actionClock = 0;
      state.resources.plant.sun += config.produceAmount;
      state.effects.push({ id: nextId(state, "effect"), type: "sunPop", row: plant.row, col: plant.col, ttl: 0.8 });
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
    zombie.flash = Math.max(0, zombie.flash - dt);
    const blocker = findBlockingPlant(state, zombie);
    if (blocker) {
      blocker.hp -= config.biteDps * dt;
      blocker.flash = 0.1;
    } else {
      const slowFactor = zombie.slowTimer > 0 ? 0.55 : 1;
      zombie.x -= config.speed * slowFactor * dt;
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
  if (state.zombies.some((zombie) => zombie.x < GRID.left - 55)) {
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
