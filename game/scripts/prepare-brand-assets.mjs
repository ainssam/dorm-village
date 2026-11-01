// Size/format conversions only. Artwork edits belong in the image-generation
// workflow documented in dist/brand/README.md. Requires ImageMagick 7.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const hero='dist/brand/dorm-village-promo-original.png';
const icon='dist/brand/doreumi-icon-original.png';
function convert(args){const result=spawnSync('magick',args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw Error('ImageMagick conversion failed');}
convert([hero,'-resize','1200x630!','-strip','dist/brand/dorm-village-kakao-1200x630.png']);
convert([hero,'-resize','1200x630!','-quality','88','-strip','dist/brand/dorm-village-share.webp']);
for(const size of [192,512])convert([icon,'-resize',`${size}x${size}`,'-strip',`dist/brand/icon-${size}.png`]);
convert([icon,'-resize','180x180','-strip','dist/apple-touch-icon.png']);
convert([icon,'-resize','32x32','-strip','dist/brand/favicon-32.png']);
convert([icon,'-resize','256x256','-define','icon:auto-resize=64,48,32,16','dist/favicon.ico']);
const data=readFileSync('dist/brand/icon-192.png').toString('base64');
writeFileSync('dist/icon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><title>도름마을</title><image width="192" height="192" href="data:image/png;base64,${data}"/></svg>\n`);
const files=[hero,icon,'dist/brand/dorm-village-kakao-1200x630.png','dist/brand/dorm-village-share.webp','dist/brand/icon-192.png','dist/brand/icon-512.png','dist/brand/favicon-32.png','dist/apple-touch-icon.png','dist/favicon.ico','dist/icon.svg'];
writeFileSync('dist/brand/source.json',JSON.stringify({created:'2026-11-01',kind:'Promotional illustration; not a gameplay screenshot',generator:'OpenAI image_gen',reference:{asset:'characters/doreumi/village.glb',source:'https://github.com/ainssam/doreumi-desktop-pet',commit:'4433dba715893d75de60948b1968d21f5c79efcb',attribution:'도름이 © 아인T · CC BY-NC 4.0'},files:files.map(path=>{const bytes=readFileSync(path);return{path:path.replace(/^dist\//,''),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};})},null,2)+'\n');
console.log('Prepared 1200×630 share art, app icons, Apple touch icon, SVG and ICO favicon.');
