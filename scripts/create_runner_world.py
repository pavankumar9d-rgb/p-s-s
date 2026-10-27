import bpy
import os
import math

# Output paths
ANIM_DIR = r"C:\Users\saipa\Downloads\animations"
MODELS_DIR = r"c:\pk\subway_preethi_surfers\subway\models"
os.makedirs(ANIM_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Clear everything
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Setup render settings
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types.RenderSettings, 'engine') else 'BLENDER_EEVEE'
scene.render.resolution_x = 1080
scene.render.resolution_y = 1920
scene.render.resolution_percentage = 100

# Color management for vibrant mobile game look
scene.view_settings.view_transform = 'AgX' if 'AgX' in [c.name for c in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Standard'
scene.view_settings.look = 'High Contrast'

# 3. Create Materials Helper
def make_mat(name, base_color, metallic=0.0, roughness=0.5, emissive=(0,0,0,1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*base_color, 1.0) if len(base_color) == 3 else base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emissive
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
        elif 'Emission' in bsdf.inputs:
            bsdf.inputs['Emission'].default_value = emissive
    return mat

mat_ballast = make_mat("M_Ballast", (0.28, 0.25, 0.22), roughness=0.95)
mat_rail = make_mat("M_SteelRail", (0.75, 0.77, 0.80), metallic=0.92, roughness=0.22)
mat_tie = make_mat("M_WoodTie", (0.18, 0.12, 0.08), roughness=0.88)
mat_concrete = make_mat("M_PlatformConcrete", (0.62, 0.60, 0.58), roughness=0.7)
mat_yellow_hazard = make_mat("M_YellowHazard", (0.95, 0.75, 0.05), roughness=0.35, emissive=(0.95, 0.75, 0.05, 1.0), emissive_strength=0.3)
mat_dark_metal = make_mat("M_DarkMetal", (0.15, 0.16, 0.18), metallic=0.85, roughness=0.35)
mat_signal_red = make_mat("M_SignalRed", (1.0, 0.05, 0.05), emissive=(1.0, 0.05, 0.05, 1.0), emissive_strength=4.0)
mat_signal_green = make_mat("M_SignalGreen", (0.05, 1.0, 0.2), emissive=(0.05, 1.0, 0.2, 1.0), emissive_strength=4.0)
mat_cable = make_mat("M_OverheadCable", (0.08, 0.08, 0.08), metallic=0.7, roughness=0.5)
mat_tunnel = make_mat("M_TunnelWall", (0.35, 0.38, 0.42), roughness=0.8)
mat_tunnel_stripe = make_mat("M_TunnelStripe", (0.0, 0.85, 1.0), emissive=(0.0, 0.85, 1.0, 1.0), emissive_strength=3.0)
mat_bldg_1 = make_mat("M_BuildingWarm", (0.78, 0.52, 0.42), roughness=0.75)
mat_bldg_2 = make_mat("M_BuildingTeal", (0.28, 0.55, 0.62), roughness=0.65)
mat_bldg_3 = make_mat("M_BuildingGold", (0.85, 0.68, 0.38), roughness=0.7)
mat_window_glow = make_mat("M_WindowGlow", (1.0, 0.88, 0.5), emissive=(1.0, 0.88, 0.5, 1.0), emissive_strength=2.5)

# 4. Collections
col_track = bpy.data.collections.new("01_Tracks")
col_gantries = bpy.data.collections.new("02_CatenaryGantries")
col_platforms = bpy.data.collections.new("03_PlatformsAndWalls")
col_tunnel = bpy.data.collections.new("04_TunnelAndBridge")
col_skyline = bpy.data.collections.new("05_CitySkyline")
col_lighting = bpy.data.collections.new("06_LightingAndCamera")
for c in [col_track, col_gantries, col_platforms, col_tunnel, col_skyline, col_lighting]:
    scene.collection.children.link(c)

# 5. Build 3-Lane Track System
LANES = [-2.0, 0.0, 2.0]
RAIL_GAUGE = 1.05
TRACK_LENGTH = 120.0  # Length in meters along -Y

# Trackbed gravel foundation
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -TRACK_LENGTH / 2, -0.15))
bed = bpy.context.active_object
bed.name = "Trackbed_Ballast"
bed.scale = (7.8, TRACK_LENGTH / 2, 0.3)
bed.data.materials.append(mat_ballast)
col_track.objects.link(bed)
scene.collection.objects.unlink(bed)

# Rails for all 3 lanes
for i, lx in enumerate(LANES):
    for side, offset in [("L", -RAIL_GAUGE / 2), ("R", RAIL_GAUGE / 2)]:
        rx = lx + offset
        bpy.ops.mesh.primitive_cube_add(size=1, location=(rx, -TRACK_LENGTH / 2, 0.08))
        rail = bpy.context.active_object
        rail.name = f"Rail_Lane{i+1}_{side}"
        rail.scale = (0.065, TRACK_LENGTH / 2, 0.09)
        rail.data.materials.append(mat_rail)
        col_track.objects.link(rail)
        scene.collection.objects.unlink(rail)

# Sleepers / Ties (cross-ties)
tie_spacing = 0.75
tie_count = int(TRACK_LENGTH / tie_spacing)
for i in range(tie_count):
    y_pos = -i * tie_spacing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y_pos, 0.02))
    tie = bpy.context.active_object
    tie.name = f"Tie_{i:03d}"
    tie.scale = (6.6, 0.14, 0.05)
    tie.data.materials.append(mat_tie)
    col_track.objects.link(tie)
    scene.collection.objects.unlink(tie)

# 6. Overhead Catenary Gantries (Electrical arches every 20m)
for g_idx in range(6):
    gy = -10.0 - g_idx * 20.0
    # Left vertical column
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=6.2, location=(-4.2, gy, 3.1))
    pole_l = bpy.context.active_object
    pole_l.name = f"Gantry_Pole_L_{g_idx}"
    pole_l.data.materials.append(mat_dark_metal)
    col_gantries.objects.link(pole_l)
    scene.collection.objects.unlink(pole_l)

    # Right vertical column
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=6.2, location=(4.2, gy, 3.1))
    pole_r = bpy.context.active_object
    pole_r.name = f"Gantry_Pole_R_{g_idx}"
    pole_r.data.materials.append(mat_dark_metal)
    col_gantries.objects.link(pole_r)
    scene.collection.objects.unlink(pole_r)

    # Cross truss beam
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy, 6.0))
    beam = bpy.context.active_object
    beam.name = f"Gantry_Beam_{g_idx}"
    beam.scale = (8.6, 0.35, 0.35)
    beam.data.materials.append(mat_dark_metal)
    col_gantries.objects.link(beam)
    scene.collection.objects.unlink(beam)

    # Signal lights above each lane
    for l_idx, lx in enumerate(LANES):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(lx, gy - 0.25, 5.3))
        sig_box = bpy.context.active_object
        sig_box.name = f"SignalBox_{g_idx}_L{l_idx}"
        sig_box.scale = (0.28, 0.15, 0.5)
        sig_box.data.materials.append(mat_dark_metal)
        col_gantries.objects.link(sig_box)
        scene.collection.objects.unlink(sig_box)

        # Light lens
        lens_mat = mat_signal_green if (g_idx + l_idx) % 2 == 0 else mat_signal_red
        bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.06, location=(lx, gy - 0.35, 5.3))
        lens = bpy.context.active_object
        lens.rotation_euler = (math.radians(90), 0, 0)
        lens.name = f"SignalLens_{g_idx}_L{l_idx}"
        lens.data.materials.append(lens_mat)
        col_gantries.objects.link(lens)
        scene.collection.objects.unlink(lens)

# Overhead contact electrical wires running down the track
for lx in LANES:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=TRACK_LENGTH, location=(lx, -TRACK_LENGTH / 2, 5.6))
    wire = bpy.context.active_object
    wire.rotation_euler = (math.radians(90), 0, 0)
    wire.name = f"Catenary_Wire_{lx}"
    wire.data.materials.append(mat_cable)
    col_gantries.objects.link(wire)
    scene.collection.objects.unlink(wire)

# 7. Platforms and Safety Sidewalks
for side, px in [("Left", -4.9), ("Right", 4.9)]:
    # Concrete platform edge
    bpy.ops.mesh.primitive_cube_add(size=1, location=(px, -TRACK_LENGTH / 2, 0.45))
    plat = bpy.context.active_object
    plat.name = f"Platform_{side}"
    plat.scale = (1.8, TRACK_LENGTH / 2, 0.9)
    plat.data.materials.append(mat_concrete)
    col_platforms.objects.link(plat)
    scene.collection.objects.unlink(plat)

    # Yellow tactile warning edge stripe
    edge_x = px + (0.85 if side == "Left" else -0.85)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(edge_x, -TRACK_LENGTH / 2, 0.91))
    hazard = bpy.context.active_object
    hazard.name = f"Platform_HazardStripe_{side}"
    hazard.scale = (0.2, TRACK_LENGTH / 2, 0.03)
    hazard.data.materials.append(mat_yellow_hazard)
    col_platforms.objects.link(hazard)
    scene.collection.objects.unlink(hazard)

    # Safety wall / railing behind platform
    wall_x = px + (-0.95 if side == "Left" else 0.95)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(wall_x, -TRACK_LENGTH / 2, 2.2))
    pwall = bpy.context.active_object
    pwall.name = f"Platform_Wall_{side}"
    pwall.scale = (0.25, TRACK_LENGTH / 2, 2.6)
    pwall.data.materials.append(mat_tunnel)
    col_platforms.objects.link(pwall)
    scene.collection.objects.unlink(pwall)

# 8. Tunnel Entrance Arch at -85m
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -85.0, 4.2))
arch_roof = bpy.context.active_object
arch_roof.name = "Tunnel_Arch_Roof"
arch_roof.scale = (11.0, 4.0, 1.2)
arch_roof.data.materials.append(mat_tunnel)
col_tunnel.objects.link(arch_roof)
scene.collection.objects.unlink(arch_roof)

# Arch Pillars
for side, ax in [("Left", -5.5), ("Right", 5.5)]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(ax, -85.0, 2.4))
    pillar = bpy.context.active_object
    pillar.name = f"Tunnel_Pillar_{side}"
    pillar.scale = (1.6, 4.0, 4.8)
    pillar.data.materials.append(mat_tunnel)
    col_tunnel.objects.link(pillar)
    scene.collection.objects.unlink(pillar)

# Neon speed stripes on tunnel portal
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -83.0, 4.7))
neon = bpy.context.active_object
neon.name = "Tunnel_Neon_Portal"
neon.scale = (9.8, 0.1, 0.18)
neon.data.materials.append(mat_tunnel_stripe)
col_tunnel.objects.link(neon)
scene.collection.objects.unlink(neon)

# 9. Distant Skyline / Cityscape Buildings
bldg_mats = [mat_bldg_1, mat_bldg_2, mat_bldg_3]
for b_idx in range(18):
    side = -1 if b_idx % 2 == 0 else 1
    bx = side * (8.5 + (b_idx % 3) * 2.2)
    by = -10.0 - b_idx * 6.0
    bh = 12.0 + (b_idx % 5) * 4.0
    bw = 3.5 + (b_idx % 2) * 1.5
    bd = 4.0 + (b_idx % 4) * 1.2
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bh / 2.0))
    bldg = bpy.context.active_object
    bldg.name = f"City_Building_{b_idx:02d}"
    bldg.scale = (bw, bd, bh)
    bldg.data.materials.append(bldg_mats[b_idx % len(bldg_mats)])
    col_skyline.objects.link(bldg)
    scene.collection.objects.unlink(bldg)

    # Windows on building facing track
    rows = int(bh / 2.5)
    for r in range(1, rows):
        w_y_offset = (b_idx % 3 - 1) * 0.8
        bpy.ops.mesh.primitive_cube_add(size=1, location=(bx - side * (bw / 2.0 + 0.05), by + w_y_offset, r * 2.4))
        win = bpy.context.active_object
        win.name = f"Window_{b_idx}_{r}"
        win.scale = (0.08, 1.2, 0.8)
        win.data.materials.append(mat_window_glow)
        col_skyline.objects.link(win)
        scene.collection.objects.unlink(win)

# 10. Warm Golden-Hour Lighting & Atmosphere
# Main Key Sun Light (Warm sunset/sunrise)
bpy.ops.object.light_add(type='SUN', location=(8, 10, 20))
sun = bpy.context.active_object
sun.name = "Key_Sun_GoldenHour"
sun.data.energy = 4.5
sun.data.color = (1.0, 0.82, 0.55)  # Warm rich golden
sun.rotation_euler = (math.radians(48), math.radians(12), math.radians(-35))
col_lighting.objects.link(sun)
scene.collection.objects.unlink(sun)

# Fill Sky Light (Soft cool lavender-blue fill)
bpy.ops.object.light_add(type='SUN', location=(-10, -10, 15))
fill = bpy.context.active_object
fill.name = "Fill_Sky_Lavender"
fill.data.energy = 1.6
fill.data.color = (0.65, 0.72, 0.95)
fill.rotation_euler = (math.radians(65), math.radians(-15), math.radians(140))
col_lighting.objects.link(fill)
scene.collection.objects.unlink(fill)

# World background (Warm twilight gradient)
world = bpy.data.worlds.new("SubwayTwilightWorld")
scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.58, 0.68, 0.85, 1.0)
    bg_node.inputs['Strength'].default_value = 1.1

# 11. Portrait Gameplay Camera
bpy.ops.object.camera_add(location=(0.0, 5.5, 4.2))
cam = bpy.context.active_object
cam.name = "Portrait_GameCamera"
cam.data.lens = 32.0  # Dynamic mobile FOV
cam.rotation_euler = (math.radians(72), 0, math.radians(180))
scene.camera = cam
col_lighting.objects.link(cam)
scene.collection.objects.unlink(cam)

# 12. Save .blend file
blend_file = os.path.join(ANIM_DIR, "preethi_endless_runner_environment.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_file)
print(f"Successfully saved .blend to: {blend_file}")

# 13. Export environment GLB for Three.js
env_glb = os.path.join(MODELS_DIR, "environment_modular.glb")
bpy.ops.export_scene.gltf(
    filepath=env_glb,
    export_format='GLB',
    use_selection=False,
    export_apply=True
)
print(f"Successfully exported environment GLB to: {env_glb}")

# Also copy to ANIM_DIR
env_glb_anim = os.path.join(ANIM_DIR, "environment_modular.glb")
import shutil
shutil.copyfile(env_glb, env_glb_anim)

# 14. Render Environment Preview
env_preview = os.path.join(ANIM_DIR, "environment_preview.png")
scene.render.filepath = env_preview
bpy.ops.render.render(write_still=True)
print(f"Rendered environment preview to: {env_preview}")

# Also copy preview to brain/artifacts for user review
brain_preview = r"C:\Users\saipa\.gemini\antigravity\brain\fb0489fa-cc59-4a2f-a0ff-2788d9088a8b\environment_preview.png"
shutil.copyfile(env_preview, brain_preview)

# 15. Now render Face Closeup of Preethi
char_path = os.path.join(ANIM_DIR, "preethi_tpose.glb")
if os.path.exists(char_path):
    print("Importing Preethi model for face closeup render...")
    bpy.ops.import_scene.gltf(filepath=char_path)
    
    # Hide environment temporarily for clean studio face render
    for c in [col_track, col_gantries, col_platforms, col_tunnel, col_skyline]:
        c.hide_render = True
    
    # Create Portrait Studio Face Camera
    bpy.ops.object.camera_add(location=(0.0, -0.65, 1.48))
    face_cam = bpy.context.active_object
    face_cam.name = "Preethi_FaceCloseupCamera"
    face_cam.data.lens = 85.0  # Portrait lens
    face_cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = face_cam
    
    # Portrait aspect ratio 1:1 or 9:16 for portrait detail
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080
    
    # Key light on face
    bpy.ops.object.light_add(type='POINT', location=(0.3, -0.5, 1.65))
    face_light = bpy.context.active_object
    face_light.data.energy = 25.0
    face_light.data.color = (1.0, 0.95, 0.9)
    
    # Fill light
    bpy.ops.object.light_add(type='POINT', location=(-0.4, -0.4, 1.45))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 12.0
    fill_light.data.color = (0.85, 0.9, 1.0)
    
    # Rim light for hair separation
    bpy.ops.object.light_add(type='POINT', location=(0.0, 0.6, 1.8))
    rim_light = bpy.context.active_object
    rim_light.data.energy = 40.0
    rim_light.data.color = (1.0, 0.85, 0.7)
    
    face_preview = os.path.join(ANIM_DIR, "preethi_face_closeup.png")
    scene.render.filepath = face_preview
    bpy.ops.render.render(write_still=True)
    print(f"Rendered Preethi face closeup to: {face_preview}")
    
    brain_face = r"C:\Users\saipa\.gemini\antigravity\brain\fb0489fa-cc59-4a2f-a0ff-2788d9088a8b\preethi_face_closeup.png"
    shutil.copyfile(face_preview, brain_face)
    shutil.copyfile(face_preview, os.path.join(MODELS_DIR, "preethi_face_closeup.png"))

print("\n=== COMPLETE WORKFLOW SUCCESSFUL ===")

