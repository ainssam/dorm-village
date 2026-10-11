/** A separate opposite chair at the ORIGINAL left table. Never a player seat or saved order slot. */
export const TEA_SEAT=Object.freeze({id:'bakeryCafe.tea-chair-left',playerSeatId:'bakeryCafe.chair-left',tableId:'bakeryCafe.table-left',floor:'floor2',floorY:3.25,x:-3.7,z:-.2,yaw:0,seatTop:3.84,approach:Object.freeze({x:-2.35,z:-.2}),chair:Object.freeze({width:1.18,depth:1.25,thickness:.12,backZ:-.86,backCenterY:4.16,backHeight:.64}),table:Object.freeze({x:-3.7,z:1.2,radius:.65,topY:4.18}),cup:Object.freeze({x:-3.7,y:4.18,z:.70})});
export const TEA_WAYPOINTS=Object.freeze([[0,6.12],[0,5.7],[4.8,5.7],[4.8,-5.65],[7.8,-5.65],[7.8,5.7],[1.8,5.7],[1.8,-.2],[-2.35,-.2]].map(([x,z])=>Object.freeze({x,z})));
export const TEA_RADIUS=.66;
export const TEA_HOP_ARC=.15;
