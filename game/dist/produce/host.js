// Called only by the existing game animation frame. No new clock or renderer ownership.
export function renderProduceFrame({produceHost,cam,renderer,scene,stage,view,player,camera,sun,dt,reduced=false}){
 produceHost.tick(dt);if(!produceHost.active)return false;
 produceHost.resize(stage.clientWidth,stage.clientHeight,()=>cam.resizeActivityReturn());
 cam.follow(player.position,dt);cam.controls.update();view?.animate?.(dt);view?.updateResidents?.(0,player.position,true,reduced,{blocked:true,camera,viewportHeight:stage.clientHeight});
 sun.position.set(player.position.x-3,9,player.position.z+7);sun.target.position.set(player.position.x,0,player.position.z);sun.target.updateMatrixWorld();
 const chosen=produceHost.camera??camera;view?.updateVisibility?.(chosen,player.position,{focusRoom:'park'});renderer.setScissorTest(false);renderer.setViewport(0,0,stage.clientWidth,stage.clientHeight);renderer.render(scene,chosen);return true;
}
