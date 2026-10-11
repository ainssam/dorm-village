import {Observer,SearchRiseSet} from '../vendor/astronomy-engine-2.1.19.min.js';
import {CITY_PRESETS,createSkyRequest,localFieldsAt,MIN_UTC_MS,MAX_UTC_MS} from './observer-time.js';
const DAY_MS=86400000,BRACKET_MS=36*3600000,pad=n=>String(n).padStart(2,'0');
const dateAt=(ms,zone)=>{const p=localFieldsAt(ms,zone);return `${p.year}-${pad(p.month)}-${pad(p.day)}`;};
/** Labels/mode are deliberately absent: cached event data never carries request context. */
export function solarEventCacheKey(input){
 const r=createSkyRequest(input),o=r.observer;
 return JSON.stringify([o.source,o.id,o.latDeg,o.lonDegEast,o.elevationM,o.timeZone,dateAt(r.instantUtcMs,o.timeZone)]);
}
/** Only these fixed, zero-height presets are covered; not a general civil-date resolver. */
export function localSolarDay(input){
 let r;
 try{r=createSkyRequest(input);}catch{return Object.freeze({status:'unsupported'});}
 const o=r.observer,preset=CITY_PRESETS.find(p=>p.id===o.id);
 if(o.source!=='preset'||!preset||o.elevationM!==0||o.timeZone!==preset.timeZone)return Object.freeze({status:'unsupported'});
 const anchor=Math.floor(r.instantUtcMs),timeZone=o.timeZone,date=dateAt(anchor,timeZone),base={date,timeZone};
 // All supported preset dates are contiguous. Verify the bounded bracket instead of
 // silently generalizing to skipped/noncontiguous dates or assuming 24 hours.
 if(dateAt(anchor-BRACKET_MS,timeZone)>=date||dateAt(anchor+BRACKET_MS,timeZone)<=date)return Object.freeze({status:'unsupported',...base});
 let lo=anchor-BRACKET_MS,hi=anchor;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(dateAt(mid,timeZone)<date)lo=mid;else hi=mid;}
 const startUtcMs=hi;lo=anchor;hi=anchor+BRACKET_MS;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(dateAt(mid,timeZone)<=date)lo=mid;else hi=mid;}
 const endUtcMs=hi;
 return Object.freeze({status:startUtcMs<MIN_UTC_MS||endUtcMs>MAX_UTC_MS+1?'partial-range':'available',...base,startUtcMs,endUtcMs});
}
/** Conventional upper-limb/standard-refraction events, separate from airless sky geometry.
 * Search function is an explicit seam for deterministic boundary/error tests; runtime
 * always uses the pinned offline engine. No clock, storage, timer or external input.
 */
export function computeSolarEvents(input,searchRiseSet=SearchRiseSet){
 let day;
 try{
  day=localSolarDay(input);if(day.status!=='available')return day;
  const o=input.observer,observer=new Observer(o.latDeg,o.lonDegEast,o.elevationM);
  const crossing=direction=>{
   const found=searchRiseSet('Sun',observer,direction,new Date(day.startUtcMs),(day.endUtcMs-day.startUtcMs)/DAY_MS,0);
   if(found===null)return null;
   const ms=found?.date?.getTime();if(!Number.isFinite(ms))throw new Error('Invalid solar event');
   // SearchRiseSet can return its inclusive limit. Membership uses unrounded time.
   return ms>=day.startUtcMs&&ms<day.endUtcMs?ms:null;
  };
  return Object.freeze({...day,sunriseUtcMs:crossing(1),sunsetUtcMs:crossing(-1)});
 }catch{return Object.freeze({...day,status:'error'});}
}
/** Each event uses its own zone offset; rounding never silently changes its date. */
export function formatSolarEventMinute(instantUtcMs,timeZone){
 const rounded=Math.round(instantUtcMs/60000)*60000;
 const display=dateAt(rounded,timeZone)===dateAt(instantUtcMs,timeZone)?rounded:instantUtcMs;
 const p=localFieldsAt(display,timeZone);return `약 ${pad(p.hour)}:${pad(p.minute)}`;
}
