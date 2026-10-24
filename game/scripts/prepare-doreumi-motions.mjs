import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Texture,AnimationClip} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const upstream=process.argv[2];
if(!upstream)throw Error('Usage: node scripts/prepare-doreumi-motions.mjs <doreumi-desktop-pet checkout>');
const base=resolve(upstream,'web/public/doreumi'),out='dist/characters/doreumi/motions';
const selected=[
 ['Wave','손 흔들기','인사와 마음','안녕! 반갑게 손을 흔들어요'],
 ['Bow','꾸벅 인사','인사와 마음','마음을 담아 고개를 숙여요'],
 ['meshy:27','큰 하트','인사와 마음','두 팔로 커다란 하트를 만들어요'],
 ['Cheer','힘차게 응원','인사와 마음','도름이가 두 팔로 응원해요'],
 ['meshy:67','버블 댄스','춤추기','통통 튀는 리듬에 몸을 맡겨요'],
 ['meshy:591','힙합 댄스','춤추기','어깨와 발을 리듬에 맞춰 움직여요'],
 ['meshy:23','코믹 댄스','춤추기','장난스러운 춤으로 웃음을 전해요'],
 ['meshy:596','YMCA 춤','춤추기','팔을 쭉 뻗어 모양을 만들어요'],
 ['Jump','제자리 점프','신나게 움직이기','무릎을 굽혔다가 폴짝 뛰어요'],
 ['Joy','기뻐하기','신나게 움직이기','기쁜 마음을 온몸으로 표현해요'],
 ['meshy:326','팔 벌려 뛰기','신나게 움직이기','팔과 다리를 함께 벌려 뛰어요'],
 ['Showcase','짜잔 소개','신나게 움직이기','여기를 봐요! 자신 있게 소개해요'],
 ['Stretch','기지개','느긋한 순간','두 팔을 쭉 뻗고 몸을 풀어요'],
 ['HeadTilt','갸우뚱','느긋한 순간','궁금한 마음에 고개를 기울여요'],
 ['Think','생각하기','느긋한 순간','잠깐 멈춰 좋은 생각을 떠올려요'],
 ['NewYearBow','큰절 인사','느긋한 순간','천천히 앉아 정성껏 인사해요']
];
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'motion-export-texture',loadTexture:()=>Promise.resolve(new Texture({width:1,height:1}))}));
const bytes=await readFile(resolve(base,'doreumi-master.glb'));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
const registry=JSON.parse(await readFile(resolve(base,'motions/registry.json'),'utf8'));
await mkdir(out,{recursive:true});
const motions=[];
for(const [id,label,category,description] of selected){
 const imported=id.startsWith('meshy:'),entry=registry.motions.find(x=>x.id===id);
 if(imported&&(!entry||entry.review!=='passed'||entry.props?.length||entry.travel))throw Error('Motion requires unsupported props or travel: '+id);
 const sourceAsset=imported?'motions/meshy-'+id.split(':')[1]+'.json':'doreumi-master.glb#'+id;
 const clip=imported?JSON.parse(await readFile(resolve(base,sourceAsset),'utf8')):AnimationClip.toJSON(gltf.animations.find(x=>x.name===id).clone().optimize());
 delete clip.uuid;
 const file=id.replace(':','-')+'.json',data=JSON.stringify(clip)+'\n';
 await writeFile(out+'/'+file,data);
 motions.push({id,label,category,description,duration:clip.duration,url:'./characters/doreumi/motions/'+file,sourceAsset,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(out+'/index.json',JSON.stringify({version:1,source:'https://github.com/ainssam/doreumi-desktop-pet',commit:'4433dba715893d75de60948b1968d21f5c79efcb',attribution:'도름이 © 아인T · CC BY-NC 4.0',motions},null,2)+'\n');
console.log('Exported',motions.length,'original Doreumi motions');
