import {PRODUCE_NODES,MAX_PRODUCE_HARVESTS,PRODUCE_SEASONS} from '../state/food-catalog.js';
import {produceCanWater} from '../state/produce.js';
import {calendarSeason} from '../state/produce-season.js';
export const PRODUCE_CARE_SECONDS=2,PRODUCE_PICK_CONTACT=.9,PRODUCE_PICK_SECONDS=1.8;
export const PRODUCE_LABELS=Object.freeze({strawberry:'딸기',tomato:'토마토',pumpkin:'호박',leafy:'잎채소',peach:'복숭아',pear:'배',mandarin:'귤'});
export const SEASON_LABELS=Object.freeze({calendar:'한국 달력',spring:'놀이 봄',summer:'놀이 여름',autumn:'놀이 가을',winter:'놀이 겨울'});
/** No persistence or timers here. Only the root transaction can adopt a saved outcome. */
export function createProduceController({getProgress,transact,getRoom,getSceneEpoch,canSave=()=>true,isAllowed=()=>true,getCalendarSeason=calendarSeason,createSession=()=>null,onChange=()=>{}}){
 let live=null,serial=0,disposed=false;
 const current=s=>!disposed&&live===s&&getRoom()==='park'&&s.epoch===getSceneEpoch();
 const notify=()=>onChange(api.snapshot());
 function cancel(reason='cancel'){const s=live;if(!s)return false;live=null;s.view?.dispose();notify();return true;}
 function render(s){s.view?.update({nodeId:s.nodeId,kind:s.kind,elapsed:s.elapsed,phase:s.phase,committed:s.committed});notify();}
 function commit(s){if(!current(s)||s.attempted||!canSave()||!isAllowed())return false;s.attempted=true;let ok=false;try{ok=transact(s.action)===true;}catch{}s.committed=ok;if(!ok){s.phase='failed';s.notice='저장하지 못했어요. 식물과 재료는 그대로예요';render(s);return false;}s.notice=s.kind==='water'?'다 자랐어요! 직접 수확할 수 있어요':`${PRODUCE_LABELS[PRODUCE_NODES[s.nodeId].material]} 2개를 재료가방에 넣었어요`;return true;}
 const api={
  open(nodeId){if(disposed||live||getRoom()!=='park'||!Object.hasOwn(PRODUCE_NODES,nodeId)||!getProgress().produce)return false;live={token:++serial,nodeId,epoch:getSceneEpoch(),phase:'idle',elapsed:0,kind:null,committed:false,attempted:false,view:null,notice:''};notify();return true;},
  start(){const s=live;if(!s||s.phase!=='idle'||!current(s)||!canSave()||!isAllowed())return false;const p=getProgress(),n=p.produce.nodes[s.nodeId];if(n.harvests>=MAX_PRODUCE_HARVESTS)return false;const kind=n.phase==='ready'?'harvest':'water';if(kind==='water'&&!produceCanWater(p.produce,s.nodeId,getCalendarSeason()))return false;s.kind=kind;s.action=Object.freeze({type:kind==='water'?'PRODUCE_WATER':'PRODUCE_HARVEST',nodeId:s.nodeId,expectedHarvests:n.harvests,expectedRevision:p.revision});s.phase='acting';try{s.view=createSession({nodeId:s.nodeId,kind,token:s.token});}catch{s.phase='failed';s.notice='손질할 자리를 준비하지 못했어요';notify();return false;}render(s);return true;},
  setSeason(season){const s=live;if(!s||s.phase!=='idle'||!current(s)||!isAllowed()||!canSave()||!PRODUCE_SEASONS.includes(season))return false;const p=getProgress();const action=Object.freeze({type:'PRODUCE_SET_SEASON',season,expectedSeason:p.produce.season,expectedRevision:p.revision});const ok=transact(action)===true;s.notice=ok?'놀이 계절을 바꿨어요. 익은 작물과 재료는 그대로예요':'계절을 바꾸지 않았어요';notify();return ok;},
  tick(dt){const s=live;if(!s)return;if(!current(s)||!isAllowed()||!canSave()&&s.phase==='acting'){cancel('interrupted');return;}if(s.phase!=='acting'||!Number.isFinite(dt)||dt<=0)return;s.elapsed=Math.min(s.kind==='water'?PRODUCE_CARE_SECONDS:PRODUCE_PICK_SECONDS,s.elapsed+Math.min(.05,dt));const boundary=s.kind==='water'?PRODUCE_CARE_SECONDS:PRODUCE_PICK_CONTACT;if(!s.attempted&&s.elapsed+1e-9>=boundary){s.elapsed=Math.max(s.elapsed,boundary);s.view?.update({nodeId:s.nodeId,kind:s.kind,elapsed:s.elapsed,phase:'contact',committed:false});if(!commit(s))return;}if(s.elapsed+1e-9>=(s.kind==='water'?PRODUCE_CARE_SECONDS:PRODUCE_PICK_SECONDS)){s.phase='done';s.view?.settle?.();}render(s);},
  cancel,close:cancel,get active(){return !!live;},
  snapshot(){if(!live)return null;const s=live,p=getProgress(),n=p.produce.nodes[s.nodeId],r=PRODUCE_NODES[s.nodeId],season=p.produce.season==='calendar'?getCalendarSeason():p.produce.season;return {token:s.token,nodeId:s.nodeId,material:r.material,label:PRODUCE_LABELS[r.material],kind:s.kind,phase:s.phase,elapsed:s.elapsed,committed:s.committed,notice:s.notice,action:s.action?{...s.action}:null,ready:n.phase==='ready',canStart:canSave()&&s.phase==='idle'&&n.harvests<MAX_PRODUCE_HARVESTS&&(n.phase==='ready'||produceCanWater(p.produce,s.nodeId,season)),readOnly:!canSave(),capped:n.harvests>=MAX_PRODUCE_HARVESTS,season:p.produce.season,calendarSeason:getCalendarSeason(),allowedSeasons:r.seasons};},
  dispose(){cancel('disposed');disposed=true;}
 };return api;
}
