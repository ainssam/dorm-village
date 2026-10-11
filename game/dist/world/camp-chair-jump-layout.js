import {CAMP_CHAIRS} from '../plaza/tent-layout.js';
import {DORMI_BODY_HALF_DEPTH,DORMI_BODY_HALF_WIDTH} from './park-jump-layout.js';

const chair=CAMP_CHAIRS.find(item=>item.seaView);
const x=chair.anchor.x,z=chair.anchor.z;
const baseId='courtyard.camp-chair.1.base';
const FOOT_BOUNDS={minX:-.367,maxX:.367,minZ:-.279,maxZ:.307};
const SEAT_BOUNDS={minX:-.63,maxX:.63,minZ:-.485,maxZ:.345},SEAT_MARGIN=.01;

// Seat and body measurements come from the rendered PlaneGeometry/GLB. The
// landing patch keeps the complete lower-foot bounds on the seat and leaves a
// small gap between the full body and the thin, unmodified rear panel.
const BODY_HALF_DEPTH=Math.max(DORMI_BODY_HALF_DEPTH,.46711); // positive-z GLB bound
export const CAMP_CHAIR_JUMP_SURFACES=Object.freeze([{
 id:'courtyard.camp-chair.1.seat',obstacleId:chair.id,x,z,y:chair.seatTop,
 landing:{minX:x-.22,maxX:x+.22,minZ:z-.06,maxZ:z+.05},landingAssistRadius:.16,
 footClearance:.33,jumpRadius:2.8,platformObstacleIds:[baseId]
}]);

export const CAMP_CHAIR_JUMP_OBSTACLES=Object.freeze([
 {id:baseId,x,z:z-.07,hx:.63,hz:.415,minY:0,maxY:chair.seatTop},
 {id:'courtyard.camp-chair.1.backrest',x,z:z-.56,hx:.625,hz:.01,minY:.545,maxY:1.185,actorHalfX:DORMI_BODY_HALF_WIDTH,actorHalfZ:BODY_HALF_DEPTH}
]);

export function campChairJumpInRange(world,roomId,x,z){
 return roomId==='courtyard'&&(world?.supports??[]).some(surface=>surface.id==='courtyard.camp-chair.1.seat'&&Math.hypot(x-surface.x,z-surface.z)<=surface.jumpRadius);
}

export function campChairFeetSupported(rootX,rootZ,yaw){
 if(!Number.isFinite(rootX)||!Number.isFinite(rootZ)||!Number.isFinite(yaw))return false;
 const c=Math.cos(yaw),s=Math.sin(yaw),minX=x+SEAT_BOUNDS.minX+SEAT_MARGIN,maxX=x+SEAT_BOUNDS.maxX-SEAT_MARGIN,minZ=z+SEAT_BOUNDS.minZ+SEAT_MARGIN,maxZ=z+SEAT_BOUNDS.maxZ-SEAT_MARGIN;
 for(const fx of [FOOT_BOUNDS.minX,FOOT_BOUNDS.maxX])for(const fz of [FOOT_BOUNDS.minZ,FOOT_BOUNDS.maxZ]){
  const worldX=rootX+fx*c+fz*s,worldZ=rootZ-fx*s+fz*c;
  if(worldX<minX||worldX>maxX||worldZ<minZ||worldZ>maxZ)return false;
 }
 return true;
}

function safeLandingPatch(surface,yaw){
 const c=Math.cos(yaw),s=Math.sin(yaw),offsets=[];
 for(const fx of [FOOT_BOUNDS.minX,FOOT_BOUNDS.maxX])for(const fz of [FOOT_BOUNDS.minZ,FOOT_BOUNDS.maxZ])offsets.push({x:fx*c+fz*s,z:-fx*s+fz*c});
 const footMinX=Math.min(...offsets.map(p=>p.x)),footMaxX=Math.max(...offsets.map(p=>p.x)),footMinZ=Math.min(...offsets.map(p=>p.z)),footMaxZ=Math.max(...offsets.map(p=>p.z));
 return {minX:Math.max(surface.landing.minX,x+SEAT_BOUNDS.minX+SEAT_MARGIN-footMinX),maxX:Math.min(surface.landing.maxX,x+SEAT_BOUNDS.maxX-SEAT_MARGIN-footMaxX),minZ:Math.max(surface.landing.minZ,z+SEAT_BOUNDS.minZ+SEAT_MARGIN-footMinZ),maxZ:Math.min(surface.landing.maxZ,z+SEAT_BOUNDS.maxZ-SEAT_MARGIN-footMaxZ)};
}

export function withCampChairJumpCollision(world,roomId){
 if(roomId!=='courtyard'||!world)return world;
 const chairId=chair.id;
 return {...world,
  supports:[...(world.supports??[]).filter(surface=>surface.id!=='courtyard.camp-chair.1.seat'),...CAMP_CHAIR_JUMP_SURFACES],
  obstacles:[...(world.obstacles??[]).filter(obstacle=>obstacle.id!==chairId&&!CAMP_CHAIR_JUMP_OBSTACLES.some(candidate=>candidate.id===obstacle.id)),...CAMP_CHAIR_JUMP_OBSTACLES]
 };
}

// A chair-only, bounded correction for the last descending frame. Both the
// destination and every point on the correction path must remain occupiable;
// this keeps the assist from moving the body through the backrest or residents.
export function campChairLandingAssistTarget(world,roomId,x,z,yaw,{canOccupy=()=>false}={}){
 if(roomId!=='courtyard'||!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(yaw))return null;
 const surface=(world?.supports??[]).find(item=>item.id==='courtyard.camp-chair.1.seat');
 if(!surface||!Number.isFinite(surface.landingAssistRadius))return null;
 const patch=safeLandingPatch(surface,yaw);
 if(patch.minX>patch.maxX||patch.minZ>patch.maxZ)return null;
 const targetX=Math.max(patch.minX,Math.min(patch.maxX,x)),targetZ=Math.max(patch.minZ,Math.min(patch.maxZ,z));
 const dx=targetX-x,dz=targetZ-z,distance=Math.hypot(dx,dz);
 if(distance<1e-6||distance>surface.landingAssistRadius||!campChairFeetSupported(targetX,targetZ,yaw)||!canOccupy(surface,x,z,yaw)||!canOccupy(surface,targetX,targetZ,yaw))return null;
 const steps=Math.max(1,Math.ceil(distance/.025));
 for(let i=1;i<steps;i++)if(!canOccupy(surface,x+dx*i/steps,z+dz*i/steps,yaw))return null;
 return {x:targetX,z:targetZ,distance};
}

