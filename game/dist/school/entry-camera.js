import {ROOMS} from '../world/rooms.js';
import {isSchoolWorld,schoolHallId} from '../world/school-floor-layout.js';
import {campusCamera} from '../world/connected-layout.js';
import {schoolRoomFraming} from './framing.js';
// Opposing default room views change under a short world-only fade, never a half-orbit.
// User angles take precedence; map/new-floor placement establishes its destination immediately.
const SCHOOL_ENTRY_MOTION={duration:.8,orbitPath:true,concealTurns:true};
// This is the same path for a walked doorway, map arrival and a newly loaded school floor.
export function applySchoolCameraEntry({worldId,roomId,previous,cam,position,smooth=true,fullRoom=false,reduced=false,entryZoom=zoom=>zoom}){
 if(!isSchoolWorld(worldId))return null;if(roomId===previous)return previous;const field=roomId==='sportsField';
 // A new field visit starts at the requested reference scale. A later overview choice inside it remains user-owned.
 if(smooth&&cam.isOverview()&&!field)return roomId;
 if(schoolHallId(roomId)){cam.reframe({...ROOMS[roomId],camera:campusCamera(worldId)},position,null,{...SCHOOL_ENTRY_MOTION,smooth:smooth&&!reduced});return roomId;}
 const f=schoolRoomFraming(roomId,{fullRoom});cam.reframe({...ROOMS[roomId],camera:f.camera},position,f.bounds,{...SCHOOL_ENTRY_MOTION,smooth:smooth&&!reduced,zoom:fullRoom?1:(field||roomId==='schoolGym'||roomId==='principalOffice'||['korean','english'].includes(roomId))?f.zoom:entryZoom(f.zoom),interior:!fullRoom&&!['korean','english'].includes(roomId),freshEntry:field&&!fullRoom});return roomId;
}
