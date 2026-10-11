import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
/** Quiet, physical directions: the bat rack is the landmark, the cream pad is the action. */
export function buildBaseballWayfinding(parent,entry){
 const k=createToyKit(parent),board=new THREE.Group();board.name='baseball.wayfinding-board';board.position.set(-2.4,1.60,-9.4);board.rotation.y=Math.PI/2;parent.add(board);
 k.box(.98,.78,.11,'#a57d54',0,0,0,.07,board);
 for(const x of[-.24,.24])k.box(.065,.84,.065,'#a57d54',x,-.78,0,.014,board);
 // The campus field is rotated: face its actual entrance camera, with matching reverse art.
 for(const side of[1,-1]){const face=new THREE.Group();face.name=`baseball.board-face.${side}`;face.rotation.y=side===1?0:Math.PI;board.add(face);
  k.box(.86,.66,.022,'#fff1d3',0,0,.065,.055,face);
  for(const sign of[-1,1]){const bat=k.cylinder(.042,.024,.71,'#bd8c57',0,0,.092,face);bat.rotation.z=sign*.7;}
  k.sphere(.213,'#fffaf0',0,0,.119,1,1,.28,face);
  for(const sign of[-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(sign*.10,-.13,.159),new THREE.Vector3(sign*.058,0,.182),new THREE.Vector3(sign*.10,.13,.159)]);const seam=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.007,5,false),k.mat('#bd6253'));face.add(seam);}
 }
 const ground=(name,points,color)=>{const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),k.mat(color));mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.y=.044;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 ground('baseball.path-arrow',[[-.11,-6.85],[.11,-6.85],[.11,-7.51],[.33,-7.51],[0,-7.94],[-.33,-7.51],[-.11,-7.51]],'#fff3cf');
 const pad=new THREE.Group();pad.name='baseball.start-pad';pad.position.set(entry.x,.046,entry.z);parent.add(pad);
 const disk=new THREE.Mesh(new THREE.CircleGeometry(.39,32),k.mat('#fff1c9'));disk.rotation.x=-Math.PI/2;disk.receiveShadow=true;pad.add(disk);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.39,.43,32),k.mat('#65968a'));ring.rotation.x=-Math.PI/2;ring.position.y=.001;pad.add(ring);
 const ball=new THREE.Mesh(new THREE.CircleGeometry(.18,24),k.mat('#fffaf0'));ball.rotation.x=-Math.PI/2;ball.position.y=.002;pad.add(ball);
 for(const sign of[-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(sign*.084,.005,-.13),new THREE.Vector3(sign*.046,.005,0),new THREE.Vector3(sign*.084,.005,.13)]);pad.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.006,4,false),k.mat('#bd6253')));}
 return {board,pad};
}
