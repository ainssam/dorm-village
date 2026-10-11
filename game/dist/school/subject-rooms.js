import {buildEnglishRoom,ENGLISH_OBSTACLES} from './english-room.js';
import {buildKoreanRoom} from './korean-room.js';
import {createWorldGlobe,WORLD_GLOBE_OBSTACLE} from './world-globe.js';
import {buildComputerLab,COMPUTER_OBSTACLES} from './computer-station.js';
import * as THREE from 'three';
export const SUBJECT_ROOMS=Object.freeze({
 korean:{label:'글꽃 국어실',short:'글꽃 국어실',caption:'맞춤법·자모 놀이·순우리말 사전과 한글 이야기',color:'#bfa28c',tool:'koreanSpelling',action:'칠판의 맞춤법 골라 보기'},
 english:{label:'소리숲 영어실',short:'소리숲 영어실',caption:'소리와 그림·문장 카드·카페와 길찾기·영어 그림책',color:'#93b5bc',tool:'englishListening',action:'소리를 듣고 그림 고르기'},
 socialStudies:{label:'지구별 사회실',short:'지구별 사회실',caption:'큰 벽 세계지도에서 땅과 바다를 살펴봐요',color:'#99b58a',tool:'worldMap',action:'큰 세계지도 살펴보기'},
 computerLab:{label:'반짝코드 컴퓨터실',short:'반짝코드 컴퓨터실',caption:'집에서 만든 명령을 이어서 쓰는 9단계 로봇 공방',color:'#94a8bd',tool:'code',action:'로봇 공방 시작하기'}
});
export const subjectObstacles=id=>id==='socialStudies'?[{...WORLD_GLOBE_OBSTACLE}]:id==='computerLab'?COMPUTER_OBSTACLES:id==='korean'?[{x:-4.8,z:-3.5,hx:.55,hz:.55}]:id==='english'?ENGLISH_OBSTACLES:[];
export function buildSubjectRoom(id,kit){const def=SUBJECT_ROOMS[id];if(!def)return null;const {root,box,sphere,cylinder,label}=kit;let alive=true,mapTexture=null;const korean=id==='korean'?buildKoreanRoom(kit):null;const english=id==='english'?buildEnglishRoom(kit):null;const computer=id==='computerLab'?buildComputerLab(kit):null;const globe=id==='socialStudies'?createWorldGlobe():null;if(globe)root.add(globe.root);const named=(node,name)=>(node.name=name,node);
 if(id!=='computerLab'&&id!=='korean'&&id!=='english'){
  if(id==='socialStudies'){
   const frame=named(box(6.34,3.34,.15,'#bc9c70',0,2.17,-4.75,.06),'socialStudies.landmark');const material=new THREE.MeshStandardMaterial({color:'#d3e6e5',roughness:1});const face=named(new THREE.Mesh(new THREE.PlaneGeometry(6,3),material),'socialStudies.world-map');face.position.set(0,2.17,-4.659);root.add(face);
   if(typeof document!=='undefined'){new THREE.TextureLoader().load(new URL('./maps/world-map-ko-1024.png',import.meta.url).href,texture=>{if(!alive){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;mapTexture=texture;material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;});}
  }else{named(box(5.9,1.88,.13,id==='korean'?'#628875':'#789aa5',0,2.02,-4.77,.06),id+'.landmark');label(id==='korean'?'처음 · 다음 · 마지막':'HELLO · BOOK · TREE',0,2.2,-4.68,5.4,'#fff6d8',id==='korean'?'#628875':'#789aa5');label(id==='korean'?'작은 문장이 이야기가 돼요':'낱말과 뜻을 이어 봐요',0,1.55,-4.68,4.5,'#fff6d8',id==='korean'?'#628875':'#789aa5');const side=id==='korean'?-1:1,x=side*4.8;box(1.1,1.2,1.1,'#bd9e77',x,.62,-3.5,.05);for(let i=0;i<5;i++)box(.13,.5,.55,['#be9178','#d6c080','#8daa9b','#a7b7c2','#9da478'][i],x-.35+i*.17,1.47,-3.5,.012);}
 }
 label(def.short,0,id==='socialStudies'?3.90:['korean','english'].includes(id)?3.4:3.05,-4.69,2.4,'#35514d','#f6edda');
 return{updateEnglishQuestion:q=>english?.updateQuestion(q),updateKoreanQuestion:index=>korean?.updateQuestion(index),robotView:computer?.robotView,tick(dt){globe?.tick(dt,{active:root.visible});},dispose(){alive=false;mapTexture=null;english?.dispose();korean?.dispose();computer?.dispose();globe?.dispose();}};
}
