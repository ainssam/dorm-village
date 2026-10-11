import {GYM_ATMOSPHERE_OBSTACLES} from './atmosphere-layout.js';
import {CURLING_OBSTACLES} from './curling-layout.js';
import {LASER_OBSTACLES} from './laser-layout.js';
import {CLIMBING_OBSTACLES} from './climbing-layout.js';
import {ARCHERY_OBSTACLES} from './archery-layout.js';
import {BOXING_OBSTACLES} from './boxing-layout.js';
// The first-floor gym keeps old school rooms and every outdoor court fixed.
export const GYM_ID='schoolGym';
export const GYM_ZONE=Object.freeze({x:29,z:-30,yaw:0,floor:Object.freeze({minX:-16,maxX:16,minZ:-16,maxZ:16})});
export const GYM_CONNECTOR=Object.freeze({id:'gym-walkway',sourceRoomId:'sportsField',targetRoomId:GYM_ID,minX:21.5,maxX:24.5,minZ:-14.2,maxZ:-7});
export const GYM_DOOR=Object.freeze({id:GYM_ID,sourceRoomId:'sportsField',x:23,z:-14,axis:'z',color:'#709b94'});
export const GYM_SPAWN=Object.freeze({x:-6,z:13.5,yaw:Math.PI});
export const GYM_FIELD_RETURN=Object.freeze({x:-7,z:0,yaw:Math.PI});
export const GYM_WEIGHTS=Object.freeze({x:8,z:8.5,hx:1.3,hz:.7});
// Full-size machine, rear approach and a separate clear 4×6 operating bay.
export const TREADMILL=Object.freeze({id:'schoolGym.treadmill',x:-1.5,z:10,yaw:Math.PI,bay:{minX:-3.5,maxX:.5,minZ:7,maxZ:13},width:2,length:3.4,beltWidth:1.4,beltLength:2.2,deckY:.18,entry:{x:-1.5,z:12.65,yaw:Math.PI},center:{x:-1.5,z:10,yaw:Math.PI}});
export const STAIR_CLIMBER=Object.freeze({id:'schoolGym.stairs',x:2.5,z:10,yaw:Math.PI,bay:{minX:.5,maxX:4.5,minZ:7,maxZ:13},width:2.1,length:3.3,entry:{x:2.5,z:12.65,yaw:Math.PI}});
export const GYM_PASSING=Object.freeze({x:2,z:-2,yaw:0,bounds:{minX:-8.5,maxX:12.5,minZ:-3.5,maxZ:6.5},entry:{x:-.5,z:2.4}});
export const GYM_OBSTACLES=Object.freeze([{id:'schoolGym.weights-rack',...GYM_WEIGHTS},{id:TREADMILL.id,x:TREADMILL.x,z:TREADMILL.z,hx:1,hz:1.7},{id:STAIR_CLIMBER.id,x:STAIR_CLIMBER.x,z:STAIR_CLIMBER.z,hx:1.05,hz:1.65},...BOXING_OBSTACLES,...ARCHERY_OBSTACLES,...CLIMBING_OBSTACLES,...LASER_OBSTACLES,...CURLING_OBSTACLES,...GYM_ATMOSPHERE_OBSTACLES]);
export const GYM_QUEUED=Object.freeze(['탁구','배드민턴']);
export function gymSupportAt(z){const rear=TREADMILL.z+1.1,rampEnd=TREADMILL.z+1.7;if(z>=rampEnd)return .012;if(z>rear)return .012+(TREADMILL.deckY-.012)*(rampEnd-z)/(rampEnd-rear);return TREADMILL.deckY;}
