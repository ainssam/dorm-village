// Only replace the southwest arc of the canonical island. All other source
// points and every wholly outside edge remain exact, including fishing and shells.
const inCove=([x,z])=>x>-23&&x< -6&&z>5;
export function campsiteShore(points){
 const first=points.findIndex(inCove),last=points.findLastIndex(inCove);
 if(first<0)return points.map(p=>[...p]);
 const n=points.length,start=points[(first+n-1)%n],prior=points[(first+n-2)%n],end=points[(last+1)%n],next=points[(last+2)%n];
 // Matched handles make both shoulders and the broad south tip continuous.
 // The small westward swell leaves the tent/chair perimeter fully walkable.
 const arcs=[
  [start.map((v,j)=>v+(v-prior[j])*1.5),[-7.7,17.2],[-6.9,20.8]],
  [[-6.1,24.4],[-6.2,27.5],[-7.4,31]],
  [[-8.6,34.5],[-10.1,36.3],[-13.6,36.1]],
  [[-17.1,35.9],[-20,32.6],[-20.4,28.7]],
  [[-20.8,24.8],[-21.8,21.3],[-20.7,17.2]],
  [[-19.6,13.1],end.map((v,j)=>v-(next[j]-v)*.8),end]
 ];
 const cove=[];let a=start;
 for(const [i,[b,c,d]]of arcs.entries()){
  const steps=i===0?12:6; // Resolve the concave shoreline join without a pointed shoulder.
  for(let k=1;k<=steps;k++){const t=k/steps,u=1-t;cove.push(a.map((v,j)=>v*u*u*u+3*b[j]*u*u*t+3*c[j]*u*t*t+d[j]*t*t*t));}
  a=d;
 }
 return [...points.slice(0,first).map(p=>[...p]),...cove.slice(0,-1),...points.slice(last+1).map(p=>[...p])];
}
