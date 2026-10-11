export class QualityMonitor{
 constructor(){this.samples=[];this.elapsed=0;this.downgraded=false;}
 sample(ms,eligible){if(this.downgraded)return false;if(!eligible){this.samples=[];this.elapsed=0;return false;}this.samples.push(ms);this.elapsed+=ms;if(this.elapsed<10000)return false;const sorted=[...this.samples].sort((a,b)=>a-b),p95=sorted[Math.floor((sorted.length-1)*.95)];this.samples=[];this.elapsed=0;if(p95>40){this.downgraded=true;return true;}return false;}
}
export function applyQuality(renderer,sun,quality){const coarse=matchMedia('(pointer: coarse)').matches;const low=quality==='low';renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:quality==='high'?2:coarse?1.5:2));renderer.shadowMap.enabled=!low;sun.shadow.mapSize.set(1024,1024);return low?'low':quality==='high'?'high':'medium';}
// Camera-owned shows still render real frames while walking input is locked.
export function isQualitySampleEligible({ready,hidden,locked,modalLock,transitionLock,cafeActive=false,plazaBusy=false}){return !!ready&&!hidden&&(!locked||((cafeActive||plazaBusy)&&!modalLock&&!transitionLock));}
