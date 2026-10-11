export const CURLING=Object.freeze({id:'schoolGym.curling',x:-12,z:7,yaw:Math.PI,bay:Object.freeze({minX:-14.5,maxX:-9.5,minZ:-14,maxZ:10}),entry:Object.freeze({x:-12,z:8.3,yaw:Math.PI})});
export const CURLING_GEOMETRY=Object.freeze({floorY:.012,stoneHeight:.18,handleY:.305,handleWidth:.30,handleHeight:.07,handleDepth:.14,releaseX:.48,startZ:.80,push:.15});
export const CURLING_AID=Object.freeze({pushAngle:-.70,carryAngle:-1.45,liftTicks:36,gripX:.61,gripY:.46,gripBackZ:.3197159292887231,gripWidth:.14,gripHeight:.18,gripDepth:.06,headX:.48,headY:.293,headZ:.705,headWidth:.18,headHeight:.045,headDepth:.05,withdrawal:.05});
export const CURLING_STANCE=Object.freeze({x:0,y:.012,z:0});
export const CURLING_OBSTACLES=Object.freeze([{id:'schoolGym.curling-west',x:-14.125,z:-3.25,hx:.075,hz:10.25},{id:'schoolGym.curling-east',x:-9.875,z:-3.25,hx:.075,hz:10.25},{id:'schoolGym.curling-end',x:-12,z:-13.575,hx:2.2,hz:.075}]);
const smooth=t=>t*t*(3-2*t);
export function curlingStrokeProgress(value=0){const u=Math.max(0,Math.min(1,value));return u<=.5?.5*smooth(u*2):.5+.5*smooth((u-.5)*2);}
export const curlingHeldStone=f=>({x:.48,z:.80+.15*curlingStrokeProgress(f.delivery??0)});
export function curlingDeliveryFrame(value=0){const u=Math.max(0,Math.min(1,value)),left=u<.5?.15*smooth(u*2):.15,right=u<.5?0:.15*smooth((u-.5)*2),moving=u===0||u===.5||u===1?null:u<.5?'left':'right',lift=moving?.05*Math.sin(Math.PI*(u<.5?u*2:(u-.5)*2)):0;return{root:{x:0,y:.012,z:(left+right)/2},feet:{left:{x:-.21,y:.012+(moving==='left'?lift:0),z:left,contact:moving!=='left'},right:{x:.21,y:.012+(moving==='right'?lift:0),z:right,contact:moving!=='right'}},delivery:u,aidLift:0,holding:true};}
