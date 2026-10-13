import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {BODY_CATALOG,TELESCOPE_BODY_IDS} from './catalog.js';

const MAP_LABELS=Object.freeze({
 'image-mosaic':'관측 영상 모자이크',
 'false-color':'위색 지도',
 radar:'레이더 지도',
 atmosphere:'대기 구름 지도',
 illustrative:'설명용 3D 모형 · 검증된 관측 지도 없음'
});
const DEFAULT_COLOR=0x9ba7b0;

export function inspectorBufferSize(width,height,dpr){
 const w=Number.isFinite(width)&&width>0?width:1,h=Number.isFinite(height)&&height>0?height:1;
 const requested=Number.isFinite(dpr)&&dpr>0?dpr:1;
 let ratio=Math.min(1.25,requested);
 ratio=Math.min(ratio,Math.sqrt(1_200_000/(w*h)));
 ratio=Math.max(Math.min(ratio,1.25),Math.min(1/Math.max(w,h),1.25));
 let pixelWidth=Math.max(1,Math.floor(w*ratio)),pixelHeight=Math.max(1,Math.floor(h*ratio));
 if(pixelWidth*pixelHeight>1_200_000){const scale=Math.sqrt(1_200_000/(pixelWidth*pixelHeight));pixelWidth=Math.max(1,Math.floor(pixelWidth*scale));pixelHeight=Math.max(1,Math.floor(pixelHeight*scale));}
 return Object.freeze({pixelWidth,pixelHeight,dpr:Math.min(1.25,pixelWidth/w,pixelHeight/h)});
}

function makeElement(doc,tag,text,attrs={}){
 const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;
 for(const [key,value] of Object.entries(attrs)){if(key==='dataset')Object.assign(element.dataset,value);else if(key==='className')element.className=value;else if(key==='hidden')element.hidden=!!value;else element.setAttribute(key,String(value));}
 return element;
}
function makeButton(doc,parent,action,label,handler){
 const button=makeElement(doc,'button',label,{type:'button',dataset:{action}});button.addEventListener('click',handler);parent.append(button);return button;
}
function addText(doc,parent,label,value){
 const p=makeElement(doc,'p');p.append(makeElement(doc,'strong',label),doc.createTextNode?doc.createTextNode(' '):makeElement(doc,'span',' '),makeElement(doc,'span',value));parent.append(p);return p;
}
function addLink(doc,parent,label,url){
 const a=makeElement(doc,'a',label,{href:url,target:'_blank',rel:'noopener noreferrer'});parent.append(a);return a;
}
function messageElement(doc,parent,text){const p=makeElement(doc,'p',text);parent.append(p);return p;}

/** Build a tiny, explicitly illustrative atmospheric tone texture (32 KiB). */
function createIllustrativeTexture(THREEImpl,recipe){
 if(!recipe||typeof THREEImpl.DataTexture!=='function')return null;
 const width=128,height=64,data=new Uint8Array(width*height*4),tau=Math.PI*2;
 for(let y=0;y<height;y++){
  const latitude=(.5-y/(height-1))*Math.PI;
  for(let x=0;x<width;x++){
   const longitude=x/width*tau;
   const warp=recipe.warp*Math.sin(longitude*2+latitude*3+recipe.seed);
   const bands=Math.sin(latitude*recipe.bands*2+warp);
   const cloud=.25*Math.sin(longitude*3+latitude*5+recipe.seed*2)+.12*Math.sin(longitude*7-latitude*2);
   const brightness=Math.max(.7,Math.min(1.08,.91+recipe.strength*(.72*bands+.28*cloud)));
   const value=Math.round(Math.min(1,brightness)*255),i=(y*width+x)*4;
   data[i]=value;data[i+1]=value;data[i+2]=value;data[i+3]=255;
  }
 }
 const texture=new THREEImpl.DataTexture(data,width,height,THREEImpl.RGBAFormat);
 texture.colorSpace=THREEImpl.SRGBColorSpace;texture.minFilter=THREEImpl.LinearFilter;texture.magFilter=THREEImpl.LinearFilter;
 texture.generateMipmaps=false;texture.needsUpdate=true;texture.flipY=false;
 return texture;
}

/** A single body, one local optional map, and no continuous render loop. */
export function mountBodyInspector(host,{bodyId,onReturn}={},runtime={}){
 const doc=host?.ownerDocument??globalThis.document;
 if(!host||!doc)throw new TypeError('An inspector host is required');
 const THREEImpl=runtime.THREE??THREE,ControlsImpl=runtime.OrbitControls??OrbitControls;
 const fetchImpl=runtime.fetchImpl??globalThis.fetch?.bind(globalThis);
 const createBitmap=runtime.createImageBitmapImpl??globalThis.createImageBitmap?.bind(globalThis);
 const ResizeObserverImpl=runtime.ResizeObserverImpl??globalThis.ResizeObserver;
 const body=TELESCOPE_BODY_IDS.includes(bodyId)?BODY_CATALOG[bodyId]:null;
 let disposed=false,renderer=null,controls=null,controlsChangeCleanup=null,resizeObserver=null,activeController=null,mapTexture=null,mapBitmap=null,canvas=null,material=null,bodyMesh=null,scene=null,camera=null;
 const listeners=[];const owned=[];let geometry=null,lastBuffer=null;const ringGeometries=[],ringMaterials=[];
 const listen=(target,type,fn,options)=>{target?.addEventListener?.(type,fn,options);listeners.push(()=>target?.removeEventListener?.(type,fn,options));};
 const removeAll=()=>{for(const remove of listeners.splice(0)){try{remove();}catch{}}};
 host.replaceChildren?.();
 const shell=makeElement(doc,'section',undefined,{className:'solar-inspector',dataset:{inspectorShell:'true'}});
 const header=makeElement(doc,'header',undefined,{className:'solar-inspector-heading'});
 const headingCopy=makeElement(doc,'div');headingCopy.append(makeElement(doc,'p','작은 천체 탐험',{className:'solar-inspector-eyebrow'}));
 const title=makeElement(doc,'h2',body?.label??'천체 탐험');headingCopy.append(title);header.append(headingCopy);
 makeButton(doc,header,'return','하늘 관측으로 돌아가기',()=>onReturn?.());
 shell.append(header);
 const status=makeElement(doc,'p',body?'3D 모형을 준비하고 있어요.':'지원하지 않는 천체예요. 하늘 관측으로 돌아가 주세요.',{className:'solar-inspector-status',role:'status',dataset:{role:'status'},'aria-live':'polite'});shell.append(status);
 const mapKind=makeElement(doc,'p',body?MAP_LABELS[body.source.kind]:'지원하지 않는 대상',{className:'solar-inspector-kind',dataset:{role:'map-kind'}});shell.append(mapKind);
 const stage=makeElement(doc,'div',undefined,{className:'solar-inspector-stage'});
 canvas=makeElement(doc,'canvas',undefined,{tabindex:'0','aria-label':`${body?.label??'선택한 천체'} 3D 모형. 드래그하거나 방향키로 돌리고, 확대 버튼으로 살펴봐요.`});stage.append(canvas);
 const actions=makeElement(doc,'div',undefined,{className:'solar-inspector-actions','role':'group','aria-label':'3D 천체 조작'});
 const instructions=makeElement(doc,'p','드래그 또는 터치로 돌리기 · +/− 버튼이나 휠·핀치로 확대 · 방향키로 회전 · Home 키로 처음 시점',{className:'solar-inspector-help'});
 shell.append(stage,actions,instructions);
 const source=makeElement(doc,'details',undefined,{className:'solar-inspector-source'});
 source.append(makeElement(doc,'summary','자료 정보와 한계'));
 const sourceBody=makeElement(doc,'div');source.append(sourceBody);shell.append(source);
 const facts=makeElement(doc,'section',undefined,{className:'solar-inspector-facts','aria-label':'여기서 살펴볼 점'});
 facts.append(makeElement(doc,'h3','여기서 살펴볼 점'));shell.append(facts);
 host.append(shell);
 let retryButton=null;
 function setStatus(text){if(!disposed)status.textContent=text;}
 function showRetry(){
  if(!retryButton){retryButton=makeButton(doc,actions,'retry','다시 시도',()=>start());}
  retryButton.hidden=false;
 }
 function hideRetry(){if(retryButton)retryButton.hidden=true;}
 if(body){
  const instruction=body.category==='illustrative'?'설명용 모형 · 이 구체에는 검증된 관측 지도 텍스처가 없어요.':'지도 자료를 입힌 과학 자료 뷰어';
  messageElement(doc,sourceBody,`자료 종류: ${MAP_LABELS[body.source.kind]}`);
  if(body.source.observedAt)addText(doc,sourceBody,'관측 시기:',body.source.observedAt);
  if(body.source.filter)addText(doc,sourceBody,'파장·색상 처리:',body.source.filter);
  addText(doc,sourceBody,'자료 범위:',body.source.coverage);
  addText(doc,sourceBody,'자료의 한계:',body.source.limitations);
  if(body.source.assetFile)addText(doc,sourceBody,'첫 지도 파일:',`${body.source.assetFile} · ${body.source.assetBytes.toLocaleString('en-US')} bytes`);
  addText(doc,sourceBody,'표시 기준:',instruction);
  addText(doc,sourceBody,'크레딧:',body.source.credit);
  addLink(doc,sourceBody,'원 자료 출처',body.source.url);
  if(body.source.relatedSourceUrl)addLink(doc,sourceBody,'ESA/Hubble 자료 기록',body.source.relatedSourceUrl);
  if(body.source.licenseText){messageElement(doc,sourceBody,body.source.licenseText);if(body.source.licenseUrl)addLink(doc,sourceBody,'CC BY 4.0 사용 조건',body.source.licenseUrl);}
  for(const item of body.highlights){const p=makeElement(doc,'p');p.append(doc.createTextNode?doc.createTextNode(`${item.text} `):makeElement(doc,'span',item.text+' '));addLink(doc,p,'근거',item.url);facts.append(p);}
  if(body.id==='Saturn')messageElement(doc,sourceBody,'토성 고리는 얼음·먼지 입자 띠를 단순화한 3D 기하예요. 크기와 두께는 축척과 다릅니다.');
  if(body.category==='observed-map')messageElement(doc,sourceBody,'이 지도 기반 모형의 자세와 조명은 선택한 순간의 실제 자세·위상을 재현하지 않아요.');
  else messageElement(doc,sourceBody,'이 설명용 구체의 색·자세·조명은 선택한 순간의 실제 모습이나 표면 지도 데이터가 아니에요.');
 }
 makeButton(doc,actions,'reset','처음 시점',()=>{if(controls?.reset)controls.reset();else resetCamera();});
 makeButton(doc,actions,'zoom-in','확대',()=>zoom(1));
 makeButton(doc,actions,'zoom-out','축소',()=>zoom(-1));

 let initialCamera=null,contextLost=false;
 function render(){if(disposed||contextLost||doc.hidden||!renderer||!scene||!camera)return false;try{renderer.render(scene,camera);return true;}catch{setStatus('3D 화면을 그리지 못했어요. 다시 시도하거나 하늘 관측으로 돌아가 주세요.');showRetry();return false;}}
 function resize(){
  if(disposed||!renderer||!canvas)return;
  const rect=canvas.parentElement?.getBoundingClientRect?.()??canvas.getBoundingClientRect?.()??{width:390,height:520};
  const size=inspectorBufferSize(rect.width,rect.height,runtime.devicePixelRatio??globalThis.devicePixelRatio??1);
  lastBuffer=size;renderer.setPixelRatio(1);renderer.setSize(size.pixelWidth,size.pixelHeight,false);
  if(camera){camera.aspect=size.pixelWidth/size.pixelHeight;camera.updateProjectionMatrix();}
  return render();
 }
 function zoom(direction){
  if(!controls)return;
  if(direction>0)controls.dollyIn?.(1.25);else controls.dollyOut?.(1.25);
  controls.update?.();render();
 }
 function resetCamera(){if(!camera||!initialCamera)return;camera.position.set(...initialCamera);controls?.target?.set?.(0,0,0);controls?.update?.();render();}
 function releaseMap(){
  if(material?.map&&material.map===mapTexture){material.map=null;material.needsUpdate=true;}
  try{mapTexture?.dispose?.();}catch{}
  try{mapBitmap?.close?.();}catch{}
  mapTexture=null;mapBitmap=null;
 }
 function keyboard(event){
  if(disposed||!controls||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-','_'].includes(event.key))return;
  event.preventDefault?.();
  if(event.key==='Home')resetCamera();
  else if(event.key==='+'||event.key==='=')zoom(1);else if(event.key==='-'||event.key==='_')zoom(-1);
  else{controls.rotateLeft?.((event.key==='ArrowLeft'?1:-1)*Math.PI/24);controls.rotateUp?.((event.key==='ArrowUp'?-1:1)*Math.PI/24);controls.update?.();render();}
 }
 function lost(event){event.preventDefault?.();contextLost=true;setStatus('3D 렌더링 연결이 끊겼어요. 다시 시도하거나 하늘 관측으로 돌아가 주세요.');showRetry();}
 function restored(){contextLost=false;if(render()){hideRetry();setStatus('3D 화면을 복구했어요. 선택한 순간의 실제 자세·조명은 아니에요.');}}
 listen(canvas,'keydown',keyboard);
 listen(canvas,'webglcontextlost',lost,false);
 listen(canvas,'webglcontextrestored',restored,false);
 listen(doc,'visibilitychange',()=>{if(!doc.hidden)render();});
 if(ResizeObserverImpl){try{resizeObserver=new ResizeObserverImpl(resize);resizeObserver.observe(stage);owned.push(()=>resizeObserver?.disconnect());}catch{resizeObserver=null;}}

 async function loadMap(signal){
  if(!body.render.colorMap)return false;
  if(typeof fetchImpl!=='function'||typeof createBitmap!=='function')throw new Error('이 브라우저에서 지도 자료를 안전하게 불러올 수 없어요.');
  const assetUrl=new URL(body.render.colorMap,import.meta.url);
  const response=await fetchImpl(assetUrl,{signal,credentials:'same-origin'});
  if(!response?.ok)throw new Error(`지도 응답 ${response?.status??'실패'}`);
  const bitmap=await createBitmap(await response.blob(),{imageOrientation:'flipY'});
  if(disposed||signal.aborted){bitmap.close?.();return false;}
  let texture;
  try{
   texture=new THREEImpl.Texture(bitmap);texture.colorSpace=THREEImpl.SRGBColorSpace;texture.needsUpdate=true;texture.flipY=false;
  }catch(error){try{texture?.dispose?.();}catch{}try{bitmap.close?.();}catch{}throw error;}
  if(disposed||signal.aborted){try{texture.dispose?.();}catch{}try{bitmap.close?.();}catch{}return false;}
  releaseMap();mapTexture=texture;mapBitmap=bitmap;
  if(material){material.map=texture;material.needsUpdate=true;}
  return true;
 }
 async function start(){
  if(disposed||!body)return;
  if(contextLost){setStatus('3D 렌더링 연결이 아직 복구되지 않았어요. 복구된 뒤 다시 시도해 주세요.');showRetry();return;}
  hideRetry();activeController?.abort();activeController=new AbortController();const signal=activeController.signal;
  releaseMap();
  let phase='renderer';
  try{
   if(!renderer){
    renderer=runtime.createRenderer?runtime.createRenderer(canvas):new THREEImpl.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
    renderer.setClearColor?.(0x07121d,1);renderer.outputColorSpace=THREEImpl.SRGBColorSpace;renderer.setPixelRatio?.(1);
    controls=new ControlsImpl(camera,canvas);controls.autoRotate=false;controls.enableDamping=false;controls.minDistance=3.1/body.maxZoom;controls.maxDistance=7;controls.target?.set?.(0,0,0);
    const orbitChange=()=>render();controls.addEventListener?.('change',orbitChange);const activeControls=controls;controlsChangeCleanup=()=>activeControls.removeEventListener?.('change',orbitChange);listeners.push(()=>controlsChangeCleanup?.());
    controls.update?.();
   }
   if(!resize())return;
   if(body.render.colorMap){phase='map';setStatus('선택한 로컬 지도 자료를 불러오는 중이에요.');const loaded=await loadMap(signal);if(disposed||signal.aborted)return;if(loaded&&render())setStatus('지도 자료를 불러왔어요.');}
   else if(render())setStatus(body.category==='illustrative'?'설명용 3D 모형을 열었어요. 검증된 관측 지도는 표시하지 않아요.':'3D 모형을 준비했어요.');
  }catch(error){
   if(disposed||signal.aborted)return;
   controlsChangeCleanup?.();controlsChangeCleanup=null;if(renderer){try{controls?.dispose?.();}catch{}controls=null;try{renderer.dispose?.();}catch{}renderer=null;}
   const mapFailed=phase==='map';
   setStatus(mapFailed?'지도 자료를 불러오지 못했어요. 단색 구체만 보여요. 실제 지도를 불러온 것처럼 표시하지 않습니다. 다시 시도하거나 하늘 관측으로 돌아가 주세요.':'3D 화면을 시작할 수 없어요. 이 장치의 WebGL 지원을 확인하거나 하늘 관측으로 돌아가 주세요.');
   showRetry();
  }
 }

 if(body){
  try{
   scene=new THREEImpl.Scene();scene.background=new THREEImpl.Color(0x07121d);
   camera=new THREEImpl.PerspectiveCamera(40,390/520,.1,100);initialCamera=body.id==='Saturn'?[0,4.5,5.2]:[0,0,3.35];camera.position.set(...initialCamera);
   scene.add(new THREEImpl.AmbientLight(0xffffff,.48));const light=new THREEImpl.DirectionalLight(0xfff4df,1.25);light.position.set(4,3,5);scene.add(light);
   geometry=new THREEImpl.SphereGeometry(1,64,40);material=new THREEImpl.MeshStandardMaterial({color:body.render.colorMap?0xffffff:(body.render.displayColor??DEFAULT_COLOR),roughness:.82,metalness:0});
   bodyMesh=new THREEImpl.Mesh(geometry,material);scene.add(bodyMesh);
   const illustrativeTexture=createIllustrativeTexture(THREEImpl,body.render.displayPattern);
   if(illustrativeTexture){material.map=illustrativeTexture;material.needsUpdate=true;owned.push(()=>illustrativeTexture.dispose());}
   for(const band of body.render.ringBands??[]){
    const bandGeometry=new THREEImpl.RingGeometry(band.inner,band.outer,96);
    const bandMaterial=new THREEImpl.MeshBasicMaterial({color:band.color,side:THREEImpl.DoubleSide,transparent:true,opacity:band.opacity,depthWrite:false});
    const bandMesh=new THREEImpl.Mesh(bandGeometry,bandMaterial);bandMesh.rotation.x=Math.PI/2;
    ringGeometries.push(bandGeometry);ringMaterials.push(bandMaterial);scene.add(bandMesh);
   }
   if(ResizeObserverImpl){/* observed above; renderer size arrives when mounted */}
   void start();canvas.focus?.();
  }catch(error){setStatus('3D 화면을 시작할 수 없어요. WebGL 지원을 확인하거나 하늘 관측으로 돌아가 주세요.');showRetry();}
 }
 function dispose(){
  if(disposed)return;disposed=true;activeController?.abort();activeController=null;
  try{resizeObserver?.disconnect();}catch{}resizeObserver=null;removeAll();
  controlsChangeCleanup?.();controlsChangeCleanup=null;try{controls?.dispose?.();}catch{}controls=null;
  releaseMap();
  for(const release of owned.splice(0)){try{release();}catch{}}
  try{geometry?.dispose?.();}catch{}for(const resource of ringGeometries.splice(0)){try{resource.dispose?.();}catch{}}for(const resource of ringMaterials.splice(0)){try{resource.dispose?.();}catch{}}try{material?.dispose?.();}catch{}try{renderer?.dispose?.();}catch{}
  renderer=null;scene=null;camera=null;host.replaceChildren?.();
 }
 if(!body){makeButton(doc,actions,'return','하늘 관측으로 돌아가기',()=>onReturn?.());return Object.freeze({dispose,snapshot:()=>({bodyId:null,disposed}),retry:start});}
 return Object.freeze({dispose,snapshot:()=>({bodyId,category:body.category,disposed,contextLost,buffer:lastBuffer,renderers:renderer?1:0}),retry:start});
}
