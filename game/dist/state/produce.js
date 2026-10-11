import {PRODUCE_NODES,PRODUCE_NODE_IDS,PRODUCE_MATERIAL_IDS,PRODUCE_SEASONS,PLAY_SEASONS,MAX_PRODUCE_HARVESTS,exactFoodRecord,foodInteger,fruitDrinkCost} from './food-catalog.js';
export const initialProduce=()=>({season:'calendar',nodes:Object.fromEntries(PRODUCE_NODE_IDS.map(id=>[id,{harvests:0,phase:'seed'}]))});
export function validateProduce(raw){
 if(!exactFoodRecord(raw,['season','nodes'])||!PRODUCE_SEASONS.includes(raw.season)||!exactFoodRecord(raw.nodes,PRODUCE_NODE_IDS))return null;
 const nodes={};for(const id of PRODUCE_NODE_IDS){const n=raw.nodes[id];if(!exactFoodRecord(n,['harvests','phase'])||!foodInteger(n.harvests,MAX_PRODUCE_HARVESTS)||!['seed','ready'].includes(n.phase))return null;nodes[id]={harvests:n.harvests,phase:n.phase};}
 return {season:raw.season,nodes};
}
export function produceMaterials(progress){
 const bag=Object.fromEntries(PRODUCE_MATERIAL_IDS.map(id=>[id,-fruitDrinkCost(progress.cafeFood,id)]));
 for(const id of PRODUCE_NODE_IDS){const r=PRODUCE_NODES[id];bag[r.material]+=(progress.produce?.nodes?.[id]?.harvests??0)*r.yield;}
 return bag;
}
export function produceCanWater(produce,nodeId,calendarSeason){
 if(typeof nodeId!=='string'||!Object.hasOwn(PRODUCE_NODES,nodeId))return false;
 const n=produce.nodes[nodeId],season=produce.season==='calendar'?calendarSeason:produce.season;
 return n.phase==='seed'&&n.harvests<MAX_PRODUCE_HARVESTS&&PLAY_SEASONS.includes(season)&&PRODUCE_NODES[nodeId].seasons.includes(season);
}
export function reduceProduce(state,action,context={}){
 const p=state.produce;
 if(action.type==='PRODUCE_SET_SEASON')return PRODUCE_SEASONS.includes(action.season)&&PRODUCE_SEASONS.includes(action.expectedSeason)&&p.season===action.expectedSeason&&p.season!==action.season?{...state,produce:{...p,season:action.season}}:state;
 if(typeof action.nodeId!=='string'||!Object.hasOwn(PRODUCE_NODES,action.nodeId))return state;
 const n=p.nodes[action.nodeId];if(action.expectedHarvests!==n.harvests||n.harvests>=MAX_PRODUCE_HARVESTS)return state;
 let next;
 if(action.type==='PRODUCE_WATER'&&produceCanWater(p,action.nodeId,context?.calendarSeason))next={harvests:n.harvests,phase:'ready'};
 if(action.type==='PRODUCE_HARVEST'&&n.phase==='ready')next={harvests:n.harvests+1,phase:'seed'};
 return next?{...state,produce:{...p,nodes:{...p.nodes,[action.nodeId]:next}}}:state;
}
