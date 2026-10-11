import {BUMPER as C,BUMPER_ACTIVITY} from './bumper-layout.js';
import {bumperWalkY,bumperPoseBottom,bumperOutwardWalkY} from './bumper-support.js';
export {BUMPER,BUMPER_ACTIVITY} from './bumper-layout.js';
const STEP=1/120,EPS=1e-9,R=2*C.radius,X=C.halfX-C.radius,Z=C.halfZ-C.radius;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function bumperClearSegment(ax,az,bx,bz){if(Math.abs(ax)>X+EPS||Math.abs(bx)>X+EPS||Math.abs(az)>Z+EPS||Math.abs(bz)>Z+EPS)return false;const dx=bx-ax,dz=bz-az,q=dx*dx+dz*dz,t=q?clamp(((C.parked.x-ax)*dx+(C.parked.z-az)*dz)/q,0,1):0;return Math.hypot(ax+dx*t-C.parked.x,az+dz*t-C.parked.z)>=R-1e-8;}
// Transition-only visibility graph. The circumscribed ring clears the actual
// circular bumper by .08; all segment edges are checked analytically, not meshes.
const ring=[];for(let i=0;i<128;i++){const a=i*Math.PI/64,x=C.parked.x+(R+.08)*Math.cos(a),z=C.parked.z+(R+.08)*Math.sin(a);if(Math.abs(x)<=X&&Math.abs(z)<=Z)ring.push({x,z});}
export function bumperDockPath(x,z){const nodes=[{x,z},...ring,{...C.dock}],n=nodes.length,dist=new Float64Array(n).fill(Infinity),previous=new Int16Array(n).fill(-1),visited=new Uint8Array(n);dist[0]=0;
 for(let k=0;k<n;k++){let u=-1;for(let i=0;i<n;i++)if(!visited[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u]))break;if(u===n-1){const result=[];for(let i=u;i>0;i=previous[i])result.push(nodes[i]);return result.reverse();}visited[u]=1;for(let v=1;v<n;v++){if(visited[v]||!bumperClearSegment(nodes[u].x,nodes[u].z,nodes[v].x,nodes[v].z))continue;const cost=dist[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].z-nodes[v].z);if(cost<dist[v]){dist[v]=cost;previous[v]=u;}}}return null;
}
export function bumperBoardFrame(from,time,out={}){const t=clamp(time,0,C.mountDuration),ramp=1-ease((t-C.boardDuration)/C.rampDuration);out.x=C.dock.x;out.y=C.rootY;out.z=C.dock.z;out.yaw=out.pitch=out.roll=0;out.pose=1;out.carX=C.dock.x;out.carZ=C.dock.z;out.carYaw=0;out.bumperRamp=ramp;
 if(t<.8){const q=ease(t/.8);out.x=from.x+(C.dock.x-from.x)*q;out.y=(from.y??.05)+(.05-(from.y??.05))*q;out.z=from.z+(C.dock.z+3.05-from.z)*q;out.yaw=from.yaw+delta(from.yaw,Math.PI)*q;out.pose=0;}
 else if(t<2.8){const z=3.05-2.3*ease((t-.8)/2);out.y=bumperWalkY(z);out.z=C.dock.z+z;out.yaw=Math.PI;out.pose=0;}
 else if(t<3.6){out.y=C.seatTop;out.z=C.dock.z+.75;out.yaw=Math.PI*(1-ease((t-2.8)/.8));out.pose=0;}
 else if(t<4.4){out.pose=ease((t-3.6)/.8);out.y=C.seatTop-bumperPoseBottom(out.pose);out.z=C.dock.z+.75;}
 else if(t<5.4)out.z=C.dock.z+.75*(1-ease(t-4.4));
 return out;
}
// Normal exit faces outward; only an interrupted boarding path is reversed.
export function bumperExitFrame(time){const t=clamp(time,0,C.mountDuration),p={x:C.dock.x,y:C.rootY,z:C.dock.z,yaw:0,pitch:0,roll:0,pose:1,carX:C.dock.x,carZ:C.dock.z,carYaw:0,bumperRamp:ease(t/.3),walk:0,walkTime:0};if(t<.3)return p;if(t<1.3)return {...p,z:C.dock.z+.75*ease(t-.3)};if(t<2.1){const pose=1-ease((t-1.3)/.8);return {...p,z:C.dock.z+.75,y:C.seatTop-bumperPoseBottom(pose),pose};}const q=(t-2.1)/(C.mountDuration-2.1),progress=ease(q),z=.75+2.6*progress,walk=.25*ease(q/.12)*ease((1-q)/.12),walkTime=2.6*progress*1.5,stride=walk*Math.sin(Math.floor(walkTime*20)/20*8);return {...p,z:C.dock.z+z,y:bumperOutwardWalkY(z,stride),pose:0,walk,walkTime};}
/** ActivitySession is the only time/actor owner. No RAF, listener, timer or mesh lookup. */
export class BumperRide{
 constructor(activity,from){this.activity={...activity,exit:{...activity.exit}};this.from={...from};this.phase='entering';this.elapsed=0;this.activeTime=0;this.x=C.dock.x;this.z=C.dock.z;this.yaw=0;this.speed=0;this.throttle=0;this.steer=0;this.accumulator=0;this.paused=false;this.exitRequested=false;this.done=false;this.dismount=false;this.reverseTime=null;this.path=null;this.pathIndex=0;this.frame={};this.returnFrom={...this.activity.exit,y:.05};}
 setReduced(){} // User-commanded slow driving is unchanged by reduced motion.
 setIntent(throttle=0,steer=0){this.throttle=this.paused||this.exitRequested||this.phase!=='active'?0:clamp(Number.isFinite(throttle)?throttle:0,-1,1);this.steer=this.paused||this.exitRequested||this.phase!=='active'?0:clamp(Number.isFinite(steer)?steer:0,-1,1);}
 pause(){this.paused=true;this.throttle=this.steer=this.speed=this.accumulator=0;}
 resume(){if(!this.done)this.paused=false;}
 requestExit(){if(this.exitRequested||this.done)return false;this.exitRequested=true;this.throttle=this.steer=this.speed=this.accumulator=0;if(this.phase==='entering'){this.reverseTime=this.elapsed;this.activity.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};this.dismount=true;}else{this.path=bumperDockPath(this.x,this.z);if(!this.path){this.exitRequested=false;this.pause();return false;}}this.phase='exiting';this.elapsed=0;return true;}
 update(dt){if(this.done||this.paused||!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,.1);while(this.accumulator>=STEP-1e-10){this.accumulator=Math.max(0,this.accumulator-STEP);this.advance(STEP);if(this.done)break;}}
 advance(dt){if(!Number.isFinite(this.x+this.z+this.speed+this.yaw)){this.x=C.dock.x;this.z=C.dock.z;this.yaw=0;this.pause();return;}if(Math.abs(this.x)>X+EPS||Math.abs(this.z)>Z+EPS||Math.hypot(this.x-C.parked.x,this.z-C.parked.z)<R-1e-7){this.x=C.parked.x+R;this.z=C.parked.z;this.pause();return;}this.elapsed+=dt;if(this.phase==='entering'){if(this.elapsed>=C.mountDuration-EPS){this.elapsed=0;this.phase='active';}return;}
 if(this.dismount){if(this.elapsed>=Math.max(STEP,this.reverseTime??C.mountDuration)-EPS){this.done=true;this.phase='idle';}return;}
 if(this.phase==='exiting'){this.dock(dt);return;}
 this.activeTime+=dt;this.yaw=delta(0,this.yaw+this.steer*C.turnSpeed*dt);
 const opposite=this.speed*this.throttle<0,target=this.throttle===0||opposite?0:this.throttle>0?C.maxSpeed*this.throttle:C.reverseSpeed*this.throttle,rate=this.throttle===0||opposite?C.brake:C.acceleration,change=clamp(target-this.speed,-rate*dt,rate*dt);this.speed+=change;if(Math.abs(this.speed)<1e-12)this.speed=0;
 this.move(Math.sin(this.yaw)*this.speed*dt,Math.cos(this.yaw)*this.speed*dt);
 }
 move(dx,dz){for(let pass=0;pass<3&&Math.abs(dx)+Math.abs(dz)>1e-12;pass++){let t=1,nx=0,nz=0;let q;if(dx>0){q=(X-this.x)/dx;if(q>=-EPS&&q<t){t=Math.max(0,q);nx=-1;}}else if(dx<0){q=(-X-this.x)/dx;if(q>=-EPS&&q<t){t=Math.max(0,q);nx=1;}}if(dz>0){q=(Z-this.z)/dz;if(q>=-EPS&&q<t){t=Math.max(0,q);nx=0;nz=-1;}}else if(dz<0){q=(-Z-this.z)/dz;if(q>=-EPS&&q<t){t=Math.max(0,q);nx=0;nz=1;}}
 const ox=this.x-C.parked.x,oz=this.z-C.parked.z,a=dx*dx+dz*dz,b=ox*dx+oz*dz,c=ox*ox+oz*oz-R*R,disc=b*b-a*c;
 if(a>0&&b<0&&disc>=0){const q=(-b-Math.sqrt(disc))/a;if(q>=-1e-7&&q<t){t=Math.max(0,q);const px=ox+dx*t,pz=oz+dz*t,len=Math.hypot(px,pz)||1;nx=px/len;nz=pz/len;}}
 this.x=clamp(this.x+dx*t,-X,X);this.z=clamp(this.z+dz*t,-Z,Z);if(t===1)return;this.speed=0;dx*=1-t;dz*=1-t;const inward=Math.min(0,dx*nx+dz*nz);dx-=inward*nx;dz-=inward*nz;
 }}
 dock(dt){if(this.pathIndex>=this.path.length){const turn=delta(this.yaw,C.dock.yaw);this.yaw+=clamp(turn,-dt,dt);if(Math.abs(turn)<=dt){this.yaw=C.dock.yaw;this.dismount=true;this.elapsed=0;}return;}const p=this.path[this.pathIndex],dx=p.x-this.x,dz=p.z-this.z,d=Math.hypot(dx,dz);if(d<1e-7){this.pathIndex++;return;}const goal=Math.atan2(dx,dz),turn=delta(this.yaw,goal);this.yaw+=clamp(turn,-dt,dt);if(Math.abs(turn)>.02)return;const amount=Math.min(d,.70*dt);this.x+=dx/d*amount;this.z+=dz/d*amount;if(amount===d){this.x=p.x;this.z=p.z;this.pathIndex++;}}
 sample(){if(this.phase==='entering')return bumperBoardFrame(this.from,this.elapsed,this.frame);if(this.dismount)return this.reverseTime!==null?bumperBoardFrame(this.from,Math.max(0,this.reverseTime-this.elapsed),this.frame):bumperExitFrame(this.elapsed);const f=this.frame;f.x=f.carX=this.x;f.y=C.rootY;f.z=f.carZ=this.z;f.yaw=f.carYaw=this.yaw;f.pitch=f.roll=f.bumperRamp=0;f.pose=1;return f;}
 cancel(){this.done=true;this.phase='idle';this.throttle=this.steer=this.speed=this.accumulator=0;return this.activity.exit;}
}
