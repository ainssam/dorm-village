import * as T from 'three';
import {signLabel} from '../world/handwriting.js';
import {KART_ENTRANCE} from './kart-layout.js';
export function buildKartEntrance(kit,parent){const root=new T.Group();root.name='amusement.kart-entrance';const {x,z}=KART_ENTRANCE.at;parent.add(root);for(let row=0;row<2;row++)for(let col=0;col<4;col++){const m=new T.Mesh(new T.BoxGeometry(.28,.012,.22),kit.mat((row+col)%2?'#657d79':'#f8e9ce'));m.position.set(x+(col-1.5)*.28,.034,z+(row-.5)*.22);m.receiveShadow=true;root.add(m);}signLabel('카트 1 LAP →',x,.26,z+.4,1.6,'#58716f','#f8e9ce',root);return root;}
