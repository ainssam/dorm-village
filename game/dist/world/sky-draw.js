import {CONSTELLATIONS} from './time-of-day.js';
import {handwritingFont} from './font-ready.js';
export function skyMotifLayout(w,h,safeTop=0){const top=Math.min(Math.max(25,safeTop+18),h*.52),available=Math.max(0,h*.48-top),moonY=top+Math.max(17,Math.min(37,available*.36)),patterns=available>=105,scale=Math.min(w*.0027,1.15),moonRadius=Math.max(13,Math.min(25,w*.04)),clearBottom=Math.max(moonY+moonRadius+10,patterns?top+108*scale+12:0);return {top,moonY,moonRadius,patterns,scale,clearBottom,waterFade:[clearBottom/h,Math.min(.92,(clearBottom+Math.max(44,h*.12))/h)]};}
export function drawSky(ctx,{width:w,height:h,mood,safeTop=0}){
 ctx.clearRect(0,0,w,h);const gradient=ctx.createLinearGradient(0,0,0,h*.48);gradient.addColorStop(0,mood.skyTop);gradient.addColorStop(.63,mood.horizon);gradient.addColorStop(1,mood.water);ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h); // One opaque fill avoids a translucent fractional-pixel join at the waterline.
 const topSpace=Math.min(h*.38,300),layout=skyMotifLayout(w,h,safeTop),moonX=w*.51,moonY=layout.moonY,moonR=Math.max(13,Math.min(25,w*.04));
 if(mood.id==='night'){
  // Fixed, quiet sky motifs rather than a time/location-dependent astronomy simulation.
  for(let i=0;i<43;i++){const x=((i*137.508)%w),y=12+((i*43.19)%(topSpace-18));ctx.fillStyle=i%4?'#e0e8f2':'#fae6be';ctx.beginPath();ctx.arc(x,y,i%5===0?1.8:.9,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff1c5';ctx.beginPath();ctx.arc(moonX,moonY,moonR,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5d8b2';for(const [x,y,r]of[[-.28,.12,.15],[.31,-.24,.12],[.18,.4,.10]]){ctx.beginPath();ctx.arc(moonX+x*moonR,moonY+y*moonR,r*moonR,0,Math.PI*2);ctx.fill();}
  for(const [key,x,y,scale]of layout.patterns?[['dipper',w*.06,layout.top+8,layout.scale],['orion',w*.70,layout.top,layout.scale]]:[]){const c=CONSTELLATIONS[key];ctx.strokeStyle='#ccdaf199';ctx.lineWidth=1.15;for(const[a,b]of c.edges){ctx.beginPath();ctx.moveTo(x+c.stars[a].x*scale,y+c.stars[a].y*scale);ctx.lineTo(x+c.stars[b].x*scale,y+c.stars[b].y*scale);ctx.stroke();}for(const p of c.stars){ctx.fillStyle=p.name==='Betelgeuse'?'#ffd7af':'#f4f2dc';ctx.beginPath();ctx.arc(x+p.x*scale,y+p.y*scale,2.3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#f1eed9';ctx.font=handwritingFont(w<500?18:20);ctx.textAlign='center';ctx.fillText(c.label,x+(key==='dipper'?50:32)*scale,y+(key==='dipper'?72:108)*scale);}
 }else{
  ctx.fillStyle=mood.id==='evening'?'#ffd1a0':'#fff0bb';ctx.beginPath();ctx.arc(w*.70,layout.moonY,moonR*1.15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=mood.id==='evening'?'#eacfcbd0':'#f5f4e7ce';for(const [x,y,s]of [[.20,.50,1],[.84,.33,.7],[.44,.20,.6]]){for(const [dx,dy,r]of [[-.8,0,1],[0,-.25,1.2],[.9,0,.9]]){ctx.beginPath();ctx.ellipse(w*x+dx*23*s,topSpace*y+dy*15*s,31*s*r,12*s*r,0,0,Math.PI*2);ctx.fill();}}
 }
}

/** Disjoint CSS-pixel regions; camera pan and zoom cannot paint into skyRect. */
export function overviewScreenLayout({width,height,headerBottom=0,controlsTop=height}){
 const w=Math.max(1,width),h=Math.max(1,height),top=Math.max(0,Math.min(h-130,headerBottom+10)),bottom=Math.max(top+1,Math.min(h,controlsTop-8)),available=bottom-top,compact=available<310;
 const skyHeight=compact?Math.max(1,Math.min(64,Math.max(44,available-128),available*.42)):Math.min(190,available*.42),worldY=top+skyHeight;
 return {skyRect:{x:0,y:top,width:w,height:skyHeight},worldRect:{x:0,y:worldY,width:w,height:Math.max(1,bottom-worldY)},compact,headerBottom:top,controlsTop:bottom};
}
export function readOverviewScreenLayout(stage){
 const bounds=stage.getBoundingClientRect?.()??{left:0,top:0},rect=el=>el&&(!el.getClientRects||el.getClientRects().length)?el.getBoundingClientRect?.():null;
 const headers=[rect(stage.querySelector?.('.scene-tools')),rect(globalThis.document?.querySelector?.('.topbar'))].filter(Boolean),bottom=rect(stage.querySelector?.('.bottom-controls'));
 return overviewScreenLayout({width:stage.clientWidth,height:stage.clientHeight,headerBottom:Math.max(0,...headers.map(r=>r.bottom-bounds.top)),controlsTop:bottom?bottom.top-bounds.top:stage.clientHeight});
}
export function constellationPanelLayout(key,r){
 const c=CONSTELLATIONS[key],xs=c.stars.map(p=>p.x),ys=c.stars.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min((r.width-40)/(maxX-minX),(r.height-62)/(maxY-minY)),cx=r.x+r.width/2,cy=r.y+(r.height-46)/2;
 return {scale,labelX:cx,labelY:r.y+r.height-16,stars:c.stars.map(p=>({...p,x:cx+(p.x-(minX+maxX)/2)*scale,y:cy+(p.y-(minY+maxY)/2)*scale}))};
}
export function drawConstellationPanel(ctx,key,rect){
 const c=CONSTELLATIONS[key],p=constellationPanelLayout(key,rect);ctx.strokeStyle='#c4d6f0';ctx.lineWidth=1.6;for(const[a,b]of c.edges){ctx.beginPath();ctx.moveTo(p.stars[a].x,p.stars[a].y);ctx.lineTo(p.stars[b].x,p.stars[b].y);ctx.stroke();}
 for(const s of p.stars){ctx.fillStyle=s.name==='Betelgeuse'?'#ffd0a0':'#fff1cd';ctx.beginPath();ctx.arc(s.x,s.y,3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff4d9';ctx.font=handwritingFont(22);ctx.textAlign='center';ctx.fillText(c.label,p.labelX,p.labelY);
}
export function drawSkyBand(ctx,{width:w,height:h,mood,compact=false}){
 ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,mood.skyTop);g.addColorStop(1,mood.water);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 if(mood.id==='night'&&!compact){drawConstellationPanel(ctx,'dipper',{x:8,y:5,width:w*.38-8,height:h-10});drawConstellationPanel(ctx,'orion',{x:w*.62,y:5,width:w*.38-8,height:h-10});}
 ctx.fillStyle=mood.id==='night'?'#fff1c5':'#fff0bb';ctx.beginPath();ctx.arc(compact?w/2-128:w/2,compact?h/2:h*.38,compact?10:20,0,Math.PI*2);ctx.fill();
 if(compact){ctx.fillStyle=mood.id==='night'?'#fff4d9':'#253e46';ctx.font=handwritingFont(20);ctx.textAlign='center';ctx.fillText('별자리는 하늘 보기에서',w/2+12,h/2+7);}
}
