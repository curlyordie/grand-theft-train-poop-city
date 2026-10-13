"""Drop unused showcase meshes/cameras from ToyCar; retain car geometry/materials exactly."""
import json,struct,pathlib,copy
path=pathlib.Path('src/assets/car.glb');raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
node=copy.deepcopy(next(n for n in doc['nodes'] if n.get('name')=='ToyCar'));mesh=copy.deepcopy(doc['meshes'][node['mesh']]);node['mesh']=0
used=set()
for primitive in mesh['primitives']:
 used.update(primitive['attributes'].values())
 if 'indices' in primitive:used.add(primitive['indices'])
 for target in primitive.get('targets',[]):used.update(target.values())
accessor_map={old:i for i,old in enumerate(sorted(used))};accessors=[copy.deepcopy(doc['accessors'][i]) for i in sorted(used)]
views={accessor['bufferView'] for accessor in accessors};views.update(image['bufferView'] for image in doc.get('images',[]))
for accessor in accessors:
 for item in accessor.get('sparse',{}).values():
  if isinstance(item,dict) and 'bufferView' in item:views.add(item['bufferView'])
view_map={old:i for i,old in enumerate(sorted(views))};buffer_views=[];chunks=bytearray()
for old in sorted(views):
 view=copy.deepcopy(doc['bufferViews'][old]);payload=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
 chunks.extend(b'\0'*((-len(chunks))%4));view['byteOffset']=len(chunks);buffer_views.append(view);chunks.extend(payload)
 # All retained views are copied byte for byte, including the original car and maps.
 assert bytes(chunks[view['byteOffset']:view['byteOffset']+view['byteLength']])==payload
for primitive in mesh['primitives']:
 primitive['attributes']={key:accessor_map[value] for key,value in primitive['attributes'].items()}
 if 'indices' in primitive:primitive['indices']=accessor_map[primitive['indices']]
 for target in primitive.get('targets',[]):
  for key,value in list(target.items()):target[key]=accessor_map[value]
for accessor in accessors:
 accessor['bufferView']=view_map[accessor['bufferView']]
 for item in accessor.get('sparse',{}).values():
  if isinstance(item,dict) and 'bufferView'in item:item['bufferView']=view_map[item['bufferView']]
for image in doc.get('images',[]):image['bufferView']=view_map[image['bufferView']]
doc.update(nodes=[node],meshes=[mesh],accessors=accessors,bufferViews=buffer_views,buffers=[{'byteLength':len(chunks)}],scenes=[{'nodes':[0]}],scene=0);doc.pop('cameras',None)
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);chunks.extend(b'\0'*((-len(chunks))%4))
result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(chunks))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(chunks),0x004e4942)+chunks
path.write_bytes(result);print('ToyCar: retained exact car geometry and all material maps;',len(raw),'->',len(result),'bytes')
