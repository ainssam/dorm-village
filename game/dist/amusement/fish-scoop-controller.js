import {createFishScoopSessionView} from './fish-scoop-view.js';
import {createFishScoopState,startFishScoop,moveFishScoopNet,triggerFishScoop,stepFishScoop,pauseFishScoop,resumeFishScoop,cancelFishScoop} from './fish-scoop-model.js';

const BODY=`<header class="fish-scoop-heading"><strong>뜰채로 물고기 잡기</strong><span data-fish-scoop-clock>50초</span><span data-fish-scoop-score>잡은 물고기 0</span><button type="button" data-fish-scoop-close aria-label="뜰채 놀이 나가기">나가기 ×</button></header><section class="fish-scoop-panel" aria-label="뜰채 놀이 조작"><p data-fish-scoop-status role="status" aria-live="polite">화면 속 물고기 가까이에 뜰채를 옮겨 보세요.</p><div class="fish-scoop-actions"><button type="button" data-fish-scoop-start>시작 · 50초</button><button type="button" data-fish-scoop-catch hidden>뜰채 휙 · Space</button><button type="button" data-fish-scoop-pause hidden>잠깐 쉬기</button><button type="button" data-fish-scoop-retry hidden>한 번 더</button><button type="button" data-fish-scoop-exit>나가기</button></div><small>왼쪽 조이스틱 또는 WASD·방향키로 움직여요. 물고기 가까이에서 뜰채 버튼을 눌러요.</small></section>`;
const KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);

export function createFishScoopController({stage,ui,input,getView,getRoom,getActors,reduced=false,isAllowed=()=>true,onActive=()=>{},doc=globalThis.document,win=globalThis.window}){
 let live=null,disposed=false,seed=.17;
 const listen=(s,node,type,fn,options)=>{node?.addEventListener?.(type,fn,options);s.listeners.push([node,type,fn,options]);};
 const current=s=>!!s&&live===s&&getView()===s.source&&getRoom()==='amusementIsland';
 const clear=s=>{s.keys.clear();input?.clear?.();};
 function close(s=live){if(!s||live!==s)return;live=null;s.game=cancelFishScoop(s.game);clear(s);input?.setDrivingStickEnabled?.(false);for(const[n,t,f,o]of s.listeners)n?.removeEventListener?.(t,f,o);try{s.view.dispose();}finally{s.root.remove();stage.classList.remove('fish-scoop-open');doc.body?.classList.remove('fish-scoop-open');onActive(false);if(!doc.hidden)doc.querySelector?.('#scene')?.focus?.({preventScroll:true});}}
 function axes(s){let x=0,z=0;for(const code of s.keys){if(code==='ArrowLeft'||code==='KeyA')x--;if(code==='ArrowRight'||code==='KeyD')x++;if(code==='ArrowUp'||code==='KeyW')z--;if(code==='ArrowDown'||code==='KeyS')z++;}const stick=input?.getDrivingStick?.()??{x:0,z:0};x+=Number.isFinite(stick.x)?stick.x:0;z-=Number.isFinite(stick.z)?stick.z:0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}return{x,z};}
 function text(s){const game=s.game,phase=game.phase;let status='조이스틱이나 WASD로 뜰채를 옮기고, 물고기 가까이에서 잡아 보세요.';
  if(phase==='ready')status='준비되면 시작해요. 물고기 연못은 화면 안의 3D 공간이에요.';
  else if(phase==='paused')status='잠깐 멈췄어요. 계속하기를 누르면 이어서 놀아요.';
  else if(phase==='playing'&&game.scoop.phase==='lowering')status='뜰채가 물속으로 내려가요…';
  else if(phase==='playing'&&game.scoop.phase==='rising')status=game.scoop.result==='caught'?'잡았어요! 물고기 한 마리.':'빗나갔어요. 다시 맞춰 볼까요?';
  else if(phase==='playing'&&game.feedback?.type==='caught')status='잡았어요! 물고기 한 마리.';
  else if(phase==='playing'&&game.feedback?.type==='miss')status='빗나갔어요. 물고기 가까이에서 다시 잡아 봐요.';
  else if(phase==='complete')status=`끝났어요! 이번 판 점수는 ${game.score}마리예요.`;
  const timer=phase==='ready'?'50초':phase==='complete'?'끝':`${Math.ceil(game.timeLeft)}초`;
  const score=`잡은 물고기 ${game.score}`;
  if(timer!==s.lastTimer){s.root.querySelector('[data-fish-scoop-clock]').textContent=timer;s.lastTimer=timer;}
  if(score!==s.lastScore){s.root.querySelector('[data-fish-scoop-score]').textContent=score;s.lastScore=score;}
  if(status!==s.lastStatus){s.root.querySelector('[data-fish-scoop-status]').textContent=status;s.lastStatus=status;}
  const start=s.root.querySelector('[data-fish-scoop-start]'),catchButton=s.root.querySelector('[data-fish-scoop-catch]'),pause=s.root.querySelector('[data-fish-scoop-pause]'),retry=s.root.querySelector('[data-fish-scoop-retry]');
  start.hidden=phase!=='ready';catchButton.hidden=phase!=='playing';catchButton.disabled=phase!=='playing'||game.scoop.phase!=='idle';pause.hidden=!['playing','paused'].includes(phase);pause.textContent=phase==='paused'?'계속하기':'잠깐 쉬기';retry.hidden=phase!=='complete';s.root.dataset.phase=phase;
 }
 function render(s){if(!current(s))return;s.view.update(s.game);text(s);}
 function pause(s=live){if(!current(s)||s.game.phase!=='playing')return;clear(s);s.game=pauseFishScoop(s.game);render(s);}
 function perform(s,kind){if(!current(s)||doc.hidden)return;clear(s);if(kind==='start'&&s.game.phase==='ready')s.game=startFishScoop(s.game);else if(kind==='catch'&&s.game.phase==='playing')s.game=triggerFishScoop(s.game);else if(kind==='pause'){if(s.game.phase==='paused')s.game=resumeFishScoop(s.game);else s.game=pauseFishScoop(s.game);}else if(kind==='retry'&&s.game.phase==='complete'){seed=(seed+.38196601125)%1;s.game=startFishScoop(createFishScoopState({seed}));}render(s);if(kind==='start'||kind==='retry')s.root.querySelector('[data-fish-scoop-catch]').focus?.({preventScroll:true});}
 function open(){if(disposed||live||doc.hidden||getRoom()!=='amusementIsland'||!isAllowed())return false;const source=getView(),site=source?.fishScoopSite,actors=getActors();if(!site||!actors?.player||!actors?.model)return false;
  const root=doc.createElement('section');root.className='fish-scoop-overlay';root.innerHTML=BODY;root.setAttribute('role','group');root.setAttribute('aria-label','물고기 뜰채 잡기');stage.appendChild(root);let s,view;
  try{view=createFishScoopSessionView({site,...actors,zoneRoot:source.root,reduced});s={root,view,source,game:createFishScoopState({seed}),listeners:[],keys:new Set()};live=s;stage.classList.add('fish-scoop-open');doc.body?.classList.add('fish-scoop-open');clear(s);onActive(true);input?.setDrivingStickEnabled?.(true);
   listen(s,root.querySelector('[data-fish-scoop-start]'),'click',()=>perform(s,'start'));
   listen(s,root.querySelector('[data-fish-scoop-catch]'),'click',()=>perform(s,'catch'));
   listen(s,root.querySelector('[data-fish-scoop-pause]'),'click',()=>perform(s,'pause'));
   listen(s,root.querySelector('[data-fish-scoop-retry]'),'click',()=>perform(s,'retry'));
   for(const el of[root.querySelector('[data-fish-scoop-close]'),root.querySelector('[data-fish-scoop-exit]')])listen(s,el,'click',()=>close(s));
   listen(s,doc,'keydown',e=>{if(!current(s)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation?.();if(!e.repeat)close(s);return;}if(KEYS.has(e.code)){e.preventDefault();e.stopImmediatePropagation?.();if(!e.repeat)s.keys.add(e.code);return;}if(e.code==='Space'&&s.game.phase==='playing'&&e.target?.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation?.();if(!e.repeat)perform(s,'catch');}},{capture:true});
   listen(s,doc,'keyup',e=>{if(!current(s))return;if(s.keys.delete(e.code)){e.preventDefault();e.stopImmediatePropagation?.();}},{capture:true});
   listen(s,win,'blur',()=>pause(s));listen(s,doc,'visibilitychange',()=>{if(doc.hidden)pause(s);});listen(s,win,'pagehide',()=>close(s));listen(s,win,'resize',()=>{if(current(s)){clear(s);s.fit=null;}});listen(s,win,'orientationchange',()=>{if(current(s)){pause(s);s.fit=null;}});
   render(s);root.querySelector('[data-fish-scoop-start]').focus?.({preventScroll:true});return true;
  }catch{if(live===s&&s)close(s);else{view?.dispose?.();root.remove();}ui?.toast?.('뜰채 연못을 준비하지 못했어요. 다시 열어 주세요');return false;}
 }
 function viewport(width,height){if(!live)return{x:0,y:0,width,height};const w=Math.max(1,Math.min(width,stage.clientWidth||width)),h=Math.max(1,Math.min(height,stage.clientHeight||height)),key=[w,h].join('|');if(key!==live.fit){live.view.fit(w,h);live.fit=key;}return{x:0,y:0,width:w,height:h};}
 return{open,close:()=>close(),cancel:()=>close(),dispose:()=>{disposed=true;close();},get disposed(){return disposed;},pause,get active(){return!!live;},get camera(){return live?.view.camera;},viewport,snapshot:()=>live?{...live.game,net:{...live.game.net},score:live.game.score,remainingSeconds:Math.ceil(live.game.timeLeft)}:null,tick(dt,{paused=false}={}){const s=live;if(!s)return;if(!current(s)){close(s);return;}if(doc.hidden||paused){pause(s);return;}if(s.game.phase!=='playing')return;const d=Math.min(Number.isFinite(dt)?Math.max(0,dt):0,.05);s.game=moveFishScoopNet(s.game,axes(s),d);s.game=stepFishScoop(s.game,d);render(s);}};
}
