import * as THREE from 'three';import {createToyKit} from '../world/toy-kit.js';import {FISHING_SPOTS} from './layout.js';
export const FISHING_SIGN_ART='fishing/fishing-sign-cute.webp';
const browserTexture=(url,ok,fail)=>typeof document==='undefined'?null:new THREE.TextureLoader().load(url,ok,undefined,fail);
// One small mipmapped picture is shared by both faces. A native icon remains
// readable during loading or if the asset fails; late loads cannot revive a room.
export function loadFishingSignArtwork(material,faces,fallbacks,load=browserTexture){
 let alive=true;material.addEventListener('dispose',()=>{alive=false;});
 let texture;try{texture=load(FISHING_SIGN_ART,()=>{if(!alive)return;faces.forEach(m=>m.visible=true);fallbacks.forEach(g=>g.visible=false);material.needsUpdate=true;},()=>{});}catch{return null;}
 if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;texture.generateMipmaps=true;material.map=texture;}
 return texture;
}
function roundedPanel(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function buildFishingSpots(roomId,root){return Object.values(FISHING_SPOTS).filter(t=>t.roomId===roomId).map(spot=>buildFishingSpot(spot,root));}
function buildFishingSpot(spot,root){
 const g=new THREE.Group();g.name=spot.id+'.marker';g.position.set(spot.at.x,.045,spot.at.z);root.add(g);const {mat}=createToyKit(g);
 const deck=new THREE.Group();deck.name='fishing.deck';g.add(deck);const width=spot.habitat==='sea'?2.15:1.85,depth=spot.habitat==='sea'?1.5:.94;
 for(let i=0;i<5;i++){const plank=new THREE.Mesh(new THREE.BoxGeometry(width,.028,depth/5-.015),mat(i%2?'#b9946b':'#c4a075'));plank.position.set(0,-.014,(i-2)*depth/5);plank.receiveShadow=true;plank.name='fishing.deck.plank.'+i;deck.add(plank);}
 const sign=new THREE.Group();sign.name=spot.id+'.sign';sign.position.set(spot.sign.x-spot.at.x,0,spot.sign.z-spot.at.z);sign.rotation.y=spot.sign.yaw;g.add(sign);
 function mesh(name,geometry,color,x,y,z,parent=sign){const m=new THREE.Mesh(geometry,mat(color));m.name='fishing.sign.'+name;m.position.set(x,y,z);parent.add(m);return m;}
 const post=mesh('post',new THREE.BoxGeometry(.15,1.41,.10),'#9e7755',0,.705,0);post.castShadow=true;
 const boardGeo=new THREE.ExtrudeGeometry(roundedPanel(1.44,.98,.07),{depth:.12,bevelEnabled:false,curveSegments:3});boardGeo.translate(0,0,-.06);
 const board=mesh('board',boardGeo,'#a77d55',0,1.48,0);board.castShadow=true;board.receiveShadow=true;
 const artMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});artMaterial.name='fishing.sign.painted-art';artMaterial.userData.artwork=FISHING_SIGN_ART;const faces=[],fallbacks=[];
 function polygon(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ShapeGeometry(s);}
 for(const [side,yaw]of [['front',0],['back',Math.PI]]){
  const face=new THREE.Group();face.position.set(0,1.48,side==='front'?.062:-.062);face.rotation.y=yaw;sign.add(face);
  const fallback=new THREE.Group();face.add(fallback);fallbacks.push(fallback);mesh(side+'.paper',new THREE.PlaneGeometry(1.35,.90),'#fff0d2',0,0,0,fallback);
  const fish=mesh(side+'.fish',new THREE.CircleGeometry(.17,6),'#568e8b',.13,-.07,.003,fallback);fish.scale.set(1.50,.88,1);
  mesh(side+'.tail',polygon([[-.33,-.22],[-.09,-.07],[-.33,.08]]),'#568e8b',0,0,.003,fallback);
  mesh(side+'.eye',new THREE.CircleGeometry(.026,3),'#273f46',.24,-.035,.004,fallback);
  mesh(side+'.rod',polygon([[-.44,-.25],[-.39,-.27],[.06,.31],[.025,.34]]),'#8b633f',0,0,.004,fallback);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[.045,.33,.004],[.34,.30,.004],[.36,.08,.004],[.36,.02,.004],[.335,-.005,.004]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#496f79'}));line.name='fishing.sign.'+side+'.line';fallback.add(line);
  const art=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.90),artMaterial);art.name='fishing.sign.'+side+'.art';art.position.z=.007;art.visible=false;face.add(art);faces.push(art);
 }
 loadFishingSignArtwork(artMaterial,faces,fallbacks);
 return g;
}
