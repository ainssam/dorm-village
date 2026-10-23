/** Existing sports own their contact simulation. Run their surface solver on
 * the CPU reference, then retarget those contacts to the visible skeleton. */
export function adaptCharacterRig(poser,create){
 const reference=poser.poseReference;
 const owned=create(reference.model,reference.poser);
 const mutations=new Set(['apply','update','release','dispose','reset','rebase']);
 return new Proxy(owned,{get(target,key){const value=Reflect.get(target,key);if(typeof value!=='function')return value;return (...args)=>{const result=value.apply(target,args);if(mutations.has(key))poser.syncReference();return result;};}});
}
