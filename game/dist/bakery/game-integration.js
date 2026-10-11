import{BAKERY as B}from'./layout.js';
import{createBakeryMovement}from'./movement.js';
import{createSupport}from'./surfaces.js';
// Bounds measured from every original sit-pose vertex over 101 amounts: radius
// .646465 and height 1.583167. The fixed .68 envelope includes all pose/yaw phases.
export const BAKERY_ACTIVITY_RADIUS=.68;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
export function bakeryActivityCorridor(target,from,radius=.61){
 const a=target?.localTarget??target;if(!a?.seating||!B.floor2Seats.some(s=>s.id===a.id)||a.floor!=='floor2'||a.floorY!==B.floor2Y||!point(from)||!Number.isFinite(from.y)||!point(a.anchor)||!Number.isFinite(a.anchor.y)||!point(a.exit)||!point(a.seatApproach??a.at)||(a.seatViaApproach&&!point(a.at)))return null;
 const approach=a.seatApproach??a.at,points=[{x:from.x,z:from.z},...(a.seatViaApproach?[a.at]:[]),approach,a.anchor,approach,...(a.seatViaApproach?[a.at]:[]),a.exit].map(p=>({x:p.x,z:p.z}));if(points.some(p=>!point(p)))return null;
 const lift=a.seatLift??.035;if(!Number.isFinite(lift)||lift<0)return null;
 return{points,radius:Math.max(radius,BAKERY_ACTIVITY_RADIUS),minY:Math.min(B.floor2Y,from.y,a.anchor.y),maxY:Math.max(from.y,B.floor2Y,a.anchor.y+lift)+B.avatarHeight};
}
/** Original actor ownership, called by the existing game frame. No second mesh writer. */
export function createBakeryGameHost({player,model,poser,locomotion,view,radius=.61,position=null}={}){
 if(!player||!model||!poser||!view)throw new TypeError('bakery host requires the actual actor, shared poser and view');
 const initial=position??createSupport(player.position.x,player.position.z,player.position.y>2.5?'floor2':'floor1'),motion=createBakeryMovement({position:initial,yaw:player.rotation.y,radius});let activity=false,disposed=false,activityLease=null;
 const publish=p=>{view.setPlayerSupport?.({...p.support,airborne:p.airborne||!!locomotion?.airborne,rootY:p.rootY+(locomotion?.height??0),radius});return p;};publish(motion.snapshot());
 function releaseActivity(){if(!activityLease)return;const lease=activityLease;activityLease=null;try{view.releasePlayerActivity?.(lease);}catch{/* a disposed scene cannot retain host ownership */}}
 function apply(p){player.position.set(p.x,p.rootY,p.z);player.rotation.y=p.yaw;publish(p);}
 function update(dt,intent={},{paused=false}={}){
  if(disposed||activity||paused)return snapshot();const state=poser.getState(),neutral=(state.name==='stand'||state.amount===0)&&Math.abs(model.position.y)<1e-7,world=view.collisionWorldAt?.(player.position)??{};
  const p=motion.update(dt,intent,{poseNeutral:neutral,ordinaryAirborne:!!locomotion?.airborne,world,reserveStairHop:view.reserveStairHop,releaseStairHop:view.releaseStairHop});apply(p);
  if(p.ownsPose){locomotion?.cancel();model.rotation.z=0;if(p.requiresNeutral){const amount=state.name==='run'?Math.max(0,state.amount-Math.max(0,dt)*2.5):0;poser.setPose(amount?'run':'stand',amount,state.time);const y=model.position.y;model.position.y=y+Math.sign(-y)*Math.min(Math.abs(y),Math.max(0,dt)*.4);}else{poser.reset();model.position.y=0;}}
  return snapshot();
 }
 function snapshot(){return{...motion.snapshot(),activity,disposed};}
 function resetTo(p){if(disposed)return false;activity=false;const floor=p.surface??(p.y>2.5?'floor2':'floor1'),support=createSupport(p.x,p.z,floor);motion.reset(support,p.yaw??player.rotation.y);locomotion?.cancel();poser.reset();model.position.y=0;model.rotation.z=0;apply(motion.snapshot());releaseActivity();return true;}
 function abort(){if(disposed)return snapshot();activity=false;const p=motion.abort();apply(p);locomotion?.cancel();poser.reset();model.position.y=0;model.rotation.z=0;releaseActivity();return snapshot();}
 function beginActivity(target){
  if(disposed||activity||locomotion?.airborne||motion.snapshot().airborne||!['floor1','floor2'].includes(motion.snapshot().support.surface))return false;
  if(view.reservePlayerActivity){const spec=bakeryActivityCorridor(target,{x:player.position.x,y:player.position.y,z:player.position.z},radius);if(!spec||motion.snapshot().support.surface!=='floor2')return false;try{activityLease=view.reservePlayerActivity(spec);}catch{activityLease=null;}if(!activityLease)return false;}
  activity=true;return true;
 }
 return{update,snapshot,resetTo,abort,canJump:()=>!activity&&motion.canJump(),canExitRoom:()=>!activity&&!locomotion?.airborne&&!motion.snapshot().airborne&&motion.snapshot().support.surface==='floor1',cameraPosition(){return{x:player.position.x,y:motion.snapshot().cameraTransportY,z:player.position.z};},beginActivity,endActivity(a){if(disposed)return false;activity=false;const floor=a?.floor??((a?.floorY??player.position.y)>2.5?'floor2':'floor1');motion.reset(createSupport(player.position.x,player.position.z,floor),player.rotation.y);publish(motion.snapshot());releaseActivity();return true;},dispose(){if(disposed)return;disposed=true;motion.dispose();view.setPlayerSupport?.(null);releaseActivity();},get ownsPose(){return!activity&&motion.snapshot().ownsPose;},get disposed(){return disposed;}};
}
