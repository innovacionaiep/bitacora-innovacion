'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CardTitle } from '@/components/ui/card';
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
import { parseCatalogNamesFromSheetRows } from '@/lib/catalog-import-names';
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type CatalogKind =
  | 'sede'
  | 'comuna'
  | 'escuela'
  | 'carrera'
  | 'asignatura'
  | 'grupo'
  | 'fondo'
  | 'linea'
  | 'etiqueta';

type ValidacionTab = Exclude<CatalogKind, 'linea'>;

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
  const [etiquetas, setEtiquetas] = useState<
    Awaited<ReturnType<typeof Config.getEtiquetas>>
  >([]);
  const [activeTab, setActiveTab] = useState<ValidacionTab>('sede');
  const [loadedTabs, setLoadedTabs] = useState<Set<ValidacionTab>>(
    () => new Set()
  );
  const [tabLoading, setTabLoading] = useState(false);
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
  const [uploadingEtiquetasXlsx, setUploadingEtiquetasXlsx] = useState(false);
  const [importEtiquetasResult, setImportEtiquetasResult] = useState<string | null>(null);
  const fileInputEtiquetasRef = useRef<HTMLInputElement>(null);
  const [expandedFondos, setExpandedFondos] = useState<Set<string>>(new Set());

  const lineasByFondoId = useMemo(() => {
    const map = new Map<string, typeof lineas>();
    for (const l of lineas) {
      const list = map.get(l.fondoId) ?? [];
      list.push(l);
      map.set(l.fondoId, list);
    }
    return map;
  }, [lineas]);

  const toggleFondo = (fondoId: string) => {
    setExpandedFondos((prev) => {
      const next = new Set(prev);
      if (next.has(fondoId)) next.delete(fondoId);
      else next.add(fondoId);
      return next;
    });
  };

  const catalogTab = (cat: CatalogKind): ValidacionTab =>
    cat === 'linea' ? 'fondo' : cat;

  const loadCatalog = async (tab: ValidacionTab) => {
    setTabLoading(true);
    try {
      switch (tab) {
        case 'sede':
          setSedes(await Config.getSedes());
          break;
        case 'comuna':
          setComunas(await Config.getComunas());
          break;
        case 'escuela':
          setEscuelas(await Config.getEscuelas());
          break;
        case 'carrera':
          setCarreras(await Config.getCarreras());
          break;
        case 'asignatura':
          setAsignaturas(await Config.getAsignaturas());
          break;
        case 'grupo':
          setGrupos(await Config.getGruposInteres());
          break;
        case 'fondo': {
          const [f, lin] = await Promise.all([
            Config.getFondos(),
            Config.getLineas(),
          ]);
          setFondos(f);
          setLineas(lin);
          setExpandedFondos(new Set(f.map((fondo) => fondo.id)));
          break;
        }
        case 'etiqueta':
          setEtiquetas(await Config.getEtiquetas());
          break;
      }
      setLoadedTabs((prev) => new Set(prev).add(tab));
    } catch {
      setError('Error al cargar datos');
    }
    setTabLoading(false);
  };

  useEffect(() => {
    if (!loadedTabs.has(activeTab)) {
      void loadCatalog(activeTab);
    }
  }, [activeTab]);

  const tabContentLoading = tabLoading && !loadedTabs.has(activeTab);

  const renderTabLoading = () => (
    <div className="py-8 text-center text-muted-foreground">Cargando...</div>
  );

  const openAdd = (cat: CatalogKind, opts?: { fondoId?: string }) => {
    setCatalog(cat);
    setSheetMode('add');
    setEditId(null);
    setFormNombre('');
    setFormOrden(0);
    setFormRegion('');
    setFormCodigo('');
    setFormDescripcion('');
    setFormEscuelaId(null);
    setFormFondoId(opts?.fondoId ?? '');
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
      case 'etiqueta':
        if (sheetMode === 'add')
          res = await Config.createEtiqueta(formNombre);
        else if (editId)
          res = await Config.updateEtiqueta(editId, formNombre);
        break;
    }
    if (res.success) {
      setSheetOpen(false);
      void loadCatalog(catalogTab(catalog));
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
      const nombres = parseCatalogNamesFromSheetRows(rows);
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
        void loadCatalog('carrera');
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
      const nombres = parseCatalogNamesFromSheetRows(rows);
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
        void loadCatalog('asignatura');
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

  const handleEtiquetasXlsxChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportEtiquetasResult(null);
    setUploadingEtiquetasXlsx(true);
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
      const nombres = parseCatalogNamesFromSheetRows(rows);
      if (nombres.length === 0) {
        setError('No se encontraron nombres en la primera columna del archivo.');
        return;
      }
      const res = await Config.importEtiquetasFromNames(nombres);
      if (res.success) {
        const created = res.created ?? 0;
        const skipped = res.skipped ?? 0;
        if (created > 0 || skipped > 0) {
          setImportEtiquetasResult(
            `Se cargaron ${created} etiqueta(s) nueva(s). ${skipped} ya existían.`
          );
        } else {
          setImportEtiquetasResult('No había etiquetas nuevas que agregar.');
        }
        void loadCatalog('etiqueta');
      } else {
        setError(res.error ?? 'Error al importar');
      }
    } catch (err) {
      console.error(err);
      setError('Error al leer el archivo. Asegúrate de que sea un Excel (.xlsx) válido.');
    } finally {
      setUploadingEtiquetasXlsx(false);
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
      case 'etiqueta':
        res = await Config.deleteEtiqueta(id);
        break;
    }
    if (res.success) void loadCatalog(catalogTab(cat));
    else setError(res.error ?? 'Error');
  };

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
        <Tabs
          id="validacion-catalogos"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ValidacionTab)}
          className="w-full"
        >
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="sede">Sedes</TabsTrigger>
            <TabsTrigger value="comuna">Comunas</TabsTrigger>
            <TabsTrigger value="escuela">Escuelas</TabsTrigger>
            <TabsTrigger value="carrera">Carreras</TabsTrigger>
            <TabsTrigger value="asignatura">Asignaturas</TabsTrigger>
            <TabsTrigger value="grupo">Grupos de interés</TabsTrigger>
            <TabsTrigger value="fondo">Fondos</TabsTrigger>
            <TabsTrigger value="etiqueta">Etiquetas</TabsTrigger>
          </TabsList>

          <TabsContent value="sede" className="mt-4">
            {tabContentLoading && activeTab === 'sede' ? (
              renderTabLoading()
            ) : (
            <>
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
                      void loadCatalog('sede');
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
            </>
            )}
          </TabsContent>

          <TabsContent value="comuna" className="mt-4">
            {tabContentLoading && activeTab === 'comuna' ? (
              renderTabLoading()
            ) : (
            <>
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
            </>
            )}
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
            <p className="text-xs text-muted-foreground mb-2">
              Al editar el nombre de una asignatura, el cambio se aplica
              automáticamente en todos los proyectos y participantes que la
              tengan asociada.
            </p>
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
                      void loadCatalog('fondo');
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
                <Plus className="h-4 w-4 mr-1" /> Agregar fondo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Cada fondo agrupa sus líneas. Expande un fondo para ver y gestionar
              las líneas asociadas.
            </p>
            {fondos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay fondos. Crea uno para poder agregar líneas.
              </p>
            ) : (
              <div className="space-y-3">
                {fondos.map((f) => {
                  const lineasDelFondo = lineasByFondoId.get(f.id) ?? [];
                  const expanded = expandedFondos.has(f.id);
                  return (
                    <div
                      key={f.id}
                      className="border border-gray-200 rounded-md overflow-hidden"
                    >
                      <div className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100">
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-between px-3 py-2.5 text-left min-w-0"
                          onClick={() => toggleFondo(f.id)}
                        >
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {f.nombre}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-gray-500 shrink-0 ml-2">
                            Orden {f.orden} · {lineasDelFondo.length} línea
                            {lineasDelFondo.length === 1 ? '' : 's'}
                            {expanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                        <div className="flex items-center pr-1 shrink-0">
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
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t border-gray-200">
                          <div className="flex items-center justify-between px-3 py-2 bg-white">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Líneas
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openAdd('linea', { fondoId: f.id })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar línea
                            </Button>
                          </div>
                          {lineasDelFondo.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-400">
                              Sin líneas en este fondo.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Orden</TableHead>
                                  <TableHead className="w-[80px]">
                                    Acciones
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lineasDelFondo.map((l) => (
                                  <TableRow key={l.id}>
                                    <TableCell>{l.nombre}</TableCell>
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
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="etiqueta" className="mt-4">
            {tabContentLoading && activeTab === 'etiqueta' ? (
              renderTabLoading()
            ) : (
            <>
            <div className="flex justify-end gap-2 mb-2 flex-wrap items-center">
              <input
                ref={fileInputEtiquetasRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleEtiquetasXlsxChange}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadingEtiquetasXlsx}
                onClick={() => fileInputEtiquetasRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {uploadingEtiquetasXlsx ? 'Cargando...' : 'Cargar xlsx'}
              </Button>
              <Button size="sm" onClick={() => openAdd('etiqueta')}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Estas etiquetas se usan en la landing vitrina. No se asignan a
              los proyectos que se gestionan en la app. El Excel debe traer
              los nombres en la primera columna (encabezado opcional:
              Nombre o Etiqueta).
            </p>
            {importEtiquetasResult && (
              <p className="text-sm text-green-600 mb-2">{importEtiquetasResult}</p>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white [&_tr]:bg-white">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {etiquetas.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.nombre}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit('etiqueta', tag.id, tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('etiqueta', tag.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
            )}
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
              {catalog === 'etiqueta' && 'Etiqueta'}
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
              catalog === 'linea' ||
              catalog === 'etiqueta') && (
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
                {sheetMode === 'add' && formFondoId ? (
                  <p className="text-sm text-gray-700 py-2 px-3 rounded-md border border-input bg-muted/40">
                    {fondos.find((f) => f.id === formFondoId)?.nombre ??
                      'Fondo seleccionado'}
                  </p>
                ) : (
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
                )}
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
