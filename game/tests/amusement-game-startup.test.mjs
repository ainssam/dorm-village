import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('dist/game.js','utf8');

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
