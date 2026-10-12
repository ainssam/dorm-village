import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BODY_CATALOG,TELESCOPE_BODY_IDS,lolaHeightKm} from '../dist/world/solar-system/catalog.js';

const ROOT=path.resolve('dist/world/solar-system');
const IDS=['Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];

test('catalog exposes exactly the eight telescope bodies with evidence-matched accuracy labels',()=>{
 assert.deepEqual([...TELESCOPE_BODY_IDS],IDS);
 assert.deepEqual(Object.keys(BODY_CATALOG),IDS);
 for(const id of IDS){
  const body=BODY_CATALOG[id];
  assert.equal(body.id,id);assert.ok(body.label);assert.ok(['observed-map','illustrative'].includes(body.category));
  assert.ok(['image-mosaic','false-color','radar','atmosphere','illustrative'].includes(body.source.kind));
  assert.match(body.source.url,/^https:\/\//);assert.ok(body.source.credit);assert.ok(body.source.coverage);assert.ok(body.source.limitations);assert.match(body.source.coverage,/[\uAC00-\uD7A3]/);assert.match(body.source.limitations,/[\uAC00-\uD7A3]/);
  assert.ok(body.maxZoom>=1&&body.maxZoom<=4);assert.ok(Array.isArray(body.highlights)&&body.highlights.length<=3);assert.deepEqual(body.pins,[]);
  for(const fact of body.highlights){assert.ok(fact.text);assert.match(fact.text,/[\uAC00-\uD7A3]/);assert.match(fact.url,/^https:\/\//);}
  for(const file of [body.render.colorMap,body.render.heightMap].filter(Boolean)){
   assert.ok(file.startsWith('./assets/'),`${id} must request an app-local asset`);
   const disk=path.join(ROOT,file.slice('./'.length));assert.ok(fs.existsSync(disk),`${id} missing local LOD ${file}`);
   assert.ok(fs.statSync(disk).size<=5*1024*1024,`${id} exceeds first-LOD transfer budget`);
  }
 }
});

test('observed texture classifications match the reviewed assets and keep unsupported bodies illustrative',()=>{
 assert.equal(BODY_CATALOG.Moon.category,'observed-map');assert.equal(BODY_CATALOG.Moon.source.kind,'image-mosaic');
 assert.equal(BODY_CATALOG.Mars.category,'observed-map');assert.equal(BODY_CATALOG.Mars.source.kind,'image-mosaic');
 assert.equal(BODY_CATALOG.Jupiter.category,'observed-map');assert.equal(BODY_CATALOG.Jupiter.source.kind,'atmosphere');
 for(const id of ['Mercury','Venus','Saturn','Uranus','Neptune']){
  assert.equal(BODY_CATALOG[id].category,'illustrative');assert.equal(BODY_CATALOG[id].source.kind,'illustrative');
  assert.equal(BODY_CATALOG[id].render.colorMap,null,`${id} has no reviewed Stage 1 texture`);
 }
 assert.match(BODY_CATALOG.Mars.source.limitations,/높낮이.*넣지/);
 assert.match(BODY_CATALOG.Jupiter.source.coverage,/80°|80/);assert.match(BODY_CATALOG.Jupiter.source.coverage,/검은 띠.*뜻은 아니에요/);assert.equal(BODY_CATALOG.Jupiter.source.relatedSourceUrl,'https://esahubble.org/images/heic1914b/');assert.equal(BODY_CATALOG.Jupiter.source.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
 assert.match(BODY_CATALOG.Jupiter.source.licenseText,/CC BY 4\.0/);assert.match(BODY_CATALOG.Jupiter.source.licenseText,/NASA 사이트/);assert.match(BODY_CATALOG.Jupiter.source.licenseText,/바이트가 같다고 주장하지 않아요/);assert.equal(BODY_CATALOG.Jupiter.source.credit,'NASA, ESA, A. Simon (Goddard Space Flight Center), and M.H. Wong (University of California, Berkeley).');
 assert.match(BODY_CATALOG.Saturn.source.limitations,/5\.22|Cassini|illustrative/i);
 assert.ok(BODY_CATALOG.Saturn.render.ringModel);
 assert.equal(BODY_CATALOG.Uranus.maxZoom,1);assert.equal(BODY_CATALOG.Neptune.maxZoom,1);
});

test('LOLA conversion uses the documented 1737.4 km reference and rejects malformed samples',()=>{
 assert.equal(lolaHeightKm(20000),0);
 assert.equal(lolaHeightKm(2243),-8.8785);
 assert.ok(Math.abs(lolaHeightKm(41008)-10.504)<1e-12);
 for(const bad of [NaN,Infinity,-1,65536,1.5,'20000',null])assert.equal(lolaHeightKm(bad),null);
});

test('unknown LOLA NODATA is not guessed or rendered as relief',()=>{
 assert.equal(BODY_CATALOG.Moon.render.heightMap,null);
 assert.equal(BODY_CATALOG.Moon.render.heightEncoding.nodata,'unknown');
 assert.equal(BODY_CATALOG.Moon.render.heightEncoding.enabled,false);
 assert.match(BODY_CATALOG.Moon.source.limitations,/빠진 값|높낮이/);
});
