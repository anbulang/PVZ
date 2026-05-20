const AudioContextClass = window.AudioContext || window.webkitAudioContext;

let audioContext = null;
let masterGain = null;
let musicTimer = null;
let enabled = false;

export function unlockAudio() {
  if (!AudioContextClass) return;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") audioContext.resume();
  if (!enabled) {
    enabled = true;
    startMusic();
  }
}

export function processAudioEvents(events) {
  if (!enabled || !audioContext) {
    events.length = 0;
    return;
  }
  for (const event of events) {
    if (event.type === "plant") playPluck(340, 0.08);
    if (event.type === "collectSun") playChime();
    if (event.type === "zombieSpawn") playThud(95, 0.12);
    if (event.type === "bite") playBite();
    if (event.type === "hit") playTick();
    if (event.type === "armorDrop") playClank();
    if (event.type === "explosion") playExplosion();
    if (event.type === "mower") playMower();
    if (event.type === "wave") playWarning();
  }
  events.length = 0;
}

function startMusic() {
  if (musicTimer) return;
  const notes = [196, 247, 262, 294, 247, 220, 196, 165];
  let index = 0;
  musicTimer = window.setInterval(() => {
    if (!enabled || !audioContext) return;
    const now = audioContext.currentTime;
    playTone(notes[index % notes.length], now, 0.18, "triangle", 0.035);
    if (index % 2 === 0) playTone(notes[(index + 2) % notes.length] / 2, now, 0.35, "sine", 0.018);
    index += 1;
  }, 420);
}

function playTone(freq, start, duration, type = "sine", gain = 0.05) {
  const osc = audioContext.createOscillator();
  const env = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env).connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function playPluck(freq, duration) {
  const now = audioContext.currentTime;
  playTone(freq, now, duration, "square", 0.04);
  playTone(freq * 1.5, now + 0.03, duration * 0.8, "triangle", 0.025);
}

function playChime() {
  const now = audioContext.currentTime;
  playTone(660, now, 0.12, "sine", 0.055);
  playTone(990, now + 0.08, 0.12, "sine", 0.04);
}

function playThud(freq, duration) {
  const now = audioContext.currentTime;
  playTone(freq, now, duration, "sawtooth", 0.04);
}

function playBite() {
  const now = audioContext.currentTime;
  playTone(130, now, 0.05, "square", 0.035);
  playTone(90, now + 0.045, 0.06, "sawtooth", 0.025);
}

function playTick() {
  playTone(520, audioContext.currentTime, 0.035, "square", 0.02);
}

function playClank() {
  const now = audioContext.currentTime;
  playTone(780, now, 0.08, "square", 0.035);
  playTone(360, now + 0.04, 0.12, "triangle", 0.025);
}

function playExplosion() {
  const now = audioContext.currentTime;
  playTone(75, now, 0.32, "sawtooth", 0.075);
  playTone(120, now + 0.04, 0.22, "square", 0.045);
}

function playMower() {
  const now = audioContext.currentTime;
  playTone(110, now, 0.38, "sawtooth", 0.055);
  playTone(220, now + 0.05, 0.22, "square", 0.035);
}

function playWarning() {
  const now = audioContext.currentTime;
  playTone(440, now, 0.1, "square", 0.04);
  playTone(440, now + 0.18, 0.1, "square", 0.04);
}
