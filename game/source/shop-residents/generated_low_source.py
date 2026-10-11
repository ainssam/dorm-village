"""Four approved shop residents. Original smooth clay geometry, no external textures.
Run: blender --background --python build_shop_residents.py
Coordinates authored Y-up/+Z-front; Blender conversion is handled by helpers.
"""
import bpy, math, os, json
from math import sin,cos,pi,sqrt
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
V=lambda p:Vector((p[0],-p[2],p[1]))
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
M={}
def mat(name,color,rough=.67):
 if name in M:return M[name]
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');rgb=[int(color[i:i+2],16)/255 for i in(0,2,4)];p.inputs['Base Color'].default_value=(*map(linear,rgb),1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.27;m.diffuse_color=(*rgb,1);M[name]=m;return m

def group(name,parent=None,at=(0,0,0),role=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=V(at);o.parent=parent;o['role']=role or name;return o

def mesh(name,verts,faces,material,parent=None,at=(0,0,0),role=None,smooth=True):
 me=bpy.data.meshes.new(name);me.from_pydata([V(p) for p in verts],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=V(at);o.parent=parent;o.data.materials.append(material)
 if role:o['role']=role
 for f in me.polygons:f.use_smooth=smooth
 return o

def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 vs=[];fs=[];sp=lambda n:math.copysign(abs(n)**exp,n)
 for j in range(rings+1):
  t=-pi/2+pi*j/rings;h=sp(sin(t));r=sp(cos(t))*(1-pear*h)
  for i in range(seg):
   a=2*pi*i/seg;vs.append((scale[0]*r*cos(a),scale[1]*h,scale[2]*r*sin(a)))
 for j in range(rings):
  for i in range(seg):fs.append((j*seg+i,(j+1)*seg+i,(j+1)*seg+(i+1)%seg,j*seg+(i+1)%seg))
 return mesh(name,vs,fs,material,parent,at,role)

def rounded(name,at,size,material,parent,bevel=.02,role=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(at));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.parent=parent;o.data.materials.append(material)
 mod=o.modifiers.new('soft tailored edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 mod=o.modifiers.new('weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 if role:o['role']=role
 return o

def tube(name,points,r,material,parent,role=None,sides=8):
 vs=[];fs=[];last_axis=None
 for i,p in enumerate(points):
  p=Vector(p);t=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized();axis=last_axis.copy() if last_axis is not None else Vector((0,0,1))
  if abs(t.dot(axis))>.99:axis=Vector((1,0,0))
  ax=(axis-t*t.dot(axis)).normalized();last_axis=ax.copy();bx=t.cross(ax);rad=r[i] if isinstance(r,list) else r
  for j in range(sides):vs.append(tuple(p+rad*(cos(j/sides*2*pi)*ax+sin(j/sides*2*pi)*bx)))
 for i in range(len(points)-1):
  for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]);return mesh(name,vs,fs,material,parent,role=role)

def curve(name,A,B,C,r,material,parent,steps=20,role=None):
 pts=[]
 for i in range(steps+1):
  t=i/steps;pts.append(tuple((1-t)**2*A[k]+2*(1-t)*t*B[k]+t*t*C[k] for k in range(3)))
 return tube(name,pts,r,material,parent,role)

def front(x,y,sx=.42,sy=.34,sz=.30,exp=.83):
 h=max(-.999,min(.999,y/sy));lat=math.asin(math.copysign(abs(h)**(1/exp),h));r=abs(cos(lat))**exp
 return sz*r*sqrt(max(0,1-(x/(sx*r))**2))

def patch(name,at,size,material,parent,surf,role=None):
 o=ell(name,(at[0],at[1],0),size,material,parent,role,seg=32,rings=20)
 for v in o.data.vertices:
  x=v.co.x+at[0];y=v.co.z+at[1];v.co.y=-(surf(x,y)+.006-v.co.y)
 return o

def ear_leaf(name,at,width,height,depth,material,parent,role=None,curve_x=0,triangle=False):
 # Rounded pointed leaf with a continuous tapered, curved volume.
 vs=[];fs=[];rings=18;sides=20
 for j in range(rings+1):
  t=j/rings;radius=((1-t)**.7*(.62+.38*min(1,t*8)) if triangle else sin(pi*t)**.72);cx=curve_x*t*t
  for i in range(sides):a=2*pi*i/sides;vs.append((cx+width*radius*cos(a),height*t,depth*radius*sin(a)))
 for j in range(rings):
  for i in range(sides):fs.append((j*sides+i,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,j*sides+(i+1)%sides))
 return mesh(name,vs,fs,material,parent,at,role)

def tail_curve(name,points,radii,material,parent,tip=None,flat=1):
 o=tube(name,points,radii,material,parent,role='Tail',sides=24)
 if tip:
  o.data.materials.append(tip)
  for f in o.data.polygons:
   if f.index>=int((len(points)-1)*24*.70):f.material_index=1
 return o

def face(head,kind,sx=.42,sy=.34,sz=.30):
 surf=lambda x,y:front(x,y,sx,sy,sz)
 if kind=='fox':
  patch('Fox.CreamMuzzle',(0,-.145,0),(.366,.157,.014),cream,head,surf)
 elif kind=='beaver':patch('Beaver.Muzzle',(0,-.116,0),(.161,.107,.025),tan,head,surf)
 for s in[-1,1]:
  x=s*(.148 if kind!='penguin' else .153);y=.025
  ell('Eye.'+str(s),(x,y,surf(x,y)+.012),(.030,.043,.022),dark,head,seg=24,rings=16,exp=1)
  ell('Eye.glint.'+str(s),(x-.007,y+.013,surf(x,y)+.032),(.007,.010,.004),ivory,head,seg=12,rings=8)
  x=s*.26;y=-.083;patch('Cheek.'+str(s),(x,y,0),(.052,.033,.008),blush,head,lambda x,y:surf(x,y)+(.018 if kind=='fox' else 0))
  pts=[(s*(.12+.058*t),.13+.018*sin(pi*t),surf(s*(.12+.058*t),.13+.018*sin(pi*t))+.004)for t in[i/12 for i in range(13)]]
  tube('Brow.'+str(s),pts,.008,brow,head)
 if kind=='penguin':return
 ell('Nose',(0,-.037,surf(0,-.037)+.033),(.045,.028,.028),brownnose,head,seg=24,rings=16)
 ell('Nose.glint',(-.009,-.028,surf(0,-.037)+.057),(.010,.006,.003),tan,head,seg=12,rings=8)
 if kind=='dog':
  ell('Happy mouth',(0,-.136,surf(0,-.136)+.012),(.059,.062,.012),mouth,head,seg=24,rings=16)
  ell('Tongue',(0,-.163,surf(0,-.163)+.028),(.034,.028,.009),tongue,head,seg=24,rings=14)
 for s in[-1,1]:
  pts=[]
  for i in range(18):t=i/17;x=s*.099*t;y=-.067-.041*sin(pi*t*.90);pts.append((x,y,surf(x,y)+(.041 if kind=='beaver' else .029 if kind=='fox' else .018)))
  tube('Smile.'+str(s),pts,.006,brownnose,head)
 if kind=='beaver':
  for side in[-1,1]:
   for n in[-1,1]:
    x=side*.34;y=-.085+n*.022;z=surf(x,y)+.014
    curve('Beaver whisker'+str(side)+str(n),(x,y,z),(side*.40,y+.014*n,z-.005),(side*.46,y+.02*n,z-.025),.0035,brownnose,head,steps=8)
  for s,side in[(-1,'L'),(1,'R')]:rounded('Buck tooth '+side,(s*.023,-.167,surf(0,-.167)+.04),(.042,.085,.024),ivory,head,.012,'Tooth.'+side)


def foot(parent,side,s,material,penguin=False,darktoe=None):
 g=group('Foot.'+side,parent,(s*.15,.075,.07))
 ell('Soft foot '+side,(0,0,0),(.125,.075,.15 if not penguin else .17),material,g,seg=28,rings=16,exp=.78)
 for i in[-1,0,1]:
  if penguin:ell('Webbed toe '+side+str(i),(i*.067,-.016,.12),(.047,.044,.065),material,g,seg=16,rings=10)
  elif darktoe:
   pts=[(i*.037,-.008-.038*j/10,front(i*.037,-.008-.038*j/10,.125,.075,.15,.78)+.0015) for j in range(11)];tube('Toe seam '+side+str(i),pts,.0023,darktoe,g,sides=6)
 return g

def arm(work,side,s,fur,shirt=True,flipper=False,tight=False,reach=.335):
 g=group('Arm.'+side,work,(s*.29,.18,.01))
 if flipper:
  o=ell('Flipper.'+side,(s*.055,-.11,.07),(.095,.215,.075),fur,g,seg=28,rings=20,exp=.9);o.rotation_euler[1]=-s*.4
 else:
  A=(0,0,0);B=((s*.025,-.085,.205) if reach>.40 else (s*.125,-.14,.07));C=(s*(-.065 if tight else .045),-.10,reach)
  pts=[];rs=[]
  for i in range(25):
   t=i/24;pts.append(tuple((1-t)**2*A[k]+2*(1-t)*t*B[k]+t*t*C[k]for k in range(3)));rs.append(.089*(.3+.7*min(1,t*9)) if i<3 else (.094 if t<.85 else .094*max(.02,cos((t-.85)/.15*pi/2))))
  o=tube('Continuous tailored arm '+side,pts,rs,fur,g,sides=16)
  if shirt:
   o.data.materials.append(ivory)
   for f in o.data.polygons:
    if f.index<13*16:f.material_index=1
 return g

def apron(body,color):
 # One softly rounded skirt, shallow wrapped bib, broad straps and inset pockets.
 ell('Apron skirt',(0,.39,.008),(.335,.235,.267),color,body,'Apron',seg=40,rings=22,exp=.54)
 rounded('Apron bib',(0,.735,.241),(.365,.31,.032),color,body,.050)
 for s in[-1,1]:
  curve('Apron strap'+str(s),(s*.19,.91,.10),(s*.17,.88,.22),(s*.16,.70,.263),.025,color,body)
  rounded('Apron pocket'+str(s),(s*.196,.39,.257),(.15,.115,.030),color,body,.022)
  ell('Apron brass button'+str(s),(s*.155,.793,.269),(.012,.012,.008),brass,body,seg=12,rings=10)
 tube('Apron waist seam',[(-.29,.565,.142),(-.22,.565,.227),(0,.565,.277),(.22,.565,.227),(.29,.565,.142)],.012,color,body)


def cap(head):
 g=group('Cap',head,(0,.59,0));g.rotation_euler[1]=-.10
 ell('Ochre post crown',(0,0,0),(.372,.096,.295),ochre,g,seg=40,rings=20,exp=.65)
 ell('Navy cap band',(0,-.055,0),(.349,.041,.282),navy,g,seg=40,rings=16,exp=.68)
 ell('Dark curved peak',(0,-.083,.203),(.310,.022,.168),leatherdark,g,seg=36,rings=16,exp=.78)
 ell('Post cap medallion',(0,-.006,.297),(.045,.049,.012),brass,g,seg=24,rings=16)
 # embossed envelope badge
 rounded('Post cap envelope badge',(0,-.005,.310),(.048,.027,.005),ochre,g,.003)
 tube('Post cap badge flap',[(-.022,.006,.314),(0,-.009,.315),(.022,.006,.314)],.002,cream,g)
 return g

def envelope(name,parent,at,role=None):
 g=group(role or name,parent,at)
 rounded(name+' paper',(0,0,0),(.222,.155,.017),paper,g,.009)
 tube(name+' lower seams',[(-.103,-.068,.012),(0,.015,.013),(.103,-.068,.012)],.003,tan,g)
 tube(name+' flap',[(-.103,.069,.014),(0,-.020,.016),(.103,.069,.014)],.003,tan,g)
 ell(name+' wax seal',(0,-.010,.020),(.027,.027,.009),seal,g,seg=20,rings=14)
 return g

def bag(body):
 g=group('Bag',body,(-.385,.42,.105));g.rotation_euler[1]=-.14
 rounded('Satchel body',(0,0,0),(.27,.27,.145),leather,g,.050)
 rounded('Satchel front pocket',(0,-.050,.079),(.222,.15,.030),leather,g,.025)
 rounded('Satchel flap',(0,.073,.088),(.285,.13,.034),leather,g,.03)
 rounded('Satchel brass clasp',(0,.015,.113),(.041,.065,.014),brass,g,.009)
 ell('Satchel clasp slot',(0,.010,.123),(.006,.012,.003),leatherdark,g,seg=12,rings=10)
 envelope('Letter in satchel',g,(0,.17,.009));
 # Wide cross-body strap is a curved ribbon, with a real buckle at chest.
 pts=[(-.39,.53,.22),(-.21,.63,.31),(.0,.74,.337),(.20,.89,.27),(.30,1.03,.13)]
 tube('Postal shoulder strap',pts,.033,leather,body,sides=8)
 buck=rounded('Postal strap buckle',(.10,.808,.341),(.096,.071,.018),brass,body,.010);buck.rotation_euler[1]=-.55
 slot=rounded('Postal buckle opening',(.10,.808,.354),(.070,.047,.006),leatherdark,body,.006);slot.rotation_euler[1]=-.55
 return g

def breadtray(work):
 g=group('Tray',work,(0,-.075,.39))
 rounded('Wooden bread tray',(0,0,0),(.65,.033,.335),wood,g,.028)
 for s in[-1,1]:rounded('Tray side rail'+str(s),(s*.312,.031,0),(.028,.07,.34),wood,g,.012)
 for s in[-1,1]:rounded('Tray end rail'+str(s),(0,.031,s*.158),(.625,.06,.025),wood,g,.010)
 rounded('Linen tray liner',(0,.022,0),(.58,.010,.282),ivory,g,.008)
 roll=ell('Sesame brioche',(-.155,.100,.018),(.137,.094,.117),bread,g,'Bread.Roll',seg=36,rings=22)
 for k in range(12):
  a=k*2.4;r=.04+.028*(k%3);x=-.155+r*cos(a);z=.018+r*sin(a);seed=ell('Sesame'+str(k),(x,.190-(r/.14)**2*.028,z),(.005,.0028,.010),ivory,g,seg=10,rings=6);seed.rotation_euler[2]=a
 flower=group('Bread.Flower',g,(.155,.049,-.008));ell('Flower bread core',(0,.025,0),(.114,.065,.109),breadlight,flower,seg=28,rings=16)
 for k in range(6):a=k/6*2*pi;ell('Flower bread lobe'+str(k),(.068*cos(a),.05,.064*sin(a)),(.054,.073,.052),breadlight,flower,seg=20,rings=14)
 ell('Flower bread center',(0,.093,0),(.047,.044,.043),bread,flower,seg=20,rings=14)
 dough=group('Dough',work,(0,-.035,.39));rounded('Kneading board',(0,-.043,0),(.62,.034,.32),wood,dough,.02);ell('Soft dough',(0,.013,0),(.174,.065,.105),paper,dough,seg=32,rings=18)
 return g

def landscape(work):
 g=group('Frame',work,(.075,-.065,.402));g.rotation_euler[1]=-.03
 rounded('Landscape backing',(0,.13,0),(.414,.452,.020),sky,g,.010,'Frame.Picture')
 for s in[-1,1]:rounded('Frame vertical'+str(s),(s*.217,.13,.018),(.056,.53,.048),woodlight,g,.01)
 for s in[-1,1]:rounded('Frame horizontal'+str(s),(0,.13+s*.237,.018),(.44,.056,.049),woodlight,g,.01)
 # Original low-relief illustration: green hill, winding path, cottage, tree, cloud.
 ell('Picture hill',(-.058,-.042,.018),(.190,.086,.006),green,g,seg=28,rings=16)
 ell('Picture far hill',(.10,-.017,.016),(.10,.085,.004),sage,g,seg=24,rings=16)
 curve('Picture path',(.055,-.084,.028),(-.13,-.025,.028),(.086,.003,.028),.014,paper,g,steps=12)
 rounded('Picture cottage',(.110,.02,.028),(.10,.091,.013),tan,g,.004)
 mesh('Picture cottage roof',[(.042,.055,.037),(.108,.121,.037),(.173,.055,.037)],[(0,1,2)],terracotta,g)
 rounded('Picture cottage door',(.114,.004,.039),(.023,.040,.005),leatherdark,g,.002)
 rounded('Picture cottage window',(.083,.040,.039),(.020,.020,.005),paper,g,.002)
 tube('Picture tree trunk',[(-.112,-.01,.030),(-.107,.15,.030)],.011,wood,g)
 for k,(x,y,r)in enumerate([(-.11,.15,.055),(-.15,.105,.046),(-.076,.103,.045),(-.11,.208,.041)]):ell('Picture tree canopy'+str(k),(x,y,.035),(r,r,.012),sage,g,seg=20,rings=14)
 for k in[-1,0,1]:ell('Picture cloud'+str(k),(.09+k*.028,.264+(.016 if k==0 else 0),.028),(.036,.022,.006),ivory,g,seg=16,rings=10)
 # Restrained wood grooves around perimeter.
 for s in[-1,1]:
  for n in[-1,1]:tube('Frame woodgrain'+str(s)+str(n),[(s*.221+n*.010,-.102,.046),(s*.216+n*.010,.105,.047),(s*.221+n*.010,.36,.046)],.0018,wood,g)
 return g

def camera(work):
 g=group('Camera',work,(0,-.027,.365))
 rounded('Camera leather body',(0,0,0),(.355,.202,.105),leatherdark,g,.028)
 rounded('Camera silver top',(0,.082,.010),(.367,.042,.112),silver,g,.012)
 rounded('Camera silver bottom',(0,-.091,.010),(.35,.025,.109),silver,g,.009)
 rounded('Camera prism hump',(.03,.126,.011),(.115,.060,.084),silver,g,.015)
 rounded('Camera viewfinder',(.031,.128,.057),(.060,.025,.007),lens,g,.004)
 rounded('Camera front window',(-.12,.074,.072),(.049,.027,.006),lens,g,.004)
 for x in[-.122,.122]:ell('Camera dial'+str(x),(x,.114,.0),(.031,.016,.029),silver,g,seg=24,rings=10)
 ell('Camera shutter button',(.13,.14,.015),(.017,.014,.017),brownnose,g,'Camera.Shutter',seg=20,rings=12)
 lensg=group('Camera.Lens',g,(.022,-.008,.070))
 for i,(r,d,col)in enumerate([(.093,.017,silver),(.081,.038,leatherdark),(.066,.047,silver),(.057,.055,lens),(.041,.061,lensinner)]):ell('Lens barrel'+str(i),(0,0,d),(r,r,.018),col,lensg,seg=36,rings=16)
 ell('Lens reflection',(-.017,.018,.080),(.016,.020,.005),sky,lensg,seg=20,rings=12)
 for x in[-.14,.145]:ell('Camera rivet'+str(x),(x,-.026,.064),(.007,.007,.006),brass,g,seg=12,rings=8)
 return g


import bmesh
_high_ell=ell
_high_tube=tube
_LOW_SCALE={'cafe-dog':.60,'craft-beaver':.65,'post-penguin':.78,'photo-fox':.60}
def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 density=_LOW_SCALE[id]
 # Preserve minimum face definition and all tiny highlights/seeds/buttons.
 detail=any(k in name.lower() for k in ['eye','nose','mouth','tongue','beak','seal','lens','dial','shutter','muzzle'])
 if seg<=16:
  newseg,newrings=seg,rings
 elif detail:
  newseg=min(seg,max(20,round(seg*max(density,.80)/2)*2))
  newrings=min(rings,max(12,round(rings*max(density,.80))))
 else:
  newseg=min(seg,max(12,round(seg*density/2)*2))
  newrings=min(rings,max(8,round(rings*density)))
 obj=_high_ell(name,at,scale,material,parent,role,newseg,newrings,exp,pear)
 # The source parameterization repeats each zero-radius pole `seg` times.
 # Merge only coincident vertices (sub-nanometer tolerance in meter units).
 # This removes zero-area pole triangles without altering the surface.
 bm=bmesh.new();bm.from_mesh(obj.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-9)
 bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-10)
 bm.to_mesh(obj.data);bm.free();obj.data.update()
 return obj

def tube(name,points,r,material,parent,role=None,sides=8):
 if not isinstance(r,list) and len(points)>2:
  # Straight constant-radius runs are over-sampled in the approved source.
  # Endpoints and every bend are retained; there is no RDP approximation.
  keep=[points[0]]
  for i in range(1,len(points)-1):
   a=Vector(points[i])-Vector(keep[-1]);b=Vector(points[i+1])-Vector(points[i])
   if a.cross(b).length>1e-8 or a.dot(b)<0:keep.append(points[i])
  keep.append(points[-1]);points=keep
 return _high_tube(name,points,r,material,parent,role,sides)

stats={}
for kind,id in [('dog','cafe-dog'),('beaver','craft-beaver'),('penguin','post-penguin'),('fox','photo-fox')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);M={}
 cream=mat('Warm cream','F5E7CE');ivory=mat('Linen ivory','F8F1E4');tan=mat('Soft biscuit','D6B18A');dark=mat('Warm charcoal eyes','272426',.30);brow=mat('Soft warm outlines','987153');brownnose=mat('Cocoa nose','5D3D2B',.42);mouth=mat('Smile interior','673126');tongue=mat('Warm rose tongue','E98774');blush=mat('Apricot cheeks','EDAA92');brass=mat('Antique brass','CBA05C',.42);paper=mat('Envelope and dough cream','F2DFB7');seal=mat('Letter wax seal','B94B35');wood=mat('Walnut tray and grain','865734');woodlight=mat('Honey oak frame','C28C54');green=mat('Landscape clover','9BA365');sage=mat('Landscape sage','AAB276');sky=mat('Landscape pale sky','CAD7C6');terracotta=mat('Terracotta roof','A66C44');ochre=mat('Ochre postal cap','DFA249');navy=mat('Postal cap band','3D4C59');leather=mat('Cognac postal leather','9F693D');leatherdark=mat('Deep warm brown','503E30');bread=mat('Golden brioche','BC752E',.49);breadlight=mat('Milk bread','E8B86D',.57);silver=mat('Warm silver camera','C2B9A5',.33);lens=mat('Dark lens glass','232D30',.14);lensinner=mat('Lens reflected bluegray','53646A',.16)
 fur=mat(kind+' main fur',{'dog':'F4E6CA','beaver':'A87954','penguin':'8794A8','fox':'CF733B'}[kind]);accent=mat(kind+' accent',{'dog':'C89056','beaver':'78513B','penguin':'E2A447','fox':'61412E'}[kind]);clothing=mat(kind+' clothing',{'dog':'CC9477','beaver':'7D8262','penguin':'8794A8','fox':'66818D'}[kind])
 root=group(id);root['species']=id;root['version']=1;body=group('BodyRig',root);work=group('WorkRig',body,(0,.70,0));head=group('HeadRig',body,(0,1.25,0))
 if kind=='penguin':
  # Penguin has one continuous pear silhouette, with mask/belly mapped to its surface.
  bodymesh=ell('Penguin continuous body',(0,.74,0),(.409,.638,.325),fur,body,'Body',seg=52,rings=38,exp=.84,pear=.08)
  head['role']='HeadRig';marker=group('Head',head,role='Head')
  def psurf(x,y):
   h=max(-.999,min(.999,(y-.74)/.638));lat=math.asin(math.copysign(abs(h)**(1/.84),h));r=abs(cos(lat))**.84*(1-.08*h)
   return .325*r*sqrt(max(0,1-(x/(.409*r))**2))
  patch('Penguin ivory belly',(0,.53,0),(.302,.432,.010),ivory,body,psurf)
  for s in[-1,1]:patch('Penguin face mask'+str(s),(s*.13,.997,0),(.174,.263,.015),ivory,body,psurf)
  # Eyes follow actual pear front surface rather than detached discs.
  for s in[-1,1]:
   x=s*.143;y=1.067;z=psurf(x,y)+.014;ell('Eye'+str(s),(x,y,z),(.029,.041,.020),dark,body,seg=24,rings=16,exp=1);ell('Eye glint'+str(s),(x-.008,y+.011,z+.017),(.006,.009,.004),ivory,body,seg=12,rings=8)
   patch('Penguin blush'+str(s),(s*.245,.962,0),(.05,.036,.008),blush,body,lambda x,y:psurf(x,y)+.018)
  beak=group('Beak',body,(0,1.010,psurf(0,1.01)+.016));ell('Penguin lower beak',(0,-.041,.026),(.077,.035,.056),accent,beak,seg=28,rings=16);ell('Penguin smile opening',(0,-.026,.085),(.055,.024,.009),mouth,beak,seg=24,rings=16);ell('Penguin upper beak',(0,.011,.024),(.090,.035,.090),accent,beak,seg=28,rings=18)
  capg=cap(head);capg.location=V((0,.105,0));bag(body)
  l=arm(work,'L',-1,fur,False,True);r=arm(work,'R',1,fur,False,True);r.rotation_euler[1]=-.99
  letter=envelope('Delivered letter',r,(.055,-.305,.155),'Envelope');letter.rotation_euler[1]=.98
  for s,side in[(-1,'L'),(1,'R')]:foot(root,side,s,accent,True)
  ell('Penguin tail',(0,.29,-.32),(.11,.14,.15),fur,body,'Tail',seg=28,rings=18)
 else:
  ell(kind+' tailored torso',(0,.585,0),(.285,.378,.239),ivory,body,'Body',seg=40,rings=28,exp=.85,pear=.13)
  ell(kind+' soft head',(0,0,0),(.42,.34,.30),fur,head,'Head',seg=52,rings=34,exp=.83)
  face(head,kind)
  for s,side in[(-1,'L'),(1,'R')]:foot(root,side,s,accent if kind=='fox' else fur,darktoe=brow);arm(work,side,s,accent if kind=='fox' else fur,tight=kind=='fox' or (kind=='beaver' and s==-1),reach=.42 if kind=='beaver' else .335)
  for s,side in[(-1,'L'),(1,'R')]:
   leg=group('Leg.'+side,body,(s*.15,.205,-.012));ell('Continuous ankle '+side,(0,0,0),(.112,.15,.116),fur,leg,seg=28,rings=18)
  # Small folded linen collar and central placket.
  for s in[-1,1]:
   col=rounded('Folded collar'+str(s),(s*.083,.925,.200),(.14,.074,.032),ivory,body,.019);col.rotation_euler[1]=s*.40
  if kind=='dog':
   apron(body,clothing)
   for s,side in[(-1,'L'),(1,'R')]:
    g=group('Ear.'+side,head,(s*.357,.145,-.01));g.rotation_euler[1]=s*.20
    ell('Long drooping ear '+side,(s*.062,-.24,.003),(.132,.299,.101),accent,g,seg=40,rings=28,exp=.89,pear=-.13)
   curve('Dog forehead tuft',(-.08,.32,.04),(-.12,.405,.022),(.029,.351,.06),[.02+.013*sin(i/20*pi) for i in range(21)],fur,head)
   for s in[-1,1]:
    bow=ell('Apron bow'+str(s),(.18+s*.040,.53,.281),(.053,.033,.027),clothing,body,seg=20,rings=14);bow.rotation_euler[1]=s*.30
   curve('Apron bow tail',(.19,.52,.28),(.22,.45,.29),(.24,.42,.28),.018,clothing,body)
   pts=[];rs=[]
   for i in range(24):t=i/23;pts.append((-.22-.16*sin(t*pi*.8),.29+t*.24,-.14-.10*sin(pi*t)));rs.append(.07*sin(pi*t)**.6+.002)
   tail_curve('Dog soft curled tail',pts,rs,fur,body)
   breadtray(work)
  elif kind=='beaver':
   apron(body,clothing)
   for s,side in[(-1,'L'),(1,'R')]:
    g=group('Ear.'+side,head,(s*.329,.278,-.017));ell('Beaver round ear '+side,(0,0,0),(.083,.089,.060),fur,g,seg=24,rings=18);ell('Beaver inner ear '+side,(0,.002,.053),(.044,.046,.014),accent,g,seg=20,rings=14)
   for n in range(3):curve('Beaver hair tuft'+str(n),(-.075+n*.04,.31,0),(-.055+n*.04,.39+.017*n,.01),(-.018+n*.04,.345,.015),.020,fur,head)
   tail=group('Tail',body,(-.36,.34,-.19));tail.rotation_euler[1]=-.43
   ell('Beaver broad flat paddle',(0,.03,0),(.205,.298,.045),accent,tail,seg=40,rings=28,exp=.81)
   for k in range(-3,4):
    for sign in[-1,1]:
     pts=[]
     for i in range(33):
      x=-.19+.38*i/32;y=k*.061+sign*x*.69+.03
      if (x/.20)**2+((y-.03)/.295)**2<.88:pts.append((x,y,.047))
     if len(pts)>1:tube('Paddle crosshatch'+str(k)+str(sign),pts,.0045,leatherdark,tail,sides=6)
   landscape(work)
   pencil=rounded('Pocket pencil',(-.218,.515,.279),(.021,.15,.022),ochre,body,.004);pencil.rotation_euler[1]=-.15
  else:
   # Distinct pointed ears, dark tips and recessed ivory ear interiors.
   for s,side in[(-1,'L'),(1,'R')]:
    g=group('Ear.'+side,head,(s*.257,.223,-.013));g.rotation_euler[1]=-s*.18
    outer=ear_leaf('Fox pointed ear '+side,(0,0,0),.148,.345,.085,fur,g,triangle=True)
    outer.data.materials.append(accent)
    for f in outer.data.polygons:
     if f.index>=18*20*.75:f.material_index=1
    inner=ear_leaf('Fox ivory inner ear '+side,(0,.070,0),.076,.218,.007,cream,g,triangle=True)
    for v in inner.data.vertices:
     y=v.co.z+.070;t=y/.345;r=(1-t)**.7*(.62+.38*min(1,t*8));z=.085*r*sqrt(max(0,1-(v.co.x/(.148*r))**2))+.004
     v.co.y=-z+v.co.y
   for n in range(2):curve('Fox forehead tuft'+str(n),(-.06+n*.06,.31,.025),(-.01+n*.045,.372,.029),(.034+n*.04,.312,.054),.019,fur,head)
   # Tail is a shaped continuous plume behind the body; cream is built-in material split.
   pts=[];rs=[]
   for i in range(37):t=i/36;pts.append(tuple((1-t)**2*a+2*(1-t)*t*b+t*t*c for a,b,c in zip((-.07,.34,-.17),(-.65,.16,-.24),(-.37,.84,-.25))));rs.append(.142*sin(pi*t)**.68+.070*(1-t)**3+.002)
   tail_curve('Fox cream tipped plume',pts,rs,fur,body,cream)
   # Vest panels hug the linen torso and remain separate on its open center.
   for s,side in[(-1,'L'),(1,'R')]:
    panel=rounded('Blue vest '+side,(s*.183, .63,.191),(.158,.458,.057),clothing,body,.036,'Vest.'+side)
    rounded('Vest pocket '+side,(s*.202,.489,.229),(.102,.068,.012),clothing,body,.014)
    for y in[.548,.723]:ell('Vest brass button'+side+str(y),(s*.119,y,.234),(.011,.011,.008),brass,body,seg=12,rings=10)
    tube('Camera neck strap'+side,[(s*.17,.932,.11),(s*.208,.846,.223),(s*.18,.743,.304),(s*.16,.70,.365)],.014,leather,body,sides=8)
   camera(work)
 bpy.context.view_layer.update()
 # All declared parts are standalone transform nodes; no mutable geometry at runtime.
 bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.scene.objects:
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
 # Batch same-material static details inside each transform control, preserving every semantic role.
 batches={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and not o.get('role') and len(o.data.materials)==1:
   key=(o.parent.name if o.parent else '',o.data.materials[0].name);batches.setdefault(key,[]).append(o)
 for key,objects in batches.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=key[0]+'.'+key[1]+'.batch';objects[0].select_set(False)
 path=os.path.join(ROOT,id+'.glb');bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_extras=True,export_yup=True)
 tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH');stats[id]={'triangles':tris,'meshes':sum(o.type=='MESH' for o in bpy.context.scene.objects),'bytes':os.path.getsize(path)}
 print('SHOP_ASSET',id,stats[id])
json.dump(stats,open(ROOT+'/asset-stats.json','w'),indent=2)
