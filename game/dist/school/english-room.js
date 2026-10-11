import * as THREE from 'three';
import {createHeadphones} from './music-session.js';
import {handwritingFont,ensureHandwriting} from '../world/font-ready.js';

export const ENGLISH_ACTIVITIES=Object.freeze([
 {id:'english.activity',at:{x:-4.7,z:-2},label:'소리를 듣고 그림 고르기',tool:'englishListening'},
 {id:'english.sentences',at:{x:0,z:-2.7},label:'칠판의 문장 카드 맞추기',tool:'englishSentences'},
 {id:'english.roleplay',at:{x:-3.1,z:-2.65},label:'카페 주문과 길 묻기',tool:'englishRoleplay'},
 {id:'english.dictionary',at:{x:4.7,z:-1.95},label:'그림 사전과 영어 그림책',tool:'englishDictionary'},
 {id:'english.words',at:{x:-1.15,z:-.65},label:'책의 낱말과 뜻 짝 맞추기',tool:'wordMatch'}
].map(a=>Object.freeze({...a,type:'schoolTool',radius:.95})));
export const ENGLISH_OBSTACLES=Object.freeze([{x:-4.7,z:-3.55,hx:.575,hz:.425},{x:4.75,z:-3.5,hx:.55,hz:.55}]);
const FIRST_SENTENCE={tokens:['I','have','a','book.'],feedbackKo:'책 한 권이 있다고 말해요.'};
export function drawEnglishBoard(ctx,question=FIRST_SENTENCE){
 const q=question?.tokens?.length?question:FIRST_SENTENCE;
 ctx.fillStyle='#38636c';ctx.fillRect(0,0,1200,440);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff1c6';ctx.font=handwritingFont(52);ctx.fillText('문장 카드',600,62,1120);
 ctx.font=handwritingFont(40);ctx.fillStyle='#e3f0e6';ctx.fillText(q.displaySentence??q.feedbackKo??'뜻에 맞게 카드를 이어 봐요',600,152,1100);
 const tokens=q.displaySentence?[...q.tokens]:[...q.tokens.slice(1),q.tokens[0]],step=1080/tokens.length;
 tokens.forEach((token,i)=>{const x=60+i*step;ctx.strokeStyle='#a4c1bd';ctx.lineWidth=3;ctx.strokeRect(x+7,223,step-14,113);ctx.fillStyle='#fff7df';ctx.font=handwritingFont(45);ctx.fillText(token,x+step/2,281,step-32);});
 ctx.font=handwritingFont(30);ctx.fillStyle='#d6e6cf';ctx.fillText('카드를 눌러 순서대로 이어 봐요',600,395,1100);
}
export function drawEnglishPhrases(ctx){ctx.fillStyle='#faf1d8';ctx.fillRect(0,0,720,460);ctx.fillStyle='#365762';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=handwritingFont(95);['Hello!','Thank you.','See you!'].forEach((text,i)=>ctx.fillText(text,360,88+i*142,650));}
export function buildEnglishRoom({root,box,label}){
 let alive=true,question=FIRST_SENTENCE,paint=()=>{};const named=(n,name)=>(n.name=name,n);
 named(box(6.08,2.25,.18,'#b79c76',0,1.91,-4.76,.07),'english.landmark');
 named(box(5.9,2.09,.04,'#38636c',0,1.92,-4.653,.02),'english.sentence-board');
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=440;const ctx=canvas.getContext('2d');if(ctx){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const face=named(new THREE.Mesh(new THREE.PlaneGeometry(5.73,2.101),new THREE.MeshBasicMaterial({map:texture})),'english.sentence-face');face.position.set(0,1.92,-4.621);root.add(face);paint=()=>{if(alive){drawEnglishBoard(ctx,question);texture.needsUpdate=true;}};paint();ensureHandwriting('문장 카드 카드를 눌러 순서대로 이어 봐요').then(paint).catch(()=>{});}
 }else named(box(5.73,2.101,.012,'#38636c',0,1.92,-4.621,.003),'english.sentence-face');
 box(6.1,.10,.28,'#c5a679',0,.75,-4.61,.025);
 named(box(2.22,1.48,.12,'#bdac84',-4.6,2.30,-4.76,.04),'english.phrase-board');
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=720;canvas.height=460;const ctx=canvas.getContext('2d');if(ctx){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const face=named(new THREE.Mesh(new THREE.PlaneGeometry(2.07,1.3225),new THREE.MeshBasicMaterial({map:texture})),'english.phrase-face');face.position.set(-4.6,2.30,-4.688);root.add(face);const draw=()=>{if(alive){drawEnglishPhrases(ctx);texture.needsUpdate=true;}};draw();ensureHandwriting('Hello! Thank you. See you!').then(draw).catch(()=>{});}}else named(box(2.07,1.3225,.012,'#faf1d8',-4.6,2.30,-4.688,.003),'english.phrase-face');
 named(box(1.15,1.12,.85,'#be9f79',-4.7,.58,-3.55,.06),'english.listening-station');
 box(.84,.08,.60,'#587780',-4.7,1.18,-3.55,.04);const headphones=createHeadphones();headphones.name='english.headphones';headphones.scale.setScalar(.45);headphones.position.set(-4.7,.84,-3.55);root.add(headphones);
 label('Listen',-4.7,.91,-3.114,1,'#35576a','#f7ecd0');
 named(box(1.1,1.2,1.1,'#bd9e77',4.75,.62,-3.5,.05),'english.picture-dictionary');
 for(let i=0;i<5;i++)box(.13,.5,.23,['#be9178','#d6c080','#8daa9b','#a7b7c2','#9da478'][i],4.4+i*.17,1.47,-3.80,.012);
 box(.83,.10,.65,'#789ab4',4.75,1.29,-3.29,.025);box(.76,.024,.59,'#fff4d9',4.75,1.35,-3.29,.01);label('Picture book',4.75,.97,-2.938,1.02,'#35576a','#f7ecd0');
 named(box(2.25,1.77,.12,'#bdac84',4.60,2.55,-4.76,.04),'english.word-poster');const face=named(new THREE.Mesh(new THREE.PlaneGeometry(2.08,1.56),new THREE.MeshBasicMaterial({color:'#fff4db'})),'english.word-poster-face');face.position.set(4.60,2.55,-4.685);root.add(face);
 if(typeof document!=='undefined')new THREE.TextureLoader().load(new URL('../english/word-cards.webp',import.meta.url).href,texture=>{if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;face.material.map=texture;face.material.color.set('#fff');face.material.needsUpdate=true;});
 return{updateQuestion(next){if(!alive)return;question=next??FIRST_SENTENCE;paint();},dispose(){alive=false;paint=()=>{};}};
}
