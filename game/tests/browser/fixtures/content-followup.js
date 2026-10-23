// Real UI, models and persistence. Only the home activities' 3D viewports are
// replaced here; complete WebGL gameplay is a separate manual integration check.
import {setupUI} from '/ui.js';
import {initialProgress,reduceProgress} from '/state/progress.js';
import {loadSave,commitSave} from '/state/save.js';
import {createLearningTools} from '/school/learning-view.js';
import {createCookingController} from '/home/cooking-controller.js';
import {createRobotController} from '/home/robot-controller.js';
import {createBalanceController} from '/home/balance-controller.js';
import {libraryReadingTarget} from '/state/library.js';
import {libraryPoses} from '/world/library-layout.js';
let baseline=loadSave(localStorage),progress=baseline.state??initialProgress(),locked=false;
const transact=action=>{if(window.failSave)return false;const next=reduceProgress(progress,action);const result=commitSave(localStorage,next,baseline);if(result.status!=='saved')throw Error(result.status);baseline=result.baseline;progress=result.savedState;return true;};
const ui=setupUI({getProgress:()=>progress,lock:v=>locked=v,library:transact,interact(){},resetCamera(){}});
const getView=()=>({homeView:{updateBuild(){}},root:{}}),getProgress=()=>progress,discover=id=>transact({type:'DISCOVER',id});
const cooking=createCookingController({ui,getView,getProgress,transact,discover,createSession:()=>({update(){},tick(){},dispose(){}}),createViewport:()=>({render(){},dispose(){}})});
const robot=createRobotController({ui,getView,getProgress,transact,discover,createSession:()=>null,createViewport:()=>({update(){},tick(){},dispose(){}})});
const balance=createBalanceController({ui,getView,getProgress,transact,discover});
const learning=createLearningTools({ui});
window.fixture={ui,cooking,robot,balance,learning,get progress(){return progress},get locked(){return locked},readSelected(){const a=libraryReadingTarget(libraryPoses[0],progress.library);transact({type:'DISCOVER',id:a.discoveryId});transact({type:'READ_BOOK',bookId:a.bookId});}};
function tick(){for(const c of [cooking,robot,balance])c.tick(.05);requestAnimationFrame(tick);}requestAnimationFrame(tick);
document.querySelector('#loading').hidden=true;document.body.dataset.state='ready';
