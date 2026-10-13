import { readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const directory = resolve('dist');
const destination = resolve(directory, 'Grand-Theft-Train-Poop-City.html');
let html = await readFile(resolve(directory, 'index.html'), 'utf8');
const meshoptLicence=await readFile(resolve('node_modules/meshoptimizer/LICENSE.md'),'utf8');
html=html.replace('</head>',()=>`<!-- Meshopt decoder licence\n${meshoptLicence}\n-->\n</head>`);

// basE91 carries a gzip bundle in printable HTML with less overhead than base64.
// Its alphabet excludes single quotes and backslashes so the payload needs no JS escapes.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
function encode(bytes){
  let queue=0,bits=0,chunk='';const pieces=[];
  for(const byte of bytes){
    queue|=byte<<bits;bits+=8;
    if(bits>13){let value=queue&8191;if(value>88){queue>>>=13;bits-=13;}else{value=queue&16383;queue>>>=14;bits-=14;}
      chunk+=alphabet[value%91]+alphabet[Math.floor(value/91)];
      if(chunk.length>=65536){pieces.push(chunk);chunk='';}
    }
  }
  if(bits){chunk+=alphabet[queue%91];if(bits>7||queue>90)chunk+=alphabet[Math.floor(queue/91)];}
  pieces.push(chunk);return pieces.join('');
}
function decode(payload,length,alphabet){
  const lookup=new Int16Array(128).fill(-1);for(let i=0;i<alphabet.length;i++)lookup[alphabet.charCodeAt(i)]=i;
  const bytes=new Uint8Array(length);let queue=0,bits=0,pending=-1,offset=0;
  for(let i=0;i<payload.length;i++){
    const value=lookup[payload.charCodeAt(i)];if(value<0)throw new Error('Invalid embedded game data');
    if(pending<0)pending=value;else{const pair=pending+value*91;queue|=pair<<bits;bits+=(pair&8191)>88?13:14;
      while(bits>=8){bytes[offset++]=queue&255;queue>>>=8;bits-=8;}pending=-1;
    }
  }
  if(pending>=0)bytes[offset++]=(queue|pending<<bits)&255;
  if(offset!==length)throw new Error('Incomplete embedded game data');return bytes;
}

async function asset(url) {
  if (!url.startsWith('/assets/')) throw new Error(`Expected a bundled local asset: ${url}`);
  const path = resolve(directory, url.slice(1));
  if (!path.startsWith(directory + sep)) throw new Error('Asset path leaves the build directory.');
  return readFile(path, 'utf8');
}

for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]) {
  const javascript=await asset(match[1]),compressed=gzipSync(javascript,{level:9}),payload=encode(compressed);
  if(!Buffer.from(decode(payload,compressed.length,alphabet)).equals(compressed))throw new Error('Bundle encoding round trip failed');
  const bootstrap=`(${async function(payload,length,alphabet){
    const bytes=decode(payload,length,alphabet);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source=await new Response(stream).text(),url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{await import(url);}finally{URL.revokeObjectURL(url);}
  }.toString()})('${payload}',${compressed.length},${JSON.stringify(alphabet)}).catch(error=>{console.error('Could not open the game',error);const message=document.querySelector('#loading p');if(message)message.textContent='Could not open the game. Please use a current version of Chrome.';});`;
  const inline=`${decode.toString()}\n${bootstrap}`.replace(/<\/script/gi,'<\\/script');
  html = html.replace(match[0], () => `<script type="module">\n${inline}\n</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = (await asset(match[1])).replace(/<\/style/gi, '<\\/style');
  html = html.replace(match[0], () => `<style>\n${css}\n</style>`);
}
if (/<script\b[^>]*\bsrc=|<link\b[^>]*rel="(?:stylesheet|modulepreload)"/i.test(html)) {
  throw new Error('Standalone output still references external code or styles.');
}
if(Buffer.byteLength(html)>=100*1024*1024)throw new Error('Standalone HTML exceeds GitHub\'s 100 MiB limit');
await writeFile(destination, html);
console.log(`Standalone game: ${destination} (${Buffer.byteLength(html).toLocaleString()} bytes)`);
