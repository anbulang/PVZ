import { ASSET_PATHS, normalizeAssetList } from "./assets.js?v=20260519-tempo1";

const audioCache = new Map();
const sfxCursor = new Map();
const lastPlayedAt = new Map();

let unlocked = false;
let music = null;
let musicScene = null;
let musicActive = false;
let debug = {
  audioUnlocked: false,
  musicActive: false,
  musicScene: null,
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

export function unlockAudio(state = null) {
  unlocked = true;
  debug.audioUnlocked = true;
  syncMusic(state);
}

export function processAudioEvents(events, state = null) {
  if (!unlocked) {
    events.length = 0;
    return;
  }

  syncMusic(state);
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
    music: uniquePaths(Object.values(ASSET_PATHS.music).flatMap((paths) => normalizeAssetList(paths))),
    sfx: Object.values(ASSET_PATHS.sfx).flatMap((paths) => normalizeAssetList(paths)),
  };
}

export function musicSceneForState(state) {
  return state?.started ? "dayLawn" : "ready";
}

function syncMusic(state) {
  const nextScene = musicSceneForState(state);
  if (!music || musicScene !== nextScene) {
    if (music) {
      music.pause();
      try {
        music.currentTime = 0;
      } catch {}
    }
    musicScene = nextScene;
    music = createAudio(ASSET_PATHS.music[nextScene], { loop: true, volume: nextScene === "ready" ? 0.18 : 0.16 });
    debug.musicScene = nextScene;
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

function uniquePaths(paths) {
  return [...new Set(paths)];
}
