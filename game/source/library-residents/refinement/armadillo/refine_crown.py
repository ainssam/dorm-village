#!/usr/bin/env python3
"""Selected-v2 armadillo upper-panel root easing; all other bytes protected."""
from pathlib import Path
import argparse, hashlib, json, numpy as np
from glb_io import GLB, smoothstep
SOURCE_SHA='cbe277494510075f039280b3bf0a7f2882914994e8b640b2314fb0c5dc103268'
def radial_support(center,directions,triangles):
 # Exact positive ray intersections with the exported triangulated underlay.
 a=triangles[:,0];e1=triangles[:,1]-a;e2=triangles[:,2]-a;s=center-a
 q=np.cross(s,e1);out=[]
 for d in directions:
  h=np.cross(np.broadcast_to(d,e2.shape),e2);det=np.sum(e1*h,axis=1);good=abs(det)>1e-13;inv=np.divide(1,det,out=np.zeros_like(det),where=good)
  u=np.sum(s*h,axis=1)*inv;v=np.sum(q*d,axis=1)*inv;t=np.sum(e2*q,axis=1)*inv
  valid=good&(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)&(t>0)
  assert valid.any(),'underlay ray missed';out.append(float(np.max(t[valid])))
 return np.array(out)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');ap.add_argument('--embed',type=float,default=.001);args=ap.parse_args()
 g=GLB(args.input);assert hashlib.sha256(g.raw).hexdigest()==SOURCE_SHA
 pn=next(i for i,n in enumerate(g.g['nodes']) if n.get('name')=='Shell.Panels');un=next(i for i,n in enumerate(g.g['nodes']) if n.get('name')=='Shell.Underlay')
 prim=g.g['meshes'][g.g['nodes'][pn]['mesh']]['primitives'][0];up=g.g['meshes'][g.g['nodes'][un]['mesh']]['primitives'][0];pi,ni=prim['attributes']['POSITION'],prim['attributes']['NORMAL'];p=g.acc(pi).astype(float);norm=g.acc(ni).astype(float);idx=g.acc(prim['indices']).reshape(-1,3);pm=g.world(pn);um=g.world(un);w=p@pm[:3,:3].T+pm[:3,3];c=um[:3,3]
 uw=g.acc(up['attributes']['POSITION']).astype(float)@um[:3,:3].T+c;ut=uw[g.acc(up['indices']).reshape(-1,3)]
 # The original mesh is fifteen 13x11 authored panels. Only the three crown
 # panels receive a buried perimeter and a two-grid-ring eased transition.
 assert len(p)==15*143
 ids=np.arange(3*143);v=ids%143//13;u=ids%13;edge_distance=np.minimum.reduce([u,12-u,v,10-v]);weight=1-smoothstep(0,2,edge_distance.astype(float))
 radial=w[ids]-c;radius=np.linalg.norm(radial,axis=1);direction=radial/radius[:,None];support=radial_support(c,direction,ut)
 # Always inward, eliminating any new external envelope or furniture intrusion.
 change=np.minimum(0,support-args.embed-radius)*weight;neww=w.copy();neww[ids]+=direction*change[:,None]
 new=(neww-pm[:3,3])@np.linalg.inv(pm[:3,:3]).T;changed=np.linalg.norm(new-p,axis=1)>1e-8;new[~changed]=p[~changed];g.acc(pi)[:]=new.astype('<f4');new=g.acc(pi).astype(float)
 # Recompute normals only within the changed patch and adjacent triangles.
 tri=new[idx];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);fn/=np.linalg.norm(fn,axis=1)[:,None];n=np.zeros_like(new)
 for k in range(3):
  a=tri[:,(k+1)%3]-tri[:,k];b=tri[:,(k+2)%3]-tri[:,k];a/=np.linalg.norm(a,axis=1)[:,None];b/=np.linalg.norm(b,axis=1)[:,None];ang=np.arccos(np.clip(np.sum(a*b,axis=1),-1,1));np.add.at(n,idx[:,k],fn*ang[:,None])
 n/=np.linalg.norm(n,axis=1)[:,None];affected=np.zeros(len(p),bool);affected[np.unique(idx[np.any(changed[idx],axis=1)])]=True;g.acc(ni)[affected]=n[affected].astype('<f4')
 for key,func in [('min',np.min),('max',np.max)]:g.g['accessors'][pi][key]=[float(x) for x in func(g.acc(pi),axis=0)]
 raw=g.write(args.output);report={'source_sha256':SOURCE_SHA,'candidate_sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'changed_positions':int(changed.sum()),'changed_normals':int(affected.sum()),'protected_positions':int((~changed).sum()),'position_accessor':pi,'normal_accessor':ni,'only_top_three_panels':True,'max_inward_displacement':float(np.max(-change)),'embedding':args.embed,'bounds_exact':np.array_equal(new.min(0),p.min(0)) and np.array_equal(new.max(0),p.max(0)),'boundary_old_gap_minmax':[(radius-support)[edge_distance==0].min().item(),(radius-support)[edge_distance==0].max().item()],'boundary_new_target_gap':-args.embed}
 Path(args.output).with_suffix('.build.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
