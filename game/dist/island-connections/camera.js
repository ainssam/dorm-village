import * as T from 'three';
import {LOOKOUT_CAMERA as C} from './layout.js';
/** Deliberately independent of actor offsets and the retained walking camera. */
export function createLookoutCamera(width=390,height=844,config=C){const camera=new T.PerspectiveCamera(config.fov,1,config.near,config.far);camera.name='island-connections.lookout-camera';camera.position.fromArray(config.eye);camera.lookAt(...config.target);camera.resize=(w,h)=>{camera.aspect=Math.max(1,Number.isFinite(w)?w:390)/Math.max(1,Number.isFinite(h)?h:844);camera.fov=camera.aspect<.8?(config.portraitFov??config.fov):config.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};camera.resize(width,height);return camera;}
