/** Non-sensitive device preference, separate from all saved game progress. */
export const GUIDANCE_KEY='dormi-guidance-v1';
export function readGuidancePreference(storage){try{return storage?.getItem(GUIDANCE_KEY)!=='off';}catch{return true;}}
export function writeGuidancePreference(storage,visible){try{if(!storage?.setItem)return false;storage.setItem(GUIDANCE_KEY,visible?'on':'off');return true;}catch{return false;}}
