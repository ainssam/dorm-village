const path=Object.freeze([[1.10,-3.25],[-.85,-3.25],[-.85,-2.50],[1.10,-2.50]].map(([x,z],i)=>Object.freeze({x,z,yaw:i===0?0:i===2?Math.PI/4:0})));
/** Whole animated silhouette: measured radius .965811 × .65 < .65. */
export const COMPUTER_DOG_SPEC=Object.freeze({id:'computer-robot-dog',name:'로봇강아지',role:'반짝코드 컴퓨터실 친구',scale:.65,radius:.65,walkRadius:.65,height:1.48*.65,speed:.23,turnRate:1.25,path,home:path[0],interactionRadius:1.6,text:'멍! 명령을 하나씩 놓고 로봇이 어디로 움직일지 먼저 생각해 봐요. 왼쪽 앞 컴퓨터에서 로봇 공방을 열 수 있어요. 나는 뒤쪽에서 천천히 산책할게요.'});
export const COMPUTER_DOG_RESIDENTS=Object.freeze([COMPUTER_DOG_SPEC]);
export const COMPUTER_DOG_GROUND=Object.freeze({connected:.018,standalone:.031});
