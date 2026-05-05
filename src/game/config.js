export const GRID = {
  rows: 5,
  cols: 9,
  left: 110,
  top: 160,
  cellWidth: 104,
  cellHeight: 86,
  deployLeft: 1060,
};

export const CANVAS = {
  width: 1280,
  height: 720,
};

export const ROUND = {
  duration: 180,
  fixedDt: 1 / 60,
  passiveSunInterval: 8,
  passiveSunAmount: 25,
  zombieRampTime: 60,
  waveEvery: 18,
  waveWarning: 3,
};

export const PLANTS = {
  sunflower: { side: "plant", name: "向日葵", cost: 50, cooldown: 5, hp: 180, produceEvery: 7.5, produceAmount: 25 },
  peashooter: { side: "plant", name: "豌豆射手", cost: 100, cooldown: 6, hp: 260, fireEvery: 1.45, damage: 24, projectile: "pea" },
  wallnut: { side: "plant", name: "坚果墙", cost: 50, cooldown: 12, hp: 1150 },
  frostshooter: { side: "plant", name: "寒冰射手", cost: 175, cooldown: 8, hp: 240, fireEvery: 1.8, damage: 16, projectile: "frost" },
  cherrybomb: { side: "plant", name: "樱桃炸弹", cost: 150, cooldown: 20, hp: 999, explodeAfter: 1.05, blastDamage: 520, blastRadius: 170 },
};

export const ZOMBIES = {
  basic: { side: "zombie", name: "普通僵尸", cost: 50, cooldown: 3, hp: 160, speed: 20, biteDps: 42 },
  imp: { side: "zombie", name: "小鬼僵尸", cost: 60, cooldown: 3.5, hp: 90, speed: 46, biteDps: 30 },
  cone: { side: "zombie", name: "路障僵尸", cost: 100, cooldown: 5, hp: 320, speed: 18, biteDps: 48 },
  bucket: { side: "zombie", name: "铁桶僵尸", cost: 175, cooldown: 7, hp: 620, speed: 15, biteDps: 55 },
  runner: { side: "zombie", name: "冲刺僵尸", cost: 125, cooldown: 6, hp: 210, speed: 34, biteDps: 38, chargeDuration: 1.3, chargeMultiplier: 1.85 },
};

export const PROJECTILES = {
  pea: { speed: 360, radius: 8, color: "#70d44b", slow: 0 },
  frost: { speed: 320, radius: 8, color: "#8bd9ff", slow: 0.45, slowDuration: 3 },
};

export const INITIAL_RESOURCES = {
  sun: 150,
  brain: 100,
};

export const SUN_PICKUP = {
  radius: 26,
  ttl: 16,
};
