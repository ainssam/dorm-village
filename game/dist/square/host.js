// A single main-loop render branch. No independent clock, renderer or saved state.
export function renderSquareFrame({square,renderer,scene,stage,view,dt,ms,sampleFrame=()=>{}}){
 square.tick(dt);if(!square.active)return false;
 const r=square.viewport(stage.clientWidth,stage.clientHeight);
 view?.updateVisibility?.(square.camera,null,{focusRoom:'courtyard'});
 renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
 renderer.setScissor(r.x,stage.clientHeight-r.y-r.height,r.width,r.height);
 renderer.setViewport(r.x,stage.clientHeight-r.y-r.height,r.width,r.height);
 renderer.render(scene,square.camera);renderer.setScissorTest(false);renderer.setViewport(0,0,stage.clientWidth,stage.clientHeight);
 sampleFrame(ms,square.sampleEligible);return true;
}
