import {floorForWorld} from './school-floor-layout.js';
import {HOUSE_IDS} from '../home/layout.js';
import {isSchoolWorld,schoolHallFor,roomsForSchoolWorld,zoneBounds} from './connected-layout.js';
const inside=(b,p,margin)=>p.x>=b.minX+margin&&p.x<=b.maxX-margin&&p.z>=b.minZ+margin&&p.z<=b.maxZ-margin;
export function trackZone(worldId,previous,p){if(worldId!=='house'&&!isSchoolWorld(worldId))return previous;const hub=worldId==='house'?'home':schoolHallFor(worldId),ids=(worldId==='house'?HOUSE_IDS:roomsForSchoolWorld(worldId)).filter(id=>id!==hub);for(const id of ids)if(inside(zoneBounds(id),p,.25))return id;if(ids.includes(previous)&&inside(zoneBounds(previous),p,-.25))return previous;for(const c of floorForWorld(worldId)?.connectors??[])if(inside(c,p,-.25))return c.sourceRoomId;return hub;}
