/** Latest requested roles: seated desk staff, shelf browser, seated reader.
 * Approval-only scene proposal; actual GLBs, no game checkout mutation.
 */
import {applyResidentMotion} from './resident-pose.js';
export {applyResidentMotion};
const TAU=Math.PI*2;
const pulse=(t,a,b)=>t<a||t>b?0:Math.sin(Math.PI*(t-a)/(b-a))**2;
const part=(position=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>({position,rotation,scale});
const settings={
 chinchilla:{origin:[-2.20,.32,-.08],yaw:.06,phase:1.17,role:'desk'},
 armadillo:{origin:[.16,0,0],yaw:-.83,phase:3.43,role:'shelf'},
 capybara:{origin:[2.20,.28,.02],yaw:-.12,phase:5.21,role:'reader'},
};
export function createResidentRoleMotion(species,{origin,yaw}={}){
 if(!settings[species])throw new Error(`Unapproved species ${species}`);const cfg={...settings[species],...(origin?{origin}:{}),...(yaw!==undefined?{yaw}:{})};
 return {species,role:cfg.role,sample(time,actionTime=time){
  const t=Math.max(0,time),aT=Number.isFinite(actionTime)?actionTime:-1,breath=.0025*Math.sin(TAU*t/4+cfg.phase),p={};
  let blinkTime=((t+cfg.phase*.63)%4.0+4)%4.0;
  const blink=blinkTime<.14?1-.96*Math.sin(Math.PI*blinkTime/.14)**2:1;
  for(const side of['L','R'])p[`Eye.${side}`]=part([0,0,0],[0,0,0],[1,blink,1]);
  p.Body=part([0,breath,0],[0,0,0],[1,1+breath*.6,1]);
  let state,props={};
  if(species==='chinchilla'){
   const check=pulse(aT,.7,3.4),welcome=pulse(aT,4.2,7.1),tap=pulse(aT,1.6,2.6);
   p.Head=part([0,breath,0],[.070+.160*check,.035-.12*welcome,.018*welcome]);
   p['Arm.L']=part([0,.12+breath,.09],[-.08,0,-.06]);
   p['Arm.R']=part([0,.12+breath+.018*tap,.10+.014*tap],[-.09-.08*tap,0,.04]);
   p['Foot.L']=part([0,0,.04],[0,0,0]);p['Foot.R']=part([0,0,.035],[0,0,0]);
   p.Tail=part([0,breath,0],[0,.025*Math.sin(TAU*t/8+cfg.phase),.006*Math.sin(TAU*t/4)]);
   p['Ear.L']=part([0,0,0],[0,0,.008*Math.sin(TAU*t/8)]);p['Ear.R']=part([0,0,0],[0,0,-.007*Math.sin(TAU*t/8+1.2)]);
   state=check>.15?'장부 확인하기':welcome>.15?'이용자 살피기':'대출 데스크';
  }else if(species==='armadillo'){
   const reach=pulse(aT,1.3,6.6),inspect=pulse(aT,2.4,5.5);
   p.Head=part([0,breath,0],[.025+.09*inspect,-.025-.095*reach,-.015*inspect]);
   p['Arm.L']=part([-.005*reach,breath+.020*reach,.085*reach],[.22-.72*reach,0,-.06-.02*reach]);
   p['Arm.R']=part([0,breath,0],[.32,0,.12]);
   p['Foot.L']=part();p['Foot.R']=part();p.Shell=part([0,breath,0]);
   props.selectedBook={pull:.036*inspect,tilt:.035*inspect};
   state=reach>.20?'책 고르기':'책장 둘러보기';
  }else{
   const glance=pulse(aT,5.1,7.5),page=pulse(aT,1.8,4.0);
   p.Head=part([0,breath,0],[.195-.115*glance,.030*Math.sin(TAU*t/8+cfg.phase)+.07*glance,-.009*Math.sin(TAU*t/4)]);
   p.Book=part([0,breath+.010,0],[-.13,0,.008*Math.sin(TAU*t/8)]);
   p['Arm.L']=part([0,breath+.007,0],[-.06,0,-.006]);
   p['Arm.R']=part([0,breath+.008+.005*page,0],[-.06-.022*page,0,.006+.012*page]);
   p['Foot.L']=part([0,0,.05]);p['Foot.R']=part([0,0,.045]);
   state=glance>.35?'잠깐 쉬어 읽기':'독서하기';
  }
  return{root:{position:[...cfg.origin],yaw:cfg.yaw},parts:p,visibility:{Book:species==='capybara'},props,meta:{species,role:cfg.role,state,seated:species!=='armadillo',seed:cfg.phase}};
 }};
}
export function applyResidentRoleMotion(group,pose){
 applyResidentMotion(group,pose);
 for(const[role,visible]of Object.entries(pose.visibility??{}))if(group.userData.parts[role])group.userData.parts[role].visible=visible;
}
