// Approved v2 role assets, repositioned as a single unit with their talk and handover points.
export const LIBRARY_ROLE_PLACEMENTS=Object.freeze({chinchilla:{x:-3.45,z:3.65,yaw:Math.PI},armadillo:{x:-6.45,z:2.8,yaw:Math.PI/2},capybara:{x:6.2,z:-4.5,yaw:Math.PI}});
const LEGACY_ROLES={chinchilla:{x:-5.3,z:2.85},armadillo:{x:-1.3,z:-3.2},capybara:{x:6.2,z:-4.5}};
export function libraryRolePoint(id,p){const old=LEGACY_ROLES[id],n=LIBRARY_ROLE_PLACEMENTS[id],a=n.yaw-Math.PI,c=Math.cos(a),s=Math.sin(a),x=p.x-old.x,z=p.z-old.z;return{...p,x:n.x+c*x+s*z,z:n.z-s*x+c*z,...(p.yaw===undefined?{}:{yaw:p.yaw+a})};}
// One source of truth for furniture, solid footprints, seat anchors and safe approaches.
export const LIBRARY_SHELVES=[[-6.4,-5.6],[-2.8,-5.6],[.8,-5.6],[4.4,-5.6],[-6.4,-1.6],[-2.8,-1.6]].map(([x,z],i)=>({id:`library.shelf.${i}`,x,z,hx:1.075,hz:.34}));
export const LIBRARY_TABLES=[{id:'library.reading-table',x:1,z:-1.8,hx:1.8,hz:.65},{id:'library.study-table.0',x:2.2,z:3,hx:.8,hz:.55},{id:'library.study-table.1',x:5.9,z:4.75,hx:.8,hz:.55}];
export const LIBRARY_DESK={id:'library.loan-desk',...LIBRARY_ROLE_PLACEMENTS.chinchilla,hx:1.55,hz:.55};
export const LIBRARY_CHAIRS=[
 {id:'library.chair',x:6,z:-1.9,soft:true},
 {id:'library.window-chair',x:6,z:1.15,soft:true},
 {id:'library.table-chair.0',x:.05,z:-.48},
 {id:'library.table-chair.1',x:1.95,z:-.48},
 {id:'library.study-chair.0',x:2.2,z:4.23},
 {id:'library.study-chair.1',x:5.9,z:5.94}
].map(c=>({...c,z:c.z+(c.soft?0:.18),hx:c.soft?.81:.56,hz:c.soft?.65:.38}));
export const LIBRARY_OBSTACLES=[...LIBRARY_SHELVES,...LIBRARY_TABLES,{...libraryRolePoint('chinchilla',{x:-5.3,z:2.623}),hx:.75,hz:.675},{...libraryRolePoint('armadillo',{x:-1.3,z:-3.3}),hx:.60,hz:.22},{x:5.98,z:-4.5,hx:.83,hz:.45},...LIBRARY_CHAIRS,...[[8.12,-4.8],[-8,6.7],[8.12,6.7]].map(([x,z])=>({x,z,hx:.2,hz:.2}))].map(({x,z,hx,hz})=>({x,z,hx,hz}));
export const LIBRARY_INTERACTIONS=[
 ...LIBRARY_SHELVES.map((s,i)=>({id:s.id+'.books',type:'books',at:{x:s.x,z:s.z+1.12},radius:.83,label:'책장에서 책 고르기',bookId:['pocket-star','cloud-letter','seed-chair'][i%3]})),
 {id:'library.loan',type:'loan',at:libraryRolePoint('chinchilla',{x:-5.3,z:1.2}),radius:.85,label:'책 대출 · 반납하기'},
 {id:'library.guide',type:'libraryQuest',residentId:'chinchilla',at:libraryRolePoint('chinchilla',{x:-6.9,z:3.4}),radius:1.05,label:'친칠라 사서 · 책 찾기 의뢰',text:'왼쪽 입구에는 대출대, 안쪽에는 책장과 큰 공용 책상, 오른쪽 창가에는 조용한 독서석이 있어요. 책장에서 책을 고르고 빈 의자에서 읽어 보세요. 주민 가까이에서는 이야기할 수 있어요.'}
];
export const LIBRARY_RESIDENTS=[
 {id:'chinchilla',name:'친칠라',role:'친칠라 사서',stationary:true,home:libraryRolePoint('chinchilla',{x:-5.3,z:2.93,yaw:Math.PI+.06}),talkAt:libraryRolePoint('chinchilla',{x:-6.9,z:3.4}),interactionRadius:1.05,path:[libraryRolePoint('chinchilla',{x:-5.3,z:2.93})],text:'어서 와요! 대출 장부를 확인하고 있어요. 책장에서 마음에 드는 이야기를 골라 한 권 빌려 갈 수 있어요. 다 읽으면 이 대출대에서 돌려주세요.'},
 {id:'armadillo',name:'아르마딜로',role:'책을 고르는 친구',stationary:true,home:libraryRolePoint('armadillo',{x:-2.135,z:-3.2,yaw:Math.PI-.83}),talkAt:{x:-7.7,z:1.4},interactionRadius:1,path:[libraryRolePoint('armadillo',{x:-2.135,z:-3.2})],text:'책장을 살피며 다음 이야기를 고르고 있어요. 어느 이야기가 좋을까요? 책장 앞에서 세 이야기의 제목을 살펴봐요.'},
 {id:'capybara',name:'카피바라',role:'의자에서 읽는 친구',stationary:true,home:{x:6.2,z:-4.52,yaw:Math.PI-.12},talkAt:{x:7.55,z:-3.5},interactionRadius:1,path:[{x:6.2,z:-4.52}],text:'폭신한 의자에서 책 한 권을 읽고 있어요. 빈 의자에 앉아 천천히 읽어 볼까요? 책을 덮고 그냥 쉬어도 좋아요.'}
];
export const libraryPoses=LIBRARY_CHAIRS.map(c=>({id:c.id,roomId:'library',type:'pose',at:{x:c.x,z:c.z+(c.soft?1.36:1.04)},exit:{x:c.x,z:c.z+(c.soft?1.36:1.04),yaw:0},anchor:{x:c.x,y:c.soft?.4908:.4458,z:c.z+(c.soft?.15:-.18),yaw:c.soft?0:Math.PI},radius:.72,label:c.soft?'푹신한 의자에서 책 읽기':'독서석에 앉아 책 읽기',kind:'read',poseName:c.soft?'read':'deskRead',discoveryId:'pocket-story',prop:'book',leaveLabel:'책 덮고 일어나기',text:'고른 이야기를 천천히 읽어요.'}));
