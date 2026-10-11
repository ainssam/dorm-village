// Geometry is deliberately independent of rooms and persistence ownership.
export const PRODUCE_ANNEX_CONTROLS=Object.freeze([[6.7,-4.9],[8,-6.25],[10.8,-6.7],[13.8,-6.15],[14.9,-4.4],[15.15,-1],[14.8,2.4],[13.65,4.7],[10.7,5.15],[8,4.65],[6.75,3.3],[6.65,1.7],[6.55,.3],[6.65,-1.6]]);
export const PRODUCE_CONNECTOR=Object.freeze({width:2.4,points:[[5.35,.3],[8.1,.3]]});
export const PRODUCE_PATHS=Object.freeze([{width:1.8,points:[[5.55,.3],[7.6,.3],[13.5,.3]]},{width:1.5,points:[[7.6,.3],[7.6,-3.95],[13.8,-3.95],[13.8,.3]]},...[9,12].flatMap(x=>[-.95,.95].map(z=>({width:1.5,points:[[x,.3],[x,z]]})))]);
const bed=(species,x,z)=>Object.freeze({id:'park.produce.'+species,species,kind:'bed',x,z,hx:.7,hz:.7,approach:{x,z:z<0?-.95:.95,yaw:z<0?Math.PI:0}});
const tree=(species,x,r=.82)=>Object.freeze({id:'park.produce.'+species,species,kind:'tree',x,z:-5.25,hx:.25,hz:.25,crownRadius:r,approach:{x,z:-3.95,yaw:Math.PI}});
export const PRODUCE_FIXTURES=Object.freeze([bed('strawberry',9,-2.4),bed('tomato',12,-2.4),bed('pumpkin',9,2.4),bed('leafy',12,2.4),tree('peach',8.2),tree('pear',11),tree('mandarin',13.8,.78)]);
export const PRODUCE_BY_ID=Object.freeze(Object.fromEntries(PRODUCE_FIXTURES.map(n=>[n.id,n])));
export const PRODUCE_TARGETS=Object.freeze(PRODUCE_FIXTURES.map(n=>Object.freeze({id:n.id,type:'produce',produceNodeId:n.id,at:{x:n.approach.x,z:n.approach.z},radius:1.0,label:({strawberry:'딸기',tomato:'토마토',pumpkin:'호박',leafy:'잎채소',peach:'복숭아',pear:'배',mandarin:'귤'})[n.species]+' 돌보기',requiresClearApproach:true})));
export const PRODUCE_FOLLOW_BOUNDS=Object.freeze({minX:-4.7,maxX:14.1,minZ:-4.55,maxZ:4.1});
