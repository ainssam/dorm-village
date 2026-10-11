export const FLIGHT_PHASES=Object.freeze([{name:'seal',duration:1.2,ground:true},{name:'taxi-out',duration:15,ground:true},{name:'takeoff-roll',duration:6,ground:true},{name:'climb',duration:4,ground:false},{name:'cruise',duration:12,ground:false},{name:'approach',duration:4,ground:false},{name:'landing-roll',duration:6,ground:true},{name:'taxi-in',duration:10,ground:true},{name:'open',duration:1.2,ground:true}]);
// One approach clock includes the already-visible destination establishment/reveal.
export const FLIGHT_ARRIVAL=Object.freeze({establish:.8,camera:.2,offset:1,remaining:3});
const movingSeconds=FLIGHT_PHASES.slice(1,-1).reduce((sum,p)=>sum+p.duration,0),spinAngle=t=>{t=Math.max(0,Math.min(movingSeconds,t));const ease=1;if(t<ease)return 8*t*t/ease;if(t>movingSeconds-ease){const remain=movingSeconds-t;return 16*(movingSeconds-ease)-8*remain*remain/ease;}return 16*(t-ease/2);};
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>x*x*(3-2*x),R=2.5;
// Keep the exact existing taxi arc. Its eight-second turn eases speed for one
// second at each end and caps the following camera at pi/7 rad/s (< .45).
const turnProgress=t=>{t=Math.max(0,Math.min(8,t));return t<1?t*t/14:t>7?1-(8-t)*(8-t)/14:(t-.5)/7;};
function grounded(out,x,z,yaw){Object.assign(out.plane,{x,y:0,z,yaw,pitch:0,roll:0});}
export function sampleFlightPhase(phase,time,out={}){const def=FLIGHT_PHASES.find(f=>f.name===phase);if(!def)throw new RangeError('Unknown flight phase');const u=clamp((Number.isFinite(time)?time:0)/def.duration),f=out.plane??={};out.space=phase==='cruise'?'cruise':'airport';out.ramp=0;const index=FLIGHT_PHASES.indexOf(def),elapsed=FLIGHT_PHASES.slice(1,index).reduce((sum,p)=>sum+p.duration,0)+u*def.duration;out.propeller=phase==='seal'?0:phase==='open'?spinAngle(movingSeconds):spinAngle(elapsed);grounded(out,-5,8,0);
 if(phase==='seal'){out.ramp=1-smooth(u);return out;}if(phase==='open'){out.ramp=smooth(u);return out;}
 if(phase==='taxi-out'){const t=u*def.duration;if(t<=7)grounded(out,-5,8-18*smooth(t/7),0);else{const a=Math.PI+Math.PI*turnProgress(t-7);grounded(out,-2.5+R*Math.cos(a),-10+R*Math.sin(a),Math.PI-a);}return out;}
 if(phase==='takeoff-roll'){grounded(out,0,-10+18*u*u,Math.PI);return out;}
 if(phase==='landing-roll'){grounded(out,0,-8+18*(2*u-u*u),Math.PI);return out;}
 if(phase==='taxi-in'){const t=u*def.duration;if(t<=8){const a=Math.PI*turnProgress(t);grounded(out,-2.5+R*Math.cos(a),10+R*Math.sin(a),Math.PI-a);}else grounded(out,-5,10-2*smooth((t-8)/2),0);return out;}
 if(phase==='cruise'){grounded(out,0,28+20*u,Math.PI);f.y=3;return out;}
 const climb=phase==='climb',distance=climb?24*u-4*u*u:16*u+4*u*u,s=distance/20,a=.30,k=3/(20*(1-a));
 // Smooth slope ramps plus a plateau match altitude/pitch rates without exceeding
 // the original .222-radian pitch limit (a naive quintic would exceed it).
 const q=s<a?smooth(s/a):s>1-a?smooth((1-s)/a):1,integral=t=>t*t*t-t*t*t*t/2;
 const rise=s<a?20*k*a*integral(s/a):s>1-a?3-20*k*a*integral((1-s)/a):20*k*(s-a/2);
 const pitch=(climb?1:-1)*Math.atan(k*q),altitude=climb?rise:3-rise;
 grounded(out,0,(climb?8:-28)+distance,Math.PI);f.pitch=pitch;
 // Rigid airframe clearance: use the actual wheel axle/radius geometry, not a visual y offset.
 // Constrain wheel clearance near ground only; airborne approach must not rise.
 const groundDistance=climb?s:1-s,contactWeight=1-smooth(clamp((groundDistance-.15)/.20));
 const lowest=Math.min(...[.48,.48,-1.91].map(z=>.27*Math.cos(pitch)-z*Math.sin(pitch)-.22));f.y=altitude+contactWeight*(.05-lowest);return out;
}
