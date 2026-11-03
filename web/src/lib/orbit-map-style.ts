import type {
  StyleSpecification,
  LayerSpecification,
  ExpressionSpecification,
} from 'maplibre-gl'

/** Original Orbit cartography over the open OpenMapTiles schema. No hosted stock style. */
export function orbitMapStyle(
  dark: boolean,
  accent = '#e786a1',
): StyleSpecification {
  const p = dark
    ? {
        land: '#151c2a',
        water: '#263c50',
        park: '#253e3a',
        built: '#202b3b',
        road: '#536072',
        major: '#bd9b95',
        text: '#e2e4de',
        dim: '#a8b4b7',
        halo: '#151c2a',
      }
    : {
        land: '#f3eee3',
        water: '#bcd6d8',
        park: '#cfddc5',
        built: '#e5dfd3',
        road: '#fffdf5',
        major: '#d7aca0',
        text: '#35474b',
        dim: '#657878',
        halo: '#f3eee3',
      }
  const layers: LayerSpecification[] = [
    { id: 'paper', type: 'background', paint: { 'background-color': p.land } },
  ]
  const fill = (id: string, sourceLayer: string, color: string, minzoom = 0) =>
    layers.push({
      id,
      type: 'fill',
      source: 'atlas',
      'source-layer': sourceLayer,
      minzoom,
      paint: { 'fill-color': color },
    })
  fill('green-spaces', 'landcover', p.park)
  fill('neighbourhoods', 'landuse', p.built)
  fill('gardens', 'park', p.park)
  fill('water', 'water', p.water)
  fill('buildings', 'building', p.built, 14)
  layers.push({
    id: 'streams',
    type: 'line',
    source: 'atlas',
    'source-layer': 'waterway',
    paint: {
      'line-color': p.water,
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 16, 4],
    },
  })
  for (const [id, major] of [
    ['lanes', false],
    ['avenues', true],
  ] as const) {
    layers.push({
      id,
      type: 'line',
      source: 'atlas',
      'source-layer': 'transportation',
      minzoom: major ? 5 : 11,
      filter: major
        ? [
            'in',
            ['get', 'class'],
            ['literal', ['motorway', 'trunk', 'primary', 'secondary']],
          ]
        : [
            '!',
            [
              'in',
              ['get', 'class'],
              ['literal', ['motorway', 'trunk', 'primary', 'secondary']],
            ],
          ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': major ? p.major : p.road,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          major ? 0.6 : 0.2,
          14,
          major ? 3 : 1.5,
          18,
          major ? 12 : 7,
        ],
      },
    })
  }
  const name: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:latin'],
    ['get', 'name:en'],
    ['get', 'name'],
  ]
  layers.push({
    id: 'street-names',
    type: 'symbol',
    source: 'atlas',
    'source-layer': 'transportation_name',
    minzoom: 13,
    layout: {
      'symbol-placement': 'line',
      'text-field': name,
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-max-angle': 30,
    },
    paint: {
      'text-color': p.dim,
      'text-halo-color': p.halo,
      'text-halo-width': 1.5,
    },
  })
  layers.push({
    id: 'neighbourhood-names',
    type: 'symbol',
    source: 'atlas',
    'source-layer': 'place',
    layout: {
      'text-field': name,
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 14, 17],
      'text-letter-spacing': 0.04,
      'text-max-width': 8,
    },
    paint: {
      'text-color': p.text,
      'text-halo-color': p.halo,
      'text-halo-width': 2,
    },
  })
  layers.push({
    id: 'little-places',
    type: 'circle',
    source: 'atlas',
    'source-layer': 'poi',
    minzoom: 15,
    paint: {
      'circle-color': accent,
      'circle-radius': 3,
      'circle-stroke-color': p.halo,
      'circle-stroke-width': 2,
    },
  })
  layers.push({
    id: 'little-place-names',
    type: 'symbol',
    source: 'atlas',
    'source-layer': 'poi',
    minzoom: 15,
    layout: {
      'text-field': name,
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 0.9],
      'text-anchor': 'top',
      'text-max-width': 8,
    },
    paint: {
      'text-color': p.text,
      'text-halo-color': p.halo,
      'text-halo-width': 1.5,
    },
  })
  return {
    version: 8,
    name: dark ? 'Orbit · Midnight atlas' : 'Orbit · Paper atlas',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      atlas: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers,
  }
}
