// Build-time only. The globe must not reuse the Equal Earth wall-map projection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {geoArea, geoContains, geoEquirectangular, geoGraticule, geoPath} from 'd3-geo';
import {Resvg} from '@resvg/resvg-js';

const root=path.dirname(fileURLToPath(import.meta.url));
const bytes=fs.readFileSync(path.join(root,'source/ne_110m_land.geojson'));
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const sourceSha='9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9';
assert.equal(sha256(bytes),sourceSha,'Use the exact approved Natural Earth physical-land source');
const land=JSON.parse(bytes),width=1024,height=512;
const projection=geoEquirectangular().rotate([0,0,0]).center([0,0])
  .scale(width/(2*Math.PI)).translate([width/2,height/2]).precision(.08);
const draw=geoPath(projection).digits(4);
const palette={ocean:'#a6cbd2',land:'#b6c58b',grid:'#7298a0'};
const samples=[
  ['Africa',20,10,true],['Asia',90,40,true],['Europe',20,50,true],
  ['North America',-100,45,true],['South America',-60,-10,true],
  ['Australia',134,-25,true],['Antarctica',0,-85,true],
  ['Greenland',-42,73,true],['Japan Honshu',138,36,true],
  ['New Zealand North Island',175.4,-38.5,true],['New Zealand South Island',170.5,-44,true],
  ['Madagascar',46,-20,true],['Sumatra',101,-1,true],['Java',110,-7.5,true],
  ['Borneo',114,.7,true],['Sulawesi',120,-2,true],['New Guinea',140,-5,true],
  ['Fiji Viti Levu',178,-17.8,true],['Fiji Vanua Levu',179.5,-16.5,true],
  ['Pacific Ocean',-140,0,false],['Atlantic Ocean',-30,0,false],['Indian Ocean',80,-25,false],
  ['North Pole',0,89.8,false],['South Pole',0,-89.8,true],
  ['Antarctica west seam',-179.8,-85,true],['Antarctica east seam',179.8,-85,true],
  ['Pacific west seam',-179.8,0,false],['Pacific east seam',179.8,0,false],
  ['Chukotka west seam',-179.8,66,true],['Chukotka east seam',179.8,66,true],
].map(([name,lon,lat,expectedLand])=>{
  assert.equal(geoContains(land,[lon,lat]),expectedLand,name);
  const xy=projection([lon,lat]);
  assert(Math.abs(xy[0]-(lon+180)/360*width)<1e-8);
  assert(Math.abs(xy[1]-(90-lat)/180*height)<1e-8);
  return {name,lon,lat,expectedLand,xy,uv:[(lon+180)/360,(lat+90)/180]};
});
assert(geoArea(land)>3.4&&geoArea(land)<3.9,'Land must not be inverted');
for(const feature of land.features){
  assert.equal(feature.properties.featurecla,'Land');
  assert(geoArea(feature)<2*Math.PI);
  for(const ring of feature.geometry.coordinates)assert.deepEqual(ring[0],ring.at(-1));
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<title>Dormi globe: physical land and ocean</title>
<desc>Full equirectangular globe texture. North is up, west is left. No national borders or labels. Natural Earth public domain physical land, pinned revision ca96624a56bd078437bca8184e78163e5039ad19.</desc>
<rect width="${width}" height="${height}" fill="${palette.ocean}"/>
<path id="land" d="${draw(land)}" fill="${palette.land}" fill-rule="nonzero"/>
<path id="graticule" d="${draw(geoGraticule().step([30,30])())}" fill="none" stroke="${palette.grid}" stroke-width=".65" opacity=".2"/>
</svg>\n`;
const out=path.join(root,'globe');fs.mkdirSync(out,{recursive:true});
const raster=new Resvg(svg,{font:{loadSystemFonts:false}}).render();
const png=raster.asPng(),pixels=raster.pixels;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const landRGB=rgb(palette.land),oceanRGB=rgb(palette.ocean);
const distance=(a,b)=>a.reduce((sum,value,i)=>sum+(value-b[i])**2,0);
const checks=samples.map(sample=>{
  const [x,y]=sample.xy.map((v,i)=>Math.max(0,Math.min((i?height:width)-1,Math.floor(v))));
  const rgba=Array.from(pixels.slice((y*width+x)*4,(y*width+x)*4+4));
  const rasterLand=distance(rgba.slice(0,3),landRGB)<distance(rgba.slice(0,3),oceanRGB);
  assert.equal(rasterLand,sample.expectedLand,`${sample.name} actual raster pixel`);
  assert.equal(rgba[3],255);
  return {...sample,pixel:[x,y],rgba,rasterLand};
});
fs.writeFileSync(path.join(out,'world-globe-equirectangular.svg'),svg);
fs.writeFileSync(path.join(out,'world-globe-1024.png'),png);
const deploy=path.resolve(root,'../../dist/school/maps/world-globe-1024.png');
fs.writeFileSync(deploy,png);
const manifest={
  name:'Dormi social-studies physical globe',generatedOn:'2026-10-04',
  source:{...JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))).source,sha256:sha256(bytes)},
  projection:{name:'Equirectangular',implementation:'d3-geo 3.1.1 geoEquirectangular',width,height,
    longitudeExtent:[-180,180],latitudeExtent:[90,-90],padding:0,northUp:true,westLeft:true,
    pixelFormula:['x=(longitude+180)/360*1024','y=(90-latitude)/180*512'],
    sphereUV:['u=(longitude+180)/360','v=(latitude+90)/180'],textureFlipY:true,
    antimeridian:'D3 spherical antimeridian clipping; both longitude edges retained',
    poles:'Full extent, south-pole land and north-pole ocean retained'},
  presentation:{palette,countryBorders:false,countryNames:false,labels:false,graticuleDegrees:30},
  processing:{geometryRemoved:0,features:land.features.length,landAreaSteradians:geoArea(land),
    sourceSimplification:'None beyond pinned 110m dataset',winding:'Original D3-compatible rings unchanged'},
  validation:{pixelChecks:checks,renderer:'@resvg/resvg-js 2.6.2'},
  files:[['world-globe-equirectangular.svg',Buffer.from(svg)],['world-globe-1024.png',png]].map(([file,data])=>({file,bytes:data.length,sha256:sha256(data)}))
};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({width,height,sourceSha256:sha256(bytes),rasterSha256:sha256(png),bytes:png.length,pixelChecks:checks.length}));
