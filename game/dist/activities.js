import {KartRaceRide} from './amusement/kart-ride.js';
import {CoasterRide} from './amusement/coaster-ride.js';
import {BumperRide} from './amusement/bumper-ride.js';
import {CarouselRide,VikingRide} from './amusement/ride.js';
import {campBedEntry} from './plaza/bed-pose.js';
import {rockingTransform} from './school/principal-office-layout.js';
import {pullupExerciseFrame,climbExerciseFrame,CLIMB_DURATION} from './school/sports-equipment.js';
import {SWING,SEESAW,SLIDE,DORMI_SEAT_CONTACT} from './world/playground-layout.js';
const smooth=t=>t*t*(3-2*t);
export const activityFloorY=a=>a?.floorY??.05;
export const activityExit=a=>({...a.exit,y:a.exit?.y??activityFloorY(a),pitch:0,roll:0});
const seatStartExit=(a,from)=>({x:from.x,z:from.z,yaw:from.yaw,...(a.floorY!==undefined?{y:from.y}: {})});
export function activityTransform(a,time=0,reduced=false,swingWeight=1){
 const p={...a.anchor,pitch:a.anchor.pitch??0,roll:0};
 if(a.rocking)return rockingTransform(a.anchor,a.rocking,reduced?0:Math.sin(time*1.35)*.065*smooth(Math.min(time/1.3,1))*swingWeight);
 if(a.kind==='pullup'){const q=reduced?0:(1-Math.cos(time*Math.PI*2/3))/2;return {...pullupExerciseFrame(q).root,poseTime:q,pitch:0,roll:0};}
 if(a.kind==='run'){const theta=-.98+Math.min(time/18,1)*Math.PI*2;p.x=Math.sin(theta)*7.7;p.z=Math.cos(theta)*5.5;p.y=.05+(reduced?0:Math.abs(Math.sin(time*11))*.045);p.yaw=Math.atan2(Math.cos(theta)*7.7,-Math.sin(theta)*5.5);}
 if(a.kind==='balance'&&!reduced)p.roll=Math.sin(time*2)*.035;
 if(a.kind==='swing'){
  const angle=reduced?0:Math.sin(time*2.15)*.24*Math.min(time/1.2,1)*swingWeight;
  const dy=a.anchor.y-SWING.pivotY,dz=a.anchor.z-SWING.z;
  p.y=SWING.pivotY+Math.cos(angle)*dy-Math.sin(angle)*dz;
  p.z=SWING.z+Math.sin(angle)*dy+Math.cos(angle)*dz;p.pitch=angle;
 }
 if(a.kind==='seesaw'){
  const angle=reduced?0:Math.sin(time*1.55)*.17*smooth(Math.min(time/1.4,1))*swingWeight;
  const dx=a.anchor.x-SEESAW.x,dy=a.anchor.y-SEESAW.pivotY;
  p.x=SEESAW.x+Math.cos(angle)*dx-Math.sin(angle)*dy;p.y=SEESAW.pivotY+Math.sin(angle)*dx+Math.cos(angle)*dy;
  p.pitch=a.anchor.yaw>0?-angle:angle;p.rigAngle=angle;
 }
 if(a.kind==='slide'){
  const t=smooth(Math.min(time/a.duration,1)),slope=(SLIDE.platformY-SLIDE.endY)/(SLIDE.endZ-SLIDE.startZ);
  p.z=SLIDE.startZ+(SLIDE.endZ+.48-SLIDE.startZ)*t;
  const flatten=smooth(Math.max(0,Math.min(1,(p.z-(SLIDE.endZ-.4))/.8)));p.pitch=Math.atan(slope)*(1-flatten);
  p.y=Math.max(SLIDE.endY,SLIDE.platformY-(p.z-SLIDE.startZ)*slope)-(a.seatContact??DORMI_SEAT_CONTACT)/Math.cos(p.pitch)+Math.sin(Math.PI*flatten)*.15;
 }
 return p;
}
export class ActivitySession{
 constructor(){this.active=null;this.state='idle';this.elapsed=0;this.activeTime=0;this.claimed=false;this.materialClaimed=false;this.finished=null;}
 start(a,from,companionFrom=null){if(this.active||!a)return false;this.active={...a,anchor:{...a.anchor},exit:{...a.exit}};this.state='entering';this.elapsed=0;this.activeTime=0;this.companionFrom=companionFrom;this.rideExitEntryTime=null;this.exitRequested=false;this.exitDuration=1;this.slideExitEntryTime=null;this.claimed=false;this.materialClaimed=false;this.finished=null;this.lastReduced=false;this.from={...from,y:from.y??activityFloorY(a),pitch:0,roll:0};this.carousel=a.kind==='carousel'?new CarouselRide(this.active,this.from):null;this.viking=a.kind==='viking'?new VikingRide(this.active,this.from):null;this.bumper=a.kind==='bumper'?new BumperRide(this.active,this.from):null;this.coaster=a.kind==='coaster'?new CoasterRide(this.active,this.from):null;this.kartRace=a.kind==='kartRace'?new KartRaceRide(this.active,this.from):null;if(['pullup','climb'].includes(a.kind))this.active.exit={x:from.x,z:from.z,yaw:from.yaw};return true;}
 requestExit(){
  if(!this.active||this.state==='exiting')return false;
  if(this.carousel||this.viking||this.bumper||this.coaster||this.kartRace){const ride=this.carousel??this.viking??this.bumper??this.coaster??this.kartRace,result=ride.requestExit();this.state=ride.phase;this.exitRequested=ride.exitRequested;if(this.bumper||this.coaster||this.kartRace)this.active.exit={...ride.activity.exit};return result;}
  if(this.active.kind==='slide'&&this.state==='active'&&this.activeTime<this.active.duration){if(this.exitRequested)return false;this.exitRequested=true;return true;}
  this.exitFromEntry=this.state==='entering';this.exitStart=this.sample(this.lastReduced??false);this.companionExitStart=this.sampleCompanion(this.lastReduced??false);
  if(['pullup','climb'].includes(this.active.kind)){this.exerciseExitEntryTime=this.exitFromEntry?this.elapsed:this.active.enterDuration;this.exitDuration=this.active.kind==='climb'?Math.max(.3,this.exerciseExitEntryTime):1.2;}
  if(this.active.campBed){this.bedExitEntryTime=this.exitFromEntry?this.elapsed:this.active.enterDuration;this.exitDuration=Math.max(.3,this.bedExitEntryTime);if(this.exitFromEntry)this.active.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};}
  if(this.active.seating){if(this.exitFromEntry)this.active.exit=seatStartExit(this.active,this.from);this.seatExitEntryTime=this.exitFromEntry?this.elapsed:null;this.seatRockSettle=this.active.rocking&&!this.exitFromEntry?.35:0;this.exitDuration=this.exitFromEntry?Math.max(.25,this.elapsed):this.active.enterDuration+this.seatRockSettle;}
  if(isSeatRide(this.active)){
   if(this.exitFromEntry){this.rideExitEntryTime=this.elapsed;this.exitDuration=Math.max(.4,this.elapsed);this.active.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};}
   else this.exitDuration=1.4;
  }
  if(this.active.kind==='slide'&&this.exitFromEntry){this.slideExitEntryTime=this.elapsed;this.exitDuration=Math.max(.4,this.elapsed);this.active.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};}
  if(this.active.kind==='run'){this.active.exit={x:this.exitStart.x,z:this.exitStart.z,yaw:this.exitStart.yaw};this.active.anchor={...this.exitStart,y:.05};}
  this.state='exiting';this.elapsed=0;return true;
 }
 cancel(){const a=this.active;if(!a)return null;if(this.kartRace){this.kartRace.cancel();if(this.state==='entering')a.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};}this.carousel?.cancel();this.viking?.cancel();if(this.coaster){this.coaster.cancel();a.exit={...this.coaster.activity.exit};}if(this.bumper){this.bumper.cancel();if(this.state==='entering')a.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};}if(a.seating&&a.floorY!==undefined&&this.state==='entering')a.exit=seatStartExit(a,this.from);if(a.kind==='slide'&&this.state==='entering')a.exit={...a.at,yaw:0};this.active=null;this.state='idle';this.elapsed=0;this.finished=a;return activityExit(a);}
 update(dt){if(!this.active||!Number.isFinite(dt)||dt<=0)return;if(this.carousel||this.viking||this.bumper||this.coaster||this.kartRace){const ride=this.carousel??this.viking??this.bumper??this.coaster??this.kartRace;ride.update(dt);this.state=ride.phase;this.elapsed=ride.elapsed;this.activeTime=ride.activeTime;this.exitRequested=ride.exitRequested;if(ride.done){this.finished=this.active;this.active=null;}return;}this.elapsed+=Math.min(dt,.1);if(this.state==='entering'&&this.elapsed>=(this.active.enterDuration??.7)){this.state='active';this.elapsed=0;}else if(this.state==='active'){this.activeTime+=Math.min(dt,.1);if(this.active.duration&&this.activeTime>=this.active.duration)this.requestExit();}else if(this.state==='exiting'&&this.elapsed>=this.exitDuration){this.finished=this.active;this.active=null;this.state='idle';}}
 claimMaterial(){if(!this.active?.harvestNodeId||this.materialClaimed||this.state!=='active'||this.activeTime<1.2)return null;this.materialClaimed=true;return {type:'HARVEST_MATERIAL',id:this.active.harvestNodeId,expectedHarvests:this.active.expectedHarvests};}
 claimDiscovery(){if(!this.active||this.claimed||this.activeTime<2)return null;this.claimed=true;return this.active.discoveryId;}
 sample(reduced=false){this.lastReduced=reduced;const a=this.active;if(!a)return null;if(this.carousel||this.viking||this.bumper||this.coaster||this.kartRace){const ride=this.carousel??this.viking??this.bumper??this.coaster??this.kartRace;ride.setReduced(reduced);this.state=ride.phase;this.exitRequested=ride.exitRequested;return ride.sample();}const target=activityTransform(a,this.activeTime,reduced,this.state==='exiting'?1-smooth(Math.min(this.elapsed/.4,1)):1);
  if(a.kind==='climb'){const t=this.state==='entering'?this.elapsed:this.state==='active'?a.enterDuration:this.exerciseExitEntryTime*(1-Math.min(1,this.elapsed/this.exitDuration));return climbEntry(a,this.from,t);}
  if(a.kind==='pullup'){if(this.state==='entering')return pullupEntry(a,this.from,this.elapsed);if(this.state==='active')return {...target,pose:1};if(this.exitFromEntry)return pullupEntry(a,this.from,this.exerciseExitEntryTime*(1-Math.min(1,this.elapsed/this.exitDuration)));if(this.elapsed<.4){const q=(this.exitStart.poseTime??0)*(1-smooth(Math.min(this.elapsed/.4,1)));return{...pullupExerciseFrame(q).root,poseTime:q,pose:1,pitch:0,roll:0};}return pullupEntry(a,this.from,a.enterDuration*(1-Math.min(1,(this.elapsed-.4)/.8)));}
  if(a.campBed){if(this.state==='entering')return campBedEntry(a,this.from,this.elapsed);if(this.state==='active')return {...target,pose:1};return campBedEntry(a,this.exitFromEntry?this.from:activityExit(a),this.bedExitEntryTime*(1-Math.min(1,this.elapsed/this.exitDuration)));}
  if(a.seating){if(this.state==='entering')return seatEntry(a,this.from,this.elapsed);if(this.state==='active')return {...target,pose:1};if(this.seatRockSettle&&this.elapsed<this.seatRockSettle)return {...rockingTransform(a.anchor,a.rocking,(this.exitStart.pitch??0)*(1-smooth(this.elapsed/this.seatRockSettle))),pose:1};const t=Math.min(1,Math.max(0,this.elapsed-(this.seatRockSettle??0))/(this.exitDuration-(this.seatRockSettle??0)));return seatEntry(a,this.exitFromEntry?this.from:activityExit(a),(this.exitFromEntry?this.seatExitEntryTime:a.enterDuration)*(1-t));}
  if(isSeatRide(a)){
   if(this.state==='entering')return rideEntry(a,this.from,this.elapsed);
   if(this.state==='exiting'&&this.exitFromEntry)return rideEntry(a,this.from,this.rideExitEntryTime*(1-Math.min(this.elapsed/this.exitDuration,1)));
   if(this.state==='exiting'&&this.elapsed>=.4)return rideDismount(a,this.elapsed-.4);
  }
  if(a.kind==='slide'&&this.state==='entering')return slideEntry(a,this.from,this.elapsed);
  if(a.kind==='slide'&&this.state==='exiting'){
   if(this.slideExitEntryTime!==null)return slideEntry(a,this.from,this.slideExitEntryTime*(1-Math.min(this.elapsed/this.exitDuration,1)));
   return rideDismount({...a,kind:'slide-exit',anchor:this.exitStart},this.elapsed);
  }
  if(this.state==='exiting'&&this.exitFromEntry){const t=smooth(Math.min(this.elapsed/.65,1));return blend(this.exitStart,activityExit(a),t,(this.exitStart.pose??1)*(1-t));}
  if(this.state==='active')return {...target,pose:1};
  if(this.state==='entering'){const t=smooth(Math.min(this.elapsed/(a.enterDuration??.7),1));return blend(this.from,target,t,t);}
  if(this.elapsed<.4)return {...(a.kind==='run'?this.exitStart:target),pose:1};
  const t=smooth(Math.min((this.elapsed-.4)/.6,1));return blend(a.kind==='run'?this.exitStart:activityTransform(a,0,true),activityExit(a),t,1-t);
 }
 sampleCompanion(reduced=false){
  const a=this.active;if(!a?.companion)return null;
  const copy={...a,rider:'companion',anchor:a.companion.anchor,exit:a.companion.exit},target=activityTransform(copy,this.activeTime,reduced,this.state==='exiting'?1-smooth(Math.min(this.elapsed/.4,1)):1);
  const home={...a.companion.exit,y:.04,pitch:0,roll:0,...this.companionFrom};
  if(this.state==='entering')return rideEntry(copy,home,this.elapsed);
  if(this.state==='active')return {...target,pose:1};
  if(this.exitFromEntry)return rideEntry(copy,home,this.rideExitEntryTime*(1-Math.min(this.elapsed/this.exitDuration,1)));
  if(this.elapsed<.4)return {...target,pose:1};
  return rideDismount(copy,this.elapsed-.4,.04);
 }
}
const isSeatRide=a=>a.kind==='swing'||a.kind==='seesaw';
function seatEntry(a,from,time){const t=Math.max(0,Math.min(1,time/a.enterDuration)),ground={...(a.seatApproach??a.at),y:activityFloorY(a),yaw:a.anchor.yaw,pitch:0,roll:0},target={...a.anchor,pitch:0,roll:0},high=target.y+(a.seatLift??.035);
 if(t<.25){
  // A corner approach first clears the armrest, then aligns at the shared front.
  if(a.seatViaApproach){const via={...a.at,y:ground.y,yaw:ground.yaw,pitch:0,roll:0};return t<.125?blend(from,via,smooth(t/.125),0):blend(via,ground,smooth((t-.125)/.125),0);}
  return blend(from,ground,smooth(t/.25),0);
 }
 if(t<.5){const q=smooth((t-.25)/.25);return blend(ground,{...ground,y:high},q,q);}
 if(t<.85)return blend({...ground,y:high},{...target,y:high},smooth((t-.5)/.35),1);
 return blend({...target,y:high},target,smooth((t-.85)/.15),1);
}
function rideEntry(a,from,time){
 const target=activityTransform(a,0,true),lift=a.kind==='swing'?.45:.65,high=target.y+lift,t=Math.min(time/(a.enterDuration??1.5),1);
 if(a.rider==='moa'){const q=smooth(Math.max(0,Math.min(1,(t-.12)/.88))),p=blend(from,target,q,Math.min(1,q/.55));p.y+=Math.sin(Math.PI*q)*(a.kind==='slide-exit'?.16:.34);return p;}
 if(a.rider==='companion'){
  const back={...target,x:target.x-Math.sin(target.yaw)*.32,z:target.z-Math.cos(target.yaw)*.32};
  if(t<.22){const q=smooth(t/.22);return blend(from,{...from,y:high},q,q);}
  if(t<.65)return blend({...from,y:high},{...back,y:high},smooth((t-.22)/.43),1);
  if(t<.86)return blend({...back,y:high},back,smooth((t-.65)/.21),1);
  return blend(back,target,smooth((t-.86)/.14),1);
 }
 if(t<.22){const q=smooth(t/.22);return blend(from,{...from,y:high},q,q);}
 if(t<.72){const q=smooth((t-.22)/.5);return blend({...from,y:high},{...target,y:high},q,1);}
 return blend({...target,y:high},target,smooth((t-.72)/.28),1);
}
function rideDismount(a,time,ground=.05){
 const target=activityTransform(a,0,true),lift=a.kind==='swing'?.45:a.kind==='slide-exit'?.3:.65,high=target.y+lift,exit={...a.exit,y:ground,pitch:0,roll:0},t=Math.min(time,1);
 if(a.rider==='moa'){const q=smooth(t),p=blend(target,exit,q,1-Math.max(0,(q-.55)/.45));p.y+=Math.sin(Math.PI*q)*(a.kind==='slide-exit'?.16:.34);return p;}
 if(a.rider==='companion'){
  const back={...target,x:target.x-Math.sin(target.yaw)*.32,z:target.z-Math.cos(target.yaw)*.32};
  if(t<.14)return blend(target,back,smooth(t/.14),1);
  if(t<.35)return blend(back,{...back,y:high},smooth((t-.14)/.21),1);
  if(t<.78)return blend({...back,y:high},{...exit,y:high},smooth((t-.35)/.43),1);
  const q=smooth((t-.78)/.22);return blend({...exit,y:high},exit,q,1-q);
 }
 if(t<.22)return blend(target,{...target,y:high},smooth(t/.22),1);
 if(t<.72)return blend({...target,y:high},{...exit,y:high},smooth((t-.22)/.5),1);
 const q=smooth((t-.72)/.28);return blend({...exit,y:high},exit,q,1-q);
}
function slideEntry(a,from,time){
 const points=[{t:0,...from,pose:0},{t:.6,x:SLIDE.x,y:.05,z:SLIDE.entryZ+.23,yaw:0,pose:0},...SLIDE.steps.map((s,i)=>({t:1.2+i*.6,x:SLIDE.x,y:s.y+.05,z:s.z-.14,yaw:0,pose:0})),{t:3.45,x:SLIDE.x,y:SLIDE.platformY+.05,z:SLIDE.platformZ,yaw:0,pose:0},{t:a.enterDuration,...a.anchor,pose:1}];
 const next=points.findIndex(p=>p.t>=time),i=next<0?points.length-1:Math.max(1,next),start=points[i-1],end=points[i],t=Math.min(1,Math.max(0,(time-start.t)/(end.t-start.t)));
 if(i>1&&i<=SLIDE.steps.length+1){
  const high=Math.max(start.y,end.y)+.12;
  if(t<.3)return blend(start,{...start,y:high},smooth(t/.3),0);
  if(t<.75)return blend({...start,y:high},{...end,y:high},smooth((t-.3)/.45),0);
  return blend({...end,y:high},end,smooth((t-.75)/.25),0);
 }
 const q=smooth(t),p=blend(start,end,q,start.pose+(end.pose-start.pose)*q);
 if(end.pose)p.y+=Math.sin(Math.PI*q)*.1;
 return p;
}
function blend(a,b,t,pose){const yawDelta=Math.atan2(Math.sin((b.yaw??0)-(a.yaw??0)),Math.cos((b.yaw??0)-(a.yaw??0)));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,yaw:(a.yaw??0)+yawDelta*t,pitch:(a.pitch??0)+((b.pitch??0)-(a.pitch??0))*t,roll:0,pose};}

function climbEntry(a,from,time){if(time<.6){const q=smooth(Math.max(0,time/.6)),p=climbExerciseFrame(0);return{...blend(from,p.root,q,1),poseTime:0};}const t=Math.min(CLIMB_DURATION,Math.max(0,time-.6));return{...climbExerciseFrame(t).root,pitch:0,roll:0,pose:1,poseTime:t};}
function pullupEntry(a,from,time){const target=pullupExerciseFrame(0).root;if(time<.55){const q=smooth(Math.max(0,time/.55));return{...blend(from,{...target,y:.05},q,0),poseTime:0};}const q=smooth(Math.min(1,Math.max(0,(time-.55)/.55)));return{...blend({...target,y:.05},target,q,q),poseTime:0};}
