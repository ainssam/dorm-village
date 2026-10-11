/** One physical-clearance wait; never locks movement or replays a stale interaction. */
export class EquipmentHandoff{
 constructor(){this.pending=null;}
 queue(target,roomId){const fresh=this.pending?.target.id!==target.id;this.pending={target,roomId};return fresh;}
 cancel(){this.pending=null;}
 decorate(target){return target&&target.id===this.pending?.target.id?{...target,label:'친구가 내려오는 중…'}:target;}
 tick({roomId,position,paused=false,ready,start}){const p=this.pending;if(!p)return;if(paused||p.roomId!==roomId||Math.hypot(position.x-p.target.at.x,position.z-p.target.at.z)>(p.target.radius??.7)+.3){this.cancel();return;}if(!ready(p.target.id))return;this.cancel();start(p.target);}
}
