import {initialProgress,validateProgress,migrateProgress} from './progress.js';
import {SAVE_KEY,BACKUP_KEY,LEGACY_SAVE_KEY,LEGACY_BACKUP_KEY} from './save-keys.js';
import {copyLegacyPhotos,LEGACY_PHOTO_STORE_KEY} from '../village/photo-storage.js';
export {SAVE_KEY,BACKUP_KEY,LEGACY_SAVE_KEY,LEGACY_BACKUP_KEY};
function parse(raw,allowLegacy=false){if(raw===null)return {status:'missing'};try{if(typeof raw!=='string'||raw.length>32768)return {status:'corrupted'};const s=JSON.parse(raw);if(s?.schemaVersion>6||s?.village?.cafe?.schemaVersion>1||s?.homeRobot?.schemaVersion>1||s?.homeBuild?.schemaVersion>1)return {status:'future-version'};const v=(allowLegacy||[2,3,4,5].includes(s?.schemaVersion))?migrateProgress(s):validateProgress(s);return v.valid?{status:'valid',state:v.state,legacy:s.schemaVersion===1,upgrade:[2,3,4,5].includes(s.schemaVersion)}:{status:'corrupted'};}catch{return {status:'corrupted'};}}
function versionOf(raw){try{return JSON.parse(raw)?.schemaVersion;}catch{return null;}}
function result(status,state,base,blocked=false){return {status,state,revision:state.revision,blocked,...base};}
export function loadSave(storage,{writerReady=true}={}){
 let raw=null,backupRaw=null;const empty=initialProgress(),base={raw,backupRaw,writerReady,needsUpgrade:false};let main,back;
 try{raw=storage.getItem(SAVE_KEY);base.raw=raw;main=parse(raw);}catch{return result('unavailable',empty,base,true);}
 try{backupRaw=storage.getItem(BACKUP_KEY);base.backupRaw=backupRaw;back=parse(backupRaw);}catch{return result(main.status==='future-version'?'future-version':'unavailable',main.state??empty,base,true);}
 if(main.status==='future-version'||back.status==='future-version')return result('future-version',main.state??empty,base,true);
 if(main.status==='valid')return result(main.upgrade?'migrated':'loaded',main.state,{...base,needsUpgrade:main.upgrade},!writerReady);
 if(back.status==='valid')return result('recovered',back.state,{...base,needsUpgrade:back.upgrade},!writerReady);
 if(raw!==null||backupRaw!==null)return result('corrupted',empty,base,true);
 try{
  base.legacyRaw=storage.getItem(LEGACY_SAVE_KEY);base.legacyBackupRaw=storage.getItem(LEGACY_BACKUP_KEY);main=parse(base.legacyRaw,true);back=parse(base.legacyBackupRaw,true);
  if(main.status==='future-version'||back.status==='future-version')return result('future-version',empty,base,true);
  // A version-2 legacy fence is deliberately not a recovery source.
  if((base.legacyRaw!==null&&versionOf(base.legacyRaw)===2)||(base.legacyBackupRaw!==null&&versionOf(base.legacyBackupRaw)===2))return result('future-version',empty,base,true);
  if(main.status==='valid'||back.status==='valid'){base.fromLegacy=true;base.needsUpgrade=true;base.legacyPhotoRaw=storage.getItem(LEGACY_PHOTO_STORE_KEY);return result(main.state?'migrated':'recovered',(main.state??back.state),base,!writerReady);}
  return result(main.status==='missing'&&back.status==='missing'?'new':'corrupted',empty,base,!writerReady||main.status!=='missing'||back.status!=='missing');
 }catch{return result('unavailable',empty,base,true);}
}
function compatibilityFence(storage){const fence=JSON.stringify({schemaVersion:2,migrated:true});let ok=true;for(const key of [LEGACY_SAVE_KEY,LEGACY_BACKUP_KEY])try{const raw=storage.getItem(key);if(raw!==null){try{if(JSON.parse(raw)?.schemaVersion>2){ok=false;continue;}}catch{}}if(raw!==fence)storage.setItem(key,fence);}catch{ok=false;}return ok;}
export function commitSave(storage,state,baseline,{reset=false}={}){
 if(baseline.writerReady===false||(baseline.blocked&&!reset))return {status:'blocked'};
 const valid=validateProgress(state);if(!valid.valid||!Number.isSafeInteger(baseline.revision)||baseline.revision<0||baseline.revision>=Number.MAX_SAFE_INTEGER)return {status:'invalid'};
 let writtenBackup=null,backupWritten=false;
 try{
  const current=storage.getItem(SAVE_KEY),backup=storage.getItem(BACKUP_KEY);
  if(current!==baseline.raw||backup!==baseline.backupRaw)return {status:'conflict'};
  if(!reset&&(parse(current).status==='future-version'||parse(backup).status==='future-version'))return {status:'blocked'};
  if(baseline.fromLegacy&&(storage.getItem(LEGACY_SAVE_KEY)!==baseline.legacyRaw||storage.getItem(LEGACY_BACKUP_KEY)!==baseline.legacyBackupRaw))return {status:'conflict'};
  const savedState={...valid.state,revision:baseline.revision+1,savedAt:new Date().toISOString()},raw=JSON.stringify(savedState);if(raw.length>32768)return {status:'invalid'};
  const prior=reset?null:parse(current).state??(baseline.fromLegacy||parse(backup).status==='valid'?baseline.state:null);
  const priorRaw=prior?JSON.stringify(prior):null;if(priorRaw!==null&&priorRaw.length>32768)return {status:'invalid'};
  if(baseline.fromLegacy&&!reset)copyLegacyPhotos(storage,baseline.legacyPhotoRaw);
  if(storage.getItem(SAVE_KEY)!==baseline.raw||storage.getItem(BACKUP_KEY)!==baseline.backupRaw)return {status:'conflict'};
  if(baseline.fromLegacy&&(storage.getItem(LEGACY_SAVE_KEY)!==baseline.legacyRaw||storage.getItem(LEGACY_BACKUP_KEY)!==baseline.legacyBackupRaw||(!reset&&storage.getItem(LEGACY_PHOTO_STORE_KEY)!==baseline.legacyPhotoRaw)))return {status:'conflict'};
  const nextBaseline={status:'loaded',state:savedState,raw,backupRaw:backup,revision:savedState.revision,blocked:false,writerReady:baseline.writerReady,needsUpgrade:false};
  if(reset){
   storage.setItem(SAVE_KEY,raw);
   try{storage.setItem(BACKUP_KEY,raw);nextBaseline.backupRaw=raw;}catch(error){return {status:'reset-incomplete',savedState,baseline:nextBaseline,error:error.name||'StorageError'};}
  }else{
   if(prior){writtenBackup=priorRaw;storage.setItem(BACKUP_KEY,writtenBackup);backupWritten=true;nextBaseline.backupRaw=writtenBackup;}
   if(storage.getItem(SAVE_KEY)!==baseline.raw)return {status:'conflict'};
   storage.setItem(SAVE_KEY,raw);
  }
  const legacyFenced=compatibilityFence(storage);
  return {status:'saved',savedState,baseline:nextBaseline,legacyFenced};
 }catch(error){const retryBaseline=backupWritten?{...baseline,backupRaw:writtenBackup}:baseline;return {status:'failed',baseline:retryBaseline,error:error.name||'StorageError'};}
}
export function resetSave(storage,baseline){return commitSave(storage,initialProgress(),baseline,{reset:true});}
