import {formatSolarEventMinute} from './astronomy/src/solar-events.js';
import {MIN_UTC_MS,MAX_UTC_MS,CITY_PRESETS,observerPreset,createSkyRequest,resolveLocalTime,localFieldsAt,formatSkyStatus} from './astronomy/src/observer-time.js';
const pad=n=>String(n).padStart(2,'0');
export function initialObservation(date){return Object.freeze({displayMode:'scientific',request:createSkyRequest({observer:observerPreset('seoul',{isExample:true}),instantUtcMs:date.getTime(),mode:'now'})});}
export function applyObservation(state,action){
 let request=state.request,displayMode=state.displayMode;
 if(action.type==='city')request=createSkyRequest({...request,observer:observerPreset(action.id)});
 else if(action.type==='selected')request=createSkyRequest({...request,instantUtcMs:action.instantUtcMs,mode:'selected'});
 else if(action.type==='now')request=createSkyRequest({...request,instantUtcMs:action.instantUtcMs,mode:'now'});
 else if(action.type==='display'){if(!['scientific','decorative'].includes(action.value))throw new RangeError('Unknown display mode');displayMode=action.value;}
 else throw new RangeError('Unknown observation action');
 return Object.freeze({request,displayMode});
}
export function localInputValue(request){const p=localFieldsAt(request.instantUtcMs,request.observer.timeZone);return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;}
export function localInputBounds(request){return{min:localInputValue({...request,instantUtcMs:MIN_UTC_MS}),max:localInputValue({...request,instantUtcMs:MAX_UTC_MS})};}
export function compactObservationStatus(request){return formatSkyStatus(request).replace(/ · 높이 .*$/,'').replace(' · '+request.observer.timeZone,'\n'+request.observer.timeZone);}
export function resolveObservationEdit(state,value){
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);if(!match)throw new RangeError('날짜와 시간을 모두 입력해 주세요');
 const [year,month,day,hour,minute]=match.slice(1).map(Number),r=resolveLocalTime({year,month,day,hour,minute},state.request.observer.timeZone);
 return {status:r.status,candidates:r.candidatesUtcMs.map((instantUtcMs,i)=>({instantUtcMs,label:`${i===0?'첫 번째':'두 번째'} · ${formatSkyStatus(createSkyRequest({...state.request,instantUtcMs,mode:'selected'})).match(/\(UTC[^)]+\)/)?.[0]??'UTC'}`}))};
}
export function solarEventReadout(request,events){
 const o=request.observer,context=`${o.label}${o.isExample?' (예시)':''} · ${localInputValue(request).slice(0,10)} · 현지 시각`;
 let pair;
 if(events?.status==='partial-range')pair='이 현지 날짜의 일부가 계산 범위를 벗어나 일출·일몰을 표시하지 않아요';
 else if(events?.status==='unsupported')pair='이 장소의 일출·일몰 계산은 지원하지 않아요';
 else if(events?.status!=='available')pair='일출·일몰을 계산하지 못했어요';
 else if(events.sunriseUtcMs===null&&events.sunsetUtcMs===null)pair='이 날짜에는 일출·일몰이 없어요';
 else pair=[['일출',events.sunriseUtcMs],['일몰',events.sunsetUtcMs]].map(([label,ms])=>`${label} ${ms===null?'없음':formatSolarEventMinute(ms,o.timeZone)}`).join(' · ');
 return {context,pair};
}
/** Scene labels deliberately use the observation minute, not rounded rise/set copy. */
export function solarHorizonReadout(request,views){
 const unavailable=views?.status!=='available',messages=[];
 const result={};
 for(const [key,label,event] of [['morning','아침','일출'],['evening','저녁','일몰']]){
  const ms=views?.[key+'UtcMs'],state=views?.[key+'Status'],available=!unavailable&&state==='available'&&Number.isFinite(ms);
  result[key]={label:`${label} 지평선 보기${available?' · '+localInputValue({...request,instantUtcMs:ms}).slice(11):''}`,disabled:!available};
  if(!unavailable&&!available)messages.push(`${label} · ${state==='no-event'?event+' 없음':state==='error'?'지평선 풍경의 시각을 계산하지 못했어요.':'이 날짜에는 태양 중심이 지평선에 오는 장면이 없어요.'}`);
 }
 result.status=views?.status==='partial-range'?'이 현지 날짜의 일부가 계산 범위를 벗어나 지평선 풍경을 표시하지 않아요':views?.status==='unsupported'?'이 장소의 지평선 풍경 계산은 지원하지 않아요':unavailable?'지평선 풍경의 시각을 계산하지 못했어요.':messages.join('\n');
 return result;
}
const horizonRows='<section data-sky-horizon-scenes aria-label="지평선 풍경"><p class="sky-small"><strong>아침·저녁 지평선 풍경</strong></p><div class="sky-horizon-actions"><button type="button" data-sky-horizon-morning disabled aria-pressed="false">아침 지평선 보기</button><button type="button" data-sky-horizon-evening disabled aria-pressed="false">저녁 지평선 보기</button></div><p class="sky-small" data-sky-horizon-status role="status" aria-live="polite"></p><p class="sky-small">태양 중심이 굴절 없는 계산에서 지평선 높이(고도 0°)에 오는 시각으로 이동해요. 위의 일출·일몰 예상 시각과는 기준이 달라요.</p><p class="sky-small">전체 하늘을 세로 시야 10°로 좁힌 정지 장면이에요. 태양만 확대하는 화면은 아니며, 구름·색감·아래쪽 지평선은 연출이에요.</p></section>';
const solarRows='<section data-sky-solar-events aria-label="표시 중인 날짜의 일출·일몰"><p class="sky-small"><strong>표시 중인 날짜의 일출·일몰 예상 시각</strong></p><p class="sky-small" data-sky-solar-date></p><p class="sky-small" data-sky-solar-pair role="status" aria-live="polite"></p><p class="sky-small">해수면과 장애물 없는 평평한 지평선, 보통의 대기 굴절을 가정한 예상이에요. 화면 속 천체 위치에는 굴절을 적용하지 않아, 시각이 같지 않을 수 있어요.</p><p class="sky-small">‘없음’은 계산 실패가 아니라 해당 날짜에 일출(또는 일몰)이 일어나지 않는다는 뜻이에요. 해가 하루 내내 지평선 위에 있거나 아래에 있을 수도 있어요.</p></section>';
const solarSource='<p>일출·일몰은 표시 중인 현지 날짜에 태양 원반의 위쪽 가장자리가 평평한 지평선에 닿는 예상 시각이에요. 높이 0 m와 표준 대기 굴절을 가정하며 분 단위로 반올림해 표시해요. 자정을 넘겨 반올림되는 경우에는 원래 날짜의 분을 유지해요. 지형·건물·실제 대기에 따라 보이는 시각은 달라져요. 화면 속 태양 위치 계산에는 대기 굴절을 적용하지 않으므로, 예상 시각에 화면의 태양이 지평선을 지나는 순간과 다를 수 있어요. 현지 시각은 해당 장소의 시간대 규칙을 따라요.</p><p>지평선 풍경은 같은 날짜의 일출·일몰과 별도로, 태양 중심이 지평선 높이(고도 0°)를 지나는 시각을 계산해 보여 줘요. 대기 굴절은 적용하지 않아요. 세로 시야 10°는 전체 하늘을 좁혀 보는 구도이며 태양만 확대하지 않아요. 장면은 선택한 시각에 멈추고 일출·일몰을 빠르게 재생하지 않아요. 아래쪽은 추상적인 지평선 표현이며 실제 바다·지형이 아니에요. 날짜와 장소에 따라 시각과 천체 위치는 달라지지만, 색과 구름은 계절별 실제 날씨를 재현하지 않아요. 해당 시각이 없는 날짜에는 그 장면만 사용할 수 없어요. 버튼의 분 표시는 위의 반올림한 예상 시각과 달리 선택한 시각의 분을 그대로 보여 줘요.</p>';
export function observerSheetHTML({includeSolarEvents=true}={}){
 return `<details class="sky-settings" data-sky-settings>
 <summary>장소·시각 <span aria-hidden="true">⌄</span></summary>
 <div class="sky-settings-body">
  <h3>어디의 하늘을 볼까요?</h3>
  <p class="sky-small sky-observation-intro">선택한 도시와 날짜·시각에 따라 별·태양·달·행성이 하늘의 어느 방향에 있는지 계산해 그려요. 처음 장소는 서울(예시)이며, 기기 위치나 실제 날씨는 가져오지 않아요.</p>
  <label>관측 기준 장소<select data-sky-city>${CITY_PRESETS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label>
  <p class="sky-small" data-sky-zone>서울 (예시) · 목록에서 장소를 직접 골라 주세요. 기기 위치는 가져오지 않아요.</p>
  <div class="sky-time-row"><button type="button" data-sky-now aria-pressed="true">지금 보기</button><span data-sky-time-label>현재 시각을 따라가요</span></div>
  <label>도시의 현지 날짜·시각 미리보기<input data-sky-local type="datetime-local" min="1999-12-31T00:00" max="2051-01-01T23:59" step="60"></label>
  <div data-sky-fold hidden><label>두 번 있는 시각이에요. UTC 차이를 골라 주세요<select data-sky-fold-choice></select></label></div>
  <button type="button" data-sky-apply>이 시각으로 보기</button>
  <p class="sky-field-status" data-sky-feedback role="status" aria-live="polite"></p>
  <label>하늘 표현<select data-sky-mode><option value="scientific">계산한 하늘 · 선택한 장소·시각</option><option value="decorative">게임 연출 · 자유로운 별 배치</option></select></label>
  <p class="sky-small">천체의 방향은 계산하지만, 구름·하늘색은 연출이에요. 실제 날씨나 맨눈으로 보이는지는 알려 주지 않아요.</p>
  ${includeSolarEvents?solarRows+horizonRows:''}
  <details class="sky-source"><summary>계산과 출처 알아보기</summary>
   <p>별과 태양·달·행성의 위치를 선택한 장소와 시각에 맞춰 계산해요. 지원 범위는 UTC 기준 2000–2050년이에요. 화면은 관측 사진이 아니며, 구름과 색감은 실제 날씨 자료가 아닌 연출이에요.</p>
   <p>별·태양·행성은 방향을 알려 주는 표식이고, 달은 위상을 알아보기 쉽게 키운 확대 표식이에요. 달의 밝은 비율은 지구 중심에서 본 계산값이에요. 달 표면과 실제 크레이터 방향은 재현하지 않아요. 계산상 지평선 아래의 천체는 가리지만, 대기 굴절·지형·도시 불빛·날씨에 따른 실제 가시성은 계산하지 않아요.</p>
   ${includeSolarEvents?solarSource:''}
   <p>별자리 선은 모양을 알아보기 쉽게 별을 잇는 안내 그림이에요. 공식 별자리 경계나 우주에서 실제로 이어진 선은 아니에요. 북두칠성과 여름철 대삼각형은 별자리의 일부를 잇는 모양이에요.</p>
   <p><a href="./world/astronomy/vendor/ASTRONOMY-ENGINE-LICENSE.txt" target="_blank" rel="noopener">Astronomy Engine 2.1.19 · MIT</a><br><a href="./world/astronomy/data/HYG-LICENSE.txt" target="_blank" rel="noopener">HYG 4.1 · David Nash / Astronomy Nexus · CC BY-SA 4.0</a><br><a href="./world/astronomy/SOURCES.html" target="_blank" rel="noopener">계산 범위·자료 변환·전체 출처와 한계</a></p>
   <p>장소와 시각은 이 탭에서만 사용해요. 위치 권한이나 날씨 통신을 켜지 않아요. 높이 0 m (해수면)를 가정해요.</p>
  </details>
  <button type="button" class="sky-settings-done" data-sky-settings-done>접고 하늘 보기</button>
 </div></details>`;
}
