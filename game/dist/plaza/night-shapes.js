import {DORMI_TRACE} from './dormi-trace.js';
export {DORMI_TRACE};
export const SHAPES=Object.freeze(['round','ring','heart','star','dormi']);
const TAU=Math.PI*2;
const featureNames=['head','creamFace','curl','leftEye','rightEye','leftBlush','rightBlush','smile','tongue'];
const weights=[.26,.16,.25,.055,.055,.065,.065,.055,.035];
const featureColors=[[1,.79,.43],[1,.92,.7],[.37,.61,1],[.26,.55,1],[.26,.55,1],[1,.3,.58],[1,.3,.58],[1,.42,.64],[1,.65,.69]];
function curveAt(points,u,closed){const f=u*(closed?points.length:points.length-1),a=Math.min(points.length-1,Math.floor(f)),b=closed?(a+1)%points.length:Math.min(a+1,points.length-1),t=f-a;return [points[a][0]*(1-t)+points[b][0]*t,points[a][1]*(1-t)+points[b][1]*t];}
/** Fixed points in local right/up/depth coordinates. Cached by callers, never rebuilt per frame. */
export function sampleShape(kind,count){
 if(!SHAPES.includes(kind))throw new RangeError('Unknown firework shape');
 if(!Number.isInteger(count)||count<80||count>2048)throw new RangeError('Shape needs 80–2048 points');
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),features=[];
 if(kind==='dormi'){
  let offset=0;
  for(let f=0;f<featureNames.length;f++){
   const name=featureNames[f],n=f===featureNames.length-1?count-offset:Math.floor(count*weights[f]),curve=DORMI_TRACE.features[name];
   for(let j=0;j<n;j++){const p=curveAt(curve,j/(name==='curl'?n-1:n),name!=='curl');positions.set([p[0]/.50,(p[1]-1.13)/.50,0],offset*3);colors.set(featureColors[f],offset*3);features.push(name);offset++;}
  }
 }else{
  for(let i=0;i<count;i++){
   const a=TAU*i/count;let x,y,z=0;
   if(kind==='round'){const phi=i*2.399963229728653,y0=1-2*(i+.5)/count,r=Math.sqrt(1-y0*y0);x=Math.cos(phi)*r;y=y0;z=Math.sin(phi)*r*.45;}
   if(kind==='ring'){x=Math.cos(a);y=Math.sin(a);z=.055*Math.sin(a*3);}
   if(kind==='heart'){x=Math.pow(Math.sin(a),3);y=(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)+2)/17;}
   if(kind==='star'){const f=i/count*10,k=Math.floor(f),u=f-k,a0=Math.PI/2+k*Math.PI/5,a1=a0+Math.PI/5,r0=k%2?.45:1,r1=k%2?1:.45;x=Math.cos(a0)*r0*(1-u)+Math.cos(a1)*r1*u;y=Math.sin(a0)*r0*(1-u)+Math.sin(a1)*r1*u;}
   positions.set([x,y,z],i*3);colors.set([1,1,1],i*3);features.push(kind);
  }
 }
 return {kind,count,positions,colors,features};
}
