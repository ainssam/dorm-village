# Sports aiming and equipment update

## Archery

- The target is perpendicular to the firing lane; the camera looks down the lane from a three-quarter rear angle instead of presenting the target edge-on.
- The original character turns side-on. The bow has one upright stave aligned with the actual grip, and the rear hand pulls the string. Original arm lengths and geometry are preserved; pose and fixture ownership restore on exit.
- A front-facing target inset accepts tap/drag aiming. Its crosshair predicts the actual calibrated nock/direction trajectory with gravity, at full power before drawing and current power during drawing. A separate marker retains actual target impact. This preview never awards score; actual swept collisions still decide results.
- Keyboard and sliders remain fine controls. Aiming in the inset does not fire. Hold/release still fires, and pause/cancel/blur clear input.
- Aim bounds cover the center and all four outer-ring directions. The arrow is long enough to span the natural full draw.

## Light targets

- Targets face the firing lane squarely.
- A front-facing touch/drag inset shows moving targets and the emitted muzzle-ray crosshair. Green feedback means the real ray intersects a target. Firing remains explicit.
- Character dimensions, grip contacts, lifecycle ownership, and restoration are unchanged.

## Outdoor equipment

- Pull-up rail is at field-local (4, -6.5); jungle gym is centered at (6.6, -6.1), facing the nearby courts.
- Meshes, colliders, activity prompts, exit positions, and animation contact roots move together. Existing terrain, basketball play area, soccer markings, track, and NPC routes are preserved.

## Verification boundary

Targeted source geometry, collision, lifecycle, aiming, and input tests cover these changes. Exact-runtime offline Blender renders were inspected for the equipment placement and archery camera/pose. They are geometry diagnostics, not browser screenshots. Local Chromium launch failed with an operating-system socket restriction; the existing cloud browser could not access the local preview. Live browser WebGL, actual touch-device behavior, and device frame rate remain unmeasured. The repository-wide historical suite was intentionally stopped after a bounded diagnostic run; its partial failures were not rewritten or represented as a full passing suite.
