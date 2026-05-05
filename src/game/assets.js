export const ASSET_PATHS = {
  plants: {
    sunflower: "assets/植物/向日葵.gif",
    peashooter: "assets/植物/豌豆射手.gif",
    wallnut: "assets/植物/坚果.gif",
    frostshooter: "assets/植物/寒冰射手.gif",
    cherrybomb: "assets/植物大战僵尸素材包第二版/植物/樱桃炸弹.gif",
  },
  zombies: {
    basic: "assets/僵尸/普通僵尸走路.gif",
    imp: "assets/僵尸/小鬼僵尸.gif",
    cone: "assets/僵尸/路障僵尸.gif",
    bucket: "assets/僵尸/铁桶僵尸.gif",
    runner: "assets/僵尸/橄榄球僵尸.gif",
  },
  projectiles: {
    pea: "assets/植物/豆.gif",
    frost: "assets/植物/冰豆.gif",
  },
  ui: {
    sun: "assets/植物大战僵尸素材包第二版/小部分组件/太阳.gif",
    shovel: "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/铲子.png",
    shop: "assets/植物大战僵尸素材包第二版/小部分组件/菜单栏/植物商店.png",
  },
};

const cache = new Map();

export function getAsset(path) {
  if (!path) return null;
  if (cache.has(path)) return cache.get(path);

  const image = new Image();
  image.decoding = "async";
  image.src = encodeURI(path);
  const record = { image, loaded: false, failed: false };
  image.addEventListener("load", () => {
    record.loaded = true;
  });
  image.addEventListener("error", () => {
    record.failed = true;
  });
  cache.set(path, record);
  return record;
}

export function drawAsset(ctx, path, x, y, width, height, options = {}) {
  const asset = getAsset(path);
  if (!asset?.loaded || asset.failed) return false;

  ctx.save();
  ctx.translate(x, y);
  if (options.flipX) ctx.scale(-1, 1);
  if (options.alpha !== undefined) ctx.globalAlpha = options.alpha;
  ctx.drawImage(asset.image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}
