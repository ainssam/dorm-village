import {PLAZA} from './layout.js';import {canReachInteraction} from '../interactions.js';
// The camp panel may suggest a seat, but only a nearby, clear approach can start it.
export function canApproachCampSeat(roomId,position,world,seat){return roomId==='courtyard'&&seat?.id===PLAZA.seats[0].id&&canReachInteraction(world,position,seat,.66);}
export function withCampCollision(world,roomId,visitors=[]){return roomId==='courtyard'&&visitors.length?{...world,circles:[...(world.circles??[]),...visitors]}:world;}
