import fs from 'node:fs';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildCastleExterior,inspectCastleExterior,disposeCastleExterior,CASTLE_SPEC} from './castle-exterior.mjs';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();});}
};
const root=buildCastleExterior(T),audit=inspectCastleExterior(T,root);
const folder=new URL('../preview/',import.meta.url);
const data=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
fs.writeFileSync(new URL('castle-exterior.glb',folder),Buffer.from(data));
fs.writeFileSync(new URL('../docs/geometry-audit.json',import.meta.url),JSON.stringify({audit,spec:CASTLE_SPEC,ownerLabelTriangles:2,estimatedIntegratedIslandTriangles:118382-5286+audit.triangles+2,parts:root.userData.parts},null,2)+'\n');
console.log(JSON.stringify({bytes:data.byteLength,audit}));disposeCastleExterior(root);
