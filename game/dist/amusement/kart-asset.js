/**
 * A separate, static Three.js kart shell for the single-player time-trial zone.
 * The existing Dormi bumper car, rider seat, grips, back, and footrest remain
 * owned by the original bumper actor. This factory only creates the new kart.
 *
 * Inject the same THREE namespace and toy kit used by the host scene:
 *   const asset = buildRacingKartAsset(THREE, existingToyKit, { parent });
 * Wheel groups are exposed for host animation; this module adds no game logic.
 */
export function buildRacingKartAsset(THREE, kit, options = {}) {
  if (!THREE?.Group || !THREE?.Mesh || !THREE?.BufferGeometry) {
    throw new TypeError('buildRacingKartAsset requires an injected Three.js namespace');
  }
  if (!kit?.mat || !kit?.box || !kit?.cylinder) {
    throw new TypeError('buildRacingKartAsset requires the existing toy kit');
  }

  const colors = Object.freeze({
    cream: '#f8e9ce',
    rose: '#dca5ae',
    mint: '#a7c9bd',
    gold: '#d4b97e',
    ink: '#657d79',
    rubber: '#35464a',
  });
  const name = options.name ?? 'racing.kart';
  const root = new THREE.Group();
  root.name = `${name}.asset`;
  root.userData.kind = 'racing-kart-asset';
  root.userData.frontAxis = '+z';
  root.userData.scalePolicy = 'unit-scale';
  options.parent?.add(root);

  const mat = color => kit.mat(color);
  const roundedBox = (w, h, d, color, x, y, z, round = 0.025, parent = root, objectName = 'kart.part') => {
    const mesh = kit.box(w, h, d, color, x, y, z, round, parent);
    mesh.name = `${name}.${objectName}`;
    mesh.userData.kind = 'kart-visual';
    return mesh;
  };
  const plainBox = (w, h, d, color, x, y, z, parent = root, objectName = 'kart.detail') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.name = `${name}.${objectName}`;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.kind = 'kart-visual';
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (radiusTop, radiusBottom, height, color, x, y, z, radialSegments = 12, parent = root, objectName = 'kart.detail') => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), mat(color));
    mesh.name = `${name}.${objectName}`;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.kind = 'kart-visual';
    parent.add(mesh);
    return mesh;
  };

  // Low chassis sits below the unchanged .72 m foot contact and seat.
  roundedBox(1.26, 0.12, 1.50, colors.cream, 0, 0.19, -0.12, 0.025, root, 'chassis');
  roundedBox(0.84, 0.10, 0.40, colors.mint, 0, 0.22, -0.80, 0.025, root, 'rear-deck');

  // Tapered low nose: its top stays below the boarding path at y=.72 and the
  // nose tip stops at z=1.08, leaving the existing ramp start at z=1.15 clear.
  const stations = [
    { z: 0.56, half: 0.40, bottom: 0.16, top: 0.39 },
    { z: 0.74, half: 0.48, bottom: 0.16, top: 0.48 },
    { z: 0.93, half: 0.43, bottom: 0.16, top: 0.45 },
    { z: 1.08, half: 0.28, bottom: 0.18, top: 0.34 },
  ];
  const noseVertices = [];
  for (const s of stations) {
    noseVertices.push(
      -s.half, s.bottom, s.z,
       s.half, s.bottom, s.z,
      -s.half, s.top, s.z,
       s.half, s.top, s.z,
    );
  }
  const noseIndices = [];
  const quad = (a, b, c, d) => noseIndices.push(a, b, c, b, d, c);
  const capStart = 0;
  const capEnd = (stations.length - 1) * 4;
  quad(capStart, capStart + 2, capStart + 1, capStart + 3);
  quad(capEnd + 1, capEnd + 3, capEnd, capEnd + 2);
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    quad(a + 2, b + 2, a + 3, b + 3); // hood
    quad(a, a + 1, b, b + 1); // underside
    quad(a, b, a + 2, b + 2); // left cheek
    quad(a + 1, a + 3, b + 1, b + 3); // right cheek
  }
  const noseGeometry = new THREE.BufferGeometry();
  noseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(noseVertices, 3));
  noseGeometry.setIndex(noseIndices);
  noseGeometry.computeVertexNormals();
  const nose = new THREE.Mesh(noseGeometry, mat(colors.cream));
  nose.name = `${name}.nose.shell`;
  nose.castShadow = nose.receiveShadow = true;
  nose.userData.kind = 'kart-visual';
  root.add(nose);
  plainBox(0.048, 0.018, 0.42, colors.gold, 0, 0.49, 0.81, root, 'nose.center-stripe');

  // Open cockpit: the central route above the nose remains empty at y=.72.
  // Side pods sit wholly beyond the original avatar body's x=±.66 corridor.
  for (const side of [-1, 1]) {
    const x = side * 0.83;
    roundedBox(0.27, 0.25, 0.88, colors.rose, x, 0.325, -0.06, 0.055, root, side < 0 ? 'pod.left' : 'pod.right');
    plainBox(0.018, 0.042, 0.50, colors.gold, side * 0.972, 0.425, 0.06, root, side < 0 ? 'pod-stripe.left' : 'pod-stripe.right');
    plainBox(0.17, 0.07, 0.45, colors.mint, side * 0.83, 0.484, 0.03, root, side < 0 ? 'pod-cap.left' : 'pod-cap.right');
  }

  // Low front splitter and a pair of small nose lamps stay behind z=1.08.
  plainBox(1.08, 0.055, 0.16, colors.gold, 0, 0.145, 0.96, root, 'front-splitter');
  for (const side of [-1, 1]) {
    plainBox(0.12, 0.045, 0.025, colors.mint, side * 0.205, 0.305, 1.045, root, side < 0 ? 'lamp.left' : 'lamp.right');
  }

  // Four real torus tires on independently named axle pivots. Local X is the
  // axle/roll axis; front steering parents turn on local Y around each wheel.
  // Wheel centers are .355 m high for an exact .05 m contact.
  const wheelNodes = {};
  const steeringPivots = {};
  const wheelSpecs = [
    ['frontLeft', -0.98, 0.75, 'front', 'left'],
    ['frontRight', 0.98, 0.75, 'front', 'right'],
    ['rearLeft', -0.98, -0.76, 'rear', 'left'],
    ['rearRight', 0.98, -0.76, 'rear', 'right'],
  ];
  for (const [key, x, z, axle, sideName] of wheelSpecs) {
    const side = Math.sign(x);
    const steering = axle === 'front' ? new THREE.Group() : null;
    if (steering) {
      steering.name = `${name}.steering.${key}`;
      steering.position.set(x, 0.355, z);
      steering.userData = { kind: 'front-steering-pivot', steerAxis: 'local-y', wheelRollAxis: 'child-local-x' };
      root.add(steering);
      steeringPivots[key] = steering;
    }
    const wheel = new THREE.Group();
    wheel.name = `${name}.wheel.${key}`;
    wheel.position.set(steering ? 0 : x, steering ? 0 : 0.355, steering ? 0 : z);
    wheel.userData = { kind: 'rotating-wheel-node', axle, side: sideName, rollAxis: 'local-x', contactY: 0.05 };
    (steering ?? root).add(wheel);
    wheelNodes[key] = wheel;

    const tireGeometry = new THREE.TorusGeometry(0.22, 0.085, 8, 20);
    const tire = new THREE.Mesh(tireGeometry, mat(colors.rubber));
    tire.rotation.y = side * Math.PI / 2;
    tire.name = `${name}.wheel.${key}.tire`;
    tire.castShadow = tire.receiveShadow = true;
    tire.userData.kind = 'kart-wheel';
    wheel.add(tire);

    const hub = cylinder(0.136, 0.136, 0.06, colors.ink, side * 0.018, 0, 0, 16, wheel, `${key}.hub`);
    hub.rotation.z = side * Math.PI / 2;
    const hubCap = cylinder(0.067, 0.067, 0.066, colors.gold, side * 0.041, 0, 0, 12, wheel, `${key}.hub-cap`);
    hubCap.rotation.z = side * Math.PI / 2;

    const rimGeometry = new THREE.TorusGeometry(0.105, 0.015, 4, 20);
    const rim = new THREE.Mesh(rimGeometry, mat(colors.rose));
    rim.rotation.y = side * Math.PI / 2;
    rim.position.x = side * 0.073;
    rim.name = `${name}.wheel.${key}.rim`;
    rim.castShadow = rim.receiveShadow = true;
    rim.userData.kind = 'kart-wheel-detail';
    wheel.add(rim);

    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      const bolt = cylinder(0.013, 0.013, 0.012, colors.cream,
        side * 0.078, Math.cos(angle) * 0.091, Math.sin(angle) * 0.091, 6, wheel, `${key}.lug.${i + 1}`);
      bolt.rotation.z = side * Math.PI / 2;
    }
  }

  // Solid low-poly wheel arches sit just outside each tire and avatar corridor.
  // Each is a thin annular sector, not a box hidden in the wheel volume.
  const addWheelArch = (side, centerZ, label, parent = root, origin = [0, 0, 0]) => {
    const xCenter = side * 0.82;
    const halfX = label.startsWith('front') ? 0.065 : 0.09;
    const centerY = 0.355;
    const inner = 0.292;
    const outer = 0.32;
    const steps = 8;
    const verts = [];
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + Math.PI * i / steps;
      const points = [outer, inner];
      for (const x of [xCenter - halfX, xCenter + halfX]) {
        for (const r of points) {
          verts.push(
            x - origin[0],
            centerY + Math.cos(a) * r - origin[1],
            centerZ + Math.sin(a) * r - origin[2],
          );
        }
      }
    }
    const ids = [];
    for (let i = 0; i < steps; i++) {
      const a = i * 4;
      const b = a + 4;
      // x-min and x-max annular faces, outer/inner walls, then end caps.
      const faces = [
        [a, a + 1, b, b + 1],
        [a + 2, b + 2, a + 3, b + 3],
        [a, b, a + 2, b + 2],
        [a + 1, a + 3, b + 1, b + 3],
      ];
      for (const [p, q, r, s] of faces) ids.push(p, q, r, q, s, r);
    }
    // Close the two radial ends of the arch strip.
    ids.push(0, 2, 1, 1, 2, 3);
    const end = steps * 4;
    ids.push(end, end + 1, end + 2, end + 1, end + 3, end + 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(ids);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat(colors.mint));
    mesh.name = `${name}.arch.${label}`;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.kind = 'kart-visual';
    parent.add(mesh);
  };
  for (const side of [-1, 1]) {
    const frontKey = side < 0 ? 'frontLeft' : 'frontRight';
    const frontSteering = steeringPivots[frontKey];
    addWheelArch(side, 0.75, side < 0 ? 'front-left' : 'front-right', frontSteering, frontSteering.position.toArray());
    addWheelArch(side, -0.76, side < 0 ? 'rear-left' : 'rear-right');
  }

  // Compact rear wing stays aft of z=-.8 and behind the original rider seat.
  roundedBox(0.90, 0.08, 0.20, colors.rose, 0, 0.75, -1.22, 0.025, root, 'rear-spoiler');
  for (const side of [-1, 1]) {
    plainBox(0.055, 0.18, 0.13, colors.gold, side * 0.37, 0.67, -1.22, root, side < 0 ? 'spoiler-end.left' : 'spoiler-end.right');
    cylinder(0.018, 0.024, 0.23, colors.ink, side * 0.22, 0.585, -1.12, 8, root, side < 0 ? 'spoiler-strut.left' : 'spoiler-strut.right');
  }

  root.userData.racingKart = Object.freeze({
    palette: colors,
    orientation: 'front +z; y up',
    floorWheelContactY: 0.05,
    wheelCenterY: 0.355,
    wheelOuterRadius: 0.305,
    seatTopReferenceY: 0.72,
    originalSeatRootReferenceY: 0.72 - 0.14111661911010742,
    noseFrontZ: 1.08,
    spoilerRearZ: -1.32,
    animation: 'front steering pivots rotate local-y; exposed wheel groups roll local-x; this asset has no simulation or score logic',
  });

  return {
    root,
    wheels: Object.freeze({ ...wheelNodes }),
    steeringPivots: Object.freeze({ ...steeringPivots }),
    palette: colors,
  };
}

