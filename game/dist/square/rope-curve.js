// Shared physical/render curve in plaza-local units. Endpoints are measured palms.
export const ROPE_RADIUS=.025,ROPE_FLOOR=.043,ROPE_BOW=1.95;
export function sampleRopeCurve(grips,phase,out,{segments=128}={}){
 if(!Array.isArray(grips)||grips.length!==2||!grips.every(p=>p.length===3&&p.every(Number.isFinite))||!Number.isFinite(phase)||!Number.isInteger(segments)||segments<4)throw new TypeError('Finite rope grips/phase and integer segment count required');
 out??=new Float64Array((segments+1)*3);if(out.length!==(segments+1)*3)throw new RangeError('Rope sample buffer length');
 const [a,b]=grips,dx=b[0]-a[0],dz=b[2]-a[2],span=Math.hypot(dx,dz);if(span<.1)throw new RangeError('Rope holders must be distinct');const tx=-dz/span,tz=dx/span,sy=Math.cos(phase)*ROPE_BOW,sz=Math.sin(phase)*ROPE_BOW;
 for(let i=0;i<=segments;i++){const u=i/segments,k=i*3;if(i===0||i===segments){const p=i===0?a:b;out[k]=p[0];out[k+1]=p[1];out[k+2]=p[2];continue;}const bow=Math.sin(u*Math.PI);out[k]=a[0]+dx*u+tx*sz*bow;out[k+1]=Math.max(ROPE_FLOOR+ROPE_RADIUS,a[1]+(b[1]-a[1])*u+sy*bow);out[k+2]=a[2]+dz*u+tz*sz*bow;}
 return out;
}
