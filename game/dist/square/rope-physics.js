import {createRopeTriangleContact} from './rope-triangle-contact.js';
import * as THREE from 'three';
import {sampleRopeCurve,ROPE_RADIUS} from './rope-curve.js';
export const ROPE_CLEARANCE=.04,ROPE_COLLISION_SEGMENTS=128;
export function createRopePhysics({gripsAt,contactBoxes,contactTriangles}){
 if(typeof gripsAt!=='function'||!contactBoxes||!Object.keys(contactBoxes).length)throw new TypeError('Measured rope/actor profiles required');
 const trees=new Map();if(contactTriangles)for(const[actor,groups]of Object.entries(contactTriangles))for(const group of groups)trees.set(actor+'|'+group.label,createRopeTriangleContact(group.positions));
 const volumes=[];for(const[actor,boxes]of Object.entries(contactBoxes))for(const entry of boxes){if(!entry.min?.every(Number.isFinite)||!entry.max?.every(Number.isFinite))throw new TypeError('Finite actual-mesh contact envelopes required');const box=new THREE.Box3(new THREE.Vector3(...entry.min),new THREE.Vector3(...entry.max));box.min.addScalar(-ROPE_RADIUS);box.max.addScalar(ROPE_RADIUS);box.min.y-=ROPE_CLEARANCE;volumes.push({actor,label:entry.label,box});}
 const buffers={from:new Float64Array((ROPE_COLLISION_SEGMENTS+1)*3),to:new Float64Array((ROPE_COLLISION_SEGMENTS+1)*3),xzBounds:new Float64Array(ROPE_COLLISION_SEGMENTS*4)},a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3(),triangle=new THREE.Triangle();
 function sweep({fromPhase,toPhase,fromJumps,toJumps}){
  sampleRopeCurve(gripsAt(fromPhase),fromPhase,buffers.from);sampleRopeCurve(gripsAt(toPhase),toPhase,buffers.to);for(let i=0;i<ROPE_COLLISION_SEGMENTS;i++){const j=i*3,k=j+3,o=i*4;buffers.xzBounds[o]=Math.min(buffers.from[j],buffers.from[k],buffers.to[j],buffers.to[k]);buffers.xzBounds[o+1]=Math.max(buffers.from[j],buffers.from[k],buffers.to[j],buffers.to[k]);buffers.xzBounds[o+2]=Math.min(buffers.from[j+2],buffers.from[k+2],buffers.to[j+2],buffers.to[k+2]);buffers.xzBounds[o+3]=Math.max(buffers.from[j+2],buffers.from[k+2],buffers.to[j+2],buffers.to[k+2]);}
  const contacts=[],stats={candidateTriangles:0,nodeVisits:0,quadQueries:0};
  for(const{actor,label,box}of volumes){const from=fromJumps[actor]??0,to=toJumps[actor]??0;if(!Number.isFinite(from)||!Number.isFinite(to))throw new TypeError('Finite jump heights required');
   for(let i=0;i<ROPE_COLLISION_SEGMENTS;i++){const j=i*3,k=j+3,o=i*4;if(buffers.xzBounds[o+1]<box.min.x||buffers.xzBounds[o]>box.max.x||buffers.xzBounds[o+3]<box.min.z||buffers.xzBounds[o+2]>box.max.z)continue;const minY=Math.min(buffers.from[j+1]-from,buffers.from[k+1]-from,buffers.to[j+1]-to,buffers.to[k+1]-to),maxY=Math.max(buffers.from[j+1]-from,buffers.from[k+1]-from,buffers.to[j+1]-to,buffers.to[k+1]-to);if(maxY<box.min.y||minY>box.max.y)continue;a.fromArray(buffers.from,j);b.fromArray(buffers.from,k);c.fromArray(buffers.to,k);d.fromArray(buffers.to,j);a.y-=from;b.y-=from;c.y-=to;d.y-=to;
    // A moving rope segment sweeps a quad. Two triangles cover its continuous
    // step, including crossings with no contact at either rendered endpoint.
    
    const tree=trees.get(actor+'|'+label);let hit=false;if(contactTriangles){if(tree){hit=tree.intersectsSweptQuad(a,b,c,d,ROPE_RADIUS+(/foot/.test(label)?ROPE_CLEARANCE:0));stats.candidateTriangles+=tree.lastCandidates;stats.nodeVisits+=tree.lastNodes;stats.quadQueries++;}}else{triangle.set(a,b,c);hit=box.intersectsTriangle(triangle);if(!hit){triangle.set(a,c,d);hit=box.intersectsTriangle(triangle);}}if(hit){contacts.push({actor,label,segment:i});break;}
   }
  }
  return{hit:contacts.length>0,contacts,stats};
 }
 return{sweep,buffers,diagnostics:()=>({curveScratchBytes:Object.values(buffers).reduce((n,b)=>n+b.byteLength,0),triangleCount:[...trees.values()].reduce((n,t)=>n+t.count,0),profileBufferBytes:[...trees.values()].reduce((n,t)=>n+t.bufferBytes,0),segments:ROPE_COLLISION_SEGMENTS,clearance:ROPE_CLEARANCE,volumes:volumes.map(v=>({actor:v.actor,label:v.label,min:v.box.min.toArray(),max:v.box.max.toArray()}))})};
}
