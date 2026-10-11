import * as THREE from 'three';
const UP=new THREE.Vector3(0,1,0);
/** A borrowed view, never a mutation of the walk camera. Its projection and scale stay exact.
 * The source camera still receives ordinary user yaw/tilt/zoom; dismissal needs no restoration. */
export function updateProduceCamera(out,source,focus,node){out.copy(source);const offset=source.position.clone().sub(focus);offset.applyAxisAngle(UP,node.approach.yaw>1?-Math.PI*(node.kind==='tree'?.5:.75):0);out.position.copy(focus).add(offset);out.lookAt(focus);out.updateMatrixWorld(true);return out;}
