import {BAKERY as B,BAKERY_GUEST_SEATS,doorwayContract as D} from './layout.js';
import {along,CAFE_QUEUE} from '../village/cafe-customers.js';
export const BAKERY_GUEST_RADIUS=.66;
const smooth=t=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
const doorway={x:D.at.x,z:D.at.z+.025};
function seatedTransition(seat,t){
 const a=seat.approach,b=seat.anchor,lift=seat.seatTop+.035;
 if(t<.28)return {...a,y:B.floor1Y+(lift-B.floor1Y)*smooth(t/.28),yaw:seat.yaw};
 if(t<.78){const p=smooth((t-.28)/.5);return {x:a.x+(b.x-a.x)*p,z:a.z+(b.z-a.z)*p,y:lift,yaw:seat.yaw};}
 return {...b,y:lift+(seat.seatTop-lift)*smooth((t-.78)/.22)};
}
/** Only the opted-in two-floor view uses this all-1F route. Business timestamps are read-only. */
export function bakeryServiceGuestPose(order,time,{served=false,departureMs=null}={}){
 const seat=BAKERY_GUEST_SEATS[order.slot],q=CAFE_QUEUE[order.slot];if(!seat||!q||!Number.isFinite(time))return null;
 const info={floor:'floor1',floorY:B.floor1Y,supportY:B.floor1Y,seatId:served?seat.id:null};
 if(!served){if(time<order.shownMs)return {...along([doorway,{x:0,z:2.6},q],(time-order.admittedMs)/3000),...info,y:B.floor1Y,walking:true,seated:false};return {...q,...info,y:B.floor1Y,yaw:Math.PI,walking:false,seated:false};}
 const age=(time-order.servedMs)/1000,departure=((departureMs??order.servedMs+12000)-order.servedMs)/1000;
 const approach=order.slot===0?[q,{x:1.1,z:1.4},{x:1.1,z:4},seat.approach]:[q,{x:-1.25,z:3.85},seat.approach];
 if(age<3.2)return {...along(approach,age/3.2),...info,y:B.floor1Y,walking:true,seated:false};
 if(age<4)return {...seatedTransition(seat,(age-3.2)/.8),...info,walking:false,seated:true};
 if(age<departure)return {...seat.anchor,...info,y:seat.seatTop,walking:false,seated:true};
 const out=age-departure;if(out<.8)return {...seatedTransition(seat,1-out/.8),...info,walking:false,seated:true};
 if(out<5)return {...along([seat.approach,{x:0,z:5.4},doorway],(out-.8)/4.2),...info,y:B.floor1Y,walking:true,seated:false};return null;
}
