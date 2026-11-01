// Day keys use the Korean civil calendar, independent of the visitor's timezone.
const dayMs=86400000;
export function seoulDay(now=Date.now()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
}
export function shiftDay(day,offset){return new Date(Date.parse(`${day}T00:00:00Z`)+offset*dayMs).toISOString().slice(0,10);}
export function archiveDays(today){return Array.from({length:7},(_,i)=>shiftDay(today,-i));}
export function discoveryForDay(day,cards){
 if(!cards.length)return null;
 const ordinal=Math.floor(Date.parse(`${day}T00:00:00Z`)/dayMs);
 return cards[((ordinal%cards.length)+cards.length)%cards.length];
}
export function formatDiscoveryDay(day){const [year,month,date]=day.split('-').map(Number);return `${year}년 ${month}월 ${date}일`;}
