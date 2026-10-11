// A small public noticeboard in the grass wedge between school and home.
// The whole visible wood structure fits the one solid collision footprint.
const transform=Object.freeze({x:-2.1,z:-6.4,yaw:0});
export const NOTICEBOARD=Object.freeze({id:'noticeboard',geometryKey:'noticeboard',transform,footprint:Object.freeze({hx:1.30,hz:.38}),interaction:Object.freeze({id:'courtyard.noticeboard',type:'villageTool',tool:'noticeboard',at:Object.freeze({x:-2.1,z:-5.13}),radius:1.12,requiresClearApproach:true,label:'마을 게시판 읽기'})});
