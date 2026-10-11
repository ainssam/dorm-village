import {cafeFoodBag} from '../state/cafe-food.js';
import {FOOD_BREAD_IDS,PRODUCE_MATERIAL_IDS} from '../state/food-catalog.js';
import {FOOD_LABELS} from './food-controller.js';
/** Read-only saved pouch section inside the established material bag. */
export function cafeFoodBagHTML(progress){
 const entries=progress.cafeFood?Object.entries(cafeFoodBag(progress)).filter(([,n])=>n>0):[];
 return `<section class="cafe-food-bag"><h3>포장한 음식</h3>${entries.length?`<div class="material-counts">${entries.map(([id,n])=>`<p><span>${FOOD_LABELS[id]}</span><strong>${n}${FOOD_BREAD_IDS.includes(id)?'개':'잔'}</strong></p>`).join('')}</div>`:'<p>아직 포장한 음식이 없어요</p>'}<p class="caption">카페 아래층에서 빵을 포장하고, 위층에서 음료를 받아요. 위층 의자에 앉아 음식주머니를 열면 먹을 수 있어요. 집에 놓는 주스 트레이와 잼 병은 별도로 보관하는 장식이에요.</p></section>`;
}

export const visibleCafeMaterials=(bag,{produceReady=false}={})=>Object.entries(bag).filter(([id,n])=>!PRODUCE_MATERIAL_IDS.includes(id)||n>0||produceReady);
