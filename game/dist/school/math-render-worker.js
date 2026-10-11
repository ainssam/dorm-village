import {renderEquation} from '../vendor/mathjax/renderer.mjs';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,result:renderEquation(data.latex,data.color)});}catch{self.postMessage({id:data.id,error:'수식의 괄호·빈칸·명령을 확인해 주세요. 너무 긴 식은 나누어 주세요.'});}};
