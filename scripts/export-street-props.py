"""Export selected variants from extracted uploaded Poly Haven Blender packs.
Run with Blender 5.2 Python (bpy) and pass source/output directories:
python scripts/export-street-props.py /path/to/props-source src/assets/props
Source subfolders use the PropKind names (aircon, barrier, box, etc.).
Then optimize-model-images.py embeds WebP maps at the desired size.
"""
import bpy,pathlib,sys
source=pathlib.Path(sys.argv[1]);destination=pathlib.Path(sys.argv[2]);destination.mkdir(parents=True,exist_ok=True)
for folder in sorted(source.iterdir()):
 label=folder.name;bpy.ops.wm.open_mainfile(filepath=str(next(folder.glob('*.blend'))),load_ui=False,use_scripts=False)
 bpy.ops.preferences.addon_enable(module='io_scene_gltf2');bpy.ops.object.select_all(action='DESELECT')
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if label=='aircon':objects=[o for o in objects if o.name.endswith('_rusted')]
 elif label=='barrier':objects=[o for o in objects if o.name.endswith('LOD1')]
 elif label=='camera':objects=[o for o in objects if o.name=='security_camera_01']
 elif label=='hydrant':objects=[o for o in objects if o.name.endswith('_aged')]
 elif label=='shutter':objects=[o for o in objects if o.name.endswith('_graffiti')]
 elif label=='trashcan':objects=[o for o in objects if '_rust' in o.name]
 elif label=='fence':
  panel=bpy.data.objects['modular_chainlink_fence_double'];post=bpy.data.objects['modular_chainlink_fence_end_01'];post.location.y-=1
  left=post.copy();left.data=post.data.copy();bpy.context.collection.objects.link(left);left.location.x-=2
  objects=[panel,post,left]
 for obj in objects:obj.hide_set(False);obj.hide_render=False;obj.hide_viewport=False;obj.select_set(True)
 print('PROP_EXPORT',label,[o.name for o in objects],flush=True)
 # Small street props are capped at 1K texture resolution, preserving scanned geometry.
 for image in bpy.data.images:
  if image.source=='FILE' and max(image.size)>1024 and label!='coveredcar':
   width,height=image.size;factor=1024/max(width,height);image.scale(round(width*factor),round(height*factor))
 bpy.ops.export_scene.gltf(filepath=str(destination/(label+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
