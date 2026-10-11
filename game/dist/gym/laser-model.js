// Single 120 Hz authority for aim, visible neutral target paths, cooldown and feedback.
export const LASER_DT=1/120;
export const LASER_LIMITS=Object.freeze({minYaw:-.16,maxYaw:.16,minPitch:-.04,maxPitch:.22,shots:5,cooldownTicks:96,beamTicks:27});
const G=LASER_LIMITS,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),copy=x=>structuredClone(x);
export function laserTargets(t=0){return[{id:'plate',x:-.26+.5*Math.sin(t*.8),y:.94+.05*Math.sin(t*1.1),z:4.7},{id:'star',x:.48+.37*Math.sin(t*.66+1.7),y:1.75+.025*Math.cos(t*.9),z:4.7}];}
export function createLaserModel(){
 let state='idle',paused=false,steady=false,pending=false,aimX=0,aimY=0,aimYaw=.025,aimPitch=.035,yaw=aimYaw,pitch=aimPitch,smoothYaw=yaw,smoothPitch=pitch,ticks=0,cooldown=0,beam=null,beamTicks=0,shots=0,results=[],accumulator=0,reason='';
 function frame(){return{root:{x:0,y:.012,z:0},feet:{left:{x:-.21,y:.012,z:0,contact:true},right:{x:.21,y:.012,z:0,contact:true}},guard:1,yaw,pitch,targets:laserTargets(ticks*LASER_DT),beam:copy(beam)};}
 function snapshot(){return{state,paused,steady,aimX,aimY,aimYaw,aimPitch,yaw,pitch,shots,remaining:G.shots-shots,hits:results.filter(r=>r.kind==='target').length,results:copy(results),cooldown:cooldown*LASER_DT,beam:copy(beam),elapsed:ticks*LASER_DT,reason,frame:frame()};}
 function clear(){steady=false;pending=false;aimX=0;aimY=0;accumulator=0;}
 function ready(){if(state==='idle')state='ready';return snapshot();}
 function start(){if(!paused&&['ready','stopped'].includes(state)){clear();state='active';ticks=0;cooldown=0;beam=null;beamTicks=0;shots=0;results=[];reason='';}return snapshot();}
 function setInput(i){if(!i||paused||state!=='active')return snapshot();if(i.cancel){clear();return snapshot();}for(const[k,a,b]of[['yaw',G.minYaw,G.maxYaw],['pitch',G.minPitch,G.maxPitch]])if(Number.isFinite(i[k])){if(k==='yaw')aimYaw=clamp(i[k],a,b);else aimPitch=clamp(i[k],a,b);}if(Number.isFinite(i.aimX))aimX=clamp(i.aimX,-1,1);if(Number.isFinite(i.aimY))aimY=clamp(i.aimY,-1,1);if(typeof i.steady==='boolean')steady=i.steady;if(i.trigger===true&&cooldown===0)pending=true;return snapshot();}
 function stop(why='exit'){if(!['disposed','stopped'].includes(state)){clear();state='stopping';reason=why;}return snapshot();}
 function step(probe){
  if(cooldown>0)cooldown--;if(beamTicks>0&&--beamTicks===0)beam=null;
  if(state==='stopping'){if(!beam)state='stopped';return;}
  ticks++;aimYaw=clamp(aimYaw+aimX*.14*LASER_DT,G.minYaw,G.maxYaw);aimPitch=clamp(aimPitch+aimY*.12*LASER_DT,G.minPitch,G.maxPitch);const a=1-Math.exp(-LASER_DT/.08);smoothYaw+=(aimYaw-smoothYaw)*a;smoothPitch+=(aimPitch-smoothPitch)*a;const sway=steady?.0005:.004;yaw=clamp(smoothYaw+Math.sin(ticks*.031)*sway,G.minYaw,G.maxYaw);pitch=clamp(smoothPitch+Math.sin(ticks*.027)*sway,G.minPitch,G.maxPitch);
  const f=frame();probe.prepare?.(f);
  if(!pending)return;pending=false;const r=probe.fire?.(f);if(!r||![r.handGap,r.secondHandGap,r.supportGap].every(Number.isFinite)||Math.abs(r.handGap)>=.001||Math.abs(r.secondHandGap)>=.001||Math.abs(r.supportGap)>=.0001)return;
  const o=r.muzzle,d=r.direction;if(![o?.x,o?.y,o?.z,d?.x,d?.y,d?.z].every(Number.isFinite)||Math.abs(Math.hypot(d.x,d.y,d.z)-1)>.0001||d.z<.94)return;const hit=probe.ray?.(o,d);if(!hit||!['target','backstop'].includes(hit.kind)||![hit.point?.x,hit.point?.y,hit.point?.z].every(Number.isFinite)||(hit.kind==='target'&&!f.targets.some(t=>t.id===hit.target)))return;
  shots++;cooldown=G.cooldownTicks;const result={kind:hit.kind,target:hit.target??null,point:copy(hit.point),shot:shots};results.push(result);beam={origin:copy(o),point:copy(hit.point),kind:hit.kind,target:result.target};beamTicks=G.beamTicks;if(shots>=G.shots){clear();state='stopping';reason='complete';}
 }
 function update(dt,probe={}){if(paused||!['active','stopping'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/LASER_DT);accumulator=Math.max(0,accumulator-n*LASER_DT);while(n--&&['active','stopping'].includes(state))step(probe);return snapshot();}
 return{ready,start,setInput,stop,update,snapshot,pause(){paused=true;clear();return snapshot();},resume(){paused=false;clear();return snapshot();},dispose(){clear();beam=null;paused=true;state='disposed';}};
}
