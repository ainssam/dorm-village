import {CONSTELLATIONS} from './time-of-day.js';
import {handwritingFont} from './font-ready.js';
// A bounded decorative sky, never an ephemeris. The world/walking sky stays independent.
export const SKY_BUDGET=Object.freeze({fps:24,pixels:1400000,dpr:1.5,textureSize:256,stars:150,clouds:7,textures:2});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f)=>Number.isFinite(v)?v:f;
export function skyBufferSize(width,height,dpr=1){const w=clamp(Math.round(finite(width,1)),1,4096),h=clamp(Math.round(finite(height,1)),1,4096),ratio=Math.min(SKY_BUDGET.dpr,Math.max(.1,finite(dpr,1)),Math.sqrt(SKY_BUDGET.pixels/(w*h)));return {width:w,height:h,dpr:ratio,pixelWidth:Math.max(1,Math.floor(w*ratio)),pixelHeight:Math.max(1,Math.floor(h*ratio))};}
const hash=(x,y=0)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy),a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}
function fbm(x,y){return noise(x,y)*.55+noise(x*2.07+13,y*2.07+4)*.28+noise(x*4.13+6,y*4.13+23)*.12+noise(x*8.4,y*8.4)*.05;}
const CRATERS=Array.from({length:19},(_,i)=>({x:(hash(i,7)-.5)*1.65,y:(hash(i,8)-.5)*1.65,r:.018+hash(i,9)*.085}));
/** Exactly two owned 256px RGBA assets; no downloads, GPU textures or render targets. */
export function createSkyAssets(createCanvas=()=>document.createElement('canvas')){
 const owned=[];try{
 const size=SKY_BUDGET.textureSize,make=paint=>{const canvas=createCanvas();owned.push(canvas);canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const rgba=paint((x+.5)/size,(y+.5)/size),i=(y*size+x)*4;for(let c=0;c<4;c++)image.data[i+c]=clamp(Math.round(rgba[c]),0,255);}ctx.putImageData(image,0,0);return canvas;};
 const cloud=make((u,v)=>{const x=(u-.5)*2,y=(v-.5)*2,n=fbm(u*5.7+3,v*6.2+2),ridge=Math.sin(x*2.8+.8)*.22,body=Math.exp(-(((y-ridge+(n-.5)*.48)/(.18+n*.20))**2))*Math.exp(-((Math.abs(x)/.86)**4)),fray=smooth(clamp((n-.20)*1.6,0,1)),shade=clamp((y+1)*.22+n*.24,0,.7);return [237-shade*25,239-shade*22,233-shade*15,body*fray*192];});
 const moon=make((u,v)=>{const x=(u-.5)*2,y=(v-.5)*2,r2=x*x+y*y;if(r2>=1)return[0,0,0,0];const z=Math.sqrt(1-r2),light=clamp(x*-.17-y*.28+z*.86,.10,1),grain=fbm(u*24+6,v*24+4),mare=Math.exp(-((x+.21)**2/.11+(y+.16)**2/.18))*.18+Math.exp(-((x-.28)**2/.13+(y-.26)**2/.06))*.15;let relief=0;for(const c of CRATERS){const r=Math.hypot(x-c.x,y-c.y)/c.r;if(r<1.4)relief+=Math.exp(-(((r-.92)/.16)**2))*.06-Math.exp(-((r/.78)**4))*.07;}const shade=.70+.28*light+(grain-.5)*.14-mare+relief;return [248*shade,244*shade,219*shade,clamp((1-Math.sqrt(r2))*size/2,0,1)*255];});
 let alive=true;return {cloud,moon,get alive(){return alive;},dispose(){if(!alive)return;alive=false;for(const c of owned)c.width=c.height=1;}};
 }catch(error){for(const c of owned)try{c.width=c.height=1;}catch{}throw error;}
}
const FIELD=Object.freeze(Array.from({length:SKY_BUDGET.stars-14},(_,i)=>({x:hash(i+33,4),y:hash(i+17,6)*.88,r:i%23===0?1.25:.38+hash(i,3)*.50,a:.24+hash(i,5)*.52,warm:i%8===0})));
const PALETTES={night:{top:'#101d30',middle:'#263f59',bottom:'#80929e',haze:'#b2adb0',cloud:.32,stars:1,moon:.96},evening:{top:'#565875',middle:'#9a8798',bottom:'#e9b899',haze:'#ffdcc3',cloud:.60,stars:.34,moon:.80},morning:{top:'#749bae',middle:'#b2c8d0',bottom:'#f2ddbf',haze:'#fff2d5',cloud:.80,stars:.04,moon:.55},day:{top:'#6597b8',middle:'#a5c8d9',bottom:'#e3e8dc',haze:'#fff3dc',cloud:.83,stars:0,moon:.40}};
export function skyLayout(width,height,offset={x:0,y:0}){
 const w=Math.max(1,width),h=Math.max(1,height),x=clamp(finite(offset.x,0),-1,1),y=clamp(finite(offset.y,0),-1,1),portrait=w/h<.85,shift={x:x*Math.min(28,w*.055),y:y*Math.min(18,h*.03)},safeTop=Math.min(112,h*.26),safeBottom=Math.min(195,h*.29),space=Math.max(80,h-safeTop-safeBottom);
 const areas=portrait?[{key:'dipper',x:.08*w,y:safeTop+.11*space,width:.60*w,height:.29*space},{key:'orion',x:.44*w,y:safeTop+.43*space,width:.40*w,height:.50*space}]:[{key:'dipper',x:.09*w,y:safeTop+.28*space,width:.31*w,height:.45*space},{key:'orion',x:.62*w,y:safeTop+.24*space,width:.19*w,height:.65*space}];
 const constellations=areas.map(a=>{const source=CONSTELLATIONS[a.key],maxX=Math.max(...source.stars.map(s=>s.x)),maxY=Math.max(...source.stars.map(s=>s.y)),scale=Math.min(a.width/maxX,a.height/maxY),points=source.stars.map(s=>({name:s.name,x:a.x+s.x*scale+shift.x,y:a.y+s.y*scale+shift.y}));return {key:a.key,label:source.label,edges:source.edges,points,labelX:a.x+maxX*scale*.5+shift.x,labelY:a.y+maxY*scale+22+shift.y};});
 return {shift,constellations,moon:{x:w*(portrait?.82:.49)+shift.x*.7,y:(portrait?safeTop+space*.36:Math.max(safeTop+32,h*.265))+shift.y*.7,r:clamp(Math.min(w,h)*.065,17,45)}};
}
function circle(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
/** Source drawing entrypoint, also used unchanged by the offline command recorder. */
export function drawSkyVista(ctx,{width:w,height:h,mood={id:'night'},time=0,offset={x:0,y:0},guides=false,assets}){
 const p=PALETTES[mood.id]??PALETTES.night,layout=skyLayout(w,h,offset),light=mood.id==='day'||mood.id==='morning',t=finite(time,0),bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,p.top);bg.addColorStop(.55,p.middle);bg.addColorStop(1,p.bottom);ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // Low, wide atmospheric light gives the sky depth without a panel or an animated flash.
 const haze=ctx.createRadialGradient(w*.32,h*1.13,0,w*.32,h*1.13,w*.85);haze.addColorStop(0,p.haze+'4a');haze.addColorStop(.58,p.haze+'0d');haze.addColorStop(1,p.haze+'00');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
 for(const star of FIELD){const x=star.x*w+layout.shift.x*.6,y=star.y*h+layout.shift.y*.6,alpha=star.a*p.stars;if(alpha<.01)continue;ctx.globalAlpha=alpha;circle(ctx,x,y,star.r,star.warm?'#efdbb6':'#d6e4eb');if(star.r>1){ctx.globalAlpha=alpha*.09;circle(ctx,x,y,star.r*4,'#c8ddf2');}}
 const m=layout.moon,halo=ctx.createRadialGradient(m.x,m.y,m.r*.65,m.x,m.y,m.r*3.8);halo.addColorStop(0,'#f8efd630');halo.addColorStop(.4,'#f5eacd09');halo.addColorStop(1,'#f5eacd00');ctx.globalAlpha=p.moon;ctx.fillStyle=halo;ctx.fillRect(m.x-m.r*3.8,m.y-m.r*3.8,m.r*7.6,m.r*7.6);if(assets?.alive)ctx.drawImage(assets.moon,m.x-m.r,m.y-m.r,m.r*2,m.r*2);
 for(const pattern of layout.constellations){if(guides){ctx.globalAlpha=mood.id==='night'?.32:.55;ctx.lineWidth=.85;ctx.strokeStyle=light?'#36556a':'#e0e8e4';ctx.beginPath();for(const[a,b]of pattern.edges){ctx.moveTo(pattern.points[a].x,pattern.points[a].y);ctx.lineTo(pattern.points[b].x,pattern.points[b].y);}ctx.stroke();}for(const [i,s]of pattern.points.entries()){ctx.globalAlpha=guides?.92:p.stars*.76;if(ctx.globalAlpha<.01)continue;circle(ctx,s.x,s.y,i%3===0?1.55:1.2,guides&&light?'#34536a':i===0?'#f6dab4':'#e3eced');ctx.globalAlpha*=.10;circle(ctx,s.x,s.y,4.2,'#d8e7ec');}if(guides){ctx.globalAlpha=.94;ctx.fillStyle=light?'#243e50':'#f7f3dd';ctx.font=handwritingFont(w<500?18:20);ctx.textAlign='center';ctx.fillText(pattern.label,pattern.labelX,pattern.labelY);}}
 // Seven bounded stamps, using one cached soft/noisy cloud texture. Drift is in CSS pixels/sec.
 const clouds=[[-.29,.15,.81,.13,.29,.60],[.63,.10,.64,.11,-.21,.32],[-.31,.49,.87,.20,.45,.65],[.66,.44,.76,.18,-.32,.45],[-.30,.70,1.15,.23,.62,.95],[.43,.75,.98,.18,-.46,.86],[.11,.92,1.08,.17,.34,.44]];
 if(assets?.alive)for(const[x,y,cw,ch,speed,alpha]of clouds){const drift=Math.sin(t*.012+speed)*w*.018+Math.sin(t*.003+speed*2)*w*.04;ctx.globalAlpha=p.cloud*alpha;ctx.drawImage(assets.cloud,x*w+drift+layout.shift.x*.34,y*h+Math.sin(t*.008+speed)*3+layout.shift.y*.22,cw*w,ch*h);}
 ctx.globalAlpha=1;
}
