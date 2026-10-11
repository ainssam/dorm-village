import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Lightweight open-passage castle exterior. Original procedural 3D geometry.
 * No textures, event handlers, collision mutations, or game state.
 * +Y up, decorated front +Z, local ground origin. Owner places z=4.85.
 */
export const CASTLE_SPEC = Object.freeze({
  version:'1.0.1', triangleLimit:6798, meshLimit:40, centralNewSolidMinY:3.7,
  outerHalfWidth:4.605, groundHalfDepth:.95,
  worldPlacement:{x:0,y:0,z:4.85},
  arch:{radius:2.22,tube:.18,radialSegments:8,tubularSegments:40,arc:Math.PI,y:1.1},
});
export const CASTLE_PALETTE = Object.freeze({
  cream:'#f5ead5', light:'#fff3d9', rose:'#dda0b5', roseShade:'#bd7e99',
  mint:'#78b7b1', glass:'#78b7b1', gold:'#cda84f', recess:'#667d79',
});

export function buildCastleExterior(T) {
  const root=new T.Group(); root.name='amusement.castle';
  const zones={};
  for(const [key,name] of Object.entries({left:'amusement.castle.tower.left',right:'amusement.castle.tower.right',gateway:'amusement.castle.gateway'})) {
    zones[key]=new T.Group();zones[key].name=name;root.add(zones[key]);
  }
  const materials={};
  function material(key,zone) {
    const id=`${zone}:${key}`;
    if(!materials[id]) {
      const mat=new T.MeshStandardMaterial({color:CASTLE_PALETTE[key],roughness:key==='gold'?.49:.84,metalness:key==='gold'?.26:0});
      mat.name=`amusement.castle.material.${zone}.${key}`;materials[id]=mat;
    }
    return materials[id];
  }
  const batches=new Map(),parts=[];
  function add(name,geo,mat,zone,x=0,y=0,z=0,rotationY=0,rotationZ=0,kind='new') {
    geo.rotateY(rotationY);if(rotationZ)geo.rotateZ(rotationZ);geo.translate(x,y,z);
    const flat=geo.index?geo.toNonIndexed():geo;
    if(flat!==geo)geo.dispose();
    flat.computeBoundingBox();
    const box=flat.boundingBox;
    parts.push({name,zone,kind,material:mat,triangles:flat.attributes.position.count/3,
      min:box.min.toArray(),max:box.max.toArray()});
    flat.userData={partIndex:parts.length-1,name,kind};
    const key=`${zone}:${mat}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(flat);
  }
  function standalone(name,geo,mat,zone,x,y,z,kind) {
    const mesh=new T.Mesh(geo,material(mat,zone));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.castleOwned=true;zones[zone].add(mesh);
    geo.computeBoundingBox();const b=geo.boundingBox.clone().translate(new T.Vector3(x,y,z));
    parts.push({name,zone,kind,material:mat,triangles:(geo.index?geo.index.count:geo.attributes.position.count)/3,min:b.min.toArray(),max:b.max.toArray()});
  }
  const box=(name,w,h,d,mat,zone,x,y,z=0,ry=0,rz=0,kind='new')=>add(name,new T.BoxGeometry(w,h,d),mat,zone,x,y,z,ry,rz,kind);
  const cyl=(name,rt,rb,h,mat,zone,x,y,z=0,segments=12)=>add(name,new T.CylinderGeometry(rt,rb,h,segments,1,false),mat,zone,x,y,z);
  const lathe=(name,points,mat,zone,x,z=0,segments=16)=>add(name,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),segments),mat,zone,x,0,z);
  function polygon(name,points,depth,mat,zone,x,y,z=0,ry=0) {
    const shape=new T.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();
    add(name,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1}),mat,zone,x,y,z,ry);
  }
  function bevelBox(name,w,h,d,r,mat,zone,x,y,z=0,kind='new') {
    // Eight-sided footprint with broad faces and small true 3D chamfers.
    const a=w/2,b=d/2,s=new T.Shape();
    const points=[[-a+r,-b],[a-r,-b],[a,-b+r],[a,b-r],[a-r,b],[-a+r,b],[-a,b-r],[-a,-b+r]];
    s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);
    add(name,g,mat,zone,x,y,z,0,0,kind);
  }
  const archPoints=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h*.59],[w*.31,h*.84],[0,h],[-w*.31,h*.84],[-w/2,h*.59]];
  function window(name,w,h,zone,x,y,z,ry=0,trim=.06) {
    const outer=archPoints(w+trim*2,h+trim*1.65),inner=archPoints(w,h);
    const s=new T.Shape();s.moveTo(outer[0][0],outer[0][1]-trim);for(const p of outer.slice(1))s.lineTo(p[0],p[1]-trim);s.closePath();
    const hole=new T.Path();hole.moveTo(...inner[0]);for(const p of inner.slice(1))hole.lineTo(...p);hole.closePath();s.holes.push(hole);
    const frame=new T.ExtrudeGeometry(s,{depth:.065,bevelEnabled:false,curveSegments:1,steps:1});
    add(`${name}.stone-frame`,frame,'light',zone,x,y,z,ry);
    const pane=new T.Shape();pane.moveTo(...inner[0]);for(const p of inner.slice(1))pane.lineTo(...p);pane.closePath();
    const glass=new T.ShapeGeometry(pane,1);glass.translate(0,0,.018);add(`${name}.mint-glass`,glass,'glass',zone,x,y,z,ry);
    const place=(dx,dy,dz)=>[x+Math.cos(ry)*dx+Math.sin(ry)*dz,y+dy,z-Math.sin(ry)*dx+Math.cos(ry)*dz];
    const wing=name.includes('.wing.');
    box(`${name}.sill`,w+trim*3,.075,wing?.10:.14,'light',zone,...place(0,-trim,wing?.025:.035),ry);
    box(`${name}.mullion`,.023,h*.72,.025,'gold',zone,...place(0,h*.36,.054),ry);
    add(`${name}.crossbar`,new T.PlaneGeometry(w*.79,.022),'gold',zone,...place(0,h*.36,.069),ry);
  }
  function ring(name,r,y,zone,x,z=0,segments=16,gold=true) {
    lathe(`${name}.moulding`,[[r-.02,y-.07],[r+.065,y+.005],[r+.01,y+.10]],'light',zone,x,z,segments);
    if(gold)lathe(`${name}.gold-edge`,[[r+.066,y+.052],[r+.066,y+.078]],'gold',zone,x,z,segments);
  }
  function roof(name,r,h,y,zone,x,z=0,{segments=12,seams=3,flag=false,star=false}={}) {
    const profile=[[r*.96,y],[r,y+.06],[r*.83,y+h*.23],[r*.57,y+h*.53],[r*.27,y+h*.82],[.019,y+h]];
    lathe(`${name}.rose-roof`,profile,'rose',zone,x,z,segments);
    lathe(`${name}.gold-eave`,[[r*1.015,y-.025],[r*1.015,y+.02],[r*.998,y+.055]],'gold',zone,x,z,segments);
    function rad(t) {const yy=y+h*t;for(let i=1;i<profile.length;i++){const p=profile[i-1],q=profile[i];if(yy<=q[1])return p[0]+(q[0]-p[0])*(yy-p[1])/(q[1]-p[1]);}return .019;}
    for(let i=1;i<=seams;i++) {const t=i/(seams+1),rr=rad(t)+.007;lathe(`${name}.tile-course.${i}`,[[rr,y+h*t],[rr-.008,y+h*t+.018]],'roseShade',zone,x,z,segments);}
    const poleH=flag?.38:star?.20:.15;
    cyl(`${name}.finial`,.011,.025,poleH,'gold',zone,x,y+h+poleH/2,z,6);
    if(flag)polygon(`${name}.mint-pennant`,[[0,0],[.29,.02],[.23,.09],[.29,.17],[0,.16]],.014,'mint',zone,x+.015,y+h+.19,z);
    if(star)starShape(`${name}.star`,.14,zone,x,y+h+.19,z);
  }
  function starShape(name,r,zone,x,y,z) {
    const pts=[];for(let i=0;i<16;i++){const a=Math.PI/2+i*Math.PI/8,rr=i%2?r*.24:r*(i%4===0?1:.57);pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
    polygon(name,pts,.035,'gold',zone,x,y,z);
  }
  function slits(name,r,y,zone,x,z=0,count=8) {
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count;
      add(`${name}.${i}`,new T.PlaneGeometry(.09,.17),'mint',zone,x+Math.sin(a)*r,y,z+Math.cos(a)*r,a);
    }
  }
  function smallTower(name,x,y,z,r,wallH,roofH,zone,{segments=10,seams=2}={}) {
    cyl(`${name}.shaft`,r*.96,r,wallH,'cream',zone,x,y+wallH/2,z,segments);
    ring(`${name}.base`,r,y+.10,zone,x,z,segments,false);
    ring(`${name}.crown`,r,y+wallH-.035,zone,x,z,segments);
    slits(`${name}.slits`,r*.98,y+wallH-.23,zone,x,z,6);
    roof(`${name}.roof`,r*1.16,roofH,y+wallH+.10,zone,x,z,{segments,seams});
  }

  // Two ground towers: all new low geometry stays inside the existing rectangles.
  for(const sign of [-1,1]) {
    const zone=sign<0?'left':'right',x=sign*3.1,name=`${zone}.main-tower`;
    cyl(`${name}.foot`,.835,.86,.18,'cream',zone,x,.09,0,16);
    cyl(`${name}.shaft`,.735,.79,4.22,'cream',zone,x,2.29,0,16);
    ring(`${name}.base`,.79,.22,zone,x,0,16,false);
    for(const y of [1.05,2.45,3.72])lathe(`${name}.stone-course.${y}`,[[.784-(y/4.4)*.045,y],[.784-(y/4.4)*.045,y+.018]],'light',zone,x,0,16);
    ring(`${name}.shoulder`,.735,4.06,zone,x,0,16,false);
    slits(`${name}.gallery`,.746,4.26,zone,x,0,10);
    ring(`${name}.cap`,.76,4.43,zone,x);
    window(`${name}.front-window`,.40,1.18,zone,x,1.18,.785,0,.055);
    window(`${name}.outer-window`,.34,1.04,zone,x+sign*.76,2.63,0,sign*Math.PI/2,.047);
    roof(`${name}.roof`,.885,1.88,4.58,zone,x,0,{segments:12,seams:4,flag:true});

    // Shallow outward wing never adds a slab to the central passage.
    const wx=sign*4.06;
    bevelBox(`${zone}.wing.wall`,1.01,1.31,.37,.10,'cream',zone,wx,.655);
    bevelBox(`${zone}.wing.plinth`,1.06,.12,.49,.10,'light',zone,wx,.06);
    box(`${zone}.wing.eave`,1.06,.11,.49,'light',zone,wx,1.335);
    box(`${zone}.wing.gold-edge`,1.06,.025,.50,'gold',zone,wx,1.402);
    // Windows front/back are deliberately thin to stay within z ±.27.
    window(`${zone}.wing.window`,.27,.70,zone,wx,.30,.19,0,.035);
    for(const dx of [-.40,.40])box(`${zone}.wing.corner`,.07,1.08,.46,'light',zone,wx+dx,.74);
    for(const dx of [-.39,0,.39])box(`${zone}.wing.crenel.${dx}`,.16,.25,.43,'cream',zone,wx+dx,1.55);
    smallTower(`${zone}.outer-pinnacle`,wx,1.72,0,.18,.50,.77,zone,{segments:8,seams:2});
  }

  // Original arch curve and supports. The arch remains completely open.
  const archGeo=new T.TorusGeometry(2.22,.18,8,40,Math.PI);
  standalone('gateway.original-arch',archGeo,'cream','gateway',0,1.1,0,'original-arch');
  for(const x of [-2.22,2.22])standalone(`gateway.original-post.${x}`,new RoundedBoxGeometry(.36,1.1,.36,1,.12),'cream','gateway',x,.55,0,'original-post');
  for(const x of [-2.53,2.53])bevelBox(`gateway.original-brace.${x}`,.75,.25,.36,.08,'cream','gateway',x,1.35,0,'original-brace');
  bevelBox('gateway.original-mint-plaque',2.16,.44,.25,.11,'mint','gateway',0,3.51,0,'original-plaque');
  const signAnchor=new T.Object3D();signAnchor.name='amusement.castle.sign-anchor';signAnchor.position.set(0,3.52,.135);zones.gateway.add(signAnchor);

  // All additional central solids start at or above y=3.7.
  // These wide bridge layers physically overlap both original tower shafts;
  // the central hall is supported by that connection above the open passage.
  bevelBox('gateway.bridge.pedestal',5.05,.28,1.36,.14,'cream','gateway',0,3.84);
  bevelBox('gateway.bridge.cornice',5.15,.10,1.45,.15,'light','gateway',0,4.03);
  box('gateway.bridge.gold-line',5.12,.028,1.44,'gold','gateway',0,4.094);
  bevelBox('gateway.upper-hall',2.31,1.53,1.18,.12,'cream','gateway',0,4.885,-.035);
  for(const sign of [-1,1]) {
    for(let i=0;i<5;i++)box(`gateway.hall.quoin.${sign}.${i}`,.22,.11,.08,'light','gateway',sign*1.035,4.27+i*.29,.59);
    window(`gateway.hall.side-window.${sign}`,.42,1.08,'gateway',sign*1.17,4.29,-.005,sign*Math.PI/2,.05);
    smallTower(`gateway.high-pinnacle.${sign}`,sign*1.49,4.12,-.04,.29,1.14,1.02,'gateway',{segments:8,seams:3});
  }
  window('gateway.hall.main-window',.80,1.24,'gateway',0,4.22,.562,0,.07);
  box('gateway.hall.eave',2.48,.12,1.33,'light','gateway',0,5.70,-.035);

  // A rose front gable with real front and rear faces, ivory ridges, gold medallion.
  polygon('gateway.gable',[[ -1.27,0],[1.27,0],[0,1.14]],.24,'rose','gateway',0,5.72,.40);
  for(const sign of [-1,1]){
    const a=new T.Vector3(sign*1.32,5.70,.67),b=new T.Vector3(0,6.91,.67),mid=a.clone().add(b).multiplyScalar(.5);
    const g=new T.CylinderGeometry(.042,.042,a.distanceTo(b),6,1,false);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));
    add(`gateway.gable.ridge.${sign}`,g,'light','gateway',...mid.toArray());
  }
  box('gateway.gable.gold-base',2.59,.035,.12,'gold','gateway',0,5.77,.66);
  for(let i=0;i<9;i++)box(`gateway.gable.crest.${i}`,.085,.11,.10,'light','gateway',-.98+i*.245,5.81,.67);
  const med=new T.CylinderGeometry(.18,.18,.025,16,1,false);med.rotateX(Math.PI/2);
  add('gateway.gable.medallion',med,'gold','gateway',0,6.20,.671);
  const medInset=new T.CylinderGeometry(.151,.151,.028,16,1,false);medInset.rotateX(Math.PI/2);
  add('gateway.gable.medallion-inset',medInset,'roseShade','gateway',0,6.20,.688);
  starShape('gateway.gable.star',.135,'gateway',0,6.20,.71);

  // Center drum, layered roof, lantern and summit create the tallest silhouette.
  cyl('gateway.center-drum',.70,.75,1.15,'cream','gateway',0,6.35,-.12,16);
  ring('gateway.center-drum.base',.75,5.89,'gateway',0,-.12,16,false);
  // The front gable masks the drum front; its visible side windows carry the detail.
  for(const sign of [-1,1])window(`gateway.center-drum.side.${sign}`,.28,.65,'gateway',sign*.693,6.16,-.12,sign*Math.PI/2,.04);
  ring('gateway.center-drum.crown',.735,6.96,'gateway',0,-.12);
  roof('gateway.center-tier',.89,.61,7.07,'gateway',0,-.12,{segments:12,seams:2});
  cyl('gateway.lantern',.43,.46,.73,'cream','gateway',0,7.765,-.12,12);
  ring('gateway.lantern.base',.45,7.43,'gateway',0,-.12,12,false);
  window('gateway.lantern.front',.25,.50,'gateway',0,7.52,.313,0,.035);
  for(const sign of [-1,1])window(`gateway.lantern.side.${sign}`,.22,.46,'gateway',sign*.43,7.54,-.12,sign*Math.PI/2,.033);
  ring('gateway.lantern.crown',.44,8.14,'gateway',0,-.12,12);
  roof('gateway.summit',.57,.42,8.25,'gateway',0,-.12,{segments:12,seams:2,star:true});

  // Merge only within a spatial zone/material: independently faded towers survive.
  for(const [key,geos] of batches) {
    const [zone,mat]=key.split(':'),count=geos.reduce((n,g)=>n+g.attributes.position.count,0);
    const p=new Float32Array(count*3),n=new Float32Array(count*3),ranges=[];let at=0;
    for(const g of geos){ranges.push({...g.userData,start:at/3,count:g.attributes.position.count});p.set(g.attributes.position.array,at);n.set(g.attributes.normal.array,at);at+=g.attributes.position.array.length;g.dispose();}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('normal',new T.BufferAttribute(n,3));geo.computeBoundingBox();geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,material(mat,zone));mesh.name=`amusement.castle.${zone}.${mat}`;mesh.castShadow=mesh.receiveShadow=true;mesh.userData={castleOwned:true,sourceRanges:ranges};if(mat==='glass')mesh.userData.nightWindow=true;zones[zone].add(mesh);
  }
  root.userData={castleOwned:true,assetVersion:CASTLE_SPEC.version,scope:'exterior-visual-only',frontAxis:'+Z',upAxis:'Y',
    triangleLimit:CASTLE_SPEC.triangleLimit,parts,disposal:'Call disposeCastleExterior(root) once after detaching; resources are owned by this instance.',
    reference:'approved-day-v1 + refined r2, adapted for unchanged open passage and footprint',
    ownership:'All descendant meshes, geometries, and materials are owned exclusively by this build call.'};
  const metrics=inspectCastleExterior(T,root);
  if(metrics.triangles>CASTLE_SPEC.triangleLimit||metrics.meshes>CASTLE_SPEC.meshLimit)throw new Error(`Castle budget exceeded: ${JSON.stringify(metrics)}`);
  return root;
}

export function inspectCastleExterior(T,root) {
  let meshes=0,triangles=0;const materials=new Set();
  root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;for(const m of [].concat(o.material))materials.add(m);}});
  const bounds=new T.Box3().setFromObject(root);
  return {meshes,triangles,materials:materials.size,min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new T.Vector3()).toArray(),parts:root.userData.parts?.length??0};
}

export function disposeCastleExterior(root) {
  if(root.userData.castleDisposed)return;
  const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.isMesh){geos.add(o.geometry);for(const m of [].concat(o.material))mats.add(m);}});
  for(const g of geos)g.dispose();for(const m of mats)m.dispose();root.userData.castleDisposed=true;
}
