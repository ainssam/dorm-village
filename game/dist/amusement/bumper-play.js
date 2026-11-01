// Native controls shared by driving activities. No save or clock owner.
export function createVehiclePanel(doc,element,title){
 const panel=doc.createElement('section');panel.className='vehicle-play-panel';panel.setAttribute('aria-label',title);
 const heading=doc.createElement('strong');heading.textContent=title;
 const status=doc.createElement('output');status.className='vehicle-play-status';status.setAttribute('aria-live','off');
 const result=doc.createElement('p');result.className='vehicle-play-result';result.setAttribute('data-vehicle-result','');result.setAttribute('role','status');result.setAttribute('aria-live','polite');result.hidden=true;
 const choices=doc.createElement('details'),summary=doc.createElement('summary'),actions=doc.createElement('div');choices.className='vehicle-play-choices';summary.textContent='놀이와 조작 도움';actions.className='vehicle-play-actions';choices.append(summary,actions);
 const help=doc.createElement('p');help.className='vehicle-play-help';help.textContent='위: 전진 · 좌우: 방향 바꾸기 · 아래: 브레이크와 후진';
 choices.append(help);panel.append(heading,status,result,choices);element.append(panel);
 return{panel,status,result,choices,actions,help};
}
export function vehicleButton(doc,parent,attribute,text){const button=doc.createElement('button');button.type='button';button.setAttribute(attribute,'');button.textContent=text;parent.append(button);return button;}
export function mountBumperPracticeControls({doc,element,ride,allowed,clear,resume,onChange}){
 const panel=createVehiclePanel(doc,element,'작은 범퍼카 · 서두르지 않는 운전');
 const route=vehicleButton(doc,panel.actions,'data-bumper-route','길표시 세 곳 찾기'),free=vehicleButton(doc,panel.actions,'data-bumper-free','자유롭게 타기'),again=vehicleButton(doc,panel.panel,'data-bumper-again','길표시 한 번 더');again.className='vehicle-retry';
 const listeners=[],listen=(node,type,fn)=>{node.addEventListener(type,fn);listeners.push([node,type,fn]);};let notice='',closed=false;
 panel.choices.open=ride.phase==='entering';
 const act=fn=>{if(!allowed()||ride.exitRequested)return;clear();fn();resume();panel.choices.open=false;onChange();paint();};
 listen(route,'click',()=>act(()=>ride.startPractice()));listen(again,'click',()=>act(()=>ride.startPractice()));listen(free,'click',()=>act(()=>ride.stopPractice()));listen(panel.choices,'toggle',()=>onChange());
 function paint(){const playing=ride.practiceState==='playing',complete=ride.practiceState==='complete';panel.status.textContent=ride.exitRequested?'출발 자리로 돌아가는 중':ride.phase==='entering'?'앉은 뒤 안쪽으로 돌아서 출발해요':complete?'세 곳 모두 도착했어요':playing?`${ride.practiceIndex}/3곳 · 빛나는 ${ride.practiceIndex+1}번으로`:'자유 운전 · 시간 제한 없어요';const message=ride.notice??'';if(message!==notice){notice=message;panel.result.textContent=message;panel.result.hidden=!message;}route.textContent=complete?'길표시 한 번 더':'길표시 세 곳 찾기';route.disabled=free.disabled=again.disabled=ride.exitRequested;again.hidden=!complete;route.setAttribute('aria-pressed',String(playing));free.setAttribute('aria-pressed',String(ride.practiceState==='free'));if(!closed&&Math.abs(ride.speed)>.1){panel.choices.open=false;closed=true;onChange();}}
 paint();return{paint,dispose(){for(const[n,t,f]of listeners)n.removeEventListener(t,f);panel.panel.remove();}};
}
