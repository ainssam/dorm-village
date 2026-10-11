// Shared patch identities keep save validation, interaction targets and bloom state aligned.
export const GARDEN_BEDS=Object.freeze([
 {id:'park.flowers',label:'햇살 꽃밭',at:{x:4.5,z:3.65},anchor:{x:4.5,y:.05,z:3.65,yaw:Math.PI},center:{x:4.5,z:2.15},hx:.30,hz:.70,axis:'z'},
 {id:'park.flowers-west',label:'들꽃 꽃밭',at:{x:-4.25,z:-2.5},anchor:{x:-4.25,y:.05,z:-2.5,yaw:Math.atan2(-.85,-1.2)},center:{x:-5.1,z:-3.7},hx:.70,hz:.30,axis:'x'},
 {id:'park.flowers-north',label:'나비 꽃밭',at:{x:1,z:-3.45},anchor:{x:1,y:.05,z:-3.45,yaw:Math.PI},center:{x:1,z:-4.7},hx:.7,hz:.3,axis:'x'}
]);
export const GARDEN_BED_IDS=Object.freeze(GARDEN_BEDS.map(b=>b.id));
export const isGardenBed=id=>GARDEN_BED_IDS.includes(id);
