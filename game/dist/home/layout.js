export const HOUSE_IDS=Object.freeze(['home','homeKitchen','homeStudy','homePlayroom']);
export const HOME_ZONES=Object.freeze({
 home:{x:0,z:0,yaw:0,floor:{minX:-4.025,maxX:4.025,minZ:-3.525,maxZ:3.525}},
 homeKitchen:{x:11.2125,z:0,yaw:0,floor:{minX:-4.3875,maxX:4.3875,minZ:-3.525,maxZ:3.525}},
 homeStudy:{x:0,z:10.35,yaw:0,floor:{minX:-4.025,maxX:4.025,minZ:-4.025,maxZ:4.025}},
 homePlayroom:{x:11.2125,z:10.35,yaw:0,floor:{minX:-4.3875,maxX:4.3875,minZ:-4.025,maxZ:4.025}}
});
export const HOME_CORRIDORS=[{minX:-4.025,maxX:15.6,minZ:3.525,maxZ:6.325},{minX:4.025,maxX:6.825,minZ:-3.525,maxZ:3.525},{minX:4.025,maxX:6.825,minZ:6.325,maxZ:14.375}];
export const HOME_DOORS=[{id:'home',x:0,z:3.525,color:'#c5aa89'},{id:'homeKitchen',x:11.2125,z:3.525,color:'#d9ad81'},{id:'homeStudy',x:0,z:6.325,color:'#8baab9'},{id:'homePlayroom',x:11.2125,z:6.325,color:'#baa3b6'}];
const camera={position:[5.5,9.5,15],target:[0,.5,0],span:10,follow:true,followBounds:{minX:-3.2,maxX:14.8,minZ:-2.7,maxZ:13.6}};
export const HOUSE_CAMERA=camera;
const room=(id,label,tool,at,obstacles)=>({id,label,map:{label,parent:'home',caption:({cook:'재료의 비율·섞는 순서·가열 시간을 바꿔 세 가지 요리를 실험해요',code:'6개의 로봇 공방에서 부품을 모으고 문을 열고 배달해요',blocks:'블록을 옮겨 탑과 다리를 만들고 기울여 시험해요'})[tool],icon:'home',x:52,y:20},mapSpawnId:'from-home',bounds:{minX:HOME_ZONES[id].floor.minX+.7,maxX:HOME_ZONES[id].floor.maxX-.7,minZ:HOME_ZONES[id].floor.minZ+.7,maxZ:HOME_ZONES[id].floor.maxZ-.7},background:'#f0e6d9',camera,obstacles,spawns:{'from-home':{x:0,z:id==='homeKitchen'?1.9:-2.4,yaw:id==='homeKitchen'?Math.PI:0}},portals:[{id:id+'.exit',at:{x:0,z:id==='homeKitchen'?3:-3.4},mode:'walk',type:'portal',radius:0,label:'집 복도로',target:{roomId:'home',spawnId:'from-'+id}}],collectibles:[],interactables:[{id:id+'.'+tool,type:'homeTool',tool,label:({cook:'레시피 실험실 열기',code:'로봇 공방 열기',blocks:'균형 건축 놀이터'})[tool],at,radius:.95}]});
export const HOME_ROOMS={
 homeKitchen:room('homeKitchen','달콤한 주방','cook',{x:0,z:-.75},[{x:0,z:-2.25,hx:1.65,hz:.63},{x:-3.1,z:-2.25,hx:.65,hz:.63},{x:3.15,z:-2.6,hx:.55,hz:.55}]),
 homeStudy:room('homeStudy','꼬마 컴퓨터방','code',{x:.1,z:0},[{x:-2.45,z:0,hx:.65,hz:1.6},{x:-1.15,z:0,hx:.54,hz:.55},{x:-2.9,z:-2.9,hx:.55,hz:.5}]),
 homePlayroom:room('homePlayroom','알록달록 놀이방','blocks',{x:0,z:.2},[{x:0,z:2.3,hx:2.0,hz:.78},{x:-3,z:2.85,hx:.6,hz:.55}])
};
export function houseWalls(){const walls=[];const h=(x1,x2,z,nz,zone)=>{if(x2>x1)walls.push({x:(x1+x2)/2,z,hx:(x2-x1)/2,hz:.075,nx:0,nz,zone});},v=(x,z1,z2,nx,zone)=>walls.push({x,z:(z1+z2)/2,hx:.075,hz:(z2-z1)/2,nx,nz:0,zone});
 for(const[id,t]of Object.entries(HOME_ZONES)){const b={minX:t.x+t.floor.minX,maxX:t.x+t.floor.maxX,minZ:t.z+t.floor.minZ,maxZ:t.z+t.floor.maxZ},d=HOME_DOORS.find(d=>d.id===id),frontSouth=id==='home'||id==='homeKitchen';v(b.minX,b.minZ,b.maxZ,-1,id);v(b.maxX,b.minZ,b.maxZ,1,id);h(b.minX,b.maxX,frontSouth?b.minZ:b.maxZ,frontSouth?-1:1,id);h(b.minX,d.x-1.5,d.z,frontSouth?1:-1,id);h(d.x+1.5,b.maxX,d.z,frontSouth?1:-1,id);}
 v(-4.025,3.525,6.325,-1,'corridor');v(15.6,3.525,6.325,1,'corridor');h(4.025,6.825,-3.525,-1,'corridor');h(4.025,6.825,14.375,1,'corridor');return walls;
}
/** Camera zones distinguish the bedroom from the corridor that shares its progress ID. */
export function houseCameraZone(position,previous=null){
 const inside=(id,pad)=>{const z=HOME_ZONES[id],b=z?.floor;if(!b)return false;return position.x>=z.x+b.minX-pad&&position.x<=z.x+b.maxX+pad&&position.z>=z.z+b.minZ-pad&&position.z<=z.z+b.maxZ+pad;};
 if(previous&&inside(previous,.25))return previous;for(const id of HOUSE_IDS)if(inside(id,-.2))return id;return 'corridor';
}
