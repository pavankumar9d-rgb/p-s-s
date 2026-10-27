import os
import shutil

ROOT = r"c:\pk\subway_preethi_surfers\subway"
IMG_3D = r"C:\Users\saipa\Downloads\image to 3d"
ANIM_DIR = r"C:\Users\saipa\Downloads\animations"
MODELS_DIR = os.path.join(ROOT, "models")
ASSETS_DIR = os.path.join(ROOT, "assets")

def ensure_dir(d):
    os.makedirs(d, exist_ok=True)

def safe_copy(src, dst):
    if os.path.exists(src):
        ensure_dir(os.path.dirname(dst))
        shutil.copyfile(src, dst)
        print(f"Copied: {os.path.basename(src)} -> {dst}")
    else:
        print(f"Source not found: {src}")

# 1. Models: Character
safe_copy(os.path.join(MODELS_DIR, "preethi_running.glb"), os.path.join(ASSETS_DIR, "models", "character", "preethi_running.glb"))
safe_copy(os.path.join(ANIM_DIR, "preethi_tpose.glb"), os.path.join(ASSETS_DIR, "models", "character", "preethi_tpose.glb"))
safe_copy(os.path.join(ANIM_DIR, "preethi_tpose.fbx"), os.path.join(ASSETS_DIR, "models", "character", "preethi_tpose.fbx"))

# 2. Models: Environment
safe_copy(os.path.join(MODELS_DIR, "environment_modular.glb"), os.path.join(ASSETS_DIR, "models", "environment", "environment_modular.glb"))
safe_copy(os.path.join(IMG_3D, "Meshy_AI_Railway_Track_Segment_1027102635_texture.glb"), os.path.join(ASSETS_DIR, "models", "environment", "railway_track_segment.glb"))

# 3. Models: Trains
safe_copy(os.path.join(IMG_3D, "train.glb"), os.path.join(ASSETS_DIR, "models", "trains", "train.glb"))
safe_copy(os.path.join(IMG_3D, "commuter_train.glb"), os.path.join(ASSETS_DIR, "models", "trains", "commuter_train.glb"))
safe_copy(os.path.join(IMG_3D, "train_car.glb"), os.path.join(ASSETS_DIR, "models", "trains", "train_car.glb"))

# 4. Models: Obstacles
safe_copy(os.path.join(IMG_3D, "metal_barrier.glb"), os.path.join(ASSETS_DIR, "models", "obstacles", "metal_barrier.glb"))
safe_copy(os.path.join(IMG_3D, "road_barrier.glb"), os.path.join(ASSETS_DIR, "models", "obstacles", "road_barrier.glb"))
safe_copy(os.path.join(IMG_3D, "rail_maintenance_vehicle.glb"), os.path.join(ASSETS_DIR, "models", "obstacles", "rail_maintenance_vehicle.glb"))

# 5. Models: Collectibles
safe_copy(os.path.join(IMG_3D, "gold_coin.glb"), os.path.join(ASSETS_DIR, "models", "collectibles", "gold_coin.glb"))
safe_copy(os.path.join(IMG_3D, "horseshoe_magnet.glb"), os.path.join(ASSETS_DIR, "models", "collectibles", "horseshoe_magnet.glb"))
safe_copy(os.path.join(IMG_3D, "hoverboard.glb"), os.path.join(ASSETS_DIR, "models", "collectibles", "hoverboard.glb"))
safe_copy(os.path.join(IMG_3D, "jetpack.glb"), os.path.join(ASSETS_DIR, "models", "collectibles", "jetpack.glb"))

# 6. Models: Props
safe_copy(os.path.join(IMG_3D, "palm_tree.glb"), os.path.join(ASSETS_DIR, "models", "props", "palm_tree.glb"))
safe_copy(os.path.join(IMG_3D, "Meshy_AI_Modern_Wooden_Park_Be_1027102815_texture.glb"), os.path.join(ASSETS_DIR, "models", "props", "bench.glb"))
safe_copy(os.path.join(IMG_3D, "vending_machine.glb"), os.path.join(ASSETS_DIR, "models", "props", "vending_machine.glb"))
safe_copy(os.path.join(IMG_3D, "tunnel_entrance.glb"), os.path.join(ASSETS_DIR, "models", "props", "tunnel_entrance.glb"))

# 7. Animations (FBX)
anim_files = [
    "Running.fbx", "Running Jump.fbx", "Running Slide.fbx", "Idle.fbx",
    "Flying.fbx", "Standing Dodge Left.fbx", "Standing Dodge Right.fbx", "Stumble Backwards.fbx"
]
for af in anim_files:
    safe_copy(os.path.join(ANIM_DIR, af), os.path.join(ASSETS_DIR, "animations", af))

# 8. Images & Renders
safe_copy(os.path.join(ANIM_DIR, "preethi_face_closeup.png"), os.path.join(ASSETS_DIR, "images", "preethi_face_closeup.png"))
safe_copy(os.path.join(ANIM_DIR, "environment_gameplay_render.png"), os.path.join(ASSETS_DIR, "images", "environment_gameplay_render.png"))

print("\n=== ASSET STRUCTURE ORGANIZED SUCCESSFULLY ===")

