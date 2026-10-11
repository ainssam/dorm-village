import * as THREE from 'three';
// Four thin water-surface ribbons share one draw, material and fixed buffers.
// No particles, textures, timer, renderer pass or idle scene allocation.
const SEGMENTS=12,RIBBONS=4,VERTICES=RIBBONS*(SEGMENTS+1)*2;
export function createBoatWake(){
 const root=new THREE.Group();root.name='transport.wake';root.visible=false;
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(VERTICES*3),colors=new Float32Array(VERTICES*4),indices=[];
 for(let ribbon=0;ribbon<RIBBONS;ribbon++)for(let segment=0;segment<SEGMENTS;segment++){const a=ribbon*(SEGMENTS+1)*2+segment*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,4).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);
 const material=new THREE.MeshBasicMaterial({color:'#eff5dc',vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}),mesh=new THREE.Mesh(geometry,material);mesh.name='boat.speed-foam';mesh.frustumCulled=false;mesh.renderOrder=3;root.add(mesh);let alive=true;
 function update({x=0,z=0,yaw=0,speed=0,time=0,reverse=false,reduced=false,paused=false}={}){
  if(!alive||paused)return;
  const strength=Math.min(1,Math.max(0,Number.isFinite(speed)?speed:0)/1.3);
  if(reduced||strength<.015){root.visible=false;return;}
  root.visible=true;root.position.set(x,-.329,z);root.rotation.set(0,yaw,0);root.updateMatrix();
  const direction=reverse?-1:1;
  for(let ribbon=0;ribbon<RIBBONS;ribbon++)for(let segment=0;segment<=SEGMENTS;segment++){
   const t=segment/SEGMENTS,side=ribbon%2===0?-1:1,stern=ribbon<2;
   const longitudinal=stern?(reverse?-2.88:2.25)+direction*t*(1.3+3.3*strength):(-1.4+3.6*t),
    width=stern?(.035+.18*t)*strength:(.055+.06*Math.sin(Math.PI*t))*strength,
    lateral=stern?(1.0+t*(.5+.55*strength)):(1.54+.05*Math.sin(Math.PI*t)),
    flutter=.028*Math.sin(t*18-time*3+ribbon)*strength,
    opacity=stern?(.43*(1-t)**1.5*Math.min(1,t*12+.15)):(.34*Math.sin(Math.PI*t));
   for(let edge=0;edge<2;edge++){
    const index=(ribbon*(SEGMENTS+1)+segment)*2+edge,alpha=opacity*strength*(edge===0?.65:1);
    positions[index*3]=side*(lateral+(edge===0?-width:width)+flutter);positions[index*3+1]=0;positions[index*3+2]=longitudinal;
    colors[index*4]=1;colors[index*4+1]=1;colors[index*4+2]=1;colors[index*4+3]=alpha;
   }
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
 }
 return{root,update,snapshot(){return{alive,visible:root.visible,meshes:alive?1:0,drawCalls:alive?1:0,geometries:alive?1:0,materials:alive?1:0,vertices:alive?VERTICES:0,triangles:alive?RIBBONS*SEGMENTS*2:0,textures:0,renderTargets:0,bufferBytes:alive?positions.byteLength+colors.byteLength+geometry.index.array.byteLength:0};},dispose(){if(!alive)return;alive=false;geometry.dispose();material.dispose();root.removeFromParent();root.clear();}};
}
