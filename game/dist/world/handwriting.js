import {handwritingFont,ensureHandwriting} from './font-ready.js';
import * as THREE from 'three';
// Keep readable text while the self-hosted hand-font is loading; repaint the same texture once ready.
export function signLabel(text,x,y,z,width=1.7,ink='#496c62',bg='#fff5dc',parent){
 if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=800;canvas.height=200;const ctx=canvas.getContext('2d');if(!ctx)return null;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;let disposed=false;texture.addEventListener('dispose',()=>disposed=true);
 const draw=()=>{if(disposed)return;ctx.clearRect(0,0,800,200);if(bg!=='transparent'){ctx.fillStyle=bg;ctx.fillRect(0,0,800,200);}ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=handwritingFont(78);ctx.fillText(text,400,101,750);texture.needsUpdate=true;};draw();
 ensureHandwriting(text).then(draw).catch(()=>{});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,transparent:bg==='transparent'}));mesh.position.set(x,y,z);mesh.userData.label=text;parent.add(mesh);return mesh;
}
