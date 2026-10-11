const projectionKeys=['left','right','top','bottom','near','far','zoom'];
function captureFrame(camera,target){
 return {position:camera.position.toArray(),target:target.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),scale:camera.scale.toArray(),view:camera.view?{...camera.view}:null,projection:Object.fromEntries(projectionKeys.map(key=>[key,camera[key]]))};
}
function restoreFrame(camera,target,frame,{projection=true}={}){
 camera.position.fromArray(frame.position);target.fromArray(frame.target);
 camera.quaternion.fromArray(frame.quaternion);camera.up.fromArray(frame.up);camera.scale.fromArray(frame.scale);
 if(projection){
  for(const key of projectionKeys)camera[key]=frame.projection[key];
  camera.view=frame.view?{...frame.view}:null;
 }else camera.zoom=frame.projection.zoom;
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}

/** Owner-called Y transport; no listeners, controls wrapper, or frame loop. */
export function createBakeryHeightFollow(initialY=.05){
 let followY=initialY,active=true,alive=true,activity=null,resize=null,serial=0;
 const clear=()=>{activity=null;resize=null;};
 const enter=y=>{if(!alive||!Number.isFinite(y))return false;clear();followY=y;active=true;return true;};
 return {
  update(camera,target,supportY,dt,{reducedMotion=false}={}){
   if(!alive||!active||activity||resize||!Number.isFinite(supportY)||!Number.isFinite(dt))return 0;
   const alpha=reducedMotion?1:1-Math.exp(-5*Math.max(0,Math.min(dt,.05))),dy=(supportY-followY)*alpha;
   camera.position.y+=dy;target.y+=dy;followY+=dy;return dy;
  },
  snapshot(){return {followY};},
  restore(s){if(alive&&Number.isFinite(s?.followY))followY=s.followY;},
  rebase(y){if(alive&&Number.isFinite(y))followY=y;},
  enter,
  afterReset:enter,
  beginActivity(camera,target){
   if(!alive||!active||resize)return null;
   if(activity)return activity.camera===camera&&activity.target===target?activity.ticket:null;
   const ticket=Object.freeze({kind:'activity',id:++serial});
   activity={ticket,camera,target,followY,frame:captureFrame(camera,target)};return ticket;
  },
  endActivity(camera,target,ticket){
   if(!alive||!active||!activity||ticket!==activity.ticket||camera!==activity.camera||target!==activity.target)return false;
   const saved=activity;clear();restoreFrame(camera,target,saved.frame);followY=saved.followY;return true;
  },
  beginResize(camera,target){
   if(!alive||!active||activity)return null;
   if(resize)return resize.camera===camera&&resize.target===target?resize.ticket:null;
   const ticket=Object.freeze({kind:'resize',id:++serial});
   resize={ticket,camera,target,followY,frame:captureFrame(camera,target)};return ticket;
  },
  endResize(camera,target,ticket){
   if(!alive||!active||!resize||ticket!==resize.ticket||camera!==resize.camera||target!==resize.target)return false;
   const saved=resize;clear();restoreFrame(camera,target,saved.frame,{projection:false});followY=saved.followY;return true;
  },
  leave(){if(!alive||!active)return false;clear();active=false;return true;},
  dispose(){if(!alive)return false;clear();alive=false;active=false;return true;}
 };
}
