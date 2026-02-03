/**
 * Seed de presupuesto: asigna gastos ficticios a todos los proyectos.
 * - Presupuesto máximo por proyecto: $2.000.000
 * - Cada gasto: entre $100.000 y $500.000
 * - Cuentas: RRHH (honorarios), Operación (servicios/insumos), Inversión (equipos/maquinarias)
 * - Actualiza presupuestoTotal y presupuestoUsado en Proyecto para coherencia con dashboard y barras de avance.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRESUPUESTO_MAX = 2_000_000;
const MONTO_MIN = 100_000;
const MONTO_MAX = 500_000;

const CUENTAS = ['RRHH', 'OPERACION', 'INVERSION'] as const;
const ESTADOS = ['PENDIENTE', 'SOLICITADO', 'EN_PEDIDO', 'EJECUTADO_OK'] as const;

const ITEMS_RRHH = [
  'Honorarios consultoría',
  'Honorarios diseño',
  'Honorarios coordinación',
  'Honorarios profesional externo',
  'Honorarios asesoría técnica',
];
const ITEMS_OPERACION = [
  'Servicio de impresión',
  'Insumos de oficina',
  'Alquiler de equipos',
  'Servicio de transporte',
  'Material didáctico',
  'Insumos de taller',
];
const ITEMS_INVERSION = [
  'Equipo computación',
  'Maquinaria de taller',
  'Equipo audiovisual',
  'Mobiliario',
  'Equipo de medición',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Seed presupuesto: gastos ficticios por proyecto...\n');

  const proyectos = await prisma.proyecto.findMany({ orderBy: { createdAt: 'asc' } });
  if (proyectos.length === 0) {
    console.log('⚠️ No hay proyectos en la base de datos.');
    return;
  }

  for (const proyecto of proyectos) {
    await prisma.itemPresupuesto.deleteMany({ where: { proyectoId: proyecto.id } });

    const targetTotal = randomInt(1_200_000, PRESUPUESTO_MAX);
    let acum = 0;
    const items: Array<{
      cuenta: (typeof CUENTAS)[number];
      item: string;
      detalle: string | null;
      monto: number;
      estado: (typeof ESTADOS)[number];
      orden: number;
    }> = [];
    let orden = 0;

    while (acum < targetTotal) {
      const restante = targetTotal - acum;
      if (restante < MONTO_MIN) break;
      const maxMonto = Math.min(MONTO_MAX, restante);
      const monto = maxMonto <= MONTO_MIN ? restante : randomInt(MONTO_MIN, maxMonto);
      const cuenta = pick(CUENTAS);
      const estado = pick(ESTADOS);

      let item: string;
      let detalle: string | null = null;
      if (cuenta === 'RRHH') {
        item = pick(ITEMS_RRHH);
        detalle = 'Pago a honorarios según contrato';
      } else if (cuenta === 'OPERACION') {
        item = pick(ITEMS_OPERACION);
        detalle = 'Servicio o insumo para ejecución del proyecto';
      } else {
        item = pick(ITEMS_INVERSION);
        detalle = 'Equipo o maquinaria para el proyecto';
      }

      items.push({ cuenta, item, detalle, monto, estado, orden: orden++ });
      acum += monto;
    }

    let presupuestoUsado = 0;
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (row.estado === 'EJECUTADO_OK') presupuestoUsado += row.monto;
      await prisma.itemPresupuesto.create({
        data: {
          proyectoId: proyecto.id,
          cuenta: row.cuenta,
          item: row.item,
          detalle: row.detalle,
          monto: row.monto,
          estado: row.estado,
          orden: row.orden,
          ...(row.estado === 'EJECUTADO_OK' && {
            idSolicitud: String(randomInt(100000, 999999)),
            idPedido: String(randomInt(100000, 999999)),
            idRecepcion: String(randomInt(100000, 999999)),
          }),
        },
      });
    }

    const totalAsignado = items.reduce((s, r) => s + r.monto, 0);
    await prisma.proyecto.update({
      where: { id: proyecto.id },
      data: {
        presupuestoTotal: PRESUPUESTO_MAX,
        presupuestoUsado,
      },
    });

    console.log(
      `  ✓ ${proyecto.proyecto.slice(0, 40)}... | ítems: ${items.length} | total asignado: $${totalAsignado.toLocaleString('es-CL')} | usado (EJECUTADO_OK): $${presupuestoUsado.toLocaleString('es-CL')}`
    );
  }

  console.log('\n✅ Seed presupuesto completado. Barras de avance coherentes con presupuestoUsado/presupuestoTotal.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
