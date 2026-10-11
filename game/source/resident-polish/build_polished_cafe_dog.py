"""Faithful cafe-dog geometry refinement, using existing original source helpers.
No voxel remeshing; analytic surfaces and authored cloth/limb ring profiles.
Preserves runtime control names. Run with Blender in background.
"""
from pathlib import Path
import hashlib
import sys
LOW='--low' in sys.argv
SRC=Path(__file__).resolve().parent/'baseline_shop_generator.py'
OUT=Path(__file__).resolve().parent
source=SRC.read_text()
source=source.replace("for kind,id in [('dog','cafe-dog'),('beaver','craft-beaver'),('penguin','post-penguin'),('fox','photo-fox')]:", "for kind,id in [('dog','cafe-dog')]:")
# Existing helper definitions are unchanged, making provenance and differences explicit.
cut=source.index('stats={}')
exec(compile(source[:cut],str(SRC),'exec'),globals())
ROOT=str(OUT)
import bmesh
_original_ell=ell
_original_face=face
_original_apron=apron
_original_arm=arm
_original_foot=foot
_original_tube=tube
def tube(name,points,r,material,parent,role=None,sides=8):
 if LOW:
  sides=min(sides,16)
  if len(points)>10 and not isinstance(r,list):
   points=points[::2]+([points[-1]] if len(points)%2==0 else [])
 return _original_tube(name,points,r,material,parent,role,sides)

# Reusable smooth ring loft. Parameters carry a continuous centerline and cross-section.
def loft(name,profile,material,parent,at=(0,0,0),role=None,sides=40):
 sides=min(sides,24) if LOW else sides
 vs=[];fs=[]
 for cx,y,cz,rx,rz in profile:
  for i in range(sides):
   a=2*pi*i/sides
   vs.append((cx+rx*cos(a),y,cz+rz*sin(a)))
 for j in range(len(profile)-1):
  for i in range(sides):
   a=j*sides+i;b=j*sides+(i+1)%sides
   fs.append((a,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,b))
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(profile)-1)*sides+i for i in range(sides))])
 return mesh(name,vs,fs,material,parent,at,role)

def dog_surf(x,y):
 # Soft skull plus the muzzle volumes sculpted into the same watertight surface.
 h=max(-.99999,min(.99999,y/.35));r=sqrt(max(.000001,1-h*h))
 width=.432*r*(1-.075*h)
 base=.307*r*sqrt(max(0,1-(x/width)**2))
 import math
 bump=.041*(math.exp(-((x-.084)/.103)**2-((y+.102)/.090)**2)+math.exp(-((x+.084)/.103)**2-((y+.102)/.090)**2))
 return base+bump

def head_mesh(name,material,parent,role):
 sides=40 if LOW else 56;rings=28 if LOW else 36;vs=[];fs=[]
 for j in range(rings+1):
  lat=-pi/2+pi*j/rings;h=sin(lat);r=cos(lat);y=.35*h
  for i in range(sides):
   a=2*pi*i/sides;x=.432*r*(1-.075*h)*cos(a);z=.307*r*sin(a)
   if sin(a)>0:
    base=.307*r*abs(sin(a));z+=(dog_surf(x,y)-base)*max(0,sin(a))**6
   vs.append((x,y,z))
 for j in range(rings):
  for i in range(sides):fs.append((j*sides+i,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,j*sides+(i+1)%sides))
 o=mesh(name,vs,fs,material,parent,role=role)
 # Subtle, continuous blush is authored vertex color, not a floating geometry sticker.
 base=tuple(material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)
 col=o.data.color_attributes.new(name='SoftFurTint',type='FLOAT_COLOR',domain='POINT')
 target=tuple(linear(int('E7AE91'[i:i+2],16)/255) for i in (0,2,4))
 for v,c in zip(o.data.vertices,col.data):
  x,y,z=v.co.x,v.co.z,-v.co.y
  a=(.38*math.exp(-((abs(x)-.265)/.080)**2-((y+.087)/.065)**2))*max(0,min(1,z/.18))
  c.color=tuple(base[k]*(1-a)+target[k]*a for k in range(3))+(1,)
 tint=mat('Dog continuous fur and blush','FFFFFF',.72)
 nodes=tint.node_tree.nodes;vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='SoftFurTint';tint.node_tree.links.new(vc.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
 o.data.materials.clear();o.data.materials.append(tint)
 return o

def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 if name=='dog soft head':return head_mesh(name,material,parent,role)
 if LOW and name.startswith('Flower bread lobe'):seg=min(seg,12);rings=min(rings,8)
 if LOW and name.startswith('Sesame') and name!='Sesame brioche':seg=min(seg,8);rings=min(rings,4)
 if name=='dog tailored torso':
  # Rounded pear torso, avoiding a squared-off shoulder pedestal beneath the head.
  return _original_ell(name,(0,.58,0),(.294,.386,.243),material,parent,role,28 if LOW else 40,20 if LOW else 28,1,.14)
 return _original_ell(name,at,scale,material,parent,role,min(seg,(20 if any(k in name.lower() for k in ['eye','nose','mouth','tongue','foot','ankle','brioche']) else 16) if LOW else 28),min(rings,(14 if any(k in name.lower() for k in ['eye','nose','mouth','tongue','foot','ankle','brioche']) else 10) if LOW else 18),max(exp,.90) if name.startswith(('Soft foot','Continuous ankle')) else exp,pear)

def face(head,kind,*args):
 if kind!='dog':return _original_face(head,kind,*args)
 surf=dog_surf
 # Slightly embedded glossy eyes; tiny catchlights follow each eye rather than hover.
 for s in [-1,1]:
  x=s*.148;y=.032;z=surf(x,y)+.006
  eye=ell('Eye.'+str(s),(x,y,z),(.034,.046,.019),dark,head,'Eye.'+('L'if s<0 else'R'),24,16,1)
  ell('Eye.glint.'+str(s),(-.009,.015,.017),(.0062,.008,.003),ivory,eye,seg=14,rings=10,exp=1)
  pts=[]
  for i in range(15):
   t=i/14;x=s*(.132+.052*t);y=.151+.013*sin(pi*t)
   pts.append((x,y,surf(x,y)+.0025))
  tube('Soft brow'+str(s),pts,[.0025+.0033*sin(pi*i/14) for i in range(15)],brow,head,sides=8)
 # Rounded, gently tapering nose and compact happy mouth retain approved puppy expression.
 n=ell('Nose',(0,-.044,surf(0,-.044)+.017),(.047,.029,.025),brownnose,head,seg=28,rings=18,exp=.9)
 for v in n.data.vertices:v.co.x*=1+.24*v.co.z/.029
 ell('Nose.glint',(-.012,-.034,surf(0,-.044)+.039),(.010,.0045,.003),tan,head,seg=12,rings=8)
 patch('Happy mouth',(0,-.146,0),(.053,.055,.006),mouth,head,surf)
 patch('Tongue',(0,-.170,0),(.031,.023,.005),tongue,head,lambda x,y:surf(x,y)+.011)
 for s in [-1,1]:
  pts=[]
  for i in range(21):
   t=i/20;x=s*.100*t;y=-.077-.035*sin(pi*t*.98);pts.append((x,y,surf(x,y)+.006))
  tube('Smile.'+str(s),pts,[.003+.0016*sin(pi*i/20)for i in range(21)],brownnose,head,sides=8)

def apron(body,color):
 if kind!='dog':return _original_apron(body,color)
 # Tailored A-line skirt. Smooth radius profile, gentle hem and sparse authored folds.
 profile=[]
 N=18 if LOW else 24
 for j in range(N+1):
  t=j/N;y=.245+.370*t
  rx=.343-.025*t+.007*sin(pi*t);rz=.267-.005*t
  profile.append((0,y,.003,rx,rz))
 skirt=loft('Apron tailored skirt',profile,color,body,role='Apron',sides=48)
 for v in skirt.data.vertices:
  x,y,z=v.co.x,v.co.z,-v.co.y;t=(y-.245)/.37
  a=math.atan2(z-.003,x);fold=.0035*sin(a*7+.2)*max(0,sin(pi*t))**.7
  v.co.x+=fold*cos(a);v.co.y-=fold*sin(a)
 # Thin rolled hem is curved cloth, not a thick rectangular lower block.
 pts=[(.342*cos(i/64*2*pi),.254,.003+.267*sin(i/64*2*pi))for i in range(65)]
 tube('Apron rolled hem',pts,.005,color,body,sides=8)
 # Curved bib surface directly fitted to the round torso and smoothly flared into waist.
 vs=[];fs=[]
 rows=11 if LOW else 21;cols=13 if LOW else 25
 for j in range(rows):
  t=j/(rows-1);y=.568+.287*t;width=.262-.084*t
  for i in range(cols):
   u=-1+2*i/(cols-1);x=width*u
   z=.259+.017*sin(pi*t)-.065*u*u
   vs.append((x,y,z))
 for j in range(rows-1):
  for i in range(cols-1):a=j*cols+i;fs.append((a,a+1,a+cols+1,a+cols))
 bib=mesh('Apron fitted bib',vs,fs,color,body)
 sol=bib.modifiers.new('Tailored fabric thickness','SOLIDIFY');sol.thickness=.009;bpy.context.view_layer.objects.active=bib;bpy.ops.object.modifier_apply(modifier=sol.name)
 for s in [-1,1]:
  curve('Apron soft strap'+str(s),(s*.180,.94,.093),(s*.18,.92,.208),(s*.17,.819,.260),.021,color,body)
  ell('Apron brass button'+str(s),(s*.159,.806,.261),(.011,.011,.005),brass,body,seg=14,rings=10)
  # Rounded curved pockets rest close to cloth surface.
  x=s*.18
  pocket=rounded('Apron inset pocket'+str(s),(x,.382,0),(.136,.103,.007),color,body,.015)
  for v in pocket.data.vertices:
   px=v.co.x+x;py=v.co.z+.382;t=(py-.245)/.370
   rx=.343-.025*t+.007*sin(pi*t);rz=.267-.005*t
   v.co.y=-.003-rz*sqrt(max(0,1-(px/rx)**2))-.004+v.co.y
 # Fine waist piping matches the front curvature.
 pts=[(.28*cos(i/32*pi),.598,.005+.237*sin(i/32*pi))for i in range(33)]
 tube('Apron soft waist seam',pts,.005,color,body,sides=8)

def arm(work,side,s,fur,shirt=True,flipper=False,tight=False,reach=.335):
 if kind!='dog':return _original_arm(work,side,s,fur,shirt,flipper,tight,reach)
 g=group('Arm.'+side,work,(s*.267,.145,.005))
 # One continuous rounded arm/paw volume, shoulder buried in torso; no mitten joint.
 A=(0,0,0);B=(s*.128,-.205,.113);C=(s*.022,-.110,.374)
 pts=[];rs=[]
 for i in range(33):
  t=i/32;pts.append(tuple((1-t)**2*A[k]+2*(1-t)*t*B[k]+t*t*C[k]for k in range(3)))
  r=.086+.010*sin(pi*t)+.010*math.exp(-((t-.79)/.13)**2)+.003*math.exp(-((t-.43)/.09)**2)
  if t<.06:r*=.70+.30*t/.06
  if t>.89:r*=sqrt(max(.00001,1-((t-.89)/.11)**2))
  rs.append(r)
 arm=tube('Continuous sleeve and paw '+side,pts,rs,fur,g,sides=16 if LOW else 24)
 arm.data.materials.append(ivory)
 for p in arm.data.polygons:
  if p.index<15*(16 if LOW else 24):p.material_index=1
 # The cloth/fur boundary lies on the same smooth surface; no raised cuff ring or geometry seam.
 return g

def dog_ear(name,material,parent,s):
 profile=[]
 for j in range(29):
  t=j/28
  # Organic teardrop ear: narrow embedded root, fuller relaxed lower lobe.
  rx=.060*(1-t)+.098*sin(pi*t)**.65+.015*t
  rz=.054*(1-t)+.063*max(0,sin(pi*t))**.75
  if t>.90:rx*=sqrt(max(.00001,1-((t-.90)/.10)**2));rz*=sqrt(max(.00001,1-((t-.90)/.10)**2))
  profile.append((s*(.045+.05*sin(pi*t*.75)),-.48*t,-.007+.025*sin(pi*t),rx,rz))
 return loft(name,profile,material,parent,sides=32)

# Patch only dog-specific call sites, retaining all original identity and role props.
body=source[cut:]
if LOW:
 body=body.replace("id+'.glb'","id+'-low.glb'")
body=body.replace("ell('Long drooping ear '+side,(s*.062,-.24,.003),(.132,.299,.101),accent,g,seg=40,rings=28,exp=.89,pear=-.13)","dog_ear('Long drooping ear '+side,accent,g,s)")
body=body.replace("g.rotation_euler[1]=s*.20", "g.rotation_euler[1]=s*.13")
body=body.replace("curve('Dog forehead tuft',(-.08,.32,.04),(-.12,.405,.022),(.029,.351,.06),[.02+.013*sin(i/20*pi) for i in range(21)],fur,head)","curve('Dog forehead tuft',(-.079,.324,.043),(-.124,.390,.035),(.023,.350,.068),[.004+.020*sin(i/20*pi)**.7 for i in range(21)],fur,head)")
# Hide the alternate dough prop in GLB; runtime takes control of visibility after loading.
body=body.replace("path=os.path.join(ROOT,id+'.glb');", "\n bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,id+'-polished.blend'))\n path=os.path.join(ROOT,id+'-polished.glb');")
# Clean coincident pole vertices; no generic remesh and no destructive global smoothing.
body=body.replace("# Batch same-material", """# Validate and weld only coincident analytic pole vertices.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 # Batch same-material""")
if LOW:
 body=body.replace("id+'-low.glb'","id+'-polished-low.glb'").replace("ROOT+'/asset-stats.json'","ROOT+'/asset-stats-low.json'")
exec(compile(body,str(SRC)+'[faithful-cafe-dog-refinement]','exec'),globals())
(OUT/'provenance.json').write_text(json.dumps({'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'method':'Original source helpers plus analytical head sculpt, profile-loft ears/clothing, continuous bent arm; no remeshing, no generated images','output':'cafe-dog-polished.glb'},indent=2))
