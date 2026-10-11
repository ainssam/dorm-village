import {buildClawCabinet} from './claw-cabinet.js';
import {createClawModel} from './claw-model.js';
import {CLAW,CLAW_ACTIVITY} from './claw-layout.js';
import {canReachInteraction} from '../interactions.js';
const plain=v=>({x:v.x,y:v.y,z:v.z});
export function createClawMachine(THREE,room){
 const asset=buildClawCabinet(THREE),root=new THREE.Group();root.name='amusement.claw-machine';root.position.set(CLAW.x,CLAW.y,CLAW.z);root.rotation.y=CLAW.yaw;root.add(asset.root);
 const sweep=asset.grip.openBounds.clone().union(asset.grip.closedBounds),lowerStops=[];
 // Derive safe lower stops from every actual low static triangle (well rails,
 // tray floor and lips), expanded by the complete open/closed jaw envelope.
 // These are conservative guards, not replacement collision geometry.
 asset.root.updateMatrixWorld(true);const inverse=asset.root.matrixWorld.clone().invert();
 asset.root.traverse(o=>{if(!o.isMesh||!(o.name==='claw.cabinet.static'||o.name.startsWith('claw.controls.')))return;const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const box=new THREE.Box3().setFromPoints([0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j).applyMatrix4(matrix)));if(box.max.y<=asset.limits.wellFloorY+.001||box.max.y>=asset.limits.clawY[1]-.1)continue;lowerStops.push({minX:box.min.x-sweep.max.x,maxX:box.max.x-sweep.min.x,minZ:box.min.z-sweep.max.z,maxZ:box.max.z-sweep.min.z,minHeadY:box.max.y-asset.grip.lowestTipY+.006});}});
 const spec={aim:{x:[...asset.limits.x],z:[...asset.limits.z]},home:{x:0,y:asset.limits.clawY[1],z:(asset.limits.z[0]+asset.limits.z[1])/2},minimumHeadY:asset.limits.clawY[0],gripOffset:plain(asset.grip.point),tray:plain(asset.limits.trayLanding),lowerStops,prizes:asset.prizes.map(p=>({id:p.userData.prizeKind,position:plain(p.position),grip:plain(p.userData.grip.point),radius:Math.min(p.userData.grip.radius,p.userData.grip.tolerance)}))};
 const model=createClawModel(spec),byId=new Map(asset.prizes.map(p=>[p.userData.prizeKind,p]));let disposed=false,controller=null;
 function apply(s){if(disposed)return;asset.carriageX.position.x=s.head.x;asset.carriage.position.z=s.head.z;asset.claw.position.y=s.head.y;const lower=s.head.y+.04;asset.cable.scale.y=asset.limits.cableTopY-lower;asset.cable.position.y=(asset.limits.cableTopY+lower)/2;const closed=byId.get(s.caught)?.userData.grip.jawAngle??asset.limits.jawAngle[0],angle=closed+(asset.limits.jawAngle[1]-closed)*s.head.open;for(const jaw of asset.jaws)jaw.rotation.z=angle;for(const p of s.prizes)byId.get(p.id).position.set(p.position.x,p.position.y,p.position.z);}
 apply(model.snapshot());
 return{root,asset,model,spec,apply,get controller(){return controller;},set controller(value){if(disposed){value?.dispose();return;}if(controller&&controller!==value)controller.dispose();controller=value;},canReach(p){return !disposed&&room.id==='amusementIsland'&&Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&canReachInteraction(room,p,CLAW_ACTIVITY,.66);},dispose(){if(disposed)return;disposed=true;controller?.dispose();controller=null;model.dispose();asset.dispose();root.removeFromParent();root.clear();}};
}
