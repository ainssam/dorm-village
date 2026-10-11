const path=Object.freeze([[-.20,-2.75,0],[.20,-2.75,0],[.85,-3.20,Math.PI/5],[-.65,-3.20,Math.PI/5]].map(([x,z,yaw])=>Object.freeze({x,z,yaw})));
export const MATH_REDPANDA_SPEC=Object.freeze({
 id:'math-redpanda',name:'레서판다 수학 친구',role:'작은 주판 선생님',
 scale:.65,radius:.66,walkRadius:.66,height:1.61961*.65,
 action:'abacus',speed:.23,turnRate:1.8,path,home:path[0],interactionRadius:1.7,
 text:'주판 구슬을 하나씩 세어 보고 있어요. 초록 칠판에 식을 그려 보고, 갈톤보드의 공이 어디에 모이는지도 함께 살펴봐요. 의자에 앉아 천천히 생각해도 좋아요.'
});
export const MATH_RESIDENTS=Object.freeze([MATH_REDPANDA_SPEC]);
export const MATH_REDPANDA_GROUND=Object.freeze({connected:.018,standalone:.031});
// Union of both meshes' all-clip 120 Hz sampled envelopes, with extra padding.
// glTF Y-up, +Z forward. The fixed box avoids scanning skinned vertices each frame.
export const MATH_REDPANDA_BOUNDS=Object.freeze({min:Object.freeze([-.883,-.006,-.496]),max:Object.freeze([.546,1.626,.551])});
export const MATH_REDPANDA_LOD=Object.freeze({farDistance:8.5,nearDistance:6.5,farPixels:90,nearPixels:120,minimumHold:.45,animationDistance:11});
