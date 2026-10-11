/**
 * Original Dormi compact claw cabinet. Procedural, dependency-injected Three.js.
 * Y-up; ground Y=0; front +Z. The caller owns every animation and game rule.
 * No imported assets, textures, lighting, event handlers, timers, or game state.
 * MIT license. See PROVENANCE.md and LICENSE.txt.
 */
export function buildClawCabinet(THREE) {
  const palette = Object.freeze({cream:'#fff9eb',rose:'#dd9277',mint:'#78b7a0',gold:'#f4c75a',ink:'#253e46'});
  const material = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0});
  material.name='claw.cabinet.clay';
  const ownedGeometries = new Set();
  const root = new THREE.Group(); root.name='claw.cabinet';
  const colors = Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,new THREE.Color(v)]));
  const depthCenterOffset=.0436;
  const limits=Object.freeze({
    x:Object.freeze([-.304,.304]), z:Object.freeze([-.213-depthCenterOffset,.30-depthCenterOffset]),
    clawY:Object.freeze([1.31,1.90]), jawAngle:Object.freeze([.04,.52]),
    wellFloorY:1.05, cableTopY:1.958, overheadUndersideY:1.9551563263,
    well:Object.freeze({minX:-.47,maxX:.47,minZ:-.34-depthCenterOffset,maxZ:.34-depthCenterOffset}),
    trayDrop:new THREE.Vector3(-.29,1.42,.29-depthCenterOffset),
    trayLanding:new THREE.Vector3(-.29,1.0875,.29-depthCenterOffset),
    trayClearance:Object.freeze({width:.33,depth:.22,lipTopY:1.1525}),
    trayInterior:Object.freeze({minX:-.455,maxX:-.125,minZ:.18-depthCenterOffset,maxZ:.397-depthCenterOffset}),
  });
  const coordinateSystem=Object.freeze({frontAxis:'+Z',upAxis:'+Y',units:'world units',origin:'ground center'});
  const group=(name,parent=root)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
  // Merge primitive buffers by the one shared vertex-color clay material.
  function part(list,geometry,color,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]) {
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),q,new THREE.Vector3(...scale)));
    const flat=geometry.index?geometry.toNonIndexed():geometry;
    const p=flat.getAttribute('position'), n=flat.getAttribute('normal'), c=colors[color];
    for(let i=0;i<p.count;i++) {
      list.position.push(p.getX(i),p.getY(i),p.getZ(i));
      list.normal.push(n.getX(i),n.getY(i),n.getZ(i));
      list.color.push(c.r,c.g,c.b);
    }
    if(flat!==geometry) flat.dispose();
    geometry.dispose();
  }
  function buffer(){return {position:[],normal:[],color:[]};}
  function finish(list,name,parent=root) {
    const geometry=new THREE.BufferGeometry();
    for(const attribute of ['position','normal','color']) geometry.setAttribute(attribute,new THREE.Float32BufferAttribute(list[attribute],3));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere(); ownedGeometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // 44-triangle bevelled box: six faces, twelve bevel edges, eight corner facets.
  function bevelBox(w,h,d,b=.025) {
    const half=[w/2,h/2,d/2];b=Math.min(b,...half.map(x=>x*.8));
    const points=[];
    for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) {
      const sign=[x,y,z];
      for(let outer=0;outer<3;outer++) points.push(new THREE.Vector3(...half.map((a,i)=>sign[i]*(a-(i===outer?0:b)))));
    }
    const planes=[];
    for(let axis=0;axis<3;axis++) for(const s of [-1,1]) {
      const n=[0,0,0];n[axis]=s;planes.push([new THREE.Vector3(...n),half[axis]]);
    }
    for(let axis=0;axis<3;axis++) for(let other=axis+1;other<3;other++) for(const s of [-1,1]) for(const t of [-1,1]) {
      const n=[0,0,0];n[axis]=s;n[other]=t;planes.push([new THREE.Vector3(...n),half[axis]+half[other]-b]);
    }
    for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) planes.push([new THREE.Vector3(x,y,z),half[0]+half[1]+half[2]-2*b]);
    const positions=[];
    for(const [n,distance] of planes) {
      const face=points.filter(p=>Math.abs(n.dot(p)-distance)<1e-7);
      const center=face.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/face.length);
      const nn=n.clone().normalize();
      const u=new THREE.Vector3().crossVectors(nn,Math.abs(nn.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
      const v=new THREE.Vector3().crossVectors(nn,u);
      const angle=p=>Math.atan2(p.clone().sub(center).dot(v),p.clone().sub(center).dot(u));
      face.sort((a,b)=>angle(a)-angle(b));
      for(let i=1;i<face.length-1;i++) for(const p of [face[0],face[i],face[i+1]]) positions.push(p.x,p.y,p.z);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
  }
  const box=(list,w,h,d,color,x,y,z,bevel=0)=>part(list,bevel?bevelBox(w,h,d,bevel):new THREE.BoxGeometry(w,h,d),color,[x,y,z]);
  const ball=(list,rx,ry,rz,color,x,y,z,segments=8,rings=5)=>part(list,new THREE.SphereGeometry(1,segments,rings),color,[x,y,z],[rx,ry,rz]);
  const cylinder=(list,r,h,color,x,y,z,segments=8)=>part(list,new THREE.CylinderGeometry(r,r,h,segments,1),color,[x,y,z]);
  function star(list,r,depth,color,x,y,z,bevel=0) {
    const shape=new THREE.Shape();
    for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,R=i%2?r*.48:r;const px=Math.cos(a)*R,py=Math.sin(a)*R;i?shape.lineTo(px,py):shape.moveTo(px,py);}
    shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});
    part(list,g,color,[x,y,z-depth/2]);
  }
  function rod(list,a,b,r,color) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(r,r,delta.length(),6,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    part(list,g,color,start.add(end).multiplyScalar(.5).toArray());
  }
  const shell=buffer();
  // Grounded plinth and solid cream pedestal. The actual collection tray is
  // at window level, so there is no misleading closed lower delivery chute.
  box(shell,1.42,.16,1.14,'rose',0,.08,0,.045);
  box(shell,1.30,.77,1.06,'cream',0,.545,.02,.035);
  box(shell,1.19,.060,.015,'mint',0,.35,.558,.015);
  // Mint prize well is exactly at Y=1.05. Its front remains open and readable.
  box(shell,1.32,.075,1.08,'mint',0,1.0025,0,.025);
  box(shell,1.20,.035,.965,'cream',0,1.0325,-.015);
  // Shallow rim sits outside the landing area, which is Y=1.05.
  for(const x of [-.632,.632]) box(shell,.055,.08,1.035,'gold',x,1.09,-.012);
  box(shell,1.27,.08,.045,'gold',0,1.09,-.51);
  // Four slim posts and low rails suggest clear glazing without transparency overdraw.
  for(const x of [-.66,.66]) for(const z of [-.50,.50]) {
    box(shell,.070,1.085,.070,'cream',x,1.5975,z,.014);
    box(shell,.083,.045,.083,'gold',x,1.115,z);
  }
  // Rounded rose canopy and geometric cream/gold marquee.
  box(shell,1.48,.205,1.19,'rose',0,2.2275,-.005,.045);
  box(shell,1.37,.030,1.10,'gold',0,2.11,-.005);
  box(shell,.78,.13,.025,'cream',0,2.235,.596,.020);
  star(shell,.057,.016,'gold',0,2.238,.622,0);
  for(const x of [-.49,.49]) ball(shell,.035,.035,.018,'gold',x,2.235,.602,6,4);
  // Fixed X rails under the canopy. The traveling bridge spans Z.
  for(const z of [-.40,.40]) box(shell,1.15,.025,.028,'ink',0,2.069,z);
  // Slender exposed front panel, at a comfortable original-avatar hand height.
  box(shell,1.18,.100,.29,'rose',0,.9325,.565,.026);
  box(shell,1.04,.022,.23,'gold',0,.9935,.563,.012);
  cylinder(shell,.070,.020,'cream',-.27,1.014,.6447368421,10);
  cylinder(shell,.070,.020,'cream',.26,1.014,.6447368421,10);
  box(shell,.09,.025,.012,'ink',.49,.85,.541);
  star(shell,.07,.018,'mint',0,.79,.552,0);
  // Open-air collection tray. Values below are inverse-authored before the
  // compact fabrication pass. Its landing floor is Y=1.0875 after fabrication.
  const trayBox=(w,h,d,color,x,y,z)=>box(shell,w/.8,h/.9375,d/.76,color,x/.8,1.05+(y-1.05)/.9375,z/.76);
  trayBox(.366,.03,.25,'gold',-.29,1.0725,.29);
  for(const x of [-.464,-.116]) trayBox(.018,.065,.232,'rose',x,1.12,.281);
  trayBox(.366,.065,.018,'rose',-.29,1.12,.406);
  finish(shell,'claw.cabinet.static');
  const prizeTray=group('claw.prizeTray.anchor');prizeTray.position.set(-.29/.8,1.0875,.29/.76);
  const joystick=group('claw.controls.joystick');joystick.position.set(-.27,1.024,.6447368421);
  const stick=buffer();cylinder(stick,.021,.070,'ink',0,.033,0,6);ball(stick,.047,.044,.047,'mint',0,.080,0,8,5);finish(stick,'claw.controls.joystick.mesh',joystick);
  const button=group('claw.controls.button');button.position.set(.26,1.027,.6447368421);
  const press=buffer();cylinder(press,.065,.027,'mint',0,0,0,10);finish(press,'claw.controls.button.mesh',button);

  const carriageX=group('claw.carriageX');
  const bridge=buffer();box(bridge,.052,.050,.86,'gold',0,2.08,0);
  for(const z of [-.40,.40]) box(bridge,.095,.042,.090,'mint',0,2.082,z);
  finish(bridge,'claw.carriageX.bridge',carriageX);
  const carriage=group('claw.carriageZ',carriageX);
  const trolley=buffer();box(trolley,.16,.065,.135,'cream',0,2.048,0,.018);
  finish(trolley,'claw.carriageZ.trolley',carriage);
  // Cable has unit length on local Y, centered at the origin. Caller sets its
  // scale.y = topY - (claw.position.y + .04), position.y = mean of endpoints.
  const cableBuffer=buffer();cylinder(cableBuffer,.011,1,'ink',0,0,0,6);
  const cable=finish(cableBuffer,'claw.hangCable',carriage);
  const claw=group('claw.head',carriage);claw.position.y=1.84;
  const cableBottom=claw.position.y+.04;cable.scale.y=limits.cableTopY-cableBottom;cable.position.y=(limits.cableTopY+cableBottom)/2;
  const head=buffer();cylinder(head,.066,.070,'gold',0,.015,0,8);ball(head,.079,.035,.079,'cream',0,-.025,0,8,4);finish(head,'claw.head.hub',claw);
  const jawBuffer=buffer();
  rod(jawBuffer,[0,0,0],[.062,-.095,0],.013,'gold');
  rod(jawBuffer,[.062,-.095,0],[.055,-.172,0],.013,'gold');
  rod(jawBuffer,[.055,-.172,0],[-.012,-.210,0],.013,'gold');
  const jaws=[];
  for(let i=0;i<3;i++) {
    const mount=group(`claw.jawMount.${i}`,claw);mount.rotation.y=i*Math.PI*2/3;
    const jaw=group(`claw.jaw.${i}`,mount);jaw.position.set(.052,-.031,0);jaw.rotation.z=limits.jawAngle[1];
    if(i===0) finish(jawBuffer,'claw.jaw.finger.0',jaw);
    else {const mesh=new THREE.Mesh(jaws[0].children[0].geometry,material);mesh.name=`claw.jaw.finger.${i}`;mesh.castShadow=true;mesh.receiveShadow=true;jaw.add(mesh);}
    jaws.push(jaw);
  }
  const prizes=[];
  function face(list,y,z,eyeSpread=.036) {
    for(const x of [-eyeSpread,eyeSpread]) ball(list,.011,.014,.006,'ink',x,y,z,6,3);
  }
  // Original generic plush silhouettes. None use character/NPC geometry.
  for(const [kind,x,z] of [['round-bear',-.33,-.13],['long-ear-bunny',.30,-.20],['pocket-star',.13,.25]]) {
    const prize=group(`claw.prize.${kind}`);prize.position.set(x,limits.wellFloorY,z);prize.userData.prizeKind=kind;
    const p=buffer();
    if(kind==='round-bear') {
      ball(p,.143,.157,.113,'rose',0,.165,0);
      for(const side of [-1,1]) {
        ball(p,.050,.050,.041,'rose',side*.102,.294,-.003,6,4);
        ball(p,.044,.037,.061,'rose',side*.072,.037,.041,6,4);
      }
      ball(p,.064,.047,.016,'cream',0,.139,.108,6,4);face(p,.201,.109);
      ball(p,.016,.012,.008,'ink',0,.157,.125,6,3);
    } else if(kind==='long-ear-bunny') {
      ball(p,.112,.141,.091,'mint',0,.141,0);
      ball(p,.107,.094,.093,'mint',0,.289,.006);
      for(const side of [-1,1]) {
        ball(p,.029,.102,.031,'mint',side*.045,.425,-.003,6,4);
        ball(p,.037,.030,.052,'mint',side*.056,.031,.032,6,4);
      }
      ball(p,.062,.076,.012,'cream',0,.128,.084,6,4);face(p,.302,.094,.031);
      ball(p,.012,.009,.006,'rose',0,.274,.103,6,3);
    } else {
      star(p,.164,.10,'gold',0,.15,0,.014);face(p,.175,.066,.035);
      for(const side of [-1,1]) ball(p,.021,.013,.005,'rose',side*.075,.14,.066,6,3);
    }
    finish(p,`claw.prize.${kind}.mesh`,prize);prizes.push(prize);
  }
  // Bake the compact footprint into vertex buffers, not a misleading collider
  // or root scale. Upper structure compresses toward the unchanged well floor.
  const scaled=new Set();
  root.traverse(object=>{
    object.position.x*=.8;object.position.z*=.76;
    if(!object.isMesh || scaled.has(object.geometry)) return;
    scaled.add(object.geometry);object.geometry.scale(.8,1,.76);
    if(['claw.cabinet.static','claw.carriageX.bridge','claw.carriageZ.trolley'].includes(object.name)) {
      const positions=object.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++) if(positions.getY(i)>1.05) positions.setY(i,1.05+(positions.getY(i)-1.05)*.9375);
      positions.needsUpdate=true;object.geometry.computeVertexNormals();
    }
    object.geometry.computeBoundingBox();object.geometry.computeBoundingSphere();
  });
  // Center the measured front/back envelope on the root, including controls.
  for(const object of root.children) {
    if(object.isGroup && object!==carriageX) object.position.z-=depthCenterOffset;
  }
  root.getObjectByName('claw.cabinet.static').geometry.translate(0,0,-depthCenterOffset);
  root.getObjectByName('claw.carriageX.bridge').geometry.translate(0,0,-depthCenterOffset);
  carriage.position.z=-depthCenterOffset;
  for(const prize of prizes) {
    const kind=prize.userData.prizeKind,geometry=prize.children[0].geometry;
    const factor=kind==='round-bear'?.75:kind==='long-ear-bunny'?.55:.8;
    geometry.scale(factor,factor,factor);geometry.computeBoundingBox();
    geometry.translate(0,-geometry.boundingBox.min.y,0);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const point=new THREE.Vector3(0,geometry.boundingBox.max.y-.099,0);
    prize.userData.grip={
      point, radius:kind==='round-bear'?.080:kind==='long-ear-bunny'?.043:.066,
      tolerance:.065, jawAngle:kind==='round-bear'?.24:kind==='long-ear-bunny'?.04:.17,
      startPosition:prize.position.clone(), localBounds:geometry.boundingBox.clone(),
    };
  }
  root.updateMatrixWorld(true);
  const originalClawY=claw.position.y,originalCarriageZ=carriage.position.z;claw.position.y=0;carriage.position.z=0;
  const boundsAt=angle=>{
    for(const jaw of jaws) jaw.rotation.z=angle;
    root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(claw,true);
  };
  const grip={point:new THREE.Vector3(0,-.16,0),openBounds:boundsAt(limits.jawAngle[1]),closedBounds:boundsAt(limits.jawAngle[0])};
  grip.lowestTipY=grip.closedBounds.min.y;
  grip.hubBottomY=-.06;
  for(const prize of prizes) prize.userData.grip.closedClawBounds=boundsAt(prize.userData.grip.jawAngle);
  grip.jawHinges=jaws.map(jaw=>({localPosition:jaw.position.clone(),mountYaw:jaw.parent.rotation.y,rotationAxis:'local Z'}));
  for(const jaw of jaws) jaw.rotation.z=limits.jawAngle[1];
  claw.position.y=originalClawY;carriage.position.z=originalCarriageZ;root.updateMatrixWorld(true);
  let disposed=false;
  // The instance owns resources even if a prize is temporarily reparented.
  function dispose() {
    if(disposed) return;disposed=true;
    for(const prize of prizes) prize.removeFromParent();
    for(const geometry of ownedGeometries) geometry.dispose();
    material.dispose();root.removeFromParent();root.clear();
  }
  return {root,carriageX,carriage,claw,cable,jaws,prizes,joystick,button,prizeTray,limits,coordinateSystem,palette,grip,dispose};
}
