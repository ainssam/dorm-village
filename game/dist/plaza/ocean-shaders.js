// Original bounded procedural vista shaders. RawShaderMaterial GLSL3: no engine
// shader-chunk substitutions, texture reads, raymarch loops or render targets.
export const SKY_VERTEX=`
precision highp float;
in vec3 position;
out vec2 vUv;
void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,1.,1.);}
`;
export const WATER_VERTEX=`
precision highp float;
in vec3 position;
uniform mat4 uViewProjection;
out vec3 vWorld;
void main(){vWorld=position;gl_Position=uViewProjection*vec4(position,1.);}
`;
export const BOAT_VERTEX=`
precision highp float;
in vec3 position;
in vec3 color;
uniform mat4 uViewProjection;
uniform mat4 uModel;
out vec3 vColor;
void main(){vColor=color;gl_Position=uViewProjection*uModel*vec4(position,1.);}
`;
const COMMON=`
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHorizon;
uniform float uNight;
uniform float uEvening;
uniform float uDetail;
uniform vec2 uSunUV;
uniform vec3 uZenith;
uniform vec3 uHaze;
uniform vec3 uSunColor;
uniform vec3 uCloudLight;
uniform vec3 uCloudShade;
uniform vec3 uDeepWater;
uniform vec3 uFarWater;
vec3 encode(vec3 c){c=max(vec3(0.),c);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+1.);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float n=.57*noise21(p);p=mat2(1.61,1.18,-1.18,1.61)*p+17.7;n+=.285*noise21(p);if(uDetail>.5)n+=.145*noise21(p*2.01+9.2);else n+=.0725;return n;}
`;
export const SKY_FRAGMENT=COMMON+`
in vec2 vUv;
out vec4 fragColor;
void main(){
 vec2 uv=vUv;float aspect=uResolution.x/max(1.,uResolution.y),height=max(.12,1.-uHorizon),s=clamp((uv.y-uHorizon)/height,0.,1.);
 vec3 col=mix(uHaze,uZenith,pow(s,.60));
 float horizonGlow=exp(-s*9.);col=mix(col,uHaze,horizonGlow*.36);
 vec2 sun=(uv-uSunUV)*vec2(aspect,1.);float radius=mix(.021,.027,uEvening),r=length(sun),aa=max(.0008,1.2/uResolution.y);
 float halo=exp(-r*r/(radius*radius*26.))*(.13+.10*uEvening)*(1.-.55*uNight);
 col+=uSunColor*halo;
 float disk=1.-smoothstep(radius-aa,radius+aa,r);
 float moonRelief=.84+.11*noise21(sun*370.)+.05*noise21(sun*890.);
 vec3 disc=uSunColor*mix(1.18,moonRelief,uNight);col=mix(col,disc,disk);
 if(uNight>.5&&s>.12){vec2 cell=uv*vec2(65.*aspect,52.),id=floor(cell),d=fract(cell)-.5;float pick=step(.986,hash21(id+17.));float star=exp(-dot(d,d)*1100.)*pick*smoothstep(.12,.5,s);col+=vec3(.52,.60,.69)*star*(1.-disk);}
 if(s>.025){
  vec2 p=vec2((uv.x-.5)*aspect,uv.y-uHorizon);
  p.x+=2.6*sin(uTime*.0025);p.y+=.10*(cos(uTime*.0025)-1.);
  vec2 q=p-vec2(-.30,.29);float mass=exp(-dot(q/vec2(.31,.065),q/vec2(.31,.065)))*.78;
  q=p-vec2(-.46,.34);mass+=exp(-dot(q/vec2(.12,.074),q/vec2(.12,.074)))*.62;
  q=p-vec2(-.23,.36);mass+=exp(-dot(q/vec2(.15,.090),q/vec2(.15,.090)))*.75;
  q=p-vec2(-.08,.31);mass+=exp(-dot(q/vec2(.13,.065),q/vec2(.13,.065)))*.55;
  q=p-vec2(.59,.24);mass+=exp(-dot(q/vec2(.35,.040),q/vec2(.35,.040)))*.69;
  q=p-vec2(.41,.27);mass+=exp(-dot(q/vec2(.14,.048),q/vec2(.14,.048)))*.56;
  q=p-vec2(.77,.26);mass+=exp(-dot(q/vec2(.19,.038),q/vec2(.19,.038)))*.58;
  float detail=fbm(p*18.+vec2(10.7,7.1));
  float body=noise21(p*8.+vec2(4.1,10.3));
  float density=smoothstep(.21,.94,mass+.38*(detail-.50)+.24*(body-.50));
  density*=smoothstep(.02,.12,s);
  float lit=clamp(.27+.40*smoothstep(.20,.39,p.y)+.30*detail+.12*body-.17*density,0.,1.);
  vec3 cloud=mix(uCloudShade,uCloudLight,lit);
  cloud+=uSunColor*pow(1.-density,2.)*density*exp(-r*r/.085)*.10;
  col=mix(col,cloud,1.-exp(-density*3.5));
 }
 fragColor=vec4(encode(clamp(col,0.,1.)),1.);
}
`;
export const WATER_FRAGMENT=COMMON+`
in vec3 vWorld;
uniform vec3 uEye;
uniform vec3 uViewDirection;
uniform vec2 uBoatXZ;
uniform float uCoast;
out vec4 fragColor;
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;vec2 worldP=vWorld.xz;
 float d=clamp((worldP.y-uCoast)/235.,0.,1.);
 float below=clamp((uHorizon-uv.y)/max(.2,uHorizon),0.,1.);
 float aspect=uResolution.x/max(1.,uResolution.y);
 vec2 p=vec2((uv.x-.5)*aspect,.80)*8./max(.045,uHorizon-uv.y+.055);
 vec2 drift=vec2(2.*sin(uTime*.05),2.*cos(uTime*.05));
 float warp=(noise21(p*.38+drift*.1)-.5)*1.7;
 float a=dot(p,vec2(.54,.82))+warp-uTime*.55;
 float b=dot(p,vec2(-.87,.43))+noise21(p*.53+17.1)*1.5-uTime*.39;
 float c=dot(p,vec2(2.2,2.85))+warp*2.-uTime*.91;
 float fa=1.-smoothstep(.6,2.5,abs(fwidth(a))),fb=1.-smoothstep(.6,2.5,abs(fwidth(b))),fc=(1.-smoothstep(.5,2.2,abs(fwidth(c))))*mix(.4,1.,uDetail);
 vec2 slope=.125*fa*cos(a)*vec2(.54,.82)+.078*fb*cos(b)*vec2(-.87,.43)+.017*fc*cos(c)*vec2(2.2,2.85);
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y));vec3 v=normalize(-uViewDirection);
 float fresnel=pow(1.-clamp(dot(n,v),0.,1.),5.);
 vec3 col=mix(uDeepWater,uFarWater,pow(d,.70));
 float broad=.046*fa*sin(a)+.030*fb*sin(b);col*=1.+broad;
 vec3 reflection=mix(uHaze,uZenith,clamp(.22+n.z*1.8+n.x*.4,0.,.72));
 col=mix(col,reflection,.07+.15*fresnel);
 float cloudShadow=fbm(worldP*.023+vec2(4.*sin(uTime*.00075),7.1+4.*(cos(uTime*.00075)-1.)));col*=.91+.14*cloudShadow;
 float wobble=.005*sin(p.y*.17-uTime*.21);
 float width=mix(.012,.13,pow(below,.85));float path=exp(-pow((uv.x-uSunUV.x+wobble)/width,2.));
 float mirror=pow(max(0.,dot(n,normalize(vec3(.025,1.,.065)))),180.);
 float scatter=.30+.70*noise21(p*vec2(1.7,.62)+drift);
 float sparkle=path*(.006+mirror*scatter*(.68+.28*uEvening))*mix(.25,1.,fa);
 col+=uSunColor*sparkle*(1.-.35*uNight);
 // Distant light is broadened by haze rather than an outlined stripe.
 col=mix(col,uHaze,smoothstep(.82,1.,d)*.72);
 float boatMark=exp(-pow((worldP.x-uBoatXZ.x)/.13,2.)-pow((worldP.y-uBoatXZ.y-1.2)/2.9,2.));
 col=mix(col,uDeepWater,boatMark*.12);
 fragColor=vec4(encode(clamp(col,0.,1.)),1.);
}
`;
export const BOAT_FRAGMENT=`
precision highp float;
in vec3 vColor;
uniform vec3 uHaze;
uniform float uNight;
out vec4 fragColor;
vec3 encode(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
void main(){vec3 c=mix(vColor,uHaze,.42);c*=mix(1.,.35,uNight);fragColor=vec4(encode(c),1.);}
`;
