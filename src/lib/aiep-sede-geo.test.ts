import { describe, expect, it } from 'vitest';
import {
  groupVitrinaProyectosByRegion,
  groupVitrinaProyectosBySede,
  compassSedeZone,
  formatSedeLabel,
  layoutFloatingMapCards,
  layoutOverlaySedeLabelsNearCards,
  layoutSedeLabels,
  LOS_LAGOS_REGION_ID,
  METROPOLITANA_REGION_ID,
  metropolitanSedeZone,
  nationalPinRadius,
  OHIGGINS_REGION_ID,
  pinRadius,
  pinsForRegion,
  resolveSedeGeo,
  sedeLabelParts,
  usesCompassMapLayout,
  usesOverlaySedeLabel,
  VALPARAISO_REGION_ID,
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

  it('pone Santiago Norte en el eje arriba y con padding respecto a Bellavista', () => {
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
    const mapRect = { left: 160, top: 110, width: 180, height: 180 };
    const placed = layoutFloatingMapCards({
      pins,
      positions: {
        'santiago-norte': { x: 250, y: 140 },
        bellavista: { x: 310, y: 180 },
      },
      width: 520,
      height: 420,
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
    const bellaTop = Math.min(...bella.map((c) => c.top));
    expect(norteBottom).toBeLessThanOrEqual(mapRect.top);
    expect(bellaTop - norteBottom).toBeGreaterThanOrEqual(groupGap);

    const mapMidX = mapRect.left + mapRect.width / 2;
    const norteLeft = Math.min(...norte.map((c) => c.left));
    const norteRight = Math.max(...norte.map((c) => c.left + 80));
    const norteCenter = (norteLeft + norteRight) / 2;
    expect(Math.abs(norteCenter - mapMidX)).toBeLessThan(40);
  });

  it('pone etiquetas overlay justo antes de cada grupo de tarjetas', () => {
    const pins = groupVitrinaProyectosBySede([
      { nombre: 'N1', sedes: ['Santiago Norte'] },
      { nombre: 'B1', sedes: ['Bellavista'] },
      { nombre: 'B2', sedes: ['Bellavista'] },
      { nombre: 'SF1', sedes: ['San Bernardo'] },
      { nombre: 'M1', sedes: ['Maipú'] },
      { nombre: 'M2', sedes: ['Maipú'] },
    ]);
    const mapRect = { left: 200, top: 120, width: 180, height: 180 };
    const positions = {
      'santiago-norte': { x: 290, y: 150 },
      bellavista: { x: 360, y: 200 },
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
    expect(by('santiago-norte').top).toBeGreaterThanOrEqual(norte.bottom);
    // Línea llega al borde del label hacia el mapa (no atraviesa el texto).
    expect(by('santiago-norte').lineFrom.y).toBeGreaterThanOrEqual(
      by('santiago-norte').top + by('santiago-norte').height - 1,
    );
    const bella = clusterBox('bellavista');
    expect(by('bellavista').left + by('bellavista').width).toBeLessThanOrEqual(
      bella.left,
    );
    expect(by('bellavista').lineFrom.x).toBeLessThanOrEqual(
      by('bellavista').left + 1,
    );
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
