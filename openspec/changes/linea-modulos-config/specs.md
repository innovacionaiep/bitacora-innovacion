# Spec: linea-modulos-config

## Requirements

### R1 — Visible tabs by línea
A project MUST show General and Historial always. Optional tabs (Convenio, Participantes, Actividades/Gantt, Indicadores, Presupuesto, Seguimiento, Escalamiento) MUST appear only when the project’s línea (matched by fondo name + línea name) has that tab enabled.

### R2 — No línea
Given a project with empty, null, or unknown línea, When the user opens the project, Then only General and Historial MUST be visible.

### R3 — Name collision across fondos
Given two líneas with the same name under different fondos, When resolving a project, Then the match MUST use fondo + nombre, not nombre alone.

### R4 — Convenio / Escalamiento server gates
Mutations and reads for Convenio and Escalamiento MUST require the project’s línea flag, not `Fondo.conveniosEnabled` / `escalamientoEnabled`.

### R5 — Convenios listings
Dashboard and Fondos convenio lists MUST include only projects whose línea has Convenio On. A project without línea MUST be excluded. The Fondos convenios block MUST show if any línea of that fondo has Convenio On. Pending KPI MUST count only applicable projects.

### R6 — Config matrix
Admin with `view.ajustes` MUST be able to toggle each optional tab and each DT subcategory per línea. DT Off MUST persist as `DesarrolloTecnicoSubcategoriaLineaExcluida` (opt-out). New líneas MUST default Convenio/Escalamiento Off and other optional tabs On.

### R7 — Migration
Existing líneas MUST receive Convenio/Escalamiento from their parent fondo flags. Other tab flags MUST default On. Fondo flag columns MUST NOT be dropped.

## Scenarios

### S1 No línea hides optional tabs
- Given fondo=F1 and linea=null
- When visibleProjectNavTabs is computed
- Then only General and Historial remain

### S2 Same línea name, different fondo
- Given línea "A" on F1 with Convenio On and línea "A" on F2 with Convenio Off
- When the project is fondo=F2 linea=A
- Then Convenio MUST be hidden

### S3 Convenio listing
- Given projects in the same fondo, only some with Convenio On on their línea
- When listing convenios for that fondo
- Then only those with Convenio On MUST appear
