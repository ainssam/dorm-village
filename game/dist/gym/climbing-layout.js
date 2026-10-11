// A low traverse wholly inside the accepted north-east bay. +Z faces east.
export const CLIMBING=Object.freeze({id:'schoolGym.climbing',x:13.75,z:-9.7,yaw:Math.PI/2,bay:Object.freeze({minX:12,maxX:15.5,minZ:-13.5,maxZ:-7}),entry:Object.freeze({x:13.5,z:-6.2,yaw:Math.PI/2})});
export const CLIMBING_GEOMETRY=Object.freeze({floorY:.012,wallZ:.98,wallWidth:2.8,wallHeight:1.6,handWidth:.26,handHeight:.12,handDepth:.70,footWidth:.32,footDepth:.38});
const hand=(id,x,y,label)=>({id,kind:'hand',x,y,z:.28,label}),foot=(id,x,y)=>({id,kind:'foot',x,y,z:0,label:'낮은 발 디딤돌'});
export const CLIMBING_HOLDS=Object.freeze([
 foot('left-base',-.21,.132),foot('right-base',.21,.132),
 hand('left-start',-.57,.61,'왼손 시작'),hand('right-start',.57,.61,'오른손 시작'),
 hand('left-easy',-.57,.78,'초록 손잡이 · 편한 길'),hand('left-high',-.57,.93,'노랑 손잡이 · 조금 높은 길'),
 foot('left-step',-.09,.132),hand('right-next',.63,.80,'오른손 초록 손잡이'),
 foot('right-step',.33,.132),hand('right-finish',.69,1.00,'오른손 마지막 손잡이')
].map(h=>Object.freeze(h)));
export const CLIMBING_SUPPORT_OBSTACLE_ID='schoolGym.climbing.footholds';
export const CLIMBING_OBSTACLES=Object.freeze([{id:CLIMBING_SUPPORT_OBSTACLE_ID,x:13.75,z:-9.88,hx:.19,hz:.55},{id:CLIMBING.id+'.wall',x:14.79,z:-9.7,hx:.08,hz:1.4},...CLIMBING_HOLDS.filter(h=>h.kind==='hand').map(h=>({id:CLIMBING.id+'.'+h.id,x:13.75+h.z+.35,z:-9.7-h.x,hx:.35,hz:.13}))]);
// Exact owned contact fixtures are traversable only by the supported session.
export const CLIMBING_CONTACT_OBSTACLE_IDS=Object.freeze([CLIMBING_SUPPORT_OBSTACLE_ID,...CLIMBING_HOLDS.filter(h=>h.kind==='hand').map(h=>CLIMBING.id+'.'+h.id)]);
export const CLIMBING_STEPS=Object.freeze([{limb:'leftHand',ids:['left-easy','left-high']},{limb:'rightFoot',ids:['right-step']},{limb:'rightHand',ids:['right-next']},{limb:'leftFoot',ids:['left-step']},{limb:'leftHand',ids:['left-easy','left-high']},{limb:'rightHand',ids:['right-finish']}]);
export const climbHold=id=>CLIMBING_HOLDS.find(h=>h.id===id);
export function climbingReadyFrame(){return{root:{x:0,y:.132,z:0},arm:1,contacts:{leftHand:{...climbHold('left-start'),hold:'left-start',supported:true},rightHand:{...climbHold('right-start'),hold:'right-start',supported:true},leftFoot:{x:-.21,y:.132,z:0,hold:'left-base',supported:true},rightFoot:{x:.21,y:.132,z:0,hold:'right-base',supported:true}}};}
