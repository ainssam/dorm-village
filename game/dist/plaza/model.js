import {SHOW_DURATION} from './night-model.js';
export {SHOW_DURATION};
export class PlazaSession{
 constructor(){this.burning=false;this.fireworks=null;this.clock=0;this.alive=true;}
 toggleFire(){if(!this.alive)return false;this.burning=!this.burning;return this.burning;}
 startFireworks(){if(!this.alive||this.fireworks)return false;this.fireworks={elapsed:0};return true;}
 stopFireworks(){this.fireworks=null;}
 tick(dt,{paused=false}={}){if(!this.alive||paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);this.clock+=dt;if(this.fireworks){this.fireworks.elapsed+=dt;if(this.fireworks.elapsed>=SHOW_DURATION)this.fireworks=null;}}
 snapshot(){return {burning:this.burning,clock:this.clock,fireworks:this.fireworks?{...this.fireworks}:null};}
 dispose(){this.alive=false;this.burning=false;this.fireworks=null;}
}
