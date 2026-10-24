import {Vector3} from 'three';
import {doreumiModel} from '../tests/helpers/doreumi-model.mjs';
const {model,poser}=await doreumiModel();
const frames=[];
for(let i=0;i<16;i++){
 poser.setPose('run',.25,i*Math.PI/64);model.updateMatrixWorld(true);
 const joints={};for(const name of ['armL','elbowL','thighL','kneeL','footL','footR','palmL','palmR']){
  const bone=model.getObjectByName(name);joints[name]={p:bone.getWorldPosition(new Vector3()).toArray(),q:bone.quaternion.toArray()};
 }
 frames.push(joints);
}
for(const name of Object.keys(frames[0])){
 const travel=Math.max(...frames.map(f=>f[name].p[2]))-Math.min(...frames.map(f=>f[name].p[2]));
 console.log(name,JSON.stringify({travelZ:travel,first:frames[0][name],quarter:frames[4][name]}));
}
