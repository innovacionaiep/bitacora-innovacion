import { describe, expect, it } from 'vitest';
import {
  groupVitrinaProyectosByRegion,
  groupVitrinaProyectosBySede,
  formatSedeLabel,
  layoutFloatingMapCards,
  layoutSedeLabels,
  METROPOLITANA_REGION_ID,
  metropolitanSedeZone,
  nationalPinRadius,
  pinRadius,
  pinsForRegion,
  resolveSedeGeo,
  sedeLabelParts,
  zoomPinRadius,
} from '@/lib/aiep-sede-geo';
import {
  chileRegionById,
  chileRegionPathBBox,
  projectChileLonLat,
} from '@/lib/chile-horizontal-paths';

describe('resolveSedeGeo', () => {
  it('ubica sedes oficiales y distingue campus de la RM', () => {
    expect(resolveSedeGeo('Valparaíso')?.id).toBe('valparaiso');
    expect(resolveSedeGeo('Bellavista')?.id).toBe('bellavista');
    expect(resolveSedeGeo('San Bernardo')?.id).toBe('san-bernardo');
    expect(resolveSedeGeo('Barrio Universitario')?.id).toBe(
      'barrio-universitario',
    );
    expect(resolveSedeGeo('San Felipe')?.id).toBe('san-felipe');
    expect(resolveSedeGeo('Los Ángeles')?.id).toBe('los-angeles');
    expect(resolveSedeGeo('Concepción')?.id).toBe('concepcion');
  });

  it('omite sedes en línea y nombres desconocidos', () => {
    expect(resolveSedeGeo('Aiep Online')).toBeNull();
    expect(resolveSedeGeo('Online')).toBeNull();
    expect(resolveSedeGeo('Sede inventada')).toBeNull();
  });

  it('pone el norte arriba y el oeste a la izquierda', () => {
    const calama = resolveSedeGeo('Calama');
    const castro = resolveSedeGeo('Castro');
    const bellavista = resolveSedeGeo('Bellavista');
    const valpo = resolveSedeGeo('Valparaíso');
    expect(calama?.y).toBeLessThan(castro?.y ?? 0);
    expect(valpo?.x).toBeLessThan(bellavista?.x ?? 0);
  });
});

describe('groupVitrinaProyectosBySede', () => {
  it('separa campus de Santiago en puntos distintos', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Bellavista'] },
      { nombre: 'AgroTech', sedes: ['San Bernardo'] },
    ]);
    expect(pins.map((pin) => pin.id).sort()).toEqual([
      'bellavista',
      'san-bernardo',
    ]);
  });

  it('repite un proyecto en cada sede mappable y omite Online', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Beehappy', sedes: ['Valparaíso', 'Temuco', 'Online'] },
      { nombre: 'Sin sede', sedes: [] },
    ]);
    expect(pins.map((pin) => pin.id)).toEqual(['valparaiso', 'temuco']);
    expect(pins[0]?.nombres).toEqual(['Beehappy']);
    expect(pins[1]?.nombres).toEqual(['Beehappy']);
  });

  it('no duplica el mismo proyecto si dos alias caen en el mismo punto', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Unico', sedes: ['Santiago', 'Bellavista'] },
    ]);
    expect(pins).toHaveLength(1);
    expect(pins[0]?.nombres).toEqual(['Unico']);
  });

  it('filtra pines de la región seleccionada', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
      { nombre: 'AgroTech', sedes: ['Temuco'] },
    ]);
    expect(pinsForRegion(pins, 5).map((pin) => pin.id)).toEqual(['valparaiso']);
    expect(pinsForRegion(pins, 9).map((pin) => pin.id)).toEqual(['temuco']);
    expect(pinsForRegion(pins, null)).toEqual([]);
  });

  it('agrega un punto por región con el total de proyectos', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
      { nombre: 'Beehappy', sedes: ['Viña del Mar'] },
      { nombre: 'AgroTech', sedes: ['Temuco'] },
    ]);
    const regions = groupVitrinaProyectosByRegion(pins);
    expect(regions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ regionId: 5, count: 2 }),
        expect.objectContaining({ regionId: 9, count: 1 }),
      ]),
    );
  });
});

describe('chile vertical projection', () => {
  it('el pin de Valparaíso cae dentro del bbox de su región', () => {
    const region = chileRegionById(5);
    const pin = resolveSedeGeo('Valparaíso');
    expect(region).toBeTruthy();
    expect(pin).toBeTruthy();
    const box = chileRegionPathBBox(region!.d, 0);
    expect(pin!.x).toBeGreaterThan(box.minX);
    expect(pin!.x).toBeLessThan(box.minX + box.width);
    expect(pin!.y).toBeGreaterThan(box.minY);
    expect(pin!.y).toBeLessThan(box.minY + box.height);
  });

  it('proyecta oeste a menor x y norte a menor y', () => {
    const west = projectChileLonLat(-73, -33);
    const east = projectChileLonLat(-70, -33);
    const north = projectChileLonLat(-71, -20);
    const south = projectChileLonLat(-71, -42);
    expect(west.x).toBeLessThan(east.x);
    expect(north.y).toBeLessThan(south.y);
  });
});

describe('pinRadius', () => {
  it('crece con la cantidad y tiene tope', () => {
    expect(pinRadius(1)).toBeLessThan(pinRadius(4));
    expect(pinRadius(40)).toBe(14);
    expect(nationalPinRadius(1)).toBeLessThan(nationalPinRadius(8));
  });

  it('en el zoom se achica si la región es chica', () => {
    expect(zoomPinRadius(1, 30)).toBeLessThan(pinRadius(1));
    expect(zoomPinRadius(1, 30)).toBeLessThan(1);
    expect(zoomPinRadius(1, 200)).toBeLessThan(zoomPinRadius(1, 30) * 10);
  });
});

describe('formatSedeLabel', () => {
  it('antepone Sede si el nombre no la trae', () => {
    expect(formatSedeLabel('Valparaíso')).toBe('Sede Valparaíso');
    expect(formatSedeLabel('Sede Bellavista')).toBe('Sede Bellavista');
    expect(sedeLabelParts('Valparaíso')).toEqual({
      top: 'Sede',
      bottom: 'Valparaíso',
    });
  });
});

describe('layoutFloatingMapCards', () => {
  const mapRect = { left: 120, top: 20, width: 160, height: 260 };

  function overlapsMap(left: number, top: number, w: number, h: number) {
    return (
      left < mapRect.left + mapRect.width &&
      left + w > mapRect.left &&
      top < mapRect.top + mapRect.height &&
      top + h > mapRect.top
    );
  }

  it('deja las tarjetas fuera del mapa y apiladas junto a su pin', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
      { nombre: 'Beehappy', sedes: ['Valparaíso'] },
      { nombre: 'Inland', sedes: ['San Felipe'] },
    ]);
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        valparaiso: { x: 140, y: 80 },
        'san-felipe': { x: 250, y: 160 },
      },
      width: 400,
      height: 300,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      gap: 8,
    });
    expect(placed).toHaveLength(3);
    for (const card of placed) {
      expect(overlapsMap(card.left, card.top, 80, 70)).toBe(false);
    }
    const valpoCards = placed.filter((card) => card.pinId === 'valparaiso');
    const felipeCards = placed.filter((card) => card.pinId === 'san-felipe');
    expect(valpoCards).toHaveLength(2);
    expect(valpoCards[0]!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(felipeCards[0]!.left).toBeGreaterThanOrEqual(
      mapRect.left + mapRect.width,
    );
    expect(Math.abs(valpoCards[1]!.top - valpoCards[0]!.top)).toBeGreaterThanOrEqual(
      70,
    );
  });

  it('separa clusters de sedes cercanas en el mismo lado', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
      { nombre: 'Humedal', sedes: ['Viña del Mar'] },
    ]);
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        valparaiso: { x: 145, y: 120 },
        'vina-del-mar': { x: 148, y: 132 },
      },
      width: 400,
      height: 300,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      gap: 8,
    });
    const a = placed.find((card) => card.pinId === 'valparaiso');
    const b = placed.find((card) => card.pinId === 'vina-del-mar');
    expect(a && b).toBeTruthy();
    expect(Math.abs((a?.top ?? 0) - (b?.top ?? 0))).toBeGreaterThanOrEqual(70);
  });

  it('reparte a izquierda y derecha según la sede aunque ambas queden al oeste del mapa', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Costa Norte', sedes: ['Antofagasta'] },
      { nombre: 'Desierto', sedes: ['Calama'] },
    ]);
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        antofagasta: { x: 130, y: 140 },
        calama: { x: 175, y: 90 },
      },
      width: 400,
      height: 300,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      gap: 8,
    });
    const costa = placed.find((card) => card.pinId === 'antofagasta');
    const inland = placed.find((card) => card.pinId === 'calama');
    expect(costa && inland).toBeTruthy();
    expect(costa!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(inland!.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
  });
});

describe('layoutSedeLabels', () => {
  it('separa etiquetas de sedes muy cercanas (Viña y Valparaíso)', () => {
    const vina = resolveSedeGeo('Viña del Mar');
    const valpo = resolveSedeGeo('Valparaíso');
    expect(vina && valpo).toBeTruthy();
    const placed = layoutSedeLabels(
      [
        { id: vina!.id, x: vina!.x, y: vina!.y, label: vina!.label },
        { id: valpo!.id, x: valpo!.x, y: valpo!.y, label: valpo!.label },
      ],
      { fontSize: 1.2, radius: 0.5 },
    );
    expect(placed).toHaveLength(2);
    const a = placed.find((item) => item.pinId === 'vina-del-mar');
    const b = placed.find((item) => item.pinId === 'valparaiso');
    expect(a && b).toBeTruthy();
    const dy = Math.abs((a?.yBottom ?? 0) - (b?.yBottom ?? 0));
    const dx = Math.abs((a?.x ?? 0) - (b?.x ?? 0));
    expect(dy > 2 || dx > 3).toBe(true);
  });

  it('en la RM aleja las etiquetas del racimo central', () => {
    const names = [
      'Santiago Norte',
      'Bellavista',
      'Barrio Universitario',
      'San Joaquín',
      'Maipú',
      'San Bernardo',
    ];
    const pins = names.map((name) => {
      const point = resolveSedeGeo(name);
      if (!point) throw new Error(name);
      return { id: point.id, x: point.x, y: point.y, label: point.label };
    });
    const placed = layoutSedeLabels(pins, {
      fontSize: 1.2,
      radius: 0.4,
      regionId: METROPOLITANA_REGION_ID,
    });
    expect(placed).toHaveLength(6);
    const xs = placed.map((item) => item.x);
    const ys = placed.map((item) => item.yBottom);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(6);
    expect(placed.every((item) => item.lineTo)).toBe(true);
  });
});

describe('región metropolitana', () => {
  it('asigna zonas de brújula a las sedes conocidas', () => {
    const ids = [
      'santiago-norte',
      'barrio-universitario',
      'bellavista',
      'san-joaquin',
      'san-bernardo',
      'maipu',
    ] as const;
    expect(metropolitanSedeZone('maipu', -1, 0)).toBe('w');
    expect(metropolitanSedeZone('san-bernardo', 0, 1)).toBe('s');
    expect(metropolitanSedeZone('san-joaquin', 1, 1)).toBe('se');
    expect(metropolitanSedeZone('bellavista', 1, 0)).toBe('e');
    expect(metropolitanSedeZone('barrio-universitario', 1, -1)).toBe('nw');
    expect(metropolitanSedeZone('santiago-norte', 0, -1)).toBe('n');
    expect(ids).toHaveLength(6);
  });

  it('reparte tarjetas en 8 zonas alrededor del mapa', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Norte', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
    ]);
    const mapRect = { left: 160, top: 90, width: 180, height: 180 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        'santiago-norte': { x: 250, y: 140 },
        bellavista: { x: 310, y: 180 },
        'barrio-universitario': { x: 290, y: 150 },
        'san-joaquin': { x: 310, y: 240 },
        maipu: { x: 190, y: 200 },
        'san-bernardo': { x: 250, y: 250 },
      },
      width: 500,
      height: 400,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const by = (id: string) => placed.find((card) => card.pinId === id);
    expect(by('maipu')!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(by('bellavista')!.left).toBeGreaterThanOrEqual(
      mapRect.left + mapRect.width,
    );
    expect(by('santiago-norte')!.top + 70).toBeLessThanOrEqual(mapRect.top);
    expect(by('san-bernardo')!.top).toBeGreaterThanOrEqual(
      mapRect.top + mapRect.height,
    );
    expect(by('san-joaquin')!.left).toBeGreaterThanOrEqual(
      mapRect.left + mapRect.width,
    );
    expect(by('san-joaquin')!.top).toBeGreaterThanOrEqual(
      mapRect.top + mapRect.height,
    );
    expect(by('barrio-universitario')!.left + 80).toBeLessThanOrEqual(
      mapRect.left,
    );
    expect(by('barrio-universitario')!.top + 70).toBeLessThanOrEqual(mapRect.top);
  });
});
