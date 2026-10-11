import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='vendor')visit(file);}else if(/\.(m?js)$/.test(file)){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status){console.error(r.stderr);process.exit(r.status);}}}}
visit('dist');visit('tests');console.log('All authored JavaScript syntax checks passed');
