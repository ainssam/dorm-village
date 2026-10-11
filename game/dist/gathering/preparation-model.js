import {GATHERING_RECIPES} from '../state/gathering.js';
export function initialPreparation(recipeId){if(!Object.hasOwn(GATHERING_RECIPES,recipeId))throw Error('Unknown keepsake recipe');return {recipeId,step:0,busy:false,elapsed:0};}
export function reducePreparation(state,action){if(action.type==='START'&&!state.busy&&state.step<2)return {...state,busy:true,elapsed:0};if(action.type==='TICK'&&state.busy&&Number.isFinite(action.dt)&&action.dt>0){const elapsed=state.elapsed+Math.min(.1,action.dt),duration=state.step===0?1.2:2;return elapsed+1e-8>=duration?{...state,step:state.step+1,busy:false,elapsed:0}:{...state,elapsed};}return state;}
export function completionAction(state){return state.step===2&&!state.busy?{type:'CRAFT_GATHERED_ITEM',itemId:state.recipeId}:null;}
