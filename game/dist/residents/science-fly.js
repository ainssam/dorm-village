/** Approved science-room fly. Keep this module next to science-fly.glb.
 * Contract matches library residents: +Y up, +Z front, floor origin, meter units.
 * Outer group position/yaw are owned by the caller; every returned asset owns its resources.
 */
import { Group, DoubleSide } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const cache = new Map();
const loader = new GLTFLoader();
export const scienceFlyHeight = 1.4;

export async function createScienceFly({
  baseURL = new URL('.', import.meta.url), scale = 1, showMagnifier = true,
} = {}) {
  if (!Number.isFinite(scale) || !(scale > 0)) throw new Error('Science fly scale must be positive finite');
  const base = baseURL instanceof URL ? baseURL : new URL(baseURL, globalThis.location?.href || import.meta.url);
  const url = new URL('science-fly.glb', base).href;
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch(error => { cache.delete(url); throw error; }));
  const gltf = await cache.get(url);
  const fly = new Group(); fly.name = 'ScienceResident.fruitFly'; fly.scale.setScalar(scale);
  const model = gltf.scene.clone(true); fly.add(model);
  const parts = Object.create(null);
  model.traverse(node => {
    if (node.userData.role) parts[node.userData.role] = node;
    if (!node.isMesh) return;
    node.geometry = node.geometry.clone();
    const configure = source => {
      const material = source.clone();
      if (material.transparent || material.opacity < 1) {
        // glTF has no depthWrite field. Single-surface leaf wings must not mask one another.
        material.transparent = true; material.depthWrite = false; material.depthTest = true;
        material.side = DoubleSide; material.forceSinglePass = true;
      }
      return material;
    };
    node.material = Array.isArray(node.material) ? node.material.map(configure) : configure(node.material);
    const transparent = (Array.isArray(node.material) ? node.material : [node.material]).some(m => m.transparent);
    node.castShadow = !transparent; node.receiveShadow = !transparent;
    // Opaque body writes its depth first, so rear membranes remain correctly occluded.
    // Membranes, veins, lens and lens glint are drawn in that order within the blend pass.
    if (transparent) node.renderOrder = node.name.includes('Membrane') ? 1 : node.name.includes('Lens') ? 3 : node.name.includes('Glint') ? 4 : 2;
  });
  if (parts.Magnifier) parts.Magnifier.visible = Boolean(showMagnifier);
  fly.userData.species = 'fruitFly'; fly.userData.role = 'scienceRoomResident';
  fly.userData.height = scienceFlyHeight * scale; fly.userData.forward = '+Z'; fly.userData.parts = parts;
  fly.userData.restPose = Object.fromEntries(Object.entries(parts).map(([role, node]) => [role, {
    position: node.position.clone(), rotation: node.rotation.clone(),
  }]));
  return fly;
}

/** Gentle six-limb steps or a small floating idle. Time is elapsed seconds.
 * The helper restores each affected pivot before posing, so switching motion never accumulates.
 * floating lifts the Motion child 8 cm; use walking for grounded navigation.
 */
export function poseScienceFly(fly, {
  time = 0, walking = false, floating = false, headYaw = 0, showMagnifier, walkBlend=1,
} = {}) {
  const { parts = {}, restPose = {} } = fly.userData;
  const restore = role => {
    const node = parts[role], rest = restPose[role];
    if (node && rest) { node.position.copy(rest.position); node.rotation.copy(rest.rotation); }
    return node;
  };
  const phase = time * 5.2;
  const gait = walking && !floating, blend=Math.max(0,Math.min(1,Number.isFinite(walkBlend)?walkBlend:1));
  for (const [role, sign] of [['Leg.Front.L', 1], ['Leg.Back.R', 1], ['Leg.Front.R', -1], ['Leg.Back.L', -1]]) {
    const node = restore(role); if (!node) continue;
    if (gait) {
      node.rotation.x += Math.sin(phase) * .14 * sign * blend;
      node.position.y += Math.max(0, Math.sin(phase) * sign) * .012 * blend;
    } else if (floating) node.rotation.x += .08;
  }
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    const arm = restore(`Arm.${side}`);
    if (arm && gait) arm.rotation.x += Math.sin(phase) * .035 * sign * blend;
    const wing = restore(`Wing.${side}`);
    if (wing) {
      wing.rotation.z += sign * Math.sin(time * (floating ? 17 : 2.4)) * (floating ? .20 : .022);
      if (floating) wing.rotation.y += sign * .10;
    }
  }
  const head = restore('Head');
  if (head) head.rotation.y += Math.max(-.22, Math.min(.22, headYaw));
  const motion = restore('Motion');
  if (motion) {
    if (floating) motion.position.y += .08 + Math.sin(time * 2.6) * .020;
    else if (gait) motion.position.y += Math.abs(Math.sin(phase)) * .008 * blend;
  }
  if (parts.Magnifier && showMagnifier !== undefined) parts.Magnifier.visible = Boolean(showMagnifier);
}

export function disposeScienceFly(fly) {
  fly.removeFromParent();
  const geometries = new Set(), materials = new Set();
  fly.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
