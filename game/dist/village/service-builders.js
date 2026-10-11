import {buildPhotoRig} from './photo-rig.js';
import * as THREE from 'three';
export function buildServiceRoom(def,kit,progress){const {root,box,sphere,cylinder,label}=kit,id=def.id,post=id==='postOffice',accent=post?'#ba8b79':'#91aaa9';const named=(o,n)=>{o.name=id+'.'+n;return o;};
 box(10.6,.34,9.6,'#b99b7d',0,-.18,.25,.14);for(let i=0;i<12;i++)box(.87,.045,9.42,i%2?'#e8d5b9':'#eedec7',-4.79+i*.87,.01,.25,.008);box(10.6,3.08,.18,post?'#e1d6c4':'#d9e4df',0,1.56,-4.47,.04);for(const x of [-5.22,5.22])box(.18,.62,9.6,'#c9c6b0',x,.32,.25,.035);box(10.6,.16,.25,'#fff4db',0,3.15,-4.47,.03);label(def.label,0,2.76,-4.34,3.4,'#465d57','#fff4db');
 let photoRig=null;const work=named(new THREE.Group(),'workbench');root.add(work);
 if(post){
  box(3.4,1,1.4,'#a8b9a5',0,.53,-1.4,.1,work);box(3.58,.13,1.52,'#d9b88d',0,1.09,-1.4,.075,work);box(1.04,.045,.62,'#fff4dc',-.5,1.19,-1.3,.025,work);const pen=box(.038,.05,.52,'#597d71',.09,1.21,-1.23,.012,work);pen.rotation.y=.4;cylinder(.14,.14,.10,'#a08365',1.05,1.22,-1.5,work);cylinder(.065,.08,.20,'#87614e',1.05,1.36,-1.5,work);box(.32,.035,.3,'#ba8b79',.58,1.21,-1.53,.03,work);label('편지 쓰는 자리',0,.7,-.69,2.4,'#425d53','#a8b9a5');
  for(const x of [-3.75,3.75]){box(1.2,2.45,.16,'#ac8c69',x,1.25,-3.42,.04);for(const y of [.13,.86,1.59,2.32])box(1.22,.1,2.2,'#d2b386',x,y,-2.4,.03);for(const dx of [-.55,.55])box(.1,2.3,2.2,'#bd9a72',x+dx,1.25,-2.4,.025);for(let row=0;row<3;row++){box(.66,.20,.42,['#e7c19d','#c6c7b0','#d9bbaa'][row],x,.31+row*.73,-1.7,.035);box(.08,.22,.44,'#faf0d7',x,.31+row*.73,-1.7,.015);}}
  for(const [x,t]of[[-3.7,'도착한 편지'],[3.7,'작은 선물']])label(t,x,2.78,-3.32,1.9);for(let i=0;i<3;i++){const x=(i-1)*1.13;box(.92,.60,.05,'#fff0d2',x,1.89,-4.32,.035);box(.62,.04,.055,'#9fb9a7',x,1.9,-4.28,.006);sphere(.08,'#d6a273',x+.27,2.04,-4.24,1,1,.3);}
 }else{
  photoRig=buildPhotoRig(root);

 }
 box(2.5,.02,1.6,post?'#d9bca5':'#b6c9c0',0,.06,3.3,.17);root.userData.environment={kind:id,fixtures:post?['writing-counter','letter-cubbies','gift-shelves']:['photo-backdrop','camera','studio-lights']};return {photoRig,update(){}};
}
