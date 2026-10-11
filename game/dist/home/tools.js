import {createCookingController} from './cooking-controller.js';
import {createBalanceController} from './balance-controller.js';
import {createRobotController} from './robot-controller.js';
export function createHomeTools(options){
 const {createCooking=createCookingController,createRobot=createRobotController,createBalance=createBalanceController}=options;
 const cooking=createCooking(options),robot=createRobot(options),balance=createBalance(options);
 return {open(target){if(target.tool==='cook')return cooking.open();if(target.tool==='code')return robot.open();if(target.tool==='blocks')return balance.open();return false;},get robotActive(){return robot.active;},get cookingActive(){return cooking.active;},tick(dt){cooking.tick(dt);robot.tick(dt);balance.tick(dt);},cookingSnapshot:()=>cooking.snapshot(),buildSnapshot:()=>balance.snapshot(),robotSnapshot:()=>robot.snapshot(),cancel(){cooking.close();balance.close();robot.close();}};
}
