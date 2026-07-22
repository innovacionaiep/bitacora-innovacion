'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import * as Config from '@/lib/actions/configuracion';
import { Plus, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';

type CatalogKind =
  | 'sede'
  | 'comuna'
  | 'escuela'
  | 'carrera'
  | 'asignatura'
  | 'grupo'
  | 'fondo'
  | 'linea';

export default function ConfiguracionValidacionPage() {
  const [sedes, setSedes] = useState<
    Awaited<ReturnType<typeof Config.getSedes>>
  >([]);
  const [comunas, setComunas] = useState<
    Awaited<ReturnType<typeof Config.getComunas>>
  >([]);
  const [escuelas, setEscuelas] = useState<
    Awaited<ReturnType<typeof Config.getEscuelas>>
  >([]);
  const [carreras, setCarreras] = useState<
    Awaited<ReturnType<typeof Config.getCarreras>>
  >([]);
  const [asignaturas, setAsignaturas] = useState<
    Awaited<ReturnType<typeof Config.getAsignaturas>>
  >([]);
  const [grupos, setGrupos] = useState<
    Awaited<ReturnType<typeof Config.getGruposInteres>>
  >([]);
  const [fondos, setFondos] = useState<
    Awaited<ReturnType<typeof Config.getFondos>>
  >([]);
  const [lineas, setLineas] = useState<
    Awaited<ReturnType<typeof Config.getLineas>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [catalog, setCatalog] = useState<CatalogKind>('sede');
  const [editId, setEditId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formOrden, setFormOrden] = useState(0);
  const [formRegion, setFormRegion] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formEscuelaId, setFormEscuelaId] = useState<string | null>(null);
  const [formFondoId, setFormFondoId] = useState('');
  const [saving, setSaving] = useState(false);
  const [backfillingSedes, setBackfillingSedes] = useState(false);
  const [backfillingFondos, setBackfillingFondos] = useState(false);
  const [uploadingCarrerasXlsx, setUploadingCarrerasXlsx] = useState(false);
  const [importCarrerasResult, setImportCarrerasResult] = useState<string | null>(null);
  const fileInputCarrerasRef = useRef<HTMLInputElement>(null);
  const [uploadingAsignaturasXlsx, setUploadingAsignaturasXlsx] = useState(false);
  const [importAsignaturasResult, setImportAsignaturasResult] = useState<string | null>(null);
  const fileInputAsignaturasRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c, e, car, asg, g, f, lin] = await Promise.all([
        Config.getSedes(),
        Config.getComunas(),
        Config.getEscuelas(),
        Config.getCarreras(),
        Config.getAsignaturas(),
        Config.getGruposInteres(),
        Config.getFondos(),
        Config.getLineas(),
      ]);
      setSedes(s);
      setComunas(c);
      setEscuelas(e);
      setCarreras(car);
      setAsignaturas(asg);
      setGrupos(g);
      setFondos(f);
      setLineas(lin);
    } catch (err) {
      setError('Error al cargar datos');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAdd = (cat: CatalogKind) => {
    setCatalog(cat);
    setSheetMode('add');
    setEditId(null);
    setFormNombre('');
    setFormOrden(0);
    setFormRegion('');
    setFormCodigo('');
    setFormDescripcion('');
    setFormEscuelaId(null);
    setFormFondoId('');
    setSheetOpen(true);
    setError(null);
  };

  const openEdit = (
    cat: CatalogKind,
    id: string,
    row: Record<string, unknown>
  ) => {
    setCatalog(cat);
    setSheetMode('edit');
    setEditId(id);
    setFormNombre((row.nombre as string) ?? '');
    setFormOrden((row.orden as number) ?? 0);
    setFormRegion((row.region as string) ?? '');
    setFormCodigo((row.codigo as string) ?? '');
    setFormDescripcion((row.descripcion as string) ?? '');
    setFormEscuelaId(cat === 'carrera' ? null : ((row.escuelaId as string) ?? null));
    setFormFondoId((row.fondoId as string) ?? '');
    setSheetOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formNombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    let res: { success: boolean; error?: string } = { success: false };
    switch (catalog) {
      case 'sede':
        if (sheetMode === 'add')
          res = await Config.createSede(formNombre, formOrden);
        else if (editId)
          res = await Config.updateSede(editId, formNombre, formOrden);
        break;
      case 'comuna':
        if (!formRegion.trim()) {
          setError('La región es obligatoria');
          setSaving(false);
          return;
        }
        if (sheetMode === 'add')
          res = await Config.createComuna(formNombre, formRegion);
        else if (editId)
          res = await Config.updateComuna(editId, formNombre, formRegion);
        break;
      case 'escuela':
        if (!formCodigo.trim()) {
          setError('El código es obligatorio');
          setSaving(false);
          return;
        }
        if (sheetMode === 'add')
          res = await Config.createEscuela(formNombre, formCodigo);
        else if (editId)
          res = await Config.updateEscuela(editId, formNombre, formCodigo);
        break;
      case 'carrera':
        if (sheetMode === 'add')
          res = await Config.createCarrera(formNombre);
        else if (editId)
          res = await Config.updateCarrera(editId, formNombre);
        break;
      case 'asignatura':
        if (sheetMode === 'add')
          res = await Config.createAsignatura(formNombre);
        else if (editId)
          res = await Config.updateAsignatura(editId, formNombre);
        break;
      case 'grupo':
        if (sheetMode === 'add')
          res = await Config.createGrupoInteres(formNombre, formDescripcion);
        else if (editId)
          res = await Config.updateGrupoInteres(
            editId,
            formNombre,
            formDescripcion
          );
        break;
      case 'fondo':
        if (sheetMode === 'add')
          res = await Config.createFondo(formNombre, formOrden);
        else if (editId)
          res = await Config.updateFondo(editId, formNombre, formOrden);
        break;
      case 'linea':
        if (!formFondoId.trim()) {
          setError('El fondo es obligatorio');
          setSaving(false);
          return;
        }
        if (sheetMode === 'add')
          res = await Config.createLinea(formNombre, formFondoId, formOrden);
        else if (editId)
          res = await Config.updateLinea(
            editId,
            formNombre,
            formFondoId,
            formOrden
          );
        break;
    }
    if (res.success) {
      setSheetOpen(false);
      loadAll();
    } else {
      setError(res.error ?? 'Error');
    }
    setSaving(false);
  };

  const handleCarrerasXlsxChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportCarrerasResult(null);
    setUploadingCarrerasXlsx(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const data = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(data, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        setError('El archivo no contiene hojas.');
        return;
      }
      const ws = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      }) as unknown[][];
      const isHeader =
        rows.length > 1 &&
        String((rows[0]?.[0] ?? '')).trim().toLowerCase() === 'nombre';
      const dataRows = isHeader ? rows.slice(1) : rows;
      const nombres = dataRows
        .map((row) => String((row && row[0]) ?? '').trim())
        .filter(Boolean);
      if (nombres.length === 0) {
        setError('No se encontraron nombres en la primera columna del archivo.');
        return;
      }
      const res = await Config.importCarrerasFromNames(nombres);
      if (res.success) {
        const created = res.created ?? 0;
        const skipped = res.skipped ?? 0;
        if (created > 0 || skipped > 0) {
          setImportCarrerasResult(
            `Se cargaron ${created} carrera(s) nueva(s). ${skipped} ya existían.`
          );
        } else {
          setImportCarrerasResult('No había carreras nuevas que agregar.');
        }
        loadAll();
      } else {
        setError(res.error ?? 'Error al importar');
      }
    } catch (err) {
      console.error(err);
      setError('Error al leer el archivo. Asegúrate de que sea un Excel (.xlsx) válido.');
    } finally {
      setUploadingCarrerasXlsx(false);
      e.target.value = '';
    }
  };

  const handleAsignaturasXlsxChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportAsignaturasResult(null);
    setUploadingAsignaturasXlsx(true);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const data = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(data, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        setError('El archivo no contiene hojas.');
        return;
      }
      const ws = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      }) as unknown[][];
      const isHeader =
        rows.length > 1 &&
        String((rows[0]?.[0] ?? '')).trim().toLowerCase() === 'nombre';
      const dataRows = isHeader ? rows.slice(1) : rows;
      const nombres = dataRows
        .map((row) => String((row && row[0]) ?? '').trim())
        .filter(Boolean);
      if (nombres.length === 0) {
        setError('No se encontraron nombres en la primera columna del archivo.');
        return;
      }
      const res = await Config.importAsignaturasFromNames(nombres);
      if (res.success) {
        const created = res.created ?? 0;
        const skipped = res.skipped ?? 0;
        if (created > 0 || skipped > 0) {
          setImportAsignaturasResult(
            `Se cargaron ${created} asignatura(s) nueva(s). ${skipped} ya existían.`
          );
        } else {
          setImportAsignaturasResult('No había asignaturas nuevas que agregar.');
        }
        loadAll();
      } else {
        setError(res.error ?? 'Error al importar');
      }
    } catch (err) {
      console.error(err);
      setError('Error al leer el archivo. Asegúrate de que sea un Excel (.xlsx) válido.');
    } finally {
      setUploadingAsignaturasXlsx(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (cat: CatalogKind, id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    setError(null);
    let res: { success: boolean; error?: string } = { success: false };
    switch (cat) {
      case 'sede':
        res = await Config.deleteSede(id);
        break;
      case 'comuna':
        res = await Config.deleteComuna(id);
        break;
      case 'escuela':
        res = await Config.deleteEscuela(id);
        break;
      case 'carrera':
        res = await Config.deleteCarrera(id);
        break;
      case 'asignatura':
        res = await Config.deleteAsignatura(id);
        break;
      case 'grupo':
        res = await Config.deleteGrupoInteres(id);
        break;
      case 'fondo':
        res = await Config.deleteFondo(id);
        break;
    }
    if (res.success) loadAll();
    else setError(res.error ?? 'Error');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 p-6">
        <CardTitle>Validación de datos</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Define y edita las opciones de las listas desplegables usadas en
          proyectos.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <Tabs defaultValue="sede" className="w-full">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="sede">Sedes</TabsTrigger>
            <TabsTrigger value="comuna">Comunas</TabsTrigger>
            <TabsTrigger value="escuela">Escuelas</TabsTrigger>
            <TabsTrigger value="carrera">Carreras</TabsTrigger>
            <TabsTrigger value="asignatura">Asignaturas</TabsTrigger>
            <TabsTrigger value="grupo">Grupos de interés</TabsTrigger>
            <TabsTrigger value="fondo">Fondos</TabsTrigger>
            <TabsTrigger value="linea">Líneas</TabsTrigger>
          </TabsList>

          <TabsContent value="sede" className="mt-4">
            <div className="flex justify-end gap-2 mb-2">
              {sedes.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={backfillingSedes}
                  onClick={async () => {
                    setBackfillingSedes(true);
                    setError(null);
                    const res = await Config.backfillSedesFromProyectos();
                    if (res.success) {
                      loadAll();
                      if (res.created && res.created > 0) {
                        setError(null);
                      }
                    } else {
                      setError(res.error ?? 'Error');
                    }
                    setBackfillingSedes(false);
                  }}
                >
                  {backfillingSedes
                    ? 'Cargando...'
                    : 'Cargar sedes desde proyectos'}
                </Button>
              )}
              <Button size="sm" onClick={() => openAdd('sede')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sedes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.nombre}</TableCell>
                    <TableCell>{s.orden}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('sede', s.id, s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('sede', s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="comuna" className="mt-4">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={() => openAdd('comuna')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comunas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell>{c.region}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('comuna', c.id, c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('comuna', c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="escuela" className="mt-4">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={() => openAdd('escuela')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escuelas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.nombre}</TableCell>
                    <TableCell>{e.codigo}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('escuela', e.id, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('escuela', e.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="carrera" className="mt-4">
            <div className="flex justify-end gap-2 mb-2 flex-wrap items-center">
              <input
                ref={fileInputCarrerasRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleCarrerasXlsxChange}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingCarrerasXlsx}
                onClick={() => fileInputCarrerasRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {uploadingCarrerasXlsx ? 'Cargando...' : 'Cargar xlsx'}
              </Button>
              <Button size="sm" onClick={() => openAdd('carrera')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {importCarrerasResult && (
              <p className="text-sm text-green-600 mb-2">{importCarrerasResult}</p>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carreras.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('carrera', c.id, c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('carrera', c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="asignatura" className="mt-4">
            <div className="flex justify-end gap-2 mb-2 flex-wrap items-center">
              <input
                ref={fileInputAsignaturasRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleAsignaturasXlsxChange}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingAsignaturasXlsx}
                onClick={() => fileInputAsignaturasRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {uploadingAsignaturasXlsx ? 'Cargando...' : 'Cargar xlsx'}
              </Button>
              <Button size="sm" onClick={() => openAdd('asignatura')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {importAsignaturasResult && (
              <p className="text-sm text-green-600 mb-2">{importAsignaturasResult}</p>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignaturas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.nombre}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('asignatura', a.id, a)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('asignatura', a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="grupo" className="mt-4">
            <div className="flex justify-end mb-2">
              <Button size="sm" onClick={() => openAdd('grupo')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.nombre}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {g.descripcion ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('grupo', g.id, g)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('grupo', g.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="fondo" className="mt-4">
            <div className="flex justify-end gap-2 mb-2">
              {fondos.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={backfillingFondos}
                  onClick={async () => {
                    setBackfillingFondos(true);
                    setError(null);
                    const res = await Config.backfillFondosFromProyectos();
                    if (res.success) {
                      loadAll();
                    } else {
                      setError(res.error ?? 'Error');
                    }
                    setBackfillingFondos(false);
                  }}
                >
                  {backfillingFondos
                    ? 'Cargando...'
                    : 'Cargar fondos por defecto'}
                </Button>
              )}
              <Button size="sm" onClick={() => openAdd('fondo')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fondos.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.nombre}</TableCell>
                    <TableCell>{f.orden}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('fondo', f.id, f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('fondo', f.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="linea" className="mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                onClick={() => openAdd('linea')}
                disabled={fondos.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            {fondos.length === 0 && (
              <p className="text-sm text-muted-foreground mb-3">
                Primero crea al menos un fondo para poder agregar líneas.
              </p>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fondo</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.nombre}</TableCell>
                    <TableCell>{l.fondo.nombre}</TableCell>
                    <TableCell>{l.orden}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openEdit('linea', l.id, {
                            nombre: l.nombre,
                            orden: l.orden,
                            fondoId: l.fondoId,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheet Add/Edit */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'add' ? 'Agregar' : 'Editar'}{' '}
              {catalog === 'sede' && 'Sede'}
              {catalog === 'comuna' && 'Comuna'}
              {catalog === 'escuela' && 'Escuela'}
              {catalog === 'carrera' && 'Carrera'}
              {catalog === 'asignatura' && 'Asignatura'}
              {catalog === 'grupo' && 'Grupo de interés'}
              {catalog === 'fondo' && 'Fondo'}
              {catalog === 'linea' && 'Línea'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {(catalog === 'sede' ||
              catalog === 'comuna' ||
              catalog === 'escuela' ||
              catalog === 'carrera' ||
              catalog === 'asignatura' ||
              catalog === 'grupo' ||
              catalog === 'fondo' ||
              catalog === 'linea') && (
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
            )}
            {catalog === 'linea' && (
              <div className="space-y-2">
                <Label>Fondo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formFondoId}
                  onChange={(e) => setFormFondoId(e.target.value)}
                >
                  <option value="">Seleccionar fondo</option>
                  {fondos.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(catalog === 'sede' ||
              catalog === 'fondo' ||
              catalog === 'linea') && (
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formOrden}
                  onChange={(e) =>
                    setFormOrden(parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
            )}
            {catalog === 'comuna' && (
              <div className="space-y-2">
                <Label>Región</Label>
                <Input
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                  placeholder="Región"
                />
              </div>
            )}
            {catalog === 'escuela' && (
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Código (ej. TEC)"
                />
              </div>
            )}
            {catalog === 'grupo' && (
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Descripción"
                />
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
