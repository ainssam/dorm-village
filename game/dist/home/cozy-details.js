import * as THREE from 'three';
import {HOUSE_IDS} from './layout.js';

// Small, static home belongings. Furniture-top details never change collisions or save slots.
export function addCozyHomeDetails(id,kit){
 if(!HOUSE_IDS.includes(id))return null;
 const {root,box,sphere,cylinder,mat}=kit,cozy=new THREE.Group();cozy.name=id+'.cozy';root.add(cozy);
 const palette={cream:'#f4e6c9',oat:'#cbae88',sage:'#a4beb0',rose:'#d7a28d',blue:'#91b4c1',gold:'#efd49a',ink:'#715548'};
 const group=(name,x=0,y=0,z=0,kind='furniture-top',yaw=0)=>{const g=new THREE.Group();g.name=id+'.'+name;g.userData={decorative:true,placement:kind,...(kind==='wall'?{wallNormal:[Math.sin(yaw),Math.cos(yaw)]}:{})};g.position.set(x,y,z);g.rotation.y=yaw;cozy.add(g);return g;};
 const round=(g,w,h,d,c,x=0,y=0,z=0,r=.05)=>box(w,h,d,c,x,y,z,r,g);
 const ball=(g,r,c,x,y,z,sx=1,sy=1,sz=1)=>sphere(r,c,x,y,z,sx,sy,sz,g);
 const disk=(g,r,h,c,x,y,z,r2=r)=>cylinder(r,r2,h,c,x,y,z,g);
 function tube(g,pts,r,c){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),m=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,pts.length*3),r,5,false),mat(c));g.add(m);return m;}
 function plush(g,x,y,z,scale,color,animal='bear',yaw=0){
  const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(scale);p.rotation.y=yaw;g.add(p);
  ball(p,.32,color,0,.34,0,1,1.02,.78);ball(p,.30,color,0,.77,.02,1,.94,.85);
  for(const side of [-1,1]){ball(p,animal==='bunny'?.115:.12,color,side*.21,animal==='bunny'?1.13:1.0,.015,1,animal==='bunny'?2.25:1,.70);ball(p,.075,palette.rose,side*.21,animal==='bunny'?1.13:1.0,.084,.72,animal==='bunny'?2.2:.7,.3);ball(p,.13,color,side*.29,.4,.04,.85,1.15,.85);ball(p,.145,color,side*.18,.14,.19,1,.72,1.25);ball(p,.022,palette.ink,side*.103,.8,.256,1,1.25,.3);ball(p,.047,palette.rose,side*.17,.717,.241,1,.48,.2);}
  ball(p,.12,palette.cream,0,.695,.25,1,.7,.4);ball(p,.026,palette.ink,0,.735,.302,1,.65,.35);
  tube(p,[[-.048,.688,.299],[0,.663,.307],[.048,.688,.299]],.006,palette.ink);
  round(p,.25,.12,.04,palette.sage,0,.49,.257,.04);ball(p,.038,palette.gold,0,.49,.283,1,1,.45);
  return p;
 }
 function bookStack(g,x,y,z,colors=[palette.sage,palette.rose,palette.blue]){for(let i=0;i<colors.length;i++){const b=new THREE.Group();b.position.set(x,y+i*.105,z);b.rotation.y=(i%2?.12:-.09);g.add(b);round(b,.43,.032,.31,colors[i],0,.014,0,.013);round(b,.38,.065,.275,palette.cream,0,.064,0,.009);round(b,.43,.02,.31,colors[i],0,.104,0,.01);}}
 function mug(g,x,y,z,color){disk(g,.12,.20,color,x,y+.10,z,.105);disk(g,.097,.012,'#a87957',x,y+.202,z);tube(g,[[x+.095,y+.16,z],[x+.20,y+.16,z],[x+.21,y+.07,z],[x+.10,y+.045,z]],.025,color);}
 function lamp(g,x,y,z,scale=1){const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(scale);g.add(p);disk(p,.18,.04,palette.oat,0,.02,0,.22);disk(p,.028,.34,palette.oat,0,.20,0);const shade=disk(p,.19,.29,'#f4d49d',0,.5,0,.31);shade.material=shade.material.clone();shade.material.emissive.set('#eeb56e');shade.material.emissiveIntensity=.22;disk(p,.235,.025,'#fff0bf',0,.359,0);}
 function rug(name,x,z,w,d,color){const g=group(name,x,.04,z,'floor-flat');round(g,w,.016,d,color,0,0,0,.10);round(g,w-.20,.009,d-.20,palette.cream,0,.014,0,.09);round(g,w-.36,.009,d-.36,color,0,.024,0,.08);for(const side of [-1,1])for(let i=0;i<11;i++)round(g,.065,.012,.16,palette.cream,-w/2+.18+i*(w-.36)/10,.012,side*(d/2+.035),.01);return g;}
 function frame(g,x,y,z,w,h,color){round(g,w,h,.05,palette.oat,x,y,z,.025);round(g,w-.09,h-.09,.012,palette.cream,x,y,z+.034,.02);ball(g,.10,color,x-.06,y+.05,z+.048,1,1,.06);round(g,w*.54,.025,.015,palette.sage,x,y-h*.23,z+.047,.006);}
 function lights(g,w){const points=[];for(let i=0;i<=14;i++){const x=-w/2+i*w/14,y=-.21*(1-(x/(w/2))**2);points.push([x,y,0]);if(i%2===0){const bulb=ball(g,.064,'#ffe6ab',x,y-.085,.01,.7,1,.7);bulb.material=bulb.material.clone();bulb.material.emissive.set('#ffc972');bulb.material.emissiveIntensity=.55;round(g,.034,.055,.03,palette.oat,x,y-.022,0,.01);}}tube(g,points,.01,'#b79970');}
 if(id==='home'){
  const bed=group('bed-plush');plush(bed,-3.08,.70,-.30,.56,'#d1ad88','bear',.13);plush(bed,-2.56,.68,-.40,.40,'#f0dfbf','bunny',-.1);
  const quilt=group('quilt',-2.90,.73,.84);round(quilt,1.28,.055,.54,palette.rose,0,0,0,.035);round(quilt,1.27,.055,.15,'#e6bba1',0,.025,-.22,.025);for(let i=0;i<9;i++)round(quilt,.022,.009,.48,'#efd1b5',-.55+i*.138,.033,0,.004);for(let i=0;i<4;i++)round(quilt,1.18,.009,.018,'#efd1b5',0,.037,-.18+i*.12,.004);
  const cushion=group('bed-cushion',-2.86,.77,.07);round(cushion,.52,.17,.38,palette.gold,0,0,0,.08);for(const x of [-.16,.16])round(cushion,.016,.015,.29,palette.cream,x,.09,0,.004);
  const books=group('bedside-books',-2.35,.46,-2.24);bookStack(books,0,0,0,[palette.blue,palette.rose]);
  const fairies=group('fairy-lights',.0,2.73,-3.18,'wall');lights(fairies,2.75);
  const basket=group('linen-basket',2.35,.45,-2.29);round(basket,.84,.36,.29,palette.oat,0,.02,0,.035);for(let i=0;i<5;i++)round(basket,.83,.023,.012,'#e2caa6',0,-.10+i*.063,.152,.006);round(basket,.61,.17,.23,palette.sage,0,.23,0,.04);round(basket,.57,.035,.245,palette.cream,0,.3,0,.025);
  const trinkets=group('cabinet-books',3.2,1.133,.10);bookStack(trinkets,-.26,0,-.25,[palette.rose,palette.sage]);
  const slippers=group('bed-slippers',-2.88,.04,1.21);for(const x of [-.19,.19]){ball(slippers,.17,palette.cream,x,.07,0,.70,.37,1.25);ball(slippers,.14,palette.sage,x,.125,-.055,.81,.45,.88);}
 }else if(id==='homeKitchen'){
  rug('kitchen-runner',.10,.15,3.35,1.35,'#c4b08b');
  const jars=group('shelf-jars',-.08,2.05,-3.22,'wall');round(jars,2.25,.085,.36,palette.oat,0,0,0,.025);for(const [i,c]of [palette.sage,palette.rose,palette.gold].entries()){disk(jars,.13,.30,c,-.73+i*.43,.193,0,.13);disk(jars,.14,.055,palette.cream,-.73+i*.43,.37,0);round(jars,.12,.105,.014,palette.cream,-.73+i*.43,.20,.134,.015);}mug(jars,.73,.055,0,palette.blue);
  const towel=group('tea-towel',.78,.68,-1.645);round(towel,.47,.55,.035,palette.cream,0,0,0,.025);for(const x of[-.13,.13])round(towel,.035,.50,.012,palette.rose,x,-.025,.024,.005);round(towel,.45,.03,.015,palette.rose,0,-.22,.025,.005);
  const board=group('recipe-board',2.27,2.12,-3.34,'wall');frame(board,0,0,0,.85,.92,palette.rose);for(let i=0;i<3;i++)round(board,.42-i*.06,.035,.018,palette.oat,.06,-.08-i*.10,.056,.007);ball(board,.026,palette.blue,0,.38,.05);
  const counter=group('breakfast-tray',-1.12,1.17,-2.56);round(counter,.55,.055,.44,palette.oat,0,0,0,.035);mug(counter,-.11,.03,0,palette.blue);ball(counter,.1,'#d9a46d',.13,.085,.08,1,.55,.65);
  const fridge=group('fridge-notes',-3.08,1.81,-1.632);round(fridge,.31,.40,.018,palette.cream,-.16,0,0,.018);round(fridge,.26,.28,.018,'#ecd2a7',.19,.05,0,.015);ball(fridge,.042,palette.rose,-.16,.16,.016,1,1,.3);ball(fridge,.038,palette.sage,.19,.15,.016,1,1,.3);for(let i=0;i<3;i++)round(fridge,.17,.016,.012,palette.oat,-.16,.07-i*.07,.015,.004);
  const utensils=group('utensil-pot',.47,1.17,-2.70);disk(utensils,.12,.24,palette.sage,0,.12,0);for(let i=0;i<3;i++){const x=-.07+i*.065;round(utensils,.025,.36,.025,palette.oat,x,.34,0,.007);ball(utensils,.061,palette.oat,x,.52,0,.55,1,.24);}
 }else if(id==='homeStudy'){
  rug('study-rug',-.62,.0,2.35,3.5,'#bdc9ba');
  const deskLamp=group('desk-lamp',-2.4,1.075,1.11);lamp(deskLamp,0,0,0,.91);
  const phones=group('headphones',-2.0,1.09,1.22,'furniture-top',Math.PI/2);tube(phones,[[-.18,.09,0],[-.2,.32,0],[0,.43,0],[.2,.32,0],[.18,.09,0]],.046,palette.rose);for(const x of[-.18,.18])round(phones,.09,.20,.14,palette.cream,x,.09,0,.04);
  const board=group('pinboard',-3.86,2.13,.0,'wall',Math.PI/2);round(board,2.4,1.02,.065,palette.oat,0,0,0,.04);round(board,2.28,.90,.022,'#d9c39a',0,0,.048,.02);for(const [i,c]of[palette.blue,palette.sage,palette.rose].entries()){const p=new THREE.Group();p.position.set(-.76+i*.75,.03,.072);p.rotation.z=(i-1)*.06;board.add(p);round(p,.55,.62,.015,palette.cream,0,0,0,.02);ball(p,.027,c,0,.27,.024,1,1,.5);round(p,.32,.035,.016,c,0,-.17,.02,.006);if(i===1){for(let j=0;j<3;j++)round(p,.07,.12+j*.05,.018,c,-.11+j*.11,-.045,.02,.008);}else frame(p,0,.05,.02,.28,.26,c);}
  const books=group('study-books',-3.27,1.58,-3.07);books.scale.setScalar(.78);books.rotation.y=Math.PI/2;bookStack(books,0,0,0,[palette.sage,palette.gold]);
  const organizer=group('pencil-cup',-2.65,1.08,1.43);disk(organizer,.09,.20,palette.rose,0,.1,0);for(let i=0;i<3;i++)round(organizer,.023,.3,.023,[palette.blue,palette.oat,palette.sage][i],-.047+i*.045,.24,0,.004);
  const shelf=group('robot-shelf-lights',-3.69,2.94,-1.0,'wall',Math.PI/2);lights(shelf,3.25);
 }else{
  rug('play-rug',.15,1.9,4.90,3.25,'#cfb7a6');
  const basket=group('plush-basket',-3.0,.07,3.49);round(basket,.98,.27,.65,palette.oat,0,.13,0,.07);for(let i=0;i<4;i++)round(basket,.95,.025,.015,'#ead5ae',0,.04+i*.065,.33,.007);plush(basket,-.23,.13,.02,.43,'#e6c296','bear',.1);plush(basket,.24,.13,-.04,.35,'#eae0c5','bunny',-.12);
  const reader=group('reading-plush',-3.0,1.22,2.76);plush(reader,0,0,0,.95,'#d8b997','bear',-.28);round(reader,.66,.075,.36,palette.sage,0,.27,.35,.025);round(reader,.61,.017,.32,palette.cream,0,.317,.35,.015);round(reader,.022,.025,.32,palette.oat,0,.332,.35,.004);
  const pennants=group('pennants',-4.21,2.65,.7,'wall',Math.PI/2);tube(pennants,[[-2.9,0,0],[0,-.20,0],[2.9,0,0]],.012,palette.oat);for(let i=0;i<9;i++){const x=-2.6+i*.65,y=-.2*(1-(x/2.9)**2),shape=new THREE.Shape();shape.moveTo(-.20,0);shape.lineTo(.20,0);shape.lineTo(0,-.29);shape.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:[palette.sage,palette.rose,palette.gold,palette.blue][i%4],roughness:.9,side:THREE.DoubleSide}));m.position.set(x,y,.01);pennants.add(m);}
  const artwork=group('play-pictures',-4.21,1.87,2.3,'wall',Math.PI/2);frame(artwork,0,0,0,.76,.66,palette.gold);frame(artwork,-.91,.08,0,.61,.79,palette.sage);
  const cushion=group('reading-cushion',-3.0,1.19,2.76);round(cushion,1.05,.12,.82,palette.blue,0,0,0,.12);
 }
 return cozy;
}
