import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {setupCamera} from '../dist/camera.js';
import {overviewBounds} from '../dist/camera-fit.js';
import {fitAmusementCamera} from '../dist/amusement/camera.js';
import {vikingFrame} from '../dist/amusement/viking-ride.js';
import {VIKING} from '../dist/amusement/layout.js';
import {applyEnvironmentMood} from '../dist/world/sky-view.js';
import {SKY_MOODS} from '../dist/world/time-of-day.js';

function rig(width=390,height=844){
 const old={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const top=height<700?81:142,bottom=196;
 const rect=(t,b)=>({top:t,bottom:b,left:0,right:width,width,height:b-t});
 const el=(t,b)=>({getClientRects:()=>[1],getBoundingClientRect:()=>rect(t,b)});
 globalThis.document={createElement:()=>({getContext:()=>null}),querySelector:s=>s==='.topbar'?el(14,top):null};
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,height),querySelector:s=>s==='.bottom-controls'?el(height-bottom,height-61):null};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const camera=new T.OrthographicCamera(),view=buildRoom(ROOMS.amusementIsland,initialProgress());
 const cam=setupCamera(camera,canvas,stage,{setSize(){}});cam.apply(ROOMS.amusementIsland,ROOMS.amusementIsland.spawns.entry,view.root);
 return{camera,cam,view,restore(){cam.dispose();view.dispose();Object.assign(globalThis,old);}};
}

test('Viking rider looks forward over a real-model village panorama with safe swing framing',()=>{
 const r=rig(),owner={},player=new T.Group(),model=new T.Group(),pov=r.view.vikingPOV;player.add(model);
 try{
  const vista=r.view.root.getObjectByName('amusement.viking.village-vista'),landscape=r.view.root.getObjectByName('amusement.viking.village-landscape'),sea=r.view.root.getObjectByName('amusement.viking.village-vista.sea'),shore=r.view.root.getObjectByName('amusement.viking.village-shore'),island=r.view.root.getObjectByName('amusement.viking.village-island'),ride=r.view.root.getObjectByName('amusement.viking'),carousel=r.view.root.getObjectByName('amusement.carousel'),carts=r.view.root.getObjectByName('amusement.food-carts');
  assert(vista&&landscape&&sea&&shore&&island&&ride&&carousel&&carts);
  assert.equal(vista.userData.collision,false);assert.equal(vista.userData.interactions,0);assert.equal(vista.userData.residents,0);assert.equal(vista.userData.excludeOverview,true);assert.equal(vista.userData.viewOnlyMirrorOf,'courtyard');
  assert.deepEqual(vista.position.toArray(),[VIKING.x,0,VIKING.z+23]);assert(Math.abs(landscape.rotation.y-Math.PI)<1e-9);assert(Math.abs(landscape.scale.x-.34)<1e-9);
  const expected=['school','home','bakeryCafe','postOffice','workshop','photoStudio'];assert.deepEqual(vista.userData.landmarks,expected);
  assert.deepEqual(new Set(vista.userData.pathIds),new Set(['east-west','north-south','to-bakeryCafe','to-postOffice','to-workshop','to-photoStudio']),'rider paths are borrowed from the authored village plan');
  assert.deepEqual(new Set(vista.userData.fixtureIds),new Set(['tree.2','tree.10','tree.11','lamp.1','lamp.3']),'sparse distant planting and lamps use authored courtyard fixtures');
  for(const id of expected){const marker=vista.getObjectByName('amusement.viking.village.'+id);assert(marker,`${id} source facade exists`);assert.equal(marker.userData.collision,false);assert.equal(marker.userData.interactions,0);assert.equal(marker.userData.facade,id);const source=marker.userData.sourcePosition;assert(Array.isArray(source)&&source.length===3,`${id} carries its authored courtyard position`);assert(marker.userData.bounds.max[1]>1,`${id} source facade has 3D height`);}
  const meshes=[];let triangles=0;vista.traverse(o=>{if(o.isMesh){meshes.push(o);triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;}});
  assert(meshes.length<=27,`${meshes.length} low-draw-call meshes`);assert(triangles>=1856&&triangles<=2700,`${triangles} bounded real-village panorama triangles`);assert.equal(vista.userData.lodTriangles,triangles,'diagnostic triangle count matches every rendered vista mesh');assert(meshes.every(o=>!o.castShadow&&!o.receiveShadow));
  const warmLampBatches=meshes.filter(o=>o.userData.nightLamp),windowBatches=meshes.filter(o=>o.userData.nightWindow);assert.equal(warmLampBatches.length,1,'distant courtyard lamps keep their existing night-lamp hook');assert(windowBatches.length>0,'retained village panes preserve their night-window hook');const windowDayColor=windowBatches[0].material.color.getHex();applyEnvironmentMood(vista,SKY_MOODS.night);assert(warmLampBatches[0].material.emissiveIntensity>1);assert.equal(windowBatches[0].material.color.getHexString(),'f5dbaa');assert(windowBatches[0].material.emissiveIntensity>.5);applyEnvironmentMood(vista,SKY_MOODS.day);assert.equal(warmLampBatches[0].material.emissiveIntensity,0);assert.equal(windowBatches[0].material.color.getHex(),windowDayColor);assert.equal(windowBatches[0].material.emissiveIntensity,0);
  // The sea surface intersects both terrain skirts; the panorama cannot read as a floating box.
  const seaY=sea.getWorldPosition(new T.Vector3()).y,shoreBounds=new T.Box3().setFromObject(shore),islandBounds=new T.Box3().setFromObject(island),waterBounds=new T.Box3().setFromObject(sea);
  assert(shoreBounds.min.y<seaY&&shoreBounds.max.y>seaY,'waterline crosses the beach skirt');assert(islandBounds.min.y<seaY&&islandBounds.max.y>seaY,'waterline crosses the island terrain');
  const townBounds=new T.Box3();for(const id of expected){const marker=vista.getObjectByName('amusement.viking.village.'+id),b=marker.userData.bounds;townBounds.union(new T.Box3(new T.Vector3(...b.min),new T.Vector3(...b.max)).applyMatrix4(landscape.matrixWorld));}
  assert(waterBounds.max.z>townBounds.max.z+35,'the water plane continues well beyond the town, toward the horizon');
  const overview=overviewBounds(r.view.root),vistaBounds=new T.Box3().setFromObject(vista);assert(vistaBounds.min.x<overview.min.x,'overview omits the distant village bounds');
  for(const region of[0,-.3]){fitAmusementCamera(r.camera,r.view.root,{width:390,height:844},{},region,{x:-4.5,y:.05,z:1});const withVista=[r.camera.left,r.camera.right,r.camera.top,r.camera.bottom];r.view.root.remove(vista);fitAmusementCamera(r.camera,r.view.root,{width:390,height:844},{},region,{x:-4.5,y:.05,z:1});assert.deepEqual([r.camera.left,r.camera.right,r.camera.top,r.camera.bottom],withVista,'ordinary and food-cart zoom framing is unchanged');r.view.root.add(vista);}
  assert(pov.begin({sourceCamera:r.camera,controls:r.cam.controls,player,model,owner,width:390,height:844}));
  const obstructors=['amusement.viking.boat','amusement.viking.gangway-surface','amusement.viking.deck-ramp','amusement.viking.aisle'].map(name=>{const object=r.view.root.getObjectByName(name);assert(object,name);return object;});
  const raycaster=new T.Raycaster(),ndc=new T.Vector2();let maxForwardError=0,landmarksFramed=0,landmarkLosChecks=0;
  for(let degrees=-55;degrees<=55;degrees++){
   const angle=degrees*Math.PI/180,f=vikingFrame(angle),frame={...f,gangway:0,gangwayStowed:1,restraint:1};r.view.setVikingFrame(frame);player.position.set(f.x,f.y,f.z);player.rotation.set(f.pitch,f.yaw,f.roll,'YXZ');player.updateMatrixWorld(true);r.view.root.updateMatrixWorld(true);
   const camera=pov.frame({owner,driver:{phase:'active',elapsed:1,dismount:false},width:390,height:844}),direction=new T.Vector3();assert(camera);camera.getWorldDirection(direction);
   const seatForward=new T.Vector3(0,0,1).applyQuaternion(player.quaternion).normalize();maxForwardError=Math.max(maxForwardError,direction.distanceTo(seatForward));assert(direction.distanceTo(seatForward)<1e-7,`camera tracks rigid seat-local +Z at ${degrees}°`);
   const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);assert(Math.abs(right.y)<1e-7&&Math.abs(right.z)<1e-7,`camera has no roll at ${degrees}°`);
   const localEye=player.worldToLocal(camera.position.clone());assert(Math.abs(localEye.y-.9)<1e-7&&Math.abs(localEye.z-.7)<1e-7,`eye stays forward of the face with a safe offset at ${degrees}°`);
   // The center ray and a compact 3x3 center-screen grid must not pass through
   // the hull, seat aisle, deck ramp, or deployed access ramp at any swing angle.
   for(const y of[-.10,0,.10])for(const x of[-.10,0,.10]){ndc.set(x,y);raycaster.setFromCamera(ndc,camera);const hits=raycaster.intersectObjects(obstructors,true);assert.equal(hits.length,0,`${hits[0]?.object.name} blocks center-grid ray (${x},${y}) at ${degrees}°`);}
   if(degrees>=-10&&degrees<=25){
    let framed=0;
    for(const id of expected){const marker=vista.getObjectByName('amusement.viking.village.'+id),b=marker.userData.bounds,bounds=new T.Box3(new T.Vector3(...b.min),new T.Vector3(...b.max)).applyMatrix4(landscape.matrixWorld),center=bounds.getCenter(new T.Vector3()),projected=center.clone().project(camera);
     if(projected.z<=-1||projected.z>=1||Math.abs(projected.x)>.96||Math.abs(projected.y)>.85)continue;
     const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z).project(camera));const px=corners.map(p=>(p.x+1)*390/2),py=corners.map(p=>(1-p.y)*844/2);
     if(Math.min(...px)<8||Math.max(...px)>382||Math.min(...py)<142||Math.max(...py)>648)continue;
     assert(Math.max(...py)-Math.min(...py)>=22,`${id} reads as a 3D facade in the natural viewing window`);framed++;
     const vector=center.clone().sub(camera.position),range=vector.length(),ray=new T.Raycaster(camera.position,vector.normalize(),.08,range-.08),hits=ray.intersectObjects(obstructors,true);assert.equal(hits.length,0,`${hits[0]?.object.name} blocks in-frame ${id} line of sight at ${degrees}°`);landmarkLosChecks++;
    }
    if(framed>0)landmarksFramed++;
   }
  }
  assert(landmarksFramed>=20,`real village panorama is naturally framed across a ride window (${landmarksFramed} angles)`);assert(landmarkLosChecks>=50,`only in-frame facade centers receive LOS checks (${landmarkLosChecks} checks)`);
  console.log(JSON.stringify({scannedAngles:111,maxForwardError,landmarksFramed,landmarkLosChecks}));
  assert.deepEqual([r.view.root.getObjectByName('amusement.carousel'),r.view.root.getObjectByName('amusement.viking'),r.view.root.getObjectByName('amusement.food-carts')],[carousel,ride,carts]);
 }finally{pov.release(owner);r.restore();}
});

test('batched real-village geometry and shared material dispose once with the amusement scene',()=>{const r=rig();try{const vista=r.view.root.getObjectByName('amusement.viking.village-vista'),batch=vista.getObjectByName('amusement.viking.village-detail-batch.1');let geometryDisposals=0,materialDisposals=0;batch.geometry.addEventListener('dispose',()=>geometryDisposals++);batch.material.addEventListener('dispose',()=>materialDisposals++);r.view.dispose();assert.equal(vista.parent,null);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);}finally{r.restore();}});

test('village vista is visible only in the live Viking rider view and hides on overview, return, cancellation and room disposal',()=>{
 const r=rig(),vista=r.view.root.getObjectByName('amusement.viking.village-vista'),pov=r.view.vikingPOV,owner={},player=new T.Group(),model=new T.Group();player.add(model);
 try{
  assert.equal(vista.visible,false,'normal walking starts with the decorative vista hidden');
  const args={sourceCamera:r.camera,controls:r.cam.controls,player,model,owner,width:390,height:844};
  assert(pov.begin(args));
  const driver={phase:'active',elapsed:1,dismount:false},riderCamera=pov.frame({owner,driver,width:390,height:844});
  assert(riderCamera);r.view.updateVisibility(riderCamera,player.position);assert.equal(vista.visible,true,'the live Viking rider-eye camera may show its vista');
  r.view.updateVisibility(riderCamera,player.position,{overview:true});assert.equal(vista.visible,false,'overview never exposes the distant decorative island');
  r.view.updateVisibility(riderCamera,player.position);assert.equal(vista.visible,true,'returning to the live rider view restores the vista');
  const otherActivityCamera=new T.PerspectiveCamera();r.view.updateVisibility(otherActivityCamera,player.position);assert.equal(vista.visible,false,'a different activity camera cannot show the vista');
  // The normal return camera is selected as soon as the eye-camera blend ends.
  pov.frame({owner,driver:{phase:'exiting',elapsed:1,dismount:true},width:390,height:844});
  assert.equal(pov.camera,null);r.view.updateVisibility(r.camera,player.position);assert.equal(vista.visible,false,'the vista hides as the rider returns to normal walking');pov.release(owner);
  // A cancelled early mount never establishes the eye camera, so the vista stays hidden.
  assert(pov.begin(args));pov.frame({owner,driver:{phase:'entering',elapsed:0,dismount:false},width:390,height:844});
  assert.equal(pov.camera,null);r.view.updateVisibility(r.camera,player.position);assert.equal(vista.visible,false,'cancelled mounting never shows the vista');pov.release(owner);
  // A room swap disposes the old scene, including any retained visibility state.
  r.view.dispose();assert.equal(vista.visible,false);assert.equal(vista.parent,null);
 }finally{r.restore();}
});
