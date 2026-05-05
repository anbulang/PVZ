# PVZ-Inspired Local Versus Design

## Goal

Build a playable browser-based lane defense game inspired by the structure of Plants vs. Zombies Online Battle: one player controls the plant side and defends the lawn, while the other controls the zombie side and spends resources to break through. The first version is local two-player on one machine, with the game architecture shaped so the same player commands can later come from WebSocket networking.

The game must not include, download, generate, or package original Plants vs. Zombies copyrighted assets or game binaries. The implementation will use original Canvas-drawn cartoon assets and keep an `assets/` mapping path available for user-supplied local files.

## Scope

First playable version:

- 5 lanes by 9 columns battlefield.
- Plant player can select plant cards, place plants on grid cells, and shovel plants.
- Zombie player can select zombie cards and deploy zombies from the right side into a lane.
- Plant side spends sun. Zombie side spends brainpower.
- Plants attack automatically in their lane.
- Zombies walk left, bite blocking plants, and win by reaching the left edge.
- Plants win by surviving the match timer and clearing remaining zombies.
- Fixed-step deterministic game loop.
- Unified command queue for plant and zombie actions.
- `window.advanceTime(ms)` and `window.render_game_to_text()` for automated verification.

Out of scope for the first version:

- Real network multiplayer.
- Account system, matchmaking, lobbies, or persistence.
- Original PVZ assets, executable patching, DLL injection, or reverse-engineered game integration.
- Full campaign progression.

## Gameplay

### Battlefield

The battlefield is a 5 x 9 grid. The plant side occupies cells. Zombies spawn just beyond the right edge of a chosen lane and move left continuously. Grid coordinates use row `0..4` from top to bottom and col `0..8` from left to right.

### Win Conditions

Zombie side wins when any zombie crosses the left edge of the lawn.

Plant side wins when the round timer reaches zero and no active zombie remains. The target first-version timer is 180 seconds, tunable in code.

### Resources

Plant side uses sun:

- Starts with 150 sun.
- Gains passive sun drops over time.
- Gains extra sun from sunflowers.
- Spending sun places plants.

Zombie side uses brainpower:

- Starts with 100 brainpower.
- Regenerates over time.
- Regeneration ramps up after the first minute to create late pressure.
- Spending brainpower deploys zombies.

### Plant Units

Sunflower:

- Cost: 50 sun.
- Produces sun periodically.
- Low health.

Pea Shooter:

- Cost: 100 sun.
- Fires straight projectiles at the nearest zombie in the same lane.
- Medium health.

Wall Nut:

- Cost: 50 sun.
- Does not attack.
- High health and blocks zombies.

Frost Shooter:

- Cost: 175 sun.
- Fires lower-damage projectiles that slow zombies for a short duration.
- Medium health.

### Zombie Units

Basic Zombie:

- Cost: 50 brainpower.
- Standard movement, health, and bite damage.

Cone Zombie:

- Cost: 100 brainpower.
- Higher health.
- Standard movement and bite damage.

Bucket Zombie:

- Cost: 175 brainpower.
- Very high health.
- Slower movement.

Runner Zombie:

- Cost: 125 brainpower.
- Fast movement.
- Lower health.

## Controls

The first version uses mouse-first controls:

- Plant player selects a plant card, then clicks an empty grid cell.
- Plant player selects shovel, then clicks an occupied plant cell to remove it.
- Zombie player selects a zombie card, then clicks a lane deployment strip on the right side.
- Clicking a selected card again clears selection.
- Press `p` to pause or resume.
- Press `r` after game over to restart.
- Press `f` to toggle fullscreen.

The UI will display the active selection, resources, cooldowns, remaining time, and winner state.

## UI Layout

The app is a single-page Canvas game with minimal DOM chrome.

Top bar:

- Left group: plant resource and plant cards.
- Center group: timer and pause state.
- Right group: zombie resource and zombie cards.

Main canvas:

- Lawn grid with five visible lanes.
- Plants, zombies, projectiles, sun pickups, and lane deployment strip.
- Visual feedback for valid and invalid placement.

Bottom status:

- Current selected command.
- Short state messages such as cooldown, insufficient resource, occupied cell, paused, and winner.

## Visual Direction

Use original polished cartoon Canvas art. The style should be colorful and readable, with richer shapes and animation than the rough brainstorming mockups. It should evoke a bright lane-defense garden game without copying PVZ character silhouettes, sprites, logos, names, or UI art.

Implementation priorities:

- Distinct silhouettes for each plant and zombie type.
- Clear team color coding.
- Small idle animations using scale, bob, and rotation.
- Damage flashes and projectile impact effects.
- Readable cards and cooldown overlays.

The renderer will first draw assets procedurally on Canvas. It will also centralize sprite lookup so user-supplied local assets can later replace procedural drawings without changing game rules.

## Architecture

### Modules

`main.js`:

- Boots the app.
- Owns the animation loop.
- Connects input, state updates, and rendering.
- Exposes test hooks.

`game/state.js`:

- Creates and resets game state.
- Stores plants, zombies, projectiles, resources, cooldowns, timer, selection, and winner.

`game/commands.js`:

- Defines command shapes.
- Validates and applies plant placement, shovel, zombie deployment, pause, and restart commands.
- Keeps the command boundary reusable for future network input.

`game/systems.js`:

- Advances resources, cooldowns, AI attacks, projectiles, movement, collision, bites, damage, deaths, and win conditions.

`game/render.js`:

- Draws the battlefield, cards, entities, effects, overlays, and HUD.

`game/input.js`:

- Converts mouse and keyboard events into commands.
- Performs coordinate mapping from screen to logical grid/lane/card regions.

`game/config.js`:

- Stores unit stats, grid sizing, timing constants, colors, and balance values.

### Data Flow

Input creates commands. Commands enter a queue. On each fixed tick, the game drains pending commands, applies valid state changes, then advances simulation systems. Rendering reads state only and does not mutate game rules.

This boundary lets the first version use local mouse and keyboard input while future online mode can feed remote commands into the same queue.

## Error Handling

Invalid commands do not throw. They set a short user-facing status message and leave state unchanged.

Expected invalid cases:

- Not enough resource.
- Card on cooldown.
- Plant placement cell is occupied.
- Shovel target has no plant.
- Zombie deployment lane is invalid.
- Actions attempted after game over.

Runtime errors during drawing should be avoided by keeping renderer data access defensive. Test hooks should return valid JSON even when game is paused or over.

## Testing And Verification

Use the web game verification loop:

- Run the local dev server.
- Exercise plant placement, zombie deployment, resource spending, cooldowns, combat, pause/resume, restart, and win/loss states.
- Use `window.advanceTime(ms)` for deterministic stepping.
- Use `window.render_game_to_text()` to inspect game state.
- Capture and inspect screenshots after gameplay interactions.
- Check browser console errors and fix new errors before completion.

`render_game_to_text()` must include:

- Mode and pause/game-over state.
- Coordinate system note.
- Time remaining.
- Plant and zombie resources.
- Active selection.
- Visible plants, zombies, and projectiles.
- Winner when present.

## Implementation Constraints

- Use plain HTML, CSS, and JavaScript with Vite or a similarly light local dev server.
- Keep game logic independent from rendering.
- Avoid large dependencies unless a clear local need appears.
- Do not bundle copyrighted PVZ assets or executable files.
- Keep files small enough that each module has a single clear responsibility.
