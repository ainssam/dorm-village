import * as THREE from 'three';

const ROWS=12,COLUMNS=6,SEGMENTS=4,STROKES=ROWS*COLUMNS,VERTICES=STROKES*SEGMENTS*2;
const TAU=Math.PI*2;
// This scene uses small world coordinates. Ignore values that cannot safely
// represent the small wave offsets in our fixed Float32 buffers.
const finite=(value,fallback)=>Number.isFinite(value)&&Math.abs(value)<=10000?value:fallback;
const fraction=value=>value-Math.floor(value);
const seed=index=>fraction(Math.sin(index*127.1+311.7)*43758.5453);
const validColor=color=>color?.isColor&&[color.r,color.g,color.b].every(v=>Number.isFinite(v)&&v>=0);
const cameraWidth=camera=>{
  if(!camera?.isOrthographicCamera||![camera.left,camera.right,camera.zoom].every(Number.isFinite)||camera.zoom<=0)return null;
  const width=(camera.right-camera.left)/camera.zoom;
  return width>0?Math.max(6,Math.min(36,width*.55)):null;
};

/** A small, owned water-surface cue. The host attaches root only for sea gaze.
 * No source material, scene settings, camera, renderer, or time source is owned
 * here. RGBA vertex colors give one-pixel line segments soft ends and depth fade.
 */
export function createSeaGaze({camera=null,centerX=0,coastZ=41.1,waterY=-.35,waterColor=null}={}) {
  const root=new THREE.Group();root.name='plaza.sea-gaze';
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(VERTICES*3),colors=new Float32Array(VERTICES*4);
  const position=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',position);
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
  geometry.setDrawRange(0,VERTICES);
  const material=new THREE.LineBasicMaterial({color:'#c4e2e6',vertexColors:true,transparent:true,opacity:.32,depthWrite:false,linewidth:1,toneMapped:false});
  const lines=new THREE.LineSegments(geometry,material);lines.name='plaza.sea-gaze.ripples';
  // This tiny fixed pool changes positions in place. Avoid a stale bounding
  // sphere without a per-frame sphere allocation; the parent controls visibility.
  lines.frustumCulled=false;root.add(lines);
  let alive=true,time=0,sourceCamera=camera,sourceColor=waterColor;
  let x=finite(centerX,0),coast=finite(coastZ,41.1),y=finite(waterY,-.35),halfWidth=cameraWidth(camera)??12;
  const strokes=Array.from({length:STROKES},(_,i)=>{
    const row=Math.floor(i/COLUMNS),column=i%COLUMNS,a=seed(i),b=seed(i+97),depth=(row+.35+b*.3)/ROWS;
    return {depth,z:18+depth*192,x:((column+.5+(a-.5)*.38)/COLUMNS*2-1),length:.18+b*.15,curve:.34+a*.34,phase:a*TAU};
  });
  // Alpha is fixed at each reusable vertex. No new color buffer or upload is
  // needed for movement or tint changes, including day/night transitions.
  for(let i=0;i<STROKES;i++)for(let segment=0;segment<SEGMENTS;segment++)for(let end=0;end<2;end++) {
    const u=(segment+end)/SEGMENTS,vertex=(i*SEGMENTS+segment)*2+end;
    const alpha=(u===0||u===1?0:Math.pow(Math.sin(u*Math.PI),.7))*(.95-.70*strokes[i].depth);
    colors.set([1,1,1,alpha],vertex*4);
  }
  function tint() {
    if(!validColor(sourceColor))return;
    // Multiplicative light catches stay proportional to the real water at night.
    material.color.setRGB(Math.min(1,sourceColor.r*1.42),Math.min(1,sourceColor.g*1.42),Math.min(1,sourceColor.b*1.42));
  }
  function place() {
    for(let i=0;i<STROKES;i++) {
      const s=strokes[i],driftX=Math.sin(time*.11+s.phase)*.22,driftZ=Math.sin(time*.22+s.phase)*.55;
      const curve=s.curve*(.85+.15*Math.sin(time*.16+s.phase));
      for(let segment=0;segment<SEGMENTS;segment++)for(let end=0;end<2;end++) {
        const u=(segment+end)/SEGMENTS,offset=((i*SEGMENTS+segment)*2+end)*3;
        positions[offset]=x+s.x*halfWidth+(u-.5)*s.length*halfWidth+driftX;
        positions[offset+1]=y+.014;
        positions[offset+2]=coast+s.z+Math.sin(u*Math.PI)*curve+driftZ;
      }
    }
    position.needsUpdate=true;
  }
  tint();place();
  return {
    root,
    update(dt,{reduced=false,paused=false,waterColor:nextColor,camera:nextCamera,centerX:nextX,coastZ:nextCoast,waterY:nextY}={}) {
      if(!alive)return;
      if(nextCamera!==undefined)sourceCamera=nextCamera;
      if(validColor(nextColor))sourceColor=nextColor;
      const nx=finite(nextX,x),nc=finite(nextCoast,coast),ny=finite(nextY,y),nw=cameraWidth(sourceCamera)??halfWidth;
      let dirty=nx!==x||nc!==coast||ny!==y||nw!==halfWidth;
      x=nx;coast=nc;y=ny;halfWidth=nw;
      if(!reduced&&!paused&&Number.isFinite(dt)&&dt>0) {
        // Bound long-background-tab frames; this period is shared by every
        // motion frequency, so wrapping cannot introduce a visible jump.
        time=(time+Math.min(.1,dt))%(TAU*100);dirty=true;
      }
      tint();if(dirty)place();
    },
    snapshot:()=>({alive,time,strokes:STROKES,vertices:VERTICES,drawCalls:alive?1:0,geometries:alive?1:0,materials:alive?1:0,textures:0,meshes:0,centerX:x,coastZ:coast,waterY:y,halfWidth}),
    dispose() {
      if(!alive)return;alive=false;root.removeFromParent();root.clear();geometry.dispose();material.dispose();sourceCamera=sourceColor=null;
    }
  };
}
