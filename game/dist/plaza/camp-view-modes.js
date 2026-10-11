import * as THREE from 'three';
import {TENT,CAMP_CHAIRS,tentContains} from './tent-layout.js';
import {PLAZA} from './layout.js';
import {VILLAGE_LAYOUT} from '../world/village-layout.js';
import {withSceneIsolation} from './scene-isolation.js';
import {createOceanView} from './ocean-view.js';

const FRAME_KEYS=['left','right','top','bottom','near','far','zoom'];
const smooth=t=>t*t*(3-2*t);
const read=c=>({position:c.position.clone(),quaternion:c.quaternion.clone(),...Object.fromEntries(FRAME_KEYS.map(k=>[k,c[k]]))});

/**
 * Temporary tent / water-gazing cameras using the existing scene and renderer.
 * The source camera, controls, player, activities and save are never mutated.
 * While active, the host suspends source-camera follow/controls, enables its
 * activity viewport, and uses resizeActivityReturn() before fit() on resize.
 */
export function createCampViewModes({sourceCamera,getReturnViewport=()=>null,getInteriorRoots=()=>[],getPlayer=()=>null,getMood=()=>null,reduced=false,onActiveChange=()=>{}}={}) {
  if(!sourceCamera?.isOrthographicCamera)throw new TypeError('Camp modes require the existing orthographic camera');
  const camera=sourceCamera.clone(),interiorBackground=new THREE.Color('#d9ccb7'),seaSky=new THREE.Color();
  let alive=true,phase='idle',mode=null,modeKey=null,elapsed=0,duration=.8,start=null,destination=null,width=1,height=1,inside=false,paused=false,sceneRef=null,chair=null,suppressedKey=null,lastRequestedKey=null,focusPosition={x:TENT.x,z:TENT.z};
  let seaGaze=null,showHandoff=null;
  const releaseSea=()=>{seaGaze?.dispose();seaGaze=null;};
  const coastZ=()=>Math.max(PLAZA.launch.z,...VILLAGE_LAYOUT.island.shorePolygon.map(p=>p[1]*1.05))+.8;
  const active=()=>phase!=='idle';
  const rootsFor=scene=>(getInteriorRoots()??[]).filter(root=>{if(!root||root===scene)return false;for(let p=root.parent;p;p=p.parent){if(!p.visible)return false;if(p===scene)return true;}return false;});
  function seaHorizon(scene){
    const material=scene.getObjectByName('village.sea')?.material;
    const materials=Array.isArray(material)?material:[material];
    const water=materials.map(m=>m?.uniforms?.waterColor?.value).find(color=>color?.isColor)
      ??materials.map(m=>m?.color).find(color=>color?.isColor)
      ??(scene.background?.isColor?scene.background:null);
    if(!water)return null;
    // A proportional lift and slight desaturation retain the live water's
    // night/day brightness. Never add a fixed pale color to a dark scene.
    const mean=(water.r+water.g+water.b)/3;
    seaSky.setRGB(...['r','g','b'].map(k=>Math.min(1,(water[k]*.88+mean*.12)*1.10)));
    return seaSky;
  }
  function apply(frame,target=camera){target.position.copy(frame.position);target.quaternion.copy(frame.quaternion);for(const key of FRAME_KEYS)target[key]=frame[key];target.updateProjectionMatrix();}
  function sourceFrame(){
    const f=read(sourceCamera),r=getReturnViewport();if(!r||r.width<=0||r.height<=0)return f;
    // Match source pixels even if overview normally occupies only the lower
    // portion of the stage. The clone is always drawn on the full stage.
    const z=f.zoom,cx=(f.left+f.right)/2,cy=(f.top+f.bottom)/2,sx=(f.right-f.left)/z,sy=(f.top-f.bottom)/z;
    const left=cx-sx/2-r.x/r.width*sx,right=cx-sx/2+(width-r.x)/r.width*sx,top=cy+sy/2+r.y/r.height*sy,bottom=cy+sy/2-(height-r.y)/r.height*sy,nx=(left+right)/2,ny=(top+bottom)/2;
    return {...f,left:nx-(right-left)*z/2,right:nx+(right-left)*z/2,top:ny+(top-bottom)*z/2,bottom:ny-(top-bottom)*z/2};
  }
  function destinationFrame({viewMode=mode,viewChair=chair,viewFocus=focusPosition,w=width,h=height}={}){
    const c=sourceCamera.clone(),aspect=w/h;
    let span;
    if(viewMode==='tent'){
      const x=Math.max(TENT.x-.85,Math.min(TENT.x+.85,viewFocus.x)),z=Math.max(TENT.z-.65,Math.min(TENT.z+.65,viewFocus.z));
      c.position.set(x,6.8,z+8.4);c.lookAt(x,.65,z);c.updateMatrixWorld(true);
      span=Math.max(6.2,3.8/aspect);
      Object.assign(c,{near:.1,far:80});
    }else{
      const a=viewChair.anchor,{island}=VILLAGE_LAYOUT;
      // The southwest cove is much deeper than the chair. Derive the shot from
      // the actual expanded coast, including scaled sand and shoreline foam,
      // rather than clipping a point just behind the seat. The avatar stays
      // seated on land; this is its unobstructed gaze past the entire island.
      const coast=Math.max(PLAZA.launch.z,...island.shorePolygon.map(p=>p[1]*1.05))+.8;
      const eyeZ=Math.min(a.z-2,coast-8),waterY=island.waterY,range=220;
      span=Math.max(8.2,7.5/aspect);
      const slope=.62*span/range,cos=1/Math.sqrt(1+slope*slope),sin=slope*cos;
      const eyeY=waterY+(.56*span+(coast-eyeZ)*sin)/cos;
      c.position.set(a.x,eyeY,eyeZ);
      c.lookAt(a.x,eyeY-slope*(coast+30-eyeZ),coast+30);
      const lowestTerrain=Math.min(-.5,waterY-.15);
      const near=(coast-eyeZ)*cos+(eyeY-lowestTerrain)*sin+.25;
      Object.assign(c,{near,far:near+range});
    }
    Object.assign(c,{left:-span*aspect/2,right:span*aspect/2,top:span/2,bottom:-span/2,zoom:1});c.updateProjectionMatrix();return read(c);
  }
  function finish(){releaseSea();phase='idle';mode=modeKey=null;chair=null;start=destination=null;elapsed=0;onActiveChange(false);}
  function begin(next,frame){phase=next;elapsed=0;start=read(camera);destination=frame;const angle=start.quaternion.angleTo(destination.quaternion),distance=start.position.distanceTo(destination.position);duration=Math.min(6.5,Math.max(1,angle*1.5/(65*Math.PI/180),distance*1.5/12));if(reduced){apply(destination);if(next==='exiting')finish();else phase='active';}}
  function enter(next,key,nextChair){
    const wasActive=active();if(!wasActive){camera.copy(sourceCamera);apply(sourceFrame());}
    mode=next;modeKey=key;chair=nextChair;if(next==='beach'){seaGaze??=createOceanView({camera,mood:getMood(),centerX:chair.anchor.x,coastZ:coastZ(),waterY:VILLAGE_LAYOUT.island.waterY});}else releaseSea();begin('entering',destinationFrame());if(!wasActive)onActiveChange(true);
  }
  function exit(){if(!active()||phase==='exiting')return;begin('exiting',sourceFrame());}
  function cancel({suppressReentry=true,preserveHandoff=false}={}){if(!preserveHandoff)showHandoff?.dispose();if(suppressReentry)suppressedKey=lastRequestedKey;else suppressedKey=null;if(active())finish();inside=false;paused=false;}
  const api={
    get camera(){return active()?camera:null;},
    get active(){return active();},
    get mode(){return mode;},
    get blocksMovement(){return mode==='beach'&&phase==='exiting';},
    update({roomId,position,activity=null,activityState=null,paused:nextPaused=false,scene=sceneRef}={}){
      if(!alive)return;
      if(sceneRef&&scene!==sceneRef){cancel({suppressReentry:false});sceneRef=scene;lastRequestedKey=null;return;}
      sceneRef=scene;paused=!!nextPaused;if(Number.isFinite(position?.x)&&Number.isFinite(position?.z))focusPosition={x:position.x,z:position.z};
      if(roomId!=='courtyard'){cancel({suppressReentry:false});lastRequestedKey=null;return;}
      inside=tentContains(position,inside?.16:0);
      const seaChairs=CAMP_CHAIRS.filter(c=>c.seaView===true);
      const nextChair=(seaChairs.length?seaChairs:[CAMP_CHAIRS.at(-1)]).find(c=>c?.id===activity?.id);
      const requested=nextChair?(activityState==='active'?'beach':null):inside?'tent':null;
      const key=requested==='beach'?activity.id:requested;
      lastRequestedKey=key;
      if(suppressedKey!==null&&key!==suppressedKey)suppressedKey=null;
      if(key===suppressedKey&&key!==null){exit();return;}
      if(!requested){exit();return;}
      if(requested==='tent'&&!rootsFor(scene).length){cancel({suppressReentry:false});return;}
      if(paused)return;
      if(modeKey!==key||phase==='idle'||phase==='exiting')enter(requested,key,nextChair);
    },
    fit(w,h){
      if(!alive||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return;
      if(width===w&&height===h)return;width=w;height=h;
      if(active())begin(phase==='exiting'?'exiting':'entering',phase==='exiting'?sourceFrame():destinationFrame());
    },
    tick(dt){
      if(!alive||paused||!active()||!Number.isFinite(dt)||dt<=0)return;
      if(mode==='beach')seaGaze?.update(dt,{reduced,paused,camera});
      if(phase==='active'){if(mode==='tent'){const blend=1-Math.exp(-Math.min(.1,dt)*2.3),x=Math.max(TENT.x-.85,Math.min(TENT.x+.85,focusPosition.x)),z=Math.max(TENT.z-.65,Math.min(TENT.z+.65,focusPosition.z))+8.4;camera.position.x+=(x-camera.position.x)*blend;camera.position.z+=(z-camera.position.z)*blend;}return;}
      elapsed+=Math.min(.1,dt);const t=smooth(Math.min(1,elapsed/duration));
      camera.position.lerpVectors(start.position,destination.position,t);camera.quaternion.slerpQuaternions(start.quaternion,destination.quaternion,t);
      for(const key of FRAME_KEYS)camera[key]=start[key]+(destination[key]-start[key])*t;camera.updateProjectionMatrix();
      if(t===1){if(phase==='exiting')finish();else phase='active';}
    },
    render(scene,draw){
      if(!alive||!active())return draw(sourceCamera);
      if(scene!==sceneRef){cancel({suppressReentry:false});return draw(sourceCamera);}
      if(phase==='exiting'&&mode!=='beach')return draw(camera);
      if(mode==='beach'){
        // Preserve the sky owner's texture and lighting. Only this synchronous
        // draw gets a gentle horizon tint derived from the current actual sea.
        const tint=seaHorizon(scene),oldBackground=scene.background;
        seaGaze?.update(0,{reduced,paused,camera,mood:getMood(),waterColor:tint??undefined});
        if(seaGaze)scene.add(seaGaze.root);if(tint)scene.background=tint;
        try{return draw(camera);}finally{if(tint&&scene.background===tint)scene.background=oldBackground;if(seaGaze?.root.parent===scene)scene.remove(seaGaze.root);}
      }
      const roots=rootsFor(scene);
      if(!roots.length){cancel({suppressReentry:false});return draw(sourceCamera);}
      return withSceneIsolation(scene,{keep:[getPlayer()],show:roots,background:interiorBackground},()=>draw(camera));
    },
    captureForShow(activityId){
      if(!alive||!active()||phase==='exiting'||!activityId)return null;
      showHandoff?.dispose();const saved={viewMode:mode,viewChair:chair,viewFocus:{...focusPosition},key:modeKey,scene:sceneRef},entryCamera=camera.clone(),returnCamera=camera.clone();let pool=seaGaze,owned=true;seaGaze=null;
      const lease={activityId,keepDuringShow:saved.viewMode==='beach',forceCovered:saved.viewMode==='tent',camera:entryCamera,getReturnCamera(w=width,h=height){if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return returnCamera;width=w;height=h;apply(destinationFrame({...saved,w,h}),returnCamera);return returnCamera;},getReturnViewport:()=>({x:0,y:0,width,height}),
        render(scene,renderCamera,draw){if(!owned||scene!==saved.scene)return draw(renderCamera);if(saved.viewMode==='beach'){const old=scene.background,tint=seaHorizon(scene);pool?.update(0,{reduced,camera:renderCamera,mood:getMood(),waterColor:tint??undefined});if(pool)scene.add(pool.root);if(tint)scene.background=tint;try{return draw(renderCamera);}finally{if(tint&&scene.background===tint)scene.background=old;if(pool?.root.parent===scene)scene.remove(pool.root);}}
          const roots=rootsFor(scene);if(!roots.length)return draw(renderCamera);return withSceneIsolation(scene,{keep:[getPlayer(),scene.getObjectByName('plaza.grand-fireworks-pool'),scene.getObjectByName('plaza.show-sky-veil')],show:roots,background:interiorBackground},()=>draw(renderCamera));},
        resumeFrom(frame){if(!owned||!alive||sceneRef!==saved.scene||lastRequestedKey!==saved.key)return false;showHandoff=null;owned=false;seaGaze=pool;pool=null;suppressedKey=null;mode=saved.viewMode;modeKey=saved.key;chair=saved.viewChair;focusPosition=saved.viewFocus;apply(read(frame));begin('entering',destinationFrame());onActiveChange(true);return true;},
        abort(){if(owned&&active()&&modeKey===saved.key){seaGaze=pool;pool=null;}lease.dispose();},
        dispose(){if(!owned)return;owned=false;pool?.dispose();pool=null;if(showHandoff===lease)showHandoff=null;}
      };showHandoff=lease;return lease;
    },
    resumeFrom(frame){return showHandoff?.resumeFrom(frame)??false;},
    cancel,
    snapshot:()=>({seaCue:seaGaze?.snapshot()??null,active:active(),mode,phase,duration,inside,paused,activityId:mode==='beach'?modeKey:null,isolated:mode==='tent'&&phase!=='exiting',width,height}),
    dispose(){if(!alive)return;cancel({suppressReentry:false});alive=false;sceneRef=null;}
  };
  return api;
}
