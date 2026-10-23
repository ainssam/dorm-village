import {SEAT_CONTACT} from '../world/seating.js';
import {airportWorldBox,airportWorldPoint} from '../world/main-island-layout.js';
export const MAIN_AIRPORT_POSTS=Object.freeze([10,12.8].map(z=>Object.freeze({id:`airport.post.main.${z}`,x:-12.65,z,hx:.07,hz:.07})));
export const MAIN_AIRPORT_OBSTACLES=Object.freeze([{id:'airport.flight-field',x:-1.5,z:0,hx:7.3,hz:16},{id:'airport.windsock-pole',x:-11.85,z:8.3,hx:.045,hz:.045},...MAIN_AIRPORT_POSTS]);
const x=19.4,z=-21.7,yaw=Math.atan2(27-x,-18-z),at={x:x-Math.sin(yaw)*1.6,z:z-Math.cos(yaw)*1.6};
export const AIRPORT_SEAT=Object.freeze({id:'courtyard.airfield.plane-bench',roomId:'courtyard',type:'pose',kind:'sit',seating:true,seatTop:.48,anchor:{x,y:.48-SEAT_CONTACT,z,yaw},at,exit:{...at,yaw},radius:.72,requiresClearApproach:true,enterDuration:1.25,discoveryId:'quiet-seat',label:'비행장 벤치에 앉기',leaveLabel:'비행장 벤치에서 일어나기',text:'작은 비행기가 쉬어 가는 자리를 바라봐요. 비행기 바라보기를 누르면 앉은 그대로 풍경을 볼 수 있어요.'});
export const AIRPORT_LOOKOUT=Object.freeze({id:'courtyard.airfield-plane-view',type:'island-lookout',seatId:AIRPORT_SEAT.id,seatAnchor:AIRPORT_SEAT.anchor,at:{x,z},radius:.1,label:'비행기 바라보기',title:'작은 비행장',hint:'바람과 비행기를 바라봐요',closeLabel:'원래 시점으로',endpointId:'villageAirport',sceneObject:'airfield.parked-plane',hidePlayerDuringScenic:true,camera:{eye:[34,5.2,-5],target:[27,1.2,-18],fov:52,portraitFov:60,near:.1,far:200}});
// A compact, ground-level deck uses the open west edge as its walk-up entry.
// The runway, old airport bench, and its independent camera remain unchanged.
const deckLocalCenter=Object.freeze({x:-8.5,z:-18});
const deckCenter=airportWorldPoint(deckLocalCenter);
const deckSeatLocal=Object.freeze({x:-8.5,z:-16.8,yaw:0});
const deckSeat=airportWorldPoint(deckSeatLocal);
export const AIRPORT_DECK=Object.freeze({id:'airfield.scenic-deck',localCenter:deckLocalCenter,center:Object.freeze({x:deckCenter.x,z:deckCenter.z}),width:4.2,depth:2.4,floorY:.05,seatLocal:deckSeatLocal});
export const AIRPORT_DECK_SEAT=Object.freeze({id:'courtyard.airfield.scenic-deck.seat',roomId:'courtyard',type:'pose',kind:'sit',seating:true,seatTop:.48,anchor:{x:deckSeat.x,y:.48-SEAT_CONTACT,z:deckSeat.z,yaw:deckSeatLocal.yaw},at:{x:deckCenter.x,z:deckCenter.z},exit:{x:deckCenter.x,z:deckCenter.z,yaw:deckSeatLocal.yaw},radius:.72,requiresClearApproach:true,enterDuration:1.25,discoveryId:'quiet-seat',label:'전망데크 벤치에 앉기',leaveLabel:'전망데크에서 일어나기',text:'작은 비행장과 비행기를 바라보며 잠깐 쉬어요. 비행기 바라보기를 누르면 앉은 채 풍경을 볼 수 있어요.'});
export const AIRPORT_DECK_LOOKOUT=Object.freeze({id:'courtyard.airfield-scenic-deck-view',type:'island-lookout',seatId:AIRPORT_DECK_SEAT.id,seatAnchor:AIRPORT_DECK_SEAT.anchor,at:{x:deckSeat.x,z:deckSeat.z},radius:.1,label:'비행기 바라보기',title:'작은 비행장 전망데크',hint:'실제 비행장과 비행기를 바라봐요',closeLabel:'원래 시점으로',endpointId:'villageAirport',sceneObject:'airfield.parked-plane',hidePlayerDuringScenic:true,camera:{eye:[23.5,3.2,-42.9],target:[27,1.2,-18],fov:38,portraitFov:48,near:.1,far:200}});
const deckRailLocal=Object.freeze([
 {id:'airfield.scenic-deck.rail.north.right',x:-7.02,z:-16.84,hx:.54,hz:.04},
 {id:'airfield.scenic-deck.rail.east',x:-6.44,z:-18,hx:.04,hz:1.16},
 {id:'airfield.scenic-deck.rail.south',x:-8.5,z:-19.16,hx:2.06,hz:.04}
]);
const airportDeckWorldObstacles=deckRailLocal.map(airportWorldBox);
const airportDeckSeatObstacle=airportWorldBox({id:AIRPORT_DECK_SEAT.id,x:deckSeatLocal.x,z:deckSeatLocal.z,hx:.95,hz:.5,yaw:deckSeatLocal.yaw});
export const AIRFIELD_WORLD_OBSTACLES=Object.freeze([...MAIN_AIRPORT_OBSTACLES.map(airportWorldBox),{id:AIRPORT_SEAT.id,x,z,hx:.95,hz:.50,yaw},...airportDeckWorldObstacles,airportDeckSeatObstacle]);
