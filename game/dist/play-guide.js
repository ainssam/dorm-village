// Small, optional starting points. Times describe a visit, never a deadline.
export const GUIDE_MOODS=[{id:'all',label:'모두 보기'},{id:'rest',label:'잠깐 쉬기'},{id:'play',label:'가볍게 놀기'},{id:'learn',label:'만들고 배우기'}];
const groups={
 rest:['park','courtyard','home','library','playground','principalOffice','infirmary','music','bakeryCafe','observatoryIsland','amusementIsland','coasterGarden'],
 play:['playground','amusementIsland','amusementCircuit','bumperCourt','coasterGarden','schoolGym','sportsField','classroom','park','courtyard','photoStudio'],
 learn:['schoolHall','schoolHall2','schoolHall3','korean','english','socialStudies','math','science','computerLab','music','art','library','homeStudy','homeKitchen','homePlayroom','workshop','bakeryCafe','postOffice','photoStudio','observatoryIsland','infirmary']
};
export const GUIDE_STARTS=[
 {roomId:'park',mood:'rest',title:'꽃밭 곁에서 쉬어 가요',note:'꽃밭에서 물을 주고, 연못 앞에서 잠깐 쉬어요.',time:'2–3분 산책'},
 {roomId:'amusementIsland',mood:'play',title:'물고기를 따라 천천히',note:'뜰채 가게에서 느긋한 연습으로 조준해 봐요.',time:'1–3분 놀이'},
 {roomId:'homeStudy',mood:'learn',title:'로봇에게 첫 심부름을',note:'컴퓨터에서 첫 공방을 열고 명령을 이어 봐요.',time:'3–5분 만들기'}
];
const normalize=value=>String(value??'').toLocaleLowerCase('ko').replace(/\s+/g,'');
const aliases={트레드밀:'러닝머신',권투:'복싱',요리:'레시피',코딩:'로봇',댄스:'춤'};
export function guideQueryMatches(text,query){const q=normalize(query);return !q||[q,aliases[q]].filter(Boolean).some(term=>normalize(text).includes(term));}
export function guidePlaces(places,{query='',mood='all',hints={}}={}){
 return places.filter(room=>(mood==='all'||groups[mood]?.includes(room.id))&&guideQueryMatches([room.label,hints[room.id]??'',room.map?.caption??'',...(room.interactables??[]).map(t=>t.label??'')].join(' '),query));
}
