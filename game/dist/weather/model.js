import {weatherCity} from './cities.js';
export const WEATHER_SOURCE=Object.freeze({id:'open-meteo',label:'Open-Meteo',url:'https://open-meteo.com/',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',termsUrl:'https://open-meteo.com/en/terms',dataKind:'model-estimate'});
export const WEATHER_POLICY=Object.freeze({refreshMs:15*60000,modelFreshMs:30*60000,maxAgeMs:2*3600000,clockToleranceMs:60000});
const units={time:'unixtime',interval:'seconds',temperature_2m:'°C',weather_code:'wmo code',cloud_cover:'%',rain:'mm',showers:'mm',snowfall:'cm',wind_speed_10m:'m/s',wind_direction_10m:'°'};
const codes=new Set([0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
function number(value,min,max,name){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new TypeError(`Invalid weather ${name}`);return value;}
export function normalizeWeather(raw,selectedCity,fetchedAtUtcMs){
 const city=weatherCity(selectedCity?.id),now=number(fetchedAtUtcMs,0,8.64e15,'fetch time');
 if(!raw||Array.isArray(raw)||typeof raw.current!=='object'||!raw.current)throw new TypeError('Invalid weather response');
 for(const [key,unit]of Object.entries(units))if(raw.current_units?.[key]!==unit)throw new TypeError(`Invalid weather unit: ${key}`);
 const c=raw.current,validAtUtcMs=number(c.time,0,8.64e12,'model time')*1000;
 if(validAtUtcMs>now+WEATHER_POLICY.clockToleranceMs)throw new TypeError('Invalid weather future model time');
 const weatherCode=number(c.weather_code,0,99,'code');if(!codes.has(weatherCode))throw new TypeError('Invalid weather code');
 return Object.freeze({schemaVersion:1,source:WEATHER_SOURCE,city,gridPoint:Object.freeze({latDeg:number(raw.latitude,-90,90,'grid latitude'),lonDegEast:number(raw.longitude,-180,180,'grid longitude')}),
  validAtUtcMs,fetchedAtUtcMs:now,intervalSec:number(c.interval,1,3600,'interval'),weatherCode,
  temperatureC:number(c.temperature_2m,-100,70,'temperature'),cloudCoverPct:number(c.cloud_cover,0,100,'cloud cover'),
  rainMm:number(c.rain,0,1000,'rain'),showersMm:number(c.showers,0,1000,'showers'),snowfallCm:number(c.snowfall,0,1000,'snowfall'),
  windSpeedMps:number(c.wind_speed_10m,0,150,'wind speed'),windFromDeg:number(c.wind_direction_10m,0,360,'wind direction')%360});
}
export function weatherFreshness(snapshot,nowUtcMs){
 if(!snapshot||!Number.isFinite(nowUtcMs))return 'expired';
 const fetchAge=nowUtcMs-snapshot.fetchedAtUtcMs,modelAge=nowUtcMs-snapshot.validAtUtcMs;
 if(!Number.isFinite(fetchAge)||!Number.isFinite(modelAge)||Math.min(fetchAge,modelAge)<-WEATHER_POLICY.clockToleranceMs||Math.max(fetchAge,modelAge)>=WEATHER_POLICY.maxAgeMs)return 'expired';
 return fetchAge<WEATHER_POLICY.refreshMs&&modelAge<=WEATHER_POLICY.modelFreshMs?'fresh':'stale';
}
const clamp=value=>Math.max(0,Math.min(1,value));
const decorative=reason=>Object.freeze({mode:'decorative',reason,precipitation:'none',cloudOpacity:0,rainMmPerHour:0,snowCmPerHour:0,windStrength:0,windFromDeg:null,windDrift:0,particleLimit:0,animationFps:0,lightning:false,audio:false});
export function weatherScene(snapshot,{nowUtcMs=Date.now(),observerId=null,skyMode='now',visualsEnabled=true,reducedMotion=false,quality='normal'}={}){
 if(!visualsEnabled)return decorative('visuals-off');
 if(skyMode!=='now')return decorative('simulated-time');
 if(observerId!==snapshot?.city?.id)return decorative('observer-mismatch');
 const freshness=weatherFreshness(snapshot,nowUtcMs);if(freshness==='expired')return decorative('unavailable');
 const rainMmPerHour=(snapshot.rainMm+snapshot.showersMm)*3600/snapshot.intervalSec,snowCmPerHour=snapshot.snowfallCm*3600/snapshot.intervalSec;
 const precipitation=rainMmPerHour>0&&snowCmPerHour>0?'mixed':snowCmPerHour>0?'snow':rainMmPerHour>0?'rain':'none';
 const windStrength=clamp(snapshot.windSpeedMps/20),intensity=clamp(Math.max(rainMmPerHour/8,snowCmPerHour/2));
 return Object.freeze({mode:freshness==='fresh'?'weather':'stale-weather',reason:null,precipitation,cloudOpacity:clamp(snapshot.cloudCoverPct/100),rainMmPerHour,snowCmPerHour,
  intensity,windStrength,windFromDeg:snapshot.windFromDeg,windDrift:reducedMotion?0:windStrength,
  particleLimit:reducedMotion||precipitation==='none'?0:quality==='low'?48:96,animationFps:reducedMotion?0:24,lightning:false,audio:false});
}
export function weatherSummary(snapshot,nowUtcMs=Date.now()){
 if(!snapshot)return '날씨 연결 꺼짐 · 장식 하늘';
 const freshness=weatherFreshness(snapshot,nowUtcMs),format=new Intl.DateTimeFormat('ko-KR',{timeZone:snapshot.city.timeZone,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const label=freshness==='fresh'?'현재 날씨 추정':freshness==='stale'?'오래된 날씨 추정':'날씨 자료 만료';
 return `${snapshot.city.label} · ${label} · ${snapshot.temperatureC.toFixed(1)}°C · 기준 ${format.format(snapshot.validAtUtcMs)} · 가져온 ${format.format(snapshot.fetchedAtUtcMs)} (${snapshot.city.timeZone}) · Open-Meteo`;
}
