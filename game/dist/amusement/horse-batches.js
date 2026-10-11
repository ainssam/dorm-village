import * as THREE from 'three';

/** Bake only the rigid, unnamed decorations inside one carousel horse.
 * The horse group still moves with the rotor. Each material keeps its original
 * triangles, normals, UVs and shadow flags; no per-frame batching or shadow cache.
 * All source geometries are private to this horse and are released after baking.
 */
export function batchHorseDecoration(horse) {
  const batches = new Map();
  for (const mesh of horse.children) {
    if (!mesh.isMesh || mesh.children.length || mesh.name || Array.isArray(mesh.material)) {
      throw new Error('Only unnamed rigid horse decorations may be batched');
    }
    let batch = batches.get(mesh.material);
    if (!batch) batches.set(mesh.material, batch = []);
    batch.push(mesh);
  }
  let batchIndex = 0;
  for (const [material, meshes] of batches) {
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const vertexCount = geometries.reduce((n, g) => n + g.attributes.position.count, 0);
    const indexCount = geometries.reduce((n, g) => n + (g.index?.count ?? g.attributes.position.count), 0);
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const size = geometries[0].attributes[name].itemSize;
      const values = new Float32Array(vertexCount * size);
      let offset = 0;
      for (const source of geometries) {
        values.set(source.attributes[name].array, offset);
        offset += source.attributes[name].array.length;
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(values, size));
    }
    const indices = new (vertexCount > 65535 ? Uint32Array : Uint16Array)(indexCount);
    let vertexOffset = 0, indexOffset = 0;
    for (const source of geometries) {
      const count = source.index?.count ?? source.attributes.position.count;
      for (let i = 0; i < count; i++) indices[indexOffset++] = vertexOffset + (source.index ? source.index.getX(i) : i);
      vertexOffset += source.attributes.position.count;
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${horse.name}.material.${batchIndex++}`;
    mesh.castShadow = mesh.receiveShadow = true;
    for (const source of meshes) {
      source.removeFromParent();
      source.geometry.dispose();
    }
    geometries.forEach(source => source.dispose());
    horse.add(mesh);
  }
  return horse;
}
