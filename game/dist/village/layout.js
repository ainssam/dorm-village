import {RADIUS} from '../physics.js';
import {BAKERY,FIXTURES,BAKERY_STATIONS,doorwayContract} from '../bakery/layout.js';
import {SHOP_ROOM_RESIDENTS} from '../residents/shop-resident-layout.js';
import {villageDoor} from '../world/village-layout.js';
const make=(id,label,color,tool,obstacles)=>({id,label,map:{label,x:id==='workshop'?80:12,y:30,icon:id,caption:tool==='craft'?'모은 꽃잎과 해변 조개로 집 장식을 만들어요':'반죽하고 굽고 꾸며 나만의 작은 케이크를 만들어요'},mapSpawnId:'from-courtyard',bounds:{minX:-4.6,maxX:4.6,minZ:-3.6,maxZ:4.3},background:color,obstacles,spawns:{'from-courtyard':{x:0,z:2.8,yaw:Math.PI}},portals:[{id:id+'.exit',type:'portal',at:{x:0,z:4.12},radius:.95,label:'광장으로 돌아가기',target:{roomId:'courtyard',spawnId:'from-'+id}}],collectibles:[],interactables:[{id:id+'.table',type:'villageTool',tool,at:{x:0,z:.6},radius:1.1,label:tool==='craft'?'작업대에서 꽃·조개 장식 만들기':'작은 케이크 만들기'}],camera:{position:[6,10,16],target:[0,.5,0],span:10,follow:true,followBounds:{minX:-1.8,maxX:1.8,minZ:-1,maxZ:1.6}}});
export const VILLAGE_ROOMS={
 postOffice:make('postOffice','마음 우체국','#e8d9cb','post',[{x:0,z:-1.4,hx:1.7,hz:.7},{x:-3.75,z:-2.4,hx:.6,hz:1.1},{x:3.75,z:-2.4,hx:.6,hz:1.1}]),
 photoStudio:make('photoStudio','찰칵 사진관','#d7e4df','photo',[{x:0,z:-2.8,hx:2.9,hz:.65},{x:-3.1,z:-1.2,hx:.4,hz:.4},{x:3.1,z:-1.2,hx:.4,hz:.4},{x:1.65,z:2.8,hx:.4,hz:.5},{x:-2.1,z:-1.8,hx:.45,hz:.55},{x:2.1,z:-1.8,hx:.45,hz:.55}]),
 workshop:make('workshop','꽃잎 공방','#e5dce7','craft',[{x:0,z:-1.4,hx:1.7,hz:.7},{x:-3.75,z:-2.4,hx:.55,hz:1},{x:3.75,z:-2.4,hx:.55,hz:1},{x:3.4,z:2.4,hx:.6,hz:.65}]),
 bakeryCafe:make('bakeryCafe','밀구름 베이커리 카페','#f2dfc4','bakery',[{x:0,z:-1.4,hx:1.7,hz:.7},{x:-3.75,z:-2.4,hx:.55,hz:1},{x:3.75,z:-2.4,hx:.55,hz:1},{x:-3.3,z:2.2,hx:.6,hz:.6},{x:3.3,z:2.2,hx:.6,hz:.6},{x:-3.3,z:3.6,hx:.4,hz:.4},{x:3.3,z:3.6,hx:.4,hz:.4}])
};
export const SHOP_ENTRANCES=Object.fromEntries(['postOffice','photoStudio','workshop','bakeryCafe'].map(id=>{const d=villageDoor(id);return [id,{x:d.at.x,z:d.at.z,spawnX:d.spawn.x,spawnZ:d.spawn.z,yaw:d.spawn.yaw,outward:d.outward}];}));

VILLAGE_ROOMS.postOffice.interactables[0].label='편지 쓰고 답장 받기';VILLAGE_ROOMS.postOffice.map.caption='마을 친구에게 안부를 전하고 게임 속 답장을 받아요';VILLAGE_ROOMS.photoStudio.interactables[0].label='도름이 사진 찍기';VILLAGE_ROOMS.photoStudio.map.caption='친구와 포즈를 고르고 사진 액자를 만들어 집에 걸어요';

VILLAGE_ROOMS.bakeryCafe.interactables[0].label='카페 영업하기';VILLAGE_ROOMS.bakeryCafe.map.caption='1층 뒤쪽에서 빵 굽기 · 오른쪽 계단으로 2층 카페';VILLAGE_ROOMS.bakeryCafe.obstacles.push({x:-3.75,z:-.10,hx:.56,hz:.55});

for(const [id,residents] of Object.entries(SHOP_ROOM_RESIDENTS))VILLAGE_ROOMS[id].residents=residents;

// Bakery-only candidate registration. The courtyard address and all other shop rooms stay stable.
const bakery=VILLAGE_ROOMS.bakeryCafe;
bakery.bounds={...BAKERY.bounds};
bakery.spawns={'from-courtyard':{...BAKERY.spawn}};
bakery.portals=bakery.portals.map(p=>({...p,at:{...doorwayContract.at},halfWidth:doorwayContract.width/2-RADIUS,floor:'floor1',floorY:BAKERY.floor1Y}));
bakery.interactables=bakery.interactables.map(target=>({...target,at:{...BAKERY_STATIONS.bakingApproach},label:'반죽하고 빵 굽기',floor:'floor1',floorY:BAKERY.floor1Y}));
bakery.floorObstacles=FIXTURES.map(fixture=>{const y=fixture.floor==='floor2'?BAKERY.floor2Y:BAKERY.floor1Y;return {...fixture,floorY:y,minY:y,maxY:y+fixture.height};});
// Legacy guest and baker controllers remain explicitly downstairs until their route migration.
bakery.obstacles=bakery.floorObstacles.filter(fixture=>fixture.floor==='floor1');
bakery.residents=bakery.residents.map(resident=>{
 // Keep the original baker, board, poses and short route shape beside the moved prep counter.
 const path=resident.id==='cafe-dog'?resident.path.map(p=>({...p,x:p.x-resident.home.x+BAKERY_STATIONS.workbench.x+1.4,z:p.z-resident.home.z+BAKERY_STATIONS.workbench.z+1.9,yaw:Math.PI})):resident.path;
 return {...resident,path,home:path[0],floor:'floor1',floorY:BAKERY.floor1Y};
});
bakery.camera={...bakery.camera,followBounds:{minX:-4.8,maxX:7.8,minZ:-4.9,maxZ:5.1}};
