import { ASSET_PATHS, normalizeAssetList } from "./assets.js?v=20260512-studio1";

const audioCache = new Map();
const sfxCursor = new Map();
const lastPlayedAt = new Map();

let unlocked = false;
let music = null;
let musicActive = false;
let debug = {
  audioUnlocked: false,
  musicActive: false,
  musicPath: null,
  lastSound: null,
  missing: [],
};

const SOUND_FOR_EVENT = {
  plant: "plant",
  grow: "grow",
  collectSun: "collectSun",
  zombieSpawn: "zombieSpawn",
  bite: "bite",
  hit: "hit",
  armorDrop: "armorDrop",
  explosion: "explosion",
  potatoMine: "potatoMine",
  ignite: "ignite",
  jalapeno: "jalapeno",
  mower: "mower",
  wave: "wave",
  pause: "pause",
  zamboni: "zamboni",
};

const COOLDOWNS = {
  bite: 260,
  hit: 55,
  zombieSpawn: 180,
  armorDrop: 100,
  plant: 80,
  collectSun: 80,
  potatoMine: 160,
  ignite: 80,
  zamboni: 350,
  jalapeno: 180,
};

export function unlockAudio() {
  unlocked = true;
  debug.audioUnlocked = true;
  if (!music) {
    music = createAudio(ASSET_PATHS.music.background, { loop: true, volume: 0.16 });
    debug.musicPath = music?.dataset?.assetPath ?? null;
  }
  if (music && music.paused) {
    music.play()
      .then(() => {
        musicActive = true;
        debug.musicActive = true;
      })
      .catch(() => {
        musicActive = false;
        debug.musicActive = false;
      });
    musicActive = !music.paused;
    debug.musicActive = musicActive;
  }
}

export function processAudioEvents(events) {
  if (!unlocked) {
    events.length = 0;
    return;
  }

  for (const event of events) {
    const key = SOUND_FOR_EVENT[event.type];
    if (!key) continue;
    playSound(key);
  }
  events.length = 0;
}

export function getAudioDebugState() {
  const active = Boolean(music && !music.paused && !music.ended);
  return { ...debug, musicActive: active || musicActive };
}

export function getAudioAssetPaths() {
  return {
    music: ASSET_PATHS.music.background,
    sfx: Object.values(ASSET_PATHS.sfx).flatMap((paths) => normalizeAssetList(paths)),
  };
}

function playSound(key) {
  const now = performance.now();
  const cooldown = COOLDOWNS[key] ?? 0;
  if (now - (lastPlayedAt.get(key) ?? 0) < cooldown) return;
  lastPlayedAt.set(key, now);

  const sound = createAudio(pickSoundPath(key), { loop: false, volume: key === "bite" ? 0.55 : 0.65 });
  if (!sound) return;

  const instance = sound.cloneNode();
  instance.volume = sound.volume;
  instance.play().catch(() => {});
  debug.lastSound = key;
}

function pickSoundPath(key) {
  const paths = normalizeAssetList(ASSET_PATHS.sfx[key]);
  const cursor = sfxCursor.get(key) ?? 0;
  sfxCursor.set(key, cursor + 1);
  return paths[cursor % paths.length];
}

function createAudio(paths, options) {
  for (const path of normalizeAssetList(paths)) {
    if (audioCache.has(path)) return audioCache.get(path);
    const audio = new Audio(encodeURI(path));
    audio.dataset.assetPath = path;
    audio.preload = "auto";
    audio.loop = Boolean(options.loop);
    audio.volume = options.volume ?? 0.6;
    audio.addEventListener("error", () => {
      if (!debug.missing.includes(path)) debug.missing.push(path);
    }, { once: true });
    audioCache.set(path, audio);
    return audio;
  }
  return null;
}
