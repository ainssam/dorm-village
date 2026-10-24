import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function runPoses(page,out){
 const cases=[['read','classroom','classroom.chair-left'],['sleep','home','home.bed'],['swing','playground','playground.swing'],['seesaw','playground','playground.seesaw'],['piano-seat','music','music.piano-seat'],['water','park','park.flowers'],['weights','schoolGym','sportsField.weights'],['carousel','amusementIsland','amusementIsland.carousel'],['coaster','coasterGarden','coasterGarden.car']],results=[];
 for(const [name,room,id] of cases){if(process.env.QA_POSE_FILTER&&!process.env.QA_POSE_FILTER.split(',').includes(name))continue;
  try{await page.evaluate(id=>window.__audit.go(id),room);await page.waitForFunction(()=>!window.__audit.snapshot().locked);await page.evaluate(id=>window.__audit.activate(id),id);await page.waitForFunction(()=>window.__audit.snapshot().phase==='active',null,{timeout:90000});await page.waitForTimeout(250);await page.screenshot({path:out+'/'+name+'.png'});const state=await page.evaluate(()=>window.dormiGame.getState().pose);await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__audit.snapshot().activity,null,{timeout:240000});results.push({name,passed:true,state});}
  catch(e){results.push({name,passed:false,error:e.message,snapshot:await page.evaluate(()=>window.dormiGame.getState())});await page.screenshot({path:out+'/'+name+'-failed.png'});}
  console.log(JSON.stringify({name,passed:results.at(-1).passed,error:results.at(-1).error}));await writeFile(out+'/poses.json',JSON.stringify(results,null,2));
 }
 assert.ok(results.every(r=>r.passed));
}
