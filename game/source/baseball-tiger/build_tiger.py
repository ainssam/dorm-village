"""Softer baseball tiger geometry with preserved identity.
Blender Z-up/-Y-front -> glTF Y-up/+Z-front. No external texture assets.
"""
import bpy,math,os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
ROOT=os.path.dirname(os.path.abspath(__file__));bpy.ops.wm.read_factory_settings(use_empty=True)
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,c,rough=.76):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');rgb=[int(c[i:i+2],16)/255 for i in(0,2,4)];p.inputs['Base Color'].default_value=(*map(linear,rgb),1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.24;return m
orange=material('Tiger warm orange','E8A45D');cream=material('Tiger cream muzzle','FAEAD1');brown=material('Tiger cocoa stripes','80533E');pink=material('Tiger coral nose','DC927D');cheekmat=material('Tiger cheek pink','EFB6A3');dark=material('Tiger black eyes','2B2827',.40);teal=material('Tiger teal cap','658E8B');glovemat=material('Glove soft brown','A57955');gloveinner=material('Glove warm pocket','936646');pawmat=material('Tiger gentle paw creases','CE904E');lace=material('Glove cream seams','DEC4A0');ballmat=material('Baseball ivory','FFF6DE');red=material('Baseball red seam','C67F6C')
def group(name,role,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o['role']=role
 if parent:o.parent=parent
 return o
root=group('BaseballTiger','Root');rig=group('Tiger.BodyRig','BodyRig',root);headrig=group('Tiger.HeadRig','HeadRig',rig,loc=(0,0,.99))
def ellipse(name,loc,scale,mat,parent,role=None,seg=36,rings=24,exp=1,pear=0):
 verts=[];faces=[];sp=lambda n:math.copysign(abs(n)**exp,n)
 for j in range(rings+1):
  lat=-pi/2+pi*j/rings;h=sp(sin(lat));w=1-pear*h
  for i in range(seg):
   a=2*pi*i/seg;verts.append((scale[0]*sp(cos(lat))*cos(a)*w,scale[1]*sp(cos(lat))*sin(a)*w,scale[2]*h))
 for j in range(rings):
  for i in range(seg):faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;o.data.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 if role:o['role']=role
 return o
def surface(x,z,a=.43,b=.305,c=.35,exp=.84,center=0,pear=0):
 h=max(-.999,min(.999,(z-center)/c));lat=math.asin(math.copysign(abs(h)**(1/exp),h));r=abs(cos(lat))**exp;w=1-pear*h;return -b*r*w*math.sqrt(max(0,1-(x/(a*r*w))**2))
def patch(name,x,z,w,h,mat,parent,surf=None,depth=.009):
 if surf is None:surf=head_surface
 verts=[(0,surf(x,z)-.005-depth*.4,0)];faces=[];seg=64 if w>.12 else 32;rings=12 if w>.12 else 5
 for j in range(1,rings+1):
  r=j/rings
  for i in range(seg):
   a=i/seg*2*pi;dx=w*r*cos(a);dz=h*r*sin(a);verts.append((dx,surf(x+dx,z+dz)-.005-depth*.4*(1-r*r),dz))
 for i in range(seg):faces.append((0,1+i,1+(i+1)%seg))
 for j in range(rings-1):
  for i in range(seg):
   a=1+j*seg+i;b=1+(j+1)*seg+i;c=1+(j+1)*seg+(i+1)%seg;d=1+j*seg+(i+1)%seg;faces.extend([(a,b,c),(a,c,d)])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=(x,0,z);o.parent=parent;o.data.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 return o
def tube(name,points,r,mat,parent):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3;s=cu.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
body=ellipse('Tiger.Body',(0,0,.46),(.31,.25,.35),orange,rig,'Body',seg=44,rings=30,exp=.90,pear=.20)
head=ellipse('Tiger.Head',(0,0,0),(.43,.305,.35),orange,headrig,'Head',seg=52,rings=36,exp=.98,pear=.065)
def mesh_surface(obj):
 tree=BVHTree.FromPolygons([v.co+obj.location for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])
 def front(x,z):
  hit,normal,index,distance=tree.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
  if hit is None:raise ValueError('Missing surface for '+obj.name+' at '+str((x,z)))
  return hit.y
 return front
head_surface=mesh_surface(head);body_surface=mesh_surface(body)
patch('Tiger.CreamMuzzle',0,-.14,.340,.18,cream,headrig,depth=.011)
patch('Tiger.CreamBelly',0,.415,.185,.255,cream,rig,surf=body_surface,depth=.008)
for s,side in[(-1,'L'),(1,'R')]:
 ear=group('Tiger.Ear.'+side,'Ear.'+side,headrig,loc=(s*.348,.035,.23))
 ellipse('Tiger.EarOrange.'+side,(0,0,0),(.126,.088,.14),orange,ear)
 ellipse('Tiger.EarCream.'+side,(0,-.069,0),(.080,.021,.094),cream,ear,seg=24,rings=16)
 x=s*.155;z=.035;ellipse('Tiger.Eye.'+side,(x,head_surface(x,z)-.012,z),(.031,.020,.043),dark,headrig,seg=32,rings=22)
 patch('Tiger.Cheek.'+side,s*.28,-.055,.046,.034,cheekmat,headrig,depth=.008)
 for j in range(2):
  x=s*(.345+j*.02);z=.065-j*.115;patch('Tiger.CheekStripe.'+side+'.'+str(j),x,z,.059,.023,brown,headrig,depth=.006)
 for j in range(2):patch('Tiger.SideStripe.'+side+'.'+str(j),s*.235,.35+j*.155,.051,.023,brown,rig,surf=body_surface,depth=.006)
 ellipse('Tiger.Arm.'+side,(s*.32,-.06,.54),(.099,.10,.16),orange,rig,'Arm.'+side)
 hand=group('Tiger.Hand.'+side,'Hand.'+side,rig,loc=(s*.35,-.17,.46))
 # Keep the original foot support surface, with a soft upper ankle taper.
 foot=ellipse('Tiger.Foot.'+side,(s*.16,-.06,.115),(.15,.20,.115),orange,root,'Foot.'+side,seg=36,rings=26,exp=.86)
 for vertex in foot.data.vertices:
  h=max(0,vertex.co.z/.115);blend=h*h*(3-2*h)
  vertex.co.x*=1-.34*blend;vertex.co.y*=1-.38*blend;vertex.co.z+=.078*blend
 foot.data.update()
 foot_surface=mesh_surface(foot)
 for toe in[-1,1]:
  points=[]
  for i in range(14):
   t=i/13;x=s*.16+toe*(.039+.008*t);z=.037+.051*t
   points.append((x-s*.16,foot_surface(x,z)+.06-.002,z-.115))
  tube('Tiger.PawCrease.'+side,points,.002,pawmat,foot)
for x,z,w,h in[(0,.23,.064,.017),(0,.184,.047,.016),(0,.139,.032,.015)]:patch('Tiger.ForeheadStripe',x,z,w,h,brown,headrig,depth=.006)
ellipse('Tiger.Nose',(0,head_surface(0,-.045)-.020,-.045),(.046,.027,.029),pink,headrig,seg=32,rings=22)
for sign in[-1,1]:
 points=[]
 for i in range(28):
  t=i/27;x=sign*.091*t;z=-.066-.051*sin(pi*t*.92);points.append((x,head_surface(x,z)-.019,z))
 tube('Tiger.Smile',points,.007,brown,headrig)
cap=group('Tiger.Cap','Cap',headrig,loc=(0,.014,.278))
crown=ellipse('Tiger.CapCrown',(0,0,0),(.297,.265,.185),teal,cap,seg=48,rings=28,exp=.86)
# Thin rounded brim with crosswise camber and a relaxed downward front lip.
visor=ellipse('Tiger.CapVisor',(0,-.230,-.05),(.298,.196,.022),teal,cap,seg=48,rings=24,exp=.90)
for vertex in visor.data.vertices:
 x,y,z=vertex.co;front=max(0,-y/.196)
 vertex.co.z+=.032*(1-(x/.298)**2)-.019*front*front
visor.data.update()
ellipse('Tiger.CapTopButton',(0,0,.181),(.030,.030,.015),teal,cap,seg=20,rings=12)
cap_patch=patch('Tiger.CapPatch',0,.045,.047,.045,cream,cap,surf=mesh_surface(crown),depth=.012)
for x in[-.17,.17]:
 points=[]
 for i in range(20):
  z=-.023+i*.007;x1=x*(1-i/30);y=-.265*math.sqrt(max(0,1-(x1/.297)**2-(z/.157)**2))-.002;points.append((x1,y,z))
 tube('Tiger.CapSeam',points,.002,teal,cap)
tail=group('Tiger.TailRig','TailRig',rig)
# Sample the existing tail path more finely and taper its tip continuously.
pts=[];tail_rings=73
for i in range(tail_rings):
 t=i/(tail_rings-1);pts.append(Vector((-.22-.43*t,.19+.08*sin(pi*t),.31+.10*t+.31*t*t)))
verts=[];faces=[];sides=24
for i,p in enumerate(pts):
 t=i/(tail_rings-1);tangent=(pts[min(i+1,tail_rings-1)]-pts[max(0,i-1)]).normalized();axis=Vector((0,1,0));normal=tangent.cross(axis).normalized();r=.085*(sin(pi*(t*.83+.04))**.20)
 if t>.80:r*=math.sqrt(max(.0001,1-((t-.80)/.20)**2))
 for j in range(sides):verts.append(tuple(p+axis*cos(j*2*pi/sides)*r+normal*sin(j*2*pi/sides)*r))
for i in range(tail_rings-1):
 for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
faces.append(tuple(reversed(range(sides))));faces.append(tuple((tail_rings-1)*sides+i for i in range(sides)))
me=bpy.data.meshes.new('Tiger curved tail');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Tiger.Tail',me);bpy.context.collection.objects.link(o);o.parent=tail;o.data.materials.append(orange);o.data.materials.append(brown)
for p in me.polygons:
 p.use_smooth=True;original_ring=(p.index//sides)/(tail_rings-1)*44;p.material_index=1 if int(original_ring/7)%2 or original_ring>=39 else 0
left=next(o for o in bpy.context.scene.objects if o.get('role')=='Hand.L');right=next(o for o in bpy.context.scene.objects if o.get('role')=='Hand.R')
ball=group('Tiger.Ball','Ball',left,loc=(0,-.073,.008));ellipse('Tiger.Baseball',(0,0,0),(.085,.085,.085),ballmat,ball,seg=40,rings=28)
for s in[-1,1]:
 points=[]
 for i in range(50):
  a=2*pi*i/49;x=s*.045+.012*cos(a);y=.071*sin(a);z=.071*cos(a);n=Vector((x,y,z)).normalized()*.086;points.append(tuple(n))
 tube('Tiger.BaseballSeam',points,.0025,red,ball)
 for i in range(2,49,4):
  p=Vector(points[i]);tangent=(Vector(points[i+1])-Vector(points[i-1])).normalized();across=p.normalized().cross(tangent).normalized();a=(p+tangent*.002-across*.006).normalized()*.087;b=(p-tangent*.002+across*.006).normalized()*.087;tube('Tiger.BaseballStitch',[a,b],.0014,red,ball)
glove=group('Tiger.Glove','Glove',right,loc=(0,-.06,.022));glove.rotation_euler[1]=-.12
# A cupped palm, four round finger stalls and a curled, separate thumb.
# The receiving pocket sits behind its raised rim so this reads as a glove in 3D.
palm=ellipse('Tiger.GlovePalm',(0,0,-.029),(.126,.067,.128),glovemat,glove,seg=32,rings=22,exp=.98)
for vertex in palm.data.vertices:
 if vertex.co.y<0:
  pocket=max(0,1-(vertex.co.x/.118)**2-((vertex.co.z-.010)/.114)**2)
  vertex.co.y+=.027*pocket*pocket
palm.data.materials.append(gloveinner)
for polygon in palm.data.polygons:
 center=polygon.center
 if center.y<-.036 and abs(center.x)<.089 and abs(center.z)<.092:polygon.material_index=1
palm.data.update()
for number,(x,z,tilt) in enumerate([(-.079,.073,-.12),(-.029,.105,-.04),(.024,.112,.035),(.077,.087,.11)]):
 finger=ellipse('Tiger.GloveFinger.'+str(number+1),(x,-.012,z),(.039,.060,.079),glovemat,glove,seg=24,rings=16,exp=.96)
 finger.rotation_euler[1]=tilt
 # An inset leather seam follows each finger's rounded face.
 points=[]
 for i in range(13):
  a=-.6+2.05*i/12;points.append((x+.026*cos(a),-.065+.014*sin(a),z+.057*sin(a)))
 tube('Tiger.GloveFingerSeam.'+str(number+1),points,.0017,lace,glove)
thumb=ellipse('Tiger.GloveThumb',(-.113,-.048,-.012),(.047,.061,.087),glovemat,glove,seg=28,rings=18)
thumb.rotation_euler[1]=-.60
# Rolled pocket rim and a short web join the thumb to the index finger.
points=[]
for i in range(40):
 a=pi*.06+pi*1.68*i/39;points.append((.106*cos(a),-.060-.009*sin(a),-.027+.111*sin(a)))
tube('Tiger.GloveRolledPalmEdge',points,.0075,glovemat,glove)
for i in range(4):
 z=.025+i*.015
 tube('Tiger.GloveWebLace',[(-.105,-.078,z),(-.078,-.063,z+.014)],.0025,lace,glove)
points=[]
for i in range(25):
 a=pi*1.04+pi*.93*i/24;points.append((.110*cos(a),-.070,-.026+.105*sin(a)))
tube('Tiger.GloveHeelSeam',points,.002,lace,glove)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
bpy.ops.export_scene.gltf(filepath=ROOT+'/baseball-tiger.glb',export_format='GLB',export_extras=True,export_yup=True)
print('TIGER_ASSET',ROOT+'/baseball-tiger.glb')
