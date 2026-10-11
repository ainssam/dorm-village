import {advanceVertical,createVerticalState,startFall,startJump} from './vertical-support.js';
/** Ground collision stays on the player root; only its model follows the jump arc. */
export const WALK_SPEED=2.05;
export const SPRINT_SPEED=WALK_SPEED*1.6;
export const JUMP_DURATION=.64;
export const JUMP_HEIGHT=.52;
export class Locomotion{
 constructor(){this.phase=0;this.cancel();}
 jump(baseHeight=null,supportId=null,useVerticalSupport=false){
  if(this.airborne||this.cooldown>0)return false;
  this.airborne=true;this.elapsed=0;this.height=0;
  this.verticalMode=!!useVerticalSupport;
  if(this.verticalMode){this.vertical=createVerticalState(Math.max(0,Number.isFinite(baseHeight)?baseHeight:0),supportId);startJump(this.vertical);}
  return true;
 }
 fallFromSupport(){
  if(!this.verticalMode||this.airborne||!startFall(this.vertical))return false;
  this.airborne=true;this.elapsed=0;this.height=0;return true;
 }
 update(dt,{distance=0,sprinting=false,world=null,x=0,z=0,yaw=0,canOccupy}={}){
  dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.airborne&&this.verticalMode){advanceVertical(this.vertical,dt,world,x,z,{canOccupy});this.height=this.vertical.offset;this.airborne=this.vertical.airborne;if(this.vertical.landed)this.cooldown=.08;}
  else if(this.airborne){this.elapsed=Math.min(JUMP_DURATION,this.elapsed+dt);const t=this.elapsed/JUMP_DURATION;this.height=4*JUMP_HEIGHT*t*(1-t);if(this.elapsed>=JUMP_DURATION){this.airborne=false;this.height=0;this.cooldown=.08;}}
  this.moving=Number.isFinite(distance)&&distance>.00001;
  this.sprinting=this.moving&&sprinting;
  if(this.moving)this.phase+=distance*12/ WALK_SPEED;
  const target=this.airborne?.35:this.moving?(sprinting?.4:.25):0;
  this.poseAmount+=(target-this.poseAmount)*Math.min(1,dt*18);
  if(Math.abs(this.poseAmount-target)<.005)this.poseAmount=target;
  return this;
 }
 captureVertical(rootY=null){return this.verticalMode?{vertical:{...this.vertical},verticalMode:this.verticalMode,airborne:this.airborne,height:this.height,elapsed:this.elapsed,cooldown:this.cooldown,rootY:Number.isFinite(rootY)?rootY:null}:null;}
 restoreVertical(snapshot){if(!snapshot?.verticalMode||!snapshot.vertical)return null;this.vertical={...snapshot.vertical};this.verticalMode=true;this.airborne=!!snapshot.airborne;this.height=Number.isFinite(snapshot.height)?snapshot.height:this.vertical.offset;this.elapsed=Number.isFinite(snapshot.elapsed)?snapshot.elapsed:0;this.cooldown=Number.isFinite(snapshot.cooldown)?snapshot.cooldown:0;this.moving=false;this.sprinting=false;return {rootY:Number.isFinite(snapshot.rootY)?snapshot.rootY:null};}
 cancel(){this.elapsed=0;this.height=0;this.airborne=false;this.verticalMode=false;this.vertical=createVerticalState();this.cooldown=0;this.moving=false;this.sprinting=false;this.poseAmount=0;}
 snapshot(){return {airborne:this.airborne,height:this.height,sprinting:this.sprinting,moving:this.moving,phase:this.phase};}
}
