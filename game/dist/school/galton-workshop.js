import {createGaltonDiscovery} from './galton-discovery.js';

export const galtonMarkup=()=>`<div class="galton-workspace">
 <p class="galton-intro">구슬이 왼쪽이나 오른쪽으로 갈라져요.<br>어느 곳에 많이 모이는지 천천히 바라봐요.</p>
 <div class="galton-controls"><label for="galton-count">구슬 수 <select id="galton-count"><option value="30">30개 · 가볍게</option><option value="100">100개</option><option value="300">300개</option></select></label><button type="button" id="galton-start" class="primary">구슬 떨어뜨리기</button><button type="button" id="galton-pause">잠깐 멈추기</button></div>
 <p id="galton-status" class="galton-status" role="status" aria-live="polite" aria-atomic="true"></p>
 <p id="galton-progress" class="galton-progress" aria-live="off"></p>
 <figure class="galton-figure"><canvas id="galton-canvas" class="school-canvas galton-canvas" width="720" height="600" role="img" aria-label="구슬이 갈라지는 경로와 도착 비율 그래프" aria-describedby="galton-caption">아래 결과 표에서 각 칸의 구슬 수와 비율을 읽을 수 있어요.</canvas><figcaption id="galton-caption">초록 막대는 이번 구슬의 도착 비율,<br>금색 점은 각 칸에 도착할 이론 확률이에요.</figcaption></figure>
 <label class="galton-motion"><input id="galton-hide-motion" type="checkbox">그림 속 구슬 움직임 감추기</label>
 <p id="galton-observation" class="galton-observation"></p>
 <details class="galton-results"><summary>칸별 결과와 비율 보기</summary><p id="galton-table-note">칸 번호는 오른쪽으로 간 횟수예요. 비율은 선택한 전체 구슬 수를 기준으로 해요. 소수 첫째 자리로 반올림해 합계가 100%와 조금 다를 수 있어요.</p><table id="galton-bins" aria-describedby="galton-table-note"><caption>오른쪽으로 간 횟수별 도착 결과</caption><thead><tr><th scope="col">오른쪽<br>횟수</th><th scope="col" id="galton-current-heading"></th><th scope="col" id="galton-previous-heading" hidden></th><th scope="col">이론<br>확률</th></tr></thead><tbody></tbody></table></details>
 <details class="galton-explanation"><summary>어떻게 움직일까요?</summary><p>각 구슬은 8번 갈라지고, 매번 왼쪽과 오른쪽을 각각 50%의 확률로 골라요. 앞선 선택은 다음 선택에 영향을 주지 않아요.</p><p>가운데로 오는 경로는 양 끝으로 오는 경로보다 많아요. 그래도 적은 구슬을 떨어뜨리면 가운데 칸이 가장 많지 않을 수 있어요. 같은 수로 다시 해도 모양이 달라질 수 있답니다.</p><p>구슬 수를 늘려도 매번 더 매끈해지지는 않아요. 선택 횟수는 늘 8번이며, 정규분포를 보장하는 실험은 아니에요.</p><p>이것은 ‘이항분포’의 경로 모형이에요. 고교 선택 과목 ‘확률과 통계’와 연결되며 실제 구슬 충돌 물리를 그대로 재현하지는 않아요.</p></details>
 <div class="galton-bottom"><button type="button" id="galton-reset">결과 지우기</button><p>다시 보기나 구슬 수 바꾸기 전에 마친 결과 하나를 비교해요. 창을 닫아도 이어지며, 학교 2층을 떠나거나 새로고침하면 사라져요.</p></div>
</div>`;

const percent=value=>(value*100).toFixed(1)+'%';
const phaseText=s=>s.phase==='complete'?'모두 도착했어요':s.phase==='running'?'움직이는 중 · 천천히 바라봐요':s.phase==='paused'?'잠깐 멈췄어요 · 이어서 볼 수 있어요':'준비됐어요 · 구슬을 떨어뜨려 봐요';

/** The school owns simulation time. The dialog only reads it and sends user actions. */
export function mountGaltonWorkshop({container,discovery,reduced=false,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}){
 const doc=container.ownerDocument,$=selector=>container.querySelector(selector);
 const canvas=$('#galton-canvas'),ctx=canvas.getContext('2d'),status=$('#galton-status'),progress=$('#galton-progress'),observation=$('#galton-observation');
 const count=$('#galton-count'),start=$('#galton-start'),pause=$('#galton-pause'),reset=$('#galton-reset'),motion=$('#galton-hide-motion');
 const currentHeading=$('#galton-current-heading'),previousHeading=$('#galton-previous-heading'),body=$('#galton-bins tbody');
 let alive=true,frame=null,lastPhase='',lastProgress='',lastTable='',lastGraph='',hideMotion=!!reduced;
 motion.checked=hideMotion;
 const rowNodes=Array.from({length:discovery.snapshot().rows+1},(_,bin)=>{
  const row=doc.createElement('tr'),label=doc.createElement('th');label.scope='row';label.textContent=bin+'회';row.append(label);
  const values=Array.from({length:3},()=>{const cell=doc.createElement('td');row.append(cell);return cell;});body.append(row);return values;
 });
 function draw(s){
  ctx.fillStyle='#244e43';ctx.fillRect(0,0,720,600);ctx.fillStyle='#ddc484';
  for(let row=0;row<s.rows;row++)for(let i=0;i<=row;i++){ctx.beginPath();ctx.arc(360+(i-row/2)*62,52+row*40,4,0,Math.PI*2);ctx.fill();}
  if(!hideMotion){ctx.fillStyle='#ffc47b';for(const b of s.balls)if(!b.done){ctx.beginPath();ctx.arc(360+b.x*62,52-b.y*40,6,0,Math.PI*2);ctx.fill();}}
  for(const data of s.rowsData){const x=360+(data.bin-4)*62,h=data.proportion*450;ctx.fillStyle='#a6d1af';ctx.fillRect(x-21,548-h,42,h);ctx.fillStyle='#e3bc64';ctx.beginPath();ctx.arc(x,548-data.expected*450,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0e7cd';ctx.font='600 28px Pretendard, sans-serif';ctx.textAlign='center';ctx.fillText(String(data.bin),x,582);}
 }
 function render(){
  if(!alive)return;const s=discovery.snapshot(),phase=phaseText(s);
  if(phase!==lastPhase){status.textContent=phase;lastPhase=phase;}
  const detail=`대기 ${s.total-s.released} + 내려오는 중 ${s.inFlight} + 도착 ${s.landed} = ${s.total}개`;
  if(detail!==lastProgress){progress.textContent=detail;lastProgress=detail;}
  const startLabel=s.phase==='complete'?'같은 수로 다시 보기':s.phase==='paused'?'이어서 보기':'구슬 떨어뜨리기';if(start.textContent!==startLabel)start.textContent=startLabel;start.disabled=s.running;pause.disabled=!s.running;
  reset.disabled=s.phase==='ready'&&!s.previous;if(count.value!==String(s.total))count.value=String(s.total);
  const text=s.phase==='complete'?s.summary+' 같은 수로 다시 보면 어떨까요?':s.previous?`직전 ${s.previous.total}개의 결과를 아래 표에 남겼어요. 이번 결과와 천천히 비교해요.`:'금색 점과 막대는 모두 도착한 뒤 비교해요. 중간에 쉬어도 괜찮아요.';
  if(observation.textContent!==text)observation.textContent=text;
  const tableKey=JSON.stringify([s.total,s.bins,s.previous]);
  if(tableKey!==lastTable){
   currentHeading.textContent=`이번 ${s.total}개`;previousHeading.textContent=s.previous?`직전 ${s.previous.total}개`:'';previousHeading.hidden=!s.previous;
   s.rowsData.forEach((data,i)=>{const[current,prior,theory]=rowNodes[i];current.textContent=`${data.count}개 · ${percent(data.proportion)}`;prior.hidden=!s.previous;prior.textContent=s.previous?`${data.previousCount}개 · ${percent(data.previousProportion)}`:'';theory.textContent=percent(data.expected);});lastTable=tableKey;
  }
  const graphKey=JSON.stringify([hideMotion,s.total,s.bins,s.released,s.phase]);if(!hideMotion&&s.running||graphKey!==lastGraph){draw(s);lastGraph=graphKey;}
 }
 const tick=()=>{if(!alive)return;render();frame=requestFrame(tick);};
 const onStart=()=>{discovery.start();render();},onPause=()=>{discovery.pause();render();},onReset=()=>{discovery.reset();render();};
 const onCount=()=>{discovery.selectCount(Number(count.value));render();},onMotion=()=>{hideMotion=motion.checked;lastGraph='';render();};
 start.addEventListener('click',onStart);pause.addEventListener('click',onPause);reset.addEventListener('click',onReset);count.addEventListener('change',onCount);motion.addEventListener('change',onMotion);
 doc.fonts?.ready?.then(()=>{if(alive){lastGraph='';render();}});
 tick();
 return()=>{if(!alive)return;alive=false;cancelFrame(frame);discovery.close();start.removeEventListener('click',onStart);pause.removeEventListener('click',onPause);reset.removeEventListener('click',onReset);count.removeEventListener('change',onCount);motion.removeEventListener('change',onMotion);};
}

export function createGaltonTools({ui,getSimulation,reduced=false,document:doc=globalThis.document}){
 const sessions=new WeakMap();let activeDispose=null;
 return{
  open(){
   const simulation=getSimulation();if(!simulation)return false;
   if(!sessions.has(simulation))sessions.set(simulation,createGaltonDiscovery(simulation));
   activeDispose?.();
   return ui.workshop('구슬이 모이는 작은 풍경',galtonMarkup(),()=>{
    const dispose=mountGaltonWorkshop({container:doc.querySelector('.galton-workspace'),discovery:sessions.get(simulation),reduced});
    const close=()=>{dispose();if(activeDispose===close)activeDispose=null;};activeDispose=close;return close;
   },{kind:'school-workshop galton-workshop',returnButton:true});
  },
  close(){activeDispose?.();}
 };
}
