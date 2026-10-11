import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {FISH_SCOOP_POOL,FISH_SCOOP_ACTIVITY} from './layout.js';
import {fishScoopPositions,FISH_SCOOP_HIT_TIME,FISH_SCOOP_RISE_TIME} from './fish-scoop-model.js';

const Y=new THREE.Vector3(0,1,0),PALETTE=['#e89a78','#83aeb0','#e0c778','#bb93ae'];
function triangleGeometry(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();return g;}
function simpleFish(kit,parent,index){
 const g=new THREE.Group();g.name='fish-scoop.fish.'+index;parent.add(g);
 const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),kit.mat(PALETTE[index%PALETTE.length]));body.scale.set(1.45,.73,.62);body.castShadow=true;g.add(body);
 const tail=new THREE.Group();tail.name='fish-scoop.tail';tail.position.x=-.19;g.add(tail);
 const finMat=kit.mat(index%2?'#8ca48d':'#d28c79');
 const fin=new THREE.Mesh(triangleGeometry([[-.02,-.01,0],[-.19,.10,0],[-.17,-.10,0]]),finMat);tail.add(fin);
 for(const sign of[-1,1]){
  const eye=new THREE.Mesh(new THREE.OctahedronGeometry(.024,0),kit.mat('#526c67'));eye.name='fish-scoop.eye';eye.position.set(.18,.025,sign*.087);g.add(eye);
 }
 const dorsal=new THREE.Mesh(triangleGeometry([[-.08,.085,0],[.02,.17,0],[.11,.075,0]]),finMat);dorsal.name='fish-scoop.dorsal';g.add(dorsal);
 g.userData={index,tail};return g;
}

/** Static 3D activity site owned by the amusement island's ordinary disposer. */
export function buildFishScoopSite(parent){
 const root=new THREE.Group();root.name='amusement.fish-scoop-site';root.position.set(FISH_SCOOP_POOL.x,0,FISH_SCOOP_POOL.z);parent.add(root);
 const kit=createToyKit(root),{box,mat}=kit;
 const solid=(name,w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 // A low divided pool sits flush with the modeled grassy bank. The water and
 // four timber-like edges are visible from the walking path and close camera.
 solid('fish-scoop.pool.base',2.8,.18,2,'#b79b75',0,.11,0);
 solid('fish-scoop.pool.rim.north',2.8,.10,.09,'#d2b48b',0,.20,-.955);
 solid('fish-scoop.pool.rim.south',2.8,.10,.09,'#d2b48b',0,.20,.955);
 solid('fish-scoop.pool.rim.west',.09,.10,1.82,'#d2b48b',-1.355,.20,0);
 solid('fish-scoop.pool.rim.east',.09,.10,1.82,'#d2b48b',1.355,.20,0);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(2.62,1.78),new THREE.MeshStandardMaterial({color:'#87c4c6',roughness:.46,metalness:0}));water.rotation.x=-Math.PI/2;water.position.y=.206;water.name='fish-scoop.pool.water';water.receiveShadow=true;root.add(water);

 const fishRoot=new THREE.Group();fishRoot.name='fish-scoop.fish-school';root.add(fishRoot);const fish=Array.from({length:4},(_,i)=>simpleFish(kit,fishRoot,i));
 const net=new THREE.Group();net.name='fish-scoop.net';net.visible=false;root.add(net);
 const hoop=new THREE.Mesh(new THREE.TorusGeometry(.245,.018,4,10),mat('#b18465'));hoop.rotation.x=Math.PI/2;hoop.position.y=.055;hoop.name='fish-scoop.net.hoop';net.add(hoop);
 const netMat=mat('#d0baa0');
 for(let i=0;i<6;i++){const a=i*Math.PI/3,spoke=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.20,4),netMat);spoke.position.set(Math.cos(a)*.11,-.045,Math.sin(a)*.11);spoke.name='fish-scoop.net.mesh.'+i;net.add(spoke);}
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.015,.57,5),mat('#9d795d'));handle.position.set(0,.36,.16);handle.rotation.x=.34;handle.name='fish-scoop.net.handle';net.add(handle);
 const ripple=new THREE.Mesh(new THREE.RingGeometry(.25,.29,8),new THREE.MeshBasicMaterial({color:'#eaf4db',transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.y=.213;ripple.visible=false;ripple.name='fish-scoop.ripple';root.add(ripple);

 // Five quiet planks give the narrow lobe a visible, continuous walk route.
 const boardwalk=new THREE.Group();boardwalk.name='fish-scoop.boardwalk';boardwalk.position.set(-8.36-FISH_SCOOP_POOL.x,.055,-6.96-FISH_SCOOP_POOL.z);boardwalk.rotation.y=-2.25;root.add(boardwalk);
 for(let i=0;i<5;i++){const plank=new THREE.Mesh(new THREE.BoxGeometry(1.12,.035,.68),mat(i%2?'#d4bb98':'#c9ab83'));plank.position.set(0,0,(i-2)*.71);plank.name='fish-scoop.boardwalk.plank.'+i;plank.receiveShadow=true;boardwalk.add(plank);}
 for(const x of[-.66,.66]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,3.95),mat('#ad916f'));rail.position.set(x,.04,0);rail.name='fish-scoop.boardwalk.edge';boardwalk.add(rail);}
 // Low sign beside the approach is local scenery, never another portal.
 const sign=new THREE.Group();sign.name='fish-scoop.sign';sign.position.set(-9.42-FISH_SCOOP_POOL.x,.02,-6.42-FISH_SCOOP_POOL.z);root.add(sign);
 const post=new THREE.Mesh(new THREE.BoxGeometry(.09,.62,.09),mat('#9d795d'));post.position.y=.31;sign.add(post);
 const board=new THREE.Mesh(new THREE.BoxGeometry(.65,.34,.08),mat('#d9c2a0'));board.position.set(0,.55,0);board.name='fish-scoop.sign.board';sign.add(board);
 signLabel('뜰채 연못',0,.55,.044,.57,'#657d79','transparent',sign);
 let state=null,time=0,disposed=false;
 function update(next,{reduced=false}={}){
  if(disposed)return;state=next;
  if(!next){net.visible=false;ripple.visible=false;return;}
  net.visible=next.phase==='playing'||next.phase==='paused'||next.phase==='complete';
  const fishPositions=fishScoopPositions(next);
  for(let i=0;i<fish.length;i++){
   const p=fishPositions[i],mesh=fish[i];mesh.position.set(p.x,.285+(reduced?0:Math.sin(next.clock*3+i*2)*.025),p.z);mesh.rotation.y=p.yaw;mesh.visible=p.visible;
   if(!reduced)mesh.userData.tail.rotation.y=Math.sin(next.clock*9+i)*.20;
  }
  net.position.set(next.net.x,0,next.net.z);
  const action=next.scoop,lower=action.phase==='lowering'?smooth(action.elapsed/FISH_SCOOP_HIT_TIME):action.phase==='rising'?1-smooth(action.elapsed/FISH_SCOOP_RISE_TIME):0;
  net.position.y=action.phase==='idle'?.72:.72-.50*lower;
  if(action.phase==='rising'&&action.result==='caught'){ripple.visible=true;ripple.position.x=next.net.x;ripple.position.z=next.net.z;ripple.scale.setScalar(reduced?1:1.05+.16*Math.sin(next.clock*8));ripple.material.opacity=reduced?.35:.42+.18*Math.sin(next.clock*8);}
  else ripple.visible=false;
 }
 function animate(dt=0,{reduced=false}={}){if(disposed||!Number.isFinite(dt)||dt<=0||reduced)return;time+=Math.min(dt,.05);if(!state){for(let i=0;i<fish.length;i++)fish[i].position.y=.285+Math.sin(time*2.4+i*1.7)*.022;}}
 function dispose(){if(disposed)return;disposed=true;disposeToyTree(root);}
 root.updateMatrixWorld(true);
 return{root,fish,net,ripple,boardwalk,sign,update,animate,dispose,get state(){return state;}};
}

const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

/** Camera and temporary actor placement for the 3D play session. */
export function createFishScoopSessionView({site,player,model,poser,zoneRoot,reduced=false}){
 const saved={parent:player.parent,position:player.position.clone(),quaternion:player.quaternion.clone(),scale:player.scale.clone(),mp:model.position.clone(),mq:model.quaternion.clone(),ms:model.scale.clone(),pose:poser?.getState?.(),children:player.children.map(o=>[o,o.visible])};
 const pad=FISH_SCOOP_ACTIVITY.at;zoneRoot.add(player);player.position.set(pad.x,.05,pad.z);player.rotation.set(0,Math.atan2(FISH_SCOOP_POOL.x-pad.x,FISH_SCOOP_POOL.z-pad.z),0);player.scale.setScalar(1);model.position.set(0,0,0);model.quaternion.identity();model.scale.setScalar(1);
 for(const[c]of saved.children)if(c!==model)c.visible=false;
 const target=new THREE.Vector3(-10.6,.38,-7.66),camera=new THREE.OrthographicCamera(-2.4,2.4,2.4,-2.4,.05,90);
 camera.position.set(target.x,target.y+6.0,target.z+7.0);camera.lookAt(target);
 let alive=true;
 function fit(width,height){if(!alive)return;const aspect=Math.max(.2,width/Math.max(1,height)),span=Math.max(4.35,3.95/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
 function dispose(){if(!alive)return;alive=false;saved.parent.add(player);player.position.copy(saved.position);player.quaternion.copy(saved.quaternion);player.scale.copy(saved.scale);model.position.copy(saved.mp);model.quaternion.copy(saved.mq);model.scale.copy(saved.ms);if(saved.pose)poser?.setPose?.(saved.pose.name,saved.pose.amount,saved.pose.time);for(const[o,visible]of saved.children)o.visible=visible;site.update(null,{reduced});}
 return{camera,fit,dispose,update(state){if(alive)site.update(state,{reduced});}};
}
