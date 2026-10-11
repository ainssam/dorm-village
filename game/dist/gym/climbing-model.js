import {CLIMBING_STEPS,climbHold,climbingReadyFrame} from './climbing-layout.js';
const DT=1/120,MOVE=84,SETTLE=12,copy=x=>structuredClone(x),smooth=t=>t*t*(3-2*t),modes=['easy','hold','manual'];
// The graph, intent and measured contact use one host-owned fixed-step clock.
export function createClimbingModel(options={}){
 let mode=modes.includes(options.mode)?options.mode:'manual',state='idle',paused=false,held=false,completed=0,frame=climbingReadyFrame(),op=null,history=[],accumulator=0,elapsed=0,blocked=false,stopReason='';
 const choices=()=>state==='active'&&!paused&&!op?(CLIMBING_STEPS[completed]?.ids??[]).filter(id=>completed!==4||id!==frame.contacts.leftHand.hold).map(id=>({id,label:climbHold(id).label})):[];
 function snapshot(){return{mode,state,paused,held,completed,elapsed:elapsed*DT,blocked,stopReason,moving:op?.limb??null,target:op?.target.hold??null,choices:choices(),frame:copy(frame)};}
 function clear(){held=false;accumulator=0;}
 function begin(limb,target,reverse=false){op={limb,from:copy(frame.contacts[limb]),target:copy(target),root:copy(frame.root),ticks:0,settled:0,reverse};blocked=false;}
 function choose(id){if(!choices().some(h=>h.id===id))return snapshot();const limb=CLIMBING_STEPS[completed].limb;begin(limb,{...climbHold(id),hold:id,supported:true});return snapshot();}
 function rootTarget(){const feet=['leftFoot','rightFoot'].map(k=>k===op.limb?op.target:frame.contacts[k]),right=op.limb==='rightHand'?op.target:frame.contacts.rightHand;
  // Keep the last high reach outward of the original shoulder: shift weight
  // 6 cm toward the planted left sole instead of folding the shoulder inward.
  // The same endpoint rule reverses that stance before the next transfer.
  return{x:(feet[0].x+feet[1].x)/2-(right.hold==='right-finish'?.06:0),y:(feet[0].y+feet[1].y)/2,z:(feet[0].z+feet[1].z)/2};}
 function valid(proof){return proof&&proof.wallClearance>.08&&Object.entries(frame.contacts).every(([limb,c])=>{if(!c.supported)return true;const p=proof.contacts?.[limb];return p&&Number.isFinite(p.gap)&&Math.abs(p.gap)<.001&&p.vertices>=1;});}
 function step(probe){elapsed++;if(!op){if(state==='stopping'){const prev=history.pop();if(!prev){state='stopped';return;}begin(prev.limb,prev.from,true);}else if(mode==='easy'||mode==='hold'&&held)choose(choices()[0]?.id);}
  if(!op)return;op.ticks=Math.min(MOVE,op.ticks+1);const t=op.ticks/MOVE,u=smooth(t),c=frame.contacts[op.limb],end=rootTarget();for(const a of['x','y','z']){c[a]=op.from[a]+(op.target[a]-op.from[a])*u;frame.root[a]=op.root[a]+(end[a]-op.root[a])*u;}if(op.limb.endsWith('Hand'))c.z-=.09*Math.sin(Math.PI*t);else c.y+=.07*Math.sin(Math.PI*t);c.supported=t===1;c.hold=t===1?op.target.hold:op.from.hold;
  const evidence=probe?.(copy(frame));if(t<1)return;if(!valid(evidence)){blocked=true;op.settled=0;return;}blocked=false;op.settled++;if(op.settled<SETTLE)return;
  frame.contacts[op.limb]=copy(op.target);if(!op.reverse){history.push({limb:op.limb,from:op.from});completed++;}op=null;if(state==='active'&&completed===CLIMBING_STEPS.length){state='complete';clear();}
 }
 function stop(reason='exit'){if(['disposed','stopped'].includes(state))return snapshot();if(state!=='stopping'){state='stopping';stopReason=reason;clear();if(op){const limb=op.limb,target=op.from;begin(limb,target,true);}}return snapshot();}
 return{snapshot,choose,ready(){if(state==='idle')state='ready';return snapshot();},start(){if(!paused&&['ready','stopped'].includes(state)){clear();state='active';completed=0;elapsed=0;frame=climbingReadyFrame();op=null;history=[];blocked=false;}return snapshot();},setMode(v){if(!paused&&['idle','ready','stopped'].includes(state)&&modes.includes(v)){mode=v;clear();}return snapshot();},setInput(i){if(!paused&&state==='active'&&typeof i?.held==='boolean')held=i.held;return snapshot();},stop,update(dt,probe){if(paused||!['active','stopping'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);while(n--&&['active','stopping'].includes(state))step(probe);return snapshot();},pause(){paused=true;clear();return snapshot();},resume(){paused=false;clear();return snapshot();},dispose(){clear();paused=true;state='disposed';}};
}
