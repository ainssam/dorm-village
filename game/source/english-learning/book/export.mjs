import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createDormiPoser} from '../../../dist/dormi-poses.js';
import {clayMaterial} from '../../../dist/world/toy-kit.js';
const root=path.dirname(new URL(import.meta.url).pathname);
const original=path.resolve(root,'../../../dist/dormi.glb');
const bytes=fs.readFileSync(original);
const modelHash=crypto.createHash('sha256').update(bytes).digest('hex');
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.()})}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.()})}};
globalThis.ProgressEvent??=class{constructor(t,p){Object.assign(this,p)}};
const cases=[
 {page:1,line:'Dormi has a blue pencil.',player:[-1.40,0,.55],yaw:.42,pose:'stand',amount:0,pitch:0,eye:[3.8,3.2,7],target:[.03,.76,.12],span:4.55},
 {page:2,line:'The pencil is not on the desk.',player:[-1.40,0,.55],yaw:2.24,pose:'stand',amount:0,pitch:.03,eye:[5.7,3.4,4.8],target:[.03,.76,.12],span:4.55},
 {page:3,line:'Dormi looks under the chair.',player:[-.02,0,1.18],yaw:2.22,pose:'stand',amount:0,pitch:.18,eye:[5.7,2.9,4.8],target:[.24,.73,.22],span:4.55},
 {page:4,line:'There it is! Now Dormi can draw a star.',player:[-1.40,0,.55],yaw:.50,pose:'photoStand',amount:.6,pitch:0,eye:[3.8,3.4,7],target:[.03,.76,.12],span:4.55},
];
for(const c of cases){
 const scene=new T.Scene(), mats=new Map();
 const mat=color=>{if(!mats.has(color))mats.set(color,clayMaterial(color));return mats.get(color)};
 const add=(geo,color,name,parent=scene)=>{const o=new T.Mesh(geo,mat(color));o.name=name;parent.add(o);return o};
 const box=(name,w,h,d,color,x,y,z,r=.03,parent=scene)=>{const o=add(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),color,name,parent);o.position.set(x,y,z);return o};
 const cylinder=(name,r1,r2,h,color,x,y,z,parent=scene)=>{const o=add(new T.CylinderGeometry(r1,r2,h,20),color,name,parent);o.position.set(x,y,z);return o};
 // Warm, quiet classroom shell: no labels or secondary story props.
 box('classroom.floor',14,.12,14,'#f0dec4',0,-.07,0,.035);
 for(let x=-5;x<=5;x+=.62)box('classroom.floor-seam',.012,.006,14,'#e3cbb0',x,-.005,0,.002);
 box('classroom.back-wall',14,4,.10,'#f2eada',0,1.95,-2.20,.025);
 box('classroom.wainscot',14,.86,.12,'#bdcec1',0,.43,-2.125,.018);
 box('classroom.rail',14,.065,.17,'#e2d9bb',0,.89,-2.09,.02);
 box('classroom.skirting',14,.075,.17,'#a8bda9',0,.035,-2.075,.012);
 // Quiet inset window repeated across all four pages.
 box('window.frame',1.65,1.23,.09,'#fbf0d7',1.55,1.76,-2.09,.045);
 box('window.sky',1.44,1.02,.025,'#bad7de',1.55,1.76,-2.03,.01);
 box('window.vertical',.065,1.08,.05,'#fff6df',1.55,1.76,-2.0,.012);
 box('window.horizontal',1.50,.065,.05,'#fff6df',1.55,1.76,-2.0,.012);
 box('window.sill',1.82,.09,.21,'#f8e9c9',1.55,1.12,-2.0,.03);
 // The classroom desk and chair reuse the production classroom dimensions,
 // palette and rounded construction at a consistent 0.76 scale.
 const desk=new T.Group();desk.name='storybook.classroom-desk';scene.add(desk);desk.position.set(-.27,0,-.38);desk.scale.setScalar(.76);
 box('desk.top',1.52,.16,1.04,'#f2c588',0,1.14,0,.095,desk);
 box('desk.apron',1.3,.14,.78,'#d8a36f',0,.98,0,.035,desk);
 for(const x of[-.59,.59])for(const z of[-.36,.36])box('desk.leg',.10,1.03,.10,'#729a91',x,.53,z,.025,desk);
 const chair=new T.Group();chair.name='storybook.classroom-chair';scene.add(chair);chair.position.set(1.17,0,.17);chair.scale.setScalar(.76);chair.rotation.y=-.14;
 box('chair.seat',1.2,.12,.73,'#8fbaaf',0,.57,0,.075,chair);
 for(const x of[-.49,.49])for(const z of[-.24,.24])box('chair.leg',.085,.52,.085,'#729a91',x,.27,z,.02,chair);
 box('chair.back',1.2,.52,.12,'#9cc9bb',0,1.03,-.33,.07,chair);
 for(const x of[-.49,.49])box('chair.back-support',.075,.65,.075,'#729a91',x,.84,-.30,.015,chair);
 // One large, unmistakably blue hexagonal pencil, axis local X.
 const pencil=new T.Group();pencil.name='storybook.blue-pencil';scene.add(pencil);
 let shaft=add(new T.CylinderGeometry(.030,.030,.55,6),'#367bd2','pencil.blue-shaft',pencil);shaft.rotation.z=-Math.PI/2;
 let wood=add(new T.CylinderGeometry(.030,.004,.115,16),'#e8bd83','pencil.wood-tip',pencil);wood.rotation.z=-Math.PI/2;wood.position.x=-.331;
 let lead=add(new T.ConeGeometry(.009,.033,12),'#244e90','pencil.blue-point',pencil);lead.rotation.z=Math.PI/2;lead.position.x=-.401;
 let ferrule=cylinder('pencil.ferrule',.0305,.0305,.048,'#ddcda8',.301,0,0,pencil);ferrule.rotation.z=-Math.PI/2;
 let eraser=cylinder('pencil.eraser',.030,.030,.062,'#de948b',.356,0,0,pencil);eraser.rotation.z=-Math.PI/2;
 if(c.page===1){pencil.position.set(-.24,.961,-.34);pencil.rotation.y=-.30}
 if(c.page===2||c.page===3){pencil.position.set(1.13,.031,.20);pencil.rotation.y=.10}
 if(c.page===4){
  box('paper.white-sheet',1.04,.016,.68,'#fffaf0',-.27,.938,-.38,.011);
  // Raised hairline stroke reads as a drawn blue star, not a separate toy.
  const points=[];for(let i=0;i<=10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.075:.160;points.push(new T.Vector3(-.49+Math.cos(a)*r,.949,-.42-Math.sin(a)*r))}
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],d=b.clone().sub(a);const o=add(new T.CylinderGeometry(.007,.007,d.length(),8),'#367bd2','drawing.blue-star');o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize())}
  pencil.position.set(-.075,.977,-.34);pencil.rotation.y=.65;
 }
 const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene;
 const poser=createDormiPoser(model);poser.setPose(c.pose,c.amount,0);
 const player=new T.Group();player.name='Dormi.original-source-player';player.add(model);scene.add(player);player.position.fromArray(c.player);player.rotation.set(c.pitch,c.yaw,0,'YXZ');
 // Exact floor contact after the gentle whole-character lean.
 scene.updateMatrixWorld(true);let footY=Infinity;const groundPoint=new T.Vector3();player.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){groundPoint.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);footY=Math.min(footY,groundPoint.y)}});player.position.y-=footY;scene.updateMatrixWorld(true);
 const baked=new T.Scene();scene.traverseVisible(o=>{if(!o.isMesh)return;const g=o.geometry.clone();const m=new T.Mesh(g,o.material);m.name=o.name;m.matrix.copy(o.matrixWorld);m.matrix.decompose(m.position,m.quaternion,m.scale);baked.add(m)});baked.updateMatrixWorld(true);
 const glb=await new GLTFExporter().parseAsync(baked,{binary:true});fs.writeFileSync(path.join(root,`book-page-${c.page}.glb`),Buffer.from(glb));
 c.playerBounds=new T.Box3().setFromObject(player);c.poseState=poser.getState();console.log(`book-page-${c.page}.glb ${glb.byteLength} bytes`);poser.dispose();
}
fs.writeFileSync(path.join(root,'cases.json'),JSON.stringify(cases,null,2));
fs.writeFileSync(path.join(root,'source-provenance.json'),JSON.stringify({asset:'Dormi English picturebook illustrations',originalModel:{path:original,sha256:modelHash,bytes:bytes.length,unchanged:true},sourceModules:['dist/dormi-poses.js','dist/world/toy-kit.js'],furniture:'Scaled classroom desk and chair geometry and palette from dist/world/builders.js',illustration:'Original scene composition with existing project assets; no image generation, no substitute character, no new NPC, no embedded text.',renderer:'Three.js 0.180.0 GLTF export, Blender Cycles orthographic render',pages:cases.map(c=>({page:c.page,line:c.line}))},null,2));
