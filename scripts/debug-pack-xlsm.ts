import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  buildImportTemplate,
  packXlsxAsXlsmWithMacros,
} from '../src/lib/excel-import';

async function main() {
  const xlsx = await buildImportTemplate('proyectos', {
    sedes: ['Sede Norte', 'Sede Sur'],
    escuelas: ['Escuela A'],
    carreras: ['Carrera 1'],
    asignaturas: ['Asig 1'],
    comunas: ['Santiago'],
    gruposInteres: ['Grupo 1'],
    sociosComunitarios: [],
    fondos: ['Fondo X'],
    lineas: ['Linea Y'],
    dtColumns: [],
  });
  const xlsm = await packXlsxAsXlsmWithMacros(xlsx);
  const zip = await JSZip.loadAsync(xlsm);
  const ct = await zip.file('[Content_Types].xml')!.async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const wb = await zip.file('xl/workbook.xml')!.async('string');
  console.log('=== CT ===\n', ct);
  console.log('=== RELS ===\n', rels);
  console.log('=== WB head ===\n', wb.slice(0, 800));

  // Also dump original exceljs xlsx CT for compare
  const zx = await JSZip.loadAsync(xlsx);
  console.log('=== ORIG CT ===\n', await zx.file('[Content_Types].xml')!.async('string'));
}

main().catch(console.error);
