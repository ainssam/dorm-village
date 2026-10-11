import {buildGymView} from '../gym/view.js';
import {buildPrincipalOffice} from '../school/principal-office.js';
import {buildSoccerCourt} from '../school/soccer-court.js';
import {SOCCER} from '../school/field-layout.js';
import {SUBJECT_ROOMS,buildSubjectRoom} from '../school/subject-rooms.js';
import {schoolHallId,schoolFloorFor} from './school-floor-layout.js';
import {buildBaseballCourt} from '../school/baseball-court.js';
import {buildSportsEquipment} from '../school/sports-equipment.js';
import {buildScienceLabProps} from '../school/science-lab-props.js';
import {buildPendulumRig} from '../school/pendulum-props.js';
import {buildMusicInstruments} from '../school/music-props.js';
import {drawMusicQuizBoard} from '../school/music-symbols.js';
import {buildSchoolFurniture} from './school-furniture.js';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {buildOutdoorTerrain} from './outdoor-terrain.js';
import {buildInfirmaryProps} from '../school/infirmary-props.js';
import {createHeadphones} from '../school/music-session.js';
import {createPianoView} from '../school/piano-view.js';
import {buildThrowCourt} from '../school/throw-view.js';
import {drawMathLesson} from '../school/math-lesson.js';
import {GaltonSimulation} from '../school/galton.js';
import {createGaltonView} from '../school/galton-view.js';
import * as THREE from 'three';
import {SCHOOL_DOORS} from './school.js';
export function buildSchoolRoom(def,{root,box,sphere,cylinder,label,ring,beam,mat},state={},{shell=true}={}){
 const animated=[],drawingSurfaces={};let elapsed=0,ball=null,ballTime=-1,galton=null,galtonView=null,throwCourt=null,piano=null,disposed=false,subjectView=null,officeView=null,gymView=null;
 const named=(o,name)=>{o.name=name;return o;};
 const hall=schoolHallId(def.id),field=def.id==='sportsField',w=def.id==='schoolGym'?32:hall?48:field?19:def.id==='principalOffice'?9.6:12,d=def.id==='schoolGym'?32:hall?4.8:field?15:def.id==='principalOffice'?12.8:10;
 if(shell){if(field)buildOutdoorTerrain(root,OUTDOOR_SHORES.sportsField,{name:'sportsField.island',seasonalRole:'terrain.grass',earth:'#9dae7c',surface:'#b6c993'});else{box(w,.36,d,'#c8ad86',0,-.2,0,.18);box(w-.12,.04,d-.12,'#ecdfc5',0,.002,0,.14);}
 if(!field){for(let x=-w/2+.7;x<w/2;x+=1.2)box(.022,.008,d-.2,'#deccab',x,.026,0,.001);box(w,3,.18,'#dde5d6',0,1.5,-d/2,.05);box(w,.17,.25,'#fbf3df',0,3.03,-d/2,.04);box(w,.35,.045,'#a8b7a0',0,.25,-d/2+.11,.01);}
 }
 const plaque=(text,x,z,color='#9bb4a1')=>{box(2.5,.45,.10,color,x,2.55,z,.06);label(text,x,2.55,z+.065,2.3,'#354d45',color);};
 const window=(x,z)=>{box(1.5,1.4,.12,'#fbf3df',x,1.8,z,.06);box(1.27,1.15,.025,'#bddbdc',x,1.8,z+.073,.04);box(.045,1.2,.025,'#fbf3df',x,1.8,z+.095,.01);box(1.3,.045,.025,'#fbf3df',x,1.8,z+.095,.01);box(1.65,.10,.32,'#e9d8b7',x,1.08,z+.12,.035);box(.24,.73,.018,'#dbecea',x-.4,1.95,z+.095,.02);};
 const table=(x,z,width=2.5,color='#d4ad78')=>{const g=new THREE.Group();root.add(g);box(width,.15,1.25,color,x,1.1,z,.07,g);for(const dx of [-width/2+.2,width/2-.2])for(const dz of [-.43,.43])box(.11,1,.11,'#86a396',x+dx,.52,z+dz,.02,g);return g;};
 function drawing(name,x,y,z,width,height,bg){
  const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(!canvas){return named(box(width,height,.035,bg,x,y,z,.01),name);}
  canvas.width=720;canvas.height=440;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,720,440);
  if(name==='math.board')drawMathLesson(ctx);if(name==='music.quiz-board-face')drawMusicQuizBoard(ctx);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:texture,roughness:1}));m.position.set(x,y,z);root.add(m);named(m,name);drawingSurfaces[name]={canvas,texture,modified:false};
  if(name==='math.board'){let disposed=false;texture.addEventListener('dispose',()=>disposed=true);document.fonts?.load('700 22px "Dormi Gentle Pen"','이차함수 최대 최소').then(()=>{if(!disposed&&!drawingSurfaces[name].modified){drawMathLesson(ctx);texture.needsUpdate=true;}}).catch(()=>{});}
  return m;
 }
 if(hall&&shell){
  for(const door of SCHOOL_DOORS.filter(d=>schoolFloorFor(d.id)?.hallId===def.id)){const front=door.z<0,signZ=door.z,g=new THREE.Group();g.name=`schoolHall.door.${door.id}`;root.add(g);box(2.4,2.1,.18,door.color,door.x,1.08,signZ,.1,g);box(1.7,1.76,.07,'#f7efd7',door.x,1.06,signZ+.11,.05,g);box(1.43,.57,.025,'#bfdbcf',door.x,1.43,signZ+.16,.035,g);sphere(.075,'#c6a577',door.x+.57,.75,signZ+.2,1,1,1,g);if(front)plaque(door.label,door.x,signZ+.08,door.color);else{label(door.label,door.x,.95,signZ+.12,2.5,'#354d45','#f5e7c8');g.scale.y=.62;}box(2.55,.026,.58,door.color,door.x,.043,door.z,.09);}
  named(box(13.8,.012,1.3,'#d8dcc0',0,.045,0,.16),'schoolHall.landmark');for(let i=-3;i<=3;i++){const l=label('→',i*2.15,.13,.2,.45,'#758b70','#d8dcc0');if(l)l.rotation.x=-Math.PI/2;}
  label('광장 ←',-8,1.7,-4.30,1.4);label('특별실 산책길',0,2.95,-4.30,3.6,'#536f60','#dde5d6');
 }else if(SUBJECT_ROOMS[def.id]){subjectView=buildSubjectRoom(def.id,{root,box,sphere,cylinder,label,ring,beam,mat});
 }else if(def.id==='infirmary'){
  window(.1,-4.86);buildInfirmaryProps({root,box,sphere,cylinder,label,ring,beam,mat});const bed=named(new THREE.Group(),'infirmary.landmark');root.add(bed);box(1.52,.34,2.65,'#c4b296',-3.45,.23,-1.1,.10,bed);box(1.45,.23,2.55,'#fff5df',-3.45,.49,-1.1,.12,bed);box(1.46,.16,1.68,'#a3c4b1',-3.45,.63,-.77,.1,bed);box(1.13,.19,.54,'#fff9ed',-3.45,.67,-1.99,.1,bed);box(1.58,.9,.13,'#b3c6b4',-3.45,.57,-2.5,.07,bed);
  box(2.5,1.4,.85,'#e9e6cf',3.5,.72,-3.65,.08);for(let x=2.55;x<4.7;x+=.8)box(.71,.54,.04,'#b7cbb8',x,.87,-3.20,.03);plaque('햇살 보건실',-3.45,-4.84);
 }else if(def.id==='music'){
  const placeholder=named(new THREE.Group(),'music.landmark');root.add(placeholder);plaque('작은 음악실',-2.2,-4.84,'#d2b9a6');window(3.5,-4.85);buildMusicInstruments({root,box,sphere,cylinder,beam,mat});
  const listen=named(new THREE.Group(),'music.listening-seat');root.add(listen);box(1.35,.18,1.08,'#b6c7b5',3.35,.46,1.10,.15,listen);box(1.35,.84,.18,'#8faaa0',3.35,.87,.60,.10,listen);for(const x of[2.87,3.83])for(const z of[.76,1.45])box(.12,.40,.12,'#a58f73',x,.22,z,.03,listen);box(.85,.68,.85,'#d2b993',4.73,.35,1.10,.07,listen);box(.58,.08,.38,'#536b71',4.73,.74,1.10,.04,listen);const headphones=createHeadphones();headphones.name='music.headphones-resting';headphones.scale.setScalar(.45);headphones.position.set(4.73,.40,1.10);root.add(headphones);
  named(box(2.4,1.75,.13,'#cba974',.5,2.04,-4.65,.07),'music.symbol-board');drawing('music.quiz-board-face',.5,2.04,-4.572,2.18,1.53,'#fff6df');
 }else if(def.id==='science'){
  named(table(-2.6,-2.4),'science.landmark');buildPendulumRig({root,box,sphere,beam,label});buildScienceLabProps({root,box,cylinder,sphere,beam,mat,label});table(3.7,-3.4,1.5);for(const [i,c]of ['#c88677','#8fac86','#89b1c1'].entries()){const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.45,16),mat(c));cone.position.set(3.28+i*.42,1.38,-3.4);root.add(cone);}plaque('호기심 과학실',-2.6,-4.84,'#bcced1');window(.8,-4.86);
 }else if(def.id==='art'){
  const g=named(new THREE.Group(),'art.landmark');root.add(g);for(const dx of [-.8,.8])beam([-2.4+dx,.03,-2.8],[-2.4+dx*.6,2.65,-2.8],.10,'#b8946a',g);box(2.55,1.64,.11,'#c3a178',-2.4,1.93,-2.74,.04,g);drawing('art.canvas',-2.4,1.93,-2.672,2.35,1.44,'#fff7df');table(3.3,-3.3,2.2);for(const [i,c]of ['#cc8877','#d6bc70','#91ad82','#8aaac1'].entries())cylinder(.16,.14,.3,c,2.53+i*.48,1.32,-3.3);plaque('물감 미술실',-2.4,-4.84,'#dac397');window(-4.7,-4.85);
 }else if(def.id==='math'){
  named(box(4.4,2.4,.19,'#c1a37c',-3.8,1.81,-4.61,.08),'math.landmark');drawing('math.board',-3.8,1.82,-4.5,4.15,2.14,'#275b45');box(4.6,.11,.4,'#d1b386',-3.8,.57,-4.42,.035);for(let i=0;i<3;i++)box(.27,.055,.08,['#f5efd4','#e6c676','#dda79c'][i],-4+i*.45,.66,-4.3,.014);box(.4,.1,.2,'#bb8b6c',-1.35,.67,-4.3,.03);
  for(const [i,t]of ['π','+','√','∞','=','×'].entries()){const l=label(t,-4.6+i*1.7,3.8,-4.35,.6,'#d0b96c','transparent');if(l){l.name=`math.floating-symbol.${i}`;animated.push({node:l,y:3.8,phase:i});}}
  galton=new GaltonSimulation({rows:8});galton.reset(100);galtonView=createGaltonView(THREE,galton);galtonView.root.position.set(3.8,3.08,-4.37);galtonView.root.scale.setScalar(.82);root.add(galtonView.root);label('갈톤보드',3.8,3.62,-4.36,2.2,'#536e5f','#dde5d6');
 }else if(field){
  buildSportsEquipment(root);buildBaseballCourt(root);throwCourt=buildThrowCourt(root);const raceEntry=new THREE.Group();raceEntry.name='sportsField.race-entry';root.add(raceEntry);for(let i=0;i<6;i++)box(.18,.016,.22,i%2?'#6b8675':'#f9f1d1',-5.2,.065,4.10+i*.22,.006,raceEntry);const passEntry=new THREE.Group();passEntry.name='sportsField.passing-entry';root.add(passEntry);const passBall=sphere(.23,'#87cab5',-2.5,.30,4.4,1,1,1,passEntry);passBall.name='sportsField.passing-ball';for(const angle of[-.5,.5]){const seam=new THREE.Mesh(new THREE.TorusGeometry(.231,.027,8,40),mat('#fff5df'));seam.rotation.z=angle;seam.rotation.y=.7;passBall.add(seam);}const passPad=ring(-2.5,4.4,'#e9d9a9',.39);passPad.name='sportsField.passing-pad';
  const track=new THREE.Shape();track.absellipse(0,0,8.1,5.6,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(0,0,6.8,4.3,0,Math.PI*2,true,0);track.holes.push(hole);const tm=named(new THREE.Mesh(new THREE.ShapeGeometry(track,64),mat('#c39a82')),'sportsField.landmark');tm.rotation.x=-Math.PI/2;tm.position.y=.04;root.add(tm);
  for(const [rx,rz]of[[7.4,4.9],[8,5.5]]){const pts=[];for(let i=0;i<=96;i++)pts.push(new THREE.Vector3(Math.sin(i*Math.PI/48)*rx,.061,Math.cos(i*Math.PI/48)*rz));root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#ede4c4'})));}
  ball=buildSoccerCourt(root).ball;


 }
 if(def.id==='schoolGym')gymView=buildGymView(root);
 if(def.id==='principalOffice')officeView=buildPrincipalOffice({root,box,sphere,cylinder,mat});
 buildSchoolFurniture(def.id,{root,box,cylinder});
 return {officeView,gymView,updateEnglishQuestion(q){if(!disposed)subjectView?.updateEnglishQuestion?.(q);},updateKoreanQuestion(index){if(!disposed)subjectView?.updateKoreanQuestion?.(index);},get robotView(){return subjectView?.robotView;},galton,throwCourt,drawingSurfaces,updateMusicQuiz(index){if(disposed)return;const s=drawingSurfaces['music.quiz-board-face'];if(s){drawMusicQuizBoard(s.canvas.getContext('2d'),index);s.texture.needsUpdate=true;}},get piano(){return piano;},get disposed(){return disposed;},installPiano(template){if(disposed||piano)return;root.getObjectByName('music.landmark')?.removeFromParent();piano=createPianoView(template);root.add(piano.root);},dispose(){if(disposed)return;disposed=true;piano?.dispose();subjectView?.dispose?.();officeView?.dispose();},updateDrawing(name,canvas){const s=drawingSurfaces[name];if(s){s.modified=true;s.canvas.getContext('2d').drawImage(canvas,0,0,s.canvas.width,s.canvas.height);s.texture.needsUpdate=true;}},kickBall(){if(!ball)return false;ballTime=0;return true;},animate(dt){elapsed+=dt;subjectView?.tick?.(dt);if(galton){galton.update(dt);galtonView.update();}for(const a of animated)a.node.position.y=a.y+Math.sin(elapsed*1.3+a.phase)*.055;if(ball&&ballTime>=0){ballTime+=dt;const t=Math.min(1,ballTime/1.3);ball.position.set(SOCCER.ball.x+(SOCCER.finish.x-SOCCER.ball.x)*t,SOCCER.ball.y+Math.sin(t*Math.PI)*.38,SOCCER.ball.z+(SOCCER.finish.z-SOCCER.ball.z)*t);if(ballTime>2.5){ballTime=-1;ball.position.set(SOCCER.ball.x,SOCCER.ball.y,SOCCER.ball.z);}}}};
}
