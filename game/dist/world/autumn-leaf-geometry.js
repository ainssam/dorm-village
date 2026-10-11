import * as THREE from 'three';
/** A generic tapered leaf: closed curled blade, raised midrib, and short solid stem.
 * 76 triangles, vertex-colored clay; no texture, species, animation or shared owner. */
export function createAutumnLeafGeometry(){
 const positions=[],colors=[],indices=[],rows=[],edge=[],color=new THREE.Color();
 const vertex=(x,y,z,hex)=>{const i=positions.length/3;positions.push(x,y,z);color.set(hex);colors.push(color.r,color.g,color.b);return i;};
 rows.push([vertex(0,.055,-.255,'#c69851')]);
 for(const [z,width,curl]of[[-.15,.115,.025],[.015,.16,.009],[.18,.10,.026]]){const row=[];for(const x of [-1,-.10,0,.10,1])row.push(vertex(x*width,curl+(Math.abs(x)===1?.024:Math.abs(x)===0?.024:.010),z+Math.abs(x)*.01,x===0?'#e6ba73':Math.abs(x)===1?'#bc7944':'#cf914e'));rows.push(row);}
 rows.push([vertex(.014,.092,.295,'#ce9855')]);
 // +Y-facing top fan, then two narrow strips beside the physically raised vein.
 for(let j=0;j<4;j++)indices.push(rows[0][0],rows[1][j+1],rows[1][j]);
 for(let i=1;i<3;i++)for(let j=0;j<4;j++){const a=rows[i][j],b=rows[i][j+1],c=rows[i+1][j],d=rows[i+1][j+1];indices.push(a,b,c,b,d,c);}
 for(let j=0;j<4;j++)indices.push(rows[3][j],rows[3][j+1],rows[4][0]);
 // Correct the grid winding to point outward; the blade's lower skin is separate.
 for(let i=0;i<indices.length;i+=3){const a=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=a;}
 const topCount=positions.length/3,topFaces=indices.slice();for(let i=0;i<topCount;i++)vertex(positions[i*3],positions[i*3+1]-.008,positions[i*3+2],'#a86d40');
 for(let i=0;i<topFaces.length;i+=3)indices.push(topFaces[i]+topCount,topFaces[i+2]+topCount,topFaces[i+1]+topCount);
 edge.push(rows[0][0],rows[1][0],rows[2][0],rows[3][0],rows[4][0],rows[3][4],rows[2][4],rows[1][4]);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+topCount,b,b,a+topCount,b+topCount);}
 const s=positions.length/3;for(const[x,y,z]of[[-.008,.041,-.31],[.008,.041,-.31],[.008,.052,-.245],[-.008,.052,-.245],[-.008,.049,-.31],[.008,.049,-.31],[.008,.060,-.245],[-.008,.060,-.245]])vertex(x,y,z,'#9b7247');
 for(const tri of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])indices.push(...tri.reverse().map(i=>i+s));
 const geometry=new THREE.BufferGeometry();try{geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.translate(0,-.011,0);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.autumnLeaf=true;return geometry;}catch(error){geometry.dispose();throw error;}
}
export function createAutumnLeafMaterial(){return new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.86});}
