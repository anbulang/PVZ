const GENERATED = "generated-assets";
const ASSET_VERSION = "20260513-layout5";

const spriteSpec = (src, frameWidth, frameHeight, frames, fps, loop = true, anchor = { x: 0.5, y: 0.9 }) => ({
  src,
  frameWidth,
  frameHeight,
  frames,
  fps,
  loop,
  anchor,
});

const plantSprite = (type, state, frames, fps, loop = true) => spriteSpec(
  `${GENERATED}/sprites/plants/${type}-${state}.png`,
  96,
  96,
  frames,
  fps,
  loop,
  { x: 0.5, y: 0.88 },
);

const zombieSprite = (type, state, frames, fps, loop = true) => spriteSpec(
  `${GENERATED}/sprites/zombies/${type}-${state}.png`,
  112,
  128,
  frames,
  fps,
  loop,
  { x: 0.5, y: 0.9 },
);

export const GENERATED_ASSET_PATHS = {
  scene: {
    day: `${GENERATED}/scene/day-lawn.png`,
    houseLeft: `${GENERATED}/scene/house-left.png`,
  },
  ui: {
    cardFrame: `${GENERATED}/ui/card-frame.png`,
    cardSelected: `${GENERATED}/ui/card-selected.png`,
    cardDisabled: `${GENERATED}/ui/card-disabled.png`,
    plantPanel: `${GENERATED}/ui/panel-plants.png`,
    zombiePanel: `${GENERATED}/ui/panel-zombies.png`,
    resourceSun: `${GENERATED}/ui/resource-sun.png`,
    resourceBrain: `${GENERATED}/ui/resource-brain.png`,
    timerPanel: `${GENERATED}/ui/timer-panel.png`,
    statusPanel: `${GENERATED}/ui/status-panel.png`,
    overlayPanel: `${GENERATED}/ui/overlay-panel.png`,
    progressEmpty: `${GENERATED}/ui/progress-empty.png`,
    progressFull: `${GENERATED}/ui/progress-full.png`,
    shovel: `${GENERATED}/ui/shovel.png`,
    mower: `${GENERATED}/ui/mower-padded.png`,
    sun: `${GENERATED}/ui/sun-original-padded.gif`,
  },
  projectiles: {
    pea: `${GENERATED}/projectiles/pea.png`,
    firepea: `${GENERATED}/projectiles/firepea.png`,
    frost: `${GENERATED}/projectiles/frost.png`,
  },
  fx: {
    hit: `${GENERATED}/fx/hit.png`,
    ignite: `${GENERATED}/fx/ignite.png`,
    explosion: `${GENERATED}/fx/explosion.png`,
    rowFire: `${GENERATED}/fx/row-fire.png`,
    armorCone: `${GENERATED}/fx/armor-cone.png`,
    armorBucket: `${GENERATED}/fx/armor-bucket.png`,
    armorScreen: `${GENERATED}/fx/armor-screen.png`,
    armorRunner: `${GENERATED}/fx/armor-runner.png`,
  },
};

export const SPRITESHEET_MANIFEST = {
  plants: {
    sunflower: {
      idle: plantSprite("sunflower", "idle", 4, 5),
      produce: plantSprite("sunflower", "produce", 6, 10, false),
      damaged: plantSprite("sunflower", "damaged", 4, 12, false),
    },
    peashooter: {
      idle: plantSprite("peashooter", "idle", 4, 5),
      attack: plantSprite("peashooter", "attack", 6, 14, false),
      damaged: plantSprite("peashooter", "damaged", 4, 12, false),
    },
    repeater: {
      idle: plantSprite("repeater", "idle", 4, 5),
      attack: plantSprite("repeater", "attack", 6, 14, false),
      damaged: plantSprite("repeater", "damaged", 4, 12, false),
    },
    wallnut: {
      idle: plantSprite("wallnut", "idle", 4, 4),
      damaged: plantSprite("wallnut", "damaged", 4, 12, false),
    },
    frostshooter: {
      idle: plantSprite("frostshooter", "idle", 4, 5),
      attack: plantSprite("frostshooter", "attack", 6, 13, false),
      damaged: plantSprite("frostshooter", "damaged", 4, 12, false),
    },
    twinSunflower: {
      idle: plantSprite("twinSunflower", "idle", 4, 5),
      produce: plantSprite("twinSunflower", "produce", 6, 10, false),
      damaged: plantSprite("twinSunflower", "damaged", 4, 12, false),
    },
    torchwood: {
      idle: plantSprite("torchwood", "idle", 4, 7),
      attack: plantSprite("torchwood", "attack", 6, 12, false),
      damaged: plantSprite("torchwood", "damaged", 4, 12, false),
    },
    potatoMine: {
      buried: plantSprite("potatoMine", "buried", 4, 4),
      armed: plantSprite("potatoMine", "armed", 4, 5),
      damaged: plantSprite("potatoMine", "damaged", 4, 12, false),
      death: plantSprite("potatoMine", "death", 7, 14, false),
    },
    jalapeno: {
      idle: plantSprite("jalapeno", "idle", 4, 5),
      activate: plantSprite("jalapeno", "activate", 6, 12, false),
      damaged: plantSprite("jalapeno", "damaged", 4, 12, false),
    },
    cherrybomb: {
      idle: plantSprite("cherrybomb", "idle", 4, 5),
      activate: plantSprite("cherrybomb", "activate", 6, 12, false),
      damaged: plantSprite("cherrybomb", "damaged", 4, 12, false),
    },
  },
  zombies: {
    basic: {
      walk: zombieSprite("basic", "walk", 6, 8),
      eat: zombieSprite("basic", "eat", 6, 8),
      death: zombieSprite("basic", "death", 8, 12, false),
    },
    imp: {
      walk: zombieSprite("imp", "walk", 6, 10),
      eat: zombieSprite("imp", "eat", 6, 9),
      death: zombieSprite("imp", "death", 8, 12, false),
    },
    flag: {
      walk: zombieSprite("flag", "walk", 6, 8),
      eat: zombieSprite("flag", "eat", 6, 8),
      death: zombieSprite("flag", "death", 8, 12, false),
    },
    cone: {
      walk: zombieSprite("cone", "walk", 6, 7),
      eat: zombieSprite("cone", "eat", 6, 8),
      death: zombieSprite("cone", "death", 8, 12, false),
    },
    screen: {
      walk: zombieSprite("screen", "walk", 6, 7),
      eat: zombieSprite("screen", "eat", 6, 8),
      death: zombieSprite("screen", "death", 8, 12, false),
    },
    bucket: {
      walk: zombieSprite("bucket", "walk", 6, 7),
      eat: zombieSprite("bucket", "eat", 6, 8),
      death: zombieSprite("bucket", "death", 8, 12, false),
    },
    zamboni: {
      drive: zombieSprite("zamboni", "drive", 6, 9),
      death: zombieSprite("zamboni", "death", 8, 12, false),
    },
    runner: {
      walk: zombieSprite("runner", "walk", 6, 10),
      eat: zombieSprite("runner", "eat", 6, 9),
      death: zombieSprite("runner", "death", 8, 12, false),
    },
  },
  fx: {
    explosion: spriteSpec(GENERATED_ASSET_PATHS.fx.explosion, 96, 96, 8, 14, false, { x: 0.5, y: 0.5 }),
    rowFire: spriteSpec(GENERATED_ASSET_PATHS.fx.rowFire, 128, 64, 6, 12, true, { x: 0.5, y: 0.5 }),
  },
};

export const ASSET_PATHS = {
  scene: {
    day: [
      GENERATED_ASSET_PATHS.scene.day,
      "assets/图片/植物大战僵尸素材包第二版/场景/白天.jpg",
      "assets/图片/更多……/background1unsodded.jpg",
      "assets/图片/更多……/background1unsodded2.jpg",
    ],
    houseLeft: [
      GENERATED_ASSET_PATHS.scene.houseLeft,
    ],
  },
  plantIdle: {
    sunflower: [SPRITESHEET_MANIFEST.plants.sunflower.idle.src, "assets/图片/植物/向日葵.gif", "assets/植物/向日葵.gif"],
    peashooter: [SPRITESHEET_MANIFEST.plants.peashooter.idle.src, "assets/图片/植物/豌豆射手.gif", "assets/植物/豌豆射手.gif"],
    repeater: [SPRITESHEET_MANIFEST.plants.repeater.idle.src, "assets/图片/植物/双重射手.gif"],
    wallnut: [SPRITESHEET_MANIFEST.plants.wallnut.idle.src, "assets/图片/植物/坚果.gif", "assets/植物/坚果.gif"],
    frostshooter: [SPRITESHEET_MANIFEST.plants.frostshooter.idle.src, "assets/图片/植物/寒冰射手.gif", "assets/植物/寒冰射手.gif"],
    twinSunflower: [SPRITESHEET_MANIFEST.plants.twinSunflower.idle.src, "assets/图片/植物/双胞向日葵.gif"],
    torchwood: [SPRITESHEET_MANIFEST.plants.torchwood.idle.src, "assets/图片/植物/火炬树桩.gif"],
    potatoMine: [SPRITESHEET_MANIFEST.plants.potatoMine.buried.src, "assets/图片/植物/在地下.gif", "assets/图片/植物/土豆地雷.gif"],
    jalapeno: [SPRITESHEET_MANIFEST.plants.jalapeno.idle.src, "assets/图片/植物/火爆辣椒·.gif"],
    cherrybomb: [SPRITESHEET_MANIFEST.plants.cherrybomb.idle.src, "assets/图片/植物大战僵尸素材包第二版/植物/樱桃炸弹.gif", "assets/植物大战僵尸素材包第二版/植物/樱桃炸弹.gif"],
  },
  plantArmed: {
    potatoMine: [SPRITESHEET_MANIFEST.plants.potatoMine.armed.src, "assets/图片/植物/土豆地雷.gif"],
  },
  plantDeath: {
    potatoMine: [SPRITESHEET_MANIFEST.plants.potatoMine.death.src, "assets/图片/植物/土豆泥.gif"],
  },
  zombieWalk: {
    basic: [SPRITESHEET_MANIFEST.zombies.basic.walk.src, "assets/图片/僵尸/普通僵尸走路.gif", "assets/僵尸/普通僵尸走路.gif"],
    imp: [SPRITESHEET_MANIFEST.zombies.imp.walk.src, "assets/图片/僵尸/小鬼僵尸.gif", "assets/僵尸/小鬼僵尸.gif"],
    flag: [SPRITESHEET_MANIFEST.zombies.flag.walk.src, "assets/图片/僵尸/旗帜僵尸.gif"],
    cone: [SPRITESHEET_MANIFEST.zombies.cone.walk.src, "assets/图片/僵尸/路障僵尸.gif", "assets/僵尸/路障僵尸.gif"],
    screen: [SPRITESHEET_MANIFEST.zombies.screen.walk.src, "assets/图片/僵尸/铁门僵尸.gif"],
    bucket: [SPRITESHEET_MANIFEST.zombies.bucket.walk.src, "assets/图片/僵尸/铁桶僵尸.gif", "assets/僵尸/铁桶僵尸.gif"],
    zamboni: [SPRITESHEET_MANIFEST.zombies.zamboni.drive.src, "assets/图片/僵尸/冰车僵尸.gif"],
    runner: [SPRITESHEET_MANIFEST.zombies.runner.walk.src, "assets/图片/僵尸/橄榄球僵尸.gif", "assets/僵尸/橄榄球僵尸.gif"],
  },
  zombieEat: {
    basic: [SPRITESHEET_MANIFEST.zombies.basic.eat.src, "assets/图片/僵尸/普通僵尸啃食.gif", "assets/僵尸/普通僵尸啃食.gif"],
    imp: [SPRITESHEET_MANIFEST.zombies.imp.eat.src, "assets/图片/僵尸/小鬼啃食.gif", "assets/僵尸/小鬼啃食.gif"],
    flag: [SPRITESHEET_MANIFEST.zombies.flag.eat.src, "assets/图片/僵尸/旗帜僵尸啃食.gif"],
    cone: [SPRITESHEET_MANIFEST.zombies.cone.eat.src, "assets/图片/僵尸/路障僵尸啃食.gif", "assets/僵尸/路障僵尸啃食.gif"],
    screen: [SPRITESHEET_MANIFEST.zombies.screen.eat.src, "assets/图片/僵尸/铁门僵尸啃食.gif"],
    bucket: [SPRITESHEET_MANIFEST.zombies.bucket.eat.src, "assets/图片/僵尸/铁桶僵尸啃食.gif", "assets/僵尸/铁桶僵尸啃食.gif"],
    zamboni: [SPRITESHEET_MANIFEST.zombies.zamboni.drive.src, "assets/图片/僵尸/冰车僵尸.gif"],
    runner: [SPRITESHEET_MANIFEST.zombies.runner.eat.src, "assets/图片/僵尸/橄榄球僵尸啃食.gif", "assets/僵尸/橄榄球僵尸啃食.gif"],
  },
  zombieDeath: {
    basic: [SPRITESHEET_MANIFEST.zombies.basic.death.src],
    imp: [SPRITESHEET_MANIFEST.zombies.imp.death.src],
    flag: [SPRITESHEET_MANIFEST.zombies.flag.death.src],
    cone: [SPRITESHEET_MANIFEST.zombies.cone.death.src],
    screen: [SPRITESHEET_MANIFEST.zombies.screen.death.src],
    bucket: [SPRITESHEET_MANIFEST.zombies.bucket.death.src],
    zamboni: [SPRITESHEET_MANIFEST.zombies.zamboni.death.src],
    runner: [SPRITESHEET_MANIFEST.zombies.runner.death.src],
  },
  zombieFeedback: {
    head: ["assets/图片/僵尸/头.gif", "assets/僵尸/头.gif"],
    coneHat: ["assets/图片/僵尸/路障僵尸.gif", "assets/僵尸/路障僵尸.gif"],
    bucketHat: ["assets/图片/僵尸/铁桶僵尸.gif", "assets/僵尸/铁桶僵尸.gif"],
    screenDoor: ["assets/图片/僵尸/铁门僵尸.gif"],
    runnerHelmet: ["assets/图片/僵尸/橄榄球僵尸.gif", "assets/僵尸/橄榄球僵尸.gif"],
  },
  projectiles: {
    pea: [GENERATED_ASSET_PATHS.projectiles.pea, "assets/图片/植物/豆.gif", "assets/植物/豆.gif"],
    firepea: [GENERATED_ASSET_PATHS.projectiles.firepea, "assets/图片/植物/火豆.gif"],
    frost: [GENERATED_ASSET_PATHS.projectiles.frost, "assets/图片/植物/冰豆.gif", "assets/植物/冰豆.gif"],
  },
  ui: {
    sun: [GENERATED_ASSET_PATHS.ui.sun, "assets/图片/植物大战僵尸素材包第二版/小部分组件/太阳.gif", "assets/植物大战僵尸素材包第二版/小部分组件/太阳.gif"],
    mower: [GENERATED_ASSET_PATHS.ui.mower, "assets/图片/植物大战僵尸素材包第二版/小部分组件/小推车.png", "assets/图片/道具/小推车.png", "assets/道具/小推车.png"],
    shovel: [GENERATED_ASSET_PATHS.ui.shovel, "assets/图片/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子.png", "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子.png"],
    shovelSlot: [GENERATED_ASSET_PATHS.ui.cardFrame, "assets/图片/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子槽.png", "assets/图片/道具/铲子槽.png"],
    shop: [GENERATED_ASSET_PATHS.ui.plantPanel, "assets/图片/植物大战僵尸素材包第二版/小部分组件/菜单栏/植物商店.png", "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/植物商店.png"],
    seedChooser: [GENERATED_ASSET_PATHS.ui.zombiePanel, "assets/图片/更多……/SeedChooser_Background.png"],
    sunCounter: [GENERATED_ASSET_PATHS.ui.resourceSun, "assets/图片/植物大战僵尸素材包第二版/小部分组件/阳关计数.png", "assets/图片/道具/阳关计数.png"],
    brainCounter: [GENERATED_ASSET_PATHS.ui.resourceBrain],
    cardFrame: [GENERATED_ASSET_PATHS.ui.cardFrame],
    cardSelected: [GENERATED_ASSET_PATHS.ui.cardSelected],
    cardDisabled: [GENERATED_ASSET_PATHS.ui.cardDisabled],
    timerPanel: [GENERATED_ASSET_PATHS.ui.timerPanel],
    statusPanel: [GENERATED_ASSET_PATHS.ui.statusPanel],
    overlayPanel: [GENERATED_ASSET_PATHS.ui.overlayPanel],
    flagMeterEmpty: [GENERATED_ASSET_PATHS.ui.progressEmpty, "assets/图片/更多……/FlagMeterEmpty.png", "assets/图片/植物大战僵尸素材包第二版/小部分组件/进度/FlagMeterEmpty.png"],
    flagMeterFull: [GENERATED_ASSET_PATHS.ui.progressFull, "assets/图片/更多……/FlagMeterFull.png", "assets/图片/植物大战僵尸素材包第二版/小部分组件/进度/FlagMeterFull.png"],
    flagMeterProgress: ["assets/图片/更多……/FlagMeterLevelProgress.png", "assets/图片/植物大战僵尸素材包第二版/小部分组件/进度/FlagMeterLevelProgress.png"],
    flagMeterPart1: ["assets/图片/更多……/FlagMeterParts1.png", "assets/图片/植物大战僵尸素材包第二版/小部分组件/进度/FlagMeterParts1.png"],
    flagMeterPart2: ["assets/图片/更多……/FlagMeterParts2.png", "assets/图片/植物大战僵尸素材包第二版/小部分组件/关卡/FlagMeterParts2.png"],
    largeWave: ["assets/图片/更多……/LargeWave.gif"],
    finalWave: ["assets/图片/更多……/FinalWave.gif", "assets/图片/植物大战僵尸素材包第二版/小部分组件/准备开始/最后一波.gif"],
    shadow: ["assets/图片/植物大战僵尸素材包第二版/小部分组件/影子.png", "assets/图片/更多……/plantshadow32.png"],
  },
  music: {
    background: ["assets/音效/ZombiesOnYourLawn.ogg"],
  },
  sfx: {
    plant: ["assets/音效/plant.ogg", "assets/音效/plant2.ogg"],
    grow: ["assets/音效/plantgrow.ogg", "assets/音效/chime.ogg"],
    collectSun: ["assets/音效/points.ogg", "assets/音效/chime.ogg"],
    zombieSpawn: ["assets/音效/groan.ogg", "assets/音效/groan2.ogg", "assets/音效/lowgroan.ogg"],
    bite: ["assets/音效/chomp.ogg", "assets/音效/chomp2.ogg", "assets/音效/chompsoft.ogg"],
    hit: ["assets/音效/splat.ogg", "assets/音效/splat2.ogg", "assets/音效/plastichit.ogg"],
    armorDrop: ["assets/音效/ceramic.ogg", "assets/音效/shieldhit.ogg"],
    explosion: ["assets/音效/cherrybomb.ogg", "assets/音效/explosion.ogg"],
    mower: ["assets/音效/lawnmower.ogg"],
    wave: ["assets/音效/awooga.ogg", "assets/音效/hugewave.ogg"],
    pause: ["assets/音效/pause.ogg"],
    potatoMine: ["assets/音效/potato_mine.ogg"],
    ignite: ["assets/音效/ignite.ogg", "assets/音效/firepea.ogg"],
    zamboni: ["assets/音效/zamboni.ogg"],
    jalapeno: ["assets/音效/jalapeno.ogg"],
  },
};

export const ASSET_MANIFEST = {
  scene: {
    day: { state: "idle", paths: ASSET_PATHS.scene.day },
    houseLeft: { state: "idle", paths: ASSET_PATHS.scene.houseLeft },
  },
  plants: Object.fromEntries(Object.entries(ASSET_PATHS.plantIdle).map(([type, paths]) => [
    type,
    {
      idle: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.idle ?? SPRITESHEET_MANIFEST.plants[type]?.buried ?? null },
      attack: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.attack ?? null },
      produce: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.produce ?? null },
      activate: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.activate ?? null },
      buried: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.buried ?? null },
      armed: { paths: ASSET_PATHS.plantArmed[type] ?? paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.armed ?? SPRITESHEET_MANIFEST.plants[type]?.idle ?? null },
      damaged: { paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.damaged ?? null },
      death: { paths: ASSET_PATHS.plantDeath[type] ?? paths, sprite: SPRITESHEET_MANIFEST.plants[type]?.death ?? null },
      sfx: {},
    },
  ])),
  zombies: Object.fromEntries(Object.keys(ASSET_PATHS.zombieWalk).map((type) => [
    type,
    {
      walk: { paths: ASSET_PATHS.zombieWalk[type], sprite: SPRITESHEET_MANIFEST.zombies[type]?.walk ?? null },
      eat: { paths: ASSET_PATHS.zombieEat[type], sprite: SPRITESHEET_MANIFEST.zombies[type]?.eat ?? null },
      drive: { paths: ASSET_PATHS.zombieWalk[type], sprite: SPRITESHEET_MANIFEST.zombies[type]?.drive ?? null },
      death: { paths: ASSET_PATHS.zombieDeath[type], sprite: SPRITESHEET_MANIFEST.zombies[type]?.death ?? null },
      sfx: {},
    },
  ])),
  projectiles: Object.fromEntries(Object.entries(ASSET_PATHS.projectiles).map(([type, paths]) => [type, { fly: { paths } }])),
  ui: {
    cardFrame: { paths: ASSET_PATHS.ui.cardFrame },
    cardSelected: { paths: ASSET_PATHS.ui.cardSelected },
    cardDisabled: { paths: ASSET_PATHS.ui.cardDisabled },
    shop: { paths: ASSET_PATHS.ui.shop },
    seedChooser: { paths: ASSET_PATHS.ui.seedChooser },
    sunCounter: { paths: ASSET_PATHS.ui.sunCounter },
    brainCounter: { paths: ASSET_PATHS.ui.brainCounter },
    timerPanel: { paths: ASSET_PATHS.ui.timerPanel },
    statusPanel: { paths: ASSET_PATHS.ui.statusPanel },
    overlayPanel: { paths: ASSET_PATHS.ui.overlayPanel },
    shovelSlot: { paths: ASSET_PATHS.ui.shovelSlot },
    flagMeter: {
      empty: { paths: ASSET_PATHS.ui.flagMeterEmpty },
      full: { paths: ASSET_PATHS.ui.flagMeterFull },
      progress: { paths: ASSET_PATHS.ui.flagMeterProgress },
    },
  },
  audio: {
    music: ASSET_PATHS.music,
    sfx: ASSET_PATHS.sfx,
  },
};

const cache = new Map();
const stateCache = new Map();

export function normalizeAssetList(paths) {
  if (!paths) return [];
  return Array.isArray(paths) ? paths : [paths];
}

function assetUrl(path) {
  return path.startsWith(GENERATED) ? `${path}?v=${ASSET_VERSION}` : path;
}

export function getAsset(paths) {
  for (const path of normalizeAssetList(paths)) {
    if (cache.has(path)) {
      const record = cache.get(path);
      if (record.loaded) return record;
      if (!record.failed) return record;
      continue;
    }

    const image = new Image();
    image.decoding = "async";
    image.src = encodeURI(assetUrl(path));
    const record = { image, path, loaded: false, failed: false };
    image.addEventListener("load", () => {
      record.loaded = true;
    });
    image.addEventListener("error", () => {
      record.failed = true;
    });
    cache.set(path, record);
    return record;
  }
  return null;
}

export function getStateAsset(paths, stateKey) {
  const normalized = normalizeAssetList(paths);
  for (const path of normalized) {
    const key = `${stateKey}:${path}`;
    if (stateCache.has(key)) {
      const record = stateCache.get(key);
      if (record.loaded) return record;
      if (!record.failed) return record;
      continue;
    }

    const image = new Image();
    image.decoding = "async";
    image.src = encodeURI(assetUrl(path));
    const record = { image, path, loaded: false, failed: false, stateKey };
    image.addEventListener("load", () => {
      record.loaded = true;
    });
    image.addEventListener("error", () => {
      record.failed = true;
    });
    stateCache.set(key, record);
    return record;
  }
  return null;
}

export function drawAsset(ctx, paths, x, y, width, height, options = {}) {
  const asset = options.stateKey ? getStateAsset(paths, options.stateKey) : getAsset(paths);
  if (!asset?.loaded || asset.failed) return false;

  ctx.save();
  ctx.translate(x, y);
  if (options.flipX) ctx.scale(-1, 1);
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
  ctx.drawImage(asset.image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

export function drawSpritesheet(ctx, spec, x, y, width, height, options = {}) {
  if (!spec) return false;
  const asset = getAsset(spec.src);
  if (!asset?.loaded || asset.failed) return false;

  const frame = spriteFrameIndex(spec, options.time ?? 0, options.seed ?? 0, options.progress);
  const anchor = options.anchor ?? spec.anchor ?? { x: 0.5, y: 0.5 };
  ctx.save();
  ctx.translate(x, y);
  if (options.flipX) ctx.scale(-1, 1);
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
  ctx.drawImage(
    asset.image,
    frame * spec.frameWidth,
    0,
    spec.frameWidth,
    spec.frameHeight,
    -width * anchor.x,
    -height * anchor.y,
    width,
    height,
  );
  ctx.restore();
  return true;
}

export function spriteFrameIndex(spec, time = 0, seed = 0, progress = undefined) {
  if (!spec?.frames) return 0;
  if (!spec.loop && progress !== undefined) {
    return Math.max(0, Math.min(spec.frames - 1, Math.floor(progress * spec.frames)));
  }
  return Math.floor(time * spec.fps + seed) % spec.frames;
}

export function primaryAssetPath(paths) {
  return normalizeAssetList(paths)[0] ?? null;
}

export function primaryVisualPath(visual) {
  return visual?.sprite?.src ?? visual?.paths?.[0] ?? null;
}

export function armorDropAssetFor(type) {
  if (type === "bucket") return GENERATED_ASSET_PATHS.fx.armorBucket;
  if (type === "screen") return GENERATED_ASSET_PATHS.fx.armorScreen;
  if (type === "runner") return GENERATED_ASSET_PATHS.fx.armorRunner;
  return GENERATED_ASSET_PATHS.fx.armorCone;
}

export function plantVisualFor(plant) {
  const type = typeof plant === "string" ? plant : plant?.type ?? "sunflower";
  let state = "idle";
  if (type === "potatoMine") state = plant?.armed ? "armed" : "buried";
  if (plant?.visualTimer > 0 && plant.visualState) state = plant.visualState;
  if (plant?.bitePulse > 0) state = "damaged";
  const sprite = SPRITESHEET_MANIFEST.plants[type]?.[state]
    ?? SPRITESHEET_MANIFEST.plants[type]?.idle
    ?? SPRITESHEET_MANIFEST.plants[type]?.armed
    ?? SPRITESHEET_MANIFEST.plants[type]?.buried
    ?? null;
  const paths = state === "armed" && ASSET_PATHS.plantArmed[type]
    ? ASSET_PATHS.plantArmed[type]
    : state === "death" && ASSET_PATHS.plantDeath[type]
      ? ASSET_PATHS.plantDeath[type]
      : ASSET_PATHS.plantIdle[type];
  return {
    state,
    visualType: type,
    sprite,
    paths: normalizeAssetList(paths),
    animationSource: sprite ? "spritesheet" : "image",
  };
}

export function zombieVisualFor(zombie) {
  const type = zombie?.type ?? "basic";
  const state = type === "zamboni" ? "drive" : zombie?.eating ? "eat" : "walk";
  const paths = state === "eat" ? ASSET_PATHS.zombieEat[type] : ASSET_PATHS.zombieWalk[type];
  const sprite = SPRITESHEET_MANIFEST.zombies[type]?.[state] ?? null;
  return {
    state,
    visualType: type,
    sprite,
    paths: normalizeAssetList(paths),
    animationSource: sprite ? "spritesheet" : "gif",
  };
}
