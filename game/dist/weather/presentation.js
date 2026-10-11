// Optional original Canvas2D atmosphere. Host drives frame/visibility; no timers or RAF.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
export function weatherLayerSize(width,height,dpr=1){
 const w=clamp(Math.round(width),1,4096),h=clamp(Math.round(height),1,4096),ratio=Math.min(clamp(dpr,.1,1.5),Math.sqrt(600000/(w*h)));
 return {width:w,height:h,dpr:ratio,pixelWidth:Math.max(1,Math.floor(w*ratio)),pixelHeight:Math.max(1,Math.floor(h*ratio))};
}
const unit=(index,salt)=>{const n=Math.sin(index*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
export function drawWeatherLayer(ctx,scene,{width,height,timeMs=0,reducedMotion=false,windScreenX=0,viewport=null}={}){
 const fullW=clamp(width,1,4096),fullH=clamp(height,1,4096),cover=clamp(scene?.cloudOpacity,0,1),time=clamp(timeMs,0,Number.MAX_SAFE_INTEGER)/1000;
 ctx.save();ctx.clearRect(0,0,fullW,fullH);
 if(!['weather','stale-weather'].includes(scene?.mode)){ctx.restore();return;}
 const vx=Number.isFinite(viewport?.x)?viewport.x:0,vy=Number.isFinite(viewport?.y)?viewport.y:0;
 const x=Math.max(0,vx),y=Math.max(0,vy),w=Math.max(0,Math.min(fullW,vx+(viewport?clamp(viewport.width,0,4096):fullW))-x),h=Math.max(0,Math.min(fullH,vy+(viewport?clamp(viewport.height,0,4096):fullH))-y);
 if(!w||!h){ctx.restore();return;}
 ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);
 if(cover>0){
  const tint=ctx.createLinearGradient(0,0,0,h);tint.addColorStop(0,`rgba(110,135,153,${cover*.14})`);tint.addColorStop(1,'rgba(110,135,153,0)');ctx.fillStyle=tint;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=`rgba(222,231,238,${cover*.14})`;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(w*(.08+i*.44),h*(.05+i*.025),w*.36,h*.11,0,0,Math.PI*2);ctx.fill();}
 }
 const limit=reducedMotion||scene.precipitation==='none'?0:Math.floor(clamp(scene.particleLimit,0,96)),wind=clamp(windScreenX,-1,1)*clamp(scene.windDrift,0,1),intensity=clamp(scene.intensity,0,1);
 ctx.strokeStyle=`rgba(171,206,222,${.2+intensity*.18})`;ctx.fillStyle=`rgba(243,248,250,${.45+intensity*.22})`;ctx.lineWidth=1;ctx.beginPath();
 for(let i=0;i<limit;i++){
  const snow=scene.precipitation==='snow'||scene.precipitation==='mixed'&&i%2===0;
  const phase=(unit(i,2)+time*(snow?.035:.36))%1,y=phase*(h+24)-12;
  const drift=wind*phase*45+(snow?Math.sin(time*.6+i)*4:0),x=(unit(i,1)*w+drift+w)%w;
  if(snow){const radius=1+unit(i,3);ctx.moveTo(x+radius,y);ctx.arc(x,y,radius,0,Math.PI*2);}else{ctx.moveTo(x,y);ctx.lineTo(x+wind*5,y+6+intensity*5);}
 }
 // Each marker is its own subpath; a two-point rain stroke has no filled area.
 if(scene.precipitation==='snow')ctx.fill();else if(scene.precipitation==='mixed'){ctx.fill();ctx.stroke();}else ctx.stroke();
 ctx.restore();
}
export function createWeatherOverlay(host){
 const canvas=host.ownerDocument.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Weather canvas unavailable');
 canvas.setAttribute('aria-hidden','true');canvas.setAttribute('data-weather-overlay','');
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});canvas.hidden=true;host.appendChild(canvas);
 let disposed=false,scene=null,options={enabled:false,outdoors:false,visible:true,reducedMotion:false,windScreenX:0,viewport:null},size=weatherLayerSize(1,1),lastFrame=-Infinity,currentTime=0;
 const equal=(a,b)=>a===b||a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);
 function active(){return !disposed&&options.enabled&&options.outdoors&&options.visible&&['weather','stale-weather'].includes(scene?.mode);}
 function staticView(){return options.reducedMotion||scene?.animationFps===0;}
 function draw(timeMs){lastFrame=timeMs;ctx.setTransform(size.pixelWidth/size.width,0,0,size.pixelHeight/size.height,0,0);drawWeatherLayer(ctx,scene,{width:size.width,height:size.height,timeMs,reducedMotion:options.reducedMotion,windScreenX:options.windScreenX,viewport:options.viewport});}
 function update(nextScene,next={}){
  if(disposed)return;
  const opts={enabled:false,outdoors:false,visible:true,reducedMotion:false,windScreenX:0,viewport:null,...next};
  opts.viewport=opts.viewport?{...opts.viewport}:null;
  const sameOptions=equal({...options,viewport:null},{...opts,viewport:null})&&equal(options.viewport,opts.viewport);
  if(equal(scene,nextScene)&&sameOptions)return;
  const wasActive=active(),wasStatic=staticView();scene=nextScene?{...nextScene}:null;options=opts;canvas.hidden=!active();
  // Equal host updates never redraw/reset particle time; animated changes await
  // the existing host frame clock. Static or visibility transitions repaint once.
  if(active()&&(!wasActive||staticView()||wasStatic))draw(currentTime);
 }
 function resize(width,height,dpr=1){
  if(disposed)return;const next=weatherLayerSize(width,height,dpr);if(equal(size,next))return;
  size=next;canvas.width=size.pixelWidth;canvas.height=size.pixelHeight;
  if(active()&&(staticView()||currentTime-lastFrame>=1000/24))draw(currentTime);
 }
 function frame(timeMs){
  if(disposed||!Number.isFinite(timeMs))return;currentTime=timeMs;
  if(!active()||staticView()||timeMs-lastFrame<1000/24)return;draw(timeMs);
 }
 function dispose(){if(disposed)return;disposed=true;scene=null;canvas.remove();}
 return Object.freeze({update,resize,frame,dispose});
}
