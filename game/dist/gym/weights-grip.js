// A real cylindrical grip below the original, unposed palm surface. Clipping
// complete source triangles to the emitted grip's X span avoids vertex-only
// gaps at its end caps. Both hands share one rigid bar, never independent props.
export const WEIGHTS_GRIP=Object.freeze({innerX:.56,outerX:.78,radius:.035,surfaceGap:.00015});
export function fitWeightsBarRestGrip(positions,index=null){
 if(!positions||positions.length%3)throw TypeError('Original root-space vertices required');
 const count=index?.length??positions.length/3;if(count%3)throw TypeError('Original triangle index required');
 const clip=(polygon,bound,greater)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=p=>greater?p.x>=bound:p.x<=bound,ai=inside(a),bi=inside(b);if(ai)out.push(a);if(ai!==bi){const t=(bound-a.x)/(b.x-a.x);out.push({x:bound,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}}return out;};
 let witness=null,triangles=0;const sides={left:Infinity,right:Infinity};
 for(const sign of[-1,1])for(let i=0;i<count;i+=3){const points=[0,1,2].map(k=>{const id=index?.[i+k]??i+k;if(!Number.isInteger(id)||id<0||id*3+2>=positions.length)throw RangeError('Original triangle index out of range');const p={x:sign*positions[id*3],y:positions[id*3+1],z:positions[id*3+2]};if(!Object.values(p).every(Number.isFinite))throw TypeError('Original vertices must be finite');return p;});
  const polygon=clip(clip(points,WEIGHTS_GRIP.innerX,true),WEIGHTS_GRIP.outerX,false);if(!polygon.length)continue;triangles++;
  for(const p of polygon){const side=sign<0?'left':'right';sides[side]=Math.min(sides[side],p.y);if(!witness||p.y<witness.y)witness={...p,side};}
 }
 if(!witness||!Object.values(sides).every(Number.isFinite))throw Error('Both original palms must intersect the real grip spans');
 return{center:[0,witness.y-WEIGHTS_GRIP.radius-WEIGHTS_GRIP.surfaceGap,witness.z],witness,sides,triangles};
}
