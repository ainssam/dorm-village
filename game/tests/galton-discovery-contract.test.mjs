import test from 'node:test';
import assert from 'node:assert/strict';
import {GaltonSimulation,binomialProbabilities} from '../dist/school/galton.js';
import {createGaltonDiscovery} from '../dist/school/galton-discovery.js';

const sum=values=>values.reduce((total,value)=>total+value,0);
function setup(){
 let randomValue=.1;
 const simulation=new GaltonSimulation({rows:8,random:()=>randomValue});
 const discovery=createGaltonDiscovery(simulation);
 return {simulation,discovery,setRandom:value=>{randomValue=value;}};
}
function complete(simulation){
 for(let step=0;step<200&&simulation.snapshot().landed<simulation.snapshot().total;step++)simulation.update(.25);
 const result=simulation.snapshot();
 assert.equal(result.landed,result.total,'actual released paths must finish before comparison');
 assert.equal(sum(result.bins),result.total);
 return result;
}
function conserved(snapshot){
 assert.equal(snapshot.total,(snapshot.total-snapshot.released)+snapshot.inFlight+snapshot.landed);
 assert.equal(sum(snapshot.bins),snapshot.landed);
 assert.equal(snapshot.rowsData.length,snapshot.rows+1);
 for(const row of snapshot.rowsData){
  assert.equal(row.count,snapshot.bins[row.bin]);
  assert.equal(row.proportion,row.count/snapshot.total);
 }
}

test('a fresh discovery offers a short 30-ball observation with the exact eight-choice theory',()=>{
 const {simulation,discovery}=setup(),snapshot=discovery.snapshot();
 assert.equal(snapshot.phase,'ready');assert.equal(snapshot.total,30);assert.equal(snapshot.released,0);assert.equal(snapshot.previous,null);
 assert.deepEqual(snapshot.rowsData.map(row=>row.expected),[1,8,28,56,70,56,28,8,1].map(n=>n/256));
 assert.deepEqual(snapshot.rowsData.map(row=>row.expected),binomialProbabilities(8));
 assert.equal(sum(snapshot.rowsData.map(row=>row.expected)),1);
 assert.ok(snapshot.rowsData.every(row=>row.previousCount===null&&row.previousProportion===null));
 conserved(snapshot);
 const before=simulation.snapshot();for(let n=0;n<5;n++)discovery.snapshot();
 assert.deepEqual(simulation.snapshot(),before,'reading the discovery never advances or resamples paths');
});

test('pause and close preserve a partial trial; resume follows its original sampled paths',()=>{
 const {simulation,discovery,setRandom}=setup();discovery.start();simulation.update(.25);discovery.pause();
 const paused=discovery.snapshot();assert.equal(paused.phase,'paused');assert.ok(paused.inFlight>0);assert.equal(paused.previous,null);conserved(paused);
 const before=simulation.snapshot();setRandom(.9);discovery.close();simulation.update(.25);
 assert.deepEqual(simulation.snapshot(),before,'closing stops advancement and preserves all released paths');
 discovery.start();const finished=complete(simulation);assert.equal(finished.bins[0],30,'resume must not resample the original left paths');
 assert.equal(discovery.snapshot().phase,'complete');assert.equal(discovery.snapshot().previous,null);
});

test('starting after a late completion archives the actual finished trial and samples a new one',()=>{
 const {simulation,discovery,setRandom}=setup();discovery.start();const first=complete(simulation);
 // No discovery snapshot is requested between actual completion and this command.
 setRandom(.9);discovery.start();let snapshot=discovery.snapshot();
 assert.equal(snapshot.phase,'running');assert.equal(snapshot.landed,0);assert.deepEqual(snapshot.previous,{total:30,bins:first.bins});conserved(snapshot);
 const second=complete(simulation);assert.equal(second.bins[8],30);
 snapshot=discovery.snapshot();assert.equal(snapshot.phase,'complete');assert.deepEqual(snapshot.previous.bins,first.bins,'finishing B keeps A available beside B');
 discovery.start();snapshot=discovery.snapshot();assert.deepEqual(snapshot.previous,{total:30,bins:second.bins},'the next new trial advances the comparison to B');
});

test('different sample sizes compare their own totals, including an unfinished current trial',()=>{
 const {simulation,discovery,setRandom}=setup();discovery.start();complete(simulation);setRandom(.9);discovery.selectCount(100);discovery.start();
 for(let n=0;n<6;n++)simulation.update(.25);
 const snapshot=discovery.snapshot();assert.equal(snapshot.total,100);assert.equal(snapshot.landed,1);assert.equal(snapshot.previous.total,30);conserved(snapshot);
 assert.equal(snapshot.rowsData[8].count,1);assert.equal(snapshot.rowsData[8].proportion,.01,'current ratio uses all 100 planned balls, not the one landed ball');
 assert.equal(snapshot.rowsData[0].previousCount,30);assert.equal(snapshot.rowsData[0].previousProportion,1,'previous ratio retains its original 30-ball denominator');
 assert.equal(sum(snapshot.rowsData.map(row=>row.proportion)),.01);
});

test('changing or reselecting counts cannot promote a partial trial to a completed comparison',()=>{
 const {simulation,discovery}=setup();discovery.start();const first=complete(simulation);discovery.start();simulation.update(.25);discovery.pause();
 const before=discovery.snapshot();discovery.selectCount(30);assert.deepEqual(discovery.snapshot(),before,'selecting the existing count is a no-op');
 for(const invalid of [0,29,31,Infinity,NaN,'100',null]){assert.equal(discovery.selectCount(invalid),false);assert.deepEqual(discovery.snapshot(),before);}
 discovery.selectCount(300);let snapshot=discovery.snapshot();assert.equal(snapshot.phase,'ready');assert.equal(snapshot.total,300);assert.equal(snapshot.landed,0);assert.deepEqual(snapshot.previous,{total:30,bins:first.bins});
 discovery.start();simulation.update(.25);discovery.selectCount(100);snapshot=discovery.snapshot();assert.equal(snapshot.phase,'ready');assert.deepEqual(snapshot.previous,{total:30,bins:first.bins});conserved(snapshot);
});

test('comparison snapshots are defensive and explicit reset clears both results without recapturing',()=>{
 const {simulation,discovery}=setup();discovery.start();const first=complete(simulation);discovery.selectCount(100);discovery.start();complete(simulation);
 const exposed=discovery.snapshot();exposed.previous.total=999;exposed.previous.bins[0]=999;exposed.rowsData[0].previousCount=999;exposed.bins[0]=999;
 const intact=discovery.snapshot();assert.deepEqual(intact.previous,{total:30,bins:first.bins});assert.equal(intact.bins[0],100);conserved(intact);
 discovery.reset();let snapshot=discovery.snapshot();assert.equal(snapshot.phase,'ready');assert.equal(snapshot.total,100);assert.equal(snapshot.previous,null);assert.equal(snapshot.landed,0);assert.equal(sum(snapshot.bins),0);
 discovery.close();snapshot=discovery.snapshot();assert.equal(snapshot.previous,null);assert.equal(snapshot.phase,'ready');discovery.start();simulation.update(.25);assert.equal(discovery.snapshot().previous,null,'cleared completed data cannot return on the next action');
});

test('attaching to an already started simulation preserves its selected batch and exact paths',()=>{
 const simulation=new GaltonSimulation({rows:8,random:()=>.9});simulation.reset(100).start();simulation.update(.25);
 const before=simulation.snapshot(),discovery=createGaltonDiscovery(simulation);assert.deepEqual(simulation.snapshot(),before);
 const snapshot=discovery.snapshot();assert.equal(snapshot.total,100);assert.equal(snapshot.phase,'running');assert.equal(snapshot.previous,null);conserved(snapshot);
});
