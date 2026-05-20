import { CANVAS, GRID, PLANTS, PROJECTILES, ROUND, SUN_PICKUP, ZOMBIES } from "./config.js?v=20260519-tempo1";
import { drainCommandQueue } from "./commands.js?v=20260519-tempo1";
import { nextId } from "./state.js?v=20260519-tempo1";

export function updateGame(state, dt) {
  drainCommandQueue(state);
  if (!state.started || state.paused || state.winner) return;
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
  const finalPush = state.timer.remaining <= ROUND.finalPushStartsAt ? ROUND.finalPushBrainMultiplier : 1;
  state.resources.zombie.brain = Math.min(
    ROUND.maxZombieBrain,
    state.resources.zombie.brain + ROUND.zombieBrainPerSecond * finalPush * dt,
  );
}

function updateDirector(state, dt) {
  state.director.autoWaves = false;
  state.director.warning = null;
  state.director.waveClock = 0;
  const target = calculateVersusPressure(state);
  const smoothing = Math.min(1, dt * 3);
  state.director.threat += (target - state.director.threat) * smoothing;
}

function seededLane(state, salt) {
  return Math.abs(Math.floor(Math.sin(state.time * 1.7 + salt * 9.31) * 1000)) % GRID.rows;
}

function calculateVersusPressure(state) {
  const boardSpan = GRID.deployLeft - GRID.left;
  const bankedBrain = Math.min(18, state.resources.zombie.brain / 22);
  const liveZombiePressure = state.zombies.reduce((total, zombie) => {
    const hpRatio = Math.max(0, Math.min(1, zombie.hp / zombie.maxHp));
    const advance = Math.max(0, Math.min(1, (GRID.deployLeft - zombie.x) / boardSpan));
    const rowStack = state.zombies.filter((other) => other.row === zombie.row).length - 1;
    return total + 9 + hpRatio * 11 + advance * 22 + rowStack * 3;
  }, 0);
  return Math.max(0, Math.min(100, bankedBrain + liveZombiePressure));
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
  const overlapCount = state.sunPickups.filter((sun) => Math.hypot(sun.x - x, sun.y - y) < 54).length;
  const spreadAngle = overlapCount * 2.35;
  const spreadRadius = overlapCount === 0 ? 0 : 22 + (overlapCount % 3) * 8;
  const spreadX = Math.cos(spreadAngle) * spreadRadius;
  const spreadY = Math.sin(spreadAngle) * spreadRadius;
  const pickup = {
    x: x + spreadX,
    y: y + spreadY,
    targetY: kind === "sky" ? rowCenterY(row) : y - 26 + spreadY * 0.45,
  };
  const nearby = state.sunPickups.find((sun) => sun.kind === kind && sun.amount < 100 && Math.hypot(sun.x - pickup.x, sun.y - pickup.y) < 62);
  if (nearby) {
    nearby.amount += amount;
    nearby.ttl = SUN_PICKUP.ttl;
    nearby.x = nearby.x * 0.72 + pickup.x * 0.28;
    nearby.y = nearby.y * 0.72 + pickup.y * 0.28;
    nearby.targetY = pickup.targetY;
    return;
  }
  state.sunPickups.push({
    id: nextId(state, "sun"),
    x: pickup.x,
    y: pickup.y,
    amount,
    kind,
    ttl: SUN_PICKUP.ttl,
    targetY: pickup.targetY,
  });
}

function updatePlantActions(state, dt) {
  for (const plant of state.plants) {
    plant.actionClock += dt;
    plant.flash = Math.max(0, plant.flash - dt);
    plant.bitePulse = Math.max(0, plant.bitePulse - dt);
    plant.visualTimer = Math.max(0, (plant.visualTimer ?? 0) - dt);
    if (plant.visualTimer === 0) plant.visualState = null;
    const config = PLANTS[plant.type];
    if (config.armTime && !plant.armed && plant.actionClock >= config.armTime) {
      plant.armed = true;
      plant.actionClock = 0;
      plant.flash = 0.18;
      setPlantVisual(plant, "armed", 0.35);
      state.status = `${config.name} 已准备。`;
    }
    if (config.armTime && plant.armed) {
      const target = state.zombies.find((zombie) => zombie.row === plant.row && Math.abs(zombie.x - cellCenterX(plant.col)) < 46);
      if (target) {
        explodePlant(state, plant, config, "potatoMine");
        plant.hp = 0;
        continue;
      }
    }
    if (config.produceEvery && plant.actionClock >= config.produceEvery) {
      plant.actionClock = 0;
      setPlantVisual(plant, "produce", 0.55);
      createSunPickup(state, cellCenterX(plant.col) + 34, rowCenterY(plant.row) - 82, config.produceAmount);
      state.effects.push({ id: nextId(state, "effect"), type: "sunPop", row: plant.row, col: plant.col, ttl: 0.8 });
      state.audioEvents.push({ type: "grow" });
    }
    if (config.explodeAfter && plant.actionClock >= config.explodeAfter) {
      explodePlant(state, plant, config, config.rowBlast ? "jalapeno" : "explosion");
      plant.hp = 0;
    }
    if (config.fireEvery && plant.actionClock >= config.fireEvery && hasZombieAhead(state, plant)) {
      plant.actionClock = 0;
      setPlantVisual(plant, "attack", 0.28);
      const burstCount = config.burstCount ?? 1;
      for (let index = 0; index < burstCount; index += 1) {
        state.projectiles.push({
          id: nextId(state, "projectile"),
          type: config.projectile,
          row: plant.row,
          x: cellCenterX(plant.col) + 24 - index * 18,
          y: rowCenterY(plant.row) + index * 2,
          damage: config.damage,
          torchwoodIds: [],
        });
      }
    }
  }
}

function explodePlant(state, plant, config, soundType = "explosion") {
  const x = cellCenterX(plant.col);
  const y = rowCenterY(plant.row);
  for (const zombie of state.zombies) {
    const dy = Math.abs(rowCenterY(zombie.row) - y);
    const dx = Math.abs(zombie.x - x);
    const inBlast = config.rowBlast ? zombie.row === plant.row : dx <= config.blastRadius && dy <= GRID.cellHeight * 1.2;
    if (inBlast) {
      zombie.hp -= config.blastDamage;
      zombie.flash = 0.2;
    }
  }
  const ttl = config.rowBlast ? 1.45 : 0.75;
  state.effects.push({ id: nextId(state, "effect"), type: config.rowBlast ? "rowFire" : "explosion", row: plant.row, x, y, ttl, maxTtl: ttl });
  state.audioEvents.push({ type: soundType });
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
    maybeIgniteProjectile(state, projectile);
    const hit = state.zombies.find((zombie) => zombie.row === projectile.row && Math.abs(zombie.x - projectile.x) < 26);
    if (hit) {
      hit.hp -= projectile.damage;
      hit.flash = 0.12;
      maybeDropArmor(state, hit);
      if (projectileConfig.slow > 0) hit.slowTimer = projectileConfig.slowDuration;
      projectile.remove = true;
      state.effects.push({ id: nextId(state, "effect"), type: "hit", x: projectile.x, y: projectile.y, ttl: 0.25 });
      state.audioEvents.push({ type: "hit" });
    }
    if (projectile.x > GRID.deployLeft + GRID.deployWidth + 18) projectile.remove = true;
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.remove);
}

function maybeIgniteProjectile(state, projectile) {
  if (projectile.type !== "pea") return;
  const torchwood = state.plants.find((plant) => {
    if (plant.row !== projectile.row || plant.type !== "torchwood") return false;
    if (projectile.torchwoodIds?.includes(plant.id)) return false;
    return Math.abs(projectile.x - cellCenterX(plant.col)) < 24;
  });
  if (!torchwood) return;
  projectile.type = "firepea";
  projectile.damage = Math.ceil(projectile.damage * 1.55);
  projectile.torchwoodIds = [...(projectile.torchwoodIds ?? []), torchwood.id];
  state.effects.push({ id: nextId(state, "effect"), type: "ignite", x: projectile.x, y: projectile.y, ttl: 0.22 });
  state.audioEvents.push({ type: "ignite" });
}

function updateZombies(state, dt) {
  for (const zombie of state.zombies) {
    const config = ZOMBIES[zombie.type];
    zombie.eating = false;
    zombie.slowTimer = Math.max(0, zombie.slowTimer - dt);
    zombie.chargeTimer = Math.max(0, (zombie.chargeTimer ?? 0) - dt);
    zombie.biteSoundClock = Math.max(0, (zombie.biteSoundClock ?? 0) - dt);
    zombie.flash = Math.max(0, zombie.flash - dt);
    const blocker = findBlockingPlant(state, zombie);
    if (blocker) {
      zombie.eating = true;
      blocker.hp -= config.biteDps * dt;
      blocker.flash = 0.1;
      blocker.bitePulse = 0.16;
      setPlantVisual(blocker, "damaged", 0.18);
      if (config.crushPlant) {
        blocker.hp = 0;
        zombie.eating = false;
        state.effects.push({ id: nextId(state, "effect"), type: "mowerStart", x: cellCenterX(blocker.col), y: rowCenterY(blocker.row), ttl: 0.35 });
        state.audioEvents.push({ type: "zamboni" });
      }
      if (zombie.biteSoundClock <= 0) {
        zombie.biteSoundClock = 0.55;
        state.audioEvents.push({ type: "bite" });
      }
    } else {
      const slowFactor = zombie.slowTimer > 0 ? 0.55 : 1;
      const chargeFactor = zombie.chargeTimer > 0 ? config.chargeMultiplier ?? 1 : 1;
      const finalPush = state.timer.remaining <= ROUND.finalPushStartsAt ? ROUND.finalPushSpeedMultiplier : 1;
      zombie.x -= config.speed * slowFactor * chargeFactor * finalPush * dt;
    }
  }
}

function setPlantVisual(plant, visualState, duration) {
  plant.visualState = visualState;
  plant.visualTimer = Math.max(plant.visualTimer ?? 0, duration);
  plant.visualDuration = duration;
}

function maybeDropArmor(state, zombie) {
  if (zombie.armorDropped || zombie.hp > zombie.maxHp * 0.55) return;
  if (!["cone", "bucket", "screen", "runner"].includes(zombie.type)) return;
  zombie.armorDropped = true;
  state.effects.push({ id: nextId(state, "effect"), type: "armorDrop", hatType: zombie.type, x: zombie.x, y: rowCenterY(zombie.row) - 48, vy: -90, vx: -35, ttl: 1.1 });
  state.audioEvents.push({ type: "armorDrop" });
}

function updateLaneMowers(state, dt) {
  for (const mower of state.laneMowers) {
    const trigger = state.zombies.some((zombie) => zombie.row === mower.row && zombie.x < GRID.left - 28);
    if (mower.available && trigger) {
      mower.available = false;
      mower.active = true;
      mower.x = GRID.left - 46;
      state.effects.push({ id: nextId(state, "effect"), type: "mowerStart", x: mower.x, y: rowCenterY(mower.row), ttl: 0.5 });
      state.audioEvents.push({ type: "mower" });
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
  for (const zombie of state.zombies) {
    if (zombie.hp <= 0 && !zombie.defeatEffectCreated) {
      zombie.defeatEffectCreated = true;
      state.effects.push({
        id: nextId(state, "effect"),
        type: "zombieDeath",
        zombieType: zombie.type,
        x: zombie.x,
        y: rowCenterY(zombie.row),
        anchor: "ground",
        motion: "fall-down",
        ttl: 1.05,
        maxTtl: 1.05,
      });
    }
  }
  state.plants = state.plants.filter((plant) => plant.hp > 0);
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0);
}

function updateEffects(state, dt) {
  for (const effect of state.effects) {
    effect.ttl -= dt;
    if (effect.type === "armorDrop") {
      effect.x += effect.vx * dt;
      effect.y += effect.vy * dt;
      effect.vy += 260 * dt;
    }
  }
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
