import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Box3,Group,Vector3,ShaderChunk,LinearFilter,TextureLoader,SRGBColorSpace} from 'three';
let modelPromise;
const rigs=new WeakMap();
export const doreumiRigFor=model=>rigs.get(model);

/** Preserve the artist's connected skin and joints. The original village mesh
 * is a CPU-only pose reference for existing prop and seat contracts, never an
 * additional rendered character. The source asset and old saves stay intact.
 */
export function villageDoreumi(gltf,reference,faces=null){
 const source=gltf.scene;source.updateMatrixWorld(true);
 const bounds=new Box3(),point=new Vector3();let count=0;
 source.traverse(object=>{
  if(!object.isMesh)return;
  if(object.morphTargetInfluences?.length)object.morphTargetInfluences[0]=1;
  object.skeleton?.update();
  for(let i=0;i<object.geometry.attributes.position.count;i++){object.getVertexPosition(i,point).applyMatrix4(object.matrixWorld);bounds.expandByPoint(point);}
  for(const mat of Array.isArray(object.material)?object.material:[object.material]){
   if(!mat.map?.image)throw Error('Doreumi texture unavailable');
   mat.map.generateMipmaps=false;mat.map.minFilter=LinearFilter;mat.map.needsUpdate=true;mat.roughness=.9;
   mat.onBeforeCompile=shader=>{for(const [field,chunk] of [['vertexShader','uv_pars_vertex'],['fragmentShader','uv_pars_fragment']])shader[field]=shader[field].replace('#include <'+chunk+'>',ShaderChunk[chunk].replace('varying vec2 vMapUv;','centroid varying vec2 vMapUv;'));};
   if(faces){
    const atlas=mat.onBeforeCompile,uniforms={faceSkin:{value:faces[0]},faceInk:{value:faces[1]},faceBlink:{value:faces[2]},blink:{value:0}};
    mat.onBeforeCompile=shader=>{atlas(shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vDoreumiFace;varying vec3 vDoreumiRest;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <morphtarget_vertex>','#include <morphtarget_vertex>\nvDoreumiFace=transformed;vDoreumiRest=position;');shader.fragmentShader='varying vec3 vDoreumiFace;varying vec3 vDoreumiRest;uniform sampler2D faceSkin;uniform sampler2D faceInk;uniform sampler2D faceBlink;uniform float blink;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     vec2 fp=vec2((vDoreumiFace.x+.4)/.8,(.64-vDoreumiFace.y)/.76);
     float gate=step(.22,vDoreumiFace.z)*step(0.,fp.x)*step(fp.x,1.)*step(0.,fp.y)*step(fp.y,1.);
     vec2 restFp=vec2((vDoreumiRest.x+.4)/.8,(.64-vDoreumiRest.y)/.76);
     vec4 skin=texture2D(faceSkin,restFp),ink=mix(texture2D(faceInk,fp),texture2D(faceBlink,fp),blink);
     diffuseColor.rgb=mix(diffuseColor.rgb,skin.rgb,skin.a*gate);
     diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a*gate);
    `);};
    object.onBeforeRender=()=>{const quiet=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const phase=(performance.now()/1000)%5.7;uniforms.blink.value=quiet?0:Math.max(0,1-Math.abs(phase-5.3)/.095);};
   }
   mat.customProgramCacheKey=()=>faces?'doreumi-approved-face-v1':'doreumi-centroid-v1';
  }
  object.castShadow=object.receiveShadow=true;object.frustumCulled=false;count++;
 });
 if(!count||!Number.isFinite(bounds.min.y)||bounds.max.y<=bounds.min.y)throw Error('Invalid Doreumi model');
 const scale=1.58316654/(bounds.max.y-bounds.min.y),centerX=(bounds.min.x+bounds.max.x)/2;
 source.scale.setScalar(scale);source.position.set(-centerX*scale,-bounds.min.y*scale,0);
 const root=new Group();root.name='Doreumi';root.add(source);root.userData.characterSource='doreumi-desktop-pet/master';
 rigs.set(root,{source,reference});return root;
}
export function loadDormi(){
 return modelPromise??=Promise.all([
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./characters/doreumi/village.glb'),
  new GLTFLoader().loadAsync('./dormi.glb'),loadDoreumiFaces()
 ]).then(([gltf,reference,faces])=>villageDoreumi(gltf,reference.scene,faces)).catch(error=>{modelPromise=null;throw error;});
}

export function loadDoreumiFaces(){return Promise.all(['face-skin','neutral','blink'].map(async name=>{const map=await new TextureLoader().loadAsync('./characters/doreumi/'+name+'.webp');map.flipY=false;map.colorSpace=SRGBColorSpace;map.minFilter=map.magFilter=LinearFilter;map.generateMipmaps=false;return map;}));}
