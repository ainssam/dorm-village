import {simplifyForestLine} from './forest-geometry.js';
import {pointInPolygon} from './path-union.js';

// The rear and unused west shoulder become one island. The eastern airport,
// harbor inlet, inner camp cove and southern fishing waterline retain exact samples.
const originals=new WeakMap();
export function forestCoastShore(source){
 const first=source.findIndex(([x,z])=>Math.abs(x+20.4)<1e-8&&Math.abs(z-28.7)<1e-8),last=source.findIndex(([x,z])=>Math.abs(x-41)<1e-8&&Math.abs(z+43)<1e-8);
 if(first<0||last<0)throw Error('Forest coast needs the approved connected island');
 const start=source[first],prior=source[first-1],end=source[last],next=source[last+1];
 const arcs=[
  [start.map((v,j)=>v+(v-prior[j])*1.4),[-24.4,24],[-25,18]],
  [[-25.6,12],[-24,6],[-24.2,0]],
  [[-24.4,-6],[-26,-14],[-25,-21]],
  [[-24,-28],[-23,-31],[-19,-34]],
  [[-15,-37],[-11,-38],[-6,-40]],
  [[-1,-42],[4,-44.5],[9,-46]],
  [[14,-47.5],[19,-49.2],[25,-49.3]],
  [[31,-49.4],[38,-48.3],[40,-46]],
  [[40.8,-45.08],end.map((v,j)=>v-(next[j]-v)*1.4),end]
 ];
 let a=start;const added=[start];for(const[b,c,d]of arcs){for(let i=1;i<=12;i++){const t=i/12,u=1-t;added.push(a.map((v,j)=>v*u*u*u+3*b[j]*u*u*t+3*c[j]*u*t*t+d[j]*t*t*t));}a=d;}
 const compact=simplifyForestLine(added),raw=[...compact.slice(0,-1),...source.slice(last,first)],north=raw.findIndex(p=>p[1]<-20),points=[...raw.slice(north),...raw.slice(0,north)],retained=new Map(source.map((p,i)=>[p.join(','),i]));
 // Keep north-first winding: the existing campsite consumes the filtered south arc.
 originals.set(points,{source,retained,newIndices:points.map((p,i)=>retained.has(p.join(','))?-1:i).filter(i=>i>=0)});return points;
}
export function forestCoastOutline(points,scale){
 const data=originals.get(points);if(!data)throw Error('Unregistered forest coast');
 return points.map(([x,z],i)=>{
  const old=data.retained.get([x,z].join(','));
  if(scale===1)return[x,z];
  if(old!==undefined){if(old<20||old>=91)return[x*scale,z*scale];const a=data.source[old-1],b=data.source[(old+1)%data.source.length],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz),d=scale>1?.60:0;return[x+dz/n*d,z-dx/n*d];}
  const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz),d=scale>1?.60:0;return[x+dz/n*d,z-dx/n*d];
 });
}
export function forestCoastFoam(points,previous){
 const data=originals.get(points),kept=previous.filter(p=>!pointInPolygon(points,[p.x,p.z]));
 const added=[];for(const i of data.newIndices.filter((_,j)=>j%5===0)){const p=points[i],a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz);added.push({region:'forest',offset:i,x:p[0]+dz/n*.67,z:p[1]-dx/n*.67,yaw:Math.atan2(-dz,dx)});}
 return Object.freeze([...kept,...added]);
}
const smooth=points=>{const out=[];for(let i=0;i<points.length-1;i++)for(let k=0;k<8;k++){const t=k/8,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];out.push([0,1].map(j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t*t+(-a[j]+3*b[j]-3*c[j]+d[j])*t*t*t)));}return[...out,points.at(-1)];};
export const FOREST_STAGE=Object.freeze({x:-7,z:-23,radius:3.25,top:.05,front:-23});
export const FOREST_PATHS=Object.freeze([
 {id:'forest-approach',width:1.8,points:smooth([[-10,-1.7],[-10.45,-4.2],[-11.6,-7.4],[-12.1,-10],[-12,-13.3],[-10,-15.4],[-6.5,-14],[-2.8,-15],[-1,-19],[-1.8,-25],[-5,-28],[-11.6,-27.6],[-14,-23],[-12.5,-17],[-6.5,-14],[-2.8,-15]])},
 {id:'forest-stage-access',width:1.8,points:smooth([[-13.9,-23],[-11.7,-22.6],[-9.8,-22.1],[-7,-22]])},
 {id:'forest-airfield-meadow',width:1.65,points:smooth([[-1.8,-25],[3,-29],[9,-30],[14,-28],[16.3,-25],[16.6,-22.5],[17.5,-16.5],[18,-14.6],[21.5,-14.6]])},
 {id:'coast-west-walk',width:1.65,points:smooth([[-9,3],[-11,1.7],[-14.8,1.5],[-18.4,3.4],[-20,8.8],[-20.4,12.2],[-22.5,17],[-22.6,21],[-20.3,24.2]])}
]);
export const FOREST_TREES=Object.freeze([
 [-16.7,-15.2,1.2],[-19.3,-20.4,1.28],[-16.4,-26.8,1.35],[-19,-29.9,1.12],[-13.8,-32,1.4],[-9.1,-32.4,1.35],[-3.7,-32.5,1.22],
 [-12,-29.9,1.08],[-7.5,-29.8,1.10],[-2.2,-29.2,.95],[-17.5,-24,1.14],[-16.6,-18.9,1.15],[-10.3,-12.9,.9],[-15,-11.4,1.05],
 [1.9,-22.8,1.15],[2,-17.2,.9],[5,-26,1.03],[8,-34.3,1.1],[.1,-37.4,1.16],[-10,-36.2,1.06],[15,-37.8,1.0],
 [-21.4,3.1,.92],[-21.7,8.3,1.0],[-23.4,-8,1.07]
].filter((_,i)=>[0,1,2,4,5,7,8,10,11,14,17,18,21,22].includes(i)).map(([x,z,scale],i)=>Object.freeze({id:'forest.tree.'+i,x,z,scale,hx:.25*scale,hz:.25*scale})));
export const FOREST_SEATS=Object.freeze([[-10,-19],[-7,-17.1],[-4,-19]].map(([x,z],i)=>{
 const yaw=Math.atan2(FOREST_STAGE.x-x,FOREST_STAGE.z-z),at={x:x+Math.sin(yaw)*1.65,z:z+Math.cos(yaw)*1.65};
 return Object.freeze({id:'courtyard.forest.bench.'+i,roomId:'courtyard',type:'pose',kind:'sit',seating:true,seatTop:.56,seatContact:.14111661911010742,fixture:{x,z,yaw},anchor:{x:x+Math.sin(yaw)*.12,y:.56-.14111661911010742,z:z+Math.cos(yaw)*.12,yaw},at,exit:{...at,yaw},radius:.72,requiresClearApproach:true,enterDuration:1.25,label:'숲속 벤치에 앉기',leaveLabel:'숲속 벤치에서 일어나기',text:'나무 그늘 아래 작은 무대를 바라보며 쉬어요. 바람이 지나가는 조용한 자리예요.'});
}));
export const FOREST_LIGHT_POSTS=Object.freeze([[-10.7,-25.6],[-3.3,-25.6],[-12,-21.4],[-2,-21.4]].map(([x,z],i)=>({id:'forest.light-post.'+i,x,z,hx:.065,hz:.065})));
export const FOREST_OBSTACLES=Object.freeze([...FOREST_TREES,...FOREST_LIGHT_POSTS,...FOREST_SEATS.map(s=>({id:s.id,...s.fixture,hx:1.13,hz:.425}))]);
