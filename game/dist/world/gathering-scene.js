import * as THREE from 'three';
import {GATHERING_TARGETS,BEACH_POLYGON} from './gathering-layout.js';
import {gatheringReady} from '../state/gathering.js';
import {createAutumnLeafGeometry,createAutumnLeafMaterial} from './autumn-leaf-geometry.js';
import {tagAutumnVisibility} from './seasonal-appearance.js';
import {PARK_TREES} from './park-layout.js';
// One closed solid is shared by beach shells and the small held/craft props.
// Six true radial ribs and a domed crown stay readable without vertex paint.
export function createShellGeometry({painted=false}={}){
 const positions=[],indices=[],colors=[],radial=6,arcs=24;
 const vertex=(x,y,z,shade=1)=>{const id=positions.length/3;positions.push(x,y,z);if(painted)colors.push(shade,shade,shade);return id;};
 const hinge=vertex(0,.018,-.13,.94),ring=(r,i)=>1+(r-1)*(arcs+1)+i;
 for(let r=1;r<=radial;r++)for(let i=0;i<=arcs;i++){
  const q=r/radial,u=i/arcs,a=-Math.PI*.43+u*Math.PI*.86,rib=(1+Math.cos(u*Math.PI*12))*.5;
  const edge=1+.04*Math.cos(u*Math.PI*12),dome=Math.pow(Math.sin(q*Math.PI),.85);
  const rise=dome*(.078*(.35+.65*Math.pow(Math.sin(u*Math.PI),.65))+.024*rib);
  vertex(Math.sin(a)*q*.23*edge,.018+rise,Math.cos(a)*q*.28*edge-.13,.85+.15*rib);
 }
 for(let i=0;i<arcs;i++)indices.push(hinge,ring(1,i),ring(1,i+1));
 for(let r=1;r<radial;r++)for(let i=0;i<arcs;i++){const a=ring(r,i),b=ring(r+1,i);indices.push(a,b,a+1,a+1,b,b+1);}
 // Trace the whole fan boundary, not just the scalloped front edge. The rim
 // and gently convex underside close both shoulders and the pointed hinge.
 const rim=[hinge];for(let r=1;r<radial;r++)rim.push(ring(r,0));for(let i=0;i<=arcs;i++)rim.push(ring(radial,i));for(let r=radial-1;r>0;r--)rim.push(ring(r,arcs));
 const bottom=rim.map(id=>vertex(positions[id*3],-.025,positions[id*3+2],.72));
 const base=vertex(0,-.064,.015,.70);
 for(let i=0;i<rim.length;i++){const j=(i+1)%rim.length;indices.push(rim[j],rim[i],bottom[i],rim[j],bottom[i],bottom[j],base,bottom[j],bottom[i]);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);if(painted)geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}

export function buildGathering(roomId,parent,progress){
 const targets=GATHERING_TARGETS.filter(t=>t.roomId===roomId);if(!targets.length)return null;
 const root=new THREE.Group();root.name='gathering.'+roomId;parent.add(root);const materials=new Map(),mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
 const appleGeo=roomId==='park'?new THREE.SphereGeometry(.16,12,8):null,shellGeo=roomId==='courtyard'?createShellGeometry({painted:true}):null,leafGeo=new THREE.SphereGeometry(1,8,6),stemGeo=roomId==='park'?new THREE.CylinderGeometry(.02,.025,.14,6):null,ringGeo=new THREE.RingGeometry(.39,.43,24),nodes=[];
 const mesh=(geo,color,position,group=root)=>{const m=new THREE.Mesh(geo,mat(color));m.position.fromArray(position);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 if(roomId==='courtyard'){const shape=new THREE.Shape();BEACH_POLYGON.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const sand=mesh(new THREE.ShapeGeometry(shape),'#ead7ae',[0,.05,0]);sand.rotation.x=-Math.PI/2;sand.name='courtyard.shell-beach';sand.castShadow=false;}
 const instances=[];let pendingGeometry=null,pendingMaterial=null;
 try{for(const [i,t]of targets.entries()){
  if(t.material==='autumnLeaf'){
   const group=tagAutumnVisibility(new THREE.Group());group.name=t.id+'.autumn';root.add(group);const geometry=pendingGeometry=createAutumnLeafGeometry(),material=pendingMaterial=createAutumnLeafMaterial(),decor=new THREE.InstancedMesh(geometry,material,8);decor.name=t.id+'.fallen';instances.push(decor);group.add(decor);pendingGeometry=pendingMaterial=null;const crop=new THREE.InstancedMesh(geometry,material,3);crop.name=t.id+'.crop';instances.push(crop);group.add(crop);crop.userData.harvestNodeId=t.id;const dummy=new THREE.Object3D(),tint=new THREE.Color();
   const spots=[[-.40,-.20,.2,.82],[.22,-.28,-.9,.92],[-.14,.12,1.1,.83],[.32,.23,-1.7,.76],[-.27,-.19,2.4,.78],[.09,.33,.6,.82],[.39,-.04,2.9,.69],[-.08,-.36,-.35,.75]];
   for(const[pool,arr]of[[decor,spots],[crop,[[-.16,-.04,Math.PI/2,1],[-.08,-.01,-.65,.92],[.12,-.07,.65,.86]]]]){for(let j=0;j<arr.length;j++){const[x,z,yaw,scale]=arr[j];dummy.position.set(t.contact[0]+x,.024,t.contact[2]+z);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(scale);dummy.updateMatrix();pool.setMatrixAt(j,dummy.matrix);pool.setColorAt(j,tint.set(j%3===0?'#f2d0a4':j%3===1?'#d79475':'#efd49b'));}pool.instanceMatrix.needsUpdate=true;pool.instanceColor.needsUpdate=true;pool.castShadow=true;pool.receiveShadow=true;}
   const marker=mesh(ringGeo,'#fff1c7',[t.at.x,.068,t.at.z],group);marker.rotation.x=-Math.PI/2;marker.castShadow=false;marker.name=t.id+'.approach';nodes.push({id:t.id,crop,marker});continue;
  }
  const crop=new THREE.Group();crop.name=t.id+'.crop';crop.userData.harvestNodeId=t.id;root.add(crop);
  if(t.kind==='pickFruit'){
   for(const offset of [0,.28]){const apple=mesh(appleGeo,offset?'#dfa06c':'#ce7866',[t.contact[0]+(t.anchor.yaw?0:offset),t.contact[1]+offset*.45,t.contact[2]+(t.anchor.yaw?offset:0)],crop);apple.scale.set(1,.94,1);mesh(stemGeo,'#947050',[apple.position.x,apple.position.y+.16,apple.position.z],crop);const leaf=mesh(leafGeo,'#6f966b',[apple.position.x+.06,apple.position.y+.20,apple.position.z],crop);leaf.scale.set(.1,.025,.047);leaf.rotation.z=.3;}
   const tree=PARK_TREES.find(n=>n.id===t.id),a=new THREE.Vector3(tree.x,1.43,tree.z),b=new THREE.Vector3(t.contact[0],t.contact[1]+.22,t.contact[2]),branch=mesh(new THREE.CylinderGeometry(.025,.045,a.distanceTo(b),7),'#ae8560',a.clone().add(b).multiplyScalar(.5).toArray());branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
  }else{const shell=mesh(shellGeo,['#e56f98','#a08be0','#ed955e'][i],t.contact,crop);shell.scale.set(1.95,1.05,1.95);shell.material.vertexColors=true;shell.name=t.id+'.shell';shell.position.y-=.09;const pearl=mesh(leafGeo,'#fff1d2',[t.contact[0],t.contact[1]+.028,t.contact[2]-.10],crop);pearl.scale.set(.075,.042,.082);}
  const marker=mesh(ringGeo,'#fff1c7',[t.at.x,.068,t.at.z]);marker.rotation.x=-Math.PI/2;marker.castShadow=false;marker.name=t.id+'.approach';
  const sprout=mesh(leafGeo,t.kind==='pickFruit'?'#acc28d':'#d8c49e',[t.contact[0],t.kind==='pickFruit'?t.contact[1]:.08,t.contact[2]]);sprout.scale.set(t.kind==='pickFruit'?.075:.14,.04,.09);sprout.name=t.id+'.resting';nodes.push({id:t.id,crop,marker,sprout});
 }
 function update(p){for(const n of nodes){const ready=gatheringReady(p.gathering.nodes[n.id]);n.crop.visible=n.marker.visible=ready;if(n.sprout)n.sprout.visible=!ready;}}
 let disposed=false;update(progress);return {root,update,dispose(){if(disposed)return;disposed=true;for(const mesh of instances)mesh.dispose();}};}catch(error){for(const mesh of instances)mesh.dispose();pendingGeometry?.dispose();pendingMaterial?.dispose();throw error;}
}
