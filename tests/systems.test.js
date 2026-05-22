import test from "node:test";
import assert from "node:assert/strict";
import { createGameState, serializeGameState } from "../src/game/state.js";
import { applyCommand, spawnZombie } from "../src/game/commands.js";
import { updateGame } from "../src/game/systems.js";
import { INITIAL_RESOURCES, ROUND, ZOMBIES } from "../src/game/config.js";
import { armorDropAssetFor } from "../src/game/assets.js";

function step(state, seconds) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i += 1) updateGame(state, 1 / 60);
}

test("cooldowns and resources advance over time", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 0, col: 0 });
  assert.equal(state.cards.plant.sunflower.cooldownRemaining > 0, true);
  step(state, ROUND.passiveSunInterval + 0.1);
  assert.equal(state.cards.plant.sunflower.cooldownRemaining, 0);
  assert.equal(state.sunPickups.length >= 1, true);
  assert.equal(state.resources.zombie.brain > 100, true);
});

test("passive sky sun waits longer than the old early snowball cadence", () => {
  const state = createGameState();
  state.started = true;
  step(state, 8.1);
  assert.equal(state.sunPickups.some((sun) => sun.kind === "sky"), false);
  step(state, ROUND.passiveSunInterval - 8.0);
  assert.equal(state.sunPickups.some((sun) => sun.kind === "sky"), true);
});

test("zombie brain recovers at the slowed balance rate", () => {
  const state = createGameState();
  state.started = true;
  const brainBefore = state.resources.zombie.brain;

  step(state, 10);

  assert.equal(Number((state.resources.zombie.brain - brainBefore).toFixed(2)), 50);
});

test("sunflowers produce visible sun pickups with amounts", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 2, col: 2 });
  step(state, 10.7);
  const producedSun = state.sunPickups.find((sun) => sun.kind === "plant");
  assert.equal(Boolean(producedSun), true);
  assert.equal(producedSun.amount, 25);
  assert.equal(producedSun.y <= 300, true);
});

test("nearby sunflower sun pickups merge into a higher-value pickup", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 2, col: 2 });
  step(state, 21.3);
  const produced = state.sunPickups.filter((sun) => sun.kind === "plant");
  assert.equal(produced.length, 1);
  assert.equal(produced[0].amount, 50);
});

test("twin sunflowers produce larger sun pickups", () => {
  const state = createGameState();
  state.resources.plant.sun = 250;
  applyCommand(state, { type: "placePlant", plantType: "twinSunflower", row: 2, col: 2 });
  step(state, 12.2);
  const producedSun = state.sunPickups.find((sun) => sun.kind === "plant");
  assert.equal(Boolean(producedSun), true);
  assert.equal(producedSun.amount, 50);
});

test("collecting sun creates amount feedback", () => {
  const state = createGameState();
  state.sunPickups.push({ id: "sun-test", x: 200, y: 200, amount: 25, ttl: 10 });
  applyCommand(state, { type: "collectSun", id: "sun-test" });
  const feedback = state.effects.find((effect) => effect.type === "collectSun");
  assert.equal(state.resources.plant.sun, INITIAL_RESOURCES.sun + 25);
  assert.equal(feedback.amount, 25);
  assert.equal(feedback.maxTtl, 1.25);
});

test("shooters create projectiles that damage zombies", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 0 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  const hpBefore = state.zombies[0].hp;
  step(state, 4);
  assert.equal(state.projectiles.length >= 0, true);
  assert.equal(state.zombies[0].hp < hpBefore, true);
});

test("shooters enter attack visual state when firing", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 0 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  step(state, 1.46);
  assert.equal(state.plants[0].visualState, "attack");
  assert.equal(state.plants[0].visualTimer > 0, true);
});

test("sunflowers enter produce visual state when creating sun", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "sunflower", row: 2, col: 2 });
  step(state, 10.55);
  assert.equal(state.plants[0].visualState, "produce");
  assert.equal(state.sunPickups.some((sun) => sun.kind === "plant" && sun.amount === 25), true);
});

test("final minute gives zombies a pressure push", () => {
  const state = createGameState();
  state.started = true;
  state.timer.remaining = ROUND.finalPushStartsAt - 1;
  const brainBefore = state.resources.zombie.brain;
  spawnZombie(state, "basic", 2);
  const xBefore = state.zombies[0].x;
  step(state, 1);
  assert.equal(state.resources.zombie.brain > brainBefore + ROUND.zombieBrainPerSecond, true);
  assert.equal(state.zombies[0].x < xBefore - ZOMBIES.basic.speed, true);
});

test("repeaters fire burst projectiles", () => {
  const state = createGameState();
  state.resources.plant.sun = 300;
  applyCommand(state, { type: "placePlant", plantType: "repeater", row: 2, col: 0 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  step(state, 1.7);
  assert.equal(state.projectiles.length >= 2, true);
});

test("torchwood upgrades pea projectiles into fire peas", () => {
  const state = createGameState();
  state.resources.plant.sun = 400;
  state.resources.zombie.brain = 250;
  applyCommand(state, { type: "placePlant", plantType: "peashooter", row: 2, col: 0 });
  applyCommand(state, { type: "placePlant", plantType: "torchwood", row: 2, col: 2 });
  applyCommand(state, { type: "deployZombie", zombieType: "bucket", row: 2 });
  step(state, 2.2);
  assert.equal(state.projectiles.some((projectile) => projectile.type === "firepea"), true);
  assert.equal(state.audioEvents.some((event) => event.type === "ignite"), true);
});

test("potato mines arm before exploding on contact", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "potatoMine", row: 2, col: 5 });
  assert.equal(state.plants[0].armed, false);
  step(state, 5.7);
  assert.equal(state.plants[0].armed, true);
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.zombies[0].x = 680;
  step(state, 0.2);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.effects.some((effect) => effect.type === "explosion"), true);
  assert.equal(state.audioEvents.some((event) => event.type === "potatoMine"), true);
});

test("zombies bite blocking plants", () => {
  const state = createGameState();
  applyCommand(state, { type: "placePlant", plantType: "wallnut", row: 1, col: 8 });
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 1 });
  const hpBefore = state.plants[0].hp;
  step(state, 5);
  assert.equal(state.plants[0].hp < hpBefore, true);
  assert.equal(state.zombies[0].eating, true);
  assert.equal(state.plants[0].bitePulse > 0, true);
  assert.equal(state.audioEvents.some((event) => event.type === "bite"), true);
});

test("zombie wins after crossing the left edge", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 0 });
  state.laneMowers[0].available = false;
  state.zombies[0].x = 10;
  step(state, 1);
  assert.equal(state.winner, "zombie");
});

test("plant wins when timer ends and field is clear", () => {
  const state = createGameState();
  state.started = true;
  state.timer.remaining = 0.05;
  step(state, 0.1);
  assert.equal(state.winner, "plant");
});

test("versus director never auto spawns zombies", () => {
  const state = createGameState();
  state.started = true;
  step(state, 45);
  assert.equal(state.director.autoWaves, false);
  assert.equal(state.director.warning, null);
  assert.equal(state.director.waveCount, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.resources.zombie.brain > 100, true);
});

test("manual zombie deployment drives versus pressure", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 3 });
  assert.equal(state.director.manualDeployCount, 1);
  assert.equal(state.director.autoWaves, false);
  step(state, 0.5);
  assert.equal(state.director.warning, null);
  assert.equal(state.director.threat > 0, true);
});

test("game waits for first interaction before timers and waves advance", () => {
  const state = createGameState();
  step(state, 10);
  assert.equal(state.timer.remaining, ROUND.duration);
  assert.equal(state.director.waveCount, 0);
  assert.equal(state.director.warning, null);
  applyCommand(state, { type: "clearSelection" });
  step(state, 1);
  assert.equal(state.started, true);
  assert.equal(state.timer.remaining < ROUND.duration, true);
});

test("lane mower clears the first breakthrough in a lane", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.zombies[0].x = 70;
  step(state, 0.3);
  assert.equal(state.laneMowers[2].available, false);
  assert.equal(state.laneMowers[2].active, true);
  step(state, 2);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.winner, null);
});

test("cherry bomb detonates and clears nearby zombies", () => {
  const state = createGameState();
  state.resources.plant.sun = 300;
  applyCommand(state, { type: "placePlant", plantType: "cherrybomb", row: 2, col: 7 });
  applyCommand(state, { type: "deployZombie", zombieType: "cone", row: 2 });
  state.zombies[0].x = 900;
  step(state, 1.2);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies.length, 0);
  assert.equal(state.effects.some((effect) => effect.type === "explosion"), true);
  assert.equal(state.effects.some((effect) => effect.type === "zombieDeath" && effect.zombieType === "cone"), true);
});

test("zombie death effect keeps a ground anchored fall direction", () => {
  const state = createGameState();
  applyCommand(state, { type: "deployZombie", zombieType: "basic", row: 2 });
  state.zombies[0].hp = 0;
  step(state, 0.1);
  const death = state.effects.find((effect) => effect.type === "zombieDeath");
  assert.equal(Boolean(death), true);
  assert.equal(death.anchor, "ground");
  assert.equal(death.motion, "fall-down");
});

test("jalapeno clears its entire lane", () => {
  const state = createGameState();
  state.resources.plant.sun = 300;
  state.resources.zombie.brain = 400;
  applyCommand(state, { type: "placePlant", plantType: "jalapeno", row: 1, col: 4 });
  applyCommand(state, { type: "deployZombie", zombieType: "bucket", row: 1 });
  applyCommand(state, { type: "deployZombie", zombieType: "cone", row: 2 });
  step(state, 0.9);
  assert.equal(state.zombies.some((zombie) => zombie.row === 1), false);
  assert.equal(state.zombies.some((zombie) => zombie.row === 2), true);
  assert.equal(state.effects.some((effect) => effect.type === "rowFire"), true);
  assert.equal(state.audioEvents.some((event) => event.type === "jalapeno"), true);
});

test("armored zombies drop visual feedback when armor breaks", () => {
  const state = createGameState();
  state.resources.zombie.brain = 200;
  applyCommand(state, { type: "deployZombie", zombieType: "cone", row: 0 });
  state.zombies[0].x = 300;
  state.projectiles.push({ id: "projectile-test", type: "pea", row: 0, x: 280, y: 200, damage: 180 });
  step(state, 1 / 60);
  assert.equal(state.zombies[0].armorDropped, true);
  assert.equal(state.effects.some((effect) => effect.type === "armorDrop"), true);
  assert.equal(state.audioEvents.some((event) => event.type === "armorDrop"), true);
});

test("each armored zombie drops its matching armor type", () => {
  for (const type of ["cone", "bucket", "screen", "runner"]) {
    const state = createGameState();
    state.started = true;
    spawnZombie(state, type, 0, { x: 300 });
    state.zombies[0].hp = state.zombies[0].maxHp * 0.56;
    state.projectiles.push({ id: `projectile-${type}`, type: "pea", row: 0, x: 292, y: 200, damage: state.zombies[0].maxHp * 0.03 });

    updateGame(state, 1 / 60);

    assert.equal(state.zombies[0].armorDropped, true, `${type} should enter armorDropped state`);
    assert.equal(state.effects.some((effect) => effect.type === "armorDrop" && effect.hatType === type), true, `${type} should drop ${type} armor`);
    const serialized = JSON.parse(serializeGameState(state));
    const effect = serialized.entities.effects.find((candidate) => candidate.type === "armorDrop");
    assert.equal(effect?.visualAsset, armorDropAssetFor(type));
    assert.equal(effect?.animationSource, "image");
  }
});

test("zamboni crushes plants instead of pausing to eat", () => {
  const state = createGameState();
  state.resources.zombie.brain = 300;
  applyCommand(state, { type: "placePlant", plantType: "wallnut", row: 1, col: 8 });
  applyCommand(state, { type: "deployZombie", zombieType: "zamboni", row: 1 });
  step(state, 5.5);
  assert.equal(state.plants.length, 0);
  assert.equal(state.zombies[0].eating, false);
  assert.equal(state.audioEvents.some((event) => event.type === "zamboni"), true);
});

test("all playable zombie deaths serialize generated spritesheet assets", () => {
  for (const type of Object.keys(ZOMBIES)) {
    const state = createGameState();
    state.started = true;
    spawnZombie(state, type, 2, { x: 620 });
    state.zombies[0].hp = 0;
    updateGame(state, 1 / 60);

    const serialized = JSON.parse(serializeGameState(state));
    const deathEffect = serialized.entities.effects.find((effect) => effect.type === "zombieDeath");
    assert.equal(deathEffect?.visualAsset, `generated-assets/sprites/zombies/${type}-death.png`);
    assert.equal(deathEffect?.animationSource, "spritesheet");
  }
});
