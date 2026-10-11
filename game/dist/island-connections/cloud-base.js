import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CLOUD_COLORS} from './layout.js';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function inside(p,polygon){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
function overlaps(triangle,polygon){if(triangle.some(p=>inside(p,polygon)))return true;for(const p of polygon){const signs=triangle.map((a,i)=>cross(a,triangle[(i+1)%3],p));if(signs.every(v=>v>=-1e-9)||signs.every(v=>v<=1e-9))return true;}for(let i=0;i<3;i++)for(let j=0;j<polygon.length;j++){const a=triangle[i],b=triangle[(i+1)%3],c=polygon[j],d=polygon[(j+1)%polygon.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;}return false;}
// Conservatively lower every vertex of any triangle whose footprint crosses
// support. Duplicate pole/seam vertices share the same cap, avoiding cracks.
function excludeSupport(g,polygons){const a=g.attributes.position,index=g.index,cap=new Set(),key=i=>[a.getX(i),a.getY(i),a.getZ(i)].map(v=>v.toFixed(5)).join(',');for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];if(ids.every(j=>a.getY(j)<=.02))continue;const triangle=ids.map(j=>[a.getX(j),a.getZ(j)]);if(polygons.some(p=>overlaps(triangle,p)))ids.forEach(j=>cap.add(key(j)));}for(let i=0;i<a.count;i++)if(cap.has(key(i))&&a.getY(i)>.02)a.setY(i,.02);g.computeVertexNormals();}
/** Destination-only fantasy foundation. The central support remains below
 * unchanged ground. Only outer lobes may rise, outside shore and flight lane. */
export function buildCloudBase(roomId,shore){
 if(!['amusementAirport','amusementIsland'].includes(roomId))return null;
 const root=new T.Group();root.name='island-connections.cloud-base';root.userData={decorative:true,excludeOverview:true,parts:[]};
 const geometry=new T.SphereGeometry(1,24,7),materials=[CLOUD_COLORS.light,CLOUD_COLORS.shade].map(color=>new T.MeshStandardMaterial({color,roughness:1})),airport=roomId==='amusementAirport',xs=shore.map(p=>p[0]),zs=shore.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const protectedPolygons=[shore];if(airport)protectedPolygons.push([[-4.5,-1000],[4.5,-1000],[4.5,1000],[-4.5,1000]]);
 const pieces=[[],[]];const add=(name,x,z,sx,sz,halfY=.22,material=0,topY=.02)=>{const g=geometry.clone();g.scale(sx,halfY,sz);g.translate(x,topY-halfY,z);if(topY>.02)excludeSupport(g,protectedPolygons);pieces[material].push(g);root.userData.parts.push({name,x,z,sx,sz,halfY,topY});};
 add('cloud-base.body',cx,cz,(maxX-minX)/2+(airport?4.4:3.1),(maxZ-minZ)/2+(airport?5.5:3.4),.22);
 for(let i=0;i<8;i++){const[x,z]=shore[Math.floor(i*shore.length/8)],dx=x-cx,dz=z-cz,top=.55+(i%3)*.12;add('cloud-base.puff.'+i,cx+dx*1.12,cz+dz*1.12,airport?6.2:4.0,airport?7.5:4.7,top+.4,i%5===0?1:0,top);}
 for(let i=0;i<pieces.length;i++){const merged=mergeGeometries(pieces[i]);merged.computeBoundingBox();merged.computeBoundingSphere();const mesh=new T.Mesh(merged,materials[i]);mesh.name='cloud-base.'+(i?'shade':'light');root.add(mesh);for(const g of pieces[i])g.dispose();}geometry.dispose();root.updateMatrixWorld(true);return root;
}
