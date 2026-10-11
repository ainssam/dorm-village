"""Original continuous-body clay models matching the approved 2026-10-04 school cast.
Blender -Y front/Z up exports to glTF +Z front/Y up. No external samples/textures.
"""
import bpy,math,os,json,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
ROOT=os.path.dirname(os.path.abspath(__file__))
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

def otter():
 p=common();brown=mat('otter cocoa','AC7C56');lightbrown=mat('warm muzzle','DCC094');mint=mat('sage apron','A9BE9E');ear=mat('soft ear inset','C29473');dark=mat('cocoa nose','694934',.45)
 parts=[ell('body',(0,.015,.63),(.32,.265,.49),brown,48,30,.87),ell('head',(0,-.018,1.20),(.405,.30,.345),brown,48,32,.92)]
 for s in[-1,1]:parts += [ell('short leg',(s*.175,.006,.25),(.13,.14,.24),brown),ell('foot',(s*.18,-.095,.105),(.145,.205,.105),brown)]
 ts=[];rs=[]
 for i in range(28):
  t=i/27;ts.append((-.02-.78*t,.15+.13*sin(pi*t),.39-.16*t));rs.append(.14*(1-t)+.029)
 parts.append(tube('otter tapered tail',ts,rs,brown,16));body=fuse('Body',parts,brown);body['role']='Body';bt=tree(body)
 for s in[-1,1]:ell('round ear',(s*.31,.02,1.46),(.105,.072,.105),brown);ell('ear inset',(s*.31,-.044,1.46),(.062,.018,.066),ear)
 shirt=ell('cream shirt',(0,.015,.63),(.346,.294,.505),p['cream'],48,32,.87);bpy.context.view_layer.update();crop_shirt(shirt,.34);st=tree(shirt);patch('apron skirt',bt,(0,.54),(.30,.032,.32),mint,.9,embed=.046);patch('apron bib',bt,(0,.84),(.21,.032,.16),mint,.9,embed=.046)
 for s in[-1,1]:
  patch('apron strap',bt,(s*.23,.94),(.034,.04,.075),mint,.9);ell('strap button',(s*.229,fy(bt,s*.229,.91)-.048,.91),(.031,.015,.031),p['gold'],24,16)
 patch('apron pocket',st,(-.13,.55),(.077,.039,.075),mint,.9)
 muzzle=patch('cream muzzle',bt,(0,1.11),(.31,.043,.145),lightbrown,.8);mt=tree(muzzle)
 for s in[-1,1]:
  x=s*.155;z=1.32;eye('Eye.'+('L'if s<0 else'R'),(x,fy(bt,x,z)-.012,z),(.036,.020,.048),p['eye'],p['light']);ell('brow',(s*.145,fy(bt,s*.145,1.397)-.013,1.397),(.052,.012,.018),lightbrown,28,16)
 ell('rounded otter nose',(0,fy(mt,0,1.18)-.027,1.18),(.066,.035,.043),dark,32,20,.73);curve('gentle smile',[(-.088,fy(mt,-.088,1.09)-.014,1.095),(-.04,fy(mt,-.04,1.065)-.014,1.064),(0,fy(mt,0,1.072)-.014,1.072),(.065,fy(mt,.065,1.093)-.014,1.09)],.007,dark)
 for s in[-1,1]:
  for i in range(3):curve('short whisker',[(s*.20,fy(mt,s*.20,1.135-i*.023)-.01,1.135-i*.023),(s*.34,-.30,1.15-i*.04),(s*.43,-.27,1.16-i*.05)],.0035,lightbrown)
 for side,s in [('L',-1),('R',1)]:
  start=(s*.29,-.035,.87);elbow=(s*.365,-.16,.73);hand=(s*.235,-.375,.77 if s<0 else .70);arm=fuse('sleeve',[ell('sleeve root',start,(.115,.13,.16),p['cream']),tube('sleeve bent',[start,elbow,hand],[.10,.095,.078],p['cream'],16)],p['cream'],.010,.5);paw=ell('paw',hand,(.115,.08,.092),brown,36,24,.8);child_group('Arm.'+side,[arm,paw],start)
 objs=book('health notebook',(.03,-.402,.80),(.37,.09,.48),mint,p['paper']);crossmat=mat('health badge','7C9B79');badge=box('notebook badge',(.03,-.476,.87),(.145,.015,.155),p['cream'],.02);a=box('care cross vertical',(.03,-.488,.87),(.029,.016,.098),crossmat,.007);b=box('care cross horizontal',(.03,-.49,.87),(.090,.016,.029),crossmat,.007);child_group('RoleProp',objs+[badge,a,b],(.03,-.4,.8));ell('cloth roll',(-.14,-.258,.575),(.04,.04,.072),p['cream'],24,16)
 return body,{'role':'infirmary helper','name_ko':'수달 보건 선생님','front_note':'sage apron, health notebook, soft cream muzzle, short tapered tail'}

def bird():
 p=common();blue=mat('periwinkle feathers','9EAED0');wingmat=mat('wing soft blue','889FC7');purple=mat('lavender tail','ACA5CB');yellow=mat('warm ochre beak','DCAF5C');coral=mat('coral bow','D78F78');mouth=mat('small beak mouth','A76442')
 body=fuse('Body',[ell('bird torso',(0,.01,.64),(.355,.29,.47),blue,48,30),ell('bird head',(0,-.024,1.09),(.36,.30,.32),blue,48,32)],blue);body['role']='Body';bt=tree(body)
 vest=patch('cream cardigan',bt,(0,.64),(.301,.027,.347),p['cream'],.9);face=patch('cream face',bt,(0,1.08),(.29,.028,.242),p['cream'],.95);ft=tree(face)
 for s in[-1,1]:
  for i in range(3):tube('bird toe',[(s*.15,.015,.23),(s*.15,-.055,.08),(s*.15+(i-1)*.045,-.19-.015*(i==1),.039)],[.035,.035,.022],yellow,12)
  for i in range(2):curve('toe groove',[(s*.15+(i-.5)*.035,-.14,.061),(s*.15+(i-.5)*.042,-.20,.049)],.003,p['wood'])
  x=s*.124;z=1.17;eye('Eye.'+('L'if s<0 else'R'),(x,fy(ft,x,z)-.012,z),(.034,.02,.046),p['eye'],p['light']);patch('peach cheek',ft,(s*.20,1.055),(.042,.01,.03),p['rose'])
 beak=ell('upper rounded beak',(0,-.326,1.085),(.074,.095,.045),yellow,32,20,.65);beak.rotation_euler[0]=-.13;ell('open beak',(0,-.329,1.045),(.052,.07,.041),mouth,32,20);ell('lower beak',(0,-.349,1.018),(.054,.067,.02),yellow,32,16)
 for i in range(3):
  o=ell('soft head tuft',((i-1)*.075,.014,1.415+(.045 if i==1 else 0)),(.059,.047,.14 if i==1 else .10),blue,28,20);o.rotation_euler[1]=(i-1)*-.45
 for i in range(3):
  o=ell('tail feather',(-.29-i*.055,.19+i*.03,.48-i*.04),(.105,.09,.265),purple,32,20);o.rotation_euler[1]=-.78-i*.1
 for side,s in [('L',-1),('R',1)]:
  start=(s*.31,-.01,.86);hand=(s*.38,-.28,.73 if s<0 else .86);arm=fuse('wing volume',[ell('wing shoulder',start,(.13,.13,.22),wingmat),tube('wing bend',[start,(s*.41,-.12,.76),hand],[.115,.105,.09],wingmat,14),ell('wing fingers',hand,(.09,.07,.10),wingmat)],wingmat,.010,.58);parts=[arm]
  for i in range(3):parts.append(ell('layered feather',(s*(.36+i*.024),-.055-i*.047,.70-i*.012),(.075,.045,.14),blue,28,18))
  child_group('Arm.'+side,parts,start)
 vt=tree(vest)
 for z in[.55,.42]:ell('cardigan button',(.12,fy(vt,.12,z)-.014,z),(.022,.012,.024),p['gold'],24,16)
 for s in[-1,1]:
  o=ell('bow loop',(s*.072,-.32,.906),(.081,.028,.064),coral,32,20,.55);o.rotation_euler[1]=s*.22
 ell('bow knot',(0,-.35,.908),(.038,.027,.044),coral,28,18)
 group=[]
 for side in[-1,1]:
  page=box('score page',(side*.095-.12,-.36,.744),(.20,.045,.295),p['paper'],.013);page.rotation_euler[2]=side*.20;group.append(page);cover=box('score cover',(side*.098-.12,-.332,.744),(.208,.019,.305),mat('score sage '+str(side),'A7BBA3'),.012);cover.rotation_euler[2]=side*.20;group.append(cover)
 for i in range(5):
  z=.715+i*.016;group.append(curve('staff line',[(-.30,-.399,z),(-.12,-.411,z),(.065,-.399,z)],.0027,p['wood']))
 for x,z in[(-.25,.733),(-.19,.750),(-.02,.718),(.027,.745)]:group.append(ell('music note',(x,-.417,z),(.012,.003,.008),p['wood'],20,12));group.append(tube('note stem',[(x+.01,-.417,z),(x+.01,-.417,z+.045)],[.0025,.0025],p['wood'],8))
 child_group('RoleProp',group,(-.12,-.36,.74));baton=tube('wood conductor baton',[(.38,-.292,.78),(.55,-.292,1.23)],[.012,.009],p['wood'],12);ell('baton tip',(.55,-.292,1.23),(.023,.021,.028),p['gold'],24,16)
 return body,{'role':'music teacher','name_ko':'작은 새 음악 선생님','front_note':'periwinkle bird, cream cardigan, coral bow, open note book and wooden baton'}

def chameleon():
 p=common();green=mat('sage green skin','9FAE68');lightgreen=mat('soft throat','C4CC81');crestmat=mat('muted dorsal crest','92A166');orange=mat('peach art apron','DCA080');paintblue=mat('mint paint','7CAEAB');yellow=mat('yellow paint','E4BD64');pink=mat('pink paint','D79E9A');dark=mat('soft chameleon mouth','778443')
 tailpts=[];tailr=[]
 for i in range(80):
  t=i/79;angle=t*2*pi*1.42;r=.29*(1-t)+.055;tailpts.append((-.58+r*cos(angle),.16,.51+r*sin(angle)));tailr.append(.083*(1-t)+.032)
 parts=[ell('torso',(0,.025,.61),(.30,.245,.45),green,44,30,.83),ell('broad head',(0,-.02,1.18),(.36,.265,.29),green,48,30,.76),ell('snout',(0,-.175,1.14),(.30,.18,.16),green,40,26,.70),tube('continuous coiled tail',tailpts,tailr,green,16)]
 for s in[-1,1]:parts += [ell('short leg',(s*.16,.00,.23),(.12,.14,.23),green),ell('wide toe foot',(s*.17,-.055,.092),(.14,.19,.092),green)]
 body=fuse('Body',parts,green,.008,.50);body['role']='Body';bt=tree(body);shirt=ell('cream shirt',(0,.025,.61),(.322,.270,.465),p['cream'],48,32,.83);bpy.context.view_layer.update();crop_shirt(shirt,.34);st=tree(shirt);skirt=patch('orange apron skirt',bt,(0,.58),(.275,.032,.30),orange,.95,embed=.046);bib=patch('orange apron bib',bt,(0,.82),(.195,.032,.15),orange,.95,embed=.046);apron=fuse('Apron',[skirt,bib],orange,.006,.45);at=tree(apron)
 for s in[-1,1]:patch('apron strap',bt,(s*.195,.94),(.024,.04,.065),orange,.95);ell('apron button',(s*.195,fy(bt,s*.195,.92)-.041,.92),(.026,.015,.026),p['gold'],24,16)
 profile=[(-.09,1.38),(-.035,1.56),(.085,1.73),(.24,1.51),(.275,1.22),(.19,1.11)]
 vs=[(x,y,z) for x in[-.075,.075] for y,z in profile];n=len(profile);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new('soft triangular crest');me.from_pydata(vs,[],faces);me.update();crest=bpy.data.objects.new('soft triangular crest',me);bpy.context.collection.objects.link(crest);smooth(crest,crestmat);bpy.context.view_layer.objects.active=crest;b=crest.modifiers.new('rounded crest rim','BEVEL');b.width=.045;b.segments=5;bpy.ops.object.modifier_apply(modifier=b.name)
 for i in range(4):ell('rounded dorsal nub',(0,.245,1.08-i*.12),(.084,.095,.09),crestmat,28,20,.75)
 patch('throat smile patch',bt,(0,1.083),(.26,.018,.083),lightgreen,.95)
 for side,s in [('L',-1),('R',1)]:
  ell('eye tower',(s*.23,-.225,1.28),(.13,.115,.15),green,36,24);ell('cream eye',(s*.23,-.310,1.29),(.088,.044,.109),p['cream'],36,24);eye('Eye.'+side,(s*.225,-.351,1.288),(.049,.023,.066),p['eye'],p['light']);ell('cheek',(s*.245,-.309,1.119),(.042,.013,.026),p['rose'],28,18)
 curve('closed friendly smile',[(-.21,-.34,1.089),(-.1,-.365,1.073),(0,-.378,1.068),(.12,-.362,1.075),(.23,-.331,1.09)],.006,dark)
 for s in[-1,1]:ell('nostril',(s*.078,-.356,1.15),(.009,.006,.007),dark,20,12)
 for side,s in [('L',-1),('R',1)]:
  start=(s*.265,-.025,.88);elbow=(s*.365,-.11,.735);hand=(s*.32,-.30,.75 if s<0 else .82);sleeve=fuse('shirt sleeve',[ell('sleeve shoulder',start,(.103,.11,.145),p['cream']),tube('sleeve bend',[start,elbow],[.10,.087],p['cream'],14)],p['cream'],.011,.6);arm=fuse('green forearm',[tube('forearm',[elbow,hand],[.076,.065],green,14),ell('holding hand',hand,(.08,.065,.09),green,32,20)],green,.010,.6);child_group('Arm.'+side,[sleeve,arm],start)
 palette=ell('wood palette',(-.12,-.37,.716),(.32,.145,.035),p['wood'],44,26,.83);palette.rotation_euler[0]=.22
 for x,y,m in[(-.29,-.41,yellow),(-.10,-.43,pink),(.08,-.39,paintblue)]:ell('paint dab',(x,y,.755),(.048,.032,.015),m,28,18)
 for i in range(5):
  a=i*2*pi/5;ell('apron paint flower',(-.11+.026*cos(a),fy(at,-.11+.026*cos(a),.48+.026*sin(a))-.010,.48+.026*sin(a)),(.022,.008,.025),yellow,22,14)
 ell('apron blue splash',(.12,fy(at,.12,.475)-.010,.475),(.043,.008,.04),paintblue,24,16);tube('paint brush handle',[(.30,-.303,.70),(.43,-.303,1.07)],[.020,.018],p['wood'],12);tube('brush metal collar',[(.428,-.303,1.057),(.448,-.303,1.115)],[.035,.035],p['gold'],16);brush=ell('pointed brush bristles',(.466,-.303,1.18),(.049,.039,.09),paintblue,32,22);brush.rotation_euler[1]=.24
 return body,{'role':'art teacher','name_ko':'카멜레온 미술 선생님','front_note':'green high crest and curled tail, cream sleeves, peach apron, wood palette, paint brush'}

def topology(body):
 bm=bmesh.new();bm.from_mesh(body.data);seen=set();comps=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);n=0
  while stack:
   q=stack.pop();n+=1
   for e in q.link_edges:
    w=e.other_vert(q)
    if w not in seen:seen.add(w);stack.append(w)
  comps.append(n)
 result={'components':len(comps),'component_vertex_counts':sorted(comps,reverse=True),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'vertices':len(bm.verts),'faces':len(bm.faces)};bm.free();return result

def export(id,fn):
 bpy.ops.wm.read_factory_settings(use_empty=True);body,info=fn();meshes=[o for o in bpy.data.objects if o.type=='MESH'];
 total=sum(sum(len(f.vertices)-2 for f in o.data.polygons)for o in meshes);ratio=min(1,60000/total)
 for o in meshes:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
  if len(o.data.polygons)>400:
   bpy.context.view_layer.objects.active=o;d=o.modifiers.new('bounded resident mesh budget','DECIMATE');d.ratio=ratio;bpy.ops.object.modifier_apply(modifier=d.name)
 bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];minimum=min(v.z for v in vs)
 for o in list(bpy.data.objects):
  if o.parent is None:o.location.z-=minimum
 root=bpy.data.objects.new('SchoolResident.'+id,None);bpy.context.collection.objects.link(root);root['species']=id;root['description']=info['front_note'];root['source']='Approved 2026-10-04 school cast image; original authored toy-clay mesh';root['front']='+Z';root['up']='+Y';bpy.context.view_layer.update()
 for o in list(bpy.data.objects):
  if o!=root and o.parent is None:w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
 bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];mins=[min(v[i]for v in vs)for i in range(3)];maxs=[max(v[i]for v in vs)for i in range(3)]
 for o in meshes:
  for poly in o.data.polygons:poly.use_smooth=True
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root;bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,id+'.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 info.update({'id':id,'central_body_topology':topology(body),'mesh_objects':len(meshes),'triangles':sum(sum(len(f.vertices)-2 for f in o.data.polygons)for o in meshes),'bounds_blender':{'min':mins,'max':maxs},'dimensions_gltf_xyz':[maxs[0]-mins[0],maxs[2]-mins[2],maxs[1]-mins[1]],'bytes':os.path.getsize(os.path.join(ROOT,id+'.glb')),'floor_contact_z':min(v.z for v in vs)})
 with open(os.path.join(ROOT,id+'.json'),'w')as f:json.dump(info,f,indent=2,ensure_ascii=False)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,id+'.blend'));print('MODEL_READY',json.dumps(info),flush=True)
for id,fn in [('nurse-otter',otter),('music-bird',bird),('art-chameleon',chameleon)]:export(id,fn)
