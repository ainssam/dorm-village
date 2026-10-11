import {handwritingFont} from './font-ready.js';
import {makeCamera,projectDirection,projectGreatCircleSegment,projectCardinals} from './astronomy/src/sky-projection.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),RAD=Math.PI/180;
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const COLORS={night:['#101d30','#263f59','#80929e'],twilight:['#565875','#9a8798','#e9b899'],day:['#6597b8','#a5c8d9','#e3e8dc']};
function mix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}
export function scientificAtmosphere(altitude){
 const t=clamp((altitude+18)/15,0,1),d=clamp((altitude+3)/8,0,1);
 const colors=COLORS.night.map((v,i)=>mix(mix(v,COLORS.twilight[i],t),COLORS.day[i],d));
 return Object.freeze({top:colors[0],middle:colors[1],bottom:colors[2],stars:clamp((-altitude-2)/16,0,1)**1.6,cloud:.32+.48*clamp((altitude+18)/23,0,1),band:altitude>=0?'day':altitude>=-6?'civil-twilight':altitude>=-12?'nautical-twilight':altitude>=-18?'astronomical-twilight':'night'});
}
function clipBelow(points,limit){const result=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],inside=a.y<=limit,next=b.y<=limit;if(inside)result.push(a);if(inside!==next){const t=(limit-a.y)/(b.y-a.y);result.push({x:a.x+(b.x-a.x)*t,y:limit});}}return result;}
/** Enlarged illustrative disc; illuminated area is geocentric, orientation sunward. */
export function moonPhasePolygon(center,radius,fraction,sunward={x:1,y:0},horizonY=Infinity){
 const f=clamp(fraction,0,1);if(f<1e-7)return[];const length=Math.hypot(sunward.x,sunward.y)||1,ux=sunward.x/length,uy=sunward.y/length,k=2*f-1,points=[];
 const add=(x,y)=>points.push({x:center.x+radius*(x*ux-y*uy),y:center.y+radius*(x*uy+y*ux)});
 for(let i=0;i<=32;i++){const a=-Math.PI/2+Math.PI*i/32;add(Math.cos(a),Math.sin(a));}
 for(let i=32;i>=0;i--){const a=-Math.PI/2+Math.PI*i/32;add(-k*Math.cos(a),Math.sin(a));}
 return clipBelow(points,horizonY);
}
function discPolygon(point,radius,horizonY){return clipBelow(Array.from({length:64},(_,i)=>({x:point.x+Math.cos(i*Math.PI/32)*radius,y:point.y+Math.sin(i*Math.PI/32)*radius})),horizonY);}
function normalized(v){const n=Math.hypot(...v);return v.map(x=>x/n);}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
/** Actual angular limb when scale=1; same-direction illustrative enlargement above 2°. */
export function celestialDiscPolygon(object,camera,fraction=null,scale=1){
 const m=object.directionENU,reference=Math.abs(m[2])<.99?[0,0,1]:[0,1,0],u=object.sunwardTangentENU??normalized(reference.map((v,i)=>v-dot(reference,m)*m[i])),v=normalized(cross(m,u)),sinR=Math.sin((object.angularRadiusDeg??.26)*RAD*scale);
 const unit=fraction===null?Array.from({length:64},(_,i)=>({x:Math.cos(i*Math.PI/32),y:Math.sin(i*Math.PI/32)})):moonPhasePolygon({x:0,y:0},1,fraction,{x:1,y:0});
 const rays=unit.map(p=>{const c=Math.sqrt(Math.max(0,1-sinR*sinR*(p.x*p.x+p.y*p.y)));return m.map((a,i)=>a*c+sinR*(u[i]*p.x+v[i]*p.y));}),clipped=[];
 for(let i=0;i<rays.length;i++){const a=rays[i],b=rays[(i+1)%rays.length],inside=a[2]>=0,next=b[2]>=0;if(inside)clipped.push(a);if(inside!==next){const t=a[2]/(a[2]-b[2]);clipped.push(a.map((x,k)=>x+(b[k]-x)*t));}}
 return clipped.flatMap(ray=>{const z=dot(ray,camera.forward);return z>0?[{x:camera.width/2*(1+dot(ray,camera.right)/(z*camera.tanX)),y:camera.height/2*(1-dot(ray,camera.up)/(z*camera.tanY))}]:[];});
}
export function bodyMarkerRadius(object,camera,{variant='sky',horizonFraming=false}={}){const z=Math.max(.1,dot(object.directionENU,camera.forward)),actual=Math.tan((object.angularRadiusDeg??.26)*RAD)*camera.height/(2*camera.tanY*z),t=clamp((object.altitudeDeg-2)/4,0,1),smooth=t*t*(3-2*t),nominal=object.kind==='moon'?Math.min(16,Math.max(10,camera.width*.028)):8,target=variant==='telescope'||variant==='sky'&&horizonFraming?Math.max(actual,nominal):nominal;return {radius:actual+(target-actual)*smooth,illustrativeScale:actual>0?1+(target/actual-1)*smooth:1};}
const bodyNames={Sun:'태양',Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성'};
/** Cached only when immutable snapshot, camera, or viewport changes. */
export function prepareScientificSky(snapshot,{width,height,yawDeg=180,pitchDeg=35,verticalFovDeg=75,variant='sky',horizonFraming=false}={}){
 horizonFraming=variant==='sky'&&horizonFraming===true;
 const camera=makeCamera({width,height,yawDeg,pitchDeg,verticalFovDeg}),atmosphere=scientificAtmosphere(snapshot.sunAltitudeDeg),horizonY=height/2*(1+Math.tan(pitchDeg*RAD)/camera.tanY),stars=[],bodies=[],byId=new Map(snapshot.objects.map(o=>[o.id,o]));
 for(const object of snapshot.objects){
  if(variant==='telescope'&&(object.kind==='sun'||object.id==='Sun'))continue;
  const extended=object.kind==='moon'||object.kind==='sun';if(!object.aboveHorizon&&!(extended&&object.limbHorizonState==='partial'))continue;const point=projectDirection(object.directionENU,camera,{clipHorizon:!extended});if(!point)continue;
  if(object.kind==='star')stars.push({id:object.id,point,radius:clamp(1.8-(object.magnitude??6)*.22,.42,2.1),alpha:clamp(1-(object.magnitude??6)*.1,.24,1),magnitude:object.magnitude});
  else {const marker=extended?bodyMarkerRadius(object,camera,{variant,horizonFraming}):{radius:clamp(2.1-(object.magnitude??6)*.19,1,3.2),illustrativeScale:1},radius=marker.radius;bodies.push({id:object.id,label:bodyNames[object.id]??object.name,kind:object.kind,point,radius,illustrativeScale:marker.illustrativeScale,magnitude:object.magnitude,phaseFraction:object.illuminatedFraction,phaseCycleDeg:object.phaseCycleDeg,disc:extended?celestialDiscPolygon(object,camera,null,marker.illustrativeScale):discPolygon(point,radius,horizonY),phase:object.kind==='moon'?celestialDiscPolygon(object,camera,object.illuminatedFraction,marker.illustrativeScale):null});}
 }
 const guides=[];
 for(const pattern of snapshot.guidePatterns??[]){const segments=[];for(const [a,b]of pattern.edges){const start=byId.get(a),end=byId.get(b);if(!start||!end)continue;const projected=projectGreatCircleSegment(start.directionENU,end.directionENU,camera);if(projected)segments.push(projected);}if(segments.length)guides.push({id:pattern.id,label:pattern.labelKo,segments});}
 // Reserve clear header/footer space. Labels may be omitted; sky coordinates never move.
 const labels=[],top=Math.min(160,height*.32),bottom=height-Math.min(180,height*.31);
 const reserved=horizonFraming?bodies.filter(b=>b.disc.length).map(b=>({left:Math.min(...b.disc.map(p=>p.x))-8,right:Math.max(...b.disc.map(p=>p.x))+8,top:Math.min(...b.disc.map(p=>p.y))-8,bottom:Math.max(...b.disc.map(p=>p.y))+8})):[];
 const coversBody=(x,y,half)=>reserved.some(b=>x+half>b.left&&x-half<b.right&&y+4>b.top&&y-20<b.bottom);
 const addLabel=(text,x,y)=>{const half=Math.min(width*.44,text.length*8);x=clamp(x,half+8,width-half-8);if(y<top||y>bottom||labels.length>=8||coversBody(x,y,half)||labels.some(l=>Math.abs(l.x-x)<l.half+half+12&&Math.abs(l.y-y)<25))return;labels.push({text,x,y,half});};
 for(const body of bodies)if(body.kind!=='sun'&&body.kind!=='planet'||atmosphere.stars>0&&body.magnitude<3)addLabel(body.kind==='moon'?`달 · ${body.illustrativeScale>1.05?'확대 표식':'실제 각크기'} ${Math.round(body.phaseFraction*100)}%`:body.label,body.point.x,body.point.y+body.radius+22);
 for(const pattern of guides){const points=pattern.segments.flat();addLabel(pattern.label,points.reduce((s,p)=>s+p.x,0)/points.length,Math.max(...points.map(p=>p.y))+24);}
 const cardinals=projectCardinals(camera).map(p=>({...p,anchorY:p.y,y:clamp(p.y-14,top,bottom)}));
 // Keep the geometric anchor; omit colliding text instead of moving the sky.
 if(horizonFraming)for(const p of cardinals)if(coversBody(clamp(p.x,56,width-56),p.y,56))p.hidden=true;
 return {camera,atmosphere,horizonY,stars,bodies,guides,labels,cardinals,snapshot,...(variant==='telescope'?{variant}: {}),...(horizonFraming?{horizonFraming:true}:{})};
}
function circle(ctx,x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function polygon(ctx,points,fill){if(points.length<3)return;ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fill();}
const CLOUDS=[[-.29,.15,.81,.13,.29,.60],[.63,.10,.64,.11,-.21,.32],[-.31,.49,.87,.20,.45,.65],[.66,.44,.76,.18,-.32,.45],[-.30,.70,1.15,.23,.62,.95],[.43,.75,.98,.18,-.46,.86],[.11,.92,1.08,.17,.34,.44]];
/** Draws exactly this cached scientific frame. No date/observer computation here. */
export function drawScientificSky(ctx,{prepared:p,time=0,guides=false,assets}){
 const {width:w,height:h}=p.camera,a=p.atmosphere,framedHorizon=p.horizonFraming&&p.horizonY>0&&p.horizonY<h,bg=ctx.createLinearGradient(0,0,0,framedHorizon?p.horizonY:h);bg.addColorStop(0,a.top);bg.addColorStop(.55,a.middle);bg.addColorStop(1,a.bottom);ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const hazeX=framedHorizon?w*.5:w*.32,hazeY=framedHorizon?p.horizonY+Math.min(24,h*.04):h*1.13,haze=ctx.createRadialGradient(hazeX,hazeY,0,hazeX,hazeY,w*.85);haze.addColorStop(0,'#ffdfc342');haze.addColorStop(.58,'#efdbd10c');haze.addColorStop(1,'#efdbd100');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
 if(p.horizonY<h){const start=Math.max(0,p.horizonY-18),fade=ctx.createLinearGradient(0,start,0,Math.min(h,p.horizonY+110));fade.addColorStop(0,'#152a3500');fade.addColorStop(1,'#152a3528');ctx.fillStyle=fade;ctx.fillRect(0,start,w,h-start);}
 if(p.horizonFraming&&p.horizonY<h){const start=Math.max(0,p.horizonY),depth=ctx.createLinearGradient(0,start,0,h);depth.addColorStop(0,'#152a351f');depth.addColorStop(.35,'#152a3566');depth.addColorStop(1,'#152a35ad');ctx.fillStyle=depth;ctx.fillRect(0,start,w,h-start);if(framedHorizon){ctx.strokeStyle='#152a3528';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,p.horizonY);ctx.lineTo(w,p.horizonY);ctx.stroke();}}
 if(guides&&a.stars>.02){ctx.globalAlpha=a.stars*.32;ctx.strokeStyle='#dce8e5';ctx.lineWidth=.85;ctx.beginPath();for(const pattern of p.guides)for(const [from,to]of pattern.segments){ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);}ctx.stroke();}
 for(const star of p.stars){ctx.globalAlpha=star.alpha*a.stars;if(ctx.globalAlpha<.025)continue;circle(ctx,star.point.x,star.point.y,star.radius,'#e1e9e7');if(star.radius>1.45){ctx.globalAlpha*=.08;circle(ctx,star.point.x,star.point.y,star.radius*3,'#d8e6f4');}}
 for(const body of p.bodies){if(body.kind==='planet'&&a.stars<.08)continue;ctx.globalAlpha=body.kind==='moon'?.45+.5*a.stars:body.kind==='sun'?.88:a.stars;polygon(ctx,body.disc,body.kind==='moon'?'#7f919c':body.kind==='sun'?'#fff1c7':'#f3dfbb');if(body.phase){polygon(ctx,body.phase,'#f7efd3');if(p.variant!=='telescope'&&assets?.alive&&body.illustrativeScale>1.05&&body.radius>5&&body.phase.length>2){ctx.save();ctx.beginPath();ctx.moveTo(body.phase[0].x,body.phase[0].y);for(let i=1;i<body.phase.length;i++)ctx.lineTo(body.phase[i].x,body.phase[i].y);ctx.closePath();ctx.clip();ctx.globalAlpha*=.22;ctx.drawImage(assets.moon,body.point.x-body.radius,body.point.y-body.radius,body.radius*2,body.radius*2);ctx.restore();}}}
 if(assets?.alive){if(p.horizonFraming){ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,clamp(p.horizonY,0,h));ctx.lineTo(0,clamp(p.horizonY,0,h));ctx.closePath();ctx.clip();}for(const[x,y,cw,ch,speed,alpha]of CLOUDS){const drift=Math.sin(time*.012+speed)*w*.018+Math.sin(time*.003+speed*2)*w*.04;ctx.globalAlpha=a.cloud*alpha;ctx.drawImage(assets.cloud,x*w+drift,y*h+Math.sin(time*.008+speed)*3,cw*w,ch*h);}if(p.horizonFraming)ctx.restore();}
 // No technical grid. Direction labels are real, and guide labels remain optional.
 ctx.font=handwritingFont(w<500?17:20);ctx.textAlign='center';ctx.fillStyle='#f7f3df';ctx.globalAlpha=.86;let count=0;
 if(guides&&a.stars>.02)for(const label of p.labels){if(count++>=8)break;ctx.fillText(label.text,label.x,label.y);}
 for(const point of p.cardinals){if(point.hidden)continue;if(count++>=8)break;const labelX=clamp(point.x,56,w-56);if(Math.abs(point.y-point.anchorY)>22){ctx.globalAlpha=.25;ctx.lineWidth=.7;ctx.strokeStyle='#f7f3df';ctx.beginPath();ctx.moveTo(point.x,point.anchorY);ctx.lineTo(labelX,point.y+8);ctx.stroke();ctx.globalAlpha=.86;}ctx.fillText(`${point.label} · 지평선`,labelX,point.y);}
 ctx.globalAlpha=1;
}
