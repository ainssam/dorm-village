import {posePhotoCompanion,canSeatPhotoCompanion,isExpandedPhotoCompanion} from './photo-cast.js';
import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {PHOTO_BACKGROUNDS,PHOTO_POSES,PHOTO_COMPANIONS,photoCast} from './photo-config.js';
export const PHOTO_RIG=Object.freeze({origin:[0,.03,-1.35],floorY:.091,roomFloorY:.0025,seatTopY:.50,lens:[1.65,1.75,4.15],aim:[0,1.15,0],captureAspect:4/3,span:3.05});
const role=(root,name)=>{let found;root.traverse(o=>{if(o.userData.role===name)found=o;});return found;};
export function buildPhotoRig(parent){
 const root=new THREE.Group();root.name='photoStudio.rig';root.position.fromArray(PHOTO_RIG.origin);parent.add(root);const {box,sphere,cylinder}=createToyKit(root),backdrops={};
 const stage=cylinder(2.75,2.79,.10,'#e6d3b3',0,.025,-.25);stage.scale.z=.65;
 const shadows=new THREE.Group();shadows.name='photoStudio.contact-shadows';root.add(shadows);for(const x of [-.6,.6]){const m=new THREE.Mesh(new THREE.CircleGeometry(.48,28),new THREE.MeshBasicMaterial({color:'#657763',opacity:.18,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.scale.y=.7;m.position.set(x,PHOTO_RIG.floorY+.003,0);shadows.add(m);}
 for(const [id,bg] of Object.entries(PHOTO_BACKGROUNDS)){
  const set=new THREE.Group();set.name='photoStudio.set.'+id;root.add(set);backdrops[id]=set;const k=createToyKit(set),{box:b,sphere:s,cylinder:c}=k;
  b(5.45,3.25,.11,bg.color,0,1.68,-1.76,.05);const floor=b(5.35,.04,2.7,bg.floor,0,.071,-.47,.05);floor.name='photoStudio.floor.'+id;
  // Shallow, alternating folds are real cloth geometry in the room and the photograph.
  for(let i=0;i<19;i++)s(.16,i%2?bg.color:(id==='night'?'#8092b0':id==='sunset'?'#edc9b7':'#c5dac8'),-2.63+i*.292,1.68,-1.64,.62,9.85,.28);
  for(const x of [-2.79,2.79]){c(.035,.05,3.3,'#b49872',x,1.7,-1.78);s(.085,'#e7c993',x,3.36,-1.78);}b(5.64,.075,.09,'#b49872',0,3.25,-1.77,.025);
  if(id==='mint'){
   for(const [x,z,h] of [[-2.13,-.60,.42],[2.12,-.9,.62],[-1.92,-1.17,.65],[2.35,-.24,.32]]){c(.22,.17,h,'#cd9f7b',x,PHOTO_RIG.floorY+h/2,z);for(let j=0;j<5;j++){const a=j*2.4;s(.22,j%2?'#7f9d6f':'#a1ba83',x+Math.cos(a)*.16,h+.19+j*.085,z+Math.sin(a)*.13,.75,1.2,.7);}for(let j=0;j<3;j++)s(.074,j%2?'#f5e4af':'#e9b8ba',x+(j-1)*.13,h+.56,z,.95,.75,.6);}
   const arc=new THREE.Mesh(new THREE.TorusGeometry(2.3,.026,6,36,Math.PI),k.mat('#82986c'));arc.position.set(0,.80,-1.48);set.add(arc);for(let i=0;i<9;i++){const a=.25+i*.33;s(.13,'#adc294',Math.cos(a)*2.3,.80+Math.sin(a)*2.3,-1.46,1.25,.7,.65);}
  }else if(id==='sunset'){
   b(3.5,.02,1.15,'#e6b5a5',0,.099,.50,.03).name='photoStudio.sunset-rug';for(let i=0;i<8;i++)b(.025,.023,1.10,'#f4dfc1',-1.6+i*.46,.10,.50,.003).name='photoStudio.sunset-rug-weave';
   for(const x of [-2.0,2.12]){c(.27,.23,.37,'#ba9476',x,.285,-.45);for(let j=0;j<5;j++){c(.014,.014,.58,'#80936c',x+(j-2)*.075,.75,-.45);s(.09,j%2?'#e5a3a2':'#f3d3a3',x+(j-2)*.075,1.04+Math.sin(j)*.1,-.45);}}
   for(const [x,col] of [[-1.95,'#f2d59d'],[1.9,'#e5b6aa']]){const cushion=b(.59,.27,.5,col,x,.22,.38,.12);cushion.rotation.z=x<0?.13:-.12;}
  }else{
   for(let i=0;i<9;i++){const x=-2.4+i*.6,y=2.66-.26*Math.sin(i/8*Math.PI);c(.012,.012,3.13-y,'#d1c39f',x,(3.13+y)/2,-1.47);const star=new THREE.Mesh(new THREE.OctahedronGeometry(i%2?.085:.13),k.mat('#f5d995'));star.scale.z=.28;star.rotation.z=.3;star.position.set(x,y,-1.42);set.add(star);}
   for(const x of [-2.07,2.07]){c(.42,.39,.09,'#b39f83',x,.53,-.60);c(.055,.14,.49,'#ad9679',x,.28,-.60);c(.12,.13,.08,'#d6b174',x,.60,-.60);c(.024,.024,.30,'#c8ac72',x,.76,-.60);c(.26,.34,.29,'#ffe5ae',x,1.01,-.60);s(.15,'#f8e5b8',x,.89,-.60);}
   for(const x of [-1.9,1.95])b(.58,.21,.55,'#c2cad3',x,.20,.43,.1);
  }
 }
 const bench=new THREE.Group();bench.name='photoStudio.shared-bench';root.add(bench);box(2.68,.14,.83,'#b99570',0,.31,.05,.06,bench);box(2.59,.12,.77,'#efdab4',0,.44,.06,.06,bench);for(const x of [-1.13,1.13])for(const z of [-.23,.33])box(.12,.23,.12,'#a78966',x,.17,z,.025,bench);for(const x of [-1.23,1.23])box(.13,.47,.13,'#b99570',x,.48,-.28,.04,bench);box(2.55,.30,.11,'#d6b58c',0,.74,-.30,.055,bench);
 const standingApron=box(4.70,.07,1.06,'#e6d3b3',0,.056,1.42,.026);standingApron.name='photoStudio.standing-apron';standingApron.visible=false;
 const riser=box(4.85,1.03,1.12,'#b9b393',0,.606,-.83,.075);riser.name='photoStudio.group-riser';riser.visible=false;
 const camera=new THREE.OrthographicCamera(-PHOTO_RIG.span*PHOTO_RIG.captureAspect/2,PHOTO_RIG.span*PHOTO_RIG.captureAspect/2,PHOTO_RIG.span/2,-PHOTO_RIG.span/2,.03,30);camera.name='photoStudio.capture-camera';camera.position.fromArray(PHOTO_RIG.lens);camera.lookAt(new THREE.Vector3(...PHOTO_RIG.aim));root.add(camera);
 const lens=new THREE.Group();lens.name='photoStudio.physical-lens';lens.position.copy(camera.position);lens.quaternion.copy(camera.quaternion);root.add(lens);box(.67,.43,.39,'#648b87',0,0,.30,.065,lens);cylinder(.16,.16,.18,'#395c5d',0,0,.085,lens).rotation.x=Math.PI/2;sphere(.127,'#a7c6cf',0,0,0,1,1,.15,lens);box(.14,.085,.13,'#e2c690',-.19,.26,.30,.025,lens);
 const tripod=new THREE.Group();tripod.name='photoStudio.camera-tripod';root.add(tripod);const [cx,cy,cz]=PHOTO_RIG.lens;for(const [dx,dz]of[[-.34,.22],[.34,.22],[0,-.36]]){const from=new THREE.Vector3(cx,cy-.18,cz+.24),to=new THREE.Vector3(cx+dx,.10,cz+dz),v=from.clone().sub(to),leg=cylinder(.027,.035,v.length(),'#a2987e',...(from.clone().add(to).multiplyScalar(.5).toArray()));tripod.attach(leg);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}
 const stageLamps=[];for(const x of [-3.1,3.1]){stageLamps.push(cylinder(.05,.07,1.86,'#8b9c87',x,1.01,.15),cylinder(.34,.4,.035,'#a4b69d',x,.1,.15),sphere(.40,'#fff0cf',x,1.94,.15,1,.85,.23));}
 // Group layouts hide the raised sunset rug, so their support height uses the exposed floor.
 function setConfig({background='mint',pose='stand',companion='none',companions=[]}={}){const group=companions.length>=2,levelFloor=group||isExpandedPhotoCompanion(companion)||(companions.length===1&&isExpandedPhotoCompanion(companions[0]));for(const lamp of stageLamps)lamp.visible=!(group&&companions.some(isExpandedPhotoCompanion));standingApron.visible=pose==='sit'&&(companions.some(id=>!canSeatPhotoCompanion(id))||(companion!=='none'&&!canSeatPhotoCompanion(companion)));tripod.visible=true;riser.scale.set(1,1,1);standingApron.scale.x=1;standingApron.scale.z=!group&&levelFloor?1.35:1;standingApron.position.z=!group&&levelFloor?1.32:1.42;riser.position.set(0,.606,-.83);riser.visible=group;bench.scale.x=group?1.50:1;bench.position.z=group?.42:0;camera.position.fromArray(PHOTO_RIG.lens);root.updateWorldMatrix(true,false);camera.lookAt(root.localToWorld(new THREE.Vector3(...PHOTO_RIG.aim)));Object.assign(camera,{left:-PHOTO_RIG.span*PHOTO_RIG.captureAspect/2,right:PHOTO_RIG.span*PHOTO_RIG.captureAspect/2,top:PHOTO_RIG.span/2,bottom:-PHOTO_RIG.span/2});camera.updateProjectionMatrix();lens.position.copy(camera.position);lens.quaternion.copy(camera.quaternion);for(const set of Object.values(backdrops))for(const [i,child]of set.children.entries())if(i>=26)child.visible=(!group||child.position.y>2.5)&&!(levelFloor&&child.name.startsWith('photoStudio.sunset-rug'));root.userData.photoFloorY=background==='sunset'&&!levelFloor?.112:PHOTO_RIG.floorY;standingApron.scale.y=(root.userData.photoFloorY-PHOTO_RIG.roomFloorY)/.07;standingApron.position.y=(root.userData.photoFloorY+PHOTO_RIG.roomFloorY)/2;for(const shadow of shadows.children)shadow.position.y=root.userData.photoFloorY+.003;for(const [id,set]of Object.entries(backdrops))set.visible=id===background;bench.visible=pose==='sit';shadows.visible=pose==='stand';}
 setConfig();return {root,camera,lens,tripod,bench,riser,standingApron,backdrops,shadows,stageLamps,setConfig};
}
function visibleBounds(root,transform=null){
 // Refresh ancestors before attached skin inverses; measure the posed vertices,
 // never a bind-pose geometry box. This runs only when a photo choice changes.
 root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);const box=new THREE.Box3(),point=new THREE.Vector3();
 root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p&&p!==root.parent;p=p.parent)if(!p.visible)return;
  if(o.isSkinnedMesh||transform){for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);if(transform)point.applyMatrix4(transform);box.expandByPoint(point);}}
  else{o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}
 });return box;
}
function faceBounds(root,transform=null){
 const head=role(root,'Head')??root.getObjectByName('Cream_oval_face')??root.getObjectByName('MoaCreamFace')??role(root,'BodyRig');
 if(head&&!head.isBone){const box=visibleBounds(head,transform);if(!box.isEmpty())return box;}
 const box=new THREE.Box3(),point=new THREE.Vector3();root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);
 root.traverseVisible(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  const heads=new Set(mesh.skeleton.bones.map((bone,i)=>{for(let b=bone;b;b=b.parent)if(b.name==='Head')return i;return -1;}).filter(i=>i>=0));
  for(let i=0;i<p.count;i++){let influence=0;for(let j=0;j<4;j++)if(heads.has(indices.getComponent(i,j)))influence+=weights.getComponent(i,j);if(influence>.5){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);if(transform)point.applyMatrix4(transform);box.expandByPoint(point);}}
 });
 if(!box.isEmpty())return box;box.copy(visibleBounds(root,transform));const height=box.max.y-box.min.y;box.min.y=box.max.y-height*.43;return box;
}
function spreadExpandedRows(rig,actors,participants){
 // Full approved silhouettes (including held props) determine spacing. Poses,
 // scales and meshes never shrink to squeeze a new resident into the old slots.
 for(const row of ['front','back']){const entries=participants.map((p,i)=>({p,actor:actors[i]})).filter(e=>e.p.row===row);let width=0;
  for(const e of entries){const b=visibleBounds(e.actor);e.width=b.max.x-b.min.x;e.center=(b.max.x+b.min.x)/2;width+=e.width;}
  width+=Math.max(0,entries.length-1)*.18;let x=-width/2;
  for(const e of entries){const desired=x+e.width/2;e.actor.position.x+=desired-e.center;x+=e.width+.18;e.p.position=e.actor.position.toArray();}
  if(row==='back')rig.riser.scale.x=Math.max(1,(width+.3)/4.85);else rig.standingApron.scale.x=Math.max(1,(width+.3)/4.7);
 }
}
function torsoBounds(root){const torso=role(root,'Body')??root.getObjectByName('Dormi_body');return visibleBounds(torso??root);}
export function posePhotoParticipants({rig,dormi,poser,companion,companions,config}){
 const cast=photoCast(config);if(!cast)throw Error('Invalid photo cast');const members=companions??(companion?[companion]:[]);if(members.length!==cast.length)throw Error('Photo cast mismatch');if(cast.length>=2)return posePhotoGroup({rig,dormi,poser,members,cast,config});companion=members[0]??null;const companionSeated=config.pose==='sit'&&canSeatPhotoCompanion(cast[0]);
 if(!Object.hasOwn(PHOTO_BACKGROUNDS,config.background)||!Object.hasOwn(PHOTO_POSES,config.pose)||!Object.hasOwn(PHOTO_COMPANIONS,config.companion))throw Error('Invalid photo choices');
 rig.setConfig(config);poser.setPose(config.pose==='sit'?'photoSit':'photoStand',1,1.2);const yaw=Math.atan2(PHOTO_RIG.lens[0],PHOTO_RIG.lens[2]);
 dormi.position.set(0,0,0);dormi.rotation.set(0,yaw+(companion?.12:0),companion?-.025:.018,'YXZ');
 if(companion){companion.position.set(0,0,0);companion.rotation.set(0,yaw-.12,isExpandedPhotoCompanion(cast[0])?0:.025,'YXZ');posePhotoCompanion(companion,cast[0],{seated:companionSeated});}
 // Measure a temporary local hierarchy so room/world transforms never change spacing.
 const measureRoot=new THREE.Group();measureRoot.add(dormi);if(companion)measureRoot.add(companion);measureRoot.updateMatrixWorld(true);
 let gap=0;if(companion){const a=torsoBounds(dormi),b=torsoBounds(companion),wa=a.max.x-a.min.x,wb=b.max.x-b.min.x;gap=.12;const leftCenter=-(wa+wb+gap)/2+wa/2,rightCenter=(wa+wb+gap)/2-wb/2;dormi.position.x=leftCenter-(a.min.x+a.max.x)/2;companion.position.x=rightCenter-(b.min.x+b.max.x)/2;dormi.position.z=.06;companion.position.z=config.pose==='sit'&&!companionSeated?1.03:-.035;}
 const supportY=config.pose==='sit'?PHOTO_RIG.seatTopY:rig.root.userData.photoFloorY;let contactY;
 if(config.pose==='sit'){const seat=new THREE.Vector3(...poser.getState().anchors.seat).applyEuler(dormi.rotation);dormi.position.y=supportY-seat.y;contactY=dormi.position.y+seat.y;}else{dormi.position.y=supportY-visibleBounds(dormi).min.y;contactY=visibleBounds(dormi).min.y;}
 if(companion){const b=companionSeated?torsoBounds(companion):visibleBounds(companion);companion.position.y+=(companionSeated?supportY:rig.root.userData.photoFloorY)-b.min.y;}
 rig.root.add(dormi);if(companion)rig.root.add(companion);rig.root.updateWorldMatrix(true,true);
 const snapshot={config:{...config},gap,supportY,contactY,dormi:{position:dormi.position.toArray(),rotation:dormi.rotation.toArray()},companion:companion?{position:companion.position.toArray(),rotation:companion.rotation.toArray()}:null,camera:{position:rig.camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:rig.camera.getWorldQuaternion(new THREE.Quaternion()).toArray(),projection:rig.camera.projectionMatrix.toArray()},poseTime:1.2};return snapshot;
}
function corners(box){return [box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>new THREE.Vector3(x,y,z))));}
function projectedBounds(object,camera){const bounds=visibleBounds(object),p=corners(bounds).map(v=>v.project(camera));return {min:[Math.min(...p.map(v=>v.x)),Math.min(...p.map(v=>v.y))],max:[Math.max(...p.map(v=>v.x)),Math.max(...p.map(v=>v.y))]};}
function posePhotoGroup({rig,dormi,poser,members,cast,config}){
 if(!Object.hasOwn(PHOTO_BACKGROUNDS,config.background)||!Object.hasOwn(PHOTO_POSES,config.pose))throw Error('Invalid photo choices');
 rig.setConfig({...config,companions:cast});const total=members.length+1,expanded=cast.some(isExpandedPhotoCompanion),frontCount=total<=3?total:Math.floor(total/2),backCount=total-frontCount,frontSeated=config.pose==='sit',floor=rig.root.userData.photoFloorY,backSupport=expanded?.6:(frontSeated?1.35:1.12)+(cast.some(id=>!canSeatPhotoCompanion(id))?.18:0);
 rig.riser.visible=backCount>0;rig.riser.scale.y=(backSupport-floor)/1.03;rig.riser.position.y=(backSupport+floor)/2;rig.shadows.visible=false;
 const ordered=members.map((actor,i)=>({actor,id:cast[i],index:i}));
 if(expanded){for(const entry of ordered){entry.actor.position.set(0,0,0);entry.actor.rotation.set(0,0,0);posePhotoCompanion(entry.actor,entry.id,{seated:false,time:1.2});const box=visibleBounds(entry.actor);entry.height=box.max.y-box.min.y;}ordered.sort((a,b)=>a.height-b.height||a.index-b.index);}
 const actors=[dormi,...ordered.map(e=>e.actor)],ids=['dormi',...ordered.map(e=>e.id)],participants=[];
 // The same approved objects and the same studio rig, arranged with staggered faces.
 for(let i=0;i<actors.length;i++){const actor=actors[i],front=i<frontCount,index=front?i:i-frontCount,n=front?frontCount:backCount,seated=front&&frontSeated&&(i===0||canSeatPhotoCompanion(ids[i]));rig.root.add(actor);actor.position.set((index-(n-1)/2)*(front?1.28:1.22),0,front?(frontSeated&&!seated?1.44:.49):-.83);actor.rotation.set(0,0,0);if(i===0)poser.setPose(seated?'photoSit':'photoStand',1,1.2);else posePhotoCompanion(actor,ids[i],{seated,time:1.2});const supportY=seated?PHOTO_RIG.seatTopY:front?floor:backSupport;
  // Measure local posed geometry before introducing the enclosing room transform.
  const position=actor.position.clone(),temp=new THREE.Group();temp.add(actor);actor.position.set(0,0,0);temp.updateMatrixWorld(true);let contactLocal;if(seated&&i===0)contactLocal=poser.getState().anchors.seat[1];else if(seated&&ids[i]==='moa-playmate')contactLocal=actor.userData.seatContact??.145;else contactLocal=(seated?torsoBounds(actor):visibleBounds(actor)).min.y;actor.position.copy(position);actor.position.y=supportY-contactLocal;rig.root.add(actor);participants.push({id:ids[i],row:front?'front':'back',seated,supportY,contactY:actor.position.y+contactLocal,position:actor.position.toArray()});
 }
 if(expanded){const temp=new THREE.Group();for(const actor of actors)temp.add(actor);spreadExpandedRows(rig,actors,participants);for(const actor of actors)rig.root.add(actor);}
 // Gentle straight-on camera avoids perspective squeeze. Fit the visible posed models.
 rig.camera.position.set(0,2.2,6.15);rig.root.updateWorldMatrix(true,true);const aim=rig.root.localToWorld(new THREE.Vector3(0,1.55,-.12));rig.camera.lookAt(aim);rig.root.updateWorldMatrix(true,true);rig.camera.matrixWorldInverse.copy(rig.camera.matrixWorld).invert();
 if(expanded){
  // Raise the existing back-row support until its lowest face clears every
  // front-row silhouette, including hair and ears, in camera space. One rigid translation preserves soles.
  let frontTop=-Infinity,backBottom=Infinity;for(let i=0;i<actors.length;i++){if(participants[i].row==='front')frontTop=Math.max(frontTop,visibleBounds(actors[i],rig.camera.matrixWorldInverse).max.y);else backBottom=Math.min(backBottom,faceBounds(actors[i],rig.camera.matrixWorldInverse).min.y);}
  const worldUp=new THREE.Vector3(0,1,0).transformDirection(rig.camera.matrixWorldInverse),lift=Math.max(0,(frontTop+.12-backBottom)/worldUp.y);
  if(Number.isFinite(lift)&&lift>0){for(let i=0;i<actors.length;i++)if(participants[i].row==='back'){actors[i].position.y+=lift;participants[i].supportY+=lift;participants[i].contactY+=lift;participants[i].position=actors[i].position.toArray();}rig.riser.scale.y=(backSupport+lift-floor)/1.03;rig.riser.position.y=(backSupport+lift+floor)/2;rig.root.updateWorldMatrix(true,false);rig.root.updateMatrixWorld(true);}
 }
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const a of actors)for(const v of corners(visibleBounds(a))){v.applyMatrix4(rig.camera.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2,span=Math.max((maxY-minY)*1.15,(maxX-minX)*1.15/PHOTO_RIG.captureAspect,3.0);Object.assign(rig.camera,{left:cx-span*PHOTO_RIG.captureAspect/2,right:cx+span*PHOTO_RIG.captureAspect/2,bottom:cy-span/2,top:cy+span/2});rig.camera.updateProjectionMatrix();rig.lens.position.copy(rig.camera.position);rig.lens.quaternion.copy(rig.camera.quaternion);rig.tripod.visible=false;rig.root.updateWorldMatrix(true,true);
 for(let i=0;i<actors.length;i++){participants[i].projected=projectedBounds(actors[i],rig.camera);if(expanded){const face=faceBounds(actors[i],rig.camera.matrixWorldInverse),points=corners(face).map(v=>v.applyMatrix4(rig.camera.projectionMatrix));participants[i].face={min:[Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y))],max:[Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))]};continue;}const head=role(actors[i],'Head')??actors[i].getObjectByName('Cream_oval_face')??actors[i].getObjectByName('MoaCreamFace')??role(actors[i],'BodyRig')??actors[i];if(visibleBounds(head).isEmpty()){const bounds=visibleBounds(actors[i]),height=bounds.max.y-bounds.min.y;bounds.min.y=bounds.max.y-height*.43;const pp=corners(bounds).map(v=>v.project(rig.camera));participants[i].face={min:[Math.min(...pp.map(v=>v.x)),Math.min(...pp.map(v=>v.y))],max:[Math.max(...pp.map(v=>v.x)),Math.max(...pp.map(v=>v.y))]};}else participants[i].face=projectedBounds(head,rig.camera);}
 return {config:{...config,companions:[...cast]},participants,gap:.12,supportY:participants[0].supportY,contactY:participants[0].contactY,dormi:{position:dormi.position.toArray(),rotation:dormi.rotation.toArray()},companion:null,camera:{position:rig.camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:rig.camera.getWorldQuaternion(new THREE.Quaternion()).toArray(),projection:rig.camera.projectionMatrix.toArray()},poseTime:1.2};
}
