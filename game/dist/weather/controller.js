import {weatherCity} from './cities.js';
import {fetchWeather} from './provider.js';
import {WEATHER_POLICY,weatherFreshness} from './model.js';

// The host owns enable/disclosure UI and visibility/online events. No DOM or game state.
export function createWeatherController({load=fetchWeather,now=Date.now,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,onChange=()=>{}}={}){
 const cache=new Map();let enabled=false,disposed=false,visible=true,online=true,city=null,snapshot=null,error=null,status='disabled',timer=null,active=null,generation=0,lastAttempt=-Infinity,retryAt=0,failures=0;
 function state(){
  const freshness=weatherFreshness(snapshot,now()),usable=freshness==='expired'?null:snapshot;
  const actualStatus=!usable&&['ready','stale'].includes(status)?'unavailable':status;
  return Object.freeze({status:actualStatus,enabled,city,snapshot:usable,freshness:usable?freshness:'expired',error,retryAtUtcMs:Math.max(retryAt,lastAttempt+60000),cacheEntries:cache.size});
 }
 function emit(){onChange(state());}
 function clearSchedule(){if(timer!==null){clearTimer(timer);timer=null;}}
 function invalidate(){generation++;clearSchedule();active?.abort.abort();active=null;}
 function eligible(){return enabled&&!disposed&&visible&&online;}
 function remember(value){cache.delete(value.city.id);cache.set(value.city.id,value);while(cache.size>6)cache.delete(cache.keys().next().value);}
 function schedule(at){
  clearSchedule();if(!eligible())return;
  timer=setTimer(()=>{timer=null;return refresh();},Math.max(1,Math.min(2147483647,at-now())));
 }
 function nextAttempt(){return Math.max(lastAttempt+60000,retryAt);}
 function refresh(){
  if(!enabled||disposed)return Promise.resolve(state());
  if(!visible||!online){status=!visible?'paused':'offline';clearSchedule();emit();return Promise.resolve(state());}
  if(active)return active.promise??Promise.resolve(state());
  const cached=cache.get(city.id);if(cached){snapshot=cached;remember(cached);}
  // Fetch TTL is independent of model freshness. A stale upstream model does not
  // justify asking for the same city repeatedly within the 15-minute cache window.
  const fetchAge=now()-snapshot?.fetchedAtUtcMs;
  if(snapshot&&fetchAge>=-WEATHER_POLICY.clockToleranceMs&&fetchAge<WEATHER_POLICY.refreshMs){
   const freshness=weatherFreshness(snapshot,now());status=freshness==='fresh'?'ready':freshness==='stale'?'stale':'unavailable';
   schedule(Math.max(snapshot.fetchedAtUtcMs+WEATHER_POLICY.refreshMs,nextAttempt()));emit();return Promise.resolve(state());
  }
  if(now()<nextAttempt()){
   status=weatherFreshness(snapshot,now())==='stale'?'stale':'waiting';schedule(nextAttempt());emit();return Promise.resolve(state());
  }
  const token=++generation,selected=city,abort=new AbortController();lastAttempt=now();status='loading';active={token,abort,promise:null};emit();
  // A host may synchronously opt out from onChange. Never fetch after that callback.
  if(token!==generation||!eligible())return Promise.resolve(state());
  const promise=(async()=>{
   try{
    const value=await load(selected.id,{signal:abort.signal,now});
    if(token!==generation||!eligible())return state();
    if(value?.city?.id!==selected.id)throw new Error('weather-city-mismatch');
    snapshot=value;remember(value);error=null;failures=0;retryAt=0;
    status=weatherFreshness(value,now())==='fresh'?'ready':weatherFreshness(value,now())==='stale'?'stale':'unavailable';emit();
   }catch(cause){
    if(token!==generation||!eligible())return state();
    failures++;const throttled=cause?.status===429||cause?.status===503;
    const localDelay=throttled?15*60000:Math.min(15*60000,60000*5**Math.min(failures-1,2));
    const serverDelay=Number.isFinite(cause?.retryAfterMs)?Math.max(0,cause.retryAfterMs):0;
    retryAt=now()+Math.max(localDelay,serverDelay);
    error=Object.freeze({code:cause?.code??'invalid',status:cause?.status??null,atUtcMs:now()});
    status=weatherFreshness(snapshot,now())!=='expired'?'stale':'unavailable';emit();
   }finally{
    if(active?.token===token)active=null;
    if(token===generation&&eligible())schedule(error?nextAttempt():Math.max(nextAttempt(),snapshot?.fetchedAtUtcMs+WEATHER_POLICY.refreshMs||now()+WEATHER_POLICY.refreshMs));
   }
   return state();
  })();
  if(active?.token===token)active.promise=promise;
  return promise;
 }
 function enable(cityId,{userEnabled=false}={}){
  if(disposed)throw new Error('Weather controller disposed');
  if(userEnabled!==true)throw new Error('Weather must be explicitly enabled by user');
  const selected=weatherCity(cityId);
  if(!enabled||city?.id!==selected.id){invalidate();city=selected;snapshot=cache.get(cityId)??null;error=null;enabled=true;}
  return refresh();
 }
 function disable(){if(disposed)return;invalidate();enabled=false;city=null;snapshot=null;error=null;cache.clear();status='disabled';emit();}
 function setVisible(value){if(disposed)return Promise.resolve(state());visible=!!value;if(!visible){invalidate();if(enabled)status='paused';emit();return Promise.resolve(state());}return refresh();}
 function setOnline(value){if(disposed)return Promise.resolve(state());online=!!value;if(!online){invalidate();if(enabled)status='offline';emit();return Promise.resolve(state());}return refresh();}
 function dispose(){if(disposed)return;invalidate();enabled=false;city=null;snapshot=null;error=null;cache.clear();disposed=true;status='disposed';emit();}
 return Object.freeze({getState:state,enable,disable,refresh,setVisible,setOnline,dispose});
}
