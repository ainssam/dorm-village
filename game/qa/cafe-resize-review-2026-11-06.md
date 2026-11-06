# Seated cafe viewport rotation

The harvest meal browser review reproduced distorted proportions after rotating a seated cafe view from 390 × 844 to 844 × 390. `setupCamera.resizeFrame()` resized the renderer but returned while the bakery activity ticket remained active. Its orthographic frustum retained the previous aspect ratio.

## Change

`dist/camera.js` now keeps the external `activityViewport` owner's existing early return, then updates the bakery activity projection using `resizeOrthographicProjection()`. This preserves camera position, target, quaternion, zoom, vertical span, optical center and activity control lock.

The saved ticket in `dist/bakery/camera-height.js` needs no change. On exit it restores the original frame. `endBakeryActivity()` already resizes that restored frame at the current viewport dimensions; the bakery resize wrapper preserves the restored pose and zoom.

## Regression evidence

`tests/cafe-seated-resize.test.mjs` adds 10 checks:

- Portrait to landscape and landscape to portrait, including repeated rotation, keep equal pixel scale for camera-plane horizontal and vertical world distances.
- Camera pose, user zoom, projection center, vertical span, active ticket and disabled controls remain fixed while seated.
- Exiting after either rotation restores the walking or manually explored camera at the new dimensions, including the latest requested host control lock.
- Rotating away and back restores the exact original frame on exit.
- External activity projection ownership remains intact in the courtyard, in the cafe, and when an external viewport overlaps a bakery ticket.

The original source failed 8 of the 10 new checks. For example, the 390 × 844 frustum aspect remained 0.462085 when the resized renderer required 2.164103. With the fix, all 10 pass.

Executed successfully:

```sh
node --check dist/camera.js
node --test tests/cafe-seated-resize.test.mjs tests/cafe-readable-entry.test.mjs tests/amusement-food-camera.test.mjs tests/viking-camera-lease.test.mjs tests/amusement-entry-camera.test.mjs
```

The focused command passed 31 tests. These are CPU camera/ownership regressions using the real `setupCamera`, Three.js camera and OrbitControls; they do not render the cafe or measure a physical phone. Browser visual acceptance is handled separately by the harvest meal acceptance review. No commit or deployment was performed for this isolated fix.
