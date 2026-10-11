#!/usr/bin/env python3
"""Scratch-only v2 tail-junction patch. Every other accessor/node stays unchanged.
Run: python refine_tail.py INPUT.glb OUTPUT.glb [--width .080] [--embed .010]
The original approved v2 remains the authority. No global remesh or rig changes.
"""
import argparse, json, struct, hashlib, math
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation

class GLB:
 def __init__(self,path):
  self.raw=Path(path).read_bytes();self.jlen=struct.unpack_from('<I',self.raw,12)[0]
  self.g=json.loads(self.raw[20:20+self.jlen]);bl=struct.unpack_from('<I',self.raw,20+self.jlen)[0]
  self.bin=bytearray(self.raw[28+self.jlen:28+self.jlen+bl]);self.parents={c:i for i,n in enumerate(self.g['nodes']) for c in n.get('children',[])}
 def acc(self,index):
  a=self.g['accessors'][index];v=self.g['bufferViews'][a['bufferView']];d={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'<u1'}[a['componentType']]);o=v.get('byteOffset',0)+a.get('byteOffset',0)
  return np.ndarray((a['count'],d),dtype=dt,buffer=self.bin,offset=o,strides=(v.get('byteStride',dt.itemsize*d),dt.itemsize))
 def local(self,i):
  n=self.g['nodes'][i]
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
  m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 def world(self,i):
  return self.world(self.parents[i])@self.local(i) if i in self.parents else self.local(i)
 def write(self,path):
  j=json.dumps(self.g,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);b=bytes(self.bin);b+=b'\0'*((-len(b))%4)
  raw=struct.pack('<III',0x46546c67,2,28+len(j)+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b;Path(path).write_bytes(raw);return raw

def smoothstep(a,b,x):
 t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');ap.add_argument('--width',type=float,default=.080);ap.add_argument('--embed',type=float,default=.010);args=ap.parse_args()
 g=GLB(args.input);assert hashlib.sha256(g.raw).hexdigest()=='b6a31a067b5f137d3b5749cd03e6714906f87da4abc0560afde35eabb2ad5528','Input is not the exact selected v2 chinchilla';tn=next(i for i,n in enumerate(g.g['nodes']) if n.get('name')=='Tail.Mesh');bn=next(i for i,n in enumerate(g.g['nodes']) if n.get('name')=='Body.Mesh')
 tp=g.g['meshes'][g.g['nodes'][tn]['mesh']]['primitives'][0];bp=g.g['meshes'][g.g['nodes'][bn]['mesh']]['primitives'][0]
 pi,ni=tp['attributes']['POSITION'],tp['attributes']['NORMAL'];orig=g.acc(pi).copy();p=orig.astype(float);n=g.acc(ni).astype(float);idx=g.acc(tp['indices']).reshape(-1,3)
 tm=g.world(tn);bm=g.world(bn);w=p@tm[:3,:3].T+tm[:3,3];nw=n@tm[:3,:3].T
 bc=bm[:3,3];radii=np.max(np.abs(g.acc(bp['attributes']['POSITION'])),axis=0).astype(float)
 # Use a cylindrical root axis from the unchanged tail center toward the body
 # center. Body-radial projection folds the inward branch at this junction;
 # cylinder-radial rays preserve the exposed skin's outward orientation.
 tc=tm[:3,3];axis=(bc-tc)/np.linalg.norm(bc-tc);s=(w-tc)@axis;center=tc+s[:,None]*axis
 v=w-center;r=np.linalg.norm(v,axis=1);u=v/np.maximum(r,1e-12)[:,None];ex=.88
 def body_level(points):
  q=(points-bc)/radii
  return (q[:,0]**2+q[:,2]**2)**(1/ex)+np.abs(q[:,1])**(2/ex)-1
 inside=body_level(center)<0;lo=np.zeros(len(p));hi=np.ones(len(p))
 for _ in range(48):
  mid=(lo+hi)/2;isin=body_level(center+u*mid[:,None])<0;lo=np.where(isin,mid,lo);hi=np.where(isin,hi,mid)
 rb=(lo+hi)/2;delta=r-rb
 # C1 fillet into a buried body-conforming skirt. Its residual derivative
 # remains positive, so radial order is preserved. Entire outer contour and
 # tip stay fixed beyond the narrow intersection neighborhood.
 facing=np.sum(nw*u,axis=1)
 z=delta+args.embed;width=args.width
 smoothmax=np.where(z<=-width,0,np.where(z>=width,z,(z+width)**2/(4*width)))
 target=smoothmax-args.embed;dr=(target-delta)*.96*inside
 # Fade the hidden return to the original cap instead of forming a cavity.
 dr*=smoothstep(.015,.10,r)
 # Keep the deeper cap recessed rather than spreading it around the body.
 # This bound acts only under the body surface, outside the visible fillet.
 dr=np.minimum(dr,.080)
 # Actual 481-frame chair sweep found a small rear-side strip on the chair's
 # front plane. Restore that strip plus one topological ring exactly; feather
 # two more rings. These vertex IDs belong to the hash-locked approved mesh.
 chair_seeds=[165,166,203,204,205,206,243,244,245,284,442,443,444,482,483,484,524]
 hops=np.full(len(p),999,dtype=int);hops[chair_seeds]=0
 edges=np.unique(np.sort(np.concatenate([idx[:,[0,1]],idx[:,[1,2]],idx[:,[2,0]]]),axis=1),axis=0)
 for step in range(1,4):
  current=hops.copy()
  for a,b in edges:
   if current[a]==step-1:hops[b]=min(hops[b],step)
   if current[b]==step-1:hops[a]=min(hops[a],step)
 chair_weight=smoothstep(1,4,hops);dr*=chair_weight
 wp=w+u*dr[:,None];new=(wp-tm[:3,3])@tm[:3,:3];changed=np.linalg.norm(new-p,axis=1)>1e-8;new[~changed]=p[~changed]
 g.acc(pi)[:]=new.astype('<f4');new=g.acc(pi).astype(float)
 # Angle-weighted normals on the changed patch. Preserve approved normals at
 # every vertex whose incident triangles are all unchanged.
 tri=new[idx];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);fn/=np.maximum(1e-20,np.linalg.norm(fn,axis=1))[:,None]
 normals=np.zeros_like(new)
 for k in range(3):
  a=tri[:,(k+1)%3]-tri[:,k];b=tri[:,(k+2)%3]-tri[:,k];a/=np.linalg.norm(a,axis=1)[:,None];b/=np.linalg.norm(b,axis=1)[:,None];ang=np.arccos(np.clip(np.sum(a*b,axis=1),-1,1));np.add.at(normals,idx[:,k],fn*ang[:,None])
 normals/=np.linalg.norm(normals,axis=1)[:,None]
 affected=np.zeros(len(p),bool);affected[np.unique(idx[np.any(changed[idx],axis=1)])]=True;g.acc(ni)[affected]=normals[affected].astype('<f4')
 for key,func in [('min',np.min),('max',np.max)]:g.g['accessors'][pi][key]=[float(x) for x in func(g.acc(pi),axis=0)]
 raw=g.write(args.output);report={'source':args.input,'source_sha256':hashlib.sha256(g.raw).hexdigest(),'output':args.output,'output_sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'changed_positions':int(changed.sum()),'chair_seed_vertices':chair_seeds,'chair_guard_exact_vertices':int((chair_weight==0).sum()),'changed_normals':int(affected.sum()),'max_position_change_m':float(np.max(np.linalg.norm(new-p,axis=1))),'width':width,'embed':args.embed,'protected_cylinder_radial_distance_above':width-args.embed,'tail_node':tn,'position_accessor':pi,'normal_accessor':ni,'delta_range':[float(delta.min()),float(delta.max())],'facing_range':[float(facing.min()),float(facing.max())]}
 Path(args.output).with_suffix('.build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
