import bpy,os,pathlib
from mathutils import Vector

folder=os.environ.get('CASTLE_OUTPUT_DIR',str(pathlib.Path(__file__).resolve().parent.parent/'preview'))
render_size=int(os.environ.get('CASTLE_RENDER_SIZE','512'))
samples=int(os.environ.get('CASTLE_RENDER_SAMPLES','8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.environ.get('CASTLE_INPUT_GLB',folder+'/castle-exterior.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=samples
scene.cycles.use_denoising=False
scene.cycles.max_bounces=3
scene.cycles.diffuse_bounces=2
scene.cycles.glossy_bounces=2
scene.render.threads_mode='FIXED'
scene.render.threads=1
scene.render.resolution_x=render_size
scene.render.resolution_y=render_size
scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('Castle preview background')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.62,.68,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7

# The only geometry beyond the exported castle is a neutral studio ground plane.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
floor=bpy.context.object
floor.name='Preview neutral ground'
material=bpy.data.materials.new('Preview ground')
material.diffuse_color=(.40,.48,.53,1)
material.use_nodes=True
material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.40,.48,.53,1)
material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9
floor.data.materials.append(material)

target=Vector((0,0,4.35))
camera_data=bpy.data.cameras.new('Asset camera')
camera=bpy.data.objects.new('Asset camera',camera_data)
scene.collection.objects.link(camera)
camera.location=(14,-28,14)
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='ORTHO'
camera_data.ortho_scale=10.8
scene.camera=camera
for name,position,energy,size in [('Key',(-8,-12,19),1900,10),('Fill',(10,-7,11),850,9)]:
    light=bpy.data.lights.new(name,'AREA')
    light.energy=energy
    light.shape='DISK'
    light.size=size
    obj=bpy.data.objects.new(name,light)
    scene.collection.objects.link(obj)
    obj.location=position
    obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
sun=bpy.data.lights.new('Soft daylight','SUN')
sun.energy=1.25
sun.angle=.20
sun_obj=bpy.data.objects.new('Soft daylight',sun)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler=(.55,-.40,-.45)
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=folder+f'/castle-exterior-{render_size}.png'
print(f'PREVIEW_CONSTRAINTS: asset-only, {render_size}x{render_size}, CPU, {samples} samples, 1 thread, no denoising, no textures',flush=True)
bpy.ops.render.render(write_still=True)
