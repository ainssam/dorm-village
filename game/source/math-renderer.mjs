// Shared Node/browser-worker adapter. All glyph outlines come from the pinned local TeX font.
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import {MathJaxTexFont} from '@mathjax/mathjax-tex-font/js/svg.js';
import {validateLatex,CHALK_COLORS} from '../dist/school/math-board-model.js';
let loads=0;mathjax.asyncLoad=()=>{loads++;throw Error('External math resources are disabled');};
const adaptor=liteAdaptor({fontSize:16});RegisterHTMLHandler(adaptor);
const tex=new TeX({packages:['base','ams'],maxBuffer:2048,formatError:(_jax,error)=>{throw Error(error.message);}});
const output=new SVG({fontData:MathJaxTexFont,fontCache:'none',mtextInheritFont:false,merrorInheritFont:false});
const doc=mathjax.document('',{InputJax:tex,OutputJax:output});
export function renderEquation(latex,color='#f2ead5'){
 const check=validateLatex(latex);if(!check.ok)throw Error(check.message);if(!CHALK_COLORS.includes(color))throw Error('Invalid color');
 // MathLive uses mleft/mright; these have the same layout intent here.
 const node=doc.convert(latex.replace(/\\m(left|right)\b/g,'\\$1'),{display:true,em:16,ex:8,containerWidth:1024});
 const svg=adaptor.tags(node,'svg')[0];if(!svg)throw Error('수식을 표시하지 못했어요.');
 const box=adaptor.getAttribute(svg,'viewBox').split(/\s+/).map(Number),width=box[2],height=box[3];if(![width,height].every(v=>Number.isFinite(v)&&v>0)||width>60000||height>30000)throw Error('수식이 너무 커요. 여러 식으로 나누어 주세요.');
 for(const name of ['role','focusable','aria-hidden','style'])adaptor.removeAttribute(svg,name);
 adaptor.setAttribute(svg,'width',String(Math.ceil(width/1000*40)));adaptor.setAttribute(svg,'height',String(Math.ceil(height/1000*40)));
 const g=adaptor.tags(svg,'g')[0];adaptor.setAttribute(g,'fill',color);adaptor.setAttribute(g,'stroke',color);
 const result=adaptor.serializeXML(svg);if(result.length>300000||/<(?:foreignObject|image|text|use|script|a)\b|\s(?:href|xlink:href|on\w+)\s*=/.test(result))throw Error('이 기호는 칠판에 표시할 수 없어요. 수학 기호 버튼을 사용해 주세요.');
 return {svg:result,width:width/1000*40,height:height/1000*40};
}
export const dynamicLoads=()=>loads;
