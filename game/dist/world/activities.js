import {FOREST_SEATS} from './forest-coast-layout.js';
import {AIRPORT_SEAT} from '../aviation/main-airfield-layout.js';
import {HARBOR_SEAT} from '../transport/harbor-lighthouse-layout.js';
import {OBSERVATORY_BENCH} from '../observatory/layout.js';
import {GARDEN_BEDS} from './garden-layout.js';
import {SCHOOL_ROOMS} from './school.js';
import {SWING,SEESAW,SLIDE,DORMI_SEAT_CONTACT} from './playground-layout.js';
import {libraryPoses} from './library-layout.js';
import {configureSeating} from './seating.js';
// Existing objects tell a single small story: carry a little light through the village.
export const DISCOVERIES={
 'pond-catch':{place:'바람 공원 · 연못',title:'찌가 잠기는 순간',text:'작은 찌를 바라보다가 물고기와 줄을 나눠 당겼다. 기다리고 쉬어 가니 연못의 반짝임이 손 가까이 왔다.'},
 'sea-catch':{place:'별빛 마을 · 바닷가',title:'파도 끝의 선물',text:'바다에 낚싯줄을 드리웠다. 파도처럼 감았다 쉬기를 반복하니 작은 물고기가 반짝이며 올라왔다.'},
 'quiet-seat':{place:'마을의 빈 의자',title:'잠깐 앉아 쉬는 시간',text:'빈 의자에 앉아 책상과 주변 풍경을 바라보았다. 쉬어 가는 시간도 작은 하루의 일부다.'},
 'home-cook':{place:'집 · 주방',title:'달콤한 한 그릇',text:'과일을 담고 요거트를 섞어 나만의 한 그릇을 만들었다.'},
 'home-code':{place:'집 · 컴퓨터방',title:'명령이 만든 길',text:'명령을 차례대로 실행해 작은 로봇을 별까지 보냈다.'},
 'home-stack':{place:'집 · 놀이방',title:'차곡차곡 세 층',text:'큰 블록부터 작은 블록까지, 차례를 생각하며 세 층 탑을 쌓았다.'},
 'school-rest':{place:'보건실',title:'햇살 이불',text:'쉬어 가니 다시 걸어갈 힘이 생겼다.'},
 'school-pullup':{place:'운동장',title:'두 손으로 잡은 철봉',text:'낮은 철봉에 두 손을 걸고 가볍게 매달렸다가 내려왔다.'},
 'school-climb':{place:'운동장',title:'한 칸씩 위로',text:'정글짐의 손잡이와 발판을 번갈아 잡으며 사다리를 오르내렸다.'},
 'school-run':{place:'운동장',title:'작은 한 바퀴',text:'내 속도로 트랙을 한 바퀴 달렸다.'},
 'school-weights':{place:'실내체육관',title:'두 손의 힘',text:'가벼운 놀이 역기를 천천히 들었다.'},
 'school-balance':{retired:true,place:'운동장',title:'흔들려도 괜찮아',text:'균형대 위에서 나만의 균형을 찾았다.'},
 'school-seat':{place:'별빛 학교',title:'작은 하루의 첫 줄',text:'의자에 앉아 공책을 폈다. 오늘의 숙제는 마을에서 좋아하는 순간 하나를 찾아오는 것.'},
 'chalk-star':{place:'별빛 학교',title:'누군가를 위한 별',text:'칠판에 별을 그렸다. 먼저 온 친구가 남긴 별 옆에, 내 별도 함께 빛난다.'},
 'square-breeze':{place:'마을 광장',title:'길이 만나는 자리',text:'광장 벤치에는 다섯 길의 바람이 모인다. 서두르지 않아도 어디든 갈 수 있다.'},
 'cloud-slide':{place:'구름 놀이터',title:'차근차근 올라 슝',text:'넓은 계단을 하나씩 올라 미끄럼틀을 탔다. 높은 곳의 바람도, 아래에서 만난 모래도 반가웠다.'},
 'together-seesaw':{place:'구름 놀이터',title:'함께 맞춘 높이',text:'도토리 친구 모아와 마주 앉아 시소를 탔다. 서로의 무게를 기다리니 높이보다 박자가 더 즐거웠다.'},
 'cloud-swing':{place:'구름 놀이터',title:'구름에게 건넨 인사',text:'그네에 올라 구름에게 인사했다. 가장 멀리 가는 놀이도 돌아올 자리가 있어서 즐겁다.'},
 'pond-sky':{place:'바람 공원',title:'물 위의 하늘',text:'벤치에 앉으니 연못 안에도 하늘이 있었다. 바람이 지나갈 때마다 작은 하늘이 웃는다.'},
 'flower-water':{place:'바람 공원',title:'꽃에게 한 모금',text:'길가의 꽃에 물을 주었다. 별빛은 하늘에만 있는 게 아니라, 누군가를 돌보는 순간에도 생긴다.'},
 'pocket-story':{place:'별숲 도서관',title:'별을 담은 주머니',text:'책 속 도름이는 어두운 꽃에 별빛을 나눠 주었다. 주머니는 가벼워졌지만 집으로 가는 길은 더 환해졌다.'},
 'library-cloud-letter':{place:'별숲 도서관',title:'구름에게 보낸 편지',text:'구름은 연못에 비친 자신을 보며 웃었다. 목적지가 없어도 쉬어 갈 곳은 있다.'},
 'library-seed-chair':{place:'별숲 도서관',title:'씨앗의 빈 의자',text:'씨앗은 바람과 나비를 위한 의자를 놓았다. 기다림은 누군가를 위한 자리를 만드는 일이었다.'},
 'home-dream':{place:'도름이의 집',title:'오늘을 접어 두는 곳',text:'침대에 누워 작은 하루를 떠올렸다. 내일도 같은 마을에서 다른 반짝임을 만날 수 있겠지.'}
};
// Old earned moments remain valid save data, without inviting visits to removed fixtures.
export const daybookDiscoveries=(found=[])=>Object.entries(DISCOVERIES).filter(([id,d])=>!d.retired||found.includes(id));
const pose=(id,roomId,at,anchor,label,kind,discoveryId,extra={})=>({id,roomId,type:'pose',at,exit:{...at,yaw:0},anchor,radius:.82,label,kind,discoveryId,...extra});
export const ACTIVITIES=Object.fromEntries([
 ...FOREST_SEATS.map(s=>({...s})),
 {...HARBOR_SEAT},
 {...AIRPORT_SEAT},
 {...OBSERVATORY_BENCH},
 pose('classroom.chair-left','classroom',{x:-1.65,z:1.94},{x:-1.65,y:.4458,z:.65,yaw:Math.PI},'의자에 앉아 쓰기','read','school-seat',{prop:'notebook',poseName:'deskRead',leaveLabel:'공책 덮고 일어나기',text:'오늘의 숙제: 마을에서 좋아하는 순간 하나를 찾아오기.'}),
 pose('classroom.chair-right','classroom',{x:1.65,z:1.94},{x:1.65,y:.4458,z:.65,yaw:Math.PI},'의자에 앉아 읽기','read','school-seat',{prop:'book',poseName:'deskRead',leaveLabel:'책 덮고 일어나기',text:'책상 위 공책에 작은 하루의 첫 줄을 남겨요.'}),
 pose('classroom.board','classroom',{x:1.18,z:-2.10},{x:1.18,y:.05,z:-2.62,yaw:Math.PI},'분필로 별 그리기','chalk','chalk-star',{duration:4,leaveLabel:'분필 내려놓기',text:'칠판 한쪽에 오늘의 별을 그려요. 마을에서 찾은 반짝임도 기록에 남아요.'}),
 pose('courtyard.bench','courtyard',{x:6.8,z:1.71},{x:6.8,y:.4808,z:.72,yaw:0},'광장 벤치에 앉기','sit','square-breeze',{leaveLabel:'벤치에서 일어나기',text:'왼쪽은 놀이터, 오른쪽은 공원. 뒤쪽 지붕 아래에는 학교와 집이 있어요. 도서관은 학교 안에서 만나요.'}),
 pose('home.bed','home',{x:-1.52,z:.6},{x:-2.90,y:1.124,z:.98,yaw:0,pitch:-Math.PI/2},'침대에 눕기','sleep','home-dream',{leaveLabel:'침대에서 일어나기',text:'오늘 모은 반짝임을 떠올려요. 침대 옆 작은 하루 기록에서 다시 볼 수 있어요.'}),
 pose('playground.swing','playground',{x:1.7,z:-.3},{x:SWING.x,y:SWING.seatTop-DORMI_SEAT_CONTACT,z:SWING.z,yaw:0},'그네에 올라타기','swing','cloud-swing',{radius:.4,enterDuration:1.5,leaveLabel:'그네에서 내려오기',text:'두 손으로 줄을 잡고 살랑살랑. 내려오기를 누르면 그네가 멈춘 뒤 내려와요.'}),
 pose('playground.slide','playground',{x:SLIDE.x,z:SLIDE.entryZ},{x:SLIDE.x,y:SLIDE.platformY-DORMI_SEAT_CONTACT/Math.cos(Math.atan2(SLIDE.platformY-SLIDE.endY,SLIDE.endZ-SLIDE.startZ)),z:SLIDE.startZ,yaw:0,pitch:Math.atan2(SLIDE.platformY-SLIDE.endY,SLIDE.endZ-SLIDE.startZ)},'계단 올라 미끄럼틀 타기','slide','cloud-slide',{exit:{x:SLIDE.x,z:SLIDE.exitZ,yaw:0},poseName:'sit',radius:.4,enterDuration:4.3,duration:2.8,leaveLabel:'안전하게 내려오기',text:'뒤쪽 넓은 계단을 차근차근 올라요. 미끄러지는 중에는 끝까지 내려온 뒤 일어나요.'}),
 pose('playground.seesaw','playground',{x:SEESAW.x-SEESAW.seatOffset,z:3.55},{x:SEESAW.x-SEESAW.seatOffset,y:SEESAW.seatTop-DORMI_SEAT_CONTACT,z:SEESAW.z,yaw:Math.PI/2},'모아와 시소 타기','seesaw','together-seesaw',{radius:.5,enterDuration:1.5,leaveLabel:'함께 시소에서 내려오기',text:'도토리 친구 모아와 번갈아 높이 올라요. 내려오기를 누르면 수평으로 멈춘 뒤 함께 내려와요.',companion:{id:'moa-playmate',anchor:{x:SEESAW.x+SEESAW.seatOffset,y:SEESAW.seatTop-SEESAW.visitorSeatContact,z:SEESAW.z,yaw:-Math.PI/2},exit:{...SEESAW.visitorHome}}}),
 pose('park.bench','park',{x:1.7,z:.19},{x:1.8,y:.4808,z:-.78,yaw:0},'공원 벤치에 앉기','sit','pond-sky',{leaveLabel:'벤치에서 일어나기',text:'연못에 동그란 하늘이 비쳐요. 바람과 함께 잠깐 쉬어 가요.'}),
 ...GARDEN_BEDS.map(b=>pose(b.id,'park',b.at,b.anchor,`${b.label} · 물 주기`,'water','flower-water',{radius:1.05,requiresClearApproach:true,approachHint:'꽃밭 앞 밝은 표시 쪽으로 조금 더 와 주세요',duration:4.5,leaveLabel:'물뿌리개 내려놓기',text:'한 곳에 물을 주면 세 꽃밭이 함께 자라요. 서로 다른 놀이 두 가지 뒤에 꽃밭마다 꽃잎을 모아요.'})),
 ...libraryPoses,
 pose('library.book','library',{x:1,z:-3.18},{x:1,y:.05,z:-3.18,yaw:0},'탁자의 책 펼치기','read','pocket-story',{standing:true,prop:'book',leaveLabel:'책 제자리에 두기',text:'고른 이야기를 천천히 읽어요.'})
].map(a=>[a.id,a]));
for(const room of Object.values(SCHOOL_ROOMS))for(const a of room.interactables)if(a.type==='pose')ACTIVITIES[a.id]={...a,roomId:room.id};
configureSeating(ACTIVITIES);
export function roomActivities(roomId){return Object.values(ACTIVITIES).filter(a=>a.roomId===roomId);}
