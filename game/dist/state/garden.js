import {GARDEN_BED_IDS,isGardenBed} from '../world/garden-layout.js';
import {DISCOVERIES} from '../world/activities.js';
export const FLOWER_RECIPES={
 'flower-vase':{label:'들꽃 꽃병',cost:1},
 'flower-wreath':{label:'꽃 리스',cost:2}
};
export const GROWTH_MOMENTS=2;
export const HARVEST_PETALS=3;
export const initialGarden=()=>({phase:'seed',moments:[],petals:0,harvests:0,harvestedBedIds:[]});
export function validateGarden(raw,ownedItemIds,discoveryIds=[]){
 const garden=raw===undefined?initialGarden():raw;
 if(!garden||typeof garden!=='object'||Array.isArray(garden)||!['seed','growing','ready'].includes(garden.phase))return null;
 const {moments,petals,harvests,phase}=garden;
 const harvestedBedIds=garden.harvestedBedIds===undefined?[]:garden.harvestedBedIds;
 if(!Array.isArray(harvestedBedIds)||harvestedBedIds.some(id=>!isGardenBed(id))||new Set(harvestedBedIds).size!==harvestedBedIds.length||harvestedBedIds.length>=GARDEN_BED_IDS.length||harvestedBedIds.length>harvests||(phase!=='ready'&&harvestedBedIds.length))return null;
 if(!Array.isArray(moments)||moments.some(id=>id==='flower-water'||!Object.hasOwn(DISCOVERIES,id)||!discoveryIds.includes(id))||new Set(moments).size!==moments.length)return null;
 if((phase==='seed'&&moments.length!==0)||(phase==='growing'&&moments.length>=GROWTH_MOMENTS)||(phase==='ready'&&moments.length!==GROWTH_MOMENTS))return null;
 if((phase!=='seed'||harvests>0)&&!discoveryIds.includes('flower-water'))return null;
 if(!Number.isSafeInteger(petals)||petals<0||!Number.isSafeInteger(harvests)||harvests<0||harvests>Math.floor(Number.MAX_SAFE_INTEGER/HARVEST_PETALS))return null;
 const spent=Object.entries(FLOWER_RECIPES).reduce((n,[id,r])=>n+(ownedItemIds.includes(id)?r.cost:0),0);
 if(harvests*HARVEST_PETALS-spent!==petals)return null;
 return {phase,moments:[...moments],petals,harvests,harvestedBedIds:[...harvestedBedIds]};
}
export function growGarden(garden,id){
 if(id==='flower-water')return garden.phase==='seed'?{...garden,phase:'growing'}:garden;
 if(garden.phase!=='growing'||!Object.hasOwn(DISCOVERIES,id)||garden.moments.includes(id))return garden;
 const moments=[...garden.moments,id];return {...garden,moments,phase:moments.length>=GROWTH_MOMENTS?'ready':'growing'};
}
export function gardenRemaining(garden=initialGarden()){return GARDEN_BED_IDS.length-(garden.harvestedBedIds?.length??0);}
export function gardenCanHarvest(garden,id){return garden.phase==='ready'&&isGardenBed(id)&&!(garden.harvestedBedIds??[]).includes(id);}
export function gardenMessage(garden=initialGarden()){
 if(garden.phase==='ready')return `꽃이 활짝 피었어요! 남은 ${gardenRemaining(garden)}곳 꽃밭에서 각각 꽃잎 3개를 수확해요`;
 if(garden.phase==='growing')return `꽃이 자라는 중 · 서로 다른 놀이 ${garden.moments.length} / ${GROWTH_MOMENTS}. 그네 타기나 책 읽기처럼 다른 순간을 즐겨요`;
 return '공원의 꽃밭 한 곳에 물을 주고, 서로 다른 놀이 두 가지를 즐겨요. 꽃밭 세 곳에서 각각 꽃잎 3개를 수확해 집 장식을 만들어요';
}
export function gardenInteraction(target,garden=initialGarden()){
 if(!isGardenBed(target?.id))return target;
 if(garden.phase==='seed')return {...target,label:'꽃밭에 물 주기',text:'물을 준 뒤 서로 다른 놀이 두 가지를 즐기면 꽃이 피어요. 기다리거나 매일 찾아올 필요는 없어요.'};
 return {...target,type:'garden',label:gardenCanHarvest(garden,target.id)?`${target.label.split(' · ')[0]} · 꽃잎 3개 수확하기`:garden.phase==='ready'?'이미 딴 꽃밭 · 다른 꽃밭 찾기':'자라는 꽃 살펴보기'};
}
