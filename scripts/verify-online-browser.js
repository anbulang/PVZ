import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const browser = await chromium.launch();
const plantPage = await browser.newPage({ viewport: { width: 1280, height: 760 } });
let zombiePage = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const consoleErrors = [];

for (const page of [plantPage, zombiePage]) {
  attachErrorCapture(page);
}

await plantPage.goto(baseUrl, { waitUntil: "networkidle" });

const hosted = await plantPage.evaluate(() => window.__onlineClient.hostRoom("plant"));
const roomCode = hosted.room?.roomCode ?? hosted.online?.roomCode;
await zombiePage.goto(joinUrl(baseUrl, roomCode, "plant"), { waitUntil: "networkidle" });
await zombiePage.waitForFunction(() => window.__gameState.online?.side === "zombie");
const duplicateJoinPanelText = await zombiePage.locator("#online-panel").innerText();

await plantPage.evaluate(() => window.__onlineClient.setReady(true));
await zombiePage.evaluate(() => window.__onlineClient.setReady(true));
await waitForOnlinePhase(plantPage, "playing");
await waitForOnlinePhase(zombiePage, "playing");

await plantPage.evaluate(() => {
  window.__onlineClient.dispatchCommand({ type: "select", side: "plant", kind: "plant", unitType: "peashooter" });
  window.__onlineClient.dispatchCommand({ type: "placePlant", plantType: "peashooter", row: 2, col: 1 });
});
await zombiePage.evaluate(() => {
  window.__onlineClient.dispatchCommand({ type: "select", side: "zombie", kind: "zombie", unitType: "basic" });
  window.__onlineClient.dispatchCommand({ type: "deployZombie", zombieType: "basic", row: 2 });
});

await waitForEntitySync(plantPage);
await waitForEntitySync(zombiePage);

await zombiePage.reload({ waitUntil: "networkidle" });
attachErrorCapture(zombiePage);
await zombiePage.waitForFunction(() => window.__gameState.online?.phase === "playing" && window.__gameState.online?.side === "zombie");
await waitForEntitySync(zombiePage);

const plantState = await readTextState(plantPage);
const zombieState = await readTextState(zombiePage);
const plantOnline = await plantPage.evaluate(() => window.__gameState.online);
const zombieOnline = await zombiePage.evaluate(() => window.__gameState.online);
const plantDebug = await plantPage.evaluate(() => window.__onlineDebug());
const zombieDebug = await zombiePage.evaluate(() => window.__onlineDebug());

await browser.close();

const result = {
  consoleErrors,
  roomCode,
  plantOnline,
  zombieOnline,
  plantDebug,
  zombieDebug,
  duplicateJoinPanelText,
  plantEntities: plantState.entities,
  zombieEntities: zombieState.entities,
};
console.log(JSON.stringify(result, null, 2));

if (consoleErrors.length > 0) process.exitCode = 1;
if (plantOnline.roomCode !== zombieOnline.roomCode) process.exitCode = 1;
if (plantOnline.side !== "plant" || zombieOnline.side !== "zombie") process.exitCode = 1;
if (plantOnline.phase !== "playing" || zombieOnline.phase !== "playing") process.exitCode = 1;
if (plantOnline.players.plant.ready !== true || plantOnline.players.zombie.ready !== true) process.exitCode = 1;
if (zombieDebug.online.side !== "zombie") process.exitCode = 1;
if (duplicateJoinPanelText.includes("undefined") || !duplicateJoinPanelText.includes("僵尸方")) process.exitCode = 1;
if (plantState.entities.plants.length !== 1 || zombieState.entities.plants.length !== 1) process.exitCode = 1;
if (plantState.entities.zombies.length !== 1 || zombieState.entities.zombies.length !== 1) process.exitCode = 1;

function attachErrorCapture(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

function waitForOnlinePhase(page, phase) {
  return page.waitForFunction((expected) => window.__gameState.online?.phase === expected, phase);
}

function waitForEntitySync(page) {
  return page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.entities.plants.length === 1 && state.entities.zombies.length === 1;
  });
}

function readTextState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

function joinUrl(url, roomCode, side) {
  const target = new URL(url);
  target.searchParams.set("room", roomCode);
  target.searchParams.set("side", side);
  return target.toString();
}
