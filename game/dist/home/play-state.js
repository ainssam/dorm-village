const tick=(state,action)=>action.token===state.generation&&Number.isFinite(action.dt)&&action.dt>0;
export const initialKitchen=(generation=0)=>({phase:'empty',elapsed:0,generation});
export function reduceKitchen(s,a){
 if(['RESET','CANCEL'].includes(a.type))return initialKitchen(s.generation+1);
 if(a.type==='ADD'&&s.phase==='empty')return {...s,phase:'filled'};
 if(a.type==='MIX'&&s.phase==='filled')return {...s,phase:a.reduced?'mixed':'mixing',elapsed:0,generation:s.generation+1};
 if(a.type==='TICK'&&s.phase==='mixing'&&tick(s,a)){const elapsed=Math.min(1.2,s.elapsed+Math.min(a.dt,.25));return {...s,elapsed,phase:elapsed>=1.2-1e-8?'mixed':'mixing'};}
 if(a.type==='SERVE'&&s.phase==='mixed')return {...s,phase:'served'};
 return s;
}
export const COMMANDS=Object.freeze({forward:'앞으로',left:'왼쪽으로 돌기',right:'오른쪽으로 돌기'});
export const initialCode=(generation=0)=>({phase:'editing',commands:[],x:1,z:3,heading:0,pc:0,elapsed:0,generation,message:'북쪽을 보는 로봇을 별 (3, 1)까지 보내요'});
export function reduceCode(s,a){
 if(a.type==='CLEAR')return initialCode(s.generation+1);
 if(a.type==='CANCEL')return {...s,phase:s.phase==='running'?'editing':s.phase,elapsed:0,generation:s.generation+1};
 if(a.type==='STOP'&&s.phase==='running')return {...s,phase:'editing',elapsed:0,generation:s.generation+1,message:'실행을 멈췄어요. 다시 실행하면 시작 칸으로 돌아가요'};
 if(a.type==='APPEND'&&s.phase!=='running'&&Object.hasOwn(COMMANDS,a.command)&&s.commands.length<12)return {...s,commands:[...s.commands,a.command],phase:'editing'};
 if(a.type==='REMOVE_LAST'&&s.phase!=='running'&&s.commands.length)return {...s,commands:s.commands.slice(0,-1),phase:'editing'};
 if(a.type==='START'&&s.phase!=='running'&&s.commands.length)return {...initialCode(s.generation+1),commands:[...s.commands],phase:'running',message:'차례대로 실행하는 중'};
 if(a.type==='TICK'&&s.phase==='running'&&tick(s,a)){
  let next={...s,elapsed:s.elapsed+Math.min(.5,a.dt)};
  while(next.elapsed>=.45&&next.phase==='running'){
   next.elapsed-=.45;const command=next.commands[next.pc];next.pc++;
   if(command==='left')next.heading=(next.heading+3)%4;else if(command==='right')next.heading=(next.heading+1)%4;
   else if(command==='forward'){const [dx,dz]=[[0,-1],[1,0],[0,1],[-1,0]][next.heading],x=next.x+dx,z=next.z+dz;if(x<0||x>4||z<0||z>4){next.phase='error';next.message='벽 밖으로는 갈 수 없어요. 명령 순서를 바꿔 봐요';break;}next.x=x;next.z=z;}
   if(next.x===3&&next.z===1){next.phase='complete';next.message='별에 도착했어요! 명령을 차례대로 실행했어요';}
   else if(next.pc>=next.commands.length){next.phase='editing';next.message='명령이 끝났어요. 별까지 가는 순서를 다시 생각해 봐요';}
  }
  return next;
 }
 return s;
}
export const BLOCKS=Object.freeze({large:{label:'큰 노란 블록',size:3,width:1.1,height:.38,color:'#e3ba63'},medium:{label:'중간 초록 블록',size:2,width:.82,height:.35,color:'#86afa2'},small:{label:'작은 분홍 블록',size:1,width:.54,height:.32,color:'#d7968e'}});
export const initialBlocks=(generation=0)=>({phase:'idle',stack:[],selected:null,pending:null,elapsed:0,generation,message:'큰 블록부터 차례로 놓아 봐요'});
export function reduceBlocks(s,a){
 if(a.type==='RESET')return initialBlocks(s.generation+1);
 if(a.type==='CANCEL')return {...s,phase:s.stack.length===3?'complete':'idle',selected:null,pending:null,elapsed:0,generation:s.generation+1};
 if(s.phase==='placing'){
  if(a.type==='TICK'&&tick(s,a)){const elapsed=Math.min(.35,s.elapsed+a.dt);if(elapsed<.35)return {...s,elapsed};const stack=[...s.stack,s.pending];return {...s,stack,pending:null,selected:null,elapsed:0,phase:stack.length===3?'complete':'idle',message:stack.length===3?'세 층 탑이 완성됐어요!':'다음에는 더 작은 블록을 놓아요'};}
  return s;
 }
 if(a.type==='SELECT'&&Object.hasOwn(BLOCKS,a.id)&&!s.stack.includes(a.id))return {...s,selected:a.id,phase:'selected',message:BLOCKS[a.id].label+'을 골랐어요'};
 if(a.type==='PLACE'&&s.phase==='selected'){
  if(s.stack.length&&BLOCKS[s.selected].size>=BLOCKS[s.stack.at(-1)].size)return {...s,selected:null,phase:'idle',message:'아래 블록보다 작은 블록을 골라 주세요'};
  return {...s,phase:'placing',pending:s.selected,elapsed:0,generation:s.generation+1};
 }
 if(a.type==='UNDO'&&s.stack.length)return {...s,stack:s.stack.slice(0,-1),phase:'idle',selected:null,pending:null,message:'맨 위 블록을 내려놓았어요'};
 return s;
}
