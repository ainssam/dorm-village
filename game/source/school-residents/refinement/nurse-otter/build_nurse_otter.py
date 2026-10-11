"""DORMI approved nurse-otter polish, 2026-10-04.
Reproducible: blender --background --python build_nurse_otter.py
Only original authored geometry; no external textures, downloads, or image generation.
Preserves original role names, shoulder pivots and notebook grip.
"""
import os
SOURCE=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'baseline_build_school_residents.py')
# Vendored approved baseline helpers; the baseline's export loop is intentionally not run.
exec(compile(open(SOURCE).read().split('def otter():')[0],SOURCE,'exec'))

def join(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name
 return o

def clean(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()

def mesh(name,vs,fs,m):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);smooth(o,m);clean(o);return o

def bezier(points,t):
 a,b,c,d=[Vector(p) for p in points];return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def catmull(points,t):
 n=len(points);f=t*n;i=int(f)%n;u=f-int(f);a,b,c,d=[Vector(points[q%n]) for q in [i-1,i,i+1,i+2]]
 return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)

def face_patch(name,outline,center,base,m,depth=.035):
 n=64;rings=9;vs=[];fs=[]
 for side in [0,1]:
  for j in range(rings+1):
   r=j/rings
   for k in range(n):
    p=Vector(center).lerp(catmull(outline,k/n),r);x,z=p
    y=fy(base,x,z)-(.007+depth*max(0,1-r*r)**.65 if side==0 else -.005)
    vs.append((x,y,z))
 off=(rings+1)*n
 for side in [0,1]:
  for j in range(rings):
   for k in range(n):
    a=side*off+j*n+k;b=side*off+j*n+(k+1)%n;c=b+n;d=a+n;fs.append((a,b,c,d) if side==0 else (d,c,b,a))
 for k in range(n):
  a=rings*n+k;b=rings*n+(k+1)%n;fs.append((a,a+off,b+off,b))
 return mesh(name,vs,fs,m)

def panel(name,widths,m,backtree,offset=.018,cols=24):
 vs=[];fs=[];nr=len(widths)
 for side in [0,1]:
  for j,(z,w) in enumerate(widths):
   for k in range(cols+1):
    u=k/cols*2-1;x=w*u;zz=z+(1-u*u)*(-.017 if j==nr-1 else -.015 if j==0 else 0)
    sample_z=max(.37,zz)
    try:y=fy(backtree,x,sample_z)-offset
    except:y=-.294*math.sqrt(max(.10,1-(x/.354)**2))-.009
    y-=.006*sin(pi*k/cols)*sin(pi*j/(nr-1))
    vs.append((x,y+(0 if side==0 else .013),zz))
 off=nr*(cols+1)
 for side in [0,1]:
  for j in range(nr-1):
   for k in range(cols):
    a=side*off+j*(cols+1)+k;b=a+1;c=b+cols+1;d=a+cols+1;fs.append((a,b,c,d) if side==0 else (d,c,b,a))
 edges=[]
 for k in range(cols):edges += [(k,k+1),((nr-1)*(cols+1)+k+1,(nr-1)*(cols+1)+k)]
 for j in range(nr-1):edges += [((j+1)*(cols+1),j*(cols+1)),(j*(cols+1)+cols,(j+1)*(cols+1)+cols)]
 for a,b in edges:fs.append((a,a+off,b+off,b))
 return mesh(name,vs,fs,m)

def ribbon(name,points,width,m):
 # A curved strap with front/back thickness, closed and consistently spaced.
 samples=[bezier(points,i/24) for i in range(25)];vs=[];fs=[]
 for i,p in enumerate(samples):
  t=(samples[min(i+1,24)]-samples[max(0,i-1)]).normalized();v=Vector((1,0,0));v=(v-t*v.dot(t)).normalized();normal=t.cross(v).normalized()
  for dw,dn in [(-1,-1),(1,-1),(1,1),(-1,1)]:vs.append(tuple(p+v*width*.5*dw+normal*.009*dn))
 for i in range(24):
  for k in range(4):fs.append((i*4+k,i*4+(k+1)%4,(i+1)*4+(k+1)%4,(i+1)*4+k))
 fs.extend([(3,2,1,0),(96,97,98,99)]);o=mesh(name,vs,fs,m);bpy.context.view_layer.objects.active=o;b=o.modifiers.new('rolled strap edge','BEVEL');b.width=.005;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name);return o

def otter():
 p=common();brown=mat('otter cocoa','AC7C56');lightbrown=mat('warm muzzle','DCC094');mint=mat('sage apron','A9BE9E');ear=mat('soft ear inset','C29473');dark=mat('cocoa nose','694934',.45);seam=mat('sage tailored seams','99AF90');fold=mat('warm cloth seam','DDD2B5');crease=mat('paw soft crease','926A4B')
 parts=[ell('body',(0,.015,.63),(.32,.265,.49),brown,48,30,.87),ell('head',(0,-.018,1.20),(.405,.30,.345),brown,48,32,.92)]
 for s in[-1,1]:
  parts += [ell('short leg',(s*.175,.006,.25),(.13,.14,.24),brown),ell('foot',(s*.18,-.095,.105),(.145,.205,.105),brown),ell('round ear',(s*.31,.02,1.46),(.105,.072,.105),brown)]
 ts=[];rs=[]
 for i in range(46):
  t=i/45;ts.append((-.01-.735*t,.15+.105*sin(pi*t),.395-.18*sin(pi*t*.76)+.057*t*t));rs.append(.167*(1-t)**.88+.004)
 parts += [tube('soft organic otter tail',ts,rs,brown,20),ell('round tail tip',ts[-1],(.01,.01,.01),brown,16,10)]
 body=fuse('Body',parts,brown,.0075,.62);body['role']='Body';bt=tree(body)
 for s in[-1,1]:ell('ear inset',(s*.31,-.044,1.46),(.061,.018,.065),ear,24,16)
 shirt=ell('cream shirt',(0,.015,.63),(.346,.294,.505),p['cream'],48,32,.87);bpy.context.view_layer.update();crop_shirt(shirt,.36);st=tree(shirt)
 apron=panel('tailored apron',[(.34,.303),(.355,.310),(.39,.311),(.45,.303),(.52,.297),(.60,.288),(.67,.278),(.72,.258),(.77,.224),(.83,.20),(.90,.193),(.95,.190),(.973,.175)],mint,st);at=tree(apron)
 # Bound seams use the same curved exported surface, not floating oval patches.
 for z,w in [(.353,.295),(.718,.24),(.954,.168)]:
  pts=[]
  for i in range(17):
   x=-w+2*w*i/16;zz=z-.012*(1-(x/w)**2);pts.append((x,fy(at,x,zz)-.003,zz))
  curve('tailored apron hem',pts,.004,seam)
 for s in[-1,1]:
  ribbon('curved apron strap',[(s*.173,-.229,.947),(s*.237,-.189,1.058),(s*.264,.01,1.068),(s*.219,.196,.918)],.058,mint)
  ell('strap button',(s*.173,fy(at,s*.173,.951)-.016,.951),(.023,.012,.023),seam,24,14)
  ell('button inset',(s*.173,fy(at,s*.173,.951)-.027,.951),(.009,.003,.009),mint,16,10)
 # Two actual rounded pockets, with outward-curved lip and a rolled cloth in the left.
 for s in[-1,1]:
  cx=s*.181;cz=.467
  outline=[(cx-.068,cz+.057),(cx+.068,cz+.057),(cx+.070,cz-.033),(cx+.051,cz-.062),(cx-.051,cz-.062),(cx-.070,cz-.033)]
  face_patch('apron pocket',outline,(cx,cz),at,mint,.022)
  pts=[(cx-.063+ .126*i/12,fy(at,cx-.063+.126*i/12,cz+.057)-.031,cz+.057-.007*sin(pi*i/12)) for i in range(13)]
  curve('pocket folded lip',pts,.006,seam)
 # Rounded lower-face mask + twin soft muzzle pads, preserving the head silhouette.
 outline=[(0,1.210),(.092,1.198),(.205,1.218),(.296,1.179),(.337,1.111),(.325,1.047),(.259,.991),(.151,.963),(0,.951),(-.151,.963),(-.259,.991),(-.325,1.047),(-.337,1.111),(-.296,1.179),(-.205,1.218),(-.092,1.198)]
 muzzle=face_patch('rounded cheek and chin mask',outline,(0,1.091),bt,lightbrown,.048);mt=tree(muzzle)
 for s in[-1,1]:
  ell('soft muzzle cheek',(s*.087,fy(mt,s*.087,1.148)-.008,1.145),(.107,.037,.065),lightbrown,32,20)
  x=s*.155;z=1.32;eye('Eye.'+('L'if s<0 else'R'),(x,fy(bt,x,z)-.012,z),(.036,.020,.048),p['eye'],p['light'])
  brow=ell('soft brow',(s*.145,fy(bt,s*.145,1.397)-.013,1.397),(.047,.011,.015),lightbrown,24,16);brow.rotation_euler[1]=s*.16
 nose=ell('rounded otter nose',(0,fy(mt,0,1.185)-.035,1.185),(.061,.033,.037),dark,28,18,1.05)
 for v in nose.data.vertices:
  v.co.x*=.80+.30*(v.co.z/.037+1)*.5
 curve('short philtrum',[(0,-.420,1.164),(0,-.421,1.146),(0,-.419,1.127)],.0045,dark)
 curve('gentle double smile',[(-.137,-.380,1.116),(-.101,-.409,1.102),(-.049,-.423,1.105),(0,-.424,1.126),(.049,-.423,1.105),(.101,-.409,1.102),(.137,-.380,1.116)],.0045,dark)
 # Short fine whiskers sweep along cheeks, with rounded tips and individually tapered geometry.
 for s in[-1,1]:
  for i in range(3):
   z=1.154-i*.037;start=Vector((s*.232,fy(mt,s*.232,z)-.008,z));pts=[];rads=[]
   for j in range(13):
    t=j/12;pts.append(tuple(start+Vector((s*(.165*t),.032*t,(.028-i*.018)*t+.014*sin(pi*t)))));rads.append(.0027*(1-.82*t))
   tube('fine cheek whisker',pts,rads,lightbrown,6)
 for side,s in [('L',-1),('R',1)]:
  start=(s*.29,-.035,.87);hand=(s*.235,-.375,.77 if s<0 else .70)
  points=[start,(s*.377,-.071,.863),(s*.385,-.297,.601 if s>0 else .649),hand]
  pts=[];rs=[]
  for i in range(23):
   t=i/22*.88;pts.append(tuple(bezier(points,t)));rs.append(.108-.035*t+.004*sin(pi*t))
  sleeve=fuse('continuous bent sleeve',[tube('curved sleeve sweep',pts,rs,p['cream'],20),ell('shoulder volume',start,(.111,.116,.137),p['cream'],28,20)],p['cream'],.008,.55)
  cuffcenter=bezier(points,.86);tan=(bezier(points,.90)-bezier(points,.82)).normalized();ref=Vector((1,0,0));u=tan.cross(ref).normalized();v=tan.cross(u).normalized();ring=[tuple(cuffcenter+.082*(cos(i*2*pi/32)*u+sin(i*2*pi/32)*v)) for i in range(33)];cuff=curve('sleeve rolled cuff',ring,.010,fold)
  paw=fuse('curved grasping paw',[ell('paw palm',hand,(.106,.076,.082),brown,32,20,1),ell('rounded thumb',(hand[0]-s*.025,hand[1]-.006,hand[2]+.043),(.081,.073,.046),brown,28,18)],brown,.006,.55)
  objs=[sleeve,paw,cuff]
  for k in range(2):
   z=hand[2]-.011+k*.03;objs.append(curve('subtle paw crease',[(hand[0]-s*.067,hand[1]-.058,z),(hand[0]-s*.036,hand[1]-.075,z-.005),(hand[0]+s*.006,hand[1]-.078,z-.007)],.0023,crease))
  child_group('Arm.'+side,objs,start)
 objs=book('health notebook',(.03,-.402,.80),(.37,.09,.48),mint,p['paper']);crossmat=mat('health badge','7C9B79');badge=box('notebook badge',(.03,-.476,.87),(.145,.015,.155),p['cream'],.02);a=box('care cross vertical',(.03,-.488,.87),(.029,.016,.098),crossmat,.007);b=box('care cross horizontal',(.03,-.49,.87),(.090,.016,.029),crossmat,.007);child_group('RoleProp',objs+[badge,a,b],(.03,-.4,.8))
 cy=fy(at,-.18,.55)+.007
 cloth=tube('cloth roll',[(-.18,cy,z) for z in [.514,.522,.587,.600]],[.027,.031,.031,.027],p['cream'],24)
 spiral=[]
 for i in range(60):
  a=i/59*pi*4;rad=.025*(1-i/70);spiral.append((-.18+rad*cos(a),cy+rad*sin(a),.603+.001*i/59))
 curve('cloth roll spiral',spiral,.0045,fold)
 return body

def topology(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();sizes=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);n=0
  while stack:
   q=stack.pop();n+=1
   for e in q.link_edges:
    w=e.other_vert(q)
    if w not in seen:seen.add(w);stack.append(w)
  sizes.append(n)
 out={'components':len(sizes),'component_vertex_counts':sorted(sizes,reverse=True),'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges)};bm.free();return out

def tri(o):return sum(len(f.vertices)-2 for f in o.data.polygons)
def decimate(o,target):
 count=tri(o)
 if count<=target:return
 bpy.context.view_layer.objects.active=o;d=o.modifiers.new('role-aware delivery budget','DECIMATE');d.ratio=target/count;bpy.ops.object.modifier_apply(modifier=d.name)

bpy.ops.wm.read_factory_settings(use_empty=True);body=otter()
for o in [o for o in bpy.data.objects if o.type=='MESH']:
 clean(o)
 if o==body:decimate(o,7900)
 elif o.name.startswith('continuous bent sleeve'):decimate(o,950)
 elif o.name.startswith('curved grasping paw'):decimate(o,500)
 elif o.name.startswith('rounded cheek'):decimate(o,1300)
 elif o.name=='tailored apron':decimate(o,1200)
 elif o.name.startswith('tailored apron hem'):decimate(o,120)
 elif o.name.startswith('apron pocket'):decimate(o,300)
 elif o.name.startswith('soft muzzle cheek'):decimate(o,440)
 elif o.name.startswith('cream shirt'):decimate(o,580)
 elif o.name.startswith('subtle paw crease'):decimate(o,60)
 elif o.name.startswith('pocket folded lip'):decimate(o,100)
 elif o.name.startswith('sleeve rolled cuff'):decimate(o,120)
 elif o.name.startswith('soft brow'):decimate(o,100)
 elif o.name.startswith('strap button'):decimate(o,100)
 elif o.name.startswith('button inset'):decimate(o,50)
 elif o.name.startswith('cloth roll spiral'):decimate(o,150)
 elif o.name.startswith('care cross'):decimate(o,100)
 elif o.name.startswith('gentle double smile'):decimate(o,110)
 elif o.name.startswith('short philtrum'):decimate(o,40)
 elif o.name.startswith('fine cheek whisker'):decimate(o,100)
 elif o.name.startswith('Eye.'):decimate(o,180 if 'catchlight' not in o.name else 72)
 elif tri(o)>180:decimate(o,180)
# Group same-material static detail within the existing semantic hierarchy to reduce GPU draw calls.
# Body and eyes remain separately addressable. Every arm and notebook keeps its exact authored pivot.
groups={}
for o in list(bpy.data.objects):
 if o.type!='MESH' or o==body or o.get('role') in ['Eye.L','Eye.R'] or (o.parent and o.parent.get('role') in ['Eye.L','Eye.R']):continue
 if len(o.data.materials)==1:groups.setdefault((o.parent.name if o.parent else '',o.data.materials[0].name),[]).append(o)
for (parent,material),objects in groups.items():
 if len(objects)>1:join((parent+'.' if parent else '')+material+'.details',objects)
meshes=[o for o in bpy.data.objects if o.type=='MESH'];bpy.context.view_layer.update();floor=min((o.matrix_world@v.co).z for o in meshes for v in o.data.vertices)
for o in list(bpy.data.objects):
 if o.parent is None:o.location.z-=floor
root=bpy.data.objects.new('SchoolResident.nurse-otter',None);bpy.context.collection.objects.link(root);root['species']='nurse-otter';root['description']='Approved cocoa otter teacher with rounded cheeks, tailored sage apron, cream sleeves and care notebook';root['source']='Original approved 2026-10-04 DORMI concept; targeted authored geometry polish';root['front']='+Z';root['up']='+Y';bpy.context.view_layer.update()
for o in list(bpy.data.objects):
 if o!=root and o.parent is None:w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
for o in meshes:
 for f in o.data.polygons:f.use_smooth=True
bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
info={'id':'nurse-otter','lod':'low','triangles':sum(tri(o) for o in meshes),'mesh_objects':len(meshes),'draw_primitives':sum(len(o.data.materials) for o in meshes),'central_body_topology':topology(body),'body_components':topology(body)['components'],'boundary_edges':topology(body)['boundary_edges'],'nonmanifold_edges':topology(body)['nonmanifold_edges'],'bounds_blender':{'min':[min(v[i] for v in vs) for i in range(3)],'max':[max(v[i] for v in vs) for i in range(3)]},'roles':{o.get('role'):list(o.matrix_world.translation) for o in bpy.data.objects if o.get('role')},'mesh_triangle_breakdown':{o.name:tri(o) for o in meshes}}
print('PRE_BUDGET',json.dumps(info),flush=True);assert info['triangles']<=21000,info['triangles'];assert info['central_body_topology']['components']==1;assert info['nonmanifold_edges']==0
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=root;out=ROOT+'/nurse-otter-low.glb';bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
info['bytes']=os.path.getsize(out);assert info['bytes']<450000,info['bytes'];json.dump(info,open(ROOT+'/nurse-otter-low.json','w'),indent=2);bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/nurse-otter-polished.blend');print('MODEL_READY',json.dumps(info),flush=True)
