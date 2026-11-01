// Render the actual village character as the visual reference for brand art.
// Run with the local game server on port 4173. No production assets are changed;
// promotional illustration and icon are generated separately with image_gen.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out=process.env.BRAND_OUT||'qa/brand-assets-2026-11-01';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:768,height:768},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error(e));
 await page.route('**/brand-reference',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff6e8}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/","three/examples/jsm/":"/vendor/addons/"}}</script><canvas></canvas><script type="module">
 import * as T from 'three';import {villageDoreumi,loadDoreumiFaces} from '/assets.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';import {createDormiPoser} from '/dormi-poses.js';import {createDoreumiMotionPlayer} from '/doreumi-motion-player.js';
 const scene=new T.Scene();scene.background=new T.Color('#fff6e8');const camera=new T.OrthographicCamera(-1.2,1.2,1.2,-1.2,.1,40);camera.position.set(0,1.5,10);camera.lookAt(0,1.05,0);const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(768,768);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;scene.add(new T.HemisphereLight('#fff7ed','#bac9ba',2));const light=new T.DirectionalLight('#fff6e9',2.5);light.position.set(-3,8,6);scene.add(light);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),[g,r,faces]=await Promise.all([loader.loadAsync('/characters/doreumi/village.glb'),loader.loadAsync('/dormi.glb'),loadDoreumiFaces()]);
 const model=villageDoreumi(g,r.scene,faces),poser=createDormiPoser(model),motion=createDoreumiMotionPlayer({model,poser});scene.add(model);model.rotation.y=-.12;
 const catalog=(await(await fetch('/characters/doreumi/motions/index.json')).json()).motions;await motion.play(catalog.find(m=>m.id==='Wave'));motion.tick(.8);
 window.draw=({close=false}={})=>{if(close){motion.cancel();model.rotation.y=0;camera.left=-.75;camera.right=.75;camera.top=.75;camera.bottom=-.75;camera.position.set(0,1.1,10);camera.lookAt(0,1.0,0);camera.updateProjectionMatrix();scene.background=new T.Color('#dcebdd');}scene.updateMatrixWorld(true);renderer.render(scene,camera);};window.draw();window.ready=true;
 </script>`}));
 await page.goto('http://127.0.0.1:4173/brand-reference');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 await page.screenshot({path:out+'/doreumi-reference.png'});
 await page.evaluate(()=>window.draw({close:true}));
 await page.screenshot({path:out+'/doreumi-icon-reference.png'});
}finally{await browser.close();}
