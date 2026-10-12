"""Retarget uploaded Mixamo clips to The Boss/Remy, strip horizontal root motion,
and write compressed Three.js animation data. Run inside Blender's Python:
  python scripts/bake-mixamo.py /tmp/animation-manifest.json
Requires bpy (Blender 5.2), original FBX characters, and paths in the manifest.
"""
import bpy,json,sys,pathlib,re,struct,gzip,math
from mathutils import Quaternion,Vector
manifest=json.load(open(sys.argv[-1]))
characters={
 'boss':('/workspace/attachments/fd126da5-d35a-43e4-9ba2-f87e43c814bf/The Boss.fbx',.95),
 'remy':('/tmp/remy-source/Remy.fbx',.50075),
}
def semantic(name):return re.sub(r'^mixamorig\d*[:_]?','',name,flags=re.I).lower()
def depth(bone):return 0 if bone.parent is None else depth(bone.parent)+1
banks={}
for character,(source,game_scale) in characters.items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.preferences.addon_enable(module='io_scene_fbx');bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
 bpy.ops.import_scene.fbx(filepath=source)
 target=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 target.animation_data_clear()
 for action in list(bpy.data.actions):bpy.data.actions.remove(action)
 bones=sorted(list(target.pose.bones),key=depth)
 rest={b.name:b.bone.matrix_local.to_quaternion() for b in bones}
 rest_local={b.name:(b.parent.bone.matrix_local.inverted()@b.bone.matrix_local).to_quaternion() if b.parent else rest[b.name] for b in bones}
 target_world=target.matrix_world.to_quaternion();target_hips=next(b for b in bones if semantic(b.name)=='hips')
 target_hip_height=(target.matrix_world@target_hips.bone.matrix_local.translation).z
 target.animation_data_create()
 target_objs=set(bpy.context.scene.objects)
 for name,filename in manifest.items():
  if not filename:continue
  bpy.ops.import_scene.fbx(filepath=filename)
  imported=[o for o in bpy.context.scene.objects if o not in target_objs]
  rig=next(o for o in imported if o.type=='ARMATURE')
  action=rig.animation_data.action
  start,end=map(round,action.frame_range)
  fps=bpy.context.scene.render.fps/bpy.context.scene.render.fps_base
  lookup={semantic(b.name):b for b in rig.pose.bones}
  source_world=rig.matrix_world.to_quaternion()
  source_rest={key:source_world@b.bone.matrix_local.to_quaternion() for key,b in lookup.items()}
  hips=lookup['hips'];source_height=(rig.matrix_world@hips.bone.matrix_local.translation).z
  height_ratio=target_hip_height/max(.001,source_height)
  baked=bpy.data.actions.new(name);target.animation_data.action=baked
  for frame in range(start,end+1):
   bpy.context.scene.frame_set(frame)
   # Cache desired parent rotations rather than evaluating the whole dependency graph per bone.
   pose={}
   for bone in bones:
    key=semantic(bone.name);match=lookup.get(key)
    parent=pose[bone.parent.name] if bone.parent else Quaternion()
    if match:
     delta=(source_world@match.matrix.to_quaternion())@source_rest[key].inverted()
     desired=target_world.inverted()@delta@target_world@rest[bone.name]
    else:desired=parent@rest_local[bone.name]
    bone.rotation_mode='QUATERNION';bone.rotation_quaternion=rest_local[bone.name].inverted()@parent.inverted()@desired
    pose[bone.name]=desired
    bone.location=(0,0,0);bone.scale=(1,1,1)
    bone.keyframe_insert('rotation_quaternion',frame=frame-start+1,group=bone.name)
   delta=rig.matrix_world.to_3x3()@(hips.matrix.translation-hips.bone.matrix_local.translation)
   # Physics owns jumping, walking and driving translation. Retain a small vertical body bob.
   amount=max(-.08/game_scale,min(.08/game_scale,delta.z*height_ratio))
   delta_local=target.matrix_world.to_3x3().inverted()@Vector((0,0,amount))
   target_hips.location=rest[target_hips.name].inverted()@delta_local
   target_hips.keyframe_insert('location',frame=frame-start+1,group=target_hips.name)
  track=target.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,baked)
  target.animation_data.action=None
  for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
  print('RETARGET',character,name,end-start+1,'frames',round((end-start)/fps,2),'seconds',flush=True)
 bpy.ops.object.select_all(action='DESELECT');target.select_set(True);bpy.context.view_layer.objects.active=target
 bpy.context.scene.frame_set(1)
 filename='/tmp/'+character+'-motions.glb'
 bpy.ops.export_scene.gltf(filepath=filename,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=True)
 data=pathlib.Path(filename).read_bytes();json_length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+json_length]);binary_start=20+json_length+8
 def accessor(index):
  acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']];count=acc['count']*{'SCALAR':1,'VEC3':3,'VEC4':4}[acc['type']]
  return [round(v,6) for v in struct.unpack_from('<'+str(count)+'f',data,binary_start+view.get('byteOffset',0)+acc.get('byteOffset',0))]
 clips=[]
 for animation in doc.get('animations',[]):
  tracks=[];duration=0
  for channel in animation['channels']:
   node=doc['nodes'][channel['target']['node']]['name'];path=channel['target']['path']
   if not node.startswith('mixamorig'):continue
   if path!='rotation' and not (semantic(node)=='hips' and path=='translation'):continue
   sample=animation['samplers'][channel['sampler']];times=accessor(sample['input']);values=accessor(sample['output']);duration=max(duration,times[-1])
   tracks.append({'node':node,'path':path,'times':times,'values':values})
  clips.append({'name':animation['name'],'duration':duration,'tracks':tracks})
 if len(clips)!=len(manifest):raise RuntimeError('Missing exported clips: '+str([c['name'] for c in clips]))
 banks[character]=clips;print('BANK',character,len(clips),flush=True)
output=pathlib.Path('/workspace/grand-theft-train-poop-city/src/assets/motions.bin')
output.write_bytes(gzip.compress(json.dumps(banks,separators=(',',':')).encode(),compresslevel=9))
print('ANIMATION_BANK_COMPLETE',output.stat().st_size,flush=True)
