// Pure, bounded fishing simulation. No clock, DOM, storage or inventory writes here.
export const FISH=Object.freeze({
 'petal-minnow':{label:'꽃잎 송사리',habitat:'pond',color:'#e9a29f',fin:'#b96787',shape:'slender',length:14},
 'moon-carp':{label:'달빛 붕어',habitat:'pond',color:'#efce7b',fin:'#b98d58',shape:'round',length:23},
 'ribbon-mackerel':{label:'리본 고등어',habitat:'sea',color:'#88bbc9',fin:'#486f9e',shape:'striped',length:28},
 'star-bream':{label:'별빛 도미',habitat:'sea',color:'#e5a681',fin:'#bd7168',shape:'tall',length:21}
});
export const HABITATS=Object.freeze({pond:{label:'연못 낚시',roomId:'park'},sea:{label:'바닷가 낚시',roomId:'courtyard'}});
export const FISHING_POOLS=Object.freeze({pond:[['petal-minnow',4],['moon-carp',1]],pondNorth:[['petal-minnow',1],['moon-carp',4]],sea:[['ribbon-mackerel',4],['star-bream',1]],seaNorth:[['ribbon-mackerel',1],['star-bream',4]]});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function initialFishing(habitat,{seed=.5,expectedTotal=0,spotId=habitat}={}){if(!Object.hasOwn(HABITATS,habitat))throw Error('Unknown fishing habitat');seed=Number.isFinite(seed)?clamp(seed,0,.999999):.5;const pool=FISHING_POOLS[spotId];if(!pool||pool.some(([id])=>FISH[id].habitat!==habitat))throw Error('Unknown fishing place');let choice=seed*pool.reduce((n,[,w])=>n+w,0),fishId=pool.at(-1)[0];for(const [id,w]of pool){choice-=w;if(choice<0){fishId=id;break;}}return {habitat,spotId,fishId,expectedTotal,phase:'ready',elapsed:0,clock:0,power:0,castPower:0,tension:.3,progress:0,slack:0,reason:null,wait:2.2+seed*2.6};}
export function stepFishing(s,a){
 if(a.type==='CANCEL')return {...s,phase:'cancelled'};
 if(['cancelled','caught','escaped'].includes(s.phase))return s;
 if(a.type==='PRESS'){
  if(s.phase==='ready')return {...s,phase:'charging',elapsed:0};
  if(s.phase==='waiting')return {...s,phase:'escaped',reason:'early',elapsed:0};
  if(s.phase==='bite')return {...s,phase:'reeling',elapsed:0,tension:.3,progress:0,slack:0};
  return s;
 }
 if(a.type==='RELEASE'&&s.phase==='charging')return {...s,phase:'casting',elapsed:0,castPower:Math.max(.16,s.power)};
 if(a.type!=='TICK'||!Number.isFinite(a.dt)||a.dt<=0)return s;
 const dt=Math.min(.05,a.dt),elapsed=s.elapsed+dt,clock=s.clock+dt,n={...s,elapsed,clock};
 if(s.phase==='charging')return {...n,power:.15+.85*(.5-.5*Math.cos(elapsed*Math.PI/1.15))};
 if(s.phase==='casting'&&elapsed>=.8)return {...n,phase:'waiting',elapsed:0};
 if(s.phase==='waiting'&&elapsed>=s.wait)return {...n,phase:'bite',elapsed:0};
 if(s.phase==='bite'&&elapsed>=3)return {...n,phase:'escaped',reason:'missed',elapsed:0};
 if(s.phase==='reeling'){
  const pull=.5+.5*Math.sin(elapsed*2.25),tension=clamp(s.tension+dt*(a.hold?.24+pull*.18:-.45));
  const progress=clamp(s.progress+dt*(a.hold?.155:-.025));
  const slack=tension<.055?s.slack+dt:0;
  if(tension>=.995)return {...n,tension,progress,phase:'escaped',reason:'tension',elapsed:0};
  if(slack>3||elapsed>35)return {...n,tension,progress,phase:'escaped',reason:'slack',elapsed:0};
  return {...n,tension,progress,slack,...(progress>=1?{phase:'landing',elapsed:0}: {})};
 }
 if(s.phase==='landing'&&elapsed>=1.1)return {...n,phase:'caught',elapsed:0};
 return n;
}
export function catchAction(s){return s?.phase==='caught'?{type:'CATCH_FISH',fishId:s.fishId,habitat:s.habitat,spotId:s.spotId,expectedTotal:s.expectedTotal}:null;}
