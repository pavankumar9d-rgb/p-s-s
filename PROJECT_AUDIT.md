# Project Audit: Legacy Endless Runner Prototype

**Audit Date:** 2026-10-27  
**Project Root:** `c:\pk\subway_preethi_surfers\subway`  
**Dated Backup Location:** `c:\pk\subway_preethi_surfers\subway_backup_20261027_1515`  
**Image-to-3D Working Directory:** `C:\Users\saipa\Downloads\image to 3d`

---

## 1. Directory Tree & Architecture Overview

The repository consists of a hybrid web/Capacitor endless runner prototype named `"city-dash"` (version 1.0.0), inspired by Subway Surfers mechanics.

### Directory Breakdown
- `/` (Root):
  - Canonical game entry point (`index.html`), service worker (`sw.js`), web app manifest (`manifest.json`), Capacitor configuration (`capacitor.config.json`), dependencies (`package.json`, `package-lock.json`).
  - Reference and runtime texture assets (`1.jpeg`, `preethi.png`, `game_background_city.png`, `train_obstacle_yellow.png`, etc.).
  - Legacy documentation: `details.htm`.
- `src/`:
  - `styles.css`: Core game viewport styling, touch controls overlay, UI styling.
  - `src/game/`: Core Three.js / JavaScript game loop and systems:
    - `Game.js`: Main loop, scene management, three.js renderer initialization.
    - `Player.js`: Player state, lane-switching, jumping, sliding, physics updates.
    - `PreethiCharacter.js`: Procedural / photo-rigged 3D runner built from `preethi.png` color sampling and texture mapping.
    - `PreethiRunner.js`: Phase 2 photo-rigged runner capable of loading `models/preethi_runner.glb` or falling back to textured mesh.
    - `TrackManager.js`: Procedural track generation, obstacles, trains, track segments, coins/collectibles.
    - `CollisionSystem.js`: AABB collision detection between player bounding volume and track obstacles.
    - `EnvironmentBuilder.js`: Trackside scenery, background panoramas, horizon buildings.
    - `AnimationController.js`: Procedural bone animations (run cycle, jump, slide, stumble).
    - `SoundManager.js`: Synthesized Web Audio API sound effects (coin pickup, jump, crash).
    - `VFXManager.js`: Particle systems (sparks, coin sparkles, speed lines).
    - `SaveData.js`: LocalStorage score persistence.
    - `FirebaseMock.js`: Leaderboard mock interface.
    - `CityDash.js`: Alternate / older consolidated runner loop.
  - `src/ui/`:
    - `UIManager.js`: HUD, score counters, pause menu, game over screen, touch control buttons.
- `models/`:
  - `README.txt`: Documents placeholder for rigged `preethi_runner.glb`. Currently contains no binary meshes.
- `scripts/`:
  - `sync-www.js`: Build script that wipes `www/` (`rmrf(www)`) and copies canonical root and `src` files into `www/`.
- `www/` (Generated Build Output):
  - Mirror copy of web assets produced by `scripts/sync-www.js` for Capacitor runtime consumption.
- `android/` (Platform Project):
  - Capacitor Android container project with Gradle wrapper, AndroidManifest, and native bridging.

---

## 2. File Classification

| File / Pattern | Classification | Notes & Runtime Role |
| :--- | :--- | :--- |
| `1.jpeg` | **Original Reference Photo** | Real-life photograph of Preethi used as visual identity source. |
| `preethi.png` | **Original Reference & Runtime Asset** | Stylized 3D digital art reference. Sampled at runtime by `PreethiCharacter.js` and `PreethiRunner.js` for color values (`0x8a5d78` mauve dress, `0xd4a883` skin, `0x2f2117` hair) and UV texture regions. |
| `a_stylized_3d_digital_art_character_...png` | **Duplicate Reference Image** | Identical content to `preethi.png` (exact SHA-256 match, 1,434,748 bytes). Kept as preserved legacy reference. |
| `preethi (quillbot.com).svg` | **Original Reference Vector** | High-resolution vector version of the character portrait (4,636,194 bytes). |
| `game_background_city.png` | **Original Source / Runtime Asset** | Panoramic city backdrop texture loaded by `EnvironmentBuilder.js` and `CityDash.js`. |
| `train_obstacle_yellow.png` | **Original Source / Runtime Asset** | Yellow train texture loaded by `TrackManager.js`. |
| `game_ui_elements.png` | **Original Source UI Asset** | Sprite sheet containing coin icons, buttons, banners. |
| `subway-surfer-ios-1.png` | **External Reference** | Third-party Subway Surfers screenshot used for mechanic research. |
| `subway-surfers-how-to-play-...avif` | **External Reference** | Third-party Subway Surfers tutorial banner. |
| `images.jpg`, `images (1).jpg` | **External References** | Thumbnail reference images. |
| `index.html`, `manifest.json`, `sw.js` | **Original Source** | Canonical web app files. |
| `src/**/*` | **Original Source Code** | Canonical Three.js game engine code. |
| `package.json`, `package-lock.json` | **Project Config** | NPM scripts (`sync:www`, `start`, `cap:sync`, `build:android`). |
| `www/**/*` | **Generated Build Output** | Ephemeral build directory recreated on `npm run sync:www`. |
| `android/**/*` | **Platform Container & Build Artifacts** | Android Studio / Capacitor platform project. |

---

## 3. Runtime Dependencies & Asset Reference Graph

- `src/game/PreethiCharacter.js`:
  - References `preethi.png` via `extractPhotoTexture()` for face texture (coords `{ x: 0.39, y: 0.02, w: 0.24, h: 0.28 }`) and dress texture (coords `{ x: 0.36, y: 0.20, w: 0.30, h: 0.42 }`).
- `src/game/PreethiRunner.js`:
  - Fallback checks `models/preethi_runner.glb`.
  - Fallback textures: `preethi.png` and `a_stylized_3d_digital_art_character_inspired_by_the_person_in_the_photo._the.png`.
- `src/game/TrackManager.js`:
  - Loads `train_obstacle_yellow.png` for train obstacle meshes.
- `src/game/EnvironmentBuilder.js` & `Game.js`:
  - Loads `game_background_city.png` for background sky dome / billboards.
- `scripts/sync-www.js`:
  - Hardcodes sync for `index.html`, `manifest.json`, `sw.js`, `preethi.png`, `a_stylized_3d_digital_art_character_...png`, `game_background_city.png`, `train_obstacle_yellow.png`, and directories `src` and `models`.

---

## 4. Preservation & Safety Protocol

1. **Zero Destructive Refactoring:** The existing codebase is retained completely intact as a working legacy prototype.
2. **Untouched Runtime Files:** `preethi.png`, `train_obstacle_yellow.png`, `game_background_city.png`, and `src/` remain in place so that running `npm start` or Capacitor builds continues to work cleanly.
3. **No Direct Edits to `www`:** `www/` remains purely an automated build artifact target.
4. **Isolated Asset Production:** All new asset references for the upcoming 3D pipeline are generated and organized in the standalone workspace directory `C:\Users\saipa\Downloads\image to 3d\`.

