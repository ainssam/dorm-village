// Pure trajectory prototype for the three actual rung-to-rung climbs.
// Start/end mount and top-deck mantle are separate supported transitions.
// Coordinates returned to the poser are local, +Z front; yaw turns with the
// relocated station so +Z faces the real rungs on its south pad. Keep the
// same contact heights/cycle, with the athlete standing north of the rungs.
export const CLIMB={rootX:1.6,rootZ:5.7,yaw:0,rungZ:6.45,deckFrontZ:6.38,deckTop:1.05,railRadius:.025,rungs:[.08,.38,.68,.98],footForward:.48,footSupportOffset:-.010537273411403765,handX:.68,handLead:.68,handForward:.74,cycleSeconds:1.56};
const ease=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
/**
 * Six phases per rung: hand A up, opposite foot up, root +.15,
 * hand B up, other foot up, root +.15. Only the reaching contact releases.
 * All other contacts remain fixed in world space. Moving foot goes away
 * from the rung and .075 above its interpolation, not through the rung.
 */
export function climbContactFrame(seconds){
 const p=Math.min(3,Math.max(0,seconds/CLIMB.cycleSeconds));
 const k=Math.min(2,Math.floor(p)),fraction=p>=3?1:p-k,phase=Math.min(5,Math.floor(fraction*6)),u=ease(fraction>=1?1:fraction*6-phase),r=CLIMB.rungs[k],next=CLIMB.rungs[k+1];
 const firstHand=k%2===0?'left':'right',secondHand=firstHand==='left'?'right':'left',firstFoot=secondHand,secondFoot=firstHand;
 const worldHands={left:r+CLIMB.handLead,right:r+CLIMB.handLead},worldFeet={left:r+CLIMB.footSupportOffset,right:r+CLIMB.footSupportOffset},contacts={leftHand:true,rightHand:true,leftFoot:true,rightFoot:true};
 let rootY=r+CLIMB.footSupportOffset,handArcSide=null,footArcSide=null;
 if(phase>=1)worldHands[firstHand]=next+CLIMB.handLead;
 if(phase>=2)worldFeet[firstFoot]=next+CLIMB.footSupportOffset;
 if(phase>=3)rootY+=.15;
 if(phase>=4)worldHands[secondHand]=next+CLIMB.handLead;
 if(phase>=5)worldFeet[secondFoot]=next+CLIMB.footSupportOffset;
 if(phase===0){worldHands[firstHand]=mix(r,next,u)+CLIMB.handLead;contacts[firstHand+'Hand']=u===0||u===1;handArcSide=firstHand;}
 if(phase===1){worldFeet[firstFoot]=mix(r,next,u)+CLIMB.footSupportOffset;contacts[firstFoot+'Foot']=u===0||u===1;footArcSide=firstFoot;}
 if(phase===2)rootY+=.15*u;
 if(phase===3){worldHands[secondHand]=mix(r,next,u)+CLIMB.handLead;contacts[secondHand+'Hand']=u===0||u===1;handArcSide=secondHand;}
 if(phase===4){worldFeet[secondFoot]=mix(r,next,u)+CLIMB.footSupportOffset;contacts[secondFoot+'Foot']=u===0||u===1;footArcSide=secondFoot;}
 if(phase===5)rootY+=.15*u;
 const arc=Math.sin(Math.PI*u),hands={},footOffsets={};
 for(const side of ['left','right']){
  hands[side]=[CLIMB.handX,worldHands[side]-rootY,CLIMB.handForward-(handArcSide===side?.15*arc:0)];
  footOffsets[side]=[0,worldFeet[side]-rootY+(footArcSide===side?.075*arc:0),CLIMB.footForward-(footArcSide===side?.15*arc:0)];
 }
 return {root:{x:CLIMB.rootX,y:rootY,z:CLIMB.rootZ,yaw:CLIMB.yaw},hands,footOffsets,worldHands,worldFeet,contacts,phase,cycle:k};
}
// Descend by sampling this exact route backward. Do not reverse only root motion.
