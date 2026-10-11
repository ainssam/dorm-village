import {CAFE_MENU as M,CAFE_UPGRADES as U,CAFE_RESIDENTS as R,CAFE_DAY_MS,menuKeys,orderItems} from './cafe-config.js';
const counts=()=>Object.fromEntries(menuKeys.map(id=>[id,0]));
const integer=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const known=(o,k)=>Object.hasOwn(o,k);
export function initialCafe(){return {schemaVersion:1,day:1,phase:'idle',activeMs:0,nextArrivalMs:3000,nextOrdinal:1,jobSerial:0,orders:[],settled:[],stock:counts(),qualityStock:counts(),dough:null,oven:null,drink:null,upgrades:{warmOven:false,wideDisplay:false,cozyCorner:false},coins:0,ledger:{sold:counts(),served:0,revenue:0,materials:0,fastTips:0,qualityTips:0,cozyTips:0,spent:0},today:{served:0,revenue:0,materials:0,tips:0}};}
export const cafeCapacity=(s,kind)=>kind==='bread'?(s.upgrades.wideDisplay?5:3):2;
export function cafeReserved(s,kind){return menuKeys.filter(id=>M[id].kind===kind).reduce((n,id)=>n+s.stock[id],0)+(kind==='bread'?!!s.dough+!!s.oven:!!s.drink);}
export function cafeMissing(s,o){return Object.entries(o.items).filter(([id,n])=>s.stock[id]<n).map(([id,n])=>({id,count:n-s.stock[id]}));}
export function cafeOrderValue(o){return Object.entries(o.items).reduce((v,[id,n])=>({price:v.price+M[id].price*n,cost:v.cost+M[id].cost*n}),{price:0,cost:0});}
export function kneadPulse(s){return (s.activeMs%1600)/1600;}
export function validateCafe(raw){
 if(raw===undefined)return initialCafe();const s=raw;if(!s||Array.isArray(s)||s.schemaVersion!==1||!integer(s.day,9999)||s.day<1||!['idle','running','closing','summary'].includes(s.phase)||!integer(s.activeMs,1000000000)||!integer(s.nextArrivalMs,1000000000)||!integer(s.nextOrdinal,7)||s.nextOrdinal<1||!integer(s.jobSerial)||!integer(s.coins))return null;
 if(!s.upgrades||Object.keys(s.upgrades).length!==3||Object.keys(U).some(k=>typeof s.upgrades[k]!=='boolean'))return null;
 for(const field of ['stock','qualityStock'])if(!s[field]||Object.keys(s[field]).length!==5||menuKeys.some(k=>!integer(s[field][k],5)))return null;
 if(menuKeys.some(k=>s.qualityStock[k]>s.stock[k])||['bread','drink'].some(k=>cafeReserved(s,k)>cafeCapacity(s,k)))return null;
 const l=s.ledger,t=s.today;if(!l||!t||!l.sold||Object.keys(l.sold).length!==5||menuKeys.some(k=>!integer(l.sold[k]))||['served','revenue','materials','fastTips','qualityTips','cozyTips','spent'].some(k=>!integer(l[k]))||['served','revenue','materials','tips'].some(k=>!integer(t[k])))return null;
 if(l.revenue!==menuKeys.reduce((v,k)=>v+l.sold[k]*M[k].price,0)||l.materials!==menuKeys.reduce((v,k)=>v+l.sold[k]*M[k].cost,0)||l.spent!==Object.keys(U).reduce((v,k)=>v+(s.upgrades[k]?U[k].cost:0),0)||s.coins!==l.revenue-l.materials+2*l.fastTips+l.qualityTips+l.cozyTips-l.spent||l.fastTips>l.served||l.cozyTips>l.served||l.qualityTips>menuKeys.reduce((n,k)=>n+l.sold[k],0)||t.served>6||t.served>l.served)return null;
 if(!Array.isArray(s.orders)||s.orders.length>2||!Array.isArray(s.settled)||s.settled.length>6||s.orders.length+s.settled.length!==s.nextOrdinal-1||s.settled.length!==t.served)return null;
 const all=[...s.orders,...s.settled],ordinals=new Set();for(const o of all){if(!o||!integer(o.ordinal,6)||o.ordinal<1||ordinals.has(o.ordinal)||o.id!==`cafe:${s.day}:${o.ordinal}`||o.residentId!==R[(o.ordinal+s.day-2)%3]||!integer(o.admittedMs,s.activeMs)||!integer(o.shownMs,1000000000)||o.shownMs!==o.admittedMs+3000||JSON.stringify(o.items)!==JSON.stringify(orderItems(s.day,o.ordinal))||!integer(o.slot,1))return null;ordinals.add(o.ordinal);if(s.settled.includes(o)&&(!integer(o.servedMs,s.activeMs)||o.servedMs<o.shownMs))return null;}
 if([...ordinals].some(n=>n>=s.nextOrdinal)||Array.from({length:s.nextOrdinal-1},(_,i)=>i+1).some(n=>!ordinals.has(n)))return null;
 if(s.orders.length===2&&(s.orders[0].slot===s.orders[1].slot||s.orders[0].residentId===s.orders[1].residentId))return null;
 const serials=new Set();for(const field of ['dough','oven','drink']){const j=s[field];if(j===null)continue;if(!j||!known(M,j.recipeId)||M[j.recipeId].kind!==(field==='drink'?'drink':'bread')||!integer(j.serial,s.jobSerial)||j.serial<1||serials.has(j.serial)||j.id!==`job:${j.serial}`||!integer(j.startedMs,s.activeMs)||!integer(j.skill,3))return null;serials.add(j.serial);if(field==='dough'){if(!integer(j.folds,3)||j.skill>j.folds||!integer(j.lastFoldMs,s.activeMs))return null;}else if(!integer(j.durationMs,12000)||!integer(j.readyMs,1000000000)||j.readyMs!==j.startedMs+j.durationMs||!['oven','drink'].includes(field)||!([M[j.recipeId][field==='oven'?'bakeMs':'brewMs'],...(field==='oven'?[M[j.recipeId].bakeMs-3000]:[])].includes(j.durationMs)))return null;}

 const soldCount=menuKeys.reduce((n,k)=>n+l.sold[k],0);if(soldCount<l.served||soldCount>l.served*2||l.served>s.day*6)return null;
 const todayValue=s.settled.reduce((v,o)=>{const a=cafeOrderValue(o);return {price:v.price+a.price,cost:v.cost+a.cost};},{price:0,cost:0});if(t.revenue!==todayValue.price||t.materials!==todayValue.cost||t.tips>s.settled.reduce((n,o)=>n+Object.values(o.items).reduce((a,b)=>a+b,0)+3,0))return null;
 if((s.phase==='running'&&s.activeMs>=CAFE_DAY_MS)||(s.phase==='closing'&&s.activeMs<CAFE_DAY_MS))return null;
 if(s.dough&&(s.dough.lastFoldMs<s.dough.startedMs||s.dough.lastFoldMs-s.dough.startedMs<s.dough.folds*350))return null;
 if(s.oven&&!s.upgrades.warmOven&&s.oven.durationMs!==M[s.oven.recipeId].bakeMs)return null;
 if(s.phase==='idle'&&(s.activeMs!==0||s.nextOrdinal!==1||s.orders.length||s.settled.length||s.dough||s.oven||s.drink))return null;
 if(s.phase==='summary'&&(s.orders.length||s.dough||s.oven||s.drink||s.activeMs<CAFE_DAY_MS))return null;
 return structuredClone(s);
}
export function reduceCafe(s=initialCafe(),a){
 const running=['running','closing'].includes(s.phase),id=a.recipeId;
 if(a.type==='CAFE_START_DAY'){if(s.phase!=='idle')return s;return {...s,phase:'running'};}
 if(a.type==='CAFE_NEXT_DAY'){if(s.phase!=='summary'||s.day>=9999)return s;return {...s,day:s.day+1,phase:'idle',activeMs:0,nextArrivalMs:3000,nextOrdinal:1,orders:[],settled:[],today:{served:0,revenue:0,materials:0,tips:0}};}
 if(a.type==='CAFE_STEP'){
  if(!running||!integer(a.elapsedMs,1000)||!a.elapsedMs)return s;const n={...s,activeMs:Math.min(1000000000,s.activeMs+a.elapsedMs)};
  if(n.activeMs>=CAFE_DAY_MS)n.phase='closing';
  if(n.phase==='running'&&s.nextOrdinal<=6&&s.orders.length<2&&n.activeMs>=s.nextArrivalMs&&!s.settled.some(o=>n.activeMs-o.servedMs<17000)){const ordinal=s.nextOrdinal,slot=s.orders.some(o=>o.slot===0)?1:0;const residentId=R[(ordinal+s.day-2)%3];if(!s.orders.some(o=>o.residentId===residentId)){n.orders=[...s.orders,{id:`cafe:${s.day}:${ordinal}`,ordinal,residentId,items:orderItems(s.day,ordinal),admittedMs:n.activeMs,shownMs:n.activeMs+3000,slot}];n.nextOrdinal++;n.nextArrivalMs=n.activeMs+26000;}}
  if(n.phase==='closing'&&!n.orders.length&&!n.dough&&!n.oven&&!n.drink&&!n.settled.some(o=>n.activeMs-o.servedMs<17000))n.phase='summary';return n;
 }
 if(a.type==='CAFE_BUY_UPGRADE'){const id=a.upgradeId;if(!known(U,id)||s.upgrades[id]||s.coins<U[id].cost)return s;return {...s,coins:s.coins-U[id].cost,upgrades:{...s.upgrades,[id]:true},ledger:{...s.ledger,spent:s.ledger.spent+U[id].cost}};}
 if(!running)return s;
 if(a.type==='CAFE_START_BREAD'||a.type==='CAFE_START_DRINK'){
  const kind=a.type==='CAFE_START_BREAD'?'bread':'drink',field=kind==='bread'?'dough':'drink';if(!known(M,id)||M[id].kind!==kind||s[field]||cafeReserved(s,kind)>=cafeCapacity(s,kind)||s.jobSerial>=1e9||s.activeMs>999980000)return s;
  const serial=s.jobSerial+1,j={id:`job:${serial}`,serial,recipeId:id,startedMs:s.activeMs,skill:0};if(kind==='bread'){j.folds=0;j.lastFoldMs=s.activeMs;}else{j.durationMs=M[id].brewMs;j.readyMs=s.activeMs+j.durationMs;}
  return {...s,jobSerial:serial,[field]:j};
 }
 if(a.type==='CAFE_FOLD'){const j=s.dough;if(!j||j.id!==a.jobId||j.folds>=3||s.activeMs-j.lastFoldMs<350)return s;const p=kneadPulse(s);return {...s,dough:{...j,folds:j.folds+1,skill:j.skill+(p>=.32&&p<=.72?1:0),lastFoldMs:s.activeMs}};}
 if(a.type==='CAFE_LOAD_OVEN'){const j=s.dough;if(!j||j.id!==a.jobId||j.folds!==3||s.oven)return s;const durationMs=M[j.recipeId].bakeMs-(s.upgrades.warmOven?3000:0);return {...s,dough:null,oven:{id:j.id,serial:j.serial,recipeId:j.recipeId,skill:j.skill,startedMs:s.activeMs,durationMs,readyMs:s.activeMs+durationMs}};}
 if(a.type==='CAFE_DISPLAY_BREAD'||a.type==='CAFE_COLLECT_DRINK'){const field=a.type==='CAFE_DISPLAY_BREAD'?'oven':'drink',j=s[field];if(!j||j.id!==a.jobId||s.activeMs<j.readyMs)return s;const quality=s.activeMs-j.readyMs<=3000&&(field==='drink'||j.skill>=2);return {...s,[field]:null,stock:{...s.stock,[j.recipeId]:s.stock[j.recipeId]+1},qualityStock:{...s.qualityStock,[j.recipeId]:s.qualityStock[j.recipeId]+Number(quality)}};}
 if(a.type==='CAFE_REMOVE_STOCK'){if(!known(M,id)||!s.stock[id])return s;return {...s,stock:{...s.stock,[id]:s.stock[id]-1},qualityStock:{...s.qualityStock,[id]:Math.min(s.qualityStock[id],s.stock[id]-1)}};}
 if(a.type==='CAFE_SERVE'){const o=s.orders.find(o=>o.id===a.orderId);if(!o||s.activeMs<o.shownMs||cafeMissing(s,o).length||s.settled.some(p=>p.id===o.id))return s;const stock={...s.stock},qualityStock={...s.qualityStock},sold={...s.ledger.sold};let quality=0;for(const [id,n]of Object.entries(o.items)){quality+=Math.min(n,qualityStock[id]);qualityStock[id]=Math.max(0,qualityStock[id]-n);stock[id]-=n;sold[id]+=n;}const {price,cost}=cafeOrderValue(o),fast=Number(s.activeMs-o.shownMs<=45000),cozy=Number(s.upgrades.cozyCorner),tips=2*fast+quality+cozy,earned=price-cost+tips;return {...s,orders:s.orders.filter(x=>x!==o),settled:[...s.settled,{...o,servedMs:s.activeMs}],stock,qualityStock,coins:s.coins+earned,ledger:{...s.ledger,sold,served:s.ledger.served+1,revenue:s.ledger.revenue+price,materials:s.ledger.materials+cost,fastTips:s.ledger.fastTips+fast,qualityTips:s.ledger.qualityTips+quality,cozyTips:s.ledger.cozyTips+cozy},today:{served:s.today.served+1,revenue:s.today.revenue+price,materials:s.today.materials+cost,tips:s.today.tips+tips}};}
 return s;
}
