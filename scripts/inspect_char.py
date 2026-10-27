import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
char_path = r"C:\Users\saipa\Downloads\animations\preethi_tpose.glb"
bpy.ops.import_scene.gltf(filepath=char_path)

print("=== CHARACTER INSPECTION ===")
for obj in bpy.data.objects:
    print(f"Object: {obj.name}, type: {obj.type}, loc: {obj.location}, dims: {obj.dimensions}")
    if obj.type == 'MESH':
        bb = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box] if hasattr(bpy, 'mathutils') else obj.bound_box
        min_z = min(v[2] for v in obj.bound_box)
        max_z = max(v[2] for v in obj.bound_box)
        min_y = min(v[1] for v in obj.bound_box)
        max_y = max(v[1] for v in obj.bound_box)
        min_x = min(v[0] for v in obj.bound_box)
        max_x = max(v[0] for v in obj.bound_box)
        print(f"  Bounds X: [{min_x:.3f}, {max_x:.3f}]")
        print(f"  Bounds Y: [{min_y:.3f}, {max_y:.3f}]")
        print(f"  Bounds Z: [{min_z:.3f}, {max_z:.3f}]")
        print(f"  Total vertices: {len(obj.data.vertices)}")

