import {createSquareSession} from './session.js';
import {createRopeActors} from './rope-actors.js';
import {createRopeView} from './rope-view.js';
import {createRopePhysics} from './rope-physics.js';
import {ROPE_LAYOUT} from './rope-layout.js';
/** Extends the existing exact-restoration square lease, never the source camera. */
export function createRopeSession(options){
 const {rigFactory=createRopeActors,ropeViewFactory=createRopeView,getQuality=()=> 'high'}=options;
 const base=createSquareSession({...options,slots:ROPE_LAYOUT.slots});let alive=true,rig=null,rope=null,physics=null,error=null;
 const current=()=>!options.isCurrent||options.isCurrent();
 function dispose({restore=true}={}){if(!alive)return;alive=false;try{rope?.dispose();rig?.dispose({restore:restore&&current()});}finally{base.dispose({restore:restore&&current()});}}
 function initialize(){if(rig||!base.gathered)return;for(const a of base.actors)a.pose?.reset?.();options.poser.reset();rig=rigFactory({spaceRoot:options.view.root,actors:base.actors});physics=createRopePhysics({gripsAt:rig.gripsAt,contactBoxes:rig.contactBoxes,contactTriangles:rig.contactTriangles});rope=ropeViewFactory(options.view.root,{quality:getQuality()});}
 function advance(dt,state={phase:'gathering'},reduced=false){if(!alive)return;if(!current()){dispose({restore:false});return;}try{if(!base.gathered)base.advance(dt,state,reduced);if(!base.active){error=base.error;dispose();return;}if(!state.paused)initialize();}catch(e){error=e.message||'Rope preparation failed';dispose();}}
 function sync(state){if(!alive||!rig||!current())return;const phase=state.ropePhase??0,jumps={dormi:state.jumpHeight??0,armadillo:state.partnerHeight??0};rig.pose({phase,jumps});rope.setQuality(getQuality());rope.update({phase,grips:rig.readGrips(),axes:rig.readAxes?.()});}
 return{ready:base.ready,advance,sync,dispose,root:base.root,actors:base.actors,get active(){return alive&&base.active;},get gathered(){return base.gathered&&!!rig;},get physics(){return physics;},get error(){return error??base.error;},snapshot:()=>({...base.snapshot(),ropeReady:!!rig,error,rope:rope?.diagnostics()??null})};
}
