import * as THREE from 'three';

export const WORLD_GLOBE=Object.freeze({
  x:4.6,z:-3.2,radius:.68,centerY:1.55,axisTilt:23.4*Math.PI/180,
  widthSegments:32,heightSegments:18,rotationSpeed:.055,
  textureURL:new URL('./maps/world-globe-1024.png',import.meta.url).href,
});
// Includes the outer brass meridian, keeping the wall-map approach and desk aisle open.
export const WORLD_GLOBE_OBSTACLE=Object.freeze({x:WORLD_GLOBE.x,z:WORLD_GLOBE.z,hx:.79,hz:.72});

/** A self-owned prop. tick uses seconds and only rotates when the caller marks its room active. */
export function createWorldGlobe({textureLoader,rotationEnabled=true}={}){
  const root=new THREE.Group();root.name='socialStudies.globe';
  root.position.set(WORLD_GLOBE.x,0,WORLD_GLOBE.z);
  const wood=new THREE.MeshStandardMaterial({color:'#b68d62',roughness:.78});
  const brass=new THREE.MeshStandardMaterial({color:'#c8ad70',roughness:.48,metalness:.38});
  const globeMaterial=new THREE.MeshStandardMaterial({color:'#a6cbd2',roughness:.87,metalness:0});
  const geometries=new Set(),materials=new Set([wood,brass,globeMaterial]),textures=new Set(),releasedTextures=new WeakSet();
  let disposed=false,failed=false;
  const add=(name,geometry,material,parent=root)=>{
    geometries.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  // The closed lathed profile joins a wide foot, turned stem and cradle socket.
  const profile=[[0,.035],[.37,.035],[.43,.075],[.43,.12],[.33,.17],[.14,.21],[.10,.63],[.15,.70],[.105,.80],[0,.80]];
  add('socialStudies.globe.pedestal',new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),16),wood);
  const tilted=new THREE.Group();tilted.name='socialStudies.globe.axis';
  tilted.position.y=WORLD_GLOBE.centerY;tilted.rotation.z=-WORLD_GLOBE.axisTilt;root.add(tilted);
  add('socialStudies.globe.meridian',new THREE.TorusGeometry(.75,.019,6,40),brass,tilted);
  const axleGeometry=new THREE.CylinderGeometry(.027,.027,.105,12,1);
  for(const sign of[-1,1]){
    const axle=add(`socialStudies.globe.axle.${sign<0?'south':'north'}`,axleGeometry,brass,tilted);
    axle.position.y=sign*.7175;
  }
  const globe=add('socialStudies.globe.surface',new THREE.SphereGeometry(WORLD_GLOBE.radius,WORLD_GLOBE.widthSegments,WORLD_GLOBE.heightSegments),globeMaterial,tilted);
  // Three's native sphere maps lon 0 to +X, lon 90E to -Z; this faces Asia into the room.
  globe.rotation.y=-Math.PI+.12;
  globe.userData.geography={projection:'equirectangular',north:'local +Y',longitude0:'+X',longitude90E:'-Z'};
  root.userData.footprint={...WORLD_GLOBE_OBSTACLE};
  const releaseTexture=texture=>{
    if(!texture||releasedTextures.has(texture))return;
    releasedTextures.add(texture);textures.delete(texture);texture.dispose();
  };
  const acceptTexture=texture=>{
    if(disposed||failed){releaseTexture(texture);return;}
    textures.add(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
    texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
    globeMaterial.map=texture;globeMaterial.color.set('#ffffff');globeMaterial.needsUpdate=true;
  };
  const rejectTexture=()=>{
    if(disposed){for(const texture of textures)releaseTexture(texture);return;}
    failed=true;globeMaterial.map=null;globeMaterial.color.set('#a6cbd2');globeMaterial.needsUpdate=true;
    for(const texture of textures)releaseTexture(texture);
  };
  if(textureLoader||typeof document!=='undefined'){
    try{
      const requested=(textureLoader??new THREE.TextureLoader()).load(WORLD_GLOBE.textureURL,acceptTexture,undefined,rejectTexture);
      if(requested){if(disposed||failed)releaseTexture(requested);else textures.add(requested);}
    }catch{rejectTexture();}
  }
  const motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  return {
    root,
    tick(dt,{active=false,reducedMotion=motionQuery?.matches??false}={}){
      if(disposed||!active||reducedMotion||!rotationEnabled||!Number.isFinite(dt)||dt<=0)return;
      globe.rotation.y=(globe.rotation.y+Math.min(dt,.1)*WORLD_GLOBE.rotationSpeed)%(2*Math.PI);
    },
    dispose(){
      if(disposed)return;disposed=true;root.removeFromParent();
      globeMaterial.map=null;
      for(const texture of textures)releaseTexture(texture);
      for(const geometry of geometries)geometry.dispose();
      for(const material of materials)material.dispose();
      root.clear();
    },
  };
}
