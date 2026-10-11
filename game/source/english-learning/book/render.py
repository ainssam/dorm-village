import bpy,json,os,sys
from mathutils import Vector
root=os.path.dirname(os.path.abspath(__file__))
cases=json.load(open(root+'/cases.json'))
selected=[int(x) for x in sys.argv[sys.argv.index('--')+1:]] if '--' in sys.argv else []
for c in cases:
 if selected and c['page'] not in selected: continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=root+f"/book-page-{c['page']}.glb")
 sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=192;sc.cycles.use_denoising=False
 sc.render.resolution_x=800;sc.render.resolution_y=600;sc.render.resolution_percentage=100
 sc.world=bpy.data.worlds.new('Warm classroom world');sc.world.use_nodes=True
 sc.world.node_tree.nodes['Background'].inputs[0].default_value=(0.84,0.87,0.86,1)
 sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 def xyz(p):return Vector((p[0],-p[2],p[1]))
 t=xyz(c['target']);data=bpy.data.cameras.new('Storybook orthographic camera');cam=bpy.data.objects.new('Camera',data);sc.collection.objects.link(cam)
 cam.location=xyz(c['eye']);cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=c['span'];sc.camera=cam
 for name,pos,power,size,color in [('soft-window',(-3,-4,7),530,4.5,(1.0,.91,.77)),('fill',(4,-1,5),210,5,(.86,.93,1.0))]:
  l=bpy.data.lights.new(name,'AREA');l.energy=power;l.size=size;l.color=color;o=bpy.data.objects.new(name,l);sc.collection.objects.link(o);o.location=t+Vector(pos);o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
 sc.view_settings.view_transform='Standard';sc.view_settings.look='Medium High Contrast';sc.view_settings.exposure=-.60;sc.view_settings.gamma=1
 sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGB';sc.render.image_settings.compression=100
 sc.render.filepath=root+f"/book-page-{c['page']}.png"
 bpy.ops.wm.save_as_mainfile(filepath=root+f"/book-page-{c['page']}.blend")
 bpy.ops.render.render(write_still=True)
