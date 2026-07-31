import { readFileSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';

const VBA_REL_TYPE =
  'http://schemas.microsoft.com/office/2006/relationships/vbaProject';
const VBA_CONTENT_TYPE = 'application/vnd.ms-office.vbaProject';
const MACRO_WORKBOOK_TYPE =
  'application/vnd.ms-excel.sheet.macroEnabled.main+xml';
const PLAIN_WORKBOOK_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';

function resolveVbaBinPath(): string {
  return path.join(
    process.cwd(),
    'src',
    'lib',
    'excel-import',
    'assets',
    'vbaProject.bin'
  );
}

/**
 * Convierte un .xlsx (buffer ExcelJS) en .xlsm inyectando vbaProject.bin
 * con Workbook_SheetChange para multi-select (Sedes, Comunas, etc.).
 */
export async function packXlsxAsXlsmWithMacros(
  xlsxBuffer: Buffer
): Promise<Buffer> {
  const vbaBin = readFileSync(resolveVbaBinPath());
  const zip = await JSZip.loadAsync(xlsxBuffer);

  zip.file('xl/vbaProject.bin', vbaBin);

  const ctPath = '[Content_Types].xml';
  let ctXml = await zip.file(ctPath)!.async('string');

  if (!ctXml.includes(`Extension="bin"`)) {
    ctXml = ctXml.replace(
      /<Types([^>]*)>/,
      `<Types$1><Default Extension="bin" ContentType="${VBA_CONTENT_TYPE}"/>`
    );
  }

  if (ctXml.includes(PLAIN_WORKBOOK_TYPE)) {
    ctXml = ctXml.replace(PLAIN_WORKBOOK_TYPE, MACRO_WORKBOOK_TYPE);
  } else if (!ctXml.includes('macroEnabled.main+xml')) {
    ctXml = ctXml.replace(
      /PartName="\/xl\/workbook\.xml"\s+ContentType="[^"]+"/,
      `PartName="/xl/workbook.xml" ContentType="${MACRO_WORKBOOK_TYPE}"`
    );
  }
  zip.file(ctPath, ctXml);

  const relsPath = 'xl/_rels/workbook.xml.rels';
  let relsXml = await zip.file(relsPath)!.async('string');
  if (!relsXml.includes('vbaProject')) {
    const ids = [...relsXml.matchAll(/Id="(rId\d+)"/g)].map((m) => m[1]);
    let max = 0;
    for (const id of ids) {
      const n = Number(id.replace('rId', ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
    const newId = `rId${max + 1}`;
    const rel = `<Relationship Id="${newId}" Type="${VBA_REL_TYPE}" Target="vbaProject.bin"/>`;
    relsXml = relsXml.replace('</Relationships>', `${rel}</Relationships>`);
    zip.file(relsPath, relsXml);
  }

  const wbPath = 'xl/workbook.xml';
  let wbXml = await zip.file(wbPath)!.async('string');
  if (/<workbookPr\b[^>]*>/.test(wbXml)) {
    const pr = wbXml.match(/<workbookPr\b[^>]*>/)?.[0] ?? '';
    if (!/codeName=/.test(pr)) {
      wbXml = wbXml.replace(
        /<workbookPr\b/,
        '<workbookPr codeName="ThisWorkbook"'
      );
    }
  } else {
    wbXml = wbXml.replace(
      /(<workbook\b[^>]*>)/,
      `$1<workbookPr codeName="ThisWorkbook"/>`
    );
  }
  zip.file(wbPath, wbXml);

  const out = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  return Buffer.from(out);
}
