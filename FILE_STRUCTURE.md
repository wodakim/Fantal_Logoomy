# Project VERMILION: File Hierarchy

This document defines the strict file structure for the project. All files must use Native ES6 Modules (`import/export`).

## Root Directory
- `index.html` (Entry point, loads `src/main.js` via `<script type="module">`)
- `PROJECT.md` (Technical Design Document)
- `AGENTS.md` (Coding Rules & Constraints)
- `FILE_STRUCTURE.md` (This file)

## Assets & Styles (`/css`)
- `css/reset.css` (Normalize)
- `css/variables.css` (Colors, Fonts, Touch Sizes)
- `css/styles.css` (Main UI styles, Mobile First)

## Source Code (`/src`)
- `src/main.js` (Bootstrapper: initializes Engine, UI, Input)

### Core Engine (`/src/core`)
- `src/core/Constants.js` (TILE_W, TILE_H, GAME_CONFIG)
- `src/core/GameLoop.js` (The `requestAnimationFrame` loop, fixed time step)
- `src/core/Renderer.js` (Canvas 2D Context management, Painter's Algo)
- `src/core/InputSystem.js` (Touch/Mouse normalization, Gestures: Tap, LongPress)
- `src/core/state.js` (Global state container if needed)

### Mathematics (`/src/math`)
- `src/math/Isometric.js` (IsoToScreen, ScreenToIso, Matrix rotations)
- `src/math/Vector2.js` (Helper class)
- `src/math/Noise.js` (Perlin/Simplex implementation for terrain)
- `src/math/RNG.js` (Seeded Random Number Generator)

### World Generation & Physics (`/src/world`)
- `src/world/Chunk.js` (Data structure: heightMap, typeMap, etc.)
- `src/world/MapGenerator.js` (Flesh-Carver algorithms)
- `src/world/FluidEngine.js` (Cellular Automata for Blood/Water)
- `src/world/Biome.js` (Biome definitions)

### Entity Component System (`/src/entities`)
- `src/entities/EntityManager.js` (Manages IDs and Arrays)
- `src/entities/Query.js` (Helper to filter entities)
- `src/entities/components/Transform.js` (x, y, z, dir)
- `src/entities/components/Stats.js` (HP, MP, CT, Speed)
- `src/entities/components/Status.js` (Bitmask flags)

### Procedural Assets (`/src/assets`)
- `src/assets/SpriteGenerator.js` (The Pixel Art Generator)
- `src/assets/AssetManager.js` (Cache for generated ImageBitmaps)
- `src/assets/definitions/jobs.json` (Job data - loaded via fetch or JS object)
- `src/assets/definitions/items.json` (Item data)
- `src/assets/definitions/enemies.json` (Bestiary)

### User Interface (`/src/ui`)
- `src/ui/UIManager.js` (Manages DOM elements)
- `src/ui/CombatOverlay.js` (Hit forecast, Turn order)
- `src/ui/UnitInfo.js` (Status screen)
- `src/ui/TouchControls.js` (Visual feedback for touch)

### Game Logic (`/src/logic`)
- `src/logic/Pathfinding.js` (A* implementation)
- `src/logic/CombatResolver.js` (Damage formulas, Hit checks)
- `src/logic/TurnManager.js` (ATB Clocktick logic)
- `src/logic/AI.js` (Enemy behavior trees)
