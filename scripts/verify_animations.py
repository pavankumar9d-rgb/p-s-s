import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
glb_path = r"c:\pk\subway_preethi_surfers\subway\assets\models\character\preethi_running.glb"

print(f"Loading {glb_path}...")
bpy.ops.import_scene.gltf(filepath=glb_path)

print("\n--- OBJECTS ---")
for obj in bpy.data.objects:
    print(f"  {obj.name} ({obj.type}) - Dims: {obj.dimensions}")

print("\n--- ACTIONS / ANIMATIONS ---")
for act in bpy.data.actions:
    print(f"  Action: '{act.name}' | Range: {act.frame_range[0]} -> {act.frame_range[1]}")

print("\n--- ARMATURE ANIM DATA ---")
arm = bpy.data.objects.get("Armature")
if arm and arm.animation_data:
    print("  Active Action:", arm.animation_data.action.name if arm.animation_data.action else "None")
    for track in arm.animation_data.nla_tracks:
        print(f"  NLA Track '{track.name}':")
        for strip in track.strips:
            print(f"    Strip: '{strip.name}' (Action: '{strip.action.name if strip.action else 'None'}') Frames: {strip.frame_start} -> {strip.frame_end}")

