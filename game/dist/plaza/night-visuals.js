import {createShowSkyVeil} from './show-sky-veil.js';
import * as THREE from 'three';
import {createFireworkPool,writeFireworks,createFlamePool,writeFlame,QUALITY} from './night-model.js';
const vertex=`
attribute float opacity;
attribute float particleSize;
attribute float aspect;
attribute float phase;
attribute float mode;
uniform float pixelScale;
uniform float perspective;
uniform float maxPointSize;
uniform float minimumSparkPixels;
varying vec3 vColor;
varying float vAlpha;
varying float vAspect;
varying float vPhase;
varying float vMode;
void main(){
 vColor=color;vAlpha=opacity;vAspect=aspect;vPhase=phase;vMode=mode;
 vec4 mv=modelViewMatrix*vec4(position,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(particleSize*pixelScale/(perspective>.5?max(.1,-mv.z):1.),mode>.5&&mode<1.5?minimumSparkPixels:1.,maxPointSize);
}`;
const fragment=`
uniform float clock;
uniform float reduced;
varying vec3 vColor;
varying float vAlpha;
varying float vAspect;
varying float vPhase;
varying float vMode;
void main(){
 vec2 q=vec2((gl_PointCoord.x-.5)*2.,(.5-gl_PointCoord.y)*2.);
 float alpha=0.;vec3 col=vColor;
 if(vMode<.5){
  float h=(q.y+1.)*.5;
  float sway=reduced>.5?0.:(.15*sin(clock*2.5+vPhase)+.055*sin(clock*5.1+vPhase*1.7));
  float center=sway*h*h;
  float width=vAspect*sin(3.14159265*pow(h,.72))*(1.-.25*h);
  float edge=abs(q.x-center)/max(.002,width);
  alpha=(1.-smoothstep(.68,1.,edge))*smoothstep(0.,.12,h)*(1.-smoothstep(.91,1.,h));
  float hot=(1.-smoothstep(.05,.74,edge))*(1.-smoothstep(.20,.82,h));
  col=mix(vColor,vec3(1.,.90,.45),hot*.48);
 }else if(vMode<1.5){
  vec2 axis=vec2(cos(vPhase),sin(vPhase));
  vec2 rotated=vec2(dot(q,axis),dot(q,vec2(-axis.y,axis.x))/max(.16,vAspect));
  float d=length(rotated);
  float core=exp(-d*d*30.);
  float halo=exp(-d*d*4.)*.38;
  alpha=(core+halo)*(1.-smoothstep(.82,1.,d));
  col=mix(vColor,vec3(1.,.97,.84),core*(vAspect<.9?.12:.55));
 }else if(vMode<2.5){
  float d=length(q);
  float cloud=.72+.28*sin(q.x*7.+vPhase)*sin(q.y*5.-vPhase);
  alpha=exp(-d*d*3.4)*cloud*(1.-smoothstep(.65,1.,d));
 }else{
  float d=length(q);alpha=exp(-d*d*6.)*(1.-smoothstep(.72,1.,d));
 }

 gl_FragColor=vec4(col,alpha*vAlpha);
 #include <colorspace_fragment>
}`;
function pointsFor(pool,name,{flame=false}={}){
 const n=pool.alphas.length,geometry=new THREE.BufferGeometry();
 for(const [name,data,size] of [['position',pool.positions,3],['color',pool.colors,3],['opacity',pool.alphas,1],['particleSize',pool.sizes,1],['aspect',pool.aspects??new Float32Array(n).fill(1),1],['phase',pool.phases??new Float32Array(n),1],['mode',pool.modes??new Float32Array(n).fill(1),1]])geometry.setAttribute(name,new THREE.BufferAttribute(data,size).setUsage(THREE.DynamicDrawUsage));
 geometry.setDrawRange(0,0);
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,vertexColors:true,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{clock:{value:0},reduced:{value:0},pixelScale:{value:80},perspective:{value:0},maxPointSize:{value:192},minimumSparkPixels:{value:2.5}}});
 const points=new THREE.Points(geometry,material);points.name=name;points.frustumCulled=false;points.renderOrder=flame?11:10;
 return points;
}
/** Additive replacement for only old flame/light/firework/rocket construction in effects.js.
 * Pass the live PLAZA config. Does not own campsite/tent, audio, controls, camera or timers.
 */
export function createNightVisuals(parent,{plaza,quality='high',reduced=false,maxPointSize=192}={}){
 const root=new THREE.Group();root.name='plaza.enhanced-night-visuals';parent.add(root);const veil=createShowSkyVeil(root);
 // Allocate the maximum once; runtime quality changes lower draw counts without reallocating.
 const fireworks=createFireworkPool({plaza,quality:'high',reduced}),fire=createFlamePool({plaza,quality:'high',reduced});
 const firePoints=pointsFor(fire,'plaza.layered-flame-and-embers',{flame:true}),skyPoints=pointsFor(fireworks,'plaza.grand-fireworks-pool');root.add(firePoints,skyPoints);
 const light=new THREE.PointLight('#ffaf52',0,6.5,2);light.name='plaza.wavering-fire-light';light.position.set(plaza.fire.x,.8,plaza.fire.z);light.castShadow=false;root.add(light);
 const right=new THREE.Vector3(-1,0,0),up=new THREE.Vector3(0,1,0),r=[-1,0,0],u=[0,1,0];let alive=true;
 function sync(points,pool,clock,reduced,camera,height,dpr){
  points.geometry.setDrawRange(0,pool.count);points.visible=pool.count>0;
  for(const attr of Object.values(points.geometry.attributes)){attr.clearUpdateRanges();if(pool.count)attr.addUpdateRange(0,pool.count*attr.itemSize);attr.needsUpdate=true;}
  const uniforms=points.material.uniforms;uniforms.clock.value=clock;uniforms.reduced.value=reduced?1:0;uniforms.maxPointSize.value=Math.max(1,maxPointSize);uniforms.minimumSparkPixels.value=2.5*Math.min(1.5,dpr);
  // Height is CSS renderer viewport height, not full-screen device resolution.
  uniforms.pixelScale.value=camera?.projectionMatrix?Math.abs(camera.projectionMatrix.elements[5])*height*.5*Math.min(1.5,dpr):80*Math.min(1.5,dpr);uniforms.perspective.value=camera?.isPerspectiveCamera?1:0;
 }
 function cancel(){fire.count=fire.emberCount=fireworks.count=fireworks.rocketCount=0;for(const p of [firePoints,skyPoints]){p.geometry.setDrawRange(0,0);p.visible=false;}light.intensity=0;veil.cancel();}
 cancel();
 return {root,update(state,{quality:q=quality,reduced:lowMotion=reduced,dpr=1,camera=null,viewportHeight=600}={}){
  if(!alive)return;const clock=Number.isFinite(state?.clock)?state.clock:0;
  if(camera){camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0).normalize();up.setFromMatrixColumn(camera.matrixWorld,1).normalize();right.toArray(r);up.toArray(u);}
  veil.update(state?.fireworks?.elapsed??-1,24,{clock,showPreparing:!!state?.showPreparing,showSkyReady:!!state?.showSkyReady});
  writeFlame(fire,clock,!!state?.burning,{reduced:lowMotion,quality:q});writeFireworks(fireworks,state?.fireworks?.elapsed??-1,{right:r,up:u,reduced:lowMotion,quality:q,compact:!!camera?.isOrthographicCamera&&(camera.right-camera.left)/(camera.top-camera.bottom)<.75});
  sync(firePoints,fire,clock,lowMotion,camera,viewportHeight,dpr);sync(skyPoints,fireworks,clock,lowMotion,camera,viewportHeight,dpr);
  light.intensity=state?.burning?(lowMotion?1.38:1.38+.10*Math.sin(clock*2.35)+.06*Math.sin(clock*4.9)):0;
 },cancel,snapshot(){return {alive,flames:fire.count?fire.flameCount:0,embers:fire.emberCount,fireworks:fireworks.count,rockets:fireworks.rocketCount,staticTriangles:2,maxDynamicPoints:QUALITY.high.maxParticles+9+QUALITY.high.embers,drawCalls:3,pointLights:1,skyVeil:veil.mesh.visible,particleStages:{...fireworks.stats},overflow:fireworks.overflow};},dispose(){if(!alive)return;alive=false;cancel();veil.dispose();for(const p of [firePoints,skyPoints]){p.geometry.dispose();p.material.dispose();}root.removeFromParent();root.clear();}};
}
