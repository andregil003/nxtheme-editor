# ROADMAP — Preview visual + Editor de layouts freehand

> Documento de alcance acordado con André el 14/11/2026. Sirve para retomar el trabajo
> en otra conversación. Contexto del proyecto abajo en "Estado actual".

## 1. Objetivo

Extender el editor local de nxthemes (este repo) con:

1. **Preview visual real por pantalla**: una maqueta 1280x720 que muestre cómo se vería
   cada pantalla (HOME, lockscreen, etc.) con la **imagen que el usuario elija** + los
   elementos posicionados según el layout activo. Cada pantalla tiene su layout y su
   imagen propios (ya implementado), y la maqueta respeta eso.
2. **Editor de layouts freehand**: crear/modificar layouts a mano (drag & drop) y
   exportarlos como layout JSON (patches) listos para el build del .nxtheme.

## 2. Decisiones tomadas (André, 14/11/2026)

| # | Decisión | Respuesta |
|---|----------|-----------|
| Q1 | Fidelidad de la preview | **A + B**: maqueta fiel (imagen del usuario + paneles posicionados) **y** comparación lado a lado con el overlay PNG oficial de Themezer. NO pixel-perfect (eso sería emular el UI de la Switch completo). |
| Q2 | Posiciones base (vanilla) | **Extraer del HOME real de la Switch de André**, firmware **23.0.1** (ver flujo en §4). Máxima precisión; nada de baselines hardcodeadas de fw viejos. |
| Q3 | Alcance del editor freehand | **A + B + C**: (A) drag & drop integrado sobre la maqueta que genera patches; (B) editor BFLYT profundo (paneles, jerarquía) — se construye por fases; (C) híbrido: importar JSONs hechos en Switch Layout Editor (ya instalado en `Documents\GitHub\SwitchLayoutEditor`). |
| Q4 | Pantallas | **HOME primero**; lock/apps/set/news/user/psl en segunda ola (mismo motor, cambia el baseline y los paneles). |
| Q5 | Animaciones (BFLAN) | **Skip en v1**: preview estática + layout sin anims. Los `Anims` del JSON quedan intactos si el layout viene de Themezer (no se borran), solo no se renderizan en la maqueta todavía. |

## 3. Hechos técnicos confirmados

- **Formato layout.json de Themezer** (repo `ThemezerNX/Layouts`, rama `master`):
  - `AuthorName`, `TargetFirmware` (ej: `2000` = fw 20.0.0), `HideOnlineBtn`.
  - `Files[]`: `{ FileName: "blyt/RdtBtnCtrl.bflyt", Patches: [{ PaneName, Visible, Position, Size, ... }] }` — **son diffs** sobre los BFLYT originales de la consola.
  - `Anims[]`: patches BFLAN (v1 no los renderiza).
- **Inventario de layouts del repo**: 57 en total — ResidentMenu/HOME 34, Flaunch/AllApps 9, Entrance/Lock 6, Set 3, MyPage/User 2, Psl 2, Notification/News 1. Cada carpeta trae `layout.json` + `overlay.png` (preview oficial) + a veces `options/`.
- **La API ya integrada en el editor**: `server/api/layouts.get.ts` (lista con cache 1h) y `server/api/layout-json.get.ts` (descarga del JSON elegido). La librería cliente es `composables/useLayoutLibrary.ts`.
- Los paneles que importa para HOME viven sobre todo en `RdtBtnCtrlGameIcon.bflyt` /
  `RdtBtnCtrl.bflyt` / `RdtDmyIconNml.bflyt` (iconos de juego), `RdtPslBlb...`,
  `RdtMenuFull` (fondo), etc. — parsear el campo `Files[].FileName` para saber qué tocar.
- Texturas de la consola: NO se renderizan (decisión Q1). La maqueta usa la imagen del
  usuario como fondo + rects/labels estilizados para los elementos.

## 4. Flujo de extracción del baseline (Q2)

1. En la Switch (CFW): NXThemesInstaller → **"Extract home menu"** → deja los szs
   originales en `SD:/themes/systemData/`.
2. Copiar esa carpeta a la PC (por DBIbackend o hekate USB mount) a
   `Documents\GitHub\nxtheme-editor\baseline\fw2301\`.
3. Descomprimir cada szs con **NxThemeTool CLI** (`Documents\GitHub\SwitchThemeInjector\NxThemeTool\NxThemeTool.exe szs <file>`)
   → archivos BFLYT/BFLAN sueltos → parsear árbol de paneles (posiciones/size/tamaño base).
4. Guardar el baseline parseado como JSON en `baseline/fw2301/*.json` y servirlo al
   frontend (endpoint local tipo `/api/baseline/[screen]`).
5. ⚠️ El baseline extraído **corresponde a fw 23.0.1** — documentarlo en el JSON
   (`{ firmware: "23.0.1", extractedAt: "..." }`) para saber siempre contra qué versión
   se generó. Si Nintendo cambia el HOME en un futuro firmware, se re-extrae.

## 5. Fases de implementación

- **Fase 0 — Baseline**: extracción + parser de szs (§4). Prerequisito de todo.
- **Fase 1 — Maqueta HOME estática**: componente Vue que, dado (imagen de fondo +
  layout JSON + baseline), pinta la maqueta 1280x720 con la grilla de iconos y elementos
  según los patches. Vista previa en la pestaña HOME.
- **Fase 2 — Comparación A|B**: la maqueta + el overlay PNG oficial de Themezer (cuando
  el layout viene de la librería) lado a lado, toggle/carrusel.
- **Fase 3 — Editor drag & drop**: arrastrar/redimensionar elementos de la maqueta
  (iconos, botón online, etc.) → se calculan deltas vs baseline → se generan los
  `Patches` y se escriben en el layout JSON de esa pantalla. Guardado por pantalla, igual
  que las imágenes.
- **Fase 4 — Editor BFLYT profundo (B)**: paneles nuevos, jerarquía de árbol, visibilidad,
  tamaño de fuente/texto. Construir incremental; el drag&drop de Fase 3 es su base.
- **Fase 5 — Otras pantallas**: lock (Entrance), apps (Flaunch), set, news, user, psl.
  El motor ya existe; solo cambia baseline + lista de paneles por pantalla.
- **Fase 6 — Animaciones (BFLAN)**: opcional, al final.

## 6. Estado actual del repo (contexto para retomar)

- Editor local corriendo con `bun run start:dev` en `http://localhost:3000`
  (Nuxt 4.6.4, engines node >=24 <25, `bun` disponible en el dispositivo).
- **Ya implementado y funcionando:**
  - Assets **por pantalla** (`assetsByTarget`) y previews por pantalla
    (`previewUrlsByTarget`) en `pages/index.vue`.
  - Layout JSON **por pantalla** (`layoutsByTarget`), con `activeLayoutJson` computed
    writable para v-model.
  - **Librería de layouts Themezer** integrada con previews (botón "Browse layout
    library", buscador, clic = carga JSON de esa pantalla).
  - **"Build every screen"**: checkbox que genera un .nxtheme por pantalla con imagen o
    layout, saltando las vacías (`buildAndDownloadMultiple` en
    `composables/useNxthemeBuilder.ts`, delay 450ms entre descargas).
  - Toasts OK (hay warnings de una-ui con props `toast`/`present` — cosmeticos, no tocar).
- Archivos clave: `pages/index.vue`, `composables/useNxthemeBuilder.ts`,
  `composables/useLayoutLibrary.ts`, `server/api/layouts.get.ts`,
  `server/api/layout-json.get.ts`, `types/switch-theme.ts`.
- Herramientas instaladas en la PC:
  - `Documents\GitHub\SwitchLayoutEditor\Switch Layout Editor.exe` (editor free hand BFLYT/BFLAN, layout diff, soporta fw 20+).
  - `Documents\GitHub\SwitchThemeInjector\NxThemeTool\NxThemeTool.exe` (CLI szs/pack/unpack).
- **Cuidado con la consola (lección aprendida):** no crear `system_settings.ini` ni tocar
  `atmosphere/contents` sin plan — un intento previo rompió el arranque de CFW.
  `D:\atmosphere\contents\420000000000000B\` = sys-patch v1.6.3.0, NO tocar.

## 7. Pendientes ajenos a este roadmap (no olvidar)

- **MTP**: reparación DISM+SFC hecha; falta que André reinicie y pruebe. Si falla:
  test con celular Android (descartar culpa de la Switch) → desinstalar KB5132688.
- **Juegos "perdidos" en HOME**: verificar si aparecen en "All Software" y cuántos
  títulos lista DBI (posible confusión entre las 2 NANDs: SEMI-STOCK SYSMMC vs CFW EMUMMC).
- Espacio: instalar juegos nuevos a NAND; mover SD→NAND vía DBI (Browse installed
  applications → Transfer) si hace falta.
