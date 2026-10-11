import * as THREE from 'three';
import {CUES,cueOffsetX} from './night-model.js';
/** Only destination framing; sourceFrame/fit/return projection remain in camera.js unchanged. */
export function nightCameraFrame(plaza,width,height,{reservedBottom=96}={}){
 width=Math.max(1,width);height=Math.max(1,height);const reserved=Math.min(reservedBottom,height*.4),usable=Math.max(1,height-reserved),camera=new THREE.PerspectiveCamera();
 camera.position.set(plaza.fire.x,9,plaza.fire.z-10.8);const target=new THREE.Vector3(plaza.launch.x,9.4,plaza.launch.z+1.5);camera.lookAt(target);camera.updateMatrixWorld();
 const r=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),u=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 function include(point,radius=0){const v=new THREE.Vector3(...point).sub(camera.position),x=v.dot(r),y=v.dot(u);minX=Math.min(minX,x-radius);maxX=Math.max(maxX,x+radius);minY=Math.min(minY,y-radius);maxY=Math.max(maxY,y+radius);}
 for(const [i,c]of CUES.entries()){
  const cx=plaza.launch.x+cueOffsetX(c,width/height<.75),cz=plaza.launch.z+1.5+(i%3)*.65;
  if(c.kind==='cameo'){include([cx,c.y,cz],c.radius+.8);include([cx,Math.max(2,c.y-4),cz],c.radius+.4);continue;}
  const drag=c.kind==='willow'?.54:.68,gravity=c.kind==='willow'?2.05:1.8;
  for(let t=0;t<=4.45;t+=.1){const f=(1-Math.exp(-drag*t))/drag,fall=gravity/drag*(t-f),radius=c.radius*1.04*f+1.1;include([cx-radius,Math.max(1.1,c.y-radius-fall),cz]);include([cx+radius,c.y+radius-fall+(c.kind==='willow'?.9*f:c.kind==='palm'?.55*f:0),cz]);}
 }
 for(const x of [-4.4,4.4])for(const z of [-2,4.4])include([plaza.fire.x+x,.1,plaza.fire.z+z]);
 const pad=.65,span=Math.max(maxY-minY+pad*2,(maxX-minX+pad*2)*usable/width),fullSpan=span*height/usable,cx=(minX+maxX)/2,cy=(minY+maxY)/2,hspan=span*width/usable;
 return {position:camera.position.toArray(),target:target.toArray(),left:cx-hspan/2,right:cx+hspan/2,top:cy+span/2,bottom:cy+span/2-fullSpan,near:.1,far:180,zoom:1};
}
