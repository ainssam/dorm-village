"""Faithful analytic craft-beaver polish. Run: blender -b --python build_craft_beaver.py
Writes only alongside this standalone generator and its vendored original helper.
No imagegen, voxel remesh, textures, runtime code changes or production writes.
"""
from pathlib import Path
import hashlib, sys
OUT=Path(__file__).resolve().parent
SRC=OUT/'baseline_shop_generator.py'
source=SRC.read_text()
cut=source.index('stats={}')
exec(compile(source[:cut],str(SRC),'exec'),globals())
ROOT=str(OUT)
import bmesh
_orig_ell=ell
_orig_tube=tube

def tube(name,points,r,material,parent,role=None,sides=8):
 if len(points)>10 and not name.startswith(('Continuous sleeve','Paddle')):
  ix=list(range(0,len(points),2))
  if ix[-1]!=len(points)-1:ix.append(len(points)-1)
  points=[points[i]for i in ix]
  if isinstance(r,list):r=[r[i]for i in ix]
 if not isinstance(r,list) and len(points)>2:
  keep=[points[0]]
  for i in range(1,len(points)-1):
   a=Vector(points[i])-Vector(keep[-1]);b=Vector(points[i+1])-Vector(points[i])
   if a.cross(b).length>1e-8 or a.dot(b)<0:keep.append(points[i])
  keep.append(points[-1]);points=keep
 return _orig_tube(name,points,r,material,parent,role,min(sides,16))

def add_tint(o,name,basehex,tint_fn):
 base=tuple(linear(int(basehex[i:i+2],16)/255)for i in(0,2,4))
 col=o.data.color_attributes.new(name=name,type='FLOAT_COLOR',domain='POINT')
 for v,c in zip(o.data.vertices,col.data):c.color=tuple(tint_fn(v.co.x,v.co.z,-v.co.y,base))+(1,)
 material=mat(name,'FFFFFF',.72);nodes=material.node_tree.nodes;vc=nodes.new('ShaderNodeVertexColor');vc.layer_name=name;material.node_tree.links.new(vc.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color']);o.data.materials.clear();o.data.materials.append(material)

def beaver_surf(x,y):
 # Broad beaver cheeks and small paired incisor muzzle, shaped in one skull.
 h=max(-.999999,min(.999999,y/.343));r=max(.00001,1-abs(h)**(2/.93))**(.93/2)
 w=.421*r*(1-.055*h);z=.300*r*sqrt(max(0,1-(x/w)**2))
 bump=.039*(math.exp(-((x-.069)/.096)**2-((y+.113)/.086)**2)+math.exp(-((x+.069)/.096)**2-((y+.113)/.086)**2))
 cheek=.012*math.exp(-((abs(x)-.23)/.12)**2-((y+.105)/.12)**2)
 return z+bump+cheek

def head_mesh(name,material,parent,role):
 seg=40;rings=26;vs=[];fs=[]
 for j in range(rings+1):
  t=-pi/2+pi*j/rings;h=math.copysign(abs(sin(t))**.93,sin(t));r=abs(cos(t))**.93;y=.343*h
  for i in range(seg):
   a=2*pi*i/seg;x=.421*r*(1-.055*h)*cos(a);z=.300*r*sin(a)
   if sin(a)>0:z+=(beaver_surf(x,y)-.300*r*sin(a))*max(0,sin(a))**5
   vs.append((x,y,z))
 for j in range(rings):
  for i in range(seg):fs.append((j*seg+i,(j+1)*seg+i,(j+1)*seg+(i+1)%seg,j*seg+(i+1)%seg))
 o=mesh(name,vs,fs,material,parent,role=role)
 tanrgb=tuple(linear(int('D6B18A'[i:i+2],16)/255)for i in(0,2,4));pink=tuple(linear(int('EDAA92'[i:i+2],16)/255)for i in(0,2,4))
 def tint(x,y,z,base):
  # Closed soft-edged tan muzzle, integrated into broad lower cheeks.
  frontweight=max(0,min(1,(z-.13)/.10));a=.98*math.exp(-(((x/.171)**2+((y+.127)/.104)**2)**3))*frontweight
  b=.57*math.exp(-((abs(x)-.264)/.070)**2-((y+.085)/.046)**2)*frontweight
  color=[base[k]*(1-a)+tanrgb[k]*a for k in range(3)]
  return [color[k]*(1-b)+pink[k]*b for k in range(3)]
 add_tint(o,'Beaver continuous fur and cheek tint','A87954',tint)
 return o

def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 if name=='beaver soft head':return head_mesh(name,material,parent,role)
 if name=='beaver tailored torso':return _orig_ell(name,(0,.586,0),(.290,.380,.244),material,parent,role,28,20,1,.13)
 if name.startswith(('Picture tree canopy','Picture cloud')):seg=min(seg,14);rings=min(rings,8)
 detail=any(k in name.lower()for k in ['eye','nose','mouth','tooth'])
 seg=min(seg,22 if detail else 18);rings=min(rings,14 if detail else 11)
 return _orig_ell(name,at,scale,material,parent,role,seg,rings,max(exp,.93)if name.startswith(('Soft foot','Continuous ankle'))else exp,pear)

def face(head,kind,*args):
 surf=beaver_surf
 for s in [-1,1]:
  x=s*.148;y=.026;z=surf(x,y)+.007
  ell('Eye.'+str(s),(x,y,z),(.032,.044,.022),dark,head,seg=24,rings=16,exp=1)
  ell('Eye.glint.'+str(s),(x-.008,y+.014,z+.018),(.0065,.009,.003),ivory,head,seg=12,rings=8,exp=1)
  pts=[]
  for i in range(13):
   t=i/12;x=s*(.125+.055*t);y=.139+.017*sin(pi*t);pts.append((x,y,surf(x,y)+.003))
  tube('Soft beaver brow'+str(s),pts,[.0025+.0032*sin(pi*i/12)for i in range(13)],brow,head,sides=6)
 n=ell('Nose',(0,-.044,surf(0,-.044)+.016),(.047,.027,.025),brownnose,head,seg=24,rings=16,exp=.93)
 for v in n.data.vertices:v.co.x*=1+.18*v.co.z/.027
 ell('Nose.glint',(-.011,-.035,surf(0,-.044)+.037),(.009,.0045,.0028),tan,head,seg=12,rings=8)
 tube('Muzzle philtrum',[(0,-.063,surf(0,-.063)+.010),(0,-.099,surf(0,-.099)+.008)],.0035,brownnose,head,sides=6)
 for s in[-1,1]:
  pts=[]
  for i in range(17):
   t=i/16;x=s*.105*t;y=-.099-.031*sin(pi*t*.94);pts.append((x,y,surf(x,y)+.007))
  tube('Smile.'+str(s),pts,[.003+.0013*sin(pi*i/16)for i in range(17)],brownnose,head,sides=6)
  for n in [-1,1]:
   x=s*.328;y=-.078+n*.026;z=surf(x,y)+.008
   curve('Beaver whisker'+str(s)+str(n),(x,y,z),(s*.405,y+n*.012,z-.008),(s*.461,y+n*.022,z-.032),.0027,brownnose,head,steps=8)
  tooth=rounded('Buck tooth '+('L'if s<0 else'R'),(s*.023,-.174,surf(0,-.174)+.013),(.042,.092,.026),ivory,head,.010,'Tooth.'+('L'if s<0 else'R'))
  # Roots disappear into upper muzzle; tips lean gently out in characteristic paired incisors.
  for v in tooth.data.vertices:v.co.y-=.05*(-v.co.z)

def loft(name,profile,material,parent,role=None,sides=28):
 vs=[];fs=[]
 for cx,y,cz,rx,rz in profile:
  for i in range(sides):
   a=2*pi*i/sides;vs.append((cx+rx*cos(a),y,cz+rz*sin(a)))
 for j in range(len(profile)-1):
  for i in range(sides):fs.append((j*sides+i,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,j*sides+(i+1)%sides))
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(profile)-1)*sides+i for i in range(sides))])
 return mesh(name,vs,fs,material,parent,role=role)

def apron(body,color):
 profile=[]
 for j in range(17):
  t=j/16;y=.245+.363*t;rx=.329-.033*t+.004*sin(pi*t);rz=.262-.005*t
  profile.append((0,y,0,rx,rz))
 skirt=loft('Apron fitted skirt',profile,color,body,role='Apron',sides=28)
 for v in skirt.data.vertices:
  a=math.atan2(-v.co.y,v.co.x);t=(v.co.z-.245)/.363;f=.0024*sin(7*a)*sin(pi*t);v.co.x+=f*cos(a);v.co.y-=f*sin(a)
 tube('Apron rolled hem',[(.329*cos(2*pi*i/48),.253,.262*sin(2*pi*i/48))for i in range(49)],.0045,color,body,sides=6)
 vs=[];fs=[];rows=11;cols=13
 for j in range(rows):
  t=j/(rows-1);y=.583+.287*t;w=.242-.069*t
  for i in range(cols):
   u=-1+2*i/(cols-1);vs.append((w*u,y,.253+.007*sin(pi*t)-.069*u*u))
 for j in range(rows-1):
  for i in range(cols-1):a=j*cols+i;fs.append((a,a+1,a+cols+1,a+cols))
 bib=mesh('Apron curved bib',vs,fs,color,body);sol=bib.modifiers.new('Cloth thickness','SOLIDIFY');sol.thickness=.008;bpy.context.view_layer.objects.active=bib;bpy.ops.object.modifier_apply(modifier=sol.name)
 for s in [-1,1]:
  curve('Apron shoulder strap'+str(s),(s*.176,.927,.073),(s*.186,.936,.199),(s*.165,.824,.249),.020,color,body,steps=14)
  ell('Apron brass button'+str(s),(s*.163,.811,.248),(.011,.011,.005),brass,body,seg=12,rings=8)
 for x,w in [(-.213,.125),(0,.166),(.213,.125)]:
  p=rounded('Apron curved pocket'+str(x),(x,.371,0),(w,.114,.007),color,body,.014)
  for v in p.data.vertices:
   px=v.co.x+x;py=v.co.z+.371;t=(py-.245)/.363;rx=.329-.033*t+.004*sin(pi*t);rz=.262-.005*t;v.co.y=-rz*sqrt(max(0,1-(px/rx)**2))-.005+v.co.y
  # Gentle opening lip follows the same tailored cloth.
  pts=[]
  for i in range(13):
   px=x-w*.40+w*.8*i/12;py=.427;t=(py-.245)/.363;rx=.329-.033*t+.004*sin(pi*t);rz=.262-.005*t;pts.append((px,py,rz*sqrt(max(0,1-(px/rx)**2))+.008))
  tube('Pocket opening'+str(x),pts,.003,color,body,sides=6)
 tube('Apron waist seam',[(.284*cos(i/24*pi),.595,.238*sin(i/24*pi))for i in range(25)],.0045,color,body,sides=6)

def arm(work,side,s,fur,shirt=True,flipper=False,tight=False,reach=.335):
 # Exact original runtime pivot; root cap is buried inside round shirt torso.
 g=group('Arm.'+side,work,(s*.29,.18,.01))
 A=(-s*.150,-.065,-.010);B=(s*.135,-.210,.186);C=((- .178 if s<0 else .336)-s*.29,-.135,.439)
 pts=[];rs=[]
 for i in range(31):
  t=i/30;pts.append(tuple((1-t)**2*A[k]+2*(1-t)*t*B[k]+t*t*C[k]for k in range(3)))
  r=.077+.020*sin(pi*t)**.7+.010*math.exp(-((t-.81)/.17)**2)
  if t<.10:r*=.65+.35*t/.10
  if t>.87:r*=sqrt(max(.000001,1-((t-.87)/.13)**2))
  rs.append(r)
 o=tube('Continuous sleeve and gripping paw '+side,pts,rs,fur,g,sides=16);o.data.materials.append(ivory)
 for f in o.data.polygons:
  if f.index<15*16 or f.index==len(o.data.polygons)-2:f.material_index=1
 return g

def round_ear(head,s,side):
 # Root is lower/inward in skull; it broadens without a circular ball/socket seam.
 g=group('Ear.'+side,head,(s*.292,.214,.008))
 profile=[]
 for j in range(15):
  t=j/14;r=sin(pi*t)**.57
  profile.append((s*.038*t,.146*t,-.003-.008*t,.082*r+.040*(1-t)**8,.050*r+.035*(1-t)**8))
 o=loft('Beaver rooted round ear '+side,profile,fur,g,sides=20)
 darkrgb=tuple(linear(int('78513B'[i:i+2],16)/255)for i in(0,2,4))
 def tint(x,y,z,base):
  a=1.0*math.exp(-((((x-s*.025)/.052)**2+((y-.104)/.049)**2)**5))*max(0,min(1,(z+.007)/.034))
  return[base[k]*(1-a)+darkrgb[k]*a for k in range(3)]
 add_tint(o,'Beaver ear velvet','A87954',tint)
 return g

def beaver_tail(body):
 A=(0,.347,-.188);g=group('Tail',body,A)
 def center(t):
  E=(-.305,.290,-.407);D=(-.530,.674,-.305)
  if t<.42:
   u=t/.42;B=(-.13,.32,-.36);C=tuple(E[k]-(D[k]-E[k])*.42/(3*.58) for k in range(3))
   return Vector(tuple((1-u)**3*A[k]+3*(1-u)**2*u*B[k]+3*(1-u)*u*u*C[k]+u**3*E[k]for k in range(3)))
  u=(t-.42)/.58
  return Vector(tuple(E[k]*(1-u)+D[k]*u for k in range(3)))
 def frame(t):
  c=center(t);d=center(min(1,t+.001))-center(max(0,t-.001));l=Vector((-d.y,d.x,0)).normalized()
  if t<.42:
   u=t/.42;w=.050-.010*u*u*(3-2*u);dep=.054-.013*u*u*(3-2*u)
  else:
   u=(t-.42)/.58;w=sqrt(max(0,(1-u)*(.040**2*(1+u)+.235*u*u)));dep=sqrt(max(0,(1-u)*(.041**2*(1+u)+.001*u*u)))
  return c,l,w,dep
 vs=[];fs=[];rows=26;cols=24
 for j in range(rows+1):
  t=j/rows;c,l,w,d=frame(t)
  for i in range(cols):
   a=2*pi*i/cols;p=c+l*(w*cos(a))+Vector((0,0,d*sin(a)));vs.append(tuple(p-Vector(A)))
 for j in range(rows):
  for i in range(cols):fs.append((j*cols+i,(j+1)*cols+i,(j+1)*cols+(i+1)%cols,j*cols+(i+1)%cols))
 fs.append(tuple(range(cols-1,-1,-1)));o=mesh('Beaver rear-rooted broad paddle',vs,fs,accent,g)
 for k in range(-3,4):
  for sign in [-1,1]:
   pts=[]
   for j in range(15):
    t=.46+.51*j/14;u=k*.34+sign*(t-.70)*3.8
    if abs(u)<.88:
     c,l,w,d=frame(t);p=c+l*(w*u)+Vector((0,0,d*sqrt(1-u*u)+.0015));pts.append(tuple(p-Vector(A)))
   if len(pts)>1:tube('Paddle engraved crosshatch'+str(k)+str(sign),pts,.0028,leatherdark,g,sides=6)
 return g

body=source[cut:]
body=body.replace("for kind,id in [('dog','cafe-dog'),('beaver','craft-beaver'),('penguin','post-penguin'),('fox','photo-fox')]:","for kind,id in [('beaver','craft-beaver')]:")
start=body.index("   for s,side in[(-1,'L'),(1,'R')]:\n    g=group('Ear.'+side,head,(s*.329")
end=body.index('   landscape(work)',start)
body=body[:start]+"   for s,side in[(-1,'L'),(1,'R')]:round_ear(head,s,side)\n   for n in range(3):curve('Beaver hair tuft'+str(n),(-.075+n*.04,.320,0),(-.055+n*.04,.387+.017*n,.01),(-.018+n*.04,.329,.025),[.003+.016*sin(pi*i/20)**.7 for i in range(21)],fur,head)\n   beaver_tail(body)\n"+body[end:]
body=body.replace("(-.218,.515,.279)","(-.215,.486,.205)")
body=body.replace("# Batch same-material",'''# Weld analytic poles only, never global smoothing or remeshing.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.00000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 # Batch same-material''')
body=body.replace("id+'.glb'","id+'-polished-low.glb'")
exec(compile(body,str(SRC)+'[faithful-beaver-polish]','exec'),globals())
# Quantize only vertex colors to standard normalized UNSIGNED_BYTE COLOR_0.
# This is glTF-native, requires no extension, and does not alter any position/normal.
import struct
path=OUT/'craft-beaver-polished-low.glb';raw=path.read_bytes();jsonlen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jsonlen]);binary=raw[28+jsonlen:]
color_accessors={p['attributes']['COLOR_0'] for m in doc['meshes'] for p in m['primitives'] if 'COLOR_0'in p['attributes']}
replacement={}
for ai in color_accessors:
 a=doc['accessors'][ai];v=doc['bufferViews'][a['bufferView']];n=a['count']*3
 assert a['type']=='VEC3' and a['componentType']==5126 and a.get('byteOffset',0)==0 and v['byteLength']==n*4 and not v.get('byteStride')
 vals=struct.unpack_from('<'+'f'*n,binary,v.get('byteOffset',0));replacement[a['bufferView']]=bytes(max(0,min(255,round(x*255)))for x in vals);a['componentType']=5121;a['normalized']=True
packed=bytearray()
for i,v in enumerate(doc['bufferViews']):
 while len(packed)%4:packed.append(0)
 chunk=replacement.get(i,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);v['byteOffset']=len(packed);v['byteLength']=len(chunk);packed.extend(chunk)
while len(packed)%4:packed.append(0)
doc['buffers'][0]['byteLength']=len(packed);js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);path.write_bytes(struct.pack('<III',0x46546C67,2,28+len(js)+len(packed))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(packed),0x004E4942)+packed)
stats['craft-beaver']['bytes']=path.stat().st_size;stats['craft-beaver']['vertex_color_storage']='normalized uint8';(OUT/'asset-stats.json').write_text(json.dumps(stats,indent=2));print('FINAL_MOBILE_ASSET',stats)
(OUT/'provenance.json').write_text(json.dumps({'source_generator':'baseline_shop_generator.py','source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'method':'Analytic one-surface beaver head/muzzle, vertex color cheeks, buried round ear roots, continuous sleeve/paws, fitted sage apron and rear-rump rooted crosshatched paddle. Original frame retained.','output':'craft-beaver-polished-low.glb'},indent=2))
