/** Machine local: +Y up, +Z forward. Distances are original Dormi units. */
export const STAIR_GEOMETRY=Object.freeze({pitch:.40,rise:.10,bottomZ:-1.20,bottomY:.052,treadCount:7,treadWidth:1.4,treadDepth:.40,footFront:.32,swingLift:.13,floorY:.012,railX:.62,railY:.822,railStartZ:-.56,railEndZ:1.16,railRadius:.026});
const finite=(value,name)=>{if(!Number.isFinite(value))throw new TypeError(`Stair ${name} must be finite`);return value;};
/** A material ID is never reduced modulo the visible mesh count. */
export function stairTreadFrame(treadId,travel=0){
 finite(travel,'travel');if(!Number.isInteger(treadId))throw new TypeError('Stair tread ID must be an integer');
 const g=STAIR_GEOMETRY,centerZ=g.bottomZ+(treadId-travel)*g.pitch,topY=g.bottomY+(treadId-travel)*g.rise;
 return {treadId,centerZ,topY,minZ:centerZ-g.treadDepth/2,maxZ:centerZ+g.treadDepth/2};
}
/** Original rounded toes need .32 in front of their neutral origin. */
export function stairFootOnTread(treadId,travel=0){const t=stairTreadFrame(treadId,travel);return {y:t.topY,z:t.maxZ-STAIR_GEOMETRY.footFront,treadId};}
export function stairVisibleIds(travel=0){finite(travel,'travel');const first=Math.floor(travel+.5);return Array.from({length:STAIR_GEOMETRY.treadCount},(_,i)=>first+i);}
/** Height of the real stair top, rear entry platform, or surrounding floor. */
export function stairSupportAt(x,z,travel=0){
 finite(x,'x');finite(z,'z');finite(travel,'travel');const g=STAIR_GEOMETRY,ids=stairVisibleIds(travel),first=stairTreadFrame(ids[0],travel),last=stairTreadFrame(ids.at(-1),travel);
 if(z<first.minZ)return {y:g.floorY,treadId:null,kind:z>=-1.65?'platform':'floor'};
 if(Math.abs(x)>g.treadWidth/2||z>last.maxZ)return null;
 const id=Math.floor((z-g.bottomZ)/g.pitch+travel+.5+1e-10),t=stairTreadFrame(Math.min(ids.at(-1),Math.max(ids[0],id)),travel);
 return {y:t.topY,treadId:t.treadId,kind:'tread'};
}
