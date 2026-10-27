import bpy
import os
import math
import shutil

bpy.ops.wm.read_factory_settings(use_empty=True)

# Import character
char_path = r"C:\Users\saipa\Downloads\animations\preethi_tpose.glb"
bpy.ops.import_scene.gltf(filepath=char_path)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types.RenderSettings, 'engine') else 'BLENDER_EEVEE'
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080

# The head is around Z = 0.70 to 0.85
# Let's test camera at -Y (looking at +Y)
# Head target: (0, 0, 0.75)
cam_dist = 0.65
cam_z = 0.75

# Camera facing character front
bpy.ops.object.camera_add(location=(0.0, -cam_dist, cam_z))
cam = bpy.context.active_object
cam.name = "FaceCam_Front"
cam.data.lens = 75.0
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

# Three point lighting for portrait
bpy.ops.object.light_add(type='POINT', location=(0.3, -cam_dist * 0.8, cam_z + 0.3))
key = bpy.context.active_object
key.data.energy = 50.0
key.data.color = (1.0, 0.95, 0.9)

bpy.ops.object.light_add(type='POINT', location=(-0.35, -cam_dist * 0.7, cam_z))
fill = bpy.context.active_object
fill.data.energy = 25.0
fill.data.color = (0.85, 0.9, 1.0)

bpy.ops.object.light_add(type='POINT', location=(0.0, cam_dist * 0.8, cam_z + 0.4))
rim = bpy.context.active_object
rim.data.energy = 80.0
rim.data.color = (1.0, 0.85, 0.65)

# Render front test
front_out = r"C:\Users\saipa\Downloads\animations\preethi_face_front.png"
scene.render.filepath = front_out
bpy.ops.render.render(write_still=True)

# Also test from +Y (looking back at -Y) in case she faces -Y
bpy.ops.object.camera_add(location=(0.0, cam_dist, cam_z))
cam_back = bpy.context.active_object
cam_back.name = "FaceCam_Back"
cam_back.data.lens = 75.0
cam_back.rotation_euler = (math.radians(90), 0, math.radians(180))
scene.camera = cam_back

back_out = r"C:\Users\saipa\Downloads\animations\preethi_face_back.png"
scene.render.filepath = back_out
bpy.ops.render.render(write_still=True)

print("Face renders done!")

