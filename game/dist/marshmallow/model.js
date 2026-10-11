// A free, deterministic practice activity. No save, inventory or reward actions.
export const ROAST_STEP=1/120;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2;
export function initialMarshmallow(){return {phase:'ready',clock:0,elapsed:0,remainder:0,distance:.45,angle:0,browning:[0,0,0,0]};}
export function roastHeat(distance){return .014+.155*Math.pow(1-clamp(distance),1.35);}
export function marshmallowResult(s){const min=Math.min(...s.browning),max=Math.max(...s.browning),avg=s.browning.reduce((a,b)=>a+b,0)/4;
 if(max>=1.12)return {id:'charred',label:'앗, 바삭한 갈색!',hint:'다음엔 조금 멀리 두고 천천히 돌려 봐요'};
 if(max-min>.35&&max>.48)return {id:'uneven',label:'한쪽이 더 노릇해요',hint:'꾹 눌러 돌리면 네 면이 고르게 익어요'};
 if(min>=.48&&max<=.94)return {id:'golden',label:'골고루 노릇노릇!',hint:'겉은 노릇하고 속은 말랑한 캠핑 간식'};
 if(avg<.40)return {id:'soft',label:'하얗고 말랑한 한 입',hint:'다음엔 불 가까이 조금 더 기다려 봐요'};
 return {id:'toasted',label:'고소한 캠핑 한 입',hint:'다음엔 네 면의 색을 함께 살펴봐요'};
}
export function stepMarshmallow(s,a={}){
 if(a.type==='RETRY')return initialMarshmallow();
 if(a.type==='DISTANCE')return Number.isFinite(a.value)?{...s,distance:clamp(a.value)}:s;
 if(a.type==='START'&&s.phase==='ready')return {...s,phase:'roasting',elapsed:0,distance:Number.isFinite(a.distance)?clamp(a.distance):s.distance};
 if(a.type==='WITHDRAW'&&s.phase==='roasting')return {...s,phase:'withdrawing',elapsed:0,remainder:0};
 if(a.type==='RETURN'&&s.phase==='readyToEat')return {...s,phase:'roasting',elapsed:0,remainder:0};
 if(a.type==='EAT'&&s.phase==='readyToEat')return {...s,phase:'eating',elapsed:0,remainder:0};
 if(a.type!=='TICK'||!Number.isFinite(a.dt)||a.dt<=0||a.dt>.5||['ready','done'].includes(s.phase))return s;
 const n={...s,browning:[...s.browning],remainder:s.remainder+a.dt};
 while(n.remainder+1e-12>=ROAST_STEP){n.remainder=Math.max(0,n.remainder-ROAST_STEP);n.clock+=ROAST_STEP;n.elapsed+=ROAST_STEP;
  if(n.phase==='roasting'){if(a.rotate)n.angle=(n.angle+1.35*ROAST_STEP)%TAU;const heat=roastHeat(n.distance);for(let i=0;i<4;i++){const exposure=.12+.88*Math.max(0,Math.cos(n.angle+i*Math.PI/2));n.browning[i]=clamp(n.browning[i]+heat*exposure*ROAST_STEP,0,1.65);}}
  else if(n.phase==='withdrawing'&&n.elapsed>=1.4-1e-9){n.phase='readyToEat';n.elapsed=0;}
  else if(n.phase==='eating'&&n.elapsed>=2.7-1e-9){n.phase='done';n.elapsed=0;}
 }
 return n;
}
