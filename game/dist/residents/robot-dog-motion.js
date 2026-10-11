/** Pure deterministic kinematics. Metres, Y up, +Z forward. No browser or network. */
export const LEG_IDS=Object.freeze(['FL','FR','RL','RR']);
export const GEOMETRY=Object.freeze({upper:.23,lower:.23,ankleHeight:.105,cycleDistance:.40,stanceFraction:.68});
const clean=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,clean(n)));
const mix=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,t)=>a.map(v=>v*t);
const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
const len=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(len(a)||1));
const rx=(a,r)=>[a[0],a[1]*Math.cos(r)-a[2]*Math.sin(r),a[1]*Math.sin(r)+a[2]*Math.cos(r)];
const ease=t=>t*t*(3-2*t);

export function solveLeg(hip,ankle,bend){
 const d=sub(ankle,hip),dist=len(d),n=unit(d),a=(GEOMETRY.upper**2-GEOMETRY.lower**2+dist**2)/(2*dist);
 if(dist>GEOMETRY.upper+GEOMETRY.lower+1e-7)throw Error(`Unreachable robot dog leg: ${dist}`);
 const axis=[0,0,bend],side=unit(sub(axis,mul(n,dot(axis,n))));
 return add(add(hip,mul(n,a)),mul(side,Math.sqrt(Math.max(0,GEOMETRY.upper**2-a*a))));
}
/** Exact support offset of the delivered rounded paw profile when a seated hind sole turns forward. */
export function pawSupport(pitch){
 const levels=[[0,.82],[.013,.95],[.075,1],[.128,.95],[.176,.7],[.20,.3],[.203,0]];let min=0;
 for(let j=0;j<levels.length;j++)for(let i=0;i<32;i++){
  const [y,r]=levels[j],a=2*Math.PI*i/32,s=Math.sin(a),height=j===2||j===3?y-.022*s:y,center=j<3?-.027:-.027+(j-2)*.013;
  const z=-center-.188*r*Math.sign(s)*Math.abs(s)**.78;min=Math.min(min,height*Math.cos(pitch)-z*Math.sin(pitch));
 }
 return -min;
}

export function sampleRobotDogPose({time=0,moving=0,walkDistance=0,seated=0,action='idle',reduced=false,quiet=false}={}){
 const calm=reduced||quiet,t=calm?0:Math.max(0,clean(time)),sit=clamp(seated,0,1),walk=reduced?0:clamp(Number(moving),0,1)*(1-sit),distance=reduced?0:clean(walkDistance);
 const phase=distance/GEOMETRY.cycleDistance,bodyPitch=-.39*sit;
 const bob=calm?0:walk>.001?.003*Math.sin(phase*Math.PI*4)*walk:.002*Math.sin(t*1.7)*(1-sit);
 const body=[0,.535-.105*sit+bob,0];
 const toBody=p=>add(body,rx(p,bodyPitch));
 const head=add(toBody([0,.28,.3]),[0,.233+.055*sit,.099+.03*sit]);
 const blink=calm?1:((t%4.8)<.16?1-.94*Math.sin(Math.PI*(t%4.8)/.16)**2:1);
 const legs={};
 for(const id of LEG_IDS){
  const side=id.endsWith('L')?-1:1,front=id.startsWith('F'),hip=toBody([side*.302,-.029,front?.278:-.333]);
  const u=((phase+({FL:0,FR:.5,RL:.5,RR:0}[id]))%1+1)%1,stance=u<=GEOMETRY.stanceFraction;
  const step=GEOMETRY.cycleDistance*GEOMETRY.stanceFraction;
  const progress=stance?u/GEOMETRY.stanceFraction:(u-GEOMETRY.stanceFraction)/(1-GEOMETRY.stanceFraction);
  const stride=stance?step*(.5-progress):step*(-.5+ease(progress));
  const lift=stance?0:.055*Math.sin(Math.PI*progress)**2;
  const pawPitch=front?0:-1.05*sit,groundHeight=lift*walk;
  const paw=[side*mix(.3322,front?.305:.443,sit),groundHeight+pawSupport(pawPitch),mix(front?.333:-.278,front?.365:.16,sit)+stride*walk];
  const ankle=add(paw,rx([0,GEOMETRY.ankleHeight,0],pawPitch));
  legs[id]={hip,knee:solveLeg(hip,ankle,front?-1:1),ankle,paw,pawPitch,groundHeight,stance:walk===0||stance};
 }
 return {body,bodyPitch,head,headPitch:-.025*sit,headYaw:calm?0:.025*Math.sin(t*.71)*(1-walk),blink,
  earRoll:calm?0:.018*Math.sin(t*1.3)+.022*Math.sin(phase*Math.PI*2)*walk,
  tail:toBody([0,.075,-.491]),tailPitch:bodyPitch,tailYaw:calm?0:Math.sin(t*(action==='wag'?7.6:2.7))*(action==='wag'?.44:.095),legs,seated:sit};
}
