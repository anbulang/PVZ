export const PLAYER_PROFILE_KEY = "pvz-player-profile";
export const DEFAULT_AVATAR_ID = "sunflower";
export const AVATAR_IDS = ["sunflower", "peashooter", "wallnut", "basic", "cone", "bucket"];

export function normalizePlayerProfile(input = {}, now = Date.now()) {
  const trimmedName = String(input.playerName ?? "").trim().slice(0, 18);
  const playerName = trimmedName || `玩家${String(now).slice(-4)}`;
  const avatarId = AVATAR_IDS.includes(input.avatarId) ? input.avatarId : DEFAULT_AVATAR_ID;
  return { playerName, avatarId, lastUpdatedAt: now };
}

export function savePlayerProfile(storage, input, now = Date.now()) {
  const profile = normalizePlayerProfile(input, now);
  storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function loadPlayerProfile(storage) {
  const raw = storage?.getItem(PLAYER_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizePlayerProfile(parsed, parsed.lastUpdatedAt ?? Date.now());
  } catch {
    return null;
  }
}
