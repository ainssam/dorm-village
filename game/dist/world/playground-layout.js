// One physical description is shared by character posing, seats and ride motion.
export const DORMI_SEAT_CONTACT=.14111661911010742;
export const SWING={x:1.7,z:-1.85,pivotY:2.85,seatTop:.8,grip:{x:.605,y:.825,z:.06}};
export const SEESAW={x:3,z:2.15,pivotY:.72,seatOffset:1.45,seatTop:.855,gripForward:.39,gripHeight:1.244,visitorHome:{x:5.95,z:2.15,yaw:-Math.PI/2},visitorSeatContact:.145};
export const SLIDE={x:-2.65,platformZ:-1.75,platformY:1.55,startZ:-1.05,endZ:1.75,endY:.24,entryZ:-5.65,exitZ:3.1,steps:Array.from({length:4},(_,i)=>({z:-4.58+i*.72,y:(i+1)*.375}))};

SLIDE.footprint={x:SLIDE.x,z:(SLIDE.steps[0].z-.36+SLIDE.endZ+.58)/2,hx:1.05,hz:3.635};
