import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {createAutumnLeafGeometry,createAutumnLeafMaterial} from '../world/autumn-leaf-geometry.js';
import {createShellGeometry} from '../world/gathering-scene.js';
export function createKeepsake(itemId){
 const root=new THREE.Group();root.name='keepsake.'+itemId;const {box,sphere,cylinder,mat}=createToyKit(root);let pendingGeometry=null,pendingMaterial=null;
 try{
 if(itemId==='apple-juice'){
  box(.87,.055,.54,'#c59d73',0,.028,0,.035);for(const x of [-.22,.22]){cylinder(.13,.11,.26,'#eec580',x,.185,0);cylinder(.14,.14,.025,'#fff0d0',x,.32,0);cylinder(.11,.11,.01,'#dcaa52',x,.339,0);const straw=cylinder(.012,.012,.22,'#739986',x+.04,.40,0);straw.rotation.z=-.18;const slice=sphere(.07,'#c87962',x-.07,.355,0,1,.35,.8);slice.rotation.z=.3;}
 }else if(itemId==='apple-jam'){
  cylinder(.24,.25,.035,'#dfc6a1',0,.02,0);cylinder(.18,.16,.34,'#bb7662',0,.21,0);cylinder(.19,.19,.055,'#b6c5a0',0,.41,0);box(.23,.14,.02,'#fff0d2',0,.22,.175,.01);sphere(.045,'#c97962',0,.23,.194,1,.85,.3);box(.30,.025,.34,'#d4b58c',0,.449,0,.02);
 }else if(itemId==='leaf-frame'){
  box(.70,.69,.085,'#a87b54',0,.345,0,.035);box(.55,.54,.025,'#efe2c5',0,.345,.052,.02);const stand=box(.12,.44,.07,'#a87b54',0,.23,-.13,.02);stand.rotation.x=-.35;
  const geo=pendingGeometry=createAutumnLeafGeometry(),material=pendingMaterial=createAutumnLeafMaterial();for(const[x,y,angle,scale]of[[-.145,.34,-.48,.61],[.125,.33,.48,.55],[.01,.47,.1,.47]]){const leaf=new THREE.Mesh(geo,material);leaf.name='keepsake.leaf-frame.leaf';leaf.position.set(x,y,.074);leaf.rotation.set(Math.PI/2,angle,0);leaf.scale.setScalar(scale);leaf.castShadow=true;root.add(leaf);pendingGeometry=pendingMaterial=null;}
 }else if(itemId==='shell-frame'){
  box(.64,.68,.085,'#b89371',0,.36,0,.035);box(.48,.51,.025,'#c4dcd7',0,.36,.05,.02);box(.46,.17,.03,'#e6d5ad',0,.18,.067,.015);sphere(.07,'#f3d494',.12,.49,.078,1,1,.16);const stand=box(.12,.46,.07,'#b89371',0,.24,-.13,.02);stand.rotation.x=-.35;
  const geo=createShellGeometry();for(const[x,y,c]of[[-.22,.17,'#e2a896'],[.22,.20,'#e6bb91'],[0,.65,'#f0dfb8']]){const shell=new THREE.Mesh(geo,mat(c));shell.position.set(x,y,.085);shell.rotation.x=Math.PI/2;shell.scale.setScalar(.47);shell.castShadow=true;root.add(shell);}
 }
 return root;}catch(error){pendingGeometry?.dispose();pendingMaterial?.dispose();disposeToyTree(root);throw error;}
}
