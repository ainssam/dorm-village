import {SEAT_CONTACT} from '../world/seating.js';
export const TENT=Object.freeze({x:-15.4,z:20.5,center:{x:-15.4,z:20.5},yaw:0,hx:2.3,hz:2.2,wallHeight:1.85,ridgeHeight:3.1,doorHalfWidth:.9,entry:{x:-15.4,z:23.45},airbed:{x:-16.85,z:19.8,width:1.3,length:1.95,top:.35},tree:{from:{x:-13,z:10},to:{x:-11.2,z:9.8}},gear:{cooler:{x:-13.75,z:19.05},table:{x:-14.75,z:19.1},sleepingBag:{x:-16.65,z:21.9}}});
const chair=(index,x,z,yaw)=>{const at={x:x+Math.sin(yaw)*1.45,z:z+Math.cos(yaw)*1.45};return {id:'courtyard.camp-chair.'+index,roomId:'courtyard',type:'pose',kind:'sit',seating:true,seatTop:.48,anchor:{x,y:.48-SEAT_CONTACT+.045,z,yaw},at,exit:{...at,yaw},radius:.70,enterDuration:1.4,label:'캠핑 의자에 앉기',leaveLabel:'캠핑 의자에서 일어나기',text:'캠핑 의자에서 편하게 쉬어요. 안내를 닫아도 그대로 앉아 있어요.'};};
export const CAMP_CHAIRS=Object.freeze([chair(0,-14,21.25,-Math.PI/2),{...chair(1,-17.8,25.2,0),seaView:true}]);
export const CAMP_BED=Object.freeze({id:'courtyard.tent.airbed',roomId:'courtyard',type:'pose',kind:'sleep',campBed:true,requiresClearApproach:true,at:{x:-15.5,z:20.608867},exit:{x:-15.5,z:20.608867,yaw:0},anchor:{x:TENT.airbed.x,y:.769239,z:20.608867,yaw:0,pitch:-Math.PI/2},enterDuration:2.4,radius:.68,label:'에어침대에 눕기',leaveLabel:'에어침대에서 일어나기',text:'텐트 안에서 파도를 들으며 쉬어요. 안내를 닫아도 누워 있어요.'});
export const CAMP_REST_TARGETS=Object.freeze([CAMP_BED,...CAMP_CHAIRS]);
export function tentContains(p,margin=0){return Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&Math.abs(p.x-TENT.x)<TENT.hx+margin&&p.z>TENT.z-TENT.hz-margin&&p.z<TENT.z+TENT.hz+.5+margin;}
export const TENT_OBSTACLES=Object.freeze([
 {id:'courtyard.tent.wall.left',x:TENT.x-TENT.hx,z:TENT.z,hx:.05,hz:TENT.hz},{id:'courtyard.tent.wall.right',x:TENT.x+TENT.hx,z:TENT.z,hx:.05,hz:TENT.hz},{id:'courtyard.tent.wall.back',x:TENT.x,z:TENT.z-TENT.hz,hx:TENT.hx,hz:.05},
 ...[-1,1].map(side=>({id:'courtyard.tent.front.'+side,x:TENT.x+side*(TENT.hx+TENT.doorHalfWidth)/2,z:TENT.z+TENT.hz,hx:(TENT.hx-TENT.doorHalfWidth)/2,hz:.05})),
 {id:CAMP_BED.id,x:TENT.airbed.x,z:TENT.airbed.z,hx:TENT.airbed.width/2,hz:TENT.airbed.length/2},
 {id:'courtyard.tent.cooler',x:-13.75,z:19.05,hx:.38,hz:.28}, {id:'courtyard.tent.table',x:-14.75,z:19.1,hx:.42,hz:.30}, {id:'courtyard.tent.sleeping-bag',x:-16.65,z:21.9,hx:.52,hz:.21},
 ...CAMP_CHAIRS.map(a=>({id:a.id,...a.anchor,hx:.68,hz:.56}))
]);

export const TENT_PROFILE=Object.freeze(Array.from({length:17},(_,i)=>{const angle=Math.PI-i*Math.PI/16;return {x:TENT.hx*Math.cos(angle),height:TENT.ridgeHeight*Math.sin(angle)};}));
export function tentRoofHeight(x,z){if(Math.abs(x)>TENT.hx||Math.abs(z)>TENT.hz)return 0;const i=Math.min(TENT_PROFILE.length-2,Math.max(0,TENT_PROFILE.findIndex((p,j)=>j<TENT_PROFILE.length-1&&x>=p.x&&x<=TENT_PROFILE[j+1].x))),a=TENT_PROFILE[i],b=TENT_PROFILE[i+1],u=(x-a.x)/(b.x-a.x),front=z>=0,v=(z+(front?0:TENT.hz))/TENT.hz,f0=front?1:.93,f1=front?.93:1,ya=a.height*f0,yb=b.height*f0,yc=b.height*f1,yd=a.height*f1;return .025+(u>=v?ya+(yb-ya)*u+(yc-yb)*v:ya+(yc-yd)*u+(yd-ya)*v);}
