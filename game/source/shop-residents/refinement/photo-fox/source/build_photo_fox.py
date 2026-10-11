"""Faithful photo-fox refinement. Original analytic geometry, no remeshing/textures.
Reproduce: blender -b -t 4 --python source/build_photo_fox.py
Coordinates: authored Y up / +Z forward. Only ../output is written.
"""
from pathlib import Path
import hashlib,sys
BASE=Path(__file__).resolve().parent
OUT=BASE.parent/'output';OUT.mkdir(exist_ok=True)
SRC=BASE/'baseline_shop_generator.py'
text=SRC.read_text();cut=text.index('stats={}')
exec(compile(text[:cut],str(SRC),'exec'),globals())
import bmesh
ROOT=str(OUT)
# Original palette, creation helpers, and camera retain their authored provenance.
start=text.index(' bpy.ops.wm.read_factory_settings(use_empty=True);M={}',cut)
end=text.index(' root=group(id)',start)
kind='fox';id='photo-fox'
exec(compile('\n'.join(l[1:] for l in text[start:end].splitlines()),str(SRC)+'[palette]','exec'),globals())
_original_ell=ell
_original_tube=tube

def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 detail=any(k in name.lower() for k in ['eye','nose','lens','shutter'])
 seg=min(seg,24 if detail else 16);rings=min(rings,12 if detail else 10)
 return _original_ell(name,at,scale,material,parent,role,seg,rings,exp,pear)

def tube(name,points,r,material,parent,role=None,sides=8):
 return _original_tube(name,points,r,material,parent,role,min(sides,18))

def tint_surface(obj,name,colors):
 """Attach actual per-vertex linear RGB, exported by glTF as COLOR_0."""
 color=obj.data.color_attributes.new(name=name,type='FLOAT_COLOR',domain='POINT')
 for c,rgb in zip(color.data,colors):c.color=(*rgb,1)
 m=mat(name,'FFFFFF',.74);nodes=m.node_tree.nodes
 vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name=name
 m.node_tree.links.new(vertex.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
 obj.data.materials.clear();obj.data.materials.append(m)

def rgb(material):return tuple(material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)[:3]
def mix(a,b,w):return tuple(a[k]*(1-w)+b[k]*w for k in range(3))
def smooth(a,b,x):t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def head_width(y):
 h=max(-1,min(1,y/.34));r=sqrt(max(0,1-h*h))
 return .420*r*(1-.08*h+.035*math.exp(-((y+.09)/.10)**2))
def head_base(y):return .290*sqrt(max(0,1-(y/.34)**2))
def snout(x,y):
 # Cheeks and tapering muzzle belong to the skull surface, not attached discs.
 return .062*math.exp(-(x/.17)**2-((y+.068)/.11)**2)+.011*math.exp(-((abs(x)-.265)/.10)**2-((y+.105)/.11)**2)
def head_surf(x,y):
 w=head_width(y);front=sqrt(max(0,1-(x/max(w,.00001))**2))
 return head_base(y)*front+snout(x,y)*front**3

def fox_head(head):
 vs=[];fs=[];colors=[];S=48;R=34
 for j in range(R+1):
  for i in range(S):
   a=i/S*2*pi;f=max(0,sin(a))
   # Place two topology rows on the cream-mask edge, so its curve remains smooth
   # at low-poly density instead of stair-stepping across a latitude grid.
   limit=-.02
   for iteration in range(4):
    xx=abs(head_width(limit)*cos(a));limit=-.043+.075*(xx/.435)**1.5+.004*sin(xx*43)
   lo=math.asin((limit-.004)/.34);hi=math.asin((limit+.004)/.34)
   if j<=16:lat=-pi/2+(lo+pi/2)*j/16
   else:lat=hi+(pi/2-hi)*(j-17)/(R-17)
   y=.34*sin(lat);x=head_width(y)*cos(a);z=head_base(y)*sin(a)+snout(x,y)*f**3
   cream_w=(1-smooth(limit-.004,limit+.004,y))*smooth(-.01,.15,z)
   c=mix(rgb(fur),rgb(cream),cream_w)
   blush_w=.30*math.exp(-((abs(x)-.268)/.071)**2-((y+.077)/.055)**2)*f**7
   c=mix(c,rgb(blush),blush_w);colors.append(c);vs.append((x,y,z))
 for j in range(R):
  for i in range(S):
   a=j*S+i;b=j*S+(i+1)%S;fs.append((a,a+S,b+S,b))
 o=mesh('Fox continuous cheek and snout',vs,fs,fur,head,role='Head');tint_surface(o,'Fox integrated cream mask and blush',colors)
 return o

def fox_face(head):
 for s,side in [(-1,'L'),(1,'R')]:
  x=s*.144;y=.032
  eye=ell('Fox inset eye '+side,(x,y,head_surf(x,y)+.004),(.029,.042,.019),dark,head,seg=24,rings=16,exp=1)
  ell('Fox eye catchlight '+side,(-.007,.012,.017),(.006,.008,.003),ivory,eye,seg=12,rings=8,exp=1)
  pts=[];rs=[]
  for i in range(13):
   t=i/12;x=s*(.132+.054*t);y=.147+.017*sin(pi*t);pts.append((x,y,head_surf(x,y)+.003));rs.append(.002+.004*sin(pi*t)**.8)
  tube('Fox soft eyebrow '+side,pts,rs,brownnose,head,sides=6)
 nose=ell('Fox tapering cocoa nose',(0,-.039,head_surf(0,-.039)+.014),(.041,.026,.025),brownnose,head,seg=24,rings=16,exp=.96)
 for v in nose.data.vertices:v.co.x*=1+.26*v.co.z/.026
 ell('Fox nose catchlight',(-.009,-.03,head_surf(0,-.039)+.034),(.009,.004,.003),tan,head,seg=12,rings=8)
 for s in [-1,1]:
  pts=[];rs=[]
  for i in range(19):
   t=i/18;x=s*.088*t;y=-.065-.033*sin(pi*t*.93);pts.append((x,y,head_surf(x,y)+.004));rs.append(.0025+.0015*sin(pi*t))
  tube('Fox gentle smile '+str(s),pts,rs,brownnose,head,sides=6)

# Leaf with broad buried root, curved cup and a single tapered point.
def fox_ear(head,s,side):
 g=group('Ear.'+side,head,(s*.247,.164,-.038))
 S=18;R=20;vs=[];fs=[];colors=[]
 for j in range(R+1):
  t=j/R;y=.410*t
  width=.116*(1-t)**.65*(.72+.28*sin(min(1,t*3)*pi/2))
  depth=.066*(1-t)**.73
  cx=s*.080*t**1.25;cz=.004+.008*sin(pi*t)
  for i in range(S):
   a=i/S*2*pi;x=cx+width*cos(a);z=cz+depth*sin(a)
   # A shallow physical depression makes the cream inner cup sit inside its rim.
   z-=.55*depth*max(0,sin(a))**4*smooth(.10,.22,t)*(1-smooth(.78,.86,t))
   vs.append((x,y,z))
   col=mix(rgb(fur),rgb(accent),smooth(.72,.84,t))
   # Recessed inner cream is part of the same cup. Broad outer rim stays rust/dark.
   inner=smooth(.10,.22,t)*(1-smooth(.78,.86,t))*smooth(.48,.73,sin(a))
   col=mix(col,rgb(cream),inner);colors.append(col)
 for j in range(R):
  for i in range(S):a=j*S+i;b=j*S+(i+1)%S;fs.append((a,a+S,b+S,b))
 fs.append(tuple(range(S-1,-1,-1)))
 o=mesh('Fox embedded cupped ear '+side,vs,fs,fur,g);tint_surface(o,'Fox ear cup and dark tips',colors)
 # root is volumetrically inside the head; inner cream carries no floating shell.
 return g

def torso(body):
 # Rounded neck joins behind the jaw. Ivory is the shirt/belly, rust shows lower hips.
 o=_original_ell('Fox rounded shirt torso',(0,.6235,0),(.285,.4165,.239),ivory,body,'Body',32,24,1,.14)
 return o

def fox_arm(work,s,side):
 pivot=(s*.22,.135,.008);g=group('Arm.'+side,work,pivot)
 # Buried shoulder bends forward into a broad, camera-contact paw.
 A=(-s*.12,-.002,-.025);B=(s*.16,-.16,.145);C=(-s*.026,-.132,.351)
 pts=[];rs=[];N=24;S=16
 for i in range(N+1):
  t=i/N;pts.append(tuple((1-t)**2*A[k]+2*t*(1-t)*B[k]+t*t*C[k]for k in range(3)))
  r=.073+.020*sin(pi*t)**.8+.010*math.exp(-((t-.80)/.16)**2)
  if t<.10:r*=.6+.4*t/.10
  if t>.90:r*=sqrt(max(0,1-((t-.90)/.10)**2))
  rs.append(max(.0003,r))
 o=tube('Fox continuous sleeve and gripping paw '+side,pts,rs,accent,g,sides=S)
 o.data.materials.append(ivory)
 for poly in o.data.polygons:
  if poly.index<13*S:poly.material_index=1
 # Thumb rests across front outer edge of camera, never across the lens.
 ell('Fox camera thumb '+side,(-s*.026,-.100,.373),(.055,.031,.031),accent,g,seg=16,rings=10,exp=1)
 return g

def fox_leg_and_foot(root,body,s,side):
 leg=group('Leg.'+side,body,(s*.15,.23,-.012))
 ell('Fox soft tapered ankle '+side,(0,0,0),(.112,.164,.112),fur,leg,seg=24,rings=16,exp=1)
 f=group('Foot.'+side,root,(s*.15,.075,.07))
 ell('Fox dark rounded paw '+side,(0,0,0),(.115,.075,.141),accent,f,seg=24,rings=16,exp=.96)
 for n in [-1,1]:
  x=n*.034;pts=[]
  for j in range(7):
   y=-.009-.032*j/6;z=.141*sqrt(max(0,1-(y/.075)**2-(x/.115)**2))+.001
   pts.append((x,y,z))
  tube('Fox fine toe crease '+side+str(n),pts,.0017,brownnose,f,sides=6)

# Tail attachment is centered on the rump; profile turns left only behind the hips.
def fox_tail(body):
 A=(0,.37,-.163);B=(0,.19,-.415);C=(-.53,.31,-.43);D=(-.42,.84,-.295)
 g=group('Tail',body,A);pts=[];rs=[];N=36;S=18
 for i in range(N+1):
  t=i/N;point=tuple((1-t)**3*A[k]+3*(1-t)**2*t*B[k]+3*(1-t)*t*t*C[k]+t**3*D[k]for k in range(3))
  r=.080*(1-t)**.85+.126*sin(pi*t)**1.10
  if t>.90:r*=sqrt(max(0,1-((t-.90)/.10)**2))
  pts.append(tuple(point[k]-A[k]for k in range(3)));rs.append(max(.0003,r))
 o=tube('Fox rooted fluffy cream-tip plume',pts,rs,fur,g,sides=S)
 colors=[]
 for i in range(N+1):
  t=i/N
  for j in range(S):
   edge=.713+.012*sin(j/S*6*pi)
   colors.append(mix(rgb(fur),rgb(cream),smooth(edge-.012,edge+.012,t)))
 tint_surface(o,'Fox plume rust and cream',colors)
 return g

def body_surf(x,y):
 h=(y-.6235)/.4165;r=sqrt(max(0,1-h*h));rx=.285*r*(1-.14*h);rz=.239*r*(1-.14*h)
 return rz*sqrt(max(0,1-(x/max(.00001,rx))**2))

def cloth_patch(name,s,x0,x1,y0,y1,material,parent,role=None):
 vs=[];fs=[];R=9;C=6
 for j in range(R+1):
  t=j/R;y=y0+(y1-y0)*t
  # Shoulder taper and lower open-center flare are tailored to the torso.
  for i in range(C+1):
   u=i/C;x=s*(x0+(x1-x0)*u)
   if y>.80:x*=1-.15*(y-.80)/.11
   z=body_surf(x,y)+(.016 if 'pocket' in name else .010);vs.append((x,y,z))
 for j in range(R):
  for i in range(C):a=j*(C+1)+i;fs.append((a,a+1,a+C+2,a+C+1))
 o=mesh(name,vs,fs,material,parent,role=role)
 sol=o.modifiers.new('Fitted fabric thickness','SOLIDIFY');sol.thickness=.008
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
 return o

def fox_vest(body):
 for s,side in [(-1,'L'),(1,'R')]:
  cloth_patch('Fox fitted blue vest '+side,s,.084,.246,.408,.910,clothing,body,'Vest.'+side)
  # Round blue side/back shell joins the front panels without a block edge.
  vs=[];fs=[];S=24;R=12
  for j in range(R+1):
   t=j/R;y=.412+.48*t;h=(y-.6235)/.4165;r=sqrt(max(0,1-h*h));rx=.285*r*(1-.14*h)+.012;rz=.239*r*(1-.14*h)+.012
   for i in range(S+1):
    a=.67+(2*pi-1.34)*i/S
    vs.append((rx*sin(a),y,rz*cos(a)))
  for j in range(R):
   for i in range(S):a=j*(S+1)+i;fs.append((a,a+1,a+S+2,a+S+1))
  if s<0:
   shell=mesh('Fox curved vest back',vs,fs,clothing,body)
   sol=shell.modifiers.new('Cloth shell','SOLIDIFY');sol.thickness=.006;bpy.context.view_layer.objects.active=shell;bpy.ops.object.modifier_apply(modifier=sol.name)
  # Pockets follow the same torso curvature, not rectangular blocks.
  cloth_patch('Fox inset vest pocket '+side,s,.14,.233,.474,.547,clothing,body)
  for y in [.563,.737]:ell('Fox antique vest button '+side+str(y),(s*.101,y,body_surf(s*.101,y)+.020),(.010,.010,.005),brass,body,seg=12,rings=8)
  # Collar is a thin fitted triangular fold with softened corners.
  points=[(s*.020,.960,.147),(s*.063,.970,.153),(s*.155,.912,.185),(s*.096,.873,.206)]
  col=mesh('Fox folded linen collar '+side,points,[(0,1,2,3)],ivory,body)
  sol=col.modifiers.new('Thin collar fold','SOLIDIFY');sol.thickness=.010;bpy.context.view_layer.objects.active=col;bpy.ops.object.modifier_apply(modifier=sol.name)
  bevel=col.modifiers.new('Soft collar edge','BEVEL');bevel.width=.009;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
  tube('Fox fitted camera strap '+side,[(s*.154,.936,.125),(s*.184,.874,.216),(s*.179,.789,.283),(s*.166,.740,.349),(s*.160,.700,.365)],.011,leather,body,sides=8)

root=group(id);root['species']=id;root['version']=2
body=group('BodyRig',root);work=group('WorkRig',body,(0,.70,0));head=group('HeadRig',body,(0,1.25,0))
torso(body);fox_head(head);fox_face(head)
for s,side in [(-1,'L'),(1,'R')]:fox_ear(head,s,side);fox_arm(work,s,side);fox_leg_and_foot(root,body,s,side)
for n in range(2):
 curve('Fox swept forehead tuft '+str(n),(-.070+n*.060,.316,.026),(-.035+n*.065,.369,.022),(.030+n*.048,.320,.062),[.003+.015*sin(pi*i/20)**.8 for i in range(21)],fur,head)
fox_tail(body);fox_vest(body);camera(work)
# Preserve original group extras / animation nodes. Mesh batching may not cross them.
bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0000001);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.00000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
batches={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and not o.get('role') and len(o.data.materials)==1 and not o.data.color_attributes:
  key=(o.parent.name if o.parent else '',o.data.materials[0].name);batches.setdefault(key,[]).append(o)
for key,objects in batches.items():
 if len(objects)<2:continue
 # Joining deletes non-active objects: first preserve their transform children.
 # Eye catchlights must remain under the retained eye batch and HeadRig.
 for o in objects[1:]:
  for child in list(o.children):
   world=child.matrix_world.copy();child.parent=objects[0];child.matrix_world=world
 bpy.context.view_layer.update()
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=key[0]+'.'+key[1]+'.batch';objects[0].select_set(False)
path=OUT/'photo-fox-low.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'photo-fox-polished.blend'))
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_yup=True)
stats={'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in bpy.context.scene.objects if o.type=='MESH'),'meshObjects':sum(o.type=='MESH'for o in bpy.context.scene.objects),'bytes':path.stat().st_size}
(OUT/'build-stats.json').write_text(json.dumps(stats,indent=2));print('FOX_POLISH',stats)
(BASE.parent/'provenance.json').write_text(json.dumps({'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'baseline_generator_snapshot':'source/baseline_shop_generator.py','baseline_generator_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'baseline_glb_sha256':hashlib.sha256((BASE.parent/'baseline/photo-fox-low.glb').read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source':'source/build_photo_fox.py','reference':'Approved shop-resident concept, photo fox quadrant','method':'Authored analytic continuous skull/snout and vertex-color mask, rooted cupped ears, curved cloth and sleeve/paw centerlines, centered volumetric rump-root plume. No global smoothing/remeshing, no image generation.','original_camera_geometry':'Preserved original camera() with controlled low tessellation','runtime':'All original role extras preserved; no runtime source edits'},indent=2))
