import * as THREE from 'three';
import {createThrowModel} from './throw-model.js';
import {createThrowSession,fitThrowCamera} from './throw-session.js';
export const THROW_BODY=`<div class="throw-layout"><div class="throw-court" id="throw-court" role="img" aria-label="도름이 손에서 골대로 향하는 공의 예상 궤적과 실제 공놀이"><p class="throw-score" id="throw-score" aria-live="polite"></p></div><section class="throw-panel" id="throw-panel" aria-label="공 던지기 조절"><div class="throw-modes" role="group" aria-label="놀이 방법"><button id="throw-practice" aria-pressed="true">느긋한 연습</button><button id="throw-challenge" aria-pressed="false">다섯 공 도전</button></div><div class="throw-fields"><label for="throw-yaw">방향 <output id="throw-yaw-value"></output></label><input id="throw-yaw" type="range" min="-18" max="18" step="1" value="0"><label for="throw-power">힘 <output id="throw-power-value"></output></label><input id="throw-power" type="range" min="0" max="100" step="1" value="50"><details id="throw-more"><summary>높이 각도 바꾸기</summary><label for="throw-pitch">각도 <output id="throw-pitch-value"></output></label><input id="throw-pitch" type="range" min="35" max="70" step="1" value="52"><p>각도와 힘을 바꾸고 점선이 어떻게 달라지는지 살펴봐요</p></details></div><p id="throw-feedback" role="status">점선을 보며 방향과 힘을 골라요</p><div class="throw-actions"><button class="secondary" id="throw-reset">공 다시 놓기</button><button class="primary" id="throw-launch">던지기</button><button class="secondary" id="throw-pause">잠깐 쉬기</button></div></section></div>`;
/** Own input and lifecycle; the main game alone advances/render the fixed-step model. */
export function createThrowController({ui,getView,getActors,stage,isAllowed=()=>true,document:doc=globalThis.document,window:win=globalThis.window,sessionFactory=createThrowSession,fitCamera=fitThrowCamera}){
 const camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,100);let live=null,settings={power:50,pitchDeg:52,yawDeg:0},mode='practice';
 const $=id=>doc.querySelector('#'+id);
 function clean(){const s=live;if(!s)return;live=null;settings={...s.model.snapshot().settings};s.model.dispose();s.session.dispose();s.court.setActive(false);s.observer?.disconnect();for(const [node,type,fn] of s.listeners)node.removeEventListener(type,fn);stage.classList.remove('throw-open');doc.body?.classList.remove('throw-open');}
 function close(){if(!live)return;clean();ui.close();}
 function listen(node,type,fn){node?.addEventListener(type,fn);live.listeners.push([node,type,fn]);}
 function gesture(e){if(e?.detail>0&&live?.pointer?.cancelled)return false;return !!live;}
 function observe(){if(!live)return;const snap=live.model.snapshot();live.session.update(snap);live.court.update(snap);return snap;}
 function preview(){if(!live)return;const snap=observe();if(snap.phase==='aiming'){live.preview=live.model.predict(undefined,undefined,{duration:1.5,sampleEvery:4,stopAtFirstContact:true}).points;live.court.update(snap,live.preview);live.fit=null;}render();}
 function render(){if(!live)return;const s=live.model.snapshot(),paused=s.paused;for(const [key,id]of[['yawDeg','yaw'],['power','power'],['pitchDeg','pitch']]){const input=$('throw-'+id);input.value=String(s.settings[key]);input.disabled=s.phase!=='aiming'||paused;$('throw-'+id+'-value').textContent=id==='power'?`${Math.round(s.settings[key])}%`:id==='yaw'?(s.settings[key]===0?'가운데':`${s.settings[key]>0?'오른쪽':'왼쪽'} ${Math.abs(Math.round(s.settings[key]))}°`):`${Math.round(s.settings[key])}°`;}
  $('throw-score').textContent=mode==='challenge'?`들어간 공 ${s.score} · ${s.attempts} / 5구`:`들어간 공 ${s.score} · 던진 공 ${s.attempts}`;
  $('throw-practice').setAttribute?.('aria-pressed',String(mode==='practice'));$('throw-challenge').setAttribute?.('aria-pressed',String(mode==='challenge'));
  $('throw-launch').disabled=s.phase!=='aiming'||paused||s.challengeComplete;$('throw-reset').disabled=paused;$('throw-reset').textContent=s.challengeComplete?'다섯 공 다시':'공 다시 놓기';$('throw-pause').textContent=paused?'계속':'쉬기';
  $('throw-feedback').textContent=paused?'잠깐 멈췄어요. 계속 던지기를 누르면 이어져요':s.challengeComplete?`다섯 공 중 ${s.score}개! 힘과 각도를 바꿔 다시 해 봐요`:live.message;
 }
 function pause(reason){if(!live)return;live.model.pause(reason);live.model.pause('manual');if(live.pointer)live.pointer.cancelled=true;render();}
 function open(){if(live||!isAllowed())return false;const view=getView(),court=view?.schoolView?.throwCourt;if(!court)return false;
  return ui.workshop('작은 던지기 코트',THROW_BODY,()=>{
   let session;try{session=sessionFactory({zoneRoot:court.root,...getActors()});}catch{ui.close();ui.toast('공을 준비하지 못했어요. 다시 열어 주세요');return;}
   const model=createThrowModel({origin:session.origin,settings,mode});live={model,session,court,view,listeners:[],pointer:null,message:'점선을 보며 방향과 힘을 골라요',observer:null};stage.classList.add('throw-open');doc.body?.classList.add('throw-open');court.setActive(true);
   const act=(id,fn)=>listen($(id),'click',e=>{if(!gesture(e))return;e.preventDefault();fn();});
   const aim=()=>{if(!live)return;live.model.aim({yawDeg:Number($('throw-yaw').value),power:Number($('throw-power').value),pitchDeg:Number($('throw-pitch').value)});live.message='점선을 보며 방향과 힘을 골라요';preview();};
   for(const id of ['throw-yaw','throw-power','throw-pitch'])listen($(id),'input',aim);
   act('throw-launch',()=>{if(live.model.throwBall()){live.message='공이 날아가요';observe();render();}});
   act('throw-reset',()=>{const s=live.model.snapshot();if(s.paused)return;if(s.challengeComplete)live.model.resetSession({mode});else live.model.resetBall();live.message='같은 힘으로 다시, 또는 조금 바꿔 볼까요?';preview();});
   for(const choice of ['practice','challenge'])act('throw-'+choice,()=>{mode=choice;live.model.resetSession({mode});live.message=choice==='challenge'?'다섯 공을 던져요. 시간 제한은 없어요':'횟수 걱정 없이 천천히 연습해요';preview();});
   act('throw-pause',()=>{if(doc.hidden)return;const s=live.model.snapshot();if(s.paused){for(const reason of s.pauseReasons)live.model.resume(reason);}else live.model.pause('manual');render();});
   listen($('throw-panel'),'pointerdown',e=>{live.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,cancelled:e.isPrimary===false||e.button!==0};});
   listen($('throw-panel'),'pointermove',e=>{const p=live?.pointer;if(p?.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.cancelled=true;});
   listen($('throw-panel'),'pointercancel',e=>{if(live?.pointer?.id===e.pointerId)live.pointer.cancelled=true;});
   listen($('throw-panel'),'keydown',e=>{if(e.repeat&&[' ','Enter'].includes(e.key))e.preventDefault();});
   listen(doc,'visibilitychange',()=>{if(doc.hidden)pause('hidden');else{live?.model.resume('hidden');render();}});listen(win,'blur',()=>pause('blur'));
   const resize=()=>{if(live)viewport(stage.clientWidth||320,stage.clientHeight||568);};listen(win,'resize',resize);if(win.visualViewport)listen(win.visualViewport,'resize',resize);
   if(typeof globalThis.ResizeObserver==='function'){live.observer=new globalThis.ResizeObserver(resize);live.observer.observe($('throw-court'));}
   preview();resize();$('throw-power').focus();return clean;
  },{kind:'throw-workshop',closeLabel:'나가기'});
 }
 function tick(dt){if(!live)return;const events=live.model.advance(dt);for(const e of events){if(e.type==='score')live.message='쏙! 골대 위에서 아래로 들어갔어요';else if(e.type==='contact'&&!live.model.snapshot().scored){const kind=e.collider??e.kind;live.message=kind==='board'?'판에 맞고 방향이 바뀌었어요':kind==='rim'?'테두리에 맞고 튕겼어요':'바닥에 튕겼어요';}else if(e.type==='settled'&&!live.model.snapshot().scored)live.message='괜찮아요. 방향이나 힘을 조금 바꿔 볼까요?';}observe();if(events.length)render();}
 function viewport(width,height){if(!live)return{x:0,y:0,width,height};const box=$('throw-court').getBoundingClientRect(),base=stage.getBoundingClientRect(),x=Math.max(0,box.left-base.left),y=Math.max(0,box.top-base.top),rect={x,y,width:Math.max(1,Math.min(box.width,width-x)),height:Math.max(1,Math.min(box.height,height-y))};const key=[rect.x,rect.y,rect.width,rect.height].join(',');if(key!==live.fit){fitCamera(camera,live.court.root,rect,live.preview);live.fit=key;}return rect;}
 return {open,close,cancel:close,tick,camera,viewport,pause,get active(){return !!live;},snapshot(){return live?.model.snapshot()??null;}};
}
