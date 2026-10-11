import {BAKERY as B} from './layout.js';
import {CAFE_RESIDENTS} from '../village/cafe-config.js';
const GUEST_RADIUS=.52,EPS=1e-7;
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const pointDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,n=dx*dx+dz*dz,t=n?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/n)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function segmentDistance(a,b,c,d){
 const ac=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b);
 if(ac*ad<0&&ca*cb<0)return 0;
 return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
const actorRange=a=>{const minY=a.minY??a.rootY??a.y??a.supportY??a.floorY??B.floor1Y;return {minY,maxY:a.maxY??minY+(a.height??B.avatarHeight)};};
const overlap=(a,b)=>a.minY<b.maxY-EPS&&a.maxY>b.minY+EPS;
const copyOrder=o=>({...o,items:{...o.items}});

/** Transient visual safety only. This never writes cafe clocks, orders, stock or persisted data. */
export function createGuestCorridor({getOccupants=()=>[],guestRadius=GUEST_RADIUS}={}){
 let disposed=false,initialized=false,day=null,player=null;
 const identityLeases=new Map(),activityLeases=new Map();
 const leases=new Map(),queues=new Map(CAFE_RESIDENTS.map(id=>[id,[]])),records=new Map(),seen=new Set();
 function dispose(){if(disposed)return;disposed=true;activityLeases.clear();identityLeases.clear();leases.clear();records.clear();seen.clear();queues.forEach(q=>q.length=0);player=null;}
 function setPlayer(state){
  if(disposed)return;
  if(state===null){player=null;return;}
  if(!validPoint(state)||!Number.isFinite(state.rootY??state.supportY))return;
  player={from:{x:state.x,z:state.z},to:{x:state.x,z:state.z},radius:Number.isFinite(state.radius)&&state.radius>0?state.radius:.61,minY:state.rootY??state.supportY,maxY:(state.rootY??state.supportY)+B.avatarHeight};
 }
 function reserveStairHop(spec,visitor=false,activityOwner=null){
  if(disposed||!validPoint(spec?.from)||!validPoint(spec?.to)||!Number.isFinite(spec?.radius)||spec.radius<=0||!Number.isFinite(spec?.minY)||!Number.isFinite(spec?.maxY)||spec.maxY<=spec.minY)return false;
  const corridor={from:{...spec.from},to:{...spec.to},radius:spec.radius,minY:spec.minY,maxY:spec.maxY,owner:activityOwner??(visitor?spec.owner:null),visitor};
  let occupants;try{occupants=getOccupants();if(!Array.isArray(occupants))return false;}catch{return false;}
  const current=[...occupants.filter(a=>!visitor||!spec.owner||a.owner!==spec.owner),...(visitor&&player?[{...player.from,radius:player.radius,...player}]:[]),...snapshot().map(p=>({...p,radius:guestRadius}))];
  for(const actor of current){if(!validPoint(actor)||!Number.isFinite(actor.radius)||actor.radius<=0)return false;const range=actorRange(actor);if(!Number.isFinite(range.minY)||!Number.isFinite(range.maxY)||range.maxY<=range.minY)return false;if(overlap(corridor,range)&&pointDistance(actor,corridor.from,corridor.to)<corridor.radius+actor.radius+.015)return false;}
  for(const active of leases.values())if((!corridor.owner||active.owner!==corridor.owner)&&overlap(active,corridor)&&segmentDistance(active.from,active.to,corridor.from,corridor.to)<active.radius+corridor.radius)return false;
  const lease=Object.freeze({});leases.set(lease,corridor);return lease;
 }
 // One all-or-nothing ownership token for the entire seated entry, dwell and exit.
 // Segments share an internal owner, so they can overlap each other but not a guest/hop.
 function reservePlayerActivity(spec){
  if(disposed||!Array.isArray(spec?.points)||spec.points.length<2||spec.points.length>12||spec.points.some(p=>!validPoint(p))||!Number.isFinite(spec.radius)||spec.radius<=0||!Number.isFinite(spec.minY)||!Number.isFinite(spec.maxY)||spec.maxY<=spec.minY)return false;
  const owner=Object.freeze({}),segments=[];
  for(let i=1;i<spec.points.length;i++){const lease=reserveStairHop({from:spec.points[i-1],to:spec.points[i],radius:spec.radius,minY:spec.minY,maxY:spec.maxY},false,owner);if(!lease){for(const token of segments)leases.delete(token);return false;}segments.push(lease);}
  activityLeases.set(owner,segments);return owner;
 }
 function releasePlayerActivity(owner){const segments=activityLeases.get(owner);if(disposed||!segments)return false;activityLeases.delete(owner);for(const lease of segments)leases.delete(lease);return true;}
 function residentAvailable(id,cafe){return !disposed&&queues.has(id)&&![...identityLeases.values()].includes(id)&&!!cafe&&Array.isArray(cafe.orders)&&!cafe.orders.some(o=>o.residentId===id)&&queues.get(id).length===0;}
 function acquireResident(id,cafe){
  if(!residentAvailable(id,cafe))return false;
  const lease=Object.freeze({});identityLeases.set(lease,id);return lease;
 }
 function releaseResident(lease){return !disposed&&identityLeases.delete(lease);}
 function reservationCircles(predicate){return [...leases.values()].filter(predicate).flatMap(c=>{const count=Math.max(1,Math.ceil(Math.hypot(c.to.x-c.from.x,c.to.z-c.from.z)/.1));return Array.from({length:count+1},(_,i)=>({x:c.from.x+(c.to.x-c.from.x)*i/count,z:c.from.z+(c.to.z-c.from.z)*i/count,radius:c.radius,minY:c.minY,maxY:c.maxY,owner:c.owner}));});}
 function visitorReservations(){return reservationCircles(c=>c.visitor);}
 function visitorWorld(owner){let occupants;try{occupants=getOccupants();}catch{return{circles:[{x:0,z:0,radius:100,supportY:0}]};}return{circles:[...occupants.filter(a=>a.owner!==owner),...(player?[{...player.from,radius:player.radius,supportY:player.minY,minY:player.minY,maxY:player.maxY}]:[]),...reservationCircles(c=>c.owner!==owner).map(a=>({...a,supportY:a.minY}))]};}
 function releaseStairHop(lease){return !disposed&&leases.delete(lease);}
 function allowsActorMove({from,to,radius,minY,maxY}={}){
  if(disposed||!validPoint(from)||!validPoint(to)||!Number.isFinite(radius)||radius<=0||!Number.isFinite(minY)||!Number.isFinite(maxY)||maxY<=minY)return false;
  for(const c of [...leases.values(),...(player?[player]:[])])if(overlap(c,{minY,maxY})&&segmentDistance(from,to,c.from,c.to)<c.radius+radius+.015)return false;
  return true;
 }
 function allowed(from,to,record){
  const range={minY:Math.min(from.y??.04,to.y??.04),maxY:Math.max(from.y??.04,to.y??.04)+B.avatarHeight};
  if(!allowsActorMove({from,to,radius:guestRadius,...range}))return false;
  for(const q of queues.values()){const other=q[0];if(other===record||!other?.pose)continue;if(overlap(range,actorRange(other.pose))&&pointDistance(other.pose,from,to)<2*guestRadius+.015)return false;}
  return true;
 }
 function sample(poseFor,record,time,served=false){
  const p=poseFor(record.order,time,served?{served:true,departureMs:record.departureMs}:{});
  if(p!==null&&(!validPoint(p)||!Number.isFinite(p.y)))throw Error('Invalid cafe visual pose');return p&&{...p};
 }
 function ingest(cafe,poseFor){
  const all=[...cafe.orders,...cafe.settled].sort((a,b)=>a.ordinal-b.ordinal),present=new Set(all.map(o=>o.id));
  if(day!==null&&day!==cafe.day){
   // Keep every already visible actor until its exit; unstarted old-day visits never claim a model.
   for(const q of queues.values()){const keep=q[0]?.pose?q[0]:null;for(const r of q)if(r!==keep)records.delete(r.order.id);q.length=0;if(keep){q.push(keep);if(keep.order.servedMs===undefined)keep.cancelled=true;}}
   seen.clear();
  }
  day=cafe.day;
  const initialVisible=new Set();
  if(!initialized)for(const id of CAFE_RESIDENTS){const order=cafe.orders.find(o=>o.residentId===id),served=order?null:[...cafe.settled].reverse().find(o=>o.residentId===id),o=order??served;if(o){const next=cafe.settled.find(p=>p.servedMs>=o.servedMs&&p.ordinal>o.ordinal),departureMs=served?Math.max(o.servedMs+4000,Math.min(o.servedMs+12000,next?.servedMs??Infinity)):null;if(poseFor(o,cafe.activeMs,served?{served:true,departureMs}:{}))initialVisible.add(o.id);}}
  for(const order of all){
   const existing=records.get(order.id);if(existing){existing.order=copyOrder(order);continue;}
   if(seen.has(order.id)||!queues.has(order.residentId))continue;seen.add(order.id);
   if(!initialized&&!initialVisible.has(order.id))continue;
   const record={order:copyOrder(order),phase:'arrival',time:order.admittedMs,pose:null,cancelled:false,waitingForHop:false};
   // A fresh room may restore an already visible source visit. There is no existing model to jump.
   if(!initialized){record.time=Math.min(cafe.activeMs,order.shownMs);record.phase=record.time>=order.shownMs?'waiting':'arrival';if(order.servedMs!==undefined){const next=cafe.settled.find(o=>o.servedMs>=order.servedMs&&o.ordinal>order.ordinal);record.phase='served';record.time=cafe.activeMs;record.departureMs=Math.max(order.servedMs+4000,Math.min(order.servedMs+12000,next?.servedMs??Infinity));}}
   records.set(order.id,record);queues.get(order.residentId).push(record);
  }
  for(const q of queues.values())for(const record of q)if(!present.has(record.order.id)&&record.order.servedMs===undefined)record.cancelled=true;
  initialized=true;
 }
 function updateCafe({cafe,dt=0,active=false,poseFor}){
  if(disposed)return new Map();
  try{
   if(!cafe||!Array.isArray(cafe.orders)||!Array.isArray(cafe.settled)||typeof poseFor!=='function')return new Map();
   ingest(cafe,poseFor);const milliseconds=active?Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0))*1000:0;
   for(const q of queues.values()){
    const record=q[0];if(!record||[...identityLeases.values()].includes(record.order.residentId))continue;if(milliseconds>0)record.waitingForHop=false;
    if(!record.pose){if(record.phase==='arrival'&&[...queues.values()].some(q=>q[0]!==record&&q[0]?.pose&&['served','cancelled'].includes(q[0].phase))){record.waitingForHop=true;continue;}const pose=sample(poseFor,record,record.time,record.phase==='served');if(!pose||!allowed(pose,pose,record)){record.waitingForHop=true;continue;}record.pose=pose;}
    let left=milliseconds,finished=false;
    while(left>EPS){
     if(record.cancelled&&record.phase!=='served')record.phase='cancelled';
     if(record.phase==='arrival'&&record.time>=record.order.shownMs-EPS){record.phase='waiting';record.time=record.order.shownMs;}
     if(record.phase==='waiting'){
      if(record.order.servedMs===undefined)break;
      record.phase='served';record.time=record.order.servedMs;record.departureMs=record.order.servedMs+12000;
     }
     if(record.phase==='served'){
      const next=cafe.settled.find(o=>o.servedMs>=record.order.servedMs&&o.ordinal>record.order.ordinal),desired=Math.max(record.order.servedMs+4000,Math.min(record.order.servedMs+12000,next?.servedMs??Infinity));
      // An earlier seat release begins from the current pose, never from overdue absolute time.
      if(record.time<record.departureMs)record.departureMs=Math.max(record.time,Math.min(record.departureMs,desired));
     }
     const step=Math.min(10,left),end=record.phase==='served'?record.departureMs+5000:record.order.shownMs;
     const time=record.phase==='cancelled'?Math.max(record.order.admittedMs,record.time-step):Math.min(end,record.time+step);
     const next=sample(poseFor,record,record.phase==='served'&&time>=end?end-1e-6:time,record.phase==='served');
     if(!next)throw Error('Cafe visual route ended before reaching its doorway');
     if(!allowed(record.pose,next,record)){record.waitingForHop=true;break;}
     record.pose=next;record.time=time;left-=step;
     if(record.phase==='cancelled'&&time<=record.order.admittedMs||record.phase==='served'&&time>=end){finished=true;break;}
    }
    if(finished){q.shift();records.delete(record.order.id);}
   }
   return new Map(snapshot().map(p=>[p.id,p]));
  }catch(error){dispose();throw error;}
 }
 function snapshot(){
  if(disposed)return [];
  return [...queues].flatMap(([id,q])=>{const r=q[0];if(!r?.pose)return [];return [{...r.pose,id,orderId:r.order.id,seatId:r.phase==='served'?(r.pose.seatId??`bakeryCafe.chair-${r.order.slot===0?'right':'left'}`):null,radius:guestRadius,floor:'floor1',floorY:B.floor1Y,supportY:B.floor1Y,walking:r.waitingForHop?false:r.pose.walking,waitingForHop:r.waitingForHop}];});
 }
 return {setPlayer,reservePlayerActivity,releasePlayerActivity,allowsActorMove,visitorWorld,residentAvailable,acquireResident,releaseResident,visitorReservations,reserveVisitorHop:spec=>reserveStairHop(spec,true),reserveStairHop,releaseStairHop,updateCafe,snapshot,dispose,get disposed(){return disposed;}};
}
