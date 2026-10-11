/** Authored harbor coordinates stay full-size inside one rigid island frame. */
export const HARBOR_FRAME=Object.freeze({x:34,y:0,z:9.5,yaw:-Math.PI/2});
export function harborWorldPoint(p){const t=HARBOR_FRAME,c=Math.cos(t.yaw),s=Math.sin(t.yaw);return{...p,x:t.x+p.x*c+p.z*s,y:t.y+(p.y??.05),z:t.z-p.x*s+p.z*c,...(p.yaw===undefined?{}:{yaw:p.yaw+t.yaw})};}
export const HARBOR_WALK=Object.freeze([[11.383438729865953,5.349045702828569],[14.5,6.3],[14.5,8.7],[15.3,9.4],[18.4,9.4],[21.5,7],[23.4,9.5],[26.2,9.5],[28.8,9.5]].map(p=>Object.freeze(p)));
export function connectedHarborShore(points){
 const start=points[32],prior=points[31],end=points[40],next=points[41];
 if(Math.abs(start[0]-21.704)>1e-7||Math.abs(end[1]-12)>1e-7)throw Error('Harbor shoreline source changed');
 const arcs=[[start.map((v,j)=>v+(v-prior[j])*1.5),[23.8,3.8],[26,4.8]],[[28.2,5.8],[30,5],[30,9.5]],[[30,14],[27,15],[24.5,14.3]],[[22,13.6],[20.5,13.8],[19,12]],[[17.5,10.2],end.map((v,j)=>v-(next[j]-v)*1.5),end]];
 let a=start;const shore=[];for(const[b,c,d]of arcs){for(let i=1;i<=12;i++){const t=i/12,u=1-t;shore.push(a.map((v,j)=>v*u*u*u+3*b[j]*u*u*t+3*c[j]*u*t*t+d[j]*t*t*t));}a=d;}
 return[...points.slice(0,33).map(p=>[...p]),...shore.slice(0,-1),...points.slice(40).map(p=>[...p])];
}
export function harborWorldBox(box){const p=harborWorldPoint(box);return{...p,hx:box.hx,hz:box.hz,yaw:(box.yaw??0)+HARBOR_FRAME.yaw};}
/** The original airport remains unit scale, with all flight coordinates local. */
export const AIRPORT_FRAME=Object.freeze({x:32,y:0,z:-26,yaw:0});
export function airportWorldPoint(p){const t=AIRPORT_FRAME,c=Math.cos(t.yaw),s=Math.sin(t.yaw);return{...p,x:t.x+p.x*c+p.z*s,y:t.y+(p.y??.05),z:t.z-p.x*s+p.z*c,...(p.yaw===undefined?{}:{yaw:p.yaw+t.yaw})};}
export function airportWorldBox(box){const p=airportWorldPoint(box);return{...p,hx:box.hx,hz:box.hz,yaw:(box.yaw??0)+AIRPORT_FRAME.yaw};}
// The east-side fork keeps the existing studio and tree crowns out of the walk view.
export const AIRPORT_WALK=Object.freeze([[21.5,7],[22,3],[21.8,0],[21.5,-4],[21.5,-8],[21.5,-13.4],[21.5,-20],[22,-18.75]].map(p=>Object.freeze(p)));
export function connectedMainIslandShore(points){
 const start=points[19],prior=points[18],end=points[40],next=points[41];
 if(Math.abs(start[0]-11.24)>1e-7||Math.abs(end[1]-12)>1e-7)throw Error('Main-island shoreline source changed');
 const arcs=[[start.map((v,j)=>v+(v-prior[j])*1.5),[15.9,-11.9],[16,-17]],[[16.1,-22.1],[15.2,-36],[16,-43]],[[16.8,-50],[39,-48],[41,-43]],[[43,-38],[42.5,-13],[41,-8]],[[39.5,-3],[29,-4],[25.2,-.5]],[[23.4,1.075],[23.8,3.8],[26,4.8]],[[28.2,5.8],[30,5],[30,9.5]],[[30,14],[27,15],[24.5,14.3]],[[22,13.6],[20.5,13.8],[19,12]],[[17.5,10.2],end.map((v,j)=>v-(next[j]-v)*1.5),end]];
 let a=start;const shore=[];for(const[b,c,d]of arcs){for(let i=1;i<=12;i++){const t=i/12,u=1-t;shore.push(a.map((v,j)=>v*u*u*u+3*b[j]*u*u*t+3*c[j]*u*t*t+d[j]*t*t*t));}a=d;}
 return[...points.slice(0,20).map(p=>[...p]),...shore.slice(0,-1),...points.slice(40).map(p=>[...p])];
}

/** Stable pre-expansion samples keep old coast decorations from shifting when an arc gains vertices. */
export function connectedHarborFoam(source,shore=connectedHarborShore(source)){
 const frame=(p,next,meta)=>Object.freeze({...meta,x:p[0]*1.05,z:p[1]*1.05,yaw:Math.atan2(-(next[1]-p[1]),next[0]-p[0])});
 const samples=[];for(let i=0;i<source.length;i+=5)if(i<=32||i>=40)samples.push(frame(source[i],source[(i+1)%source.length],{region:'original',sourceIndex:i}));
 for(let offset=5;offset<60;offset+=5)samples.push(frame(shore[32+offset],shore[33+offset],{region:'harbor',arc:Math.floor((offset-1)/12),offset}));
 return Object.freeze(samples);
}

/** Only the airport/north-join samples are new; every retained coast transform stays exact. */
export function connectedMainIslandFoam(source,shore=connectedMainIslandShore(source)){
 const kept=connectedHarborFoam(source).filter(p=>p.region==='harbor'?p.arc>=1:p.sourceIndex<20||p.sourceIndex>=40);
 const added=[];for(let offset=5;offset<=70;offset+=5){const i=19+offset,p=shore[i],prev=shore[i-1],next=shore[i+1],dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz);added.push(Object.freeze({region:'airfield',arc:Math.floor((offset-1)/12),offset,x:p[0]+dz/len*.60,z:p[1]-dx/len*.60,yaw:Math.atan2(-(next[1]-p[1]),next[0]-p[0])}));}
 return Object.freeze([...kept,...added]);
}
