// A checked high-school example, shared by the 3D chalkboard and its drawing surface.
export const MATH_LESSON=Object.freeze({interval:[-1,4],vertex:[1,-4],minimum:-4,maximum:5,circleRadius:5,circleIntersections:[[-4,3],[4,3]]});
export function drawMathLesson(ctx,width=720,height=440){
 ctx.save();ctx.scale(width/720,height/440);ctx.fillStyle='#275b45';ctx.fillRect(0,0,720,440);ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.lineCap='round';
 const text=(t,x,y,size=18,color='#f1edce')=>{ctx.fillStyle=color;ctx.font=`700 ${size}px "Dormi Gentle Pen", sans-serif`;ctx.fillText(t,x,y);};
 const line=(x,y,x2,y2,color='#abc6ad',w=1.5)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
 const dot=(x,y,color='#f0cc75')=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();};
 text('01  이차함수의 최댓값·최솟값',24,36,20,'#f0cc75');text('02  원과 직선의 교점',384,36,20,'#f0cc75');line(360,20,360,418,'#638875',1);
 text('y = x² − 2x − 3 = (x − 1)² − 4',24,72,20);text('−1 ≤ x ≤ 4',24,103,18,'#b5d5c2');
 // Labelled axes and endpoints (−1,0), (4,5), vertex (1,−4).
 const X=x=>110+x*39,Y=y=>264-y*23;
 line(53,Y(0),316,Y(0));line(X(0),134,X(0),371);text('x',320,Y(0)+6,15);text('y',X(0)-5,130,15);
 for(const x of [-1,1,2,3,4]){line(X(x),Y(0)-3,X(x),Y(0)+3);text(String(x),X(x)-6,Y(0)+19,14,'#c1d5bd');}
 for(const y of [-4,5]){line(X(0)-3,Y(y),X(0)+3,Y(y));text(String(y),X(0)-27,Y(y)+5,14,'#c1d5bd');}
 ctx.strokeStyle='#f1edce';ctx.lineWidth=2.7;ctx.beginPath();for(let i=0;i<=100;i++){const x=-1+i*.05,y=(x-1)**2-4;i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y));}ctx.stroke();
 for(const [x,y]of[[-1,0],[1,-4],[4,5]])dot(X(x),Y(y));line(X(1),Y(-4),X(1),Y(0),'#6e977e',1);text('(1, −4)',X(1)+12,Y(-4)-8,16);text('(4, 5)',X(4)-52,Y(5)-13,16);
 text('최솟값 −4 (x = 1)',24,402,18,'#f0cc75');text('최댓값 5 (x = 4)',197,402,18,'#f0cc75');
 text('x² + y² = 25,  y = 3',384,72,21);text('x² = 25 − 9 = 16',384,103,18,'#b5d5c2');
 const cx=544,cy=261,r=106;line(411,cy,681,cy);line(cx,133,cx,390);text('x',684,cy+5,15);text('y',cx-5,130,15);
 ctx.strokeStyle='#f1edce';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
 const yy=cy-r*3/5;line(415,yy,676,yy,'#f0cc75',2.5);text('y = 3',614,yy-13,17,'#f0cc75');for(const x of [-4,4])dot(cx+r*x/5,yy);
 text('−4',cx-r*4/5-13,cy+21,15);text('4',cx+r*4/5-3,cy+21,15);text('O',cx+6,cy+19,14);text('두 교점: (−4, 3), (4, 3)',384,402,19,'#f0cc75');ctx.restore();
}
