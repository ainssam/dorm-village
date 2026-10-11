import * as THREE from 'three';
import {SQUARE} from './layout.js';
import {handwritingFont,ensureHandwriting} from '../world/font-ready.js';
import {clayMaterial} from '../world/toy-kit.js';

// Original small canvas illustration, shared by the two outward-facing planes.
// Keep the entire word in the font request so Korean subset faces load together.
export function drawSquareSign(ctx,{lettering=true}={}){
 ctx.clearRect(0,0,512,384);ctx.lineCap='round';ctx.lineJoin='round';
 const oval=(x,y,rx,ry,color,rotation=0)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);ctx.fill();};
 const line=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 ctx.fillStyle='#f9ebc9';ctx.beginPath();ctx.roundRect(5,5,502,374,33);ctx.fill();
 ctx.strokeStyle='#bf9360';ctx.lineWidth=9;ctx.stroke();
 ctx.strokeStyle='#e5cca0';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(22,22,468,340,22);ctx.stroke();
 for(const y of [45,337]){line([[41,y],[91,y-2],[116,y]],'#e9d4aa',3);line([[407,y],[448,y+2],[475,y]],'#e9d4aa',3);}
 for(const x of [29,483]){oval(x,191,5,5,'#b1916c');oval(x-1,189,2,2,'#f4ddb0');}
 if(lettering){ctx.fillStyle='#426851';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=handwritingFont(148);ctx.fillText('체조',256,89,304);}
 // Dormi's original white body, blue curled antenna and blue belly spiral.
 // A single large stretching figure stays accurate and readable at phone size.
 oval(256,339,142,13,'#d5ddb2');
 // Raised soft paws connect visibly to the shoulders in a relaxed V.
 oval(211,263,18,48,'#efe9db',-.70);oval(302,263,18,48,'#efe9db',.70);
 oval(185,226,18,22,'#fffaf0',-.45);oval(328,226,18,22,'#fffaf0',.45);
 oval(256,286,51,49,'#fffaf0');
 oval(231,331,22,13,'#eee4d2');oval(281,331,22,13,'#eee4d2');
 oval(256,228,46,42,'#fffaf0');
 // Tiny soft crown lobes retain the approved toy silhouette without ram horns.
 for(const [x,y,r]of [[225,203,15],[243,190,15],[265,190,15],[286,204,14]])oval(x,y,r,r,'#fffaf0');
 line([[256,190],[251,180],[245,171],[247,160],[256,155],[266,161],[267,171],[260,178],[251,175],[251,168],[257,165],[260,170]],'#5b6fa8',8);
 oval(240,229,4,5,'#52616a');oval(273,229,4,5,'#52616a');
 oval(227,244,8,5,'#e9b1aa');oval(286,244,8,5,'#e9b1aa');
 oval(256,240,3.5,2.7,'#ba8c83');line([[251,248],[256,251],[262,247]],'#8b8680',2.5);
 const spiral=[];for(let i=0;i<=44;i++){const t=i/44*Math.PI*3.4,r=22-i/44*18;spiral.push([256+Math.cos(t)*r,294+Math.sin(t)*r]);}line(spiral,'#6680b4',8);
 // Subtle stretching accents use the scene's quiet garden palette.
 line([[154,230],[145,216]],'#9fac85',5);line([[359,230],[367,216]],'#9fac85',5);
 oval(138,312,10,20,'#b8c79a',-.6);oval(375,312,10,20,'#b8c79a',.6);

}

export function addSquareMarker(parent){
 const s=SQUARE.sign,root=new THREE.Group();root.name=s.id;root.position.set(s.x,0,s.z);root.userData={kind:'exercise-sign',label:'체조',colliderId:s.id,footprint:{x:s.x,z:s.z,hx:s.hx,hz:s.hz,yaw:0}};parent.add(root);
 const wood=clayMaterial('#bc9365'),post=new THREE.Mesh(new THREE.CylinderGeometry(.095,.12,1.56,8),wood);post.name=s.id+'.post';post.position.y=.83;post.castShadow=post.receiveShadow=true;root.add(post);
 const w=s.width/2,h=s.height/2,r=.12,shape=new THREE.Shape();shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
 const board=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,steps:1,curveSegments:3,bevelEnabled:true,bevelSegments:1,bevelSize:.025,bevelThickness:.025}),wood);board.name=s.id+'.board';board.position.set(0,s.y,-.09);board.castShadow=board.receiveShadow=true;root.add(board);
 const canvas=globalThis.document?.createElement?.('canvas');let texture=null;
 if(canvas){canvas.width=512;canvas.height=384;const ctx=canvas.getContext?.('2d');if(ctx){texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;let disposed=false;texture.addEventListener('dispose',()=>disposed=true);const draw=()=>{if(disposed)return;drawSquareSign(ctx);texture.needsUpdate=true;};
  // The painted friends and plaque are available immediately. Avoid rendering
  // fallback Korean glyphs into the first canvas while the whole word loads.
  const fonts=globalThis.document?.fonts;if(!fonts||fonts.check?.(handwritingFont(148),'체조'))draw();else{drawSquareSign(ctx,{lettering:false});texture.needsUpdate=true;ensureHandwriting('체조').then(draw).catch(()=>{});}
 }}
 const geometry=new THREE.PlaneGeometry(s.width-.09,(s.width-.09)*.75),material=new THREE.MeshBasicMaterial({map:texture,color:texture?'#ffffff':'#f9ebc9',transparent:true,alphaTest:.05,toneMapped:false});material.name='square.exercise-sign.paint';
 for(const side of [1,-1]){const face=new THREE.Mesh(geometry,material);face.name=s.id+(side===1?'.front':'.back');face.position.set(0,s.y,side*.117);face.rotation.y=side===1?0:Math.PI;face.userData.label='체조';root.add(face);}
 return root;
}
