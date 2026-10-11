"""Original local music-bird refinement of the approved DORMI school cast.
Generated geometry only. Retains +Z glTF front, +Y up, immutable body/arm/eye/prop roles.
Run: blender -b --python build_polished_bird.py
"""
import bpy,math,os,json,bmesh
from mathutils import Vector
BASE=os.path.dirname(os.path.abspath(__file__))
exec(compile(open(BASE+'/original_build_school_residents.py').read().split('def otter():')[0],BASE+'/original_build_school_residents.py','exec'))
ROOT=BASE

def join_parts(name,parts):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=name
 return parts[0]

def clean(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
 for p in o.data.polygons:p.use_smooth=True

def feather(name,points,width,mat_,depth=.6):
 # Smooth tapered feather volume, with a continuous curved central shaft.
 pts=[];rs=[]
 a,b,c=[Vector(p)for p in points]
 for i in range(21):
  t=i/20;pts.append(tuple((1-t)**2*a+2*(1-t)*t*b+t*t*c));rs.append(max(.002,width*(sin(pi*t)**.7)))
 o=tube(name,pts,rs,mat_,14)
 for v in o.data.vertices:v.co.y=(v.co.y-points[0][1])*depth+points[0][1]
 clean(o);return o

def radial_surface(t,z,a,offset=.018):
 d=Vector((sin(a),-cos(a),0));c=Vector((0,.01,z));hit,n,idx,dist=t.ray_cast(c,d,2)
 if hit is None:raise ValueError(('garment ray missed',z,a))
 return tuple(hit+d*offset)

def garment(t,m):
 # A fitted all-round knit shell with a true front opening and capped thickness.
 rows=32;seg=80;v=[];f=[]
 for layer in[0,1]:
  for j in range(rows+1):
   u=j/rows;z=.35+.544*u;gap=.032+.31*(u**5)+.06*((1-u)**6)
   for i in range(seg+1):
    a=gap+(2*pi-2*gap)*i/seg
    zz=z+.010*cos(a)*((1-u)**12)-.012*cos(a)*(u**10)
    v.append(radial_surface(t,zz,a,.014 if layer else .032))
 n=(rows+1)*(seg+1)
 for k in[0,1]:
  for j in range(rows):
   for i in range(seg):
    q=k*n+j*(seg+1)+i;face=(q,q+1,q+seg+2,q+seg+1);f.append(face if k==0 else face[::-1])
 for j in range(rows):
  for i in[0,seg]:
   q=j*(seg+1)+i;r=(j+1)*(seg+1)+i;f.append((q,r,r+n,q+n))
 for j in[0,rows]:
  for i in range(seg):q=j*(seg+1)+i;f.append((q,q+1,q+1+n,q+n))
 me=bpy.data.meshes.new('tailored cardigan shell');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new('cream fitted cardigan',me);bpy.context.collection.objects.link(o);smooth(o,m);clean(o)
 trim=[]
 for side in[-1,1]:
  pts=[]
  for j in range(22):
   u=j/21;z=.35+.544*u;gap=.032+.31*u**5+.06*(1-u)**6;pts.append(radial_surface(t,z+.010*(1-u)**12-.012*u**10,side*gap,.041))
  trim.append(curve('rounded cardigan opening',pts,.012,m))
 pts=[radial_surface(t,.360+.010*cos(a),a,.042)for a in[.092+(2*pi-.184)*i/90 for i in range(91)]]
 trim.append(curve('soft rolled cardigan hem',pts,.015,m))
 # Fine same-material ribbing catches light rather than making dark graphic lines.
 for i in range(42):
  a=.15+(2*pi-.3)*i/41;pts=[radial_surface(t,z,a,.045)for z in[.354,.374,.393]];trim.append(curve('hem knit rib',pts,.0023,m))
 return join_parts('cream fitted cardigan',[o]+trim)

def bird():
 p=common();blue=mat('periwinkle feathers','9EAED0');wingmat=mat('wing soft blue','889FC7');purple=mat('lavender tail','ACA5CB');yellow=mat('warm ochre beak','DCAF5C');coral=mat('coral bow','D78F78');mouth=mat('small beak mouth','A76442')
 body=fuse('Body',[ell('bird torso',(0,.01,.64),(.355,.29,.47),blue,48,30),ell('bird head',(0,-.024,1.09),(.36,.30,.32),blue,48,32)],blue);body['role']='Body';bt=tree(body)
 vest=garment(bt,p['cream']);vt=tree(vest)
 # A soft underlayer is only visible through the actual cardigan opening.
 patch('cream underlayer',bt,(0,.66),(.10,.019,.25),p['cream'],.95)
 face=ell('natural cream facial mask',(0,0,1.079),(.294,.023,.243),p['cream'],64,36,.96);bpy.context.view_layer.update()
 for v in face.data.vertices:
  w=face.matrix_world@v.co;dx=w.x;dz=w.z-1.079
  if dz>0:w.z-=.071*math.exp(-((dx/.085)**2))*((dz/.243)**2.2)
  else:
   angle=math.atan2(dx,-dz);r=min(1,math.sqrt((dx/.294)**2+(dz/.243)**2));w.z+=.004*(.5+.5*cos(angle*18))*(r**5)
  w.y=fy(bt,w.x,w.z)+v.co.y-.010;v.co=face.matrix_world.inverted()@w
 face.data.update();ft=tree(face)
 # Organic fused ankles and gently fanned toes replace triangular stick feet.
 feet=[]
 for s in[-1,1]:
  x=s*.15;parts=[tube('bird ankle',[(x,.01,.225),(x,-.005,.16),(x,-.025,.095)],[.034,.036,.042],yellow,14),ell('bird foot pad',(x,-.070,.061),(.070,.09,.044),yellow,28,18)]
  for i in range(3):
   end=(x+(i-1)*.047,-.192-.023*(i==1),.038);parts.append(curve('rounded splayed toe',[(x+(i-1)*.019,-.081,.058),(x+(i-1)*.040,-.15,.047),end],.026 if i==1 else .023,yellow));parts.append(ell('toe round tip',end,(.024,.031,.022),yellow,22,14))
  feet.append(fuse('soft three toed foot',parts,yellow,.005,.7))
 join_parts('coherent bird feet',feet)
 cheeks=[]
 for s in[-1,1]:
  x=s*.124;z=1.17;eye('Eye.'+('L'if s<0 else'R'),(x,fy(ft,x,z)-.012,z),(.034,.020,.046),p['eye'],p['light']);cheeks.append(patch('peach cheek',ft,(s*.205,1.066),(.044,.008,.034),p['rose']))
 join_parts('warm peach cheeks',cheeks)
 upper=ell('upper rounded beak',(0,-.333,1.086),(.077,.086,.041),yellow,40,24)
 # Round triangular bill, fuller at the root and narrowing toward its tip.
 for v in upper.data.vertices:
  t=max(0,min(1,(-v.co.y/.086+1)/2));v.co.x*=1-.42*t*t;v.co.z-=.016*t
 ell('open beak',(0,-.343,1.045),(.046,.063,.033),mouth,32,20)
 lower=ell('lower beak',(0,-.358,1.017),(.048,.052,.017),yellow,32,18)
 tufts=[feather('central swept tuft',[(.005,.014,1.375),(.015,.014,1.525),(-.09,.014,1.585)],.052,blue,.68),feather('left swept tuft',[(-.018,.012,1.376),(-.105,.012,1.488),(-.188,.012,1.466)],.043,blue,.68),feather('small right tuft',[(.013,.025,1.378),(.051,.025,1.457),(.085,.025,1.434)],.029,blue,.65)]
 join_parts('soft swept crown feathers',tufts)
 tails=[]
 for i in range(3):
  tails.append(feather('layered lavender tail',[(-.16,.19,.44),(-.35-i*.047,.22,.58-i*.025),(-.46-i*.028,.22,.69-i*.091)],.077,purple,.75))
 join_parts('lavender tail fan',tails)
 # Sleeves and jointed wing shapes share the original shoulder pivots.
 for side,s in [('L',-1),('R',1)]:
  start=(s*.31,-.01,.86);elbow=(s*.415,-.15,.745 if s<0 else .81);hand=(s*.35,-.375,.715 if s<0 else .865)
  sleeve=fuse('rounded cardigan sleeve',[ell('rounded sleeve root',start,(.117,.13,.153),p['cream'],36,24),tube('short sleeve',[start,(s*.382,-.104,.796)],[.109,.102],p['cream'],16)],p['cream'],.008,.65)
  cuffpts=[(s*.372+.098*cos(a),-.12+.046*sin(a),.788+.078*sin(a))for a in[2*pi*i/32 for i in range(33)]];cuff=curve('rounded knit cuff',cuffpts,.008,p['cream']);sleeve=join_parts('cream sleeve and cuff',[sleeve,cuff])
  arm=fuse('wing volume',[tube('bent wing',[start,elbow,hand],[.102,.10,.069],wingmat,18),ell('rounded wing palm',hand,(.060,.054,.095),wingmat,32,22)],wingmat,.007,.62)
  feathers=[]
  for i in range(4):
   if s<0:
    root=(s*(.353+i*.006),-.225-i*.017,.767-i*.038);mid=(s*(.422+i*.010),-.333-i*.020,.734-i*.039);tip=(s*(.32+i*.015),-.411-i*.010,.715-i*.039)
   else:
    root=(s*(.361+i*.005),-.21,.916-i*.043);mid=(s*(.445+i*.004),-.310,.928-i*.047);tip=(s*(.378-i*.012),-.365,.889-i*.050)
   feathers.append(feather('overlapping wing feather',[root,mid,tip],.027 if i<3 else .024,blue,.72))
  for i in range(3):
   root=(s*(.358+i*.018),-.086-i*.027,.813-i*.018);mid=(s*(.459+i*.002),-.127-i*.037,.716-i*.031);tip=(s*(.385+i*.012),-.242-i*.030,.633-i*.034);feathers.append(feather('long layered wing feather',[root,mid,tip],.034-i*.001,blue,.75))
  plume=join_parts('layered soft wing feathers',feathers)
  child_group('Arm.'+side,[sleeve,arm,plume],start)
 buttons=[]
 for z in[.55,.42]:
  x=.053;y=fy(vt,x,z)-.012;buttons.append(ell('cardigan button',(x,y,z),(.020,.011,.023),p['gold'],24,16));
 join_parts('cardigan buttons',buttons)
 bows=[]
 for s in[-1,1]:
  o=ell('bow loop',(s*.069,-.326,.906),(.078,.033,.056),coral,32,20,.74);o.rotation_euler[1]=s*.28;bows.append(o)
 bows.append(ell('bow knot',(0,-.36,.908),(.033,.027,.037),coral,28,18));join_parts('soft coral bow',bows)
 # Same open score and RoleProp pivot; soften the page block and merge batches.
 group=[];papers=[];covers=[];scoremat=mat('score sage','A7BBA3')
 for side in[-1,1]:
  page=box('score page',(side*.095-.12,-.376,.754),(.20,.048,.295),p['paper'],.017);page.rotation_euler[2]=side*.20;papers.append(page)
  cover=box('score cover',(side*.098-.12,-.344,.754),(.211,.019,.307),scoremat,.015);cover.rotation_euler[2]=side*.20;covers.append(cover)
 papers.append(curve('score spine fold',[(-.12,-.416,.614),(-.12,-.417,.754),(-.12,-.416,.895)],.005,p['paper']))
 for side in[-1,1]:
  for j in range(3):
   papers.append(curve('rounded page edge',[(side*.187-.12,-.381-j*.006,.897),(-.12,-.401-j*.005,.897)],.0017,p['paper']))
 group += [join_parts('rounded score pages',papers),join_parts('sage score covers',covers)]
 ink=[]
 for base in[.670,.758]:
  for i in range(5):
   z=base+i*.012;ink.append(tube('staff line',[(-.300,-.416,z),(-.12,-.428,z),(.063,-.416,z)],[.0018]*3,p['wood'],6))
 for x,z in[(-.25,.682),(-.19,.706),(-.02,.682),(.027,.694),(-.24,.782),(-.17,.770),(-.04,.794),(.025,.782)]:
  me=bpy.data.meshes.new('filled note');me.from_pydata([(x+.010*cos(2*pi*i/12),-.430,z+.007*sin(2*pi*i/12))for i in range(12)],[],[tuple(range(12))]);me.update();note=bpy.data.objects.new('music note',me);bpy.context.collection.objects.link(note);smooth(note,p['wood']);ink.append(note);ink.append(tube('note stem',[(x+.008,-.430,z),(x+.008,-.430,z+.035)],[.0018,.0018],p['wood'],6))
 group.append(join_parts('score musical notation',ink));child_group('RoleProp',group,(-.12,-.36,.74))
 tube('wood_conductor_baton',[(.38,-.292,.78),(.55,-.292,1.23)],[.012,.009],p['wood'],12);ell('baton_tip',(.55,-.292,1.23),(.023,.021,.028),p['gold'],24,16)
 return body

def topology(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();components=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);n=0
  while stack:
   q=stack.pop();n+=1
   for e in q.link_edges:
    w=e.other_vert(q)
    if w not in seen:seen.add(w);stack.append(w)
  components.append(n)
 result={'components':len(components),'component_vertices':components,'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'vertices':len(bm.verts),'triangles':sum(len(f.verts)-2 for f in bm.faces)};bm.free();return result

bpy.ops.wm.read_factory_settings(use_empty=True);body=bird();meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:clean(o)
# Geometry-specific allocation gives the garment and visible face more fidelity.
for o in meshes:
 tris=sum(len(p.vertices)-2 for p in o.data.polygons)
 budget= {'Body':4700,'cream fitted cardigan':4100,'natural cream facial mask':1600,'coherent bird feet':2200,'soft swept crown feathers':1300,'lavender tail fan':1000,'score musical notation':700}.get(o.name,700 if 'wing volume' in o.name else 700 if 'layered soft wing' in o.name else 500 if 'cream sleeve' in o.name else 420)
 if tris>budget:
  bpy.context.view_layer.objects.active=o;d=o.modifiers.new('carefully allocated mobile LOD','DECIMATE');d.ratio=budget/tris;bpy.ops.object.modifier_apply(modifier=d.name)
 clean(o)
# Final hard cap, if details consume more than the documented allocation.
tri=lambda:sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in meshes)
if tri()>20700:
 ratio=20500/tri()
 for o in meshes:
  if len(o.data.polygons)>100:
   bpy.context.view_layer.objects.active=o;d=o.modifiers.new('mobile total cap','DECIMATE');d.ratio=ratio;bpy.ops.object.modifier_apply(modifier=d.name)
for o in meshes:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];floor=min(v.z for v in vs)
for o in list(bpy.data.objects):
 if o.parent is None:o.location.z-=floor
root=bpy.data.objects.new('SchoolResident.music-bird',None);bpy.context.collection.objects.link(root);root['species']='music-bird';root['front']='+Z';root['up']='+Y';root['source']='Original procedural DORMI refinement from approved 2026-10-04 school cast image';root['description']='Periwinkle music teacher, fitted cream cardigan, coral bow, open score, wooden baton'
bpy.context.view_layer.update()
for o in list(bpy.data.objects):
 if o!=root and o.parent is None:w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
info={'id':'music-bird','lod':'low','triangles':tri(),'mesh_objects':len(meshes),'material_primitives':sum(len(o.data.materials)for o in meshes),'body_topology':topology(body),'roles':sorted(o.get('role')for o in bpy.data.objects if o.get('role')),'bounds_blender':{'min':[min(v[i]for v in vs)for i in range(3)],'max':[max(v[i]for v in vs)for i in range(3)]}}
assert info['triangles']<=21000 and info['material_primitives']<=60
assert info['body_topology']['components']==1 and info['body_topology']['boundary_edges']==0 and info['body_topology']['nonmanifold_edges']==0
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=ROOT+'/music-bird-low.glb',export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
info['bytes']=os.path.getsize(ROOT+'/music-bird-low.glb');json.dump(info,open(ROOT+'/music-bird-low.json','w'),indent=2);bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/music-bird-polished.blend');print('POLISHED_BIRD',json.dumps(info),flush=True)
