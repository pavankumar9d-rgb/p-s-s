import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

ANIM_DIR = r"c:\pk\subway_preethi_surfers\subway\assets\animations"
OUT_GLB = r"c:\pk\subway_preethi_surfers\subway\assets\models\character\preethi_running.glb"

# Map of FBX filename to clean action name
ANIM_MAP = [
    ("Running.fbx", "run"),
    ("Running Jump.fbx", "jump"),
    ("Running Slide.fbx", "slide"),
    ("Idle.fbx", "idle"),
    ("Standing Dodge Left.fbx", "dodge_left"),
    ("Standing Dodge Right.fbx", "dodge_right"),
    ("Stumble Backwards.fbx", "crash"),
    ("Flying.fbx", "fly")
]

# 1. Import base Running.fbx first (contains mesh + rig)
base_fbx = os.path.join(ANIM_DIR, "Running.fbx")
print("Importing base FBX:", base_fbx)
bpy.ops.import_scene.fbx(filepath=base_fbx)

main_armature = bpy.data.objects.get("Armature")
if not main_armature:
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            main_armature = obj
            break

print("Main Armature found:", main_armature.name if main_armature else "NONE")

if main_armature and main_armature.animation_data and main_armature.animation_data.action:
    main_armature.animation_data.action.name = "run"
    # Push to NLA track so it won't be discarded
    track = main_armature.animation_data.nla_tracks.new()
    track.name = "run"
    track.strips.new("run", int(main_armature.animation_data.action.frame_range[0]), main_armature.animation_data.action)

# 2. Import the other FBXs, grab their action, push to NLA on main armature, then delete temp objects
for filename, anim_name in ANIM_MAP[1:]:
    filepath = os.path.join(ANIM_DIR, filename)
    if not os.path.exists(filepath):
        print("Animation file not found, skipping:", filepath)
        continue
    
    print(f"Importing {filename} for action '{anim_name}'...")
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=filepath)
    new_objs = set(bpy.data.objects) - before_objs
    
    imported_arm = None
    for o in new_objs:
        if o.type == 'ARMATURE':
            imported_arm = o
            break
            
    if imported_arm and imported_arm.animation_data and imported_arm.animation_data.action:
        act = imported_arm.animation_data.action
        act.name = anim_name
        act.use_fake_user = True
        
        # Add NLA strip on main armature
        track = main_armature.animation_data.nla_tracks.new()
        track.name = anim_name
        start_frame = int(act.frame_range[0])
        track.strips.new(anim_name, start_frame, act)
        print(f"  Successfully bound action '{anim_name}' ({act.frame_range[0]} to {act.frame_range[1]}) to main armature!")

    # Delete temporary imported objects
    bpy.ops.object.select_all(action='DESELECT')
    for o in new_objs:
        o.select_set(True)
    bpy.ops.object.delete()

# 3. Export complete rigged character with all animations
print("\nExporting all-in-one animated GLB:", OUT_GLB)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    export_animations=True,
    export_nla_strips=True,
    export_skins=True,
    export_morph=True,
    export_apply=False
)

# Also copy to models/
models_glb = r"c:\pk\subway_preethi_surfers\subway\models\preethi_running.glb"
import shutil
shutil.copyfile(OUT_GLB, models_glb)
print("Complete! Size:", os.path.getsize(OUT_GLB), "bytes")

