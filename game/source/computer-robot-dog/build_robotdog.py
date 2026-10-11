"""Approved DORMI computer-room robot dog. Original procedural, articulated asset.
Run: blender -b --python source/build_robotdog.py -- [--render]
Blender coordinates: -Y front, Z up. glTF: +Z front, Y up. Dimensions in metres.
"""
import bpy, math, os, sys, json
from mathutils import Vector
from math import sin, cos, pi
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def material(name, color, rough=.38, metal=0, emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    linear=lambda x:x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
    rgba=tuple(linear(x) for x in rgb)+(1,)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if 'Coat Weight' in p.inputs:p.inputs['Coat Weight'].default_value=.16
    if emission:p.inputs['Emission Color'].default_value=rgba;p.inputs['Emission Strength'].default_value=emission
    m.diffuse_color=rgba;return m
CREAM=material('Porcelain · warm ivory','EEE4CF',.34)
MINT=material('Soft mint · joint elastomer','91B4A8',.49)
SEAM=material('Mint seam shadow','53786D',.47)
NAVY=material('Display · navy glass','202937',.25)
RIM=material('Display seal · charcoal','39434D',.44)
LIGHT=material('Warm LED · eyes and smile','FFF1B8',.4,emission=.7)
CORAL=material('Coral LED · heart and cheeks','FF8068',.44,emission=.32)

def mesh(name, vertices, faces, mat, parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
    if mat:ob.data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    if parent:ob.parent=parent
    return ob
def group(name,loc=(0,0,0),parent=None):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.location=loc
    ob['role']=name
    if parent:ob.parent=parent
    return ob
def sp(v,e):return math.copysign(abs(v)**e,v)
def ell(name,loc,scale,mat,parent=None,n=2,seg=32,rings=18):
    seg=max(16,round(seg*.8));rings=max(10,round(rings*.8))
    # Shared poles keep a manifold closed surface without zero-area pole faces.
    a,b,c=scale;e=2/n;vs=[(0,0,-c)];fs=[]
    for j in range(1,rings):
        v=-pi/2+pi*j/rings
        for i in range(seg):
            u=2*pi*i/seg;vs.append((a*sp(cos(v),e)*sp(cos(u),e),b*sp(cos(v),e)*sp(sin(u),e),c*sp(sin(v),e)))
    top=len(vs);vs.append((0,0,c))
    for i in range(seg):fs.append((0,1+(i+1)%seg,1+i))
    for j in range(rings-2):
        for i in range(seg):a0=1+j*seg+i;b0=1+j*seg+(i+1)%seg;fs.append((a0,b0,b0+seg,a0+seg))
    for i in range(seg):fs.append((top,1+(rings-2)*seg+i,1+(rings-2)*seg+(i+1)%seg))
    ob=mesh(name,vs,fs,mat,parent);ob.location=loc;return ob
def tube(name,points,radii,mat,parent=None,sides=12):
    vs=[];fs=[]
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized();ref=Vector((0,1,0))
        if abs(ref.dot(tangent))>.9:ref=Vector((1,0,0))
        u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):vs.append(tuple(Vector(p)+radii[i]*(u*cos(j*2*pi/sides)+v*sin(j*2*pi/sides))))
    for i in range(len(points)-1):
        for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vs,fs,mat,parent)
def curve(name,points,r,mat,parent=None):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=5;cu.bevel_depth=r;cu.bevel_resolution=1
    s=cu.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob.select_set(False)
    if parent:ob.parent=parent
    return ob
def flatshape(name,points,y,mat,parent=None,depth=.012):
    cx=sum(x for x,z in points)/len(points);cz=sum(z for x,z in points)/len(points)
    vs=[(cx,y-depth,cz)];fs=[];count=len(points)
    for r,d in [(.78,-depth),(1,0),(.92,depth*.5)]:
        vs.extend((cx+(x-cx)*r,y+d,cz+(z-cz)*r) for x,z in points)
    for i in range(count):fs.append((0,1+i,1+(i+1)%count))
    for j in range(2):
        for i in range(count):fs.append((1+j*count+i,1+(j+1)*count+i,1+(j+1)*count+(i+1)%count,1+j*count+(i+1)%count))
    fs.append(tuple(range(1+2*count,1+3*count)));return mesh(name,vs,fs,mat,parent)
def headfront(x,z):return -.312*max(.015,1-abs(x/.493)**3.4-abs(z/.375)**3.4)**(1/3.4)
def facepatch(name,w,h,offset,mat,parent):
    vs=[(0,headfront(0,0)-offset,0)];fs=[];seg=64;rings=8
    for j in range(1,rings+1):
        r=j/rings
        for i in range(seg):
            u=2*pi*i/seg;x=w*r*sp(cos(u),2/3.5);z=h*r*sp(sin(u),2/3.5)
            vs.append((x,headfront(x,z)-offset,z))
    for i in range(seg):fs.append((0,1+i,1+(i+1)%seg))
    for j in range(rings-1):
        for i in range(seg):a=1+j*seg+i;b=1+j*seg+(i+1)%seg;fs.append((a,a+seg,b+seg,b))
    # Front normals point -Y; order checked by face cross products.
    return mesh(name,vs,fs,mat,parent)
def roundedpaw(name,parent):
    # Rounded toe box with a genuinely flat underside at z=0, avoiding hovering spherical feet.
    vs=[];fs=[];seg=32
    levels=[(0,.82),(.013,.95),(.075,1),(.128,.95),(.176,.7),(.20,.3),(.203,0)]
    for j,(z,r) in enumerate(levels):
        for i in range(seg):
            a=2*pi*i/seg;cz=z-.022*sin(a) if j in [2,3] else z;cy=-.027 if j<3 else -.027+(j-2)*.013
            vs.append((.146*r*sp(cos(a),.78),cy+.188*r*sp(sin(a),.78),cz))
    for j in range(len(levels)-1):
        for i in range(seg):fs.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
    fs.append(tuple(range(seg-1,-1,-1)));ob=mesh(name,vs,fs,MINT,parent);ob.data.materials.append(CREAM)
    for p in ob.data.polygons:
        if 2*seg<=p.index<(len(levels)-1)*seg:p.material_index=1
    for x in [-.058,0,.058]:
        curve(name+'.toe seam',[(x,-.209,.025),(x,-.210,.054),(x,-.209,.078)],.0017,SEAM,parent)
    return ob
def ear(name,s,parent):
    g=group(name,(s*.448,-.022,.268),parent);vs=[];fs=[];seg=20;rings=18
    for j in range(rings+1):
        t=j/rings;center=Vector((s*(.014+.22*t+.025*sin(pi*t)),.015+.042*t,-.59*t))
        wide=.14*(sin(pi*t)**.56);depth=.063*(sin(pi*t)**.46)
        u=Vector((.939,0,s*.343));v=Vector((0,-1,0))
        for i in range(seg):
            a=2*pi*i/seg;vs.append(tuple(center+wide*cos(a)*u+depth*sin(a)*v))
    for j in range(rings):
        for i in range(seg):fs.append((j*seg+i,j*seg+(i+1)%seg,(j+1)*seg+(i+1)%seg,(j+1)*seg+i))
    ob=mesh(name+'.shell',vs,fs,MINT,g);ob.data.materials.append(CREAM)
    for p in ob.data.polygons:
        # Cream front/outer lobe, mint inner/back panel.
        a=2*pi*((p.index%seg)+.5)/seg
        if (sin(a)>.05 and s*cos(a)>-.43) or s*cos(a)>.4:p.material_index=1
    return g
def merge_by_group():
    # Keep articulation, share materials, merge static objects under each pivot.
    for par in [o for o in list(bpy.data.objects) if o.type=='EMPTY']:
        children=[o for o in par.children if o.type=='MESH']
        if len(children)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in children:o.select_set(True)
        bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();children[0].name=par.name+'.mesh'

root=group('RobotDog');root['asset']='DORMI computer-room robot dog';root['front']='+Z in glTF'
body=group('Body',(0,0,.535),root)
ell('chassis main',(0,.045,0),(.325,.51,.265),CREAM,body,n=2.7,seg=40,rings=24)
# Small mint undercarriage remains inside the cream shell and shoulder overlaps.
def chestfront(x,z):return .045-.51*max(.01,1-abs(x/.325)**2.7-abs(z/.265)**2.7)**(1/2.7)
vs=[(0,chestfront(0,.07)-.008,.07)];fs=[];seg=40;rings=6
for j in range(1,rings+1):
    r=j/rings
    for i in range(seg):
        t=2*pi*i/seg;x=.178*sin(t)*(.78+.22*cos(t))*r;z=.07+.164*cos(t)*r;vs.append((x,chestfront(x,z)-.008,z))
for i in range(seg):fs.append((0,1+(i+1)%seg,1+i))
for j in range(rings-1):
    for i in range(seg):a=1+j*seg+i;b=1+j*seg+(i+1)%seg;fs.append((a,b,b+seg,a+seg))
mesh('flush mint chest shield',vs,fs,MINT,body)
heart=[]
for i in range(48):
    t=2*pi*i/48;heart.append((.003*16*sin(t)**3,.054+.003*(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t))))
heartobj=flatshape('heart indicator',heart,0,CORAL,body,depth=.004)
for v in heartobj.data.vertices:v.co.y+=chestfront(v.co.x,v.co.z)-.012
curve('breast shell seam',[(0,chestfront(0,z)-.002,z) for z in [-.236,-.176,-.096]],.002,MINT,body)
ell('neck collar',(0,-.299,.255),(.172,.159,.11),MINT,body,n=2.5,seg=28,rings=14)

head=group('Head',(0,-.399,1.048),root)
ell('rounded display housing',(0,0,0),(.493,.312,.375),CREAM,head,n=3.4,seg=48,rings=28)
facepatch('recessed display gasket',.444,.299,.006,RIM,head)
facepatch('curved navy display',.432,.287,.012,NAVY,head)
for s,label in [(-1,'L'),(1,'R')]:
    x=s*.19;z=.065
    g=group('Eye.'+label,(x,0,z),head)
    vs=[(0,headfront(x,z)-.014,0)];fs=[]
    for i in range(40):
        a=2*pi*i/40;dx=.049*cos(a);dz=.09*sin(a);vs.append((dx,headfront(x+dx,z+dz)-.014,dz))
    for i in range(40):fs.append((0,1+i,1+(i+1)%40))
    mesh('flush warm oval eye',vs,fs,LIGHT,g)
    # Cheeks are flush display elements, not separate facial buttons.
    x=s*.285;z=-.095
    vs=[(x,headfront(x,z)-.014,z)];fs=[]
    for i in range(32):
        a=2*pi*i/32;px=x+.044*cos(a);pz=z+.019*sin(a);vs.append((px,headfront(px,pz)-.014,pz))
    for i in range(32):fs.append((0,1+i,1+(i+1)%32))
    mesh('flush coral cheek',vs,fs,CORAL,head)
    ear('Ear.'+label,s,head)
nose=[(-.042,-.008),(-.035,.007),(-.018,.012),(.018,.012),(.035,.007),(.042,-.008),(.03,-.026),(.012,-.041),(0,-.044),(-.012,-.041),(-.03,-.026)]
flatshape('mint nose',nose,headfront(0,-.015)-.015,MINT,head,depth=.003)
smile=[(-.055,-.070),(-.042,-.089),(-.021,-.102),(0,-.107),(.023,-.103),(.044,-.09),(.057,-.072)]
curve('gentle LED smile',[(x,headfront(x,z)-.016,z) for x,z in smile],.0065,LIGHT,head)

tail=group('Tail',(0,.491,.61),root)
tailpts=[];tailr=[];steps=[0,.05,.1,.15,.18,.21,.26,.32,.38,.40,.415,.44,.50,.56,.62,.64,.655,.68,.74,.80,.86,.92,1]
for t in steps:
    a=t*pi*.54;tailpts.append((0,.28*sin(a),.31*(1-cos(a))));tailr.append(.078-.021*t)
ob=tube('segmented continuous tail',tailpts,tailr,MINT,tail,20);ob.data.materials.append(CREAM)
for p in ob.data.polygons:
    if p.index<(len(steps)-1)*20:
        t=(steps[p.index//20]+steps[p.index//20+1])/2
        if t>.18 and not (.40<t<.415 or .64<t<.655):p.material_index=1
ell('tail mint tip',tuple(Vector(tailpts[-1])+Vector((0,-.006,.060))),(.067,.070,.095),MINT,tail,n=2.3,seg=24,rings=14)

UPPER=.23;LOWER=.23;ANKLE=.105
def solve_leg(hip,paw,bend):
    h=Vector(hip);a=Vector((paw[0],paw[1],paw[2]+ANKLE));d=a-h;length=d.length;n=d.normalized()
    along=(UPPER*UPPER-LOWER*LOWER+length*length)/(2*length);perp=Vector((0,bend,0));perp=(perp-n*perp.dot(n)).normalized()
    k=h+n*along+perp*math.sqrt(max(0,UPPER*UPPER-along*along));return k,a
for label,x,y,bend in [('FL',-.302,-.278,1),('FR',.302,-.278,1),('RL',-.302,.333,-1),('RR',.302,.333,-1)]:
    hip=(x,y,.506);paw=(x*1.1,y-.055,0);knee,ankle=solve_leg(hip,paw,bend)
    u=group('Upper.'+label,hip,root);l=group('Lower.'+label,knee,root);p=group('Paw.'+label,paw,root)
    side=-1 if x<0 else 1
    ell('inboard shoulder seal',(-side*.094,0,-.018),(.022,.139,.15),MINT,u,n=2.3,seg=24,rings=14)
    ell('cream upper sleeve',(0,0,-.07),(.138,.13,.197),CREAM,u,n=2.8,seg=24,rings=16)
    ell('knee mint hinge',(0,0,0),(.083,.08,.075),MINT,l,n=2.2,seg=24,rings=14)
    ell('cream lower sleeve',(0,-.007,-.086),(.113,.116,.17),CREAM,l,n=2.7,seg=24,rings=16)
    # Spherical joint keeps continuous mechanical connection as ankles change angle.
    ell('ankle mint ball',(0,0,ANKLE),(.091,.093,.082),MINT,p,seg=20,rings=12)
    roundedpaw('paw sole '+label,p)
    for g,d in [(u,knee-Vector(hip)),(l,ankle-knee)]:g.rotation_mode='QUATERNION';g.rotation_quaternion=Vector((0,0,-1)).rotation_difference(d.normalized())

merge_by_group();bpy.context.view_layer.update()
# Bake the soft-shell palette to vertex colors, reducing every moving shell to one draw.
SOFT=material('Soft shell · vertex palette','FFFFFF',.38)
vc=SOFT.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='ShellPalette'
SOFT.node_tree.links.new(vc.outputs['Color'],SOFT.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for ob in [o for o in bpy.data.objects if o.type=='MESH']:
    attr=ob.data.color_attributes.new(name='ShellPalette',type='FLOAT_COLOR',domain='CORNER')
    mats=list(ob.data.materials);newmats=[];mapping={}
    for i,mat in enumerate(mats):
        target=mat if mat in [NAVY,LIGHT,CORAL] else SOFT
        if target not in newmats:newmats.append(target)
        mapping[i]=newmats.index(target)
    indices=[]
    for poly in ob.data.polygons:
        old=mats[poly.material_index];rgba=old.diffuse_color if old not in [NAVY,LIGHT,CORAL] else (1,1,1,1)
        for li in poly.loop_indices:attr.data[li].color=rgba
        indices.append(mapping[poly.material_index])
    ob.data.materials.clear()
    for mat in newmats:ob.data.materials.append(mat)
    for poly,index in zip(ob.data.polygons,indices):poly.material_index=index
root['triangle_budget']=25000;root['motion']='runtime/robotdog-motion.mjs';root['ground_plane']=0
# Apply triangulation for identical delivered and rendered topology.
for ob in list(bpy.data.objects):
    if ob.type=='MESH':
        bpy.context.view_layer.objects.active=ob;tri=ob.modifiers.new('portable triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
        # Weld only coincident ear/paw cap vertices, retaining deliberate articulation gaps.
        import bmesh
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()

os.makedirs(os.path.join(ROOT,'assets'),exist_ok=True)
os.makedirs(os.path.join(ROOT,'qa'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','computer-robot-dog.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','computer-robot-dog.glb'),export_format='GLB',export_extras=True,export_animations=False,export_yup=True)
stats={'triangles':sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'),'mesh_objects':sum(o.type=='MESH' for o in bpy.data.objects),'materials':len({m.name for o in bpy.data.objects if o.type=='MESH' for m in o.data.materials})}
open(os.path.join(ROOT,'qa','build-stats.json'),'w').write(json.dumps(stats,indent=2));print(json.dumps(stats))
