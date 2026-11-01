// Deliberately simplified, deterministic recipe experiments. No real cooking temperatures.
export const RECIPES=Object.freeze([
 {id:'salad',name:'무지개 샐러드',ingredients:['채소','과일','요거트'],colors:['#85ad72','#e8a25e','#fff2d3'],ratio:[4,2,1],mix:[2,4],heat:0,guide:'채소 4 : 과일 2 : 요거트 1 · 2~4바퀴. 더 섞으면 조각의 모양이 어떻게 될까요?',concept:'같은 한 컵으로 재는 비율 · 섞는 횟수와 모양'},
 {id:'pancake',name:'구름 팬케이크',ingredients:['가루','우유','달걀물'],colors:['#f1dfb2','#f6eddb','#edc25f'],ratio:[4,3,1],mix:[5,8],heat:24,guide:'가루 4 : 우유 3 : 달걀물 1 · 5~8바퀴. 중간 세기 약 12초, 중간에 한 번 뒤집어 봐요.',concept:'액체와 가루의 비율 · 열의 세기 × 시간'},
 {id:'cocoa',name:'포근한 코코아',ingredients:['코코아','우유','달콤가루'],colors:['#976344','#f6eddb','#e8cbaa'],ratio:[1,4,1],mix:[4,7],heat:18,guide:'코코아 1 : 우유 4 : 달콤가루 1 · 4바퀴 이상 섞어요. 약한 세기 18초와 중간 세기 9초의 쌓인 열을 비교해요.',concept:'농도 · 같은 열의 양을 만드는 세기와 시간'}
]);
export const recipeById=id=>RECIPES.find(r=>r.id===id)??RECIPES[0];
const sum=a=>a.reduce((n,x)=>n+x,0),finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
export const initialCooking=(recipe='salad')=>({recipe:recipeById(recipe).id,phase:'measure',amounts:[0,0,0],order:[],turns:0,circuits:0,rotation:0,quadrant:null,level:2,seconds:0,energy:0,flipEnergy:null,running:false});
export function reduceCooking(s,a){
 if(a.type==='RECIPE'&&RECIPES.some(r=>r.id===a.id))return initialCooking(a.id);
 if(a.type==='RESET')return initialCooking(s.recipe);
 if(a.type==='PAUSE')return s.running?{...s,running:false}:s;
 if(a.type==='POUR'&&s.phase==='measure'&&Number.isInteger(a.index)&&a.index>=0&&a.index<3&&s.amounts[a.index]<6&&sum(s.amounts)<12){const amounts=[...s.amounts];amounts[a.index]++;return {...s,amounts,order:[...s.order,a.index]};}
 if(a.type==='UNDO'&&s.phase==='measure'&&s.order.length){const amounts=[...s.amounts];amounts[s.order.at(-1)]--;return {...s,amounts,order:s.order.slice(0,-1)};}
 if(a.type==='MIX'&&s.phase==='measure'&&s.amounts.every(x=>x>0))return {...s,phase:'mix'};
 if(a.type==='STIR'&&s.phase==='mix'&&Number.isInteger(a.quadrant)&&a.quadrant>=0&&a.quadrant<4&&a.quadrant!==s.quadrant){const delta=s.quadrant===null?0:(a.quadrant-s.quadrant+4)%4;if(delta===2)return s;let rotation=s.rotation+(delta===1?1:delta===3?-1:0),circuits=s.circuits;if(Math.abs(rotation)===4){circuits=Math.min(30,circuits+1);rotation=0;}if(circuits===30)rotation=0;return {...s,quadrant:a.quadrant,rotation,circuits,turns:circuits+Math.abs(rotation)/4};}
 if(a.type==='HEAT'&&s.phase==='mix'&&s.turns>=1&&recipeById(s.recipe).heat)return {...s,phase:'heat',running:false};
 if(a.type==='LEVEL'&&s.phase==='heat'&&[1,2,3].includes(a.value))return s.level===a.value?s:{...s,level:a.value};
 if(a.type==='RESUME'&&s.phase==='heat'&&!s.running&&s.seconds<45)return {...s,running:true};
 if(a.type==='FLIP'&&s.phase==='heat'&&s.recipe==='pancake'&&s.flipEnergy===null&&s.seconds>=1)return {...s,flipEnergy:s.energy};
 if(a.type==='TICK'&&s.phase==='heat'&&s.running&&finite(a.dt,0,1)&&a.dt>0){const dt=Math.min(a.dt,.1,45-s.seconds),seconds=Math.min(45,s.seconds+dt);return {...s,seconds,energy:s.energy+dt*s.level,running:seconds<45};}
 if(a.type==='FINISH'&&((s.phase==='mix'&&s.recipe==='salad'&&s.turns>=1)||(s.phase==='heat'&&s.seconds>=2)))return {...s,phase:'result',running:false};
 return s;
}
export function evaluateCooking(s){
 const r=recipeById(s.recipe),total=sum(s.amounts),ideal=sum(r.ratio),shares=s.amounts.map(x=>total?x/total:0);
 const differences=shares.map((share,i)=>share-r.ratio[i]/ideal),ratioError=sum(differences.map(Math.abs));
 const changed=differences.reduce((largest,value,i)=>Math.abs(value)>Math.abs(differences[largest])?i:largest,0);
 const ratio=ratioError<.18?'기준에 가까운 비율':`기준보다 ${r.ingredients[changed]}의 비중이 ${differences[changed]>0?'높은':'낮은'} 배합`;
 // A drink does not become dense merely because it was stirred for longer.
 const under=s.turns<r.mix[0],over=s.recipe!=='cocoa'&&s.turns>r.mix[1];
 const mixed=under?(s.recipe==='salad'?'가볍게 섞은':'덩어리가 남은'):over?(s.recipe==='salad'?'조금 으깨진':'촘촘한'):'고르게 섞인';
 const texture=over?'dense':under?'lumpy':'soft',smooth=Math.max(0,Math.round(100-(under?(r.mix[0]-s.turns)*6:over?(s.turns-r.mix[1])*4:0)));
 const heatBand=s.energy<r.heat*.75?'low':s.energy>r.heat*1.35?'high':'target';
 const heat=r.heat===0?'가열하지 않음':s.recipe==='cocoa'?{low:'모형의 목표보다 적은 열',target:'모형의 목표에 가까운 열',high:'모형의 목표보다 많은 열'}[heatBand]:{low:'옅은 색',target:'노릇한 색',high:'짙은 색'}[heatBand];
 const even=s.recipe!=='pancake'||(s.flipEnergy!==null&&Math.abs(s.flipEnergy-s.energy/2)<=s.energy*.22);
 const color=s.recipe==='salad'?'#9dad70':s.recipe==='cocoa'?(shares[0]>.23?'#754a36':'#b58963'):{low:'#eee0b0',target:'#dca360',high:'#99623b'}[heatBand];
 const first=r.ingredients[s.order[0]],order=s.order[0]===0;
 const orderNote=first?`${first}부터 담았어요. 이 모형은 담는 순서에 따른 차이는 계산하지 않아요.`:'';
 const mixingNote=s.recipe==='cocoa'?'코코아는 충분히 섞은 뒤 더 저어도 촘촘해지지 않아요.':s.recipe==='salad'?'이 모형에서는 많이 섞으면 재료 조각이 작아져요.':'이 모형에서는 많이 섞으면 반죽이 촘촘한 모습이 돼요.';
 const heatingNote=r.heat?`${heat}. 세기 × 시간을 더한 열은 ${s.energy.toFixed(1)}칸 · ${s.seconds.toFixed(1)}초예요. ${s.recipe==='cocoa'?'코코아의 색은 재료 비율로 표현하며, 가열에 따른 색 변화는 계산하지 않아요.':s.flipEnergy===null?'이번에는 뒤집지 않았어요.':even?'뒤집기 전후에 비슷한 양의 열을 더했어요.':'뒤집기 전후에 더한 열의 양이 달랐어요.'}`:'';
 return {title:`${mixed} ${r.name}`,ratio,heat,even,order,smooth,color,texture,explanation:[ratio+'.',orderNote,mixingNote,heatingNote].filter(Boolean).join(' ')};
}
function cleanDraft(s){if(!s||!RECIPES.some(r=>r.id===s.recipe)||!['measure','mix','heat','result'].includes(s.phase)||!Array.isArray(s.amounts)||s.amounts.length!==3||s.amounts.some(x=>!Number.isInteger(x)||x<0||x>6)||sum(s.amounts)>12||!Array.isArray(s.order)||s.order.length!==sum(s.amounts)||s.order.some(x=>![0,1,2].includes(x))||s.amounts.some((n,i)=>s.order.filter(x=>x===i).length!==n)||!finite(s.turns,0,30)||!Number.isInteger(s.rotation)||Math.abs(s.rotation)>3||!Number.isInteger(s.circuits)||s.circuits<0||s.circuits>30||s.turns!==s.circuits+Math.abs(s.rotation)/4||!(s.quadrant===null||[0,1,2,3].includes(s.quadrant))||![1,2,3].includes(s.level)||!finite(s.seconds,0,45)||!finite(s.energy,0,135)||!(s.flipEnergy===null||finite(s.flipEnergy,0,s.energy))||typeof s.running!=='boolean')return null;if(s.phase!=='measure'&&s.amounts.some(x=>x===0))return null;if(['heat','result'].includes(s.phase)&&s.turns<1)return null;if(s.phase==='heat'&&s.recipe==='salad')return null;if(s.phase==='result'&&s.recipe!=='salad'&&s.seconds<2)return null;return {recipe:s.recipe,phase:s.phase,amounts:[...s.amounts],order:[...s.order],turns:s.turns,circuits:s.circuits,rotation:s.rotation,quadrant:s.quadrant,level:s.level,seconds:s.seconds,energy:s.energy,flipEnergy:s.flipEnergy,running:false};}
export const cookingSave=(draft,previous=null)=>({version:1,draft:{...draft,amounts:[...draft.amounts],order:[...draft.order],running:false},previous:previous?{...previous,amounts:[...previous.amounts],order:[...previous.order],running:false}:null});
export function validateCookingSave(v){if(v===undefined)return cookingSave(initialCooking());if(!v||v.version!==1)return null;const draft=cleanDraft(v.draft),previous=v.previous===null?null:cleanDraft(v.previous);return draft&&(v.previous===null||previous?.phase==='result')?{version:1,draft,previous}:null;}
