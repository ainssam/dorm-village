const frozen=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))frozen(v);Object.freeze(x);}return x;};
export const SQUARE=frozen({
 clearing:{center:[0,1],radius:5.5,surfaceY:.043,edgeSegments:20},
 // One physical sign, four clear face/side approaches, and one existing action.
 sign:{id:'square.exercise-sign',x:2.6,z:5.15,y:1.42,width:1.4,height:1.05,hx:.73,hz:.14},
 control:{id:'courtyard.group-activities',type:'squareGroup',at:{x:2.55,z:6.05},approaches:[{x:2.55,z:6.05},{x:2.6,z:4.2},{x:1.1,z:5.15},{x:4.1,z:5.15}],radius:1.15,label:'친구들과 광장 체조하기'},
 guestIds:['athletic-turtle','capybara','armadillo'],
 slots:[{id:'dormi',x:-1.7,z:1.5,radius:.75,yaw:0},{id:'athletic-turtle',x:1.7,z:1.5,radius:.75,yaw:0},{id:'capybara',x:-1.7,z:-.2,radius:.75,yaw:0},{id:'armadillo',x:1.7,z:-.2,radius:.75,yaw:0}],
 bays:[{id:'athletic-turtle',x:-4.2,z:4.7},{id:'capybara',x:4.2,z:4.7},{id:'armadillo',x:4.5,z:-.4}],floorY:.05,
});
