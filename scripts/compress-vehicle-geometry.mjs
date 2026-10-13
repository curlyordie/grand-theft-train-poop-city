// Meshopt-pack supplied vehicle GLBs. Positions keep sub-millimetre game detail.
import {readFileSync,writeFileSync} from 'node:fs';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
for(const filename of process.argv.slice(2)){
 const raw=readFileSync(filename),jsonLength=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jsonLength)),binary=raw.subarray(28+jsonLength);
 const images=new Set((doc.images??[]).map(image=>image.bufferView)),indices=new Set(doc.meshes.flatMap(mesh=>mesh.primitives.map(p=>doc.accessors[p.indices].bufferView)));
 const positionAccessors=new Set(doc.meshes.flatMap(mesh=>mesh.primitives.map(p=>p.attributes.POSITION)));
 const positionViews=new Set([...positionAccessors].map(i=>doc.accessors[i].bufferView));
 const positionRange=Math.max(1,...[...positionAccessors].flatMap(i=>doc.accessors[i].max.map((value,axis)=>value-doc.accessors[i].min[axis])));
 const chunks=[];let offset=0,fallback=0,maxPositionError=0;
 for(let i=0;i<doc.bufferViews.length;i++){
  const view=doc.bufferViews[i],source=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),accessors=doc.accessors.filter(a=>a.bufferView===i);
  let payload=source,extension;
  if(!images.has(i)&&accessors.length>=1&&((accessors[0].byteOffset??0)===0||view.byteStride)){
   const acc=accessors[0],stride=view.byteStride??source.length/acc.count,count=source.length/stride;
   if(indices.has(i)&&(stride===2||stride===4)){
    payload=MeshoptEncoder.encodeGltfBuffer(source,count,stride,'TRIANGLES');extension={byteStride:stride,count,mode:'TRIANGLES'};
   }else if(stride%4===0&&stride<=256&&Number.isInteger(count)){
    let input=source,filter;
    if(accessors.every(item=>item.componentType===5126)){
     const floats=new Float32Array(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength));
     input=MeshoptEncoder.encodeFilterExp(floats,count,stride,positionViews.has(i)?14:12,'Separate');filter='EXPONENTIAL';
    }
    payload=MeshoptEncoder.encodeGltfBuffer(input,count,stride,'ATTRIBUTES');extension={byteStride:stride,count,mode:'ATTRIBUTES',...(filter?{filter}:{})};
   }
   if(extension){
    const decoded=new Uint8Array(count*stride);MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,payload,extension.mode,extension.filter);
    if(positionViews.has(i)){
     const a=new Float32Array(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength)),b=new Float32Array(decoded.buffer);
     for(const index of positionAccessors){const position=doc.accessors[index];if(position.bufferView!==i)continue;
      for(let vertex=0;vertex<position.count;vertex++)for(let axis=0;axis<3;axis++){const j=(position.byteOffset??0)/4+vertex*stride/4+axis;maxPositionError=Math.max(maxPositionError,Math.abs(a[j]-b[j]));}
     }
     if(maxPositionError>positionRange*.0001)throw new Error('Position precision outside vehicle budget');
    }
   }
  }
  const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  if(extension){
   view.buffer=1;view.byteOffset=fallback;fallback+=view.byteLength;
   view.extensions={...(view.extensions??{}),EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:payload.length,...extension}};
  }else{view.buffer=0;view.byteOffset=offset;view.byteLength=payload.length;}
  chunks.push(payload);offset+=payload.length;
 }
 doc.buffers=[{byteLength:offset},{byteLength:fallback,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 for(const key of ['extensionsUsed','extensionsRequired'])if(!doc[key]?.includes('EXT_meshopt_compression'))(doc[key]??=[]).push('EXT_meshopt_compression');
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const body=Buffer.concat([...chunks,Buffer.alloc((4-offset%4)%4)]),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+body.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(body.length,0);binHeader.writeUInt32LE(0x004e4942,4);writeFileSync(filename,Buffer.concat([header,json,binHeader,body]));
 console.log(filename,raw.length,'->',28+json.length+body.length,'bytes; max position error',maxPositionError);
}
