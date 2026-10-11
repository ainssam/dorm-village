import * as THREE from 'three';
import {calendarSeason} from '../state/produce-season.js';
export {calendarSeason as worldSeason};
export const WORLD_SEASON_LABELS=Object.freeze({spring:'봄',summer:'여름',autumn:'가을',winter:'겨울'});
export const WORLD_SEASON_NOTE='마을 계절은 한국 달력의 게임용 연출이에요. 텃밭의 놀이 계절 선택, 관측 도시와 실제 날씨는 별개예요.';
// Only authored natural surfaces opt in. All colors are derived from immutable
// original linear RGB; summer is a component-exact restoration, not a hex roundtrip.
const swatch=(hex,amount)=>({rgb:new THREE.Color(hex).toArray(),amount});
const PALETTES={
 'terrain.grass':{spring:[swatch('#bbcf9d',.35)],autumn:[swatch('#c7bc8c',.55)],winter:[swatch('#dce2d7',.82)]},
 'terrain.play-sand':{winter:[swatch('#d9ded3',.40)]},
 'canopy.deciduous':{spring:['#93b27d','#b8cb97','#7c9c73'].map(c=>swatch(c,.40)),autumn:['#c69a64','#d9b97a','#a78562'].map(c=>swatch(c,.72)),winter:['#abb7a7','#c7d0c1','#8f9f91'].map(c=>swatch(c,.65))},
 'canopy.evergreen':{spring:[swatch('#9eb993',.15)],autumn:[swatch('#9da57d',.15)],winter:[swatch('#b5c2b3',.35)]},
 'canopy.shrub':{spring:[swatch('#9eb993',.15)],autumn:[swatch('#9da57d',.15)],winter:[swatch('#b5c2b3',.35)]},
 'flower.decorative':{spring:[swatch('#efd4d0',.15)],autumn:[swatch('#e4c891',.12)],winter:[swatch('#e7e6dc',.12)]},
 'flower.garden':{spring:[swatch('#efd4d0',.15)],autumn:[swatch('#e4c891',.12)],winter:[swatch('#e7e6dc',.12)]}
};
const registries=new WeakMap();
function supported(mesh){const m=mesh?.material;return !!(mesh?.isMesh&&!mesh.isSkinnedMesh&&m?.isMeshStandardMaterial&&!Array.isArray(m)&&!m.transparent&&!m.userData.dayColor&&!mesh.userData.nightWindow&&!mesh.userData.nightLamp&&!mesh.userData.amusementFade&&!Object.values(m).some(v=>v?.isTexture));}
function descriptor(role,variant,baseRGB){if(!Object.hasOwn(PALETTES,role)||!Number.isInteger(variant)||variant<0||variant>2)throw Error('Unsupported seasonal role');return Object.freeze({role,variant,baseRGB:Object.freeze(baseRGB)});}
export function tagSeasonal(mesh,role,variant=0){if(!supported(mesh)||mesh.isInstancedMesh)throw Error('Seasonal target must be an opaque natural surface');mesh.userData.seasonal=descriptor(role,variant,mesh.material.color.toArray());return mesh;}
export function tagSeasonalInstance(mesh,index,role,variant=0){if(!supported(mesh)||!mesh.isInstancedMesh||!mesh.instanceColor||!Number.isInteger(index)||index<0||index>=mesh.count)throw Error('Invalid seasonal instance');const a=mesh.instanceColor.array,i=index*3;const tag=descriptor(role,variant,[a[i],a[i+1],a[i+2]]);(mesh.userData.seasonalInstances??=[]).push(Object.freeze({...tag,index}));return mesh;}
export function tagAutumnVisibility(group){if(!group?.isGroup)throw Error('Autumn visibility needs an authored group');group.userData.autumnVisibility=true;group.visible=false;return group;}
export function tagWinterVisibility(group){if(!group?.isGroup)throw Error('Winter visibility needs an authored group');group.userData.winterVisibility=true;group.visible=false;return group;}
function colorsFor(tag){const values={summer:tag.baseRGB};for(const season of ['spring','autumn','winter']){const options=PALETTES[tag.role][season],sw=options?.[tag.variant%options.length];values[season]=sw?tag.baseRGB.map((v,i)=>v+(sw.rgb[i]-v)*sw.amount):tag.baseRGB;}return values;}
function register(root){
 const consumers=new Map(),materials=[],instances=[],autumnVisibility=[],winterVisibility=[];
 root.traverse(mesh=>{if(mesh.userData.autumnVisibility===true)autumnVisibility.push(mesh);if(mesh.userData.winterVisibility===true)winterVisibility.push(mesh);for(const material of [].concat(mesh.material??[])){const list=consumers.get(material)??[];list.push(mesh);consumers.set(material,list);}if(mesh.userData.seasonalInstances){if(!supported(mesh)||!mesh.isInstancedMesh)throw Error('Unsafe seasonal instance pool');const records=mesh.userData.seasonalInstances.map(tag=>({index:tag.index,colors:colorsFor(tag)}));instances.push({mesh,records});}});
 for(const [material,users]of consumers){const groups=new Map();let untagged=false;for(const mesh of users){const tag=mesh.userData.seasonal;if(!tag){untagged=true;continue;}if(!supported(mesh)||mesh.isInstancedMesh)throw Error('Unsafe seasonal target');const key=tag.role+':'+tag.variant;const group=groups.get(key)??{tag,meshes:[]};group.meshes.push(mesh);groups.set(key,group);}
  // Keep the original attached to an untagged group (e.g. mint carriage) or
  // the first role. The scene's normal disposer owns every attached split.
  let originalAvailable=!untagged;for(const group of groups.values()){const owned=originalAvailable?material:material.clone();originalAvailable=false;for(const mesh of group.meshes)mesh.material=owned;materials.push({material:owned,colors:colorsFor(group.tag)});}
 }
 const registry={season:null,materials,instances,autumnVisibility,winterVisibility};registries.set(root,registry);return registry;
}
/** No traversal or allocations after registration, including season cycling. */
export function applySeasonalAppearance(root,season){if(!root||!Object.hasOwn(WORLD_SEASON_LABELS,season))return false;const r=registries.get(root)??register(root);if(r.season===season)return false;
 for(let i=0;i<r.materials.length;i++){const item=r.materials[i],rgb=item.colors[season];item.material.color.setRGB(rgb[0],rgb[1],rgb[2]);}
 for(let i=0;i<r.instances.length;i++){const {mesh,records}=r.instances[i],a=mesh.instanceColor.array;for(let j=0;j<records.length;j++){const item=records[j],rgb=item.colors[season],k=item.index*3;a[k]=rgb[0];a[k+1]=rgb[1];a[k+2]=rgb[2];}mesh.instanceColor.needsUpdate=true;}
 for(let i=0;i<r.autumnVisibility.length;i++)r.autumnVisibility[i].visible=season==='autumn';
 for(let i=0;i<r.winterVisibility.length;i++)r.winterVisibility[i].visible=season==='winter';
 r.season=season;return true;
}
