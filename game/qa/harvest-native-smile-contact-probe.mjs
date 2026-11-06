// Independent geometry diagnostic, not a played harvest or a saved game outcome.
// Run from game/: node qa/harvest-native-smile-contact-probe.mjs
// Uses the existing Node GLB helper and Python 3/Pillow for original face pixels.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {doreumiModel} from '../tests/helpers/doreumi-model.mjs';
import {createCafeDiningView} from '../dist/bakery/dining-view.js';
import {DINING_CONTACT} from '../dist/bakery/food-controller.js';

const {model,poser}=await doreumiModel(),player=new T.Group(),zoneRoot=new T.Group();
player.add(model);zoneRoot.add(player);poser.setPose('sit',1,0);
player.position.set(-3.7,3.84-poser.getState().seatContactY,2.45);player.rotation.y=Math.PI;
const view=createCafeDiningView({zoneRoot,player,model,poser,seat:{floor:'floor2',floorY:3.25,anchor:{x:-3.7,z:2.45}},itemId:'tomatoBowl'});
try{
 view.update({elapsed:DINING_CONTACT,consumed:true});player.updateMatrixWorld(true);
 let mesh;model.traverse(n=>{if(n.isSkinnedMesh)mesh=n;});mesh.skeleton.update();
 const a=mesh.geometry.attributes.position,index=mesh.geometry.index,vertices=[];
 for(let i=0;i<a.count;i++)vertices.push({
  p:model.worldToLocal(mesh.localToWorld(mesh.getVertexPosition(i,new T.Vector3()))).toArray(),
  rest:[a.getX(i),a.getY(i),a.getZ(i)]
 });
 const faceTriangles=[];
 for(let i=0;i<(index?.count??a.count);i+=3){
  const tri=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);
  if(tri.some(({rest:[x,y,z]})=>Math.abs(x)<.06&&y>.12&&y<.18&&z>.22))faceTriangles.push(tri);
 }
 // assets.js applies neutral.webp through rest-space face coordinates before
 // skinning. Sample those painted smile pixels on the real skinned triangles.
 const sampled=JSON.parse(execFileSync('python3',['-c',String.raw`
import sys,json
from PIL import Image
from collections import deque
triangles=json.load(sys.stdin)
im=Image.open('dist/characters/doreumi/neutral.webp').convert('RGBA')
w,h=im.size
samples=[]
for tri in triangles:
 for i in range(17):
  for k in range(17-i):
   b=[i/16,k/16,1-(i+k)/16]
   r=[sum(b[n]*tri[n]['rest'][axis] for n in range(3)) for axis in range(3)]
   x=int((r[0]+.4)/.8*w);y=int((.64-r[1])/.76*h)
   if not(349<=x<=426 and 490<=y<=509 and r[2]>.22):continue
   c=im.getpixel((x,y))
   if c[3]>127 and max(c[:3])<70:
    samples.append([sum(b[n]*tri[n]['p'][axis] for n in range(3)) for axis in range(3)])
pixels={}
for phase in ['midlift','first-bite']:
 path='qa/harvest-meal-acceptance-2026-11-06/final-desktop/tomato-self-'+phase+'-component-front-oblique.png'
 try:shot=Image.open(path).convert('RGB')
 except FileNotFoundError:continue
 mask={(x,y) for y in range(405,471) for x in range(355,429) if max(shot.getpixel((x,y)))<75}
 groups=[]
 while mask:
  q=deque([mask.pop()]);pts=[]
  while q:
   p=q.popleft();pts.append(p)
   for n in [(p[0]+1,p[1]),(p[0]-1,p[1]),(p[0],p[1]+1),(p[0],p[1]-1)]:
    if n in mask:mask.remove(n);q.append(n)
  if len(pts)>1:groups.append({'pixels':len(pts),'bounds':[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)],'center':[sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts)]})
 pixels[phase]=sorted(groups,key=lambda g:g['bounds'])
print(json.dumps({'samples':samples,'pixels':pixels}))
`],{input:JSON.stringify(faceTriangles),maxBuffer:2*1024*1024,encoding:'utf8'}));
 if(!sampled.samples.length)throw Error('The original painted smile was not found');
 const spoon=view.root.getObjectByName('harvest.spoon'),scoop=spoon.getObjectByName('harvest.spoon-bowl'),sa=scoop.geometry.attributes.position,si=scoop.geometry.index,scoopTriangles=[];
 for(let i=0;i<si.count;i+=3)scoopTriangles.push(new T.Triangle(...[0,1,2].map(k=>model.worldToLocal(scoop.localToWorld(new T.Vector3().fromBufferAttribute(sa,si.getX(i+k)))))));
 const socket=new T.Vector3(...poser.getAnchors().mouth),point=new T.Vector3(),closest=new T.Vector3();
 let socketDistance=Infinity,surfaceDistance=Infinity,nearest;
 for(const sample of sampled.samples){
  point.fromArray(sample);socketDistance=Math.min(socketDistance,point.distanceTo(socket));
  for(const triangle of scoopTriangles){triangle.closestPointToPoint(point,closest);const d=point.distanceTo(closest);if(d<surfaceDistance){surfaceDistance=d;nearest={smile:sample,scoop:closest.toArray()};}}
 }
 const paths=['dist/assets.js','dist/doreumi-rig-poses.js','dist/bakery/dining-view.js','dist/characters/doreumi/neutral.webp','dist/characters/doreumi/village.glb'];
 const result={kind:'isolated-original-geometry-diagnostic',note:'This poses the original native model for a surface probe; it does not represent real input, storage or a harvested meal. Screenshot pixels are from the separate actual desktop run.',
  method:'Sample the approved neutral.webp smile through the assets.js face shader coordinates on actual skinned triangles, then find each sample’s closest point on the transformed spoon scoop triangles.',
  paintedSmileTextureBounds:[349,490,426,509],textureSize:[768,768],faceTriangles:faceTriangles.length,smileSamples:sampled.samples.length,
  socket:socket.toArray(),socketToPaintedSmileDistance:socketDistance,scoopCenter:model.worldToLocal(scoop.getWorldPosition(new T.Vector3())).toArray(),scoopToPaintedSmileDistance:surfaceDistance,nearest,
  screenshotDarkComponents:sampled.pixels,sha256:Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))};
 fs.writeFileSync('qa/harvest-native-smile-contact-2026-11-06.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({smileSamples:result.smileSamples,socketToPaintedSmileDistance:socketDistance,scoopToPaintedSmileDistance:surfaceDistance}));
}finally{view.dispose();poser.dispose();}
