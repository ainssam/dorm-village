import {createCurlingController} from './curling-controller.js';
import {createLaserController} from './laser-controller.js';
import {createClimbingController} from './climbing-controller.js';
import {createArcheryController} from './archery-controller.js';
import {createBoxingController} from './boxing-controller.js';
import {createGymController} from './controller.js';
import {createStairController} from './stair-controller.js';
/** Keep one owner at the existing gym boundary. Individual games keep their APIs. */
export function createGymHost(options){
 const controllers={curling:createCurlingController(options),laser:createLaserController(options),climbing:createClimbingController(options),archery:createArcheryController(options),boxing:createBoxingController(options),treadmill:createGymController(options),stairs:createStairController(options)};let selected=null;
 return{open(tool='treadmill'){if(selected?.active)return false;const next=controllers[tool];if(!next)return false;selected=next;return next.open();},close(){selected?.close();},cancel(){for(const c of Object.values(controllers))c.cancel();selected=null;},dispose(){for(const c of Object.values(controllers))c.dispose();selected=null;},pause(){selected?.pause();},tick(dt){selected?.tick(dt);},viewport(w,h){return selected?.viewport(w,h)??{x:0,y:0,width:w,height:h};},get camera(){return selected?.camera;},get active(){return Object.values(controllers).some(c=>c.active);},snapshot(){return selected?.snapshot()??null;}};
}
