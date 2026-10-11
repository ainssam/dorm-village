/** Initial framing only. Never use this policy during ordinary follow or resize. */
export function roomEntryZoom({width,height,coarse=false},phoneZoom=1.25){
 return !coarse&&width>=960&&height>=520?2.5:phoneZoom;
}
