import {WEATHER_CITIES} from './cities.js';
import {WEATHER_SOURCE} from './model.js';

const CONDITIONS={0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',45:'안개',48:'착빙 안개',51:'이슬비',53:'이슬비',55:'이슬비',56:'어는 이슬비',57:'어는 이슬비',61:'비',63:'비',65:'비',66:'어는 비',67:'어는 비',71:'눈',73:'눈',75:'눈',77:'눈 알갱이',80:'소나기',81:'소나기',82:'소나기',85:'눈 소나기',86:'눈 소나기',95:'뇌우',96:'우박 동반 뇌우',99:'우박 동반 뇌우'};
export function weatherTimestamp(value,timeZone){
 if(!Number.isFinite(value))return '자료 없음';
 try{return new Intl.DateTimeFormat('ko-KR',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).format(value)+` (${timeZone})`;}catch{return '시간을 표시할 수 없어요';}
}
export function weatherStatusText(state){
 const prior=state.snapshot?' · 이전 자료를 표시해요':'';
 switch(state.status){
  case 'disabled':return '연결 꺼짐 · 날씨 자료를 요청하지 않아요';
  case 'disposed':return '연결 종료 · 새로고침 후 다시 켤 수 있어요';
  case 'loading':return '날씨 불러오는 중'+prior+' · 연결 끄기로 취소할 수 있어요';
  case 'offline':return '오프라인 · 연결이 돌아오면 다시 확인해요'+prior;
  case 'paused':return '업데이트 일시정지 · 이 화면으로 돌아오면 다시 확인해요'+prior;
  case 'waiting':return '요청 간격 대기 · 잠시 뒤 자동으로 확인해요'+prior;
  case 'stale':return state.error?'업데이트 실패 · 오래된 자료를 표시해요':'오래된 날씨 자료 · 다음 업데이트를 기다려요';
  case 'unavailable':return state.error?'날씨 연결 실패 · 자료를 가져오지 못했어요':'사용할 날씨 자료가 없거나 만료됐어요';
  default:return state.error?'업데이트 실패 · 이전 자료를 표시해요':state.freshness==='stale'?'오래된 날씨 자료를 표시해요':'현재 날씨 추정 · 모델 자료';
 }
}
function dataSummary(snapshot,freshness){
 if(!snapshot)return '마을은 한국 시간에 맞춘 장식 하늘로 보여요';
 const temperature=Number.isFinite(snapshot.temperatureC)?snapshot.temperatureC.toFixed(1)+'°C':'기온 자료 없음';
 return `${snapshot.city.label} · ${temperature} · ${CONDITIONS[snapshot.weatherCode]??'날씨 상태 확인 중'} · ${freshness==='stale'?'오래된 날씨 추정':'현재 날씨 추정'}`;
}
function element(doc,tag,text,attributes={}){const node=doc.createElement(tag);for(const[k,v]of Object.entries(attributes))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node;}
function link(doc,label,href){return element(doc,'a',label,{href,target:'_blank',rel:'noopener noreferrer'});}
function appendText(doc,root,tag,text,attributes){const node=element(doc,tag,text,attributes);root.append(node);return node;}
function bind(node,type,fn,cleanups){node.addEventListener(type,fn);cleanups.push(()=>node.removeEventListener(type,fn));}
/** Stable native controls: never replace a focused picker or its options on refresh. */
export function mountWeatherSettings(root,{host}={}){
 const doc=root.ownerDocument,cleanups=[];let alive=true;
 const controls=element(doc,'div',undefined,{class:'weather-controls'});root.append(controls);
 appendText(doc,controls,'p','도시 중심의 현재 날씨를 모델 추정으로 살펴봐요. 마을의 한국 시간 분위기와는 별개예요.',{class:'weather-intro'});
 appendText(doc,controls,'label','날씨를 살펴볼 도시',{for:'weather-city'});
 const picker=element(doc,'select',undefined,{id:'weather-city','aria-describedby':'weather-city-center'});
 for(const city of WEATHER_CITIES){const option=element(doc,'option',city.label,{value:city.id});option.value=city.id;picker.append(option);}controls.append(picker);
 const center=appendText(doc,controls,'p','',{id:'weather-city-center',class:'weather-caption'});
 const privacy=appendText(doc,controls,'p','켜기를 누르면 선택한 도시의 중심 좌표를 Open-Meteo에 보내 현재 날씨 추정값을 가져와요. 접속 IP가 전달되고 요청 기록이 남을 수 있어요. 내 기기의 위치는 사용하지 않아요.',{id:'weather-consent',class:'weather-consent'});
 const legal=element(doc,'div',undefined,{class:'weather-links'});legal.append(link(doc,'이용약관',WEATHER_SOURCE.termsUrl),link(doc,'개인정보 안내',WEATHER_SOURCE.termsUrl));controls.append(legal);
 const connect=appendText(doc,controls,'button','날씨 연결 켜기',{id:'weather-connect',type:'button','aria-pressed':'false','aria-describedby':privacy.id});
 const visualLabel=element(doc,'label',undefined,{class:'weather-visual-switch',for:'weather-visuals'}),visual=element(doc,'input',undefined,{id:'weather-visuals',type:'checkbox','aria-describedby':'weather-visual-help'});
 visualLabel.append(visual,element(doc,'span','날씨 연출 보이기'));controls.append(visualLabel);
 appendText(doc,controls,'p','연결된 자료가 있을 때 산책 화면에만 구름·비·눈을 더해요. 캠핑 바다·텐트, 불꽃놀이와 활동 화면에는 나타나지 않아요.',{id:'weather-visual-help',class:'weather-caption'});
 const status=appendText(doc,controls,'p','',{id:'weather-status',role:'status','aria-live':'polite','aria-atomic':'true'});
 const localError=appendText(doc,controls,'p','',{id:'weather-control-error',role:'status'});localError.hidden=true;
 const summary=appendText(doc,controls,'p','',{id:'weather-data-summary',class:'weather-data-summary'});
 const data=element(doc,'div',undefined,{class:'weather-data-times'}),valid=appendText(doc,data,'p','',{id:'weather-model-time'}),fetched=appendText(doc,data,'p','',{id:'weather-fetch-time'});controls.append(data);
 const source=element(doc,'div',undefined,{class:'weather-source'});source.append(link(doc,'Open-Meteo',WEATHER_SOURCE.url),element(doc,'span',' · 날씨 모델 자료'));controls.append(source);
 const rendering=appendText(doc,controls,'p','',{id:'weather-rendering-status',class:'weather-caption'});
 const details=element(doc,'details',undefined,{class:'weather-details'});appendText(doc,details,'summary','자료·이용 조건·개인정보');
 appendText(doc,details,'p','기준 시각은 모델 자료가 나타내는 때, 가져온 시각은 이 기기가 응답을 받은 때예요. 예보 모델의 실행 시각이나 현장 관측 시각은 아니에요.');
 appendText(doc,details,'p','도시 중심 주변의 모델 격자 자료라 실제 장소의 날씨와 다를 수 있어요. 구름·비·눈과 바람 움직임은 자료를 바탕으로 단순화한 게임 연출이에요.');
 const licence=element(doc,'p');licence.append(element(doc,'span','자료: Open-Meteo · '),link(doc,'CC BY 4.0',WEATHER_SOURCE.licenseUrl),element(doc,'span',' · DORMI에서 요약하고 시각적으로 변형했어요.'));details.append(licence);
 const provenance=element(doc,'p');provenance.append(link(doc,'원자료 출처와 라이선스', 'https://open-meteo.com/en/licence'));details.append(provenance);
 appendText(doc,details,'p','이 설정과 날씨 캐시는 지금 탭의 메모리에만 있어요. 연결을 끄면 요청을 취소하고 자료를 지워요. 위치 권한·계정·저장된 놀이·텃밭 계절은 바꾸지 않아요.');
 appendText(doc,details,'p','Open-Meteo는 접속 IP와 좌표가 포함될 수 있는 기술 로그를 보관하며, 정책상 90일 뒤 지워요. 무료 서비스는 비상업적 이용용이며 정확도와 지속 제공을 보장하지 않아요. 안전 판단에는 사용하지 마세요.');
 controls.append(details);
 function render(state){if(!alive)return;if(picker.value!==state.selectedCityId)picker.value=state.selectedCityId;const city=state.selectedCity;center.textContent=`선택한 도시 중심: 위도 ${city.latDeg}° · 경도 ${city.lonDegEast}° · ${city.timeZone}`;connect.textContent=state.enabled?'날씨 연결 끄기':'날씨 연결 켜기';connect.setAttribute('aria-pressed',String(state.enabled));connect.disabled=picker.disabled=visual.disabled=state.status==='disposed';visual.checked=state.visualsEnabled;status.textContent=weatherStatusText(state);summary.textContent=dataSummary(state.snapshot,state.freshness);data.hidden=!state.snapshot;valid.textContent=state.snapshot?'기준 '+weatherTimestamp(state.snapshot.validAtUtcMs,state.snapshot.city.timeZone):'';fetched.textContent=state.snapshot?'가져온 '+weatherTimestamp(state.snapshot.fetchedAtUtcMs,state.snapshot.city.timeZone):'';source.hidden=!state.snapshot;rendering.textContent=state.visualError?'날씨 연출을 열지 못했어요 · 수치와 연결 상태는 계속 볼 수 있어요':!state.visualsEnabled?'날씨 연출 숨김 · 자료 연결은 그대로예요':state.reducedMotion?'움직임 줄이기 적용 · 움직이는 비·눈·바람 없이 정적인 구름만 보여요':'마을의 하늘색과 시간은 한국 시간에 맞춘 장식 분위기예요';}
 function action(fn){localError.hidden=true;try{Promise.resolve(fn()).catch(()=>{if(alive){localError.textContent='설정을 적용하지 못했어요. 새로고침 후 다시 확인해 주세요';localError.hidden=false;}});}catch{localError.textContent='설정을 적용하지 못했어요. 새로고침 후 다시 확인해 주세요';localError.hidden=false;}}
 bind(picker,'change',()=>action(()=>host.selectCity(picker.value)),cleanups);
 bind(connect,'click',()=>action(()=>host.getState().enabled?host.disable():host.enable({userEnabled:true})),cleanups);
 bind(visual,'change',()=>action(()=>host.setVisualsEnabled(visual.checked)),cleanups);
 cleanups.push(host.subscribe(render));
 picker.focus({preventScroll:true});
 return ()=>{if(!alive)return;alive=false;for(const cleanup of cleanups)cleanup();controls.remove();};
}
/** Compact disclosure content lives inside the existing HUD, independent of guidance. */
export function mountWeatherSummary(root,{host}={}){
 const doc=root.ownerDocument,content=element(doc,'div',undefined,{class:'weather-menu-summary'});root.append(content);
 const status=appendText(doc,content,'p','',{role:'status','aria-live':'polite'}),data=appendText(doc,content,'p',''),source=link(doc,'Open-Meteo',WEATHER_SOURCE.url);content.append(source);let alive=true;
 const unsubscribe=host.subscribe(state=>{if(!alive)return;status.textContent=weatherStatusText(state);data.textContent=dataSummary(state.snapshot,state.freshness);source.hidden=!state.snapshot;});
 return ()=>{if(!alive)return;alive=false;unsubscribe();content.remove();};
}
