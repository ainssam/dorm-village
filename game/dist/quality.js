export class QualityMonitor{
 constructor(){this.samples=[];this.elapsed=0;this.downgraded=false;}
 sample(ms,eligible){if(this.downgraded)return false;if(!eligible||!Number.isFinite(ms)||ms<=0||ms>1000){this.samples=[];this.elapsed=0;return false;}this.samples.push(ms);this.elapsed+=ms;if(this.elapsed<10000)return false;const sorted=[...this.samples].sort((a,b)=>a-b),p95=sorted[Math.floor((sorted.length-1)*.95)];this.samples=[];this.elapsed=0;if(p95>40){this.downgraded=true;return true;}return false;}
}
export function applyQuality(renderer,sun,quality){const coarse=matchMedia('(pointer: coarse)').matches;const low=quality==='low';renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:quality==='high'?2:coarse?1.5:2));renderer.shadowMap.enabled=!low;sun.shadow.mapSize.set(1024,1024);return low?'low':quality==='high'?'high':'medium';}
// Walking can be locked by a live 3D activity, not just by a paused modal.
// Sample only foreground render time; loading, transitions and long resume gaps
// are excluded by this gate and QualityMonitor's interval validation.
export function isQualitySampleEligible({ready,hidden,focused=true,failed=false,resetting=false,locked,modalLock,transitionLock,cafeActive=false,plazaBusy=false,activityRendering=false}){return !!ready&&!hidden&&focused&&!failed&&!resetting&&!transitionLock&&(activityRendering||(!modalLock&&(!locked||cafeActive||plazaBusy)));}
