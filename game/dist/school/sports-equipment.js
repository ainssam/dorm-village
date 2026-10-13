import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {CLIMB,climbContactFrame} from './climb-contacts.js';

const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;

// Empty grass beyond the far side of the soccer oval, toward basketball.
// Stations face north, with court-side approaches; the gate stays wide open.
export const PULLUP=Object.freeze({x:4,z:-5.95,railZ:-6.5,railY:1.24,halfWidth:.8,yaw:Math.PI,baseY:.36,lift:.18,radius:.04});
export const CLIMB_STATION=Object.freeze({x:CLIMB.rootX,z:CLIMB.rootZ+Math.cos(CLIMB.yaw)*1.3,halfWidth:.96,halfDepth:.4});
export const CLIMB_RUNG_LENGTH=1.5;
export const CLIMB_DURATION=1.55+3*CLIMB.cycleSeconds;

export function pullupExerciseFrame(raise=0){
 const q=Math.max(0,Math.min(1,raise)),y=PULLUP.baseY+PULLUP.lift*q;
 return{root:{x:PULLUP.x,y,z:PULLUP.z,yaw:PULLUP.yaw},hands:{left:[.545,PULLUP.railY-y,.54],right:[.545,PULLUP.railY-y,.54]},footOffsets:{left:[0,0,0],right:[0,0,0]},arm:1,foot:0};
}
export function climbExerciseFrame(seconds=0){
 const t=Math.max(0,Math.min(CLIMB_DURATION,Number.isFinite(seconds)?seconds:0));
 if(t>=1.55)return{...climbContactFrame(t-1.55),arm:1,foot:1};
 const support=CLIMB.rungs[0]+CLIMB.footSupportOffset,rootY=t<1.35?.05:mix(.05,support,ease((t-1.35)/.20)),hands={left:[CLIMB.handX,.76-rootY,CLIMB.handForward],right:[CLIMB.handX,.76-rootY,CLIMB.handForward]},footOffsets={left:[0,0,0],right:[0,0,0]};
 for(const[side,start]of[['left',.35],['right',.85]]){const u=ease((t-start)/.5);footOffsets[side]=[0,(support-.05)*u+.14*Math.sin(Math.PI*u)-Math.max(0,rootY-.05),CLIMB.footForward*u];}
 return{root:{x:CLIMB.rootX,y:rootY,z:CLIMB.rootZ,yaw:CLIMB.yaw},hands,footOffsets,arm:ease(t/.35),foot:1};
}

export const SPORTS_EQUIPMENT_OBSTACLES=Object.freeze([
 {id:'sportsField.pullup.rail',x:PULLUP.x,z:PULLUP.railZ,hx:.85,hz:.04},
 ...[-.8,.8].map(dx=>({id:`sportsField.pullup.post.${dx}`,x:PULLUP.x+dx,z:PULLUP.railZ,hx:.055,hz:.055})),
 {id:'sportsField.pullup.pad',x:PULLUP.x,z:PULLUP.railZ+Math.cos(PULLUP.yaw)*.25,hx:1.075,hz:.35},
 {id:'sportsField.climb.frame',x:CLIMB_STATION.x,z:CLIMB_STATION.z,hx:CLIMB_STATION.halfWidth,hz:CLIMB_STATION.halfDepth},
 {id:'sportsField.climb.rungs',x:CLIMB_STATION.x,z:CLIMB.rungZ,hx:CLIMB_RUNG_LENGTH/2+CLIMB.railRadius,hz:CLIMB.railRadius}
]);

export const SPORTS_EQUIPMENT_ACTIVITIES=Object.freeze([
 {id:'sportsField.pullup',type:'pose',at:{x:PULLUP.x,z:PULLUP.z-Math.cos(PULLUP.yaw)*.4},exit:{x:PULLUP.x,z:PULLUP.z-Math.cos(PULLUP.yaw)*.4,yaw:PULLUP.yaw},anchor:{x:PULLUP.x,y:PULLUP.baseY,z:PULLUP.z,yaw:PULLUP.yaw},radius:.72,requiresClearApproach:true,label:'낮은 철봉에 매달리기',kind:'pullup',poseName:'pullup',enterDuration:1.1,duration:6,discoveryId:'school-pullup',leaveLabel:'철봉에서 내려오기',text:'양손으로 낮은 철봉을 잡고 발을 살짝 들어요. 나가기를 누르면 먼저 몸을 낮추고 내려와요.'},
 {id:'sportsField.climb',type:'pose',at:{x:CLIMB.rootX,z:CLIMB.rootZ-Math.cos(CLIMB.yaw)*.2},exit:{x:CLIMB.rootX,z:CLIMB.rootZ-Math.cos(CLIMB.yaw)*.2,yaw:CLIMB.yaw},anchor:{x:CLIMB.rootX,y:.05,z:CLIMB.rootZ,yaw:CLIMB.yaw},radius:.70,requiresClearApproach:true,label:'정글짐 사다리 오르기',kind:'climb',poseName:'climb',enterDuration:.6+CLIMB_DURATION,duration:2.6,discoveryId:'school-climb',leaveLabel:'사다리로 내려오기',text:'손과 발을 번갈아 옮겨 정글짐 사다리를 올라요. 위에서 잠깐 둘러본 뒤 같은 발판으로 내려와요.'}
]);

export function buildSportsEquipment(parent){
 const kit=createToyKit(parent),bar=new THREE.Group();bar.name='sportsField.pullup';bar.position.set(PULLUP.x,0,PULLUP.railZ);bar.rotation.y=PULLUP.yaw;parent.add(bar);
 for(const x of[-PULLUP.halfWidth,PULLUP.halfWidth]){
  const post=kit.cylinder(.05,.05,1.26,'#789e94',x,.64,0,bar);post.name='sportsField.pullup.post';
  kit.sphere(.061,'#e8c777',x,1.29,0,1,1,1,bar);
 }
 const rail=kit.cylinder(.04,.04,1.70,'#d7b176',0,PULLUP.railY,0,bar);rail.rotation.z=Math.PI/2;rail.name='sportsField.pullup.rail';
 const pad=kit.box(2.15,.025,.70,'#bfd1af',0,.025,.25,.08,bar);pad.name='sportsField.pullup.pad';
 for(const x of[-.86,.86]){const cue=kit.box(.05,.012,.46,'#f1d184',x,.044,.25,.012,bar);cue.name='sportsField.pullup.pad-mark';}

 const gym=new THREE.Group();gym.name='sportsField.climb';gym.position.set(CLIMB_STATION.x,0,CLIMB_STATION.z);gym.rotation.y=CLIMB.yaw;parent.add(gym);
 const frame=kit.box(1.92,.10,.80,'#d8bf89',0,1.00,0,.04,gym);frame.name='sportsField.climb.pad';
 for(const x of[-.9,.9])for(const z of[-.25,.25]){
  const post=kit.cylinder(.055,.055,1.79,'#83a9a0',x,.91,z,gym);post.name='sportsField.climb.post';
  kit.sphere(.072,'#e3bc72',x,1.83,z,1,1,1,gym);
 }
 for(const x of[-.9,.9])for(const y of[.38,.73,1.4,1.75]){const n=kit.cylinder(.025,.025,.50,'#b9d0b1',x,y,0,gym);n.rotation.x=Math.PI/2;n.name='sportsField.climb.side-rung';}
 for(const z of[-.25,.25])for(const y of[.38,.73,1.4,1.75]){const n=kit.cylinder(.025,.025,1.8,'#b9d0b1',0,y,z,gym);n.rotation.z=Math.PI/2;n.name='sportsField.climb.crossbar';}
 const rungZ=(CLIMB.rungZ-CLIMB_STATION.z)*Math.cos(CLIMB.yaw);
 for(const dx of[-.5,.5]){const support=kit.cylinder(.025,.025,1.02,'#d8b580',dx,.54,rungZ,gym);support.name='sportsField.climb.rung-support';}
 for(const y of CLIMB.rungs){const rung=kit.cylinder(CLIMB.railRadius,CLIMB.railRadius,CLIMB_RUNG_LENGTH,'#d8b580',0,y,rungZ,gym);rung.rotation.z=Math.PI/2;rung.name='sportsField.climb.rung';}
 for(const dx of[-.68,.68]){const guard=kit.cylinder(.035,.035,1.70,'#779d93',dx,.90,rungZ,gym);guard.name='sportsField.climb.guard';kit.sphere(.042,'#e3bc72',dx,1.75,rungZ,1,1,1,gym);}
 const marker=kit.box(1.35,.012,.025,'#f2dda9',0,.063,.35,.006,gym);marker.name='sportsField.climb.pad-mark';
 return{bar,gym};
}
