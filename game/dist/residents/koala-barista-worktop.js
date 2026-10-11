/** Narrow optional fixture replacement. Table/collision/floor/roof remain unchanged.
 * Coordinates are bakery-room local, matching the reserved root at (-2.5,3.25,-5.65).
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const KOALA_WORKTOP=Object.freeze({counterTop:4.37,machine:{x:-3.25,y:4.675,z:-4.77},steamTip:{x:-2.78,y:4.64,z:-5},blender:{x:-1.75,z:-4.88},blendButton:{x:-1.75,y:4.55,z:-5.10},coaster:{x:-2.5,y:4.38,z:-3.98},readyCup:{x:-2.5,y:4.38,z:-3.98},spareCups:[{x:-4.05,z:-4.22},{x:-4.05,z:-4.60}]});
export function buildKoalaWorktopFixtures(parent){
 const root=new THREE.Group();root.name='bakeryCafe.koala-worktop';parent.add(root);const materials=new Map(),geometries=new Set();
 const mat=(color,opts={})=>{const key=color+JSON.stringify(opts);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.83,...opts}));return materials.get(key);};
 const add=(name,g,m,p)=>{geometries.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.position.set(...p);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
 const box=(name,d,color,p,r=.025)=>add(name,new RoundedBoxGeometry(...d,2,r),mat(color),p);
 const cylinder=(name,rt,rb,h,color,p)=>add(name,new THREE.CylinderGeometry(rt,rb,h,28),mat(color),p);
 const line=(name,pts,r,color)=>add(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),24,r,7,false),mat(color,{metalness:.25}),[0,0,0]);
 const machine=box('koala.machine.body',[.67,.59,.56],'#b7c5ac',[-3.25,4.675,-4.77],.06);
 box('koala.machine.rear-controls',[.46,.28,.045],'#496b5d',[-3.25,4.685,-5.063],.02);
 box('koala.machine.drip-tray',[.48,.025,.16],'#9aab97',[-3.25,4.397,-5.02],.018);
 const dial=cylinder('koala.machine.dial',.045,.045,.027,'#dfd5bd',[-3.39,4.71,-5.102]);dial.rotation.x=Math.PI/2;
 cylinder('koala.machine.top-lid',.14,.14,.024,'#d9dbc0',[-3.25,4.98,-4.77]);
 line('koala.machine.steam-wand',[[-2.923,4.78,-4.98],[-2.81,4.765,-5],[-2.78,4.705,-5],[-2.78,4.64,-5]],.013,'#d5bb91');
 // Reuse the old terracotta/sage blender language, with a real reachable rear button.
 cylinder('koala.blender.base',.20,.20,.12,'#d8a18a',[-1.75,4.43,-4.88]);
 const jar=add('koala.blender.jar',new THREE.CylinderGeometry(.163,.135,.28,32),mat('#d5e4d4',{transparent:true,opacity:.58,depthWrite:false}),[-1.75,4.63,-4.88]);
 cylinder('koala.blender.drink',.133,.115,.19,'#c6aa86',[-1.75,4.585,-4.88]);
 cylinder('koala.blender.lid',.18,.18,.05,'#749986',[-1.75,4.795,-4.88]);
 const button=cylinder('koala.blender.rear-button',.045,.045,.025,'#f0dec1',[-1.75,4.55,-5.10]);button.rotation.x=Math.PI/2;
 for(const [i,p]of KOALA_WORKTOP.spareCups.entries()){cylinder('koala.spare-cup.'+i,.14,.11,.21,'#f0dec1',[p.x,4.475,p.z]);cylinder('koala.spare-cup-rim.'+i,.121,.121,.003,'#997852',[p.x,4.582,p.z]);}
 cylinder('koala.front-coaster',.214,.214,.010,'#f0dec1',[-2.5,4.375,-3.98]);
 let disposed=false;return{root,machine,jar,button,update({phase,progress=0,reduced=false}={}){if(disposed)return;const running=phase==='blend'&&!reduced;jar.rotation.y=running?progress*Math.PI*12:0;button.position.z=-5.10+(running?.004*Math.sin(Math.PI*progress):0);},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();const owned=new Set(materials.values());root.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material??[]))owned.add(m);});for(const m of owned)m.dispose();root.clear();}};
}
