import {COASTER as C} from './coaster-layout.js';
const R=C.turnRadius,A=C.halfStraight,PLANAR=4*A+2*Math.PI*R,N=4096,ARC= new Float64Array(N+1),Q=new Float64Array(N+1),tmp={},previous={};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Stadium is C1 at each straight/arc join. Both ends of the height bump have
// zero first derivative and lie outside the straight, level station approach.
function authored(q,out){let s=(q+PLANAR+C.dock.z)%PLANAR,x,z,dx,dz;if(s<=A){x=R;z=s;dx=0;dz=1;}else if((s-=A)<=Math.PI*R){const a=s/R;x=R*Math.cos(a);z=A+R*Math.sin(a);dx=-Math.sin(a);dz=Math.cos(a);}else if((s-=Math.PI*R)<=2*A){x=-R;z=A-s;dx=0;dz=-1;}else if((s-=2*A)<=Math.PI*R){const a=s/R;x=-R*Math.cos(a);z=-A-R*Math.sin(a);dx=Math.sin(a);dz=-Math.cos(a);}else{x=R;z=-A+(s-Math.PI*R);dx=0;dz=1;}
 const half=(PLANAR-C.launchLevel-C.brakeLevel)/2,ramp=1.2,along=clamp(Math.min(q-C.launchLevel,PLANAR-C.brakeLevel-q),0,half),rise=C.hill/(half-ramp);let area,speed;
 if(along<ramp){const t=along/ramp;area=ramp*(t*t*t-.5*t*t*t*t);speed=t*t*(3-2*t);}else if(along>half-ramp){const t=(half-along)/ramp;area=half-ramp-ramp*(t*t*t-.5*t*t*t*t);speed=t*t*(3-2*t);}else{area=along-ramp/2;speed=1;}
 const height=rise*area,slope=along===0?0:rise*speed*(q<C.launchLevel+half?1:-1);
 out.x=x;out.y=C.railY+height;out.z=z;out.yaw=Math.atan2(dx,dz);out.pitch=slope?-Math.atan(slope):0;out.roll=0;return out;
}
authored(0,previous);for(let i=1;i<=N;i++){Q[i]=PLANAR*i/N;authored(Q[i],tmp);ARC[i]=ARC[i-1]+Math.hypot(tmp.x-previous.x,tmp.y-previous.y,tmp.z-previous.z);Object.assign(previous,tmp);}
export const COASTER_TRACK=Object.freeze({length:ARC[N],planarLength:PLANAR,gauge:C.gauge,tableSize:N+1});
export function sampleCoasterTrack(distance,out={}){const d=Number.isFinite(distance)?clamp(distance,0,ARC[N]):0;if(d===0||d===ARC[N]){out.x=C.dock.x;out.y=C.railY;out.z=C.dock.z;out.yaw=C.dock.yaw;out.pitch=out.roll=0;return out;}let lo=0,hi=N;while(hi-lo>1){const mid=(lo+hi)>>1;if(ARC[mid]<d)lo=mid;else hi=mid;}return authored(Q[lo]+(Q[hi]-Q[lo])*(d-ARC[lo])/(ARC[hi]-ARC[lo]),out);}
export function sampleCoasterRail(distance,side,out={}){sampleCoasterTrack(distance,out);const x=side*C.gauge/2;out.x+=Math.cos(out.yaw)*x;out.z-=Math.sin(out.yaw)*x;return out;}
export function placeCoasterLocal(f,x,y,z,out={}){const cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cr=Math.cos(f.roll??0),sr=Math.sin(f.roll??0),rx=cr*x-sr*y,ry=sr*x+cr*y,py=cp*ry-sp*z,pz=sp*ry+cp*z;out.x=f.x+cy*rx+sy*pz;out.y=f.y+py;out.z=f.z-sy*rx+cy*pz;return out;}
