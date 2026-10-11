// Ideal point-mass pendulum. SI units; radians internally. No friction or forcing.
// theta'' = -(g/L) sin(theta); fixed-step RK4, event times interpolated at every step.
// Reference: OpenStax University Physics 1 §15.4. T0 is a small-angle comparison only.
export const PENDULUM_G=9.81,PENDULUM_DT=1/240;
export const PENDULUM_DEFAULTS=Object.freeze({length:1,mass:.5,angle:10});
const limit=(value,min,max,step,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))/step)*step:fallback;};
export function pendulumSettings(value={}){return{length:+limit(value.length,.25,2,.01,1).toFixed(2),mass:+limit(value.mass,.1,1,.05,.5).toFixed(2),angle:limit(value.angle,5,60,1,10)};}
export function comparePendulumTrials(a,b){if(!a?.period||!b?.period)return null;const changed=['length','mass','angle'].filter(k=>a.settings[k]!==b.settings[k]);return{changed,difference:b.period-a.period,percent:(b.period/a.period-1)*100};}
export function createPendulumExperiment(initial={}){
 let settings,theta,omega,elapsed,steps,accumulator,phase,crossings,periods,samples,period,alive=true;
 function reset(value=settings??initial){if(!alive)return false;settings=pendulumSettings(value);theta=settings.angle*Math.PI/180;omega=0;elapsed=steps=accumulator=0;phase='ready';crossings=[];periods=[];samples=[{time:0,angle:settings.angle}];period=null;return true;}
 function snapshot(){const kinetic=.5*settings.mass*settings.length**2*omega**2,potential=settings.mass*PENDULUM_G*settings.length*(1-Math.cos(theta)),smallAnglePeriod=2*Math.PI*Math.sqrt(settings.length/PENDULUM_G);return{settings:{...settings},phase,elapsed,theta,omega,angle:theta*180/Math.PI,speed:Math.abs(omega*settings.length),energy:{kinetic,potential,total:kinetic+potential},crossings:[...crossings],periods:[...periods],samples:samples.map(p=>({...p})),period,sensorTime:crossings.length?((crossings.at(-1)??0)-crossings[0]):0,smallAnglePeriod,approximationDifferencePercent:period===null?null:(period/smallAnglePeriod-1)*100,challengePassed:period!==null&&Math.abs(period-2)<.03};}
 function step(){const h=PENDULUM_DT,gL=PENDULUM_G/settings.length,oldTheta=theta,oldTime=elapsed;
  const a1=omega,b1=-gL*Math.sin(theta),a2=omega+h*b1/2,b2=-gL*Math.sin(theta+h*a1/2),a3=omega+h*b2/2,b3=-gL*Math.sin(theta+h*a2/2),a4=omega+h*b3,b4=-gL*Math.sin(theta+h*a3);
  theta+=h*(a1+2*a2+2*a3+a4)/6;omega+=h*(b1+2*b2+2*b3+b4)/6;steps++;elapsed=steps*h;
  if(oldTheta>0&&theta<=0&&omega<0){const time=oldTime+h*oldTheta/(oldTheta-theta);crossings.push(time);if(crossings.length>1)periods.push(time-crossings.at(-2));if(crossings.length===4){period=(time-crossings[0])/3;phase='complete';accumulator=0;}}
  if(steps%8===0||phase==='complete')samples.push({time:elapsed,angle:theta*180/Math.PI});
 }
 reset(initial);
 return{snapshot,reset,start(){if(!alive||!['ready','paused'].includes(phase))return false;phase='running';return true;},pause(){if(phase==='running'){phase='paused';return true;}return false;},advance(dt){if(!alive||phase!=='running'||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(dt,.5);while(accumulator+1e-12>=PENDULUM_DT&&phase==='running'){accumulator-=PENDULUM_DT;step();}},dispose(){alive=false;if(phase==='running')phase='paused';}};
}
