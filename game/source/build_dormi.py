"""Procedural stylized approximation of Dormi's 2-D reference.
Run: blender --background --python build_dormi.py
Blender: Z up / -Y front; exported glTF: +Y up / +Z front.
No texture files or add-on dependencies are required.
"""
import bpy, math, json, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for dat in bpy.data.materials: bpy.data.materials.remove(dat)

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def material(name, hexcolor, rough=.48):
    rgb=tuple(int(hexcolor[i:i+2],16)/255 for i in (0,2,4))
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*[linear(x) for x in rgb],1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Specular IOR Level'].default_value=.3
    mat.diffuse_color=(*rgb,1)
    return mat
white=material('Dormi | warm porcelain','F8F5EF',.46)
cream=material('Dormi | cream face','F0E8DF',.49)
navy=material('Dormi | indigo spirals','204493',.36)
dark=material('Dormi | charcoal eyes','24252D',.29)
mouthmat=material('Dormi | cherry mouth interior','602B3A',.53)
pink=material('Dormi | rosy cheeks','F6B2BD',.61)
tongue=material('Dormi | strawberry tongue','F78A9E',.5)
model=[]

def smooth(obj,mat):
    obj.data.materials.append(mat)
    for f in obj.data.polygons: f.use_smooth=True
    return obj

def ellipsoid(name,loc,scale,mat,seg=40,rings=24,exp=1):
    verts=[]; faces=[]
    def sp(x,e): return math.copysign(abs(x)**e,x)
    for j in range(rings+1):
        lat=-pi/2+pi*j/rings
        for i in range(seg):
            a=2*pi*i/seg
            verts.append((scale[0]*sp(cos(lat),exp)*cos(a),scale[1]*sp(cos(lat),exp)*sin(a),scale[2]*sp(sin(lat),exp)))
    for j in range(rings):
        for i in range(seg):
            ni=(i+1)%seg
            faces.append((j*seg+i,j*seg+ni,(j+1)*seg+ni,(j+1)*seg+i))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); o.location=loc
    smooth(o,mat); model.append(o)
    return o

# The body and limbs are welded into one continuous mesh.
body=ellipsoid('Dormi body',(0,0,.685),(.445,.415,.56),white,64,40,.70)
parts=[body]
for s in [-1,1]:
    arm=ellipsoid(('Left' if s<0 else 'Right')+' arm',(s*.45,0,.49),(.122,.195,.231),white)
    arm.rotation_euler[1]=s*(-.43)
    parts.append(arm)
    parts.append(ellipsoid(('Left' if s<0 else 'Right')+' foot',(s*.211,-.025,.135),(.157,.285,.135),white,40,24,.73))
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
model=[body]
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
rem=body.modifiers.new('Softly fused clay silhouette','REMESH'); rem.mode='VOXEL'; rem.voxel_size=.0105; rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
sm=body.modifiers.new('Relax clay surface','SMOOTH');sm.factor=1.25;sm.iterations=7
bpy.ops.object.modifier_apply(modifier=sm.name)
dec=body.modifiers.new('Portable web mesh','DECIMATE');dec.ratio=.48
bpy.ops.object.modifier_apply(modifier=dec.name)
for p in body.data.polygons:p.use_smooth=True
body.data.materials.clear();body.data.materials.append(white)

# Surface-bound details preserve the familiar front view while wrapping around
# the genuinely plump torso. Sample the finished mesh, not an approximate oval.
def surface_tree(obj):
    bpy.context.view_layer.update()
    return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],
                               [tuple(p.vertices) for p in obj.data.polygons])
def front_y(tree,x,z):
    hit,normal,index,distance=tree.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
    if hit is None: raise RuntimeError(f'No supporting surface at {x}, {z}')
    return hit.y
body_surface=surface_tree(body)

def wrap_on_surface(obj,tree,embed):
    # Vertex X/Z do not change, so the front silhouette and expression stay intact.
    bpy.context.view_layer.update()
    for v in obj.data.vertices:
        world=obj.matrix_world@v.co
        world.y=front_y(tree,world.x,world.z)+embed+v.co.y
        v.co=obj.matrix_world.inverted()@world
    obj.data.update()

face=ellipsoid('Cream oval face',(0,0,.901),(.317,.048,.204),cream,64,36,.85)
wrap_on_surface(face,body_surface,.009)
face_surface=surface_tree(face)
for s in [-1,1]:
    eye=ellipsoid(('Left' if s<0 else 'Right')+' dark eye',(s*.138,0,.9),(.032,.014,.0445),dark,36,24)
    wrap_on_surface(eye,face_surface,.003)
    cheek=ellipsoid(('Left' if s<0 else 'Right')+' rosy cheek',(s*.225,0,.834),(.036,.010,.028),pink,36,20)
    wrap_on_surface(cheek,face_surface,.003)

# A rounded open smile with a gently curved top edge and pink tongue.
def plate(name,points,depth,mat,bevel=.005):
    verts=[(x,front_y(face_surface,x,z)+depth,z) for x,z in points]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[tuple(range(len(verts)))]);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    sol=o.modifiers.new('Actual sculpted depth','SOLIDIFY');sol.thickness=.008
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.modifier_apply(modifier=sol.name)
    bev=o.modifiers.new('Soft rim','BEVEL');bev.width=bevel;bev.segments=3
    bpy.ops.object.modifier_apply(modifier=bev.name)
    for f in o.data.polygons:f.use_smooth=True
    model.append(o);return o

# Outline sampled with Bezier curves to avoid hard smile corners.
def bez(p0,p1,p2,p3,n=14):
    out=[]
    for k in range(n):
        t=k/n; q=1-t
        out.append(tuple(q*q*q*p0[i]+3*q*q*t*p1[i]+3*q*t*t*p2[i]+t*t*t*p3[i] for i in (0,1)))
    return out
outline=bez((-.045,.867),(-.038,.877),(-.025,.859),(0,.863))
outline+=bez((0,.863),(.025,.859),(.038,.877),(.045,.867))
outline+=bez((.045,.867),(.050,.833),(.029,.793),(0,.791))
outline+=bez((0,.791),(-.029,.793),(-.05,.833),(-.045,.867))
plate('Happy open smile',outline,-.002,mouthmat,.004)
tongue_pts=bez((-.035,.82),(-.016,.838),(.016,.838),(.035,.82))
tongue_pts+=bez((.035,.82),(.025,.799),(.012,.795),(0,.795))
tongue_pts+=bez((0,.795),(-.012,.795),(-.025,.799),(-.035,.82))
plate('Little pink tongue',tongue_pts,-.011,tongue,.003)

# All decorative tubes are mesh geometry; no alpha planes or external images.
def tube(name,coords,radii,mat,sides=12):
    verts=[]; faces=[]
    for i,p in enumerate(coords):
        if i==0: tangent=Vector(coords[1])-Vector(p)
        elif i==len(coords)-1:tangent=Vector(p)-Vector(coords[i-1])
        else:tangent=Vector(coords[i+1])-Vector(coords[i-1])
        tangent.normalize(); across=Vector((0,1,0)); second=tangent.cross(across).normalized()
        for j in range(sides):
            a=2*pi*j/sides
            v=Vector(p)+radii[i]*(cos(a)*across+sin(a)*second)
            verts.append(tuple(v))
    for i in range(len(coords)-1):
        for j in range(sides):
            j2=(j+1)%sides;faces.append((i*sides+j,i*sides+j2,(i+1)*sides+j2,(i+1)*sides+j))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple((len(coords)-1)*sides+j for j in range(sides)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);smooth(o,mat);model.append(o)
    return o

coords=[];radii=[]
for i in range(180):
    t=i/179;a=math.radians(222-493*t);r=.208*(1-t)+.019*t
    coords.append((.039+r*cos(a),.014,1.383+r*sin(a)))
    radii.append(.046*(1-.28*t))
tube('Navy spiral antenna',coords,radii,navy,14)
ellipsoid('Antenna rounded tip',coords[-1],(radii[-1],)*3,navy,24,16)
coords=[];radii=[]
for i in range(200):
    t=i/199;a=math.radians(-90-500*t);r=.177*(1-t)+.008*t
    x=r*cos(a); z=.466+r*sin(a)
    # Slightly follow the curvature of the torso front.
    y=front_y(body_surface,x,z)-.009
    coords.append((x,y,z))
    taper=min(1,.07+t*14)
    radii.append(.038*taper*(1-.35*t))
tube('Navy belly spiral',coords,radii,navy,12)
ellipsoid('Belly spiral rounded tip',coords[-1],(radii[-1],)*3,navy,24,16)

# Make the sole precisely meet the ground without applying global conversion.
bpy.context.view_layer.update()
verts=[o.matrix_world@v.co for o in model for v in o.data.vertices]
min_z=min(v.z for v in verts)
for o in model:o.location.z-=min_z
bpy.context.view_layer.update()
root=bpy.data.objects.new('Dormi',None);bpy.context.collection.objects.link(root)
root['description']='Stylized three-dimensional interpretation of a two-dimensional Dormi reference.'
root['export_front']='+Z'; root['export_up']='+Y'
for o in model:o.parent=root
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for o in model:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'dormi.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')

# Presentation lights and floor are saved in the .blend, but excluded from GLB.
floormat=material('Studio | lavender mist','DBD9F1',.82)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.003))
floor=bpy.context.object;floor.name='STUDIO | floor';floor.data.materials.append(floormat)
world=bpy.context.scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.36,.38,.48,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.45

def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector((0,0,.8))-ob.location).to_track_quat('-Z','Y').to_euler()
area('STUDIO | large key',(-3,-4,5),450,4)
area('STUDIO | front fill',(3,-2,3),220,3)
area('STUDIO | soft rim',(1,3,4),500,3)
camdata=bpy.data.cameras.new('Dormi portrait');cam=bpy.data.objects.new('Dormi portrait',camdata);bpy.context.collection.objects.link(cam)
cam.location=(2.35,-6,2.3);cam.rotation_euler=(Vector((0,0,.83))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=2.1
sc=bpy.context.scene;sc.camera=cam;sc.render.engine='CYCLES';sc.cycles.samples=48
sc.cycles.use_denoising=False
sc.render.resolution_x=800;sc.render.resolution_y=900;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX'
sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.join(ROOT,'dormi-preview.png')
# Isolate model in a named collection for easy reuse.
collection=bpy.data.collections.new('DORMI MODEL | export ready');sc.collection.children.link(collection)
for ob in model+[root]:
    for c in list(ob.users_collection):c.objects.unlink(ob)
    collection.objects.link(ob)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'dormi.blend'))
verts=[o.matrix_world@v.co for o in model for v in o.data.vertices]
mins=[min(v[i] for v in verts) for i in range(3)]; maxs=[max(v[i] for v in verts) for i in range(3)]
stats={'mesh_objects':len(model),'vertices':sum(len(o.data.vertices) for o in model),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in model),'dimensions_gltf_xyz':[maxs[0]-mins[0],maxs[2]-mins[2],maxs[1]-mins[1]],'bounds_blender':{'min':mins,'max':maxs},'front_gltf':'+Z','up_gltf':'+Y','glb_bytes':os.path.getsize(os.path.join(ROOT,'dormi.glb')),'reference_note':'Stylized 3D approximation from a 2D reference; rear geometry is invented.'}
with open(os.path.join(ROOT,'model-info.json'),'w') as f:json.dump(stats,f,indent=2)
print('MODEL_STATS',json.dumps(stats))
bpy.ops.render.render(write_still=True)
cam.location=(0,-6,1.18);cam.rotation_euler=(Vector((0,0,.81))-cam.location).to_track_quat('-Z','Y').to_euler()
sc.render.filepath=os.path.join(ROOT,'dormi-front.png');bpy.ops.render.render(write_still=True)
print('DORMI_EXPORT_SUCCESS')
