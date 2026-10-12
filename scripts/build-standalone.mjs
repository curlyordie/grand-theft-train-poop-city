import { readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const directory = resolve('dist');
const destination = resolve(directory, 'Grand-Theft-Train-Poop-City.html');
let html = await readFile(resolve(directory, 'index.html'), 'utf8');

async function asset(url) {
  if (!url.startsWith('/assets/')) throw new Error(`Expected a bundled local asset: ${url}`);
  const path = resolve(directory, url.slice(1));
  if (!path.startsWith(directory + sep)) throw new Error('Asset path leaves the build directory.');
  return readFile(path, 'utf8');
}

for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]) {
  const javascript = (await asset(match[1])).replace(/<\/script/gi, '<\\/script');
  html = html.replace(match[0], () => `<script type="module">\n${javascript}\n</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = (await asset(match[1])).replace(/<\/style/gi, '<\\/style');
  html = html.replace(match[0], () => `<style>\n${css}\n</style>`);
}
if (/<script\b[^>]*\bsrc=|<link\b[^>]*rel="(?:stylesheet|modulepreload)"/i.test(html)) {
  throw new Error('Standalone output still references external code or styles.');
}
await writeFile(destination, html);
console.log(`Standalone game: ${destination} (${Buffer.byteLength(html).toLocaleString()} bytes)`);
