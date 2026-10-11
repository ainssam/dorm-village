/** Court-local (+X forward), dependency-free deterministic throwing physics. */
export const FIXED_DT = 1 / 120;
const MAX_FRAME_DT = .1;
const DIST_EPS = 1e-11;
const TIME_EPS = 1e-12;
const POSITION_SLOP = 1e-9;
const MAX_ADVANCE_ITERATIONS = 128;
const MAX_IMPACTS = 12;
const REST_SPEED = .18;
const SUPPORT_SPEED = .28;
const REST_SECONDS = .35;
const MAX_FLIGHT_SECONDS = 6;
const AXES = ['x', 'y', 'z'];
const copy = value => JSON.parse(JSON.stringify(value));
const vector = p => ({ x: p.x, y: p.y, z: p.z });
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const length = p => Math.hypot(p.x,p.y,p.z);
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const finite = (value,fallback) => Number.isFinite(value)?value:fallback;
function deepFreeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') deepFreeze(item);
  return Object.freeze(value);
}
export const DEFAULT_ORIGIN = Object.freeze({ x:.3, y:1.1377228881720816, z:-3.2 });
export const DEFAULT_SETTINGS = Object.freeze({ yawDeg:0, pitchDeg:52, power:50 });
export const SETTING_LIMITS = deepFreeze({ yawDeg:[-18,18], pitchDeg:[35,70], power:[0,100] });
export const THROW_COURT = deepFreeze({
  gravity:9.8,
  ballRadius:.145,
  floorY:.06,
  rim:{ center:{x:3.4,y:1.85,z:-3.2}, radius:.52, tubeRadius:.035 },
  board:{ center:{x:4.02,y:2.25,z:-3.2}, half:{x:.05,y:.5,z:.75} },
  support:{ center:{x:4.05,y:.85,z:-3.2}, half:{x:.15,y:.79,z:.22} },
  materials:{
    floor:{ restitution:.56, tangential:.82 },
    rim:{ restitution:.55, tangential:.98 },
    board:{ restitution:.62, tangential:.96 },
    support:{ restitution:.45, tangential:.9 },
  },
  bounds:{ min:{x:-2,y:-1,z:-6.5}, max:{x:7,y:8,z:1.5} },
});
export const DEFAULT_COURT = THROW_COURT;
function validVector(value,name) {
  if (!value || !AXES.every(k=>Number.isFinite(value[k]))) throw new TypeError(`${name} must contain finite x, y and z`);
  return vector(value);
}
function normalizeCourt(input = DEFAULT_COURT) {
  const court=copy(DEFAULT_COURT);
  for(const k of ['gravity','ballRadius','floorY']) if(input[k]!==undefined) {
    if(!Number.isFinite(input[k]) || (k!=='floorY' && input[k]<0)) throw new RangeError(`Invalid court ${k}`);
    court[k]=input[k];
  }
  for(const k of ['rim','board','support']) if(input[k]!==undefined) {
    if(input[k]===null){court[k]=null;continue;}
    court[k]={...court[k],...copy(input[k]),center:validVector(input[k].center??court[k].center,`${k}.center`)};
    if(k==='rim') {
      if(!Number.isFinite(court[k].radius)||court[k].radius<=0||!Number.isFinite(court[k].tubeRadius)||court[k].tubeRadius<0)throw new RangeError('Invalid rim radii');
    } else {
      court[k].half=validVector(court[k].half,`${k}.half`);
      if(AXES.some(a=>court[k].half[a]<0))throw new RangeError('Box half extents must be nonnegative');
    }
  }
  if(input.bounds) {
    court.bounds={min:validVector(input.bounds.min,'bounds.min'),max:validVector(input.bounds.max,'bounds.max')};
    if(AXES.some(k=>court.bounds.max[k]<=court.bounds.min[k]))throw new RangeError('Invalid court bounds');
  }
  for(const k of Object.keys(court.materials))for(const name of ['restitution','tangential'])if(input.materials?.[k]?.[name]!==undefined) {
    const n=input.materials[k][name];if(!Number.isFinite(n)||n<0||n>1)throw new RangeError(`Invalid ${k} ${name}`);court.materials[k][name]=n;
  }
  return court;
}
export function validateSettings(input = {}, previous = DEFAULT_SETTINGS) {
  const result={};for(const [k,[min,max]] of Object.entries(SETTING_LIMITS)) result[k]=clamp(finite(input?.[k],finite(previous?.[k],DEFAULT_SETTINGS[k])),min,max);
  return result;
}
export function launchVelocity(settings = DEFAULT_SETTINGS) {
  const s=validateSettings(settings);const speed=4.2+3.3*s.power/100;
  const pitch=s.pitchDeg*Math.PI/180,yaw=s.yawDeg*Math.PI/180;
  return {x:speed*Math.cos(pitch)*Math.cos(yaw),y:speed*Math.sin(pitch),z:speed*Math.cos(pitch)*Math.sin(yaw)};
}
export function ballistic(position,velocity,dt,gravity=9.8) {
  return {position:{x:position.x+velocity.x*dt,y:position.y+velocity.y*dt-.5*gravity*dt*dt,z:position.z+velocity.z*dt},velocity:{x:velocity.x,y:velocity.y-gravity*dt,z:velocity.z}};
}
export function createBallState({position=DEFAULT_ORIGIN,velocity={x:0,y:0,z:0},scored=false,elapsed=0,restTime=0,grounded=false,settled=false,settleReason=null}={}) {
  return {position:validVector(position,'position'),velocity:validVector(velocity,'velocity'),scored:Boolean(scored),elapsed:Math.max(0,finite(elapsed,0)),restTime:Math.max(0,finite(restTime,0)),grounded:Boolean(grounded),settled:Boolean(settled),settleReason};
}
/** Exact descending plane crossing on an uncollided analytic segment. */
export function scoringCrossing(position,velocity,dt,court=DEFAULT_COURT) {
  const rim=court.rim;if(!rim||!(dt>0))return null;
  const g=court.gravity;let time;
  if(g===0) {
    if(velocity.y>=0)return null;
    time=(rim.center.y-position.y)/velocity.y;
  } else {
    const discriminant=velocity.y*velocity.y+2*g*(position.y-rim.center.y);
    if(discriminant<=0)return null;
    time=(velocity.y+Math.sqrt(discriminant))/g;
  }
  if(time<=TIME_EPS||time>dt+TIME_EPS)return null;
  const result=ballistic(position,velocity,Math.min(time,dt),g);
  if(result.velocity.y>=0)return null;
  const aperture=rim.radius-rim.tubeRadius-court.ballRadius;
  if(aperture<0||Math.hypot(result.position.x-rim.center.x,result.position.z-rim.center.z)>aperture+1e-12)return null;
  return {type:'score',time:Math.min(time,dt),position:result.position,velocity:result.velocity};
}
function rimDistance(position,velocity,court) {
  const r=court.rim;const dx=position.x-r.center.x,dz=position.z-r.center.z,dy=position.y-r.center.y;
  const horizontal=Math.hypot(dx,dz),rx=horizontal>1e-14?dx/horizontal:1,rz=horizontal>1e-14?dz/horizontal:0;
  const radial=horizontal-r.radius,distance=Math.hypot(radial,dy);
  let normal;
  if(distance>1e-14)normal={x:rx*radial/distance,y:dy/distance,z:rz*radial/distance};
  else {const speed=length(velocity);normal=speed>1e-14?{x:-velocity.x/speed,y:-velocity.y/speed,z:-velocity.z/speed}:{x:0,y:1,z:0};}
  return {distance:distance-r.tubeRadius-court.ballRadius,normal};
}
/** Point vs expanded AABB, deliberately conservative at physical box corners. */
function boxDistance(position,velocity,box,ballRadius) {
  const delta={},q={},outside={};for(const k of AXES){delta[k]=position[k]-box.center[k];q[k]=Math.abs(delta[k])-box.half[k]-ballRadius;outside[k]=Math.max(0,q[k]);}
  const d=length(outside);let normal;
  if(d>1e-14){normal={};for(const k of AXES)normal[k]=(delta[k]<0?-1:1)*outside[k]/d;}
  else {let axis='x';for(const k of ['y','z'])if(q[k]>q[axis])axis=k;normal={x:0,y:0,z:0};normal[axis]=delta[axis]===0?(velocity[axis]>0?-1:1):Math.sign(delta[axis]);}
  return {distance:d+Math.min(Math.max(q.x,q.y,q.z),0),normal};
}
function floorTOI(position,velocity,duration,court) {
  const level=court.floorY+court.ballRadius,depth=position.y-level;
  if(depth<-DIST_EPS)return {time:0,normal:{x:0,y:1,z:0},distance:depth};
  if(depth<=DIST_EPS&&velocity.y<0)return {time:0,normal:{x:0,y:1,z:0},distance:depth};
  const g=court.gravity;let time;
  if(g===0){if(velocity.y>=0)return null;time=-depth/velocity.y;}
  else {const d=velocity.y*velocity.y+2*g*Math.max(0,depth);time=(velocity.y+Math.sqrt(d))/g;}
  if(time<-TIME_EPS||time>duration+TIME_EPS)return null;
  return {time:Math.max(0,Math.min(time,duration)),normal:{x:0,y:1,z:0},distance:0};
}
/**
 * The signed distance is 1-Lipschitz; distance / maximum segment speed is a
 * provably clear time interval. Near contact, bracket and bisect the first root.
 * A budget exhaustion stops the shot rather than advancing through geometry.
 */
function trajectoryRanges(position,velocity,low,high,gravity) {
  const a=ballistic(position,velocity,low,gravity).position,b=ballistic(position,velocity,high,gravity).position;
  const min={},max={};for(const k of AXES){min[k]=Math.min(a[k],b[k]);max[k]=Math.max(a[k],b[k]);}
  if(gravity>0){const apex=velocity.y/gravity;if(apex>low&&apex<high)max.y=ballistic(position,velocity,apex,gravity).position.y;}
  return {min,max,a,b};
}
function rimIntervalClear(position,velocity,low,high,gravity,court) {
  const range=trajectoryRanges(position,velocity,low,high,gravity),r=court.rim;
  const radius=p=>Math.hypot(p.x-r.center.x,p.z-r.center.z);
  let minR=Math.min(radius(range.a),radius(range.b));const maxR=Math.max(radius(range.a),radius(range.b));
  const vv=velocity.x*velocity.x+velocity.z*velocity.z;
  if(vv>0){const closest=clamp(-((position.x-r.center.x)*velocity.x+(position.z-r.center.z)*velocity.z)/vv,low,high);minR=Math.min(minR,radius(ballistic(position,velocity,closest,gravity).position));}
  const dr=Math.max(0,minR-r.radius,r.radius-maxR),dy=Math.max(0,range.min.y-r.center.y,r.center.y-range.max.y);
  const tube=r.tubeRadius+court.ballRadius;
  if(Math.hypot(dr,dy)>tube+DIST_EPS)return true;
  if(minR<1e-8)return false;
  // Preserve radial/vertical correlation near glancing contact. For
  // F=(h-R)^2+(y-Y)^2-tube^2, the following M bounds |F''| throughout
  // this interval. Taylor's theorem gives a rigorous positive lower bound.
  const middle=(low+high)/2,halfTime=(high-low)/2;
  const mid=ballistic(position,velocity,middle,gravity),h=radius(mid.position),dyMid=mid.position.y-r.center.y;
  const radialDot=(mid.position.x-r.center.x)*velocity.x+(mid.position.z-r.center.z)*velocity.z;
  const f=(h-r.radius)**2+dyMid*dyMid-tube*tube;
  const derivative=2*(h-r.radius)*radialDot/h+2*dyMid*mid.velocity.y;
  const maxVy=Math.max(Math.abs(velocity.y-gravity*low),Math.abs(velocity.y-gravity*high));
  const maxDy=Math.max(Math.abs(range.min.y-r.center.y),Math.abs(range.max.y-r.center.y));
  const curvature=2*vv+2*r.radius*vv/minR+2*(maxVy*maxVy+maxDy*gravity);
  return f-Math.abs(derivative)*halfTime-.5*curvature*halfTime*halfTime>2*tube*DIST_EPS+DIST_EPS*DIST_EPS;
}
function boxIntervalClear(position,velocity,low,high,gravity,box,radius) {
  const range=trajectoryRanges(position,velocity,low,high,gravity);
  return AXES.some(k=>range.max[k]<box.center[k]-box.half[k]-radius-DIST_EPS||range.min[k]>box.center[k]+box.half[k]+radius+DIST_EPS);
}
// Tight analytic interval bounds rescue shallow/tangential contacts where the
// global speed bound makes conservative advancement converge unnecessarily slowly.
function intervalTOI(position,velocity,low,high,gravity,distanceAt,intervalClear) {
  const stack=[[low,high]];let budget=4096;
  while(stack.length&&budget-->0){
    const [a,b]=stack.pop();if(intervalClear(a,b))continue;
    const at=ballistic(position,velocity,a,gravity),info=distanceAt(at.position,at.velocity);
    if(info.distance<=DIST_EPS)return {time:a,...info};
    if(b-a<=TIME_EPS){const end=ballistic(position,velocity,b,gravity);return {time:b,...distanceAt(end.position,end.velocity)};}
    const middle=(a+b)/2;stack.push([middle,b],[a,middle]);
  }
  return stack.length?{limited:true,time:stack.at(-1)[0]}:null;
}
function conservativeTOI(position,velocity,duration,gravity,distanceAt,intervalClear) {
  const maxSpeed=length(velocity)+gravity*duration;
  let time=0;
  for(let i=0;i<MAX_ADVANCE_ITERATIONS;i++) {
    const at=ballistic(position,velocity,time,gravity);const info=distanceAt(at.position,at.velocity);
    if(info.distance<=DIST_EPS) {
      if(info.distance<0||time===0)return {time,...info};
      const approach=-dot(at.velocity,info.normal);
      const probe=Math.min(duration,time+Math.max(1e-11,approach>0?2*info.distance/approach:0));
      const probeState=ballistic(position,velocity,probe,gravity);
      if(probe>time&&distanceAt(probeState.position,probeState.velocity).distance<=0){
        let low=time,high=probe;
        for(let k=0;k<48&&high-low>TIME_EPS;k++){const middle=(low+high)/2;const s=ballistic(position,velocity,middle,gravity);if(distanceAt(s.position,s.velocity).distance>0)low=middle;else high=middle;}
        time=(low+high)/2;const s=ballistic(position,velocity,time,gravity);return {time,...distanceAt(s.position,s.velocity)};
      }
      return {time,...info};
    }
    if(maxSpeed<=1e-14)return null;
    const safe=info.distance/maxSpeed;
    if(safe>duration-time+TIME_EPS)return null;
    const next=time+safe;
    if(next>=duration){const end=ballistic(position,velocity,duration,gravity);const infoEnd=distanceAt(end.position,end.velocity);return infoEnd.distance<=DIST_EPS?{time:duration,...infoEnd}:null;}
    if(next===time)return intervalTOI(position,velocity,time,duration,gravity,distanceAt,intervalClear);
    time=next;
  }
  return intervalTOI(position,velocity,time,duration,gravity,distanceAt,intervalClear);
}
function firstCollision(position,velocity,duration,court,grounded) {
  let best=null;
  const add=(collider,hit)=>{if(hit&&(!best||hit.time<best.time-TIME_EPS))best={collider,...hit};};
  if(!grounded)add('floor',floorTOI(position,velocity,duration,court));
  const g=grounded?0:court.gravity;
  if(court.rim)add('rim',conservativeTOI(position,velocity,duration,g,(p,v)=>rimDistance(p,v,court),(a,b)=>rimIntervalClear(position,velocity,a,b,g,court)));
  for(const k of ['board','support'])if(court[k])add(k,conservativeTOI(position,velocity,duration,g,(p,v)=>boxDistance(p,v,court[k],court.ballRadius),(a,b)=>boxIntervalClear(position,velocity,a,b,g,court[k],court.ballRadius)));
  return best;
}
function outsideBounds(position,court){return AXES.some(k=>position[k]<court.bounds.min[k]||position[k]>court.bounds.max[k]);}
function stepKernel(input,dt,court) {
  const state=createBallState(input),events=[];
  if(state.settled||!(dt>0))return {state,events};
  const startTime=state.elapsed;
  const floor=court.floorY+court.ballRadius;
  let remaining=dt,used=0,impacts=0;
  function settle(reason){state.settled=true;state.settleReason=reason;state.velocity={x:0,y:0,z:0};events.push({type:'settled',reason,time:startTime+used,position:vector(state.position)});}
  if(outsideBounds(state.position,court)){settle('bounds');return {state,events};}
  if(state.position.y>=floor-DIST_EPS&&state.position.y<=floor+POSITION_SLOP*4&&Math.abs(state.velocity.y)<SUPPORT_SPEED){state.grounded=true;state.position.y=floor;state.velocity.y=0;}
  else if(state.position.y>floor+POSITION_SLOP*4||state.velocity.y>SUPPORT_SPEED)state.grounded=false;
  while(remaining>TIME_EPS&&!state.settled){
    const hit=firstCollision(state.position,state.velocity,remaining,court,state.grounded);
    if(hit?.limited){settle('solver-limit');break;}
    const segment=hit?Math.min(remaining,hit.time):remaining;
    if(!state.scored&&!state.grounded){const score=scoringCrossing(state.position,state.velocity,segment,court);if(score){state.scored=true;events.push({...score,time:startTime+used+score.time});}}
    const next=ballistic(state.position,state.velocity,segment,state.grounded?0:court.gravity);state.position=next.position;state.velocity=next.velocity;used+=segment;remaining-=segment;
    if(!hit)break;
    const incomingVelocity=vector(state.velocity),normal=hit.normal,vn=dot(incomingVelocity,normal),material=court.materials[hit.collider];
    if(vn<0)for(const k of AXES)state.velocity[k]=(incomingVelocity[k]-vn*normal[k])*material.tangential-vn*normal[k]*material.restitution;
    events.push({type:'contact',collider:hit.collider,time:startTime+used,position:vector(state.position),normal:vector(normal),incomingVelocity,outgoingVelocity:vector(state.velocity)});
    // A 10-micrometre rim separation only at very low normal speed prevents
    // inelastic-collapse chatter along the concave inner rim without adding
    // kinetic energy. Ordinary impacts keep nanometre fixture precision.
    const slop=hit.collider==='rim'&&Math.abs(vn)<.12?1e-5:POSITION_SLOP;
    const correction=Math.max(0,-hit.distance)+slop;for(const k of AXES)state.position[k]+=normal[k]*correction;
    if(hit.collider==='floor'&&state.velocity.y<=SUPPORT_SPEED){state.grounded=true;state.position.y=floor;state.velocity.y=0;}
    if(++impacts>=MAX_IMPACTS&&remaining>TIME_EPS){settle('solver-limit');break;}
  }
  state.elapsed=startTime+used;
  if(state.grounded&&!state.settled){
    // Rolling resistance is tied to fixed simulation time, never render cadence.
    const damping=Math.exp(-2.8*used);state.velocity.x*=damping;state.velocity.z*=damping;
    if(Math.hypot(state.velocity.x,state.velocity.z)<.025){state.velocity.x=0;state.velocity.z=0;}
    state.position.y=floor;state.velocity.y=0;
    if(Math.hypot(state.velocity.x,state.velocity.z)<=REST_SPEED)state.restTime+=used;else state.restTime=0;
  }else state.restTime=0;
  if(!state.settled){
    if(outsideBounds(state.position,court))settle('bounds');
    else if(state.restTime+TIME_EPS>=REST_SECONDS)settle('rest');
    else if(state.elapsed+TIME_EPS>=MAX_FLIGHT_SECONDS)settle('timeout');
  }
  return {state,events};
}
/** Pure diagnostic kernel; admitted dt is bounded to .1s. The model uses 1/120. */
export function stepBall(state,dt=FIXED_DT,court=DEFAULT_COURT) {
  return stepKernel(state,Number.isFinite(dt)&&dt>0?Math.min(dt,MAX_FRAME_DT):0,normalizeCourt(court));
}
export function createThrowModel({court=DEFAULT_COURT,origin=DEFAULT_ORIGIN,settings=DEFAULT_SETTINGS,mode='practice'}={}) {
  const geometry=normalizeCourt(court),release=validVector(origin,'origin');
  let aimSettings=validateSettings(settings),sessionMode=mode==='challenge'?'challenge':'practice';
  let phase='aiming',body=createBallState({position:release}),shotId=0,generation=0,tick=0,accumulator=0,score=0,attempts=0,contacts=[];
  const pauseReasons=new Set();
  const isDisposed=()=>phase==='disposed';
  function resetBall(){if(isDisposed())return false;generation++;phase='aiming';body=createBallState({position:release});tick=0;accumulator=0;contacts=[];return true;}
  function snapshot(){return {phase,paused:pauseReasons.size>0,pauseReasons:[...pauseReasons].sort(),shotId,generation,tick,elapsed:body.elapsed,accumulator,origin:vector(release),position:vector(body.position),velocity:vector(body.velocity),settings:{...aimSettings},score,attempts,scored:body.scored,contacts:copy(contacts),settleReason:body.settleReason,mode:sessionMode,challengeComplete:sessionMode==='challenge'&&attempts>=5&&phase!=='flying',shotsRemaining:sessionMode==='challenge'?Math.max(0,5-attempts):null};}
  return {
    aim(next){if(phase!=='aiming'||pauseReasons.size)return false;aimSettings=validateSettings(next,aimSettings);return true;},
    throwBall(){if(phase!=='aiming'||pauseReasons.size||(sessionMode==='challenge'&&attempts>=5))return false;shotId++;generation++;attempts++;tick=0;accumulator=0;contacts=[];body=createBallState({position:release,velocity:launchVelocity(aimSettings)});phase='flying';return true;},
    advance(dt){
      if(phase!=='flying'||pauseReasons.size||!Number.isFinite(dt)||dt<=0)return [];
      accumulator+=Math.min(MAX_FRAME_DT,dt);const count=Math.min(12,Math.floor((accumulator+TIME_EPS)/FIXED_DT));accumulator=Math.max(0,accumulator-count*FIXED_DT);
      const output=[];
      for(let i=0;i<count&&phase==='flying';i++){
        const result=stepKernel(body,FIXED_DT,geometry);body=result.state;tick++;
        for(const event of result.events){const tagged={...event,shotId,generation,tick};output.push(tagged);if(event.type==='score')score++;if(event.type==='contact')contacts.push(copy(tagged));}
        if(body.settled){phase='settled';accumulator=0;}
      }
      return output;
    },
    pause(reason='manual'){if(isDisposed())return false;pauseReasons.add(String(reason));accumulator=0;return true;},
    resume(reason='manual'){if(isDisposed())return false;pauseReasons.delete(String(reason));accumulator=0;return true;},
    resetBall,
    resetSession(options={}){if(isDisposed())return false;if(options.mode!==undefined)sessionMode=options.mode==='challenge'?'challenge':'practice';score=0;attempts=0;return resetBall();},
    predict(nextSettings=aimSettings,nextOrigin=release,{duration=1.5,sampleEvery=6,stopAtFirstContact=false}={}){
      if(isDisposed())return {points:[],events:[],final:null};
      let ghost=createBallState({position:validVector(nextOrigin,'prediction origin'),velocity:launchVelocity(validateSettings(nextSettings,aimSettings))});
      const points=[vector(ghost.position)],events=[];
      const steps=Math.floor(clamp(finite(duration,1.5),0,MAX_FLIGHT_SECONDS)/FIXED_DT+TIME_EPS),stride=Math.round(clamp(finite(sampleEvery,6),1,120));
      for(let i=0;i<steps&&!ghost.settled;i++){
        const result=stepKernel(ghost,FIXED_DT,geometry);ghost=result.state;events.push(...result.events);
        const contact=result.events.find(e=>e.type==='contact');
        if(stopAtFirstContact&&contact){
          points.push(vector(contact.position));const priorEvents=events.filter(e=>e.time<=contact.time+TIME_EPS);
          return {points,events:priorEvents,final:createBallState({position:contact.position,velocity:contact.incomingVelocity,elapsed:contact.time,scored:priorEvents.some(e=>e.type==='score')})};
        }
        if((i+1)%stride===0||ghost.settled||i===steps-1)points.push(vector(ghost.position));
      }
      return {points,events,final:copy(ghost)};
    },
    snapshot,
    dispose(){if(isDisposed())return false;generation++;phase='disposed';accumulator=0;pauseReasons.clear();contacts=[];body.velocity={x:0,y:0,z:0};return true;},
  };
}
