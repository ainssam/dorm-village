"""Original smooth clay rabbit model from 2026-10-04.
Blender Z-up/-Y-front exports to glTF Y-up/+Z-front. No external assets.
"""
import bpy, math, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,c,rough=.74):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');rgb=[int(c[i:i+2],16)/255 for i in(0,2,4)];p.inputs['Base Color'].default_value=(*map(linear,rgb),1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.26;return m
ivory=material('Rabbit warm ivory','F8EEE0');pink=material('Rabbit soft coral','F6B7B0');orange=material('Rabbit orange headband','EA853D');cream=material('Headband cream stripe','FFF5DC');dark=material('Rabbit oval eyes','28272B',.4);nosemat=material('Rabbit coral nose','EBA399');smilemat=material('Rabbit gentle smile','654B3C');mint=material('Play ball mint','87CAB5');ballwhite=material('Play ball ivory','FFF6E3')
def group(name,role,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o['role']=role
 if parent:o.parent=parent
 return o
root=group('AthleticRabbit','Root');rig=group('Rabbit.BodyRig','BodyRig',root);headrig=group('Rabbit.HeadRig','HeadRig',rig,loc=(0,0,1.0))
def ellipse(name,loc,scale,mat,parent,role=None,seg=40,rings=28,exp=1,pear=0):
 verts=[];faces=[];sp=lambda n:math.copysign(abs(n)**exp,n)
 for j in range(rings+1):
  lat=-pi/2+pi*j/rings;h=sp(sin(lat));w=1-pear*h
  for i in range(seg):
   a=2*pi*i/seg;verts.append((scale[0]*sp(cos(lat))*cos(a)*w,scale[1]*sp(cos(lat))*sin(a)*w,scale[2]*h))
 for j in range(rings):
  for i in range(seg):faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;o.data.materials.append(mat)
 for f in me.polygons:f.use_smooth=True
 if role:o['role']=role
 return o
body=ellipse('Rabbit.Body',(0,0,.47),(.305,.25,.365),ivory,rig,'Body',seg=48,rings=32,exp=.90,pear=.20)
head=ellipse('Rabbit.Head',(0,0,0),(.435,.305,.34),ivory,headrig,'Head',seg=56,rings=36,exp=.83)
tail=ellipse('Rabbit.Tail',(0,.295,.395),(.14,.14,.14),ivory,rig,'Tail')
def front_y(x,z):
 # Exact superellipsoid front surface used by head mesh.
 h=max(-1,min(1,z/.34));lat=math.asin(math.copysign(abs(h)**(1/.83),h));r=abs(cos(lat))**.83
 return -.305*r*math.sqrt(max(0,1-(x/(.435*r))**2))
for s,side in[(-1,'L'),(1,'R')]:
 ear=group('Rabbit.Ear.'+side,'Ear.'+side,headrig,loc=(s*.188,.035,.228));ear.rotation_euler[1]=s*.11
 ellipse('Rabbit.EarOuter.'+side,(0,0,.285),(.108,.087,.346),ivory,ear,seg=40,rings=32,exp=.89)
 inner=ellipse('Rabbit.EarInner.'+side,(0,0,.296),(.063,.017,.252),pink,ear,seg=36,rings=30,exp=.88)
 for p in inner.data.vertices:
  h=(p.co.z+.296-.285)/.346;lat=math.asin(math.copysign(abs(h)**(1/.89),h));r=abs(cos(lat))**.89
  p.co.y=-.087*r*math.sqrt(max(0,1-(p.co.x/(.108*r))**2))+.006+p.co.y
 x=s*.153;z=.025;ellipse('Rabbit.Eye.'+side,(x,front_y(x,z)-.010,z),(.030,.019,.043),dark,headrig,seg=32,rings=22)
 x=s*.280;z=-.072;cheek=ellipse('Rabbit.Cheek.'+side,(x,0,z),(.052,.010,.039),pink,headrig,seg=32,rings=22)
 for p in cheek.data.vertices:p.co.y=front_y(x+p.co.x,z+p.co.z)+.003+p.co.y
 ellipse('Rabbit.Arm.'+side,(s*.32,-.065,.54),(.092,.094,.175),ivory,rig,'Arm.'+side)
 group('Rabbit.Hand.'+side,'Hand.'+side,rig,loc=(s*.36,-.12,.43))
 ellipse('Rabbit.Foot.'+side,(s*.15,-.08,.11),(.148,.215,.11),ivory,root,'Foot.'+side,seg=40,rings=24,exp=.86)
ellipse('Rabbit.Nose',(0,front_y(0,-.033)-.016,-.033),(.033,.024,.021),nosemat,headrig,seg=32,rings=20)
def tube(name,points,r,mat,parent):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=3;s=cu.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
for sign in[-1,1]:
 points=[]
 for i in range(25):
  t=i/24;x=sign*.085*t;z=-.054-.058*sin(pi*t*.90);points.append((x,front_y(x,z)-.012,z))
 tube('Rabbit.Smile',points,.008,smilemat,headrig)
def belt(name,low,high,mat,parent,role=None):
 verts=[];faces=[];seg=72;steps=6
 for j in range(steps+1):
  lat=low+(high-low)*j/steps
  for i in range(seg):
   a=2*pi*i/seg;r=abs(cos(lat))**.83;verts.append((.442*r*cos(a),.312*r*sin(a),.344*math.copysign(abs(sin(lat))**.83,sin(lat))))
 for j in range(steps):
  for i in range(seg):faces.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 if role:o['role']=role
 return o
belt('Rabbit.Headband',.37,.68,orange,headrig,'Headband');stripe=belt('Rabbit.HeadbandStripe',.475,.555,cream,headrig);stripe.scale=(1.002,1.002,1.002)
ball=group('Rabbit.Ball','Ball',rig,loc=(0,-.39,.57));ball.rotation_euler[1]=-.55
o=ellipse('Rabbit.BallMesh',(0,0,0),(.185,.185,.185),ballwhite,ball,seg=48,rings=32);o.data.materials.append(mint)
for face in o.data.polygons:
 z=sum(o.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)
 face.material_index=1 if (-.165<z<-.08 or -.035<z<.05 or .095<z<.17) else 0
bpy.context.view_layer.update()
# Flatten object scales into mesh coordinates so runtime absolute positioning is direct.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'..','dist','residents','athletic-rabbit.glb'),export_format='GLB',export_extras=True,export_yup=True)
print('RABBIT_ASSET',os.path.join(ROOT,'..','dist','residents','athletic-rabbit.glb'))
