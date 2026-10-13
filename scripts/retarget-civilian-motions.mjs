// Retarget the existing in-place motion bank to additional weighted GLB skeletons.
// Usage: node scripts/retarget-civilian-motions.mjs key=model.glb [key=model.glb ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import * as THREE from 'three';

function model(filename) {
  const raw = readFileSync(filename), length = raw.readUInt32LE(12);
  const doc = JSON.parse(raw.subarray(20, 20 + length)), binary = raw.subarray(28 + length);
  const parents = new Map(); doc.nodes.forEach((node, i) => node.children?.forEach(child => parents.set(child, i)));
  const nodes = doc.nodes.map((node, i) => ({ name: node.name ?? '', index: i,
    position: new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]),
    rotation: new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    scale: new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]) }));
  const ordered = [], done = new Set();
  const visit = i => { if (done.has(i)) return; if (parents.has(i)) visit(parents.get(i)); done.add(i); ordered.push(nodes[i]); };
  nodes.forEach((_, i) => visit(i));
  for (const node of ordered) {
    node.parent = nodes[parents.get(node.index)];
    const local = new THREE.Matrix4().compose(node.position, node.rotation, node.scale);
    if (doc.nodes[node.index].matrix) local.fromArray(doc.nodes[node.index].matrix);
    node.worldMatrix = node.parent ? node.parent.worldMatrix.clone().multiply(local) : local;
    node.worldRotation = new THREE.Quaternion(); node.worldMatrix.decompose(new THREE.Vector3(), node.worldRotation, new THREE.Vector3());
  }
  const semantic = name => name.replace(/^mixamorig\d*[:_]?/i, '').toLowerCase();
  const joints = new Set(doc.skins?.flatMap(skin => skin.joints) ?? []);
  if (!joints.size) nodes.filter(node => /^mixamorig/i.test(node.name)).forEach(node => joints.add(node.index));
  const bones = ordered.filter(node => joints.has(node.index));
  const lookup = new Map(bones.map(node => [semantic(node.name), node]));
  function accessor(index) {
    const item = doc.accessors[index], view = doc.bufferViews[item.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[item.type], start = (view.byteOffset ?? 0) + (item.byteOffset ?? 0);
    return Array.from({ length: item.count * width }, (_, i) => binary.readFloatLE(start + i * 4));
  }
  const native = (doc.animations ?? []).map(animation => ({ name: animation.name.toLowerCase(), duration: 0,
    tracks: animation.channels.filter(channel => ['rotation', 'translation'].includes(channel.target.path) && joints.has(channel.target.node)).map(channel => {
      const sampler = animation.samplers[channel.sampler];
      return { node: doc.nodes[channel.target.node].name, path: channel.target.path, times: accessor(sampler.input), values: accessor(sampler.output) };
    }) }));
  native.forEach(clip => clip.duration = Math.max(...clip.tracks.map(track => track.times.at(-1))));
  return { ordered, bones, lookup, native, semantic };
}

const bankPath = 'src/assets/motions.bin', banks = JSON.parse(gunzipSync(readFileSync(bankPath)));
const argumentsList = process.argv.slice(2), jobs = [];
if (argumentsList[0] === '--actions') {
  for (const item of JSON.parse(readFileSync(argumentsList[1]))) {
    const source = model(item.source), clip = source.native[0];
    clip.name = item.name;
    for (const key of item.targets) jobs.push({ key, filename: 'src/assets/' + (key === 'police' ? 'resident' : key) + '.glb', source, clips: [clip], append: true });
  }
} else {
  const source = model('src/assets/boss.glb'), clips = [...source.native.filter(clip => clip.name === 'idle'), ...banks.boss];
  for (const argument of argumentsList) { const [key, filename] = argument.split('='); jobs.push({ key, filename, source, clips }); }
}
for (const { key, filename, source, clips, append } of jobs) {
  const target = model(filename);
  const sourceHip = source.lookup.get('hips'), targetHip = target.lookup.get('hips');
  const heightRatio = new THREE.Vector3().setFromMatrixPosition(targetHip.worldMatrix).y / new THREE.Vector3().setFromMatrixPosition(sourceHip.worldMatrix).y;
  const retargeted = clips.map(clip => {
    const tracks = new Map(clip.tracks.map(track => [track.node + '/' + track.path, track]));
    const times = Array.from({ length: Math.ceil(clip.duration * 30) + 1 }, (_, i) => Math.min(i / 30, clip.duration));
    function sample(track, time, rotation) {
      let end = track.times.findIndex(value => value >= time); if (end < 0) end = track.times.length - 1;
      const start = Math.max(0, end - 1), span = track.times[end] - track.times[start];
      const alpha = span > 0 ? Math.min(1, Math.max(0, (time - track.times[start]) / span)) : 0;
      if (rotation) return new THREE.Quaternion().fromArray(track.values, start * 4).slerp(new THREE.Quaternion().fromArray(track.values, end * 4), alpha);
      return new THREE.Vector3().fromArray(track.values, start * 3).lerp(new THREE.Vector3().fromArray(track.values, end * 3), alpha);
    }
    const result = target.bones.map(node => ({ node: node.name, path: 'rotation', times, values: [] }));
    const translation = { node: targetHip.name, path: 'translation', times, values: [] };
    for (let frame = 0; frame < times.length; frame++) {
      const sourcePose = new Map(), targetPose = new Map();
      for (const node of source.ordered) {
        const track = tracks.get(node.name + '/rotation');
        const local = track ? sample(track, times[frame], true) : node.rotation;
        sourcePose.set(node.index, node.parent ? sourcePose.get(node.parent.index).clone().multiply(local) : local.clone());
      }
      for (const node of target.ordered) {
        const match = target.lookup.has(target.semantic(node.name)) ? source.lookup.get(target.semantic(node.name)) : undefined;
        const parent = node.parent ? targetPose.get(node.parent.index) : new THREE.Quaternion();
        const desired = match ? sourcePose.get(match.index).clone().multiply(match.worldRotation.clone().invert()).multiply(node.worldRotation) : parent.clone().multiply(node.rotation);
        targetPose.set(node.index, desired);
        const output = result.find(track => track.node === node.name);
        if (output) output.values.push(...parent.clone().invert().multiply(desired).normalize().toArray().map(v => +v.toFixed(6)));
      }
      const movement = tracks.get(sourceHip.name + '/translation');
      const offset = movement ? sample(movement, times[frame], false).sub(sourceHip.position) : new THREE.Vector3();
      offset.applyMatrix3(new THREE.Matrix3().setFromMatrix4(sourceHip.parent.worldMatrix));
      offset.multiplyScalar(heightRatio);
      if (clip.name !== 'death') offset.set(0, THREE.MathUtils.clamp(offset.y, clip.name === 'milk' ? -.65 : -.08, .08), 0);
      offset.applyMatrix3(new THREE.Matrix3().setFromMatrix4(targetHip.parent.worldMatrix).invert()).add(targetHip.position);
      translation.values.push(...offset.toArray().map(v => +v.toFixed(6)));
    }
    return { name: clip.name, duration: clip.duration, tracks: [...result, translation] };
  });
  banks[key] = append ? [...(banks[key] ?? []).filter(clip => !retargeted.some(next => next.name === clip.name)), ...retargeted] : retargeted;
  console.log('Retargeted', key, target.bones.length, 'joints;', retargeted.map(clip => clip.name).join(', '));
}
writeFileSync(bankPath, gzipSync(JSON.stringify(banks), { level: 9 }));
console.log('Motion bank:', readFileSync(bankPath).byteLength, 'bytes');
