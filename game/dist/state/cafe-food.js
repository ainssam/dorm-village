import {FOOD_BREAD_IDS,FOOD_DRINKS,FOOD_DRINK_IDS,FOOD_IDS,MAX_FOOD_COUNT,exactFoodRecord,foodInteger} from './food-catalog.js';
import {materialBag} from './gathering.js';
const counts=ids=>Object.fromEntries(ids.map(id=>[id,0]));
export const initialCafeFood=()=>({packed:counts(FOOD_BREAD_IDS),made:counts(FOOD_DRINK_IDS),consumed:counts(FOOD_IDS)});
export function cafeFoodBag(progress){const f=progress.cafeFood;return Object.fromEntries(FOOD_IDS.map(id=>[id,(FOOD_BREAD_IDS.includes(id)?f.packed[id]:f.made[id])-f.consumed[id]]));}
export function validateCafeFood(raw){
 if(!exactFoodRecord(raw,['packed','made','consumed']))return null;
 for(const[field,ids]of [['packed',FOOD_BREAD_IDS],['made',FOOD_DRINK_IDS],['consumed',FOOD_IDS]])if(!exactFoodRecord(raw[field],ids)||ids.some(id=>!foodInteger(raw[field][id])))return null;
 if(Object.values(cafeFoodBag({cafeFood:raw})).some(n=>n<0))return null;
 return {packed:{...raw.packed},made:{...raw.made},consumed:{...raw.consumed}};
}
export function reduceCafeFood(state,action){
 const f=state.cafeFood,id=action.recipeId;
 if(action.type==='FOOD_PACK_BREAD'){
  if(!FOOD_BREAD_IDS.includes(id))return state;const c=state.village.cafe;
  if(action.expectedPacked!==f.packed[id]||action.expectedStock!==c.stock[id]||action.expectedQualityStock!==c.qualityStock[id]||c.stock[id]<1||f.packed[id]>=MAX_FOOD_COUNT)return state;
  const stock={...c.stock,[id]:c.stock[id]-1},qualityStock={...c.qualityStock,[id]:Math.min(c.qualityStock[id],stock[id])};
  return {...state,cafeFood:{...f,packed:{...f.packed,[id]:f.packed[id]+1}},village:{...state.village,cafe:{...c,stock,qualityStock}}};
 }
 if(action.type==='FOOD_MAKE_DRINK'){
  if(typeof id!=='string'||!Object.hasOwn(FOOD_DRINKS,id)||action.expectedMade!==f.made[id]||f.made[id]>=MAX_FOOD_COUNT)return state;
  const r=FOOD_DRINKS[id];if(r.material&&materialBag(state)[r.material]<r.cost)return state;
  return {...state,cafeFood:{...f,made:{...f.made,[id]:f.made[id]+1}}};
 }
 if(action.type==='FOOD_CONSUME'){
  const id=action.itemId;if(!FOOD_IDS.includes(id)||action.expectedConsumed!==f.consumed[id]||f.consumed[id]>=MAX_FOOD_COUNT||cafeFoodBag(state)[id]<1)return state;
  return {...state,cafeFood:{...f,consumed:{...f.consumed,[id]:f.consumed[id]+1}}};
 }
 return state;
}
