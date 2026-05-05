export const GRID = {
  rows: 5,
  cols: 9,
  left: 110,
  top: 160,
  cellWidth: 104,
  cellHeight: 86,
  deployLeft: 1060,
};

export const ROUND = {
  duration: 180,
  fixedDt: 1 / 60,
  passiveSunInterval: 10,
  passiveSunAmount: 25,
  zombieRampTime: 60,
};

export const PLANTS = {
  sunflower: { side: "plant", name: "向日葵", cost: 50, cooldown: 5, hp: 180, produceEvery: 8, produceAmount: 25 },
  peashooter: { side: "plant", name: "豌豆射手", cost: 100, cooldown: 6, hp: 260, fireEvery: 1.45, damage: 24, projectile: "pea" },
  wallnut: { side: "plant", name: "坚果墙", cost: 50, cooldown: 12, hp: 1150 },
  frostshooter: { side: "plant", name: "寒冰射手", cost: 175, cooldown: 8, hp: 240, fireEvery: 1.8, damage: 16, projectile: "frost" },
};

export const ZOMBIES = {
  basic: { side: "zombie", name: "普通僵尸", cost: 50, cooldown: 3, hp: 160, speed: 20, biteDps: 42 },
  cone: { side: "zombie", name: "路障僵尸", cost: 100, cooldown: 5, hp: 320, speed: 18, biteDps: 48 },
  bucket: { side: "zombie", name: "铁桶僵尸", cost: 175, cooldown: 7, hp: 620, speed: 15, biteDps: 55 },
  runner: { side: "zombie", name: "冲刺僵尸", cost: 125, cooldown: 6, hp: 210, speed: 36, biteDps: 38 },
};

export const PROJECTILES = {
  pea: { speed: 360, radius: 8, color: "#70d44b", slow: 0 },
  frost: { speed: 320, radius: 8, color: "#8bd9ff", slow: 0.45, slowDuration: 3 },
};

export const INITIAL_RESOURCES = {
  sun: 150,
  brain: 100,
};
