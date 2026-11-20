// Hold one origin-scoped writer for the whole page. Hidden tabs retain ownership.
function readOnly(reason) {
 return {writable:false,reason,release(){}};
}

export async function acquireSaveWriter(locks,{timeoutMs=3000}={}) {
 if(typeof locks?.request!=='function')return readOnly('unsupported');
 return new Promise(resolve=>{
  let settled=false;
  const finish=session=>{
   if(settled)return;
   settled=true;
   clearTimeout(deadline);
   resolve(session);
  };
  const unavailable=()=>finish(readOnly('unavailable'));
  const deadline=setTimeout(unavailable,timeoutMs);
  try {
   const pending=locks.request('dormi.world.v2.writer',{mode:'exclusive',ifAvailable:true},lock=>{
    // A late grant must not leave a lock held by a tab that opened read-only.
    if(settled)return;
    if(!lock){finish(readOnly('another-tab'));return;}
    let release;
    const held=new Promise(done=>{release=done;});
    const session={writable:true,reason:null,release(){
     if(!session.writable)return;
     session.writable=false;
     release();
    }};
    finish(session);
    return held;
   });
   Promise.resolve(pending).catch(unavailable);
  } catch {
   unavailable();
  }
 });
}
