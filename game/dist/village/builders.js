import {buildCafeRoom} from './cafe-builder.js';
import {buildServiceRoom} from './service-builders.js';
import * as THREE from 'three';
export function buildVillageRoom(def,kit,progress){if(def.id==='bakeryCafe')return buildCafeRoom(def,kit,progress);if(['postOffice','photoStudio'].includes(def.id))return buildServiceRoom(def,kit,progress);const {root,box,sphere,cylinder,label}=kit,id=def.id,isCraft=id==='workshop',accent=isCraft?'#ad9bbb':'#dba572';
 const named=(m,name)=>{m.name=id+'.'+name;return m;};
 box(10.6,.34,9.6,'#bfa07d',0,-.18,.25,.15);for(let i=0;i<12;i++)box(.87,.045,9.43,i%2?'#eedbb9':'#e8d0ac',-4.79+i*.87,.01,.25,.008);
 box(10.6,3.05,.18,isCraft?'#dcd9df':'#ece1c7',0,1.54,-4.47,.045);box(.18,.65,9.6,'#d8c4a6',-5.22,.34,.25,.04);box(.18,.65,9.6,'#d8c4a6',5.22,.34,.25,.04);
 box(10.65,.18,.27,'#fff4dd',0,3.10,-4.47,.04);label(def.label,0,2.6,-4.35,3.4,'#69584a','#fff4dd');
 for(const x of [-3.55,3.55]){box(2.15,1.36,.15,'#fff6e6',x,2.1,-4.32,.06);box(1.93,1.14,.035,'#a9ccd2',x,2.1,-4.21,.035);box(.065,1.19,.045,'#fff6e6',x,2.1,-4.18,.008);box(2,.065,.045,'#fff6e6',x,2.1,-4.16,.008);}
 // Real waist-high worktable with a clear front approach and a central door lane.
 const table=named(new THREE.Group(),'workbench');root.add(table);box(3.4,.17,1.4,'#c99969',0,1.05,-1.4,.08,table);for(const x of [-1.45,1.45])for(const z of [-1.88,-.92])box(.13,1,.13,'#a7805b',x,.5,z,.025,table);
 const work=named(new THREE.Group(),'process');root.add(work);
 if(isCraft){
  box(1.55,.025,.8,'#b8bc9c',-.3,1.151,-1.4,.08,table);cylinder(.21,.27,.14,'#f2e1bd',1.15,1.21,-1.35,table);for(let i=0;i<5;i++)sphere(.09,['#e9a7a4','#e9c775'][i%2],1.15+Math.cos(i*2.4)*.16,1.31,-1.35+Math.sin(i*2.4)*.1,1,.45,1,table);
  box(.07,.045,.54,'#6e8f7e',-.95,1.19,-1.43,.02,table).rotation.y=.6;box(.07,.045,.54,'#6e8f7e',-.83,1.19,-1.43,.02,table).rotation.y=-.6;
  for(const x of [-3.75,3.75]){box(1.1,1.95,.12,'#c7a57f',x,1,-3.35,.035);for(const dx of [-.5,.5])box(.1,1.95,2,'#c7a57f',x+dx,1,-2.4,.025);for(const y of [.32,1.03,1.85])box(1.2,.1,2.05,'#e6c79b',x,y,-2.4,.04);for(let i=0;i<3;i++){const z=-3.08+i*.65;cylinder(.15,.12,.3,['#a0b9a5','#d0a5ad','#d8be7a'][i],x,1.24,z);sphere(.17,'#ebe2c8',x,1.46,z,1,.55,1);}}
  box(1.2,.68,1.3,'#bd9d78',3.4,.36,2.4,.06);box(1.32,.1,1.38,'#dabb92',3.4,.75,2.4,.06);
  label('꽃잎 · 조개 → 작은 집 장식',0,1.8,-4.33,3.25,'#735b68','#dcd9df');
 }else{
  const oven=named(new THREE.Group(),'oven');root.add(oven);box(1.1,1.7,2,'#93aaa2',-3.75,.88,-2.4,.10,oven);box(1.13,.64,1.1,'#516d6e',-3.75,.91,-1.89,.07,oven);box(.76,.34,.05,'#c0d0c4',-3.75,.96,-1.30,.045,oven);for(const x of [-4.05,-3.45])cylinder(.075,.075,.055,'#e7cd8e',x,1.64,-1.34,oven).rotation.x=Math.PI/2;
  box(1.1,1.9,.12,'#c69b75',3.75,.98,-3.35,.04);for(const x of [3.25,4.25])box(.1,1.9,2,'#c69b75',x,.98,-2.4,.025);for(const y of [.5,1.2,1.85]){box(1.2,.08,2.08,'#e5c79b',3.75,y,-2.4,.04);for(let i=0;i<3;i++)sphere(.20,'#dba362',3.75,y+.18,-3+i*.6,1,.6,.85);}
  for(const x of [-3.3,3.3]){cylinder(.60,.54,.10,'#d7b083',x,.86,2.2);cylinder(.12,.22,.8,'#a88767',x,.42,2.2);cylinder(.12,.09,.18,'#f5e6cb',x+.19,1.02,2.18);cylinder(.15,.15,.025,'#dcb98c',x+.19,.935,2.18);box(.8,.12,.7,'#a8b6a0',x,.5,3.15,.07);box(.8,.54,.1,'#a8b6a0',x,.82,3.47,.04);for(const dx of [-.28,.28])for(const dz of [-.23,.23])box(.07,.46,.07,'#a88767',x+dx,.24,3.15+dz,.015);}
  box(.78,.06,.55,'#ebe0c5',1.1,1.17,-1.4,.05,table);cylinder(.23,.18,.25,'#9aafae',-1.1,1.29,-1.4,table);box(.075,.06,.60,'#a0805c',-.8,1.23,-1.4,.025,table);
  label('반죽  →  굽기  →  꾸미기',0,1.8,-4.33,3.6,'#795e49','#ece1c7');
 }
 box(2.6,.025,1.8,isCraft?'#cec3ce':'#dbbda0',0,.056,3.2,.17);root.userData.environment={kind:id,fixtures:['workbench',isCraft?'material-shelves':'oven',isCraft?'display-table':'cafe-tables']};
 let signature;function update(village){const b=village?.bakery;const next=isCraft?'craft':b?.phase+'|'+b?.decoration;if(next===signature)return;signature=next;for(const c of [...work.children]){c.geometry?.dispose();work.remove(c);}if(isCraft){cylinder(.13,.18,.29,'#9ab5a9',-.3,1.3,-1.4,work);for(let i=0;i<3;i++){cylinder(.018,.018,.36,'#7a9868',-.3+(i-1)*.12,1.60,-1.4,work);sphere(.1,i%2?'#e9c775':'#e9aaa3',-.3+(i-1)*.12,1.79,-1.4,1,.7,1,work);}}else if(b?.phase!=='empty'){const baked=b.phase!=='dough';cylinder(.4,.42,baked?.35:.14,baked?'#d5a36f':'#f0d9af',0,baked?1.34:1.23,-1.4,work);if(b.phase==='complete'){cylinder(.42,.40,.10,'#fff1d7',0,1.56,-1.4,work);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sphere(.073,b.decoration==='berry'?'#d88483':'#eac263',Math.cos(a)*.26,1.66,-1.4+Math.sin(a)*.26,1,.9,1,work);}}}}
 update(progress.village);return {update};
}
