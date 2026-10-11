/** Pure ENU perspective projection: azimuth north=0, east=90; no calendar logic. */
const RAD=Math.PI/180, EPS=1e-12;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
function finite(n){if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError('Expected finite number');return n;}
function normalized(v){if(!Array.isArray(v)||v.length!==3)throw new TypeError('Expected ENU vector');v.forEach(finite);const n=Math.hypot(...v);if(n<EPS)throw new RangeError('Zero direction');return v.map(x=>x/n);}
export function directionFromHorizontal(altitudeDeg,azimuthDeg){finite(altitudeDeg);finite(azimuthDeg);if(Math.abs(altitudeDeg)>90)throw new RangeError('Invalid altitude');const a=altitudeDeg*RAD,z=azimuthDeg*RAD;return Object.freeze([Math.cos(a)*Math.sin(z),Math.cos(a)*Math.cos(z),Math.sin(a)]);}
export function horizontalFromDirection(direction){const [e,n,u]=normalized(direction);return Object.freeze({altitudeDeg:Math.atan2(u,Math.hypot(e,n))/RAD,azimuthDeg:Math.hypot(e,n)<EPS?null:(Math.atan2(e,n)/RAD+360)%360});}
export function makeCamera({yawDeg=180,pitchDeg=35,verticalFovDeg=75,width,height}={}){
 for(const n of [yawDeg,pitchDeg,verticalFovDeg,width,height])finite(n);
 if(Math.abs(pitchDeg)>90||verticalFovDeg<10||verticalFovDeg>120||width<=0||height<=0)throw new RangeError('Invalid camera bounds');
 yawDeg=((yawDeg%360)+360)%360;const y=yawDeg*RAD,p=pitchDeg*RAD;
 const forward=directionFromHorizontal(pitchDeg,yawDeg),right=Object.freeze([Math.cos(y),-Math.sin(y),0]),up=Object.freeze([-Math.sin(p)*Math.sin(y),-Math.sin(p)*Math.cos(y),Math.cos(p)]);
 const tanY=Math.tan(verticalFovDeg*RAD/2),tanX=tanY*width/height;
 const camera={yawDeg,pitchDeg,verticalFovDeg,width,height,forward,right,up,tanX,tanY};
 const frustum=[forward];for(const [axis,tan] of [[right,tanX],[up,tanY]])frustum.push(Object.freeze(forward.map((v,i)=>tan*v+axis[i])),Object.freeze(forward.map((v,i)=>tan*v-axis[i])));
 camera.frustumPlanes=Object.freeze(frustum);camera.horizonFrustumPlanes=Object.freeze([...frustum,Object.freeze([0,0,1])]);return Object.freeze(camera);
}
function planes(c,clipHorizon){return clipHorizon?c.horizonFrustumPlanes:c.frustumPlanes;}
function rawProject(v,c){const z=dot(v,c.forward);if(z<=EPS)return null;return Object.freeze({x:Math.max(0,Math.min(c.width,c.width/2*(1+dot(v,c.right)/z/c.tanX))),y:Math.max(0,Math.min(c.height,c.height/2*(1-dot(v,c.up)/z/c.tanY)))});}
export function projectDirection(direction,camera,{clipHorizon=true}={}){const v=normalized(direction);if(planes(camera,clipHorizon).some(p=>dot(v,p)<-EPS))return null;return rawProject(v,camera);}
/** A shorter great-circle arc projects to a straight line under a perspective
 * (gnomonic) camera. Clip its 3D chord against origin planes before projection:
 * each chord point defines the exact same ray as its normalized spherical point.
 * This avoids seam bridges, perspective infinities and unbounded subdivisions.
 * Antipodal endpoints have no unique shorter arc and are explicitly rejected. */
export function projectGreatCircleSegment(start,end,camera,{clipHorizon=true}={}){
 const a=normalized(start),b=normalized(end);if(dot(a,b)<-1+1e-10)throw new RangeError('Antipodal guide endpoints are ambiguous');
 let lo=0,hi=1;
 for(const plane of planes(camera,clipHorizon)){const da=dot(a,plane),db=dot(b,plane);if(da<0&&db<0)return null;if(da>=0&&db>=0)continue;const t=da/(da-db);if(da<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}
 const from=rawProject(mix(a,b,lo),camera),to=rawProject(mix(a,b,hi),camera);return from&&to?Object.freeze([from,to]):null;
}
export const CARDINAL_DIRECTIONS=Object.freeze([['north','북',0],['east','동',90],['south','남',180],['west','서',270]].map(([id,label,azimuthDeg])=>Object.freeze({id,label,azimuthDeg,directionENU:directionFromHorizontal(0,azimuthDeg)})));
export function projectCardinals(camera){return Object.freeze(CARDINAL_DIRECTIONS.flatMap(({id,label,azimuthDeg,directionENU})=>{const p=projectDirection(directionENU,camera);return p?[Object.freeze({id,label,azimuthDeg,...p})]:[];}));}
