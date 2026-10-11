import {fruitDrinkCost} from './food-catalog.js';
import {produceMaterials} from './produce.js';
import {fishMaterials} from './fishing.js';
import {DISCOVERIES} from '../world/activities.js';
export const MAX_NODE_HARVESTS=9999,MAX_GATHERING_EPOCH=1000000000,REGROW_MOMENTS=3;
// Frozen historical set: older saves must never accept newly introduced nodes.
export const LEGACY_MATERIAL_NODE_IDS=Object.freeze(['park.tree.west','park.tree.east','courtyard.shell.west','courtyard.shell.middle','courtyard.shell.east']);
export const LEAF_NODE_ID='park.leaves.west';
export const MATERIAL_NODES=Object.freeze({
 'park.tree.west':{material:'apple',yield:2,label:'서쪽 사과나무'},
 'park.tree.east':{material:'apple',yield:2,label:'동쪽 사과나무'},
 'courtyard.shell.west':{material:'shell',yield:1,label:'해변의 분홍 조개'},
 'courtyard.shell.middle':{material:'shell',yield:1,label:'해변의 연보라 조개'},
 'courtyard.shell.east':{material:'shell',yield:1,label:'해변의 살구 조개'},
 [LEAF_NODE_ID]:{material:'autumnLeaf',yield:3,label:'서쪽 나무 아래 낙엽',season:'autumn'}
});
export const GATHERING_RECIPES=Object.freeze({
 'apple-juice':{label:'사과 주스 트레이',material:'apple',cost:2,roomId:'homeKitchen',steps:['사과 담기','주스 섞기','트레이 완성'],color:'#e6b767'},
 'apple-jam':{label:'사과잼 병',material:'apple',cost:3,roomId:'homeKitchen',steps:['사과 담기','잼 저어 졸이기','잼 병 완성'],color:'#d38b66'},
 'shell-frame':{label:'조개 액자',material:'shell',cost:3,roomId:'workshop',steps:['조개 고르기','틀에 붙이기','액자 완성'],color:'#dfa38d'},
 'leaf-frame':{label:'낙엽 액자',material:'autumnLeaf',cost:3,roomId:'workshop',steps:['낙엽 고르기','액자에 놓기','액자 완성'],color:'#c99254'}
});
export const MATERIAL_LABELS=Object.freeze({apple:'사과',shell:'조개',autumnLeaf:'낙엽',petal:'꽃잎',pondFish:'연못 물고기',seaFish:'바다 물고기',strawberry:'딸기',tomato:'토마토',pumpkin:'호박',leafy:'잎채소',peach:'복숭아',pear:'배',mandarin:'귤'});
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export const initialGathering=()=>({epoch:0,nodes:Object.fromEntries(Object.keys(MATERIAL_NODES).map(id=>[id,{harvests:0,pickedAt:0,moments:[]}]))});
export function gatheringReady(node){return !!node&&(node.harvests===0||node.moments.length===REGROW_MOMENTS);}
export function materialBag(progress){const counts={apple:0,shell:0,autumnLeaf:0,petal:progress.garden?.petals??0,...fishMaterials(progress.fishing),...produceMaterials(progress)};for(const[id,rule]of Object.entries(MATERIAL_NODES))counts[rule.material]+=(progress.gathering?.nodes?.[id]?.harvests??0)*rule.yield;for(const[id,r]of Object.entries(GATHERING_RECIPES))if(progress.ownedItemIds.includes(id))counts[r.material]-=r.cost;counts.apple-=fruitDrinkCost(progress.cafeFood,'apple');return counts;}
export function validateGathering(raw,ownedItemIds,discoveryIds,{legacy=false}={}){
 const expected=legacy?LEGACY_MATERIAL_NODE_IDS:Object.keys(MATERIAL_NODES);
 if(!record(raw)||!integer(raw.epoch,MAX_GATHERING_EPOCH)||!record(raw.nodes)||Object.keys(raw.nodes).length!==expected.length)return null;
 const nodes={};for(const id of expected){
  if(!Object.hasOwn(raw.nodes,id))return null;const n=raw.nodes[id];if(!record(n)||!integer(n.harvests,MAX_NODE_HARVESTS)||!integer(n.pickedAt,raw.epoch)||!Array.isArray(n.moments)||n.moments.length>REGROW_MOMENTS)return null;
  if(n.harvests===0&&(n.pickedAt!==0||n.moments.length))return null;
  let previous=n.pickedAt;const ids=new Set(),moments=[];for(const m of n.moments){if(!record(m)||!Object.hasOwn(DISCOVERIES,m.id)||!discoveryIds.includes(m.id)||ids.has(m.id)||!integer(m.epoch,raw.epoch)||m.epoch<=previous)return null;ids.add(m.id);previous=m.epoch;moments.push({id:m.id,epoch:m.epoch});}
  nodes[id]={harvests:n.harvests,pickedAt:n.pickedAt,moments};
 }
 if(legacy)nodes[LEAF_NODE_ID]={harvests:0,pickedAt:0,moments:[]};
 const gathering={epoch:raw.epoch,nodes},bag=materialBag({gathering,ownedItemIds});if(bag.apple<0||bag.shell<0||bag.autumnLeaf<0)return null;return gathering;
}
export function completeGathering(gathering,id,epoch){
 if(!Object.hasOwn(DISCOVERIES,id)||epoch!==gathering.epoch+1||!integer(epoch,MAX_GATHERING_EPOCH))return gathering;
 const nodes={};for(const[nodeId,n]of Object.entries(gathering.nodes))nodes[nodeId]=!gatheringReady(n)&&epoch>n.pickedAt&&!n.moments.some(m=>m.id===id)?{...n,moments:[...n.moments,{id,epoch}]}:n;
 return {epoch,nodes};
}
export function gatheringAvailable(id,worldSeason){return !MATERIAL_NODES[id]?.season||MATERIAL_NODES[id].season===worldSeason;}
export function harvestMaterial(state,id,expectedHarvests,context){
 if(!Object.hasOwn(MATERIAL_NODES,id)||!gatheringAvailable(id,context?.worldSeason))return state;const n=state.gathering.nodes[id];if(expectedHarvests!==n.harvests||!gatheringReady(n)||n.harvests>=MAX_NODE_HARVESTS)return state;
 return {...state,gathering:{...state.gathering,nodes:{...state.gathering.nodes,[id]:{harvests:n.harvests+1,pickedAt:state.gathering.epoch,moments:[]}}}};
}
export function craftGatheredItem(state,itemId){const r=Object.hasOwn(GATHERING_RECIPES,itemId)?GATHERING_RECIPES[itemId]:null;if(!r||state.ownedItemIds.includes(itemId)||materialBag(state)[r.material]<r.cost)return state;return {...state,ownedItemIds:[...state.ownedItemIds,itemId]};}
export function gatheringInteraction(target,progress,worldSeason){if(!Object.hasOwn(MATERIAL_NODES,target?.id??''))return target;if(!gatheringAvailable(target.id,worldSeason))return {...target,type:'message',label:'가을에 낙엽을 주워요',text:'마을의 한국 달력 가을에 주울 수 있어요. 모아 둔 낙엽과 만든 액자는 계절이 바뀌어도 그대로예요.'};const n=progress.gathering.nodes[target.id],r=MATERIAL_NODES[target.id];if(n.harvests>=MAX_NODE_HARVESTS)return {...target,type:'message',label:'이곳 채집 기록이 가득 찼어요',text:'모아 둔 재료는 그대로 보관돼요.'};if(gatheringReady(n))return {...target,expectedHarvests:n.harvests,label:`${r.label} · ${MATERIAL_LABELS[r.material]} ${r.yield}개 ${r.material==='apple'?'따기':'줍기'}`};return {...target,type:'message',label:`${r.label} · 다시 준비 ${n.moments.length}/${REGROW_MOMENTS}`,text:'이곳을 채집한 뒤 서로 다른 놀이 세 가지를 새로 완료하면 다시 준비돼요. 꽃밭은 물 주기 뒤 놀이 두 가지로 자라요.'};}
