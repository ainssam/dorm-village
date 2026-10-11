import fs from 'node:fs';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.()});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.()});}};
const C={cream:'#f4dfb8',belly:'#f5e5c6',cocoa:'#855c42',quill:'#956748',quillLight:'#a67850',tan:'#bb8b61',nose:'#68442f',eye:'#27251f',white:'#fff9e7',blush:'#e8a595',sage:'#84915e',sageLight:'#a7ad77',seam:'#687c4c',pot:'#d99a6d',potDark:'#b97850',gold:'#e7bd62',water:'#a6dadd'};
const mats=Object.fromEntries(Object.entries(C).map(([id,color])=>[id,new T.MeshStandardMaterial({color,roughness:id==='eye'?.32:.91})]));
mats.face=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.91});
const root=new T.Group();root.name='GardenResident.hedgehog';root.userData={species:'hedgehog',approvedConcept:'dormi-gardener-hedgehog-preview',version:2,surfacePass:'faithful-natural-v1'};
const buckets=[];function group(name,parent=root,pos=[0,0,0]){const g=new T.Group();g.name=name;g.userData.role=name;g.position.fromArray(pos);parent.add(g);buckets.push(g);return g;}
const motion=group('Motion'),body=group('Body',motion),head=group('Head',motion,[0,1.095,.02]);
function mesh(g,material,parent,pos=[0,0,0],scale=[1,1,1],rot=null){const m=new T.Mesh(g,mats[material]);m.position.fromArray(pos);m.scale.fromArray(scale);if(rot)m.rotation.fromArray(rot);parent.add(m);return m;}
function ball(parent,mat,pos,scale,detail=16){return mesh(new T.SphereGeometry(1,detail,Math.max(6,detail/2)),mat,parent,pos,scale);}
function tube(parent,mat,points,radius=.02,segments=20,radial=8){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,segments,radius,radial,false),mat,parent);}
function quill(parent,pos,normal,length=.17,color='quill'){const m=ball(parent,color,pos,[.063,length,.069],16);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...normal).normalize());return m;}

function smoothCoincidentNormals(g){
 const p=g.attributes.position,n=g.attributes.normal,sets=new Map();
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');const a=sets.get(key)??[];a.push(i);sets.set(key,a);}
 for(const ids of sets.values()){const v=new T.Vector3();for(const i of ids)v.add(new T.Vector3(n.getX(i),n.getY(i),n.getZ(i)));if(v.lengthSq()<1e-16)v.set(0,1,0);v.normalize();for(const i of ids)n.setXYZ(i,v.x,v.y,v.z);}
 return g;
}
// Authored continuous surfaces. All animated transforms below are the production contract.
function shapedSphere(parent,mat,pos,scale,detail=32,deform=null){
 const g=new T.SphereGeometry(1,detail,Math.round(detail*.625));const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i));if(deform)deform(v);p.setXYZ(i,v.x*scale[0],v.y*scale[1],v.z*scale[2]);}
 if(mat==='face'){
  const colors=[],cream=new T.Color(C.cream),blush=new T.Color(C.blush);
  for(let i=0;i<p.count;i++){const x=p.getX(i)+pos[0],y=p.getY(i)+pos[1],z=p.getZ(i)+pos[2],amount=.52*Math.exp(-Math.pow((Math.abs(x)-.229)/.064,2)-Math.pow((y+.064)/.044,2))*T.MathUtils.smoothstep(z,.16,.24),color=cream.clone().lerp(blush,amount);colors.push(color.r,color.g,color.b);}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 }
 g.computeVertexNormals();smoothCoincidentNormals(g);return mesh(g,mat,parent,pos);
}
function leafQuill(parent,center,up,normal,width,length,depth,color){
 const g=new T.SphereGeometry(1,12,7),p=g.attributes.position,U=new T.Vector3(...up).normalize(),N=new T.Vector3(...normal).normalize(),X=new T.Vector3().crossVectors(U,N).normalize(),C=new T.Vector3(...center);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),taper=.83+.17*y;
  const q=C.clone().addScaledVector(X,x*width*taper).addScaledVector(U,y*length).addScaledVector(N,z*depth+(.018*(1-y*y)));
  p.setXYZ(i,q.x,q.y,q.z);
 }
 g.computeVertexNormals();smoothCoincidentNormals(g);return mesh(g,color,parent);
}
// A close-layered soft quill coat. The grain runs down the back rather than radially outward.
shapedSphere(body,'cocoa',[0,.75,-.10],[.415,.59,.31],24);
for(let row=0;row<9;row++){
 const baseP=.30+row*.312,n=Math.round(7+Math.sin(baseP)*4);
 for(let j=0;j<n;j++){
  const p=baseP+.017*Math.sin(j*5.7+row),a=Math.PI/2-.40+(j+.5*(row%2))/(n-1+.5*(row%2))*(Math.PI+.80)+.023*Math.sin(j*3.1+row*2.3);
  const center=[Math.sin(p)*Math.sin(a)*.420,.75+Math.cos(p)*.586,-.10+Math.sin(p)*Math.cos(a)*.318];
  const normal=[Math.sin(p)*Math.sin(a)/.42,Math.cos(p)/.586,Math.sin(p)*Math.cos(a)/.318];
  const up=[-Math.cos(p)*Math.sin(a)*.420,Math.sin(p)*.586,-Math.cos(p)*Math.cos(a)*.318];
  leafQuill(body,center,up,normal,.071+.022*Math.sin(p),.137+.008*Math.sin(row*1.7+j*2.3),.058,(row+j)%5===0?'quillLight':'quill');
 }
}
// Small forward shoulder layers close the coat seam without widening the silhouette.
for(let row=2;row<=4;row++)for(const a of [.84,Math.PI*2-.84]){
 const p=.30+row*.312,center=[Math.sin(p)*Math.sin(a)*.420,.75+Math.cos(p)*.586,-.16+Math.sin(p)*Math.cos(a)*.318],normal=[Math.sin(p)*Math.sin(a)/.42,Math.cos(p)/.586,Math.sin(p)*Math.cos(a)/.318],up=[-Math.cos(p)*Math.sin(a)*.420,Math.sin(p)*.586,-Math.cos(p)*Math.cos(a)*.318];
 leafQuill(body,center,up,normal,.086,.137,.053,'quill');
}
shapedSphere(body,'cream',[0,.51,.05],[.37,.43,.30],24,(v)=>{v.x*=1+.035*(1-v.y*v.y);});
// Face, cheeks and snout share one smooth surface. The local front surface is also used for facial placement.
function faceZ(x,y){const nx=x/.377,ny=y/.321;return .018+.303*Math.sqrt(Math.max(.015,1-nx*nx-ny*ny))+.041*Math.exp(-Math.pow(x/.148,2)-Math.pow((y+.060)/.113,2));}
shapedSphere(head,'face',[0,0,.018],[.377,.321,.303],36,(v)=>{
 const x=v.x*.377,y=v.y*.321;
 if(v.z>0)v.z+=.041/.303*Math.exp(-Math.pow(x/.148,2)-Math.pow((y+.060)/.113,2))*Math.pow(v.z,.6);
 v.x*=1+.027*Math.exp(-Math.pow((v.y+.28)/.5,2));
});
for(const s of [-1,1]){
 // Ear bases are deeply nested in the face silhouette, with a gently cupped inner ear.
 shapedSphere(head,'face',[s*.304,.182,.038],[.099,.117,.080],20,(v)=>{v.z-=.09*Math.max(0,v.z)*(1-v.x*v.x);});
 shapedSphere(head,'blush',[s*.325,.203,.104],[.056,.074,.017],16,(v)=>{v.z-=.24*(1-v.x*v.x)*(1-v.y*v.y);});
 const ex=s*.143,ey=.011,ez=faceZ(ex,ey);
 const eye=ball(head,'eye',[ex,ey,ez+.011],[.039,.057,.019],16);eye.rotation.y=s*.21;
 ball(head,'white',[ex-s*.010,ey+.020,ez+.031],[.010,.013,.006],12);
 const eyebrow=[];for(let i=0;i<=10;i++){const x=s*(.111+.046*i/10),y=.110+.007*Math.sin(Math.PI*i/10);eyebrow.push([x,y,faceZ(x,y)+.0035]);}tube(head,'tan',eyebrow,.0055,16,6);
}
ball(head,'nose',[0,-.052,faceZ(0,-.052)+.009],[.045,.032,.025],16);
const smile=[];for(let i=0;i<=16;i++){const x=-.076+i*.0095,y=-.097-.036*(1-Math.pow(x/.076,2));smile.push([x,y,faceZ(x,y)+.005]);}tube(head,'nose',smile,.0065,16,6);
// A swept crown nests into the coat, carrying the same rounded, overlapping quill language.
const crown=[];
for(let row=0;row<2;row++)for(let i=0;i<7;i++){
 const x=(i-3+(row?.36:0))*.077,y=.317-Math.pow(Math.abs(x)/.32,1.6)*.044-row*.018+.007*Math.sin(i*2.5+row),z=-.047-row*.060+.010*Math.cos(i*1.6+row);
 const up=[x*.9+.08*Math.sin(i*1.8+row),.70+.09*Math.cos(i*1.3+row),-.64-.10*Math.sin(i*1.1+row)];
 crown.push(leafQuill(head,[x,y,z],up,[x*.3,.84,.4],.062,.127-Math.abs(i-3)*.004+.009*Math.sin(i*2.1+row*3),.043,(i+row)%5===0?'quillLight':'quill'));
}
// Fit only the authored crown geometry to the unchanged rest/inspect height envelope.
let crownShift=0;
for(const m of crown){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i);crownShift=Math.max(crownShift,y-.4161,(y*Math.cos(.17)-z*Math.sin(.17)-.431)/Math.cos(.17));}}
for(const m of crown)m.geometry.translate(0,-crownShift,0);
// Fitted fabric is one thin closed panel, following the torso instead of stacked ellipsoids.
function apronPoint(u,v,offset=0){
 const y=.280+v*.512-.015*(1-u*u)*(1-v),width=.305-.110*Math.pow(v,2.7),x=u*width;
 const bodyZ=.05+.30*Math.sqrt(Math.max(.03,1-Math.pow(x/.385,2)-Math.pow((y-.51)/.455,2)));
 return [x,y,bodyZ+.021+offset+.0035*Math.sin(u*3*Math.PI)*(1-v)*v];
}
function clothPanel(parent,mat,point,us=24,vs=24,thickness=.012){
 const positions=[],indices=[];
 for(let side=0;side<2;side++)for(let j=0;j<=vs;j++)for(let i=0;i<=us;i++){const q=point(i/us*2-1,j/vs);q[2]-=side*thickness;positions.push(...q);}
 const stride=us+1,layer=(us+1)*(vs+1);for(let side=0;side<2;side++)for(let j=0;j<vs;j++)for(let i=0;i<us;i++){const a=side*layer+j*stride+i,b=a+1,c=a+stride,d=c+1;if(!side)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d);}
 const edge=[];for(let i=0;i<=us;i++)edge.push(i);for(let j=1;j<=vs;j++)edge.push(j*stride+us);for(let i=us-1;i>=0;i--)edge.push(vs*stride+i);for(let j=vs-1;j>0;j--)edge.push(j*stride);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+layer,b+layer,a,b+layer,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));g.computeVertexNormals();return mesh(g,mat,parent);
}
clothPanel(body,'sage',(u,v)=>apronPoint(u,v),18,14,.011);
for(const s of [-1,1]){
 tube(body,'sageLight',[[s*.273,.865,.118],[s*.242,.862,.226],[s*.209,.820,.293],[s*.185,.765,.306]],.023);
 ball(body,'gold',[s*.186,.765,.320],[.023,.023,.009],16);
}
// Wide squared pocket with rounded lower corners, a tiny rolled rim and stitched hem.
function pocketPoint(u,v){const x=u*(.141+.010*Math.sin(v*Math.PI/2)),y=.390+v*.174+.013*Math.pow(Math.abs(u),5)*(1-v),base=apronPoint(x/(.305-.110*Math.pow((y-.280)/.512,2.7)),(y-.280)/.512);return [x,y,base[2]+.015+.007*Math.sin(v*Math.PI)];}
clothPanel(body,'sageLight',pocketPoint,14,8,.007);
const rim=[];for(let i=0;i<=16;i++)rim.push(pocketPoint(i/8-1,1).map((x,k)=>x+(k===2?.003:0)));tube(body,'seam',rim,.004,16,6);
const hem=[];for(let i=0;i<=20;i++)hem.push(apronPoint(i/10-1,.035,.004));tube(body,'sageLight',hem,.0036,20,6);
for(let k=0;k<5;k++){const a=k*Math.PI*2/5,x=Math.sin(a)*.032,y=.466+Math.cos(a)*.032,z=pocketPoint(x/.15,(y-.39)/.174)[2];const f=ball(body,'white',[x,y,z+.014],[.018,.027,.008],12);f.rotation.z=-a;}
const flowerZ=pocketPoint(0,(.466-.39)/.174)[2];ball(body,'gold',[0,.466,flowerZ+.025],[.017,.017,.009],12);
// Arms are one continuous surface with a baked color transition through the wrist.
const armSkin=mats.armSkin=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.91});
const parts={};
for(const [side,s]of[['L',-1],['R',1]]){
 const arm=group('Arm.'+side,motion,[s*.330,.757,.018]);parts['Arm.'+side]=arm;
 const g=new T.SphereGeometry(1,24,16),p=g.attributes.position,colors=[];const cream=new T.Color(C.cream),tan=new T.Color(C.tan);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(1-y)/2;const ly=-.175+y*.216;p.setXYZ(i,s*(.037+.030*t)+x*(.112-.006*Math.sin(Math.PI*t)),ly,.044+.060*t+z*(.113+.008*t));const f=T.MathUtils.smoothstep(ly,-.302,-.238),color=tan.clone().lerp(cream,f);colors.push(color.r,color.g,color.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();mesh(g,'armSkin',arm);
 const foot=group('Foot.'+side,motion,[s*.178,.11,.064]);ball(foot,'tan',[0,0,0],[.153,.11,.186],16);
 for(const dx of [-.045,0,.045])tube(foot,'cocoa',[[dx,.00,.174],[dx,.031,.169],[dx,.046,.155]],.0045,8,6);
}
const canPivot=group('WateringCan',parts['Arm.R'],[.066,-.300,.098]);
const can=group('CanBody',canPivot,[.026,-.109,.022]);
mesh(new T.CylinderGeometry(.143,.127,.245,24,1), 'pot',can,[.085,-.052,.022]);
mesh(new T.TorusGeometry(.137,.014,8,24),'pot',can,[.085,.071,.022],[1,1,1],[Math.PI/2,0,0]);
mesh(new T.CylinderGeometry(.120,.120,.007,24),'potDark',can,[.085,.069,.022]);
tube(can,'pot',[[.005,.032,.008],[-.040,.095,.008],[.005,.169,.008],[.085,.198,.008],[.168,.150,.008],[.171,.061,.008]],.024);
const spout=tube(can,'pot',[[.202,-.099,.017],[.269,-.035,.025],[.361,.074,.029]],.033);
const nozzle=mesh(new T.CylinderGeometry(.073,.058,.029,20),'pot',can,[.379,.089,.029]);nozzle.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(.69,.73,0));
for(const [dx,dz]of[[0,0],[-.025,-.024],[.024,-.024],[-.025,.024],[.024,.024]]){const hole=ball(can,'potDark',[.392-dx*.72,.102+dx*.69,.029+dz],[.007,.002,.007],8);hole.rotation.z=-.76;}
const drops=group('WaterDrops',can);
for(let i=0;i<5;i++)ball(drops,'water',[.421+i*.026,.042-i*.085,.030+(i%2?.015:-.012)],[.010,.019,.010],8);
drops.visible=false;
// Batch static shapes per material within each animated part.
for(const parent of buckets){const byMaterial=new Map();for(const child of [...parent.children]){if(!child.isMesh)continue;child.updateMatrix();const geo=child.geometry.clone();geo.applyMatrix4(child.matrix);const list=byMaterial.get(child.material)??[];list.push(geo);byMaterial.set(child.material,list);parent.remove(child);child.geometry.dispose();}for(const [material,geometries]of byMaterial){const merged=mergeGeometries(geometries,false);merged.computeBoundingBox();merged.computeBoundingSphere();const combined=new T.Mesh(merged,material);combined.name=parent.name+'.'+material.color.getHexString();parent.add(combined);geometries.forEach(g=>g.dispose());}}
root.updateMatrixWorld(true);
let triangles=0,meshes=0;root.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;}});
const box=new T.Box3().setFromObject(root),report={meshes,triangles,bounds:{min:box.min.toArray(),max:box.max.toArray()},height:box.max.y-box.min.y};
const out=new URL('./gardener-hedgehog.glb',import.meta.url);fs.writeFileSync(out,Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false})));fs.writeFileSync(new URL('./model-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
