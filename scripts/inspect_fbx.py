import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = r"C:\Users\saipa\Downloads\animations\Running.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

print("=== RUNNING.FBX INSPECTION ===")
for obj in bpy.data.objects:
    print(f"Object: {obj.name}, type: {obj.type}, dims: {obj.dimensions}")

for act in bpy.data.actions:
    print(f"Action: {act.name}, length: {act.frame_range}")

