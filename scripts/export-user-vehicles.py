"""Extract the supplied Blender vehicles, normalize forward/scale and export GLB.
Run with Blender Python: scripts/export-user-vehicles.py /tmp/user-vehicle-assets
"""
import bpy, bmesh, sys, pathlib, math
from mathutils import Vector, Matrix
root=pathlib.Path(sys.argv[-1]);out=pathlib.Path('src/assets/vehicles');out.mkdir(parents=True,exist_ok=True)
keys=[sys.argv[-2]] if sys.argv[-2] in ['mercedes','agera','car','motorbike'] else ['mercedes','agera','car','motorbike']
for key in keys:
    path=next((root/key).rglob('*.blend'));bpy.ops.wm.open_mainfile(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name=='Mercedes Benz GLS 580' if key=='mercedes' else o.name!='road')]
    world={o.name:o.matrix_world.copy() for o in meshes}
    # Bake authored static shape-key/modifier poses before changing coordinate space.
    # Keeping old shape-key bases would export pieces in their original large units.
    graph=bpy.context.evaluated_depsgraph_get()
    baked={o.name:bpy.data.meshes.new_from_object(o.evaluated_get(graph),depsgraph=graph) for o in meshes}
    for obj in meshes:
        obj.data=baked[obj.name]
        for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
    bpy.context.view_layer.update()
    if key=='agera':
        body=bpy.data.objects['Body'];bm=bmesh.new();bm.from_mesh(body.data)
        stray=[v for v in bm.verts if abs((world[body.name]@v.co).x)>11.5]
        bmesh.ops.delete(bm,geom=stray,context='VERTS');bm.to_mesh(body.data);bm.free();body.data.update()
        print('Removed',len(stray),'isolated outlier vertices from the Agera showcase',flush=True)
    def centre(obj):return sum((obj.matrix_world@Vector(c) for c in obj.bound_box),Vector())/8
    if key=='mercedes':
        mesh=meshes[0];indices={i for i,m in enumerate(mesh.data.materials) if m and m.name=='Grille'}
        points=[mesh.matrix_world@mesh.data.vertices[i].co for polygon in mesh.data.polygons if polygon.material_index in indices for i in polygon.vertices]
        front=sum(points,Vector())/len(points)-centre(mesh);forward=Vector((0,1 if front.y>0 else -1,0))
    elif key=='agera':forward=(centre(bpy.data.objects['FR'])+centre(bpy.data.objects['FL'])-centre(bpy.data.objects['RR'])-centre(bpy.data.objects['RL'])).normalized()
    elif key=='car':forward=centre(bpy.data.objects['lampu depan'])-centre(bpy.data.objects['belakang'])
    else:forward=centre(bpy.data.objects['Headlight'])-centre(bpy.data.objects['light_back'])
    forward=Vector((math.copysign(1,forward.x),0,0)) if abs(forward.x)>abs(forward.y) else Vector((0,math.copysign(1,forward.y),0));up=Vector((0,0,1));right=forward.cross(up).normalized()
    points=[world[o.name]@v.co for o in meshes for v in o.data.vertices]
    xs=[p.dot(right) for p in points];ys=[p.dot(forward) for p in points];zs=[p.z for p in points]
    centre_x=(min(xs)+max(xs))/2;centre_y=(min(ys)+max(ys))/2;bottom=min(zs);length=max(ys)-min(ys)
    def material(name,colour,metal=0,rough=.5):
        m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*colour,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
    fallback={
      'paint':material('Worn blue paint',(.11,.2,.28),.5,.43),'rubber':material('Tyre rubber',(.016,.018,.02),0,.9),
      'chrome':material('Aged alloy',(.4,.43,.46),.85,.3),'glass':material('Tinted glass',(.025,.06,.075),.15,.16),
      'lamp':material('Headlamp lens',(.7,.74,.72),.25,.22),'plate':material('Number plate',(.45,.46,.39),0,.7)
    }
    for obj in meshes:
        obj.data=obj.data.copy()
        for vertex in obj.data.vertices:
            point=world[obj.name]@vertex.co;vertex.co=((point.dot(right)-centre_x)/length,(point.dot(forward)-centre_y)/length,(point.z-bottom)/length)
        obj.parent=None;obj.matrix_world=Matrix.Identity(4)
        if key=='car' and not len(obj.data.materials):
            name=obj.name.lower();role='rubber' if name.startswith('ban ') else 'chrome' if any(s in name for s in ['velg','knalpot','gagang','logo','spion']) else 'glass' if 'kaca' in name else 'lamp' if 'lampu' in name else 'plate' if 'plat' in name else 'paint';obj.data.materials.append(fallback[role])
        bpy.context.view_layer.objects.active=obj
        triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
        limit=40000 if key=='mercedes' else max(8,round(triangles*.14)) if key=='car' else 50000
        if triangles>limit:
            modifier=obj.modifiers.new('Game display detail','DECIMATE');modifier.ratio=limit/triangles;bpy.ops.object.modifier_apply(modifier=modifier.name)
        if obj.name in ['FR','FL','RR','RL','Front_wheel','back_wheel']:
            centre_local=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
            for vertex in obj.data.vertices:vertex.co-=centre_local
            obj.location=centre_local
    # Resolve the supplied dashboard images; omit the showcase road entirely.
    for image in bpy.data.images:
        filename=image.filepath.replace('\\','/').split('/')[-1]
        matches=list((root/key).rglob(filename)) if filename else []
        if matches:image.filepath=str(matches[0]);image.reload()
    for obj in meshes:
        for mat in obj.data.materials:
            if not mat:continue
            if not mat.use_nodes:mat.use_nodes=True
            principal=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if not principal:
                old=next((n for n in mat.node_tree.nodes if n.type=='BSDF_GLASS'),None)
                colour=tuple(old.inputs['Color'].default_value[:3]) if old else tuple(mat.diffuse_color[:3])
                if old and min(colour)>.95:colour=(.025,.05,.065) if 'glass' in mat.name.lower() or 'kaca' in mat.name.lower() else (.6,.64,.59)
                mat.node_tree.nodes.clear();principal=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(principal.outputs['BSDF'],output.inputs['Surface'])
                principal.inputs['Base Color'].default_value=(*colour,1);principal.inputs['Metallic'].default_value=.12;principal.inputs['Roughness'].default_value=.18
            for node in list(mat.node_tree.nodes):
                if node.type=='TEX_IMAGE' and node.image and not node.image.packed_file and not pathlib.Path(bpy.path.abspath(node.image.filepath)).exists():
                    mat.node_tree.nodes.remove(node)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.export_scene.gltf(filepath=str(out/(key+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_image_format='AUTO')
    print('VEHICLE',key,'front',tuple(forward),'triangles',sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bytes',(out/(key+'.glb')).stat().st_size,flush=True)
