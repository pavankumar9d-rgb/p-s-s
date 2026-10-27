"""
Blender Python script: Build endless runner environment from user's GLB assets.
Run with: blender --background --python build_environment.py
Or paste into Blender's scripting tab.
"""
import bpy
import os
import math

ASSET_DIR = r'C:\Users\saipa\Downloads\image to 3d'
OUTPUT_BLEND = r'C:\Users\saipa\Downloads\animations\endless_runner_environment.blend'
OUTPUT_GLB = r'C:\Users\saipa\Downloads\animations\endless_runner_environment.glb'

# ── 1. CLEAR SCENE ──────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# ── 2. HELPER: import GLB safely ────────────────────────────
def import_glb(filename):
    """Import a GLB, return list of new object names."""
    path = os.path.join(ASSET_DIR, filename)
    if not os.path.exists(path):
        print(f'  SKIP (not found): {filename}')
        return []
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    after = set(o.name for o in bpy.data.objects)
    new = list(after - before)
    for n in new:
        obj = bpy.data.objects[n]
        print(f'  Imported: {n} | type={obj.type} | dims={obj.dimensions.x:.2f}x{obj.dimensions.y:.2f}x{obj.dimensions.z:.2f}')
    return new


def get_root_objects(names):
    """Get root-level objects (no parent) from a list of names."""
    return [bpy.data.objects[n] for n in names if n in bpy.data.objects and bpy.data.objects[n].parent is None]


def duplicate_linked(src_objects, offset=(0, 0, 0)):
    """Duplicate objects as linked copies at offset, return new objects."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in src_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = src_objects[0]
    bpy.ops.object.duplicate(linked=True)
    dupes = [o for o in bpy.context.selected_objects]
    for d in dupes:
        d.location.x += offset[0]
        d.location.y += offset[1]
        d.location.z += offset[2]
    return dupes


# ── 3. IMPORT ALL ASSETS ────────────────────────────────────
print('\n=== IMPORTING ASSETS ===')

print('\nTrack segment:')
track_objs = import_glb('Meshy_AI_Railway_Track_Segment_1027102635_texture.glb')

print('\nTunnel:')
tunnel_objs = import_glb('tunnel_entrance.glb')

print('\nTrain (main):')
train_objs = import_glb('train.glb')

print('\nCommuter train:')
commuter_objs = import_glb('commuter_train.glb')

print('\nTrain car:')
traincar_objs = import_glb('train_car.glb')

print('\nPalm tree:')
palm_objs = import_glb('palm_tree.glb')

print('\nBench:')
bench_objs = import_glb('Meshy_AI_Modern_Wooden_Park_Be_1027102815_texture.glb')

print('\nVending machine:')
vending_objs = import_glb('vending_machine.glb')

print('\nMetal barrier:')
metal_barrier_objs = import_glb('metal_barrier.glb')

print('\nRoad barrier:')
road_barrier_objs = import_glb('road_barrier.glb')

print('\nGold coin:')
coin_objs = import_glb('gold_coin.glb')

print('\nMagnet:')
magnet_objs = import_glb('horseshoe_magnet.glb')

print('\nHoverboard:')
hover_objs = import_glb('hoverboard.glb')

print('\nJetpack:')
jetpack_objs = import_glb('jetpack.glb')

print('\nMaintenance vehicle:')
maint_objs = import_glb('rail_maintenance_vehicle.glb')

print('\nCharacter (Preethi):')
char_objs = import_glb('Meshy_AI_Lavender_Grace_1027101332_texture.glb')

# ── 4. MEASURE EVERYTHING ───────────────────────────────────
print('\n=== MEASURING ALL OBJECTS ===')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        d = obj.dimensions
        print(f'  {obj.name}: {d.x:.3f} x {d.y:.3f} x {d.z:.3f} m  at ({obj.location.x:.2f}, {obj.location.y:.2f}, {obj.location.z:.2f})')

# ── 5. ORGANIZE INTO COLLECTIONS ────────────────────────────
print('\n=== ORGANIZING COLLECTIONS ===')

def make_collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

col_track = make_collection('Track')
col_trains = make_collection('Trains')
col_props = make_collection('Props')
col_obstacles = make_collection('Obstacles')
col_collectibles = make_collection('Collectibles')
col_character = make_collection('Character')
col_environment = make_collection('Environment')

def move_to_collection(obj_names, collection):
    for name in obj_names:
        if name in bpy.data.objects:
            obj = bpy.data.objects[name]
            # Remove from all current collections
            for col in obj.users_collection:
                col.objects.unlink(obj)
            collection.objects.link(obj)

move_to_collection(track_objs, col_track)
move_to_collection(tunnel_objs, col_track)
move_to_collection(train_objs, col_trains)
move_to_collection(commuter_objs, col_trains)
move_to_collection(traincar_objs, col_trains)
move_to_collection(palm_objs, col_props)
move_to_collection(bench_objs, col_props)
move_to_collection(vending_objs, col_props)
move_to_collection(metal_barrier_objs, col_obstacles)
move_to_collection(road_barrier_objs, col_obstacles)
move_to_collection(coin_objs, col_collectibles)
move_to_collection(magnet_objs, col_collectibles)
move_to_collection(hover_objs, col_collectibles)
move_to_collection(jetpack_objs, col_collectibles)
move_to_collection(maint_objs, col_obstacles)
move_to_collection(char_objs, col_character)

# ── 6. BUILD 3-LANE TRACK LAYOUT ────────────────────────────
# ponytail: We'll measure the track segment and tile it along -Y (forward direction)
# The game runs in portrait mode; character runs "into" the screen
# 3 lanes spaced ~2.5m apart (standard for endless runners)

print('\n=== BUILDING TRACK LAYOUT ===')

# Get track segment dimensions
track_roots = get_root_objects(track_objs)
if track_roots:
    track_root = track_roots[0]
    track_dim = track_root.dimensions
    print(f'Track root: {track_root.name}, dims: {track_dim.x:.2f} x {track_dim.y:.2f} x {track_dim.z:.2f}')
    
    # We'll use the Y dimension as the "length" of one segment
    # and tile along -Y for depth
    segment_length = max(track_dim.x, track_dim.y, track_dim.z)  # longest axis = running direction
    print(f'Segment length (longest axis): {segment_length:.2f}m')

# ── 7. BUILD GROUND PLANE (railway bed) ─────────────────────
print('\n=== BUILDING GROUND AND RAILS ===')

# Create a long ground plane for the track bed
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -25, -0.05))
ground = bpy.context.active_object
ground.name = 'TrackBed_Ground'
ground.scale = (8, 50, 1)  # 16m wide, 100m long

# Brown/grey gravel material for track bed
mat_ground = bpy.data.materials.new('M_TrackBed')
mat_ground.use_nodes = True
nodes = mat_ground.node_tree.nodes
bsdf = nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.25, 0.22, 0.18, 1)  # Dark gravel brown
    bsdf.inputs['Roughness'].default_value = 0.9
ground.data.materials.append(mat_ground)
col_environment.objects.link(ground)
for c in ground.users_collection:
    if c != col_environment:
        c.objects.unlink(ground)

# ── 8. CREATE PROCEDURAL RAILS (3 lanes) ────────────────────
LANE_WIDTH = 2.5  # meters between lane centers
RAIL_GAUGE = 1.0  # distance between rails in a lane
TRACK_LENGTH = 60  # meters of visible track

def create_rail(x_pos, name):
    """Create a single rail as a long thin box."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x_pos, -TRACK_LENGTH/2, 0.05))
    rail = bpy.context.active_object
    rail.name = name
    rail.scale = (0.04, TRACK_LENGTH/2, 0.06)  # thin, long, short height
    
    mat_rail = bpy.data.materials.new(f'M_{name}')
    mat_rail.use_nodes = True
    bsdf = mat_rail.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.4, 0.4, 0.42, 1)  # Steel grey
        bsdf.inputs['Metallic'].default_value = 0.8
        bsdf.inputs['Roughness'].default_value = 0.3
    rail.data.materials.append(mat_rail)
    
    col_track_col = bpy.data.collections.get('Track')
    if col_track_col:
        col_track_col.objects.link(rail)
        for c in rail.users_collection:
            if c != col_track_col:
                c.objects.unlink(rail)
    return rail

# Left lane rails
create_rail(-LANE_WIDTH - RAIL_GAUGE/2, 'Rail_L_Left')
create_rail(-LANE_WIDTH + RAIL_GAUGE/2, 'Rail_L_Right')

# Center lane rails
create_rail(-RAIL_GAUGE/2, 'Rail_C_Left')
create_rail(RAIL_GAUGE/2, 'Rail_C_Right')

# Right lane rails
create_rail(LANE_WIDTH - RAIL_GAUGE/2, 'Rail_R_Left')
create_rail(LANE_WIDTH + RAIL_GAUGE/2, 'Rail_R_Right')

# ── 9. CREATE RAILWAY TIES (sleepers) ───────────────────────
print('Creating railway ties...')

# Tie material
mat_tie = bpy.data.materials.new('M_RailwayTie')
mat_tie.use_nodes = True
bsdf_tie = mat_tie.node_tree.nodes.get('Principled BSDF')
if bsdf_tie:
    bsdf_tie.inputs['Base Color'].default_value = (0.15, 0.10, 0.06, 1)  # Dark wood
    bsdf_tie.inputs['Roughness'].default_value = 0.85

# Create ties across all 3 lanes
tie_spacing = 0.8  # every 0.8m
total_width = LANE_WIDTH * 2 + RAIL_GAUGE + 1.0  # span all lanes + margin

for i in range(int(TRACK_LENGTH / tie_spacing)):
    y_pos = -i * tie_spacing
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y_pos, -0.01))
    tie = bpy.context.active_object
    tie.name = f'Tie_{i:03d}'
    tie.scale = (total_width/2, 0.12, 0.04)  # wide, narrow, thin
    tie.data.materials.append(mat_tie)
    col_t = bpy.data.collections.get('Track')
    if col_t:
        col_t.objects.link(tie)
        for c in tie.users_collection:
            if c != col_t:
                c.objects.unlink(tie)

# ── 10. PLACE SIDE WALLS / BUILDINGS ────────────────────────
print('\n=== BUILDING SIDE ENVIRONMENT ===')

# Left wall (buildings)
bpy.ops.mesh.primitive_cube_add(size=1, location=(-6, -25, 3))
wall_l = bpy.context.active_object
wall_l.name = 'Building_Left'
wall_l.scale = (2, 50, 3)

mat_bldg = bpy.data.materials.new('M_Building')
mat_bldg.use_nodes = True
bsdf_b = mat_bldg.node_tree.nodes.get('Principled BSDF')
if bsdf_b:
    bsdf_b.inputs['Base Color'].default_value = (0.55, 0.45, 0.35, 1)  # Warm sandstone
    bsdf_b.inputs['Roughness'].default_value = 0.7
wall_l.data.materials.append(mat_bldg)

# Right wall
bpy.ops.mesh.primitive_cube_add(size=1, location=(6, -25, 3))
wall_r = bpy.context.active_object
wall_r.name = 'Building_Right'
wall_r.scale = (2, 50, 3)
wall_r.data.materials.append(mat_bldg)

for wall in [wall_l, wall_r]:
    col_environment.objects.link(wall)
    for c in wall.users_collection:
        if c != col_environment:
            c.objects.unlink(wall)

# ── 11. PLACE IMPORTED PROPS ALONG SIDES ────────────────────
print('\n=== PLACING PROPS ===')

# Position palm trees along left side
palm_roots = get_root_objects(palm_objs)
if palm_roots:
    palm = palm_roots[0]
    palm.location = (-4.5, -5, 0)
    # Duplicate along the track
    for i in range(1, 6):
        bpy.ops.object.select_all(action='DESELECT')
        palm.select_set(True)
        bpy.context.view_layer.objects.active = palm
        bpy.ops.object.duplicate(linked=True)
        dup = bpy.context.active_object
        dup.location = (-4.5, -5 - i * 10, 0)

# Position bench
bench_roots = get_root_objects(bench_objs)
if bench_roots:
    bench_roots[0].location = (4.5, -8, 0)

# Position vending machine
vending_roots = get_root_objects(vending_objs)
if vending_roots:
    vending_roots[0].location = (4.5, -20, 0)

# ── 12. PLACE TRAIN ON CENTER TRACK ─────────────────────────
print('\n=== PLACING TRAINS ===')

train_roots = get_root_objects(train_objs)
if train_roots:
    train_roots[0].location = (0, -30, 0.1)

commuter_roots = get_root_objects(commuter_objs)
if commuter_roots:
    commuter_roots[0].location = (LANE_WIDTH, -15, 0.1)

# ── 13. PLACE OBSTACLES ─────────────────────────────────────
print('\n=== PLACING OBSTACLES ===')

metal_roots = get_root_objects(metal_barrier_objs)
if metal_roots:
    metal_roots[0].location = (-LANE_WIDTH, -12, 0)

road_roots = get_root_objects(road_barrier_objs)
if road_roots:
    road_roots[0].location = (0, -22, 0)

maint_roots = get_root_objects(maint_objs)
if maint_roots:
    maint_roots[0].location = (-LANE_WIDTH, -35, 0.1)

# ── 14. PLACE COLLECTIBLES ──────────────────────────────────
print('\n=== PLACING COLLECTIBLES ===')

# Coins in a line on center track
coin_roots = get_root_objects(coin_objs)
if coin_roots:
    coin = coin_roots[0]
    coin.location = (0, -5, 1.0)
    for i in range(1, 5):
        bpy.ops.object.select_all(action='DESELECT')
        coin.select_set(True)
        bpy.context.view_layer.objects.active = coin
        bpy.ops.object.duplicate(linked=True)
        dup = bpy.context.active_object
        dup.location = (0, -5 - i * 1.5, 1.0)

# Magnet powerup
magnet_roots = get_root_objects(magnet_objs)
if magnet_roots:
    magnet_roots[0].location = (LANE_WIDTH, -25, 1.0)

# Hoverboard
hover_roots = get_root_objects(hover_objs)
if hover_roots:
    hover_roots[0].location = (-LANE_WIDTH, -40, 0.5)

# Jetpack
jetpack_roots = get_root_objects(jetpack_objs)
if jetpack_roots:
    jetpack_roots[0].location = (0, -45, 1.0)

# ── 15. PLACE TUNNEL ────────────────────────────────────────
print('\n=== PLACING TUNNEL ===')

tunnel_roots = get_root_objects(tunnel_objs)
if tunnel_roots:
    tunnel_roots[0].location = (0, -50, 0)

# ── 16. PLACE CHARACTER ─────────────────────────────────────
print('\n=== PLACING CHARACTER ===')

char_roots = get_root_objects(char_objs)
if char_roots:
    char_roots[0].location = (0, 0, 0)  # At the "start" of the track, center lane

# ── 17. SETUP CAMERA (Portrait mode) ────────────────────────
print('\n=== SETTING UP CAMERA ===')

bpy.ops.object.camera_add(location=(0, 6, 8))
cam = bpy.context.active_object
cam.name = 'GameCamera'

# Point camera to look down the track (behind and above character)
cam.rotation_euler = (math.radians(55), 0, math.radians(180))

# Portrait aspect ratio (9:16)
bpy.context.scene.render.resolution_x = 1080
bpy.context.scene.render.resolution_y = 1920
bpy.context.scene.render.resolution_percentage = 100

# Set as active camera
bpy.context.scene.camera = cam

col_environment.objects.link(cam)
for c in cam.users_collection:
    if c != col_environment:
        c.objects.unlink(cam)

# ── 18. SETUP LIGHTING ──────────────────────────────────────
print('\n=== SETTING UP LIGHTING ===')

# Main sun light (warm golden hour)
bpy.ops.object.light_add(type='SUN', location=(5, 5, 15))
sun = bpy.context.active_object
sun.name = 'Sun_Main'
sun.data.energy = 3.0
sun.data.color = (1.0, 0.9, 0.75)  # Warm golden
sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(-30))

col_environment.objects.link(sun)
for c in sun.users_collection:
    if c != col_environment:
        c.objects.unlink(sun)

# Fill light (cool blue sky bounce)
bpy.ops.object.light_add(type='SUN', location=(-5, -5, 10))
fill = bpy.context.active_object
fill.name = 'Sun_Fill'
fill.data.energy = 1.0
fill.data.color = (0.7, 0.8, 1.0)  # Cool sky blue
fill.rotation_euler = (math.radians(70), math.radians(-20), math.radians(150))

col_environment.objects.link(fill)
for c in fill.users_collection:
    if c != col_environment:
        c.objects.unlink(fill)

# World background (gradient sky)
world = bpy.data.worlds.new('GameWorld')
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value = (0.5, 0.7, 1.0, 1)  # Sky blue
    bg.inputs['Strength'].default_value = 0.8

# ── 19. SET RENDER ENGINE ───────────────────────────────────
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'

# ── 20. SAVE THE FILE ───────────────────────────────────────
print('\n=== SAVING ===')

# Ensure output dir exists
os.makedirs(os.path.dirname(OUTPUT_BLEND), exist_ok=True)

bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)
print(f'Saved: {OUTPUT_BLEND}')

# Export as GLB for game engine
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_GLB,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
)
print(f'Exported: {OUTPUT_GLB}')

# ── 21. RENDER A PREVIEW ────────────────────────────────────
preview_path = r'C:\Users\saipa\Downloads\animations\environment_preview.png'
bpy.context.scene.render.filepath = preview_path
bpy.context.scene.render.resolution_percentage = 50  # Half res for preview speed
bpy.ops.render.render(write_still=True)
print(f'Preview rendered: {preview_path}')

print('\n=== DONE! ===')
print(f'Total objects: {len(bpy.data.objects)}')
print(f'Collections: {[c.name for c in bpy.data.collections]}')

