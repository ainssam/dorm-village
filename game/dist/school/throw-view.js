import * as THREE from 'three';
import {THROW_COURT as C} from './throw-model.js';
import {BASKETBALL_PLACEMENT} from './field-layout.js';
/** Court geometry belongs to the existing field. No second renderer or copied character. */
export function buildThrowCourt(parent){
 const root=new THREE.Group();root.name='sportsField.throwCourt';root.position.set(BASKETBALL_PLACEMENT.x,0,BASKETBALL_PLACEMENT.z);parent.add(root);let disposed=false;
 const mesh=(geometry,color,name,p)=>{const n=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.86}));n.name=name;n.position.set(p.x,p.y,p.z);n.castShadow=n.receiveShadow=true;root.add(n);return n;};
 const box=(w,h,d,color,name,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),color,name,{x,y,z});
 box(5.9,.014,5.4,'#bcbd91','throw.floor',1.55,C.floorY-.007,-3.2);
 const line=points=>{const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],.078,points[i-1][1]),new THREE.Vector3(points[i][0],.078,points[i][1])));const n=mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*2),.014,5,false),'#fff6da','throw.court-marking',{x:0,y:0,z:0});n.castShadow=false;return n;};
 line([[-1.3,-5.75],[4.4,-5.75],[4.4,-.65],[-1.3,-.65],[-1.3,-5.75]]);
 line([[4.4,-4.02],[1.6,-4.02],[1.6,-2.38],[4.4,-2.38]]);
 line(Array.from({length:49},(_,i)=>{const a=Math.PI/2+i*Math.PI/48;return[3.4+Math.cos(a)*2.45,-3.2+Math.sin(a)*2.45];}));
 const stripe=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.6,.071,-4.15),new THREE.Vector3(-.6,.071,-2.35)]),new THREE.LineBasicMaterial({color:'#fff6da'}));root.add(stripe);
 const board=box(C.board.half.x*2,C.board.half.y*2,C.board.half.z*2,'#efedda','throw.board',C.board.center.x,C.board.center.y,C.board.center.z);
 box(.022,.34,.48,'#bf805b','throw.boardMark',C.board.center.x-C.board.half.x-.012,2.16,-3.2);
 box(C.support.half.x*2,C.support.half.y*2,C.support.half.z*2,'#759081','throw.support',C.support.center.x,C.support.center.y,C.support.center.z);
 const rim=mesh(new THREE.TorusGeometry(C.rim.radius,C.rim.tubeRadius,10,48),'#bb704b','throw.rim',C.rim.center);rim.rotation.x=Math.PI/2;
 for(let i=0;i<12;i++){const t=i*Math.PI/6,u=t+Math.PI/6,pts=[new THREE.Vector3(3.4+Math.cos(t)*.49,1.82,-3.2+Math.sin(t)*.49),new THREE.Vector3(3.4+Math.cos(u)*.30,1.37,-3.2+Math.sin(u)*.30)];root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#eee6cc',transparent:true,opacity:.8})));}
 const ball=mesh(new THREE.SphereGeometry(C.ballRadius,24,16),'#dc8a48','throw.ball',{x:.3,y:C.floorY+C.ballRadius,z:-3.2});
 for(const rot of [0,Math.PI/2]){const seam=new THREE.Mesh(new THREE.TorusGeometry(C.ballRadius+.001,.005,5,32),new THREE.MeshStandardMaterial({color:'#6e4d34',roughness:1}));seam.rotation.y=rot;ball.add(seam);}
 const positions=new Float32Array(768*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);
 const trail=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:'#516c61',dashSize:.10,gapSize:.075,transparent:true,opacity:.85}));trail.name='throw.preview';trail.frustumCulled=false;trail.visible=false;root.add(trail);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(C.ballRadius*1.2,24),new THREE.MeshBasicMaterial({color:'#53624c',transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=C.floorY+.009;root.add(shadow);
 function setActive(active){trail.visible=false;root.userData.active=!!active;if(!active){ball.position.set(.3,C.floorY+C.ballRadius,-3.2);ball.material.color.set('#dc8a48');shadow.position.set(.3,C.floorY+.009,-3.2);}}
 function update(state,points){ball.position.set(state.position.x,state.position.y,state.position.z);ball.rotation.z=-(state.elapsed??0)*3;ball.material.color.set(state.scored?'#dfbc48':'#dc8a48');shadow.position.x=ball.position.x;shadow.position.z=ball.position.z;shadow.material.opacity=Math.max(.035,.17/(1+ball.position.y));trail.visible=state.phase==='aiming';if(points){const count=Math.min(points.length,768);for(let i=0;i<count;i++){positions[i*3]=points[i].x;positions[i*3+1]=points[i].y;positions[i*3+2]=points[i].z;}geometry.attributes.position.needsUpdate=true;geometry.setDrawRange(0,count);trail.computeLineDistances();}}
 function dispose(){if(disposed)return;disposed=true;const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.geometry)gs.add(n.geometry);for(const m of n.material?[].concat(n.material):[])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.removeFromParent();root.clear();}
 return {root,ball,trail,board,rim,setActive,update,dispose};
}
