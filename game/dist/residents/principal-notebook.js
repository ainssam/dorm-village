/** Articulate only the extracted, approved principal notebook.
 * Original surfaces/materials are kept intact at amount 0. Open leaves reuse
 * those surfaces, with a cream cross-section closing each half of the page block.
 * No character geometry, materials, transforms, or original grip are changed.
 */
import * as THREE from 'three';
const NAME='Principal.NotebookArticulation';
const EPS=1e-7;
const clamp=value=>Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1):0;

function triangles(mesh,transform){
 const g=mesh.geometry,p=g.attributes.position,c=g.attributes.color,index=g.index;
 const matrix=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,mesh.scale).premultiply(transform),out=[];
 for(let i=0;i<(index?.count??p.count);i+=3){const tri=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;tri.push({p:new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(matrix),c:c?Array.from({length:c.itemSize},(_,n)=>c.getComponent(k,n)):null});}out.push(tri);}return out;
}
function bounds(tris){const box=new THREE.Box3();for(const tri of tris)for(const v of tri)box.expandByPoint(v.p);return box;}
function components(tris){
 const vertices=new Map(),parent=tris.map((_,i)=>i),key=p=>[p.x,p.y,p.z].map(v=>Math.round(v*1e6)).join(','),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 tris.forEach((tri,i)=>{for(const v of tri){const k=key(v.p);if(vertices.has(k))parent[find(i)]=find(vertices.get(k));else vertices.set(k,i);}});
 const groups=new Map();tris.forEach((tri,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(tri);});return [...groups.values()];
}
function pageHalf(tris,z,sign){
 const out=[],seam=[];
 for(const tri of tris){const polygon=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],da=(a.p.z-z)*sign,db=(b.p.z-z)*sign;if(da>=-EPS)polygon.push(a);if((da>EPS&&db<-EPS)||(da<-EPS&&db>EPS)){const t=da/(da-db),v={p:a.p.clone().lerp(b.p,t),c:a.c?.map((value,j)=>THREE.MathUtils.lerp(value,b.c[j],t))??null};v.p.z=z;polygon.push(v);seam.push(v);}else if(Math.abs(da)<=EPS)seam.push(a);}
  for(let i=1;i<polygon.length-1;i++)out.push([polygon[0],polygon[i],polygon[i+1]]);
 }
 // The source cream block is convex. Its center cut is a convex polygon,
 // derived from the actual edge crossings rather than a generic rectangle.
 const unique=[...new Map(seam.map(v=>[[v.p.x,v.p.y].map(n=>Math.round(n*1e7)).join(','),v])).values()].sort((a,b)=>a.p.x-b.p.x||a.p.y-b.p.y);
 const cross=(a,b,c)=>(b.p.x-a.p.x)*(c.p.y-a.p.y)-(b.p.y-a.p.y)*(c.p.x-a.p.x),lower=[],upper=[];
 for(const v of unique){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=EPS)lower.pop();lower.push(v);}for(const v of [...unique].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=EPS)upper.pop();upper.push(v);}const rim=lower.slice(0,-1).concat(upper.slice(0,-1));
 if(rim.length<3)throw new Error('Original notebook pages do not form a closed page block');
 if(sign>0)rim.reverse(); // Front half's exposed paper faces -Z; rear half +Z.
 for(let i=1;i<rim.length-1;i++)out.push([rim[0],rim[i],rim[i+1]]);return out;
}
function geometry(tris,pivot){
 const positions=[],colors=[],itemSize=tris[0]?.[0].c?.length;
 for(const tri of tris)for(const v of tri){positions.push(v.p.x-pivot.x,v.p.y-pivot.y,v.p.z-pivot.z);if(itemSize)colors.push(...v.c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));if(itemSize)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,itemSize));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}

/** Input: extracted book Group containing Notebook pages/leather and optional
 * Ribbed trim meshes in their original closed pose. Helpers are descendants of
 * book; use getWorldPosition/getWorldQuaternion after refreshing ancestors.
 * readingSurface local +Z is the paper-front normal, +Y runs up the spine.
 * dispose() must run before disposing the extraction's original resources.
 */
export function createPrincipalNotebook(book){
 if(!book?.isObject3D)throw new Error('An extracted notebook with pages and leather is required');
 if(book.getObjectByName(NAME))throw new Error('Notebook already has articulation');
 const originals=book.children.filter(o=>o.isMesh&&['Notebook pages','Notebook leather','Ribbed trim'].includes(o.material?.name)).map(o=>({mesh:o,visible:o.visible}));
 const pages=originals.find(o=>o.mesh.material.name==='Notebook pages')?.mesh,leather=originals.find(o=>o.mesh.material.name==='Notebook leather')?.mesh;
 if(!pages||!leather)throw new Error('Original Notebook pages and Notebook leather surfaces are required');
 // The largest broad page triangle is from the unchanged rounded page block.
 // Its middle-length edge is the long edge, excluding the diagonal and width.
 const raw=triangles(pages,new THREE.Matrix4());let largest=null,area=0;
 for(const tri of raw){const v=tri.map(v=>v.p),a=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq();if(a>area){area=a;largest=v;}}
 if(!largest||area<EPS)throw new Error('Original notebook pages have no usable surface');
 const normal=largest[1].clone().sub(largest[0]).cross(largest[2].clone().sub(largest[0])).normalize();if(normal.z<0)normal.negate();
 const edges=[largest[1].clone().sub(largest[0]),largest[2].clone().sub(largest[1]),largest[0].clone().sub(largest[2])].sort((a,b)=>b.lengthSq()-a.lengthSq()),up=edges[1].normalize();if(up.y<0)up.negate();
 const right=up.clone().cross(normal).normalize();up.copy(normal).cross(right).normalize();
 const frame=new THREE.Matrix4().makeBasis(right,up,normal),inverse=frame.clone().invert(),pageTris=triangles(pages,inverse),pageBox=bounds(pageTris),center=pageBox.getCenter(new THREE.Vector3()),width=pageBox.max.x-pageBox.min.x;
 const leatherParts=components(triangles(leather,inverse)),spineParts=leatherParts.filter(tris=>{const b=bounds(tris);return b.max.x-b.min.x<width*.45;});
 if(leatherParts.length!==3||spineParts.length!==1)throw new Error('Expected the original notebook spine and two leather covers');
 const spine=spineParts[0],spineBox=bounds(spine),pivot=new THREE.Vector3((spineBox.min.x+spineBox.max.x)/2,center.y,center.z);
 const root=new THREE.Group();root.name=NAME;root.quaternion.setFromRotationMatrix(frame);
 const front=new THREE.Group(),back=new THREE.Group();front.name='Principal.Notebook.FrontLeaf';back.name='Principal.Notebook.RearLeaf';front.position.copy(pivot);back.position.copy(pivot);root.add(front,back);
 const resources=[],zero=new THREE.Vector3();let spineMesh;
 function add(tris,source,parent,label,offset=zero){const g=geometry(tris,offset);resources.push(g);const mesh=new THREE.Mesh(g,source.material);mesh.name='Principal.Notebook.Open.'+label;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.renderOrder=source.renderOrder;mesh.visible=source.visible;parent.add(mesh);return mesh;}
 // Build before touching the input group, so validation failures are atomic.
 const frontPages=pageHalf(pageTris,center.z,1),rearPages=pageHalf(pageTris,center.z,-1);
 add(frontPages,pages,front,'Pages.Front',pivot);add(rearPages,pages,back,'Pages.Rear',pivot);
 for(const tris of leatherParts){if(tris===spine)spineMesh=add(tris,leather,root,'OriginalSpine');else {const leaf=bounds(tris).getCenter(new THREE.Vector3()).z>center.z?front:back;add(tris,leather,leaf,leaf===front?'Cover.Front':'Cover.Rear',pivot);}}
 for(const {mesh} of originals)if(mesh.material.name==='Ribbed trim')add(triangles(mesh,inverse),mesh,front,'OriginalEmbossing',pivot);
 const readingSurface=new THREE.Object3D();readingSurface.name='Principal.Notebook.ReadingSurface';root.add(readingSurface);
 const gripNegativeX=new THREE.Object3D(),gripPositiveX=new THREE.Object3D();gripNegativeX.name='Principal.Notebook.GripNegativeX';gripPositiveX.name='Principal.Notebook.GripPositiveX';
 const gripY=-(pageBox.max.y-pageBox.min.y)*.24,edgeX=pageBox.max.x-pivot.x-.003;
 gripNegativeX.position.set(edgeX,gripY,0);gripPositiveX.position.copy(gripNegativeX.position);back.add(gripNegativeX);front.add(gripPositiveX);
 const pageCenter=center.clone().sub(pivot),a=new THREE.Vector3(),b=new THREE.Vector3(),n=new THREE.Vector3(),x=new THREE.Vector3(),basis=new THREE.Matrix4(),axisUp=new THREE.Vector3(0,1,0);
 let disposed=false,amount=0;book.add(root);
 function setOpen(value){
  if(disposed)return amount;amount=clamp(value);root.visible=amount>0;
  for(const original of originals)original.mesh.visible=amount===0&&original.visible;
  // A nearly flat 168-degree opening exposes two full cream leaves while the
  // original rear cover remains their outside support. The front cover stays
  // fixed, avoiding an unnecessary roll of the original held-book silhouette.
  back.rotation.y=-THREE.MathUtils.degToRad(168)*amount;back.updateMatrix();
  // The existing flexible leather spine unfolds onto the outside binding. Its
  // closed thickness must not protrude through the newly exposed cream gutter.
  spineMesh.scale.z=1-.82*amount;spineMesh.position.z=center.z*(1-spineMesh.scale.z)+(pageBox.max.z-center.z+.008)*amount;
  a.copy(pageCenter).add(pivot);b.copy(pageCenter).applyQuaternion(back.quaternion).add(pivot);readingSurface.position.copy(a).add(b).multiplyScalar(.5);
  // At exact closure the opposing page normals cancel; the limiting normal is
  // defined explicitly. At full opening it faces almost exactly book-local -Z.
  n.set(-Math.cos(-back.rotation.y/2),0,-Math.sin(-back.rotation.y/2));x.copy(axisUp).cross(n).normalize();basis.makeBasis(x,axisUp,n);readingSurface.quaternion.setFromRotationMatrix(basis);
  return amount;
 }
 function dispose(){if(disposed)return;disposed=true;for(const original of originals)original.mesh.visible=original.visible;root.removeFromParent();root.clear();for(const g of resources)g.dispose();}
 setOpen(0);return {setOpen,readingSurface,gripNegativeX,gripPositiveX,dispose};
}
