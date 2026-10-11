import {FOOD_DRINK_IDS} from '../state/food-catalog.js';
import {createTeaRoute} from './tea-route.js';
import {TEA_SEAT} from './tea-layout.js';
/** No save state, DOM, clock, reward, business order, or shared pose ownership. */
export function createTeaTimeController({getRoom=()=>null,getSceneEpoch=()=>0,acquireResident=()=>false,reserveSeat=()=>false,adapters={},isResidentAvailable=()=>true,getPlayerSeat=()=>null,route={create:createTeaRoute},armConsumption=()=>false,onChange=()=>{}}={}){
 let session=null,disposed=false,serial=0;
 const seatId=a=>a?.target?.id??a?.id;
 const current=s=>!disposed&&session===s&&s.epoch===getSceneEpoch()&&getRoom()==='bakeryCafe';
 const safe=f=>{try{return f?.();}catch{return undefined;}};
 const notify=()=>safe(()=>onChange(snapshot()));
 const closeShare=sh=>{if(sh&&!sh.closed){sh.closed=true;safe(()=>sh.command.cancel?.());}};
 function cleanup(s){if(!s||s.retired)return;s.retired=true;closeShare(s.sharing);safe(()=>s.route?.dispose());if(s.actor)safe(()=>s.adapter.dispose(s.actor));s.actor=null;safe(s.releaseSeat);safe(s.releaseIdentity);if(session===s)session=null;notify();}
 function invite(id){if(disposed||getRoom()!=='bakeryCafe'||!Object.hasOwn(adapters,id))return false;if(session)return session.id===id&&!session.leaving?session.public:false;
  const releaseIdentity=acquireResident(id);if(!releaseIdentity)return false;const releaseSeat=reserveSeat(TEA_SEAT.id);if(!releaseSeat){releaseIdentity();return false;}
  const s={id,epoch:getSceneEpoch(),token:Object.freeze({visit:++serial}),adapter:adapters[id],phase:'loading',releaseIdentity,releaseSeat,actor:null,route:null,sharing:null,retired:false,leaving:false};session=s;
  const ready=Promise.resolve().then(()=>s.adapter.load()).then(actor=>{if(!current(s)){s.adapter.dispose(actor);return false;}s.actor=actor;s.route=route.create({radius:s.adapter.radius,owner:s.token});s.phase='arriving';s.adapter.pose(actor,s.route.snapshot());notify();return true;}).catch(error=>{s.error=String(error?.message??error);cleanup(s);return false;});
  s.public=Object.freeze({token:s.token,ready,residentId:id});notify();return s.public;
 }
 function cancel(reason='leave'){const s=session;if(!s)return false;if(s.leaving&&reason==='leave')return false;if(s.phase==='loading'||['travel','dispose','pagehide','scene-change','failed'].includes(reason)){cleanup(s);return true;}s.leaving=true;s.phase='leaving';if(s.sharing){closeShare(s.sharing);s.sharing.returning={sip:s.sharing.sip??0,reach:s.sharing.reach??0,elapsed:0};}else s.route.leave();notify();return true;}
 function share(itemId){const s=session;if(!s||!current(s)||s.phase!=='seated'||s.sharing||!s.adapter.canSip||!FOOD_DRINK_IDS.includes(itemId)||seatId(getPlayerSeat())!==TEA_SEAT.playerSeatId)return false;const playerToken=getPlayerSeat()?.token;if(playerToken===null||playerToken===undefined)return false;const sameSeat=()=>{const a=getPlayerSeat();return seatId(a)===TEA_SEAT.playerSeatId&&a?.token===playerToken;};const command=armConsumption(itemId,{recipientToken:s.token,isCurrent:()=>current(s)&&!s.leaving&&s.phase==='seated'&&sameSeat()});if(!command)return false;s.sharing={itemId,command,sameSeat,time:0,contacted:false,committed:false};notify();return true;}
 function advance(dt,{paused=false,reducedMotion=false}={}){const s=session;if(!s)return;if(!current(s)){cleanup(s);return;}if(paused||s.phase==='loading')return;dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));const p=s.route.update(dt);if(p.done){cleanup(s);return;}if(s.sharing&&!s.sharing.returning&&!s.sharing.sameSeat()){closeShare(s.sharing);s.sharing.returning={sip:s.sharing.sip??0,reach:s.sharing.reach??0,elapsed:0};}
  const before=s.phase;s.phase=s.leaving?'leaving':p.seated?'seated':p.seating?'seating':'arriving';let sip=0;
  let reach=0;
  if(s.sharing?.returning){const sh=s.sharing,r=sh.returning;r.elapsed=Math.min(.8,r.elapsed+dt);sip=r.sip*(1-r.elapsed/.8);reach=r.reach*(1-r.elapsed/.8);if(r.elapsed===.8){s.sharing=null;if(s.leaving)s.route.leave();notify();}}
  else if(s.sharing){const sh=s.sharing;sh.time+=dt;const reachAt=reducedMotion ? .2 : .55,contactAt=reducedMotion ? .7 : 1.6,hold=.3,returnEnd=contactAt+hold+(contactAt-reachAt),duration=returnEnd+reachAt;reach=Math.min(1,sh.time/reachAt);sip=Math.max(0,Math.min(1,(sh.time-reachAt)/(contactAt-reachAt)));
   if(sh.time>=contactAt&&!sh.contacted){sh.contacted=true;sh.committed=sh.command.contact()===true;if(!sh.committed){closeShare(sh);s.sharing=null;sip=reach=0;notify();}}
   if(sh.time>contactAt+hold)sip=Math.max(0,1-(sh.time-contactAt-hold)/(contactAt-reachAt));if(sh.time>returnEnd)reach=Math.max(0,1-(sh.time-returnEnd)/reachAt);
   sh.sip=sip;sh.reach=reach;
   if(s.sharing&&sh.time>=duration){closeShare(sh);s.sharing=null;sip=reach=0;notify();}}

  s.adapter.pose(s.actor,{...p,sip,reach,sharing:!!s.sharing,itemId:s.sharing?.itemId,reducedMotion});if(before!==s.phase)notify();
 }
 function tick(dt,options){try{advance(dt,options);}catch{cleanup(session);}}
 function snapshot(){const s=session;return s?{phase:s.phase,residentId:s.id,token:s.token,seatId:TEA_SEAT.id,sharing:!!s.sharing,shareItem:s.sharing?.itemId??null,pose:s.route?.snapshot()??null}:{phase:'idle',residentId:null,seatId:null,sharing:false,pose:null};}
 return{invite,cancel,share,tick,snapshot,refreshVisibility(){if(session?.actor)session.adapter.visibility?.(session.actor,session.route?.snapshot());},roster:()=>Object.entries(adapters).map(([id,a])=>({id,label:a.label??id,available:!session&&isResidentAvailable(id)})),get active(){return!!session;},dispose(){if(disposed)return;cleanup(session);disposed=true;}};
}
