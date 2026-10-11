import {ResidentCourtesy} from '../residents/resident-courtesy.js';
import {ActivitySession} from '../activities.js';import {PLAZA} from './layout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
/** Courtyard-only visits by approved identities. Each live visitor owns one seat.
 * The caller owns model instances; no models are cloned or teleported here. */
export class PlazaGuests{
 constructor(room){this.room=room;this.courtesy=new ResidentCourtesy(room);this.gathering=false;this.alive=true;this.playerSeat=false;this.residents=PLAZA.visitors.map(v=>({id:v.id,spec:{id:v.id,radius:v.radius,speed:.72,path:[v.home]},...v.home,y:.05,yaw:0,seatId:v.seatId,phase:'idle',pose:0,moving:false,distance:0,route:null,retry:0,session:new ActivitySession()}));}
 setGathering(value){this.gathering=!!value;if(!this.gathering)for(const r of this.residents){r.route=null;if(r.session.active)r.session.requestExit();}}
 claimPlayerSeat(id){if(!this.alive||id!==PLAZA.seats[0].id||this.playerSeat)return false;this.playerSeat=true;return true;}
 releasePlayerSeat(){this.playerSeat=false;}
 collisionCircles(){return this.alive?this.residents.map(r=>({x:r.x,z:r.z,radius:r.spec.radius,avoidSlide:r.phase==='walking'})):[];}
 tick(dt,player,{paused=false,activeIds=null}={}){if(!this.alive||paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);this.courtesy.observe(dt,player);
  const present=activeIds?this.residents.filter(r=>activeIds.has(r.id)):this.residents;
  for(const r of this.residents){r.moving=false;if(activeIds&&!activeIds.has(r.id))continue;const seat=PLAZA.seats.find(s=>s.id===r.seatId),home=r.spec.path[0];
   if(r.session.active){const previous={elapsed:r.session.elapsed,activeTime:r.session.activeTime,state:r.session.state,active:r.session.active,finished:r.session.finished};r.session.update(dt);const p=r.session.sample();if(p){const clear=other=>{const d0=distance(r,other),dx=p.x-r.x,dz=p.z-r.z,len=dx*dx+dz*dz,u=len?Math.max(0,Math.min(1,((other.x-r.x)*dx+(other.z-r.z)*dz)/len)):0,minimum=Math.hypot(r.x+dx*u-other.x,r.z+dz*u-other.z);return minimum>=Math.min(r.spec.radius+(other.spec?.radius??other.radius??.66)+.04,d0)-1e-7;};if((player&&!clear(player))||present.some(o=>o!==r&&!clear(o))){Object.assign(r.session,previous);continue;}Object.assign(r,p);r.phase=r.session.state==='active'?'seated':r.session.state;continue;}Object.assign(r,{...seat.at,y:.05,pose:0});r.route=null;r.phase='walking';}
   if(this.gathering&&r.phase==='seated')continue;const target=this.gathering?seat.at:home;
   if(distance(r,target)<.015){r.route=null;r.phase=this.gathering?'entering':'idle';if(this.gathering)r.session.start({...seat,enterDuration:2.4},r);continue;}
   if(!this.gathering&&r.phase==='idle')continue;r.phase='walking';r.retry=Math.max(0,r.retry-dt);
   if(!r.route?.length&&r.retry===0){r.route=this.courtesy.route(r,present,player,{actor:player??{x:0,z:0,radius:.66},heading:{x:0,z:1}},target);r.retry=.8;}
   if(!r.route?.length)continue;const next=r.route[0],d=distance(r,next);if(d<.01){r.route.shift();continue;}const heading=Math.atan2(next.x-r.x,next.z-r.z),turn=angle(heading,r.yaw);r.yaw+=Math.max(-2*dt,Math.min(2*dt,turn));if(Math.abs(angle(heading,r.yaw))>.13)continue;const step=Math.min(d,.72*dt),p={x:r.x+(next.x-r.x)*step/d,z:r.z+(next.z-r.z)*step/d};if(!this.courtesy.segment(r,r,p,present,player)){r.route=null;r.retry=.5;continue;}r.x=p.x;r.z=p.z;r.distance+=step;r.moving=true;r.y=.05;r.pose=0;
  }
 }
 snapshot(){return this.residents.map(({id,x,y,z,yaw,pose,moving,distance,phase,seatId})=>({id,x,y,z,yaw,pose,moving,distance,phase,seatId}));}
 dispose(){if(!this.alive)return;this.alive=false;for(const r of this.residents)r.session.cancel();this.playerSeat=false;}
}
