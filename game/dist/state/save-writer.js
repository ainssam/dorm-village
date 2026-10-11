// Hold one origin-scoped writer for the whole page. Hidden tabs retain ownership.
export async function acquireSaveWriter(locks){
 if(typeof locks?.request!=='function')return {writable:false,reason:'unsupported',release(){}};
 return new Promise(resolve=>{let settled=false;const no=reason=>{if(!settled){settled=true;resolve({writable:false,reason,release(){}});}};try{Promise.resolve(locks.request('dormi.world.v2.writer',{mode:'exclusive',ifAvailable:true},lock=>{if(!lock){no('another-tab');return;}let release;const held=new Promise(done=>{release=done;}),session={writable:true,reason:null,release(){if(!session.writable)return;session.writable=false;release();}};settled=true;resolve(session);return held;})).catch(()=>no('unavailable'));}catch{no('unavailable');}});
}
