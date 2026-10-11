import {initialCafeFood,validateCafeFood,reduceCafeFood} from './cafe-food.js';
import {initialProduce,validateProduce,reduceProduce} from './produce.js';
import {initialFishingSave,validateFishing,catchFish,cookFish,FISH_PLATTERS} from './fishing.js';
import {initialGathering,validateGathering,completeGathering,harvestMaterial,craftGatheredItem,GATHERING_RECIPES,materialBag,LEAF_NODE_ID} from './gathering.js';
import {cookingSave,initialCooking,validateCookingSave} from '../home/cooking-model.js';
import {initialQuestSave,validateQuestSave,MISSIONS} from '../library/quest-model.js';
import {initialBuildSave,validateBuildSave} from '../home/balance-lab.js';
import {initialRobotSave,validateRobotSave} from '../home/robot-lab.js';
import {initialVillage,validateVillage,reduceVillage} from '../village/state.js';
import {initialLibrary,validateLibrary,reduceLibrary} from './library.js';
import {GARDEN_BED_IDS} from '../world/garden-layout.js';
import {initialGarden,gardenCanHarvest,validateGarden,growGarden,FLOWER_RECIPES,HARVEST_PETALS} from './garden.js';
import {DISCOVERIES} from '../world/activities.js';
import {STAR_IDS,SLOTS,ITEM_LABELS,safeLocation} from '../world/rooms.js';
const CLAIM='first-stars.star-lamp.v1';
export function initialProgress(){return {schemaVersion:6,cafeFood:initialCafeFood(),produce:initialProduce(),revision:0,savedAt:null,location:{roomId:'courtyard',spawnId:'square'},collectedIds:[],ownedItemIds:['plant','picture-frame'],rewardClaimIds:[],completedActivityIds:[],discoveryIds:[],libraryQuest:initialQuestSave(),homeCooking:cookingSave(initialCooking()),homeBuild:initialBuildSave(),homeRobot:initialRobotSave(),garden:initialGarden(),gathering:initialGathering(),fishing:initialFishingSave(),library:initialLibrary(),village:initialVillage(),placements:{},settings:{quality:'auto'}};}
const uniqueAllowed=(xs,allowed)=>Array.isArray(xs)&&xs.every(x=>typeof x==='string'&&allowed.includes(x))&&new Set(xs).size===xs.length;
function validateVersion(raw,version){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schemaVersion!==version)return {valid:false};
 const s=raw;
 if(version>=5&&(!Object.hasOwn(s,'cafeFood')||!Object.hasOwn(s,'produce')))return {valid:false};
 if(version<5&&('cafeFood' in s||'produce' in s))return {valid:false};
 if(version<6&&(Object.hasOwn(s.gathering?.nodes??{},LEAF_NODE_ID)||Array.isArray(s.ownedItemIds)&&s.ownedItemIds.includes('leaf-frame')))return {valid:false};
 if(version<4&&Array.isArray(s.ownedItemIds)&&s.ownedItemIds.some(id=>Object.hasOwn(FISH_PLATTERS,id)))return {valid:false};
 if(version===1&&Array.isArray(s.ownedItemIds)&&s.ownedItemIds.some(id=>Object.hasOwn(GATHERING_RECIPES,id)))return {valid:false};
 if(s.discoveryIds!==undefined&&!uniqueAllowed(s.discoveryIds,Object.keys(DISCOVERIES)))return {valid:false};
 if(!Number.isSafeInteger(s.revision)||s.revision<0||(s.savedAt!==null&&(typeof s.savedAt!=='string'||!Number.isFinite(Date.parse(s.savedAt)))))return {valid:false};
 if(!uniqueAllowed(s.collectedIds,STAR_IDS)||!uniqueAllowed(s.ownedItemIds,Object.keys(ITEM_LABELS))||!uniqueAllowed(s.rewardClaimIds,[CLAIM])||!uniqueAllowed(s.completedActivityIds,['first-stars']))return {valid:false};
 if(!s.ownedItemIds.includes('plant')||!s.ownedItemIds.includes('picture-frame'))return {valid:false};
 const rewarded=s.collectedIds.length===3;
 if(s.ownedItemIds.includes('star-lamp')!==rewarded||s.rewardClaimIds.includes(CLAIM)!==rewarded||(s.completedActivityIds.length&&!rewarded))return {valid:false};
 if(!s.placements||typeof s.placements!=='object'||Array.isArray(s.placements)||Object.entries(s.placements).some(([slot,item])=>!Object.hasOwn(SLOTS,slot)||!s.ownedItemIds.includes(item))||new Set(Object.values(s.placements)).size!==Object.keys(s.placements).length)return {valid:false};
 const garden=validateGarden(s.garden,s.ownedItemIds,s.discoveryIds??[]);if(!garden)return {valid:false};
 const gathering=version===1?initialGathering():validateGathering(s.gathering,s.ownedItemIds,s.discoveryIds??[],{legacy:version<6});if(!gathering)return {valid:false};
 const fishing=version<3?initialFishingSave():validateFishing(s.fishing,{legacy:version===3,ownedItemIds:s.ownedItemIds});if(!fishing)return {valid:false};
 const libraryQuest=validateQuestSave(s.libraryQuest);if(!libraryQuest)return {valid:false};
 const library=validateLibrary(s.library);if(!library)return {valid:false};
 const village=validateVillage(s.village);if(!village)return {valid:false};
 const cafeFood=version<5?initialCafeFood():validateCafeFood(s.cafeFood),produce=version<5?initialProduce():validateProduce(s.produce);if(!cafeFood||!produce)return {valid:false};
 if(Object.values(materialBag({gathering,garden,fishing,ownedItemIds:s.ownedItemIds,cafeFood,produce})).some(n=>!Number.isSafeInteger(n)||n<0))return {valid:false};
 const homeCooking=validateCookingSave(s.homeCooking);if(!homeCooking)return {valid:false};
 const homeBuild=validateBuildSave(s.homeBuild);if(!homeBuild)return {valid:false};
 const homeRobot=validateRobotSave(s.homeRobot);if(!homeRobot)return {valid:false};
 if(!s.settings||!['auto','low','medium','high'].includes(s.settings.quality))return {valid:false};
 return {valid:true,state:{schemaVersion:6,cafeFood,produce,revision:s.revision,savedAt:s.savedAt,location:safeLocation(s.location),collectedIds:[...s.collectedIds],ownedItemIds:[...s.ownedItemIds],rewardClaimIds:[...s.rewardClaimIds],completedActivityIds:[...s.completedActivityIds],discoveryIds:[...(s.discoveryIds??[])],garden,gathering,fishing,library,libraryQuest,village,homeRobot,homeBuild,homeCooking,placements:{...s.placements},settings:{quality:s.settings.quality}}};
}
export function validateProgress(raw){return validateVersion(raw,6);}
export function migrateProgress(raw){return [1,2,3,4,5].includes(raw?.schemaVersion)?validateVersion(raw,raw.schemaVersion):validateProgress(raw);}
export function reduceProgress(state,action,context){
 let next;
 switch(action.type){
  case 'FOOD_PACK_BREAD':case 'FOOD_MAKE_DRINK':case 'FOOD_CONSUME':
  case 'PRODUCE_WATER':case 'PRODUCE_HARVEST':case 'PRODUCE_SET_SEASON':
   if(state.schemaVersion!==6||!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0||action.expectedRevision!==state.revision)return state;
   return action.type.startsWith('FOOD_')?reduceCafeFood(state,action):reduceProduce(state,action,context);
 }
 const village=reduceVillage(state.village,action);if(village!==state.village)return {...state,village};
 const library=reduceLibrary(state.library,action);if(library!==state.library&&['SELECT_BOOK','READ_BOOK','BORROW_BOOK','RETURN_BOOK'].includes(action.type))return {...state,library};
 switch(action.type){
  case 'COMPLETE_LIBRARY_QUEST':{const q=state.libraryQuest??initialQuestSave();return MISSIONS.some(m=>m.id===action.id)&&!q.completed.includes(action.id)?{...state,libraryQuest:{completed:[...q.completed,action.id]}}:state;}
  case 'SAVE_COOKING':{const homeCooking=validateCookingSave(action.cooking);return homeCooking?{...state,homeCooking}:state;}
  case 'SAVE_BUILD':{const homeBuild=validateBuildSave(action.build);return homeBuild?{...state,homeBuild}:state;}
  case 'SAVE_ROBOT':{const homeRobot=validateRobotSave(action.lab);return homeRobot?{...state,homeRobot}:state;}
  case 'COOK_FISH':{const cooked=cookFish(state,action);return cooked===state?state:reduceProgress(cooked,{type:'DISCOVER',id:'home-cook',gatheringEpoch:cooked.gathering.epoch+1});}
  case 'CATCH_FISH':{const caught=catchFish(state,action);return caught===state?state:reduceProgress(caught,{type:'DISCOVER',id:action.habitat==='pond'?'pond-catch':'sea-catch',gatheringEpoch:caught.gathering.epoch+1});}
  case 'HARVEST_MATERIAL':return harvestMaterial(state,action.id,action.expectedHarvests,context);
  case 'CRAFT_GATHERED_ITEM':return craftGatheredItem(state,action.itemId);
  case 'DISCOVER':{
   if(!Object.hasOwn(DISCOVERIES,action.id))return state;
   const known=(state.discoveryIds??[]).includes(action.id),previous=state.garden??initialGarden(),garden=growGarden(previous,action.id);
   const gathering=completeGathering(state.gathering,action.id,action.gatheringEpoch);
   if(known&&garden===previous&&gathering===state.gathering)return state;
   return {...state,discoveryIds:known?state.discoveryIds:[...(state.discoveryIds??[]),action.id],garden,gathering};
  }
  case 'HARVEST_FLOWERS':{
   const garden=state.garden??initialGarden(),id=action.id===undefined?GARDEN_BED_IDS[0]:action.id;
   if(!gardenCanHarvest(garden,id)||garden.harvests>=Math.floor(Number.MAX_SAFE_INTEGER/HARVEST_PETALS)||!Number.isSafeInteger(garden.petals+HARVEST_PETALS))return state;
   const harvestedBedIds=[...(garden.harvestedBedIds??[]),id],finished=harvestedBedIds.length===GARDEN_BED_IDS.length;
   return {...state,garden:{...garden,phase:finished?'seed':'ready',moments:finished?[]:garden.moments,harvestedBedIds:finished?[]:harvestedBedIds,petals:garden.petals+HARVEST_PETALS,harvests:garden.harvests+1}};
  }
  case 'CRAFT_ITEM':{
   if(!Object.hasOwn(FLOWER_RECIPES,action.itemId)||state.ownedItemIds.includes(action.itemId))return state;
   const garden=state.garden??initialGarden(),cost=FLOWER_RECIPES[action.itemId].cost;if(garden.petals<cost)return state;
   return {...state,ownedItemIds:[...state.ownedItemIds,action.itemId],garden:{...garden,petals:garden.petals-cost}};
  }
  case 'COLLECT_STAR':
   if(!STAR_IDS.includes(action.id)||state.collectedIds.includes(action.id))return state;
   next={...state,collectedIds:[...state.collectedIds,action.id]};
   if(next.collectedIds.length===3)next={...next,ownedItemIds:[...new Set([...state.ownedItemIds,'star-lamp'])],rewardClaimIds:[CLAIM]};
   return next;
  case 'PLACE_ITEM':{
   if(!Object.hasOwn(SLOTS,action.slotId)||!state.ownedItemIds.includes(action.itemId)||state.placements[action.slotId]===action.itemId)return state;
   const placements=Object.fromEntries(Object.entries(state.placements).filter(([slot,item])=>slot!==action.slotId&&item!==action.itemId));placements[action.slotId]=action.itemId;
   return {...state,placements,completedActivityIds:action.itemId==='star-lamp'?['first-stars']:state.completedActivityIds};
  }
  case 'REMOVE_ITEM':{
   if(!Object.hasOwn(state.placements,action.slotId))return state;
   const placements={...state.placements};delete placements[action.slotId];return {...state,placements};
  }
  case 'ENTER_ROOM':return {...state,location:safeLocation(action.location)};
  case 'SET_QUALITY':return ['auto','low','medium','high'].includes(action.quality)?{...state,settings:{quality:action.quality}}:state;
  default:return state;
 }
}

// Every visit starts in the square; earned progress stays in the same local save.
export function startInSquare(state){return {...state,location:{roomId:'courtyard',spawnId:'square'}};}
