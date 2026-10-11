import*as T from'three';import{RoundedBoxGeometry}from'three/addons/geometries/RoundedBoxGeometry.js';import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{PLANE as P,rampHeight}from'./plane-support.js';
const colors={cream:'#f5e6c8',mint:'#a6c9bd',warm:'#d6ac86',dark:'#667a78',glass:'#c9e3e2',seat:'#e1b4a3'};
// A bounded toy plane. The actor is never a child of this disposable root.
export function createPlaneView(){const root=new T.Group();root.name='plane';const geometries=new Map(),materials=new Map(),surfaces={walk:[],seat:[],foot:[],grip:[]},solids=[],wheels=[],cutaway=[];let disposed=false;
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
 const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 const add=(name,g,color,x,y,z,kind=null)=>{const m=new T.Mesh(g,material(color));m.name='plane.'+name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;if(kind){m.userData.kind=kind;(surfaces[kind]??[]).push(m);}root.add(m);return m;};
 const box=(name,w,h,d,color,x,y,z,r=.03,kind=null)=>add(name,geometry(['box',w,h,d,r].join(),()=>r?new RoundedBoxGeometry(w,h,d,1,r):new T.BoxGeometry(w,h,d)),color,x,y,z,kind);
 const sphere=(name,sx,sy,sz,color,x,y,z)=>{const m=add(name,geometry('sphere',()=>new T.SphereGeometry(1,16,12)),color,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const tube=(name,r,length,color,x,y,z)=>add(name,geometry(['tube',r,length].join(),()=>new T.CylinderGeometry(r,r,length,12)),color,x,y,z);
 const capsule=(name,r,length,axis,thickness,color,x,y,z)=>{const g=geometry(['capsule',r,length,axis].join(),()=>{const g=new T.CapsuleGeometry(r,length,6,16);if(axis==='x')g.rotateZ(Math.PI/2);else if(axis==='z')g.rotateX(Math.PI/2);return g;});const m=add(name,g,color,x,y,z);if(axis==='z'&&name==='sliding-door')m.scale.x=thickness/(2*r);else m.scale.y=thickness/(2*r);m.userData.capsuleAxis=axis;return m;};
 const solid=m=>{solids.push(m);return m;};
 solid(sphere('belly',.91,.21,1.7,colors.cream,0,.46,-.04));
 const floorParts=[[-.64,-.18,.44,2.84],[.64,-.18,.44,2.84],[0,-1.18,.84,.84],[0,.57,.84,1.34]].map(([x,z,w,d])=>new T.BoxGeometry(w,.10,d).translate(x,0,z));const floorGeometry=mergeGeometries(floorParts);floorParts.forEach(g=>g.dispose());geometries.set('cabin-floor',floorGeometry);const floor=add('floor',floorGeometry,colors.cream,0,.67,0,'walk');
 // Foot platform is an actual separately displaceable support, flush with the cabin floor.
 const foot=box('foot-platform',.84,.08,.66,colors.warm,0,.68,-.43,0,'foot');surfaces.walk.push(foot);
 const seatVertices=[],seatIndices=[],width=1.38,bottom=.714;
 for(const[z,y]of[[-.145,P.floor],[0,P.seatHigh],[.37,P.seatHigh]])seatVertices.push(-width/2,bottom,z,width/2,bottom,z,-width/2,y,z,width/2,y,z);
 for(let i=0;i<2;i++){const a=i*4,b=a+4;seatIndices.push(a+2,a+3,b+2,a+3,b+3,b+2,a,b,a+1,a+1,b,b+1,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}seatIndices.push(0,1,2,1,3,2,8,10,9,9,10,11);
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(seatVertices,3));sg.setIndex(seatIndices.reduce((out,_,i,a)=>{if(i%3===0)out.push(a[i],a[i+2],a[i+1]);return out;},[]));sg.computeVertexNormals();geometries.set('seat',sg);add('seat',sg,colors.seat,0,0,0,'seat');
 solid(box('backrest',1.40,.79,.12,colors.seat,0,1.1,.55,.04));
 for(const side of[-1,1]){const m=tube('grip.'+side,.027,.34,colors.warm,side*.615,P.rootY+.6006884639310953,-.2604383318559132);m.rotation.z=Math.PI/2;surfaces.grip.push(m);solid(box('grip-post.'+side,.05,.39,.05,colors.warm,side*.75,.96,-.26,.012));}
 // Genuine side opening: no opaque shell triangles span z[-1.7,.2].
 solid(sphere('port-rear',.12,.85,.50,colors.cream,-.92,1.49,.70));
 solid(sphere('starboard',.12,.49,1.38,colors.cream,.92,1.14,-.32));
 solid(sphere('rear-bulkhead',.99,.94,.13,colors.cream,0,1.50,1.06));
 solid(sphere('tail-body',.64,.64,1.0,colors.cream,0,1.24,1.9));
 solid(sphere('nose',.90,.54,.48,colors.cream,0,1.13,-2.22));solid(sphere('nose-join',.84,.30,.30,colors.cream,0,.995,-1.96));
 for(const side of[-1,1])solid(box('windshield-pillar.'+side,.07,1.64,.07,colors.warm,side*.90,1.48,-1.72,.024));
 const roof=solid(capsule('roof',.99,.86,'z',.17,colors.cream,0,2.685,-.28));cutaway.push(roof);
 solid(capsule('wing',.415,5.57,'x',.17,colors.mint,0,2.745,.65));
 solid(capsule('tailwing',.33,1.46,'x',.12,colors.mint,0,1.91,2.28));
 solid(box('tailfin',.13,.75,.84,colors.mint,0,2.16,2.34,.04));
 for(const[x,z]of[[-1.12,.48],[1.12,.48],[0,-1.91]]){const m=tube('wheel.'+wheels.length,.22,.14,colors.dark,x,.27,z);m.rotation.z=Math.PI/2;m.userData.kind='wheel';wheels.push(m);const strut=tube('gear.'+wheels.length,.035,.37,colors.warm,x,.56,z);strut.rotation.z=x?x*.18:0;}
 const hub=sphere('propeller-hub',.16,.16,.19,colors.warm,0,1.13,-2.73),propeller=new T.Group();propeller.name='plane.propeller';propeller.position.set(0,1.13,-2.82);root.add(propeller);
 for(let i=0;i<2;i++){const blade=box('propeller-blade.'+i,.14,1.64,.055,colors.dark,0,0,0,.026);root.remove(blade);propeller.add(blade);blade.rotation.z=i*Math.PI/2;}
 const ramp=new T.Group();ramp.name='plane.ramp-carriage';ramp.position.set(P.rampEnd,P.floor,0);root.add(ramp);const v=[],ind=[];for(const x of[P.rampStart,P.rampEnd]){const y=rampHeight(x);v.push(x-P.rampEnd,y-P.floor,-1.7,x-P.rampEnd,y-P.floor,.2,x-P.rampEnd,y-P.floor-.055,-1.7,x-P.rampEnd,y-P.floor-.055,.2);}ind.push(2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5,0,2,1,1,2,3,4,5,6,5,7,6);const rampColors=Array.from({length:8},()=>new T.Color(colors.warm).toArray()).flat();for(let i=0;i<11;i++){const a=P.rampStart+(P.rampEnd-P.rampStart)*i/11,b=P.rampStart+(P.rampEnd-P.rampStart)*(i+1)/11;for(const[left,right,color]of[[a,b-.018,i%2?colors.warm:'#dfbb98'],[b-.018,b,'#be9472']]){const n=v.length/3;v.push(left-P.rampEnd,rampHeight(left)-P.floor,-1.7,left-P.rampEnd,rampHeight(left)-P.floor,.2,right-P.rampEnd,rampHeight(right)-P.floor,-1.7,right-P.rampEnd,rampHeight(right)-P.floor,.2);ind.push(n,n+1,n+2,n+1,n+3,n+2);for(let j=0;j<4;j++)rampColors.push(...new T.Color(color).toArray());}}const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(v,3));rg.setAttribute('color',new T.Float32BufferAttribute(rampColors,3));rg.setIndex(ind);rg.computeVertexNormals();geometries.set('ramp',rg);const rampMesh=add('ramp',rg,'#ffffff',0,0,0,'walk');rampMesh.material.vertexColors=true;root.remove(rampMesh);ramp.add(rampMesh);
 const door=solid(capsule('sliding-door',.87,.16,'z',.065,colors.mint,-.963,1.63,1.15));cutaway.push(door);
 const ghost=new T.MeshStandardMaterial({color:colors.cream,roughness:.85,transparent:true,opacity:.10,depthWrite:false});materials.set('cutaway',ghost);const originalMaterials=cutaway.map(m=>m.material);
 function setRamp(amount){const a=Math.max(0,Math.min(1,Number.isFinite(amount)?amount:1));ramp.scale.set(a,a,1);ramp.visible=a>0;door.position.z=-.75+1.90*a;}
 function setFrame(f={}){root.position.set(f.x??0,f.y??0,f.z??0);root.rotation.set(f.pitch??0,f.yaw??0,f.roll??0,'YXZ');}
 function updateVisibility(camera,actor){const near=Boolean(camera&&actor);cutaway.forEach((m,i)=>{m.material=near?ghost:originalMaterials[i];m.castShadow=!near;});}
 setRamp(1);root.updateMatrixWorld(true);const floorBox=new T.Box3().setFromObject(floor),wheelBox=new T.Box3().setFromObject(wheels[0]),roofBox=new T.Box3().setFromObject(roof),backBox=new T.Box3().setFromObject(root.getObjectByName('plane.backrest'));const cameraEnvelope={x:[wheelBox.min.x-.13,floorBox.max.x+.16],y:[wheelBox.min.y-.02,roofBox.min.y-.28],z:[floorBox.min.z+.80,backBox.max.z+.14]};return{root,cameraEnvelope,surfaces,solids,wheels,cutaway,setFrame,setRamp,setPropeller(angle){propeller.rotation.z=Number.isFinite(angle)?angle:0;},updateVisibility,dispose(){if(disposed)return;disposed=true;const errors=[];for(const resource of[...geometries.values(),...materials.values()])try{resource.dispose();}catch(error){errors.push(error);}try{root.visible=false;root.removeFromParent();root.clear();}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Plane cleanup incomplete: '+errors.map(e=>e.message??e).join('; '));}};
}
