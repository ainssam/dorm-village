import{BAKERY as B,FIXTURES,TREADS,doorwayContract as D}from'./layout.js';const EPS=1e-7;
const hit=(x,z,r,b)=>{const dx=Math.max(b.minX-x,0,x-b.maxX),dz=Math.max(b.minZ-z,0,z-b.maxZ);return dx*dx+dz*dz<r*r-EPS;};
const lane=(x,f,r)=>x>=f.minX+r-EPS&&x<=f.maxX-r+EPS;
export function supportAt(x,z,surface='floor1',flight){
 if(surface==='stair'){
  flight=flight??(x<6.3?0:1);if(flight===0&&z>=4.5)return{surface:'floor1',supportY:.05,tread:-1};if(flight===1&&z>=4.5)return{surface:'floor2',supportY:3.25,tread:-1};if(z<=-4.5)return{surface:'landing',supportY:1.65,tread:-1};
  const local=Math.max(0,Math.min(9,Math.floor(((flight===0?4.5-z:z+4.5)-EPS)/.9))),tread=flight*10+local;return{surface:'stair',flight,supportY:TREADS[tread].topY,tread};
 }
 return{surface,supportY:surface==='floor2'?3.25:surface==='landing'?1.65:.05,tread:-1};
}
export function createSupport(x=B.spawn.x,z=B.spawn.z,surface='floor1'){return{x,z,...supportAt(x,z,surface)};}
const rails=B.stair.flights.flatMap(f=>[{minX:f.minX-.12,maxX:f.minX,minZ:-4.56,maxZ:4.56},{minX:f.maxX,maxX:f.maxX+.12,minZ:-4.56,maxZ:4.56}]);
export function canOccupy(p,r=.61,{circles=[],allowDoorOpening=true}={}){
 if(!['floor1','floor2','stair','landing'].includes(p.surface)||![p.x,p.z,p.supportY,r].every(Number.isFinite)||r<=0)return false;
 const{x,z}=p,b=B.bounds,[lower,upper]=B.stair.flights;
 const inDoor=p.surface==='floor1'&&Math.abs(p.supportY-B.floor1Y)<=EPS&&Math.abs(x-D.at.x)+r<=D.width/2+EPS;
 // Only the real door aperture omits the front wall thickness. Floor support stays radius-bounded.
 let frontLimit=b.maxZ-r-(inDoor&&allowDoorOpening!==false?0:.09);
 // Pose owners disable the opening while airborne; retain a strictly inside point for a later true crossing.
 if(inDoor&&allowDoorOpening===false)frontLimit=Math.min(frontLimit,D.at.z-.0001);
 if(x<b.minX+r+.09||x>b.maxX-r-.09||z<b.minZ+r+.09||z>frontLimit)return false;
 if(p.surface==='stair'){const f=B.stair.flights[p.flight??(x<6.3?0:1)];if(!lane(x,f,r)||z< -4.5-EPS||z>4.5+EPS)return false;}
 else if(p.surface==='landing'){
  const head=lane(x,lower,r)||lane(x,upper,r);if(x<B.turnLanding.minX+r||x>B.turnLanding.maxX-r||z< -6.68+r||z>(head?-4.5:-4.5-r)+EPS)return false;
 }else if(p.surface==='floor1'){
  if(hit(x,z,r,{minX:3.54,maxX:9.06,minZ:-6.8,maxZ:4.56})&&!(z>=4.5&&lane(x,lower,r)))return false;
 }else{
  const head=lane(x,upper,r)&&z>=4.5-EPS;if(hit(x,z,r,B.opening)&&!head)return false;if(hit(x,z,r,{minX:3.49,maxX:3.61,minZ:-6.8,maxZ:4.56})||hit(x,z,r,{minX:3.49,maxX:6.71,minZ:4.44,maxZ:4.56}))return false;
 }
 if(rails.some(o=>hit(x,z,r,o)))return false;
 if(['floor1','floor2'].includes(p.surface)&&FIXTURES.some(o=>o.floor===p.surface&&hit(x,z,r,{minX:o.x-o.hx,maxX:o.x+o.hx,minZ:o.z-o.hz,maxZ:o.z+o.hz})))return false;
 if(circles.some(o=>Math.abs((o.supportY??.05)-p.supportY)<B.avatarHeight&&Math.hypot(x-o.x,z-o.z)<r+o.radius))return false;return true;
}
function candidate(p,x,z,r,world){let surface=p.surface,flight=p.flight;const[lower,upper]=B.stair.flights;
 if(surface==='floor1'&&p.z>=4.5-EPS&&z<4.5&&lane(x,lower,r)){surface='stair';flight=0;}
 if(surface==='floor2'&&p.z>=4.5-EPS&&z<4.5&&lane(x,upper,r)){surface='stair';flight=1;}
 if(surface==='landing'&&z>-4.5){if(lane(x,lower,r)){surface='stair';flight=0;}else if(lane(x,upper,r)){surface='stair';flight=1;}}
 const q={x,z,...supportAt(x,z,surface,flight)};return Math.abs(q.supportY-p.supportY)<=B.stair.maxRise+EPS&&canOccupy(q,r,world)?q:null;
}
/** Exact tread support, microstepped from live input; never a stair teleport or automatic path. */
export function moveSupported(position,dx,dz,r=.61,world={}){if(![dx,dz].every(Number.isFinite)||Math.hypot(dx,dz)>50)return{...position};let p={...position};const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));for(let i=0;i<n;i++){const q=candidate(p,p.x+dx/n,p.z+dz/n,r,world);if(q){p=q;continue;}p=candidate(p,p.x+dx/n,p.z,r,world)??p;p=candidate(p,p.x,p.z+dz/n,r,world)??p;}return p;}
export function interactionEligible(p,t){return['floor1','floor2'].includes(p.surface)&&p.surface===(t.floor??'floor1')&&Math.abs(p.supportY-(t.floorY??.05))<.2;}
export function floorExit(t){const y=t.floor==='floor2'?3.25:.05;return{...t.exit,y,supportY:y,surface:t.floor??'floor1',tread:-1};}
