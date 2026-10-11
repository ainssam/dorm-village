"""Faithful analytic post-penguin refinement. Blender 4.3+, no packages/downloads.
Run: blender -b --python build_post_penguin.py
Only the approved runtime-low mesh is generated; renders reimport this exact GLB.
"""
from pathlib import Path
import hashlib, json
ROOTPATH=Path(__file__).resolve().parent
SRC=ROOTPATH/'baseline_shop_generator.py'
source=SRC.read_text();cut=source.index('stats={}')
exec(compile(source[:cut],str(SRC),'exec'),globals())
ROOT=str(ROOTPATH)
import bmesh
_original_ell=ell
_original_tube=tube

def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 detail=any(k in name.lower() for k in ['eye','beak','seal'])
 seg=min(seg,max(12,round(seg*(.82 if detail else .72)/2)*2))
 rings=min(rings,max(8,round(rings*(.82 if detail else .72))))
 return _original_ell(name,at,scale,material,parent,role,seg,rings,exp,pear)

def tube(name,points,r,material,parent,role=None,sides=8):
 if not isinstance(r,list) and len(points)>2:
  keep=[points[0]]
  for i in range(1,len(points)-1):
   a=Vector(points[i])-Vector(keep[-1]);b=Vector(points[i+1])-Vector(points[i])
   if a.cross(b).length>1e-8 or a.dot(b)<0:keep.append(points[i])
  points=keep+[points[-1]]
 return _original_tube(name,points,r,material,parent,role,min(16,sides))

def profile_value(points,x):
 """Monotone cubic interpolation keeps the mask boundary flowing across stations."""
 if x<=points[0][0]:return points[0][1]
 slopes=[(b[1]-a[1])/(b[0]-a[0])for a,b in zip(points,points[1:])]
 tangents=[slopes[0]]
 for l,r in zip(slopes,slopes[1:]):tangents.append(0 if l*r<=0 else 2*l*r/(l+r))
 tangents.append(slopes[-1])
 for i,((a,av),(b,bv)) in enumerate(zip(points,points[1:])):
  if x<=b:
   h=b-a;t=(x-a)/h
   return (2*t**3-3*t*t+1)*av+(t**3-2*t*t+t)*h*tangents[i]+(-2*t**3+3*t*t)*bv+(t**3-t*t)*h*tangents[i+1]
 return points[-1][1]

def radii(y):
 h=max(-1,min(1,(y-.74)/.638))
 r=max(0,1-abs(h)**(2/.84))**(.84/2)*(1-.08*h)
 # A very small upper cheek fullness makes the same continuous pear less cylindrical.
 return .409*r+.012*math.exp(-((y-1.06)/.18)**2)*r,.325*r

def psurf(x,y):
 rx,rz=radii(y)
 return rz*sqrt(max(0,1-(x/max(rx,1e-9))**2))

MASK=[(.102,0),(.145,.055),(.23,.193),(.43,.282),(.62,.302),(.79,.257),(.92,.298),(1.055,.294),(1.14,.270),(1.21,.231),(1.255,.187),(1.29,.138),(1.312,.103),(1.324,.07),(1.336,0),(1.378,0)]
GAP=[(.102,0),(1.105,0),(1.18,.038),(1.245,.071),(1.29,.090),(1.312,.103),(1.324,.07),(1.336,0),(1.378,0)]

def continuous_body(parent):
 # One shared-vertex watertight surface. The heart/ivory region is a material
 # partition of the body itself, not intersecting ellipsoid patch plates.
 ys=sorted(set([.102+1.276*j/46 for j in range(47)]+[v[0]for v in MASK]+[v[0]for v in GAP]))
 vs=[];fs=[];mi=[];N=56
 for y in ys:
  rx,rz=radii(y);outer=math.asin(min(.98,profile_value(MASK,y)/max(rx,1e-9)))
  gap=min(outer,math.asin(min(.98,profile_value(GAP,y)/max(rx,1e-9))))
  sections=[(-pi,-pi/2,6,0),(-pi/2,-outer,8,0),(-outer,-gap,12,1),(-gap,gap,4,0),(gap,outer,12,1),(outer,pi/2,8,0),(pi/2,pi,6,0)]
  for a,b,n,matid in sections:
   for k in range(n):
    th=a+(b-a)*k/n
    vs.append((rx*sin(th),y,rz*cos(th)))
 for j in range(len(ys)-1):
  mids=[]
  for a,b,n,matid in sections:mids.extend([matid]*n)
  for i in range(N):
   fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i));mi.append(mids[i])
 o=mesh('Penguin continuous body and heart mask',vs,fs,fur,parent,role='Body');o.data.materials.append(ivory)
 for p,i in zip(o.data.polygons,mi):p.material_index=i
 o.location=V((0,.74,0))
 for v in o.data.vertices:v.co.z-=.74
 return o

def soft_blush(parent,s):
 # Flush concentric face surface with vertex tint; no raised cheek buttons.
 vs=[(s*.246,.979,psurf(s*.246,.979)+.0010)];fs=[];cs=[1.0]
 sides=20
 for j in range(1,5):
  r=j/4
  for i in range(sides):
   a=2*pi*i/sides;x=s*.246+.053*r*cos(a);y=.979+.034*r*sin(a)
   vs.append((x,y,psurf(x,y)+.0010));cs.append((1-r*r)**1.7)
 for i in range(sides):fs.append((0,1+i,1+(i+1)%sides))
 for j in range(3):
  a=1+j*sides;b=a+sides
  for i in range(sides):fs.append((a+i,b+i,b+(i+1)%sides,a+(i+1)%sides))
 body_surface=bpy.data.objects.get('Penguin continuous body and heart mask')
 for i,p in enumerate(vs):
  hit,loc,n,face=body_surface.ray_cast(Vector((p[0],-1,p[1]-.74)),Vector((0,1,0)))
  if hit:vs[i]=(p[0],p[1],-loc.y+.00045)
 o=mesh('Soft flush blush '+str(s),vs,fs,cheektint,parent)
 col=o.data.color_attributes.new(name='CheekTint',type='FLOAT_COLOR',domain='POINT')
 base=tuple(ivory.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value);pink=tuple(blush.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)
 for c,a in zip(col.data,cs):c.color=tuple(base[k]*(1-a*.84)+pink[k]*a*.84 for k in range(3))+(1,)
 return o

def beak_shell(name,parent,upper=True):
 # Longitudinal analytic bill, broad embedded base tapering to a soft tip.
 vs=[];fs=[];sides=24;rings=14
 for j in range(rings+1):
  t=j/rings;radius=sqrt(max(0,1-t*t));width=(.087 if upper else .070)*radius
  z=-.029+(.143 if upper else .133)*t
  cy=(.004+.002*t) if upper else (-.039+.003*t)
  for i in range(sides):
   a=2*pi*i/sides
   # Roof and lower bill use distinct heights; the corners converge into the smile.
   x=width*cos(a);height=(.051 if sin(a)>0 else .010) if upper else (.010 if sin(a)>0 else .023)
   y=cy+height*radius*(math.copysign(max(0,1-abs(cos(a)))**.72,sin(a)) if upper else sin(a))
   vs.append((x,y,z))
 for j in range(rings):
  for i in range(sides):fs.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
 fs.append(tuple(range(sides-1,-1,-1)))
 return mesh(name,vs,fs,accent,parent)

def shaped_flipper(work,side,s):
 # The runtime pivot is unchanged; the first four rings bury the shoulder in body.
 g=group('Arm.'+side,work,(s*.29,.18,.01));vs=[];fs=[];N=25;K=20
 A=(-s*.090,.018,-.032);B=(s*.094,-.115,.075);C=(s*.058,-.310,.131)
 for j in range(N+1):
  t=j/N;center=Vector(tuple((1-t)**2*A[k]+2*(1-t)*t*B[k]+t*t*C[k] for k in range(3)))
  tan=Vector(tuple(2*(1-t)*(B[k]-A[k])+2*t*(C[k]-B[k])for k in range(3))).normalized()
  axis=Vector((1,0,0));axis=(axis-tan*axis.dot(tan)).normalized();binorm=tan.cross(axis)
  w=(.066+.024*sin(pi*t))*(sqrt(max(0,1-((t-.76)/.24)**2)) if t>.76 else 1)
  d=(.057-.025*t)*(sqrt(max(0,1-((t-.76)/.24)**2)) if t>.76 else 1)
  for i in range(K):a=2*pi*i/K;vs.append(tuple(center+axis*w*cos(a)+binorm*d*sin(a)))
 for j in range(N):
  for i in range(K):fs.append((j*K+i,j*K+(i+1)%K,(j+1)*K+(i+1)%K,(j+1)*K+i))
 fs.append(tuple(range(K-1,-1,-1)))
 mesh('Flipper.'+side,vs,fs,fur,g)
 return g

FOOT_OUTLINE=[(0,-.12),(-.078,-.095),(-.114,-.040),(-.12,.042),(-.115,.121),(-.090,.164),(-.063,.178),(-.038,.178),(-.029,.193),(0,.201),(.029,.193),(.038,.178),(.063,.178),(.090,.164),(.115,.121),(.12,.042),(.114,-.040),(.078,-.095)]
def catmull_closed(points,steps=3):
 out=[];n=len(points)
 for i in range(n):
  p0,p1,p2,p3=[Vector(points[k%n])for k in (i-1,i,i+1,i+2)]
  for j in range(steps):
   t=j/steps;out.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
 return out

def continuous_foot(parent,side,s):
 g=group('Foot.'+side,parent,(s*.15,.075,.07));outline=catmull_closed(FOOT_OUTLINE,2);K=len(outline);N=12;vs=[];fs=[]
 for j in range(N+1):
  lat=-pi/2+pi*j/N;r=cos(lat);y=.060*sin(lat)-.015
  # The upper surface extends into a short hidden ankle root, not a disconnected toe cluster.
  if sin(lat)>0:y+=.090*(sin(lat)**8)
  for x,z in outline:vs.append((x*r,y,z*r-.037*max(0,sin(lat))**3))
 for j in range(N):
  for i in range(K):fs.append((j*K+i,j*K+(i+1)%K,(j+1)*K+(i+1)%K,(j+1)*K+i))
 mesh('Continuous webbed foot '+side,vs,fs,accent,g)
 return g

def fitted_strap(parent):
 # Thin flat ribbon, fitted in front and continued around the existing shoulder/back.
 points=[]
 for j in range(27):
  t=j/26;x=-.392+.69*t;y=.520+.415*t
  points.append((x,y,psurf(x,y)+.015))
 # Follow the shoulder around the side and return across the back to satchel.
 for j in range(1,13):
  t=j/12;y=.935-.03*sin(pi*t);rx,rz=radii(y);a=math.asin(.298/rx)+(pi-2*math.asin(.298/rx))*t
  points.append((rx*sin(a)+.008,y,rz*cos(a)))
 for j in range(1,26):
  t=j/25;x=.298-.683*t;y=.935-.408*t;points.append((x,y,-psurf(x,y)-.010))
 for j in range(1,9):
  t=j/8;points.append((-.385-.037*sin(pi*t),.527-.007*t,-.106*cos(pi*t)))
 # An oriented rounded rectangular section replaces the original eight-sided rope.
 vs=[];fs=[];profile=[(-.026,-.003),(-.030,0),(-.026,.004),(.026,.004),(.030,0),(.026,-.003)]
 for j,p in enumerate(points):
  p=Vector(p);t=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)]);t.normalize()
  normal=Vector((p.x/max(.409**2,1e-4),0,p.z/max(.325**2,1e-4))).normalized()
  wide=t.cross(normal).normalized();normal=wide.cross(t).normalized()
  for w,d in profile:vs.append(tuple(p+wide*w+normal*d))
 K=len(profile)
 for j in range(len(points)-1):
  for i in range(K):fs.append((j*K+i,j*K+(i+1)%K,(j+1)*K+(i+1)%K,(j+1)*K+i))
 fs.extend([tuple(range(K-1,-1,-1)),tuple((len(points)-1)*K+i for i in range(K))])
 return mesh('Postal shoulder strap',vs,fs,leather,parent)

def rooted_tail(parent):
 pivot=(0,.29,-.32);vs=[];fs=[];N=17;K=20
 for j in range(N+1):
  t=j/N;cx=0;cy=.31-.105*t;cz=-.205-.265*t
  r=sqrt(max(0,1-t*t));rx=.104*r;ry=.068*r
  for i in range(K):
   a=2*pi*i/K;vs.append((rx*cos(a)-pivot[0],cy+ry*sin(a)-pivot[1],cz-pivot[2]))
 for j in range(N):
  for i in range(K):fs.append((j*K+i,j*K+(i+1)%K,(j+1)*K+(i+1)%K,(j+1)*K+i))
 fs.append(tuple(range(K-1,-1,-1)))
 return mesh('Penguin rooted tapered tail',vs,fs,fur,parent,pivot,'Tail')

bpy.ops.wm.read_factory_settings(use_empty=True);M={}
# Exact approved solid-color palette and material properties.
setup=source[source.index(" cream=mat(",cut):source.index(" root=group(",cut)]
kind='penguin';id='post-penguin'
exec(compile('\n'.join(line[1:]if line.startswith(' ')else line for line in setup.splitlines()),str(SRC)+'[palette]','exec'),globals())
cheektint=mat('Soft integrated cheek tint','FFFFFF')
vc=cheektint.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='CheekTint';cheektint.node_tree.links.new(vc.outputs['Color'],cheektint.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
root=group(id);root['species']=id;root['version']=2
body=group('BodyRig',root);work=group('WorkRig',body,(0,.70,0));head=group('HeadRig',body,(0,1.25,0));group('Head',head,role='Head')
continuous_body(body)
for s in [-1,1]:
 x=s*.143;y=1.067;z=psurf(x,y)+.007
 ell('Eye'+str(s),(x,y,z),(.030,.042,.019),dark,body,seg=24,rings=16,exp=1)
 glint=ell('Eye glint'+str(s),(x-.008,y+.012,z+.016),(.006,.008,.003),cheektint,body,seg=12,rings=8)
 col=glint.data.color_attributes.new(name='CheekTint',type='FLOAT_COLOR',domain='POINT')
 for c in col.data:c.color=tuple(ivory.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)
 soft_blush(body,s)
beak=group('Beak',body,(0,1.010,psurf(0,1.01)+.016))
beak_shell('Penguin shaped upper bill',beak,True);beak_shell('Penguin shaped lower bill',beak,False)
ell('Penguin smile opening',(0,-.022,.072),(.062,.025,.018),mouth,beak,seg=24,rings=16,exp=1)
capg=cap(head);capg.location=V((0,.105,0))
# Tailor crown profile without moving the approved cap/badge controls.
crown=bpy.data.objects.get('Ochre post crown')
for v in crown.data.vertices:v.co.z*=.91
bag(body)
old=bpy.data.objects.get('Postal shoulder strap');bpy.data.objects.remove(old,do_unlink=True)
fitted_strap(body)
# Both buckle layers sit directly on the same fitted cross-body ribbon.
for name,offset in [('Postal strap buckle',.025),('Postal buckle opening',.038)]:
 o=bpy.data.objects.get(name);o.location=V((.10,.816,psurf(.10,.816)+offset));o.rotation_euler[1]=-.62
l=shaped_flipper(work,'L',-1);r=shaped_flipper(work,'R',1);r.rotation_euler[1]=-.99
letter=envelope('Delivered letter',r,(.055,-.305,.155),'Envelope');letter.rotation_euler[1]=.98
for s,side in [(-1,'L'),(1,'R')]:continuous_foot(root,side,s)
rooted_tail(body)

# Exact-pole welding and winding only. No all-mesh smoothing/remesh/subdivision.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
 bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-9)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
# Same-material batching is restricted to a control's direct children.
batches={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and not o.get('role') and len(o.data.materials)==1:
  key=(o.parent.name if o.parent else '',o.data.materials[0].name);batches.setdefault(key,[]).append(o)
for key,objects in batches.items():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=key[0]+'.'+key[1]+'.batch';objects[0].select_set(False)
path=ROOTPATH/'post-penguin-low.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_yup=True)
stats={'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in bpy.context.scene.objects if o.type=='MESH'),'meshes':sum(o.type=='MESH'for o in bpy.context.scene.objects),'bytes':path.stat().st_size}
(ROOTPATH/'asset-stats.json').write_text(json.dumps(stats,indent=2));print('PENGUIN_ASSET',stats)
(ROOTPATH/'provenance.json').write_text(json.dumps({'baseline_generator':'baseline_shop_generator.py','baseline_generator_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'baseline_glb_sha256':hashlib.sha256((ROOTPATH/'before-low.glb').read_bytes()).hexdigest(),'output':'post-penguin-low.glb','output_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'method':'Analytic shared-vertex heart mask/body, shaped bill shells, rooted tapered flippers/tail, single-volume webbed feet, fitted flat postal strap; approved palette/props/control pivots retained; no image generation, downloaded models, voxel remesh or generic smoothing'},indent=2))
