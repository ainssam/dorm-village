import * as Astronomy from '../vendor/astronomy-engine-2.1.19.min.js';
import {catalog} from '../data/star-catalog.js';
import {guidePatterns} from '../data/guide-patterns.js';
for(const p of guidePatterns){for(const edge of p.edges)Object.freeze(edge);Object.freeze(p.edges);Object.freeze(p);}Object.freeze(guidePatterns);
import {createSkyRequest} from './observer-time.js';
import {directionFromHorizontal,horizontalFromDirection,CARDINAL_DIRECTIONS} from './sky-projection.js';
const J2000_UTC_MS=Date.UTC(2000,0,1,12),JULIAN_YEAR_MS=365.25*86400000;
const BODIES=Object.freeze(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune']);
const RAD=Math.PI/180;
// Dataset module is shared but never exposed mutably to a consumer.
for(const s of catalog.stars){if(s.xyzParsec)Object.freeze(s.xyzParsec);if(s.velocityParsecPerYear)Object.freeze(s.velocityParsecPerYear);Object.freeze(s.quality);Object.freeze(s);}Object.freeze(catalog.stars);
export const SKY_MODEL_LIMITS=Object.freeze({maxStars:1024,minimumUpdateIntervalMs:15000,refraction:'none',maxVisibleLabels:8});
export function daylightBand(sunAltitudeDeg){if(!Number.isFinite(sunAltitudeDeg)||Math.abs(sunAltitudeDeg)>90)throw new RangeError('Invalid Sun altitude');return sunAltitudeDeg>=0?'day':sunAltitudeDeg>=-6?'civil-twilight':sunAltitudeDeg>=-12?'nautical-twilight':sunAltitudeDeg>=-18?'astronomical-twilight':'night';}
export function limbHorizonState(centerAltitudeDeg,angularDiameterDeg){if(!Number.isFinite(centerAltitudeDeg)||Math.abs(centerAltitudeDeg)>90||!Number.isFinite(angularDiameterDeg)||angularDiameterDeg<0||angularDiameterDeg>180)throw new RangeError('Invalid disc');const radius=angularDiameterDeg/2;return centerAltitudeDeg-radius>0?'above':centerAltitudeDeg+radius<=0?'below':'partial';}
function stellarDirection(star,years,time,rotation){
 let xyz;
 if(star.xyzParsec&&star.velocityParsecPerYear)xyz=star.xyzParsec.map((v,i)=>v+years*star.velocityParsecPerYear[i]);
 else {const ra=star.raJ2000Hours*Math.PI/12,dec=star.decJ2000Deg*RAD;xyz=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];}
 const length=Math.hypot(...xyz);const v=Astronomy.RotateVector(rotation,new Astronomy.Vector(xyz[0]/length,xyz[1]/length,xyz[2]/length,time));
 // Astronomy Engine HOR uses north, west, up. The UI boundary is east,north,up.
 return Object.freeze([-v.y,v.x,v.z]);
}
/** Pure explicit observer/time -> immutable snapshot. No clock read, network,
 * weather, DOM, save data, persistent settings, timers or mutable star slots. */
export function computeSkySnapshot(input){
 const request=createSkyRequest(input),o=request.observer,date=new Date(request.instantUtcMs),time=Astronomy.MakeTime(date),observer=new Astronomy.Observer(o.latDeg,o.lonDegEast,o.elevationM),rotation=Astronomy.Rotation_EQJ_HOR(time,observer),years=(request.instantUtcMs-J2000_UTC_MS)/JULIAN_YEAR_MS;
 const objects=catalog.stars.map(star=>{
  const directionENU=stellarDirection(star,years,time,rotation),h=horizontalFromDirection(directionENU);
  return Object.freeze({id:star.id,name:star.name,kind:'star',directionENU,...h,aboveHorizon:h.altitudeDeg>0,magnitude:star.magnitudeV,illuminatedFraction:null,phaseReference:null,phaseCycleDeg:null,angularDiameterDeg:null,angularRadiusDeg:null,limbHorizonState:null,coordinateReference:'catalog-direction-of-date',quality:star.quality});
 });
 for(const body of BODIES){
  // Observer/ofdate give topocentric coordinates. Sun/planets use light-time and
  // aberration correction; the pinned engine Moon path uses its direct lunar model.
  const eq=Astronomy.Equator(body,time,observer,true,true),hor=Astronomy.Horizon(time,observer,eq.ra,eq.dec,null),illum=Astronomy.Illumination(body,time),directionENU=directionFromHorizontal(hor.altitude,hor.azimuth);
  const radiusKm=body==='Sun'?695700:body==='Moon'?1737.4:null,angularDiameterDeg=radiusKm?2*Math.asin(radiusKm/(eq.dist*Astronomy.KM_PER_AU))/RAD:null;
  let sunwardTangentENU=null;
  if(body==='Moon'){const sun=objects.find(o=>o.id==='Sun').directionENU,dot=sun.reduce((v,x,i)=>v+x*directionENU[i],0),tangent=sun.map((x,i)=>x-dot*directionENU[i]),length=Math.hypot(...tangent);if(length>1e-8)sunwardTangentENU=Object.freeze(tangent.map(x=>x/length));}
  objects.push(Object.freeze({id:body,name:body,kind:body==='Sun'?'sun':body==='Moon'?'moon':'planet',directionENU,altitudeDeg:hor.altitude,azimuthDeg:Math.abs(hor.altitude)>89.999999?null:hor.azimuth,aboveHorizon:hor.altitude>0,magnitude:illum.mag,illuminatedFraction:illum.phase_fraction,phaseReference:'geocentric',phaseCycleDeg:body==='Moon'?Astronomy.MoonPhase(time):null,sunwardTangentENU,angularDiameterDeg,angularRadiusDeg:angularDiameterDeg===null?null:angularDiameterDeg/2,limbHorizonState:angularDiameterDeg===null?null:limbHorizonState(hor.altitude,angularDiameterDeg),coordinateReference:'topocentric',distanceAu:eq.dist,quality:Object.freeze([])}));
 }
 const sunAltitudeDeg=objects.find(o=>o.id==='Sun').altitudeDeg;
 return Object.freeze({request,computedForUtcMs:request.instantUtcMs,modelVersion:'astronomy-engine@2.1.19/dormi-1',catalogVersion:catalog.metadata.sourceVersion,sunAltitudeDeg,cardinals:CARDINAL_DIRECTIONS,guidePatterns,daylightBand:daylightBand(sunAltitudeDeg),objects:Object.freeze(objects),warnings:Object.freeze(['Ideal airless unobstructed horizon; aboveHorizon does not guarantee visibility through weather, terrain, buildings, haze, moonlight or city lighting.','UTC approximates UT1; stellar annual aberration and annual parallax omitted.','Fourteen catalog rows lack reliable distance: proper motion omitted and marked per object.','Geocentric illumination fraction is distinct from topocentric position.','Planet glyphs and star markers are illustrative; no planet surface, ring orientation or satellite claims.'])});
}
