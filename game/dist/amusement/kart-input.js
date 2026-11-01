import {mountBumperInput} from './bumper-input.js';
import {createVehiclePanel,vehicleButton} from './bumper-play.js';
export function mountKartInput(options){
 const {ride,walking,stage,isAllowed=()=>true,onChange=()=>{}}=options;
 // The live first visit starts without a deadline. Timing is an explicit choice.
 if(ride.phase==='entering'){ride.restart('practice');ride.setAssistance(true);}
 const h=mountBumperInput({...options,showDirections:false,controlsClass:'kart-controls',scopeSelector:'#move-stick',getExternalIntent:()=>walking?.getDrivingStick?.(),useDrivingStick:true}),doc=h.element.ownerDocument??stage.ownerDocument??document;
 const panel=createVehiclePanel(doc,h.element,'구름 카트 · 내 속도로 한 바퀴'),status=panel.status;status.className+=' kart-race-status';status.setAttribute('aria-label','이번 카트 주행');
 const practice=vehicleButton(doc,panel.actions,'data-kart-practice','천천히 연습'),challenge=vehicleButton(doc,panel.actions,'data-kart-challenge','1랩 기록 도전'),assist=vehicleButton(doc,panel.actions,'data-kart-assist','길 따라가기 도움 · 꺼짐'),retry=vehicleButton(doc,panel.panel,'data-kart-retry','한 번 더 출발');
 retry.className='vehicle-retry';const listeners=[],listen=(node,type,fn)=>{node.addEventListener(type,fn);listeners.push([node,type,fn]);};let announcement='',closed=false;
 const allowed=()=>isAllowed()&&!doc.hidden&&doc.hasFocus?.()!==false&&!ride.exitRequested&&!ride.done;
 const restart=mode=>{if(!allowed())return;h.pause();ride.restart(mode);h.resume();panel.choices.open=false;onChange();paint();};
 listen(practice,'click',()=>restart('practice'));listen(challenge,'click',()=>restart('challenge'));listen(retry,'click',()=>restart(ride.mode));listen(assist,'click',()=>{if(!allowed())return;h.pause();ride.setAssistance(!ride.assistance);h.resume();paint();});listen(panel.choices,'toggle',onChange);
 panel.choices.open=ride.phase==='entering';stage.setAttribute('data-kart-active','true');
 function paint(){
  h.element.setAttribute('aria-label',ride.paused?'카트 일시 정지 · 계속하기를 눌러요':'카트 운전 · 조이스틱 또는 방향키/W A S D');
  const time=ride.raceTime.toFixed(2)+'초',progress=Math.min(5,ride.lap.nextGate-1)+'/5';
  status.textContent=ride.exitRequested?'주차하고 내려오는 중':ride.phase==='entering'?'앉는 동안 연습이나 도전을 골라요':ride.raceState==='countdown'?Math.ceil(ride.countdown)+' · 출발 준비':ride.raceState==='finished'?'완주! '+time:ride.mode==='practice'?`느린 연습 · ${ride.practiceLaps}바퀴 · 길표시 ${progress}`:`1 LAP · ${time} · ${progress}`;
  const message=ride.raceState==='finished'?`완주했어요! 이번 ${time}${ride.previousTime===null?'':` · 직전 ${ride.previousTime.toFixed(2)}초`}${ride.bestTime===null?'':` · 이 탑승 최고 ${ride.bestTime.toFixed(2)}초`}.`:ride.notice??'';
  if(message!==announcement){announcement=message;panel.result.textContent=message;panel.result.hidden=!message;}
  practice.setAttribute('aria-pressed',String(ride.mode==='practice'));challenge.setAttribute('aria-pressed',String(ride.mode==='challenge'));assist.setAttribute('aria-pressed',String(ride.assistance));assist.textContent='길 따라가기 도움 · '+(ride.assistance?'켜짐':'꺼짐');
  for(const b of[practice,challenge,assist,retry])b.disabled=ride.exitRequested;
  retry.hidden=ride.raceState!=='finished';
  panel.help.textContent='위: 전진 · 좌우: 방향 · 아래: 브레이크와 후진. 도움을 켜면 위로 밀 때 길의 방향을 잡아줘요. 기록은 이번 탑승에서만 남아요.';
  if(!closed&&Math.abs(ride.speed)>.1){panel.choices.open=false;closed=true;onChange();}
 }
 paint();return{...h,status,sync(dt=0){h.sync(dt);paint();},resume(){const result=h.resume();paint();return result;},pause(){h.pause();paint();},leave(){h.leave();paint();},dispose(){for(const[n,t,f]of listeners)n.removeEventListener(t,f);h.dispose();stage.setAttribute('data-kart-active','false');}};
}
