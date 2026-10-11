import {validateLatex} from './math-board-model.js';
export function createMathRenderer({WorkerClass=globalThis.Worker,timeout=8000}={}){
 let worker=null,serial=0;const pending=new Map();
 const stop=message=>{worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();};
 return {render(latex,color){const check=validateLatex(latex);if(!check.ok)return Promise.reject(Error(check.message));return new Promise((resolve,reject)=>{if(!worker){try{worker=new WorkerClass(new URL('./math-render-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);data.error?p.reject(Error(data.error)):p.resolve(data.result);};worker.onerror=()=>stop('수식 도구를 불러오지 못했어요. 다시 눌러 주세요.');}catch{reject(Error('수식 도구를 불러오지 못했어요. 최신 브라우저에서 다시 열어 주세요.'));return;}}const id=++serial,timer=setTimeout(()=>stop('수식 표시 시간이 길어졌어요. 식을 짧게 나누어 다시 넣어 주세요.'),timeout);pending.set(id,{resolve,reject,timer});worker.postMessage({id,latex,color});});},dispose:()=>stop('수식 작업이 닫혔어요.')};
}
export async function equationImage(result){const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));try{const image=new Image();image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}}
