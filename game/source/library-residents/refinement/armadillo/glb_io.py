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

