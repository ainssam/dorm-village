import * as T from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {compactStaticGeometry} from '../transport/compact-static.js';
import {LOOKOUT_SEAT as S} from './layout.js';

/** The lookout chair uses the same wood, padded back and rounded supports as the village harbor seat. */
export function buildIslandLookoutSeat(parent){
 const root=new T.Group();root.name='island-connections.lookout-chair';root.position.set(S.anchor.x,0,S.anchor.z);root.rotation.y=S.anchor.yaw;root.userData={kind:'chair',seatId:S.id};parent.add(root);
 const kit=createToyKit(root),seat=kit.box(1.30,.12,.80,'#cda77b',0,.42,0,.035,root);seat.name='island-lookout.seat';
 for(const x of[-.48,.48])for(const z of[-.27,.27])kit.box(.12,.36,.12,'#6f8d82',x,.20,z,.025,root);
 kit.box(1.3,.32,.09,'#a9c5bb',0,.74,-.47,.04,root);
 for(const x of[-.51,.51])kit.box(.085,.65,.085,'#6f8d82',x,.40,-.47,.02,root);
 compactStaticGeometry(root,node=>node!==seat);
 return root;
}
