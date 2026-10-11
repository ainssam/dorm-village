import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {buildCastleExterior,inspectCastleExterior,disposeCastleExterior,CASTLE_SPEC} from '../source/castle-exterior.mjs';

const EPS=1e-5;
const insideOldGround=(x,z)=>[-1,1].some(sign=>
  (Math.abs(x-sign*3.1)<=.89+EPS&&Math.abs(z)<=.9+EPS)||
  (Math.abs(x-sign*4.09)<=.54+EPS&&Math.abs(z)<=.27+EPS));

function sourceVertices(root,fn) {
  root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
    if(o.userData.sourceRanges)for(const r of o.userData.sourceRanges)for(let i=r.start;i<r.start+r.count;i++)fn(new T.Vector3().fromBufferAttribute(p,i),r,o);
    else for(let i=0;i<p.count;i++)fn(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),{name:o.name,kind:'original-standalone'},o);
  });
}

test('budget includes the exact arch, both supports, and reserves the owner label',()=>{
  const root=buildCastleExterior(T),m=inspectCastleExterior(T,root);
  assert.equal(root.name,'amusement.castle');assert.deepEqual(root.position.toArray(),[0,0,0]);
  assert(m.triangles+2<=6800,JSON.stringify(m));assert(m.meshes<=40);assert.equal(m.meshes,24);
  assert(118382-5286+m.triangles+2<=120000);
  assert(m.max[0]<=4.605+EPS&&m.min[0]>=-4.605-EPS);
  assert(m.max[1]>=8.5&&m.max[1]<=9.01);
  for(const side of ['left','right'])assert(root.getObjectByName(`amusement.castle.tower.${side}`));
  assert(root.getObjectByName('amusement.castle.gateway'));
  assert.deepEqual(root.getObjectByName('amusement.castle.sign-anchor').position.toArray(),[0,3.52,.135]);
  disposeCastleExterior(root);
});

test('all actual new vertices below 3.7m are within the old ground blocker union',()=>{
  const root=buildCastleExterior(T);root.updateMatrixWorld(true);let checked=0;
  sourceVertices(root,(p,r)=>{
    assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z),`${r.name} finite`);
    if(r.kind!=='new'||p.y>=3.7-EPS)return;
    checked++;assert(insideOldGround(p.x,p.z),`${r.name}: ${p.toArray()} escaped old tower/wing colliders`);
    assert(Math.abs(p.x)<=4.605+EPS&&Math.abs(p.z)<=.95+EPS);
  });
  assert(checked>3000);disposeCastleExterior(root);
});

test('all new gateway solid vertices are above the retained passage and plaque remains readable',()=>{
  const root=buildCastleExterior(T);let checked=0;
  sourceVertices(root,(p,r,o)=>{if(r.kind==='new'&&o.parent.name==='amusement.castle.gateway'){checked++;assert(p.y>=3.7-EPS,`${r.name} at ${p.y}`);}});
  assert(checked>3000);
  const ray=new T.Raycaster(new T.Vector3(0,3.52,2),new T.Vector3(0,0,-1));
  root.updateMatrixWorld(true);const hit=ray.intersectObject(root,true)[0];
  assert(hit);assert(Math.abs(hit.point.z-.125)<EPS,'plaque is the first visible surface behind label');
  disposeCastleExterior(root);
});

test('real unbatched arch and posts are byte-identical to the required original primitives',()=>{
  const root=buildCastleExterior(T),arch=root.getObjectByName('gateway.original-arch');
  const original=new T.TorusGeometry(2.22,.18,8,40,Math.PI);
  assert.equal(arch.geometry.type,'TorusGeometry');assert.deepEqual(arch.position.toArray(),[0,1.1,0]);
  assert.deepEqual(arch.geometry.attributes.position.array,original.attributes.position.array);
  assert.deepEqual(arch.geometry.index.array,original.index.array);
  for(const x of [-2.22,2.22]) {
    const post=root.getObjectByName(`gateway.original-post.${x}`),g=new RoundedBoxGeometry(.36,1.1,.36,1,.12);
    assert.equal(post.geometry.type,'RoundedBoxGeometry');assert.deepEqual(post.geometry.parameters,g.parameters);
    assert.deepEqual(post.position.toArray(),[x,.55,0]);assert.deepEqual(post.geometry.attributes.position.array,g.attributes.position.array);g.dispose();
  }
  original.dispose();disposeCastleExterior(root);
});

test('the passage is unobstructed along representative full-height walking rays',()=>{
  const root=buildCastleExterior(T);root.updateMatrixWorld(true);let rays=0;
  // Same arch imposes the same curved headroom: wide below, narrower near its crest.
  for(const [halfWidth,height] of [[1.95,.05],[1.95,.5],[1.95,1.0],[1.5,2.0],[.9,2.8]]) {
    for(let i=0;i<=20;i++) {
      const x=-halfWidth+2*halfWidth*i/20;
      for(const direction of [-1,1]) {
        const ray=new T.Raycaster(new T.Vector3(x,height,direction*2),new T.Vector3(0,0,-direction),0,4);
        assert.equal(ray.intersectObject(root,true).length,0,`blocked passage x=${x}, y=${height}`);rays++;
      }
    }
  }
  assert.equal(rays,210);disposeCastleExterior(root);
});

test('fading one spatial zone cannot mutate another zone material',()=>{
  const root=buildCastleExterior(T),a=root.getObjectByName('amusement.castle.left.cream'),b=root.getObjectByName('amusement.castle.right.cream'),c=root.getObjectByName('amusement.castle.gateway.cream');
  assert.notEqual(a.material,b.material);assert.notEqual(a.material,c.material);a.material.opacity=.2;
  assert.equal(b.material.opacity,1);assert.equal(c.material.opacity,1);disposeCastleExterior(root);
});

test('each build owns all resources and disposal fires exactly once',()=>{
  const a=buildCastleExterior(T),b=buildCastleExterior(T),geos=new Set(),mats=new Set();let gd=0,md=0;
  a.traverse(o=>{if(o.isMesh){geos.add(o.geometry);mats.add(o.material);}});
  b.traverse(o=>{if(o.isMesh){assert(!geos.has(o.geometry));assert(!mats.has(o.material));}});
  for(const g of geos)g.addEventListener('dispose',()=>gd++);for(const m of mats)m.addEventListener('dispose',()=>md++);
  disposeCastleExterior(a);disposeCastleExterior(a);assert.equal(gd,geos.size);assert.equal(md,mats.size);disposeCastleExterior(b);
});


test('only separate glass batches opt into the existing night mood contract',()=>{
  const root=buildCastleExterior(T);let glass=0;
  root.traverse(o=>{if(!o.isMesh)return;
    if(o.userData.nightWindow){glass++;assert(o.name.endsWith('.glass'));assert(o.userData.sourceRanges.every(r=>r.name.endsWith('.mint-glass')));assert(o.material.emissive);}
    else assert(!o.name.endsWith('.glass'));
  });
  assert.equal(glass,3);disposeCastleExterior(root);
});

test('clipped low triangle edges and interiors cannot bridge outside the old blocker union',(t)=>{
  const root=buildCastleExterior(T);let checked=0;
  function clippedLow(vertices) {
    const out=[];
    for(let i=0;i<vertices.length;i++) {
      const a=vertices[i],b=vertices[(i+1)%vertices.length],ia=a.y<=3.7-EPS,ib=b.y<=3.7-EPS;
      if(ia)out.push(a);
      if(ia!==ib){const t=(3.7-EPS-a.y)/(b.y-a.y);out.push(a.clone().lerp(b,t));}
    }
    return out;
  }
  root.traverse(o=>{if(!o.isMesh||!o.userData.sourceRanges)return;
    const attr=o.geometry.attributes.position;
    for(const r of o.userData.sourceRanges){if(r.kind!=='new')continue;
      for(let i=r.start;i<r.start+r.count;i+=3) {
        const poly=clippedLow([0,1,2].map(k=>new T.Vector3().fromBufferAttribute(attr,i+k)));if(!poly.length)continue;
        const centroid=poly.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/poly.length);
        const samples=[centroid,...poly.map((p,k)=>p.clone().lerp(poly[(k+1)%poly.length],.5))];
        for(const p of samples){assert(insideOldGround(p.x,p.z),`${r.name} triangle escaped at ${p.toArray()}`);checked++;}
      }
    }
  });
  assert(checked>3000);t.diagnostic(`${checked} clipped triangle edge/interior samples checked`);disposeCastleExterior(root);
});

test('both low wing panes remain visible in front of their actual solid walls',()=>{
  const root=buildCastleExterior(T);root.updateMatrixWorld(true);
  for(const sign of [-1,1]){
    const ray=new T.Raycaster(new T.Vector3(sign*4.06+.06,.69,1),new T.Vector3(0,0,-1));
    const hit=ray.intersectObject(root,true)[0];assert(hit);assert(hit.object.name.endsWith('.glass'),`wing pane hidden by ${hit.object.name}`);
  }
  disposeCastleExterior(root);
});

test('all three bridge layers physically overlap both actual tower surfaces above the arch',(t)=>{
  const root=buildCastleExterior(T),probes=[];
  function actualPart(name) {
    let found;
    root.traverse(o=>{if(!o.isMesh||!o.userData.sourceRanges)return;
      const r=o.userData.sourceRanges.find(r=>r.name===name);if(!r)return;
      const p=o.geometry.attributes.position.array.slice(r.start*3,(r.start+r.count)*3);
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));
      found=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));found.name=name;probes.push(found);
    });
    assert(found,`missing actual source triangles for ${name}`);return found;
  }
  const layers=[
    [actualPart('gateway.bridge.pedestal'),[3.74,3.84,3.94]],
    [actualPart('gateway.bridge.cornice'),[4.03]],
    [actualPart('gateway.bridge.gold-line'),[4.094]],
  ];
  let checked=0,minOverlap=Infinity;
  for(const sign of [-1,1]) {
    const tower=actualPart(`${sign<0?'left':'right'}.main-tower.shaft`);
    for(const [beam,heights] of layers)for(const y of heights)for(const z of [-.3,0,.3]) {
      const ray=new T.Raycaster(new T.Vector3(0,y,z),new T.Vector3(sign,0,0),0,4.1);
      const beamHits=ray.intersectObject(beam,false),towerHits=ray.intersectObject(tower,false);
      assert(beamHits.length&&towerHits.length,`${beam.name} / ${tower.name} missing real surface intersection`);
      // Starting inside the bridge, its first actual-triangle hit is the exit.
      // Starting outside the tower, its first actual-triangle hit is the entry.
      const overlap=beamHits[0].distance-towerHits[0].distance;
      assert(overlap>.08,`${beam.name} disconnected from ${tower.name} at y=${y}, z=${z}: ${overlap}`);
      minOverlap=Math.min(minOverlap,overlap);checked++;
    }
  }
  assert.equal(checked,30);t.diagnostic(`${checked} real triangle junction probes; minimum overlap ${minOverlap.toFixed(4)} units`);
  for(const p of probes){p.geometry.dispose();p.material.dispose();}disposeCastleExterior(root);
});
