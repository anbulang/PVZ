import { ASSET_PATHS, GENERATED_ASSET_PATHS, SPRITESHEET_MANIFEST, armorDropAssetFor, drawAsset, drawSpritesheet, getAsset, plantVisualFor, zombieVisualFor } from "./assets.js?v=20260519-tempo1";
import { CANVAS, GRID, PLANTS, PROJECTILES, SUN_PICKUP, ZOMBIES } from "./config.js?v=20260519-tempo1";
import { BRAIN_COUNTER_RECT, PLANT_PANEL_RECT, SUN_COUNTER_RECT, THREAT_PANEL_RECT, TIMER_RECT, ZOMBIE_PANEL_RECT, getPlantCardRects, getZombieCardRects } from "./input.js?v=20260519-tempo1";
import { cellCenterX, rowCenterY } from "./systems.js?v=20260519-tempo1";

export function renderGame(ctx, state) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
  drawHud(ctx, state);
  drawGrid(ctx);
  drawMowerTrack(ctx);
  drawLaneMowers(ctx, state);
  drawDirectorWarning(ctx, state);
  drawPlants(ctx, state);
  drawSunPickups(ctx, state);
  drawProjectiles(ctx, state);
  drawZombies(ctx, state);
  drawEffects(ctx, state);
  drawStatus(ctx, state);
  if (!state.started || state.paused || state.winner) drawOverlay(ctx, state);
}

function drawBackground(ctx, width, height) {
  if (drawSceneCover(ctx, ASSET_PATHS.scene.day, width, height)) {
    ctx.fillStyle = "rgba(255, 244, 168, 0.08)";
    ctx.fillRect(0, 0, width, height);
    drawHouseFacade(ctx);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#d7ef94");
  gradient.addColorStop(0.55, "#7fb64f");
  gradient.addColorStop(1, "#476b37");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + i * 118, 142 + Math.sin(i) * 16, 55, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHouseFacade(ctx);
}

function drawSceneCover(ctx, paths, width, height) {
  const asset = ASSET_PATHS.scene.day ? drawSceneImage(ctx, paths, width, height) : false;
  return asset;
}

function drawSceneImage(ctx, paths, width, height) {
  const record = getAsset(paths);
  if (!record?.loaded || record.failed) return false;
  const image = record.image;
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const destAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (sourceAspect > destAspect) {
    sw = image.naturalHeight * destAspect;
    sx = Math.max(0, Math.min(image.naturalWidth - sw, image.naturalWidth * 0.12));
  } else {
    sh = image.naturalWidth / destAspect;
    sy = Math.max(0, Math.min(image.naturalHeight - sh, image.naturalHeight * 0.08));
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  return true;
}

function drawHouseFacade(ctx) {
  const x = 0;
  const y = GRID.top - 30;
  const w = GRID.left - 8;
  const h = GRID.rows * GRID.cellHeight + 70;
  if (drawAsset(ctx, ASSET_PATHS.scene.houseLeft, x + 66, y + h / 2, 132, 520)) return;
  ctx.save();

  const wall = ctx.createLinearGradient(x, y, x + w, y);
  wall.addColorStop(0, "#e5d39d");
  wall.addColorStop(0.62, "#c7b27b");
  wall.addColorStop(1, "#8f784f");
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "#62452a";
  ctx.fillRect(x, y - 10, w, 18);
  ctx.fillStyle = "#8b6038";
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + w + 16, y - 10);
  ctx.lineTo(x + w - 2, y + 18);
  ctx.lineTo(x, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(93, 72, 45, 0.34)";
  ctx.lineWidth = 2;
  for (let lineY = y + 28; lineY < y + h - 12; lineY += 26) {
    ctx.beginPath();
    ctx.moveTo(x + 8, lineY);
    ctx.lineTo(x + w - 16, lineY);
    ctx.stroke();
  }

  drawHouseWindow(ctx, x + 18, y + 36, 32, 34);
  drawHouseWindow(ctx, x + 54, y + 150, 30, 32);
  drawHouseDoor(ctx, x + 15, y + h - 110, 48, 92);

  ctx.fillStyle = "rgba(48, 35, 24, 0.55)";
  ctx.fillRect(x + w - 8, y, 8, h);
  ctx.fillStyle = "rgba(255, 247, 194, 0.26)";
  ctx.fillRect(x + 5, y + 20, 6, h - 40);
  ctx.restore();
}

function drawHouseWindow(ctx, x, y, w, h) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 5);
  ctx.fillStyle = "#66563d";
  ctx.fill();
  ctx.strokeStyle = "#3e2c1d";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#b8e6f0";
  ctx.fillRect(x + 5, y + 6, w - 10, h - 12);
  ctx.strokeStyle = "rgba(62,44,29,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 6);
  ctx.lineTo(x + w / 2, y + h - 6);
  ctx.moveTo(x + 5, y + h / 2);
  ctx.lineTo(x + w - 5, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

function drawHouseDoor(ctx, x, y, w, h) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = "#714d2d";
  ctx.fill();
  ctx.strokeStyle = "#3f2b1c";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,236,170,0.32)";
  ctx.fillRect(x + 8, y + 12, w - 16, 28);
  ctx.fillStyle = "#d7b85f";
  ctx.beginPath();
  ctx.arc(x + w - 12, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, state) {
  drawHudBoard(ctx, PLANT_PANEL_RECT.x, PLANT_PANEL_RECT.y, PLANT_PANEL_RECT.w, PLANT_PANEL_RECT.h, "plant");
  drawHudBoard(ctx, ZOMBIE_PANEL_RECT.x, ZOMBIE_PANEL_RECT.y, ZOMBIE_PANEL_RECT.w, ZOMBIE_PANEL_RECT.h, "zombie");
  drawSunCounter(ctx, state);
  drawBrainCounter(ctx, state);
  drawTimer(ctx, state);
  drawThreatMeter(ctx, state);
  for (const card of getPlantCardRects()) drawCard(ctx, state, card, "plant");
  for (const card of getZombieCardRects()) drawCard(ctx, state, card, "zombie");
}

function drawSunCounter(ctx, state) {
  drawResourceCounter(ctx, ASSET_PATHS.ui.sunCounter, Math.floor(state.resources.plant.sun), SUN_COUNTER_RECT.x, SUN_COUNTER_RECT.y, "sun", SUN_COUNTER_RECT);
}

function drawBrainCounter(ctx, state) {
  drawResourceCounter(ctx, ASSET_PATHS.ui.brainCounter, Math.floor(state.resources.zombie.brain), BRAIN_COUNTER_RECT.x, BRAIN_COUNTER_RECT.y, "brain", BRAIN_COUNTER_RECT);
}

function drawResourceCounter(ctx, paths, value, x, y, kind, rect = null) {
  ctx.save();
  void paths;
  const width = rect?.w ?? (kind === "brain" ? 118 : 138);
  const height = rect?.h ?? (kind === "brain" ? 36 : 44);
  const fill = kind === "sun" ? "#f7d56a" : "#b9d69c";
  const inner = kind === "sun" ? "#fff0a8" : "#dff0cd";
  ctx.fillStyle = "rgba(37, 27, 18, 0.28)";
  roundRectPath(ctx, x + 3, y + 4, width, height, 11);
  ctx.fill();
  roundRectPath(ctx, x, y, width, height, 11);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 44, 22, 0.75)";
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRectPath(ctx, x + 9, y + 6, width - 18, height - 12, 8);
  ctx.fillStyle = inner;
  ctx.fill();
  const iconX = x + 23;
  const iconY = y + height / 2;
  const iconSize = 33;
  if (kind === "sun") {
    ctx.shadowColor = "rgba(197, 124, 18, 0.45)";
    ctx.shadowBlur = 5;
    if (!drawAsset(ctx, ASSET_PATHS.ui.sun, iconX, iconY, iconSize, iconSize)) drawSunGlyph(ctx, iconX, iconY, 13);
    ctx.shadowBlur = 0;
  } else {
    if (!drawAsset(ctx, ASSET_PATHS.ui.brainCounter, iconX, iconY, iconSize, iconSize)) drawBrainGlyph(ctx, iconX, iconY);
  }
  ctx.textAlign = "right";
  drawOutlinedText(ctx, String(value), x + width - 10, y + height / 2 + 8, kind === "brain" ? 20 : 23, "#fff7c2", "#342719", 4);
  ctx.restore();
}

function drawTimer(ctx, state) {
  drawCompactPanel(ctx, TIMER_RECT.x, TIMER_RECT.y, TIMER_RECT.w, TIMER_RECT.h, "#e1c06a");
  ctx.textAlign = "center";
  const urgent = state.timer.remaining <= 30;
  drawOutlinedText(ctx, "剩余", TIMER_RECT.x + TIMER_RECT.w / 2, TIMER_RECT.y + 14, 11, urgent ? "#ffe0b0" : "#fff6c8", "#332719", 2.5);
  drawOutlinedText(ctx, `${Math.ceil(state.timer.remaining)}s`, TIMER_RECT.x + TIMER_RECT.w / 2, TIMER_RECT.y + 34, 19, urgent ? "#ffd27a" : "#fff8cc", "#332719", 4);
  ctx.textAlign = "left";
}

function drawCard(ctx, state, card, side) {
  const selected = state.selection?.side === side && state.selection?.type === card.id;
  const config = side === "plant" ? PLANTS[card.id] : ZOMBIES[card.id];
  const resource = side === "plant" ? state.resources.plant.sun : state.resources.zombie.brain;
  const affordable = card.id === "shovel" || resource >= config.cost;
  const centerX = card.x + card.w / 2;
  const centerY = card.y + card.h / 2;
  const framePaths = card.id === "shovel" ? ASSET_PATHS.ui.shovelSlot : ASSET_PATHS.ui.cardFrame;
  if (!drawAsset(ctx, framePaths, centerX, centerY, card.w, card.h)) {
    drawPanel(ctx, card.x, card.y, card.w, card.h, affordable ? "#f9f2d0" : "#d2cbb0");
  }

  if (card.id === "shovel") {
    drawShovelIcon(ctx, centerX, centerY, true);
    drawCostChip(ctx, centerX, card.y + card.h - 8, "铲", "plant");
  } else {
    if (side === "plant") drawPlantIcon(ctx, card.id, centerX, card.y + 22, state.time, null, true);
    if (side === "zombie") drawZombieIcon(ctx, card.id, centerX, card.y + 24, state.time, null, true);
    drawCostChip(ctx, centerX, card.y + card.h - 8, config.cost, side);
  }

  const cooldown = card.id === "shovel" ? 0 : state.cards[side][card.id].cooldownRemaining;
  if (cooldown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const h = card.h * Math.min(1, cooldown / config.cooldown);
    ctx.fillRect(card.x, card.y + card.h - h, card.w, h);
    ctx.fillStyle = "#fff7c2";
    ctx.textAlign = "center";
    drawOutlinedText(ctx, cooldown.toFixed(1), centerX, centerY + 6, 18, "#fff6c2", "#201913", 4);
    ctx.textAlign = "left";
  }
  if (!affordable) {
    if (!drawAsset(ctx, ASSET_PATHS.ui.cardDisabled, centerX, centerY, card.w, card.h, { alpha: 0.42 })) {
      ctx.fillStyle = "rgba(70,60,50,0.45)";
      ctx.fillRect(card.x, card.y, card.w, card.h);
    }
  }
  if (selected) {
    drawCardSelectionFrame(ctx, card.x, card.y, card.w, card.h);
  }
}

function drawCardSelectionFrame(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 222, 73, 0.82)";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#ffd739";
  ctx.lineWidth = 4;
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 7);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(83, 51, 18, 0.85)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.stroke();
  ctx.restore();
}

function drawCostChip(ctx, x, y, text, side) {
  ctx.save();
  ctx.fillStyle = side === "plant" ? "rgba(255, 220, 89, 0.94)" : "rgba(190, 232, 163, 0.94)";
  ctx.strokeStyle = "rgba(61, 42, 24, 0.75)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, x - 19, y - 9, 38, 17, 7);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  drawOutlinedText(ctx, String(text), x, y + 5, typeof text === "number" && text >= 100 ? 11 : 12, "#fff8d4", "#44311c", 2.5);
  ctx.restore();
}

function drawThreatMeter(ctx, state) {
  const panelX = THREAT_PANEL_RECT.x;
  const panelY = THREAT_PANEL_RECT.y;
  const panelW = THREAT_PANEL_RECT.w;
  const panelH = THREAT_PANEL_RECT.h;
  const x = panelX + 14;
  const y = panelY + 12;
  const w = panelW - 28;
  const h = 16;
  const ratio = Math.max(0, Math.min(1, state.director.threat / 100));
  ctx.save();
  drawCompactPanel(ctx, panelX, panelY, panelW, panelH, "#a9844b");
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = "rgba(38,57,31,0.34)";
  ctx.fill();
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, "#85c64d");
  gradient.addColorStop(0.65, "#e6b94f");
  gradient.addColorStop(1, "#d45c3a");
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w * ratio, h);
  ctx.restore();
  ctx.strokeStyle = "#26391f";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawThreatMarker(ctx, x + w * ratio, y + h / 2 + 1);
  ctx.textAlign = "center";
  drawOutlinedText(ctx, `压力 ${Math.round(state.director.threat)}`, panelX + panelW / 2, panelY + 42, 13, "#fff8cc", "#2b2117", 3);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawThreatMarker(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#d64532";
  ctx.strokeStyle = "#5a2e20";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(8, -7);
  ctx.lineTo(-6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#5a2e20";
  ctx.beginPath();
  ctx.moveTo(-7, -13);
  ctx.lineTo(-7, 12);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx) {
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      const x = GRID.left + col * GRID.cellWidth;
      const y = GRID.top + row * GRID.cellHeight;
      ctx.fillStyle = (row + col) % 2 === 0 ? "#8bc85a" : "#7cba4e";
      ctx.fillRect(x, y, GRID.cellWidth, GRID.cellHeight);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x + 4, y + 5, GRID.cellWidth - 8, 12);
      ctx.strokeStyle = "rgba(42,74,32,0.3)";
      ctx.strokeRect(x, y, GRID.cellWidth, GRID.cellHeight);
    }
  }
  const deployX = GRID.deployLeft;
  const deployY = GRID.top;
  const deployW = GRID.deployWidth;
  const deployH = GRID.rows * GRID.cellHeight;
  roundRectPath(ctx, deployX, deployY, deployW, deployH, 14);
  ctx.fillStyle = "rgba(87, 92, 62, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 55, 32, 0.92)";
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let row = 1; row < GRID.rows; row += 1) {
    const lineY = GRID.top + row * GRID.cellHeight;
    ctx.strokeStyle = "rgba(224, 221, 157, 0.22)";
    ctx.beginPath();
    ctx.moveTo(deployX + 8, lineY);
    ctx.lineTo(deployX + deployW - 8, lineY);
    ctx.stroke();
  }
  ctx.save();
  ctx.textAlign = "center";
  drawOutlinedText(ctx, "投放区", deployX + deployW / 2, deployY + 32, 14, "#fff7c2", "#2f281b", 3);
  ctx.restore();
}

function drawMowerTrack(ctx) {
  const x = 0;
  const y = GRID.top - 10;
  const w = GRID.left - 10;
  const h = GRID.rows * GRID.cellHeight + 20;
  ctx.save();
  ctx.fillStyle = "rgba(255, 245, 206, 0.08)";
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.strokeStyle = "rgba(72, 56, 36, 0.22)";
  ctx.lineWidth = 2;
  for (let row = 0; row < GRID.rows; row += 1) {
    const lineY = GRID.top + row * GRID.cellHeight;
    ctx.beginPath();
    ctx.moveTo(x + 8, lineY);
    ctx.lineTo(w - 10, lineY);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(42, 34, 24, 0.34)";
  ctx.fillRect(w - 4, y - 10, 4, h + 20);
  ctx.restore();
}

function drawLaneMowers(ctx, state) {
  for (const mower of state.laneMowers) {
    if (!mower.available && !mower.active) continue;
    const mowerWidth = mower.active ? 72 : 58;
    const mowerHeight = mower.active ? 54 : 48;
    const drawX = mower.active ? mower.x : GRID.left - 54;
    const drawY = rowCenterY(mower.row);
    if (drawAsset(ctx, ASSET_PATHS.ui.mower, drawX, drawY, mowerWidth, mowerHeight)) continue;
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.fillStyle = mower.active ? "#e24a33" : "#d13b2f";
    ctx.fillRect(-24, -16, 48, 24);
    ctx.fillStyle = "#242424";
    ctx.beginPath();
    ctx.arc(-15, 12, 7, 0, Math.PI * 2);
    ctx.arc(17, 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dadada";
    ctx.fillRect(5, -34, 8, 28);
    ctx.restore();
  }
}

function drawDirectorWarning(ctx, state) {
  const warning = state.director.warning;
  if (!warning) return;
  const y = GRID.top + warning.row * GRID.cellHeight;
  ctx.fillStyle = `rgba(216, 67, 42, ${0.18 + Math.sin(state.time * 10) * 0.08})`;
  ctx.fillRect(GRID.left, y, GRID.deployLeft - GRID.left + GRID.deployWidth, GRID.cellHeight);
  const waveAsset = state.timer.remaining < 35 ? ASSET_PATHS.ui.finalWave : ASSET_PATHS.ui.largeWave;
  drawAsset(ctx, waveAsset, 640, GRID.top + GRID.rows * GRID.cellHeight + 12, 260, 72, { alpha: Math.min(1, warning.remaining / 1.5) });
  ctx.fillStyle = "#fff0a8";
  ctx.font = "800 18px system-ui";
  ctx.fillText(`第 ${warning.row + 1} 路预警 ${warning.remaining.toFixed(1)}s`, GRID.deployLeft - 190, y + 28);
}

function drawSunPickups(ctx, state) {
  for (const sun of state.sunPickups) {
    const pulse = 1 + Math.sin(state.time * 8 + sun.x) * 0.08;
    const drewSunAsset = drawAsset(ctx, ASSET_PATHS.ui.sun, sun.x, sun.y, 58 * pulse, 58 * pulse);
    if (!drewSunAsset) {
      ctx.save();
      ctx.translate(sun.x, sun.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ffd54a";
      for (let i = 0; i < 10; i += 1) {
        ctx.rotate(Math.PI / 5);
        ctx.fillRect(-3, -SUN_PICKUP.radius, 6, 14);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawFloatingValue(ctx, String(sun.amount), sun.x + 23, sun.y - 18, 1, "#fff6a6", "#6b4b12", 15);
  }
}

function drawPlants(ctx, state) {
  for (const plant of state.plants) {
    const x = cellCenterX(plant.col);
    const floorY = cellFloorY(plant.row);
    drawShadow(ctx, x, floorY + 3, 54, 12);
    drawPlantIcon(ctx, plant.type, x, floorY, state.time, plant);
    if (plant.bitePulse > 0) drawBiteMarks(ctx, x, floorY - 38, state.time);
  }
}

function drawZombies(ctx, state) {
  for (const zombie of [...state.zombies].sort((a, b) => a.x - b.x)) {
    const floorY = cellFloorY(zombie.row) + 3;
    drawShadow(ctx, zombie.x, floorY + 5, 54, 12);
    drawZombieIcon(ctx, zombie.type, zombie.x, floorY, state.time, zombie);
    if (zombie.armorDropped) drawDroppedArmorAt(ctx, zombie.type, zombie.x - 24, floorY + 9, state.time);
  }
}

function cellFloorY(row) {
  return GRID.top + row * GRID.cellHeight + GRID.cellHeight - 20;
}

function drawProjectiles(ctx, state) {
  for (const projectile of state.projectiles) {
    const config = PROJECTILES[projectile.type];
    if (drawAsset(ctx, ASSET_PATHS.projectiles[projectile.type], projectile.x, projectile.y - 12, 28, 28)) continue;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y - 12, config.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(38,57,31,0.45)";
    ctx.stroke();
  }
}

function drawEffects(ctx, state) {
  for (const effect of state.effects) {
    const x = effect.x ?? cellCenterX(effect.col);
    const y = effect.y ?? rowCenterY(effect.row);
    if (effect.type === "armorDrop") {
      drawArmorDrop(ctx, effect);
      continue;
    }
    if (effect.type === "explosion") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      if (drawSpritesheet(ctx, SPRITESHEET_MANIFEST.fx.explosion, x, y, 210, 210, { progress })) {
        continue;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl / 0.75));
      const radius = 40 + (0.75 - effect.ttl) * 180;
      const gradient = ctx.createRadialGradient(x, y, 10, x, y, radius);
      gradient.addColorStop(0, "#fff5a3");
      gradient.addColorStop(0.35, "#ff9d37");
      gradient.addColorStop(1, "rgba(180,40,20,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "rowFire") {
      const alpha = Math.max(0.55, Math.min(1, effect.ttl / effect.maxTtl));
      ctx.globalAlpha = alpha;
      const rowY = rowCenterY(effect.row);
      for (let tile = 0; tile < 8; tile += 1) {
        drawSpritesheet(ctx, SPRITESHEET_MANIFEST.fx.rowFire, GRID.left + 64 + tile * 128, rowY + 2, 128, 64, { time: effect.maxTtl - effect.ttl + tile * 0.13 });
      }
      ctx.fillStyle = "rgba(255, 98, 22, 0.38)";
      ctx.fillRect(GRID.left, rowY - 30, GRID.deployLeft - GRID.left + GRID.deployWidth, 60);
      const gradient = ctx.createLinearGradient(GRID.left, rowY, GRID.deployLeft + GRID.deployWidth, rowY);
      gradient.addColorStop(0, "rgba(255, 226, 84, 0)");
      gradient.addColorStop(0.2, "#ffde54");
      gradient.addColorStop(0.5, "#ff6a1a");
      gradient.addColorStop(0.8, "#ffde54");
      gradient.addColorStop(1, "rgba(255, 226, 84, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(GRID.left, rowY - 22, GRID.deployLeft - GRID.left + GRID.deployWidth, 44);
      ctx.fillStyle = "rgba(255, 244, 126, 0.86)";
      for (let i = 0; i < 18; i += 1) {
        const flameX = GRID.left + i * 58 + ((effect.maxTtl - effect.ttl) * 90) % 42;
        ctx.beginPath();
        ctx.ellipse(flameX, rowY + Math.sin(i) * 6, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "zombieDeath") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      const size = effect.zombieType === "imp" ? [74, 82] : effect.zombieType === "runner" ? [112, 118] : [96, 118];
      const deathY = y + Math.min(10, progress * 10);
      const alpha = Math.max(0, Math.min(1, effect.ttl / effect.maxTtl));
      const paths = ASSET_PATHS.zombieDeath[effect.zombieType] ?? ASSET_PATHS.zombieDeath.basic;
      const sheet = SPRITESHEET_MANIFEST.zombies[effect.zombieType]?.death;
      if (drawSpritesheet(ctx, sheet, x, deathY, size[0], size[1], { progress, alpha, anchor: { x: 0.5, y: 0.9 } })) {
        ctx.globalAlpha = 1;
        continue;
      }
      if (!drawAsset(ctx, paths, x, deathY, size[0], size[1], { alpha })) {
        drawFloatingValue(ctx, "击倒", x, y + 4, alpha, "#f5e6c8", "#5b1c1c", 22);
      }
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl));
    if (effect.type === "ignite") {
      if (drawAsset(ctx, GENERATED_ASSET_PATHS.fx.ignite, x, y - 12, 70, 70, { alpha: ctx.globalAlpha })) {
        ctx.globalAlpha = 1;
        continue;
      }
      const radius = 10 + (1 - effect.ttl / 0.22) * 18;
      ctx.fillStyle = `rgba(255, 122, 40, ${ctx.globalAlpha})`;
      ctx.beginPath();
      ctx.arc(x, y - 12, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "hit" && drawAsset(ctx, GENERATED_ASSET_PATHS.fx.hit, x, y - 12, 58, 58, { alpha: ctx.globalAlpha })) {
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "collectSun") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      drawFloatingValue(ctx, `+${effect.amount}`, x, y - 24 - progress * 20, ctx.globalAlpha, "#fff1a8", "#4d3910", 24);
      ctx.globalAlpha = 1;
      continue;
    }
    if (effect.type === "sunDelta") {
      const progress = 1 - effect.ttl / effect.maxTtl;
      const positive = effect.amount > 0;
      const text = `${positive ? "+" : ""}${effect.amount}`;
      drawFloatingValue(ctx, text, x + progress * 18, y - progress * 26, ctx.globalAlpha, positive ? "#fff1a8" : "#ffb0a0", positive ? "#4d3910" : "#6a1f15", 24);
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.fillStyle = effect.type === "sunPop" || effect.type === "collectSun" ? "#ffd64d" : effect.type === "mowerStart" ? "#ff5a3d" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y - 22, 18 + (1 - effect.ttl) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawStatus(ctx, state) {
  drawStatusBoard(ctx, 220, 628, 840, 52);
  ctx.textAlign = "center";
  const selectionName = selectedUnitName(state);
  const main = selectionName ? `${state.status}  当前选择：${selectionName}` : state.status;
  drawOutlinedText(ctx, main, 640, 655, 18, "#fff8cc", "#3a2a18", 4);
  if (!state.started) {
    drawOutlinedText(ctx, "点击卡牌选择，点击草坪/投放区放置；点击太阳收集", 640, 674, 10, "#e9d492", "#4b3824", 2);
  }
  ctx.textAlign = "left";
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = "rgba(20, 30, 18, 0.52)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawModalBoard(ctx, 380, 250, 520, 220);
  ctx.textAlign = "center";
  const text = !state.started ? "准备开始" : state.winner ? (state.winner === "plant" ? "植物方胜利" : "僵尸方胜利") : "暂停";
  drawOutlinedText(ctx, text, 640, 338, 48, "#fff5bd", "#2f2418", 6);
  const hint = !state.started ? "选择任意卡牌后开始计时" : state.winner ? "按 r 重新开始" : "按 p 继续";
  drawOutlinedText(ctx, hint, 640, 383, 22, "#fff5bd", "#2f2418", 4);
  ctx.textAlign = "left";
}

function drawPlantIcon(ctx, type, x, y, time = 0, plant = null, isCard = false) {
  ctx.save();
  const bitePulse = plant?.bitePulse ?? 0;
  ctx.translate(x, y);
  if (plant?.bitePulse > 0) {
    ctx.translate(4, 0);
    ctx.scale(1 + bitePulse * 0.16, 1 - bitePulse * 0.1);
  } else if (plant) {
    const sway = Math.sin(time * 2.6 + plant.col * 0.7 + plant.row * 0.35);
    ctx.translate(sway * 1, 0);
    ctx.rotate(sway * 0.012);
  }
  if (plant?.flash > 0) ctx.globalAlpha = 0.55;
  const spriteSize = plantSpriteSize(type);
  const sized = isCard
    ? [Math.min(44, spriteSize[0] * 0.43), Math.min(38, spriteSize[1] * 0.43)]
    : type === "cherrybomb" ? [86, 78] : spriteSize;
  const visual = plantVisualFor(plant ?? type);
  const progress = visual.sprite && !visual.sprite.loop && plant?.visualDuration
    ? 1 - (plant.visualTimer ?? 0) / Math.max(0.01, plant.visualDuration)
    : undefined;
  const spriteOptions = { time, seed: stableSeed(plant?.id ?? type), progress };
  if (isCard) spriteOptions.anchor = { x: 0.5, y: 0.5 };
  if (drawSpritesheet(ctx, visual.sprite, 0, 0, sized[0], sized[1], spriteOptions)) {
    ctx.restore();
    return;
  }
  const paths = plant?.armed && ASSET_PATHS.plantArmed[type] ? ASSET_PATHS.plantArmed[type] : ASSET_PATHS.plantIdle[type];
  const fallbackOffsetY = isCard ? 0 : -sized[1] * 0.38;
  if (drawAsset(ctx, paths, 0, fallbackOffsetY, sized[0], sized[1])) {
    ctx.restore();
    return;
  }
  if (!isCard) ctx.translate(0, fallbackOffsetY);
  if (isCard) ctx.scale(0.55, 0.55);
  if (type === "sunflower") drawSunflower(ctx);
  if (type === "peashooter") drawPeashooter(ctx, "#65b84d");
  if (type === "repeater") drawPeashooter(ctx, "#4ca43d");
  if (type === "wallnut") drawWallnut(ctx);
  if (type === "frostshooter") drawPeashooter(ctx, "#72c8d8");
  if (type === "twinSunflower") drawSunflower(ctx);
  if (type === "torchwood") drawTorchwood(ctx);
  if (type === "potatoMine") drawPotatoMine(ctx, Boolean(plant?.armed));
  if (type === "jalapeno") drawJalapeno(ctx);
  if (type === "cherrybomb") drawCherryBomb(ctx);
  ctx.restore();
}

function plantSpriteSize(type) {
  if (type === "wallnut") return [84, 96];
  if (type === "torchwood") return [82, 92];
  if (type === "potatoMine") return [76, 64];
  if (type === "jalapeno") return [88, 88];
  if (type === "twinSunflower") return [104, 94];
  return [94, 94];
}

function selectedUnitName(state) {
  if (!state.selection) return "";
  if (state.selection.kind === "shovel") return "铲子";
  const config = state.selection.side === "plant" ? PLANTS[state.selection.type] : ZOMBIES[state.selection.type];
  return config?.name ?? "";
}

function drawOutlinedText(ctx, text, x, y, size, fill, stroke, lineWidth = 3) {
  ctx.save();
  ctx.font = `900 ${size}px system-ui`;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function stableSeed(value) {
  const text = String(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997;
  }
  return (hash % 11) / 11;
}

function drawFloatingValue(ctx, text, x, y, alpha, fill, stroke, size) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawZombieIcon(ctx, type, x, y, time = 0, zombie = null, isCard = false) {
  ctx.save();
  ctx.translate(x, y);
  if (zombie?.flash > 0) ctx.globalAlpha = 0.55;
  const spriteSize = zombieSpriteSize(type);
  const visual = zombieVisualFor(zombie ?? { type, eating: false, armorDropped: false });
  const cardScale = isCard ? Math.min(0.43, 54 / spriteSize[0], 48 / spriteSize[1]) : 1;
  const sized = isCard ? [spriteSize[0] * cardScale, spriteSize[1] * cardScale] : spriteSize;
  const spriteOptions = { time, seed: stableSeed(zombie?.id ?? type) };
  if (isCard) spriteOptions.anchor = { x: 0.5, y: 0.5 };
  if (drawSpritesheet(ctx, visual.sprite, 0, 0, sized[0], sized[1], spriteOptions)) {
    ctx.restore();
    return;
  }
  const fallbackOffsetY = isCard ? 0 : -sized[1] * 0.42;
  if (drawAsset(ctx, visual.paths, 0, fallbackOffsetY, sized[0], sized[1], { stateKey: `${type}:${visual.state}` })) {
    ctx.restore();
    return;
  }
  if (!isCard) ctx.translate(0, fallbackOffsetY);
  if (isCard) ctx.scale(0.5, 0.5);
  ctx.fillStyle = type === "runner" ? "#7d9c72" : "#8f987e";
  ctx.fillRect(-18, -30, 36, 58);
  ctx.fillStyle = "#5e6a5a";
  ctx.beginPath();
  ctx.arc(0, -42, 23, 0, Math.PI * 2);
  ctx.fill();
  if (type === "cone") {
    ctx.fillStyle = "#db7e2b";
    ctx.beginPath();
    ctx.moveTo(-20, -58);
    ctx.lineTo(20, -58);
    ctx.lineTo(0, -94);
    ctx.closePath();
    ctx.fill();
  }
  if (type === "bucket") {
    ctx.fillStyle = "#9fa8b3";
    ctx.fillRect(-22, -70, 44, 22);
  }
  ctx.fillStyle = "#1f241f";
  ctx.beginPath();
  ctx.arc(-8, -45, 3, 0, Math.PI * 2);
  ctx.arc(8, -45, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function zombieSpriteSize(type) {
  if (type === "runner") return [104, 112];
  if (type === "imp") return [64, 74];
  if (type === "zamboni") return [116, 90];
  if (type === "screen") return [92, 112];
  if (type === "flag") return [92, 112];
  if (type === "bucket") return [84, 110];
  return [84, 110];
}

function drawBiteMarks(ctx, x, y) {
  ctx.save();
  ctx.translate(x + 22, y - 8);
  ctx.fillStyle = "rgba(80, 35, 18, 0.65)";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(0, i * 9 - 9, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 245, 190, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -18);
  ctx.lineTo(8, 18);
  ctx.stroke();
  ctx.restore();
}

function drawDroppedArmorAt(ctx, type, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18);
  const generatedPath = armorDropAssetFor(type);
  const size = type === "screen" ? [34, 38] : type === "runner" ? [38, 28] : [32, 28];
  if (drawAsset(ctx, generatedPath, 0, 0, size[0], size[1])) {
    ctx.restore();
    return;
  }
  if (type === "bucket") {
    ctx.fillStyle = "#aeb7bf";
    ctx.fillRect(-16, -9, 32, 18);
    ctx.strokeStyle = "#59646b";
    ctx.strokeRect(-16, -9, 32, 18);
  } else if (type === "screen") {
    ctx.fillStyle = "#aeb7bf";
    ctx.fillRect(-17, -22, 34, 44);
    ctx.strokeStyle = "#59646b";
    ctx.strokeRect(-17, -22, 34, 44);
  } else if (type === "runner") {
    ctx.fillStyle = "#cb352e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efefef";
    ctx.fillRect(-16, -3, 32, 5);
  } else {
    ctx.fillStyle = "#dd7b2a";
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.lineTo(15, 10);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawArmorDrop(ctx, effect) {
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate((1.1 - effect.ttl) * 5);
  const alpha = Math.max(0, Math.min(1, effect.ttl));
  const generatedPath = armorDropAssetFor(effect.hatType);
  const size = effect.hatType === "screen" ? [40, 44] : effect.hatType === "runner" ? [46, 32] : [38, 34];
  if (drawAsset(ctx, generatedPath, 0, 0, size[0], size[1], { alpha })) {
    ctx.restore();
    return;
  }
  const path = effect.hatType === "bucket"
    ? ASSET_PATHS.zombieFeedback.bucketHat
    : effect.hatType === "screen"
      ? ASSET_PATHS.zombieFeedback.screenDoor
    : effect.hatType === "runner"
      ? ASSET_PATHS.zombieFeedback.runnerHelmet
      : ASSET_PATHS.zombieFeedback.coneHat;
  if (!drawAsset(ctx, path, 0, 0, effect.hatType === "runner" ? 54 : 44, 42, { alpha })) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect.hatType === "bucket" || effect.hatType === "screen" ? "#a9b0b7" : effect.hatType === "runner" ? "#d6483b" : "#dd7b2a";
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(18, 12);
    ctx.lineTo(0, -22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSunflower(ctx) {
  ctx.fillStyle = "#ffd24b";
  for (let i = 0; i < 10; i += 1) {
    ctx.rotate(Math.PI / 5);
    ctx.beginPath();
    ctx.ellipse(0, -25, 9, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#8b5c33";
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeashooter(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-8, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(24, -2, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f3322";
  ctx.beginPath();
  ctx.arc(-15, -7, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorchwood(ctx) {
  ctx.fillStyle = "#8b4a25";
  ctx.fillRect(-22, -30, 44, 58);
  ctx.fillStyle = "#ff8a2a";
  ctx.beginPath();
  ctx.arc(0, -34, 17, 0, Math.PI * 2);
  ctx.fill();
}

function drawPotatoMine(ctx, armed) {
  ctx.fillStyle = armed ? "#a86a35" : "#6d4b2c";
  ctx.beginPath();
  ctx.ellipse(0, armed ? 5 : 18, armed ? 25 : 20, armed ? 21 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!armed) return;
  ctx.fillStyle = "#2c2118";
  ctx.beginPath();
  ctx.arc(-7, 0, 3, 0, Math.PI * 2);
  ctx.arc(8, 0, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallnut(ctx) {
  ctx.fillStyle = "#b8874b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 39, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6e4f31";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#2c2118";
  ctx.beginPath();
  ctx.arc(-9, -8, 3, 0, Math.PI * 2);
  ctx.arc(10, -8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCherryBomb(ctx) {
  ctx.fillStyle = "#c93030";
  ctx.beginPath();
  ctx.arc(-13, 3, 20, 0, Math.PI * 2);
  ctx.arc(13, 3, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f8e38";
  ctx.fillRect(-3, -29, 6, 18);
  ctx.fillStyle = "#241111";
  ctx.beginPath();
  ctx.arc(-19, -2, 3, 0, Math.PI * 2);
  ctx.arc(7, -2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawJalapeno(ctx) {
  ctx.fillStyle = "#d93422";
  ctx.beginPath();
  ctx.ellipse(0, 6, 18, 38, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2d8a35";
  ctx.fillRect(-5, -36, 10, 18);
  ctx.fillStyle = "#fff4b8";
  ctx.beginPath();
  ctx.arc(-6, -4, 3, 0, Math.PI * 2);
  ctx.arc(7, -5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShovelIcon(ctx, x, y, compact = false) {
  if (drawAsset(ctx, ASSET_PATHS.ui.shovel, x, y, compact ? 48 : 64, compact ? 48 : 64)) return;
  drawShovel(ctx, x, y);
}

function drawShovel(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#826a4a";
  ctx.fillRect(-4, -30, 8, 54);
  ctx.fillStyle = "#b6c0c7";
  ctx.beginPath();
  ctx.ellipse(0, -38, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, color) {
  ctx.fillStyle = "rgba(53, 68, 35, 0.25)";
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#5e6d36";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}

function drawHudBoard(ctx, x, y, w, h, side) {
  ctx.save();
  const wood = side === "plant" ? "#835329" : "#6b553d";
  const face = side === "plant" ? "#e8c778" : "#d7c19a";
  ctx.fillStyle = "rgba(35, 24, 15, 0.3)";
  roundRectPath(ctx, x + 5, y + 6, w, h, 12);
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = "rgba(52, 33, 18, 0.84)";
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRectPath(ctx, x + 10, y + 10, w - 20, h - 20, 9);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = "rgba(97, 64, 31, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x + 18, y + 18, w - 36, 11);
  ctx.fillStyle = side === "plant" ? "rgba(61,116,40,0.18)" : "rgba(74,95,55,0.18)";
  ctx.fillRect(x + 18, y + h - 26, w - 36, 10);
  ctx.restore();
}

function drawCompactPanel(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = "rgba(35, 24, 15, 0.26)";
  roundRectPath(ctx, x + 4, y + 5, w, h, 10);
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(62, 42, 24, 0.78)";
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRectPath(ctx, x + 7, y + 6, w - 14, h - 12, 7);
  ctx.fillStyle = "rgba(255, 243, 196, 0.72)";
  ctx.fill();
  ctx.restore();
}

function drawStatusBoard(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(29, 20, 13, 0.32)";
  roundRectPath(ctx, x + 5, y + 6, w, h, 10);
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = "#7d552c";
  ctx.fill();
  ctx.strokeStyle = "rgba(45, 30, 18, 0.86)";
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRectPath(ctx, x + 12, y + 8, w - 24, h - 16, 8);
  ctx.fillStyle = "rgba(255, 233, 171, 0.88)";
  ctx.fill();
  ctx.restore();
}

function drawModalBoard(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(12, 8, 5, 0.28)";
  roundRectPath(ctx, x + 8, y + 10, w, h, 16);
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.fillStyle = "#80542b";
  ctx.fill();
  ctx.strokeStyle = "#352416";
  ctx.lineWidth = 5;
  ctx.stroke();
  roundRectPath(ctx, x + 18, y + 18, w - 36, h - 36, 12);
  ctx.fillStyle = "#f1d487";
  ctx.fill();
  ctx.strokeStyle = "rgba(95, 64, 32, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawSunGlyph(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffd84e";
  for (let i = 0; i < 10; i += 1) {
    ctx.rotate(Math.PI / 5);
    ctx.fillRect(-2, -radius - 8, 4, 9);
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrainGlyph(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e9a4b1";
  ctx.strokeStyle = "#6a3b43";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-5, -3, 9, 10, -0.4, 0, Math.PI * 2);
  ctx.ellipse(6, -4, 10, 11, 0.4, 0, Math.PI * 2);
  ctx.ellipse(1, 6, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(106,59,67,0.55)";
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.quadraticCurveTo(-1, -10, 4, -6);
  ctx.moveTo(-5, 3);
  ctx.quadraticCurveTo(3, 0, 9, 4);
  ctx.stroke();
  ctx.restore();
}

function drawShadow(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(20,35,16,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHealth(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), 7);
}
