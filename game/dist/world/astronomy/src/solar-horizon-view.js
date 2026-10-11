import {Observer,SearchAltitude} from '../vendor/astronomy-engine-2.1.19.min.js';
import {localSolarDay,computeSolarEvents} from './solar-events.js';

const DAY_MS=86400000;
const fields=(name,status,reason,utcMs=null)=>({
 [name+'UtcMs']:utcMs,[name+'Status']:status,...(reason?{[name+'Reason']:reason}:{}),
});

/** Separate airless solar-center scenes, never conventional sunrise/set events.
 * Only the existing zero-height presets and complete half-open local dates are
 * supported. Instants are exact milliseconds; formatting and caching belong to
 * the viewer. These computed geometric crossings make no weather/visibility claim.
 *
 * `events` must be the corresponding observer/day's computeSolarEvents result;
 * its date, zone and bounds are checked before searching. It is never modified.
 * The explicit search seam permits deterministic failure/boundary tests while
 * runtime uses only the pinned offline center-altitude search (no refraction).
 * A valid day has status 'available'; each direction independently has status
 * 'available', 'no-event', 'no-crossing' or 'error'. Nonavailable days have null
 * instants and 'unavailable' directions; mismatched events have 'error' directions.
 */
export function computeSolarHorizonViews(request,events=computeSolarEvents(request),searchAltitude=SearchAltitude){
 const day=localSolarDay(request);
 if(day.status!=='available')return Object.freeze({
  ...day,...fields('morning','unavailable'),...fields('evening','unavailable'),
 });

 let matching=false;
 try{
  matching=events?.status==='available'&&['date','timeZone','startUtcMs','endUtcMs'].every(key=>events[key]===day[key]);
 }catch{/* An invalid event record must not escape into the current sky. */}
 if(!matching)return Object.freeze({
  ...day,status:'error',...fields('morning','error','event-day-mismatch'),...fields('evening','error','event-day-mismatch'),
 });

 const withinDay=ms=>Number.isInteger(ms)&&ms>=day.startUtcMs&&ms<day.endUtcMs;
 const eventTime=key=>{try{return events[key];}catch{return NaN;}};
 const rise=eventTime('sunriseUtcMs'),set=eventTime('sunsetUtcMs');
 // With set-before-rise, the two conventional events belong to different
 // daylight branches. Only a correctly ordered pair supplies a shared bound.
 const sameDaylightBranch=withinDay(rise)&&withinDay(set)&&rise<set;
 const crossing=(name,direction,event)=>{
  if(event===null)return fields(name,'no-event');
  if(!withinDay(event))return fields(name,'error','invalid-event');
  try{
   const o=request.observer;
   // Keep search-owned mutable objects isolated between the two directions.
   const observer=new Observer(o.latDeg,o.lonDegEast,o.elevationM);
   const found=searchAltitude('Sun',observer,direction,new Date(day.startUtcMs),(day.endUtcMs-day.startUtcMs)/DAY_MS,0);
   if(found===null)return fields(name,'no-crossing');
   // Use the native Date operation so fake getTime methods cannot supply a
   // timestamp. Invalid dates and malformed results fail only this direction.
   const ms=Date.prototype.getTime.call(found?.date);
   if(!Number.isFinite(ms))return fields(name,'error','invalid-crossing');
   // The engine's search limit may be inclusive. Retain our exact [start,end).
   if(!withinDay(ms))return fields(name,'no-crossing','outside-day');
   const associated=direction===1
    ?ms>rise&&(!sameDaylightBranch||ms<set)
    :ms<set&&(!sameDaylightBranch||ms>rise);
   if(!associated)return fields(name,'no-crossing','unassociated-crossing');
   return fields(name,'available',null,ms);
  }catch{return fields(name,'error','search-failed');}
 };
 return Object.freeze({...day,...crossing('morning',1,rise),...crossing('evening',-1,set)});
}
