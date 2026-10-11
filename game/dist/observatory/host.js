/** The existing sky modal owns rendering/input. This lease only remembers the
 * unchanged world, and cannot resurrect an actor after travel/failure. */
export function beginTelescopeReturn(getContext){
 const c=getContext();if(c?.roomId!=='observatoryIsland'||!c.player||!c.camera||!c.controls)return()=>{};
 const {player,model,camera,controls,scene}=c,objects=[player,model,camera].filter(Boolean).map(object=>({object,position:object.position.clone(),quaternion:object.quaternion.clone()}));
 const viewport=c.viewport?{...c.viewport}:null,target=controls.target.clone(),projection=Object.fromEntries(['left','right','top','bottom','near','far','zoom'].map(k=>[k,camera[k]]));let active=true;
 return()=>{if(!active)return;active=false;const next=getContext();if(next?.roomId!==c.roomId||next.scene!==scene||next.player!==player||next.camera!==camera||next.failed)return;
  for(const saved of objects){saved.object.position.copy(saved.position);saved.object.quaternion.copy(saved.quaternion);saved.object.updateMatrixWorld(true);}controls.target.copy(target);Object.assign(camera,projection);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  // The world pose is exact; a rotated/resized device needs its current aspect.
  if(viewport&&next.viewport&&(viewport.width!==next.viewport.width||viewport.height!==next.viewport.height))next.resize?.();
 };
}
