import {COASTER_TRACK,sampleCoasterTrack,placeCoasterLocal} from './coaster-track.js';
import {COASTER as C} from './coaster-layout.js';
import {coasterWalkY,coasterPoseBottom} from './coaster-support.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function coasterBoardFrame(from,time,out={}){const t=clamp(time,0,C.boardDuration),base=C.railY+C.railRadius;out.x=C.dock.x;out.y=C.rootY+base;out.z=C.dock.z;out.yaw=out.pitch=out.roll=0;out.pose=1;out.carX=C.dock.x;out.carZ=C.dock.z;out.carYaw=out.carPitch=out.carRoll=0;out.carY=base;out.coasterBridge=out.coasterGate=1;out.distance=0;
 if(t<.8){const q=ease(t/.8);out.x=from.x+(C.dock.x-from.x)*q;out.y=(from.y??.05)+(.05-(from.y??.05))*q;out.z=from.z+(C.dock.z+3.05-from.z)*q;out.yaw=from.yaw+delta(from.yaw,Math.PI)*q;out.pose=0;}
 else if(t<2.8){const z=3.05-2.3*ease((t-.8)/2);out.y=coasterWalkY(z)+base;out.z=C.dock.z+z;out.yaw=Math.PI;out.pose=0;}
 else if(t<3.6){out.y=C.seatTop+base;out.z=C.dock.z+.75;out.yaw=Math.PI*(1-ease((t-2.8)/.8));out.pose=0;}
 else if(t<4.4){out.pose=ease((t-3.6)/.8);out.y=C.seatTop+base-coasterPoseBottom(out.pose);out.z=C.dock.z+.75;}
 else if(t<5.4)out.z=C.dock.z+.75*(1-ease(t-4.4));
 return out;
}
const STEP=1/120,EPS=1e-9,RESUME=.8;
/** The existing ActivitySession supplies all time and owns the original actor. */
export class CoasterRide{
 constructor(activity,from,{reduced=false}={}){this.activity={...activity,exit:{...activity.exit}};this.from={...from};this.returnFrom={...activity.exit,y:from.y??.05};this.phase='entering';this.state='boarding';this.elapsed=0;this.activeTime=0;this.distance=0;this.speed=0;this.paused=false;this.exitRequested=false;this.done=false;this.reduced=!!reduced;this.reducedConfigured=false;this.completedLaps=0;this.accumulator=0;this.resumeElapsed=RESUME;this.lapTime=0;this.lapDuration=this.reduced?C.reducedLapDuration:C.lapDuration;this.reverseTime=C.boardDuration;this.dismountFrom=this.returnFrom;this.reverseSeal=0;this.frame={};this.pathFrame={};this.point={};}
 setReduced(value){value=!!value;if(!this.reducedConfigured){this.reducedConfigured=true;this.reduced=value;return;}if(this.reduced!==value){this.reduced=value;this.pause();}}
 pause(){if(this.done)return false;this.paused=true;this.accumulator=0;return true;}
 resume(){if(this.done)return false;if(this.paused){this.paused=false;this.accumulator=0;this.resumeElapsed=0;}return true;}
 startLap(){if(this.done||this.paused||this.exitRequested||this.state!=='station')return false;this.state='sealing';this.phase='active';this.lapDuration=this.reduced?C.reducedLapDuration:C.lapDuration;this.elapsed=this.lapTime=this.distance=this.speed=0;this.resumeElapsed=RESUME;return true;}
 beginDismount(time=C.boardDuration,from=this.returnFrom){this.reverseTime=time;this.dismountFrom=from;this.state='dismount';this.phase='exiting';this.elapsed=0;this.speed=0;}
 requestExit(){if(this.done||this.exitRequested)return false;this.exitRequested=true;if(this.state==='boarding'){this.activity.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};this.beginDismount(this.elapsed,this.from);}else if(this.state==='station')this.beginDismount();else if(this.state==='sealing'){this.reverseSeal=this.elapsed;this.state='unsealing';this.elapsed=0;this.phase='exiting';}else this.phase='exiting';return true;}
 update(dt){if(this.done||this.paused||!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,.1);while(this.accumulator>=STEP-1e-10){this.accumulator=Math.max(0,this.accumulator-STEP);this.advance(STEP);if(this.done)break;}}
 advance(step){let dt=step;if(this.resumeElapsed<RESUME){this.resumeElapsed=Math.min(RESUME,this.resumeElapsed+step);dt*=ease(this.resumeElapsed/RESUME);}this.elapsed+=dt;if(this.state!=='boarding')this.activeTime+=dt;
  if(this.state==='boarding'){if(this.elapsed>=C.boardDuration-EPS){this.state='station';this.phase='active';this.elapsed=0;}return;}
  if(this.state==='station')return;
  if(this.state==='dismount'){if(this.elapsed>=this.reverseTime-EPS){this.elapsed=this.reverseTime;this.done=true;this.phase='idle';this.state='idle';}return;}
  if(this.state==='unsealing'){if(this.elapsed>=this.reverseSeal-EPS)this.beginDismount();return;}
  if(this.state==='sealing'){if(this.elapsed>=C.sealDuration-EPS){this.state='lap';this.elapsed=this.lapTime=0;}return;}
  if(this.state==='lap'){const duration=this.lapDuration;if(this.reduced&&duration<C.reducedLapDuration)dt*=duration/C.reducedLapDuration;this.lapTime=Math.min(duration,this.lapTime+dt);const t=this.lapTime/duration;this.distance=COASTER_TRACK.length*ease(t);this.speed=COASTER_TRACK.length*30*t*t*(1-t)*(1-t)/duration*(dt/step);if(this.lapTime>=duration-EPS){this.distance=COASTER_TRACK.length;this.speed=0;this.completedLaps++;this.state='opening';this.elapsed=0;}return;}
  if(this.state==='opening'&&this.elapsed>=C.openDuration-EPS){if(this.exitRequested)this.beginDismount();else{this.state='station';this.phase='active';this.elapsed=0;}}
 }
 sample(){const f=this.frame;if(this.state==='boarding')return coasterBoardFrame(this.from,this.elapsed,f);if(this.state==='dismount'||this.state==='idle'){coasterBoardFrame(this.dismountFrom,Math.max(0,this.reverseTime-this.elapsed),f);f.distance=this.distance;return f;}
  const p=sampleCoasterTrack(this.distance,this.pathFrame);p.y+=C.railRadius;placeCoasterLocal(p,0,C.rootY,0,this.point);f.x=this.point.x;f.y=this.point.y;f.z=this.point.z;f.yaw=f.carYaw=p.yaw;f.pitch=f.carPitch=p.pitch;f.roll=f.carRoll=0;f.carX=p.x;f.carY=p.y;f.carZ=p.z;f.pose=1;f.distance=this.distance;
  let bridge=0,gate=0;if(this.state==='station'){bridge=gate=1;}else if(this.state==='sealing'||this.state==='unsealing'){const t=(this.state==='sealing'?this.elapsed:Math.max(0,this.reverseSeal-this.elapsed))/C.sealDuration;bridge=1-ease(t*2);gate=1-ease(t*2-1);}else if(this.state==='opening'){const t=this.elapsed/C.openDuration;gate=ease(t*2);bridge=ease(t*2-1);}f.coasterBridge=bridge;f.coasterGate=gate;return f;
 }
 cancel(){if(this.done)return this.activity.exit;if(this.state==='boarding')this.activity.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};this.done=true;this.phase=this.state='idle';this.speed=this.accumulator=0;return this.activity.exit;}
}
