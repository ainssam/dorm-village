import {weatherCity} from './cities.js';
import {normalizeWeather} from './model.js';
const fields='temperature_2m,weather_code,cloud_cover,rain,showers,snowfall,wind_speed_10m,wind_direction_10m';
export function weatherRequestUrl(cityId){
 const city=weatherCity(cityId),url=new URL('https://api.open-meteo.com/v1/forecast');
 const values={latitude:city.latDeg,longitude:city.lonDegEast,current:fields,wind_speed_unit:'ms',temperature_unit:'celsius',precipitation_unit:'mm',timeformat:'unixtime',timezone:'GMT',forecast_days:1};
 for(const [key,value]of Object.entries(values))url.searchParams.set(key,String(value));
 return url.href;
}
export class WeatherFetchError extends Error{constructor(code,{status=null,retryAfterMs=null}={}){super(`Weather request failed: ${code}`);this.name='WeatherFetchError';this.code=code;this.status=status;this.retryAfterMs=retryAfterMs;}}
export function retryAfterMs(value,nowUtcMs){
 if(typeof value!=='string'||!value.trim())return null;
 const trimmed=value.trim(),delay=/^\d+$/.test(trimmed)?Number(trimmed)*1000:Date.parse(trimmed)-nowUtcMs;
 return Number.isFinite(delay)&&delay>=0?delay:null;
}
export async function fetchWeather(cityId,{fetchImpl=globalThis.fetch,now=Date.now,signal,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,timeoutMs=8000}={}){
 const city=weatherCity(cityId),url=weatherRequestUrl(cityId);
 if(signal?.aborted)throw new WeatherFetchError('aborted');
 if(typeof fetchImpl!=='function')throw new WeatherFetchError('unavailable');
 const controller=new AbortController();let timer,onAbort;
 const cancellation=new Promise((resolve,reject)=>{
  onAbort=()=>{controller.abort();reject(new WeatherFetchError('aborted'));};
  signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimer(()=>{controller.abort();reject(new WeatherFetchError('timeout'));},Math.max(1,Math.min(8000,timeoutMs)));
 });
 const work=(async()=>{
  const response=await fetchImpl(url,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(controller.signal.aborted)throw new WeatherFetchError('aborted');
  if(!response.ok)throw new WeatherFetchError('http',{status:response.status,retryAfterMs:retryAfterMs(response.headers?.get('Retry-After'),now())});
  const length=Number(response.headers?.get('Content-Length'));if(Number.isFinite(length)&&length>65536)throw new WeatherFetchError('too-large');
  const body=await response.text();if(controller.signal.aborted)throw new WeatherFetchError('aborted');
  if(body.length>65536)throw new WeatherFetchError('too-large');
  try{return normalizeWeather(JSON.parse(body),city,now());}catch{throw new WeatherFetchError('invalid');}
 })();
 try{return await Promise.race([work,cancellation]);}
 catch(error){if(error instanceof WeatherFetchError)throw error;throw new WeatherFetchError('network');}
 finally{clearTimer(timer);signal?.removeEventListener('abort',onAbort);}
}
