import {AIRPORT_SHORE,amusementAirportWorldPoint} from './layout.js';
import {unionPolygons} from '../world/path-union.js';

const mappedShore=Object.freeze(AIRPORT_SHORE.map(([x,z])=>{const p=amusementAirportWorldPoint({x,z});return Object.freeze([p.x,p.z]);}));
export const AMUSEMENT_AIRPORT_ROUTE=Object.freeze([[0,7.1],[12.3,6.8],[12.75,6.35],[13.5,-7.5]].map(p=>Object.freeze(p)));
const strips=AMUSEMENT_AIRPORT_ROUTE.slice(1).map((b,i)=>{const a=AMUSEMENT_AIRPORT_ROUTE[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*.85,nz=dx/len*.85;return[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]];});
const annex=unionPolygons([mappedShore,...strips]);
if(!annex.length)throw Error('Amusement airport connector must join airport shore');
export const AMUSEMENT_AIRPORT_LAND=Object.freeze(annex.reduce((best,ring)=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-p[1]*q[0];},0))>Math.abs(best.reduce((s,p,i)=>{const q=best[(i+1)%best.length];return s+p[0]*q[1]-p[1]*q[0];},0))?ring:best).map(p=>Object.freeze(p)));
