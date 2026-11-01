import {createFishScoopSessionView} from './fish-scoop-view.js';
import {createFishScoopState,startFishScoop,moveFishScoopNet,triggerFishScoop,stepFishScoop,pauseFishScoop,resumeFishScoop,cancelFishScoop,finishFishScoop,fishScoopAim,FISH_SCOOP_NAMES} from './fish-scoop-model.js';

const BODY=`<header class="fish-scoop-heading"><strong>작은 뜰채 연못</strong><span data-fish-scoop-clock>느긋한 연습</span><span data-fish-scoop-score>만남 0번</span><button type="button" data-fish-scoop-close aria-label="뜰채 놀이 나가기">나가기 ×</button></header><section class="fish-scoop-panel" aria-label="뜰채 놀이 조작"><div class="fish-scoop-modes" data-fish-scoop-modes role="group" aria-label="놀이 방식"><button type="button" data-fish-scoop-practice aria-pressed="true">느긋한 연습</button><button type="button" data-fish-scoop-challenge aria-pressed="false">50초 도전</button></div><p data-fish-scoop-status role="status" aria-live="polite"></p><p class="fish-scoop-collection" data-fish-scoop-collection></p><p class="fish-scoop-result" data-fish-scoop-result hidden></p><div class="fish-scoop-actions"><button type="button" data-fish-scoop-start>느긋하게 시작</button><button type="button" data-fish-scoop-catch hidden>뜰채 내리기<span class="fish-scoop-key"> · Space</span></button><button type="button" data-fish-scoop-pause hidden>잠깐 쉬기</button><button type="button" data-fish-scoop-finish hidden>놀이 마치기</button><button type="button" data-fish-scoop-retry hidden>한 번 더</button><button type="button" data-fish-scoop-exit>나가기</button></div><small class="fish-scoop-help-full">왼쪽 스틱 또는 WASD·방향키로 뜰채를 옮겨요. 물고기가 바닥 원 안에 들어오면 눌러요. 만난 물고기는 다시 연못으로 돌아가요.</small><small class="fish-scoop-help-short">왼쪽 스틱으로 옮겨요. 물고기가 원 안에 오면 뜰채 버튼을 눌러요.</small></section>`;
const KEYS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);

export function createFishScoopController({stage,ui,input,getView,getRoom,getActors,reduced=false,isAllowed=()=>true,onActive=()=>{},doc=globalThis.document,win=globalThis.window}){
 let live=null,disposed=false,seed=.17,bestScore=0,challengeRounds=0;
 const listen=(s,node,type,fn,options)=>{node?.addEventListener?.(type,fn,options);s.listeners.push([node,type,fn,options]);};
 const current=s=>!!s&&live===s&&getView()===s.source&&getRoom()==='amusementIsland';
 const clear=s=>{s.keys.clear();input?.clear?.();};
 function close(s=live){if(!s||live!==s)return;live=null;if(s.stickLabel!=null)doc.querySelector?.('#move-stick')?.setAttribute?.('aria-label',s.stickLabel);if(s.stickHelp!=null){const help=doc.querySelector?.('#stick-help');if(help)help.textContent=s.stickHelp;}s.game=cancelFishScoop(s.game);clear(s);input?.setDrivingStickEnabled?.(false);for(const[n,t,f,o]of s.listeners)n?.removeEventListener?.(t,f,o);try{s.view.dispose();}finally{s.root.remove();stage.classList.remove('fish-scoop-open');doc.body?.classList.remove('fish-scoop-open');onActive(false);if(!doc.hidden)doc.querySelector?.('#scene')?.focus?.({preventScroll:true});}}
 function axes(s){let x=0,z=0;for(const code of s.keys){if(code==='ArrowLeft'||code==='KeyA')x--;if(code==='ArrowRight'||code==='KeyD')x++;if(code==='ArrowUp'||code==='KeyW')z--;if(code==='ArrowDown'||code==='KeyS')z++;}const stick=input?.getDrivingStick?.()??{x:0,z:0};x+=Number.isFinite(stick.x)?stick.x:0;z-=Number.isFinite(stick.z)?stick.z:0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}return{x,z};}
 function text(s){
  const game=s.game,phase=game.phase,practice=game.mode==='practice',$=q=>s.root.querySelector(q),aim=fishScoopAim(game),kinds=game.catchesByFish.filter(Boolean).length;
  if(phase==='complete'&&!s.recorded){s.recorded=true;if(!practice){bestScore=Math.max(bestScore,game.score);challengeRounds++;}}
  let status=aim?.ready?`${FISH_SCOOP_NAMES[aim.index]}가 원 안에 있어요. 지금 내려 보세요!`:'물고기 쪽으로 뜰채를 옮겨 바닥 원을 맞춰요.';
  if(phase==='ready')status=practice?'시간 제한 없이 네 빛깔 물고기를 만나 보세요. 준비되면 시작해요.':'50초 동안 뜰채를 움직여 물고기를 만나요. 기록보다 천천히 조준해도 좋아요.';
  else if(phase==='paused')status='잠깐 멈췄어요. 계속하기를 누르면 이어서 놀아요.';
  else if(phase==='playing'&&game.scoop.phase==='lowering')status='뜰채가 내려가요…';
  else if(phase==='playing'&&(game.scoop.phase==='rising'||game.feedback)){
   const result=game.feedback?.type??game.scoop.result,index=game.feedback?.fishIndex??game.scoop.fishIndex;
   status=result==='caught'?`${FISH_SCOOP_NAMES[index]}와 만났어요! 다시 연못으로 보내요.`:'조금 빗나갔어요. 물고기가 바닥 원 안에 들어올 때 내려 보세요.';
  }else if(phase==='complete')status=game.score?`수고했어요! ${game.score}번 만나고 ${kinds}가지 빛깔을 발견했어요.`:'천천히 둘러봤어요. 다시 놀 때는 물고기 쪽으로 뜰채를 옮겨 보세요.';
  const timer=practice?'시간 제한 없음':phase==='complete'?'도전 끝':`${Math.ceil(game.timeLeft)}초`;
  const score=`만남 ${game.score}번`;
  if(timer!==s.lastTimer){$('[data-fish-scoop-clock]').textContent=timer;s.lastTimer=timer;}
  if(score!==s.lastScore){$('[data-fish-scoop-score]').textContent=score;s.lastScore=score;}
  if(status!==s.lastStatus){$('[data-fish-scoop-status]').textContent=status;s.lastStatus=status;}
  const collection=`네 빛깔 ${kinds}/4 · `+game.catchesByFish.map((count,i)=>`${['살구','민트','햇살','보라'][i]} ${count?'✓':'·'}`).join('  ');
  if(collection!==s.lastCollection){$('[data-fish-scoop-collection]').textContent=collection;s.lastCollection=collection;}
  const summary=$('[data-fish-scoop-result]');summary.hidden=phase!=='complete';
  if(phase==='complete')summary.textContent=`${game.attempts}번 내려 ${game.score}번 만났어요.`+(!practice?` 이번 방문 최고 ${bestScore}번 · ${challengeRounds}번 도전`:' 시간에 쫓기지 않고 다시 놀 수 있어요.');
  const start=$('[data-fish-scoop-start]'),catchButton=$('[data-fish-scoop-catch]'),pause=$('[data-fish-scoop-pause]'),retry=$('[data-fish-scoop-retry]');
  start.hidden=phase!=='ready';start.textContent=practice?'느긋하게 시작':'시작 · 50초';catchButton.hidden=phase!=='playing';catchButton.disabled=phase!=='playing'||game.scoop.phase!=='idle';pause.hidden=!['playing','paused'].includes(phase);pause.textContent=phase==='paused'?'계속하기':'잠깐 쉬기';retry.hidden=phase!=='complete';
  $('[data-fish-scoop-finish]').hidden=!practice||!['playing','paused'].includes(phase);$('[data-fish-scoop-modes]').hidden=!['ready','complete'].includes(phase);
  $('[data-fish-scoop-practice]').setAttribute('aria-pressed',String(practice));$('[data-fish-scoop-challenge]').setAttribute('aria-pressed',String(!practice));
  s.root.dataset.phase=phase;s.root.dataset.mode=game.mode;
  if(phase==='complete'&&s.lastPhase!=='complete')retry.focus?.({preventScroll:true});s.lastPhase=phase;
 }
 function render(s){if(!current(s))return;s.view.update(s.game);text(s);}
 function pause(s=live){if(!current(s)||s.game.phase!=='playing')return;clear(s);s.game=pauseFishScoop(s.game);render(s);}
 function perform(s,kind){
  if(!current(s)||doc.hidden)return;if(kind!=='catch')clear(s);
  if(kind==='start'&&s.game.phase==='ready')s.game=startFishScoop(s.game);
  else if(kind==='catch'&&s.game.phase==='playing')s.game=triggerFishScoop(s.game);
  else if(kind==='pause')s.game=s.game.phase==='paused'?resumeFishScoop(s.game):pauseFishScoop(s.game);
  else if(kind==='finish'&&s.game.mode==='practice')s.game=finishFishScoop(s.game);
  else if(['practice','challenge'].includes(kind)&&['ready','complete'].includes(s.game.phase)){s.game=createFishScoopState({seed,mode:kind});s.recorded=false;}
  else if(kind==='retry'&&s.game.phase==='complete'){seed=(seed+.38196601125)%1;s.game=startFishScoop(createFishScoopState({seed,mode:s.game.mode}));s.recorded=false;}
  render(s);if(kind==='start'||kind==='retry')s.root.querySelector('[data-fish-scoop-catch]').focus?.({preventScroll:true});
 }
 function open(){if(disposed||live||doc.hidden||getRoom()!=='amusementIsland'||!isAllowed())return false;const source=getView(),site=source?.fishScoopSite,actors=getActors();if(!site||!actors?.player||!actors?.model)return false;
  const root=doc.createElement('section');root.className='fish-scoop-overlay';root.innerHTML=BODY;root.setAttribute('role','group');root.setAttribute('aria-label','물고기 뜰채 잡기');stage.appendChild(root);let s,view;
  try{view=createFishScoopSessionView({site,...actors,zoneRoot:source.root,reduced});s={root,view,source,game:createFishScoopState({seed,mode:'practice'}),listeners:[],keys:new Set()};live=s;stage.classList.add('fish-scoop-open');doc.body?.classList.add('fish-scoop-open');clear(s);onActive(true);input?.setDrivingStickEnabled?.(true);s.stickLabel=doc.querySelector?.('#move-stick')?.getAttribute?.('aria-label');s.stickHelp=doc.querySelector?.('#stick-help')?.textContent;doc.querySelector?.('#move-stick')?.setAttribute?.('aria-label','뜰채 이동 스틱. 물고기 쪽으로 밀어 옮겨요');const stickHelp=doc.querySelector?.('#stick-help');if(stickHelp)stickHelp.textContent='밀어서 뜰채 옮기기';
   listen(s,root.querySelector('[data-fish-scoop-start]'),'click',()=>perform(s,'start'));
   for(const kind of ['practice','challenge','finish'])listen(s,root.querySelector('[data-fish-scoop-'+kind+']'),'click',()=>perform(s,kind));
   const catchButton=root.querySelector('[data-fish-scoop-catch]');listen(s,catchButton,'pointerdown',e=>{if(e.button!==0||catchButton.disabled)return;e.preventDefault();perform(s,'catch');});listen(s,catchButton,'click',e=>{if((e.detail??0)===0)perform(s,'catch');});
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
 return{open,close:()=>close(),cancel:()=>close(),dispose:()=>{disposed=true;close();},get disposed(){return disposed;},pause,get active(){return!!live;},get camera(){return live?.view.camera;},viewport,snapshot:()=>live?{...live.game,net:{...live.game.net},score:live.game.score,catchesByFish:[...live.game.catchesByFish],bestScore,challengeRounds,remainingSeconds:live.game.mode==='practice'?null:Math.ceil(live.game.timeLeft)}:null,tick(dt,{paused=false}={}){const s=live;if(!s)return;if(!current(s)){close(s);return;}if(doc.hidden||paused){pause(s);return;}if(s.game.phase!=='playing')return;const d=Math.min(Number.isFinite(dt)?Math.max(0,dt):0,.05);s.game=moveFishScoopNet(s.game,axes(s),d);s.game=stepFishScoop(s.game,d);render(s);}};
}
