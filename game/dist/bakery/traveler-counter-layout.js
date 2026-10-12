import {CAFE_DRINK_MENU} from './food-controller.js';
import {airportWorldPoint} from '../world/main-island-layout.js';

const center=airportWorldPoint({x:-12.6,z:-18,y:.025});
const interaction={x:19.4,z:-42.85};

/** A small self-service counter on the west side of the airport outlook deck.
 * Coordinates use the existing full-size courtyard/world frame. */
export const TRAVELER_COUNTER_LAYOUT=Object.freeze({
 id:'courtyard.traveler-counter',center:Object.freeze({x:center.x,z:center.z}),floorY:center.y,
 width:1.2,depth:.7,halfWidth:.6,halfDepth:.35,front:'north',
 interaction:Object.freeze(interaction),
});
export const TRAVELER_COUNTER_OBSTACLE=Object.freeze({
 id:'courtyard.traveler-counter.fixture',x:center.x,z:center.z,hx:.6,hz:.35,yaw:0,
});
export const TRAVELER_COUNTER_TARGET=Object.freeze({
 id:'courtyard.traveler-counter',roomId:'courtyard',type:'cafeFood',mode:'order',surface:'ground',floor:'ground',
 floorY:center.y,at:TRAVELER_COUNTER_LAYOUT.interaction,radius:.85,
 label:'공항 카운터에서 음료 주문하기',text:'비행장을 바라보며 음료를 골라요. 아메리카노와 카페라테는 무료이고, 사과주스는 사과 2개가 필요해요.',
});
export const TRAVELER_COUNTER_SITE=Object.freeze({
 id:TRAVELER_COUNTER_TARGET.id,roomId:'courtyard',surface:'ground',drinkIds:CAFE_DRINK_MENU,targetId:TRAVELER_COUNTER_TARGET.id,
});
export function isAtTravelerCounter(position,radius=TRAVELER_COUNTER_TARGET.radius){
 return Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&Number.isFinite(radius)&&radius>=0&&
  Math.hypot(position.x-TRAVELER_COUNTER_TARGET.at.x,position.z-TRAVELER_COUNTER_TARGET.at.z)<=radius;
}
