import {worldFor} from './connected-layout.js';
import {resolveLocation} from './location.js';
import {ROOMS} from './rooms.js';
import {canMove} from '../physics.js';
export class RoomManager{
 constructor({prepare,commit,lock,fade,getHostView}){Object.assign(this,{prepare,commit,lock,fade,getHostView});this.current=null;this.phase='idle';this.token=0;}
 cancel(){this.token++;this.phase='idle';Promise.resolve(this.fade(false)).catch(()=>{});this.lock(false);}
 async transitionTo(target,{presentation=null}={}){
  if(this.phase!=='idle')return 'ignored';
  const guarded=typeof presentation?.settleCommitError==='function';if(guarded&&typeof this.getHostView!=='function')return 'failed';
  if(!target||typeof target.roomId!=='string'||typeof target.spawnId!=='string'||!Object.hasOwn(ROOMS,target.roomId))return 'failed';
  const resolved=resolveLocation(target);if(!resolved||!canMove(resolved.addressRoom,resolved.localSpawn.x,resolved.localSpawn.z))return 'failed';
  const {runtimeRoom:room,spawn}=resolved;
  if(this.current?.worldId&&this.current.worldId===worldFor(target.roomId)){try{this.commit(this.current,room,spawn,target,{sameWorld:true});return 'entered';}catch(error){this.error=error;return 'failed';}}
  const token=++this.token,old=this.current,fade=presentation?.fade??this.fade;let next=null,committed=false,originDisposeAttempted=false,originDisposed=false,ownershipUnknown=false,commitAttempted=false;
  const verify=()=>{try{return presentation?.isCommitSettled?.(next,room,spawn,target)===true;}catch{return false;}};
  const inspect=()=>{try{const host=this.getHostView();if(host===next){committed=true;this.current=next;return'destination';}if(host===old)return'origin';ownershipUnknown=true;return'unknown';}catch{ownershipUnknown=true;return'unknown';}};
  if(guarded)this.lastSettlement={token,ownership:'pending',settled:false,originDisposed:false};
  this.phase='preparing';this.lock(true);
  try{
   next=await this.prepare(room);
   if(token!==this.token){next.dispose();return 'ignored';}
   await presentation?.beforeCommit?.(next);if(token!==this.token){next.dispose();return 'ignored';}
   this.phase='fadingOut';await fade(true);
   if(token!==this.token){next.dispose();return 'ignored';}
   while(presentation?.canSwitch?.()===false){if(typeof presentation.waitForSwitch!=='function')throw Error('Missing boat switch waiter');await presentation.waitForSwitch();if(token!==this.token){next.dispose();return 'ignored';}}
   this.phase='switching';commitAttempted=true;this.commit(next,room,spawn,target);committed=true;this.current=next;originDisposeAttempted=true;old?.dispose?.();originDisposed=true;presentation?.confirmOriginDisposed?.();presentation?.didCommit?.(next);
   this.phase='fadingIn';await fade(false);await presentation?.afterEnter?.(next);if(guarded&&!verify())throw Error('Boat host did not settle');if(guarded)this.lastSettlement={token,ownership:'destination',settled:true,originDisposed};return 'entered';
  }catch(error){if(guarded&&token!==this.token){if(!commitAttempted){if(!committed)next?.dispose?.();return'ignored';}let host,known=false;try{host=this.getHostView();known=true;}catch{}if(known&&host===next&&this.current===old)this.current=next;else if(known&&host!==next&&this.current!==next&&!committed)next?.dispose?.();return'failed';}this.error=error;if(!guarded||!commitAttempted){if(!committed)next?.dispose?.();return committed?'entered':'failed';}
   // Identity controls disposal, while the independent postcondition controls success.
   const context=()=>({error,next,old,room,spawn,target,originDisposeAttempted,originDisposed});
   try{presentation.settleCommitError(context());}catch(recoveryError){this.recoveryError=recoveryError;}
   const ownership=inspect();
   if(ownership==='destination'&&!originDisposeAttempted){originDisposeAttempted=true;try{old?.dispose?.();originDisposed=true;presentation.confirmOriginDisposed?.();}catch(disposalError){this.disposalError=disposalError;try{presentation.settleCommitError(context());}catch(recoveryError){this.recoveryError=recoveryError;}}}
   const settled=ownership==='destination'&&originDisposed&&!ownershipUnknown&&verify();
   this.lastSettlement={token,ownership,settled,originDisposed,originDisposeAttempted};
   if(ownership==='origin'&&!committed&&!ownershipUnknown)next?.dispose?.();
   return settled?'entered':'failed';}

  finally{if(token===this.token){await this.fade(false).catch(()=>{});this.phase='idle';this.lock(false);}}
 }
}
