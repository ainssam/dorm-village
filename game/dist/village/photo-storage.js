import {SAVE_KEYS} from '../state/save-keys.js';
import {validPhotoId} from './photo-config.js';
export const LEGACY_PHOTO_STORE_KEY='dormi.world.photos.v1',PHOTO_STORE_KEY='dormi.world.photos.v2',PHOTO_MAX_CHARS=140000,PHOTO_TOTAL_CHARS=1950000;
export const isGamePhoto=data=>typeof data==='string'&&data.length>=32&&data.length<=PHOTO_MAX_CHARS&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(data);
export function readPhotoBytes(raw){if(raw===null)return {};if(raw.length>PHOTO_TOTAL_CHARS)throw Error('PhotoStoreTooLarge');const s=JSON.parse(raw);if(!s||s.version!==1||!s.images||Array.isArray(s.images)||typeof s.images!=='object'||Object.keys(s.images).length>13||Object.entries(s.images).some(([id,data])=>!validPhotoId(id)||!isGamePhoto(data)))throw Error('InvalidPhotoStore');return s.images;}
export function copyLegacyPhotos(storage,expectedRaw){
 const current=storage.getItem(LEGACY_PHOTO_STORE_KEY);if(current!==expectedRaw)throw Error("PhotoMigrationConflict");
 const existing=storage.getItem(PHOTO_STORE_KEY);if(expectedRaw===null){if(existing!==null)readPhotoBytes(existing);return;}
 readPhotoBytes(expectedRaw);if(existing!==null){readPhotoBytes(existing);if(existing===expectedRaw)return;}
 storage.setItem(PHOTO_STORE_KEY,expectedRaw);if(storage.getItem(PHOTO_STORE_KEY)!==expectedRaw)throw Error("PhotoMigrationConflict");
}
export function createPhotoStore(storage){
 const read=()=>readPhotoBytes(storage.getItem(PHOTO_STORE_KEY)??storage.getItem(LEGACY_PHOTO_STORE_KEY));
 return {get(id){try{return read()[id]??null;}catch{return null;}},put(id,data,retain=[]){if(!validPhotoId(id)||!isGamePhoto(data))return {status:'invalid'};try{const before=storage.getItem(PHOTO_STORE_KEY),images=Object.fromEntries(Object.entries(readPhotoBytes(before)).filter(([id])=>retain.includes(id)));images[id]=data;const raw=JSON.stringify({version:1,images});if(Object.keys(images).length>13||raw.length>PHOTO_TOTAL_CHARS)return {status:'full'};if(storage.getItem(PHOTO_STORE_KEY)!==before)return {status:'conflict'};storage.setItem(PHOTO_STORE_KEY,raw);return {status:'saved',before,after:raw};}catch(error){return {status:'failed',error:error.name};}},rollback(receipt){try{if(storage.getItem(PHOTO_STORE_KEY)!==receipt.after)return false;if(receipt.before===null)storage.removeItem(PHOTO_STORE_KEY);else storage.setItem(PHOTO_STORE_KEY,receipt.before);return true;}catch{return false;}},clear(){try{storage.removeItem(PHOTO_STORE_KEY);storage.removeItem(LEGACY_PHOTO_STORE_KEY);return true;}catch{return false;}}};
}
export function retainedPhotoIds(storage,progress){const ids=new Set(progress.village.photos.map(p=>p.id));for(const key of SAVE_KEYS)try{const p=JSON.parse(storage.getItem(key));for(const photo of p?.village?.photos??[])if(validPhotoId(photo.id))ids.add(photo.id);}catch{}return [...ids];}
