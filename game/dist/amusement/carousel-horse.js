import * as THREE from 'three';
import {batchHorseDecoration} from './horse-batches.js';

// One rigid ornament. The real rider uses the separate, unchanged carriage.
const P={white:'#fff5e5',rose:'#dca5ae',mane:'#bb8297',gold:'#d4b97e',ink:'#657d79'};
function add(kit,parent,geometry,color,x=0,y=0,z=0) {
  const mesh=new THREE.Mesh(geometry,kit.mat(color));
  mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function ellipsoid(kit,parent,color,r,x,y,z,sx,sy,sz,segments=12,rings=8) {
  const mesh=add(kit,parent,new THREE.SphereGeometry(r,segments,rings),color,x,y,z);
  mesh.scale.set(sx,sy,sz);return mesh;
}

// Closed, tapered curved pieces replace stacked beads and straight block legs.
// A shared seam normal avoids a hard line around the otherwise smooth sweep.
function sweep(kit,parent,color,points,widths,depths,steps=10,sides=12) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const values=[],uvs=[],indices=[],stride=sides+1;
  const profile=(v,t)=>{const n=t*(v.length-1),i=Math.min(v.length-2,Math.floor(n));return THREE.MathUtils.lerp(v[i],v[i+1],n-i);};
  for(let i=0;i<=steps;i++) {
    const t=i/steps,c=curve.getPoint(t),d=curve.getTangent(t),w=profile(widths,t),z=profile(depths,t);
    for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;values.push(c.x-d.y*w*Math.cos(a),c.y+d.x*w*Math.cos(a),c.z+z*Math.sin(a));uvs.push(j/sides,t);}
  }
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*stride+j,b=a+stride;indices.push(a,a+1,b,a+1,b+1,b);}
  for(const end of [0,steps]){const c=curve.getPoint(end/steps),center=values.length/3;values.push(...c.toArray());uvs.push(.5,.5);for(let j=0;j<sides;j++){const a=end*stride+j;indices.push(...(end?[center,a,a+1]:[center,a+1,a]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(values,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  const n=g.attributes.normal,a=new THREE.Vector3(),b=new THREE.Vector3();
  for(let i=0;i<=steps;i++){const first=i*stride,last=first+sides;a.fromBufferAttribute(n,first);b.fromBufferAttribute(n,last);a.add(b).normalize();n.setXYZ(first,a.x,a.y,a.z);n.setXYZ(last,a.x,a.y,a.z);}
  return add(kit,parent,g,color);
}

function curvedSaddle(kit,parent,color,{width,height,depth,lift,endRise=0}) {
  const positions=[],uv=[],indices=[],steps=6,row=steps+1,layer=row*row,r=.035;
  const surface=(x,z)=>.91+.2814*Math.sqrt(Math.max(.08,1-((x-.08)/.5544)**2-(z/.3024)**2))+lift+endRise*(x/(width/2))**2;
  for(const side of [1,-1])for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++) {
    let x=width*(i/steps-.5),z=depth*(j/steps-.5);
    const qx=Math.max(0,Math.abs(x)-(width/2-r)),qz=Math.max(0,Math.abs(z)-(depth/2-r)),length=Math.hypot(qx,qz);
    if(length>r){x=Math.sign(x)*(width/2-r+qx*r/length);z=Math.sign(z)*(depth/2-r+qz*r/length);}
    positions.push(x,surface(x,z)+side*height/2,z);uv.push(i/steps,j/steps);
  }
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++) {
    const a=j*row+i,b=a+1,d=a+row,c=d+1;
    indices.push(a,d,b,b,d,c,a+layer,b+layer,d+layer,b+layer,c+layer,d+layer);
  }
  const edge=[];for(let i=0;i<=steps;i++)edge.push(i);for(let j=1;j<=steps;j++)edge.push(j*row+steps);for(let i=steps-1;i>=0;i--)edge.push(steps*row+i);for(let j=steps-1;j>0;j--)edge.push(j*row);
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+layer,b,b+layer,a+layer);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  return add(kit,parent,g,color,-.08,0,0);
}

export function buildCarouselHorse(kit,parent,angle,index) {
  const horse=new THREE.Group();horse.name=`amusement.carousel.horse.${index}`;
  horse.position.set(Math.sin(angle)*2.22,0,Math.cos(angle)*2.22);horse.rotation.y=angle+Math.PI/2;parent.add(horse);
  const coat=[P.white,'#e9d5bf','#d9dfd9'][index];
  sweep(kit,horse,coat,[[-.55,.90,0],[-.42,.91,0],[-.12,.91,0],[.15,.94,0],[.33,1.10,0],[.35,1.32,0],[.46,1.52,0]],[.02,.18,.275,.25,.185,.14,.12],[.025,.25,.302,.285,.175,.145,.135],20,16);
  ellipsoid(kit,horse,coat,.25,.51,1.55,0,1.14,.90,.72,16,10);
  ellipsoid(kit,horse,coat,.19,.72,1.49,.015,1.12,.72,.84,16,8);
  for(const z of [-.115,.115])ellipsoid(kit,horse,coat,.073,.41,1.77,z,.58,1.38,.70);
  for(const x of [-.30,.30])for(const z of [-.17,.17]) {
    const hind=x<0,foot=x+(hind?.045:-.035);
    sweep(kit,horse,coat,[[x,.84,z],[x+(hind?-.06:.065),.57,z],[foot,.265,z]],[.075,.066,.054],[.071,.062,.056],6,8);
    kit.box(.17,.085,.18,P.gold,foot,.2175,z,.04,horse);
  }
  sweep(kit,horse,P.mane,[[.42,1.68,0],[.25,1.59,0],[.20,1.40,0],[.13,1.20,0],[.06,1.05,0]],[.028,.080,.080,.065,.025],[.055,.095,.095,.085,.035],12,8);
  sweep(kit,horse,P.mane,[[-.49,1.00,0],[-.65,.87,0],[-.63,.67,0],[-.56,.60,0]],[.06,.10,.09,.025],[.07,.085,.065,.025],8,8);
  curvedSaddle(kit,horse,P.rose,{width:.61,height:.08,depth:.57,lift:.025});
  curvedSaddle(kit,horse,P.gold,{width:.43,height:.065,depth:.37,lift:.08,endRise:.018});
  for(const z of [-.178,.178])ellipsoid(kit,horse,P.ink,.027,.56,1.61,z,1,1,1,8,6);
  kit.cylinder(.029,.029,2.85,P.gold,-.07,1.69,0,horse);
  return batchHorseDecoration(horse);
}
