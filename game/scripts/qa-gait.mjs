import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/gait';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'no-preference'});
 page.on('pageerror',e=>console.error(e));
 await page.route('**/gait-review',route=>route.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><style>body{margin:0;background:#f6f2e8}canvas{display:block}p{position:absolute;left:24px;font:18px sans-serif;color:#34534b}</style><p>Walk · four phases</p><p style="top:400px">Run · four phases</p><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/","three/examples/jsm/":"/vendor/addons/"}}</script><canvas></canvas><script type="module">
 import * as T from 'three';import {villageDoreumi,loadDoreumiFaces} from '/assets.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';import {createDormiPoser} from '/dormi-poses.js';
 const scene=new T.Scene();scene.background=new T.Color('#f6f2e8');const camera=new T.OrthographicCamera(-4.8,4.8,3,-3,.1,40);camera.position.set(0,4,12);camera.lookAt(0,1.1,0);const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1280,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;scene.add(new T.HemisphereLight('#fff7e7','#a8b7a0',2));const light=new T.DirectionalLight('#fff1d6',2.5);light.position.set(-3,8,6);scene.add(light);
 const faces=await loadDoreumiFaces();
 for(let i=0;i<8;i++){const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),[g,r]=await Promise.all([loader.loadAsync('/characters/doreumi/village.glb'),loader.loadAsync('/dormi.glb')]),model=villageDoreumi(g,r.scene,faces),poser=createDormiPoser(model);poser.setPose('run',i<4?.25:.4,(i%4)*Math.PI/16);model.rotation.y=-.65;model.position.set((i%4-1.5)*2.3,i<4?1.7:-1.1,0);scene.add(model);}
 renderer.render(scene,camera);window.done=true;
 </script>`}));
 await page.goto('http://127.0.0.1:4173/gait-review');await page.waitForFunction(()=>window.done,null,{timeout:60000});await page.screenshot({path:out+'/stride.png'});
}finally{await browser.close();}
