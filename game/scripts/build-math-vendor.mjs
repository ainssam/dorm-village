import fs from 'node:fs';import {build} from 'esbuild';
fs.mkdirSync('dist/vendor/mathlive',{recursive:true});fs.mkdirSync('dist/vendor/mathjax',{recursive:true});fs.mkdirSync('dist/vendor/dompurify',{recursive:true});
for(const f of ['mathlive.min.mjs','LICENSE.txt'])fs.copyFileSync('node_modules/mathlive/'+f,'dist/vendor/mathlive/'+f);
fs.cpSync('node_modules/mathlive/fonts','dist/vendor/mathlive/fonts',{recursive:true});
for(const f of ['LICENSE.txt','FONT-LICENSE.txt'])fs.copyFileSync('node_modules/@mathjax/src/LICENSE','dist/vendor/mathjax/'+f);
fs.copyFileSync('node_modules/dompurify/dist/purify.es.mjs','dist/vendor/dompurify/purify.es.mjs');fs.copyFileSync('node_modules/dompurify/LICENSE','dist/vendor/dompurify/LICENSE');
await build({entryPoints:['source/math-renderer.mjs'],bundle:true,platform:'browser',format:'esm',minify:true,alias:{'#default-font/svg/default.js':'@mathjax/mathjax-tex-font/mjs/svg/default.js'},outfile:'dist/vendor/mathjax/renderer.mjs'});
console.log('Self-hosted MathLive, sanitized editor, and font-independent MathJax SVG bundle ready');
