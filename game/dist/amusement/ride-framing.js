import {MathUtils, OrthographicCamera, Vector3} from 'three';
import {CAROUSEL} from './layout.js';

const carouselAngle = new Vector3(-.36, .40, 1).normalize();
const coasterAngle = new Vector3(.40, .58, 1).normalize();
const bounds = ['left', 'right', 'top', 'bottom'];

function measureHud(stage) {
 const box = stage.getBoundingClientRect();
 const {width, height} = box;
 const area = {width, height, left:12, right:12, top:16, bottom:20};
 const rect = selector => {
  const element = stage.querySelector(selector);
  return element && !element.hidden && element.getClientRects().length ? element.getBoundingClientRect() : null;
 };
 for (const selector of ['.scene-tools', '.mission-pill']) {
  const item = rect(selector);
  if (item) area.top = Math.max(area.top, Math.min(height * .29, item.bottom - box.top + 10));
 }
 for (const selector of ['.coaster-controls', '.action-area', '#activity-guide']) {
  const item = rect(selector);
  if (!item || item.top - box.top < height * .48) continue;
  if (height < 520 && width > height && item.left - box.left > width * .55) {
   area.right = Math.max(area.right, Math.min(width * .36, box.right - item.left + 12));
  } else {
   area.bottom = Math.max(area.bottom, Math.min(height * .34, box.bottom - item.top + 12));
  }
 }
 const help = rect('#activity-note');
 if (help && width > height && help.top - box.top > height * .14 && help.bottom - box.top > height * .26) {
  if (help.right - box.left < width * .45) area.left = Math.max(area.left, Math.min(width * .33, help.right - box.left + 12));
  else if (help.left - box.left > width * .55) area.right = Math.max(area.right, Math.min(width * .33, box.right - help.left + 12));
 }
 return area;
}

// A second render camera keeps the walking pose and manual camera controls
// available. Neither ride steers the camera around using the actor's yaw.
export function createRideFraming() {
 const shot = new OrthographicCamera(), goal = new OrthographicCamera();
 const target = new Vector3(), desired = new Vector3();
 let owner = null, amount = 0, kind = null, current = null;
 let viewport = null, measureAfter = 0;
 const reset = () => {
  owner = null;
  amount = 0;
  kind = null;
  current = null;
  viewport = null;
 };
 return {
  get camera() { return current; },
  reset,
  frame({source, stage, activity, phase, exiting, coasterPhase, position, dt, reduced, manual}) {
   const nextKind = activity?.kind;
   if (manual || !source?.isOrthographicCamera || !position ||
       !['carousel', 'coaster'].includes(nextKind) || (reduced && nextKind === 'coaster')) {
    reset();
    return null;
   }
   if (owner !== activity) {
    reset();
    owner = activity;
    kind = nextKind;
   }
   const carousel = kind === 'carousel';
   const shouldFocus = phase === 'active' && !exiting && (carousel || coasterPhase === 'lap');
   const step = Number.isFinite(dt) ? MathUtils.clamp(dt, 0, .05) : 0;
   const advance = reduced ? 1 : step / (shouldFocus ? .72 : .60);
   amount = MathUtils.clamp(amount + advance * (shouldFocus ? 1 : -1), 0, 1);
   if (amount === 0) {
    current = null;
    return null;
   }
   if (carousel) {
    desired.set(
     MathUtils.lerp(CAROUSEL.x, position.x, .58),
     1.26,
     MathUtils.lerp(CAROUSEL.z, position.z, .58)
    );
   } else {
    desired.set(position.x, position.y + .54, position.z - .09);
   }
   if (!current) target.copy(desired);
   else target.lerp(desired, reduced ? 1 : 1 - Math.exp(-6 * step));
   goal.position.copy(target).addScaledVector(carousel ? carouselAngle : coasterAngle, carousel ? 6.4 : 8.6);
   goal.lookAt(target);

   measureAfter -= step;
   if (!viewport || viewport.width !== stage.clientWidth || viewport.height !== stage.clientHeight || measureAfter <= 0 && step > 0) {
    viewport = measureHud(stage);
    measureAfter = .16;
   }
   const {width, height, left, right, top, bottom} = viewport;
   const scale = Math.max(1, Math.min(
    (width - left - right) / (carousel ? 4.55 : 5.4),
    (height - top - bottom) / (carousel ? 4.10 : 3.86)
   ));
   const cx = (right - left) / (2 * scale), cy = (top - bottom) / (2 * scale);
   goal.left = cx - width / (2 * scale);
   goal.right = cx + width / (2 * scale);
   goal.top = cy + height / (2 * scale);
   goal.bottom = cy - height / (2 * scale);

   const mix = amount * amount * (3 - 2 * amount);
   shot.name = carousel ? 'amusement.carousel.active-view' : 'amusement.coaster.active-view';
   shot.position.lerpVectors(source.position, goal.position, mix);
   shot.quaternion.slerpQuaternions(source.quaternion, goal.quaternion, mix);
   const sourceX = (source.left + source.right) / 2, sourceY = (source.top + source.bottom) / 2;
   for (const key of bounds) {
    const center = key === 'left' || key === 'right' ? sourceX : sourceY;
    shot[key] = MathUtils.lerp(center + (source[key] - center) / source.zoom, goal[key], mix);
   }
   shot.near = source.near;
   shot.far = source.far;
   shot.updateProjectionMatrix();
   shot.updateMatrixWorld(true);
   current = shot;
   return shot;
  }
 };
}
