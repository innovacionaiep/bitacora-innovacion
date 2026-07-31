import { writeFileSync } from 'fs';
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
  const out = path.join(
    process.cwd(),
    'src/lib/excel-import/assets/test-plantilla-proyectos.xlsm'
  );
  writeFileSync(out, xlsm);
  const zip = await JSZip.loadAsync(xlsm);
  const ct = await zip.file('[Content_Types].xml')?.async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  console.log('has vba:', Boolean(zip.file('xl/vbaProject.bin')));
  console.log('ct macro:', Boolean(ct?.includes('macroEnabled')));
  console.log('rels vba:', Boolean(rels?.includes('vbaProject')));
  console.log('written', out, xlsm.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
