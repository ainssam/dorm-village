"""Deterministic original Dormi principal model, approved brown-bear reference.
Blender Z-up/-Y-front, glTF Y-up/+Z-front. Run: blender -b -t 4 --python build_principal.py
"""
import bpy, bmesh, math, json, os, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
ROOT=os.path.dirname(os.path.abspath(__file__))
random.seed(427)
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name,h,rough=.9):
 rgb=[int(h[i:i+2],16)/255 for i in(0,2,4)];linear=lambda x:x/12.92 if x<=.04045 else((x+.055)/1.055)**2.4
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*map(linear,rgb),1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.23;m.diffuse_color=(*map(linear,rgb),1);return m
M={k:mat(k,h,r)for k,h,r in [('Fur warm cinnamon','92603F',.96),('Cream muzzle','E5BF8C',.97),('Inner ears','C49A73',.98),('Cardigan oatmeal','BDA580',.98),('Ribbed trim','B99D76',.98),('Ivory shirt','EAD9B4',.95),('Cocoa nose','67432E',.70),('Round brown glasses','65422E',.54),('Eyes espresso','291A11',.21),('Iris chestnut','7D4F2D',.44),('Catchlights','FFF6D9',.27),('Wood buttons','987044',.80),('Notebook leather','865D3E',.92),('Notebook pages','EDD6AD',.97)]}
F=M['Fur warm cinnamon'];C=M['Cardigan oatmeal'];T=M['Ribbed trim'];CR=M['Cream muzzle'];I=M['Ivory shirt'];D=M['Cocoa nose']
rigids={};weighted=[]
def smooth(o,m):
 o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def ell(name,loc,scale,m,seg=28,rings=18,exp=1):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,radius=1,location=loc);o=bpy.context.object;o.name=name
 for v in o.data.vertices:
  for k in range(3):v.co[k]=math.copysign(abs(v.co[k])**exp,v.co[k])*scale[k]
 return smooth(o,m)

def box(name,loc,scale,m,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('rounded leather edges','BEVEL');b.width=bevel;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);return smooth(o,m)

def curve(name,pts,r,m,res=8,bev=2,cyclic=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=res;cu.bevel_depth=r;cu.bevel_resolution=bev;s=cu.splines.new('BEZIER');s.bezier_points.add(len(pts)-1);s.use_cyclic_u=cyclic
 for p,co in zip(s.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o

def tube(name,pts,radii,m,sides=16):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  t=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized();ref=Vector((0,1,0));ref=Vector((1,0,0))if abs(t.dot(ref))>.95 else ref;u=t.cross(ref).normalized();v=t.cross(u)
  for j in range(sides):vs.append(tuple(Vector(p)+radii[i]*(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v)))
 for i in range(len(pts)-1):
  for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 fs +=[tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*sides+j for j in range(sides))]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return smooth(o,m)

def fuse(name,parts,m,voxel=.009,target=10000):
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0];o.name=name;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 r=o.modifiers.new('continuous plush volume','REMESH');r.mode='VOXEL';r.voxel_size=voxel;r.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=r.name);s=o.modifiers.new('soft blended joins','SMOOTH');s.factor=.66;s.iterations=5;bpy.ops.object.modifier_apply(modifier=s.name)
 tri=sum(len(p.vertices)-2 for p in o.data.polygons);d=o.modifiers.new('mobile silhouette budget','DECIMATE');d.ratio=min(1,target/tri);bpy.ops.object.modifier_apply(modifier=d.name);o.data.materials.clear();o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def tree(o):
 bpy.context.view_layer.update();return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(p.vertices)for p in o.data.polygons])
def front(t,x,z):
 h,n,i,d=t.ray_cast(Vector((x,-4,z)),Vector((0,1,0)),8)
 if h is None:raise Exception(('surface miss',x,z))
 return h.y

def rigid(o,bone):rigids[o]=bone;return o

def smilecurve(name,pts,r,m,t):return rigid(curve(name,[(x,front(t,x,z)-.009,z)for x,z in pts],r,m), 'Head')
# Anatomical core: head/ears/neck/torso/shoulders/paws/feet are ONE manifold volume.
parts=[ell('rounded barrel body',(0,.025,.87),(.46,.31,.52),F,40,28),ell('thick plush neck',(0,.015,1.33),(.30,.255,.31),F),ell('broad friendly head',(0,-.014,1.62),(.432,.325,.383),F,48,32,.94)]
for s in[-1,1]:
 parts.extend([ell('lower cheek',(s*.245,-.014,1.48),(.22,.27,.225),F),ell('ear outer',(s*.352,.007,1.925),(.137,.079,.147),F),ell('round thigh',(s*.226,.018,.42),(.179,.191,.302),F),ell('sturdy lower leg',(s*.23,-.015,.24),(.155,.17,.22),F),ell('broad foot',(s*.232,-.111,.093),(.183,.236,.096),F,32,20)])
 for j in range(3):parts.append(ell('rounded toe',(s*.232+(j-1)*.087,-.264,.070),(.073,.098,.071),F,24,16))
# Bent notebook arm on viewer's left; relaxed hand on viewer's right.
shoulders={'L':(-.37,.01,1.23),'R':(.37,.01,1.23)}
elbows={'L':(-.52,-.04,.99),'R':(.535,.0,.935)}
wrists={'L':(-.425,-.335,.946),'R':(.556,-.105,.676)}
hands={'L':(-.400,-.411,.942),'R':(.553,-.118,.593)}
for side in['L','R']:
 st,el,wr,ha=[d[side]for d in[shoulders,elbows,wrists,hands]];parts+=[ell('soft shoulder',st,(.172,.175,.213),F),tube('continuous arm',[st,el,wr,ha],[.151,.144,.113,.092],F),ell('paw',ha,(.137,.102,.123 if side=='L'else .14),F)]
 if side=='L':parts+=[ell('grip thumb',(-.317,-.45,1.017),(.079,.063,.073),F),ell('lower grip',(-.338,-.47,.902),(.087,.055,.053),F)]
body=fuse('Principal.Body',parts,F,.009,10800);body['role']='Body';weighted.append(body);bt=tree(body)
for s in[-1,1]:rigid(ell('ear inset',(s*.353,-.065,1.926),(.081,.021,.091),M['Inner ears'],28,18), 'Head')
# Full cardigan shell: rounded cross-sections, genuine V opening and blended shoulders.
vs=[];fs=[];N=72;levels=17
for j in range(levels):
 t=j/(levels-1)
 for i in range(N):
  a=i*2*pi/N;frontness=max(0,-sin(a));top=1.35-.31*frontness**5
  z=.526+(top-.526)*t
  rx=.438+.070*sin(pi*t)-.070*t**4;ry=.291+.059*sin(pi*t)-.013*t**3
  vs.append((rx*cos(a),.018+ry*sin(a),z))
for j in range(levels-1):
 for i in range(N):fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
fs.extend([tuple(range(N-1,-1,-1)),tuple((levels-1)*N+i for i in range(N))])
me=bpy.data.meshes.new('tailored round cardigan');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('cardigan shell',me);bpy.context.collection.objects.link(o);smooth(o,C);clothparts=[o]
for side in['L','R']:
 st,el,wr=[d[side]for d in[shoulders,elbows,wrists]]
 cuff=Vector(wr).lerp(Vector(el),.10);clothparts.extend([ell('cardigan shoulder',st,(.181,.184,.215),C),tube('round knitted sleeve',[st,el,tuple(cuff)],[.165,.162,.127],C)])
card=fuse('Principal.Cardigan',clothparts,C,.008,6400);card['role']='Cardigan';weighted.append(card);ct=tree(card)
# Rolled hem is fitted to the same round torso, not a rectangular shell.
pts=[(.448*cos(a),.018+.300*sin(a),.544)for a in[i*2*pi/72 for i in range(72)]]
weighted.append(curve('soft hem piping',pts,.033,T,2,2,True))
# Shirt chest visible in V; small cream collar wings integrate into the neckline.
shirt=ell('ivory shirt chest',(0,-.248,1.198),(.272,.087,.218),I,36,24);weighted.append(shirt)
for s in[-1,1]:
 pts=[(s*.055,-.299,1.353),(s*.17,-.305,1.302),(s*.187,-.343,1.164),(s*.096,-.354,1.235)]
 me=bpy.data.meshes.new('shirt collar');me.from_pydata(pts,[],[(0,1,2,3)]);me.update();o=bpy.data.objects.new('shirt collar',me);bpy.context.collection.objects.link(o);smooth(o,I);bpy.context.view_layer.objects.active=o;sol=o.modifiers.new('thick collar','SOLIDIFY');sol.thickness=.022;bpy.ops.object.modifier_apply(modifier=sol.name);be=o.modifiers.new('collar rounded edges','BEVEL');be.width=.020;be.segments=3;bpy.ops.object.modifier_apply(modifier=be.name);weighted.append(o)
# Rolled shawl collar follows both shoulders and descends to offset front placket.
pts=[(.045,-.346,1.035),(-.14,-.322,1.107),(-.26,-.239,1.22),(-.337,-.112,1.31),(-.333,.070,1.355),(-.22,.236,1.365),(0,.290,1.37),(.22,.236,1.365),(.333,.070,1.355),(.337,-.112,1.31),(.26,-.239,1.22),(.14,-.322,1.107)]
weighted.append(curve('continuous shawl collar',pts,.035,T,10,2,True))
for z in[.617,.754,.891,1.019]:
 y=front(ct,.071,z)-.029
 weighted.append(ell('wood button',(.071,y,z),(.027,.012,.031),M['Wood buttons'],20,12))
 for x in[.064,.078]:weighted.append(ell('button hole',(x,y-.011,z),(.0035,.003,.011),D,10,6))
weighted.append(curve('cardigan placket',[(.041,front(ct,.041,z)-.010,z)for z in[.566,.69,.84,.98,1.04]],.016,T,8,1))
# Fitted ribbed cuff: short integrated oval tube at wrist plane.
for side in['L','R']:
 p=Vector(wrists[side]).lerp(Vector(elbows[side]),.13);axis=(Vector(wrists[side])-Vector(elbows[side])).normalized();u=axis.cross(Vector((1,0,0))).normalized();v=axis.cross(u)
 points=[tuple(p+.129*(cos(a)*u+sin(a)*v))for a in[i*2*pi/40 for i in range(40)]]
 cuff=curve('ribbed cuff '+side,points,.024,T,2,2,True);weighted.append(cuff)
 for i in range(16):
  a=i*2*pi/16;c=p+.133*(cos(a)*u+sin(a)*v);weighted.append(curve('subtle cuff knit',[tuple(c-axis*.024),tuple(c),tuple(c+axis*.024)],.0038,C,1,1))
# Soft projecting cream muzzle, smiling muzzle lobes, nose and friendly eyes.
muzzle=rigid(ell('cream muzzle',(0,-.312,1.454),(.207,.153,.180),CR,40,28), 'Head');mt=tree(muzzle)
for s in[-1,1]:rigid(ell('upper muzzle lobe',(s*.074,-.414,1.497),(.10,.077,.086),CR,28,18), 'Head')
nose=rigid(ell('rounded cocoa nose',(0,-.473,1.554),(.092,.064,.065),D,32,20,.80), 'Head')
for s in[-1,1]:rigid(ell('nostril',(s*.048,-.523,1.543),(.012,.005,.009),M['Eyes espresso'],16,10), 'Head')
smilecurve('smile left',[(-.13,1.438),(-.085,1.419),(-.028,1.416),(0,1.435)],.0055,D,mt)
smilecurve('smile right',[(0,1.435),(.033,1.417),(.087,1.42),(.129,1.442)],.0055,D,mt)
rigid(curve('nose to smile',[(0,-.501,1.510),(0,-.469,1.469),(0,-.465,1.435)],.005,D,8,2),'Head')
for s in[-1,1]:
 x=s*.174;z=1.663;y=front(bt,x,z)-.020
 rigid(ell('soft eye surround',(x,y+.007,z),(.059,.025,.077),CR,28,18),'Head')
 rigid(ell('iris',(x,y-.013,z),(.050,.030,.065),M['Iris chestnut'],28,18),'Head')
 eye=rigid(ell('Eye.'+('L'if s<0 else'R'),(x,y-.034,z+.001),(.037,.026,.048),M['Eyes espresso'],28,18),'Head');eye['role']=eye.name
 rigid(ell('eye highlight',(x-.013,y-.057,z+.026),(.010,.006,.012),M['Catchlights'],16,10),'Head')
 rigid(ell('tiny eye highlight',(x+.014,y-.059,z-.013),(.0045,.003,.005),M['Catchlights'],12,8),'Head')
 smilecurve('kind brow',[(s*.118,1.797),(s*.17,1.817),(s*.226,1.811)],.015,D,bt)
# Connected glasses: rings follow face curvature, bridge touches muzzle sides; temple arms end in head.
glassparts=[]
for s in[-1,1]:
 pts=[]
 for i in range(64):
  a=i*2*pi/64;x=s*.174+.126*cos(a);z=1.661+.139*sin(a);y=front(bt,x,z)-.043
  # lower inner lens naturally sits against cream muzzle root.
  if abs(x)<.22 and 1.30<z<1.63:
   hit,_,_,_=mt.ray_cast(Vector((x,-4,z)),Vector((0,1,0)),8)
   if hit is not None:y=min(y,hit.y-.018)
   for xc in[-.074,.074]:
    v=1-((x-xc)/.10)**2-((z-1.497)/.086)**2
    if v>0:y=min(y,-.414-.077*math.sqrt(v)-.019)
  pts.append((x,y,z))
 glassparts.append(curve('round lens frame',pts,.010,M['Round brown glasses'],2,2,True))
 glassparts.append(curve('glasses temple',[(s*.297,-.299,1.697),(s*.342,-.238,1.699),(s*.37,-.117,1.708),(s*.365,.003,1.697)],.010,M['Round brown glasses'],8,2))
glassparts.append(curve('nose bridge',[(-.048,-.366,1.708),(0,-.397,1.720),(.048,-.366,1.708)],.010,M['Round brown glasses'],10,2))
# join glasses preserve one connected-looking accessory draw.
for o in glassparts:rigid(o,'Head')
# Notebook: one hand holds it at the chest. Entire prop rigidly follows Hand.L.
book=[];loc=Vector((-.347,-.360,1.029));w=.265;h=.448;dep=.073
book.append(box('notebook cream pages',loc,(w-.018,dep,h-.025),M['Notebook pages'],.015))
for s in[-1,1]:book.append(box('notebook leather cover',loc+Vector((0,s*(dep/2+.008),0)),(w,.018,h),M['Notebook leather'],.018))
book.append(box('notebook rounded spine',loc+Vector((-w/2+.014,0,0)),(.035,dep+.027,h),M['Notebook leather'],.016))
# Gold corner ticks subtly distinguish cover from blank block.
for z in[.86,1.20]:book.append(curve('notebook embossed cover',[(x,-.409,z)for x in[-.45,-.347,-.245]],.0028,T,1,1))
for o in book:
 # small tilt into paw, rotated around notebook center.
 for v in o.data.vertices:
  p=o.matrix_world@v.co;d=p-loc;a=-.10;v.co=o.matrix_world.inverted()@(loc+Vector((d.x*cos(a)+d.z*sin(a),d.y,-d.x*sin(a)+d.z*cos(a))))
 rigid(o,'Hand.L')
# Tiny toe creases remain surface details attached to corresponding feet.
for s in[-1,1]:
 for j in[-.043,.043]:rigid(curve('toe crease',[(s*.232+j,-.333,.066),(s*.232+j,-.294,.126),(s*.232+j,-.236,.144)],.0037,D,4,1),'Foot.'+('L'if s<0 else'R'))
# Skeleton includes semantic anchors for runtimes and deterministic animation.
armdata=bpy.data.armatures.new('PrincipalSkeleton');arm=bpy.data.objects.new('Principal.Rig',armdata);bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=armdata.edit_bones[parent]
 return b
bone('Root',(0,0,0),(0,0,.15));bone('Pelvis',(0,.018,.52),(0,.018,.85),'Root');bone('Spine',(0,.018,.85),(0,.018,1.31),'Pelvis');bone('Head',(0,.018,1.31),(0,-.015,1.88),'Spine')
for side,s in[('L',-1),('R',1)]:
 bone('UpperArm.'+side,shoulders[side],elbows[side],'Spine');bone('Forearm.'+side,elbows[side],wrists[side],'UpperArm.'+side);bone('Hand.'+side,wrists[side],hands[side],'Forearm.'+side)
 bone('Thigh.'+side,(s*.226,.018,.52),(s*.232,.009,.267),'Pelvis');bone('Shin.'+side,(s*.232,.009,.267),(s*.232,-.028,.099),'Thigh.'+side);bone('Foot.'+side,(s*.232,-.028,.099),(s*.232,-.265,.07),'Shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT');arm['role']='Rig'
# Smooth local weights. The body is a single watertight mesh; overlapping sleeve volumes are fused.
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def mix(a,b,t):return {a:1-t,b:t}
def weight_point(v):
 x,y,z=v;s='L'if x<0 else'R';ax=abs(x)
 if x<-.24 and y<-.345 and .79<z<1.10:return {'Hand.L':1}
 if x>.4 and .43<z<.68:return {'Hand.R':1}
 if z>1.24:
  return mix('Spine','Head',sm(1.24,1.45,z))
 # sleeve / paw zone, chest stays stable as a tailored torso.
 armw=sm(.315,.455,ax)*(1-sm(1.24,1.42,z))
 base=mix('Pelvis','Spine',sm(.62,1.05,z))
 if z<.59:
  t=sm(.31,.48,z);leg={};leg['Foot.'+s]=1-sm(.095,.175,z);leg['Shin.'+s]=sm(.095,.175,z)*(1-sm(.24,.34,z));leg['Thigh.'+s]=sm(.24,.34,z)
  pelvis=sm(.40,.59,z)*(1-sm(.09,.24,ax)) if ax<.24 else sm(.48,.63,z)
  base={k:v*(1-pelvis)for k,v in leg.items()};base['Pelvis']=pelvis
 if armw>0 and z>.57:
  # nearest point along upper and forearm, smooth elbow articulation.
  st,el,wr=[Vector(d[s])for d in[shoulders,elbows,wrists]];d=Vector(v)
  if s=='L':fore=sm(-.045,-.25,y);hand=sm(-.29,-.405,y)
  else:fore=1-sm(.82,1.055,z);hand=1-sm(.65,.76,z)
  aw={'UpperArm.'+s:1-fore,'Forearm.'+s:fore*(1-hand),'Hand.'+s:fore*hand}
  base={k:w*(1-armw)for k,w in base.items()}
  for k,w in aw.items():base[k]=base.get(k,0)+w*armw
 return base
for o in list(weighted)+list(rigids):
 bpy.context.view_layer.update();mw=o.matrix_world.copy()
 for b in armdata.bones:o.vertex_groups.new(name=b.name)
 for v in o.data.vertices:
  weights={rigids[o]:1}if o in rigids else weight_point(mw@v.co)
  if o in weighted and o!=body and (mw@v.co).z<.72 and (abs((mw@v.co).x)<.47 or o.name.startswith('soft hem')):weights={'Pelvis':1}
  total=sum(weights.values())
  for k,w in weights.items():
   if w>1e-6:o.vertex_groups[k].add([v.index],w/total,'REPLACE')
 o.parent=arm;mod=o.modifiers.new('Principal skin','ARMATURE');mod.object=arm
# Procedural surface warmth is baked to vertex colors and ships in GLB with ordinary PBR.
for o in list(weighted)+list(rigids):
 if o.data.materials[0] not in[F,C,T,CR,M['Inner ears']]:continue
 attr=o.data.color_attributes.new(name='PlushTint',type='BYTE_COLOR',domain='CORNER')
 for p in o.data.polygons:
  for li in p.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co
   # low amplitude, spatially smooth grain avoids cheap large checker patches.
   f=.965+.024*sin(v.x*113+sin(v.z*67))*sin(v.y*103+v.z*83)+.009*sin(v.z*37+v.x*42)
   attr.data[li].color=(f,f,f,1)
# Material-aware joining yields bounded draws without sacrificing facial/prop skin bindings.
meshes=[o for o in bpy.data.objects if o.type=='MESH']
# Preserve standalone main core for topology audit. Other meshes merge by material.
for material in M.values():
 parts=[o for o in bpy.data.objects if o.type=='MESH' and o!=body and o.data.materials[0]==material]
 if len(parts)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name='Principal.'+material.name.replace(' ','_')
# The continuous body and cardigan keep their silhouette budget. Fine accessories use a cheaper LOD.
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 if o==body or o.data.materials[0]==C:continue
 if sum(len(p.vertices)-2 for p in o.data.polygons)>250:
  bpy.context.view_layer.objects.active=o;d=o.modifiers.new('mobile accessory LOD','DECIMATE');d.ratio=.30;bpy.ops.object.modifier_apply(modifier=d.name)

# Semantic anchors, exported as bone-parented empties.
def anchor(name,bn,loc):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.empty_display_size=.03;o['role']=name;o.parent=arm;o.parent_type='BONE';o.parent_bone=bn;bpy.context.view_layer.update();o.matrix_world.translation=Vector(loc);return o
anchor('Anchor.SeatContact','Pelvis',(0,.10,.3616475));anchor('Anchor.RumpContact','Pelvis',(0,.10,.3616475));anchor('Anchor.NotebookGrip','Hand.L',(-.387,-.43,.967));anchor('Anchor.RoleUse','Hand.L',(-.347,-.36,1.029));anchor('Anchor.Head','Head',(0,-.02,1.62))
for side,s in[('L',-1),('R',1)]:anchor('Anchor.Foot.'+side,'Foot.'+side,(s*.232,-.19,0));anchor('Anchor.Hand.'+side,'Hand.'+side,hands[side])
# Animation with safe low-amplitude idle and genuine hip/knee seated articulation.
# Rest +Z local bone axis transformed in armature space; rotate using global X basis.
for pb in arm.pose.bones:pb.rotation_mode='QUATERNION'
from mathutils import Quaternion
def global_rot(name,angle,axis=(1,0,0)):
 pb=arm.pose.bones[name];axis_local=pb.bone.matrix_local.to_3x3().inverted()@Vector(axis);pb.rotation_quaternion=Quaternion(axis_local,angle)
def clear_pose():
 for pb in arm.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
def insert(frame):
 for pb in arm.pose.bones:
  pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=pb.name);pb.keyframe_insert(data_path='location',frame=frame,group=pb.name)
def action(name,frames,pose):
 arm.animation_data_create();arm.animation_data.action=bpy.data.actions.new(name)
 for fr in frames:clear_pose();pose(fr);insert(fr)
 a=arm.animation_data.action
 # glTF NLA export uses these tracks.
 track=arm.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,int(a.frame_range[0]),a);strip.name=name;arm.animation_data.action=None
 return a

def idle(fr):
 t=(fr-1)/120*2*pi;global_rot('Spine',sin(t)*.009, (0,1,0));global_rot('Head',sin(t+.4)*.013,(0,0,1));global_rot('UpperArm.R',sin(t)*.013)
action('Idle',[1,31,61,91,121],idle)
def walk(fr):
 p=(fr-1)/32*2*pi
 for side,offset in[('L',0),('R',pi)]:
  q=p+offset;global_rot('Thigh.'+side,-sin(q)*.27);global_rot('Shin.'+side,max(0,sin(q))*.32);global_rot('Foot.'+side,sin(q)*.27-max(0,sin(q))*.32)
 global_rot('UpperArm.R',sin(p)*.12);global_rot('UpperArm.L',-sin(p)*.025);global_rot('Spine',sin(p)*.015,(0,1,0));arm.pose.bones['Root'].location.y=0
action('Walk',[1,5,9,13,17,21,25,29,33],walk)
def seat(fr):
 for side in['L','R']:global_rot('Thigh.'+side,-1.18);global_rot('Shin.'+side,1.13);global_rot('Foot.'+side,.02)
 global_rot('Spine',-.035)
action('Seated',[1,2],seat)
def read(fr):
 seat(fr);t=(fr-1)/96*2*pi;global_rot('Head',.12+.015*sin(t));global_rot('UpperArm.L',-.035+.012*sin(t));global_rot('Forearm.L',.018);global_rot('UpperArm.R',-.035)
action('DeskRead',[1,25,49,73,97],read)
# Leave neutral rest for straightforward load.
for t in arm.animation_data.nla_tracks:t.mute=True
clear_pose();bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
# Triangulate, validate, and export exact source asset.
def topo(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();components=0
 for v in bm.verts:
  if v in seen:continue
  components+=1;todo=[v];seen.add(v)
  while todo:
   v=todo.pop()
   for e in v.link_edges:
    q=e.other_vert(v)
    if q not in seen:seen.add(q);todo.append(q)
 r={'components':components,'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges)};bm.free();return r
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for p in o.data.polygons:p.use_smooth=True
stats={'id':'principal-bear','triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in meshes),'mesh_objects':len(meshes),'materials':len(M),'central_body_topology':topo(body),'cardigan_topology':topo(card)if card.name in bpy.data.objects else None,'animations':['Idle','Walk','Seated','DeskRead'],'bones':list(armdata.bones.keys()),'front':'+Z','up':'+Y'}
vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];stats['bounds_blender']={'min':[min(v[k]for v in vs)for k in range(3)],'max':[max(v[k]for v in vs)for k in range(3)]}
assert stats['central_body_topology']=={'components':1,'boundary_edges':0,'nonmanifold_edges':0},stats
# Unmute only during exporting separate NLA animations.
for t in arm.animation_data.nla_tracks:t.mute=False
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=ROOT+'/principal-bear-low.glb',export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_skins=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_attributes=True)
for t in arm.animation_data.nla_tracks:t.mute=True
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/principal-bear.blend');stats['bytes']=os.path.getsize(ROOT+'/principal-bear-low.glb');open(ROOT+'/principal-bear.json','w').write(json.dumps(stats,indent=2));print('PRINCIPAL_READY',json.dumps(stats),flush=True)
