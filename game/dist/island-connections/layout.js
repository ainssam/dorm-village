/** World scenery only. Travel endpoints and scientific sky are independent. */
const LOOKOUT_SEAT_CONTACT=.18419277667999268;
export const LOOKOUT_SEAT=Object.freeze({id:'courtyard.island-lookout.seat',roomId:'courtyard',type:'pose',kind:'sit',seating:true,seatTop:.48,anchor:Object.freeze({x:15.8,y:.48-LOOKOUT_SEAT_CONTACT,z:6.3,yaw:Math.PI/2}),at:Object.freeze({x:14.5,z:6.3}),exit:Object.freeze({x:14.5,z:6.3,yaw:Math.PI/2}),radius:.72,requiresClearApproach:true,enterDuration:1.25,discoveryId:'quiet-seat',label:'바다와 구름섬을 보는 의자에 앉기',leaveLabel:'바다 전망 의자에서 일어나기',text:'바다 너머 천문대와 구름성을 바라보며 잠깐 쉬어요. 일어나기를 누르면 원래 자리로 돌아와요.'});
export const LOOKOUT_SEAT_OBSTACLE=Object.freeze({id:LOOKOUT_SEAT.id,x:15.8,z:6.3,hx:.65,hz:.50,yaw:Math.PI/2});
export const LOOKOUT=Object.freeze({id:'courtyard.island-lookout',type:'island-lookout',at:Object.freeze({x:15.8,y:.05,z:6.3}),radius:.55,label:'바다와 구름섬 바라보기',closeLabel:'마을 풍경으로 돌아가기'});
export const LOOKOUT_CAMERA=Object.freeze({eye:Object.freeze([9.8,3.9,6.3]),target:Object.freeze([60,-4.368,6.3]),fov:66,portraitFov:76,near:.1,far:200});
export const LOOKOUT_VIEW=Object.freeze({...LOOKOUT,seatId:LOOKOUT_SEAT.id,seatAnchor:LOOKOUT_SEAT.anchor,title:'바다와 구름섬',hint:'의자에 앉아 천천히 바라봐요',closeLabel:'원래 시점으로',hidePlayerDuringScenic:false,camera:LOOKOUT_CAMERA});
export const ISLAND_LANDMARKS=Object.freeze({observatory:Object.freeze({anchor:Object.freeze([60,0,12]),caption:'천문대 · 배로 가요'}),cloudCastle:Object.freeze({anchor:Object.freeze([64,8.2,-2]),caption:'구름성 · 비행기로 가요'})});
export const CLOUD_COLORS=Object.freeze({light:'#f2f3ee',shade:'#d9e4eb',roof:'#d9e4eb'});
