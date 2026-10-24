import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,simplify,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/prepare-doreumi.mjs <upstream doreumi-master.glb>');
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(input);
// The village owns activity animation; unrelated embedded pet clips are unused.
for(const clip of doc.getRoot().listAnimations())clip.dispose();
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.45,error:.001,lockBorder:true}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const output='dist/characters/doreumi/village.glb';await io.write(output,doc);
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
await writeFile('dist/characters/doreumi/source.json',JSON.stringify({source:'https://github.com/ainssam/doreumi-desktop-pet',commit:'4433dba715893d75de60948b1968d21f5c79efcb',asset:'web/public/doreumi/doreumi-master.glb',attribution:'도름이 © 아인T, CC BY-NC 4.0',sourceSHA256:await hash(input),runtimeSHA256:await hash(output),derivation:'Unused embedded motion clips removed; welded mesh simplified with 0.001 error limit; Meshopt encoding. Runtime neutral pose normalized to village coordinates.'},null,2)+'\n');
