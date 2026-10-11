/** Approved library residents. Requires the app's existing Three.js version.
 * Copy this module and the three sibling .glb files together, or supply baseURL.
 * All GLBs: +Y up, +Z forward, floor origin, 1.42 units tall.
 */
import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const residentSpecies = Object.freeze(['chinchilla', 'armadillo', 'capybara']);
const cache = new Map();
const loader = new GLTFLoader();

export async function createResident(species, {
  baseURL = new URL('.', import.meta.url), scale = 1, showBook = species === 'capybara',
} = {}) {
  if (!residentSpecies.includes(species)) throw new Error(`Unknown resident: ${species}`);
  if (!(scale > 0)) throw new Error('Resident scale must be positive');
  const base = baseURL instanceof URL ? baseURL : new URL(baseURL, globalThis.location?.href || import.meta.url);
  const url = new URL(`${species}.glb`, base).href;
  if (!cache.has(url)) {
    const pending = loader.loadAsync(url).catch(error => { cache.delete(url); throw error; });
    cache.set(url, pending);
  }
  const gltf = await cache.get(url);
  const resident = new Group();
  resident.name = `LibraryResident.${species}`;
  resident.scale.setScalar(scale);
  const model = gltf.scene.clone(true);
  resident.add(model);
  const parts = Object.create(null);
  model.traverse(node => {
    if (node.userData.role) parts[node.userData.role] = node;
    if (node.isMesh) {
      // Instance-owned resources make scene exit/disposal independent of the asset cache.
      node.geometry = node.geometry.clone();
      node.material = Array.isArray(node.material)
        ? node.material.map(material => material.clone())
        : node.material.clone();
      node.castShadow = true; node.receiveShadow = true;
    }
  });
  if (parts.Book) parts.Book.visible = showBook;
  resident.userData.species = species;
  resident.userData.height = 1.42 * scale;
  resident.userData.forward = '+Z';
  resident.userData.parts = parts;
  resident.userData.restPose = Object.fromEntries(
    Object.entries(parts).map(([role, node]) => [role, {
      position: node.position.clone(), rotation: node.rotation.clone(),
    }]),
  );
  return resident;
}

/** Optional local-part pose helper. It never changes the group's world position/yaw.
 * Keep walk cycles subtle because these are short, soft, seated-style feet.
 */
export function poseResident(resident, {
  time = 0, walking = false, headYaw = 0, showBook,
} = {}) {
  const { parts = {}, restPose = {} } = resident.userData;
  const phase = time * 5.0;
  for (const [role, sign] of [['Foot.L', 1], ['Foot.R', -1]]) {
    const node = parts[role], rest = restPose[role];
    if (!node || !rest) continue;
    node.rotation.copy(rest.rotation);
    node.rotation.x += walking ? Math.sin(phase) * .12 * sign : 0;
    node.position.copy(rest.position);
    node.position.y += walking ? Math.max(0, Math.sin(phase) * sign) * .025 : 0;
  }
  if (parts.Head) {
    parts.Head.rotation.copy(restPose.Head.rotation);
    parts.Head.rotation.y += Math.max(-.28, Math.min(.28, headYaw));
  }
  if (parts.Book && showBook !== undefined) parts.Book.visible = Boolean(showBook);
}

/** Releases only this instance. Cached originals and other residents stay valid. */
export function disposeResident(resident) {
  resident.removeFromParent();
  const geometries = new Set(), materials = new Set();
  resident.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
