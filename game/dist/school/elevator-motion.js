const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export const ELEVATOR_FLOOR_HEIGHT=3.2;
export const elevatorEase=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const elevatorTravelDuration=(from,to,reduced=false)=>reduced?.25:2+Math.max(0,Math.abs(to-from)-1)*1.1;
export function sampleElevatorTravel(from,to,elapsed,reduced=false){
 const progress=clamp(elapsed/elevatorTravelDuration(from,to,reduced)),eased=elevatorEase(progress),level=from+(to-from)*eased,direction=Math.sign(to-from),floor=direction>0?Math.floor(level+1e-8):Math.ceil(level-1e-8);
 return{progress,eased,level,floor,direction:progress>=1?0:direction,offset:reduced?0:(level-from)*ELEVATOR_FLOOR_HEIGHT,arrived:progress>=1};
}
