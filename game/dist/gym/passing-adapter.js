import * as THREE from 'three';
import {GYM_PASSING} from './layout.js';
/** One rigid coordinate transform for simulation, rendered flight, both actors and anchors. */
export function createGymPassingAdapter(source){
 if(!source?.root)throw Error('Gym view unavailable');const root=new THREE.Group();root.name='schoolGym.passing-frame';root.position.set(GYM_PASSING.x,0,GYM_PASSING.z);root.rotation.y=GYM_PASSING.yaw;source.root.add(root);let disposed=false;
 return{root,source,schoolView:source.schoolView,residents:source.residents,
  acquireResidentActivity(id){const lease=source.acquireResidentActivity?.(id);if(!lease)return null;return{...lease,pose(p){const c=Math.cos(GYM_PASSING.yaw),s=Math.sin(GYM_PASSING.yaw);return lease.pose({...p,x:GYM_PASSING.x+c*p.x+s*p.z,z:GYM_PASSING.z-s*p.x+c*p.z,yaw:(p.yaw??0)+GYM_PASSING.yaw});}};},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();}
 };
}
export function passingPartners(source){const records=source?.residents?.residents??source?.residents?.snapshot?.()??[];return records.map(r=>r.id).filter(id=>['athletic-rabbit','athletic-turtle'].includes(id));}
