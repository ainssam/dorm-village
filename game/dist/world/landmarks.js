import * as THREE from 'three';
import {createToyKit} from './toy-kit.js';
import {villageBuildingConfigs} from './village-layout.js';
const FACADES={school:'clock-school',home:'chimney-cottage',bakeryCafe:'gambrel-bakery',postOffice:'hipped-post-office',workshop:'sawtooth-workshop',photoStudio:'clerestory-studio'};

// Both the walking world and atlas use these actual facade meshes and transforms.
function buildLocalBuilding(kit,{id,x,z,width,depth,height=2.45,wall,roof,door,title}){
 const {box,sphere,cylinder,mat,label,feature,root}=kit,prefix=`village.${id}`,front=z+depth/2,back=z-depth/2,shop=['workshop','bakeryCafe','postOffice','photoStudio'].includes(id),profile=FACADES[id];
 const named=(mesh,part,kind=part,extra={})=>feature(mesh,`${prefix}.${part}`,kind,{buildingId:id,...extra});
 // Tiny trim and glazing use 12-triangle solids; rounded clay remains on the
 // large touchable masses, frames and doors. Detail stays inexpensive on phones.
 const flat=(w,h,d,color,x=0,y=0,z=0,parent=root)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const prism=(points,depth,color,x,y,z,parent=root)=>{const s=new THREE.Shape();points.forEach(([px,py],i)=>i?s.lineTo(px,py):s.moveTo(px,py));s.closePath();const geometry=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1});geometry.translate(0,0,-depth/2);const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const body=named(box(width,height,depth,wall,x,height/2+.08,z,.09),'body','building-body',{footprint:{x,z,hx:width/2,hz:depth/2}});
 const rw=width+.4,rd=depth+.45,base=height+.1,roofGroup=named(new THREE.Group(),'roof','building-roof',{profile,depth:rd});root.add(roofGroup);
 function gable(rise){const m=prism([[-rw/2,0],[0,rise],[rw/2,0]],rd,roof,x,base,z,roofGroup);named(m,'gable','gabled-roof',{depth:rd,rise});const angle=Math.atan2(rise,rw/2),slope=Math.hypot(rw/2,rise);for(const sign of [-1,1]){const p=flat(slope+.04,.10,rd+.06,roof,x+sign*rw/4,base+rise/2+.035,z,roofGroup);p.rotation.z=-sign*angle;named(p,`roof-slope.${sign}`,'roof-slope');}named(flat(.14,.12,rd+.1,roof,x,base+rise+.035,z,roofGroup),'ridge','roof-ridge');}
 if(id==='school'||id==='home')gable(id==='home'?1.18:.99);
 if(id==='bakeryCafe'){
  named(prism([[-rw/2,0],[-rw*.36,.76],[-rw*.18,1.16],[rw*.18,1.16],[rw*.36,.76],[rw/2,0]],rd,roof,x,base,z,roofGroup),'gambrel','gambrel-roof',{futureUpperStorey:true});
  for(const side of [-1,1])flat(.07,.08,rd+.06,'#be8e57',x+side*rw*.36,base+.76,z,roofGroup);
  flat(rw*.36+.08,.08,rd+.05,roof,x,base+1.18,z,roofGroup);
 }
 if(id==='postOffice'){
  const a=[-rw/2,0,-rd/2],b=[rw/2,0,-rd/2],c=[rw/2,0,rd/2],d=[-rw/2,0,rd/2],e=[0,.85,-rd*.24],f=[0,.85,rd*.24],faces=[[a,b,e],[b,c,f],[b,f,e],[c,d,f],[d,a,e],[d,e,f],[a,d,c],[a,c,b]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(faces.map(face=>[...face].reverse()).flat(2),3));g.computeVertexNormals();const hip=new THREE.Mesh(g,mat(roof));hip.position.set(x,base,z);hip.castShadow=hip.receiveShadow=true;roofGroup.add(hip);named(hip,'hip','hipped-roof');flat(rw,.10,rd,roof,x,base,z,roofGroup);
 }
 if(id==='workshop'){
  named(prism([[-rw/2,0],[-rw/2,.14],[-.13,1.02],[0,.20],[rw/2,1.02],[rw/2,0]],rd,roof,x,base,z,roofGroup),'sawtooth','sawtooth-roof');
  // Two pale vertical clerestory faces make the craft loft sawteeth legible.
  for(const [cx,cy,w]of [[-.065,.62,.14],[rw/2+.008,.54,.04]])flat(w,.58,rd*.76,'#cfddde',x+cx,base+cy,z,roofGroup);
 }
 if(id==='photoStudio'){
  named(prism([[-rw/2,0],[-rw/2,.28],[rw/2,.66],[rw/2,0]],rd,roof,x,base,z,roofGroup),'studio-shed','shed-roof');
  const clerestory=named(new THREE.Group(),'clerestory','clerestory');roofGroup.add(clerestory);
  flat(width*.65,.34,depth*.42,'#eff0dc',x+.20,base+.70,z-.40,clerestory);
  const glazing=flat(width*.58,.20,.035,'#a9c9c6',x+.20,base+.70,z-.40+depth*.21+.022,clerestory);glazing.userData.nightWindow=true;
  flat(width*.72,.09,depth*.48,roof,x+.20,base+.91,z-.40,clerestory);
 }
 flat(width+.09,.20,depth+.09,'#eee0c4',x,.14,z);
 const doorWidth=id==='workshop'?1.84:id==='photoStudio'?1.38:id==='postOffice'?1.22:shop?1.58:1.04;
 function arch(w,h,d,color,cx,cy,cz){const radius=w/2,s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2-radius);s.absarc(0,h/2-radius,radius,0,Math.PI,false);s.lineTo(-w/2,-h/2);const geometry=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,steps:1,curveSegments:8});geometry.translate(0,0,-d/2);const m=new THREE.Mesh(geometry,mat(color));m.position.set(cx,cy,cz);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 const arched=id==='home'||id==='postOffice';
 named(arched?arch(doorWidth+.22,1.83,.13,'#fff3dc',x,1,front+.035):box(doorWidth+.22,1.79,.13,'#fff3dc',x,.98,front+.035,.075),'door-frame','door-frame');
 named(arched?arch(doorWidth,1.63,.08,door,x,.90,front+.12):box(doorWidth,1.58,.08,door,x,.90,front+.12,.055),'door','door',{frontZ:front});
 const doorPane=flat(doorWidth*.59,id==='photoStudio'?.91:.54,.035,'#c2ded9',x,id==='photoStudio'?1.07:1.19,front+.175);doorPane.userData.nightWindow=true;
 if(id!=='photoStudio')flat(.045,.54,.04,'#fff0d3',x,1.19,front+.20);
 sphere(.065,'#ebc275',x+doorWidth*.33,.78,front+.205);
 named(box(shop?2.02:1.72,.12,.76,'#e9ddc2',x,.075,front+.31,.05),'step','entrance-step');
 // Each entrance keeps the same unobstructed centered lane, with a different canopy.
 if(id==='home'){
  const porch=named(new THREE.Group(),'cottage-porch','cottage-porch');root.add(porch);prism([[-.84,0],[0,.32],[.84,0]],.62,roof,x,1.94,front+.21,porch);
 }else if(id==='bakeryCafe'){
  const canopy=named(new THREE.Group(),'striped-awning','striped-awning');root.add(canopy);
  for(let i=0;i<7;i++){const c=i%2?'#fff1d3':'#d39a73',strip=flat(.44,.085,.68,c,x+(i-3)*.44,2.02,front+.29,canopy);strip.rotation.x=.12;flat(.44,.16,.075,c,x+(i-3)*.44,1.91,front+.61,canopy);}
 }else if(id==='postOffice'){
  const canopy=named(box(1.76,.13,.57,roof,x,1.97,front+.20,.055),'postal-canopy','postal-canopy');canopy.rotation.x=.10;
 }else if(id==='photoStudio')named(flat(width-.26,.12,.52,'#eef0dc',x,2.12,front+.17),'studio-canopy','studio-canopy');
 else {const awning=flat(id==='workshop'?2.20:1.68,.11,.52,roof,x,1.95,front+.2);awning.rotation.x=.1;}
 named(box(Math.min(width-.4,2.6),.34,.1,'#fff3d6',x,2.30,front+.08,.05),'sign','building-sign');label(title,x,2.30,front+.138,Math.min(width-.55,2.4));
 const window=(wx,wz,{side=false,rear=false,y=1.31,w=.78,h=.98,part}={})=>{
  const g=new THREE.Group();g.position.set(wx,y,wz);g.rotation.y=side?Math.PI/2:rear?Math.PI:0;root.add(g);
  flat(w,h,.10,'#fff1d6',0,0,0,g);const pane=flat(w-.16,h-.18,.032,'#a8cdd4',0,0,.071,g);pane.userData.nightWindow=true;
  flat(.045,h-.15,.035,'#fff3dc',0,0,.097,g);flat(w-.14,.045,.035,'#fff3dc',0,0,.10,g);if(y<2)flat(w+.09,.075,.20,'#efe1c2',0,-h/2-.025,.055,g);
  named(g,part??`window.${side?'side':rear?'rear':wx<x?'left':'right'}.${y}`,'window');return g;
 };
 if(id==='photoStudio')for(const sign of [-1,1])window(x+sign*1.30,front+.085,{w:.92,h:1.30,y:1.23,part:sign<0?'studio-glazing':'studio-glazing.right'});
 else if(id==='postOffice')for(const sign of [-1,1])window(x+sign*1.17,front+.085,{w:.55,h:.96});
 else if(id==='bakeryCafe')for(const sign of [-1,1])window(x+sign*1.40,front+.085,{w:.82,h:1.14,y:1.22,part:sign<0?'bread-display':'bread-display.right'});
 else if(width>=3.5)for(const sign of [-1,1])window(x+sign*(width/2-.57),front+.09);
 if(id==='workshop')window(x+width/2+.055,z,{side:true,w:2.16,h:1.06,part:'workshop-window'});
 else for(const offset of [-.66,.66])window(x+width/2+.055,z+offset,{side:true,w:id==='photoStudio'?.95:.78,h:id==='photoStudio'?1.26:.98});
 window(x,back-.065,{rear:true});
 if(id==='home'){
  box(.47,.9,.49,'#c58a71',x+.82,base+.66,z-.49,.045);flat(.58,.14,.59,'#efc3a1',x+.82,base+1.16,z-.49);
  const frame=named(cylinder(.25,.25,.06,'#fff1d6',x,base+.43,front+.27),'attic-window','attic-window');frame.rotation.x=Math.PI/2;const pane=cylinder(.17,.17,.07,'#a8cdd4',x,base+.43,front+.315);pane.rotation.x=Math.PI/2;pane.userData.nightWindow=true;
 }
 if(id==='school'){
  for(const y of [2.85,4.39]){for(const sign of [-1,1])window(x+sign*(width/2-.57),front+.09,{y});window(x+width/2+.055,z,{side:true,y});window(x,back-.065,{rear:true,y});}
  for(const y of [2.15,3.69])flat(width+.045,.11,depth+.045,'#b8d0bc',x,y,z);
  const clock=named(cylinder(.31,.31,.1,'#fff3d6',x,base+.40,front+.24),'clock','clock');clock.rotation.x=Math.PI/2;flat(.035,.21,.035,'#5d7769',x,base+.45,front+.303);flat(.16,.035,.035,'#5d7769',x+.065,base+.4,front+.303);
 }
 if(id==='workshop'){
  flat(.055,1.51,.04,'#e7dcd0',x,.90,front+.20);for(const sign of [-1,1]){const brace=named(flat(.045,.86,.035,'#e7dcd0',x+sign*.44,.61,front+.203),sign<0?'workshop-door-brace':'workshop-door-brace.right','door-brace');brace.rotation.z=sign*.64;}
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sphere(.14,'#e8bbba',x+Math.sin(a)*.20,base+.38+Math.cos(a)*.20,front+.25,1,1,.4);}sphere(.11,'#e8cb78',x,base+.38,front+.31,1,1,.5);
 }
 if(id==='bakeryCafe'){
  for(const dx of [-.2,.2])sphere(.25,'#eac487',x+dx,base+.40,front+.24,1,.55,.4);box(.42,.7,.45,'#c99372',x+.9,base+.75,z-.55,.05);
  for(const sign of [-1,1])for(let i=0;i<2;i++)sphere(.15,'#dab072',x+sign*1.4+(i-.5)*.25,.86,front+.19,1,.63,.30);
 }
 if(id==='postOffice'){
  named(box(.66,.42,.065,'#f8edd3',x,base+.35,front+.11,.035),'envelope','envelope');for(const sign of [-1,1]){const line=flat(.35,.03,.028,'#b98275',x+sign*.14,base+.35,front+.16);line.rotation.z=sign*.52;}
  named(flat(.36,.065,.035,'#485e57',x,.77,front+.19),'letter-slot','letter-slot');
  named(box(.56,.65,.50,'#b98275',x-width/2-.25,.55,front-.35,.10),'mailbox','mailbox');flat(.39,.07,.035,'#485e57',x-width/2-.25,.72,front-.08);
 }
 if(id==='photoStudio'){
  named(box(.73,.44,.09,'#eef1d9',x,base+.22,front+.285,.04),'camera-sign','camera-sign');flat(.22,.07,.08,'#eef1d9',x-.17,base+.48,front+.285);const lens=cylinder(.18,.18,.10,'#58787d',x,base+.22,front+.38);lens.rotation.x=Math.PI/2;sphere(.12,'#adced0',x,base+.22,front+.45,1,1,.25);
 }
 return body;
}

export const VILLAGE_BUILDINGS=Object.freeze(villageBuildingConfigs);
export function buildVillageBuilding(kit,config){const group=new THREE.Group();group.name='village.'+config.id;group.userData.facade=FACADES[config.id];group.position.set(config.x,0,config.z);group.rotation.y=config.yaw??0;kit.root.add(group);const local=createToyKit(group);local.label=(text,x,y,z,width,ink,bg,parent=group)=>kit.label?.(text,x,y,z,width,ink,bg,parent);buildLocalBuilding(local,{...config,x:0,z:0});return group;}
