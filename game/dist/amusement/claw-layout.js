// Fits the existing east pocket without moving a shore, ride, shrub or portal.
export const CLAW=Object.freeze({x:6.25,y:.025,z:-1.07,yaw:-Math.PI/2,hx:.50,hz:.60});
export const CLAW_OBSTACLE=Object.freeze({id:'claw.cabinet',x:CLAW.x,z:CLAW.z,hx:CLAW.hx,hz:CLAW.hz});
export const CLAW_ACTIVITY=Object.freeze({id:'amusementIsland.claw',type:'claw',at:Object.freeze({x:4.95,z:-1.07}),radius:.65,requiresClearApproach:true,label:'작은 인형뽑기',rewardPolicy:'none'});
