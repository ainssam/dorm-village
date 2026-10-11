// Same 24-ring sleeve as sampleArmSurface. Reuse bounded scratch storage and the
// mesh's position buffer; topology never changes during a curl or seated pose.
const centers=new Float64Array(72),radii=new Float64Array(24);
const cosines=Float64Array.from({length:16},(_,j)=>Math.cos(j*Math.PI*2/16));
const sines=Float64Array.from({length:16},(_,j)=>Math.sin(j*Math.PI*2/16));
function center(i,x,y,z,r){centers[i*3]=x;centers[i*3+1]=y;centers[i*3+2]=z;radii[i]=r;}
export function writeAthleticArmSurface({shoulder:A,elbow:E,wrist:W},positions){
 if(positions.length!==1152)throw Error('Unexpected athletic arm topology');
 const ul=Math.hypot(E[0]-A[0],E[1]-A[1],E[2]-A[2]),vl=Math.hypot(W[0]-E[0],W[1]-E[1],W[2]-E[2]);
 const ux=(E[0]-A[0])/ul,uy=(E[1]-A[1])/ul,uz=(E[2]-A[2])/ul;
 const vx=(W[0]-E[0])/vl,vy=(W[1]-E[1])/vl,vz=(W[2]-E[2])/vl;
 const sx=A[0]-ux*.065,sy=A[1]-uy*.065,sz=A[2]-uz*.065;
 const px=E[0]-ux*.048,py=E[1]-uy*.048,pz=E[2]-uz*.048;
 const qx=E[0]+vx*.048,qy=E[1]+vy*.048,qz=E[2]+vz*.048;
 center(0,sx,sy,sz,.003);center(1,sx+(A[0]-sx)*.32,sy+(A[1]-sy)*.32,sz+(A[2]-sz)*.32,.070);
 center(2,sx+(A[0]-sx)*.68,sy+(A[1]-sy)*.68,sz+(A[2]-sz)*.68,.100);
 let ring=3;
 for(let i=0;i<=6;i++){const t=i/6;center(ring++,A[0]+(px-A[0])*t,A[1]+(py-A[1])*t,A[2]+(pz-A[2])*t,.107-.010*t);}
 for(let i=1;i<=7;i++){const t=i/7,a=(1-t)**2,b=2*(1-t)*t,c=t*t;center(ring++,px*a+E[0]*b+qx*c,py*a+E[1]*b+qy*c,pz*a+E[2]*b+qz*c,.097);}
 for(let i=1;i<=6;i++){const t=i/6;center(ring++,qx+(W[0]-qx)*t,qy+(W[1]-qy)*t,qz+(W[2]-qz)*t,.097-.025*t);}
 center(ring,W[0]+vx*.025,W[1]+vy*.025,W[2]+vz*.025,.002);
 let at=0;
 for(let i=0;i<24;i++){
  const prev=Math.max(0,i-1)*3,next=Math.min(23,i+1)*3;
  let tx=centers[next]-centers[prev],ty=centers[next+1]-centers[prev+1],tz=centers[next+2]-centers[prev+2];
  const tl=Math.hypot(tx,ty,tz);tx/=tl;ty/=tl;tz/=tl;
  let bx=1-tx*tx,by=-ty*tx,bz=-tz*tx;const bl=Math.hypot(bx,by,bz);bx/=bl;by/=bl;bz/=bl;
  let nx=ty*bz-tz*by,ny=tz*bx-tx*bz,nz=tx*by-ty*bx;const nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
  for(let j=0;j<16;j++){
   const a=radii[i]*cosines[j],b=radii[i]*.96*sines[j];
   positions[at++]=centers[i*3]+bx*a+nx*b;
   positions[at++]=centers[i*3+1]+by*a+ny*b;
   positions[at++]=centers[i*3+2]+bz*a+nz*b;
  }
 }
 return positions;
}
