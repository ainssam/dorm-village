// 366 actual koala skin samples: max horizontal radius .98036. Fixed margin covers
// all idle/pour/steam/blend/handover body/clothing poses, not the released cup.
export const KOALA_WORK_OCCUPANT=Object.freeze({id:'bakeryCafe.koala-work-area',x:-2.5,z:-5.65,radius:1.04,floor:'floor2',floorY:3.25,supportY:3.25,minY:3.25,maxY:5.6,height:2.35});
export function attachCafeFoodOccupancy(view){const previous=view.cafeFoodOccupants,read=()=>[KOALA_WORK_OCCUPANT];view.cafeFoodOccupants=read;let alive=true;return()=>{if(!alive)return;alive=false;if(view.cafeFoodOccupants===read){if(previous===undefined)delete view.cafeFoodOccupants;else view.cafeFoodOccupants=previous;}};}
