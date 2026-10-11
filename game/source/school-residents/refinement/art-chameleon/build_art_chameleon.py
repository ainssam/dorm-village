"""Original, reproducible DORMI art-chameleon concept-faithful polish.
Blender 4.x. Run: blender -b --python build_art_chameleon.py
No downloaded mesh, generated image, or external texture. Scratch-only output.
"""
import bpy,bmesh,math,os,json,hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
ROOT=os.path.dirname(os.path.abspath(__file__))
UPSTREAM=os.path.normpath(os.path.join(ROOT,'../../build_school_residents.py'))
# Embed the already authored primitive helpers below: standalone output is reproducible.
def mat(name,color,rough=.67):
 m=bpy.data.materials.new(name);m.use_nodes=True
 def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
 rgb=[int(color[i:i+2],16)/255 for i in(0,2,4)];p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*[linear(x)for x in rgb],1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.24;m.diffuse_color=(*rgb,1);return m

def smooth(o,m):
 o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def ell(name,loc,scale,m,seg=36,rings=24,exp=1):
 def sp(x):return math.copysign(abs(x)**exp,x)
 vs=[];fs=[]
 for j in range(rings+1):
  lat=-pi/2+pi*j/rings
  for i in range(seg):
   a=2*pi*i/seg;vs.append((scale[0]*sp(cos(lat))*sp(cos(a)),scale[1]*sp(cos(lat))*sp(sin(a)),scale[2]*sp(sin(lat))))
 for j in range(rings):
  for i in range(seg):fs.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;return smooth(o,m)

def box(name,loc,scale,m,r=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('soft tailored edges','BEVEL');b.width=r;b.segments=4;bpy.ops.object.modifier_apply(modifier=b.name);return smooth(o,m)

def tube(name,points,radii,m,sides=12):
 vs=[];fs=[]
 for i,p in enumerate(points):
  tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)]);tangent.normalize();ref=Vector((0,1,0))
  if abs(tangent.dot(ref))>.95:ref=Vector((1,0,0))
  u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
  for j in range(sides):vs.append(tuple(Vector(p)+radii[i]*(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v)))
 for i in range(len(points)-1):
  for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 fs += [tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return smooth(o,m)

def curve(name,pts,r,m):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=16;cu.bevel_depth=r;cu.bevel_resolution=3;s=cu.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for p,co in zip(s.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(m);bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False);return ob

def fuse(name,parts,m,voxel=.008,dec=.55):
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0];o.name=name;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);r=o.modifiers.new('continuous clay volume','REMESH');r.mode='VOXEL';r.voxel_size=voxel;r.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=r.name);s=o.modifiers.new('relaxed clay','SMOOTH');s.factor=.75;s.iterations=4;bpy.ops.object.modifier_apply(modifier=s.name);d=o.modifiers.new('web ready','DECIMATE');d.ratio=dec;bpy.ops.object.modifier_apply(modifier=d.name);o.data.materials.clear();o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def tree(o):
 bpy.context.view_layer.update();return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons])
def fy(t,x,z):
 h,n,i,d=t.ray_cast(Vector((x,-3,z)),Vector((0,1,0)),6)
 if h is None:raise Exception('unbacked surface '+str((x,z)))
 return h.y

def patch(name,t,center,scale,m,exp=1,embed=.009):
 o=ell(name,(center[0],0,center[1]),scale,m,48,30,exp);bpy.context.view_layer.update()
 for v in o.data.vertices:
  w=o.matrix_world@v.co;w.y=fy(t,w.x,w.z)+v.co.y-embed;v.co=o.matrix_world.inverted()@w
 o.data.update();return o

def child_group(name,objects,pivot):
 g=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(g);g.location=pivot;g['role']=name;bpy.context.view_layer.update()
 for o in objects:w=o.matrix_world.copy();o.parent=g;o.matrix_world=w
 return g

def eye(name,loc,s,m,light):
 o=ell(name,loc,s,m,32,20);o['role']=name;h=ell(name+'.catchlight',(loc[0]-.009,loc[1]-s[1]*.89,loc[2]+s[2]*.40),(.009,.005,.010),light,20,12);bpy.context.view_layer.update();w=h.matrix_world.copy();h.parent=o;h.matrix_world=w;return o

def book(name,loc,scale,cover,paper):
 before=set(bpy.data.objects);w,d,h=scale;box(name+'.pages',loc,(w-.025,d,h-.04),paper,.015)
 for side in[-1,1]:box(name+'.cover'+str(side),(loc[0],loc[1]+side*(d/2+.013),loc[2]),(w,.025,h),cover,.018)
 box(name+'.spine',(loc[0]-w/2+.015,loc[1],loc[2]),(.045,d+.03,h),cover,.018);return list(set(bpy.data.objects)-before)

def crop_shirt(o,z):
 bm=bmesh.new();bm.from_mesh(o.data);co=o.matrix_world.inverted()@Vector((0,0,z));bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=co,plane_no=Vector((0,0,1)),clear_inner=True,clear_outer=False);edges=[e for e in bm.edges if e.is_boundary];bmesh.ops.holes_fill(bm,edges=edges,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update();return o

def common():return {k:mat(k,c,r) for k,c,r in [('eye','322A25',.26),('light','FFF8E8',.5),('cream','F3E8CC',.78),('rose','E8A17F',.8),('paper','FFF0CF',.8),('wood','BC945D',.67),('gold','D8AF65',.6)]}


def join(name,objects):
 objects=[o for o in objects if o and o.name in bpy.data.objects]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name;return o

def clean(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000003);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()

def budget(o,tris):
 clean(o);current=sum(len(p.vertices)-2 for p in o.data.polygons)
 if current>tris:
  bpy.context.view_layer.objects.active=o;d=o.modifiers.new('measured low LOD allocation','DECIMATE');d.ratio=tris/current;bpy.ops.object.modifier_apply(modifier=d.name)
 for p in o.data.polygons:p.use_smooth=True
 return o

def loft_crest(m):
 # Broad organic casque. Its width tapers continuously into a rounded triangular apex.
 sections=[(1.285,.152,-.025,.225),(1.36,.18,.018,.205),(1.45,.157,.028,.178),(1.55,.120,.042,.141),(1.63,.080,.065,.090),(1.687,.045,.083,.046),(1.708,.015,.086,.018),(1.709,0,.086,0)]
 vs=[];fs=[];n=32
 for z,w,y,d in sections:
  for i in range(n):
   a=2*pi*i/n;vs.append((w*cos(a),y+d*sin(a),z))
 for j in range(len(sections)-1):
  for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 fs +=[tuple(range(n-1,-1,-1)),tuple((len(sections)-1)*n+i for i in range(n))]
 me=bpy.data.meshes.new('continuous tapered casque');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('continuous tapered casque',me);bpy.context.collection.objects.link(o);return smooth(o,m)

def panel(name,rows,m,segments=28,thickness=.012):
 # Each row is (height, half-width ellipse, front depth, wrap angle). Closed cloth shell.
 vs=[];fs=[];n=segments+1
 for back in [0,1]:
  for ri,(z,w,d,a) in enumerate(rows):
   for i in range(n):
    t=-a+2*a*i/segments;x=w*sin(t);y=.015-d*cos(t)+back*thickness
    zz=z+(.009*cos(t*1.7) if ri==0 else 0)
    vs.append((x,y,zz))
 layer=len(rows)*n
 for b in [0,1]:
  for j in range(len(rows)-1):
   for i in range(segments):
    q=(b*layer+j*n+i,b*layer+j*n+i+1,b*layer+(j+1)*n+i+1,b*layer+(j+1)*n+i)
    fs.append(q if b==0 else q[::-1])
 for j in range(len(rows)-1):
  for i in [0,segments]:fs.append((j*n+i,(j+1)*n+i,(j+1)*n+i+layer,j*n+i+layer))
 for ri in [0,len(rows)-1]:
  for i in range(segments):fs.append((ri*n+i,ri*n+i+layer,ri*n+i+1+layer,ri*n+i+1))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);smooth(o,m);clean(o);return o

def ribbon(name,points,width,m,thickness=.012):
 # A tailored ribbon with planar width; no sausage-like apron straps.
 vs=[];fs=[]
 for x,y,z in points:
  for dz in[0,thickness]:
   vs +=[(x-width/2,y+dz,z),(x+width/2,y+dz,z)]
 for j in range(len(points)-1):
  a=j*4;b=(j+1)*4;fs +=[(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,b,a+2+4,a+2),(a+1,a+3,b+3,b+1)]
 fs +=[(0,2,3,1),(len(vs)-4,len(vs)-3,len(vs)-1,len(vs)-2)]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);smooth(o,m);clean(o)
 bpy.context.view_layer.objects.active=o;b=o.modifiers.new('subtle cloth edge easing','BEVEL');b.width=.004;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name);return o

def line(name,points,r,m):
 o=curve(name,points,r,m);return budget(o,140)

def topology(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();comps=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);n=0
  while stack:
   q=stack.pop();n+=1
   for e in q.link_edges:
    w=e.other_vert(q)
    if w not in seen:seen.add(w);stack.append(w)
  comps.append(n)
 out={'components':len(comps),'component_vertex_counts':sorted(comps,reverse=True),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'vertices':len(bm.verts),'faces':len(bm.faces)};bm.free();return out

def build():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 p=common();green=mat('sage green skin','9FAF70',.74);lightgreen=mat('soft lemon sage throat','C2C987',.78);orange=mat('peach art apron','D49A77',.85);seam=mat('apron folded seam','BF8866',.86);mint=mat('mint paint','88BDB2');teal=mat('teal paint','6FA8A5');yellow=mat('yellow paint','E2B961');pink=mat('pink paint','DBA09B');dark=mat('soft chameleon mouth','6A743B',.73);ferrule=mat('brush warm metal','C3B99B',.5)
 # Large continuous head, cheeks, eyesockets, forehead/casque and tapered tail.
 tailpts=[];tailr=[]
 for i in range(90):
  t=i/89;a=t*2*pi*1.42;r=.29*(1-t)+.055;tailpts.append((-.565+r*cos(a),.145,.50+r*sin(a)));tailr.append(.083*(1-t)+.038)
 parts=[ell('pear torso',(0,.025,.61),(.30,.245,.45),green,40,28,.9),ell('round head',(0,.01,1.20),(.365,.27,.285),green,44,32,.94),ell('broad projecting snout',(0,-.185,1.15),(.347,.214,.185),green,48,28,.87),ell('forehead bridge',(0,-.105,1.36),(.225,.155,.185),green,32,24,.92),loft_crest(green),tube('continuous coiled tail',tailpts,tailr,green,20)]
 for s in[-1,1]:
  parts +=[ell('soft ocular socket',(s*.237,-.16,1.305),(.153,.145,.17),green,36,28),ell('soft cheek volume',(s*.248,-.187,1.16),(.12,.155,.13),green,32,24),ell('short leg',(s*.16,.005,.215),(.12,.14,.215),green,32,24),ell('wide toe foot',(s*.17,-.065,.08),(.135,.18,.08),green,36,22)]
  for i in range(3):parts.append(ell('rounded toe',(s*.17+(i-1)*.072,-.181,.066),(.048,.085,.063),green,20,16))
 for i in range(4):parts.append(ell('soft dorsal scallop',(0,.259,1.20-i*.137),(.078,.105,.092),green,24,18))
 body=budget(fuse('Body',parts,green,.0065,.62),7600);body['role']='Body';bt=tree(body)
 # Purposeful subtle vertex-color warmth, exported in the GLB, no external texture.
 ca=body.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 def lin(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
 for poly in body.data.polygons:
  for li in poly.loop_indices:
   v=body.matrix_world@body.data.vertices[body.data.loops[li].vertex_index].co
   mott=.024*sin(v.x*40+sin(v.z*31))*sin(v.z*29+v.y*30)+.012*sin(v.x*109+v.z*81)
   warm=.018*max(0,(v.z-1.35)/.39)
   rgb=[.625+mott+warm,.686+mott,.439+mott*.65-warm]
   # The lower jaw is pigment on continuous skin, never an attached oval.
   lip=1.102+.034*min(1,abs(v.x)/.28)**2
   blend=max(0,min(1,(lip+.014-v.z)/.028))*max(0,min(1,(v.z-.94)/.045))*max(0,min(1,(-v.y-.12)/.045))
   throat=[.761+mott*.5,.788+mott*.5,.529+mott*.4]
   rgb=[a*(1-blend)+b*blend for a,b in zip(rgb,throat)]
   ca.data[li].color=(*[lin(max(0,min(1,c)))for c in rgb],1)
 green.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(1,1,1,1)
 attr=green.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Color';green.node_tree.links.new(attr.outputs['Color'],green.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
 # Lower lip/chin wraps the snout rather than hovering as an oval muzzle badge.
 # Lower jaw is authored as exported vertex color on Body.
 face_details=[]
 points=[]
 for i in range(13):
  x=-.28+i*.56/12;z=1.10+.036*(abs(x)/.28)**2;surface=fy(bt,x,z);points.append((x,surface-.006,z))
 face_details.append(line('continuous smiling mouth',points,.0048,dark))
 for s in[-1,1]:
  x=s*.087;z=1.214;face_details.append(budget(ell('small snout nostril',(x,fy(bt,x,z)-.008,z),(.008,.005,.0055),dark,16,12),48))
 join('Face gentle smile and nostrils',face_details)
 # Eyes nestled into the unified socket; cream whites retain exact runtime prefix.
 for side,s in [('L',-1),('R',1)]:
  loc=(s*.239,-.290,1.321)
  white=budget(ell('cream_eye.'+side,loc,(.09,.049,.111),p['cream'],40,28),480)
  irisloc=(s*.226,-.330,1.314);ey=eye('Eye.'+side,irisloc,(.047,.022,.062),p['eye'],p['light']);budget(ey,320);budget(next(o for o in bpy.data.objects if o.name==('Eye.'+side+'.catchlight')),80)
  # A continuous skin upper eyelid gives the eyes a soft integrated brow line.
  brow=[]
  for i in range(13):
   a=pi*.02+pi*.96*i/12;brow.append((s*.239+.099*cos(a),-.292-.029*sin(a),1.324+.12*sin(a)))
  # Same fixed sage material for objects without a vertex-color channel.
  fixed=bpy.data.materials.get('sage skin detail') or mat('sage skin detail','9FAF70',.74)
  line('soft upper eyelid',brow,.010,fixed)
  cheek=patch('warm cheek flush',bt,(s*.284,1.142),(.037,.006,.032),p['rose'],1,embed=.003);budget(cheek,160)
 # Shirt, hem and collar are sculpted around the torso with a restrained fabric edge.
 shirt=ell('cream shirt',(0,.025,.615),(.318,.271,.449),p['cream'],44,30,.92);bpy.context.view_layer.update();crop_shirt(shirt,.355);budget(shirt,760)
 collar=[];st=tree(shirt)
 for i in range(15):
  a=-1.17+2.34*i/14;x=.16*sin(a);z=.965-.013*cos(a);collar.append((x,fy(st,x,z)-.009,z))
 line('shirt folded neckline',collar,.012,p['cream'])
 # Wrapped A-line skirt, straight bib top, curved hem and front pocket.
 skirtrows=[(.328,.350,.300,1.17),(.36,.348,.303,1.17),(.46,.346,.315,1.17),(.57,.339,.317,1.16),(.68,.327,.309,1.14),(.752,.310,.302,1.12)]
 skirt=panel('Apron skirt',skirtrows,orange)
 bib=panel('Apron tailored bib',[(.715,.227,.307,1.03),(.78,.218,.298,1.03),(.86,.20,.276,1.00),(.915,.192,.253,.98)],orange,24)
 apron=join('Apron',[skirt,bib]);at=tree(apron)
 hems=[]
 for z,w,d,a in[skirtrows[1],(.911,.192,.253,.98)]:
  pts=[(w*sin(-a+2*a*i/24),.015-d*cos(-a+2*a*i/24)-.002,z)for i in range(25)]
  hems.append(line('stitched turned hem',pts,.005,seam))
 for side,s in [('L',-1),('R',1)]:
  strap=ribbon('apron shoulder strap',[(s*.15,-.247,.906),(s*.169,-.214,.966),(s*.195,-.153,1.004),(s*.215,-.075,1.018),(s*.214,.015,1.0)],.047,orange)
  budget(ell('apron cloth button',(s*.151,-.255,.918),(.024,.010,.024),p['gold'],20,14),96)
  # Short side seams on lower skirt make the cut readable at game scale.
  pts=[]
  for z,w,d,a in skirtrows[:5]:
   t=s*1.04;pts.append((w*sin(t),.015-d*cos(t)-.003,z+.012))
  hems.append(line('apron side seam',pts,.0038,seam))
 # Rectangular curved pocket with rounded lower corners, raised opening.
 pocket=panel('Apron front pocket',[(.408,.328,.335,.57),(.432,.340,.335,.57),(.49,.340,.338,.57),(.564,.337,.337,.57)],orange,24,.010)
 pts=[(.337*sin(-.57+1.14*i/20),.015-.341*cos(-.57+1.14*i/20),.564)for i in range(21)]
 hems.append(line('pocket rolled opening',pts,.006,seam))
 pts=[]
 for x,z in[(-.172,.554),(-.175,.493),(-.165,.437),(-.14,.423),(0,.423),(.14,.423),(.165,.437),(.175,.493),(.172,.554)]:
  pts.append((x,.015-.340*math.sqrt(max(.1,1-(x/.340)**2))-.004,z))
 hems.append(line('pocket U stitch',pts,.003,seam))
 # Three restrained paint flowers from the approved reference, on the pocket.
 splashes=[]
 for xc,zc,rad,m,prefix in[(-.108,.475,.033,yellow,'yellow'),(.025,.452,.032,teal,'teal'),(.137,.474,.024,pink,'pink')]:
  vs=[(xc,-.317,zc)];n=40
  for i in range(n):
   a=2*pi*i/n;r=rad*(1+.16*cos(a*5));x=xc+r*cos(a);z=zc+r*sin(a);y=.015-.341*math.sqrt(max(.1,1-(x/.340)**2))-.003;vs.append((x,y,z))
  vs[0]=(xc,.015-.341*math.sqrt(max(.1,1-(xc/.340)**2))-.005,zc)
  fs=[(0,1+i,1+(i+1)%n)for i in range(n)];me=bpy.data.meshes.new(prefix+' paint flower');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(prefix+' apron paint',me);bpy.context.collection.objects.link(o);smooth(o,m);splashes.append(o)
 join('Apron stitched edges',hems)
 # Rounded articulated shoulder/sleeve and curved forearm, with visible grip digits.
 fixed=bpy.data.materials.get('sage skin detail')
 for side,s in [('L',-1),('R',1)]:
  start=(s*.266,-.009,.886);elbow=(s*.359,-.099,.751);hand=(s*.306,-.333,.746) if s<0 else (.373,-.318,.865)
  sleeve=budget(fuse('cream short sleeve',[ell('sleeve shoulder',start,(.111,.116,.15),p['cream'],28,20),tube('shaped short sleeve',[start,(s*.320,-.055,.817),elbow],[.100,.098,.082],p['cream'],16)],p['cream'],.0085,.65),680)
  wrist=(s*.334,-.248,.724)if s<0 else(.387,-.239,.807)
  fore=budget(fuse('green forearm',[tube('bent forearm',[elbow,wrist,hand],[.076,.070,.064],fixed,20),ell('cupped holding palm',hand,(.082,.057,.068),fixed,28,20)],fixed,.0065,.7),700)
  armobjects=[sleeve,fore]
  if s<0:
   for i in range(2):
    a=ell('palette holding fingers',(-.258+i*.034,-.369,.752-i*.015),(.05,.029,.028),fixed,20,14);armobjects.append(budget(a,120))
  else:
   for i in range(3):
    z=.817+i*.037;a=ell('brush curled finger',(.391,-.347,z),(.045,.027,.025),fixed,20,14);armobjects.append(budget(a,120))
  # All digits merged into the same semantic arm material batch.
  skin=join('green articulated grip',armobjects[1:]);child_group('Arm.'+side,[sleeve,skin],start)
 # Palette and brush retained under the runtime-recognized prop prefixes.
 palette=ell('wood_palette',(-.080,-.378,.725),(.291,.149,.028),p['wood'],40,22,.86);palette.rotation_euler[0]=.13;budget(palette,600)
 # A rolled perimeter enhances the thin wood edge while staying part of the palette mesh.
 pts=[]
 for i in range(41):
  a=2*pi*i/40;pts.append((-.08+.281*cos(a),-.378+.145*sin(a),.728+.019*sin(a)))
 rim=line('palette edge',pts,.004,p['wood']);join('wood_palette',[palette,rim])
 for x,y,m in[(-.246,-.420,yellow),(-.080,-.446,pink),(.078,-.410,teal),(-.095,-.32,mint)]:
  dab=ell('paint_dab',(x,y,.761),(.041,.029,.010),m,24,16);budget(dab,180)
 handle=tube('paint_brush_handle',[(.332,-.319,.701),(.449,-.319,1.083)],[.016,.015],p['wood'],14)
 tube('brush_metal_collar',[(.446,-.319,1.074),(.463,-.319,1.123)],[.030,.029],ferrule,20)
 bristles=ell('pointed_brush_bristles',(.48,-.319,1.176),(.043,.030,.078),p['wood'],32,22);bristles.rotation_euler[1]=.27;budget(bristles,360)
 tip=ell('brush wet mint tip',(.492,-.322,1.219),(.036,.028,.038),mint,28,18);tip.rotation_euler[1]=.27;budget(tip,200);join('pointed_brush_bristles',[bristles,tip])
 # Batch purely static accessory meshes by material. Preserve all dynamic semantic nodes.
 allmeshes=[o for o in bpy.data.objects if o.type=='MESH']
 exclusions={'Body','Eye.L','Eye.R','Eye.L.catchlight','Eye.R.catchlight'}
 eligible=[]
 for o in allmeshes:
  if o.parent or o.name in exclusions or o.name.startswith(('cream_eye','wood_palette','paint_dab','paint_brush_handle','brush_metal_collar','pointed_brush_bristles')):continue
  if len(o.data.materials)==1:eligible.append(o)
 groups={}
 for o in eligible:groups.setdefault(o.data.materials[0].name,[]).append(o)
 for name,objects in groups.items():
  if len(objects)>1:join('Static '+name,objects)
 for o in [o for o in bpy.data.objects if o.type=='MESH']:clean(o)
 bpy.context.view_layer.update();meshes=[o for o in bpy.data.objects if o.type=='MESH'];verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];minimum=min(v.z for v in verts)
 for o in bpy.data.objects:
  if o.parent is None:o.location.z-=minimum
 root=bpy.data.objects.new('SchoolResident.art-chameleon',None);bpy.context.collection.objects.link(root);root['species']='art-chameleon';root['source']='Original Blender mesh polish from approved DORMI school cast concept';root['front']='+Z';root['up']='+Y'
 bpy.context.view_layer.update()
 for o in list(bpy.data.objects):
  if o!=root and o.parent is None:w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
 bpy.context.view_layer.update()
 for o in meshes:
  for po in o.data.polygons:po.use_smooth=True
 triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in meshes)
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root
 out=os.path.join(ROOT,'art-chameleon-low.glb');bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art-chameleon-polished.blend'))
 verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
 metrics={'id':'art-chameleon','triangles':triangles,'bytes':os.path.getsize(out),'body_topology':topology(body),'mesh_objects':len(meshes),'material_slots_draw_upper_bound':sum(len(o.data.materials)for o in meshes),'roles':sorted(o.get('role')for o in bpy.data.objects if o.get('role')),'bounds_blender':{'min':[min(v[i]for v in verts)for i in range(3)],'max':[max(v[i]for v in verts)for i in range(3)]},'meshes':[{'name':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)}for o in meshes],'floor_contact_z':min(v.z for v in verts),'sha256':hashlib.sha256(open(out,'rb').read()).hexdigest()}
 with open(os.path.join(ROOT,'metrics.json'),'w')as f:json.dump(metrics,f,indent=2)
 print('RESULT',json.dumps(metrics),flush=True)
 assert triangles<=21000,triangles
 assert os.path.getsize(out)<450000,os.path.getsize(out)
 assert metrics['body_topology']['components']==1 and metrics['body_topology']['nonmanifold_edges']==0
 assert metrics['material_slots_draw_upper_bound']<=43
if __name__=='__main__':build()
