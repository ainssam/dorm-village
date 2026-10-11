import * as THREE from 'three';
import {SPELLING_QUESTIONS} from '../korean/content.js';
import {spellingSentence} from '../korean/model.js';
import {handwritingFont,ensureHandwriting} from '../world/font-ready.js';

export const KOREAN_ACTIVITIES=Object.freeze([
 {id:'korean.activity',at:{x:0,z:-2.7},label:'칠판의 맞춤법 골라 보기',tool:'koreanSpelling'},
 {id:'korean.letters',at:{x:-3.1,z:-2.65},label:'자모로 글자 만들기',tool:'koreanComposition'},
 {id:'korean.dictionary',at:{x:-4.7,z:-1.95},label:'순우리말 사전 펼치기',tool:'koreanDictionary'},
 {id:'korean.story',at:{x:-1.15,z:-.65},label:'책의 문장으로 이야기 잇기',tool:'storyOrder'},
 {id:'korean.history',at:{x:4.55,z:-2.8},label:'훈민정음 액자 살펴보기',tool:'koreanHistory'}
].map(a=>Object.freeze({...a,type:'schoolTool',radius:.95})));

export function drawKoreanBoard(ctx,index=0){
 const q=SPELLING_QUESTIONS[index]??SPELLING_QUESTIONS[0];
 ctx.fillStyle='#285d49';ctx.fillRect(0,0,1200,440);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#f6e2a4';ctx.font=handwritingFont(49);ctx.fillText('오늘의 맞춤법',600,57,1100);
 ctx.fillStyle='#fff6dc';ctx.font=handwritingFont(51);ctx.fillText(spellingSentence(q),600,168,1100);
 ctx.font=handwritingFont(64);q.choices.forEach((choice,i)=>ctx.fillText(choice,360+i*480,286,360));
 ctx.strokeStyle='#95b3a0';ctx.lineWidth=3;ctx.strokeRect(155,234,410,104);ctx.strokeRect(635,234,410,104);
 ctx.font=handwritingFont(31);ctx.fillStyle='#d8e7cb';ctx.fillText('문장에 알맞은 말을 골라요',600,394,1100);
}
export function drawJamoWall(ctx){
 ctx.fillStyle='#faf0d8';ctx.fillRect(0,0,800,420);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=handwritingFont(59);ctx.fillStyle='#365d4c';ctx.fillText('자모로 만드는 글자',400,72,730);
 ctx.font=handwritingFont(90);ctx.fillText('ㄱ + ㅏ + ㅇ',400,214,720);
 ctx.fillStyle='#985d40';ctx.font=handwritingFont(83);ctx.fillText('강',400,341);
}
export function buildKoreanRoom({root,box,label},{loadTexture=url=>new THREE.TextureLoader().loadAsync(url)}={}){
 let alive=true,index=0;const surfaces=[];
 const named=(node,name)=>(node.name=name,node);
 function surface(name,x,y,z,width,height,color,draw){
  if(typeof document==='undefined')return named(box(width,height,.012,color,x,y,z,.003),name);
  const canvas=document.createElement('canvas');canvas.width=name==='korean.spelling-face'?1200:800;canvas.height=name==='korean.spelling-face'?440:420;const ctx=canvas.getContext('2d');if(!ctx)return null;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);named(m,name);root.add(m);
  const paint=()=>{if(alive){draw(ctx);texture.needsUpdate=true;}};surfaces.push({name,paint});paint();ensureHandwriting('오늘의 맞춤법 자모로 만드는 글자 순우리말 ㄱㅏㅇ 강').then(paint).catch(()=>{});return m;
 }
 named(box(6.08,2.25,.18,'#b79c76',0,1.91,-4.76,.07),'korean.landmark');
 named(box(5.9,2.09,.04,'#285d49',0,1.92,-4.653,.02),'korean.spelling-board');
 surface('korean.spelling-face',0,1.92,-4.621,5.73,2.101,'#285d49',ctx=>drawKoreanBoard(ctx,index));
 box(6.1,.10,.28,'#c5a679',0,.75,-4.61,.025);for(let i=0;i<3;i++)box(.27,.047,.07,['#fff6dc','#e6c477','#dda69b'][i],-.45+i*.4,.823,-4.5,.012);
 named(box(2.22,1.27,.12,'#bca477',-4.6,2.48,-4.76,.04),'korean.jamo-wall');surface('korean.jamo-face',-4.6,2.48,-4.688,2.07,1.085,'#faf0d8',drawJamoWall);
 const shelf=named(box(1.1,1.2,1.1,'#bd9e77',-4.8,.62,-3.5,.05),'korean.dictionary');
 for(let i=0;i<5;i++)box(.13,.5,.23,['#be9178','#d6c080','#8daa9b','#a7b7c2','#9da478'][i],-5.15+i*.17,1.47,-3.80,.012);
 const book=named(box(.83,.10,.65,'#6b9179',-4.8,1.29,-3.29,.025),'korean.dictionary-book');box(.76,.024,.59,'#fff4d9',-4.8,1.35,-3.29,.01);
 label('순우리말 사전',-4.8,.97,-2.938,.98,'#294f3e','#f7ecd0');
 const frame=named(new THREE.Group(),'korean.calligraphy');root.add(frame);
 box(1.38,2.16,.13,'#835f42',4.58,1.96,-4.76,.03,frame);box(1.21,1.99,.045,'#d9bd85',4.58,1.96,-4.67,.007,frame);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(1.08,1.86),new THREE.MeshBasicMaterial({color:'#f5edda'}));face.name='korean.calligraphy-face';face.position.set(4.58,1.96,-4.638);frame.add(face);
 if(typeof document!=='undefined')loadTexture(new URL('../korean/hunminjeongeum-calligraphy.png',import.meta.url).href).then(texture=>{if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;face.material.map=texture;face.material.color.set('#ffffff');face.material.needsUpdate=true;}).catch(()=>{});
 label('10월 9일 · 한글날',4.58,.66,-4.68,2,'#49664f','#f7ecd0');
 return{updateQuestion(next){if(!alive)return;index=Number.isInteger(next)&&SPELLING_QUESTIONS[next]?next:0;surfaces.find(s=>s.name==='korean.spelling-face')?.paint();},dispose(){alive=false;surfaces.length=0;}};
}
