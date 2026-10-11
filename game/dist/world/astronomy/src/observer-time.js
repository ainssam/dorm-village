/** Local-only observer/civil-time contract. Never obtains or transmits a location. */
export const MIN_UTC_MS = Date.UTC(2000,0,1);
export const MAX_UTC_MS = Date.UTC(2051,0,1)-1;
const presetRows=[
 ['seoul','서울',37.5665,126.978,'Asia/Seoul'],
 ['busan','부산',35.10168,129.03004,'Asia/Seoul'],
 ['jeju','제주시',33.50972,126.52194,'Asia/Seoul'],
 ['sydney','시드니',-33.8688,151.2093,'Australia/Sydney'],
 ['tromso','트롬쇠',69.6492,18.9553,'Europe/Oslo'],
 ['london','런던',51.5074,-0.1278,'Europe/London'],
 ['new-york','뉴욕',40.7128,-74.006,'America/New_York'],
 ['kathmandu','카트만두',27.7172,85.324,'Asia/Kathmandu'],
 ['quito','키토',-0.1807,-78.4678,'America/Guayaquil'],
];
export const CITY_PRESETS=Object.freeze(presetRows.map(([id,label,latDeg,lonDegEast,timeZone])=>Object.freeze({id,label,source:'preset',isExample:false,latDeg,lonDegEast,elevationM:0,timeZone})));
function bounded(value,min,max,name){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`Invalid ${name}`);return value;}
function nonempty(value,name){if(typeof value!=='string'||!value.trim()||value.length>120)throw new TypeError(`Invalid ${name}`);return value;}
function formatter(timeZone){nonempty(timeZone,'timeZone');if(/^[+-]/.test(timeZone))throw new RangeError('Invalid timeZone: use an IANA zone or UTC');return new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}
export function observerPreset(id,{isExample=false}={}){const p=CITY_PRESETS.find(p=>p.id===id);if(!p)throw new RangeError('Unknown city preset');return validateObserver({...p,isExample});}
export function validateObserver(input){
 if(!input||!['preset','manual'].includes(input.source)||typeof input.isExample!=='boolean')throw new TypeError('Invalid observer source/example flag');
 const o={id:nonempty(input.id,'observer id'),label:nonempty(input.label,'observer label'),source:input.source,isExample:input.isExample,latDeg:bounded(input.latDeg,-90,90,'latitude'),lonDegEast:bounded(input.lonDegEast,-180,180,'longitude'),elevationM:bounded(input.elevationM,-500,10000,'elevation'),timeZone:nonempty(input.timeZone,'timeZone')};
 formatter(o.timeZone);
 if(o.source==='preset') {const p=CITY_PRESETS.find(p=>p.id===o.id);if(!p||p.latDeg!==o.latDeg||p.lonDegEast!==o.lonDegEast||p.elevationM!==o.elevationM)throw new RangeError('Preset coordinates must match its fixed definition');}
 return Object.freeze(o);
}
export function createSkyRequest({observer,instantUtcMs,mode='selected',refraction='none',schemaVersion=1}={}){
 if(!['now','selected'].includes(mode)||refraction!=='none'||schemaVersion!==1)throw new RangeError('Unsupported sky request mode/model');
 bounded(instantUtcMs,MIN_UTC_MS,MAX_UTC_MS,'UTC instant');
 return Object.freeze({observer:validateObserver(observer),instantUtcMs,mode,refraction,schemaVersion});
}
export function localFieldsAt(instantUtcMs,timeZone){
 if(typeof instantUtcMs!=='number'||!Number.isFinite(instantUtcMs))throw new RangeError('Invalid instant');
 const parts=formatter(timeZone).formatToParts(new Date(instantUtcMs));
 return Object.fromEntries(['year','month','day','hour','minute','second'].map(k=>[k,Number(parts.find(p=>p.type===k).value)]));
}
function validateFields(input){
 const f={...input,second:input?.second??0};
 // Boundary UTC instants can display in the previous/next civil year.
 // resolveLocalTime still enforces the exact supported UTC interval after conversion.
 for(const [k,min,max] of [['year',1999,2051],['month',1,12],['day',1,31],['hour',0,23],['minute',0,59],['second',0,59]]){bounded(f[k],min,max,k);if(!Number.isInteger(f[k]))throw new RangeError(`Noninteger ${k}`);}
 const localAsUtc=Date.UTC(f.year,f.month-1,f.day,f.hour,f.minute,f.second);
 const d=new Date(localAsUtc);if(d.getUTCFullYear()!==f.year||d.getUTCMonth()+1!==f.month||d.getUTCDate()!==f.day)throw new RangeError('Invalid calendar date');
 return {f,localAsUtc};
}
/** Returns all exact UTC round trips; gaps and folds never silently normalize. */
export function resolveLocalTime(input,timeZone){
 const {f,localAsUtc}=validateFields(input);formatter(timeZone);
 const offsets=new Set();
 // The supported modern range has no seasonal offset episode shorter than 3h.
 // ±36h also covers the 24-hour Samoa date-line change in 2011.
 for(let h=-36;h<=36;h+=3){const instant=localAsUtc+h*3600000;const p=localFieldsAt(instant,timeZone);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-instant);}
 const candidates=[...offsets].map(offset=>localAsUtc-offset).filter(ms=>ms>=MIN_UTC_MS&&ms<=MAX_UTC_MS&&Object.entries(f).filter(([k])=>['year','month','day','hour','minute','second'].includes(k)).every(([k,v])=>localFieldsAt(ms,timeZone)[k]===v)).sort((a,b)=>a-b);
 return Object.freeze({status:candidates.length===0?'gap':candidates.length===1?'unique':'ambiguous',candidatesUtcMs:Object.freeze(candidates)});
}
export function selectLocalInstant(fields,timeZone,disambiguation='reject'){
 if(!['reject','earlier','later'].includes(disambiguation))throw new RangeError('Invalid disambiguation');
 const r=resolveLocalTime(fields,timeZone);if(r.status==='gap')throw new RangeError('Local time does not exist or is outside supported UTC range');if(r.status==='ambiguous'&&disambiguation==='reject')throw new RangeError('Local time is ambiguous; choose earlier or later offset');
 return r.candidatesUtcMs[disambiguation==='later'?r.candidatesUtcMs.length-1:0];
}
export function withDisplayTimeZone(request,timeZone){return createSkyRequest({...request,observer:{...request.observer,timeZone}});}
export function formatSkyStatus(input){
 const r=createSkyRequest(input),o=r.observer,p=localFieldsAt(r.instantUtcMs,o.timeZone),pad=n=>String(n).padStart(2,'0');
 const minutes=Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(r.instantUtcMs/1000)*1000)/60000),abs=Math.abs(minutes),offset=`UTC${minutes<0?'-':'+'}${pad(Math.floor(abs/60))}:${pad(abs%60)}`;
 return `${o.label}${o.isExample?' (예시)':''} · ${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)} · ${o.timeZone} (${offset}) · ${r.mode==='now'?'지금':'선택한 시각'} · 높이 ${o.elevationM} m${o.elevationM===0?' (해수면 가정)':''}`;
}
