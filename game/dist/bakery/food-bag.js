import {cafeFoodBag} from '../state/cafe-food.js';
import {PRODUCE_MATERIAL_IDS} from '../state/food-catalog.js';
import {FOOD_LABELS,foodUnit} from './food-controller.js';
/** Read-only saved pouch section inside the established material bag. */
export function cafeFoodBagHTML(progress){
 const entries=progress.cafeFood?Object.entries(cafeFoodBag(progress)).filter(([,n])=>n>0):[];
 return `<section class="cafe-food-bag"><h3>포장한 음식</h3>${entries.length?`<div class="material-counts">${entries.map(([id,n])=>`<p><span>${FOOD_LABELS[id]}</span><strong>${n}${foodUnit(id)}</strong></p>`).join('')}</div>`:'<p>아직 포장한 음식이 없어요</p>'}<p class="caption">카페 아래층에서 빵을 포장하고, 위층에서 음료나 수확 한 그릇을 받아요. 토마토·호박·잎채소 중 하나를 1개 써서 한 그릇을 준비해요. 위층 의자에 앉아 음식주머니를 열면 먹을 수 있고, 함께 쉬는 친구에게 한 그릇을 나눌 수도 있어요. 집에 놓는 주스 트레이와 잼 병은 별도로 보관하는 장식이에요.</p></section>`;
}

export const visibleCafeMaterials=(bag,{produceReady=false}={})=>Object.entries(bag).filter(([id,n])=>!PRODUCE_MATERIAL_IDS.includes(id)||n>0||produceReady);
