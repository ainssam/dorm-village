import {LESSONS} from './learning-model.js';
import * as THREE from 'three';
// Shallow models sit on existing walls/cabinets. Science table and field lectern have matching footprints.
export function buildLearningFixture(roomId,{root,box,sphere,cylinder,label,ring,beam}){
 if(roomId==='sportsField')return;
 const entry=Object.entries(LESSONS).find(([,l])=>l.room===roomId);if(!entry)return;const[id,l]=entry,{x,y,z}=l.fixture,g=new THREE.Group();g.name='learning.'+id;root.add(g);
 const B=(w,h,d,c,dx,dy,dz=0)=>box(w,h,d,c,x+dx,y+dy,z+dz,.035,g);
 const S=(r,c,dx,dy,dz=0)=>sphere(r,c,x+dx,y+dy,z+dz,1,1,.35,g);
 if(id==='science'){B(1.8,.12,.82,'#d4ad78',0,-.62,.04);for(const dx of[-.7,.7])for(const dz of[-.26,.32])B(.10,.92,.10,'#86a396',dx,-1.14,dz);B(.13,.24,.1,'#8d9b77',0,-.55,.02);}
 if(id==='sports'){B(.95,.10,.62,'#b99364',0,-.09,.04);B(.13,.71,.13,'#8d9b77',0,-.48,.04);B(.65,.08,.50,'#baa278',0,-.83,.04);}
 B(1.6,.90,.12,'#cfa873',0,0);B(1.44,.73,.03,id==='sports'?'#6e8d62':'#f3edce',0,0,.085);
 const colors=['#689888','#e0ba59','#c48672'];
 if(id==='math'){const pts=[];for(let i=0;i<=20;i++){const dx=-.57+i*.057;pts.push(new THREE.Vector3(x+dx,y-.20+(dx+.10)**2*.85,z+.12));}g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#416a57'})));S(.065,'#e1b543',-.1,-.2,.12);}
 else if(id==='science'){B(1.0,.07,.08,'#a77c50',0,-.07,.15);B(.08,.22,.08,'#84a297',0,-.20,.15);B(.18,.25,.08,colors[0],-.27,.09,.15);B(.18,.15,.08,colors[2],.53,.04,.15);}
 else if(id==='music'){for(let i=0;i<8;i++)B(.12,i%3? .15:.31,.04,i%3?colors[0]:colors[1],-.56+i*.16,0,.12);}
 else if(id==='art'){for(const[dx,bg]of[[-.35,'#253d50'],[.35,'#f0d38b']]){B(.56,.51,.04,bg,dx,0,.12);for(let j=0;j<5;j++)S(.06,'#e7aa3d',dx+Math.cos(j*1.26)*.08,Math.sin(j*1.26)*.08,.15);}}
 else if(id==='language'){for(let i=0;i<6;i++){const dx=-.43+(i%3)*.43,dy=.18-Math.floor(i/3)*.36;B(.32,.27,.04,i%3===0?'#f1d387':'#689888',dx,dy,.13);if(i%3===0)S(.064,'#c78670',dx,dy,.165);else B(.10,.12,.025,'#f2e8bd',dx,dy,.16);}}
 else if(id==='sports'){beam([x-.5,y-.23,z+.14],[x+.5,y+.22,z+.14],.025,'#fff5d3',g);S(.09,colors[1],-.5,-.23,.16);S(.09,colors[1],.5,.22,.16);S(.09,colors[2],.15,-.17,.16);}
 else{for(let i=0;i<3;i++){B(.33,.46,.025,colors[i],-.45+i*.45,0,.12);B(.23,.025,.02,'#fff5d9',-.45+i*.45,.10,.14);B(.23,.025,.02,'#fff5d9',-.45+i*.45,-.01,.14);}}
 label(({math:'곡선의 길',science:'추와 거리',music:'네 박 리듬',art:'두 배경',health:'정보 확인',sports:'공 주고받기',language:'뒤집기 짝 찾기'})[id],x,y+.64,z+.11,1.65,'#345448','#f3edce',g);
 if(l.fixture.yaw){const pivot=new THREE.Group();pivot.position.set(x,0,z);root.add(pivot);pivot.add(g);g.position.set(-x,0,-z);pivot.rotation.y=l.fixture.yaw;}
 const marker=ring(l.at.x,l.at.z,'#f5d475',.43);marker.name='learning.'+id+'.approach';
}
