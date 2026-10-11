import * as THREE from 'three';
/** A view-local sky treatment, never a mutation of scene.background/weather/lights. */
export function createShowSkyVeil(root){
 const geometry=new THREE.PlaneGeometry(2,2),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){vec3 zenith=vec3(.008,.013,.037),horizon=vec3(.022,.034,.073);vec3 c=mix(horizon,zenith,smoothstep(.15,1.,vUv.y));gl_FragColor=vec4(c,opacity);}' });
 const mesh=new THREE.Mesh(geometry,material);mesh.name='plaza.show-sky-veil';mesh.frustumCulled=false;mesh.renderOrder=-1000;mesh.visible=false;root.add(mesh);let alive=true,wasActive=false,exitClock=null,exitOpacity=0,prepareClock=null,preparedOpacity=0;
 const ease=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
 /** Presentation preparation never starts or advances the particle timeline. */
 return {mesh,update(elapsed,duration=24,{clock=0,showPreparing=false,showSkyReady=false}={}){
  if(!alive)return;
  const now=Number.isFinite(clock)?clock:0,particlesActive=Number.isFinite(elapsed)&&elapsed>=0&&elapsed<duration,active=!!showPreparing||particlesActive;
  if(active){
   exitClock=null;
   if(showPreparing&&prepareClock===null)prepareClock=now;
   if(showSkyReady)preparedOpacity=.965;
   const envelope=prepareClock===null?elapsed:Math.max(0,now-prepareClock);
   material.uniforms.opacity.value=Math.max(preparedOpacity,.965*ease(envelope/.9));
   // Carry the prewarmed level through the first real elapsed0, even if entry is paused.
   if(showPreparing)preparedOpacity=material.uniforms.opacity.value;
  }else{
   if(wasActive){exitClock=now;exitOpacity=material.uniforms.opacity.value;prepareClock=null;preparedOpacity=0;}
   material.uniforms.opacity.value=exitClock===null?0:exitOpacity*(1-ease((now-exitClock)/.8));
  }
  wasActive=active;mesh.visible=material.uniforms.opacity.value>.0001;geometry.setDrawRange(0,mesh.visible?6:0);
 },cancel(){wasActive=false;exitClock=null;exitOpacity=0;prepareClock=null;preparedOpacity=0;material.uniforms.opacity.value=0;mesh.visible=false;geometry.setDrawRange(0,0);},dispose(){if(!alive)return;alive=false;mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
