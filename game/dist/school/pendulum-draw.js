const FONT='"Dormi Gentle Pen", sans-serif';
export function pendulumBob(s){const length=s.settings.length*136;return{x:360+Math.sin(s.theta)*length,y:57+Math.cos(s.theta)*length};}
export function drawPendulum(ctx,s){const bob=pendulumBob(s);ctx.clearRect(0,0,720,390);ctx.fillStyle='#f1eddb';ctx.fillRect(0,0,720,390);
 // A fixed metre scale makes length comparisons visually honest. Bob size is schematic.
 ctx.strokeStyle='#d3d4bc';ctx.lineWidth=1;for(let y=57;y<=329;y+=34){ctx.beginPath();ctx.moveTo(118,y);ctx.lineTo(600,y);ctx.stroke();}
 ctx.fillStyle='#647664';ctx.font=`700 18px ${FONT}`;ctx.textAlign='right';for(let i=0;i<=4;i++)ctx.fillText((i*.5).toFixed(1)+' m',109,64+i*68);
 ctx.fillStyle='#8ca599';ctx.fillRect(185,37,355,17);ctx.fillStyle='#59766b';ctx.fillRect(353,3,14,34);
 ctx.setLineDash([5,6]);ctx.strokeStyle='#94a89b';ctx.beginPath();ctx.moveTo(360,57);ctx.lineTo(360,337);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#a6b9a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(360,57,s.settings.length*136,Math.PI/2-Math.PI/3,Math.PI/2+Math.PI/3);ctx.stroke();
 ctx.strokeStyle='#aeb398';ctx.beginPath();ctx.arc(360,57,50,Math.PI/2-s.settings.angle*Math.PI/180,Math.PI/2);ctx.stroke();
 ctx.strokeStyle='#45695e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(360,57);ctx.lineTo(bob.x,bob.y);ctx.stroke();ctx.fillStyle='#45695e';ctx.beginPath();ctx.arc(360,57,7,0,Math.PI*2);ctx.fill();
 const radius=13+4*s.settings.mass;ctx.fillStyle='#b4813b';ctx.beginPath();ctx.arc(bob.x,bob.y+3,radius+1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e2b857';ctx.beginPath();ctx.arc(bob.x,bob.y,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f9da8d';ctx.beginPath();ctx.arc(bob.x-5,bob.y-6,5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#2c5c4d';ctx.fillRect(342,57+s.settings.length*136+radius+7,36,9);ctx.font=`700 20px ${FONT}`;ctx.textAlign='center';ctx.fillText(s.phase==='ready'?'추를 오른쪽으로 끌어 각도를 바꿔요':'중앙 센서 · 오른쪽 → 왼쪽 통과',360,384);

}
export function drawPendulumGraph(ctx,s,reference=null,displayWidth=720){const w=720,h=270,x0=76,x1=697,y0=70,y1=207,range=Math.max(15,Math.ceil(Math.max(s.settings.angle,reference?.settings.angle??0)/15)*15),x=t=>x0+t/10*(x1-x0),y=a=>(y0+y1)/2-a/range*(y1-y0)/2;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fffbec';ctx.fillRect(0,0,w,h);ctx.font=`700 ${Math.min(36,Math.max(18,18*720/displayWidth))}px ${FONT}`;ctx.textAlign='right';ctx.fillStyle='#5c7366';ctx.strokeStyle='#d8dece';ctx.lineWidth=1;for(const a of[-range,0,range]){ctx.beginPath();ctx.moveTo(x0,y(a));ctx.lineTo(x1,y(a));ctx.stroke();ctx.fillText(String(a),x0-10,y(a)+6);}ctx.textAlign='center';for(let t=0;t<=10;t+=2){ctx.beginPath();ctx.moveTo(x(t),y0);ctx.lineTo(x(t),y1);ctx.stroke();ctx.fillText(String(t),x(t),240);}ctx.textAlign='left';ctx.fillText('각도 (°)',10,32);ctx.textAlign='right';ctx.fillText('시간 (s)',704,269);
 const line=(points,color,dash=[])=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>(i?ctx.lineTo:ctx.moveTo).call(ctx,x(p.time),y(p.angle)));ctx.stroke();ctx.setLineDash([]);};if(reference)line(reference.samples,'#ad7a4d',[7,5]);line(s.samples,'#2e7460');ctx.fillStyle='#2e7460';for(const t of s.crossings){ctx.beginPath();ctx.arc(x(t),y(0),4,0,Math.PI*2);ctx.fill();}
}
