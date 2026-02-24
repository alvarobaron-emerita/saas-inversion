# Plan: Modificaciones en la herramienta de sectores

## 1. Eliminar KPIs objetivo y unificarlos con la tesis

- **Ajustes (UI):** Quitar el bloque de KPIs objetivo en [DiscoverySettings.tsx](src/components/discovery/DiscoverySettings.tsx): eliminar la importación y el uso de `KPIConfig` y el `border-t` que lo envuelve (líneas 73-79).
- **Tipos y API:** Mantener `kpis` en [SettingsData](src/types/settings.ts) y en la API/DB por compatibilidad, pero dejar de mostrarlos y de enviarlos al LLM. Opcional: más adelante se puede eliminar el campo `kpis` del modelo Prisma y de la API con una migración.
- **Prompts:** En [discovery.ts](src/lib/llm/prompts/discovery.ts), en `buildSectionPrompt`, eliminar el parámetro `kpis` y el bloque `kpiDesc`; el contexto para el LLM será solo la tesis (el usuario incluirá los KPIs objetivo dentro del texto de la tesis).
- **Llamadas al prompt:** En [api/discovery/analyze/route.ts](src/app/api/discovery/analyze/route.ts), dejar de leer `kpis` de settings y llamar a `buildSectionPrompt(section, sector, context, thesis)` (sin `kpis`).
- **Componente:** El archivo [KPIConfig.tsx](src/components/settings/KPIConfig.tsx) puede quedar sin usos; se puede eliminar o dejar por si se reutiliza más adelante.

---

## 2. Ajustes: tesis y secciones siempre visibles y editables (lo que se usa)

Objetivo: En la pantalla de Ajustes, que **siempre** se muestre la tesis y las secciones del informe que se van a usar (nunca "vacío" con solo un botón de cargar por defecto). Si en BD están vacías, mostrar los mismos valores por defecto que usa el análisis; al guardar, persistir y a partir de entonces usar lo guardado.

- **API GET de settings:** En [api/settings/route.ts](src/app/api/settings/route.ts), al devolver la respuesta: si `reportSections` está vacío (`[]`), devolver las **mismas secciones por defecto** que usa [api/discovery/analyze/route.ts](src/app/api/discovery/analyze/route.ts) (líneas 49-56), con estructura `{ id, name, prompt }` y IDs estables.
- **Frontend:** En [DiscoverySettings.tsx](src/components/discovery/DiscoverySettings.tsx), no hace falta lógica extra si la API ya devuelve secciones por defecto cuando están vacías.
- **ReportSectionsEditor:** En [ReportSectionsEditor.tsx](src/components/settings/ReportSectionsEditor.tsx), quitar el botón **"Cargar por defecto"** (ya no es necesario porque la API devuelve siempre secciones efectivas).
- **Persistencia:** El flujo actual ya guarda con "Guardar"; el análisis debe seguir usando los settings guardados. Una sola fuente de defaults para las secciones (API); GET settings devuelve esos defaults cuando `reportSections` sea `[]`.

---

## 3. Progreso durante el análisis ("cargando cada sección")

Objetivo: Mientras se analiza un sector, mostrar un estado de carga más claro, por ejemplo "Analizando: [nombre de la sección] (X de Y)".

- **Enfoque recomendado: streaming por Server-Sent Events (SSE).**
  - **Backend:** Modificar [api/discovery/analyze/route.ts](src/app/api/discovery/analyze/route.ts) para devolver un **stream**: eventos `section_start` (index, name, total), opcionalmente `section_done`, y al final evento con el `report` completo.
  - **Frontend:** En [DiscoveryNewAnalysis.tsx](src/components/discovery/DiscoveryNewAnalysis.tsx), consumir el stream con `fetch` + `response.body.getReader()`, mantener estado `analysisProgress: { sectionName, index, total }` y pasarlo al canvas.
  - **UI de carga:** En [AnalysisCanvas.tsx](src/components/discovery/AnalysisCanvas.tsx), cuando `isLoading`, mostrar "Sección X de Y: [nombre]" e indicador visual de avance.

---

## 4. Eliminar proyectos (limpieza)

Objetivo: Poder borrar proyectos de sectores que ya no se quieran (por ejemplo si nos hemos equivocado).

- **API:** Añadir método **DELETE** en [api/discovery/projects/[projectId]/route.ts](src/app/api/discovery/projects/[projectId]/route.ts): recibir `projectId`, llamar a `prisma.discoveryProject.delete({ where: { id: projectId } })`, devolver 204 o 200. Manejar 404 si el proyecto no existe.
- **UI – dónde mostrar la acción:**
  - **Opción A (recomendada):** En la vista del proyecto ([DiscoveryProjectView.tsx](src/components/discovery/DiscoveryProjectView.tsx)), en la barra superior (junto al nombre), un botón o menú "Más" / "⋮" con la opción "Eliminar proyecto". Al confirmar (confirm/AlertDialog), llamar a `DELETE /api/discovery/projects/${projectId}`, invalidar query `["discovery-project", projectId]` y `["discovery-projects"]`, y redirigir a `/discovery/new`.
  - **Opción B:** En la lista del sidebar ([DiscoveryProjectList.tsx](src/components/discovery/DiscoveryProjectList.tsx)), un icono de papelera por proyecto (con confirmación) que llame al DELETE y luego invalidar lista y, si estamos en ese proyecto, redirigir.
- **Detalle:** Usar un diálogo de confirmación ("¿Eliminar este proyecto? No se puede deshacer") para evitar borrados accidentales.

---

## 5. Editar el informe a mano (panel derecho)

Objetivo: Poder modificar el contenido del informe que se muestra a la derecha no solo vía chat/LLM, sino también editando texto a mano. Los cambios deben guardarse y persistir.

- **Estado actual:** El informe se muestra en [AnalysisCanvas](src/components/discovery/AnalysisCanvas.tsx) usando [ReportSectionDisplay](src/components/discovery/ReportSection.tsx), que solo renderiza markdown (solo lectura). La API ya permite actualizar el report con **PATCH** [api/discovery/projects/[projectId]/route.ts](src/app/api/discovery/projects/[projectId]/route.ts) (`body.report`).
- **Enfoque:**
  - **AnalysisCanvas** (o el contenedor que tenga el report) debe recibir `projectId` además de `report`, para poder guardar cambios. Si hoy `DiscoveryProjectView` tiene el `projectId`, puede pasarlo a `AnalysisCanvas`.
  - **Modo edición:** Añadir un modo "editar" en el panel del informe (por ejemplo botón "Editar informe" que alterna entre vista solo lectura y vista editable). En modo editable, cada sección del informe se muestra con:
    - Título de sección (lectura o editable según preferencia; normalmente solo el contenido es editable).
    - Área de texto (textarea o contenteditable) con el markdown de `section.content`. Al salir del campo (onBlur) o con un botón "Guardar" por sección o global, construir el array `report` actualizado y llamar a `PATCH /api/discovery/projects/${projectId}` con `{ report: updatedReport }`.
  - **Sincronización:** Tras el PATCH, invalidar la query del proyecto (`["discovery-project", projectId]`) para que el resto de la UI (p. ej. chat que usa el informe) vea el nuevo contenido. Si el chat usa el report del proyecto desde React Query, se actualizará solo.
- **Archivos a tocar:**
  - [DiscoveryProjectView.tsx](src/components/discovery/DiscoveryProjectView.tsx): pasar `projectId` a `AnalysisCanvas`.
  - [AnalysisCanvas.tsx](src/components/discovery/AnalysisCanvas.tsx): aceptar `projectId`, estado local o prop para "modo edición", y renderizado condicional: con report cargado, mostrar o bien `ReportSectionDisplay` (solo lectura) o bien bloques editables (p. ej. un nuevo componente `ReportSectionEditable` que muestre un Textarea por sección y al guardar llame al PATCH).
  - Nuevo componente opcional: `ReportSectionEditable` en [ReportSection.tsx](src/components/discovery/ReportSection.tsx) (o nuevo archivo) que reciba `section`, `onChange` y quizá `onSave` para esa sección, y que actualice el report completo en el padre (AnalysisCanvas) quien hace el PATCH.

Resumen: el informe a la derecha tendrá un botón "Editar" que cambie a vista con textareas (una por sección); al guardar se hace PATCH del `report` completo y se invalidan las queries para que todo quede consistente.

---

## 6. Resumen de archivos por área

| Área | Archivos |
|------|----------|
| KPIs → tesis | DiscoverySettings.tsx, discovery.ts (prompts), api/discovery/analyze/route.ts; opcional KPIConfig.tsx |
| Siempre tesis y secciones | api/settings/route.ts, ReportSectionsEditor.tsx |
| Progreso análisis | api/discovery/analyze/route.ts, DiscoveryNewAnalysis.tsx, AnalysisCanvas.tsx |
| Eliminar proyectos | api/discovery/projects/[projectId]/route.ts (DELETE), DiscoveryProjectView.tsx y/o DiscoveryProjectList.tsx (botón + confirmación) |
| Editar informe a mano | DiscoveryProjectView.tsx (pasar projectId), AnalysisCanvas.tsx (modo edición, PATCH), ReportSection.tsx o nuevo componente editable |

---

## 7. Orden sugerido de implementación

1. Unificar KPIs con la tesis (quitar UI y uso en prompts).
2. GET settings con secciones por defecto cuando vacías; quitar "Cargar por defecto".
3. Eliminar proyectos: DELETE en API + botón y confirmación en UI.
4. Editar informe a mano: projectId en canvas, modo edición, PATCH report.
5. Progreso durante el análisis (streaming SSE y UI de progreso).
