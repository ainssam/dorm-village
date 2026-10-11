import {sanitizeNoticeboardFeed} from './noticeboard-feed.js';
const FEED_URL=new URL('./data/noticeboard-public.json',import.meta.url);
const MAX_BYTES=96000,STALE_AFTER=36*60*60*1000;
async function readBoundedJSON(response){
 if(!response.ok||response.redirected||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw Error('Unavailable public snapshot');
 const length=Number(response.headers.get('content-length'));if(length>MAX_BYTES)throw Error('Snapshot too large');
 if(!response.body?.getReader)throw Error('Readable snapshot required');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error('Snapshot too large');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 finally{reader.releaseLock();}
}
export function createNoticeboardFeedLoader({fetchImpl=globalThis.fetch,now=()=>Date.now(),timeoutMs=8000}={}){
 let generation=0,controller=null,state=Object.freeze({feed:null,status:'unavailable'});
 const cancel=()=>{generation++;controller?.abort();controller=null;};
 async function refresh(onState){
  cancel();const ticket=generation,abort=new AbortController();controller=abort;
  const timer=setTimeout(()=>abort.abort(),Math.max(1,Math.min(30000,timeoutMs)));let next;
  try{
   if(globalThis.location&&FEED_URL.origin!==globalThis.location.origin)throw Error('Same-origin snapshot required');
   const response=await fetchImpl(FEED_URL,{credentials:'omit',mode:'same-origin',redirect:'error',cache:'no-cache',referrerPolicy:'no-referrer',signal:abort.signal,headers:{Accept:'application/json'}});
   const raw=await readBoundedJSON(response);if(abort.signal.aborted)throw Error('Expired public snapshot request');
   const at=now(),feed=sanitizeNoticeboardFeed(raw,{now:at});
   if(!feed||feed.items.length!==raw.items.length||raw.verifiedAt.slice(0,19)!==feed.verifiedAt.slice(0,19))throw Error('Invalid public snapshot');
   next={feed,status:at-Date.parse(feed.verifiedAt)>STALE_AFTER?'stale':feed.items.length?'ready':'empty'};
  }catch{next={feed:state.feed,status:state.feed?'refresh-failed':'unavailable'};}
  finally{clearTimeout(timer);if(ticket===generation)controller=null;}
  if(ticket!==generation)return state;
  state=Object.freeze(next);onState?.(state);return state;
 }
 return Object.freeze({refresh,cancel,getState:()=>state});
}
