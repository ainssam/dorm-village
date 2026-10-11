// Rounded fishing contacts in original Dormi model space (+Z forward).
// Unsigned hand/elbow X follows createSportsDeformer's mirrored-left convention.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function fishingPoseFrame(reel=0,raise=0){
 const r=clamp(raise),cy=.65+r*.12,cz=.70-r*.015,crank=.055;
 return {hands:{right:[.31+r*.12,.75+r*.12,.70-r*.015],left:[.10-r*.10,cy+Math.sin(reel)*crank,cz+Math.cos(reel)*crank]},elbows:{right:[.63,.44+r*.11,.33],left:[.63,.40+r*.10,.34]},reelCenter:[.21+r*.10,cy,cz],arm:1,foot:0};
}
export function createFishingMotion({reduced=false}={}){
 let live=null,lastClock=null;
 function desired(s){const charge=s.phase==='charging',cast=s.phase==='casting',u=clamp(s.elapsed/.8),ease=u*u*(3-2*u);return{bend:s.phase==='reeling'?clamp(s.tension):0,raise:charge?.72+.20*s.power:cast?.92*(1-ease):s.phase==='reeling'?.08+s.tension*.12:0,forward:charge?-.15:cast?-.15+ease*1.30:1.15,lift:charge?1.70:cast?1.70+( .47-1.70)*ease:s.phase==='reeling'?.55+s.tension*.38:.47};}
 return {update(s,held=false){const target=desired(s),clock=Number.isFinite(s.clock)?s.clock:0;if(!live){live={...target,reel:0,speed:0};lastClock=clock;return {...live};}const dt=clamp(clock-lastClock,0,.05);lastClock=clock;if(dt<=0)return {...live};const blend=1-Math.exp(-dt*8);for(const key of ['raise','forward','lift','bend']){live[key]+=(target[key]-live[key])*blend;if(Math.abs(target[key]-live[key])<1e-5)live[key]=target[key];}const speed=!reduced&&held&&s.phase==='reeling'?5.6:0,previous=live.speed;live.speed+=(speed-live.speed)*(1-Math.exp(-dt*14));if(Math.abs(speed-live.speed)<.002)live.speed=speed;live.reel+=(previous+live.speed)*.5*dt;return {...live};},snapshot:()=>live?{...live}:null};
}
