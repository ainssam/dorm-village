import {mountBumperInput} from './bumper-input.js';
export function mountKartInput(options){
 const{ride,walking,stage}=options;
 const h=mountBumperInput({...options,showDirections:false,controlsClass:'kart-controls',scopeSelector:'#move-stick',getExternalIntent:()=>walking?.getDrivingStick?.(),useDrivingStick:true}),doc=h.element.ownerDocument??stage.ownerDocument??document,status=doc.createElement('output');
 status.className='kart-race-status';status.setAttribute('aria-live','off');status.setAttribute('aria-label','이번 1랩 기록');h.element.append(status);stage.setAttribute('data-kart-active','true');
 function paint(){h.element.setAttribute('aria-label',ride.paused?'카트 일시 정지 · 계속하기를 눌러요':'카트 운전 · 조이스틱 또는 방향키/W A S D');const time=ride.raceTime.toFixed(2)+'초';status.textContent=ride.exitRequested?'주차하고 내려오는 중':ride.phase==='entering'?'카트에 앉는 중':ride.raceState==='countdown'?Math.ceil(ride.countdown)+' · 출발 준비':ride.raceState==='finished'?'완주! '+time:'1 LAP · '+time+' · '+Math.min(5,ride.lap.nextGate-1)+'/5';}
 paint();return{...h,status,sync(dt=0){h.sync(dt);paint();},resume(){const result=h.resume();paint();return result;},pause(){h.pause();paint();},leave(){h.leave();paint();},dispose(){h.dispose();stage.setAttribute('data-kart-active','false');}};
}
