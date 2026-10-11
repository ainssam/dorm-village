import * as THREE from 'three';import {createToyKit} from '../world/toy-kit.js';import {SOCCER} from './field-layout.js';
export function buildSoccerCourt(parent){
 const root=new THREE.Group();root.name='sportsField.soccer';parent.add(root);const {box,sphere}=createToyKit(root);
 box(11.4,.016,5.6,'#a9c185',0,.027,0,.1);
 for(const z of[-2.65,2.65])box(10.9,.008,.035,'#eaf0cf',0,.043,z,.004);
 for(const x of[-5.45,5.45])box(.035,.008,5.3,'#eaf0cf',x,.043,0,.004);
 const goal=new THREE.Group();goal.name='sportsField.soccer-goal';goal.position.set(SOCCER.goal.x,0,SOCCER.goal.z);goal.rotation.y=SOCCER.goal.yaw;root.add(goal);
 for(const x of[-1.5,1.5]){box(.1,1.5,.12,'#f3e9d1',x,.78,0,.04,goal);box(.055,.055,.8,'#e3ddc6',x,.055,-.4,.016,goal);box(.055,1.5,.055,'#e3ddc6',x,.78,-.8,.016,goal);}
 box(3.1,.1,.12,'#f3e9d1',0,1.54,0,.035,goal);box(3.1,.055,.055,'#e3ddc6',0,1.54,-.8,.016,goal);
 for(let i=0;i<=10;i++)box(.016,1.45,.016,'#dce2c9',-1.5+i*.3,.77,-.8,.003,goal);
 for(let j=0;j<=5;j++){const y=.06+j*.29;box(3,.016,.016,'#dce2c9',0,y,-.8,.003,goal);for(const x of[-1.5,1.5])box(.016,.016,.8,'#dce2c9',x,y,-.4,.003,goal);}
 const b=SOCCER.ball,ball=sphere(.27,'#f4e5c4',b.x,b.y,b.z);ball.name='sportsField.ball';for(const dx of[-.16,.16])sphere(.055,'#8aa297',dx,.22,.10,1,1,.2,ball);
 return {root,goal,ball};
}
