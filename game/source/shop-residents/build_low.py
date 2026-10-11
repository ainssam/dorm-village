"""Rebuild approved residents with controlled procedural tessellation.
Run: blender --background --python build_low.py
Only this directory is written; the source GLBs/repo are read-only.
"""
import os, pathlib, hashlib, shutil
ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=ROOT/'source'/'build_shop_residents.py'
assert SOURCE.is_file()
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='a8bc3812a3cc7e695fd1ddc5974562f388a2438025cd8d1307fc5f9e8955d3ad', 'Unexpected approved source snapshot'
code=SOURCE.read_text()
# No design changes: lower ellipsoid grid density, preserving smaller details,
# and remove only exactly-collinear uniform-radius tube sections.
INJECTION='''
import bmesh
_high_ell=ell
_high_tube=tube
_LOW_SCALE={'cafe-dog':.60,'craft-beaver':.65,'post-penguin':.78,'photo-fox':.60}
def ell(name,at,scale,material,parent,role=None,seg=28,rings=18,exp=.88,pear=0):
 density=_LOW_SCALE[id]
 # Preserve minimum face definition and all tiny highlights/seeds/buttons.
 detail=any(k in name.lower() for k in ['eye','nose','mouth','tongue','beak','seal','lens','dial','shutter','muzzle'])
 if seg<=16:
  newseg,newrings=seg,rings
 elif detail:
  newseg=min(seg,max(20,round(seg*max(density,.80)/2)*2))
  newrings=min(rings,max(12,round(rings*max(density,.80))))
 else:
  newseg=min(seg,max(12,round(seg*density/2)*2))
  newrings=min(rings,max(8,round(rings*density)))
 obj=_high_ell(name,at,scale,material,parent,role,newseg,newrings,exp,pear)
 # The source parameterization repeats each zero-radius pole `seg` times.
 # Merge only coincident vertices (sub-nanometer tolerance in meter units).
 # This removes zero-area pole triangles without altering the surface.
 bm=bmesh.new();bm.from_mesh(obj.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-9)
 bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-10)
 bm.to_mesh(obj.data);bm.free();obj.data.update()
 return obj

def tube(name,points,r,material,parent,role=None,sides=8):
 if not isinstance(r,list) and len(points)>2:
  # Straight constant-radius runs are over-sampled in the approved source.
  # Endpoints and every bend are retained; there is no RDP approximation.
  keep=[points[0]]
  for i in range(1,len(points)-1):
   a=Vector(points[i])-Vector(keep[-1]);b=Vector(points[i+1])-Vector(points[i])
   if a.cross(b).length>1e-8 or a.dot(b)<0:keep.append(points[i])
  keep.append(points[-1]);points=keep
 return _high_tube(name,points,r,material,parent,role,sides)
'''
assert code.count('stats={}')==1
code=code.replace('stats={}',INJECTION+'\nstats={}')
# Matching fox leaf grid and material-row split preserve the dark ear tips.
assert code.count('rings=22;sides=24')==1
assert code.count('22*24*.75')==1
code=code.replace('rings=22;sides=24','rings=18;sides=20').replace('22*24*.75','18*20*.75')
(ROOT/'generated_low_source.py').write_text(code)
(ROOT/'source-sha256.txt').write_text(hashlib.sha256(SOURCE.read_bytes()).hexdigest()+'  '+str(SOURCE)+'\n')
exec(compile(code,str(ROOT/'generated_low_source.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'generated_low_source.py')})
