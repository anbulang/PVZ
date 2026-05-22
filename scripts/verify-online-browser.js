import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5173";
const browser = await chromium.launch();
const plantContext = await browser.newContext({ viewport: { width: 1280, height: 760 } });
const zombieContext = await browser.newContext({ viewport: { width: 1280, height: 760 } });
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 760 } });
const plantPage = await plantContext.newPage();
let zombiePage = await zombieContext.newPage();
const mobilePage = await mobileContext.newPage();
const consoleErrors = [];

for (const page of [plantPage, zombiePage, mobilePage]) {
  attachErrorCapture(page);
}

await plantPage.goto(baseUrl, { waitUntil: "networkidle" });
await loginAs(plantPage, "Plant Browser");
await plantPage.locator("#room-name").fill("Browser Verify");
await plantPage.locator("#room-create").click();
const roomCode = await waitForRoomCode(plantPage);

await zombiePage.goto(joinUrl(baseUrl, roomCode), { waitUntil: "networkidle" });
await loginAs(zombiePage, "Zombie Browser");
await zombiePage.locator("#room-join").click();
await zombiePage.waitForFunction(() => window.__gameState.online?.side === "zombie");
const zombieRoomText = await zombiePage.locator("#room-view").innerText();

await plantPage.locator("#room-ready").click();
await zombiePage.locator("#room-ready").click();
await waitForGameView(plantPage);
await waitForGameView(zombiePage);
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
await zombiePage.locator("#room-join").click();
await zombiePage.waitForFunction(() => window.__gameState.online?.phase === "playing" && window.__gameState.online?.side === "zombie");
await waitForGameView(zombiePage);
await waitForEntitySync(zombiePage);

await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
await loginAs(mobilePage, "Mobile Browser");
await mobilePage.locator("#room-view").waitFor({ state: "visible" });
const mobileBodyText = await mobilePage.locator("body").innerText();

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
  zombieRoomText,
  mobileBodyHasUndefined: mobileBodyText.includes("undefined"),
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
if (zombieRoomText.includes("undefined") || !zombieRoomText.includes("僵尸方")) process.exitCode = 1;
if (mobileBodyText.includes("undefined")) process.exitCode = 1;
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

function waitForGameView(page) {
  return page.locator("#game-view:not([hidden])").waitFor({ state: "visible" });
}

function waitForRoomCode(page) {
  return page.waitForFunction(() => window.__gameState.online?.roomCode ?? window.__onlineClient.getOnline()?.roomCode).then((handle) => handle.jsonValue());
}

async function loginAs(page, nickname) {
  await page.locator("#player-name").fill(nickname);
  await page.locator("#login-continue").click();
  await page.locator("#room-view").waitFor({ state: "visible" });
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

function joinUrl(url, roomCode) {
  const target = new URL(url);
  target.searchParams.set("room", roomCode);
  return target.toString();
}
