"""
Build complete 3D endless runner environment and character beauty renders in Blender.
Outputs:
  - preethi_endless_runner_environment.blend
  - environment_modular.glb
  - environment_gameplay_render.png
  - preethi_face_closeup.png
"""
import bpy
import os
import math
import shutil

ANIM_DIR = r"C:\Users\saipa\Downloads\animations"
MODELS_DIR = r"c:\pk\subway_preethi_surfers\subway\models"
BRAIN_DIR = r"C:\Users\saipa\.gemini\antigravity\brain\fb0489fa-cc59-4a2f-a0ff-2788d9088a8b"
IMAGE_3D_DIR = r"C:\Users\saipa\Downloads\image to 3d"

os.makedirs(ANIM_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Reset Scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types.RenderSettings, 'engine') else 'BLENDER_EEVEE'

# 2. Material Helper
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

mat_ground = make_mat("M_GroundSuburban", (0.32, 0.35, 0.30), roughness=0.95)
mat_ballast = make_mat("M_TrackBallast", (0.24, 0.22, 0.20), roughness=0.95)
mat_rail = make_mat("M_SteelRail", (0.78, 0.80, 0.84), metallic=0.95, roughness=0.18)
mat_tie = make_mat("M_DarkWoodTie", (0.16, 0.11, 0.07), roughness=0.85)
mat_tie_plate = make_mat("M_TiePlateMetal", (0.18, 0.18, 0.20), metallic=0.8, roughness=0.4)
mat_platform = make_mat("M_PlatformConcrete", (0.58, 0.56, 0.54), roughness=0.7)
mat_hazard_stripe = make_mat("M_HazardYellow", (1.0, 0.76, 0.02), roughness=0.35, emissive=(1.0, 0.76, 0.02, 1.0), emissive_strength=0.5)
mat_dark_iron = make_mat("M_GantryIron", (0.14, 0.15, 0.18), metallic=0.88, roughness=0.3)
mat_cable = make_mat("M_CatenaryWire", (0.06, 0.06, 0.07), metallic=0.7, roughness=0.4)
mat_signal_green = make_mat("M_SignalGreen", (0.05, 1.0, 0.2), emissive=(0.05, 1.0, 0.2, 1.0), emissive_strength=5.0)
mat_signal_red = make_mat("M_SignalRed", (1.0, 0.08, 0.08), emissive=(1.0, 0.08, 0.08, 1.0), emissive_strength=5.0)
mat_signal_yellow = make_mat("M_SignalYellow", (1.0, 0.8, 0.05), emissive=(1.0, 0.8, 0.05, 1.0), emissive_strength=5.0)
mat_gold_coin = make_mat("M_GoldCoin", (1.0, 0.82, 0.08), metallic=0.96, roughness=0.12, emissive=(1.0, 0.75, 0.0, 1.0), emissive_strength=0.8)
mat_coin_rim = make_mat("M_GoldCoinRim", (0.95, 0.7, 0.05), metallic=0.98, roughness=0.08)
mat_tunnel = make_mat("M_TunnelArchConcrete", (0.28, 0.30, 0.34), roughness=0.75)
mat_tunnel_neon = make_mat("M_TunnelNeonCyan", (0.0, 0.9, 1.0), emissive=(0.0, 0.9, 1.0, 1.0), emissive_strength=4.0)

# Stylized Building Palettes
mat_bldg_coral = make_mat("M_BldgCoral", (0.85, 0.48, 0.38), roughness=0.7)
mat_bldg_teal = make_mat("M_BldgTeal", (0.22, 0.52, 0.60), roughness=0.65)
mat_bldg_cream = make_mat("M_BldgCream", (0.92, 0.84, 0.70), roughness=0.75)
mat_bldg_indigo = make_mat("M_BldgIndigo", (0.25, 0.30, 0.45), roughness=0.7)
mat_window_lit = make_mat("M_WindowLit", (1.0, 0.88, 0.55), emissive=(1.0, 0.88, 0.55, 1.0), emissive_strength=3.0)

# Train Materials (Vibrant Subway Surfers style: orange/red express train)
mat_train_body = make_mat("M_TrainRedExpress", (0.88, 0.18, 0.12), metallic=0.25, roughness=0.35)
mat_train_roof = make_mat("M_TrainRoofGrey", (0.35, 0.37, 0.40), metallic=0.4, roughness=0.5)
mat_train_stripe = make_mat("M_TrainWhiteStripe", (0.95, 0.95, 0.95), roughness=0.3)
mat_train_window = make_mat("M_TrainWindowTint", (0.1, 0.15, 0.22), metallic=0.9, roughness=0.1)
mat_train_headlight = make_mat("M_TrainHeadlight", (1.0, 0.98, 0.85), emissive=(1.0, 0.98, 0.85, 1.0), emissive_strength=6.0)

# 3. Create Scene Collections
col_tracks = bpy.data.collections.new("01_RailwayTracks")
col_gantries = bpy.data.collections.new("02_CatenaryGantries")
col_platforms = bpy.data.collections.new("03_Platforms")
col_tunnel = bpy.data.collections.new("04_TunnelAndBridge")
col_trains = bpy.data.collections.new("05_Trains")
col_collectibles = bpy.data.collections.new("06_CoinsAndPickups")
col_cityscape = bpy.data.collections.new("07_CityBuildings")
col_character = bpy.data.collections.new("08_PreethiCharacter")
col_lighting = bpy.data.collections.new("09_LightingAndCameras")

for c in [col_tracks, col_gantries, col_platforms, col_tunnel, col_trains, col_collectibles, col_cityscape, col_character, col_lighting]:
    scene.collection.children.link(c)

def link_only(obj, target_col):
    target_col.objects.link(obj)
    if obj.name in scene.collection.objects:
        scene.collection.objects.unlink(obj)

# 4. Global World & Environment Geometry
Y_START = 15.0
Y_END = -140.0
Y_LEN = Y_START - Y_END
Y_MID = (Y_START + Y_END) / 2.0

# Base Ground Plane (infinite horizon feel)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, Y_MID, -0.4))
ground = bpy.context.active_object
ground.name = "Global_Ground"
ground.scale = (80.0, Y_LEN / 2.0 + 30.0, 1.0)
ground.data.materials.append(mat_ground)
link_only(ground, col_cityscape)

# Raised Ballast Gravel Bed for the 3 Tracks
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, Y_MID, -0.15))
ballast = bpy.context.active_object
ballast.name = "Ballast_TrackBed"
ballast.scale = (7.8, Y_LEN / 2.0, 0.3)
ballast.data.materials.append(mat_ballast)
link_only(ballast, col_tracks)

# 5. 3-Lane Railway Tracks
LANES = [-2.0, 0.0, 2.0]
RAIL_GAUGE = 1.05

for l_idx, lx in enumerate(LANES):
    for side, sign in [("L", -1), ("R", 1)]:
        rx = lx + sign * (RAIL_GAUGE / 2.0)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(rx, Y_MID, 0.08))
        rail = bpy.context.active_object
        rail.name = f"SteelRail_L{l_idx+1}_{side}"
        rail.scale = (0.065, Y_LEN / 2.0, 0.09)
        rail.data.materials.append(mat_rail)
        link_only(rail, col_tracks)

# Railway Ties / Sleepers with Tie Plates
tie_spacing = 0.8
tie_count = int(Y_LEN / tie_spacing)
for i in range(tie_count):
    ty = Y_START - i * tie_spacing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, ty, 0.02))
    tie = bpy.context.active_object
    tie.name = f"Tie_{i:03d}"
    tie.scale = (6.8, 0.14, 0.05)
    tie.data.materials.append(mat_tie)
    link_only(tie, col_tracks)

    # Add metallic tie plates under rails for close-up track realism
    if i < 40:  # Only for first 40 ties near camera to keep geometry lean
        for lx in LANES:
            for side, sign in [("L", -1), ("R", 1)]:
                px = lx + sign * (RAIL_GAUGE / 2.0)
                bpy.ops.mesh.primitive_cube_add(size=1, location=(px, ty, 0.045))
                plate = bpy.context.active_object
                plate.name = f"Plate_{i}_{lx}_{side}"
                plate.scale = (0.16, 0.18, 0.015)
                plate.data.materials.append(mat_tie_plate)
                link_only(plate, col_tracks)

# 6. Overhead Catenary Gantries & Electrical Lines
for g_idx in range(8):
    gy = 10.0 - g_idx * 18.0
    # Left Column
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=6.2, location=(-4.2, gy, 3.1))
    p_l = bpy.context.active_object
    p_l.name = f"Gantry_Col_L_{g_idx}"
    p_l.data.materials.append(mat_dark_iron)
    link_only(p_l, col_gantries)

    # Right Column
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=6.2, location=(4.2, gy, 3.1))
    p_r = bpy.context.active_object
    p_r.name = f"Gantry_Col_R_{g_idx}"
    p_r.data.materials.append(mat_dark_iron)
    link_only(p_r, col_gantries)

    # Cross Truss
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy, 6.0))
    truss = bpy.context.active_object
    truss.name = f"Gantry_Truss_{g_idx}"
    truss.scale = (8.6, 0.32, 0.35)
    truss.data.materials.append(mat_dark_iron)
    link_only(truss, col_gantries)

    # Overhead Signal Lights per lane
    signals = [mat_signal_green, mat_signal_red, mat_signal_yellow]
    for l_idx, lx in enumerate(LANES):
        # Housing
        bpy.ops.mesh.primitive_cube_add(size=1, location=(lx, gy - 0.22, 5.3))
        box = bpy.context.active_object
        box.name = f"SignalBox_{g_idx}_L{l_idx}"
        box.scale = (0.28, 0.16, 0.5)
        box.data.materials.append(mat_dark_iron)
        link_only(box, col_gantries)

        # Lens
        lens_mat = signals[(g_idx + l_idx) % 3]
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.06, location=(lx, gy - 0.32, 5.3))
        lens = bpy.context.active_object
        lens.rotation_euler = (math.radians(90), 0, 0)
        lens.name = f"SignalLens_{g_idx}_L{l_idx}"
        lens.data.materials.append(lens_mat)
        link_only(lens, col_gantries)

# Catenary Contact Wires
for lx in LANES:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=Y_LEN, location=(lx, Y_MID, 5.6))
    wire = bpy.context.active_object
    wire.rotation_euler = (math.radians(90), 0, 0)
    wire.name = f"Wire_HighVoltage_{lx}"
    wire.data.materials.append(mat_cable)
    link_only(wire, col_gantries)

# 7. Platforms on Both Sides
for side, px in [("Left", -5.0), ("Right", 5.0)]:
    # Concrete Deck
    bpy.ops.mesh.primitive_cube_add(size=1, location=(px, Y_MID, 0.45))
    plat = bpy.context.active_object
    plat.name = f"Platform_{side}"
    plat.scale = (1.9, Y_LEN / 2.0, 0.9)
    plat.data.materials.append(mat_platform)
    link_only(plat, col_platforms)

    # Yellow Tactile Hazard Strip
    edge_x = px + (0.88 if side == "Left" else -0.88)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(edge_x, Y_MID, 0.91))
    stripe = bpy.context.active_object
    stripe.name = f"Platform_Stripe_{side}"
    stripe.scale = (0.22, Y_LEN / 2.0, 0.03)
    stripe.data.materials.append(mat_hazard_stripe)
    link_only(stripe, col_platforms)

    # Barrier Wall
    wall_x = px + (-1.0 if side == "Left" else 1.0)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(wall_x, Y_MID, 2.2))
    pwall = bpy.context.active_object
    pwall.name = f"Platform_Wall_{side}"
    pwall.scale = (0.25, Y_LEN / 2.0, 2.6)
    pwall.data.materials.append(mat_tunnel)
    link_only(pwall, col_platforms)

# 8. Stylized Metro Express Train on Right Track (at y = -28m)
train_x = LANES[2]  # Right lane: x = +2.0
train_y = -35.0
train_len = 16.0
train_w = 1.95
train_h = 2.4

# Train Body
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 1.45))
t_body = bpy.context.active_object
t_body.name = "MetroTrain_Body"
t_body.scale = (train_w, train_len, train_h)
t_body.data.materials.append(mat_train_body)
link_only(t_body, col_trains)

# Train Roof
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 2.7))
t_roof = bpy.context.active_object
t_roof.name = "MetroTrain_Roof"
t_roof.scale = (train_w * 0.95, train_len * 0.98, 0.25)
t_roof.data.materials.append(mat_train_roof)
link_only(t_roof, col_trains)

# Train Speed Stripe along sides
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 1.3))
t_stripe = bpy.context.active_object
t_stripe.name = "MetroTrain_SideStripe"
t_stripe.scale = (train_w + 0.02, train_len, 0.35)
t_stripe.data.materials.append(mat_train_stripe)
link_only(t_stripe, col_trains)

# Train Front Windshield facing player (+Y)
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y + train_len / 2.0 + 0.02, 1.75))
t_wind = bpy.context.active_object
t_wind.name = "MetroTrain_FrontWindshield"
t_wind.scale = (train_w * 0.8, 0.06, 0.75)
t_wind.data.materials.append(mat_train_window)
link_only(t_wind, col_trains)

# Train Headlights
for side_sign in [-1, 1]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.08, location=(train_x + side_sign * 0.65, train_y + train_len / 2.0 + 0.03, 0.85))
    t_hl = bpy.context.active_object
    t_hl.rotation_euler = (math.radians(90), 0, 0)
    t_hl.name = f"MetroTrain_Headlight_{side_sign}"
    t_hl.data.materials.append(mat_train_headlight)
    link_only(t_hl, col_trains)

# 9. Floating Golden Collectible Coins (Arc along center lane)
coin_start_y = -3.0
coin_count = 10
for i in range(coin_count):
    cy = coin_start_y - i * 1.6
    # Subtle parabolic jump arc for coins 3 to 7
    arc_z = 0.95 + math.sin(i / (coin_count - 1) * math.pi) * 1.2
    
    # Outer coin ring
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.07, location=(0.0, cy, arc_z))
    coin = bpy.context.active_object
    coin.rotation_euler = (math.radians(90), 0, math.radians(25 * i))
    coin.name = f"GoldCoin_{i:02d}"
    coin.data.materials.append(mat_gold_coin)
    link_only(coin, col_collectibles)

    # Inner embossed coin core
    bpy.ops.mesh.primitive_cylinder_add(radius=0.21, depth=0.085, location=(0.0, cy, arc_z))
    coin_inner = bpy.context.active_object
    coin_inner.rotation_euler = (math.radians(90), 0, math.radians(25 * i))
    coin_inner.name = f"GoldCoin_Core_{i:02d}"
    coin_inner.data.materials.append(mat_coin_rim)
    link_only(coin_inner, col_collectibles)

# Low Track Barrier Obstacle on Left Lane (x = -2.0 at y = -14m)
bar_x = LANES[0]
bar_y = -14.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(bar_x, bar_y, 0.55))
barrier = bpy.context.active_object
barrier.name = "Track_Obstacle_Barrier"
barrier.scale = (1.7, 0.22, 0.9)
barrier.data.materials.append(mat_hazard_stripe)
link_only(barrier, col_collectibles)

# 10. Tunnel Arch Portal at -90m
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -90.0, 4.4))
arch = bpy.context.active_object
arch.name = "Subway_Tunnel_Portal"
arch.scale = (11.5, 4.0, 1.4)
arch.data.materials.append(mat_tunnel)
link_only(arch, col_tunnel)

# Tunnel Neon Halo
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -88.0, 4.9))
t_neon = bpy.context.active_object
t_neon.name = "Tunnel_Neon_Halo"
t_neon.scale = (10.2, 0.1, 0.2)
t_neon.data.materials.append(mat_tunnel_neon)
link_only(t_neon, col_tunnel)

# 11. Flanking City Buildings
bldg_pal = [mat_bldg_coral, mat_bldg_teal, mat_bldg_cream, mat_bldg_indigo]
for b_i in range(22):
    side = -1 if b_i % 2 == 0 else 1
    bx = side * (8.8 + (b_i % 3) * 2.5)
    by = 8.0 - b_i * 6.5
    bh = 14.0 + (b_i % 6) * 3.5
    bw = 4.0 + (b_i % 2) * 1.5
    bd = 4.8 + (b_i % 4) * 1.0

    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx, by, bh / 2.0))
    bldg = bpy.context.active_object
    bldg.name = f"City_Highrise_{b_i:02d}"
    bldg.scale = (bw, bd, bh)
    bldg.data.materials.append(bldg_pal[b_i % len(bldg_pal)])
    link_only(bldg, col_cityscape)

    # Windows on facade
    rows = int(bh / 2.8)
    for r in range(1, rows):
        w_offset = (b_i % 3 - 1) * 0.9
        bpy.ops.mesh.primitive_cube_add(size=1, location=(bx - side * (bw / 2.0 + 0.05), by + w_offset, r * 2.6))
        win = bpy.context.active_object
        win.name = f"LitWindow_{b_i}_{r}"
        win.scale = (0.08, 1.3, 0.85)
        win.data.materials.append(mat_window_lit)
        link_only(win, col_cityscape)

# 12. Import Character (Preethi) and place in running action on Center Lane!
char_path = os.path.join(ANIM_DIR, "preethi_tpose.glb")
if os.path.exists(char_path):
    print("Importing Preethi into runner scene...")
    bpy.ops.import_scene.gltf(filepath=char_path)
    # The imported character mesh is Mesh_0
    char_obj = bpy.data.objects.get("Mesh_0")
    if char_obj:
        char_obj.name = "Preethi_Character"
        # Center of character feet: Z origin is waist at Z=0, feet at Z = -0.95
        # Place her on center track (x=0.0, y=0.0, z=0.95 so feet touch rail bed at Z=0)
        char_obj.location = (0.0, 0.0, 0.95)
        # She should face -Y (running forward into screen)
        # Her front was at -Y in our face test, so no rotation needed, or rotate 180 if facing player
        # In our face test, FaceCam_Front at -Y looked directly at her face!
        # So her face is pointing at -Y! That means she is already facing -Y (running forward down the track)!
        link_only(char_obj, col_character)

# 13. Lighting: Warm Sunset / Golden Hour Mood
# Main Golden Sun
bpy.ops.object.light_add(type='SUN', location=(10, 15, 25))
sun = bpy.context.active_object
sun.name = "Sun_GoldenHour"
sun.data.energy = 5.0
sun.data.color = (1.0, 0.84, 0.58)  # Warm golden amber
sun.rotation_euler = (math.radians(48), math.radians(14), math.radians(-32))
link_only(sun, col_lighting)

# Sky Fill Light (Soft lavender / twilight ambient bounce)
bpy.ops.object.light_add(type='SUN', location=(-12, -15, 20))
sky_fill = bpy.context.active_object
sky_fill.name = "Light_SkyBounce"
sky_fill.data.energy = 1.8
sky_fill.data.color = (0.62, 0.70, 0.95)  # Soft twilight blue
sky_fill.rotation_euler = (math.radians(65), math.radians(-18), math.radians(145))
link_only(sky_fill, col_lighting)

# World Sky Background
world = bpy.data.worlds.new("GoldenHourSkyWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs['Color'].default_value = (0.65, 0.72, 0.88, 1.0)
    bg.inputs['Strength'].default_value = 1.2

# 14. Cameras:
# A) Gameplay Camera (Portrait 9:16 - 1080x1920)
# Third person camera behind Preethi looking down the 3-lane track
bpy.ops.object.camera_add(location=(0.0, 5.0, 3.8))
cam_game = bpy.context.active_object
cam_game.name = "Camera_PortraitGameplay"
cam_game.data.lens = 30.0  # Wide action mobile FOV
cam_game.rotation_euler = (math.radians(74), 0, math.radians(180))
link_only(cam_game, col_lighting)

# B) Preethi Face Closeup Beauty Camera (Square 1:1 - 1080x1080)
# Framed on Preethi's head/face (waist Z=0.95, head Z ~ 1.70)
bpy.ops.object.camera_add(location=(0.0, -0.90, 1.70))
cam_face = bpy.context.active_object
cam_face.name = "Camera_FaceBeautyCloseup"
cam_face.data.lens = 70.0  # Flattering portrait lens
cam_face.rotation_euler = (math.radians(90), 0, 0)
link_only(cam_face, col_lighting)

# 15. Save .blend project
blend_out = os.path.join(ANIM_DIR, "preethi_endless_runner_environment.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"Saved complete Blender project: {blend_out}")

# 16. Export Modular Environment GLB (for game engine)
glb_out = os.path.join(MODELS_DIR, "environment_modular.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_out,
    export_format='GLB',
    use_selection=False,
    export_apply=True
)
print(f"Exported environment GLB: {glb_out}")
shutil.copyfile(glb_out, os.path.join(ANIM_DIR, "environment_modular.glb"))

# 17. Render Gameplay View (Portrait 1080x1920)
scene.camera = cam_game
scene.render.resolution_x = 1080
scene.render.resolution_y = 1920
gameplay_img = os.path.join(ANIM_DIR, "environment_gameplay_render.png")
scene.render.filepath = gameplay_img
bpy.ops.render.render(write_still=True)
print(f"Rendered gameplay preview: {gameplay_img}")
shutil.copyfile(gameplay_img, os.path.join(BRAIN_DIR, "environment_gameplay_render.png"))

# 18. Render Preethi Face Closeup (Beauty 1080x1080)
# Hide heavy environment elements to isolate character studio render
for c in [col_tracks, col_gantries, col_platforms, col_tunnel, col_trains, col_collectibles, col_cityscape]:
    c.hide_render = True

# Add studio portrait key & rim lights for her face
bpy.ops.object.light_add(type='POINT', location=(0.4, -0.6, 2.0))
f_key = bpy.context.active_object
f_key.name = "Studio_FaceKey"
f_key.data.energy = 45.0
f_key.data.color = (1.0, 0.94, 0.88)
link_only(f_key, col_lighting)

bpy.ops.object.light_add(type='POINT', location=(-0.45, -0.5, 1.7))
f_fill = bpy.context.active_object
f_fill.name = "Studio_FaceFill"
f_fill.data.energy = 22.0
f_fill.data.color = (0.85, 0.92, 1.0)
link_only(f_fill, col_lighting)

bpy.ops.object.light_add(type='POINT', location=(0.0, 0.7, 2.1))
f_rim = bpy.context.active_object
f_rim.name = "Studio_FaceRim"
f_rim.data.energy = 70.0
f_rim.data.color = (1.0, 0.82, 0.6)
link_only(f_rim, col_lighting)

scene.camera = cam_face
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
face_img = os.path.join(ANIM_DIR, "preethi_face_closeup.png")
scene.render.filepath = face_img
bpy.ops.render.render(write_still=True)
print(f"Rendered face beauty shot: {face_img}")
shutil.copyfile(face_img, os.path.join(BRAIN_DIR, "preethi_face_closeup.png"))
shutil.copyfile(face_img, os.path.join(MODELS_DIR, "preethi_face_closeup.png"))

print("\n=== ENVIRONMENT & RENDER PIPELINE COMPLETED SUCCESSFULLY ===")

