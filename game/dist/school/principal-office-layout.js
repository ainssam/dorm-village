// Authoritative room/furniture coordinates. No scene imports: floor ownership stays data-only.
export const PRINCIPAL_LABEL='큰나무 교장실';
export const PRINCIPAL_ZONE=Object.freeze({x:-10.35,z:8.8,yaw:Math.PI,floor:Object.freeze({minX:-4.8,maxX:4.8,minZ:-6.4,maxZ:6.4})});
export const PRINCIPAL_DESK=Object.freeze({x:0,z:-4.1,width:3.6,depth:1.4,top:1.12});
export const PRINCIPAL_SEAT=Object.freeze({x:0,z:-5.58,yaw:0,seatTop:.56});
export const PRINCIPAL_GREETING=Object.freeze({x:0,z:-2.45});
export const PRINCIPAL_ROCKER=Object.freeze({x:-3.40,z:4.8,yaw:Math.PI/2,pivotY:.24,seatTop:.70,seatZ:0});
export const PRINCIPAL_OBSTACLES=Object.freeze([
 {x:0,z:-4.1,hx:1.8,hz:.7},{x:0,z:-5.57,hx:.98,hz:.67},
 {x:-1.05,z:-.55,hx:3.25,hz:.60},{x:-3.85,z:1.35,hx:.60,hz:1.85},{x:1.75,z:1.35,hx:.60,hz:1.85},
 {x:-1.05,z:2.05,hx:.575,hz:.45},{x:-3.40,z:4.8,hx:.95,hz:.9},{x:3.40,z:-6.08,hx:1.18,hz:.23},
 {x:-4.08,z:-5.4,hx:.28,hz:.28},{x:4.20,z:4.95,hx:.24,hz:.24}
].map(Object.freeze));
export const PRINCIPAL_SOFA_SEATS=Object.freeze([
 ...[-2.45,-1.05,.35].map((x,i)=>({id:'principalOffice.sofa.back.'+i,roomId:'principalOffice',at:{x,z:.77},anchor:{x,z:-.35,yaw:0},seatTop:.65})),
 {id:'principalOffice.sofa.left',roomId:'principalOffice',at:{x:-2.38,z:1.7},anchor:{x:-3.67,z:1.7,yaw:Math.PI/2},seatTop:.65},
 {id:'principalOffice.sofa.right',roomId:'principalOffice',at:{x:.25,z:1.7},anchor:{x:1.57,z:1.7,yaw:-Math.PI/2},seatTop:.65}
].map(Object.freeze));
export const PRINCIPAL_ROCKING_SEAT=Object.freeze({id:'principalOffice.rocking-chair',roomId:'principalOffice',at:{x:-1.70,z:4.8},anchor:{x:-3.40,z:4.8,yaw:Math.PI/2},seatTop:.70,rocking:PRINCIPAL_ROCKER});
export function rockingTransform(anchor,rig,angle){const dy=anchor.y-rig.pivotY,dz=rig.seatZ??0,shift=Math.sin(angle)*dy+Math.cos(angle)*dz-dz;return{...anchor,y:rig.pivotY+Math.cos(angle)*dy-Math.sin(angle)*dz,x:anchor.x+Math.sin(anchor.yaw)*shift,z:anchor.z+Math.cos(anchor.yaw)*shift,pitch:angle,roll:0};}
