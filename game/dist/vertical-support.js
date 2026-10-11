// Ballistic movement for rooms with explicitly measured, opt-in seat tops.
// Other rooms keep Locomotion's original jump curve.
export const JUMP_DURATION=.9;
export const JUMP_HEIGHT=.85;
export const GRAVITY=8*JUMP_HEIGHT/(JUMP_DURATION*JUMP_DURATION);
export const JUMP_SPEED=GRAVITY*JUMP_DURATION/2;

export function createVerticalState(surfaceY=0,supportId=null){
 return {surfaceY,offset:0,velocity:0,airborne:false,supportId,fallingFromSupportId:null,landed:null};
}

export function verticalHeight(state){return Math.max(0,state.surfaceY+state.offset);}

export function startJump(state){
 if(state.airborne)return false;
 state.airborne=true;state.velocity=JUMP_SPEED;state.offset=0;state.fallingFromSupportId=null;state.landed=null;
 return true;
}

export function startFall(state){
 if(state.airborne||!state.supportId||state.surfaceY<=0)return false;
 state.airborne=true;state.velocity=0;state.offset=0;state.fallingFromSupportId=state.supportId;state.supportId=null;state.landed=null;
 return true;
}

export function findLandingSurface(world,x,z){
 for(const surface of world?.supports??[]){
  const r=surface.landing;
  if(!r||x<r.minX||x>r.maxX||z<r.minZ||z>r.maxZ)continue;
  const clear=surface.footClearance??0;
  if((world.circles??[]).some(c=>Math.hypot(x-c.x,z-c.z)<(c.radius??0)+clear))continue;
  return surface;
 }
 return null;
}

/** Move one bounded frame; landing uses an explicit surface and final occupancy test. */
export function advanceVertical(state,dt,world,x,z,{canOccupy=()=>true}={}){
 state.landed=null;
 if(!state.airborne)return state;
 dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));
 const before=state.surfaceY+state.offset;
 state.offset+=state.velocity*dt-.5*GRAVITY*dt*dt;
 state.velocity-=GRAVITY*dt;
 const after=state.surfaceY+state.offset;
 if(state.velocity<=0&&after<before){
  const surface=findLandingSurface(world,x,z);
  if(surface&&before>surface.y&&after<=surface.y&&canOccupy(surface,x,z)){
   state.surfaceY=surface.y;state.offset=0;state.velocity=0;state.airborne=false;state.supportId=surface.id;state.fallingFromSupportId=null;state.landed=surface.id;return state;
  }
  if(after<=0){state.surfaceY=0;state.offset=0;state.velocity=0;state.airborne=false;state.supportId=null;state.fallingFromSupportId=null;state.landed='ground';}
 }
 return state;
}

export function shouldFallFromSupport(state,{world,x,z,free=true}={}){
 return !!free&&!state.airborne&&!!state.supportId&&!!state.surfaceY&&!findLandingSurface(world,x,z);
}
