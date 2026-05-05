export const ASSET_PATHS = {
  plantIdle: {
    sunflower: ["assets/图片/植物/向日葵.gif", "assets/植物/向日葵.gif"],
    peashooter: ["assets/图片/植物/豌豆射手.gif", "assets/植物/豌豆射手.gif"],
    wallnut: ["assets/图片/植物/坚果.gif", "assets/植物/坚果.gif"],
    frostshooter: ["assets/图片/植物/寒冰射手.gif", "assets/植物/寒冰射手.gif"],
    cherrybomb: ["assets/图片/植物大战僵尸素材包第二版/植物/樱桃炸弹.gif", "assets/植物大战僵尸素材包第二版/植物/樱桃炸弹.gif"],
  },
  zombieWalk: {
    basic: ["assets/图片/僵尸/普通僵尸走路.gif", "assets/僵尸/普通僵尸走路.gif"],
    imp: ["assets/图片/僵尸/小鬼僵尸.gif", "assets/僵尸/小鬼僵尸.gif"],
    cone: ["assets/图片/僵尸/路障僵尸.gif", "assets/僵尸/路障僵尸.gif"],
    bucket: ["assets/图片/僵尸/铁桶僵尸.gif", "assets/僵尸/铁桶僵尸.gif"],
    runner: ["assets/图片/僵尸/橄榄球僵尸.gif", "assets/僵尸/橄榄球僵尸.gif"],
  },
  zombieEat: {
    basic: ["assets/图片/僵尸/普通僵尸啃食.gif", "assets/僵尸/普通僵尸啃食.gif"],
    imp: ["assets/图片/僵尸/小鬼啃食.gif", "assets/僵尸/小鬼啃食.gif"],
    cone: ["assets/图片/僵尸/路障僵尸啃食.gif", "assets/僵尸/路障僵尸啃食.gif"],
    bucket: ["assets/图片/僵尸/铁桶僵尸啃食.gif", "assets/僵尸/铁桶僵尸啃食.gif"],
    runner: ["assets/图片/僵尸/橄榄球僵尸啃食.gif", "assets/僵尸/橄榄球僵尸啃食.gif"],
  },
  zombieFeedback: {
    head: ["assets/图片/僵尸/头.gif", "assets/僵尸/头.gif"],
    coneHat: ["assets/图片/僵尸/路障僵尸.gif", "assets/僵尸/路障僵尸.gif"],
    bucketHat: ["assets/图片/僵尸/铁桶僵尸.gif", "assets/僵尸/铁桶僵尸.gif"],
    runnerHelmet: ["assets/图片/僵尸/橄榄球僵尸.gif", "assets/僵尸/橄榄球僵尸.gif"],
  },
  projectiles: {
    pea: ["assets/图片/植物/豆.gif", "assets/植物/豆.gif"],
    frost: ["assets/图片/植物/冰豆.gif", "assets/植物/冰豆.gif"],
  },
  ui: {
    sun: ["assets/图片/植物大战僵尸素材包第二版/小部分组件/太阳.gif", "assets/植物大战僵尸素材包第二版/小部分组件/太阳.gif"],
    mower: ["assets/图片/植物大战僵尸素材包第二版/小部分组件/小推车.png", "assets/图片/道具/小推车.png", "assets/道具/小推车.png"],
    shovel: ["assets/图片/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子.png", "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子.png"],
    shop: ["assets/图片/植物大战僵尸素材包第二版/小部分组件/菜单栏/植物商店.png", "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/植物商店.png"],
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
  },
};

const cache = new Map();

export function normalizeAssetList(paths) {
  if (!paths) return [];
  return Array.isArray(paths) ? paths : [paths];
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
    image.src = encodeURI(path);
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

export function drawAsset(ctx, paths, x, y, width, height, options = {}) {
  const asset = getAsset(paths);
  if (!asset?.loaded || asset.failed) return false;

  ctx.save();
  ctx.translate(x, y);
  if (options.flipX) ctx.scale(-1, 1);
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
  ctx.drawImage(asset.image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

export function zombieVisualFor(zombie) {
  const type = zombie?.type ?? "basic";
  const state = zombie?.eating ? "eat" : "walk";
  const visualType = state === "walk" && zombie?.armorDropped && ["cone", "bucket", "runner"].includes(type) ? "basic" : type;
  const paths = state === "eat" ? ASSET_PATHS.zombieEat[visualType] : ASSET_PATHS.zombieWalk[visualType];
  return { state, visualType, paths: normalizeAssetList(paths) };
}
