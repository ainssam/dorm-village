import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {ensureHandwriting,handwritingFont} from '../world/font-ready.js';
import {NOTICEBOARD} from './noticeboard-layout.js';
export function drawNoticeboardLabel(ctx,kind='title'){
 ctx.clearRect(0,0,768,192);ctx.fillStyle=kind==='title'?'#fff1cf':'#fff8e6';ctx.fillRect(0,0,768,192);ctx.fillStyle='#4e5946';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=handwritingFont(kind==='title'?148:130);ctx.fillText(kind==='title'?'마을 게시판':'공개 앱 소식',384,100,710);
}
function label(root,kind,width,height,x,y,z){
 const canvas=globalThis.document?.createElement?.('canvas');let texture=null;const text=kind==='title'?'마을 게시판':'공개 앱 소식';
 if(canvas){canvas.width=768;canvas.height=192;const ctx=canvas.getContext?.('2d');if(ctx){texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;let disposed=false;texture.addEventListener('dispose',()=>disposed=true);const draw=()=>{if(disposed)return;drawNoticeboardLabel(ctx,kind);texture.needsUpdate=true;};draw();ensureHandwriting(text).then(draw).catch(()=>{});}}
 const material=new THREE.MeshBasicMaterial({map:texture,color:texture?'#ffffff':kind==='title'?'#fff1cf':'#fff8e6',toneMapped:false});material.name='noticeboard.paint.'+kind;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.name='noticeboard.'+kind+'-label';mesh.position.set(x,y,z);mesh.userData.label=text;root.add(mesh);return mesh;
}
export function buildNoticeboard(root,fixture=NOTICEBOARD){
 const g=new THREE.Group();g.name='village.noticeboard';g.position.set(fixture.transform.x,0,fixture.transform.z);g.rotation.y=fixture.transform.yaw;g.userData={kind:'noticeboard',footprint:{...fixture.transform,...fixture.footprint},interactionId:NOTICEBOARD.interaction.id};root.add(g);
 const {box,cylinder}=createToyKit(g),wood='#b58a60',edge='#916847';
 for(const x of [-1.04,1.04]){box(.17,2.2,.19,wood,x,1.13,0,.03);box(.32,.10,.44,'#a89b79',x,.085,0,.03);cylinder(.035,.035,.04,'#745d43',x,1.88,.19).rotation.x=Math.PI/2;}
 box(2.12,1.23,.15,'#bfa77c',0,1.51,0,.035).name='noticeboard.backing';
 for(const x of [-1.12,1.12])box(.14,1.45,.24,wood,x,1.57,.035,.025);
 box(2.38,.15,.27,edge,0,.88,.07,.025);box(2.38,.13,.27,wood,0,2.21,.07,.025);
 box(2.14,.38,.08,'#fff1cf',0,2.08,.175,.025).name='noticeboard.header';label(g,'title',2.03,.33,0,2.08,.219);
 const papers=new THREE.Group();papers.name='noticeboard.papers';g.add(papers);const paperKit=createToyKit(papers);
 const left=paperKit.box(.89,.65,.018,'#fff8e6',-.49,1.44,.11,.02);left.rotation.z=-.045;const right=paperKit.box(.82,.62,.018,'#e5ead4',.50,1.43,.112,.02);right.rotation.z=.035;
 label(g,'status',1.58,.395,0,1.44,.133);
 for(const x of [-.64,.62])cylinder(.032,.032,.035,'#9d7256',x,1.72,.15).rotation.x=Math.PI/2;
 // A modest two-slope wooden canopy, without enclosing the footpath.
 const roofL=box(1.33,.10,.67,wood,-.61,2.39,0,.025);roofL.rotation.z=.12;const roofR=box(1.33,.10,.67,wood,.61,2.39,0,.025);roofR.rotation.z=-.12;
 box(2.50,.07,.10,edge,0,2.31,.31,.015);
 return g;
}
