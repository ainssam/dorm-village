import {PRODUCE_ANNEX_CONTROLS,PRODUCE_CONNECTOR} from '../produce/layout.js';
import {pavingPolygons,unionPolygons} from './path-union.js';
// These sampled curves are the source of truth for both terrain meshes and physical shores.
function smooth(points){const out=[];for(let i=0;i<points.length;i++)for(let k=0;k<6;k++){const t=k/6,a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length],d=points[(i+2)%points.length];out.push([0,1].map(j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t*t+(-a[j]+3*b[j]-3*c[j]+d[j])*t*t*t)));}return out;}
const park=smooth([[-4.35,-1.9],[-4.05,-3.15],[-2.6,-3.7],[-.8,-3.7],[1.3,-3.75],[3.2,-3.55],[4.25,-2.15],[4.3,-.4],[4.45,1.2],[4.15,2.65],[2.9,3.55],[1.4,3.7],[-.6,3.7],[-2.4,3.55],[-3.65,2.5],[-4.3,.5]]);
const playground=smooth([[-7.3,-7.2],[-4.5,-8],[1,-7.7],[5,-8],[7.4,-7.1],[7.6,-4],[7.35,0],[7.5,3],[7.15,5.25],[4.6,6.25],[1.4,6],[0,5.9],[-2.2,6.2],[-5.3,6.1],[-7.2,4.85],[-7.6,1.8],[-7.25,-2],[-7.5,-4.8]]);
const field=smooth([[-1.8,7.5],[1.8,7.5],[4.4,7.1],[6.8,6.5],[8.65,5],[9.4,2.7],[9.5,0],[9.4,-2.9],[8.7,-5.4],[7.5,-7.1],[4.3,-7.45],[0,-7.3],[-4.7,-7.45],[-7.6,-6.8],[-9,-4.9],[-9.5,-1.4],[-9.3,2],[-8.4,4.8],[-6.6,6.5],[-4.2,7.2]]).map(([x,z])=>[Math.max(-9.5,Math.min(9.5,x)),Math.abs(x)<=1.8&&z>7.4?7.5:Math.min(z,7.5)]);
const practice=smooth([[-4.8,-9.3],[0,-9.2],[4.8,-9.4],[5.15,-12.7],[5,-17.6],[2.8,-18.2],[-2.8,-18.2],[-5,-17.6],[-5.15,-12.7]]);
const basketball=smooth([[8,-4.1],[12.8,-4.25],[17.8,-4.1],[18,0],[17.8,5.45],[13,5.6],[8,5.4],[7.9,0]]);
const fieldWithPractice=unionPolygons([field,basketball,[[-1.7,-6.8],[1.7,-6.8],[1.7,-10],[-1.7,-10]],practice]);
if(fieldWithPractice.length!==1)throw Error('Baseball practice must connect to the field');
export const ORIGINAL_PARK_SHORE=Object.freeze(park.map(([x,z])=>[x*1.5,z*1.5]));
const parkWithProduce=unionPolygons([ORIGINAL_PARK_SHORE,smooth(PRODUCE_ANNEX_CONTROLS),...pavingPolygons([PRODUCE_CONNECTOR])]);
if(parkWithProduce.length!==1)throw Error('Produce annex must share one connected park shore');
export const OUTDOOR_SHORES=Object.freeze({park:parkWithProduce[0],playground,sportsField:fieldWithPractice[0]});
