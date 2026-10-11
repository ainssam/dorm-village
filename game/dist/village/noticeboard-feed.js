// Defense-in-depth for a future server-sanitized, public LIST summary cache.
// This module never fetches or authorizes private source data.
const MAX_ITEMS=30;
const cleanText=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max?value.trim():null;
const validDate=(value,now)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now+300000?new Date(value).toISOString():null;
export function sanitizeNoticeboardFeed(value,{now=Date.now()}={}){
 if(!value||value.version!==1||value.visibility!=='public'||!Array.isArray(value.items)||value.items.length>MAX_ITEMS||!Number.isFinite(now))return null;
 const verifiedAt=validDate(value.verifiedAt,now),sourceTitle=cleanText(value.source?.title,80);
 if(!verifiedAt||!sourceTitle)return null;
 const items=[];
 for(const raw of value.items){
  // Public summary status is independent of whether the app's detail is locked.
  if(!raw||raw.summaryVisibility!=='public')continue;
  const title=cleanText(raw.title,120),tagline=cleanText(raw.tagline,240),category=cleanText(raw.category,60);
  if(title&&tagline&&category)items.push(Object.freeze({title,tagline,category,summaryVisibility:'public'}));
 }
 return Object.freeze({version:1,visibility:'public',verifiedAt,source:Object.freeze({title:sourceTitle}),items:Object.freeze(items)});
}
