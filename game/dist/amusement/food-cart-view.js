import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {signLabel} from '../world/handwriting.js';
import {FOOD_CARTS} from './food-cart-layout.js';
import {createFoodProp} from './food-props.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',mint:'#a7c9bd',gold:'#d4b97e',wood:'#c5a284',ink:'#657d79'};
/** Two static visual carts. Transient order/hold/eat behavior lives in the
 * separate food-cart-order host and does not add persistent economy state. */
export function buildFoodCarts(parent){
 const root=new T.Group();root.name='amusement.food-carts';parent.add(root);
 for(const spec of FOOD_CARTS){
  const cart=new T.Group();cart.name='amusement.food-cart.'+spec.id;cart.position.set(spec.x,0,spec.z);cart.rotation.y=spec.yaw;root.add(cart);
  const pieces=[],color=spec.id==='cold'?P.mint:P.rose;
  const add=(g,c,x,y,z,rotation=null)=>{if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}if(rotation)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)));g.translate(x,y,z);const v=new T.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=v.r;a[i+1]=v.g;a[i+2]=v.b;}g.setAttribute('color',new T.BufferAttribute(a,3));pieces.push(g);};
  const box=(w,h,d,c,x,y,z,rounded=false)=>add(rounded?new RoundedBoxGeometry(w,h,d,1,.055):new T.BoxGeometry(w,h,d),c,x,y,z);
  // Opaque wheeled cabinet; the serving face looks toward the existing island path.
  box(1.64,.66,.93,P.cream,0,.53,0,true);box(1.67,.14,.97,color,0,.79,0);box(1.78,.10,1.05,P.wood,0,.91,0,true);
  box(1.35,.39,.018,color,0,.54,.475);for(const x of[-.42,0,.42])box(.035,.36,.025,P.cream,x,.54,.49);
  for(const x of[-.68,.68])for(const z of[-.38,.38])add(new T.CylinderGeometry(.16,.16,.075,8),P.ink,x,.17,z,[Math.PI/2,0,0]);
  for(const x of[-.76,.76])box(.075,1.26,.075,P.gold,x,1.5,-.38);
  // High compact striped canopy: no low overhang into the player approach.
  for(let i=0;i<6;i++)box(.3,.10,1.05,i%2?P.cream:color,-.75+i*.3,2.16,-.04);
  box(1.8,.13,.04,color,0,2.065,.475);box(1.8,.10,.04,P.gold,0,2.22,.475);
  const geom=mergeGeometries(pieces);geom.scale(.54,1,1);for(const g of pieces)g.dispose();const mesh=new T.Mesh(geom,new T.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0}));mesh.name='amusement.food-cart.'+spec.id+'.body';mesh.castShadow=mesh.receiveShadow=true;cart.add(mesh);
  for(const [index,kind]of spec.foods.entries()){const food=createFoodProp(kind);food.position.set(0,.966,index?-.22:.18);food.rotation.y=-Math.PI/2;cart.add(food);}
  signLabel(spec.label,0,1.87,-.39,1.65*.54,P.ink,P.cream,cart);
 }
 return root;
}
