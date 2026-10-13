"""Convert Without Skin Mixamo FBXs to temporary GLBs for motion retargeting.
Usage: Blender Python scripts/import-mixamo-actions.py /path/to/actions.json
"""
import bpy, json, pathlib, sys
config = json.load(open(sys.argv[-1]))
for item in config:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=item['fbx'])
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    action = rig.animation_data.action
    action.name = item['name']
    print('SOURCE', item['name'], 'frames', tuple(action.frame_range), 'fps', bpy.context.scene.render.fps, flush=True)
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=item['source'], export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIVE_ACTIONS',
        export_force_sampling=True, export_frame_range=False)
