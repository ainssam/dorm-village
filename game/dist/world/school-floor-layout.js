import {GYM_ZONE,GYM_DOOR,GYM_CONNECTOR} from '../gym/layout.js';
import {PRINCIPAL_ZONE,PRINCIPAL_LABEL} from '../school/principal-office-layout.js';
// School ownership and geometry are data-only so room definitions cannot form a cycle.
const rectangle=(minX,maxX,minZ,maxZ)=>Object.freeze({minX,maxX,minZ,maxZ});
const standard=rectangle(-6,6,-5,5),corridor=rectangle(-13.5,13.5,-2.4,2.4);
export const SCHOOL_ELEVATOR=Object.freeze({cabin:rectangle(-17.2,-14.6,-1.45,1.45),vestibule:rectangle(-14.6,-13.5,-1.45,1.45),doorX:-14.6,doorHalf:1.05,inside:{x:-15.95,z:0,yaw:Math.PI/2},panel:{x:-16.0,z:0},radius:.66});
const zones={
 schoolGym:GYM_ZONE,
 principalOffice:PRINCIPAL_ZONE,
 schoolHall:{x:0,z:0,yaw:0,floor:corridor},schoolHall2:{x:0,z:0,yaw:0,floor:corridor},schoolHall3:{x:0,z:0,yaw:0,floor:corridor},
 classroom:{x:-8,z:-5.925,yaw:0,floor:rectangle(-4.025,4.025,-3.525,3.525)},infirmary:{x:6,z:-7.4,yaw:0,floor:standard},library:{x:3.8,z:10.4,yaw:Math.PI,floor:rectangle(-8.9,8.9,-7,8)},sportsField:{x:23,z:0,yaw:-Math.PI/2,floor:rectangle(-9.5,18.1,-18.5,7.5)},
 korean:{x:-6.5,z:-7.4,yaw:0,floor:standard},english:{x:6.5,z:-7.4,yaw:0,floor:standard},socialStudies:{x:-6.5,z:7.4,yaw:Math.PI,floor:standard},math:{x:6.5,z:7.4,yaw:Math.PI,floor:standard},
 science:{x:-6.5,z:-7.4,yaw:0,floor:standard},computerLab:{x:6.5,z:-7.4,yaw:0,floor:standard},music:{x:-6.5,z:7.4,yaw:Math.PI,floor:standard},art:{x:6.5,z:7.4,yaw:Math.PI,floor:standard}
};
export const SCHOOL_ZONES=Object.freeze(zones);
const colors={principalOffice:'#bcaa75',classroom:'#7b9c8e',infirmary:'#8bab9e',library:'#8e98c8',sportsField:'#a5af7c',korean:'#b7927f',english:'#83a8ae',socialStudies:'#87a987',math:'#658878',science:'#8fa6b7',computerLab:'#859bad',music:'#bc9a89',art:'#c9ad79'};
const door=(id,x,z,axis='z')=>Object.freeze({id,x,z,axis,color:colors[id]});
export const SCHOOL_FLOORS=Object.freeze([
 {number:1,worldId:'campus',hallId:'schoolHall',label:'1층 · 함께 쉬는 곳',short:`교실 · ${PRINCIPAL_LABEL} · 보건실 · 도서관 · 운동장 · 실내체육관`,corridor,connectors:[GYM_CONNECTOR],rooms:['schoolHall','classroom','infirmary','library','principalOffice','sportsField','schoolGym'],doors:[door('classroom',-8,-2.4),door('infirmary',6,-2.4),door('library',3.8,2.4),door('principalOffice',PRINCIPAL_ZONE.x,2.4),door('sportsField',15.5,0,'x'),GYM_DOOR],walkway:rectangle(13.5,15.5,-1.5,1.5)},
 {number:2,worldId:'campus2',hallId:'schoolHall2',label:'2층 · 말과 생각',short:'글꽃 국어 · 소리숲 영어 · 지구별 사회 · 수학',corridor,rooms:['schoolHall2','korean','english','socialStudies','math'],doors:[door('korean',-6.5,-2.4),door('english',6.5,-2.4),door('socialStudies',-6.5,2.4),door('math',6.5,2.4)]},
 {number:3,worldId:'campus3',hallId:'schoolHall3',label:'3층 · 탐구와 표현',short:'과학 · 반짝코드 컴퓨터 · 음악 · 미술',corridor,rooms:['schoolHall3','science','computerLab','music','art'],doors:[door('science',-6.5,-2.4),door('computerLab',6.5,-2.4),door('music',-6.5,2.4),door('art',6.5,2.4)]}
].map(f=>Object.freeze({...f,rooms:Object.freeze(f.rooms),doors:Object.freeze(f.doors)})));
export const SCHOOL_IDS=Object.freeze(SCHOOL_FLOORS.flatMap(f=>f.rooms));
export const floorForWorld=id=>SCHOOL_FLOORS.find(f=>f.worldId===id)??null;
export const isSchoolWorld=id=>!!floorForWorld(id);
export const schoolFloorFor=id=>SCHOOL_FLOORS.find(f=>f.rooms.includes(id))??null;
export const schoolWorldFor=id=>schoolFloorFor(id)?.worldId??null;
export const schoolHallFor=worldId=>floorForWorld(worldId)?.hallId??null;
export const roomsForSchoolWorld=worldId=>floorForWorld(worldId)?.rooms??[];
export const schoolHallId=id=>SCHOOL_FLOORS.some(f=>f.hallId===id);
