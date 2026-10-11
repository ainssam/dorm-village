import {FISH} from '../fishing/model.js';import {FISHING_SPOTS} from '../fishing/layout.js';
export const MAX_FISH_CATCHES=9999;
export const FISH_PLATTERS=Object.freeze(Object.fromEntries(Object.entries(FISH).map(([id,f])=>['fish-platter-'+id,{fishId:id,label:f.label+' 구이 접시'}])));
const ids=Object.keys(FISH),record=x=>!!x&&typeof x==='object'&&!Array.isArray(x),exact=x=>record(x)&&Object.keys(x).length===ids.length&&ids.every(id=>Object.hasOwn(x,id));
const date=value=>typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
export const initialFishingSave=()=>({total:0,counts:Object.fromEntries(ids.map(id=>[id,0])),consumed:Object.fromEntries(ids.map(id=>[id,0])),meals:Object.fromEntries(ids.map(id=>[id,0])),firstCatch:Object.fromEntries(ids.map(id=>[id,null]))});
export function validateFishing(raw,{legacy=false,ownedItemIds=[]}={}){
 if(!record(raw)||!exact(raw.counts)||!Number.isSafeInteger(raw.total)||raw.total<0||raw.total>MAX_FISH_CATCHES)return null;
 const counts={};for(const id of ids){const n=raw.counts[id];if(!Number.isSafeInteger(n)||n<0||n>MAX_FISH_CATCHES)return null;counts[id]=n;}if(Object.values(counts).reduce((a,b)=>a+b,0)!==raw.total)return null;
 if(legacy)return {total:raw.total,counts,consumed:Object.fromEntries(ids.map(id=>[id,0])),meals:Object.fromEntries(ids.map(id=>[id,0])),firstCatch:Object.fromEntries(ids.map(id=>[id,counts[id]?{at:null,spotId:null}:null]))};
 if(!exact(raw.consumed)||!exact(raw.meals)||!exact(raw.firstCatch))return null;const consumed={},meals={},firstCatch={};for(const id of ids){const used=raw.consumed[id],meal=raw.meals[id],seen=raw.firstCatch[id];if(!Number.isSafeInteger(used)||used<0||used>counts[id]||!Number.isSafeInteger(meal)||meal<0||used!==meal+Number(ownedItemIds.includes('fish-platter-'+id)))return null;consumed[id]=used;meals[id]=meal;
  if(!counts[id]){if(seen!==null)return null;firstCatch[id]=null;continue;}
  if(!record(seen))return null;if(seen.at===null&&seen.spotId===null){firstCatch[id]={at:null,spotId:null};continue;}
  if(!date(seen.at)||!Object.hasOwn(FISHING_SPOTS,seen.spotId)||FISHING_SPOTS[seen.spotId].habitat!==FISH[id].habitat)return null;firstCatch[id]={at:seen.at,spotId:seen.spotId};
 }return {total:raw.total,counts,consumed,meals,firstCatch};
}
export function catchFish(state,a){const fish=Object.hasOwn(FISH,a.fishId)?FISH[a.fishId]:null,f=state.fishing;if(!fish||fish.habitat!==a.habitat||!f||a.expectedTotal!==f.total||f.total>=MAX_FISH_CATCHES)return state;const spotId=a.spotId??a.habitat;if(!Object.hasOwn(FISHING_SPOTS,spotId)||FISHING_SPOTS[spotId].habitat!==a.habitat||a.caughtAt!==undefined&&!date(a.caughtAt))return state;const first=f.counts[a.fishId]===0?{at:a.caughtAt??null,spotId:a.caughtAt?spotId:null}:f.firstCatch[a.fishId];return {...state,fishing:{...f,total:f.total+1,counts:{...f.counts,[a.fishId]:f.counts[a.fishId]+1},firstCatch:{...f.firstCatch,[a.fishId]:first}}};}
export function remainingFish(fishing,id){return Math.max(0,(fishing?.counts?.[id]??0)-(fishing?.consumed?.[id]??0));}
export function cookFish(state,a){if(!Object.hasOwn(FISH,a.fishId)||a.mode!==undefined&&!['keepsake','meal'].includes(a.mode))return state;const itemId='fish-platter-'+a.fishId,f=state.fishing,meal=a.mode==='meal';if(!meal&&state.ownedItemIds.includes(itemId)||a.expectedConsumed!==f.consumed[a.fishId]||remainingFish(f,a.fishId)<1)return state;return {...state,ownedItemIds:meal?state.ownedItemIds:[...state.ownedItemIds,itemId],fishing:{...f,consumed:{...f.consumed,[a.fishId]:f.consumed[a.fishId]+1},meals:meal?{...f.meals,[a.fishId]:f.meals[a.fishId]+1}:f.meals}};}
export function fishMaterials(fishing){const bag={pondFish:0,seaFish:0};for(const [id,r]of Object.entries(FISH))bag[r.habitat==='pond'?'pondFish':'seaFish']+=remainingFish(fishing,id);return bag;}
