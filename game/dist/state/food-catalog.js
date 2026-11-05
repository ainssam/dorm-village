// Food registries and recipe costs are durable contracts. New foods or cost changes require a root migration.
export const MAX_FOOD_COUNT=1000000000,MAX_PRODUCE_HARVESTS=9999;
export const FOOD_BREAD_IDS=Object.freeze(['milkRoll','croissant','miniCake']);
export const FOOD_DRINKS=Object.freeze({
 americano:Object.freeze({material:null,cost:0}),latte:Object.freeze({material:null,cost:0}),
 appleJuice:Object.freeze({material:'apple',cost:2}),strawberryJuice:Object.freeze({material:'strawberry',cost:2}),
 peachJuice:Object.freeze({material:'peach',cost:2}),pearJuice:Object.freeze({material:'pear',cost:2}),mandarinJuice:Object.freeze({material:'mandarin',cost:2})
});
export const FOOD_DRINK_IDS=Object.freeze(Object.keys(FOOD_DRINKS));
// The schema-5/6 lists are historical data, not aliases of the current registry.
export const LEGACY_FOOD_BREAD_IDS=Object.freeze(['milkRoll','croissant','miniCake']);
export const LEGACY_FOOD_DRINK_IDS=Object.freeze(['americano','latte','appleJuice','strawberryJuice','peachJuice','pearJuice','mandarinJuice']);
export const LEGACY_FOOD_IDS=Object.freeze([...LEGACY_FOOD_BREAD_IDS,...LEGACY_FOOD_DRINK_IDS]);
export const FOOD_MEALS=Object.freeze({
 tomatoBowl:Object.freeze({material:'tomato',cost:1}),
 pumpkinBowl:Object.freeze({material:'pumpkin',cost:1}),
 leafyBowl:Object.freeze({material:'leafy',cost:1})
});
export const FOOD_MEAL_IDS=Object.freeze(Object.keys(FOOD_MEALS));
export const FOOD_PREPARED=Object.freeze({...FOOD_DRINKS,...FOOD_MEALS});
export const FOOD_PREPARED_IDS=Object.freeze([...FOOD_DRINK_IDS,...FOOD_MEAL_IDS]);
export const FOOD_IDS=Object.freeze([...FOOD_BREAD_IDS,...FOOD_PREPARED_IDS]);
export const PLAY_SEASONS=Object.freeze(['spring','summer','autumn','winter']);
export const PRODUCE_SEASONS=Object.freeze(['calendar',...PLAY_SEASONS]);
const crop=(material,kind,seasons)=>Object.freeze({material,kind,yield:2,seasons:Object.freeze(seasons)});
export const PRODUCE_NODES=Object.freeze({
 'park.produce.strawberry':crop('strawberry','bed',['spring']),
 'park.produce.tomato':crop('tomato','bed',['summer']),
 'park.produce.pumpkin':crop('pumpkin','bed',['autumn']),
 'park.produce.leafy':crop('leafy','bed',['spring','winter']),
 'park.produce.peach':crop('peach','tree',['summer']),
 'park.produce.pear':crop('pear','tree',['autumn']),
 'park.produce.mandarin':crop('mandarin','tree',['winter'])
});
export const PRODUCE_NODE_IDS=Object.freeze(Object.keys(PRODUCE_NODES));
export const PRODUCE_MATERIAL_IDS=Object.freeze(PRODUCE_NODE_IDS.map(id=>PRODUCE_NODES[id].material));
export const foodInteger=(n,max=MAX_FOOD_COUNT)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
// Reject inherited/symbol/non-enumerable fields as well as extra or missing keys.
export function exactFoodRecord(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)&&Object.prototype.propertyIsEnumerable.call(value,key));}
export function fruitDrinkCost(food,material){return FOOD_DRINK_IDS.reduce((n,id)=>n+(FOOD_DRINKS[id].material===material?(food?.made?.[id]??0)*FOOD_DRINKS[id].cost:0),0);}

// Preparing spends ingredients; eating or sharing spends only the prepared food.
export function preparedFoodCost(food,material){return FOOD_PREPARED_IDS.reduce((n,id)=>n+(FOOD_PREPARED[id].material===material?(food?.made?.[id]??0)*FOOD_PREPARED[id].cost:0),0);}
