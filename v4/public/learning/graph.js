import { hoverLabel, organizeCourse } from './curriculum.js';
import { formatLabel } from './labels.js';
import { constrainToSphere, projectCurriculum } from './projection.js';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isSuggested = (edge) => edge.kind.includes('proposed');

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function noise(id) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return (hash >>> 0) / 2 ** 32;
}

function layoutCourse(nodes, edges) {
  const lectures = nodes.filter((node) => node.kind === 'lecture');
  const lecturePositions = new Map();
  const position = new Map();
  for (const [index, node] of lectures.entries()) {
    const angle = index * GOLDEN_ANGLE;
    const radius = 132 * Math.sqrt((index + 0.55) / lectures.length);
    const point = {
      x: Math.cos(angle) * radius * 1.2,
      y: Math.sin(angle) * radius,
      z: (noise(node.id + '/depth') - 0.5) * 180,
    };
    lecturePositions.set(node.lecture, point);
    position.set(node.id, point);
  }
  for (const node of nodes) {
    if (position.has(node.id)) continue;
    const angle = noise(node.id + '/angle') * TAU;
    const anchor = lecturePositions.get(node.lecture);
    const distance = anchor ? 22 + noise(node.id) * 30 : 20 + noise(node.id) * 135;
    position.set(node.id, {
      x: (anchor?.x ?? 0) + Math.cos(angle) * distance,
      y: (anchor?.y ?? 0) + Math.sin(angle) * distance,
      z: (anchor?.z ?? 0) + (noise(node.id + '/depth') - 0.5) * (anchor ? 68 : 168),
    });
  }

  const points = nodes.map((node) => {
    const seed = position.get(node.id);
    return { ...seed, seed, node };
  });
  relax(points, edges);
  return points;
}

function relax(points, edges) {
  const byId = new Map(points.map((point) => [point.node.id, point]));
  const links = edges.map(({ source, target, kind }) => [byId.get(source), byId.get(target), kind]);

  for (let step = 0; step < 44; step++) {
    for (const point of points) {
      const strength = point.node.kind === 'lecture' ? 0.2 : 0.033;
      point.x += (point.seed.x - point.x) * strength;
      point.y += (point.seed.y - point.y) * strength;
      point.z += (point.seed.z - point.z) * 0.07;
    }
    for (const [source, target, kind] of links) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.hypot(dx, dy, dz) || 1;
      const rest = kind === 'contains' ? 37 : 49;
      const pull = ((distance - rest) / distance) * (kind.includes('proposed') ? 0.028 : 0.09);
      source.x += dx * pull;
      source.y += dy * pull;
      target.x -= dx * pull;
      target.y -= dy * pull;
      source.z += dz * pull;
      target.z -= dz * pull;
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const squared = dx * dx + dy * dy + dz * dz;
        if (squared > 3600 || squared < 0.001) continue;
        const push = 8 / (squared + 12);
        a.x -= dx * push;
        a.y -= dy * push;
        a.z -= dz * push;
        b.x += dx * push;
        b.y += dy * push;
        b.z += dz * push;
      }
    }
  }
}

export function makeLayout(nodes, edges) {
  const courses = groupBy(nodes, (node) => node.course);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const within = groupBy(
    edges.filter((edge) => byId.get(edge.source).course === byId.get(edge.target).course),
    (edge) => byId.get(edge.source).course,
  );
  return new Map(
    [...courses].map(([course, items]) => [course, layoutCourse(items, within.get(course) ?? [])]),
  );
}

export function createGraph(canvas, describeCourse, onSelect, onCourse) {
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('node-tooltip');
  let scene;
  let projection = 'map';
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let camera = { x: 0, y: 0, scale: 1, yaw: 0, pitch: 0 };
  let world = [];
  let headings = [];
  let regions = [];
  let notices = [];
  const projections = new Map();
  let structures = new Map();
  let screen = [];
  let courseHits = [];
  let hover = null;
  let tooltipNode = null;

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function fit() {
    const wide = width > height * 1.4;
    camera = {
      x: 0,
      y: 0,
      scale: 1,
      yaw: wide ? -0.31 : -0.24,
      pitch: wide ? 0.35 : 0.31,
    };
    if (projection === 'space' && world.length) {
      const project = projector();
      const bounds = [...world, ...headings, ...notices].map(project);
      const minX = Math.min(...bounds.map(({ x }) => x));
      const maxX = Math.max(...bounds.map(({ x }) => x));
      const minY = Math.min(...bounds.map(({ y }) => y));
      const maxY = Math.max(...bounds.map(({ y }) => y));
      const top = headings.length ? 88 : 63;
      const bottom = height - 30;
      camera.scale = Math.min(
        1,
        (width - 48) / (maxX - minX || 1),
        (bottom - top) / (maxY - minY || 1),
      );
      camera.x = ((width - minX - maxX) / 2) * camera.scale;
      camera.y = (top + bottom - height) / 2 + ((height - minY - maxY) / 2) * camera.scale;
    }
    requestDraw();
  }

  function place() {
    if (!scene || width <= 0 || height <= 0) return;
    world = [];
    headings = [];
    regions = [];
    notices = [];
    const { nodes, layout, focused, selected } = scene;
    const overview = scene.course === 'all' && !focused;
    const pad = width < 510 ? 14 : 32;
    const top = 63;
    const areaWidth = Math.min(width - pad * 2, 1040);
    const areaHeight = height - top - 21;
    const offsetY = (top - 21) / 2;

    const visible = new Set(nodes.map((node) => node.id));
    const area = { x: -areaWidth / 2, y: top - height / 2, w: areaWidth, h: areaHeight, z: 0 };
    if (focused && projection !== 'outline' && nodes.length) {
      const course = nodes.every((node) => node.course === nodes[0].course)
        ? nodes[0].course
        : 'all';
      placeProjection(course, area, false, visible, true);
      return;
    }
    if (focused) {
      const neighbors = nodes.filter((node) => node.id !== selected);
      const radius = Math.min(areaWidth * 0.32, areaHeight * 0.37);
      world = neighbors.map((node, index) => {
        const angle = (index / neighbors.length) * TAU - Math.PI * 0.42;
        const ring = neighbors.length > 18 && index % 2 === 0 ? 0.62 : 1;
        return {
          node,
          x: Math.cos(angle) * radius * ring,
          y: offsetY + Math.sin(angle) * radius * ring,
          z: Math.sin(angle * 2) * radius * 0.42,
        };
      });
      const center = nodes.find((node) => node.id === selected);
      if (center) world.push({ node: center, x: 0, y: offsetY, z: 0 });
      return;
    }

    if (projection !== 'outline' && overview && scene.sharedProjection) {
      placeProjection('all', area, false, visible);
      return;
    }
    const groups = [...layout].filter(([, points]) =>
      points.some(({ node }) => visible.has(node.id)),
    );
    const columns = overview
      ? Math.min(groups.length || 1, width > 850 && groups.length > 4 ? 3 : 2)
      : 1;
    const rows = Math.ceil(groups.length / columns);
    const cellWidth = areaWidth / columns;
    const cellHeight = areaHeight / Math.max(1, rows);
    const gutter = overview ? (width < 510 ? 6 : 14) : 0;
    for (const [index, [course, group]] of groups.entries()) {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = -areaWidth / 2 + col * cellWidth + gutter / 2;
      const y = top - height / 2 + row * cellHeight;
      const headerRoom = overview ? Math.min(41, cellHeight * 0.26) : 0;
      const depthRange = Math.min(areaWidth, areaHeight);
      const layer = (col % 2 === 0 ? -0.1 : 0.1) + (row % 2 === 0 ? 0.12 : -0.12);
      const depth = overview ? layer * depthRange : 0;
      const content = {
        x,
        y: y + headerRoom,
        w: cellWidth - gutter,
        h: cellHeight - headerRoom - gutter,
        z: depth,
      };
      if (overview && cellHeight > 75) {
        headings.push({
          course,
          x: x + content.w / 2,
          y: y + 6,
          z: depth,
          maxWidth: content.w - 4,
        });
      }
      if (projection !== 'outline') {
        placeProjection(course, content, overview, visible);
        continue;
      }
      const structure = structures.get(course);
      if (structure) {
        placeSections(structure, content, describeCourse(course).color, overview, visible);
        continue;
      }
      const points = group.filter(({ node }) => visible.has(node.id));
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      const spanX = Math.max(100, maxX - minX);
      const spanY = Math.max(95, maxY - minY);
      const stretch = clamp(content.w / content.h, 1, 1.55);
      const scale = Math.min(
        (content.w * 0.84) / (spanX * stretch),
        (content.h * 0.8) / spanY,
        overview ? 1.7 : 2.45,
      );
      const centerX = content.x + content.w / 2;
      const centerY = content.y + content.h / 2;
      for (const point of points) {
        world.push({
          node: point.node,
          x: centerX + (point.x - (minX + maxX) / 2) * scale * stretch,
          y: centerY + (point.y - (minY + maxY) / 2) * scale,
          z: depth + point.z * scale * 1.25,
        });
      }
    }
    if (overview && projection === 'space') {
      const rounded = constrainToSphere([...world, ...headings, ...notices], 0.38);
      notices = rounded.slice(world.length + headings.length);
      headings = rounded.slice(world.length, world.length + headings.length);
      world = rounded.slice(0, world.length);
    }
  }

  function getProjection(course) {
    if (projections.has(course)) return projections.get(course);
    const nodes =
      course === 'all' ? scene.data.nodes : scene.layout.get(course).map(({ node }) => node);
    const coordinates = projectCurriculum(nodes, scene.data.edges, scene.weights);
    const points = nodes.map((node) => ({ ...coordinates.get(node.id), node }));
    const byId = new Map(points.map((point) => [point.node.id, point]));
    for (const [id, structure] of structures) {
      if (!structure || (course !== 'all' && id !== course)) continue;
      for (const section of structure.sections) {
        const color = section.color ?? describeCourse(id).color;
        const cluster = { label: section.label, short: section.short, color };
        for (const { node } of section.points) {
          Object.assign(byId.get(node.id), { section, cluster, color });
        }
      }
    }
    const result = { map: points, space: constrainToSphere(points) };
    projections.set(course, result);
    return result;
  }

  function placeProjection(course, box, compact, visible, focused = false) {
    const cloud = getProjection(course)[projection];
    const shown = cloud.filter(({ node }) => visible.has(node.id));
    if (!shown.length) return;
    const frame = focused ? shown : cloud;
    const bounds = (axis) => {
      const values = frame.map((point) => point[axis]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { center: (min + max) / 2, span: max - min };
    };
    const x = bounds('x');
    const y = bounds('y');
    const z = bounds('z');
    if (!focused && cloud.length > 1 && x.span + y.span + z.span < 1e-9) {
      notices.push({ x: box.x + box.w / 2, y: box.y + box.h / 2, z: box.z });
      return;
    }
    const space = projection === 'space';
    const origin =
      space && !focused ? { x: 0, y: 0, z: 0 } : { x: x.center, y: y.center, z: z.center };
    const radius = space
      ? Math.max(
          1e-6,
          ...frame.map((point) =>
            Math.hypot(point.x - origin.x, point.y - origin.y, point.z - origin.z),
          ),
        )
      : 0;
    const scale = space
      ? Math.min(box.w * 0.48, box.h * 0.58) / radius
      : Math.min((box.w - 18) / Math.max(0.025, x.span), (box.h - 30) / Math.max(0.025, y.span));
    for (const point of shown) {
      const positioned = {
        ...point,
        compact,
        x: box.x + box.w / 2 + (point.x - origin.x) * scale,
        y: box.y + box.h / 2 - (point.y - origin.y) * scale,
        z: box.z + (space ? (point.z - origin.z) * scale : 0),
      };
      world.push(positioned);
    }
  }

  function placeSections(map, box, color, compact, visible) {
    const narrow = box.w < 560;
    const miniature = compact && box.w < 250;
    const other = map.ungrouped.points.some(({ node }) => visible.has(node.id));
    const gap = compact ? (miniature ? 4 : 9) : narrow ? 9 : 14;
    const extra = other ? (compact ? 33 : 72) : 0;
    const rows = !compact && narrow ? map.sections.length : 1;
    const columns = rows > 1 ? 1 : map.sections.length;
    const rowHeight = Math.max(1, (box.h - extra - gap * (rows - 1)) / rows);
    const colWidth = Math.max(1, (box.w - gap * (columns - 1)) / columns);

    for (const [index, section] of map.sections.entries()) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = box.x + col * (colWidth + gap);
      const y = box.y + row * (rowHeight + gap);
      const tint = section.color ?? color;
      regions.push({
        x,
        y,
        z: box.z,
        w: colWidth,
        h: rowHeight,
        color: tint,
        label: compact ? section.short : section.label,
        compact,
        miniature,
      });
      const labelRoom = compact ? 17 : 27;
      scatter(
        section,
        {
          x: x + colWidth / 2,
          y: y + (rowHeight + labelRoom) / 2,
          z: box.z,
          rx: colWidth * 0.42,
          ry: Math.max(2, Math.min(colWidth * 0.42, (rowHeight - labelRoom - 8) * 0.46)),
        },
        tint,
      );
    }

    if (other) {
      const y = box.y + box.h - extra + gap;
      regions.push({
        x: box.x,
        y,
        z: box.z,
        w: box.w,
        h: extra - gap,
        color,
        label: map.ungrouped.label,
        compact,
        miniature,
      });
      scatter(
        map.ungrouped,
        {
          x: box.x + box.w / 2,
          y: y + extra * 0.58,
          z: box.z,
          rx: box.w * 0.44,
          ry: extra * 0.16,
        },
        color,
      );
    }

    function scatter(section, center, tint) {
      const { points } = section;
      if (!points.some(({ node }) => visible.has(node.id))) return;
      const normalize = (axis) => {
        const values = points.map((point) => point[axis]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const midpoint = (max + min) / 2;
        const half = Math.max(18, (max - min) / 2);
        return (point) => (point[axis] - midpoint) / half;
      };
      const nx = normalize('x');
      const ny = normalize('y');
      for (const point of points) {
        if (!visible.has(point.node.id)) continue;
        world.push({
          node: point.node,
          section,
          color: tint,
          compact,
          x: center.x + nx(point) * center.rx,
          y: center.y + ny(point) * center.ry,
          z: center.z,
        });
      }
    }
  }

  function projector() {
    const { x, y, scale, yaw, pitch } = camera;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const distance = Math.max(width * 0.94, height * 1.35);
    return (point) => {
      let { x: px, y: py, z } = point;
      let depth = 1;
      if (projection === 'space') {
        const rotatedZ = -sinY * px + cosY * z;
        px = cosY * px + sinY * z;
        z = sinP * py + cosP * rotatedZ;
        py = cosP * py - sinP * rotatedZ;
        depth = distance / Math.max(distance * 0.45, distance - z);
      }
      return {
        ...point,
        x: width / 2 + x + px * scale * depth,
        y: height / 2 + y + py * scale * depth,
        z,
        depth,
      };
    };
  }

  function draw() {
    frame = 0;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!scene) return;
    const project = projector();
    screen = world.map(project);
    if (projection === 'space') screen.sort((a, b) => a.z - b.z);
    const positions = new Map(screen.map((point) => [point.node.id, point]));
    const emphasized = hover?.node?.id ?? scene.selected;
    const related = scene.neighbors.get(emphasized);
    const narrow = width < 510;
    drawSections(project);

    for (const edge of scene.edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      const active = edge.source === emphasized || edge.target === emphasized;
      const crossCourse = a.node.course !== b.node.course;
      const color =
        crossCourse || a.color !== b.color
          ? '#b6b1c9'
          : (a.color ?? describeCourse(a.node.course).color);
      const suggested = isSuggested(edge);
      const crossSection = a.section !== b.section;
      const ambientAlpha =
        a.section || b.section ? (crossSection ? 0.12 : 0.33) : suggested ? 0.27 : 0.4;
      ctx.globalAlpha = active ? 0.86 : emphasized ? 0.08 : ambientAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = active ? 1.4 : 0.8;
      ctx.setLineDash(suggested ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const point of screen) {
      const { node, x, y, depth } = point;
      const selected = node.id === scene.selected;
      const hovered = node.id === hover?.node?.id;
      const lit = !emphasized || selected || hovered || related?.has(node.id);
      const size = node.kind === 'lecture' ? 6.4 : node.kind === 'note' ? 2.8 : 4.3;
      const zoom = clamp(Math.sqrt(camera.scale), 0.75, 1.6);
      const density = point.compact ? (narrow ? 0.64 : 0.83) : narrow ? 0.88 : 1;
      const radius = (size + (selected || hovered ? 2.3 : 0)) * depth * zoom * density;
      point.hitRadius = Math.max(point.compact ? 6 : 9, radius + 3);
      const color =
        node.kind === 'assessed' ? '#ffd388' : (point.color ?? describeCourse(node.course).color);
      ctx.globalAlpha = lit ? clamp(depth * 0.94, 0.54, 1) : 0.22;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (node.kind === 'dembo' || node.kind === 'assessed') {
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius, y);
        ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.arc(x, y, radius, 0, TAU);
        if (node.kind === 'lecture') {
          ctx.fillStyle = '#101217';
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.41, 0, TAU);
          ctx.fillStyle = color;
        }
        ctx.fill();
      }
      if (selected || hovered) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4.5, 0, TAU);
        ctx.strokeStyle = selected ? '#f0f0f3' : color;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    courseHits = [];
    const occupied = [];
    const topByCourse = new Map();
    if (projection === 'space' && headings.length) {
      for (const { node, y } of screen) {
        if (y < 48 || y > height) continue;
        topByCourse.set(node.course, Math.min(topByCourse.get(node.course) ?? Infinity, y));
      }
    }
    for (const heading of headings.map(project)) {
      const course = describeCourse(heading.course);
      const top = topByCourse.get(heading.course);
      const y = top === undefined ? heading.y : Math.max(51, Math.min(heading.y, top - 32));
      const active = hover?.course === heading.course;
      const title = narrow ? course.short : course.name;
      const maxWidth = heading.maxWidth - 30;
      if (maxWidth < 15) continue;
      const fontSize = narrow ? 13 : 17;
      ctx.font = `550 ${fontSize}px Outfit, system-ui, sans-serif`;
      const titleWidth = ctx.measureText(title).width;
      if (titleWidth > maxWidth) {
        const fittedSize = Math.max(10, Math.floor((fontSize * maxWidth) / titleWidth));
        ctx.font = `550 ${fittedSize}px Outfit, system-ui, sans-serif`;
      }
      const label = truncate(title, maxWidth);
      const w = ctx.measureText(label).width + 30;
      const x = heading.x - w / 2;
      const box = { x, y: y - 5, w, h: 35 };
      if (x < 2 || x + w > width || y < 48 || y + 30 > height) continue;
      if (overlaps(box, occupied)) continue;
      courseHits.push({ ...box, course: heading.course });
      occupied.push(box);
      ctx.fillStyle = '#161920';
      ctx.strokeStyle = active ? course.color : '#2b3039';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = course.color;
      ctx.fillText(label, x + 9, y + 9);
      ctx.fillStyle = '#a4acbc';
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(course.code, x + 9, y + 23, box.w - 17);
      ctx.fillStyle = course.color;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('↗', x + box.w - 17, y + 9);
    }

    if (projection !== 'outline') drawCloudLabels(occupied);
    else drawSectionLabels(project, occupied);
    ctx.font = '11px Outfit, system-ui, sans-serif';
    ctx.fillStyle = '#a6aab7';
    for (const { x, y } of notices.map(project)) {
      const label = 'No signal at these weights';
      ctx.fillText(label, x - ctx.measureText(label).width / 2, y);
    }
    showTooltip(positions.get(hover?.node?.id));
  }

  function drawSections(project) {
    for (const region of regions) {
      const { x, y, z, w, h, color } = region;
      const corners = [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ].map((point) => project({ ...point, z }));
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const point of corners.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath();
      ctx.fillStyle = color + '0d';
      ctx.fill();
      ctx.strokeStyle = color + '37';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawCloudLabels(occupied) {
    const clusters = groupBy(
      screen.filter((point) => point.cluster),
      (point) => point.cluster,
    );
    for (const [cluster, points] of clusters) {
      const compact = points[0].compact;
      const fontSize = compact || width < 510 ? 10 : 13;
      ctx.font = `550 ${fontSize}px Outfit, system-ui, sans-serif`;
      const label = (compact && cluster.short) || cluster.label;
      const w = ctx.measureText(label).width;
      const center = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const top = Math.min(...points.map((point) => point.y));
      if (center < 0 || center > width || top < 44 || top > height) continue;
      const box = {
        x: clamp(center - w / 2, 4, width - w - 4),
        y: Math.max(49, top - fontSize - 7),
        w,
        h: fontSize + 3,
      };
      const target = [0, 13, -13]
        .map((dy) => ({ ...box, y: box.y + dy }))
        .find(
          (candidate) =>
            candidate.y >= 49 &&
            candidate.y + candidate.h < height &&
            !overlaps(candidate, occupied),
        );
      if (!target) continue;
      occupied.push(target);
      ctx.fillStyle = cluster.color;
      ctx.fillText(label, target.x, target.y + fontSize);
    }
  }

  function drawSectionLabels(project, occupied) {
    for (const { x, y, z, w, color, label, compact, miniature } of regions) {
      if (!label) continue;
      const fontSize = compact ? (miniature ? 9 : 11) : width < 510 ? 11 : 13;
      const inset = miniature ? 2 : 8;
      const maxWidth = w - inset * 2;
      if (maxWidth <= 0) continue;
      ctx.font = `550 ${fontSize}px Outfit, system-ui, sans-serif`;
      const textWidth = Math.min(ctx.measureText(label).width, maxWidth);
      const title = project({ x: x + inset, y: y + fontSize + (compact ? 3 : 6), z });
      const box = { x: title.x, y: title.y - fontSize, w: textWidth, h: fontSize + 2 };
      if (box.x < 4 || box.x + box.w > width - 4 || box.y < 48 || title.y > height - 5) continue;
      if (overlaps(box, occupied)) continue;
      occupied.push(box);
      ctx.fillStyle = color;
      ctx.fillText(label, title.x, title.y, maxWidth);
    }
  }

  function showTooltip(point) {
    tooltip.hidden = !point || point.x < 0 || point.x > width || point.y < 0 || point.y > height;
    if (tooltip.hidden) return;
    if (tooltipNode !== point.node) {
      tooltipNode = point.node;
      tooltip.innerHTML = formatLabel(hoverLabel(point.node));
    }
    const left = clamp(point.x - tooltip.offsetWidth / 2, 5, width - tooltip.offsetWidth - 5);
    const above = point.y - point.hitRadius - tooltip.offsetHeight - 3;
    const top = above > 50 ? above : point.y + point.hitRadius + 3;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.min(top, height - tooltip.offsetHeight - 4)}px`;
  }

  function overlaps(box, others) {
    return others.some(
      (other) =>
        box.x < other.x + other.w + 3 &&
        box.x + box.w + 3 > other.x &&
        box.y < other.y + other.h + 3 &&
        box.y + box.h + 3 > other.y,
    );
  }

  function truncate(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let end = text.length;
    while (end > 1 && ctx.measureText(text.slice(0, end) + '…').width > maxWidth) end--;
    return text.slice(0, end).trimEnd() + '…';
  }

  function hit(x, y) {
    const course = courseHits.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (course) return course;
    let closest = null;
    let best = Infinity;
    for (const point of screen) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= point.hitRadius && distance <= best) {
        closest = point;
        best = distance;
      }
    }
    return closest;
  }

  function zoom(factor, x = width / 2, y = height / 2, fromX = x, fromY = y) {
    const next = clamp(camera.scale * factor, 0.36, 5.5);
    const cx = width / 2;
    const cy = height / 2;
    camera.x = x - cx - ((fromX - cx - camera.x) * next) / camera.scale;
    camera.y = y - cy - ((fromY - cy - camera.y) * next) / camera.scale;
    camera.scale = next;
    requestDraw();
  }

  function move(dx, dy, pan = false) {
    if (projection === 'space' && !pan) {
      camera.yaw += dx * 0.008;
      camera.pitch = clamp(camera.pitch - dy * 0.008, -1.45, 1.45);
    } else {
      camera.x += dx;
      camera.y += dy;
    }
    requestDraw();
  }

  const pointers = new Map();
  let dragged = false;
  let start;
  function pinch() {
    const [a, b] = pointers.values();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (!pointers.size) {
      dragged = false;
      start = { x: event.offsetX, y: event.offsetY };
    }
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = { x: event.offsetX, y: event.offsetY };
    const last = pointers.get(event.pointerId);
    if (last) {
      const before = pointers.size > 1 ? pinch() : null;
      pointers.set(event.pointerId, point);
      if (before) {
        const now = pinch();
        dragged = true;
        zoom(now.d / before.d, now.x, now.y, before.x, before.y);
      } else {
        dragged ||= Math.hypot(point.x - start.x, point.y - start.y) > 4;
        if (dragged) move(point.x - last.x, point.y - last.y, event.shiftKey);
      }
      if (dragged) {
        hover = null;
        canvas.classList.add('is-dragging');
      }
    } else if (!pointers.size && event.pointerType !== 'touch') {
      const target = hit(point.x, point.y);
      if (target?.course === hover?.course && target?.node === hover?.node) return;
      hover = target;
      canvas.classList.toggle('is-pointing', Boolean(hover));
      requestDraw();
    }
  });
  function release(event) {
    const wasDown = pointers.delete(event.pointerId);
    if (!wasDown || pointers.size) return;
    canvas.classList.remove('is-dragging');
    if (event.type !== 'pointerup' || dragged) return;
    const target = hit(event.offsetX, event.offsetY);
    if (target?.course) onCourse(target.course);
    else if (target?.node) onSelect(target.node.id);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, release);
  }
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    canvas.classList.remove('is-pointing');
    requestDraw();
  });
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoom(Math.exp(-clamp(event.deltaY, -120, 120) * 0.0025), event.offsetX, event.offsetY);
    },
    { passive: false },
  );
  canvas.addEventListener('keydown', (event) => {
    const arrows = {
      ArrowUp: [0, -26],
      ArrowDown: [0, 26],
      ArrowLeft: [-26, 0],
      ArrowRight: [26, 0],
    };
    const direction = arrows[event.key];
    if (direction) move(...direction, event.shiftKey);
    else if (event.key === '+' || event.key === '=') zoom(1.2);
    else if (event.key === '-') zoom(1 / 1.2);
    else if (event.key === 'Home') fit();
    else return;
    event.preventDefault();
  });

  new ResizeObserver(([entry]) => {
    ({ width, height } = entry.contentRect);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    place();
    requestDraw();
  }).observe(canvas);
  document.fonts.ready.then(requestDraw);

  return {
    update(next, reset) {
      if (next.layout !== scene?.layout) {
        structures = new Map(
          [...next.layout].map(([course, points]) => [
            course,
            organizeCourse(course, points, next.neighbors),
          ]),
        );
        projections.clear();
      }
      if (next.weights !== scene?.weights) projections.clear();
      scene = next;
      hover = null;
      canvas.classList.remove('is-pointing');
      place();
      if (reset) fit();
      else requestDraw();
    },
    setProjection(value) {
      projection = value;
      place();
      fit();
    },
    fit,
    zoom,
  };
}
