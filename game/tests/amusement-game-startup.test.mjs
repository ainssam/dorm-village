import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('dist/game.js','utf8');

test('gym, claw and snack callbacks can clear the actual shared walking vector',async()=>{
 const declaration=source.match(/^const velocity=new THREE\.Vector3\(\);$/m)?.[0];
 assert(declaration,'walking vector must be visible outside the renderer block');
 assert(source.indexOf(declaration)<source.indexOf('if(renderer){'));
 const factories=['makeClawTools','makeAmusementFoodTools'].map(name=>source.match(new RegExp(`^function ${name}\\(\\).+$`,'m'))[0]);
 const gym=source.match(/^gymTools=createGymController\(.+$/m)[0];
 const moduleSource=`
  const THREE={Vector3:class{set(x,y,z){this.xyz=[x,y,z];}}};
  ${declaration}
  let clears=0,locks=0,lastAction='walking',gymTools;
  const input={clear(){clears++;}},stage={},ui={},reduced=false;
  const updateLock=()=>locks++,zoneView=()=>null,createClawCamera=()=>{};
  const createClawController=o=>o,createAmusementFoodHost=o=>o,createGymController=o=>o;
  ${factories.join('\n')}
  ${gym}
  const callbacks=[makeClawTools().clearInput,makeAmusementFoodTools().onChange,gymTools.clearInput];
  for(const clear of callbacks){velocity.set(3,0,4);clear();if(velocity.xyz.some(Boolean))throw Error('walking survived');}
  export{clears,locks,lastAction};
 `;
 const result=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
 assert.equal(result.clears,3);
 assert.equal(result.locks,1);
 assert.equal(result.lastAction,null);
});

test('fish scoop initialization is in ES-module scope before renderer failure can divert to the fallback',async()=>{
 const factoryNames=['makeFishScoopTools','makeClawTools','makeAmusementFoodTools'];
 const factories=factoryNames.map(name=>source.match(new RegExp(`^ ?function ${name}\\(\\).+$`,'m'))?.[0]?.trim());
 const assignmentStart=source.indexOf('fishScoop=makeFishScoopTools();');
 const rendererGuard=source.indexOf('if(renderer){');
 const rendererCreation=source.indexOf('try{renderer=new THREE.WebGLRenderer');
 assert(factories.every(Boolean),'all amusement factories remain present');
 assert(assignmentStart>=0&&rendererCreation>assignmentStart&&rendererGuard>rendererCreation,'startup still initializes the fish scoop before renderer creation');
 for(const [i,factory]of factories.entries()){
  assert(source.indexOf(factory)<rendererGuard,`${factoryNames[i]} is top-level and visible to its callers`);
 }
 const interactStart=source.indexOf('function interact(exitOnly');
 const interactEnd=source.indexOf('\nui=setupUI',interactStart);
 const interaction=source.slice(interactStart,interactEnd);
 assert(interaction.includes('makeClawTools()')&&interaction.includes('makeAmusementFoodTools()'),'ordinary amusement interactions still lazily create both tool hosts');

 const factorySource=factories.join('\n');
 const assignment=source.slice(assignmentStart,assignmentStart+'fishScoop=makeFishScoopTools();'.length);
 const moduleSource=`
  const stage={},ui={},input={},reduced=false;
  const zoneView=()=>null;
  const createFishScoopController=options=>({options});
  const createClawController=options=>({options});
  const createClawCamera=()=>null;
  const createAmusementFoodHost=options=>({options});
  let fishScoop;
  ${factorySource}
  ${assignment}
  const claw=makeClawTools();
  const food=makeAmusementFoodTools();
  let renderer=null,rendererFallback=false;
  try{throw new Error('WebGL unavailable');}catch{rendererFallback=true;}
  export{fishScoop,claw,food,renderer,rendererFallback};
 `;
 const url='data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64');
 const boot=await import(url);
 assert(boot.fishScoop,'startup continues with the real factory in module scope');
 assert(boot.claw&&boot.food,'top-level interaction handlers can instantiate their amusement controllers');
 assert.equal(boot.renderer,null);
 assert.equal(boot.rendererFallback,true,'a renderer failure reaches the non-rendering fallback after initialization');
 assert.equal(typeof boot.fishScoop.options.onActive,'function');
});
