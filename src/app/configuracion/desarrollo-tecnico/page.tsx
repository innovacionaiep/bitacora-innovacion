'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as DT from '@/lib/actions/desarrollo-tecnico-config';
import { IconByName, ICON_NAMES } from '@/components/config/IconByName';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

type CategoriaWithSub = Awaited<ReturnType<typeof DT.getCategoriasWithSubcategorias>>[number];

export default function ConfiguracionDesarrolloTecnicoPage() {
  const [categorias, setCategorias] = useState<CategoriaWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<'cat' | 'sub'>('cat');
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [parentCatId, setParentCatId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formOrden, setFormOrden] = useState(0);
  const [formIcono, setFormIcono] = useState('FileText');
  const [formCategoriaId, setFormCategoriaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await DT.getCategoriasWithSubcategorias();
      setCategorias(data);
    } catch (e) {
      setError('Error al cargar');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleCat = (id: string) => {
    setExpandedCat((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddCategoria = () => {
    setSheetType('cat');
    setEditCatId(null);
    setFormNombre('');
    setFormOrden(categorias.length);
    setSheetOpen(true);
    setError(null);
  };

  const openEditCategoria = (c: CategoriaWithSub) => {
    setSheetType('cat');
    setEditCatId(c.id);
    setFormNombre(c.nombre);
    setFormOrden(c.orden);
    setSheetOpen(true);
    setError(null);
  };

  const openAddSubcategoria = (categoriaId: string) => {
    setSheetType('sub');
    setEditSubId(null);
    setParentCatId(categoriaId);
    const cat = categorias.find((x) => x.id === categoriaId);
    setFormNombre('');
    setFormIcono('FileText');
    setFormOrden(cat?.subcategorias.length ?? 0);
    setFormCategoriaId(categoriaId);
    setSheetOpen(true);
    setError(null);
  };

  const openEditSubcategoria = (sub: CategoriaWithSub['subcategorias'][number], categoriaId: string) => {
    setSheetType('sub');
    setEditSubId(sub.id);
    setParentCatId(categoriaId);
    setFormNombre(sub.nombre);
    setFormIcono(sub.icono);
    setFormOrden(sub.orden);
    setFormCategoriaId(categoriaId);
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
    if (sheetType === 'cat') {
      if (editCatId) res = await DT.updateCategoria(editCatId, formNombre, formOrden);
      else res = await DT.createCategoria(formNombre, formOrden);
    } else {
      if (editSubId) {
        res = await DT.updateSubcategoria(editSubId, {
          nombre: formNombre,
          icono: formIcono,
          orden: formOrden,
          ...(formCategoriaId && { categoriaId: formCategoriaId }),
        });
      } else if (parentCatId) {
        res = await DT.createSubcategoria(parentCatId, formNombre, formIcono, formOrden);
      }
    }
    if (res.success) {
      setSheetOpen(false);
      load();
    } else {
      setError(res.error ?? 'Error');
    }
    setSaving(false);
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría y todas sus subcategorías?')) return;
    setError(null);
    const res = await DT.deleteCategoria(id);
    if (res.success) load();
    else setError(res.error ?? 'Error');
  };

  const handleDeleteSubcategoria = async (id: string) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return;
    setError(null);
    const res = await DT.deleteSubcategoria(id);
    if (res.success) load();
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
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Desarrollo técnico</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Categorías y subcategorías usadas en el formulario de desarrollo técnico de cada proyecto. Puedes editar nombres, orden, iconos y mover subcategorías entre categorías.
            </p>
          </div>
          <Button onClick={openAddCategoria}>
            <Plus className="h-4 w-4 mr-2" /> Agregar categoría
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categorias.map((c) => (
              <div key={c.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleCat(c.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedCat.has(c.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-muted-foreground text-sm">(Orden: {c.orden})</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEditCategoria(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openAddSubcategoria(c.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategoria(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                {expandedCat.has(c.id) && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Icono</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Orden</TableHead>
                        <TableHead className="w-[140px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {c.subcategorias.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <IconByName name={s.icono} className="h-4 w-4" />
                          </TableCell>
                          <TableCell>{s.nombre}</TableCell>
                          <TableCell>{s.orden}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditSubcategoria(s, c.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSubcategoria(s.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {sheetType === 'cat'
                ? editCatId
                  ? 'Editar categoría'
                  : 'Agregar categoría'
                : editSubId
                  ? 'Editar subcategoría'
                  : 'Agregar subcategoría'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={formOrden}
                onChange={(e) => setFormOrden(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            {sheetType === 'sub' && (
              <>
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <Select value={formIcono} onValueChange={setFormIcono}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            <IconByName name={name} className="h-4 w-4" />
                            {name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editSubId && categorias.length > 1 && (
                  <div className="space-y-2">
                    <Label>Mover a categoría</Label>
                    <Select
                      value={formCategoriaId ?? ''}
                      onValueChange={(v) => setFormCategoriaId(v || null)}
                    >
                      <SelectTrigger><SelectValue placeholder="Mantener categoría" /></SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
