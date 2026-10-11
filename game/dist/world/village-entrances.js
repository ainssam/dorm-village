import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {handwritingFont,ensureHandwriting} from './font-ready.js';
import {createToyKit} from './toy-kit.js';
import {villageEntranceParts,villageEntranceObstacles} from './village-layout.js';

// Painted code-native motifs keep the complete doorway silhouette and cost only
// two small planes per entrance. The two faces share their owned map/material.
export function drawEntranceHeader(ctx,id){
 const park=id==='park',ink=park?'#345f48':'#805637';
 ctx.clearRect(0,0,1024,320);ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';
 const oval=(x,y,rx,ry,color,rotation=0)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);ctx.fill();};
 // A small warm-paper plaque leaves both tall posts and most of the arch visible.
 ctx.fillStyle='#fff3d6';ctx.strokeStyle=park?'#72976b':'#cc9a63';ctx.beginPath();ctx.roundRect(park?244:184,80,park?536:656,208,62);ctx.fill();ctx.stroke();
 if(park){
  for(const side of [-1,1]){const x=512+side*330;ctx.strokeStyle='#567f66';ctx.beginPath();ctx.moveTo(x-side*28,251);ctx.quadraticCurveTo(x+side*18,171,x+side*45,93);ctx.stroke();oval(x,169,56,27,'#8db079',side*.66);oval(x+side*49,117,50,25,'#6f9967',-side*.55);oval(x-side*20,214,44,23,'#a9c48a',-side*.58);}
  for(const [x,y,color]of [[209,89,'#e9ad9d'],[814,232,'#efd78f']]){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(x+Math.cos(a)*22,y+Math.sin(a)*22,22,18,color);}oval(x,y,13,13,'#e2b963');}
 }else{
  ctx.strokeStyle='#a67b54';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(91,14);ctx.quadraticCurveTo(512,60,933,14);ctx.stroke();
  for(const [i,x]of [158,281,404,527,650,773,896].entries()){const y=14+23*(1-((x-512)/421)**2);ctx.fillStyle=['#d79287','#dfbd63','#86b69c','#8eb3c2'][i%4];ctx.beginPath();ctx.moveTo(x-42,y);ctx.lineTo(x+42,y);ctx.lineTo(x,y+42);ctx.closePath();ctx.fill();}
 }
 ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=handwritingFont(178);ctx.fillText(park?'공원':'놀이터',512,184,park?408:544);
}
function entranceHeader(parent,id){
 const title=id==='park'?'공원':'놀이터',header=new THREE.Group();header.name=`entrance.${id}.header`;header.userData={kind:'entrance-overhead',label:title,clearance:3.04};parent.add(header);
 const canvas=globalThis.document?.createElement?.('canvas');let texture=null;
 if(canvas){canvas.width=1024;canvas.height=320;const ctx=canvas.getContext?.('2d');if(ctx){texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;let disposed=false;texture.addEventListener('dispose',()=>disposed=true);const draw=()=>{if(disposed)return;drawEntranceHeader(ctx,id);texture.needsUpdate=true;};draw();ensureHandwriting(title).then(draw).catch(()=>{});}}
 const geometry=new THREE.PlaneGeometry(2.30,.71875),material=new THREE.MeshBasicMaterial({map:texture,color:texture?'#ffffff':'#fff3d6',transparent:true,alphaTest:.05,toneMapped:false});material.name=`entrance.${id}.header.paint`;
 for(const side of [1,-1]){const face=new THREE.Mesh(geometry,material);face.name=`entrance.${id}.header.${side===1?'front':'back'}`;face.position.set(0,3.40,side*.13);face.rotation.y=side===1?0:Math.PI;face.userData.label=title;header.add(face);}
 return header;
}

// One original toy-geometry builder serves the world and miniature atlas.
// Each solid pocket uses exactly the footprint that supplies its collider.
export function buildVillageEntrance(root,place){
 const g=new THREE.Group();g.name=`village.${place.id}.gateway`;g.position.set(place.transform.x,0,place.transform.z);g.rotation.y=place.transform.yaw;
 g.userData={kind:'landscape-entrance',entrance:place.style.entrance};root.add(g);
 const {mat}=createToyKit(g),obstacles=villageEntranceObstacles(place.id);
 const add=(parent,geometry,color,x,y,z)=>{const mesh=new THREE.Mesh(geometry,mat(color));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(p,w,h,d,color,x,y,z)=>add(p,new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const leaf=(p,color,x,y,z,sx,sy,sz)=>{const mesh=add(p,new THREE.SphereGeometry(1,8,6),color,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;};
 // Merge same-colour parts only inside their owned pocket to bound draw calls.
 // Nothing is shared with another world/map instance or its disposal lifecycle.
 function compact(group){const batches=new Map();for(const m of [...group.children]){m.updateMatrix();m.geometry.applyMatrix4(m.matrix);if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m.geometry);group.remove(m);}for(const [material,geometries]of batches){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const geometry of geometries)geometry.dispose();}}
 for(const part of villageEntranceParts(place.id)){
  const pocket=new THREE.Group();pocket.name=part.id;pocket.position.set(part.x,0,part.z);pocket.userData={kind:part.kind,colliderId:part.id,footprint:{...obstacles.find(o=>o.id===part.id)},maxHeight:part.maxHeight};g.add(pocket);
  if(part.kind==='entrance-end'){
   box(pocket,.34,.10,.39,'#dfd7b8',0,.10,0);
   add(pocket,new THREE.CylinderGeometry(.115,.125,2.0,8),place.style.color,0,1.15,0);
  }else if(part.kind==='leaf-pocket'){
   add(pocket,new THREE.CylinderGeometry(.065,.10,.66,6),'#ae8560',0,.36,0);
   leaf(pocket,'#7ea570',0,.88,.06,.245,.39,.36);
   leaf(pocket,'#a0bf83',-.04,1.04,-.15,.20,.245,.28);
  }else if(part.kind==='flower-pocket'){
   box(pocket,.66,.14,1.32,'#c3ae88',0,.12,0);
   box(pocket,.60,.035,1.24,'#8eaf75',0,.205,0);
   for(const [i,z]of [-.43,0,.43].entries()){
    const x=i%2?.12:-.10;box(pocket,.035,.20,.035,'#678d61',x,.31,z);
    leaf(pocket,['#f3d99b','#e7a395','#f4ebc7'][i],x,.445,z,.17,.10,.17);
   }

  }
  compact(pocket);
 }
 // The doorway is a true open arch, with its curved rail above head/jump
 // clearance. Only the two grounded uprights need horizontal colliders.
 const arch=new THREE.Group();arch.name=`entrance.${place.id}.arch`;arch.userData={kind:'entrance-overhead',clearance:2.25};g.add(arch);
 class ArchCurve extends THREE.Curve{getPoint(t,target=new THREE.Vector3()){const angle=Math.PI*t;return target.set(1.23*Math.cos(angle),2.13+1.23*Math.sin(angle),0);}}
 add(arch,new THREE.TubeGeometry(new ArchCurve(),14,.105,6,false),place.style.color,0,0,0);
 const crown=(color,x,y,sx,sy,sz)=>{const mesh=add(arch,new THREE.SphereGeometry(1,6,4),color,x,y,0);mesh.scale.set(sx,sy,sz);return mesh;};
 if(place.id==='park'){
  crown('#a0bf83',-.72,3.17,.12,.26,.09).rotation.z=-.65;
  crown('#567f66',.72,3.17,.12,.26,.09).rotation.z=.65;
 }else{
  crown('#fff2d5',0,3.50,.20,.17,.085);
  for(const x of [-.17,.17])crown('#fff2d5',x,3.44,.16,.13,.085);
 }
 compact(arch);
 entranceHeader(g,place.id);
 // Keep the ground-level path fragment below the readable open arch.
 const path=box(g,1.65,.015,1.80,place.id==='park'?'#c2c6a0':'#e8d4a9',0,.055,-.88);path.name=`entrance.${place.id}.path`;path.userData.kind='ground';
 return g;
}
