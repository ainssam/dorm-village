// Usage: node render-assets.mjs /absolute/path/to/@resvg/resvg-js/index.js
// Generated SVG contains paths only, so rasterization never relies on font fallback.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const modulePath=process.argv[2];
if(!modulePath)throw new Error('Pass a verified installed @resvg/resvg-js module path.');
const {Resvg}=await import(pathToFileURL(modulePath));
for(const basename of ['hunminjeongeum-calligraphy','hunminjeongeum-paper','hunminjeongeum-ink','hunminjeongeum-framed']){
 const svg=fs.readFileSync(path.join(root,'assets',`${basename}.svg`),'utf8');
 const renderer=new Resvg(svg,{font:{loadSystemFonts:false}});
 const image=renderer.render();
 const out=path.join(root,'assets',`${basename}.png`);
 fs.writeFileSync(out,image.asPng());
 console.log(`${basename}: ${image.width} × ${image.height}`);
}
