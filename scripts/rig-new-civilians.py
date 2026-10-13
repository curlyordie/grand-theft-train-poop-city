"""Fit the supplied Meshy skeleton to the two unrigged uploads and skin them.
Usage: Blender Python scripts/rig-new-civilians.py /path/to/manifest.json
The manifest supplies template, kurta_fbx, kurta_texture, cityside_static and output.
"""
import bpy, bmesh, json, pathlib, sys
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

config = json.load(open(sys.argv[-1]))
output = pathlib.Path(config['output'])
output.mkdir(parents=True, exist_ok=True)

for key, filename in [('kurta', config['kurta_fbx']), ('cityside-unrigged', config['cityside_static'])]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=config['template'])
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    template = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.find_armature() == rig)
    rig.animation_data_clear()
    for bone in rig.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    source_points = [template.matrix_world @ v.co for v in template.data.vertices]
    source_min = Vector(tuple(min(p[i] for p in source_points) for i in range(3)))
    source_max = Vector(tuple(max(p[i] for p in source_points) for i in range(3)))
    before = set(bpy.context.scene.objects)
    if key == 'kurta':
        bpy.ops.import_scene.fbx(filepath=filename)
    else:
        bpy.ops.import_scene.gltf(filepath=filename)
    mesh = next(o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH')
    points = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    factor = 1.895 / (high.z - low.z)
    centre_x, centre_y = (low.x + high.x) / 2, (low.y + high.y) / 2
    for vertex, point in zip(mesh.data.vertices, points):
        vertex.co = Vector(((point.x - centre_x) * factor, (point.y - centre_y) * factor, (point.z - low.z) * factor))
    mesh.matrix_world = Matrix.Identity(4)
    # FBX contains separate corner vertices. Weld coincident vertices for heat skinning;
    # UVs stay on face corners, so texture seams remain intact.
    bm = bmesh.new(); bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bm.to_mesh(mesh.data); bm.free(); mesh.data.update()
    scale = Vector(((high.x - low.x) * factor / (source_max.x - source_min.x),
                    (high.y - low.y) * factor / (source_max.y - source_min.y),
                    1.895 / (source_max.z - source_min.z)))
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        bone.head = Vector(((bone.head.x - (source_min.x + source_max.x) / 2) * scale.x,
                            (bone.head.y - (source_min.y + source_max.y) / 2) * scale.y,
                            (bone.head.z - source_min.z) * scale.z))
        bone.tail = Vector(((bone.tail.x - (source_min.x + source_max.x) / 2) * scale.x,
                            (bone.tail.y - (source_min.y + source_max.y) / 2) * scale.y,
                            (bone.tail.z - source_min.z) * scale.z))
    bpy.ops.object.mode_set(mode='OBJECT')
    # Restrict export to the uploaded mesh and fitted skeleton.
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    unweighted = [v for v in mesh.data.vertices if sum(g.weight for g in v.groups) < .00001]
    if unweighted:
        # Detached scan fragments can defeat heat weights. Use nearby template skin
        # weights only for those vertices, in the fitted model's coordinates.
        tree = KDTree(len(template.data.vertices))
        for i, point in enumerate(source_points):
            point = Vector(((point.x - (source_min.x + source_max.x) / 2) * scale.x,
                            (point.y - (source_min.y + source_max.y) / 2) * scale.y,
                            (point.z - source_min.z) * scale.z))
            tree.insert(point, i)
        tree.balance()
        for vertex in unweighted:
            _, index, _ = tree.find(vertex.co)
            weights = template.data.vertices[index].groups
            for group in weights:
                name = template.vertex_groups[group.group].name
                target = mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
                target.add([vertex.index], group.weight, 'REPLACE')
    assert all(sum(g.weight for g in v.groups) > .00001 for v in mesh.data.vertices), 'Unweighted vertices remain'
    if key == 'kurta':
        for material in mesh.data.materials:
            if material.use_nodes:
                for node in material.node_tree.nodes:
                    if node.type == 'TEX_IMAGE':
                        node.image = bpy.data.images.load(config['kurta_texture'], check_existing=True)
    fallback_count = len(unweighted)
    if len(mesh.data.polygons) > 70000:
        # Keep a detailed 64K-triangle civilian LOD while preserving the supplied
        # texture and fitted skin weights; the raw Kurta scan has 300K triangles.
        bpy.context.view_layer.objects.active = mesh
        modifier = mesh.modifiers.new('Civilian display detail', 'DECIMATE')
        modifier.ratio = 64000 / len(mesh.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    rig.data.pose_position = 'POSE'
    for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    destination = output / (key + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True,
        export_animations=False, export_image_format='AUTO')
    print('RIGGED', key, 'vertices', len(mesh.data.vertices), 'joints', len(rig.data.bones),
          'triangles', len(mesh.data.polygons), 'fallback weights', fallback_count, 'bytes', destination.stat().st_size, flush=True)
