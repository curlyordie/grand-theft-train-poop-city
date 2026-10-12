"""Repack GLB embedded images as WebP without changing geometry or skeletons.
Usage: python scripts/optimize-model-images.py file.glb [max_texture_size]
"""
import json,struct,sys,pathlib,io
from PIL import Image
path=pathlib.Path(sys.argv[1]);limit=int(sys.argv[2]) if len(sys.argv)>2 else 2048
raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
images={image['bufferView']:image for image in doc.get('images',[]) if 'bufferView'in image}
chunks=bytearray()
for i,view in enumerate(doc.get('bufferViews',[])):
 payload=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
 if i in images:
  image=Image.open(io.BytesIO(payload));image=image.convert('RGBA' if 'A'in image.getbands() else 'RGB')
  if max(image.size)>limit:
   ratio=limit/max(image.size);image=image.resize((round(image.width*ratio),round(image.height*ratio)),Image.Resampling.LANCZOS)
  encoded=io.BytesIO();image.save(encoded,'WEBP',quality=90,method=6);payload=encoded.getvalue();images[i]['mimeType']='image/webp'
 while len(chunks)%4:chunks.append(0)
 view['byteOffset']=len(chunks);view['byteLength']=len(payload);chunks.extend(payload)
for texture in doc.get('textures',[]):
 if 'source'in texture:
  texture.setdefault('extensions',{})['EXT_texture_webp']={'source':texture.pop('source')}
for key in ['extensionsUsed','extensionsRequired']:
 if 'EXT_texture_webp' not in doc.setdefault(key,[]):doc[key].append('EXT_texture_webp')
doc['buffers'][0]['byteLength']=len(chunks)
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);chunks+=b'\0'*((-len(chunks))%4)
result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(chunks))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(chunks),0x004e4942)+chunks
path.write_bytes(result);print(path.name,len(raw),'->',len(result),flush=True)
