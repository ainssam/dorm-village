// Transient rope timing. Geometry-derived sweep decides success, never a tap window.
export const ROPE_DT=1/120,ROPE_JUMP_DURATION=.64,ROPE_JUMP_HEIGHT=.52,ROPE_JUMP_COOLDOWN=.08,ROPE_PARK_PHASE=5*Math.PI/6;
const TAU=Math.PI*2,PERIODS=[1.60,1.35,1.15],smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function jumpArc(age){if(!Number.isFinite(age)||age<=0||age>=ROPE_JUMP_DURATION)return 0;const u=age/ROPE_JUMP_DURATION;return 4*ROPE_JUMP_HEIGHT*u*(1-u);}
export function createGroupRopeModel({mode='calm'}={}){
 if(!['calm','timed'].includes(mode))throw new TypeError('Unknown rope mode');
 let physics=null,accumulator=0,clock=0,turnTicks=0,turnStart=0,leadTicks=0,leadTotal=0,leadFrom=0,settleTime=0,settleFrom=0,settleTo=ROPE_PARK_PHASE,finishAfterSettle=false;
 const frameStats={steps:0,collisionSteps:0,candidateTriangles:0,maxCandidatesPerStep:0,nodeVisits:0,quadQueries:0};
 const jumpers={dormi:{start:null,land:-Infinity,automaticTurn:-1},armadillo:{start:null,land:-Infinity,automaticTurn:-1}};
 const s={activity:'rope',phase:'loading',mode,paused:false,countdown:mode==='calm'?2:3,elapsed:0,turn:0,completed:0,period:1.6,nextPeriod:1.6,turnElapsed:0,ropePhase:0,jumpHeight:0,partnerHeight:0,successes:mode==='timed'?0:null,contactLabels:[],feedback:''};
 const period=turn=>mode==='calm'?1.6:PERIODS[Math.min(2,Math.floor(turn/4))];
 const heights=()=>({dormi:s.jumpHeight,armadillo:s.partnerHeight});
 function updateJumps(){for(const[id,j]of Object.entries(jumpers)){const key=id==='dormi'?'jumpHeight':'partnerHeight';s[key]=j.start===null?0:jumpArc(clock-j.start);if(j.start!==null&&clock+1e-10>=j.start+ROPE_JUMP_DURATION){j.land=j.start+ROPE_JUMP_DURATION;j.start=null;s[key]=0;}}}
 function grounded(id){const j=jumpers[id];return j.start===null&&clock-j.land>=ROPE_JUMP_COOLDOWN-1e-10;}
 function scheduleAutomatic(){for(const id of mode==='calm'?['dormi','armadillo']:['armadillo']){const j=jumpers[id],at=turnStart+s.period/2-ROPE_JUMP_DURATION/2;if(j.automaticTurn!==s.turn&&clock+1e-10>=at&&grounded(id)){j.start=at;j.automaticTurn=s.turn;}}}
 function beginTurn(){turnTicks=0;turnStart=clock;s.turnElapsed=0;s.ropePhase=0;s.period=period(s.turn);s.nextPeriod=period(Math.min(11,s.turn+1));s.phase='playing';s.feedback='';s.contactLabels=[];}
 function beginLead(seconds){leadTicks=0;leadTotal=Math.round(seconds/ROPE_DT);leadFrom=s.ropePhase;s.countdown=seconds;s.phase='countdown';}
 function settle(finish){finishAfterSettle=finish;settleTime=0;settleFrom=s.ropePhase;settleTo=s.ropePhase>Math.PI*1.5?TAU+ROPE_PARK_PHASE:ROPE_PARK_PHASE;s.phase='settling';}
 function step(){
  if(s.phase==='countdown'){leadTicks++;s.countdown=Math.max(0,leadTotal-leadTicks)*ROPE_DT;s.ropePhase=leadFrom*(1-smooth(leadTicks/leadTotal));if(leadTicks>=leadTotal){s.countdown=0;beginTurn();}return;}
  if(s.phase==='settling'){clock+=ROPE_DT;s.elapsed=clock;settleTime+=ROPE_DT;updateJumps();s.ropePhase=settleFrom+(settleTo-settleFrom)*smooth(settleTime/.3);if(settleTime>=.3&&jumpers.dormi.start===null&&jumpers.armadillo.start===null){s.phase=finishAfterSettle?'result':'rest';s.feedback=finishAfterSettle?(mode==='calm'?'함께 가볍게 뛰었어요':`${s.successes}바퀴 함께 넘었어요`):'줄을 잠깐 쉬어 두었어요. 원할 때 다음 바퀴를 시작해요';}return;}
  if(s.phase!=='playing')return;
  const fromPhase=s.ropePhase,fromJumps=heights();clock+=ROPE_DT;s.elapsed=clock;turnTicks++;s.turnElapsed=turnTicks*ROPE_DT;s.ropePhase=Math.min(TAU,s.turnElapsed/s.period*TAU);scheduleAutomatic();updateJumps();
  const contact=physics.sweep({fromPhase,toPhase:s.ropePhase,fromJumps,toJumps:heights()});frameStats.collisionSteps++;frameStats.candidateTriangles+=contact.stats?.candidateTriangles??0;frameStats.maxCandidatesPerStep=Math.max(frameStats.maxCandidatesPerStep,contact.stats?.candidateTriangles??0);frameStats.nodeVisits+=contact.stats?.nodeVisits??0;frameStats.quadQueries+=contact.stats?.quadQueries??0;
  if(contact.hit){s.contactLabels=(contact.contacts??[]).map(c=>typeof c==='string'?c:`${c.actor}:${c.label}`);s.completed++;s.feedback='줄을 천천히 멈춰요';settle(false);return;}
  if(s.turnElapsed+1e-10>=s.period){s.completed++;if(mode==='timed')s.successes++;if(s.completed>=12){settle(true);}else{s.turn++;beginTurn();}}
 }
 return{
 bindPhysics(value){if(!value||typeof value.sweep!=='function')throw new TypeError('Rope needs measured collision physics');if(!['loading','gathering','ready'].includes(s.phase))return false;physics=value;return true;},
 loaded(){if(s.phase!=='loading')return false;s.phase='gathering';return true;},
 gathered(){if(s.phase!=='gathering'||!physics)return false;s.phase='ready';return true;},
 start(){if(s.phase!=='ready'||s.paused||!physics)return false;beginLead(mode==='calm'?2:3);return true;},
 tap(){if(s.phase!=='playing'||s.paused||mode!=='timed'||!grounded('dormi'))return false;jumpers.dormi.start=clock;return true;},
 continue(){if(s.phase!=='rest'||s.paused)return false;if(s.completed>=12){s.phase='result';s.feedback=mode==='calm'?'함께 가볍게 뛰었어요':`${s.successes}바퀴 함께 넘었어요`;return true;}s.turn++;s.period=period(s.turn);s.nextPeriod=period(Math.min(11,s.turn+1));beginLead(1);return true;},
 advance(dt){for(const key of Object.keys(frameStats))frameStats[key]=0;if(s.paused||!['countdown','playing','settling'].includes(s.phase)||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(.1,dt);while(accumulator+1e-12>=ROPE_DT){accumulator-=ROPE_DT;frameStats.steps++;step();}},
 pause(){if(['loading','gathering','countdown','playing','settling'].includes(s.phase))s.paused=true;},resume(){if(s.phase!=='disposed')s.paused=false;},
 
 diagnostics:()=>({...frameStats}),
 snapshot:()=>({...s,contactLabels:[...s.contactLabels],canJump:s.phase==='playing'&&!s.paused&&mode==='timed'&&grounded('dormi')}),
 dispose(){s.phase='disposed';s.paused=true;s.jumpHeight=s.partnerHeight=0;for(const j of Object.values(jumpers))j.start=null;accumulator=0;}
 };
}
