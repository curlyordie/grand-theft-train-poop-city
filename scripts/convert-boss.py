"""Convert the user's Mixamo FBX into a self-contained, animated game GLB.
Run: blender -b --python scripts/convert-boss.py -- /path/to/"The Boss.fbx"
"""
import bpy,sys,math
from mathutils import Quaternion,Vector
src=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
rig.animation_data_clear()
# Remove the static two-frame export action. Author simple idle/walk loops
# in the uploaded character's own bind skeleton, avoiding incompatible rigs.
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
for material in bpy.data.materials:
 if material.use_nodes:
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':node.inputs['Roughness'].default_value=.78
scene=bpy.context.scene;scene.render.fps=30
axes={'x':Vector((1,0,0)),'z':Vector((0,0,1))}
def rotation(pb,axis,angle):
 rest=pb.bone.matrix_local.to_quaternion()
 return rest.inverted() @ Quaternion(axes[axis],angle) @ rest
rig.animation_data_create()
for title,walking in [('Idle',False),('Walk',True)]:
 action=bpy.data.actions.new(title);rig.animation_data.action=action
 for frame in range(1,32):
  scene.frame_set(frame);phase=(frame-1)/30*math.tau
  for pb in rig.pose.bones:
   pb.rotation_mode='QUATERNION';pb.location=(0,0,0);pb.scale=(1,1,1);pb.rotation_quaternion=Quaternion()
  for side,sign in [('Left',1),('Right',-1)]:
   for part in ['Arm','UpLeg','Leg','ForeArm']:
    pb=rig.pose.bones.get('mixamorig:'+side+part)
    if not pb:continue
    stride=math.sin(phase)*sign if walking else 0
    if part=='Arm':pb.rotation_quaternion=rotation(pb,'z',-sign*1.28) @ rotation(pb,'x',-stride*.22)
    elif part=='ForeArm':pb.rotation_quaternion=rotation(pb,'x',-.16)
    elif part=='UpLeg':pb.rotation_quaternion=rotation(pb,'x',stride*.43)
    else:pb.rotation_quaternion=rotation(pb,'x',max(0,-stride)*.5)
    pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
  spine=rig.pose.bones.get('mixamorig:Spine2')
  spine.rotation_quaternion=rotation(spine,'x',math.sin(phase)*(.015 if not walking else .035))
  spine.keyframe_insert('rotation_quaternion',frame=frame,group=spine.name)
 track=rig.animation_data.nla_tracks.new();track.name=title;track.strips.new(title,1,action)
rig.animation_data.action=None
scene.frame_set(1)
# GLB packs geometry, the rig, clips and all embedded FBX textures together.
bpy.ops.export_scene.gltf(filepath=bpy.path.abspath('//src/assets/boss.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_image_format='JPEG',export_jpeg_quality=90)
print('BOSS_EXPORT_COMPLETE')
