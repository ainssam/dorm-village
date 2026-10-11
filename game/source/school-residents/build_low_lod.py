import bpy,os,json,bmesh
ROOT=os.path.dirname(os.path.abspath(__file__))
for id in ['nurse-otter','music-bird','art-chameleon']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=ROOT+'/'+id+'.glb')
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 for o in meshes:
  if len(o.data.polygons)>300:
   bpy.context.view_layer.objects.active=o;d=o.modifiers.new('distance LOD','DECIMATE');d.ratio=.30;bpy.ops.object.modifier_apply(modifier=d.name)
  for p in o.data.polygons:p.use_smooth=True
 bpy.context.view_layer.update();triangles=sum(sum(len(f.vertices)-2 for f in o.data.polygons)for o in meshes);body=next(o for o in meshes if o.get('role')=='Body');bm=bmesh.new();bm.from_mesh(body.data);seen=set();components=0
 for v in bm.verts:
  if v in seen:continue
  components+=1;stack=[v];seen.add(v)
  while stack:
   q=stack.pop()
   for e in q.link_edges:
    w=e.other_vert(q)
    if w not in seen:seen.add(w);stack.append(w)
 boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free();assert components==1 and boundary==0 and nonmanifold==0
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=ROOT+'/'+id+'-low.glb',export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 with open(ROOT+'/'+id+'-low.json','w')as f:json.dump({'id':id,'lod':'low','triangles':triangles,'bytes':os.path.getsize(ROOT+'/'+id+'-low.glb'),'body_components':components,'boundary_edges':boundary,'nonmanifold_edges':nonmanifold},f,indent=2)
 print(id,triangles,flush=True)
