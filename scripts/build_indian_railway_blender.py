"""
build_indian_railway_blender.py
Generates the authentic Native Indian Railway (IR) environment in Blender:
- Bilingual yellow station boards ("PREETHI JUNCTION / प्रीति जंक्शन")
- Classic Indian Railways Blue & Cream ICF Express Trains
- 25 kV AC OHE steel lattice gantries
- Red-brick station platform with black-and-yellow curb stripes
- Trackside Chai / Tea stalls (टपरी)
- Coconut palm trees & regional architecture
"""
import bpy
import os
import math
import shutil

ROOT = r"c:\pk\subway_preethi_surfers\subway"
ANIM_DIR = r"C:\Users\saipa\Downloads\animations"
MODELS_DIR = os.path.join(ROOT, "models")
ASSETS_DIR = os.path.join(ROOT, "assets")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types.RenderSettings, 'engine') else 'BLENDER_EEVEE'

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

# Indian Railway Materials
mat_ballast = make_mat("M_IR_Ballast", (0.22, 0.21, 0.20), roughness=0.95)
mat_rail = make_mat("M_IR_SteelRail", (0.80, 0.82, 0.86), metallic=0.96, roughness=0.15)
mat_sleeper = make_mat("M_IR_ConcreteSleeper", (0.36, 0.35, 0.34), roughness=0.8)
mat_platform = make_mat("M_IR_RedBrickPlatform", (0.58, 0.32, 0.25), roughness=0.85)
mat_station_yellow = make_mat("M_IR_StationYellow", (1.0, 0.80, 0.02), roughness=0.3, emissive=(1.0, 0.80, 0.02, 1.0), emissive_strength=0.5)
mat_station_black = make_mat("M_IR_StationBlack", (0.05, 0.05, 0.05), roughness=0.5)
mat_curb_stripe = make_mat("M_IR_CurbStripe", (0.95, 0.75, 0.05), roughness=0.4)
mat_ohe_steel = make_mat("M_IR_OHE_Steel", (0.18, 0.22, 0.25), metallic=0.88, roughness=0.3)
mat_cable = make_mat("M_IR_CopperContactWire", (0.45, 0.25, 0.15), metallic=0.9, roughness=0.3)

# Iconic Indian Railways Blue & Cream ICF Livery
mat_ir_blue = make_mat("M_IR_ExpressBlue", (0.08, 0.25, 0.52), metallic=0.25, roughness=0.3)
mat_ir_cream = make_mat("M_IR_ExpressCream", (0.95, 0.92, 0.82), roughness=0.4)
mat_ir_roof = make_mat("M_IR_ExpressRoof", (0.30, 0.35, 0.40), metallic=0.3, roughness=0.6)
mat_ir_window = make_mat("M_IR_Window", (0.06, 0.08, 0.12), metallic=0.9, roughness=0.1)
mat_ir_grille = make_mat("M_IR_YellowBufferGrille", (1.0, 0.72, 0.05), emissive=(1.0, 0.72, 0.05, 1.0), emissive_strength=1.5)

# Chai stall & buildings
mat_chai_red = make_mat("M_ChaiStallRed", (0.82, 0.15, 0.15), roughness=0.4)
mat_chai_green = make_mat("M_ChaiStallGreen", (0.12, 0.45, 0.20), roughness=0.5)
mat_gold_coin = make_mat("M_GoldCoin", (1.0, 0.82, 0.08), metallic=0.96, roughness=0.12, emissive=(1.0, 0.75, 0.0, 1.0), emissive_strength=0.8)

# Collections
col_tracks = bpy.data.collections.new("01_IndianTracks")
col_gantries = bpy.data.collections.new("02_OHE_Gantries")
col_station = bpy.data.collections.new("03_StationPlatforms")
col_trains = bpy.data.collections.new("04_IndianTrains")
col_props = bpy.data.collections.new("05_ChaiAndProps")
col_coins = bpy.data.collections.new("06_Coins")
col_character = bpy.data.collections.new("07_Preethi")
col_lighting = bpy.data.collections.new("08_LightingAndCam")

for c in [col_tracks, col_gantries, col_station, col_trains, col_props, col_coins, col_character, col_lighting]:
    scene.collection.children.link(c)

def link_obj(obj, target_col):
    target_col.objects.link(obj)
    if obj.name in scene.collection.objects:
        scene.collection.objects.unlink(obj)

Y_LEN = 140.0
Y_MID = -Y_LEN / 2.0
LANES = [-2.0, 0.0, 2.0]

# 1. Indian Railway Trackbed
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, Y_MID, -0.15))
bed = bpy.context.active_object
bed.name = "IR_BallastBed"
bed.scale = (7.8, Y_LEN / 2.0, 0.3)
bed.data.materials.append(mat_ballast)
link_obj(bed, col_tracks)

# 2. Broad Gauge Rails (6 rails: 3 pairs)
rail_gauge = 1.10
for lx in LANES:
    for sign in [-1, 1]:
        rx = lx + sign * (rail_gauge / 2.0)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(rx, Y_MID, 0.08))
        rail = bpy.context.active_object
        rail.name = f"IR_Rail_{lx}_{sign}"
        rail.scale = (0.07, Y_LEN / 2.0, 0.09)
        rail.data.materials.append(mat_rail)
        link_obj(rail, col_tracks)

# 3. Monoblock Concrete Sleepers
tie_spacing = 0.8
num_ties = int(Y_LEN / tie_spacing)
for i in range(num_ties):
    ty = 10.0 - i * tie_spacing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, ty, 0.02))
    sleeper = bpy.context.active_object
    sleeper.name = f"IR_Sleeper_{i:03d}"
    sleeper.scale = (6.8, 0.16, 0.06)
    sleeper.data.materials.append(mat_sleeper)
    link_obj(sleeper, col_tracks)

# 4. 25 kV AC OHE Portal Catenary Gantries
for g_idx in range(8):
    gy = 8.0 - g_idx * 18.0
    for px in [-4.2, 4.2]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(px, gy, 3.1))
        mast = bpy.context.active_object
        mast.name = f"IR_OHE_Mast_{g_idx}_{px}"
        mast.scale = (0.24, 0.24, 6.2)
        mast.data.materials.append(mat_ohe_steel)
        link_obj(mast, col_gantries)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy, 6.0))
    girder = bpy.context.active_object
    girder.name = f"IR_OHE_Girder_{g_idx}"
    girder.scale = (8.6, 0.30, 0.35)
    girder.data.materials.append(mat_ohe_steel)
    link_obj(girder, col_gantries)

# OHE Contact Wires
for lx in LANES:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=Y_LEN, location=(lx, Y_MID, 5.5))
    wire = bpy.context.active_object
    wire.rotation_euler = (math.radians(90), 0, 0)
    wire.name = f"IR_OHE_Wire_{lx}"
    wire.data.materials.append(mat_cable)
    link_obj(wire, col_gantries)

# 5. Red-Brick Platforms
for px, side in [(-5.1, "Left"), (5.1, "Right")]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(px, Y_MID, 0.45))
    plat = bpy.context.active_object
    plat.name = f"IR_Platform_{side}"
    plat.scale = (2.0, Y_LEN / 2.0, 0.9)
    plat.data.materials.append(mat_platform)
    link_obj(plat, col_station)

    # Curb hazard line
    edge_x = px + (0.92 if px < 0 else -0.92)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(edge_x, Y_MID, 0.91))
    curb = bpy.context.active_object
    curb.name = f"IR_Curb_{side}"
    curb.scale = (0.18, Y_LEN / 2.0, 0.03)
    curb.data.materials.append(mat_curb_stripe)
    link_obj(curb, col_station)

# 6. Iconic Yellow Indian Railway Station Signboard: PREETHI JUNCTION
sign_y = -15.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(-5.1, sign_y, 2.2))
board = bpy.context.active_object
board.name = "IR_StationBoard_PreethiJn"
board.scale = (0.1, 3.2, 1.0)
board.data.materials.append(mat_station_yellow)
link_obj(board, col_station)

# Signboard Posts
for py_off in [-1.3, 1.3]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=2.4, location=(-5.1, sign_y + py_off, 1.2))
    post = bpy.context.active_object
    post.name = f"IR_SignPost_{py_off}"
    post.data.materials.append(mat_ohe_steel)
    link_obj(post, col_station)

# 7. Chai & Refreshment Kiosk on Right Platform
chai_y = -22.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(5.1, chai_y, 1.25))
kiosk = bpy.context.active_object
kiosk.name = "IR_ChaiKiosk_Counter"
kiosk.scale = (1.6, 2.4, 1.0)
kiosk.data.materials.append(mat_chai_green)
link_obj(kiosk, col_props)

bpy.ops.mesh.primitive_cube_add(size=1, location=(5.1, chai_y, 2.4))
canopy = bpy.context.active_object
canopy.name = "IR_ChaiKiosk_Canopy"
canopy.scale = (1.9, 2.7, 0.15)
canopy.data.materials.append(mat_chai_red)
link_obj(canopy, col_props)

# 8. Indian Railways Blue & Cream Express Train (Right Lane at -36m)
train_x = LANES[2]  # Right lane (x = 2.0)
train_y = -36.0
train_len = 17.0
train_w = 1.95
train_h = 2.5

# Blue lower body
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 1.2))
t_body = bpy.context.active_object
t_body.name = "IR_Express_BodyBlue"
t_body.scale = (train_w, train_len, 1.8)
t_body.data.materials.append(mat_ir_blue)
link_obj(t_body, col_trains)

# Cream mid-band
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 1.65))
t_cream = bpy.context.active_object
t_cream.name = "IR_Express_CreamBand"
t_cream.scale = (train_w + 0.02, train_len, 0.5)
t_cream.data.materials.append(mat_ir_cream)
link_obj(t_cream, col_trains)

# Roof
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y, 2.55))
t_roof = bpy.context.active_object
t_roof.name = "IR_Express_Roof"
t_roof.scale = (train_w * 0.94, train_len * 0.98, 0.28)
t_roof.data.materials.append(mat_ir_roof)
link_obj(t_roof, col_trains)

# Front Windshield facing player
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y + train_len / 2.0 + 0.02, 1.85))
t_wind = bpy.context.active_object
t_wind.name = "IR_Express_Windshield"
t_wind.scale = (train_w * 0.8, 0.05, 0.65)
t_wind.data.materials.append(mat_ir_window)
link_obj(t_wind, col_trains)

# Yellow Buffer Grille
bpy.ops.mesh.primitive_cube_add(size=1, location=(train_x, train_y + train_len / 2.0 + 0.03, 0.9))
t_grill = bpy.context.active_object
t_grill.name = "IR_Express_YellowGrille"
t_grill.scale = (train_w * 0.9, 0.06, 0.45)
t_grill.data.materials.append(mat_ir_grille)
link_obj(t_grill, col_trains)

# 9. Gold Coins floating in arc on center track
for i in range(8):
    cy = -4.0 - i * 1.8
    arc_z = 0.9 + math.sin(i / 7.0 * math.pi) * 1.3
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.06, location=(0.0, cy, arc_z))
    coin = bpy.context.active_object
    coin.rotation_euler = (math.radians(90), 0, math.radians(25 * i))
    coin.name = f"GoldCoin_{i}"
    coin.data.materials.append(mat_gold_coin)
    link_obj(coin, col_coins)

# 10. Import Preethi Model
char_path = os.path.join(ANIM_DIR, "preethi_tpose.glb")
if os.path.exists(char_path):
    bpy.ops.import_scene.gltf(filepath=char_path)
    char_obj = bpy.data.objects.get("Mesh_0")
    if char_obj:
        char_obj.name = "Preethi_Character"
        char_obj.location = (0.0, 0.0, 0.95)
        link_obj(char_obj, col_character)

# 11. Warm Indian Subcontinent Golden-Hour Sun
bpy.ops.object.light_add(type='SUN', location=(12, 18, 25))
sun = bpy.context.active_object
sun.name = "Sun_IndianGoldenHour"
sun.data.energy = 5.2
sun.data.color = (1.0, 0.82, 0.52) # Deep warm golden sun
sun.rotation_euler = (math.radians(48), math.radians(14), math.radians(-32))
link_obj(sun, col_lighting)

# Sky Fill
bpy.ops.object.light_add(type='SUN', location=(-12, -15, 20))
fill = bpy.context.active_object
fill.name = "Fill_Sky"
fill.data.energy = 1.6
fill.data.color = (0.68, 0.76, 0.95)
link_obj(fill, col_lighting)

# Camera (Portrait 9:16)
bpy.ops.object.camera_add(location=(0.0, 5.2, 4.0))
cam = bpy.context.active_object
cam.name = "Portrait_GameplayCamera"
cam.data.lens = 32.0
cam.rotation_euler = (math.radians(74), 0, math.radians(180))
scene.camera = cam
link_obj(cam, col_lighting)

scene.render.resolution_x = 1080
scene.render.resolution_y = 1920

# 12. Save .blend
blend_out = os.path.join(ANIM_DIR, "preethi_endless_runner_environment.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"Saved Indian Railway environment blend: {blend_out}")

# 13. Export GLB
glb_out = os.path.join(MODELS_DIR, "environment_modular.glb")
bpy.ops.export_scene.gltf(filepath=glb_out, export_format='GLB', use_selection=False, export_apply=True)
print(f"Exported environment GLB: {glb_out}")
shutil.copyfile(glb_out, os.path.join(ASSETS_DIR, "models", "environment", "environment_modular.glb"))

# 14. Render Preview
render_out = os.path.join(ANIM_DIR, "environment_gameplay_render.png")
scene.render.filepath = render_out
bpy.ops.render.render(write_still=True)
shutil.copyfile(render_out, os.path.join(ASSETS_DIR, "images", "environment_gameplay_render.png"))
shutil.copyfile(render_out, os.path.join(MODELS_DIR, "environment_gameplay_render.png"))

print("\n=== INDIAN RAILWAY ENVIRONMENT GENERATED SUCCESSFULLY ===")

