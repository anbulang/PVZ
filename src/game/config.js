export const GRID = {
  rows: 5,
  cols: 9,
  left: 136,
  top: 160,
  cellWidth: 100,
  cellHeight: 86,
  deployLeft: 1044,
  deployWidth: 126,
};

export const CANVAS = {
  width: 1280,
  height: 720,
};

export const ROUND = {
  duration: 180,
  fixedDt: 1 / 60,
  passiveSunInterval: 10,
  passiveSunAmount: 25,
  zombieRampTime: 60,
  zombieBrainPerSecond: 6,
  maxZombieBrain: 600,
  zombieComboWindow: 7,
  zombieComboBrainRefund: 12,
  zombieComboMax: 3,
  waveEvery: 18,
  waveWarning: 3,
};

export const PLANTS = {
  sunflower: { side: "plant", name: "向日葵", cost: 50, cooldown: 5, hp: 180, produceEvery: 9, produceAmount: 25 },
  peashooter: { side: "plant", name: "豌豆射手", cost: 100, cooldown: 6, hp: 260, fireEvery: 1.45, damage: 20, projectile: "pea" },
  repeater: { side: "plant", name: "双重射手", cost: 200, cooldown: 8, hp: 260, fireEvery: 1.55, damage: 18, projectile: "pea", burstCount: 2 },
  wallnut: { side: "plant", name: "坚果墙", cost: 50, cooldown: 12, hp: 1050 },
  frostshooter: { side: "plant", name: "寒冰射手", cost: 175, cooldown: 8, hp: 240, fireEvery: 1.8, damage: 14, projectile: "frost" },
  twinSunflower: { side: "plant", name: "双胞向日葵", cost: 150, cooldown: 9, hp: 220, produceEvery: 10, produceAmount: 50 },
  torchwood: { side: "plant", name: "火炬树桩", cost: 175, cooldown: 9, hp: 420, torchwood: true },
  potatoMine: { side: "plant", name: "土豆地雷", cost: 25, cooldown: 12, hp: 120, armTime: 5.5, blastDamage: 620, blastRadius: 72 },
  jalapeno: { side: "plant", name: "火爆辣椒", cost: 125, cooldown: 18, hp: 999, explodeAfter: 0.8, blastDamage: 700, rowBlast: true },
  cherrybomb: { side: "plant", name: "樱桃炸弹", cost: 150, cooldown: 20, hp: 999, explodeAfter: 1.05, blastDamage: 520, blastRadius: 170 },
};

export const ZOMBIES = {
  basic: { side: "zombie", name: "普通僵尸", cost: 50, cooldown: 3, hp: 160, speed: 20, biteDps: 42 },
  imp: { side: "zombie", name: "小鬼僵尸", cost: 40, cooldown: 3.5, hp: 90, speed: 46, biteDps: 30 },
  flag: { side: "zombie", name: "旗帜僵尸", cost: 80, cooldown: 4, hp: 180, speed: 28, biteDps: 42 },
  cone: { side: "zombie", name: "路障僵尸", cost: 100, cooldown: 5, hp: 320, speed: 18, biteDps: 48 },
  screen: { side: "zombie", name: "铁门僵尸", cost: 150, cooldown: 6.5, hp: 520, speed: 16, biteDps: 46 },
  bucket: { side: "zombie", name: "铁桶僵尸", cost: 175, cooldown: 7, hp: 620, speed: 15, biteDps: 55 },
  zamboni: { side: "zombie", name: "冰车僵尸", cost: 220, cooldown: 13, hp: 760, speed: 24, biteDps: 160, crushPlant: true },
  runner: { side: "zombie", name: "冲刺僵尸", cost: 125, cooldown: 6, hp: 210, speed: 34, biteDps: 38, chargeDuration: 1.3, chargeMultiplier: 1.85 },
};

export const PROJECTILES = {
  pea: { speed: 360, radius: 8, color: "#70d44b", slow: 0 },
  firepea: { speed: 390, radius: 10, color: "#ff7a28", slow: 0 },
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
