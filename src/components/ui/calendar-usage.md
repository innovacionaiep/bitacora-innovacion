# Componentes de Calendario - Español de Chile

## Calendar Component

Un componente de calendario personalizado optimizado para usuarios chilenos con localización completa en español.

### Características

- ✅ **Localización chilena**: Meses y días de la semana en español
- ✅ **UI/UX amigable**: Diseño moderno y fácil de usar
- ✅ **Navegación intuitiva**: Botones para cambiar mes y año
- ✅ **Selección rápida**: Botón "Hoy" para seleccionar la fecha actual
- ✅ **Validación de fechas**: Soporte para fechas mínimas y máximas
- ✅ **Accesibilidad**: Navegación por teclado y lectores de pantalla
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla

### Uso Básico

```tsx
import { Calendar } from '@/components/ui/calendar';

function MyComponent() {
  const [date, setDate] = useState('');

  return (
    <Calendar value={date} onChange={setDate} placeholder="Seleccionar fecha" />
  );
}
```

### Props

| Prop          | Tipo                     | Descripción                              | Por defecto         |
| ------------- | ------------------------ | ---------------------------------------- | ------------------- |
| `value`       | `string`                 | Fecha seleccionada en formato DD/MM/YYYY | -                   |
| `onChange`    | `(date: string) => void` | Callback cuando se selecciona una fecha  | -                   |
| `placeholder` | `string`                 | Texto placeholder del input              | "Seleccionar fecha" |
| `className`   | `string`                 | Clases CSS adicionales                   | -                   |
| `disabled`    | `boolean`                | Deshabilitar el componente               | `false`             |
| `minDate`     | `string`                 | Fecha mínima seleccionable               | -                   |
| `maxDate`     | `string`                 | Fecha máxima seleccionable               | -                   |

### Ejemplo con Validaciones

```tsx
<Calendar
  value={startDate}
  onChange={setStartDate}
  placeholder="Fecha de inicio"
  minDate="2024-01-01"
  maxDate="2024-12-31"
  className="w-full"
/>
```

## DateRangePicker Component

Un selector de rango de fechas que combina dos calendarios para seleccionar fechas de inicio y fin.

### Características

- ✅ **Rango de fechas**: Selección de fecha de inicio y fin
- ✅ **Validación automática**: La fecha de fin no puede ser anterior a la de inicio
- ✅ **Formato chileno**: Fechas mostradas en formato DD/MM/YYYY
- ✅ **Acciones rápidas**: Botones para limpiar y aplicar
- ✅ **Diseño compacto**: Interfaz optimizada para formularios

### Uso Básico

```tsx
import { DateRangePicker } from '@/components/ui/date-range-picker';

function MyComponent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      placeholder="Seleccionar rango de fechas"
    />
  );
}
```

### Props

| Prop                | Tipo                                   | Descripción                              | Por defecto                   |
| ------------------- | -------------------------------------- | ---------------------------------------- | ----------------------------- |
| `startDate`         | `string`                               | Fecha de inicio seleccionada             | -                             |
| `endDate`           | `string`                               | Fecha de fin seleccionada                | -                             |
| `onStartDateChange` | `(date: string) => void`               | Callback para fecha de inicio            | -                             |
| `onEndDateChange`   | `(date: string) => void`               | Callback para fecha de fin               | -                             |
| `onRangeChange`     | `(start: string, end: string) => void` | Callback cuando cambia el rango completo | -                             |
| `className`         | `string`                               | Clases CSS adicionales                   | -                             |
| `disabled`          | `boolean`                              | Deshabilitar el componente               | `false`                       |
| `placeholder`       | `string`                               | Texto placeholder                        | "Seleccionar rango de fechas" |
| `showLabels`        | `boolean`                              | Mostrar etiquetas de fecha               | `true`                        |

## Localización Chilena

Los componentes están completamente localizados para Chile:

- **Meses**: Enero, Febrero, Marzo, Abril, Mayo, Junio, Julio, Agosto, Septiembre, Octubre, Noviembre, Diciembre
- **Días de la semana**: Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado
- **Formato de fecha**: DD/MM/YYYY (formato chileno estándar)
- **Día de inicio de semana**: Domingo (estándar chileno)

## Estilos y Personalización

Los componentes utilizan Tailwind CSS y pueden ser personalizados fácilmente:

```tsx
<Calendar
  className="w-full border-2 border-blue-500 rounded-lg"
  // ... otras props
/>
```

## Integración con Formularios

Los componentes están diseñados para integrarse perfectamente con formularios React:

```tsx
<form onSubmit={handleSubmit}>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label>Fecha de inicio</Label>
      <Calendar
        value={formData.startDate}
        onChange={(date) =>
          setFormData((prev) => ({ ...prev, startDate: date }))
        }
        placeholder="Seleccionar inicio"
      />
    </div>
    <div>
      <Label>Fecha de fin</Label>
      <Calendar
        value={formData.endDate}
        onChange={(date) => setFormData((prev) => ({ ...prev, endDate: date }))}
        placeholder="Seleccionar fin"
        minDate={formData.startDate}
      />
    </div>
  </div>
</form>
```
