import * as THREE from 'three';
import {LASER_GEOMETRY as G} from './laser-layout.js';
import {laserTargets} from './laser-model.js';
/** Only actual neutral plates/stars and the full backstop participate in scoring. */
export function buildLaserView(parent){
 const machine=new THREE.Group();machine.name='schoolGym.laser';parent?.add(machine);const materials=new Map(),geometries=new Set();let alive=true;
 const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85,side:THREE.DoubleSide}));return materials.get(color);};
 const mesh=(g,c,name,at,host=machine)=>{geometries.add(g);const m=new THREE.Mesh(g,material(c));m.name='schoolGym.laser.'+name;if(at)m.position.set(...at);m.castShadow=true;m.receiveShadow=true;host.add(m);return m;};
 const mat=mesh(new THREE.BoxGeometry(3.1,.012,6.7),'#d4dbc9','floor',[0,.006,2.3]);
 const backstop=mesh(new THREE.BoxGeometry(3.1,2.1,.11),'#a9bca8','backstop',[0,1.062,G.backstopZ]);backstop.userData.kind='backstop';
 // A small five-shot panel lives on the far edge of the backstop, clear of the
 // plate/star sweep. Its lights are presentational; only target meshes score.
 const scoreboard=new THREE.Group();scoreboard.name='schoolGym.laser.scoreboard';scoreboard.position.set(1.40,1.94,G.backstopZ-.10);machine.add(scoreboard);
 mesh(new THREE.BoxGeometry(.28,.34,.07),'#5c7669','scoreboard.face',[0,0,0],scoreboard);
 const lampGeometry=new THREE.SphereGeometry(.023,10,8);geometries.add(lampGeometry);
 const lampMaterial=material('#f7e6a8');lampMaterial.emissive.set('#d49a34');lampMaterial.emissiveIntensity=.55;
 const scoreLamps=new THREE.InstancedMesh(lampGeometry,lampMaterial,5);scoreLamps.name='schoolGym.laser.score-lamps';
 const lampPositions=[[-.07,.075,0],[0,.075,0],[.07,.075,0],[-.035,-.075,0],[.035,-.075,0]],lampColors=['#7bb399','#7bb399','#e6bf57','#d8b984','#d8b984'],lampMatrix=new THREE.Matrix4(),lampColor=new THREE.Color();
 for(let i=0;i<5;i++){lampMatrix.makeTranslation(...lampPositions[i]);scoreLamps.setMatrixAt(i,lampMatrix);scoreLamps.setColorAt(i,lampColor.set(lampColors[i]));}
 scoreLamps.instanceMatrix.needsUpdate=true;if(scoreLamps.instanceColor)scoreLamps.instanceColor.needsUpdate=true;scoreboard.add(scoreLamps);
 // No tall side catches can hide either plate. The bounded muzzle envelope stays inside the backstop.
 const targets=[];const plate=mesh(new THREE.CircleGeometry(.29,32),'#719eac','plate');targets.push(plate);const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.145:.32;if(i)shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);else shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();const star=mesh(new THREE.ShapeGeometry(shape),'#dbb55d','star');targets.push(star);for(const [i,t]of targets.entries()){t.rotation.y=Math.PI/4;t.userData.kind='target';t.userData.target=i?'star':'plate';}
 const device=new THREE.Group();device.name='schoolGym.laser.toy-light';machine.add(device);
 const grip=mesh(new THREE.CylinderGeometry(G.gripRadius,G.gripRadius,G.gripHeight,16),'#829e94','front-palm-grip',null,device),rearGrip=mesh(new THREE.SphereGeometry(G.rearGripRadius,16,12),'#829e94','rear-palm-grip',[-.20,0,-.20],device);
 const supports=['left','cross','right'].map(name=>mesh(new THREE.CylinderGeometry(.018,.018,1,8),'#829e94','grip-bridge-'+name,null,device));
 const shell=mesh(new THREE.CylinderGeometry(.065,.065,.43,12),'#dfb772','toy-shell',[0,.105,.08],device);shell.rotation.x=Math.PI/2;
 const muzzle=mesh(new THREE.CircleGeometry(.049,16),'#fff5cd','light-emitter',[0,.105,.298],device);
 const beam=mesh(new THREE.CylinderGeometry(.008,.008,1,6),'#f3dc8b','light-ray');beam.castShadow=false;beam.receiveShadow=false;
 const raycaster=new THREE.Raycaster(),forward=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0);
 function setTargets(points){if(!alive)return;for(const t of targets){const p=points?.find(p=>p.id===t.userData.target);if(p)t.position.set(p.x,p.y,p.z);}machine.updateWorldMatrix(true,true);}
 function setDevice(fit){if(!alive)return;device.visible=!!fit;beam.visible=!!fit?.beam;if(!fit)return;device.position.copy(fit.grip);device.quaternion.copy(fit.quaternion);const inverse=fit.quaternion.clone().invert();rearGrip.position.copy(fit.rear).sub(fit.grip).applyQuaternion(inverse);const left=new THREE.Vector3(0,.052,0),right=rearGrip.position.clone(),center=left.clone().add(right).multiplyScalar(.5);center.y+=.055;center.z+=.45;shell.position.copy(center);muzzle.position.copy(center).add(new THREE.Vector3(0,0,.218));const frontLeft=new THREE.Vector3(left.x,center.y,center.z),frontRight=new THREE.Vector3(right.x,center.y,center.z);for(const[i,ends]of[[left,frontLeft],[frontLeft,frontRight],[frontRight,right]].entries()){const[a,b]=ends,d=b.clone().sub(a);supports[i].position.copy(a).add(b).multiplyScalar(.5);supports[i].scale.y=d.length();supports[i].quaternion.setFromUnitVectors(up,d.normalize());}if(fit.beam){const a=new THREE.Vector3(...['x','y','z'].map(k=>fit.beam.origin[k])),b=new THREE.Vector3(...['x','y','z'].map(k=>fit.beam.point[k])),d=b.clone().sub(a);beam.position.copy(a).add(b).multiplyScalar(.5);beam.scale.set(1,d.length(),1);beam.quaternion.setFromUnitVectors(up,d.normalize());}machine.updateWorldMatrix(true,true);}
 function ray(origin,direction){if(!alive)return null;machine.updateWorldMatrix(true,true);const o=machine.localToWorld(new THREE.Vector3(origin.x,origin.y,origin.z)),d=new THREE.Vector3(direction.x,direction.y,direction.z).transformDirection(machine.matrixWorld);raycaster.set(o,d);raycaster.near=0;raycaster.far=7;const h=raycaster.intersectObjects([...targets,backstop],false).find(h=>h.object.visible);if(!h)return null;const p=machine.worldToLocal(h.point.clone());return{kind:h.object.userData.kind,target:h.object.userData.target??null,point:{x:p.x,y:p.y,z:p.z},object:h.object.name};}
 setTargets(laserTargets());setDevice(null);
 return{machine,mat,backstop,targets,device,grip,rearGrip,supports,shell,muzzle,beam,setTargets,setDevice,ray,dispose(){if(!alive)return;alive=false;machine.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
