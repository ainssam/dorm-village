import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAmusementFoodCamera} from '../dist/amusement/food-cart-camera.js';

function fixture(width,height){
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({left:30,top:60}),querySelector:()=>({getBoundingClientRect:()=>width>height&&height<=520?{left:width-280+30,top:70,width:264,height:height-20}:{left:50,top:height-210+60,width:350,height:190}})};
 const parent=new THREE.Group(),player=new THREE.Group();parent.position.set(27,0,-38);parent.rotation.y=.7;parent.add(player);player.position.set(-5.5,.05,4.1);player.rotation.y=-1.4;const view=createAmusementFoodCamera({stage,getActors:()=>({player})});return{stage,parent,player,view};
}
for(const[width,height]of[[390,844],[844,390],[768,1024],[1024,768],[1440,900]])test(`snack view frames the head and bite path outside its panel at ${width}x${height}`,()=>{
 const f=fixture(width,height),before={p:f.player.position.toArray(),q:f.player.quaternion.toArray(),scale:f.player.scale.toArray(),parent:f.player.parent},camera=f.view.fit();assert(camera?.isOrthographicCamera);assert.equal(f.view.fit(),camera);
 for(const xyz of[[-.64,0,-.45],[.82,1.72,.98],[0,1.58,0],[.42,.66,.66],[.30,.66,.78]]){
  const p=f.player.localToWorld(new THREE.Vector3(...xyz)).project(camera),x=(p.x+1)/2*width,y=(1-p.y)/2*height;assert(x>=19&&x<=width-19&&y>=31&&y<=height-23,'actor envelope remains inside stage');if(width>height&&height<=520)assert(x<=width-280-15,'bite remains left of side panel');else assert(y<=height-210-15,'bite remains above bottom panel');
 }
 assert.deepEqual(f.player.position.toArray(),before.p);assert.deepEqual(f.player.quaternion.toArray(),before.q);assert.deepEqual(f.player.scale.toArray(),before.scale);assert.equal(f.player.parent,before.parent);
 f.stage.clientWidth=844;f.stage.clientHeight=390;assert(f.view.fit());f.view.dispose();assert.equal(f.view.fit(),null);
});

test('ordering and eating keep the camera steady when the snack panel becomes shorter',()=>{
 const f=fixture(390,844),camera=f.view.fit(),projection=camera.projectionMatrix.toArray();
 f.stage.querySelector=()=>({getBoundingClientRect:()=>({left:50,top:744,width:350,height:100})});
 assert.deepEqual(f.view.fit().projectionMatrix.toArray(),projection,'one snack keeps its larger initial panel reservation');
 f.view.reset();assert.notDeepEqual(f.view.fit().projectionMatrix.toArray(),projection,'a new snack may fit its current layout');
 f.view.dispose();
});
