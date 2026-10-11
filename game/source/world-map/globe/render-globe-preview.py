"""Render the exported runtime triangles and original UVs; this is not a browser screenshot."""
import bpy, json, math, os, sys
from mathutils import Vector

root = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
data = json.load(open(os.path.join(root, 'runtime-meshes.json')))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = False
scene.render.resolution_x = 960
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Soft cream world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.74, .79, .76, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .55
texture = bpy.data.images.load(data['texture'])
for item in data['meshes']:
    mesh = bpy.data.meshes.new(item['name'])
    vertices = [(v[0], -v[2], v[1]) for v in item['vertices']]
    indices = item['indices']
    mesh.from_pydata(vertices, [], [indices[i:i+3] for i in range(0, len(indices), 3)])
    mesh.update()
    ob = bpy.data.objects.new(item['name'], mesh)
    scene.collection.objects.link(ob)
    layer = mesh.uv_layers.new(name='Exact Three sphere UV')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            layer.data[loop_index].uv = item['uv'][mesh.loops[loop_index].vertex_index]
    material = bpy.data.materials.new(item['name'])
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*item['material']['color'], 1)
    shader.inputs['Roughness'].default_value = item['material']['roughness']
    shader.inputs['Metallic'].default_value = item['material']['metalness']
    if item['material']['map']:
        image = material.node_tree.nodes.new('ShaderNodeTexImage')
        image.image = texture
        image.interpolation = 'Linear'
        material.node_tree.links.new(image.outputs['Color'], shader.inputs['Base Color'])
    mesh.materials.append(material)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, .027))
floor = bpy.context.object
floor.name = 'Preview floor'
material = bpy.data.materials.new('Cream floor')
material.diffuse_color = (.83, .78, .66, 1)
floor.data.materials.append(material)
for name, location, energy, size in [('Key', (-3,-4,6), 380, 4), ('Fill',(4,1,4),180,4)]:
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.shape, light.size = energy, 'DISK', size
    ob = bpy.data.objects.new(name, light)
    scene.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
camdata = bpy.data.cameras.new('Camera')
camera = bpy.data.objects.new('Camera', camdata)
scene.collection.objects.link(camera)
scene.camera = camera
camdata.type = 'ORTHO'
camdata.ortho_scale = 2.85
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
for name, eye in [('globe-front-asia', (3,-8,3.5)), ('globe-rear-americas',(-3,8,3.5)), ('globe-front-level',(0,-8,1.3))]:
    camera.location = eye
    camera.rotation_euler = (Vector((0,0,1.19))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = os.path.join(root, name+'.png')
    bpy.ops.render.render(write_still=True)
