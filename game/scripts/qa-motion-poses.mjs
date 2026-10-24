import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/motion-poses';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>console.error(e));
 await page.route('**/motion-review',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>@font-face{font-family:Pretendard;src:url('/fonts/PretendardVariable.woff2')}body{margin:0;background:#f6f2e8}canvas{display:block}.label{position:absolute;font:17px Pretendard,sans-serif;color:#34534b}</style><div id="labels"></div><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/","three/examples/jsm/":"/vendor/addons/"}}</script><canvas></canvas><script type="module">
 import * as T from 'three';import {villageDoreumi,loadDoreumiFaces} from '/assets.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';import {createDormiPoser} from '/dormi-poses.js';import {createDoreumiMotionPlayer} from '/doreumi-motion-player.js';
 const scene=new T.Scene();scene.background=new T.Color('#f6f2e8');const camera=new T.OrthographicCamera(-5,5,3.125,-3.125,.1,40);camera.position.set(0,3,14);camera.lookAt(0,1,0);const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1280,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;scene.add(new T.HemisphereLight('#fff7e7','#a8b7a0',2));const light=new T.DirectionalLight('#fff1d6',2.5);light.position.set(-3,8,6);scene.add(light);
 const faces=await loadDoreumiFaces(),catalog=(await(await fetch('/characters/doreumi/motions/index.json')).json()).motions;let objects=[];
 window.draw=async(start,fraction=.45)=>{
  for(const o of objects)scene.remove(o);objects=[];document.querySelector('#labels').innerHTML='';
  for(let i=0;i<8;i++){
   const entry=catalog[start+i],loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),[g,r]=await Promise.all([loader.loadAsync('/characters/doreumi/village.glb'),loader.loadAsync('/dormi.glb')]),model=villageDoreumi(g,r.scene,faces),poser=createDormiPoser(model),motion=createDoreumiMotionPlayer({model,poser});await motion.play(entry);motion.tick(entry.duration*fraction);
   const tile=new T.Group();tile.position.set((i%4-1.5)*2.5,i<4?1.5:-1.6,0);model.rotation.y=-.25;tile.add(model);const floor=new T.Mesh(new T.CircleGeometry(.7,48),new T.MeshBasicMaterial({color:'#e2e3d4',side:T.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;tile.add(floor);scene.add(tile);objects.push(tile);document.querySelector('#labels').insertAdjacentHTML('beforeend','<span class="label" style="left:'+(i%4*320+24)+'px;top:'+((i<4?0:400)+24)+'px">'+entry.label+'</span>');
  }renderer.render(scene,camera);
 };window.ready=true;
 </script>`}));
 await page.goto('http://127.0.0.1:4173/motion-review');await page.waitForFunction(()=>window.ready,null,{timeout:60000});
 for(const start of [0,8])for(const fraction of [.3,.6]){await page.evaluate(([s,f])=>window.draw(s,f),[start,fraction]);await page.screenshot({path:out+'/poses-'+start+'-'+fraction+'.png'});}
}finally{await browser.close();}
