import RAPIER from '@dimforge/rapier3d-compat';
import {
  FIXED_STEP,
  MAX_CHARGE_DISTANCE,
  chargeFromDistance,
  createRng,
  randomRange,
  seededDirection,
} from './math.js';

const MASS = {
  heavy: 5.2,
  mid: 1.45,
  light: 0.42,
};

const HALF_EXTENTS = {
  heavy: { x: 0.72, y: 0.31, z: 0.24 },
  mid: { x: 0.48, y: 0.2, z: 0.12 },
  light: { x: 0.22, y: 0.22, z: 0.09 },
};

function vectorLength(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalized(vector) {
  const length = vectorLength(vector) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function subtract(first, second) {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

function scaled(vector, scale) {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  };
}

function bodySlot(body, index, depth, widthScale, rng) {
  const featured = Boolean(body.id || body.label);
  const phase = (index + 1) * 2.399963229728653;
  const depthLayer = ((index * 7) % 11) / 10;
  const x = body.slot.x * widthScale;
  const y = body.slot.y * 3.25;

  if (featured) {
    return {
      x,
      y,
      z: 0.12 + depthLayer * Math.min(0.3, depth * 0.14),
    };
  }

  return {
    x: x + Math.sin(phase) * 0.24 + randomRange(rng, -0.08, 0.08),
    y: y + Math.cos(phase * 0.73) * 0.15 + randomRange(rng, -0.06, 0.06),
    z: -0.05 - depthLayer * Math.min(0.36, depth * 0.17) + randomRange(rng, -0.04, 0.04),
  };
}

function colliderForBody(body) {
  const size = HALF_EXTENTS[body.massClass];
  if (body.massClass === 'light') {
    return RAPIER.ColliderDesc.ball(size.x);
  }
  return RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
}

function quaternionFromEuler(x, y, z) {
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}

function selectBodiesForTier(bodies, limit) {
  if (bodies.length <= limit) return bodies;
  const featured = bodies.filter((body) => body.id || body.label);
  const fillers = bodies.filter((body) => !body.id && !body.label);
  const selected = featured.slice(0, limit);
  const remaining = Math.max(0, limit - selected.length);

  for (let index = 0; index < remaining; index += 1) {
    const fillerIndex = Math.min(
      fillers.length - 1,
      Math.floor((index * fillers.length) / remaining),
    );
    if (fillers[fillerIndex]) selected.push(fillers[fillerIndex]);
  }
  return selected;
}

export async function createPhysics({ manifest, seed, tier, onImpact = () => {} }) {
  await RAPIER.init();

  const rng = createRng(seed);
  const world = new RAPIER.World({ x: 0, y: -0.06, z: 0 });
  world.timestep = FIXED_STEP;
  world.integrationParameters.numSolverIterations = 8;
  world.integrationParameters.numInternalPgsIterations = 2;
  const eventQueue = new RAPIER.EventQueue(true);
  const records = [];
  const colliderRecords = new Map();
  const depth = tier.chamberDepth;
  const chamberWidth = tier.name === 'phone' ? 2.72 : tier.name === 'mid' ? 5.2 : 6.25;
  const chamberHeight = 3.78;
  const widthScale = tier.name === 'phone' ? 2.35 : tier.name === 'mid' ? 4.35 : 5.2;

  function createWall(position, halfExtents) {
    const rigidBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
        .setFriction(0.72)
        .setRestitution(0.22),
      rigidBody,
    );
  }

  createWall(
    { x: -chamberWidth - 0.18, y: 0, z: 0 },
    { x: 0.18, y: chamberHeight + 0.35, z: depth + 0.35 },
  );
  createWall(
    { x: chamberWidth + 0.18, y: 0, z: 0 },
    { x: 0.18, y: chamberHeight + 0.35, z: depth + 0.35 },
  );
  createWall(
    { x: 0, y: -chamberHeight - 0.18, z: 0 },
    { x: chamberWidth + 0.35, y: 0.18, z: depth + 0.35 },
  );
  createWall(
    { x: 0, y: chamberHeight + 0.18, z: 0 },
    { x: chamberWidth + 0.35, y: 0.18, z: depth + 0.35 },
  );
  createWall(
    { x: 0, y: 0, z: -depth - 0.16 },
    { x: chamberWidth + 0.35, y: chamberHeight + 0.35, z: 0.16 },
  );
  createWall(
    { x: 0, y: 0, z: depth + 0.16 },
    { x: chamberWidth + 0.35, y: chamberHeight + 0.35, z: 0.16 },
  );

  selectBodiesForTier(manifest.bodies, tier.bodyLimit).forEach((body, index) => {
    const home = bodySlot(body, index, depth, widthScale, rng);
    const featured = Boolean(body.id || body.label);
    const rotation = {
      x: randomRange(rng, featured ? -0.1 : -0.3, featured ? 0.1 : 0.3),
      y: randomRange(rng, featured ? -0.13 : -0.34, featured ? 0.13 : 0.34),
      z: randomRange(rng, featured ? -0.16 : -0.3, featured ? 0.16 : 0.3),
    };
    const homeRotation = quaternionFromEuler(rotation.x, rotation.y, rotation.z);
    const rigidBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(home.x, home.y, home.z)
        .setRotation(homeRotation)
        .setLinearDamping(body.massClass === 'heavy' ? 0.2 : 0.3)
        .setAngularDamping(body.massClass === 'heavy' ? 0.68 : 0.52)
        .setAdditionalMass(0)
        .setCcdEnabled(body.massClass !== 'heavy')
        .setSleeping(true)
        .setCanSleep(true),
    );
    const collider = world.createCollider(
      colliderForBody(body)
        .setMass(MASS[body.massClass])
        .setFriction(body.massClass === 'heavy' ? 0.85 : body.massClass === 'mid' ? 0.46 : 0.18)
        .setRestitution(body.massClass === 'heavy' ? 0.26 : body.massClass === 'mid' ? 0.32 : 0.68)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(42),
      rigidBody,
    );
    const record = {
      index,
      source: body,
      body: rigidBody,
      collider,
      home,
      homeRotation,
      halfExtents: HALF_EXTENTS[body.massClass],
      mass: MASS[body.massClass],
      isProjectile: false,
    };
    records.push(record);
    colliderRecords.set(collider.handle, record);
  });

  const projectileHome = {
    x: tier.name === 'phone' ? -2.12 : tier.name === 'mid' ? -4.08 : -5.15,
    y: 0.05,
    z: 0.35,
  };
  const projectileBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(projectileHome.x, projectileHome.y, projectileHome.z)
      .setLinearDamping(0.55)
      .setAngularDamping(0.82)
      .setCcdEnabled(true)
      .setAdditionalSolverIterations(6)
      .setCanSleep(true),
  );
  const projectileCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.46)
      .setMass(14)
      .setFriction(0.18)
      .setRestitution(0.62)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(36),
    projectileBody,
  );
  const projectile = {
    index: -1,
    source: {
      id: null,
      label: 'UNKNOWN',
      massClass: 'projectile',
      kind: 'projectile',
    },
    body: projectileBody,
    collider: projectileCollider,
    home: projectileHome,
    homeRotation: { x: 0, y: 0, z: 0, w: 1 },
    halfExtents: { x: 0.46, y: 0.46, z: 0.46 },
    mass: 14,
    isProjectile: true,
  };
  records.push(projectile);
  colliderRecords.set(projectileCollider.handle, projectile);

  const pointerAnchor = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      projectileHome.x,
      projectileHome.y,
      projectileHome.z,
    ),
  );

  let grabbed = null;
  let springJoint = null;
  let grabOrigin = null;
  let grabTarget = null;
  let previousSample = null;
  let pointerVelocity = { x: 0, y: 0, z: 0 };
  let resetElapsed = -1;
  let stepNumber = 0;

  function wakePack() {
    records.forEach((record) => record.body.wakeUp());
  }

  function beginGrab(record, target, timestamp) {
    if (!record || resetElapsed >= 0) return false;
    releaseGrab(false);
    grabbed = record;
    grabOrigin = { ...record.body.translation() };
    grabTarget = { ...target };
    previousSample = { target: { ...target }, timestamp };
    pointerVelocity = { x: 0, y: 0, z: 0 };
    pointerAnchor.setTranslation(target, true);
    const spring = RAPIER.JointData.spring(
      0.12,
      record.isProjectile ? 132 : 98,
      record.isProjectile ? 8.5 : 7.2,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    );
    springJoint = world.createImpulseJoint(spring, pointerAnchor, record.body, true);
    record.body.wakeUp();
    return true;
  }

  function moveGrab(target, timestamp) {
    if (!grabbed || !grabOrigin) return null;
    const fromOrigin = subtract(target, grabOrigin);
    const distance = vectorLength(fromOrigin);
    const limited =
      distance > MAX_CHARGE_DISTANCE
        ? {
            ...scaled(normalized(fromOrigin), MAX_CHARGE_DISTANCE),
          }
        : fromOrigin;
    grabTarget = {
      x: grabOrigin.x + limited.x,
      y: grabOrigin.y + limited.y,
      z: grabOrigin.z + limited.z,
    };

    if (previousSample && timestamp > previousSample.timestamp) {
      const deltaSeconds = Math.max(0.008, (timestamp - previousSample.timestamp) / 1000);
      const sampleVelocity = scaled(subtract(grabTarget, previousSample.target), 1 / deltaSeconds);
      pointerVelocity = {
        x: pointerVelocity.x * 0.58 + sampleVelocity.x * 0.42,
        y: pointerVelocity.y * 0.58 + sampleVelocity.y * 0.42,
        z: pointerVelocity.z * 0.58 + sampleVelocity.z * 0.42,
      };
    }
    previousSample = { target: { ...grabTarget }, timestamp };

    return chargeFromDistance(vectorLength(limited));
  }

  function releaseGrab(launch = true) {
    if (!grabbed) return null;
    if (springJoint) {
      world.removeImpulseJoint(springJoint, true);
      springJoint = null;
    }

    const released = grabbed;
    const current = released.body.translation();
    const pull = grabOrigin ? subtract(grabOrigin, current) : pointerVelocity;
    const pullDistance = vectorLength(pull);
    const charge = chargeFromDistance(pullDistance);
    const swipeSpeed = vectorLength(pointerVelocity);
    const direction =
      pullDistance > 0.32
        ? normalized(pull)
        : swipeSpeed > 0.2
          ? normalized(pointerVelocity)
          : { x: 1, y: 0, z: 0 };

    if (launch) {
      if (released.isProjectile) wakePack();
      const throwStrength = Math.min(
        18,
        Math.max(charge.impulse, swipeSpeed * released.mass * 0.7),
      );
      const launchStrength = released.isProjectile
        ? Math.max(charge.impulse, throwStrength)
        : throwStrength;
      released.body.setLinvel(scaled(direction, launchStrength), true);
      released.body.setAngvel(
        {
          x: pointerVelocity.y * 0.22 + charge.angularImpulse * 0.18,
          y: -pointerVelocity.x * 0.18 + charge.angularImpulse * 0.12,
          z: (pointerVelocity.x - pointerVelocity.y) * 0.16 + charge.angularImpulse * 0.55,
        },
        true,
      );
    }

    grabbed = null;
    grabOrigin = null;
    grabTarget = null;
    previousSample = null;
    pointerVelocity = { x: 0, y: 0, z: 0 };
    return { record: released, charge };
  }

  function launchDeterministic() {
    const direction = seededDirection(seed);
    wakePack();
    projectile.body.setTranslation(projectileHome, true);
    projectile.body.setLinvel(scaled(direction, 34), true);
    projectile.body.setAngvel(
      {
        x: direction.z * 9,
        y: -direction.y * 12,
        z: 7.5,
      },
      true,
    );
  }

  function poseCharged() {
    const position = {
      x: projectileHome.x - (tier.name === 'phone' ? 0.28 : 0.58),
      y: tier.name === 'phone' ? -1.42 : -1.72,
      z: 0.58,
    };
    projectile.body.setTranslation(position, true);
    projectile.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    projectile.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    projectile.body.sleep();
    grabOrigin = { ...projectileHome };
    grabTarget = {
      x: -chamberWidth + 0.16,
      y: tier.name === 'phone' ? -2.72 : -2.92,
      z: 0.58,
    };
    grabbed = projectile;
  }

  function startReset() {
    releaseGrab(false);
    resetElapsed = 0;
    records.forEach((record) => record.body.wakeUp());
  }

  function updateReset() {
    if (resetElapsed < 0) return;
    resetElapsed += FIXED_STEP;

    records.forEach((record, index) => {
      const distance = vectorLength(subtract(record.home, record.body.translation()));
      const delay = ((index * 7) % 13) * 0.034 + Math.min(0.18, distance * 0.012);
      const localTime = resetElapsed - delay;
      if (localTime <= 0) return;
      const position = record.body.translation();
      const velocity = record.body.linvel();
      const delta = subtract(record.home, position);
      const gather = Math.min(1, localTime / 0.72);
      const spring =
        11 + gather * 49 + (localTime > 2.55 ? Math.min(72, (localTime - 2.55) * 60) : 0);
      const criticalDamping = 2 * Math.sqrt(spring * record.mass);
      const damping =
        criticalDamping * (localTime > 2.55 ? 1.04 : Math.min(0.9, 0.56 + localTime * 0.11));
      record.body.addForce(
        {
          x: delta.x * spring - velocity.x * damping,
          y: delta.y * spring - velocity.y * damping,
          z: delta.z * spring - velocity.z * damping,
        },
        true,
      );
      const rotation = record.body.rotation();
      const target = record.homeRotation;
      const orientationDot =
        rotation.x * target.x +
        rotation.y * target.y +
        rotation.z * target.z +
        rotation.w * target.w;
      const sign = orientationDot < 0 ? -1 : 1;
      record.body.addTorque(
        {
          x: (target.x * sign - rotation.x) * 34 - record.body.angvel().x * 5.4,
          y: (target.y * sign - rotation.y) * 34 - record.body.angvel().y * 5.4,
          z: (target.z * sign - rotation.z) * 34 - record.body.angvel().z * 5.4,
        },
        true,
      );

    });

    if (resetElapsed > 3.75) {
      records.forEach((record) => {
        record.body.setTranslation(record.home, true);
        record.body.setRotation(record.homeRotation, true);
        record.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        record.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        record.body.sleep();
      });
      resetElapsed = -1;
    }
  }

  function step() {
    if (grabbed && springJoint && grabTarget) {
      pointerAnchor.setNextKinematicTranslation(grabTarget);
    }
    updateReset();
    world.step(eventQueue);
    stepNumber += 1;

    eventQueue.drainContactForceEvents((event) => {
      const impulse = event.totalForceMagnitude() * FIXED_STEP;
      if (impulse < 0.7) return;
      const first = colliderRecords.get(event.collider1());
      const second = colliderRecords.get(event.collider2());
      const firstPosition = first?.body.translation();
      const secondPosition = second?.body.translation();
      const position =
        firstPosition && secondPosition
          ? {
              x: (firstPosition.x + secondPosition.x) * 0.5,
              y: (firstPosition.y + secondPosition.y) * 0.5,
              z: (firstPosition.z + secondPosition.z) * 0.5,
            }
          : firstPosition || secondPosition || { x: 0, y: 0, z: 0 };
      onImpact({
        impulse: Math.min(36, impulse),
        position: { ...position },
        direction: { ...event.maxForceDirection() },
        step: stepNumber,
        first,
        second,
      });
    });
  }

  function destroy() {
    if (springJoint) world.removeImpulseJoint(springJoint, false);
    eventQueue.free();
    world.free();
  }

  return {
    world,
    records,
    projectile,
    bounds: {
      width: chamberWidth,
      height: chamberHeight,
      depth,
    },
    beginGrab,
    moveGrab,
    releaseGrab,
    launchDeterministic,
    poseCharged,
    startReset,
    step,
    destroy,
    get grabbed() {
      return grabbed;
    },
    get grabOrigin() {
      return grabOrigin;
    },
    get grabTarget() {
      return grabTarget;
    },
    get resetting() {
      return resetElapsed >= 0;
    },
  };
}

export { HALF_EXTENTS, MASS };
