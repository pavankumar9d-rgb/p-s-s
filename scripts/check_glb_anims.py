import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
glb_path = r"c:\pk\subway_preethi_surfers\subway\models\preethi_running.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

print("=== PREETHI_RUNNING.GLB INSPECTION ===")
for obj in bpy.data.objects:
    print(f"Object: {obj.name}, type: {obj.type}")
    if obj.animation_data and obj.animation_data.action:
        print(f"  Action: {obj.animation_data.action.name}, range: {obj.animation_data.action.frame_range}")

for act in bpy.data.actions:
    print(f"Action in file: {act.name}, range: {act.frame_range}")

