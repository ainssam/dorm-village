import {PARK_TREES} from './park-layout.js';
const hand={fruit:[.545,1.0303836672210214,.5773021851674948],leaf:[.545,.22867446375508346-.07183277606964111,.5014050804263822],shell:[.545,.22867446375508346,.5014050804263822]};
function target(id,roomId,at,yaw,kind,y=.05){const anchor={...at,y,yaw},h=hand[kind==='pickFruit'?'fruit':id==='park.leaves.west'?'leaf':'shell'],c=Math.cos(yaw),s=Math.sin(yaw);return {id,roomId,at:{...at},anchor,exit:{...at,yaw},contact:[at.x+h[0]*c+h[2]*s,y+h[1],at.z-h[0]*s+h[2]*c],type:'pose',kind,harvestNodeId:id,radius:.82,requiresClearApproach:true,enterDuration:.7,duration:2.3,leaveLabel:'채집 마치기',approachHint:'재료 앞 동그란 표시 쪽으로 조금 더 와 주세요',label:'재료 모으기',text:'손으로 조심히 모아요. 이곳은 새로 완료한 서로 다른 놀이 세 가지 뒤에 다시 준비돼요.'};}
export const GATHERING_TARGETS=Object.freeze([
 target(PARK_TREES[0].id,'park',{x:-3.65,z:2.45},-Math.PI/2,'pickFruit'),
 target(PARK_TREES[1].id,'park',{x:5.6,z:-1.3},-Math.PI/2,'pickFruit'),
 Object.assign(target('park.leaves.west','park',{x:-4.15,z:3.65},-Math.PI/2,'gatherShell',.023),{material:'autumnLeaf',groundedGather:true}),
 target('courtyard.shell.west','courtyard',{x:-4,z:12.6},0,'gatherShell',-.02),
 target('courtyard.shell.middle','courtyard',{x:0,z:13.1},0,'gatherShell',-.02),
 target('courtyard.shell.east','courtyard',{x:4,z:12.6},0,'gatherShell',-.02)
]);
export const BEACH_POLYGON=[[-5.8,11.85],[-3.3,11.55],[0,11.85],[3.1,11.5],[6.3,11.9],[6.7,13.35],[4.5,14.15],[1,14.5],[-2.4,14.5],[-5.8,13.8]];
