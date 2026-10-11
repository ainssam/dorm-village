/** Room-local layout. Basketball keeps its tested court-local physics frame. */
export const BASKETBALL_PLACEMENT=Object.freeze({x:10.25,z:3.25});
export const basketballFieldPoint=p=>({...p,x:p.x+BASKETBALL_PLACEMENT.x,z:p.z+BASKETBALL_PLACEMENT.z});
export const BASKETBALL_ENTRY=Object.freeze(basketballFieldPoint({x:-.4,z:-2.7}));
export const BASKETBALL_OBSTACLE=Object.freeze({...basketballFieldPoint({x:4.05,z:-3.2}),hx:.15,hz:.22});
export const SOCCER=Object.freeze({goal:{x:5.7,z:0,yaw:-Math.PI/2},ball:{x:2.8,y:.30,z:0},finish:{x:6.12,y:.30,z:0},width:3,depth:.8});
export const SOCCER_OBSTACLES=Object.freeze([
 {x:5.7,z:-1.5,hx:.06,hz:.05},{x:5.7,z:1.5,hx:.06,hz:.05},
 {x:6.5,z:0,hx:.035,hz:1.55},
 {x:6.1,z:-1.5,hx:.4,hz:.03},{x:6.1,z:1.5,hx:.4,hz:.03},
]);
