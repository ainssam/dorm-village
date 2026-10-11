import {Group} from 'three';import {TEA_SEAT as S} from './tea-layout.js';
// All three upstairs chairs share one physical size. Dormi's seat center is
// shifted rearward separately, preserving its existing safe front contact edge.
export function buildUpstairsCafeChair(kit,parent,{id,x,z,floorY,seatTop,reverse=false,guestOnly=false}){
 const {box}=kit,chair=new Group(),d=S.chair,backward=reverse?1:-1;chair.name=id;chair.userData={kind:guestOnly?'tea-chair':'cafe-chair',guestOnly,floor:'floor2',floorY};parent.add(chair);
 const seat=box(d.width,d.thickness,d.depth,'#8ca68f',x,seatTop-d.thickness/2,z,.045,chair);seat.name=id+'.seat';
 const back=box(d.width,d.backHeight,.1,'#8ca68f',x,seatTop+.32,z+backward*.66,.025,chair);back.name=id+'.back';
 box(1.06,.1,.12,'#a78058',x,seatTop-.085,z+backward*.59,.008,chair);for(const dx of[-.46,.46])for(const dz of[-.49,.49])box(.09,.48,.09,'#a78058',x+dx,floorY+.24,z+dz,.012,chair);return chair;
}
export function buildTeaChair(kit,parent){return buildUpstairsCafeChair(kit,parent,{...S,guestOnly:true});}
