import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import Running.fbx
fbx_path = r"C:\Users\saipa\Downloads\animations\Running.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

# Check materials on Mesh_0
mesh_obj = bpy.data.objects.get("Mesh_0")
print("Mesh object:", mesh_obj)
if mesh_obj:
    print("Materials:", [m.name for m in mesh_obj.data.materials if m])
    for mat in mesh_obj.data.materials:
        if mat and mat.use_nodes:
            for node in mat.node_tree.nodes:
                print(f"  Node: {node.name} ({node.type})")

# If texture image is missing or not linked, load the texture from preethi_tpose.glb or image_to_3d
# Let's inspect images in bpy.data.images
print("Images in blend:", [img.name for img in bpy.data.images])

# Export as GLB
out_glb = r"c:\pk\subway_preethi_surfers\subway\models\preethi_running.glb"
os.makedirs(os.path.dirname(out_glb), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    export_animations=True,
    export_current_frame=False,
    export_skins=True,
    export_morph=True,
    export_apply=False
)
print("Exported:", out_glb, "Size:", os.path.getsize(out_glb) if os.path.exists(out_glb) else 0)

