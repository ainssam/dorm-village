import {canMove,RADIUS} from '../physics.js';
export function squareSegmentClear(world,a,b,radius=.75){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.035));for(let i=0;i<=n;i++)if(!canMove(world,a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,radius))return false;return true;}
// Bounded local A*, exact endpoints and every returned segment checked at full radius.
export function planSquareRoute(world,start,goal,radius=.75){
 if(!canMove(world,start.x,start.z,radius)||!canMove(world,goal.x,goal.z,radius))return null;
 const point=p=>({x:p.x,z:p.z});if(squareSegmentClear(world,start,goal,radius))return[point(start),point(goal)];
 const step=.22,b=world.bounds,minX=Math.max(b.minX,Math.min(start.x,goal.x)-3),maxX=Math.min(b.maxX,Math.max(start.x,goal.x)+3),minZ=Math.max(b.minZ,Math.min(start.z,goal.z)-3),maxZ=Math.min(b.maxZ,Math.max(start.z,goal.z)+3),nx=Math.ceil((maxX-minX)/step)+1,nz=Math.ceil((maxZ-minZ)/step)+1;
 const nodes=new Map(),open=[],visited=new Set(),key=(x,z)=>z*nx+x,pos=(x,z)=>({x:minX+x*step,z:minZ+z*step}),heur=p=>Math.hypot(p.x-goal.x,p.z-goal.z);
 const sx=Math.round((start.x-minX)/step),sz=Math.round((start.z-minZ)/step);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=sx+dx,z=sz+dz,p=pos(x,z);if(x<0||z<0||x>=nx||z>=nz||!squareSegmentClear(world,start,p,radius))continue;const n={x,z,p,g:Math.hypot(p.x-start.x,p.z-start.z),parent:null};n.f=n.g+heur(p);nodes.set(key(x,z),n);open.push(n);}
 let found;while(open.length&&visited.size<5000){open.sort((a,b)=>a.f-b.f);const n=open.shift(),k=key(n.x,n.z);if(visited.has(k))continue;visited.add(k);if(heur(n.p)<step*1.8&&squareSegmentClear(world,n.p,goal,radius)){found=n;break;}for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k2=key(x,z);if(x<0||z<0||x>=nx||z>=nz||visited.has(k2))continue;const p=pos(x,z);if(!squareSegmentClear(world,n.p,p,radius))continue;const g=n.g+step*Math.hypot(dx,dz);if(nodes.has(k2)&&nodes.get(k2).g<=g)continue;const next={x,z,p,g,f:g+heur(p),parent:n};nodes.set(k2,next);open.push(next);}}
 if(!found)return null;const path=[point(goal)];for(let n=found;n;n=n.parent)path.push(n.p);path.push(point(start));path.reverse();const smooth=[path[0]];for(let i=0;i<path.length-1;){let j=path.length-1;while(j>i+1&&!squareSegmentClear(world,path[i],path[j],radius))j--;smooth.push(path[j]);i=j;}return smooth;
}
export function chooseSquareBay(world,desired,occupied,radius=.75){const w={...world,circles:[...(world.circles??[]),...occupied]};if(canMove(w,desired.x,desired.z,radius))return{x:desired.x,z:desired.z};for(let ring=1;ring<=5;ring++)for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={x:desired.x+Math.cos(angle)*ring*.35,z:desired.z+Math.sin(angle)*ring*.35};if(canMove(w,p.x,p.z,radius))return p;}return null;}

// Dormi may arrive at a fixture using the ordinary .61 walking body. Before
// using the roomier .75 gathering route, visibly step out of that margin.
// Only this bounded first segment uses the walking radius; guests never do.
export function planSquareDeparture(world,start,goal){
 if(canMove(world,start.x,start.z,.75))return planSquareRoute(world,start,goal,.75);
 if(!canMove(world,start.x,start.z,RADIUS))return null;
 const candidates=[];
 for(const distance of [.18,.30,.45,.60])for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,p={x:start.x+Math.cos(angle)*distance,z:start.z+Math.sin(angle)*distance};
  if(canMove(world,p.x,p.z,.75)&&squareSegmentClear(world,start,p,RADIUS))candidates.push({p,distance,score:distance+Math.hypot(goal.x-p.x,goal.z-p.z)});
 }
 candidates.sort((a,b)=>a.score-b.score);
 for(const {p} of candidates){const onward=planSquareRoute(world,p,goal,.75);if(onward)return[{x:start.x,z:start.z},{...p,radius:RADIUS},...onward.slice(1)];}
 return null;
}
