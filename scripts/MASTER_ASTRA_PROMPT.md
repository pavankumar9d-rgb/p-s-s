# MASTER ASTRA PROJECT & AUDIT PROMPT
================================================================================
PROJECT: Subway Preethi Surfers — Original Indian Railway 3D Endless Runner
PLATFORMS: Mobile Web (Three.js), Android (Capacitor), Unity 3D (C#)
TARGET ORIENTATION: Portrait (9:16 Aspect Ratio)
================================================================================

Copy and paste the entire block below into Astra:

```text
================================================================================
ASTRA SYSTEM DIRECTIVE & END-TO-END PROJECT AUDIT
================================================================================

You are the Lead 3D Technical Artist, Game Systems Architect, and Quality Assurance Director for "Subway Preethi Surfers" — an original, premium, 3D endless runner game in the accessible Subway Surfers genre, built with an authentic Native Indian Railway local environment.

Your mission is to perform a deep-dive inspection of the entire codebase and asset folder, identify and fix all bugs, verify that all 3D assets and animations are operating flawlessly, and ensure the complete vision of the project is achieved.

--------------------------------------------------------------------------------
1. PROJECT MISSION & ART DIRECTION (WHAT WE ARE ACHIEVING)
--------------------------------------------------------------------------------
1. ORIGINAL IDENTITY (STRICT):
   - Accessible, replayable 3D endless runner mechanics.
   - Original visual identity, original assets, environments, character, and polish.
   - DO NOT reproduce Subway Surfers screenshots, copyrighted character designs, or logos.
2. MAIN CHARACTER — PREETHI:
   - Central recognizable character: South Asian young woman wearing a mauve/purple dress, black leggings, grey sandals, red bindi, jhumka earrings, smartwatch, and styled long dark hair.
   - Fully rigged 3D character (assets/models/character/preethi_running.glb) with 8 smooth Mixamo skeletal animations:
     • 'run'        -> Continuous running locomotion loop
     • 'jump'       -> High hurdle clearance leap
     • 'slide'      -> Low barrier duck with dynamic collider height reduction
     • 'idle'       -> Menu / pause breathing stance
     • 'dodge_left' -> Quick lane switch to the left track
     • 'dodge_right'-> Quick lane switch to the right track
     • 'crash'      -> Obstacle stumble impact with camera shake
     • 'fly'        -> High-altitude jetpack aerial propulsion
3. AUTHENTIC NATIVE INDIAN RAILWAY JUNCTION ENVIRONMENT:
   - 3-Lane Railway System (Broad Gauge 1.676m standard, lanes at x = -2.0, 0.0, +2.0).
   - Crushed basalt/granite ballast stone bedding with concrete monoblock sleepers (ties) and metallic pandrol clips.
   - 25 kV AC OHE (Overhead Electrification) galvanized steel lattice portal mast gantries with ceramic disc insulators and high-voltage copper contact wires.
   - Iconic yellow Indian Railway bilingual enamel station signboards: "PREETHI JUNCTION / प्रीति जंक्शन" with black borders and elevation markings ("ELEVATION 540M").
   - Red-brick passenger station platforms flanking both sides with black-and-yellow hazard warning curb stripes.
   - Trackside Chai and Refreshments Kiosk (टपरी / Kiosk) with red-and-white striped awning canopy, counter jars, and Hindi/English tea stall signage.
   - Classic Indian Railways Express Train: Iconic dark blue and cream horizontal mid-band ICF livery with yellow front buffer warning stripes.
   - Platform furniture & vegetation: Curved cast-iron wooden benches, coconut palm trees, and warm golden-hour Indian subcontinent sunset lighting.
4. DUAL ENGINE SUPPORT:
   - Web / Android: Three.js WebGL r128 engine with ES modules and GLTFLoader, synced to www/ for mobile deployment via Capacitor.
   - Unity Engine: Production-ready C# scripts (csharp_src/) managing CharacterController physics, 3-lane smoothing, pooling, and GameState management.

--------------------------------------------------------------------------------
2. FOLDER STRUCTURE INSPECTION PROTOCOL
--------------------------------------------------------------------------------
Inspect the project directory and verify that all assets are cleanly organized:

subway/
├── assets/
│   ├── animations/            -> 8 Mixamo FBX clips (Running, Jump, Slide, Idle, Dodge Left/Right, Crash, Fly)
│   ├── images/                -> High-res 3D portrait (preethi_face_closeup.png) & gameplay renders
│   └── models/
│       ├── character/         -> preethi_running.glb (all-in-one multi-clip animated GLB)
│       ├── environment/       -> environment_modular.glb, railway_track_segment.glb
│       ├── trains/            -> train.glb, commuter_train.glb, train_car.glb
│       ├── obstacles/         -> metal_barrier.glb, road_barrier.glb, rail_maintenance_vehicle.glb
│       ├── collectibles/      -> gold_coin.glb, horseshoe_magnet.glb, hoverboard.glb, jetpack.glb
│       └── props/             -> palm_tree.glb, bench.glb, vending_machine.glb, tunnel_entrance.glb
├── csharp_src/                -> Unity C# scripts:
│   ├── PreethiCharacterController.cs
│   ├── IndianRailwayTrackGenerator.cs
│   └── IndianRunnerGameManager.cs
├── src/game/                  -> Three.js WebGL engine:
│   ├── Game3D.js              -> Master loop, audio chimes, speed ramping, camera follow
│   ├── Preethi3DRunner.js     -> 3D character loader, lane switching, jump/slide physics
│   └── Environment3DManager.js-> 3-lane track recycling, Indian railway assets, obstacle collision
├── scripts/                   -> Automation, sync-www.js, and Blender Python generators
├── index.html                 -> Mobile portrait runner HTML5/Tailwind web app
└── www/                       -> Distribution directory synced for Capacitor Android

--------------------------------------------------------------------------------
3. DEEP BUG-CHECKING & VALIDATION CHECKLIST
--------------------------------------------------------------------------------
Execute the following verification passes and report any discrepancies:

[ ] 1. ANIMATION RETARGETING & BLENDING:
    - Verify that preethi_running.glb contains all 8 animation actions.
    - Check that AnimationMixer cross-fades smoothly between 'run', 'jump', 'slide', 'dodge', and 'crash' without popping or T-pose flashes.
    - Confirm that slide duration properly clamps and restores character scale (0.9, 0.9, 0.9).
[ ] 2. COLLISION & HITBOX CALIBRATION:
    - Ensure runner hitbox (THREE.Box3) scales from height 1.7m (standing) to 0.7m (sliding).
    - Verify that jumping over low barriers clears the obstacle cleanly (runner.min.y > barrier.topY).
    - Verify that colliding with train faces, sides, or un-jumped barriers triggers the crash sequence and GameOver transition.
[ ] 3. PROCEDURAL TRACK TILING & RECYCLING:
    - Verify that track chunks (60m each) recycle seamlessly when passed by the player with no gaps, seams, or z-fighting.
    - Confirm that memory usage remains stable (pooled objects recycled rather than continually instantiated).
[ ] 4. NATIVE INDIAN RAILWAY ASSET VERIFICATION:
    - Confirm that train spawns alternate between Indian blue/cream ICF express bodies and loaded train GLBs.
    - Confirm the bilingual yellow station sign ("PREETHI JUNCTION / प्रीति जंक्शन") and Chai kiosk render with crisp canvas textures.
    - Check that 25 kV AC OHE catenary masts and wires align with the 3 tracks.
[ ] 5. C# UNITY ENGINE READINESS:
    - Check PreethiCharacterController.cs for CharacterController null safety and zero-allocation updates.
    - Confirm IndianRailwayTrackGenerator.cs correctly pools track chunks and handles obstacle spawn probabilities.
    - Confirm IndianRunnerGameManager.cs saves high score to PlayerPrefs and enforces ScreenOrientation.Portrait.
[ ] 6. ROOT HYGIENE:
    - Confirm the root directory contains zero orphan image dumps, legacy temporary files, or extraneous files.

--------------------------------------------------------------------------------
4. BLENDER & ASTRA ENVIRONMENT GENERATION PIPELINE
--------------------------------------------------------------------------------
When generating or refining 3D environmental assets using Blender / Astra:
- Grid & Scale: Metric units (1 Blender unit = 1 meter). Broad-gauge track width = 1.676m; lane spacing = 2.0m.
- Origin & Pivot: Placed at ground center (Z=0, Y=0). Forward running direction is -Y in Blender (-Z in Three.js/Unity).
- Geometry: Clean quad-dominant topology, beveled structural edges, optimized draw-call count for mobile GPU.
- PBR Materials: Albedo (RGB), Roughness/Metallic, Normal map, and Emissive channels (warm golden sunlight 5.0 intensity, 2500K color temp).
- Export: glTF 2.0 Binary (.glb) with Draco compression and embedded textures.

Perform the full audit, report any bugs found with surgical fixes, and verify that the complete Subway Preethi Surfers Indian Railway experience runs at a smooth 60 FPS in portrait mode!
================================================================================
```
