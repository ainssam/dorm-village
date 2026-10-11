"""Approved library residents: material-only, lightweight, procedural source.
Run: blender --background --python build_residents.py
Blender Z-up/-Y-front -> glTF Y-up/+Z-front. Origin = floor at character center.
"""
import bpy, math, json, os
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi, sqrt
OUT=os.path.dirname(os.path.abspath(__file__))
TARGET_HEIGHT=1.42
MODELS={}


def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def mat(name,h,rough=.47):
    m=bpy.data.materials.get(name)
    if m:return m
    rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*[linear(v) for v in rgb],1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Specular IOR Level'].default_value=.33
    m.diffuse_color=(*rgb,1)
    return m


def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o['role']=name
    if parent: parent_keep(o,parent)
    return o


def parent_keep(o,p):
    bpy.context.view_layer.update(); w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
    return o


def mesh_obj(name,verts,faces,m,parent=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    me.materials.append(m)
    for p in me.polygons:p.use_smooth=True
    if parent:parent_keep(o,parent)
    return o


def ell(name,loc,scale,m,parent=None,seg=24,rings=14,exp=1,rot=(0,0,0)):
    # Smooth silhouettes at mobile-friendly resolution; finer detail is not applied uniformly.
    if '.Mesh' in name or name in ['Muzzle','Belly','Tail.Mesh']:
        seg=max(seg,40);rings=max(rings,24)
    # Explicit poles: no degenerate UV-sphere cap triangles.
    def sp(v,e):return math.copysign(abs(v)**e,v)
    verts=[(0,0,-scale[2])]
    for j in range(1,rings):
        lat=-pi/2+pi*j/rings
        for i in range(seg):
            a=2*pi*i/seg
            verts.append((scale[0]*sp(cos(lat),exp)*cos(a),scale[1]*sp(cos(lat),exp)*sin(a),scale[2]*sp(sin(lat),exp)))
    verts.append((0,0,scale[2]));top=len(verts)-1;faces=[]
    for i in range(seg):faces.append((0,1+(i+1)%seg,1+i))
    for j in range(rings-2):
        a=1+j*seg;b=a+seg
        for i in range(seg):n=(i+1)%seg;faces.append((a+i,a+n,b+n,b+i))
    a=1+(rings-2)*seg
    for i in range(seg):faces.append((a+i,a+(i+1)%seg,top))
    o=mesh_obj(name,verts,faces,m);o.location=loc;o.rotation_euler=rot
    if parent:parent_keep(o,parent)
    return o


def cube(name,loc,scale,m,parent=None,bevel=.025,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(m)
    be=o.modifiers.new('Soft clay edges','BEVEL');be.width=bevel;be.segments=3
    bpy.ops.object.modifier_apply(modifier=be.name)
    for f in o.data.polygons:f.use_smooth=True
    we=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');we.keep_sharp=True;we.weight=50
    bpy.ops.object.modifier_apply(modifier=we.name)
    o.rotation_euler=rot
    if parent:parent_keep(o,parent)
    return o


def tube(name,points,r,m,parent=None,sides=6):
    vs=[];fs=[]
    for i,p in enumerate(points):
        tang=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tang.normalize();a=Vector((0,1,0));b=tang.cross(a).normalized();a=b.cross(tang).normalized()
        for j in range(sides):vs.append(tuple(Vector(p)+r*(cos(j*2*pi/sides)*a+sin(j*2*pi/sides)*b)))
    for i in range(len(points)-1):
        for j in range(sides):n=(j+1)%sides;fs.append((i*sides+j,i*sides+n,(i+1)*sides+n,(i+1)*sides+j))
    fs += [tuple(range(sides-1,-1,-1)), tuple((len(points)-1)*sides+j for j in range(sides))]
    return mesh_obj(name,vs,fs,m,parent)


def ear_bowl(name,loc,sx,sz,depth,outer,inner,parent,rot=(0,0,0),segments=40):
    vs=[];fs=[];mats=[]
    radial=12
    # Front is a recessed warm bowl surrounded by an integrated rounded gray rim.
    vs.append((0,-depth*.25,0))
    for j in range(1,radial+1):
        r=j/radial
        yy=-depth*(.25+.53*r*r+.20*math.exp(-((r-.84)/.13)**2))
        for i in range(segments):
            a=i*2*pi/segments;vs.append((sx*r*cos(a),yy,sz*r*sin(a)))
    for i in range(segments):fs.append((0,1+i,1+(i+1)%segments));mats.append(1)
    for j in range(radial-1):
        for i in range(segments):
            a=1+j*segments+i;n=1+j*segments+(i+1)%segments;b=a+segments;bn=n+segments
            fs.append((a,b,bn,n));mats.append(1 if j<8 else 0)
    front_end=1+(radial-1)*segments
    back_center=len(vs);vs.append((0,depth*.48,0))
    for j in range(1,radial+1):
        r=j/radial;yy=depth*(.48*sqrt(max(0,1-r*r))-.70*r**8)
        for i in range(segments):a=i*2*pi/segments;vs.append((sx*r*cos(a),yy,sz*r*sin(a)))
    for i in range(segments):fs.append((back_center,back_center+1+(i+1)%segments,back_center+1+i));mats.append(0)
    for j in range(radial-1):
        for i in range(segments):
            a=back_center+1+j*segments+i;n=back_center+1+j*segments+(i+1)%segments;b=a+segments;bn=n+segments
            fs.append((a,n,bn,b));mats.append(0)
    back_end=back_center+1+(radial-1)*segments
    for i in range(segments):n=(i+1)%segments;fs.append((front_end+i,front_end+n,back_end+n,back_end+i));mats.append(0)
    o=mesh_obj(name,vs,fs,outer);o.data.materials.append(inner)
    for f,mi in zip(o.data.polygons,mats):f.material_index=mi
    o.location=loc;o.rotation_euler=rot;o['role']=name;parent_keep(o,parent)
    return o


def tree(obj):
    bpy.context.view_layer.update()
    return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])


def front_y(t,x,z):
    hit,_,_,_=t.ray_cast(Vector((x,-3,z)),Vector((0,1,0)),6)
    if hit is None:raise ValueError(f'No front support {x,z}')
    return hit.y


def detail(name,x,z,sx,sz,depth,m,support,parent,seg=18,rings=10,offset=.002):
    o=ell(name,(x,0,z),(sx,depth,sz),m,seg=seg,rings=rings)
    bpy.context.view_layer.update()
    for v in o.data.vertices:
        w=o.matrix_world@v.co;w.y=front_y(support,w.x,w.z)-offset+v.co.y
        v.co=o.matrix_world.inverted()@w
    o.data.update();parent_keep(o,parent);return o


def face_patch(name,outline,m,support,parent,bulge=.01):
    # Convex or gently scalloped, surface-conforming paint/clay mask with rolled border.
    center=(sum(x for x,z in outline)/len(outline),sum(z for x,z in outline)/len(outline))
    vs=[(center[0],front_y(support,*center)-bulge,center[1])]
    n=len(outline)
    steps=12 if len(outline)>40 else 4
    levels=[(i/steps,max(.006,bulge*(1-.25*(i/steps)**6))) for i in range(1,steps+1)]
    for fac,d in levels:
        for x,z in outline:
            px=center[0]+fac*(x-center[0]);pz=center[1]+fac*(z-center[1])
            vs.append((px,front_y(support,px,pz)-d,pz))
    fs=[]
    for i in range(n):fs.append((0,1+i,1+(i+1)%n))
    for j in range(len(levels)-1):
        a=1+j*n;b=a+n
        for i in range(n):nn=(i+1)%n;fs.append((a+i,b+i,b+nn,a+nn))
    # Surface faces need outward -Y. Check normals after mesh build.
    o=mesh_obj(name,vs,fs,m,parent)
    for p in o.data.polygons:
        if p.normal.y>0:p.flip()
    return o


def oval_outline(x,z,sx,sz,n=48):return [(x+sx*cos(a*2*pi/n),z+sz*sin(a*2*pi/n)) for a in range(n)]


def open_smile(name,x,z,sx,sz,support,parent):
    mouth=mat('Mouth | cocoa berry','713D39');pink=mat('Tongue | strawberry','EF929B')
    # U-shaped open smile with gently dipping upper lip.
    pts=[]
    for i in range(13):
        t=i/12;pts.append((x+sx*(1-2*t),z+sz*(.45-.22*sin(pi*t))))
    for i in range(1,24):
        a=pi+pi*i/24;pts.append((x+sx*cos(a),z+sz*.45+sz*sin(a)))
    face_patch(name+'.Open',pts,mouth,support,parent,.012)
    detail(name+'.Tongue',x,z-sz*.26,sx*.58,sz*.29,.003,pink,support,parent,16,8,offset=.014)


def smile_curve(name,x,z,sx,sz,support,parent,m=None):
    m=m or mat('Mouth | cocoa berry','713D39')
    pts=[]
    for i in range(15):
        a=pi+pi*i/14;xx=x+sx*cos(a);zz=z+sz*sin(a);pts.append((xx,front_y(support,xx,zz)-.008,zz))
    tube(name,pts,.006,m,parent,6)


def book(name,loc,color,root,opened=True):
    b=empty('Book',loc,root);b['optional']=True;b['hide_hint']='Set Book.visible=false to hide entire prop'
    cover=mat(name+' | book cover',color);pages=mat('Books | ivory pages','FFF0D5');line=mat('Books | page edges','DFCAAC')
    x,y,z=loc
    if not opened:
        cube('Book.CoverBack',(x,y+.035,z),(.40,.035,.49),cover,b,.018,rot=(0,.14,0))
        cube('Book.Pages',(x,y-.002,z+.006),(.365,.05,.44),pages,b,.015,rot=(0,.14,0))
        cube('Book.CoverFront',(x,y-.038,z),(.40,.036,.49),cover,b,.018,rot=(0,.14,0))
        cube('Book.Spine',(x-.19,y,z),(.038,.095,.49),cover,b,.016,rot=(0,.14,0))
    else:
        # Gently opened V; outer edges closer to face, hinge facing the viewer.
        for s in [-1,1]:
            angle=s*.23
            cube('Book.Cover.'+('L' if s<0 else 'R'),(x+s*.128,y+.024,z),(.276,.043,.36),cover,b,.018,rot=(0,0,angle))
            cube('Book.Pages.'+('L' if s<0 else 'R'),(x+s*.128,y+.036,z+.018),(.248,.061,.335),pages,b,.012,rot=(0,0,angle))
            # Covers placed forward obscure most pages; ivory crown above them is readable.
        cube('Book.Spine',(x,y-.014,z-.002),(.046,.056,.355),cover,b,.015)
        for side in [-1,1]:
            for dz in [.171,.177]:
                tube('Book.PageEdge',[(x+side*.021,y+.003,z+dz),(x+side*.125,y+.019,z+dz+.004),(x+side*.245,y+.051,z+dz+.006)],.0018,line,b,6)
    return b


def resident_base(name):
    root=empty(name);root['asset']=name;root['front']='+Z glTF';root['up']='+Y glTF';root['ground_origin']=True
    body=empty('Body',(0,0,.47),root);head=empty('Head',(0,0,.83),root)
    groups={'root':root,'body':body,'head':head}
    for side,s in [('L',-1),('R',1)]:
        groups['arm'+side]=empty('Arm.'+side,(s*.32,-.1,.60),root)
        groups['foot'+side]=empty('Foot.'+side,(s*.23,-.05,.16),root)
    return groups


def eye_pair(t,parent,x,z,cheek_support=None):
    dark=mat('Eyes | glossy charcoal','24252D',.24);blush=mat('Cheeks | peach rose','F5ABA7')
    for s,side in [(-1,'L'),(1,'R')]:
        eye=detail('Eye.'+side,s*x,z,.037,.052,.021,dark,t,parent,28,18,offset=.025);eye['role']='Eye.'+side
        et=tree(eye)
        glint=detail('EyeGlint.'+side,s*x-.010,z+.017,.008,.011,.002,mat('Eyes | soft glint','FCF6E9',.30),et,parent,12,8,offset=.002)
        parent_keep(glint,eye)
        detail('Cheek.'+side,s*(x+.101),z-.079,.046,.033,.004,blush,cheek_support or t,parent,18,10,offset=.004)


def chinchilla():
    g=resident_base('Chinchilla');root=g['root'];body=g['body'];head=g['head']
    gray=mat('Chinchilla | soft warm gray','BEBBB9');cream=mat('Residents | vanilla cream','F7EBD6');earpink=mat('Chinchilla | inner ears','EAB4A9');nosemat=mat('Chinchilla | tiny nose','ECA59D')
    ell('Body.Mesh',(0,.025,.40),(.405,.31,.38),gray,body,28,16,.88)
    ell('Belly',(0,-.24,.35),(.305,.079,.255),cream,body,24,14)
    h=ell('Head.Mesh',(0,-.045,.88),(.445,.32,.355),gray,head,32,18,.89)
    t=tree(h)
    # Very large upright oval ears; tilted out as in the approved clay concept.
    for s,side in [(-1,'L'),(1,'R')]:
        rot=(0,s*-.28,0)
        ear_bowl('Ear.'+side,(s*.36,.0,1.285),.214,.279,.105,gray,earpink,head,rot=rot)
        ell('Foot.'+side+'.Mesh',(s*.233,-.03,.066),(.141,.215,.066),cream,g['foot'+side],20,10,.88)
        ell('Arm.'+side+'.Mesh',(s*.331,-.25,.45),(.123,.12,.171),gray,g['arm'+side],24,12,rot=(0,s*.36,0))
        ell('Paw.'+side,(s*.236,-.365,.446),(.086,.072,.10),cream,g['arm'+side],18,10)
    # Broad cream muzzle cheek pad, wrapped onto real head geometry.
    out=[]
    for i in range(64):
        a=i*2*pi/64;x=.389*cos(a);z=.795+.177*sin(a)
        if sin(a)>0:z+=.040*math.exp(-((abs(x)-.21)/.115)**2)-.057*math.exp(-(x/.105)**2)
        out.append((x,z))
    face=face_patch('Face.Cream',out,cream,t,head,.016);ft=tree(face)
    eye_pair(t,head,.159,.943,ft)
    detail('Nose',0,.913,.03,.019,.014,nosemat,t,head,18,10,offset=.02)
    open_smile('Smile',0,.828,.052,.050,ft,head)
    tail=empty('Tail',(0,.23,.29),root)
    ell('Tail.Mesh',(-.38,.195,.37),(.217,.195,.321),gray,tail,40,24,rot=(0,-.40,0))
    for s,side in [(-1,'L'),(1,'R')]:
        for dx in [-.039,.027]:
            tube('ToeCrease.'+side,[(s*.233+dx,-.231,.065),(s*.233+dx,-.234,.083),(s*.233+dx,-.229,.099)],.0021,mat('Chinchilla | toe crease','D1C5B3'),g['foot'+side],6)
    book('Chinchilla',(0,-.371,.438),'587E94',root,False)
    return g


def armor_panel(name,phi0,phi1,theta0,theta1,matl,parent):
    # Raised rounded rectangular tiles on the back dome, separated by narrow seams.
    cx,cy,cz=0,.09,.69;rx,ry,rz=.515,.395,.65
    nu,nv=12,10;verts=[];faces=[]
    for j in range(nv+1):
        v=j/nv
        for i in range(nu+1):
            u=i/nu
            uu=.5+(u-.5)*(1-.055*abs(2*v-1)**10)
            vv=.5+(v-.5)*(1-.055*abs(2*u-1)**10)
            th=theta0+(theta1-theta0)*uu;ph=phi0+(phi1-phi0)*vv
            bump=.073*max(0,sin(pi*u)*sin(pi*v))**.72
            r=.991+bump
            verts.append((cx+rx*sin(ph)*cos(th)*r,cy+ry*sin(ph)*sin(th)*r,cz+rz*cos(ph)*r))
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i;faces.append((a,a+nu+1,a+nu+2,a+1))
    o=mesh_obj(name,verts,faces,matl,parent)
    # Smooth surface with thin clay rolled perimeter.
    return o


def armadillo():
    g=resident_base('Armadillo');root=g['root'];body=g['body'];head=g['head']
    apr=mat('Armadillo | apricot clay','E8B07A');cream=mat('Residents | vanilla cream','F7EBD6');shell=mat('Armadillo | shell caramel','DBA373');seam=mat('Armadillo | warm shell seams','D0A071');pink=mat('Armadillo | inner ear rose','E7A69B');nose=mat('Armadillo | cocoa nose','AD7954')
    ell('Body.Mesh',(0,-.075,.40),(.41,.32,.37),apr,body,24,14,.89)
    ell('Belly',(0,-.314,.36),(.294,.058,.257),cream,body,24,14)
    shellgroup=empty('Shell',(0,.11,.60),root)
    ell('Shell.Underlay',(0,.092,.68),(.515,.395,.65),seam,shellgroup,48,28,1)
    # Broad center panels and narrow edge bands emphasize armored back from every side.
    for j in range(5):
        ph0=.008+j*(pi-.016)/5+.003;ph1=.008+(j+1)*(pi-.016)/5-.003
        for k in range(3):
            th0=-.25+k*(pi+.5)/3+.003;th1=-.25+(k+1)*(pi+.5)/3-.003
            armor_panel('Shell.Band.%02d.Tile.%02d'%(j+1,k+1),ph0,ph1,th0,th1,shell,shellgroup)
    panels=[o for o in shellgroup.children if o.type=='MESH' and o.name.startswith('Shell.Band.')]
    bpy.ops.object.select_all(action='DESELECT')
    for panel in panels:panel.select_set(True)
    bpy.context.view_layer.objects.active=panels[0];bpy.ops.object.join();panels[0].name='Shell.Panels'
    h=ell('Head.Mesh',(0,-.20,.89),(.398,.302,.348),apr,head,28,16,.9);t=tree(h)
    # Gentle two-lobed cream face with a dip under the brow.
    outline=[]
    for i in range(48):
        a=i*2*pi/48;x=.366*cos(a);z=.841+.19*sin(a)
        if sin(a)>0:z-=.055*max(0,1-abs(x)/.20)
        outline.append((x,z))
    face=face_patch('Face.Cream',outline,cream,t,head,.014);ft=tree(face)
    for s,side in [(-1,'L'),(1,'R')]:
        ear_bowl('Ear.'+side,(s*.28,-.175,1.198),.103,.143,.077,apr,pink,head,rot=(0,s*-.33,0),segments=32)
        ell('Foot.'+side+'.Mesh',(s*.248,-.183,.109),(.128,.176,.11),apr,g['foot'+side],20,12,.9)
        ell('Arm.'+side+'.Mesh',(s*.323,-.277,.49),(.115,.12,.142),apr,g['arm'+side],22,12,rot=(0,s*.36,0))
        ell('Paw.'+side,(s*.262,-.43,.479),(.074,.065,.082),apr,g['arm'+side],18,10)
    eye_pair(t,head,.155,.943,ft)
    detail('Nose',0,.867,.057,.038,.031,nose,t,head,20,12,offset=.02)
    smile_curve('Smile',0,.812,.035,.02,ft,head)
    book('Armadillo',(0,-.453,.459),'81956A',root,True)
    return g


def capybara():
    g=resident_base('Capybara');root=g['root'];body=g['body'];head=g['head']
    tan=mat('Capybara | warm honey','D6A16E');brown=mat('Capybara | cocoa muzzle','B77E57');ear=mat('Capybara | inner ears','C58B62');nose=mat('Capybara | nostril brown','895939')
    ell('Body.Mesh',(0,.02,.45),(.43,.34,.433),tan,body,28,18,.79)
    h=ell('Head.Mesh',(0,-.062,.986),(.458,.342,.347),tan,head,32,18,.74);t=tree(h)
    for s,side in [(-1,'L'),(1,'R')]:
        ear_bowl('Ear.'+side,(s*.327,.002,1.269),.076,.091,.065,brown,ear,head,rot=(0,s*-.20,0),segments=32)
        ell('Foot.'+side+'.Mesh',(s*.266,-.173,.094),(.13,.164,.094),brown,g['foot'+side],20,12,.83)
        ell('Arm.'+side+'.Mesh',(s*.344,-.224,.47),(.123,.118,.18),tan,g['arm'+side],24,14,rot=(0,s*.33,0))
        ell('Paw.'+side,(s*.276,-.382,.443),(.089,.072,.10),brown,g['arm'+side],18,10)
    # Wide blunt capybara muzzle, with nostrils near its crown.
    mu=ell('Muzzle',(0,-.363,.957),(.285,.188,.215),brown,head,28,16,.70);mt=tree(mu)
    for s,side in [(-1,'L'),(1,'R')]:
        eye=detail('Eye.'+side,s*.341,1.069,.035,.05,.021,mat('Eyes | glossy charcoal','24252D',.24),t,head,28,18,offset=.012);eye['role']='Eye.'+side
        et=tree(eye);glint=detail('EyeGlint.'+side,s*.341-.008,1.084,.006,.009,.0015,mat('Eyes | soft glint','FCF6E9',.30),et,head,12,8,offset=.002);parent_keep(glint,eye)
        detail('Cheek.'+side,s*.372,.977,.034,.028,.003,mat('Cheeks | peach rose','F5ABA7'),t,head,18,10)
        detail('Nostril.'+side,s*.104,1.056,.018,.014,.004,nose,mt,head,16,8)
    smile_curve('Smile',0,.864,.067,.036,mt,head,mat('Capybara | smile cocoa','75482F'))
    book('Capybara',(0,-.415,.454),'BC7558',root,True)
    return g


def meshes(root):return [o for o in root.children_recursive if o.type=='MESH']

def bounds(root):
    bpy.context.view_layer.update();vs=[o.matrix_world@v.co for o in meshes(root) for v in o.data.vertices]
    return [min(v[i] for v in vs) for i in range(3)],[max(v[i] for v in vs) for i in range(3)]


def normalize(root,height):
    lo,hi=bounds(root);s=height/(hi[2]-lo[2])
    # Scale coordinates, pivots and object translations uniformly while leaving root scale 1.
    for o in root.children_recursive:
        o.location*=s
        if o.type=='MESH':
            for v in o.data.vertices:v.co*=s
    root.location.z=-lo[2]*s;bpy.context.view_layer.update()
    # Ground offset belongs in the child translations; preserve root exactly (0,0,0).
    for child in root.children:child.location.z+=root.location.z
    root.location=(0,0,0);bpy.context.view_layer.update()


def setup_render():
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=80;sc.cycles.use_denoising=False
    sc.render.resolution_x=960;sc.render.resolution_y=960;sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False
    sc.world.color=(.4,.4,.4);sc.world.use_nodes=True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.74,.69,.60,1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    sc.view_settings.view_transform='AgX'
    floor=mat('Studio | ivory background','F4EDE1',.8)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.007));ground=bpy.context.object;ground.name='STUDIO.Floor';ground.data.materials.append(floor)
    for name,loc,power,size in [('STUDIO.Key',(-3,-4,6),650,4),('STUDIO.Fill',(3,-2,4),360,4),('STUDIO.Rim',(1,3,5),450,3)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(2.9,-5,2.5));cam=bpy.context.object;cam.name='STUDIO.Camera';cam.data.type='ORTHO';cam.data.ortho_scale=1.95;sc.camera=cam
    return sc,cam


def point(cam,loc,target):cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()


bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for maker in [chinchilla,armadillo,capybara]:
    g=maker();r=g['root'];normalize(r,TARGET_HEIGHT);MODELS[r.name]=g
# Export only one complete model at a time, no cameras/lighting/background.
manifest={'coordinate_system':{'up':'+Y','forward':'+Z','unit':'meter','origin':'floor at body center'},'reference_dormi_height':1.5831666,'residents':{}}
for name,g in MODELS.items():
    r=g['root'];bpy.ops.object.select_all(action='DESELECT');r.select_set(True)
    for o in r.children_recursive:o.select_set(True)
    bpy.context.view_layer.objects.active=r
    path=os.path.join(OUT,name.lower()+'.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
    lo,hi=bounds(r);ms=meshes(r)
    manifest['residents'][name.lower()]={'file':os.path.basename(path),'bytes':os.path.getsize(path),'mesh_objects':len(ms),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms),'vertices':sum(len(o.data.vertices) for o in ms),'dimensions_gltf_xyz':[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]],'bounds_gltf':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'root':name,'height_vs_dormi':TARGET_HEIGHT/1.5831666,'nodes':['Body','Head','Arm.L','Arm.R','Foot.L','Foot.R','Book']+(['Tail'] if name=='Chinchilla' else ['Shell'] if name=='Armadillo' else []),'procedural_motion':'Translate/yaw root; yaw Head; small opposite X rotations of Foot.L/R and Arm.L/R. No skinning required.'}
sc,cam=setup_render()
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'library-residents-v2.blend'))
for name,g in MODELS.items():
    for other,og in MODELS.items():
        for o in [og['root']]+list(og['root'].children_recursive):o.hide_render=other!=name
    cam.data.ortho_scale=1.84
    point(cam,(2.8,-5.2,2.6),(0,0,.70));sc.render.filepath=os.path.join(OUT,name.lower()+'-threequarter.png');bpy.ops.render.render(write_still=True)
    point(cam,(0,-6,1.13),(0,0,.71));sc.render.filepath=os.path.join(OUT,name.lower()+'-front.png');bpy.ops.render.render(write_still=True)
# Clean source file opens as a pleasing lineup; individual GLBs remain origin-centered.
for i,(name,g) in enumerate(MODELS.items()):
    g['root'].location.x=(i-1)*1.65
    for o in [g['root']]+list(g['root'].children_recursive):o.hide_render=False
sc.render.resolution_x=1800;sc.render.resolution_y=850;cam.data.ortho_scale=5.5
point(cam,(0,-7,2.2),(0,0,.73));sc.render.filepath=os.path.join(OUT,'residents-lineup.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'library-residents-v2.blend'))
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
print('RESIDENTS_SUCCESS',json.dumps(manifest))
