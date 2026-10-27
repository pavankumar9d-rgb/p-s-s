import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
glb_path = r"c:\pk\subway_preethi_surfers\subway\assets\models\character\preethi_running.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

ico = bpy.data.objects.get("Icosphere")
if ico:
    print("Found unwanted Icosphere, deleting it...")
    bpy.data.objects.remove(ico, do_unlink=True)
    
    # Re-export clean GLB
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_nla_strips=True,
        export_skins=True,
        export_morph=True,
        export_apply=False
    )
    # Also sync to models/
    import shutil
    shutil.copyfile(glb_path, r"c:\pk\subway_preethi_surfers\subway\models\preethi_running.glb")
    print("Cleaned and re-exported preethi_running.glb successfully!")
else:
    print("No Icosphere found. Clean!")

