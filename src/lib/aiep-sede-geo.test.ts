import { describe, expect, it } from 'vitest';
import {
  groupVitrinaProyectosByRegion,
  groupVitrinaProyectosBySede,
  compassSedeZone,
  formatSedeLabel,
  layoutFloatingMapCards,
  layoutOverlaySedeLabelsNearCards,
  layoutSedeLabels,
  layoutSedeMapOverflowCaptions,
  formatSedeMapOverflowCaption,
  LOS_LAGOS_REGION_ID,
  METROPOLITANA_REGION_ID,
  metropolitanSedeZone,
  nationalPinRadius,
  OHIGGINS_REGION_ID,
  ONLINE_REGION_ID,
  ONLINE_SEDE_ID,
  ONLINE_COMUNA_MAP_PIN_FILL,
  SEDE_ONLINE_MAP_BADGE,
  isComunaMapPinKind,
  mapComunaCardCaption,
  pickMetropolitanComunaZone,
  segmentHitsAabb,
  pinRadius,
  pinsForOnline,
  pinsForRegion,
  resolveSedeGeo,
  vitrinaSedeIsOnlineOnly,
  sedeLabelParts,
  splitOnlinePinAroundGlobe,
  usesCompassMapLayout,
  usesOverlaySedeLabel,
  VALPARAISO_REGION_ID,
  zoomPinRadius,
  COMUNA_CARD_CAPTION_LINE_PX,
  COMUNA_MAP_PIN_FILL,
  EMPRENDEDOR_EXTERNO_MAP_BADGE,
  mapPinLabelParts,
  layoutComunaCardLines,
  mapPinColumnSide,
  mapPinNearestSide,
} from '@/lib/aiep-sede-geo';
import { resolveComunaGeo } from '@/lib/chile-comuna-geo';
import {
  chileRegionById,
  chileRegionPathBBox,
  projectChileLonLat,
} from '@/lib/chile-horizontal-paths';
import { VITRINA_SEDE_EMPRENDEDOR_EXTERNO } from '@/lib/vitrina-card-display';

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

  it('resuelve Online como sede virtual y omite nombres desconocidos', () => {
    expect(resolveSedeGeo('Online')?.id).toBe('online');
    expect(resolveSedeGeo('Aiep Online')?.id).toBe('online');
    expect(resolveSedeGeo('Sede inventada')).toBeNull();
    expect(resolveSedeGeo('Sede Online')?.id).toBe('online');
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

describe('vitrinaSedeIsOnlineOnly', () => {
  it('acepta Online y Sede Online, rechaza mixto y Emprendedor', () => {
    expect(vitrinaSedeIsOnlineOnly(['Online'])).toBe(true);
    expect(vitrinaSedeIsOnlineOnly(['Sede Online'])).toBe(true);
    expect(vitrinaSedeIsOnlineOnly(['AIEP Online'])).toBe(true);
    expect(vitrinaSedeIsOnlineOnly(['Online', 'Valparaíso'])).toBe(false);
    expect(vitrinaSedeIsOnlineOnly([VITRINA_SEDE_EMPRENDEDOR_EXTERNO])).toBe(
      false,
    );
    expect(vitrinaSedeIsOnlineOnly([])).toBe(false);
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

  it('repite un proyecto en cada sede mappable e incluye Online', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Beehappy', sedes: ['Valparaíso', 'Temuco', 'Online'] },
      { nombre: 'Sin sede', sedes: [] },
    ]);
    expect(pins.map((pin) => pin.id)).toEqual([
      'online',
      'valparaiso',
      'temuco',
    ]);
    expect(pins.find((pin) => pin.id === 'online')?.nombres).toEqual([
      'Beehappy',
    ]);
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

  it('no pone Online en el mapa nacional y sí lo filtra para el zoom', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'VirtualApp', sedes: ['Online'] },
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
    ]);
    expect(groupVitrinaProyectosByRegion(pins).map((p) => p.regionId)).toEqual([
      5,
    ]);
    expect(pinsForOnline(pins).map((p) => p.id)).toEqual([ONLINE_SEDE_ID]);
    expect(pinsForRegion(pins, ONLINE_REGION_ID)).toEqual([]);
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
  const mapRect = { left: 220, top: 20, width: 160, height: 260 };

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
        valparaiso: { x: 240, y: 80 },
        'san-felipe': { x: 350, y: 160 },
      },
      width: 500,
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
    // Con máx. 3 columnas, 2 tarjetas van en la misma fila (lado a lado).
    expect(valpoCards[0]!.top).toBe(valpoCards[1]!.top);
    expect(
      Math.abs(valpoCards[1]!.left - valpoCards[0]!.left),
    ).toBeGreaterThanOrEqual(80);
  });

  it('no apila más de 3 tarjetas en horizontal por sede', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'P1', sedes: ['Valparaíso'] },
      { nombre: 'P2', sedes: ['Valparaíso'] },
      { nombre: 'P3', sedes: ['Valparaíso'] },
      { nombre: 'P4', sedes: ['Valparaíso'] },
      { nombre: 'P5', sedes: ['Valparaíso'] },
      { nombre: 'P6', sedes: ['Valparaíso'] },
      { nombre: 'P7', sedes: ['Valparaíso'] },
    ]);
    const placed = layoutFloatingMapCards({
      pins,
      positions: { valparaiso: { x: 240, y: 120 } },
      width: 500,
      height: 400,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      gap: 8,
    });
    expect(placed).toHaveLength(7);
    const tops = [...new Set(placed.map((card) => card.top))].sort(
      (a, b) => a - b,
    );
    expect(tops).toHaveLength(3);
    const rowCounts = tops.map(
      (top) => placed.filter((card) => card.top === top).length,
    );
    expect(rowCounts).toEqual([3, 3, 1]);
    for (const top of tops) {
      const row = placed.filter((card) => card.top === top);
      expect(row.length).toBeLessThanOrEqual(3);
    }
  });

  it('separa clusters de sedes cercanas en el mismo lado', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'ClinicApp', sedes: ['Valparaíso'] },
      { nombre: 'Humedal', sedes: ['Viña del Mar'] },
    ]);
    const groupGap = 28;
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
      groupGap,
    });
    const a = placed.find((card) => card.pinId === 'valparaiso');
    const b = placed.find((card) => card.pinId === 'vina-del-mar');
    expect(a && b).toBeTruthy();
    const topGap = Math.abs((a?.top ?? 0) - (b?.top ?? 0));
    expect(topGap).toBeGreaterThanOrEqual(70 + groupGap);
  });

  it('reparte a izquierda y derecha según la sede aunque ambas queden al oeste del mapa', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Costa Norte', sedes: ['Antofagasta'] },
      { nombre: 'Desierto', sedes: ['Calama'] },
    ]);
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        antofagasta: { x: 230, y: 140 },
        calama: { x: 280, y: 90 },
      },
      width: 500,
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
    const mapBBox = {
      minX: 486,
      minY: 127,
      width: 42,
      height: 50,
    };
    const placed = layoutSedeLabels(pins, {
      fontSize: 1.2,
      radius: 0.4,
      regionId: METROPOLITANA_REGION_ID,
      mapBBox,
    });
    expect(placed).toHaveLength(6);
    const xs = placed.map((item) => item.x);
    const ys = placed.map((item) => item.yBottom);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(6);
    expect(placed.every((item) => item.lineTo)).toBe(true);
    const barrio = placed.find((item) => item.pinId === 'barrio-universitario')!;
    const norte = placed.find((item) => item.pinId === 'santiago-norte')!;
    // NW / N: etiqueta fuera del mapa pero no tan lejos como las tarjetas.
    expect(barrio.x).toBeLessThan(mapBBox.minX);
    expect(norte.yBottom).toBeLessThan(mapBBox.minY);
    const mapTop = mapBBox.minY;
    // Debe quedar cerca del borde (antes de las cards), no muy arriba.
    expect(mapTop - norte.yBottom).toBeLessThan(mapBBox.height * 0.35);
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
    expect(metropolitanSedeZone('maipu', -1, 0)).toBe('sw');
    expect(metropolitanSedeZone('san-bernardo', 0, 1)).toBe('s');
    expect(metropolitanSedeZone('san-joaquin', 1, 1)).toBe('se');
    expect(metropolitanSedeZone('bellavista', 1, 0)).toBe('ne');
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
    expect(by('maipu')!.top).toBeGreaterThanOrEqual(
      mapRect.top + mapRect.height,
    );
    expect(by('bellavista')!.left).toBeGreaterThanOrEqual(
      mapRect.left + mapRect.width,
    );
    expect(by('bellavista')!.top + 70).toBeLessThanOrEqual(mapRect.top);
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

  it('pone la comuna Online de San Joaquín en el hueco este, no en SE', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Norte', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
    ]);
    const onlinePin = pins.find((pin) => pin.kind === 'online-comuna');
    expect(onlinePin?.id).toBe('online-comuna-san-joaquin');
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
        [onlinePin!.id]: { x: 300, y: 210 },
      },
      width: 500,
      height: 400,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const online = placed.find((card) => card.pinId === onlinePin!.id)!;
    const se = placed.find((card) => card.pinId === 'san-joaquin')!;
    expect(online.zone).toBe('e');
    expect(online.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(online.top + 70).toBeLessThanOrEqual(se.top);
  });

  it('coloca la comuna Online en el hueco este entre Bellavista y San Joaquín', () => {
    expect(
      segmentHitsAabb(0, 0, 10, 10, { left: 4, top: 4, right: 8, bottom: 8 }),
    ).toBe(true);
    expect(
      segmentHitsAabb(0, 0, 1, 1, { left: 8, top: 8, right: 12, bottom: 12 }),
    ).toBe(false);

    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Norte', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
    ]);
    const onlinePin = pins.find((pin) => pin.kind === 'online-comuna')!;
    const mapRect = { left: 160, top: 90, width: 180, height: 180 };
    const positions = {
      'santiago-norte': { x: 250, y: 140 },
      bellavista: { x: 310, y: 180 },
      'barrio-universitario': { x: 290, y: 150 },
      'san-joaquin': { x: 310, y: 240 },
      maipu: { x: 190, y: 200 },
      'san-bernardo': { x: 250, y: 250 },
      [onlinePin.id]: { x: 300, y: 210 },
    };
    const placed = layoutFloatingMapCards({
      pins,
      positions,
      width: 500,
      height: 400,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const online = placed.find((card) => card.pinId === onlinePin.id)!;
    const bellaBottom = Math.max(
      ...placed
        .filter((card) => card.pinId === 'bellavista')
        .map((card) => card.top + 70),
    );
    const seTop = placed.find((card) => card.pinId === 'san-joaquin')!.top;
    const captionPad = COMUNA_CARD_CAPTION_LINE_PX * 2 + 4;
    const overlays = layoutOverlaySedeLabelsNearCards({
      pins: pins
        .filter((pin) => !isComunaMapPinKind(pin.kind))
        .map((pin) => ({ id: pin.id, label: pin.label })),
      positions,
      cards: placed.filter((card) => card.pinId !== onlinePin.id),
      cardWidth: 80,
      cardHeight: 70,
      regionId: METROPOLITANA_REGION_ID,
    });
    const box = {
      left: online.left,
      top: online.top - captionPad,
      right: online.left + 80,
      bottom: online.top + 70,
    };
    for (const item of overlays) {
      expect(
        segmentHitsAabb(
          item.lineTo.x,
          item.lineTo.y,
          item.lineFrom.x,
          item.lineFrom.y,
          box,
          8,
        ),
        `no debe tapar la línea de ${item.pinId}`,
      ).toBe(false);
    }
    expect(online.zone).toBe('e');
    expect(online.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(online.top).toBeGreaterThan(bellaBottom);
    expect(online.top + 70).toBeLessThanOrEqual(seTop);
    expect(online.top).toBeGreaterThanOrEqual(mapRect.top);
    expect(online.top).toBeLessThan(mapRect.top + mapRect.height);
  });

  it('elige el hueco este junto al mapa aunque el espacio sobre Bellavista sea más alto', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'N2', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Bellavista Q', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin Q', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin R', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v2',
        nombre: 'VirtualApp 2',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v3',
        nombre: 'BuinApp',
        sedes: ['Online'],
        comunas: ['Buin'],
      },
    ]);
    const sjPin = pins.find((pin) => pin.id === 'online-comuna-san-joaquin')!;
    const buinPin = pins.find((pin) => pin.id === 'online-comuna-buin')!;
    const mapRect = { left: 300, top: 500, width: 250, height: 220 };
    const positions = {
      'santiago-norte': { x: 425, y: 560 },
      bellavista: { x: 500, y: 600 },
      'barrio-universitario': { x: 360, y: 570 },
      'san-joaquin': { x: 500, y: 680 },
      maipu: { x: 330, y: 640 },
      'san-bernardo': { x: 425, y: 690 },
      [sjPin.id]: { x: 490, y: 640 },
      [buinPin.id]: { x: 340, y: 630 },
    };
    const placed = layoutFloatingMapCards({
      pins,
      positions,
      width: 1100,
      height: 900,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const online = placed.find((card) => card.pinId === sjPin.id)!;
    const buin = placed.find((card) => card.pinId === buinPin.id)!;
    const bella = placed.filter((card) => card.pinId === 'bellavista');
    const bellaBottom = Math.max(...bella.map((card) => card.top + 70));
    const seTop = Math.min(
      ...placed
        .filter((card) => card.pinId === 'san-joaquin')
        .map((card) => card.top),
    );
    const nwBottom = Math.max(
      ...placed
        .filter((card) => card.pinId === 'barrio-universitario')
        .map((card) => card.top + 70),
    );
    const swTop = Math.min(
      ...placed.filter((card) => card.pinId === 'maipu').map((card) => card.top),
    );
    const captionPad = COMUNA_CARD_CAPTION_LINE_PX * 2 + 4;
    const overlays = layoutOverlaySedeLabelsNearCards({
      pins: pins
        .filter((pin) => !isComunaMapPinKind(pin.kind))
        .map((pin) => ({ id: pin.id, label: pin.label })),
      positions,
      cards: placed.filter(
        (card) => card.pinId !== sjPin.id && card.pinId !== buinPin.id,
      ),
      cardWidth: 80,
      cardHeight: 70,
      regionId: METROPOLITANA_REGION_ID,
    });
    const sjBox = {
      left: online.left,
      top: online.top - captionPad,
      right: online.left + 80,
      bottom: online.top + 70,
    };
    for (const item of overlays) {
      expect(
        segmentHitsAabb(
          item.lineTo.x,
          item.lineTo.y,
          item.lineFrom.x,
          item.lineFrom.y,
          sjBox,
          8,
        ),
      ).toBe(false);
    }
    expect(online.zone).toBe('e');
    expect(online.top).toBeGreaterThanOrEqual(mapRect.top);
    expect(online.top + 70).toBeLessThanOrEqual(seTop);
    expect(online.top).toBeGreaterThan(bellaBottom - 40);
    expect(online.top).toBeLessThan(mapRect.top + mapRect.height);
    expect(buin.zone).toBe('w');
    expect(buin.top).toBeGreaterThan(nwBottom);
    expect(buin.top + 70).toBeLessThanOrEqual(swTop);
  });

  it('una segunda comuna al oeste usa el hueco w', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Norte', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'east',
        nombre: 'EastApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'west',
        nombre: 'WestApp',
        sedes: ['Online'],
        comunas: ['Maipú'],
      },
    ]);
    const eastPin = pins.find((pin) => pin.id === 'online-comuna-san-joaquin')!;
    const westPin = pins.find((pin) => pin.id === 'online-comuna-maipu')!;
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
        [eastPin.id]: { x: 300, y: 210 },
        [westPin.id]: { x: 180, y: 185 },
      },
      width: 500,
      height: 400,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    expect(placed.find((card) => card.pinId === eastPin.id)?.zone).toBe('e');
    expect(placed.find((card) => card.pinId === westPin.id)?.zone).toBe('w');
  });

  it('empaqueta 3 comunas RM sin solapar sedes, rótulos ni líneas', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'N2', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Bellavista Q', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin Q', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin R', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v2',
        nombre: 'VirtualApp 2',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v3',
        nombre: 'BuinApp',
        sedes: ['Online'],
        comunas: ['Buin'],
      },
      {
        id: 'e1',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Puente Alto'],
      },
    ]);
    const sjPin = pins.find((pin) => pin.id === 'online-comuna-san-joaquin')!;
    const buinPin = pins.find((pin) => pin.id === 'online-comuna-buin')!;
    const extPin = pins.find((pin) => pin.id === 'comuna-puente-alto')!;
    expect(sjPin).toBeTruthy();
    expect(buinPin).toBeTruthy();
    expect(extPin).toBeTruthy();
    const mapRect = { left: 300, top: 500, width: 250, height: 220 };
    const positions = {
      'santiago-norte': { x: 425, y: 560 },
      bellavista: { x: 500, y: 600 },
      'barrio-universitario': { x: 360, y: 570 },
      'san-joaquin': { x: 500, y: 680 },
      maipu: { x: 330, y: 640 },
      'san-bernardo': { x: 425, y: 690 },
      [sjPin.id]: { x: 490, y: 640 },
      [buinPin.id]: { x: 340, y: 650 },
      [extPin.id]: { x: 355, y: 575 },
    };
    const cardWidth = 80;
    const cardHeight = 70;
    const groupGap = 28;
    const placed = layoutFloatingMapCards({
      pins,
      positions,
      width: 1100,
      height: 900,
      cardWidth,
      cardHeight,
      mapRect,
      groupGap,
      regionId: METROPOLITANA_REGION_ID,
    });
    const clusterBox = (pinId: string, captionLines: number) => {
      const cluster = placed.filter((card) => card.pinId === pinId);
      const left = Math.min(...cluster.map((card) => card.left));
      const top = Math.min(...cluster.map((card) => card.top));
      const right = Math.max(...cluster.map((card) => card.left + cardWidth));
      const bottom = Math.max(...cluster.map((card) => card.top + cardHeight));
      const captionPad = captionLines * COMUNA_CARD_CAPTION_LINE_PX + 4;
      return { left, top: top - captionPad, right, bottom, cardTop: top };
    };
    const overlaps = (
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number },
      pad = groupGap,
    ) =>
      !(
        a.right + pad <= b.left ||
        b.right + pad <= a.left ||
        a.bottom + pad <= b.top ||
        b.bottom + pad <= a.top
      );
    const sj = clusterBox(sjPin.id, 2);
    const buin = clusterBox(buinPin.id, 2);
    const ext = clusterBox(extPin.id, 2);
    const norte = clusterBox('santiago-norte', 0);
    const bella = clusterBox('bellavista', 0);
    const se = clusterBox('san-joaquin', 0);
    const overlays = layoutOverlaySedeLabelsNearCards({
      pins: pins
        .filter((pin) => !isComunaMapPinKind(pin.kind))
        .map((pin) => ({ id: pin.id, label: pin.label })),
      positions,
      cards: placed.filter((card) => !isComunaMapPinKind(card.kind)),
      cardWidth,
      cardHeight,
      regionId: METROPOLITANA_REGION_ID,
    });
    for (const box of [sj, buin, ext]) {
      expect(overlaps(box, norte)).toBe(false);
      expect(overlaps(box, bella)).toBe(false);
      expect(overlaps(box, se)).toBe(false);
      for (const item of overlays) {
        expect(
          segmentHitsAabb(
            item.lineTo.x,
            item.lineTo.y,
            item.lineFrom.x,
            item.lineFrom.y,
            box,
            8,
          ),
        ).toBe(false);
        expect(
          overlaps(
            box,
            {
              left: item.left,
              top: item.top,
              right: item.left + item.width,
              bottom: item.top + item.height,
            },
            8,
          ),
        ).toBe(false);
      }
    }
    expect(overlaps(sj, buin)).toBe(false);
    expect(overlaps(sj, ext)).toBe(false);
    expect(overlaps(buin, ext)).toBe(false);
    expect(sj.cardTop).toBeGreaterThanOrEqual(mapRect.top);
    expect(sj.bottom).toBeLessThanOrEqual(se.top + 1);
    expect(sj.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width - 24);
    expect(buin.right).toBeLessThanOrEqual(mapRect.left + 24);
    expect(ext.cardTop).toBeGreaterThan(norte.bottom);
    expect(ext.cardTop).toBeLessThan(buin.cardTop);
    const sjCards = placed.filter((card) => card.pinId === sjPin.id);
    expect(sjCards).toHaveLength(2);
    const sjCols = new Set(sjCards.map((card) => card.left)).size;
    expect(sjCols).toBeLessThanOrEqual(2);
  });

  it('en el oeste ordena por altura del pin aunque las comunas no compartan columna', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'Norte', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v3',
        nombre: 'BuinApp',
        sedes: ['Online'],
        comunas: ['Buin'],
      },
      {
        id: 'e1',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Til Til'],
      },
    ]);
    const buinPin = pins.find((pin) => pin.id === 'online-comuna-buin')!;
    const extPin = pins.find((pin) => pin.id === 'comuna-til-til')!;
    const mapRect = { left: 300, top: 500, width: 250, height: 220 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        'santiago-norte': { x: 425, y: 560 },
        bellavista: { x: 500, y: 600 },
        'barrio-universitario': { x: 360, y: 570 },
        'san-joaquin': { x: 500, y: 680 },
        maipu: { x: 330, y: 640 },
        'san-bernardo': { x: 425, y: 690 },
        [buinPin.id]: { x: 335, y: 655 },
        [extPin.id]: { x: 380, y: 545 },
      },
      width: 1100,
      height: 900,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const topOf = (pinId: string) =>
      Math.min(
        ...placed.filter((card) => card.pinId === pinId).map((card) => card.top),
      );
    expect(topOf(extPin.id)).toBeLessThan(topOf(buinPin.id));
    expect(topOf(buinPin.id) - topOf(extPin.id)).toBeGreaterThanOrEqual(20);
  });

  it('en el este no manda una comuna a la fila NE al reordenar por pin', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'N2', sedes: ['Santiago Norte'] },
      { nombre: 'Bellavista P', sedes: ['Bellavista'] },
      { nombre: 'Bellavista Q', sedes: ['Bellavista'] },
      { nombre: 'Barrio P', sedes: ['Barrio Universitario'] },
      { nombre: 'Joaquin P', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin Q', sedes: ['San Joaquín'] },
      { nombre: 'Joaquin R', sedes: ['San Joaquín'] },
      { nombre: 'Maipu P', sedes: ['Maipú'] },
      { nombre: 'Bernardo P', sedes: ['San Bernardo'] },
      {
        id: 'v1',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v2',
        nombre: 'VirtualApp 2',
        sedes: ['Online'],
        comunas: ['San Joaquín'],
      },
      {
        id: 'v3',
        nombre: 'ReinaApp',
        sedes: ['Online'],
        comunas: ['La Reina'],
      },
    ]);
    const sjPin = pins.find((pin) => pin.id === 'online-comuna-san-joaquin')!;
    const reinaPin = pins.find((pin) => pin.id === 'online-comuna-la-reina')!;
    const mapRect = { left: 300, top: 500, width: 250, height: 220 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        'santiago-norte': { x: 425, y: 560 },
        bellavista: { x: 500, y: 600 },
        'barrio-universitario': { x: 360, y: 570 },
        'san-joaquin': { x: 500, y: 680 },
        maipu: { x: 330, y: 640 },
        'san-bernardo': { x: 425, y: 690 },
        [sjPin.id]: { x: 490, y: 650 },
        [reinaPin.id]: { x: 505, y: 590 },
      },
      width: 1100,
      height: 900,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    const topOf = (pinId: string) =>
      Math.min(
        ...placed.filter((card) => card.pinId === pinId).map((card) => card.top),
      );
    const bellaTop = Math.min(
      ...placed
        .filter((card) => card.pinId === 'bellavista')
        .map((card) => card.top),
    );
    const bellaBottom = Math.max(
      ...placed
        .filter((card) => card.pinId === 'bellavista')
        .map((card) => card.top + 70),
    );
    expect(topOf(sjPin.id)).toBeGreaterThanOrEqual(mapRect.top);
    expect(topOf(reinaPin.id)).toBeGreaterThanOrEqual(mapRect.top);
    expect(topOf(sjPin.id)).toBeGreaterThan(bellaBottom - 8);
    expect(topOf(reinaPin.id)).toBeGreaterThan(bellaBottom - 8);
    expect(topOf(reinaPin.id)).not.toBe(bellaTop);
    expect(topOf(reinaPin.id)).toBeLessThan(topOf(sjPin.id));
    expect(topOf(sjPin.id) - topOf(reinaPin.id)).toBeGreaterThanOrEqual(20);
  });

  it('pickMetropolitanComunaZone prefiere el hueco más cercano al pin', () => {
    const mapRect = { left: 160, top: 90, width: 180, height: 180 };
    const used = new Set(['n', 'nw', 'ne', 'se', 's', 'sw'] as const);
    expect(
      pickMetropolitanComunaZone({ x: 300, y: 210 }, mapRect, used),
    ).toBe('e');
    expect(
      pickMetropolitanComunaZone({ x: 180, y: 185 }, mapRect, used),
    ).toBe('w');
  });

  it('pone Santiago Norte en el eje arriba y Bellavista arriba-derecha', () => {
    const groupGap = 28;
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'N2', sedes: ['Santiago Norte'] },
      { nombre: 'B1', sedes: ['Bellavista'] },
      { nombre: 'B2', sedes: ['Bellavista'] },
      { nombre: 'B3', sedes: ['Bellavista'] },
      { nombre: 'B4', sedes: ['Bellavista'] },
      { nombre: 'B5', sedes: ['Bellavista'] },
      { nombre: 'B6', sedes: ['Bellavista'] },
    ]);
    const mapRect = { left: 160, top: 200, width: 180, height: 180 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        'santiago-norte': { x: 250, y: 230 },
        bellavista: { x: 310, y: 260 },
      },
      width: 720,
      height: 520,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      groupGap,
      regionId: METROPOLITANA_REGION_ID,
    });
    const norte = placed.filter((c) => c.pinId === 'santiago-norte');
    const bella = placed.filter((c) => c.pinId === 'bellavista');
    expect(norte.length).toBe(2);
    expect(bella.length).toBe(6);

    const norteBottom = Math.max(...norte.map((c) => c.top + 70));
    const bellaBottom = Math.max(...bella.map((c) => c.top + 70));
    expect(norteBottom).toBeLessThanOrEqual(mapRect.top);
    expect(bellaBottom).toBeLessThanOrEqual(mapRect.top);

    const norteRight = Math.max(...norte.map((c) => c.left + 80));
    const bellaLeft = Math.min(...bella.map((c) => c.left));
    expect(bellaLeft).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(bellaLeft - norteRight).toBeGreaterThanOrEqual(groupGap);

    const mapMidX = mapRect.left + mapRect.width / 2;
    const norteLeft = Math.min(...norte.map((c) => c.left));
    const norteCenter = (norteLeft + norteRight) / 2;
    expect(Math.abs(norteCenter - mapMidX)).toBeLessThan(40);
  });

  it('en RM limita cada sede a 6 tarjetas y lista el resto debajo', () => {
    const pins = groupVitrinaProyectosBySede([
      { id: 'b1', nombre: 'Uno', sedes: ['Bellavista'] },
      { id: 'b2', nombre: 'Dos', sedes: ['Bellavista'] },
      { id: 'b3', nombre: 'Tres', sedes: ['Bellavista'] },
      { id: 'b4', nombre: 'Cuatro', sedes: ['Bellavista'] },
      { id: 'b5', nombre: 'Cinco', sedes: ['Bellavista'] },
      { id: 'b6', nombre: 'Seis', sedes: ['Bellavista'] },
      { id: 'b7', nombre: 'Verdética', sedes: ['Bellavista'] },
    ]);
    const mapRect = { left: 160, top: 200, width: 180, height: 180 };
    const cards = layoutFloatingMapCards({
      pins,
      positions: { bellavista: { x: 310, y: 260 } },
      width: 720,
      height: 520,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: METROPOLITANA_REGION_ID,
    });
    expect(cards).toHaveLength(6);
    expect(cards.some((card) => card.proyecto.id === 'b7')).toBe(false);
    expect(formatSedeMapOverflowCaption([{ nombre: 'Verdética' }])).toBe(
      '+1 Proyecto ( Verdética )',
    );
    expect(
      formatSedeMapOverflowCaption([
        { nombre: 'Alpha' },
        { nombre: 'Beta' },
      ]),
    ).toBe('+2 proyectos ( Alpha - Beta )');
    const overflow = layoutSedeMapOverflowCaptions({
      pins,
      cards,
      cardWidth: 80,
      cardHeight: 70,
      regionId: METROPOLITANA_REGION_ID,
    });
    expect(overflow).toHaveLength(1);
    expect(overflow[0]!.pinId).toBe('bellavista');
    expect(overflow[0]!.proyectos.map((item) => item.nombre)).toEqual([
      'Verdética',
    ]);
    const bottom = Math.max(...cards.map((card) => card.top + 70));
    expect(overflow[0]!.top).toBeGreaterThanOrEqual(bottom);
  });

  it('en otras regiones no recorta las tarjetas de sede', () => {
    const pins = groupVitrinaProyectosBySede(
      Array.from({ length: 7 }, (_, index) => ({
        nombre: `V${index + 1}`,
        sedes: ['Valparaíso'],
      })),
    );
    const mapRect = { left: 200, top: 100, width: 200, height: 220 };
    const cards = layoutFloatingMapCards({
      pins,
      positions: { valparaiso: { x: 235, y: 200 } },
      width: 700,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      regionId: VALPARAISO_REGION_ID,
    });
    expect(cards).toHaveLength(7);
    expect(
      layoutSedeMapOverflowCaptions({
        pins,
        cards,
        cardWidth: 80,
        cardHeight: 70,
        regionId: VALPARAISO_REGION_ID,
      }),
    ).toEqual([]);
  });


  it('pone etiquetas overlay justo antes de cada grupo de tarjetas', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'B1', sedes: ['Bellavista'] },
      { nombre: 'B2', sedes: ['Bellavista'] },
      { nombre: 'U1', sedes: ['Barrio Universitario'] },
      { nombre: 'SF1', sedes: ['San Bernardo'] },
      { nombre: 'M1', sedes: ['Maipú'] },
      { nombre: 'M2', sedes: ['Maipú'] },
    ]);
    const mapRect = { left: 200, top: 120, width: 180, height: 180 };
    const positions = {
      'santiago-norte': { x: 290, y: 150 },
      bellavista: { x: 360, y: 200 },
      'barrio-universitario': { x: 230, y: 160 },
      'san-bernardo': { x: 290, y: 280 },
      maipu: { x: 210, y: 220 },
    };
    const cards = layoutFloatingMapCards({
      pins,
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 44,
      groupGap: 28,
      regionId: METROPOLITANA_REGION_ID,
    });
    const labels = layoutOverlaySedeLabelsNearCards({
      pins: pins.map((pin) => ({ id: pin.id, label: pin.label })),
      positions,
      cards,
      cardWidth: 80,
      cardHeight: 70,
      regionId: METROPOLITANA_REGION_ID,
      labelFontPx: 12,
      gap: 8,
    });

    const clusterBox = (id: string) => {
      const group = cards.filter((card) => card.pinId === id);
      return {
        left: Math.min(...group.map((c) => c.left)),
        top: Math.min(...group.map((c) => c.top)),
        right: Math.max(...group.map((c) => c.left + 80)),
        bottom: Math.max(...group.map((c) => c.top + 70)),
      };
    };
    const by = (id: string) => labels.find((item) => item.pinId === id)!;

    const norte = clusterBox('santiago-norte');
    expect(by('santiago-norte').top + by('santiago-norte').height).toBeLessThanOrEqual(
      norte.top,
    );
    expect(by('santiago-norte').lineFrom.y).toBeGreaterThanOrEqual(
      by('santiago-norte').top + by('santiago-norte').height - 1,
    );
    const bella = clusterBox('bellavista');
    expect(by('bellavista').top + by('bellavista').height).toBeLessThanOrEqual(
      bella.top,
    );
    expect(by('bellavista').lineFrom.y).toBeGreaterThanOrEqual(
      by('bellavista').top + by('bellavista').height - 1,
    );
    const barrio = clusterBox('barrio-universitario');
    expect(
      by('barrio-universitario').top + by('barrio-universitario').height,
    ).toBeLessThanOrEqual(barrio.top);
    const bernardo = clusterBox('san-bernardo');
    expect(by('san-bernardo').top + by('san-bernardo').height).toBeLessThanOrEqual(
      bernardo.top,
    );
    const maipu = clusterBox('maipu');
    // Maipú: nombre sobre las tarjetas; línea apunta al centro y corta en el borde.
    expect(by('maipu').top + by('maipu').height).toBeLessThanOrEqual(maipu.top);
    const maipuLabel = by('maipu');
    const maipuCenter = {
      x: maipuLabel.left + maipuLabel.width / 2,
      y: maipuLabel.top + maipuLabel.height / 2,
    };
    const pin = positions.maipu!;
    const toCenter = Math.hypot(maipuCenter.x - pin.x, maipuCenter.y - pin.y);
    const toEnd = Math.hypot(
      maipuLabel.lineFrom.x - pin.x,
      maipuLabel.lineFrom.y - pin.y,
    );
    expect(toEnd).toBeLessThan(toCenter);
    // Misma dirección (producto cruzado ~0).
    const cross =
      (maipuLabel.lineFrom.x - pin.x) * (maipuCenter.y - pin.y) -
      (maipuLabel.lineFrom.y - pin.y) * (maipuCenter.x - pin.x);
    expect(Math.abs(cross)).toBeLessThan(1);
  });
});

describe('región de Los Lagos', () => {
  it('usa layout de brújula con zonas fijas', () => {
    expect(usesCompassMapLayout(LOS_LAGOS_REGION_ID)).toBe(true);
    expect(compassSedeZone(LOS_LAGOS_REGION_ID, 'osorno', 0, 0)).toBe('nw');
    expect(compassSedeZone(LOS_LAGOS_REGION_ID, 'puerto-montt', 0, 0)).toBe('e');
    expect(compassSedeZone(LOS_LAGOS_REGION_ID, 'castro', 0, 0)).toBe('sw');
  });

  it('coloca Osorno NW, Puerto Montt E y Castro SW', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'O1', sedes: ['Osorno'] },
      { nombre: 'O2', sedes: ['Osorno'] },
      { nombre: 'PM1', sedes: ['Puerto Montt'] },
      { nombre: 'PM2', sedes: ['Puerto Montt'] },
      { nombre: 'PM3', sedes: ['Puerto Montt'] },
      { nombre: 'C1', sedes: ['Castro'] },
      { nombre: 'C2', sedes: ['Castro'] },
      { nombre: 'C3', sedes: ['Castro'] },
    ]);
    const mapRect = { left: 200, top: 110, width: 180, height: 200 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        osorno: { x: 240, y: 150 },
        'puerto-montt': { x: 340, y: 200 },
        castro: { x: 220, y: 270 },
      },
      width: 700,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 28,
      groupGap: 28,
      regionId: LOS_LAGOS_REGION_ID,
    });
    const by = (id: string) => placed.find((card) => card.pinId === id);
    const osorno = by('osorno')!;
    const puerto = by('puerto-montt')!;
    const castro = by('castro')!;
    const rightEdge = (id: string) =>
      Math.max(
        ...placed.filter((c) => c.pinId === id).map((c) => c.left + 80),
      );

    expect(osorno.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(puerto.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(castro.left + 80).toBeLessThanOrEqual(mapRect.left);
    // NW arriba de SW, ambos al costado (no en esquinas fuera del mapa).
    expect(osorno.top).toBeLessThan(castro.top);
    expect(osorno.top + 70).toBeLessThan(mapRect.top + mapRect.height);
    expect(castro.top).toBeGreaterThan(mapRect.top);
    // Más cerca del mapa que el layout de esquina RM (margen pequeño).
    expect(mapRect.left - rightEdge('osorno')).toBeLessThanOrEqual(28);
    expect(mapRect.left - rightEdge('castro')).toBeLessThanOrEqual(28);
  });

  it('deja aire inferior bajo Castro igual al pb-6 del mapa nacional (24px)', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'C1', sedes: ['Castro'] },
      { nombre: 'C2', sedes: ['Castro'] },
      { nombre: 'C3', sedes: ['Castro'] },
    ]);
    const bottomPad = 24;
    const overlayH = 480;
    const mapRect = { left: 200, top: 110, width: 180, height: 200 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: { castro: { x: 220, y: 270 } },
      width: 700,
      height: overlayH - bottomPad,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: LOS_LAGOS_REGION_ID,
    });
    const bottom = Math.max(...placed.map((c) => c.top + 70));
    expect(overlayH - bottom).toBeGreaterThanOrEqual(bottomPad);
  });

  it('mantiene etiquetas cerca del pin sin líneas líderes', () => {
    const names = ['Osorno', 'Puerto Montt', 'Castro'];
    const pins = names.map((name) => {
      const point = resolveSedeGeo(name);
      if (!point) throw new Error(name);
      return { id: point.id, x: point.x, y: point.y, label: point.label };
    });
    const placed = layoutSedeLabels(pins, {
      fontSize: 1.2,
      radius: 0.4,
      regionId: LOS_LAGOS_REGION_ID,
    });
    expect(placed).toHaveLength(3);
    expect(placed.every((item) => !item.lineTo)).toBe(true);
    for (const item of placed) {
      const pin = pins.find((p) => p.id === item.pinId)!;
      expect(Math.hypot(item.x - pin.x, item.yBottom - pin.y)).toBeLessThan(4);
    }
  });
});

describe("región de O'Higgins", () => {
  it('pone San Fernando abajo y Rancagua a la derecha', () => {
    expect(compassSedeZone(OHIGGINS_REGION_ID, 'san-fernando', 0, 0)).toBe('s');
    expect(compassSedeZone(OHIGGINS_REGION_ID, 'rancagua', 0, 0)).toBe('e');

    const pins = groupVitrinaProyectosBySede([
      { nombre: 'R1', sedes: ['Rancagua'] },
      { nombre: 'R2', sedes: ['Rancagua'] },
      { nombre: 'SF1', sedes: ['San Fernando'] },
    ]);
    const mapRect = { left: 200, top: 80, width: 200, height: 220 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        rancagua: { x: 340, y: 140 },
        'san-fernando': { x: 280, y: 250 },
      },
      width: 640,
      height: 420,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: OHIGGINS_REGION_ID,
    });
    const rancagua = placed.find((c) => c.pinId === 'rancagua')!;
    const sanFernando = placed.find((c) => c.pinId === 'san-fernando')!;
    expect(rancagua.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(sanFernando.top).toBeGreaterThanOrEqual(mapRect.top + mapRect.height);
    expect(sanFernando.left + 40).toBeGreaterThan(mapRect.left);
    expect(sanFernando.left).toBeLessThan(mapRect.left + mapRect.width);
  });
});

describe('región del Bío-Bío', () => {
  it('pone la comuna Los Ángeles abajo, sin solapar el mapa', () => {
    const concepcion = groupVitrinaProyectosBySede([
      { nombre: 'C1', sedes: ['Concepción'] },
      { nombre: 'C2', sedes: ['Concepción'] },
      { nombre: 'C3', sedes: ['Concepción'] },
      { nombre: 'C4', sedes: ['Concepción'] },
      { nombre: 'C5', sedes: ['Concepción'] },
    ])[0]!;
    const losAngeles = groupVitrinaProyectosBySede([
      { nombre: 'L1', sedes: ['Los Ángeles'] },
      { nombre: 'L2', sedes: ['Los Ángeles'] },
      { nombre: 'L3', sedes: ['Los Ángeles'] },
      { nombre: 'L4', sedes: ['Los Ángeles'] },
      { nombre: 'L5', sedes: ['Los Ángeles'] },
      { nombre: 'L6', sedes: ['Los Ángeles'] },
    ])[0]!;
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'HuertoActivo',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Los Ángeles'],
      },
    ])[0]!;
    const region = chileRegionById(8)!;
    const box = chileRegionPathBBox(region.d, 0);
    const mapRect = { left: 220, top: 40, width: 360, height: 348 };
    const toOverlay = (point: { x: number; y: number }) => ({
      x: mapRect.left + ((point.x - box.minX) / box.width) * mapRect.width,
      y: mapRect.top + ((point.y - box.minY) / box.height) * mapRect.height,
    });
    const conceGeo = resolveSedeGeo('Concepción')!;
    const laGeo = resolveSedeGeo('Los Ángeles')!;
    const comunaGeo = resolveComunaGeo('Los Ángeles')!;
    expect(mapPinNearestSide(toOverlay(comunaGeo), mapRect)).toBe('s');
    const placed = layoutFloatingMapCards({
      pins: [concepcion, losAngeles, comunaPin],
      positions: {
        [concepcion.id]: toOverlay(conceGeo),
        [losAngeles.id]: toOverlay(laGeo),
        [comunaPin.id]: toOverlay(comunaGeo),
      },
      width: 900,
      height: 640,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: 8,
    });
    const comuna = placed.find((card) => card.pinId === comunaPin.id)!;
    const captionH = COMUNA_CARD_CAPTION_LINE_PX * 2 + 4;
    expect(comuna.zone).toBe('s');
    expect(comuna.top - captionH).toBeGreaterThanOrEqual(
      mapRect.top + mapRect.height,
    );
    expect(comuna.left).toBeGreaterThanOrEqual(mapRect.left);
    expect(comuna.left + 80).toBeLessThanOrEqual(mapRect.left + mapRect.width);
    const overlapsMap =
      comuna.left < mapRect.left + mapRect.width &&
      comuna.left + 80 > mapRect.left &&
      comuna.top - captionH < mapRect.top + mapRect.height &&
      comuna.top + 70 > mapRect.top;
    expect(overlapsMap).toBe(false);
  });
});


describe('región de Valparaíso', () => {
  it('asigna Viña NW, Valparaíso W y San Antonio SW; overlay solo Viña', () => {
    expect(usesCompassMapLayout(VALPARAISO_REGION_ID)).toBe(true);
    expect(compassSedeZone(VALPARAISO_REGION_ID, 'vina-del-mar', 0, 0)).toBe(
      'nw',
    );
    expect(compassSedeZone(VALPARAISO_REGION_ID, 'valparaiso', 0, 0)).toBe('w');
    expect(compassSedeZone(VALPARAISO_REGION_ID, 'san-felipe', 0, 0)).toBe('e');
    expect(compassSedeZone(VALPARAISO_REGION_ID, 'san-antonio', 0, 0)).toBe(
      'sw',
    );
    expect(usesOverlaySedeLabel(VALPARAISO_REGION_ID, 'vina-del-mar')).toBe(
      true,
    );
    expect(usesOverlaySedeLabel(VALPARAISO_REGION_ID, 'valparaiso')).toBe(
      false,
    );
    expect(usesOverlaySedeLabel(VALPARAISO_REGION_ID, 'san-antonio')).toBe(
      false,
    );
    expect(usesOverlaySedeLabel(VALPARAISO_REGION_ID, 'san-felipe')).toBe(false);
  });

  it('coloca el nombre de Valparaíso a la izquierda del pin', () => {
    const valpo = resolveSedeGeo('Valparaíso');
    const felipe = resolveSedeGeo('San Felipe');
    const antonio = resolveSedeGeo('San Antonio');
    expect(valpo && felipe && antonio).toBeTruthy();
    const placed = layoutSedeLabels(
      [
        { id: valpo!.id, x: valpo!.x, y: valpo!.y, label: valpo!.label },
        { id: felipe!.id, x: felipe!.x, y: felipe!.y, label: felipe!.label },
        { id: antonio!.id, x: antonio!.x, y: antonio!.y, label: antonio!.label },
      ],
      {
        fontSize: 1.2,
        radius: 0.5,
        regionId: VALPARAISO_REGION_ID,
      },
    );
    const label = placed.find((item) => item.pinId === 'valparaiso');
    expect(label?.textAnchor).toBe('end');
    expect(label!.x).toBeLessThan(valpo!.x);
  });

  it('coloca Viña arriba-izquierda lejos, Valparaíso solo izquierda y San Antonio abajo-izquierda', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'V1', sedes: ['Viña del Mar'] },
      { nombre: 'V2', sedes: ['Viña del Mar'] },
      { nombre: 'VP1', sedes: ['Valparaíso'] },
      { nombre: 'VP2', sedes: ['Valparaíso'] },
      { nombre: 'VP3', sedes: ['Valparaíso'] },
      { nombre: 'VP4', sedes: ['Valparaíso'] },
      { nombre: 'VP5', sedes: ['Valparaíso'] },
      { nombre: 'VP6', sedes: ['Valparaíso'] },
      { nombre: 'SF1', sedes: ['San Felipe'] },
      { nombre: 'SA1', sedes: ['San Antonio'] },
    ]);
    const mapRect = { left: 200, top: 100, width: 200, height: 220 };
    const positions = {
      'vina-del-mar': { x: 230, y: 160 },
      valparaiso: { x: 235, y: 200 },
      'san-felipe': { x: 360, y: 180 },
      'san-antonio': { x: 250, y: 280 },
    };
    const placed = layoutFloatingMapCards({
      pins,
      positions,
      width: 700,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: VALPARAISO_REGION_ID,
    });
    const vinaCards = placed.filter((c) => c.pinId === 'vina-del-mar');
    const valpoCards = placed.filter((c) => c.pinId === 'valparaiso');
    const vina = vinaCards[0]!;
    const valpo = valpoCards[0]!;
    const felipe = placed.find((c) => c.pinId === 'san-felipe')!;
    const antonio = placed.find((c) => c.pinId === 'san-antonio')!;

    expect(vina.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(vina.top + 70).toBeLessThanOrEqual(mapRect.top);
    expect(valpo.left + 80).toBeLessThanOrEqual(mapRect.left);
    const valpoMidY =
      Math.min(...valpoCards.map((c) => c.top)) +
      (Math.max(...valpoCards.map((c) => c.top + 70)) -
        Math.min(...valpoCards.map((c) => c.top))) /
        2;
    expect(Math.abs(valpoMidY - positions.valparaiso.y)).toBeLessThan(8);
    expect(vina.top).toBeLessThan(valpo.top);
    expect(felipe.left).toBeGreaterThanOrEqual(mapRect.left + mapRect.width);
    expect(antonio.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(antonio.top).toBeGreaterThanOrEqual(mapRect.top + mapRect.height);

    const overlay = layoutOverlaySedeLabelsNearCards({
      pins: [
        { id: 'vina-del-mar', label: 'Sede Viña del Mar' },
        { id: 'valparaiso', label: 'Sede Valparaíso' },
      ].filter((p) => usesOverlaySedeLabel(VALPARAISO_REGION_ID, p.id)),
      positions,
      cards: placed,
      cardWidth: 80,
      cardHeight: 70,
      regionId: VALPARAISO_REGION_ID,
    });
    expect(overlay).toHaveLength(1);
    expect(overlay[0]!.pinId).toBe('vina-del-mar');
    expect(overlay[0]!.top).toBeGreaterThanOrEqual(vina.top);
  });
});

describe('Emprendedor/a Externo por comuna', () => {
  it('crea un pin por comuna y no trata Emprendedor como campus AIEP', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'p1',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Valparaíso', 'Quilpué'],
      },
    ]);
    expect(pins).toHaveLength(2);
    expect(pins.every((pin) => pin.kind === 'comuna')).toBe(true);
    expect(pins.map((pin) => pin.label).sort()).toEqual([
      'Quilpué',
      'Valparaíso',
    ]);
    expect(pins.every((pin) => pin.nombres.length === 1 && pin.nombres[0] === 'ExtApp')).toBe(
      true,
    );
    expect(resolveSedeGeo(VITRINA_SEDE_EMPRENDEDOR_EXTERNO)).toBeNull();
  });

  it('agrupa varios proyectos de la misma comuna en un solo pin', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'a',
        nombre: 'Alpha',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Punta Arenas'],
      },
      {
        id: 'b',
        nombre: 'Beta',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Punta Arenas'],
      },
    ]);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({
      kind: 'comuna',
      label: 'Punta Arenas',
      regionId: 12,
    });
    expect(pins[0]?.nombres).toEqual(['Alpha', 'Beta']);
  });

  it('cuenta proyectos únicos en el pin nacional aunque haya varias comunas', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'multi',
        nombre: 'MultiComuna',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Valparaíso', 'Quilpué'],
      },
      {
        id: 'campus',
        nombre: 'ClinicApp',
        sedes: ['Valparaíso'],
      },
    ]);
    const regions = groupVitrinaProyectosByRegion(pins);
    const valpo = regions.find((r) => r.regionId === VALPARAISO_REGION_ID);
    expect(valpo?.count).toBe(2);
  });

  it('suma Magallanes solo con Emprendedor externo', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'mag',
        nombre: 'SurApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Punta Arenas'],
      },
    ]);
    const regions = groupVitrinaProyectosByRegion(pins);
    expect(regions).toEqual([
      expect.objectContaining({ regionId: 12, count: 1 }),
    ]);
  });

  it('etiqueta comunas sin prefijo Sede', () => {
    expect(
      mapPinLabelParts({ label: 'Punta Arenas', kind: 'comuna' }),
    ).toEqual({ top: '', bottom: 'Punta Arenas' });
    expect(
      mapPinLabelParts({ label: 'Sede Valparaíso', kind: 'sede' }),
    ).toEqual({ top: 'Sede', bottom: 'Valparaíso' });
    expect(COMUNA_MAP_PIN_FILL).toBe('#c2410c');
    expect(EMPRENDEDOR_EXTERNO_MAP_BADGE).toBe(VITRINA_SEDE_EMPRENDEDOR_EXTERNO);
  });

  it('clasifica el pin a izquierda o derecha del mapa', () => {
    const map = { left: 200, width: 240 };
    expect(mapPinColumnSide(250, map)).toBe('left');
    expect(mapPinColumnSide(400, map)).toBe('right');
  });

  it('elige el borde del mapa más cercano incluyendo norte y sur', () => {
    const map = { left: 200, top: 80, width: 240, height: 320 };
    expect(mapPinNearestSide({ x: 250, y: 240 }, map)).toBe('w');
    expect(mapPinNearestSide({ x: 400, y: 240 }, map)).toBe('e');
    expect(mapPinNearestSide({ x: 320, y: 100 }, map)).toBe('n');
    expect(mapPinNearestSide({ x: 320, y: 360 }, map)).toBe('s');
    expect(
      mapPinNearestSide({ x: 50, y: 50 }, { left: 0, top: 0, width: 100, height: 100 }),
    ).toBe('s');
  });

  const mapRect = { left: 200, top: 80, width: 240, height: 320 };

  it('apila la comuna debajo del grupo de Talca si el pin está más abajo', () => {
    const talca = groupVitrinaProyectosBySede([
      { id: 't', nombre: 'CampusTalca', sedes: ['Talca'] },
    ])[0]!;
    const curico = groupVitrinaProyectosBySede([
      { id: 'c', nombre: 'CampusCurico', sedes: ['Curicó'] },
    ])[0]!;
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const positions = {
      [talca.id]: { x: 280, y: 180 },
      [curico.id]: { x: 420, y: 160 },
      [comunaPin.id]: { x: 250, y: 300 },
    };
    const cards = layoutFloatingMapCards({
      pins: [talca, curico, comunaPin],
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: 7,
    });
    const talcaCards = cards.filter((c) => c.pinId === talca.id);
    const comunaCards = cards.filter((c) => c.kind === 'comuna');
    const talcaBottom = Math.max(...talcaCards.map((c) => c.top + 70));
    expect(comunaCards).toHaveLength(1);
    expect(comunaCards[0]!.top).toBeGreaterThanOrEqual(talcaBottom + 20);
    expect(comunaCards[0]!.left).toBeGreaterThanOrEqual(talcaCards[0]!.left);
    expect(comunaCards[0]!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(comunaCards[0]?.zone).toBe('w');
  });

  it('apila la comuna encima de Talca si el pin está más arriba', () => {
    const talca = groupVitrinaProyectosBySede([
      { id: 't', nombre: 'CampusTalca', sedes: ['Talca'] },
    ])[0]!;
    const curico = groupVitrinaProyectosBySede([
      { id: 'c', nombre: 'CampusCurico', sedes: ['Curicó'] },
    ])[0]!;
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const positions = {
      [talca.id]: { x: 280, y: 260 },
      [curico.id]: { x: 420, y: 160 },
      [comunaPin.id]: { x: 250, y: 140 },
    };
    const cards = layoutFloatingMapCards({
      pins: [talca, curico, comunaPin],
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: 7,
    });
    const talcaCards = cards.filter((c) => c.pinId === talca.id);
    const comunaCards = cards.filter((c) => c.kind === 'comuna');
    const talcaTop = Math.min(...talcaCards.map((c) => c.top));
    expect(comunaCards[0]!.top + 70).toBeLessThanOrEqual(talcaTop);
    expect(comunaCards[0]!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(comunaCards[0]?.zone).toBe('w');
  });

  it('si no hay sede a la izquierda igual usa esa columna', () => {
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const cards = layoutFloatingMapCards({
      pins: [comunaPin],
      positions: { [comunaPin.id]: { x: 250, y: 240 } },
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    expect(cards[0]!.left + 80).toBeLessThanOrEqual(mapRect.left);
    expect(cards[0]?.zone).toBe('w');
  });

  it('en el lado derecho queda fuera del mapa, bajo el grupo de sede', () => {
    const curico = groupVitrinaProyectosBySede([
      { id: 'c', nombre: 'CampusCurico', sedes: ['Curicó'] },
    ])[0]!;
    const talca = groupVitrinaProyectosBySede([
      { id: 't', nombre: 'CampusTalca', sedes: ['Talca'] },
    ])[0]!;
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Teno'],
      },
    ])[0]!;
    const positions = {
      [talca.id]: { x: 250, y: 180 },
      [curico.id]: { x: 420, y: 160 },
      [comunaPin.id]: { x: 400, y: 300 },
    };
    const cards = layoutFloatingMapCards({
      pins: [talca, curico, comunaPin],
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: 7,
    });
    const comunaCards = cards.filter((c) => c.kind === 'comuna');
    const curicoCards = cards.filter((c) => c.pinId === curico.id);
    const curicoBottom = Math.max(...curicoCards.map((c) => c.top + 70));
    expect(comunaCards[0]!.left).toBeGreaterThanOrEqual(
      mapRect.left + mapRect.width,
    );
    expect(comunaCards[0]!.top).toBeGreaterThanOrEqual(curicoBottom);
    expect(comunaCards[0]?.zone).toBe('e');
  });



  it('apila varios proyectos de la misma comuna en el mismo eje', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'a',
        nombre: 'Alpha',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Teno'],
      },
      {
        id: 'b',
        nombre: 'Beta',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Teno'],
      },
    ]);
    expect(pins).toHaveLength(1);
    const cards = layoutFloatingMapCards({
      pins,
      positions: { [pins[0]!.id]: { x: 250, y: 240 } },
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    expect(cards).toHaveLength(2);
    expect(new Set(cards.map((c) => c.zone)).size).toBe(1);
    expect(cards.every((c) => c.kind === 'comuna')).toBe(true);
  });

  it('apila dos comunas del mismo lado en orden de altura', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'a',
        nombre: 'Alpha',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
      {
        id: 'b',
        nombre: 'Beta',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Teno'],
      },
    ]);
    expect(pins).toHaveLength(2);
    const sagradaId = pins.find((p) => p.label === 'Sagrada Familia')!.id;
    const tenoId = pins.find((p) => p.label === 'Teno')!.id;
    const cards = layoutFloatingMapCards({
      pins,
      positions: {
        [sagradaId]: { x: 240, y: 180 },
        [tenoId]: { x: 260, y: 320 },
      },
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      groupGap: 28,
      regionId: 7,
    });
    const sagrada = cards.filter((c) => c.pinId === sagradaId);
    const teno = cards.filter((c) => c.pinId === tenoId);
    expect(sagrada[0]!.top).toBeLessThan(teno[0]!.top);
    expect(sagrada[0]?.zone).toBe('w');
    expect(teno[0]?.zone).toBe('w');
  });

  it('si el pin está más cerca del borde inferior coloca la comuna abajo y fuera del mapa', () => {
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const cards = layoutFloatingMapCards({
      pins: [comunaPin],
      positions: { [comunaPin.id]: { x: 320, y: 360 } },
      width: 640,
      height: 560,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    const captionH = COMUNA_CARD_CAPTION_LINE_PX * 2 + 4;
    expect(cards[0]?.zone).toBe('s');
    expect(cards[0]!.top - captionH).toBeGreaterThanOrEqual(
      mapRect.top + mapRect.height,
    );
    expect(cards[0]!.left).toBeGreaterThanOrEqual(mapRect.left);
    expect(cards[0]!.left + 80).toBeLessThanOrEqual(
      mapRect.left + mapRect.width,
    );
  });

  it('si el pin está más cerca del borde superior coloca la comuna arriba y fuera del mapa', () => {
    const comunaPin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const cards = layoutFloatingMapCards({
      pins: [comunaPin],
      positions: { [comunaPin.id]: { x: 320, y: 100 } },
      width: 640,
      height: 560,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    expect(cards[0]?.zone).toBe('n');
    expect(cards[0]!.top + 70).toBeLessThanOrEqual(mapRect.top);
    expect(cards[0]!.left).toBeGreaterThanOrEqual(mapRect.left);
    expect(cards[0]!.left + 80).toBeLessThanOrEqual(
      mapRect.left + mapRect.width,
    );
  });



  it('traza una línea del stack al pin de la comuna', () => {
    const pin = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Sagrada Familia'],
      },
    ])[0]!;
    const positions = { [pin.id]: { x: 250, y: 240 } };
    const cards = layoutFloatingMapCards({
      pins: [pin],
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    const lines = layoutComunaCardLines({
      pins: [pin],
      positions,
      cards,
      cardWidth: 80,
      cardHeight: 70,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.pinId).toBe(pin.id);
    expect(lines[0]?.lineTo).toEqual(positions[pin.id]);
    const card = cards[0]!;
    const box = {
      left: card.left,
      top: card.top,
      right: card.left + 80,
      bottom: card.top + 70,
    };
    const from = lines[0]!.lineFrom;
    const onEdge =
      Math.abs(from.x - box.left) < 1.5 ||
      Math.abs(from.x - box.right) < 1.5 ||
      Math.abs(from.y - box.top) < 1.5 ||
      Math.abs(from.y - box.bottom) < 1.5;
    expect(onEdge).toBe(true);
  });
});

describe('Sede Online por comuna', () => {
  it('crea pin Online y pins de comuna morados, sin tratar Online como campus', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'p1',
        nombre: 'VirtualApp',
        sedes: ['Sede Online'],
        comunas: ['Valparaíso', 'Quilpué'],
      },
    ]);
    expect(pins.find((pin) => pin.id === ONLINE_SEDE_ID)?.kind).toBe('sede');
    expect(pins.find((pin) => pin.id === ONLINE_SEDE_ID)?.nombres).toEqual([
      'VirtualApp',
    ]);
    const comunas = pins.filter((pin) => pin.kind === 'online-comuna');
    expect(comunas).toHaveLength(2);
    expect(comunas.every((pin) => pin.id.startsWith('online-comuna-'))).toBe(
      true,
    );
    expect(comunas.map((pin) => pin.label).sort()).toEqual([
      'Quilpué',
      'Valparaíso',
    ]);
    expect(pins.some((pin) => pin.kind === 'comuna')).toBe(false);
  });

  it('no pone pins de comuna si Online comparte otra sede', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'mix',
        nombre: 'MixApp',
        sedes: ['Online', 'Valparaíso'],
        comunas: ['Quilpué'],
      },
    ]);
    expect(pins.some((pin) => isComunaMapPinKind(pin.kind))).toBe(false);
    expect(pins.map((pin) => pin.id).sort()).toEqual(['online', 'valparaiso']);
  });

  it('no pinta Emprendedor como online-comuna', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'e',
        nombre: 'ExtApp',
        sedes: [VITRINA_SEDE_EMPRENDEDOR_EXTERNO],
        comunas: ['Quilpué'],
      },
    ]);
    expect(pins.every((pin) => pin.kind === 'comuna')).toBe(true);
    expect(pins.some((pin) => pin.kind === 'online-comuna')).toBe(false);
  });

  it('suma la región y sigue en el zoom Online', () => {
    const pins = groupVitrinaProyectosBySede([
      {
        id: 'v',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['Quilpué'],
      },
    ]);
    const regions = groupVitrinaProyectosByRegion(pins);
    expect(regions).toEqual([
      expect.objectContaining({ regionId: VALPARAISO_REGION_ID, count: 1 }),
    ]);
    expect(pinsForOnline(pins).map((p) => p.id)).toEqual([ONLINE_SEDE_ID]);
  });

  it('etiqueta online-comuna sin prefijo Sede y usa fill morado', () => {
    expect(
      mapPinLabelParts({ label: 'Quilpué', kind: 'online-comuna' }),
    ).toEqual({ top: '', bottom: 'Quilpué' });
    expect(ONLINE_COMUNA_MAP_PIN_FILL).toBe('#6d28d9');
    expect(SEDE_ONLINE_MAP_BADGE).toBe('Sede Online');
    expect(isComunaMapPinKind('online-comuna')).toBe(true);
    expect(isComunaMapPinKind('comuna')).toBe(true);
    expect(isComunaMapPinKind('sede')).toBe(false);
    expect(mapComunaCardCaption('online-comuna', 'San Joaquín')).toEqual({
      lines: ['Comuna San Joaquín', SEDE_ONLINE_MAP_BADGE],
    });
    expect(mapComunaCardCaption('comuna', 'Quilpué')).toEqual({
      lines: ['Comuna Quilpué', EMPRENDEDOR_EXTERNO_MAP_BADGE],
    });
    expect(mapComunaCardCaption('sede', 'Valparaíso')).toBeNull();
  });

  it('apila y traza línea con kind online-comuna', () => {
    const pin = groupVitrinaProyectosBySede([
      {
        id: 'v',
        nombre: 'VirtualApp',
        sedes: ['Online'],
        comunas: ['Sagrada Familia'],
      },
    ]).find((item) => item.kind === 'online-comuna')!;
    const mapRect = { left: 200, top: 80, width: 240, height: 320 };
    const positions = { [pin.id]: { x: 250, y: 240 } };
    const cards = layoutFloatingMapCards({
      pins: [pin],
      positions,
      width: 640,
      height: 480,
      cardWidth: 80,
      cardHeight: 70,
      mapRect,
      margin: 12,
      regionId: 7,
    });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.kind).toBe('online-comuna');
    const lines = layoutComunaCardLines({
      pins: [pin],
      positions,
      cards,
      cardWidth: 80,
      cardHeight: 70,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.pinId).toBe(pin.id);
  });
});
