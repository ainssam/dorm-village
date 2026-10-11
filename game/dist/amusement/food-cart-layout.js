// Side pockets preserve castle, airport and ride approaches. Shop state is
// deliberately transient: ordering never writes to the saved economy/state.
export const FOOD_CARTS=Object.freeze([
 Object.freeze({id:'cold',x:-6.2,z:-1.2,yaw:Math.PI/2,hx:.58,hz:.5,foods:Object.freeze(['ice-cream','slush']),label:'아이스크림 · 슬러시'}),
 Object.freeze({id:'warm',x:-6.8,z:4.1,yaw:Math.PI/2,hx:.58,hz:.5,foods:Object.freeze(['hotdog','churros']),label:'핫도그 · 츄러스'})
]);
export const FOOD_CART_OBSTACLES=Object.freeze(FOOD_CARTS.map(c=>Object.freeze({id:'food-cart.'+c.id,x:c.x,z:c.z,hx:c.hx,hz:c.hz})));
// Existing path-side serving points are clear at the avatar's full .66 radius.
// Ordinary nearby/E/touch discovery can therefore use the standard walk flow.
export const FOOD_CART_TARGETS=Object.freeze([
 Object.freeze({id:'amusementIsland.food-cart.cold',type:'amusementFood',cartId:'cold',at:Object.freeze({x:-4.90,z:-1.2}),radius:.70,requiresClearApproach:true,label:'아이스크림 · 슬러시 주문하기',text:'진열된 아이스크림이나 슬러시를 골라요'}),
 Object.freeze({id:'amusementIsland.food-cart.warm',type:'amusementFood',cartId:'warm',at:Object.freeze({x:-5.50,z:4.1}),radius:.70,requiresClearApproach:true,label:'핫도그 · 츄러스 주문하기',text:'진열된 핫도그나 츄러스를 골라요'})
]);
