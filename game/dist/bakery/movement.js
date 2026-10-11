import{BAKERY as B,TREADS}from'./layout.js';
import{createSupport,moveSupported,canOccupy}from'./surfaces.js';
import{WALK_SPEED,SPRINT_SPEED}from'../locomotion.js';
export const BAKERY_HOP=Object.freeze({arc:.114,duration:.46,dwell:.10,turnRate:3.8,sideDistance:.24,sideArc:.035,sideDuration:.28});
const smooth=t=>t*t*(3-2*t),angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const center=t=>(t.minZ+t.maxZ)/2;
const lane=(x,flight,r)=>x>=B.stair.flights[flight].minX+r-1e-7&&x<=B.stair.flights[flight].maxX-r+1e-7;
/** Current-source rigid motion. No mesh, poser, camera, DOM, persistence or automatic stair route. */
export function createBakeryMovement({position=createSupport(),yaw=B.spawn.yaw,radius=.61,hopArc=BAKERY_HOP.arc}={}){
 let p={...position},heading=yaw,rootY=p.supportY,transportY=p.supportY,hop=null,dwell=0,sequence=0,disposed=false,requiresNeutral=false,ownsPose=false,kind='walk';
 const worldOf=options=>options.ordinaryAirborne?{...options.world,allowDoorOpening:false}:options.world??{};
 function release(h){if(!h?.lease)return;const lease=h.lease;h.lease=null;try{h.release?.(lease);}catch{/* retiring movement never retains a stale lease */}}
 function snapshot(){return{x:p.x,z:p.z,rootY,yaw:heading,cameraTransportY:transportY,support:{...p},airborne:!!hop&&hop.elapsed>0,phase:hop?hop.elapsed/hop.duration:0,ownsPose,requiresNeutral,kind,dwell,sequence};}
 function gateAt(state,dx,dz,r=radius){
  if(dz<0&&state.surface==='floor1'&&lane(state.x+dx,0,r))return{z:4.95,flight:0,first:0,direction:-1};
  if(dz>0&&state.surface==='landing'&&lane(state.x+dx,1,r))return{z:-4.95,flight:1,first:10,direction:1};
  return null;
 }
 function closeToGate(){return(p.surface==='floor1'&&lane(p.x,0,radius)&&p.z<5.25)||(p.surface==='landing'&&lane(p.x,1,radius)&&p.z> -5.25);}
 function canJump(){return!disposed&&!hop&&!ownsPose&&!closeToGate()&&['floor1','floor2'].includes(p.surface);}
 function plan(toX,toZ,yaw,options,{side=false}={}){
  ownsPose=true;kind='turn';
  if(options.ordinaryAirborne){ownsPose=false;kind='wait-jump';return;}
  if(options.poseNeutral===false){requiresNeutral=true;kind='neutralize';return;}
  const diff=angle(heading,yaw);if(Math.abs(diff)>1e-5){heading+=Math.sign(diff)*Math.min(Math.abs(diff),BAKERY_HOP.turnRate*options.dt);return;}
  heading=yaw;if(dwell>0)return;
  const to=moveSupported(p,toX-p.x,toZ-p.z,radius,worldOf(options));
  if(Math.hypot(to.x-toX,to.z-toZ)>1e-6||!canOccupy(to,radius,worldOf(options))){kind='blocked';return;}
  if(Math.hypot(to.x-p.x,to.z-p.z)<.008){kind='blocked';return;}
  const arc=side?BAKERY_HOP.sideArc:hopArc;let lease=null;if(options.reserveStairHop){try{lease=options.reserveStairHop({from:{...p},to:{...to},radius,minY:Math.min(p.supportY,to.supportY),maxY:Math.max(p.supportY,to.supportY)+B.avatarHeight+arc});}catch{lease=false;}if(!lease){kind='occupied';return;}}
  hop={from:{...p},to,elapsed:0,duration:side?BAKERY_HOP.sideDuration:BAKERY_HOP.duration,arc,lease,release:options.releaseStairHop};sequence++;kind=side?'side-hop':'hop';
 }
 function flat(dx,dz,options,{cap=null}={}){
  if(cap!==null){if(dz<0&&p.z>=cap)dz=Math.max(dz,cap-p.z);if(dz>0&&p.z<=cap)dz=Math.min(dz,cap-p.z);}
  const q=moveSupported(p,dx,dz,radius,worldOf(options));
  // Free walking may traverse same-height landing seams, never a new physical riser.
  if(Math.abs(q.supportY-p.supportY)>1e-6)return;
  const moved=Math.hypot(q.x-p.x,q.z-p.z);p=q;rootY=transportY=p.supportY;kind='walk';ownsPose=false;
  if(moved>1e-6){const desired=Math.atan2(dx,dz);heading+=angle(heading,desired)*Math.min(1,options.dt*12);}
 }
 function update(dt,intent={},options={}){
  if(disposed)return snapshot();dt=clamp(Number.isFinite(dt)?dt:0,0,.05);options={...options,dt};requiresNeutral=false;
  if(hop){const h=hop;h.elapsed=Math.min(h.duration,h.elapsed+dt);const t=h.elapsed/h.duration,q=smooth(t),x=h.from.x+(h.to.x-h.from.x)*q,z=h.from.z+(h.to.z-h.from.z)*q;
   p=moveSupported(h.from,x-h.from.x,z-h.from.z,radius);transportY=t===1?h.to.supportY:h.from.supportY+(h.to.supportY-h.from.supportY)*t;rootY=transportY+4*h.arc*t*(1-t);ownsPose=true;
   if(t===1){p={...h.to};rootY=transportY=p.supportY;release(h);hop=null;dwell=BAKERY_HOP.dwell;kind='planted';}return snapshot();
  }
  dwell=Math.max(0,dwell-dt);let x=Number.isFinite(intent.x)?intent.x:0,z=Number.isFinite(intent.z)?intent.z:0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}const speed=intent.sprinting?SPRINT_SPEED:WALK_SPEED,dx=x*speed*dt,dz=z*speed*dt;rootY=transportY=p.supportY;
  ownsPose=p.surface==='stair';kind=ownsPose?'planted':'walk';
  if(Math.hypot(x,z)<1e-5)return snapshot();
  if(p.surface==='stair'){
   const t=TREADS[p.tread],cz=center(t),flatExit=(t.index===9&&z<0)||(t.index===19&&z>0),flatEntry=(t.index===9&&p.z<cz-1e-7)||(t.index===19&&p.z>cz+1e-7);
   if(flatExit){flat(dx,dz,options);return snapshot();}
   if(flatEntry){flat(dx,dz,options,{cap:cz});return snapshot();}
   // Every live entry reaches a full-foot row continuously before any riser hop.
   if(Math.abs(p.z-cz)>1e-5){kind='blocked';return snapshot();}
   if(Math.abs(z)>=Math.abs(x)*.65&&Math.abs(z)>.02){const sign=Math.sign(z);plan(p.x,cz+sign*.9,sign>0?0:Math.PI,options);}
   else if(Math.abs(x)>.02){const f=B.stair.flights[t.flight],tx=clamp(p.x+Math.sign(x)*BAKERY_HOP.sideDistance,f.minX+radius,f.maxX-radius);plan(tx,cz,x>0?Math.PI/2:-Math.PI/2,options,{side:true});}
   return snapshot();
  }
  const gate=gateAt(p,dx,dz);
  if(gate){const at=Math.abs(p.z-gate.z)<1e-6;if(at&&Math.abs(z)>=Math.abs(x)*.65){plan(p.x,center(TREADS[gate.first]),gate.direction>0?0:Math.PI,options);return snapshot();}flat(dx,dz,options,{cap:gate.z});return snapshot();}
  // Descending approaches remain on one continuous plane through the last tread.
  const cap=p.surface==='floor2'&&z<0&&lane(p.x+dx,1,radius)?center(TREADS[19]):p.surface==='landing'&&z>0&&lane(p.x+dx,0,radius)?center(TREADS[9]):null;
  flat(dx,dz,options,{cap});return snapshot();
 }
 function reset(position,yaw=heading){if(disposed)return false;release(hop);p={...position};heading=yaw;rootY=transportY=p.supportY;hop=null;dwell=0;requiresNeutral=false;ownsPose=false;kind='walk';return true;}
 function abort(){if(disposed)return snapshot();if(hop){release(hop);p={...hop.from};rootY=transportY=p.supportY;hop=null;dwell=0;}requiresNeutral=false;ownsPose=p.surface==='stair';kind=ownsPose?'planted':'walk';return snapshot();}
 return{update,snapshot,canJump,reset,abort,dispose(){if(disposed)return;disposed=true;release(hop);hop=null;},get disposed(){return disposed;}};
}
