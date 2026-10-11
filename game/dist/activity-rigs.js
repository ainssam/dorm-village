/** Preserve an ambient resident's equipment when the player uses a different fixture. */
export function updateActivityRigs(view,activity,pose){
 view?.setCoasterFrame?.(activity.kind==='coaster'?pose:undefined);
 view?.setKartFrame?.(activity.kind==='kartRace'?pose:undefined);
 view?.setBumperFrame?.(activity.kind==='bumper'?pose:undefined);
 view?.setVikingFrame?.(activity.kind==='viking'?pose:undefined);
 view?.setCarouselAngle?.(activity.kind==='carousel'?pose.carouselAngle:0,activity.kind==='carousel'?pose.carouselRamp:1);
 view?.setRockingAngle?.(activity.rocking?pose.pitch:0);
 if(activity.kind==='swing'||view?.residentSpaceUse?.current?.kind!=='swing')view?.setSwingAngle?.(activity.kind==='swing'?pose.pitch:0);
 view?.setSeesawAngle?.(activity.kind==='seesaw'?-pose.pitch:0);
}
