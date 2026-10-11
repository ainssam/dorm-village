// Deterministic cabinet-only mechanics. No actor, DOM, save, clock or random owner.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>t*t*(3-2*t),copy=p=>({...p});
export function createClawModel(input){
 const c=structuredClone(input),prizes=c.prizes.map(p=>({id:p.id,position:copy(p.position)})),head={...c.home,open:1};
 let phase='aim',paused=false,disposed=false,held=null,caught=null,result=null,offset=null,queue=[],job=null,time=0,dx=0,dz=0;
 const definition=id=>c.prizes.find(p=>p.id===id),prize=id=>prizes.find(p=>p.id===id),tray=id=>definition(id)?.trayPosition??c.tray;
 const gripHead=(id,p=prize(id).position)=>({x:head.x,y:p.y+definition(id).grip.y-c.gripOffset.y,z:head.z});
 function attach(id){if(!id)return;held=id;const p=prize(id).position;offset={x:p.x-head.x,y:p.y-head.y,z:p.z-head.z};}
 function syncHeld(){if(held){const p=prize(held).position;p.x=head.x+offset.x;p.y=head.y+offset.y;p.z=head.z+offset.z;}}
 function next(){
  job=queue.shift()??null;time=0;if(!job){phase=result===null?'aim':'result';return;}
  phase=job.phase;job.from={...head};if(job.attach)job.fromPrize=copy(prize(job.attach).position);
  if(job.kind==='tray'){const p=tray(caught);job.target=held?{x:p.x-offset.x,y:c.home.y,z:p.z-offset.z}:{...c.home};}
  if(job.kind==='homePrize'){const p=definition(caught).position;job.target={x:p.x-offset.x,y:c.home.y,z:p.z-offset.z};}
  if(job.kind==='lowerHome')job.target=gripHead(caught,definition(caught).position);
  if(job.kind==='rise')job.target={x:head.x,y:c.home.y,z:head.z};
  if(job.kind==='drop')job.fromPrize=copy(prize(caught).position);
 }
 function finishJob(){
  if(job.attach)attach(job.attach);
  if(job.release)held=null;
  if(job.restore){prize(caught).position=copy(definition(caught).position);held=null;}
  if(job.finishReturn){caught=null;result=null;}
  next();
 }
 function move(phase,target,duration=.8){return{phase,kind:'move',target,duration};}
 function grab(){
  if(disposed||paused||phase!=='aim')return false;dx=dz=0;
  const minimumY=Math.max(c.minimumHeadY,...(c.lowerStops??[]).filter(b=>head.x>=b.minX&&head.x<=b.maxX&&head.z>=b.minZ&&head.z<=b.maxZ).map(b=>b.minHeadY));
  const available=c.prizes.map(p=>({id:p.id,d:Math.hypot(head.x-(prize(p.id).position.x+p.grip.x-c.gripOffset.x),head.z-(prize(p.id).position.z+p.grip.z-c.gripOffset.z)),radius:p.radius})).filter(p=>p.d<=p.radius&&gripHead(p.id).y>=minimumY).sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));
  caught=available[0]?.id??null;result=caught?'caught':'miss';
  queue=[move('lower',caught?gripHead(caught):{x:head.x,y:minimumY,z:head.z},1),{phase:'close',kind:'jaw',open:0,duration:.4,attach:caught},move('lift',{x:head.x,y:c.home.y,z:head.z},.8),{phase:'carry',kind:'tray',duration:1.2},{phase:'release',kind:'jaw',open:1,duration:.35,release:true},...(caught?[{phase:'drop',kind:'drop',duration:.6}]:[])];next();return true;
 }
 function repeat(){
  if(disposed||paused||phase!=='result')return false;dx=dz=0;
  if(!caught){result=null;queue=[move('return',copy(c.home),.6)];next();return true;}
  queue=[move('return-lower',gripHead(caught),.8),{phase:'return-close',kind:'jaw',open:0,duration:.4,attach:caught},move('return-lift',{x:head.x,y:c.home.y,z:head.z},.8),{phase:'return-carry',kind:'homePrize',duration:1.2},{phase:'return-place',kind:'lowerHome',duration:.8},{phase:'return-release',kind:'jaw',open:1,duration:.35,release:true,restore:true},{phase:'return-rise',kind:'rise',duration:.8},{...move('return',copy(c.home),.6),finishReturn:true}];next();return true;
 }
 function update(dt){
  if(disposed||paused||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,.1);
  if(phase==='aim'){const length=Math.max(1,Math.hypot(dx,dz));head.x=clamp(head.x+dx/length*.24*remaining,...c.aim.x);head.z=clamp(head.z+dz/length*.24*remaining,...c.aim.z);return;}
  while(job&&remaining>1e-12){const amount=Math.min(remaining,job.duration-time);time+=amount;remaining-=amount;const t=clamp(time/job.duration,0,1),q=smooth(t);
   if(['move','tray','homePrize','lowerHome','rise'].includes(job.kind)){for(const k of['x','y','z'])head[k]=job.from[k]+(job.target[k]-job.from[k])*q;}
   else if(job.kind==='jaw'){head.open=job.from.open+(job.open-job.from.open)*q;if(job.attach){const p=prize(job.attach).position,g=definition(job.attach).grip;for(const k of['x','z'])p[k]=job.fromPrize[k]+(head[k]+c.gripOffset[k]-g[k]-job.fromPrize[k])*q;}}
   else if(job.kind==='drop'){const p=prize(caught).position,target=tray(caught);for(const k of['x','y','z'])p[k]=job.fromPrize[k]+(target[k]-job.fromPrize[k])*t*t;}
   syncHeld();if(time>=job.duration-1e-10){if(job.target)Object.assign(head,job.target);if(job.kind==='jaw')head.open=job.open;if(job.kind==='drop')prize(caught).position=copy(tray(caught));syncHeld();finishJob();}
  }
 }
 return{grab,repeat,update,setInput(x=0,z=0){if(disposed||paused||phase!=='aim')return;dx=Number.isFinite(x)?clamp(x,-1,1):0;dz=Number.isFinite(z)?clamp(z,-1,1):0;},pause(){if(disposed)return;paused=true;dx=dz=0;},resume(){if(!disposed)paused=false;},dispose(){disposed=true;paused=true;dx=dz=0;},snapshot(){return{phase,paused,head:{...head},held,caught,result,prizes:prizes.map(p=>({id:p.id,position:copy(p.position)}))};}};
}
