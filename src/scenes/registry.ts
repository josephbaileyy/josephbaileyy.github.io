import type { SceneDef } from '../engine/types';
import galaxySvg from './galaxy/galaxy.svg?raw';
import solarSvg from './solar/solar.svg?raw';
import earthSvg from './earth/earth.svg?raw';
import stanfordSvg from './stanford/stanford.svg?raw';
import roomSvg from './room/room.svg?raw';
import screenSvg from './screen/screen.svg?raw';

/** The zoom chain, shallowest first. URL names in router.ts match by id. */
export const CHAIN: SceneDef[] = [
  {
    id: 'galaxy',
    label: 'The Milky Way',
    svg: galaxySvg,
    childAnchorId: 'anchor-solar',
    hotspots: [
      {
        elementId: 'hotspot-amcvn',
        label: 'AM CVn binary — my research project',
        action: { type: 'panel', panelId: 'am-cvn' },
      },
      {
        elementId: 'hotspot-sun',
        label: 'Zoom in to the Solar System',
        action: { type: 'zoom', dir: 'in' },
      },
    ],
  },
  {
    id: 'solar',
    label: 'The Solar System',
    svg: solarSvg,
    childAnchorId: 'anchor-earth',
    hotspots: [
      {
        elementId: 'hotspot-earth',
        label: 'Zoom in to Earth',
        action: { type: 'zoom', dir: 'in' },
      },
    ],
  },
  {
    id: 'earth',
    label: 'Earth',
    svg: earthSvg,
    childAnchorId: 'anchor-stanford',
    hotspots: [
      {
        elementId: 'hotspot-stanford',
        label: 'Zoom in to Stanford University',
        action: { type: 'zoom', dir: 'in' },
      },
    ],
  },
  {
    id: 'stanford',
    label: 'Stanford University',
    svg: stanfordSvg,
    childAnchorId: 'anchor-room',
    hotspots: [
      {
        elementId: 'hotspot-room',
        label: 'Zoom in to my room',
        action: { type: 'zoom', dir: 'in' },
      },
    ],
  },
  {
    id: 'room',
    label: 'My room',
    svg: roomSvg,
    childAnchorId: 'anchor-screen',
    hotspots: [
      {
        elementId: 'hotspot-screen',
        label: 'Zoom in to my computer screen',
        action: { type: 'zoom', dir: 'in' },
      },
    ],
  },
  {
    id: 'screen',
    label: 'My computer',
    svg: screenSvg,
    hotspots: [],
  },
];
