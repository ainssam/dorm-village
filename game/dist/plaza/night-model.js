import {RESIDENT_TRACES} from './resident-firework-traces.js';
export const SHOW_DURATION=24;
export const QUALITY=Object.freeze({high:Object.freeze({seeds:104,tailSteps:14,secondary:32,facePoints:900,perBurst:104,maxParticles:8192,embers:28}),medium:Object.freeze({seeds:66,tailSteps:10,secondary:20,facePoints:520,perBurst:66,maxParticles:4608,embers:18}),low:Object.freeze({seeds:40,tailSteps:7,secondary:12,facePoints:320,perBurst:40,maxParticles:2304,embers:10})});
export const CUES=Object.freeze([
 {at:0,kind:'palm',x:-3.2,y:11.5,radius:8.2,palette:0},
 {at:2.0,kind:'peony',x:3.4,y:13.5,radius:7.5,palette:1},
 {at:4.2,kind:'willow',x:-2.7,y:13.2,radius:6.6,palette:2},
 {at:6.6,kind:'cameo',resident:'moa-playmate',x:1.8,y:13.5,radius:4.3,palette:3,life:4.4,hold:1.2},
 {at:8.5,kind:'peony',x:-4.1,y:14.5,radius:6.8,palette:4},
 {at:10.4,kind:'willow',x:4.2,y:14.8,radius:6.2,palette:0},
 {at:12.2,kind:'cameo',resident:'chinchilla',x:0,y:13.7,radius:4.5,palette:5,life:4.4,hold:1.2},
 {at:14.7,kind:'palm',x:-4.8,y:12.9,radius:4.4,palette:2},
 {at:14.95,kind:'peony',x:4.8,y:15.0,radius:4.5,palette:3},
 {at:17.0,kind:'cameo',resident:'dormi',x:0,y:14.4,radius:5.2,palette:1,life:3.9,hold:1.2},
 {at:19.25,kind:'peony',x:-5.0,y:14.8,radius:4.9,palette:4},
 {at:19.65,kind:'palm',x:5.0,y:17.7,radius:4.7,palette:0},
 {at:20.05,kind:'peony',x:0,y:20.4,radius:5.3,palette:5}
].map(Object.freeze));
export const cueOffsetX=(cue,compact=false)=>cue.x*(compact?(cue.at>=19?.42:.26):1);
export const PALETTES=Object.freeze([
 [[1,.49,.065],[1,.78,.24],[1,.26,.035]],
 [[.05,.47,1],[.18,.96,1],[.54,.24,1]],
 [[1,.13,.36],[1,.36,.65],[1,.65,.21]],
 [[.08,1,.58],[.04,.53,1],[.85,1,.31]],
 [[.59,.16,1],[1,.16,.62],[.12,.65,1]],
 [[1,.69,.12],[.13,.77,1],[1,.15,.40]]
]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x);},tier=q=>QUALITY[q]?q:'high';
export class NightTimeline{constructor(){this.active=false;this.elapsed=0;this.alive=true;}start(){if(!this.alive||this.active)return false;this.active=true;this.elapsed=0;return true;}stop(){this.active=false;this.elapsed=0;}tick(dt,{paused=false}={}){if(!this.alive||!this.active||paused||!Number.isFinite(dt)||dt<=0)return;this.elapsed+=Math.min(.1,dt);if(this.elapsed>=SHOW_DURATION-1e-8)this.stop();}snapshot(){return {active:this.active,elapsed:this.elapsed};}dispose(){if(!this.alive)return;this.stop();this.alive=false;}}
function validatePlaza(plaza){if(!plaza?.fire||!plaza?.launch||![plaza.fire.x,plaza.fire.z,plaza.launch.x,plaza.launch.z,plaza.launch.y].every(Number.isFinite))throw new TypeError('Pass the current PLAZA fire and launch config');}
/** Linear air drag plus gravity, in local right/up/depth axes. */
function ballisticInto(out,t,velocity,drag=.68,gravity=1.8){t=Math.max(0,t);const f=(1-Math.exp(-drag*t))/drag,fall=gravity/drag*(t-f);out[0]=velocity[0]*f;out[1]=velocity[1]*f-fall;out[2]=velocity[2]*f;return out;}
export function ballisticSample(t,velocity,{drag=.68,gravity=1.8}={}){return ballisticInto([0,0,0],t,velocity,drag,gravity);}
function velocityFor(cue,i,n,ci){const seed=i+ci*401,r1=hash(seed+4),r2=hash(seed+9);let a=i*2.399963229728653,y=1-2*(i+.5)/n,rad=Math.sqrt(1-y*y),speed=cue.radius*(.67+.34*r1),vx=Math.cos(a)*rad*speed,vy=y*speed,vz=Math.sin(a)*rad*speed*.38;
 if(cue.kind==='palm'){a=(i%13)/13*Math.PI*2+.10*(r2-.5);speed=cue.radius*(.67+.35*hash(Math.floor(i/13)+ci*23));vx=Math.cos(a)*speed;vy=Math.sin(a)*speed*.85+.55;vz=(r2-.5)*speed*.24;}
 if(cue.kind==='willow'){vy=Math.abs(vy)*.60+.9;vx*=1.08;}
 return [vx,vy,vz];}
export function createFireworkPool({plaza,quality='high',reduced=false}={}){validatePlaza(plaza);quality=tier(quality);const n=QUALITY[quality].maxParticles;return {plaza,quality,reduced,count:0,rocketCount:0,overflow:0,positions:new Float32Array(n*3),colors:new Float32Array(n*3),alphas:new Float32Array(n),sizes:new Float32Array(n),aspects:new Float32Array(n),phases:new Float32Array(n),modes:new Float32Array(n),sampleScratch:[0,0,0],originScratch:[0,0,0],stats:{heads:0,tails:0,secondary:0,smoke:0,cameo:0,cameoFalling:0},seeds:CUES.map((cue,ci)=>Array.from({length:QUALITY.high.seeds},(_,i)=>velocityFor(cue,i,QUALITY.high.seeds,ci)))};}
/** Fixed reusable buffers; particles have analytic ages, no timer or emitter objects survive a frame. */
export function writeFireworks(pool,time,{right=[-1,0,0],up=[0,1,0],reduced=pool.reduced,quality=pool.quality,compact=false}={}){
 pool.count=pool.rocketCount=pool.overflow=0;for(const k in pool.stats)pool.stats[k]=0;if(!Number.isFinite(time)||time<0||time>=SHOW_DURATION)return pool;
 const q=QUALITY[tier(quality)],max=Math.min(q.maxParticles,pool.alphas.length),depth=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]],launch=pool.plaza.launch,endFade=smooth((SHOW_DURATION-time)/1.2);let px=0,py=0,pz=0,layerOpacity=1;
 const focusDim=CUES.reduce((d,c)=>{if(c.kind!=='cameo')return d;const a=time-c.at-(reduced?0:1.08),focus=smooth((a-.55)/.28)*smooth((2.25-a)/.25);return Math.min(d,1-.86*focus);},1);
 const push=(x,y,z,r,g,b,alpha,size,aspect=1,phase=0,mode=1)=>{const wx=px+right[0]*x+up[0]*y+depth[0]*z,wy=py+right[1]*x+up[1]*y+depth[1]*z,wz=pz+right[2]*x+up[2]*y+depth[2]*z,a=clamp(alpha*layerOpacity*endFade*smooth((wy-1.0)/1.2));if(a<=.001)return;if(pool.count>=max){pool.overflow++;return;}const i=pool.count++,o=i*3;pool.positions[o]=wx;pool.positions[o+1]=wy;pool.positions[o+2]=wz;pool.colors[o]=r;pool.colors[o+1]=g;pool.colors[o+2]=b;pool.alphas[i]=a;pool.sizes[i]=size;pool.aspects[i]=aspect;pool.phases[i]=phase;pool.modes[i]=mode;};
 for(let ci=0;ci<CUES.length;ci++){
  const cue=CUES[ci],age=time-cue.at,rise=reduced?0:1.08,t=age-rise,life=cue.life??4.45,palette=PALETTES[cue.palette];if(age<0||t>life)continue;
  layerOpacity=cue.kind==='cameo'?1:focusDim;const cueX=cueOffsetX(cue,compact);px=launch.x+cueX;py=cue.y;pz=launch.z+1.5+(ci%3)*.65;
  if(!reduced&&age<rise){const steps=q.tailSteps*3;for(let j=0;j<steps;j++){const lag=j/steps*.48,u=clamp((age-lag)/rise);if(u<=0)continue;const yy=launch.y+(cue.y-launch.y)*(2*u-u*u)-py,xx=cueX*(u-1)+.06*Math.sin(u*18+ci)*(1-u),a=Math.pow(1-j/steps,1.1)*smooth(age/.14);push(xx,yy,0,1,.40+.5*(1-j/steps),.10+.65*(1-j/steps),a*.9,j===0?.28:.20+(1-j/steps)*.12,j===0?1:.42,Math.PI/2);pool.rocketCount++;}continue;}
  if(t<0)continue;
  if(cue.kind==='cameo'){
   const trace=RESIDENT_TRACES[cue.resident],count=Math.min(q.facePoints,trace.count),assemble=reduced?1:smooth(t/.8),fallTime=reduced?0:Math.max(0,t-2.0),fade=smooth(t/(reduced?.85:.34))*smooth((life-t)/(reduced?1.2:1.35))*(reduced?.43:.82);
   for(let i=0;i<count;i++){const o=i*3,rnd=hash(i+ci*313),a=hash(i*2+17)*Math.PI*2,spread=fallTime*.42,fall=fallTime*fallTime*.65,x=trace.positions[o]*cue.radius*assemble+Math.cos(a)*spread,y=trace.positions[o+1]*cue.radius*assemble-fall,z=trace.positions[o+2]*.15;const feature=trace.features[trace.featureTags[i]],eye=feature.toLowerCase().includes('eye')||feature==='mouth',signature=['curl','cap','stem'].includes(feature),gain=signature?3.0:1.35,r=trace.colors[o],g=trace.colors[o+1],b=trace.colors[o+2],alpha=fade*(eye?.52:.76+.22*rnd)*(trace.weights?.[i]??1),size=eye?.20:signature?.31+.05*rnd:.28+.06*rnd;
    push(x,y,z,r*(eye?.7:gain),g*(eye?.7:gain),b*(eye?.7:gain),alpha,size,1,0,3);pool.stats.cameo++;
    if(fallTime>0&&!reduced&&i%3===0){push(x-.08*Math.cos(a),y+.13+fallTime*.12,z,r,g*.83,b*.67,alpha*.5,size*.7,.35,Math.PI/2);pool.stats.cameoFalling++;}
   }
   // Golden outer sparks keep the cameo within the moving display rather than a static card.
   if(!reduced)for(let i=0;i<18;i++){const a=i/18*Math.PI*2,v=[Math.cos(a)*cue.radius*1.1,Math.sin(a)*cue.radius*1.1,.1],p=ballisticSample(t,v);push(...p,1,.58,.16,.35*smooth(t/.3)*smooth((3.7-t)/1.2),.19);pool.stats.heads++;}
   continue;
  }
  const fade=smooth(t/(reduced?.85:.13))*smooth((life-t)/(reduced?1.2:.95)),gravity=cue.kind==='willow'?2.05:1.8,drag=cue.kind==='willow'?.54:.68;
  for(let j=0;j<q.seeds;j++){
   const k=Math.floor(j*QUALITY.high.seeds/q.seeds),v=pool.seeds[ci][k],seed=k+ci*401,rnd=hash(seed+8),sparkLife=reduced?life:life*(.73+.27*hash(seed+21));if(t>=sparkLife)continue;const base=palette[Math.floor(hash(seed+19)*palette.length)],twinkle=reduced?1:.78+.22*Math.pow(Math.sin(t*7.1+seed*1.3),2),sparkFade=fade*smooth((sparkLife-t)/.8),steps=reduced?1:q.tailSteps,trailDuration=Math.min(t,1.25+.22*Math.min(t,2));
   for(let h=0;h<steps;h++){
    const lag=h/Math.max(1,steps-1)*trailDuration,tt=reduced?1.1:t-lag;if(tt<0)continue;const p=ballisticInto(pool.sampleScratch,tt,v,drag,reduced?0:gravity),tail=1-h/steps,heat=clamp(1-t/1.45)*(h===0?.58:.14),warm=clamp((t-1.5)/2.4)*(.2+.3*(1-tail)),r=base[0]*(1-warm)+warm,g=base[1]*(1-warm)+.47*warm,b=base[2]*(1-warm)+.07*warm;
    const bright=reduced?.42*fade:sparkFade*twinkle*(h===0?.98:.64*Math.pow(tail,.85));const angle=Math.atan2(v[1]*Math.exp(-drag*tt)-gravity/drag*(1-Math.exp(-drag*tt)),v[0]*Math.exp(-drag*tt));
    const speed=Math.hypot(v[0]*Math.exp(-drag*tt),v[1]*Math.exp(-drag*tt)-gravity/drag*(1-Math.exp(-drag*tt))),streakSize=Math.max(.29,speed*trailDuration/Math.max(1,steps-1)*2.8);
    push(p[0],p[1],p[2],r*(1-heat)+heat,g*(1-heat)+heat,b*(1-heat)+heat,bright,h===0?.34+.10*rnd:streakSize,h===0?1:Math.max(.05,.090/streakSize),angle,1);pool.stats[h===0?'heads':'tails']++;
   }
  }
  // Delayed small branch clusters: a second ignition, then gravity-driven short crackle trails.
  if(!reduced&&t>.75)for(let j=0;j<q.secondary;j++){
   const delay=.8+.5*hash(j+ci*107),st=t-delay;if(st<0||st>1.8)continue;const parent=pool.seeds[ci][(j*7)%QUALITY.high.seeds],origin=ballisticInto(pool.originScratch,delay,parent,drag,gravity),angle=hash(j*2+ci*13)*Math.PI*2,speed=.8+hash(j*3+2)*1.2,velocity=[Math.cos(angle)*speed,Math.sin(angle)*speed,.12],base=palette[(j+1)%palette.length];
   for(let h=0;h<Math.max(3,Math.floor(q.tailSteps/2));h++){const tt=st-h*.037;if(tt<0)continue;const p=ballisticInto(pool.sampleScratch,tt,velocity,.35,1.8),alpha=.67*(1-h/8)*smooth(st/.09)*smooth((1.8-st)/.7);push(origin[0]+p[0],origin[1]+p[1]-.25*st,origin[2]+p[2],base[0],base[1],base[2],alpha,.18,h? .35:1,angle);pool.stats.secondary++;}
  }
  // Faint drifting, cooling haze: additive smoke-like afterglow, not volumetric smoke.
  if(!reduced)for(let j=0;j<(quality==='low'?6:12);j++){
   const a=j*2.399963,r=Math.sqrt((j+.5)/12),ageFade=smooth(t/.6)*smooth((life-t)/1.6),spread=(.3+t*.60)*r;push(Math.cos(a)*spread+t*.16,Math.sin(a)*spread*.55+t*.20,0,.30,.16,.09,ageFade*.036,1.1+t*.42,1,j+ci,2);pool.stats.smoke++;
  }
 }
 return pool;
}
export function createFlamePool({plaza,quality='high',reduced=false}={}){
 validatePlaza(plaza);quality=tier(quality);const n=9+QUALITY[quality].embers;
 return {plaza,quality,reduced,count:0,flameCount:9,emberCount:0,positions:new Float32Array(n*3),colors:new Float32Array(n*3),alphas:new Float32Array(n),sizes:new Float32Array(n),aspects:new Float32Array(n),phases:new Float32Array(n),modes:new Float32Array(n)};
}
/** A fixed coherent base, independent wind-bent flame tongues, and restrained rising embers. */
export function writeFlame(pool,time,burning,{reduced=pool.reduced,quality=pool.quality,compact=false}={}){
 pool.count=0;pool.emberCount=0;if(!burning||!Number.isFinite(time))return pool;
 const t=reduced?0:time,fire=pool.plaza.fire;
 for(let i=0;i<9;i++){
  const outer=i<5,core=i>=7,a=i*2.39996,r=outer?.19:core?.045:.11,wave=Math.sin(t*(2.3+i*.19)+i*1.73),height=(outer?.9:core?.58:.76)*(1+(reduced?0:.14*wave+.06*Math.sin(t*5.2+i))),o=i*3;
  pool.positions[o]=fire.x+Math.cos(a)*r+(reduced?0:.035*Math.sin(t*2.2+i));pool.positions[o+1]=.30+height*.46;pool.positions[o+2]=fire.z+Math.sin(a)*r;
  pool.colors.set(core?[1,.94,.64]:outer?[1,.30,.025]:[1,.62,.12],o);pool.alphas[i]=core?.88:outer?.69:.83;pool.sizes[i]=height;pool.aspects[i]=core?.36:outer?.46:.44;pool.phases[i]=i*1.73;pool.modes[i]=0;pool.count++;
 }
 const embers=reduced?0:Math.min(QUALITY[tier(quality)].embers,pool.alphas.length-9);
 for(let j=0;j<embers;j++){
  const i=9+j,o=i*3,life=2.7+(j%4)*.19,age=(t+j*1.713)%life,u=age/life,a=j*2.39996;pool.positions[o]=fire.x+Math.cos(a)*.24+.16*Math.sin(t*.7+j)*u+.11*u*u;pool.positions[o+1]=.5+u*(1.55+(j%3)*.35);pool.positions[o+2]=fire.z+Math.sin(a)*.22+.08*Math.cos(t*.6+j)*u;
  pool.colors.set(j%3?[1,.59,.16]:[1,.79,.35],o);pool.alphas[i]=.58*Math.sin(Math.PI*u)*(j%3?.75:1);pool.sizes[i]=.022+(j%3)*.009;pool.aspects[i]=1;pool.phases[i]=j;pool.modes[i]=1;pool.count++;
 }
 pool.emberCount=embers;return pool;
}
