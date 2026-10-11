// Explicit public city presets only. No device location, geocoder, or saved coordinates.
const rows=[
 ['seoul','서울',37.5665,126.978,'Asia/Seoul'],
 // Public GeoNames city centers via Open-Meteo, checked 2026-10-05. See provenance.
 ['busan','부산',35.10168,129.03004,'Asia/Seoul'],
 ['jeju','제주시',33.50972,126.52194,'Asia/Seoul'],
 ['sydney','시드니',-33.8688,151.2093,'Australia/Sydney'],
 ['tromso','트롬쇠',69.6492,18.9553,'Europe/Oslo'],
 ['london','런던',51.5074,-.1278,'Europe/London'],
 ['new-york','뉴욕',40.7128,-74.006,'America/New_York'],
 ['kathmandu','카트만두',27.7172,85.324,'Asia/Kathmandu'],
 ['quito','키토',-.1807,-78.4678,'America/Guayaquil'],
];
export const WEATHER_CITIES=Object.freeze(rows.map(([id,label,latDeg,lonDegEast,timeZone])=>Object.freeze({id,label,latDeg,lonDegEast,timeZone,source:'preset',isExample:false,elevationM:0})));
export function weatherCity(id){const city=WEATHER_CITIES.find(c=>c.id===id);if(!city)throw new TypeError('Invalid weather city ID');return city;}
