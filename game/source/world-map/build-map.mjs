import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { geoArea, geoContains, geoEqualEarth, geoGraticule, geoPath } from 'd3-geo';
import { Resvg } from '@resvg/resvg-js';

const root = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(root, 'source/ne_110m_land.geojson');
const sourceBytes = fs.readFileSync(sourcePath);
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
assert.equal(sourceSha256, '9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9');
const land = JSON.parse(sourceBytes);
const sphere = { type: 'Sphere' };
const W = 2048, H = 1024, margin = 32;
const projection = geoEqualEarth().rotate([0, 0, 0]).center([0, 0]).precision(0.15).fitExtent([[margin, margin], [W - margin, H - margin]], sphere);
const draw = geoPath(projection).digits(3);
const mapBounds = draw.bounds(sphere);
const landArea = geoArea(land);
assert(landArea > 3.4 && landArea < 3.9, 'Land must occupy about 29% of the globe, not the inverted ocean');
assert(projection([0,60])[1] < projection([0,-60])[1], 'Map must be north-up');
let rings = 0, vertices = 0;
for (const feature of land.features) {
  assert.equal(feature.properties.featurecla, 'Land');
  assert.equal(feature.geometry.type, 'Polygon');
  assert(geoArea(feature) < 2 * Math.PI, 'Exterior ring must use D3 spherical winding, smaller than a hemisphere');
  for (const ring of feature.geometry.coordinates) {
    rings++; vertices += ring.length;
    assert.deepEqual(ring[0], ring.at(-1), 'Source rings remain closed');
  }
}
const samples = [
  ['Africa', 20, 10, true], ['Asia', 90, 40, true], ['Europe', 20, 50, true],
  ['North America', -100, 45, true], ['South America', -60, -10, true],
  ['Australia', 134, -25, true], ['Antarctica', 0, -85, true],
  ['Greenland', -42, 73, true], ['Japan Honshu', 138, 36, true],
  ['New Zealand North Island', 175.4, -38.5, true], ['New Zealand South Island', 170.5, -44, true],
  ['Madagascar', 46, -20, true], ['Sumatra', 101, -1, true], ['Java', 110, -7.5, true],
  ['Borneo', 114, 0.7, true], ['Sulawesi', 120, -2, true], ['New Guinea', 140, -5, true],
  ['Pacific Ocean', -140, 0, false], ['Atlantic Ocean', -30, 0, false],
  ['Indian Ocean', 80, -25, false]
].map(([name, lon, lat, expectedLand]) => {
  const contains = geoContains(land, [lon, lat]);
  assert.equal(contains, expectedLand, `${name} winding/land inclusion`);
  return { name, lon, lat, expectedLand, contains, xy: projection([lon, lat]) };
});
const palette = { paper:'#f4ecd9', ocean:'#b9d7df', land:'#a8bd91', grid:'#628b98', equator:'#557e8b', outline:'#83acb8', label:'#365852', labelHalo:'#f5f2df' };
const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="title desc">\n<title id="title">세계의 땅과 바다</title>\n<desc id="desc">북쪽이 위인 이퀄 어스 세계 지도. 국경 없이 대륙과 주요 섬, 경위선과 적도를 표시합니다. Natural Earth 공개 도메인 지리 자료를 사용합니다.</desc>\n`;
const map = `<defs><clipPath id="world-sphere"><path d="${draw(sphere)}"/></clipPath></defs>\n<rect width="${W}" height="${H}" fill="${palette.paper}"/>\n<path id="ocean" d="${draw(sphere)}" fill="${palette.ocean}"/>\n<g clip-path="url(#world-sphere)">\n<path id="land" d="${draw(land)}" fill="${palette.land}" fill-rule="nonzero" stroke="none"/>\n<path id="graticule" d="${draw(geoGraticule().step([30, 30])())}" fill="none" stroke="${palette.grid}" stroke-width="1.2" opacity="0.22"/>\n<path id="equator" d="${draw({ type: 'LineString', coordinates: Array.from({length:361}, (_, i) => [i - 180, 0]) })}" fill="none" stroke="${palette.equator}" stroke-width="2" stroke-dasharray="10 8" opacity="0.62"/>\n</g>\n<path id="sphere-outline" d="${draw(sphere)}" fill="none" stroke="${palette.outline}" stroke-width="2"/>\n`;
const labelPoints = [
 ['north-america','북아메리카',-103,45], ['south-america','남아메리카',-58,-20],
 ['europe','유럽',20,52], ['africa','아프리카',19,8], ['asia','아시아',91,42],
 ['oceania','오세아니아',138,-25], ['antarctica','남극',0,-74], ['equator','적도',-18,0]
].map(([id,label,lon,lat])=>({id,label,lon,lat,xy:projection([lon,lat])}));
const labelLayer = `<g id="continent-labels-ko" font-family="Noto Sans CJK KR, Noto Sans KR, sans-serif" font-size="34" font-weight="700" fill="${palette.label}" stroke="${palette.labelHalo}" stroke-width="6" stroke-opacity="0.82" paint-order="stroke fill" text-anchor="middle" stroke-linejoin="round">\n${labelPoints.map(p=>`<text id="label-${p.id}" x="${p.xy[0].toFixed(3)}" y="${(p.xy[1]+(p.id==='equator'?-12:11)).toFixed(3)}"${p.id==='equator'?' font-size="26"':''}>${p.label}</text>`).join('\n')}\n</g>\n`;
const base = head + map + '</svg>\n';
const labeled = head + map + labelLayer + '</svg>\n';
const overlay = head + labelLayer + '</svg>\n';
fs.writeFileSync(path.join(root,'assets/world-map-equal-earth.svg'), base);
fs.writeFileSync(path.join(root,'assets/world-map-equal-earth-ko.svg'), labeled);
fs.writeFileSync(path.join(root,'assets/world-map-labels-ko.svg'), overlay);
for (const [name, svg] of [['world-map-equal-earth',base],['world-map-equal-earth-ko',labeled]]) {
  for (const width of [1024,2048]) {
    const renderer = new Resvg(svg, {fitTo: { mode: 'width', value: width }, font: { loadSystemFonts:false, fontFiles:['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'], defaultFontFamily:'Noto Sans CJK KR' }});
    fs.writeFileSync(path.join(root,`assets/${name}-${width}.png`), renderer.render().asPng());
  }
}
const manifest = {
 name:'DORMI physical world wall map', generatedOn:'2026-10-04',
 source:{dataset:'Natural Earth physical land 1:110 million', layer:'ne_110m_land', repository:'https://github.com/nvkelso/natural-earth-vector', revision:'ca96624a56bd078437bca8184e78163e5039ad19', revisionDate:'2022-06-02T07:25:00Z', url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_land.geojson', sha256:sourceSha256, bytes:sourceBytes.length, license:'Public domain (Natural Earth terms)', licenseUrl:'https://www.naturalearthdata.com/about/terms-of-use/', retainedLicense:'licenses/NATURAL-EARTH-LICENSE.md', sourceFile:'source/ne_110m_land.geojson'},
 projection:{name:'Equal Earth', implementation:'d3-geo 3.1.1 geoEqualEarth', documentation:'https://d3js.org/d3-geo/cylindrical#geoEqualEarth', source:'https://github.com/d3/d3-geo/blob/v3.1.1/src/projection/equalEarth.js', northUp:true, center:[0,0], rotate:[0,0,0], scale:projection.scale(), translate:projection.translate(), adaptivePrecisionPxAt2048:0.15, fitExtent:[[margin,margin],[W-margin,H-margin]], sphericalBounds:mapBounds, distortion:'Equal-area projection; planar shapes vary by location. No nonuniform scaling.'},
 presentation:{width:W,height:H,aspectRatio:2, recommendedWorldQuad:{width:6,height:3},palette,graticuleDegrees:30,equatorLatitude:0,countryBorders:false,countryNames:false,visibleBranding:false,labelsAreSeparateLayer:true,labelPoints},
 processing:{simplification:'None beyond source dataset',winding:'Source verified D3-compatible; no rings reversed',perFeatureStroke:false,clip:'Full sphere only, poles and antimeridian retained',geometryRemoved:0,features:land.features.length,rings,vertices,landAreaSteradians:landArea,landFraction:landArea/(4*Math.PI)},
 validation:{ringClosure:true,allExteriorAreasBelowHemisphere:true,northUp:true,landOceanSamples:samples,rasterChecks:'See validation/pixel-checks.json and README.md'},
 rasterizer:{name:'@resvg/resvg-js',version:'2.6.2',fontForKoVariant:'/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',fontFamily:'Noto Sans CJK KR',fontLicense:'SIL Open Font License 1.1; system package copyright retained in licenses/Noto-CJK-copyright.txt'},
 files:[]
};
for(const file of fs.readdirSync(path.join(root,'assets')).sort()){
 const bytes=fs.readFileSync(path.join(root,'assets',file));manifest.files.push({file:'assets/'+file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.mkdirSync(path.join(root,'validation'),{recursive:true});
fs.writeFileSync(path.join(root,'validation/land-ocean-samples.json'),JSON.stringify(samples,null,2)+'\n');
console.log(JSON.stringify({features:land.features.length,rings,vertices,landFraction:manifest.processing.landFraction,mapBounds,files:manifest.files},null,2));
