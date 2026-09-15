# MINSA Proyectos

PWA de proyectos multiusuario de MINSA ENERGY: cada **proyecto** es un frente con fin (una licencia,
un arranque de planta, un servicio), con su **tablero** de cubetas (cuatro por default, editables por proyecto desde v0.11.0), tareas asignadas a gente
de la casa, y **documentos** ligados a la biblioteca de la unidad. Diez cuentas ven lo mismo y
mueven sus tarjetas desde el celular; el estado vive en listas de SharePoint del sitio
Administración, no en la app.

**v0.51.0** (2026-09-15) — **Archivos nace TODO plegado** (Carlos, 15-sep). Al abrir la pestaña, cada raíz de proyecto está cerrada (solo el nombre, el icono del equipo y el conteo); se abre por clic o con «Abrir todo», y lo que abriste vive la sesión como su filtro. Mecanismo: `estado.abiertasArchivos` (antes `plegadasArchivos`) guarda las llaves ABIERTAS, no las plegadas, así el Set vacío con que arranca es «todo plegado» sin calcular las llaves antes de pintar. Docs del proyecto sigue naciendo abierto (su `plegadasDocs` no cambia). Sin cambio de esquema. E2E: la aserción v0.36.0 de la raíz exige ahora `aria-expanded=false`, `is-plegada` y toda fila oculta con «Plegar todo» apagado; +1 nueva («Abrir todo» despliega el árbol que nació plegado); **394 · 348 · 27**, 0 fallas. SW **v60**.

**v0.50.0** (2026-09-15) — **La ficha de tarjeta sin burbujas: propiedades en renglones, la cubeta como menú y la prioridad con barras** (Carlos, 15-sep; artifact `1mTr2BGa`, eligió **1A + 2B + 3A**). (1) Asignado · Cubeta · Vence · Prioridad dejan de ser `mn-chip` y pasan a **renglones rótulo · valor** (`.t-props`, el mismo kv de la columna derecha): lo que está en su valor por defecto («Sin asignar», «Poner fecha», «Normal») va en gris tenue; el semáforo de la fecha tiñe el texto; el valor editable es un botón sin caja con chevron que abre «Editar la tarjeta» en su campo, como antes. (2) La sección **«Mover a…» desaparece**: la cubeta es un renglón más, su valor abre el **menú `#tMover`** (un botón por cubeta, `data-move` como siempre, la actual apagada y «· actual»), que cierra con Esc —sin cerrar el diálogo— y con clic fuera; el orden en la cubeta (`#tOrden`: «1 de 7» y ↑ ↓) va en ese mismo renglón. `#tMover` y `#tOrden` viven DENTRO del renglón desde la primera apertura: `abrirTarjeta` los toma antes de vaciar los renglones (la E2E cazó el null en la segunda apertura). Con rol lectura la cubeta es texto. (3) La prioridad es un **segmentado con barras de señal** (`.prio`, `selectorPrioridad`): 1 gris · 2 gris medio · 3 en **azul de marca** —el mismo punto azul del tablero; Carlos descartó el rojo—; el valor vive en un `<input type="hidden">` con el id de siempre (`ftPrioridad` / `ntPrioridad`), y el segmento escucha `change` (así `poner()` de la E2E lo mueve). Las mismas barras van en el renglón de la ficha. (4) **«Proyecto (moverla a otro frente)» se quitó** del editor (nunca se usó): sale el `select`, la lógica de `guardarEdicion` que arrastraba las ligas y las dos bitácoras «pasó / trajo»; Descripción toma el ancho entero. Recuperable en git (v0.49.0). **No re-proponer** lo descartado en el artifact: 1B línea de metadatos · 1C controles con caja · 1D solo-lo-que-no-es-default · 2A segmentado de cubetas · 2C flujo · 2D anterior/siguiente · 3B chevrones · 3C tres tarjetas · 3D select con glifo. Sin cambio de esquema. E2E: 3 aserciones reescritas (F11 Proyecto → «guardar conserva el proyecto»; colaborador; C6 lectura) y 9 nuevas (renglones, menú abre/Esc/clic fuera, segmentado, `poner()`, foco); **393 · 347 · 27**, 0 fallas; `npm test` 165 reglas; tarjeta y editor a 390 y 1366 en claro y oscuro con overflowX 0. SW **v59**.

**v0.49.0** (2026-09-15) — **Mensajes sin avatar** (Carlos, 15-sep; artifact `C8meacEE`, eligió **B** entre A sin-icono-de-unidad · B sin-avatar · C sin-ninguno — no re-proponer A ni C). La bandeja pierde la columna del avatar / icono grande (`.msg-proy` pasa a `minmax(0,1fr) auto`; el título conserva el icono chico de la unidad y el preview ya nombra a quien escribió) y el hilo pierde la bolita de cada mensaje (`.msg` a una columna, `+ auto` con el botón borrar; `av-hueco` salió): el nombre va en la cabecera de la burbuja y el tono de la persona lo sigue dando el fondo al 9 %. Sin filete izquierdo (Carlos lo quitó en v0.15.1; reversible en una línea de `.msg .cuerpo` si el fondo solo no distingue). Sin cambio de esquema. E2E: una aserción nueva (bandeja e hilo sin `.av`); **384 · 338 · 27**, 0 fallas; `npm test` 165 reglas; Mensajes / hilo / chat a 390 y 1366 con overflowX 0. SW **v58**.

**v0.48.0** (2026-09-15) — **El pie del rail sin la burbuja «gerencia» y en dos renglones** (Carlos, 15-sep; artifact `M3B6fy3g`, eligió **A4** entre R1–R4 y A1–A4 — no re-proponer A1 tema-al-menú, A2 interruptor sol/luna ni A3 identidad-como-menú). El rol es un **rótulo de datos** (`.quien .rol`: mono, versalitas, gris, la misma métrica que «EQUIPOS»), ya no `mn-chip is-info` — era el único celeste de toda la columna. Renglón 1: nombre/rol + el «···» a la derecha, que ahora guarda también **Actualizar** con «hace N min» al lado (`#syncRail` vive dentro del botón con `data-corto`: `pintarSync` escribe ahí solo la hora, el texto largo no cabía); renglón 2: el tema como **segmento Claro | Oscuro** a todo el ancho (`.tema.seg`: caja hundida, el activo es pastilla de tarjeta con sombra corta; solo el rail — el menú móvil conserva sus dos iconos). Plegado a 64 px: «···» centrado y el segmento apilado sol / luna sin rótulo. Los `id` y `data-tema` no cambian. Sin cambio de esquema. E2E: la aserción D6 se reescribió a lo que promete la interfaz nueva (Actualizar DENTRO del menú, tema fuera como segmento) y una nueva para el rótulo; **383 · 337 · 27**, 0 fallas, en 3 anchos × 2 temas; `npm test` 165 reglas; 306 capturas con overflowX 0. SW **v57**.

**v0.47.0** (2026-09-15) — **El tablero tiene tantas columnas como cubetas: con 3 ya no queda un hueco a la derecha** (Carlos, 15-sep: «que las cubetas se expandan o contraigan para caber en la pantalla»). Antes `.tablero` era `repeat(4, …)` fijo más un renglón por `data-n` de 5 a 8: con menos de 4 cubetas la 4.ª pista quedaba vacía. Ahora `tablero.js` pone `--n` (el número de cubetas, 1 a 8) en `#tableroCols` y `estilo.css` lee `repeat(var(--n, 4), minmax(150px, 1fr))` —también en impresión—; los cuatro renglones `data-n=5..8` se retiraron. En tableta (≤ 900) sigue el 2 × 2, salvo `data-n="1"` que va a una columna; en celular no cambia nada (una cubeta a la vez). Sin cambio de esquema. **E2E** (`e2e.ps1`, gerencia **382** · colaborador 336 · lectura 27, 0 fallas): en el bloque de cubetas, tres aserciones nuevas —con 5 y con 4 `--n` y las pistas que tocan al ancho del arnés (≤ 900 → 2); con 3 (se quita una vacía) `--n` = 3, las pistas esperadas y **la suma de anchos de las columnas más los gaps = el ancho del contenedor**— y la restauración de las 4 de siempre deja `Columnas` vacía otra vez. Ojo del arnés: el editor de cubetas se REPINTA al mover una fila, así que la fila se vuelve a buscar por índice en cada clic (una referencia guardada apunta a un nodo muerto y el guardado nunca llega). `npm test` 165 reglas. Vista nueva de `capturas.mjs`: `proyecto-3cubetas` (busca el primer proyecto con una cubeta vacía que se pueda quitar, porque tras la E2E el LAU tiene tarjetas en las 4); a 1366 y 820 `overflowX=0` y las 3 columnas llenan el ancho. SW **v56**.

**v0.46.0** (2026-09-15) — **Roadmap, Archivos y Reportes sin la fila de cifras de arriba** (Carlos, 15-sep: las 4 de Roadmap —tarjetas en total · en proceso · hechas · vencidas—, las 4 de Archivos —documentos ligados · archivados · en el buzón · enlaces— y las 5 de Reportes —proyectos activos · abiertas · hechas · vencidas · sin dueño— SALIERON, como la de Inicio en v0.41.0). Solo `index.html` (los tres `.mn-kpis`) y `vistas.js` (`pintarRoadmap` / `pintarArchivos` / `pintarReportes`; `enProceso` y `sinDueno` dejan de importarse); el subtítulo de cada pantalla ya trae el conteo y «Vencidas por proyecto» sigue en Reportes. Sin cambio de esquema. E2E: 5 aserciones reescritas (ausencia del contenedor; las vencidas se cuadran contra `#repVencidas`); **378 · 336 · 27** en verde; `npm test` 165 reglas. Capturas de las tres a 390 y 1366, overflowX 0. SW **v55**.

**v0.45.0** (2026-09-15) — **Archivos sin la columna «Tarjeta»** (Carlos, 15-sep: cada documento ya cuelga de la carpeta con el nombre de su tarjeta desde v0.36.0, así que la columna repetía lo que la carpeta madre ya dice; sin cambio de esquema). `columnasDocs(sinTarjeta)` en `docs.js` y el flag `sinTarjeta` que recorre `tablaDocs` → `filaRaiz` → `filasDeExpediente` → `filaGrupo` / `filaDoc`; solo `pintarArchivos` (`vistas.js`) lo enciende. **Documentos del proyecto la conserva**: ahí la celda es el `select` que cambia una liga de tarjeta (F1). En #archivos «Abrir tarjeta» pasa al menú «⋯» (`data-abrir-tarjeta`), y un orden guardado por `tarjeta` cae a Fecha (dentro de una carpeta todos la comparten). E2E: 2 aserciones reescritas (5 encabezados, botón en el menú; ordenar por Tipo) + 1 nueva (el orden caído); **378 · 336 · 27** en verde; `npm test` 165 reglas. Capturas de #archivos a 390 y 1366, overflowX 0. SW **v54**.

**v0.44.0** (2026-09-15) — **Rail transparente** (Carlos, 15-sep; artifact AHsKBeHt «Pieles de MINSA Proyectos», opción R7 sobre la piel actual — las pieles «Sombra larga» D1–D7 y los rails R1–R6 quedaron descartados). Solo `estilo.css`: `--rail` toma `var(--page)` (el gris de la página en claro, el negro en oscuro), `--rail-line` es `transparent` (sin filete derecho), `--rail-on` es blanco (`#242424` en oscuro) y la pestaña activa es una PASTILLA con hairline (`--line`) y sombra corta en azul de marca; los equipos, al pasar y al filtrar, también en blanco. En celular la barra de abajo conserva fondo de tarjeta y hairline (va fija sobre el contenido). Sin cambio de esquema ni de JS. SW **v53**.

**v0.43.0** (2026-09-15) — **Mensajes: solo chat por frente** (Carlos, 15-sep: «vamos a quitar el chat por persona, casi nunca se usa»; sin cambio de esquema). Sale la sección **Personas** de la bandeja y la **ficha** de la persona con su liga «Abrir chat en Teams» (v0.42.0): `filaPersona`, `pintarFicha`, `actividadDe`, `ligaTeams`, `aliasHash`, `correoDeAlias` y `personasDelEquipo` en `vistas.js`, el `div #mensajesFicha` de `index.html`, las 8 reglas `.msg-pers`/`.msj-ficha` de `estilo.css` y la vista `mensajes-persona` del driver de capturas. La bandeja queda en dos secciones (Frentes · Sin conversación) y el buscador ya no compara personas. El hash `#mensajes/d/<alias>` **ya no existe**: el regex lo sigue admitiendo para que una liga vieja no caiga a Inicio, pero `aplicarHash` la manda a la bandeja de Mensajes con el aviso «escríbele por Teams». Se sostiene la razón de v0.42.0: un 1:1 guardado en `PROY_Actividad` lo leería todo el equipo; lo directo sigue en Teams, solo que sin atajo desde la app. «Te mencionaron» sigue en Inicio. E2E: 3 aserciones reescritas (dos secciones · liga vieja `/d/` · buscador sin personas), **377/335/27** en verde; `npm test` 165 reglas. SW **v52**.

**v0.42.0** (2026-09-15) — **Mensajes: bandeja + hilo en la misma pantalla** (Carlos, 14-sep, artifact 17j5wESZ «vamos con bandeja más hilo solamente»; sin cambio de esquema). La bandeja pasa a la izquierda en tres secciones plegables —**Personas** (el equipo de `PROY_Roles`, con «hoy / esta semana» derivado de la bitácora y cuántas menciones tuyas trae cada quien), **Frentes** (los que tienen chat, el más reciente arriba) y **Sin conversación** (plegada)— más un buscador local; a la derecha lo elegido: el hilo del frente, que es el **mismo `#tab-chat`** de la pestaña del proyecto alojado ahí (`alojarChat`/`devolverChat` en `vistas.js`; `chat.js` ahora sabe de qué proyecto es el hilo —`proyectoChat`— y `enviar` escribe en ESE frente, no en `estado.proyectoAbierto`), o la **ficha de la persona**: rol, actividad, correo, «Te mencionó en frentes» y el botón **Abrir chat en Teams** (`https://teams.microsoft.com/l/chat/0/0?users=…`). **Decidido el 14-sep y no se re-propone:** una persona NO abre un chat dentro de la app —la bitácora la lee todo el equipo, un «privado» guardado en `PROY_Actividad` no lo sería—; la columna `Para` y una lista aparte quedaron descartadas (artifact G6F3aceS). «Te mencionaron» salió de esta pantalla (sigue en Inicio y en la ficha). Hash: `#mensajes/f/<clave>` y `#mensajes/d/<alias>` (el alias de la @mención), con Atrás a la bandeja; `RE_HASH` pasó a destructuring. En ≤ 900 px una columna a la vez con «← Bandeja». E2E: 1 aserción reescrita (el renglón ya no salta a `#p/<clave>/chat`) + 6 nuevas (alojamiento del `#tab-chat`, secciones, enviar desde Mensajes al frente elegido, ficha con liga Teams, buscador, devolver el chat al proyecto); `driver.js` con `mensajes-hilo` y `mensajes-persona`. Dos trampas cazadas por la captura: el relleno `.is-on` de un botón en grid no crece con `width:auto` (va `calc(100% + 2*sp-3)`) y el span interno de un `inline-flex` no hereda la elipsis. **Medido:** `npm test` verde (165 unitarias); E2E **377 · 335 · 27, 0 fallas**; 24 capturas a 390/820/1366 en claro y oscuro con overflowX 0. SW **v51**.

**v0.41.0** (2026-09-14) — **Inicio sin la fila de KPI** (Carlos, 14-sep; sin cambio de esquema). Sale entera la banda `#inicioKpis` de v0.21.0/v0.39.0 (mías abiertas · vencen en 7 d · vencidas, con tendencia y sparkline; sin dueño · sin movimiento, planos): el `div` de `index.html`, el bloque de `pintarInicio`, la función `sparkline`, el import de `serieKpis` en `app.js` (la regla y su test unitario se quedan en `reglas.js`) y las 16 reglas `.kpis-hoy`/`.spark` de `estilo.css`. Inicio abre con el saludo y la cola «Hoy»; lo mío sigue en Mis tareas (y el contador rojo del rail), lo global en la cola y en Reportes. E2E: 4 aserciones reescritas (sin KPI · Sin movimiento contra su tarjeta · el chip Vencidas de Mis tareas pone el filtro · el grupo «Sin dueño» de la cola aterriza en el proyecto) y 1 retirada (KPI «mías abiertas»). **Medido:** `npm test` verde (165 unitarias); E2E **372 · 330 · 27, 0 fallas** a 390 y 1366 en los 3 roles; Inicio a 1366 **1,690 px** de alto, overflowX 0. SW **v50**.

**v0.40.0** (2026-09-14) — **Roadmap: la línea de tiempo a toda la hilera y el subtítulo del frente sin %** (Carlos, 14-sep; sin cambio de esquema). `#p-roadmap` deja la `.dos-columnas` (línea | lateral de 340 px) por `.bandas`: la línea de tiempo toma todo el ancho y «Fines de frente próximos» baja debajo de ella. El subtítulo de cada frente en la columna FRENTE queda «N/N hechas · fin dd/mm» (o «· sin fin de frente»), sin el porcentaje — el avance ya es el relleno de la barra; `.g-proy .m` pasa a un renglón con elipsis (antes «sin fin de frente» partía en dos). Dos comprobaciones E2E nuevas (layout y regex del subtítulo) — la tanda anterior no cazaba una etiqueta sin `.cuerpo`. **Medido:** Roadmap a 1366 **914 px** de alto y a 390 **1,090 px**, overflowX 0. `npm test` verde; E2E **373 · 331 · 27** con 0 fallas. SW **v49**.

**v0.39.0** (2026-09-14) — **Inicio «Una sola columna»** (corte 5 del artifact «Inicio en siete cortes» `S7pfEtW6`, elegido por Carlos el 14-sep; sin cambio de esquema). Se va la lateral de 340 px: Inicio son **bandas** a todo lo ancho (`.bandas`). **5 KPI** en una fila: los 3 de lo mío con tendencia y sparkline + 2 **globales planos** (`.is-plano`, sin tendencia porque `serieKpis` solo reconstruye lo mío): «sin dueño» (salta al proyecto que más tiene con el filtro puesto — `irASinDueno`, que ahora comparten el KPI y el encabezado del grupo) y «sin movimiento» (baja a su tarjeta). La cola «Hoy» va en **dos mitades** dentro de `#inicioHoy` (`.cola-dos`): izquierda `#inicioUrgente` = vencidas · hoy y mañana · sin dueño; derecha `#inicioResto` = nuevo para ti · te mencionaron · esta semana; cada mitad vacía lo dice en su lugar. Proyectos activos a **2 columnas** (`.dosc`); Actividad reciente | Sin movimiento en una fila (`.dosmitad`; si Sin movimiento se oculta, Actividad toma todo el ancho por `:has`). **«Fines de frente» salió**: la hoja de calendario de cada ficha ya trae fecha y semáforo. Bajo 900 px todo cae a una columna y los KPI van en 6 pistas (3 míos de 2 + 2 planos de 3, sin hueco). **Medido:** Inicio a 1366 **1,807 px** (v0.38: 2,404); a 390 **2,815 px** (v0.38: 3,250); a 820 **2,979 px** — el peor de los tres anchos, porque ahí ya todo va a una columna y el texto es de escritorio —; overflowX 0 en 390/820/1366 claro y oscuro. `npm test` verde; E2E **371 · 329 · 27** con 0 fallas. SW **v48**.

**v0.38.0** (2026-09-14) — **Inicio sin «Acciones rápidas»** (Carlos, 14-sep; sin cambio de esquema). Sale entera la tarjeta lateral de v0.18.0 (Nueva tarea · Ligar documento · Nuevo proyecto con su select de proyecto): `pintarAccionesRapidas`, `estado.accionProyectoId`, las reglas `.acciones-rapidas` y sus 8 aserciones E2E. La lateral queda con Fines de frente y Sin movimiento; las tres acciones siguen en su pantalla de origen (Proyecto → tablero, Proyecto → Documentos, Proyectos). SW **v47**.

**v0.37.0** (2026-09-14) — **Documentos y Archivos SIN COLOR** (Carlos, 14-sep; sin cambio de esquema). El bloque tintado por tarjeta de v0.35.0 (8 % del color de la tarjeta, que Carlos vio como una cebra blanco/gris) se retira de los dos árboles: cada carpeta y sus hojas quedan solo con la estructura (hueco entre bloques, filete neutro `--border-hairline` arriba y abajo, línea de conexión) y el hover estándar. `docs.js` sigue poniendo `tr.bloque` + `data-tono` / `is-*` (lo usa la carpeta punteada de la hoja vacía); para volver al tinte, restaurar las cinco reglas de v0.35.0 en `estilo.css` desde git. SW **v46**.

**v0.36.0** (2026-09-14) — **Archivos es el MISMO árbol de expediente que Documentos, con una carpeta raíz más arriba: proyecto > tarjeta > documento** (Carlos, 14-sep; sin cambio de esquema). La tabla de `#archivos` lleva `.is-arbol.is-frentes`: una raíz PLEGABLE por proyecto (`tr.raiz > button.cab.nodo`: caret, carpeta, icono del equipo, nombre y conteo «N de M») con el botón «Documentos» (`.ir-docs`) al lado que abre la pestaña del proyecto; debajo cuelgan «Del proyecto» y las carpetas por tarjeta en bloque tintado, exactamente las de Docs — `docs.js: filasDeExpediente` es la función compartida (Docs la llama con sus llaves; Archivos con llaves prefijadas por proyecto en `estado.plegadasArchivos`: «p7», «p7/0», «p7/t12»). Plegar la raíz esconde todo lo suyo; «Abrir todo / Plegar todo» (`#archivosTodo`) junto a los filtros, como en Docs. Sin nodo de «tarjetas sin documentos»: en Archivos solo se encuentra, no se liga. La lengüeta azul por proyecto (v0.16.0/v0.17.0, `filaGrupo` con `alClic`) deja de usarse en Archivos. SW **v45**.

**v0.35.0** (2026-09-14) — **Documentos: cada tarjeta es un BLOQUE TINTADO en el árbol** (Carlos, 14-sep; artifact `2Kb1WRx5`, opción B de seis; sin cambio de esquema). El nodo de la tarjeta y todas sus hojas llevan `tr.bloque` con el tono de la tarjeta en el `<tr>` (`data-tono` si eligió color; si no, `is-p/c/r/h` por posición de cubeta): fondo al 8 % del color —el mismo tinte que `.tarjeta[data-tono]` en el tablero—, filete del tono arriba y abajo, hueco del color de la tabla entre bloques, hover al 16 %; plegada, la carpeta cierra sola su bloque; en ficha apilada (< 720 px) el tinte va en la ficha. «Del proyecto» y el nodo de vacías no son tarjetas y van sin tinte. **Sustituye la cebra `is-par` de v0.34.0** (separaba renglones sin decir de qué tarjeta eran). Descartadas en el artifact y no re-proponer: A cebra por grupo, C marco con lomo, D cabecera de color, E cajón hundido, F rail de color. SW **v44**.

**v0.34.0** (2026-09-14) — **Documentos: confirmar antes de mover, «Abrir todo / Plegar todo» y cebra en el árbol** (Carlos, 14-sep; sin cambio de esquema). (1) Cambiar la tarjeta de un documento desde el select pide confirmación («Mover el documento»: nombra el documento, de dónde y a dónde); Cancelar devuelve el select a la tarjeta actual y nada sale hacia Graph. (2) Junto a los filtros de Docs, `#docsAbrirTodo` / `#docsPlegarTodo` sobre todas las carpetas del árbol —incluido el nodo «sin documentos», que se abre con «Abrir todo»—; cada botón se apaga cuando ya no tiene nada que hacer. (3) Hileras alternas (`tr.doc.is-par` sobre `--banda`): la pone `docs.js` contando SOLO las hojas visibles y de corrido por todo el árbol, porque `nth-of-type` cuenta también los nodos y las hojas ocultas de una carpeta plegada (revierte la decisión «sin cebra» de v0.33.0 a pedido de Carlos). E2E 370 · 327 · 28, 0 fallas (+5); capturas a 1366/390 × claro/oscuro sin desborde. SW **v43**.

**v0.33.0** (2026-09-14) — **Documentos del proyecto como árbol de expediente** (Carlos, 14-sep, artifact `HMVvZx2L` opción E de ocho: A acordeón · B maestro–detalle · C columnas · D fichas · F pestañas · G carriles por fecha · H índice fijo, descartadas — no re-proponer). La pestaña Documentos conserva la MISMA tabla (`.dtabla`, 6 columnas, orden por columna, container queries, fichas en celular) y le suma la clase `is-arbol`: el proyecto es la **raíz** (`tr.raiz`, con «N documentos» o «N de M» si hay filtro); cada tarjeta es una **carpeta** (`tr.pest > button.cab.nodo`: caret + carpeta del color de su cubeta —`data-tono` si la tarjeta eligió color, si no la clase por posición `is-p/c/r/h` de `claseDeColumna`— + título + rótulo de la cubeta + chip de vencimiento + conteo) que se **pliega** con un clic (`estado.plegadasDocs`, por proyecto; los `tr.doc` quedan `hidden`); los documentos cuelgan con **línea de conexión** (`::before/::after` en `.c-nombre`); y al final el nodo **«N tarjetas abiertas sin documentos»** (`tr.vacias`, nace plegado; al abrirlo, una hoja `tr.doc.vacia` por tarjeta con carpeta tenue, cubeta, vence y «Ligar aquí», que abre Ligar ya parado en esa tarjeta) — solo sin filtro ni búsqueda. `#archivos` NO cambia (su grupo es el proyecto, sigue la lengüeta). Sin cambio de esquema. **Decisiones reversibles en una línea:** el título de la carpeta ENVUELVE en vez de recortarse (`nowrap` ahí es min-content de toda la tabla: con él la tabla medía 407 px en un panel de 366 a 390, cazado con `--medir`), y `.is-arbol { min-width: 0 }` porque `#docsLista` es grid; sin cebra dentro del árbol (la banda cortaba la línea); la columna Tarjeta (select para mover) se queda aunque la carpeta ya lo diga. **Cazado de paso:** desde v0.32.0 `.grupo` es el marco de los filtros (borde + inline-flex) y el título del grupo de la tabla comparte el nombre desde v0.16.0: se veía enmarcado en Docs y Archivos (`.cab .grupo` lo neutraliza). `.pest .cab svg` (0,2,1) ganaba a `.is-arbol .carpeta` y las carpetas salían huecas: el selector lleva `.cab` delante. `tareasDe(p)` pide `(proyecto, tareas)`: con un argumento devuelve `[]` sin error (la E2E lo cazó: «sin nodo» con vacías=1). `herramientas-dev/driver.js` ahora reparte 3 ligas entre 2 tarjetas para que el árbol se vea en las capturas. **Medido:** `npm test` verde (165 unitarias), E2E **365 · 322 · 28, 0 fallas** (+6 aserciones), capturas docs+archivos a 390 y 1366, claro y oscuro, `overflowX=0` en las 8. SW **v42**.

**v0.32.0** (2026-09-14) — **Filtros sin píldoras: rectángulos y grupos segmentados** (Carlos, 14-sep, artifact `4hGRbwE1` opción B de siete). Todo botón de filtro pasa de `--r-pill` a `--r-sm` (6 px): `.filtros`, `.col-tabs`, `.atajos-fecha`, el summary de «Quién», el buscador, la densidad y el select de Archivos, para que no convivan redondos con cuadrados. Y la forma ahora dice el COMPORTAMIENTO: los filtros **excluyentes** (elige uno) van pegados dentro de un solo marco `.grupo` con el activo sólido de marca — Hoy (`#hoyFiltro`), Docs (`#docsFiltro`), Archivos por tipo (`#archivosTipo`), Actividad por quién (`#acFiltro`), los atajos de fecha (envueltos en `comun.js` `atajosFecha`) y las pestañas de columna en celular (`.col-tabs`, ya era un marco por selector); los **acumulables** (solo alta · solo vencidas · solo comentarios) siguen sueltos con el relleno de selección. Descartadas en el artifact: A rectángulo suelto, C subrayado, D casillas, E etiqueta de expediente, F bloque plano, G marcador lateral. El anillo de foco dentro del marco va con `outline-offset: -2px` (el `overflow: hidden` recortaría uno exterior). `selectores-duplicados.py` cazó un choque de `display` entre `.grupo, .col-tabs` y `.col-tabs { display: none }`: el `display` quedó solo en `.grupo`. **Medido** (`capturas.mjs --vistas inicio,proyecto-filtro,docs,archivos,actividad,nueva-tarea --anchos 390,1366`): 12 vistas, `overflowX=0` en las 12, E2E **359 ok · 0 fallas** a 1366; `npm test` verde (165 unitarias). SW **v41**.

**v0.31.0** (2026-09-14) — **Auditoría de diálogos: consistencia y aprovechar el espacio** (Carlos, 14-sep: «cuando le pico a EDITAR LA TARJETA todavía veo mucho espacio del lado derecho»; sin cambio de esquema). Se capturaron los 11 diálogos a 1366 antes de tocar nada. **Tarjeta:** el formulario de «Editar la tarjeta» sigue cruzando las dos columnas pero ahora USA ese ancho — rejilla de dos columnas (`#dlgTarea .editar .forma { grid }`: Tarea y Asignado·Prioridad a todo lo ancho; Color | Vence; Descripción | Proyecto; pie a todo lo ancho); antes iba a 36 rem y dejaba ~300 px vacíos a la derecha. Bajo 900 px, una columna. La primera pasada (mover Editar bajo la izquierda y estirar la lateral gris hasta el pie) solo cambiaba el color del hueco y no bajaba un píxel el scroll — lo cazó el revisor-entregable y se descartó. Las tres acciones de Documentos (Ligar archivo · Subir al buzón · Pegar un enlace) llevan la MISMA caja `.mn-btn.is-sm` (la tercera era `is-ghost` y se leía como liga suelta). **Todo diálogo rueda por su CUERPO, con cabecera y pie fijos** (`.mn-dialog[open]` en columna flex con `max-height`; los formularios llevan head/body/foot dentro del `<form>`, así que el form es la columna): antes Tarjeta con Editar abierto medía 1,094 px de scroll del `<dialog>` a 1366 y «Cerrar» se perdía arriba; Actividad, 4,800. Ahora `scrollH` del dialog = su alto en los 12 (el cuerpo es lo que rueda: `bodyScrollH` 889 en Tarjeta, 4,747 en Actividad). `driver.js`: la vista `tarjeta-abajo` rueda el cuerpo. **Nueva tarea:** Vence a todo el ancho, como en Editar — a media anchura junto a Cubeta los atajos «hoy · mañana · +7 d · fin del frente» se partían en dos líneas; Cubeta baja a su propio renglón (diálogo 588 → 653 px a 1366). **Ligar:** «Buscar» entra en la fila de los campos (`.lg-fila { 1fr 1fr auto }`), `.is-sm` centrado sobre el input de 44 (`margin-bottom: 6px`), en vez de un renglón propio alineado a la derecha; `.lg-acciones` se retiró. **Subir:** el `input[type=file]` toma piel — `::file-selector-button` como `.mn-btn.is-sm` (antes salía el gris del navegador); el texto «Choose Files / No file chosen» lo pone el navegador en SU idioma y no se controla desde CSS (declarado); y el `<p class="progreso">` vacío ya no deja ~110 px en blanco entre la ayuda y el pie (`:empty { display: none }`; diálogo 409 → 373). **Lo que se revisó y se dejó como está, a propósito:** los diálogos de lectura (Tarjeta, Ligar, Actividad, Equipo) cierran con «Cerrar» en la cabecera y los formularios con «Cancelar» en el pie — es una convención, no una inconsistencia; anchos 512 / 760 (Equipo) / 860 (Tarjeta) según lo que cargan; todos los botones de cabecera y pie son `.is-sm`, el primario siempre al final y el destructivo solo a la izquierda; el `::file-selector-button` de 32 vive DENTRO de un input de 44, como cualquier control. **Medido** (`capturas.mjs --vistas <12 diálogos> --anchos 390,820,1366 --roles gerencia,colaborador,lectura --temas claro,oscuro`): 156 vistas medidas (las de lectura que no abren son «NO APLICA»), `overflowX=0` en las 156, 18 corridas E2E **359 / 316 / 28 con 0 fallas**; Tarjeta con Editar a 1366: `dialog=860x876 scrollH=874` (antes `864 / 1094`); lectura sin Editar sigue en 860×333. `npm test` verde (165 unitarias). SW **v40**.

**v0.30.0** (2026-09-14) — **Botones con respuesta al clic, el filtro de personas como menú «Quién» y la lateral convertida en la pestaña «Resumen»** (Carlos, 14-sep; artifact `YLnjhT3agbL7aktHcEPBZa` con 6 variantes por tema; eligió **B5 + verde**, **F3** y **L6**; sin cambio de esquema). **Botones (B5):** todo `.mn-btn` se encoge un 3 % al pulsar y suelta una **onda** desde el punto tocado (`comun.js: ondaAlPulsar`, un listener delegado en `pointerdown`; el CSS `.onda` + `@keyframes onda` en `estilo.css`, con `prefers-reduced-motion` respetado); el **primario** deja de ser el rectángulo azul plano: **contorno verde de 2 px** (`--status-ok-solid`, el verde del avance y de «hecha») que se **llena** al pasar el cursor o al enfocar con teclado. El hover de `.is-danger` también cambia: se tiñe de rojo suave en vez del gris genérico. Tres excepciones declaradas: el botón de **entrar** conserva su relleno cielo en reposo, hover y foco (el hover verde de `.is-primary` es (0,4,0) y le ganaba a `.entrada .mn-btn.is-primary` — lo cazó el revisor); el **flotante** de «Nueva tarea» en celular va **lleno** — un contorno transparente flotando sobre el tablero dejaba leer las tarjetas a través (lo cazó la captura a 390); y en **tableta (≤ 900)** la fila de pestañas —que con «Resumen» trae 6 + «Nueva tarea» y a 820 desbordaba 30 px el documento— **rueda dentro de sí misma** con «Documentos» → «Docs» (las reglas que el celular tenía desde v0.5.0, subidas a 900) y el primario queda **`position: sticky` al borde derecho** con el fondo de la página, porque de otro modo era justo el botón lo que se perdía dentro del scroller (revisor). Sobre la piel vendorizada sin tocarla (`vendorizar.py --verificar` sigue en verde): las reglas van en `estilo.css` con la misma especificidad y después. **Filtro (F3):** las personas ya no son una píldora cada una — viven en un `<details class="menu-quien">` cuyo summary es un `.mn-btn.is-sm` en píldora (avatar de la primera marcada · nombre, o «Quién» · cuántas marcas · chevrón) y cuya caja flota debajo con **una casilla por persona y su conteo de tarjetas**, la línea y **«Sin dueño»** (`[data-filtro="sinDueno"]`, ahora casilla), más «Quitar el filtro de persona». **Permite varias a la vez**: `estado.filtroTareas.quien` pasa de `string|null` a **array** (`reglas.js: filtrarTareas` acepta los dos, así los 4 tests viejos siguen), y **persona + sin dueño hacen UNIÓN** (mis tarjetas + las huérfanas), no intersección — son casillas del mismo menú; «sin dueño» sola sigue dejando solo las huérfanas abiertas (C7). El menú **conserva su estado abierto** entre repintados (cada cambio repinta la fila entera) y **devuelve el foco a la casilla** recién marcada (el repintado destruía el `<input>` enfocado y el Tab siguiente arrancaba del inicio del documento — revisor); se cierra con clic fuera o Esc, y el «clic fuera» se juzga por ancestro (`closest`), no por `contains`: «Quitar el filtro» repinta en fase objetivo y cuando el evento llega al documento el botón ya está desprendido, así que con `contains` el menú nuevo se cerraba (revisor). El conteo de **«Sin dueño» cuenta solo las huérfanas abiertas** (lo que esa casilla filtra), no las hechas sin asignar (revisor). Con dos personas del mismo nombre de pila el summary usa el nombre completo, igual que la lista. Fuera quedan «solo alta», «solo vencidas» y «× limpiar». En celular ya no hacen falta las reglas B4 de «solo avatar»: se retiraron. **Lateral (L6):** la columna derecha de 260 px desaparece del proyecto — el tablero toma **todo el ancho** (`#p-proyecto .dos-columnas.ancha { grid-template-columns: 1fr }`) y Avance · Quiénes · Próximos vencimientos · Actividad se vuelven la **pestaña «Resumen» en todo ancho** (antes `.solo-movil`): **tres tarjetas cortas en una fila de tres** (`repeat(3, minmax(0, 1fr))`; `auto-fit minmax(240px)` daba cuatro pistas y una vacía a 1366 — revisor) y **Actividad a todo lo ancho** abajo; bajo 900 una columna. Imprimir desde Resumen imprime el resumen (la regla de `@media print` que ocultaba `.lateral` ahora exceptúa `.ver-resumen`; sin eso salía una hoja con solo la cabecera — revisor). Se retiraron la regla `≤ 1200` que bajaba la lateral y los duplicados del bloque de celular (`.lateral`, el scroll de `.tabs`). `app.js` deja de rebotar `#p/<clave>/resumen` a Tablero en escritorio (B2 de v0.5.0). La **línea-resumen** («3 en curso · 2 en revisión · vence en 47 d») pasa a verse en todo ancho, porque ya no hay lateral que la repita (la cabecera contraída de v0.29.0 la sigue ocultando). **Medido** (`capturas.mjs --vistas <18 incl. resumen y proyecto-filtro> --anchos 390,820,1366 --roles gerencia,colaborador,lectura --temas claro,oscuro`, corrida FINAL sobre el CSS de este commit, **324 vistas, 18 corridas E2E con 0 fallas**): `overflowX=0` en las 312 medidas (las 12 restantes son «NO APLICA» de lectura: nueva-tarea y ligar); a 820 «Nueva tarea» se ve entero pegado a la derecha y la pestaña «Resumen» rueda debajo; Resumen a 1366 = tres tarjetas en una fila + Actividad ancha, sin hueco. **Tests:** unitarias **165** (+3: array, `[]`, unión), **E2E 359 / 316 / 28** (+7: menú abre con conteo, marcar filtra y deja el menú abierto, unión con sin dueño, «Quitar» deja el menú abierto, clic fuera cierra, limpiar vacía el array, Resumen en todo ancho muestra la lateral y fuera de Resumen no se ve; la C7 lee la casilla en vez de `is-on`; la B2 de escritorio se unificó con la de celular). **Declarado y no probado:** el hover, la onda y el foco tras repintar no tienen aserción (la E2E usa `.click()`), y el conteo de «Sin dueño» sin hechas no lo cubre el fixture (una sola huérfana, abierta). El revisor-entregable cazó 8 hallazgos: corregidos 7 (los seis de arriba más este párrafo de medición, que citaba una corrida anterior al CSS final); el octavo era esta omisión del bloque ≤ 900 y del hover de `.is-danger`, ya escritos. SW **v39**.

**v0.29.2** (2026-09-14) — **La cabecera del proyecto: el título va en UN renglón mientras quepa, el chevrón del selector pega al texto y «⋮»/plegar viven siempre en la fila del título** (Carlos, 14-sep: «LAU ASEA-03-001 hace wrap con espacio de sobra; el menú de la derecha unas veces choca con el texto y otras queda lejos»). Causa medida en el navegador: `.sel-proyecto > summary { max-width: 100% }` —un porcentaje contra un `<details>` de ancho intrínseco— hacía que Chrome partiera el h1 a ~490 px con 1,000 libres (487×72 → 495×36 al quitarlo), y como el summary conservaba su ancho de una línea, el chevrón quedaba a media pantalla del texto. Estructura nueva: `.titulo` es el ÚNICO item que crece (`flex: 1 1 0`) y adentro solo el `<details>` cede (`min-width: 0`); el chip «Cerrado» y el reloj entran a `.titulo` (index.html) para que la fila sea un solo bloque; `.acc-menu` pierde `margin-left: auto`. En celular (≤720) `.titulo` envuelve, el `<details>` arranca con base 0 (si no se llevaba el icono a otro renglón) y chip/reloj bajan a su propia línea (con el reloj al lado el título quedaba en 65 px a 390). Medido con `herramientas-dev/capturas.mjs`: a 1366 y 1100 la LAU en una línea (495×36) con el chevrón a +4 px; a 820 envuelve porque no cabe (540 disponibles) y los botones se quedan en la fila; 144 vistas × 3 anchos sin desborde. E2E: 1 aserción nueva que ensancha la cabecera a 1000 px con el título de la LAU —en rojo contra el CSS anterior (`h1 487x72`)— porque el arnés la pinta a ~455 px. SW **v38**.

**v0.29.1** (2026-09-14) — **Las insignias del rail (Mensajes · Mis tareas · Proyectos) ya no pintan «0»** (Carlos, 14-sep). El JS ya las ocultaba con `.hidden = true` cuando el conteo era 0, pero `.mn-rail .mn-rail-hot { display: inline-grid }` de `estilo.css` pisaba el `[hidden]` del navegador y el «0» se veía igual — la misma trampa que `.mn-btn[hidden]` (v0.5.0). Causa raíz, no caso: `.mn-btn[hidden]` se sustituye por un `[hidden] { display: none !important }` global (los 9 `.hidden =` de la app son todos para ocultar). E2E: 1 aserción nueva sobre `getComputedStyle().display` de las tres insignias —reproducida en rojo contra el CSS anterior (`hidden:true / display:grid`) antes del arreglo—; las viejas solo miraban la propiedad `.hidden`, por eso no lo vieron. SW **v37**.

**v0.29.0** (2026-09-14) — **Selector de proyecto en la cabecera · tabla de Archivos compacta con cebra · una sola hilera por documento** (Carlos, 14-sep; artifact `c43ad139`, opciones M5 · T6 · H2). (1) El título del proyecto es un `<details class="sel-proyecto">`: el `summary` es el `h1` con chevrón y la lista (`#selLista`, `pintarSelectorProyecto`) trae los frentes ACTIVOS en el orden de la lista —icono del equipo, título, «N abiertas · M vencidas» (rojo si hay vencidas); el abierto marcado `.is-on`— y elegir uno lo abre en la MISMA pestaña (tablero, docs, chat…); Escape y clic fuera cierran. `#btnCabecera` contrae la cabecera (`.proyecto-cab.contraida` oculta `#pDesc` y `#pResumen`), declara `aria-expanded` y lo recuerda en localStorage `cabecera=contraida`. (2) `.dtabla` compacta (padding vertical `--sp-1`, icono de 22 px) y CEBRA (`tr.doc:nth-of-type(even)` sobre el token nuevo `--banda`, #f4f4f4 / #1a1a1a, más tenue que `--surface-sunken`; la paridad se corre tras cada renglón de grupo, a propósito). (3) **«Ligado por» y «Ligada» salen de la tabla** (`COLUMNAS_DOCS` = Nombre · Fecha · Tipo · Estado · Tarjeta · «⋯», 6): viven en el `title` del renglón y como nota `.menu-nota` (avatar + «Ligado por X · dd/mm/aaaa») arriba del menú «⋯»; todo `td` es `nowrap` (el sobrante es de Nombre y solo Nombre recorta, `min-width` 240→200) y la tarjeta es una píldora de 190 px con «…» (`.tarjeta-liga`, botón en #archivos y texto en lectura; el select de Docs ya medía 180). Un orden guardado por `quien`/`fecha` cae a `del` en `tablaDocs`; `ordenarLigas` conserva las llaves. Las fichas apiladas de celular no cambian (ahí nunca se mostraron esas columnas). E2E: 3 aserciones reescritas (8→6 columnas, quién/fecha → nota del menú, orden de #archivos por Tarjeta) y 4 nuevas (selector · cambio en la misma pestaña · contraer · regresar). SW **v36**.

**v0.28.1** (2026-09-14) — **La marca pliega; el chevrón despliega** (Carlos, 14-sep). Desplegado, el botón de plegar es el lockup «MINSA ENERGY · Proyectos» entero (`#btnMarca`, cursor y hover tenue, sin cambiar su aspecto) y el chevrón no se muestra; plegado, el lockup se oculta y el chevrón `#btnPlegar` es lo único que despliega. Los dos declaran `aria-expanded`; `fijarRail(plegado)` reemplaza el toggle. E2E 346 · 308 · 28, 0 fallas (las 3 aserciones reescritas). SW **v35**.

**v0.28.0** (2026-09-14) — **Rail plegable en escritorio** (Carlos, 14-sep). Un botón chevrón en la marca pliega el rail a 64 px con solo iconos (`.app.rail-plegado`): los rótulos, el logo, el nombre y el sync se ocultan, los contadores saltan a la esquina del icono (`position:absolute`), el pie se apila (Actualizar ganó un icono para sobrevivir plegado). Cada pestaña lleva su rótulo en el `title` desde `app.js`, así plegada sigue diciendo qué es; el botón declara `aria-expanded`. La elección vive en `localStorage` `rail` = `plegado` (sin llave = desplegado), como el tema. En celular no aplica: el rail ya es la barra de pestañas y el botón se oculta en el mismo bloque que la marca. Vista `rail-plegado` en `driver.js`/`capturas.mjs`. E2E 346 · 308 · 28, 0 fallas (+3: arranque desplegado + title, plegar guarda la llave, desplegar la borra; la primera normaliza el estado porque el perfil de Edge conserva localStorage entre las corridas claro/oscuro de `capturas.mjs`). SW **v34**.

**v0.27.0** (2026-09-14) — **Iconos y chips de la tabla de documentos con más carácter** (Carlos, 14-sep, artifact «Iconos y chips de Archivos» `24ba421e`: eligió A2 · B6 · C7 de 6 × 7 × 7 opciones). **A2 hoja sólida:** `iconoArchivo` pinta el cuerpo relleno del color del tipo, el doblez como triángulo relleno más claro (`DOBLEZ` cambió de trazo a `M14 2l5 5h-5z`) y la marca (W · X · P · «PDF») encima; las clases `cuerpo / doblez / marca` las reparte el índice del trazo; el lote es carpeta sólida y el enlace sigue siendo trazo. **B6 etiqueta de expediente:** el chip «Tipo» es una pestaña sólida con punta (`clip-path`) que dice la **sigla** —`tipoArchivo` devuelve ahora `sigla`: PDF · DOC · XLS · PPT · IMG · EML · DWG · ZIP · TXT, LOTE y URL por tipo de liga, la extensión real (≤ 4) en el desconocido y ARCH sin extensión— con la etiqueta larga en el `title`; ordenar y buscar siguen usando la etiqueta larga. **C7 sello:** el chip de estado **solo dentro de `.dtabla .c-estado`** es un contorno cuadrado del color, versalitas monospace y −1.5° (los chips del resto de la app no cambian). Token nuevo `--sobre-solido` (blanco en claro, `#141414` en oscuro): en oscuro los sólidos de la paleta son pastel y la tinta blanca no contrastaba — medido en la captura de Archivos oscuro antes/después. E2E 343 · 305 · 28, 0 fallas (1 aserción nueva: cuerpo + doblez + marca, sigla y title, sello dentro de `.c-estado`); unitarias 162 (+1: las siglas). SW **v33**.

**v0.26.0** (2026-09-14) — **La línea de tiempo del Roadmap a pantalla completa** (Carlos, 14-sep): botón «pantalla completa» en el título de la tarjeta (`#btnRoadmapFull`, el mismo `.ver-toda` de Actividad); al pulsarlo la tarjeta `#roadmapLinea` toma `is-full` (fija a la ventana entera por encima del rail, `z-pop`; el body pierde el scroll; la leyenda se pega abajo) y el gantt **se repinta** para que el umbral de los rombos salga del ancho nuevo (`vistas.js: roadmapFull · engancharRoadmap`). Se sale con el mismo botón, con **Esc**, o al cambiar de pantalla (`irA`). **No usa la Fullscreen API** a propósito: la PWA de iOS no la tiene y una clase CSS se prueba en la E2E sin permisos del navegador. Medido con `capturas.mjs` (vista nueva `roadmap-full`): a 1366 el gantt ocupa los 1366 px con 4 meses a la vista; a 390 sigue con scroll horizontal dentro de la tarjeta, `overflowX=0` en las dos. Sin cambio de esquema. E2E 342 · 304 · 28, 0 fallas (3 aserciones nuevas: entrar, Esc, cambiar de pantalla); unitarias 161. SW **v32**.

**v0.25.1** (2026-09-14) — **La cola «Hoy» de Inicio pierde el verbo «Abrir» / «Ver» de la derecha** (Carlos, 14-sep): el renglón entero ya era el botón que lleva al pendiente (C9, v0.6.0) y la palabra solo repetía lo que el hover y el cursor ya dicen. `app.js: renglon` pierde el parámetro `verbo` (sus 4 llamadores: vencidas/hoy/semana, «Nuevo para ti», «Te mencionaron», «Sin dueño»), `.hoy-r` pasa de 4 a 3 columnas y se van las dos reglas `.hoy-r .ir` (la de escritorio y la que ya lo ocultaba a ≤ 720 px — en celular nunca se veía). Sin cambio de esquema. E2E 339 · 301 · 28, 0 fallas (la aserción de v0.21.0 exige ahora que el renglón NO traiga `.ir`); unitarias 161. SW **v31**.

**v0.25.0** (2026-09-14) — **Proyectos como «calendario de mes»: un renglón por frente con la hoja del fin a la izquierda, el icono del equipo, el título con «Rama · Unidad» y tres cifras a la derecha** (opción B5 del artifact «Agenda en siete cortes», `5276f348`, elegida por Carlos el 14-sep con una instrucción explícita: **sin anillo de %, sin nada debajo del título** —ni barra por cubeta, ni conteo por cubeta, ni «sigue:», ni chips, ni avatares—; sin cambio de esquema). Sustituye a las fichas por unidad de v0.23.0, en Proyectos **y** en «Proyectos activos» de Inicio (comparten `app.js: fichaProyecto · pintarFichas`). **La lista vuelve a ser plana**, ordenada por lo que vence antes (C10) —el encabezado por equipo `.uni-h` y `agruparPorEquipo` dejan de usarse en la app (la función y su unitaria siguen en `reglas.js`)—; la unidad la dicen el icono y la etiqueta «Ambiental · CALYTEK» en versalitas con el color del equipo (`equipoDe(p).rama · nombre`; «Sin equipo» si no está en el catálogo). **Hoja de calendario** (`.cal`, `comun.js: mesDia` sobre `diaDe`, o sea el día de México): mes arriba con el color del semáforo del frente —rojo vencido · ámbar ≤ `vencePronto` · marca lejos · gris «— ?» sin fecha · verde para un cerrado, que enseña su `CerradoEl`— y el día grande; los días que faltan van al `title` («Fin del frente: 31/10/2026 · en 48 d»), no a la vista. **Las tres cifras** (`.stats`): abiertas = total − hechas (categoría `hecho` de `avance`, la cubeta que cierra aunque se renombre), vencidas (`vencidasEn`, en rojo si > 0), hechas. El título y la etiqueta corren **en línea dentro de un mismo bloque de texto** (`.tt`): la etiqueta sigue al título y cae a la línea siguiente cuando no cabe; a 390 px la hoja mide 48, la etiqueta va en su propia línea y las cifras bajan bajo el título (`@media ≤ 720`). Dos versiones intermedias se descartaron por captura: `flex-wrap` mandaba el icono solo a una línea (390 y 820), y una columna propia `nowrap` para la etiqueta estrangulaba el título a 75 px a 820 («LAU / ASEA-03- / 001 …» en 6 líneas — lo cazó el revisor, porque la re-captura tras el primer arreglo solo cubrió 390 y 1366). **Medido con el código final** (`capturas.mjs`, inicio · proyectos · proyectos-busca × 390/820/1366 × claro/oscuro, 18 capturas, `overflowX=0` en todas, exit 0; línea base = HEAD v0.24.0 extraído con `git archive` y capturado en el mismo orden, Inicio primero —el alto de Inicio depende del orden de captura por el estado «Nuevo para ti»—): Proyectos a 1366 sigue en 900 px de documento (4 renglones de 76 px), a 820 en 978, y a 390 pasa de 1,250 a **904**; Inicio a 1366 pasa de 2,515 a **2,404** y a 390 de 3,656 a **3,250**. **E2E** (`e2e.ps1`): gerencia **339** · colaborador **301** · lectura 28, 0 fallas — la aserción C8 del renglón lee ahora el día de la hoja (`Intl` en hora de México) y la clase ámbar; la de v0.23.0 se reescribió en tres (renglones planos sin `.uni-h` con hoja, icono, título, etiqueta y rótulos «abiertas,vencidas,hechas»; abiertas + hechas = tarjetas del frente, **vencidas = las abiertas con fecha pasada del fixture y en rojo solo si > 0**, y ninguna barra/chip/avatar; sin fecha → «—?» con clase `sin`); C7 deja de esperar el chip «sin dueño · 1» en el renglón de Inicio y exige en su lugar que Inicio pinte la hoja y las tres cifras; **nueva:** el cerrado lleva la hoja verde `is-cerrado` con el día de su cierre. Unitarias 161 (sin cambio). SW **v30**. **Revisado por `revisor-entregable`** (7 hallazgos): corregidos el título estrangulado a 820, las cifras de Inicio comparadas entre órdenes distintos, la ausencia de aserción positiva sobre Inicio y sobre el valor de vencidas, y el renglón cerrado sin prueba; el «`fechaCorta` corta en UTC» no aplica (desde v0.21.0 lee `diaDe`); queda para Carlos confirmar que la etiqueta «Rama · Unidad» —que su lista literal no nombraba— se queda. **Lo que se pierde a propósito y dónde queda:** «sigue:» y el reloj en días → dentro del proyecto (cabecera) y en «Fines de frente» de Inicio; «sin dueño · N» → grupo «Sin dueño» de la cola y filtro del tablero; los avatares → diálogo Equipo; el avance por cubeta → pestaña Resumen y Reportes.
**v0.24.0** (2026-09-13) — **La tarjeta a dos columnas: chips bajo el título, «Mover a…» en una fila, notas a la izquierda y el frente con sus documentos a la derecha** (iteración 6 del artifact «Seis iteraciones para ver más fácil», la última; aprobada por Carlos el 13-sep; sin cambio de esquema). El diálogo crece a **860 px** en escritorio (`#dlgTarea`): **izquierda** (`.t-main`) lo que se lee y se escribe —los **chips** asignado (con avatar; «sin asignar» en ámbar) · cubeta (`chipColumna`) · vence (`chipVence`; «sin fecha» en gris; la hecha con fecha, la fecha a secas en verde —`chipVence` calla en «hecho»—) · prioridad (alta en ámbar), la **descripción como párrafo** (`#tDesc`), «Mover a…» en **una fila** (`repeat(auto-fit, minmax(7rem, 1fr))`: las 4 de siempre caben en los ≈540 px de la izquierda; con 6 parten en dos filas; el texto del botón parte en vez de desbordar), el orden y las **notas** con su conteo («Notas · 2»)—; **derecha** (`.t-side`, fondo hundido) lo que se consulta: «Frente» (Proyecto con el icono del equipo en su propia columna, Hecho por, Creada, y **«Último cambio»** cuando `_modificado` difiere de `_creado` —SharePoint no dice quién, `graph.js` solo trae la fecha—) y **Documentos** con su conteo. **«Editar la tarjeta» cruza las dos columnas abajo** (su formulario no cabe en 280 px; conserva 36 rem de ancho para que el campo de fecha no sea una barra) — se aparta del mockup, que lo ponía en la derecha. La tabla de 7 renglones «Proyecto / Asignado / Cubeta…» (`#tKv`) se queda solo con lo del frente. **Un clic en el chip de asignado, de vence o de prioridad abre «Editar la tarjeta» con el foco en ese campo** (`data-edita`; solo con permiso de editar; el botón mide 32 / 40 táctil aunque el chip mida 25; el mockup decía «asignado o vence» — prioridad se sumó porque es un select igual que asignado). **Bajo 900 px se apila** en el orden del DOM (izquierda, luego derecha, luego Editar): el mockup decía «< 860», pero el corte de tableta de esta casa es 900 (B6) y a 820 se lee a una columna. **Medido** (`capturas.mjs`, 390 · 820 · 1366, claro y oscuro, 3 roles, 54 vistas, exit 0): `overflowX=0` en todas; **el diálogo pasa de 512 × 812 a 860 × 549 en gerencia a 1366** (bodyScrollH 482: ya no se scrollea para llegar a las notas; el mockup prometía ~560), 860 × 333 en lectura; con Editar abierto 860 × 864 con scroll interno de 1,094; a 390, 354 × 808 con scroll de **1,035 (v0.23.0: 1,106; −71** — medido contra HEAD extraído con `git archive`, no contra una corrida intermedia). **«Último cambio»** se prueba en la E2E del 412 (la tarjeta releída tras un PATCH ajeno), no en las capturas: la tarjeta capturada no se parchó. **Declarado y no corregido:** la siembra de `driver.js` escribe `Vence` con la hora UTC de la corrida (`dd(-2)`), así que en `tarjeta-editar` el chip dice «venció 11/09» y el campo Vence «12/09» — es del fixture (la app guarda `T18:00Z`), no de la app; y las 4 capturas `tarjeta-editar` a 390 eran idénticas a `tarjeta` porque el `details` abierto quedaba bajo el pliegue (desde esta versión `driver.js` hace scroll a Editar). **Hallazgo ajeno que cazó esta corrida:** la E2E a ≤ 720 px fallaba en «la actividad dice comentó / anotó» **ya en v0.23.0** (medido contra HEAD en un worktree: 332 ok · 1 falla a 390; Inicio recorta la actividad a 3 renglones en celular desde B3) sin que nadie lo leyera —`e2e.ps1` corre a ancho de escritorio y `capturas.mjs` sí lo imprimía—: la aserción lee ahora «ver toda» cuando el viewport es de celular. Unitarias 161, **E2E 337/300/28 (+4)**, SW v29. El revisor-entregable cazó 8 hallazgos: corregidos 6 (las dos cifras de 390 y su línea base, la hecha con fecha, «Último cambio» sin prueba, el `\r\r\n` que habría hecho entrar `pruebas.html` reescrito entero al commit, y el scroll de `driver.js`); declarados 2 (el Vence del fixture y el nombre accesible «GEPersona» del chip con avatar, patrón preexistente de los filtros).

**v0.23.0** (2026-09-13) — **Proyectos como fichas agrupadas por unidad: el color del equipo en el borde, la barra segmentada por cubeta con su conteo, «sigue:» y quiénes están** (iteración 5 del artifact «Seis iteraciones para ver más fácil», aprobada por Carlos el 13-sep; sin cambio de esquema). La lista de renglones «reloj primero» de v0.7.0 se va: **Proyectos** y el bloque **Proyectos activos** de Inicio pintan las mismas fichas (`app.js: fichaProyecto · pintarFichas`) bajo un **encabezado por equipo** en el orden del rail —«AMBIENTAL · CALYTEK ——— 2 frentes»— (`reglas.js: agruparPorEquipo`: equipos sin proyectos no salen; un proyecto sin equipo o con uno fuera del catálogo cae en un grupo final «Sin equipo»); con el filtro del rail queda un solo grupo, y los **cerrados** van sin agrupar, por fecha de cierre. La ficha: borde superior y `--c` del color del equipo, icono chico, título, **reloj grande** (rojo vencido · ámbar ≤ 7 d · marca lejos · gris sin fecha · ✓ verde cerrado; el fin del frente va en su `title`), **barra segmentada** de 10 px en el orden de las cubetas de ESE frente (de Hecho a la primera, el mismo orden que la barra de v0.7.0; el color elegido de v0.12.0 manda) —**el tramo en cero no se pinta**, conservaba su gap de 2 px como un hueco al inicio de la barra; y una tarjeta cuya cubeta ya no existe, que `avance` no suma en ninguna clave, sale como tramo y conteo **«sin cubeta»** (gris) en vez de desaparecer de la ficha— y debajo la **fila de conteos con su muestra de color, los ceros incluidos** —la fila dice qué cubetas hay; dice «hechas» mientras la cubeta que cierra se llame «Hecho», y su nombre si la renombran; la muestra de «por hacer» lleva un filete porque en oscuro `--border-default` se funde con la ficha—, «sigue:» con la tarjeta abierta más urgente (fecha y días en el `title`; «—» si no hay), y el pie: **«N vencidas»** (rojo) o, si no hay vencidas, **«próx. dd/mm»** (gris) con la fecha de la que sigue; «sin dueño · N» (ámbar, `data-sin-dueno`); «cerrado dd/mm/aaaa» en los cerrados; y hasta 6 avatares. **El reloj del frente NO se repite como chip** (hallazgo del revisor del 12-sep sobre C8): ya es el número grande. Sin leyenda global: cada conteo lleva su muestra, porque con cubetas editables el color va por posición y no por nombre. Rejilla **`auto-fit`** con piso de 300 px y ficha de 640 px como mucho: un grupo de 1 o 2 frentes llena el ancho (con `auto-fill` a 1366 quedaba una tercera columna vacía y la ficha de escritorio salía más angosta que la de celular); a 390, una columna. `.pficha` sustituye a `.renglon` en la E2E y en `driver.js`. **Medido** (`capturas.mjs`, 1366 · 390, claro y oscuro): `overflowX=0` en las 12; Proyectos 900 px de alto a 1366 y 1,250 a 390; **Inicio 2,406 px a 1366 (v0.21: 2,363; +43 con las 4 fichas en dos filas) y 3,492 a 390 (v0.21: 3,280; +212 con las 4 en una columna)**; a 390 ningún objetivo táctil menor de 36 px (a 1366 siguen los 16 de 32 px de siempre: rail, `is-sm`, buscador). El revisor-entregable cazó 11 hallazgos; corregidos 8 (la tercera columna vacía, «hecho»→«hechas», el tramo en cero, «sin cubeta», la muestra en oscuro, `<p>` dentro del `<button>`, el `title` «undefined» del icono de un proyecto sin equipo —`comun.js: equipoDe` ya dice «Sin equipo»— y las dos cifras que faltaban aquí); **declarado y no corregido:** no hay captura ni E2E de aspecto de una ficha **cerrada** ni de una **vencida** (la E2E las abre por clic, no las mira) ni del grupo «Sin equipo» (inalcanzable desde la app: el choice es obligatorio). Unitarias 161 (+2), E2E 333/296/28 (+2), SW v28.

**v0.22.0** (2026-09-13) — **Roadmap con hitos: cada tarjeta con fecha es un rombo sobre la barra de su frente; la raya de hoy se lee y los meses alternan fondo** (iteración 4 del artifact «Seis iteraciones para ver más fácil», aprobada por Carlos el 13-sep; sin cambio de esquema). **Rombos** (`reglas.js: hitosDe`): un hito es una tarjeta con `Vence` y su rombo va en **la fecha del plan** (el Vence), no en la de hecho —el rombo dice dónde estaba el hito; el `title` dice cuándo se hizo—; el color es el de `semaforo()` con la ventana del chip (`CONFIG.vencePronto`, 7): **hueco** pendiente · **ámbar** vence hoy o en 7 días · **rojo** vencida · **verde** hecha. Hover/`aria-label` = título · estado con fecha · quién; **clic abre la tarjeta** (`#p/<clave>/t/<id>`); objetivo táctil de 36 px por un `::after` invisible (el rombo mide 14). **Agrupar** (`reglas.js: acomodarHitos`): un rombo a menos del umbral del **ancla** del anterior (su primer miembro) se funde con él en un grupo **«+N»** con la clase más urgente (vencida > pronto > pendiente > hecha); el grupo **se dibuja en su primer miembro** —un día en que sí vence algo, y a un umbral o más del siguiente rombo—, su `title` lista las tarjetas y su clic abre el **roadmap del frente**, donde cada una tiene su carril. (La primera versión promediaba y encadenaba por el último miembro: el revisor cazó que el rombo caía en días vacíos y que un frente con tareas cada 3 días colapsaba entero a un «+N».) El artifact decía «más de ~8 se agrupan»; se agrupa por **distancia**, no por cuenta: ocho hitos en tres meses caben y dos el mismo día no. El umbral sale del ancho real de la pista (18 px; 2 % del eje si la caja aún no mide) y se calcula al pintar —sin `resize`: al girar el celular la agrupación queda con el ancho anterior hasta el siguiente repintado—. En la siembra rica la LAU trae 9 tarjetas entre −2 y +14 días: a 1366 salen «+4» rojo · «+3» ámbar · dos sueltos; a 390 (pista de 370 px) todo cabe en menos rombos. El **título** del rombo se pinta debajo si hay ~56 px libres hasta el siguiente rombo o la raya del fin (`max-width` = ese hueco, con puntos suspensivos; si el tope es la raya se descuentan además los 36 px de su fecha); un grupo siempre dice «+N». **Raya de fin de frente** (`i.g-fin`, con «dd/mm» debajo, a la izquierda de la raya): se ve aunque la barra vaya en 0 %; **el avance pasa al final de la barra** (al principio lo tapaban los rombos) y la fecha sale de la barra y de su texto —la dice la raya, la etiqueta del frente («7/17 hechas · 41% · fin 31/10») y el `title`—. Un hito que vence DESPUÉS del fin de su frente se pinta más allá de la raya (la siembra lo tiene: RABASA vence 18/09 y su prueba de laboratorio 19/09). El eje (`rangoRoadmap`) contiene ahora también los hitos, no solo los lapsos de los frentes. **Compartido por los dos gantts** (global y pestaña Roadmap del proyecto, `vistas.js: gantt`): la **raya de hoy lleva etiqueta** «hoy · 13 sep» en la **cabecera** (a la izquierda de la raya si cae en el último 15 % del eje; fondo opaco porque el token de peligro es translúcido y en oscuro se leía la semana detrás; **tapa los números de las 2-3 semanas que le siguen**, a propósito —la cabecera NO se queda fija al hacer scroll: `.gantt-caja` es `overflow-x: auto` y eso la vuelve el scrollport del `sticky`, herencia de v0.10.0—), y los **meses alternan fondo** por un `linear-gradient` calculado del rango (`--bandas`, una sola regla en `.g-pista`; el tinte es 6 % del color del texto, no `--surface-sunken`: en oscuro no se veía y las filas de grupo del roadmap del proyecto ya traían ese fondo). **La raya del fin va por ENCIMA del rombo** (`z-index` 4, sin `pointer-events`): un hito el día del fin no la tapa, aunque a 4 px/día el rombo y la raya se tocan y la fecha «dd/mm» queda bajo la mitad izquierda del rombo; y si el fin cae a menos de ~36 px de hoy, la línea roja cruza esa fecha. **Leyenda** bajo la línea de tiempo (`#roadmapLeyenda`, `.g-rombo-mini`): las cuatro clases con la N de CONFIG, y «rombo = tarjeta con fecha · barra = creación → fin del frente · relleno = avance · raya = fin del frente». **Diferencias con el mockup, a propósito:** los títulos de los rombos van horizontales debajo de la barra (el mockup los giraba 45°: en filas de 56 px se saldrían y no se leen); el frente sin fin pero con tarjetas con fecha conserva su barra gris (el mockup pintaba solo rombos): la barra es lo que abre el frente y lo que la E2E cuenta; en el gantt con rombos una barra corta ya **no** escribe su texto afuera (chocaba con los rombos; queda en la etiqueta y el `title`) — en la siembra, «Inhibidor RABASA» pierde el «0% · sin fin de frente» de al lado, que su etiqueta ya dice; los rombos van solo en el roadmap **global** (en la pestaña del proyecto cada tarjeta ya es su propia barra); los 8 rombos sin etiqueta que el mockup pintaba en la LAU no se reproducen: a 1 día de distancia (7-10 px) se encimarían y salen agrupados; el listado «Fines de frente próximos» queda tal cual. **Medido (`capturas.mjs`, roadmap · roadmap-proyecto × 390/820/1366 × claro/oscuro, 12 capturas: `overflowX=0` en todas):** la fila del gantt global pasa de 36 a 56 px (rombo + título); la página a 1366 mide 900 (antes ~820); a 390 el gantt sigue con scroll horizontal propio (min-width 520, como desde v0.10.0); el rombo de 14 px lleva un área táctil de 36 por `::after`, que `chicos` no mide (reporta el botón de 20×20) y que se solapa con la del rombo vecino cuando están a 18 px. SW v27. Unitarias: reglas **159** (+6: `hitosDe`, `acomodarHitos` ×5 —posición y espacio, tope de la raya, grupo por umbral con promedio y rango de días, encadenado por el último con la clase más urgente, fuera del rango—). E2E `e2e.ps1` (salida de consola por rol; `_salida-dev.json` solo conserva el último rol): gerencia **331** · colaborador **294** · lectura 28, **0 fallas** (+6: cada tarjeta con Vence del frente sale en un rombo o en un grupo, sin perderse ni repetirse; la que vence hoy y la hecha de hoy comparten día y se funden en UN grupo ámbar —`is-pronto`, no `is-hecha`— mientras una hecha sembrada hace 20 días sale verde y sola; raya de fin con «dd/mm» y el `.g-txt` de la barra es solo el «N%»; etiqueta de hoy + bandas + leyenda; **clic real** en el rombo suelto → abre SU tarjeta con su hash; **clic real** en el grupo «+N» → aterriza en `#p/<clave>/roadmap`). **Sin prueba:** el ancho real del umbral (la E2E corre con la caja visible pero no mide píxeles). **Trampa del arnés que esta versión destapó (`test/pruebas.html`, cabecera de `esperar`):** Chromium **ignora en silencio** los `pushState` que pasan de ~100 en 10 s (crbug 1038223) y con tiempo virtual toda la corrida cabe en esos 10 s; las dos navegaciones nuevas de esta E2E cruzaron el tope y `irHash('#p/borrable')` de una prueba de v0.13.0 dejó de cambiar el hash —falla determinista en un paso ajeno al cambio—. El arnés cuenta ahora los `pushState` y desde el siguiente `esperar()` duerme 10.5 s virtuales cada 90. **Caso límite declarado:** una hecha SIN `Vence` (las 7 «Entregable N» de la siembra) no es hito —la definición es «tarjeta con Vence»—, así que el roadmap global no enseña lo hecho sin fecha; para eso está el KPI «hechas» y la pestaña del proyecto.

**v0.21.0** (2026-09-13) — **Inicio «Hoy»: saludo, 3 KPI con tendencia y UNA cola por urgencia; y el día se corta en hora de México** (iteración 3 del artifact «Seis iteraciones para ver más fácil», aprobada por Carlos el 13-sep; sin cambio de esquema). Antes Inicio repartía lo urgente en cuatro tarjetas con cuatro formatos (5 KPI · Nuevo para ti · Te mencionaron · Próximos vencimientos). **Saludo:** el título es «Buenos días / Buenas tardes / Buenas noches, Nombre» por la hora de México (`reglas.js: saludoDe`; corte a las 12 y a las 19) y debajo «domingo 13 de septiembre · 4 frentes activos · gerencia» (`#inicioSaludo`, `#inicioSub`). **KPI:** los 5 bajan a **3 de lo mío** —mías abiertas · vencen en 7 d · vencidas—, cada uno con **tendencia contra ayer** («▲ 1 desde ayer» / «▼» / «= igual que ayer»; rojo si subir es mala noticia, verde si bajó) y un **sparkline de 8 días** (SVG 100×22 sin eje, color del filete). El número de hoy se cuenta como siempre; **ayer y los 6 días anteriores se RECONSTRUYEN** (`reglas.js: kpisEn · serieKpis`) por fecha de creación (`_creado`, el `createdDateTime` de SharePoint) y de cierre (`HechoEl`): una tarjeta contó como abierta ese día si ya existía y no estaba hecha. **Lo que la reconstrucción no ve, a propósito:** un cambio de asignado (se toma el de hoy) y una hecha que se reabrió (al reabrir se limpia `HechoEl` y cuenta como abierta todo el tiempo) — la tendencia es una aproximación honesta, no el exporte diario; sin `_creado` (siembra) la tarjeta cuenta desde siempre. «Proyectos activos» ya lo dice el saludo; «sin dueño» pasa a la cola. **La cola «Hoy»** (`app.js: pintarCola`, reglas puras en `reglas.js: gruposHoy`): una sola lista con encabezados de grupo en orden de urgencia — **Vencidas · Hoy y mañana · Nuevo para ti · Te mencionaron · Esta semana · Sin dueño** — y **el mismo esqueleto por renglón**: punto de estado · título · subtítulo (**el dato primero y el frente después**: a 390 px el subtítulo se trunca y lo que se pierde es el nombre del proyecto, no la fecha) · avatar (o «?» sin dueño) · verbo «Abrir» / «Ver» (el renglón entero es el botón, C9; **en celular el verbo se esconde** —el renglón sigue siendo el botón— y un evento sin a dónde ir, p. ej. de un proyecto borrado, sale como texto sin verbo). Cada tarjeta con fecha entra **una vez**, en el grupo más urgente (las sin dueño solo en el suyo: el revisor cazó que con «todo el frente» una huérfana con fecha salía dos veces y el «Hoy · N» la contaba doble); los grupos por fecha se recortan a **6** con un «+N más → …» que lleva a donde SÍ están todas: Vencidas a Mis tareas con «solo mías» y a **Reportes** («Vencidas por proyecto») con «todo el frente» —Mis tareas no trae las ajenas (revisor)—, Hoy y Esta semana al Calendario; «Nuevo para ti» a 8 y «Te mencionaron» a 6, como sus tarjetas de antes. Conmutador **«todo el frente» / «solo mías»** (`#hoyFiltro`, `estado.hoySoloMias`, la sesión; default todo, como «Próximos vencimientos») sobre los grupos por fecha; «sin dueño» es de nadie y sale siempre, «nuevo para ti» y «te mencionaron» son míos por definición. **Decisión de Carlos (13-sep): «Nuevo para ti» entra como grupo de la cola** (la marca de lectura compartida en `PROY_Roles.Visto` sigue igual: el piso se congela al entrar y sube al pintar; el conteo va en el encabezado del grupo). **Cambio respecto a v0.15.0:** una mención que ya salió en «Nuevo para ti» **no se repite** en «Te mencionaron» (antes eran dos tarjetas y salía en las dos a propósito; en una sola cola sería un renglón duplicado). El encabezado «Sin dueño» es un botón que aterriza en el proyecto con más huérfanas con el filtro puesto (el salto que tenía el KPI, C7; `data-kpi="sin-dueno"` se conserva para la E2E). Vacío: «Nada urgente: ni vencidas ni por vencer esta semana». **Lateral:** Acciones rápidas (igual) · **Fines de frente** (nueva: los activos con fecha, hasta 4, chip de días · título · fecha y hechas/total; abre el proyecto; oculta si ninguno tiene fecha) · Sin movimiento (igual). Proyectos activos y Actividad reciente siguen debajo, como prometía el artifact. **El día en hora de México (el defecto declarado en v0.20.0, con OK de Carlos):** `reglas.js: diasPara` y `diaDe` cortan el día por `fechaMexico` (formateador `Intl` cacheado) en vez de `getUTC*`, así que desde las 18:00 de México lo que vence hoy ya no se pinta vencido, una tarjeta creada «para hoy» a las 18:30 ya no nace vencida, y Reportes / Roadmap / Calendario (que pasan por `diaDe`) cortan la semana y el mes por el mismo reloj. `Vence` sigue guardándose a las 18:00Z (mediodía de México) y no cambia de día. **Y `comun.js: fechaCorta` lee ahora el mismo reloj** (el revisor cazó que seguía tomando la fecha UTC del string: «Hecho el», «cerrado el», «ligada» y el «calculado al …» de Reportes imprimían MAÑANA desde las 18:00, y la captura de entrega decía «venció 13/09» en un Inicio del domingo 13): un ISO con hora se imprime en su día de México; un día suelto, tal cual. Quedan a hora LOCAL del dispositivo, no de México, y se declaran: el atajo «hoy» de `atajosFecha` (desde v0.19, consistente solo con el dispositivo en México) y el año que decide `chat.js: rotuloDia`. `fechaCorta` vive en `comun.js` y no tiene unitaria; se verificó a mano en node y por la E2E. Las unitarias de fechas pasaron su fixture de `T00:00:00Z` (18:00 de la víspera en México) a `T18:00:00Z`, la convención real de la app, y ganaron 4 comprobaciones del corte (20:00 de México = hoy, no vencido; 00:00Z de mañana = hoy; `diaDe` a las 23:30Z; la hecha del domingo a las 20:00 cae en su semana). La E2E «hecha de esta semana» siembra ahora `HechoEl = ahora` (antes −2 días, que fallaba lunes y martes). **Medido (`capturas.mjs`, 12 vistas de Inicio × 2 temas: `overflowX=0` en las 24; `chicos(0)` a 390 y 820 — el encabezado-botón «Sin dueño» medía 21 px y subió a 36 —; a 1366 siguen los 20 de 32 px del rail y los dos chips del conmutador, herencia de `--control-h-sm` como en v0.20.0; la primera captura a 390 registra `hash=#p/borrable` con `vista=inicio`, resto del recorrido E2E previo, no de la vista):** la altura de la PÁGINA a 1366 con la siembra rica es **2,363 px (gerencia) / 2,290 (colaborador), contra 1,959 en v0.18.0** — más alta, no menos: la cola trae los 15 urgentes de la siembra en la columna ancha (antes 6 vencimientos + 6 menciones en la lateral de 340 px, apretados) y el pliegue a 1366 muestra KPI + Vencidas + Hoy y mañana + Nuevo para ti, que es el orden que importa; a 390: 3,280 (antes 3,257). El artifact no prometía menos alto para esta iteración (su «por qué» era el formato único y la tendencia), pero se declara. Diferencias con el mockup, a propósito: sin «leído hace N s» en el saludo (ya está en el rail); el chip del renglón dice «vence 16/09/2026», no «vence 16/09»; el KPI 2 se llama «vencen en 7 d» (mockup: «Vencen esta semana», que se lee como semana calendario y no lo es); el orden de grupos pone «Nuevo para ti» antes de «Te mencionaron», y las dos ANTES de «Esta semana» — el artifact se contradice (su bullet dice «vencidas · hoy · esta semana · te mencionaron», su mockup pinta las menciones antes que la semana); se siguió el mockup, que es lo que Carlos vio. SW v26. Unitarias: reglas **153** (+10: corte de México ×4, `kpisEn` ×3, `serieKpis`, `gruposHoy`, `saludoDe`). E2E `e2e.ps1`: gerencia **325** · colaborador **288** · lectura 28, **0 fallas** (+6: 3 KPI con tendencia y sparkline, saludo y fecha, orden de grupos y esqueleto de renglón con recorte, «solo mías» / «todo el frente», renglón que abre la tarjeta, grupo «Sin dueño» con su salto; las de «Te mencionaron» y «Nuevo para ti» se reescribieron sobre la cola). **Sin prueba:** que la tendencia pinte «▲» / «▼» (la siembra nace con `_creado` de anteayer y todo da «= igual que ayer»; `kpisEn` sí lo prueba en unitaria). **Caso límite declarado de `kpisEn`:** una tarjeta en «hecho» SIN `HechoEl` (siembra vieja) no cuenta como abierta ningún día, ni ayer; y «mías abiertas» sigue sumando tarjetas de frentes cerrados, como desde v0.20.0. **Revisado por `revisor-entregable`** (7 hallazgos de fondo): se corrigieron `fechaCorta` a dos relojes, la huérfana duplicada, el «+N más» de Vencidas que llevaba a una lista sin ellas, el verbo en un renglón sin abridor, el `chicos` mal declarado y las diferencias con el artifact no declaradas; quedó declarado el caso sin `HechoEl`.

**v0.20.0** (2026-09-13) — **Tablero con modo compacto y semáforo de fecha** (iteración 2 del artifact «Seis iteraciones para ver más fácil», aprobada por Carlos el 13-sep; sin cambio de esquema). **Semáforo:** el filete izquierdo de la tarjeta (3 px, ahora en TODAS) deja de decir «prioridad alta» y dice **fecha**: rojo vencida · ámbar vence hoy o en `CONFIG.semaforoDias` (3) días · gris en tiempo o sin fecha · verde hecha (`reglas.js: semaforo()` → clases `is-vencida` / `is-pronto` / `is-hecha`; se pinta también en Mis tareas, y gana sobre el tinte `data-tono` porque va después en el CSS). La ventana del filete (3) es a propósito más corta que la del chip «vence pronto» (7): el borde grita solo lo inminente y el chip sigue avisando la semana. **La prioridad alta pasa a un punto** de marca delante del título (`i.p-alta`, `role="img"` + `aria-label`) y en la columna «P» de la Lista (la misma forma); la clase `.alta` se conserva. El contador de cada cubeta se pone **rojo** cuando trae vencidas (`reglas.js: vencidasEn`), con el detalle «· 1 vencida» solo en cubetas de 240 px o más (container query — a 1366 con la lateral miden **195 px** y el texto partía el encabezado en dos renglones; abajo quedan el rojo y el `title`); en celular la pestaña de la cubeta también se pinta roja. Leyenda bajo las columnas (vencida · hoy o en N días · en tiempo · hecha · prioridad alta), con la N leída de CONFIG. **Compacto:** conmutador **Cómodo / Compacto** (`#densidad`, `role=group`, `aria-pressed`) en la fila de filtros, tras el buscador — en la fila de pestañas desbordaba 84 px a 820 —, solo visible en el tablero; se recuerda **por dispositivo** (`localStorage.densidad`, `estado.densidad`; en celular vive detrás de «Filtrar», como los filtros, y ese botón no insinúa que Compacto esté puesto). En Compacto cada tarjeta es **una línea** de 36 px mínimo (objetivo táctil de `driver.js`): título con puntos suspensivos · avatar · chip de fecha **sin año ni verbo** («12/09», «hoy»; el color del chip y el filete ya dicen si venció); se esconden el nombre, las insignias, «en el buzón» y «sin movimiento», y **todo eso va al `title`** (hover) junto con el título completo y la fecha entera, además de seguir en la ficha. Las hechas y las tarjetas sin fecha no llevan chip (conducta previa de `chipVence`). **Medido (`capturas.mjs --medir`, altura de `#tableroCols`):** 1366: 609 → **280 px**; 820: 923 → 539; 390: 409 → 244; `overflowX=0` en las 24 capturas (claro y oscuro, 3 anchos; `chicos(0)` a 820 y 390). **Lo que NO cambió y el artifact prometía:** la altura de la PÁGINA a 1366 sigue en `docScrollH=1852` en los dos modos — la dicta la columna lateral (Avance · Quiénes · Próximos vencimientos), no el tablero; el tablero sí cabe entero sobre el pliegue. Costo declarado: a 1366 la fila de filtros ya no cabe en una línea con el conmutador (66 px, antes 34) — los chips solos miden ~760 de los 806 del panel, así que ningún acomodo lo evita; y a 1366 el título compacto queda en 1–2 palabras cuando la tarjeta trae punto + avatar + chip (en el hover está entero). Diferencias con el mockup, a propósito: el buscador de tarjetas baja de 16 a 13 rem; sin opacidad en las hechas; el chip de vencida dice «12/09», no «venció 11/09». **Defecto previo que esta iteración hereda y NO corrige (revisor):** la app corta el día por **UTC** (`reglas.js: diasPara` compara `getUTC*`, y `Vence` se guarda como `T18:00:00Z`), así que **desde las 18:00 de México todo lo que vence hoy se pinta vencido** —filete rojo, chip «venció», contador rojo— durante 6 horas, y una tarjeta creada «para hoy» a las 18:30 nace vencida; el mismo corte hace que Reportes abra una semana vacía en `hechasPorSemana` a esa hora. Es la causa raíz del semáforo, del chip y de Reportes a la vez: se corrige en una sola función (el día de hoy en hora de México, `fechaMexico` ya existe) y es la siguiente versión, con OK de Carlos. SW v25. Unitarias: reglas 143 (+2: `semaforo`, `vencidasEn`). E2E `e2e.ps1`: gerencia **319** · colaborador **282** · lectura 28, con **una falla ajena y dependiente de la fecha**: «v0.10.0: la hecha de esta semana cuenta en la última columna» siembra `HechoEl = hoy − 2 días` y corta la semana por UTC, así que falla los lunes y martes a cualquier hora y los domingos desde las 18:00 de México (v0.19.0 corrió el domingo a las 17:48 y pasó); el corte UTC es el defecto de arriba y la siembra a −2 días es de la prueba. La E2E nueva (9) parte de Cómodo a propósito —el harness y el dev manual comparten el `localStorage` de `localhost:8080`— y **no** prueba que Compacto sobreviva a una recarga (`leerDensidad` corre al cargar el módulo y el harness no recarga): esa mitad queda sin prueba. Capturas `proyecto-comodo` · `proyecto-compacto` (vistas nuevas de `driver.js`).

**v0.19.0** (2026-09-13) — **Nombre humano y fecha del documento en Documentos/Archivos; la ruta sale de debajo del nombre.** Primera de las seis iteraciones del artifact «Seis iteraciones para ver más fácil» del 13-sep (variante B, elegida por Carlos). Cada renglón de la tabla de v0.17.0 pasa de dos líneas a **una**: `reglas.js: nombreHumano()` parte el nombre de la convención de la casa (`AAAA-MM-DD_Emisor_Tipo_detalle-en-kebab_ID_rev2.ext`) en **fecha** (columna nueva «Fecha», la del documento; acepta también un prefijo de solo año o año-mes, que se pinta tal cual), **emisor** (en gris mono antes del título), **título** (los segmentos restantes unidos con « · », con mayúscula inicial; los guiones pasan a espacio salvo en lo que parece identificador —lleva dígitos y ninguna minúscula— para que `SOLPED-1000000001` o `PDH-009` queden enteros) y **rev** (chip `rev2` / `rev02` / `v3` / `v3.0`). Un nombre fuera de la convención sale entero, sin fecha («—») ni emisor y sin retocar: **nada se inventa**; un **enlace** se lee tal cual aunque su título empiece por fecha (`nombreDeLiga`, la misma lectura para pintar, ordenar y buscar). La ruta (o la dirección del enlace) ya no se pinta: vive en el `title` del nombre —junto con el nombre completo del archivo— y en el menú «⋯» como **«Copiar ruta»** / «Copiar dirección» (portapapeles; sin portapapeles cae al aviso, como «Copiar liga» — esa caída está razonada, no medida por la E2E). El buscador de Docs y de Archivos encuentra también por el **título que se ve** («plan contingencia», con espacio), además de nombre, ruta y dirección. **Orden:** la columna de la fecha de la liga se renombra **«Ligada»** (conserva la llave `fecha`); la tabla **arranca ahora por la fecha del documento** (más nueva arriba; sin fecha y enlaces al final), porque «Ligada» se cede en el panel de Docs a 1366 y una columna oculta no puede quedar mandando sin flecha (regla de v0.18.0); **Nombre ordena por lo que se ve, `[emisor] título`**, no por el nombre del archivo. **Medido:** con la columna nueva la tabla no cabía en el panel de Docs a 1366 (808 px): bajo 900 px de panel se ceden «Ligado por», «Ligada» **y el chip Tipo** (el icono ya lo dice; sus ~86 px van al título); el nombre en `flex` desbordaba 99 px en #archivos porque en una tabla de layout automático el flex aporta su texto nowrap como mínimo: es ahora un **grid** con el título en `minmax(0, 1fr)`, y Nombre es la única columna `auto` (las demás a `1%`; el select de Tarjeta con `width` fijo, no `max-width`). En ficha apilada (celular) la fecha del documento va junto al tipo (renglón 2) y el estado junto a quién ligó (renglón 3); la de la liga no se pinta. **Lo que `nombreHumano` pinta raro y se declara** (revisor, sobre 9,308 nombres reales de las bibliotecas): un CFDI ligado sale con el RFC como emisor y `Z · 524FC616` de título; 24 nombres traen una palabra genérica como emisor (`COTIZACION`, `HDS`, `ADMIN`…); las frases con un ID adentro (`aceite-lubricante-H-300-AW-68`) conservan sus guiones. Diferencias con el mockup B, a propósito: encabezado «Fecha» (no «Del»), emisor visible, fecha `dd/mm/aaaa` como el resto de la app. Sin cambio de esquema; SW v24. Unitarias: reglas 141 (+11: `nombreHumano`, `nombreDeLiga`, orden por `del`/lo visible, búsqueda por título). E2E `e2e.ps1`: gerencia 311 · colaborador 274 · lectura 28, 0 fallas (la de 390 px «comentó/anotó» sigue igual, ajena). Capturas docs · archivos a 1366/820/390 claro y oscuro: `overflowX=0` en las 12. Correcciones del `revisor-entregable` en la misma versión: arranque por columna oculta, buscador que no encontraba lo que se ve, enlaces ordenados como archivos, fecha del documento junto a quién ligó (se leía como la de la liga), orden por Nombre que ignoraba el emisor, `v3.0` y prefijos de año, minúscula inicial.

**v0.18.0** (2026-09-13) — **Ordenar por columna en Documentos/Archivos y acciones rápidas en Inicio** (recomendaciones 4 y 3 de las seis que salieron de las capturas de referencia del 13-sep; ninguna toca el esquema). **Ordenar:** los seis encabezados de la tabla de v0.17.0 (Nombre · Tipo · Estado · Tarjeta · Ligado por · Fecha; «⋯» no) ordenan al clic con el mismo patrón F10 de la Lista de tareas (`reglas.js: ordenarLigas · direccionInicial`, `docs.js: tablaDocs(alOrdenar) · ordenarDocs`, `estado.ordenDocs`): Fecha arranca con la más nueva arriba (el orden que ya había), las demás ascendente, el segundo clic invierte y la flecha va en el activo (`aria-sort`). Se ordena **dentro de cada grupo** —la tarjeta en Docs, el proyecto en Archivos—: los grupos conservan su acomodo. Tipo ordena por la etiqueta visible (Enlace, Lote en el buzón, PDF, Word…), Tarjeta y Ligado por por el texto que se ve, y lo que no tiene valor (sin tarjeta, sin quién, sin fecha) va al final en las dos direcciones. Cada vista tiene su orden: el de Docs (`estado.ordenDocs`) se reinicia al cambiar de proyecto como `ordenLista`, para que una columna oculta en ese panel no quede mandando sin flecha; el de Archivos (`estado.ordenArchivos`) vive la sesión como su filtro. Los encabezados se alcanzan con teclado (Tab + Enter/espacio) y su `title` dice hacia dónde va el siguiente clic. **Donde la tabla se apila en fichas no hay encabezado y no hay por dónde ordenar** —celular en las dos vistas, y en tableta también las dos (Docs y Archivos comparten el container query de 720 px de panel)—: ahí manda el último orden elegido en escritorio o el de Fecha; un control propio para fichas queda fuera a propósito hasta que alguien lo pida. **Acciones rápidas:** tarjeta nueva en la columna lateral de Inicio con «Nueva tarea» · «Ligar documento» · «Nuevo proyecto» y, pegado a esas dos, un select «en <proyecto>» (arranca en el activo que vence antes y se recuerda en la sesión, `estado.accionProyectoId`); «Nuevo proyecto» va en su propio renglón porque no usa el select. Cada botón abre el MISMO diálogo que su pantalla ya parado en ese proyecto —Nueva tarea aterriza en el tablero, Ligar en la pestaña Documentos (y cae a «Pegar un enlace» si la biblioteca no está autorizada, A1, **avisándolo** en el momento)—; al cancelar «Nueva tarea» el usuario queda en el tablero de ese proyecto (el mismo salto que desde Docs; aceptado). Con rol de lectura los tres van apagados con su porqué en el `title`, como sus originales, y sin proyectos activos los dos primeros dicen «Sin proyectos activos». En celular y tableta la tarjeta queda abajo (tras Proyectos activos y Actividad): «rápidas» lo son en laptop; subirla en móvil es decisión pendiente. Sin columna Tamaño, sin hitos, sin avatares de Graph ni buscador global: siguen sobre la mesa (recomendaciones 1, 2, 5 y 6). SW v23. Unitarias: reglas 130 (8 nuevas). E2E `e2e.ps1`: gerencia 304 · colaborador 267 · lectura 28, 0 fallas; la E2E cubre las dos ramas de «Ligar documento» (autorizada → diálogo de ligar; sin piloto → enlace con aviso, solo si hay un activo sin piloto en el fixture) y que el orden de Archivos no toca el de Docs. Capturas `capturas.mjs` inicio · docs · archivos a 1366/820/390 claro y oscuro: `overflowX=0` en las 18; en su consola, a 390 px, la misma falla preexistente «comentó/anotó» de Inicio (v0.16.0, ajena). **Revisado por `revisor-entregable`** (14 hallazgos): se corrigieron el orden compartido, el aviso al caer a enlace, el `title` con 0 activos, el teclado en los encabezados, el select junto a los dos botones que lo usan, la cobertura E2E de la rama autorizada y este texto (tableta/Archivos, y de dónde sale cada cifra); quedaron declarados y sin cambio: fichas sin control de orden, tarjeta abajo en móvil, salto al tablero al cancelar, y que la recomendación decía «Nombre, Fecha, Tipo» y se ordenan las seis columnas.

**v0.17.0** (2026-09-13) — **Documentos y Archivos como tabla (estilo «My Documents»).** Carlos mandó dos capturas de referencia (un gestor de documentos y un roadmap de producto) y pidió que la sección de archivos se viera como la tabla «My Documents» de la primera. Ahora la pestaña **Documentos** del proyecto y la vista **Archivos** pintan **una sola tabla** compartida (`docs.js: tablaDocs · filaGrupo · filaDoc`, `estilo.css: .dtabla`): columnas Nombre (icono + título + ruta o dirección) · Tipo (chip PDF / Word / Excel / Enlace / Lote, con el color del icono) · Estado (archivado / en el buzón / enlace, y «ya lo acomodó la skill» cuando el lote ya no está) · Tarjeta (el select de F1 en Docs; botón que abre la tarjeta en Archivos) · Ligado por (avatar + nombre) · Fecha (creación del renglón en PROY_Ligas) · menú **«⋯»** por renglón (Abrir · Quitar · Documentos del proyecto). La lengüeta de v0.16.0 (opción C) sobrevive como **renglón de grupo** dentro de la tabla (por tarjeta en Docs, por proyecto en Archivos). Docs gana **buscador** propio y el conteo «N de M»; Archivos gana **cuatro cifras** arriba (ligados · archivados · en el buzón · enlaces). Sin columna «Tamaño»: PROY_Ligas no lo guarda. En celular la tabla se apila en fichas por CSS; entre 721 px y el panel de escritorio cede columnas con **container queries** (sin «Ligado por» bajo 900 px de panel, sin «Fecha» bajo 760 — el panel de Docs mide 810 px a 1366 porque la lateral toma 340). Los chips de filtro siguen siendo por **estado de la liga** (archivado / en el buzón / enlace), no por tipo de archivo como la referencia: el tipo ya lo dice la columna y el icono, y el estado es lo que cambia la acción (Buscar el archivado, Quitar). Los 4 KPI de Archivos pasan a 3 + 1 en tableta (aceptado). **Correcciones del `revisor-entregable` en la misma versión:** el buscador de Docs se reinicia al cambiar de proyecto y deja de filtrar cuando se esconde (con 1 liga); la tabla ya no lleva `overflow` (el menú «⋯» flota fuera y se midió abierto: 200×84 a 1366); las fichas apiladas van por **container query** a 720 px de panel, así que en tableta la pestaña Docs (644 px de panel) también se apila y ya no desborda (`overflowX=0` a 1366 · 820 · 390); `.c-estado` parte en dos renglones para chip + «Buscar el archivado»; el encabezado FECHA ya no hereda el estilo de la celda. Y por la obs. 595, `test/sw.test.js` ahora falla si `comun.js: VERSION` difiere de `package.json`. Sin cambio de esquema; SW v22. E2E 292 · 292 · 291 (la falla a 390 px es «comentó/anotó» en Inicio, ajena a esta versión y ya vista en v0.16.0). Publicada el 13-sep (push f86e131..53a8423; Pages sirve VERSION 0.17.0 y SW v22, medido con curl).

**v0.16.0** (2026-09-13) — **Docs agrupa por pestaña que sobresale.** Carlos pidió que al filtrar los documentos se viera
más obvio dónde termina una tarjeta y empieza otra; de cuatro opciones en un artifact (globo hundido, franja de color, pestaña,
globo + estado) eligió la **C, pestaña**: una lengüeta sólida de marca con icono, nombre de la tarjeta y conteo, y una caja con
filete de marca que envuelve a sus archivos (`docs.js: grupo()`, `estilo.css: .pest`). «Del proyecto» va en gris (`is-proyecto`)
para no competir. El rótulo suelto `TARJETA · …` en mayúsculas se fue; `.grupo` es ahora el texto del título dentro de la lengüeta
(la E2E lo sigue leyendo) y el conteo va aparte. Sin cambio de esquema; SW v21.

**v0.15.1** (2026-09-13) — **Dos ajustes de piel a pedido de Carlos.** (1) Las burbujas del chat pierden el filete de 3 px a la
izquierda; el tono de cada persona lo da solo el fondo. (2) La lista de Actividad (lateral del proyecto e Inicio) ocupa todo el ancho
de la tarjeta: «ver toda» iba en `float: right` y, como el `h2` no contenía el flotante, la lista `.mini` (un grid, contexto de formato
propio) se acortaba a su lado en toda su altura — 171 de 246 px en la lateral a 1366 y el hover del renglón se veía partido (captura
del 13-sep). El `h2` con «ver toda» es ahora flex. Medido por `capturas.mjs --medir`: 244/244 px a 1366, 332/332 a 390; `npm test`
verde y E2E 288 · 252 · 27 con 0 fallas. Sin cambio de esquema; SW v20.

**v0.15.0** (2026-09-13) — **El mismo canal: «Nuevo para ti», marca de lectura compartida, ✓ visto en el chat y «Las que
delegué».** Salió de auditar la app como usuario (rol colaborador, 86 vistas a 390 y 1366) buscando dónde se rompe el
canal entre colegas; Carlos aprobó los puntos 1, 3, 4 y 5 de esa auditoría y dejó el 2 (avisos fuera de la app) para otra
sesión. **CON cambio de esquema (v2)** → correr `provisionar.html` con rol `manage` ANTES del push: columna `Visto` (note) en
`PROY_Roles` y opción `visto` en `PROY_Actividad.Accion`. Sin provisionar la app no se rompe: la marca cae a localStorage
(por dispositivo, como v0.9.0) y el ✓ da 400 con aviso.

- **«Nuevo para ti» en Inicio** (`app.js: pintarInicio`, reglas puras en `reglas.js: nuevoParaMi`): lo que OTROS hicieron
  sobre lo tuyo desde tu última visita a Inicio — te asignaron una tarjeta («te asignó», ámbar), cambiaron una tuya, anotaron
  en ella o te mencionaron —, a lo ancho bajo los KPI, con quién, cuándo y el frente; el renglón
  abre la tarjeta o el chat (dos o tres columnas según el ancho). El piso se **congela al entrar** (la marca sube al pintar sin vaciar la lista y lo que llegue con
  el refresco SE SUMA) y sale al cambiar de pantalla. Sin marca (primera vez) son los últimos 3 días. «Te mencionaron»
  (14 d) se queda como estaba: una mención nueva sale en las dos, a propósito.
- **Marca de lectura compartida** (`comun.js: chatVistoHasta · inicioVistoHasta · guardarVisto`): el «hasta dónde leí» de
  cada chat y de Inicio vive en el renglón PROPIO de `PROY_Roles` (columna `Visto`, JSON `{inicio, chat:{pid: iso}}`);
  localStorage queda como caché y gana la fecha mayor de las dos. La escritura al tenant se agrupa 1.5 s, se empuja al
  ocultarse la página, **relee el renglón y manda If-Match** (dos dispositivos de la misma persona no se pisan; un 412 se
  reintenta una vez — lo cazó el revisor), y es best-effort (un 400 la apaga para esa carga). Con esto el celular y la laptop de la misma persona
  dicen lo mismo. Sigue sin haber «leído» de los DEMÁS: eso es el ✓.
- **✓ visto en el chat** (`chat.js`, `comun.js: alternarVisto`): bajo cada mensaje ajeno un botón ✓ (36 × 40 px en táctil);
  marcarlo escribe un renglón `Accion=visto` con `Title` = id del comentario (uno por persona, sin `TareaId`) y volver a
  pulsar lo borra; borrar el comentario se lleva sus ✓. Debajo del mensaje se lee «✓ Colega, Jefa» con la hora en el `title`. Los ✓ **no son actividad**: no
  salen en Actividad reciente ni cuentan como comentario (`actividadVisible`, `comentariosDe`). Rol lectura no lo ve.
- **«Las que delegué» en Mis tareas** (`tablero.js`, `reglas.js: delegadas`): cuarto chip; lista las tarjetas ABIERTAS de
  otro que yo creé (`createdBy` de SharePoint) o asigné («asignó …» en la bitácora), con su dueño a la vista.
- **Defectos de la auditoría:** el diálogo Equipo crece a 760 px (la columna «Abiertas» se cortaba a 1366) · en celular el
  FAB «Nueva tarea» se esconde en el chat (`body.is-chat`) y el hilo mide 40 vh, así el redactor queda a la vista.
- **Declarado sin aplicar (de la misma auditoría):** avisos fuera de la app (correo/Teams desde el exportador) — sesión
  futura, decisión de Carlos · una cubeta «En espera de terceros» en la LAU es configuración del proyecto, no código ·
  enseñar «hecho» en Actividad reabriría la decisión de v0.11.0 · los 5 KPI de Inicio a 390 siguen en 4 + 1 (B3, a propósito).
- **Superficie de escritura nueva, declarada:** es la primera versión que **escribe en `PROY_Roles`** (la celda `Visto` del
  renglón propio). La restricción «solo el propio» vive en el cliente: con `Sites.Selected write` cualquier cuenta puede
  escribir el `Visto` —o el `Rol`— de otra por Graph fuera de la app, y firmar un ✓ con otro `Quien`, como ya pasaba con
  `comentar` (README, «Riesgos»). Y la caída a 400 sin provisionar está razonada, **no medida contra el tenant**.

Medido: `npm test` verde (122 reglas, +7), E2E **288 / 252 / 27** (+26 / +25 / +1: marca compartida en `PROY_Roles` y
«otro dispositivo» sin localStorage, ✓ en lo ajeno y no en lo propio, alta y baja del renglón `visto`, ✓ fuera de la
actividad, «Nuevo para ti» con apertura de tarjeta y marca que sube, «Las que delegué» con y sin filtro, lectura sin ✓),
**45 vistas × 3 anchos × 2 temas = 270 capturas con 0 desborde**. Vistas nuevas del driver: `mis-delegadas` y `chat-visto`
(el ✓ puesto con su chip de nombres, que la vista `chat` deja arriba del scroll); la siembra rica
trae una asignación ajena y un ✓ ajeno y limpia la marca que la E2E deja en el futuro. SW `minsa-proyectos-v19`.

**v0.14.0** (2026-09-13) — **Chat legible y Actividad reciente a lo ancho.** Dos pedidos de Carlos del 13-sep. Sin cambio
de esquema: solo push.

- **Burbujas por persona en el chat.** Cada mensaje va en una burbuja del tono de su autor (el mismo de su avatar,
  `tonoDe`; `data-tono` en `.msg`, `--msg-tono` en CSS): fondo al 9 % del tono sobre la tarjeta y filete izquierdo
  de 3 px. Los mensajes seguidos de la misma persona se pegan (radios de 4 px entre ellos). Antes el hilo era un
  solo bloque del mismo color y costaba ver dónde acababa uno y empezaba otro.
- **Actividad reciente en la columna ancha de Inicio**, bajo Proyectos activos, donde sobraba media pantalla; deja
  la lateral de 340 px (Te mencionaron · Vencimientos · Sin movimiento). En escritorio son **8** renglones (eran 5;
  celular sigue en 3) y la frase corre en una línea (verbo, título y complemento), con el proyecto debajo. Por
  debajo de 900 px la tarjeta vuelve al acomodo apilado.

Medido: `npm test` verde; capturas Inicio y Chat a 1366 (claro/oscuro) y 390 con 0 desborde. La falla conocida
de «comentó/anotó» a 390 sigue igual (tope 3). SW `minsa-proyectos-v18`.

**v0.13.1** (2026-09-12, noche 6) — **Auditoría de rendimiento y seguridad** (Carlos, 12-sep: «que no se sature ni se vuelva lenta;
que esté bien en seguridad»). Sin cambio de esquema: solo push.

*Lo que se iba a saturar y cómo se arregló:*

- **`PROY_Actividad` era la única lista sin tope** (un renglón por cada acción, comentario y movimiento; nunca se poda) **y se bajaba
  ENTERA cada 120 s por cada persona conectada**, a 500 renglones por página. Medido con el uso del piloto (10 cuentas, ~20 acciones/día
  entre todas): ~7,000 renglones/año → 14 páginas por refresco por persona, ~600 peticiones/hora entre todos solo por esa lista, que
  es donde Graph empieza a contestar 429 y la app a «esperar al servidor». Ahora la carga trae solo los últimos **`CONFIG.actividadDias`
  (90)** —`$filter=fields/Cuando ge …`, columna indexada— y el **proyecto abierto se completa aparte** con todo su historial
  (`fields/ProyectoId eq N`, indexada) una vez por carga: el chat y las notas de una tarjeta vieja no pierden nada; lo global (Inicio
  14 d, Mensajes 90 d, Reportes 30 d) ya miraba ventanas más cortas. Lo que llega se **fusiona por id** (`fusionarActividad`), nunca se
  duplica. Si el tenant rechazara el filtro por fecha (400) se cae a la lectura entera de antes y lo dice en consola. `actividadDias: 0`
  vuelve al comportamiento viejo.
- **La cara de cada tarjeta recorría toda la actividad y todas las ligas** para contar sus notas y documentos: O(tarjetas × renglones)
  en cada repintado. Ahora son tres índices por tarjeta (`notasPorTarea` · `ligasPorTarea` · `buzonPorTarea`, comun.js) calculados una
  vez por pintada y cacheados por identidad+largo de la lista (toda escritura la cambia). Inicio, Roadmap, Calendario y Reportes dejan
  de recalcular `activos()` por cada tarjeta (un `Set` de ids).
- **Sin fugas de memoria encontradas**: el DOM se rehace con `textContent = ''` (los listeners se van con los nodos), los `setInterval`
  son dos fijos, los temporizadores de avisos se limpian, los caches por carga (`buzonExiste`, `actividadCompleta`) se reinician en
  cada lectura y `sitiosUnidad` está acotado a 5.

*Seguridad (lo que se revisó y lo que cambió):*

- **Token vigente en cada petición**: `crearCliente` acepta ahora una función; la app le pasa `acquireTokenSilent` (MSAL lo cachea y
  renueva solo). Antes el cliente se creaba con el token leído y solo se renovaba con «Actualizar»: una escritura después de ~1 h sin
  refresco daba 401.
- **Ningún `href` sin http(s)**: `hrefSeguro()` (reglas.js) se aplica al pintar toda liga (Documentos, tarjeta, Archivos). Las ligas
  «enlace» ya se validaban al capturarse, pero `PROY_Ligas.Url` es texto que cualquier cuenta con escritura en el sitio puede editar
  desde SharePoint; la CSP ya bloqueaba un `javascript:`, esto lo bloquea antes y sin depender de ella. Los enlaces externos llevan
  `rel="noopener noreferrer"`.
- **Comilla simple en el buscador de la biblioteca**: `search(q='…')` duplica la `'` (era el único literal OData sin escapar; solo
  lectura, pero un nombre con apóstrofo daba 400).
- **Nombre de archivo al subir al buzón**: se rechaza `.`, `..` o cualquier `/` `\` antes de armar la ruta de Graph (un `File` del
  navegador no los trae; es cinturón).
- **Revisado y correcto sin cambios**: CSP estricta sin inline; cero `innerHTML`/`eval`; hash de navegación validado por regex; claves
  y filtros OData con valores numéricos o escapados; MSAL en `sessionStorage`; guarda `window.self !== window.top`; SW cachea solo el
  armazón (nunca Graph ni login); `localStorage` solo guarda tema y «visto hasta» del chat; vendor con hash verificado; el repo público
  sin correos ni secretos (`datos.test.js`).
- **Riesgo aceptado, no arreglable desde la app** (decisión 3 del plan): los roles de `PROY_Roles` son cinturón en pantalla; quien puede
  escribir de verdad lo decide SharePoint. Un `colaborador` con escritura en el sitio puede, con su propio token, hacer un PATCH que la
  app le niega. El control real es el permiso del sitio y la traza `Creado/Modificado por`.

*Lo que queda declarado sin aplicar:* `PROY_Tareas` y `PROY_Ligas` sí se bajan enteras (crecen con proyectos cerrados: ~300
tarjetas/año al ritmo del piloto = 1 página; a partir de ~1,000 conviene el mismo patrón de ventana + completar el abierto). El
refresco sigue siendo cada 120 s aunque no haya cambios; un `/items/delta` de Graph lo haría incremental, pero el arnés no lo simula.
**v0.13.0** (2026-09-12, noche 5) — **Menú «⋮» del proyecto también en escritorio, Eliminar proyecto, tema sin apagado, rótulo y
contadores del rail.** Cuatro pedidos de Carlos. **CON cambio de esquema** (una opción nueva en `PROY_Actividad.Accion`, ver «Al
publicar v0.13.0»).

- **Rótulo «PROYECTOS»** baja a 12 px / tracking .12em (hairline de 24 px) para caber dentro del rail de 232 px sin recortarse
  (a 15 px se salía). Misma fuente y misma línea verde.
- **Menú «⋮» al final del título** en todos los anchos (antes solo en celular; en escritorio eran cuatro botones sueltos):
  Imprimir · Cubetas · **Editar**, y Editar es un submenú (`<details class="acc-sub">`) con **Editar datos** (el formulario de
  siempre) · **Cerrar proyecto** / Reabrir · **Eliminar proyecto** en rojo (`.is-danger`, `--status-danger-loud`), que **solo
  ve gerencia** (`PUEDE.borrar`) y en cualquier estado del proyecto. Elegir un botón cierra el menú; abrir el submenú no; al
  cerrarse el menú el submenú se pliega. Los `id` de los botones no cambiaron (la E2E y el driver de capturas los usan).
- **Eliminar proyecto** (`eliminarProyecto`, app.js): confirma nombrando el proyecto y contando tarjetas y ligas; borra en
  orden **tarjetas → ligas → proyecto** (si falla a medias queda un proyecto vaciado, nunca tarjetas huérfanas), no toca los
  archivos de la biblioteca, deja la actividad como registro y anota **`borrar-proyecto`** (opción nueva de `Accion` →
  provisionar; sin provisionar, el renglón de bitácora se pierde en silencio y el borrado sí ocurre). Vuelve a Proyectos.
- **Tema:** un clic **elige** ese tema y ya. Antes el segundo clic sobre el elegido lo apagaba y volvía al del sistema, y en
  una máquina oscura eso se veía como «pico Claro dos veces y se pone oscuro sin selección». El botón marcado es ahora el
  tema **efectivo** (sin elección guardada, el del sistema), así siempre hay exactamente uno marcado; si el sistema cambia
  y no hay elección, se sigue. Volver a «sistema» no tiene botón (se borra la llave `tema` del localStorage).
- **Contadores del rail** (`.mn-rail-hot`: Proyectos 4 · Mensajes · Mis tareas): cuadrado redondeado de 20 px (radio 5 px)
  con borde fino del mismo tono, en vez de la píldora; los colores siguen de `minsa-ui.css` (que no se toca).
- Vista `menu-proyecto` en `capturas.mjs` (menú y submenú abiertos); 13 pruebas nuevas en la E2E (gerencia 278 · colaborador
  242 · lectura 26, 0 fallas). SW en `v16`.

Decisiones reversibles en una línea: «Editar datos» como rótulo del formulario (era «Editar», ahora ese nombre es el del
submenú); Eliminar en rojo de texto y no botón sólido; Eliminar visible también en un proyecto cerrado.

**En el mismo árbol, sin commitear, viene la auditoría de rendimiento/seguridad de otra sesión** (v0.13.1: token por función
en `graph.js`, `actividadDias` en `config.js`, `desdeHaceDias`/`hrefSeguro` en `reglas.js`, `fusionarActividad`/`asegurarActividadDe`
en `comun.js`); este commit lleva `comun.js` entero porque también trae el bump de `VERSION`. Nada de eso se importa aún.

**v0.12.1** (2026-09-12, noche 4) — **Rótulo «PROYECTOS» del rail.** Bai Jamjuree 700 versalitas (15 px, tracking .16em) separado del lockup
por un hairline verde en degradado de 30 px; lo eligió Carlos entre 106 variantes del artifact «Rótulo Proyectos» (opción E30 sobre el
hairline D2). La fuente entra vendorizada (`vendor/fuentes/BaiJamjuree-700.woff2`, OFL, solo el 700 latin) y al caché del SW (`v15`);
no se suma a los tokens `--font-*`: es un uso único. Sin cambio de esquema.

**v0.12.0** (2026-09-12, noche 3) — **Colores a elegir para cubetas y tarjetas; cabecera del proyecto limpia; diálogos sin
franja y sin barras.** Cinco pedidos de Carlos a partir de tres capturas de la app en operación. **CON cambio de esquema**
(ver «Al publicar v0.12.0»).

- **Color de cubeta** (editor «Cubetas», una fila de 9 círculos bajo cada nombre: sin color + `COLORES` de `reglas.js` — azul ·
  celeste · verde · ámbar · rojo · morado · rosa · gris). Se guarda en `PROY_Proyectos.Columnas[].color` (sin esquema nuevo:
  va dentro del JSON; `normalizarColumnas` conserva solo claves de la paleta y no escribe la llave cuando está vacía). Tiñe el
  fondo de la columna y su punto, y manda sobre el color por posición en la barra segmentada, el anillo y la leyenda
  (`segmentosDe` devuelve el color en 4.º lugar; los pintores ponen `data-tono`). Sin color, todo sigue por posición.
- **Color de tarjeta** (`PROY_Tareas.Color`, texto; **columna nueva** → provisionar). Selector en «Editar la tarjeta» y en
  «Nueva tarea»; tiñe el fondo de la tarjeta (13 % sobre la superficie, así claro y oscuro salen solos) y su borde. La
  prioridad alta conserva su borde izquierdo azul encima del tinte. `colorValido()` filtra cualquier valor raro de la lista.
- **Cabecera del proyecto:** fuera «← Proyectos» (el rail ya lleva ahí), fuera «N/M hechas · %» (vive en Avance) y el botón
  dice solo «Cerrar proyecto» (la cuenta de pendientes va en su `title` y en la confirmación). Cuando el proyecto está cerrado,
  un chip «Cerrado» ocupa el lugar del %.
- **Diálogos:** la cabecera ya no lleva la franja azul de 3 px (v0.9.0); el pie de los formularios (`.forma .mn-dialog-foot`)
  ya no tiene margen negativo — se salía del ancho del `<dialog>` y disparaba las barras (medido: `dialog=512x427`,
  `scrollH=441` en «Cubetas»). Los inputs del editor de cubetas llevan la piel de `.mn-field input` (eran el input crudo de
  21 px).
- Vista `colores` en `capturas.mjs` (cubetas ámbar/morado + tarjeta verde) para verlo en claro y oscuro.

Decisiones reversibles en una línea: 8 tonos (agregar uno = un renglón en `COLORES` + su `--tono-*`); el color de tarjeta
es texto y no choice (así sumar un tono no toca el esquema); la cuenta «faltan N» salió del botón (volverla es una línea en
`pintarProyecto`).

**v0.11.0** (2026-09-12) — **Cubetas por proyecto (renombrar · agregar · quitar · ordenar), sin el atajo «→ siguiente», sin
«Origen en la KB» a la vista y sin movimientos en Actividad.** Las cuatro peticiones de Carlos del 12-sep por la noche.
**CON cambio de esquema** (ver «Al publicar v0.11.0»).

- **Cubetas** (`btnCubetas` en las acciones del proyecto, solo gerencia, proyecto activo → `dlgCubetas`): cada proyecto trae
  las suyas en `PROY_Proyectos.Columnas` (JSON `[{clave, nombre}]`; vacía = las 4 de siempre, `COLUMNAS_DEFAULT` de
  `reglas.js`). Reglas que el editor hace visibles: **«Hecho» se renombra pero no se quita ni se mueve** (siempre al final:
  es la que sella `HechoPor/HechoEl`, cuenta el avance y saca la tarjeta de Mis tareas); **una cubeta con tarjetas no se
  quita** (el botón dice cuántas: se mueven primero, y al guardar se cuenta **en vivo** en `PROY_Tareas`, no en la copia de
  hace hasta 120 s — si alguien acaba de mover una tarjeta ahí, se relee y se avisa); mínimo 1 abierta + Hecho, máximo 8;
  nombre ≤ 30; una nueva no puede llamarse «Hecho» (chocaría con la clave fija, se dice con palabras). La **clave** de una
  cubeta nueva sale de su nombre (`slug`) y **no cambia al renombrarla**, así que las tarjetas no se pierden; una nueva nace
  antes de Hecho. Si la lista vuelve a ser exactamente el default, `Columnas` se limpia (`null`). Se registra como
  `editar-proyecto`. `PROY_Tareas.Columna` pasa a **choice con `allowTextEntry`** (`libre: true` en `esquema.json`) para
  aceptar cualquier clave; el Graph falso de la E2E lo honra.
- **Todo lo que dependía de las 4 fijas se derivó de las cubetas del proyecto:** tablero (hasta 8 columnas, `data-n`),
  pestañas de columna en celular, «Mover a…», selector de la tarea nueva (nace en la **primera**), orden de la Lista por
  cubeta, línea de resumen y «Avance» de la lateral (una línea por cubeta de en medio), barra segmentada y anillo del
  proyecto (`segmentosDe`), roadmap del proyecto (un carril por cubeta), calendario (color). **El color va por POSICIÓN**
  (`claseDeColumna`: gris la primera · marca la segunda · celeste las demás · verde Hecho), nunca por el nombre. Lo que suma
  **entre proyectos** —Reportes (anillo global y leyenda), Roadmap (KPI), Inicio— usa **tres categorías**: por hacer (primera)
  · en proceso (las de en medio) · hechas (`avanceGlobal`, `segmentosGlobales`). **«Sin movimiento» pasa de «en-curso» a
  «en proceso»** (cualquier cubeta que no sea la primera ni Hecho): una tarjeta parada 10 días en revisión también se señala.
- **Huérfanas:** una tarjeta cuya cubeta alguien quitó (o que llegó de otro proyecto con una clave que aquí no existe)
  **no desaparece**: se pinta en una columna marcada (`.col.is-huerfana`, punto ámbar) con su clave de nombre, «Mover a…»
  la deja salir pero no entrar, y al moverla la columna se va. Mover una tarjeta a otro proyecto que no tenga su cubeta la
  deja en la **primera** de ese proyecto.
- **Fuera el atajo «→ siguiente»** (U7, v0.3.0) de la cara de la tarjeta, con su Deshacer: mover es abrir la tarjeta y
  «Mover a…». `columnaSiguiente` y `moverSiguiente` se borraron; `.tarjeta-caja` se queda (Mis tareas y la E2E la usan).
- **«Origen en la KB» ya no se enseña ni se pide** (cara de la tarjeta, Lista, diálogo, formularios de nueva/editar). La
  columna **sigue en `PROY_Tareas`** y lo que un script deje ahí se conserva: es el puntero al marcador de `minsa-energy/`
  que usa `/procesar-tablero` (`proyectos_app.py`), no la gente. La cabecera de la Lista dice «Cubeta».
- **Actividad sin movimientos** (Inicio, lateral del proyecto, «Toda la actividad»): `actividadVisible()` filtra
  `mover-tarea`; el chip «solo movimientos» (C9) se fue y una línea de ayuda lo dice. **Se siguen escribiendo en
  `PROY_Actividad`** (bitácora y métrica del piloto; «Actividad por persona» de Reportes los sigue contando).
- **Lo que NO cambió, a propósito:** `config.js` ya no trae `columnas`; el `Columna` de la siembra (`sembrar.html`) y del
  exportador siguen con las 4 claves de siempre, que son el default.
- **Declarado sin aplicar:** las cubetas son **por proyecto**, no globales (un default nuevo para todos se cambia en
  `COLUMNAS_DEFAULT`, y un proyecto ya editado conserva las suyas) · quitar una cubeta desde SharePoint a mano deja
  huérfanas, que la app enseña · en «Mis tareas» y Calendario el chip/color de una cubeta ajena (fuera del proyecto abierto)
  se resuelve leyendo el proyecto de cada tarjeta (`columnasDeTarea`) · no hay arrastre para ordenar cubetas (↑/↓).

Medido: `npm test` verde (110 reglas, +20), E2E **260 / 227 / 26** (+16 / +3 / 0: editor de cubetas con renombrar, agregar,
subir, guardar en `Columnas`, tablero de 5, mover a la nueva, quitar bloqueada con tarjetas, volver al default limpia la
celda, huérfana marcada y rescatada; colaborador con el botón apagado; sin `→ siguiente`, sin Origen, sin movimientos en las
tres listas), capturas de `cubetas · proyecto · tarjeta · lista · inicio · actividad · reportes` a 390/1366 × claro/oscuro
con **0 desborde**. SW `minsa-proyectos-v13`. La falla conocida de v0.9.0 a 390 px («comentó/anotó») sigue igual.

**v0.10.0** (2026-09-12) — **Roadmap, Calendario, Mensajes, Archivos y Reportes, y el título con su icono.** Carlos mandó
la foto de un tablero de referencia («Product Roadmap», WhatsApp 12-sep 18:07) y pidió un roadmap, esas cuatro secciones en la
columna izquierda y el título con icono a la izquierda; el resto salió de recorrer la foto contra lo que la app ya sabe. **Sin
cambio de esquema**: todo se deriva de las cinco listas (`vistas.js`, módulo nuevo; reglas puras en `reglas.js` con 16 pruebas).
Con esto **salen del «fuera del piloto» Mensajes, Calendario y Timeline** (decisión 6 del plan): Carlos las pidió con esas palabras.

- **Título con icono** (`.titulo-ico`): cada pantalla lleva su icono en un cuadro tenue de marca a la izquierda del `h1`, el
  mismo gesto que el icono de equipo en la cabecera del proyecto. El rail pasa de 3 a **8 secciones** (Inicio · Proyectos ·
  Roadmap · Calendario · Mensajes · Archivos · Reportes · Mis tareas); en celular la barra solo trae 5 y **Roadmap · Archivos ·
  Reportes viven en el menú «···»** (`.ir-movil`).
- **Roadmap** (`#roadmap`): un frente por fila, la barra va de la creación del proyecto (`_creado`) a su fin de frente con el
  avance como relleno (rojo vencido · ámbar ≤ 7 d · marca después · gris sin fecha, hasta hoy), eje de meses + lunes de cada
  semana + raya de HOY con etiqueta y meses con fondo alterno (v0.22.0), 4 KPI (total · en curso · hechas · vencidas) y «Fines de frente próximos» (≤ 60 d) con la fecha grande.
  **Desde v0.22.0 cada tarjeta con `Vence` es un ROMBO sobre la barra de su frente** (`hitosDe` · `acomodarHitos`): hueco pendiente ·
  ámbar ≤ 7 d · rojo vencida · verde hecha; los que se enciman se agrupan en «+N»; clic abre la tarjeta (el grupo, el roadmap del frente);
  la raya del fin de frente lleva su «dd/mm» y el avance va al final de la barra. Leyenda debajo.
  **Pestaña Roadmap del proyecto** (`#p/<clave>/roadmap`): un carril por columna, cada tarjeta una barra de «en esta columna
  desde» (o su creación) al vencimiento —las hechas hasta `HechoEl`, en verde—, el fin del frente como rombo; sin vencimiento no
  hay barra («sin fecha de vencimiento»). Una barra de pocos días escribe su texto AFUERA. Barra y etiqueta abren la tarjeta
  **conservando la pestaña** (`irTarjeta(t, 'roadmap')`: sin el tab en el hash el router volvía al tablero). El gantt es el
  mismo (`gantt()`), en `%` sobre `rangoRoadmap` (lunes anterior → domingo posterior, mínimo 56/84 días, siempre con hoy).
- **Calendario** (`#calendario`): rejilla de 6 semanas lunes-domingo con las tarjetas por su `Vence` (color por columna;
  vencida en rojo; hecha tachada en verde) y los fines de frente; «‹ Hoy ›»; clic en el día abre su detalle; `+N más` a partir
  de 3. En celular es la **agenda del mes** (`.cal-agenda`), no la rejilla. El filtro por equipo del rail aplica.
- **Mensajes** (`#mensajes`): la bandeja de los chats de todos los frentes —último mensaje, quién, cuándo, **N nuevos desde tu
  última visita** (v0.9.0, por dispositivo)— y arriba «Te mencionaron» (90 días; Inicio sigue en 14). Los frentes sin
  conversación salen al final para arrancarla. **Insignia azul en el rail** (`#nMensajes`, `mensajesNuevos()`): suma de nuevos
  sobre frentes activos, sin contar el chat que está en pantalla. Límite declarado: solo cuenta a partir de la primera visita a
  cada chat (sin marca de visto nada es «nuevo», como en v0.9.0).
- **Archivos** (`#archivos`): todas las ligas de todos los frentes agrupadas por proyecto, chips por tipo, select por proyecto
  y buscador sin acentos (nombre, ruta, dirección; `filtrarLigas`). Solo encuentra y abre: ligar, quitar y reasignar siguen en
  Documentos del proyecto (el nombre del grupo lleva ahí). No consulta «en el buzón» en vivo (eso sigue siendo de Documentos).
- **Reportes** (`#reportes`): 5 KPI (proyectos · abiertas · hechas · vencidas · sin dueño), **anillo** de avance global con
  leyenda, avance por proyecto (barra segmentada con la cuenta adentro + %), carga por persona (abiertas con las vencidas en rojo
  y la cifra), **hechas por semana** (8 semanas, `HechoEl`), actividad por persona (30 días) y vencidas por proyecto. Todo
  clicable hacia el proyecto o la tarjeta; «Imprimir». El filtro por equipo del rail aplica y **se queda** (antes, tocar el rail
  desde otra pantalla saltaba a Proyectos; ahora salta solo desde las que no filtran).
- **Anillo en la lateral del proyecto** (`#pAnillo`, `anillo()`): el «68 %» de la foto, encima de la barra de Avance.
- **Colores de los gráficos:** los de las columnas que la app ya usa (verde hechas · celeste revisión · marca en curso · gris por
  hacer); validados con el `validate_palette.js` de dataviz: separación CVD 21.8 ΔE (pasa); el gris por hacer queda bajo el
  piso de croma y de contraste **a propósito** (es «nada todavía», y siempre lleva cifra o leyenda al lado).
- **Corregido de paso:** la insignia de la barra móvil (`.mn-rail-hot`, `right: 25%` absoluta) se anclaba al rail entero y el
  «1» de Mis tareas caía sobre Mensajes con 5 pestañas — `position: relative` en el botón.
- **Lo que el `revisor-entregable` cazó con la E2E en verde, corregido antes del commit:** el filtro del rail aplicaba a medias
  en Roadmap (filas filtradas, KPI e hitos globales) y en Calendario (los fines de frente de todos) — ahora parejo · las 24
  capturas a 390 de las pantallas nuevas salían tapadas por el menú «···» que la vista `menu-movil` dejaba abierto (el driver
  lo cierra antes de cada vista) · la barra gris «por hacer» se perdía en oscuro (filete + fondo hundido) · la barra corta
  quedaba como `<button>` sin nombre (`aria-label`) · el día del calendario era un `<div>` con clic (ahora `role=button`,
  tabulable, Enter/espacio) · «SEPTIEMBRE 2…» truncado (nombre completo solo si el mes ocupa ≥ 18 % del eje; si no, «sep 26») ·
  etiquetas de Reportes cortadas a 1366 (columna al 52 %) · `#tab-roadmap` definido dos veces.
- **Lo de la foto que NO se hizo, a propósito:** buscador global («Search anything»), migas «Proyectos › …» (el botón «← Proyectos»
  ya hace ese viaje), tendencia en los KPI («↑ 12 % vs mes pasado» — no hay histórico en las listas), selector de rango de fechas
  (el eje se calcula solo de los datos), avatares encima de las barras (van en la etiqueta), Calendario **por proyecto** (el
  global filtra por equipo; por frente se propone aparte si hace falta), bloque «Team Members» con rol (vive en «Quiénes» y en
  el diálogo Equipo), icono dentro de cada KPI (la casa usa el filete de color).
- **Declarado sin aplicar:** «hoy» es el día **UTC**, como `diasPara` en toda la app: a partir de las 18:00 de México el
  calendario marca mañana y Reportes imprime «calculado al» con la fecha de mañana — cambiarlo toca `diasPara` y todos los
  chips «vence hoy», se decide aparte · las barras del gantt miden 22 px de alto (18 objetivos < 36 px a 390 según el driver);
  cada una tiene su etiqueta de 36 px a la izquierda que abre lo mismo · no hay vista de tabla de los reportes (cada gráfico
  lleva cifras y `aria-label`) · el roadmap no se arrastra ni edita fechas (se editan en la tarjeta) · Mensajes no tiene
  «leído» compartido · las 3 secciones extra del celular viven en el menú «···» sin `role=tab` · la E2E de v0.8.0
  «comentó/anotó» **falla a 390 px desde v0.9.0** (el tope de 3 renglones de actividad en celular deja fuera el que busca;
  verificado con `git stash` contra v0.9.0) y no se tocó.

Medido: `npm test` verde (90 reglas, +16), E2E **244 / 224 / 26** (+27 / +27 / +4: las 5 pantallas, roadmap del proyecto con
apertura de tarjeta que conserva la pestaña, calendario con navegación y agenda, insignia de mensajes que enciende con un
comentario ajeno y se apaga al leer, archivos con chip y buscador, reportes con KPI que cuadran con Inicio, filtro del rail que
se queda en Reportes, rol lectura sin botones de escritura), **40 vistas × 3 anchos × 2 temas = 240 capturas con 0 desborde**
(el gantt desbordaba 176 px a 390 hasta `min-width: 0` en su tarjeta). Vistas nuevas del driver: `roadmap`,
`roadmap-proyecto`, `calendario`, `mensajes`, `archivos`, `reportes`. SW `minsa-proyectos-v12`.

**v0.9.0** (2026-09-12) — **borrar lo escrito en el chat, secciones que se distinguen, enlaces clicables y «nuevos desde tu
última visita».** Carlos pidió poder borrar texto mandado al chat y que la cabecera de un pop-up se distinga de lo editable;
el resto salió de recorrer la app buscando qué le falta a un chat que ya se usa. Sin cambio de esquema.

- **Borrar comentario / nota** (`comun.js: puedeBorrarComentario · borrarComentario`). Lo borra **quien lo escribió, o
  gerencia cualquiera**, solo con el proyecto activo (cerrado = registro). Botón de basura al final del mensaje —en
  escritorio aparece al pasar el ratón o con el foco; en táctil siempre, a 36 px— en el hilo del chat y en las notas de
  la tarjeta (es el mismo renglón). Pide confirmación nombrando el texto (y quién lo escribió, si es ajeno); el DELETE
  saca el renglón de `PROY_Actividad` y repinta hilo, contador de pestaña e insignias. **No deja renglón de bitácora**:
  `Accion` es columna de opciones y una nueva obliga a re-provisionar; el renglón va a la papelera del sitio, de donde
  un administrador lo recupera. Rol lectura no ve el botón.
- **Cabecera de diálogo marcada** (`.mn-dialog-head` en `estilo.css`, sin tocar la piel vendorizada): fondo hundido,
  filete firme abajo y una línea de marca de 3 px arriba; con el pie ya hundido, el cuerpo (lo editable) queda como la
  única superficie clara. Dentro de la tarjeta, **Mover a… · Notas · Documentos · Editar** llevan un filete arriba y
  aire, para leerse como bloques y no como una lista continua de rótulos.
- **Enlaces clicables** (`comun.js: textoConEnlaces`, dentro de `textoConMenciones`): una `https://…` pegada en el chat o
  en una nota se abre en pestaña nueva sin `opener`; la puntuación pegada al final queda fuera. En los renglones de
  actividad (que ya son un botón que abre la tarjeta) el texto sigue plano: un `<a>` dentro de `<button>` es inválido y
  dispararía dos acciones (lo cazó el `revisor-entregable`).
- **«N nuevos desde tu última visita»** (`comun.js: chatVistoHasta · marcarChatVisto · comentariosNuevos`): por proyecto,
  este dispositivo guarda en `localStorage` hasta dónde se leyó; lo ajeno posterior pone el contador de la pestaña Chat
  en ámbar y una raya ámbar en el hilo justo antes del primero nuevo. La raya se fija **al entrar** al chat (el refresco
  de 120 s y «Actualizar» no la mueven) y desaparece al salir y volver. Sin marca (primera vez, navegador que no
  guarda) nada es nuevo. No es «leído» compartido: es por dispositivo, a propósito. Límite declarado: `Cuando` lo pone
  el reloj de cada cliente; un celular con la hora corrida puede dejar su comentario fuera de «nuevos» o meter la raya a
  media conversación.
- **Lo que el `revisor-entregable` cazó con la E2E en verde, corregido antes del cierre:** el enlace clicable entraba también
  en los renglones-botón de actividad · el bote medía 2.75:1 en claro (`--text-faint` → `--text-muted`) · la cabecera en
  oscuro se distinguía solo por el filete (1.08:1 entre hundido y tarjeta): ahora lleva un 7 % de marca mezclado en el
  fondo, en los dos temas · la cuenta de la raya crecía con cada refresco (ahora el conjunto de «nuevos» se fija al
  entrar) · «rol lectura no ve el botón» se afirmaba sin prueba (+2 en lectura: hilo con propio y ajeno sin bote, y
  `borrarComentario` forzada se niega). Se declaran sin aplicar: la UI es cortesía —con `Sites.Selected write` cualquier
  cuenta puede hacer `DELETE` a `PROY_Actividad` fuera de la app, como en todo lo demás (README, «Riesgos»)—; no hay
  captura de la raya ni de la confirmación (solo E2E); y dos preexistentes: a 390 el redactor del chat queda bajo la barra
  fija y el FAB tapa el hilo, y el anillo de foco de «Tarea» pisa el rótulo «Asignado» en Nueva tarea.
- **Declarado sin aplicar:** Enter solo sigue sin enviar (Ctrl/Cmd+Enter envía; en celular Enter es salto de línea) —
  cambiarlo toca también la nota de la tarjeta y se decide aparte; editar un comentario ya mandado (borrar y reescribir
  cubre el caso sin un segundo formulario).

Medido: `npm test` verde (74 reglas), E2E **217 / 197 / 22** (+13 / +11 / +2: botón por rol, confirmación y cancelar,
DELETE y contador, ajeno solo gerencia, enlace, marca de visto, ámbar en pestaña, raya al entrar, raya que sobrevive a
«Actualizar», raya que se va al volver). Capturas tarjeta · chat · nueva-tarea a 390 y 1366 × 2 temas, 0 desborde. SW
`minsa-proyectos-v11`.

**v0.8.0** (2026-09-12) — **chat por proyecto, @menciones, iconos de archivo y lo que un tablero enseña sin abrir la
tarjeta.** Carlos pidió re-auditar la app «inspirándose en otros tableros», un chat por proyecto que todos lean
(«favor de checar @francisco») y el icono en lugar de «.docx» / «.pdf». Sin cambio de esquema (`provisionar.html` no
hace falta): todo cabe en `PROY_Actividad` y `PROY_Ligas` como están.

- **Chat** (`chat.js`, pestaña `#p/<clave>/chat`). UNA conversación por frente: los comentarios del proyecto son
  renglones `Accion=comentar` **sin `TareaId`**, y las notas de las tarjetas (F5) salen en el mismo hilo con un chip
  que nombra y abre su tarjeta — nada se escribe dos veces. Lo último abajo, separadores «hoy · ayer · martes 9 sep»,
  mensajes seguidos de la misma persona agrupados, los míos con el nombre en azul. Redactor con contador (mismo tope
  de 250 del renglón de bitácora), Ctrl/Cmd+Enter envía; rol lectura ve el hilo con una línea gris; proyecto cerrado,
  «queda como registro». La actividad dice **«comentó»** para el chat y «anotó» para la nota de tarjeta; el chip de
  «Toda la actividad» pasa a «solo comentarios».
- **@menciones** (`reglas.js`: `aliasDe · aliasParaMencion · trozosConMenciones · mencionesEn · mencionEnCurso`, 10
  pruebas). Se resuelven contra `PROY_Roles` por **primer nombre** (`@francisco`), `nombre.apellido` o la parte local
  del correo, sin acentos ni mayúsculas (tecleado con acento, `@José`, también resuelve); la puntuación pegada al
  final (`.`, `-`, `_`) no cuenta; un `@nadie` queda como texto; **un alias AMBIGUO queda como texto** —el roster
  real trae dos «Carlos», y `@carlos` a secas no le avisa a ninguno: mejor eso que al Carlos equivocado— y el
  **selector** que aparece al teclear `@` (chat y nota de la tarjeta; ↑/↓, Enter/Tab elige, Esc cierra; botón «@»
  para el celular; el cursor a media palabra reemplaza la palabra entera) escribe siempre el alias inequívoco
  (`@carlos.ortega`). Una persona con `Activo=false` deja de resolver también en comentarios viejos. Se pintan
  como chip (la propia en ámbar) en el hilo, en las notas y en toda lista de actividad; en Inicio **«Te
  mencionaron»** junta los comentarios ajenos que te nombran de los últimos `CONFIG.mencionesDias` (14) — el
  renglón abre la tarjeta o el chat del proyecto. No hay «leído»: la lista se vacía sola con el tiempo. El refresco
  automático repinta el hilo sin mover a quien está leyendo arriba (solo aterriza al fondo si ya estaba ahí).
- **Icono por tipo de archivo** (`comun.js: iconoArchivo`, `reglas.js: tipoArchivo`) en Documentos, en la tarjeta y
  en los resultados de «Ligar»: hoja con la esquina doblada en el color de la convención (PDF rojo, Word azul, Excel
  verde, PowerPoint naranja; imagen, correo, plano, comprimido, texto); el lote del buzón es una carpeta y el enlace
  una cadena. El tipo escrito va en `title`/`aria-label`; la extensión sigue en el nombre y la ruta.
- **Lo que otros tableros enseñan sin abrir la tarjeta** (Trello/Asana): insignias **«💬 N notas · 📎 N documentos»**
  en la cara de la tarjeta; **contador en las pestañas** «Documentos · 4 · Chat · 12»; **punto de color** en la
  cabecera de cada columna con la misma leyenda que la barra segmentada de la lista de proyectos; y **avatar con color
  por persona** — 8 tonos (`--av-1…8`, ≥ 4.9:1 con texto blanco en claro, aclarados con texto negro en oscuro) por
  **posición en `PROY_Roles`**, no por hash: con 10 cuentas, el hash le daba el mismo color a 2 de 3 personas en la
  primera captura. Límite declarado: de la 9.ª cuenta se repiten tonos y un alta alfabéticamente anterior corre los
  colores — es color de apoyo, no identidad.
- **Lo que el `revisor-entregable` cazó con la E2E en verde, corregido antes del commit** (9 de fondo, 12 de forma):
  `@carlos` resolvía en silencio al primer Carlos · el botón «@» abría el selector y el `blur` lo cerraba 120 ms
  después (solo con clic real; la E2E lo probaba con `click()` sintético) · el chip de la tarjeta en el chat seguía
  en 24 px porque la regla base pisaba a la del `@media` · `@José` con acento no resolvía y cerraba el selector ·
  «Ma. de los Ángeles» daba un alias con punto que el parser no leía · el tono 2 de avatar medía 3.74:1 · el
  refresco de 120 s mandaba el hilo al fondo mientras alguien leía arriba · el `<textarea>` no declaraba
  `aria-expanded/-controls/-activedescendant` y el hilo con `aria-live` re-anunciaba todo · elegir con el cursor a
  media palabra dejaba «@francisco ncisco» · «tarjeta #6» como rótulo de una borrada · el icono PDF se leía «PD» ·
  Ctrl+Enter sin red mandaba de todos modos · CSS muerto de `.doc .ico`. Se declaran sin aplicar: los mensajes
  seguidos con chip de tarjeta no se agrupan (el chip es el contexto), y `@ana.Vamos` sin espacio tras el punto no
  resuelve.
- **Lo que NO se hizo, a propósito:** el comentario sigue en 250 caracteres (es `Title`; darle una columna `note`
  obliga a re-provisionar y a un `fallback` cuando falte — se propone aparte si el tope estorba); sin «leído» por
  persona (sería otra lista); sin push ni correo por mención (fuera del piloto, decisión 6).

Medido: `npm test` verde (74 reglas), E2E **204 / 186 / 20** (+27 / +27 / +1: chat, selector en las dos cajas, foco
que vuelve, cursor a media palabra, tope, chip → tarjeta, insignias, tonos, iconos, «Te mencionaron» con la ventana
de días, actividad «comentó/anotó», lectura solo lee), **34 vistas × 3 anchos × 2 temas = 204 capturas con 0
desborde**; bajo 900 px ningún objetivo nuevo mide menos de 36 px (el chip de la tarjeta en el chat queda en 24 solo
a 1366, ratón). Vistas nuevas del driver: `chat`, `chat-selector`. SW `minsa-proyectos-v10`.

**v0.7.1** (2026-09-12) — **consistencia de controles**, tras una auditoría medida con `capturas.mjs --medir-archivo`
(64 vistas a 390 y 1366 px, cada control agrupado por clase → alto, padding, fuente, radio, borde). Catorce hallazgos,
todos aplicados; sin cambios de lógica (E2E 177/177):

- **Un solo botón.** Todo `.mn-btn` mide 32 px en escritorio y 40 en ≤900, pad 0·12, .82rem/600, radio 6, filete 1 px.
  El pie del rail tenía tres estilos juntos (`.mn-rail button` pisaba a `.mn-btn` en borde, color y gap → regla
  `.rail .mn-btn`); los menús «···»/«⋮» y el tema ya no re-implementan el botón (`.mn-btn.is-sm.is-icono` en el HTML);
  «→ siguiente», «ver las N anteriores» y los tres botones de texto son `.mn-btn.is-ghost.is-sm`.
- **Un chip-botón** (`.filtros button, .col-tabs button, .atajos-fecha button`) y **un select suelto** (píldora .85rem
  para el filtro móvil y «tarjeta:» de Documentos, que estaba en 11.8 px). El buscador de tarjetas es `.buscador`.
- **Diálogos.** El primario va siempre al final del pie y el destructivo solo a la izquierda (editar tarjeta iba al
  revés); «Ligar» tenía 4 primarios y el pie en medio del cuerpo (ahora Buscar junto a los campos, un «Ligar» normal
  por resultado); «Actividad» saca el pie del cuerpo y lo esconde si «ver 50 más» está oculto.
- **Distancias y superficies.** Grupo de botones = `--sp-2` (cabecera del proyecto, cabecera del diálogo, acciones de
  la tarjeta); `--sp-1` solo para chips y el pie del rail (232 px). La tarjeta del tablero pierde la sombra (la piel:
  «se define por su filete»); `.doc` sube a `--r-md` como toda superficie de primer nivel; `.eqi` en la escala de
  radios; avatar en DOS tamaños (26 / 20). Rótulos propios con la métrica de `.mn-label` (.68rem · .07em · 600); la
  escala tipográfica pasa de 25 tamaños a 20 (.55→.58, .66→.68, .7→.72, .74→.75, .875→.85).
- **Celular.** La pestaña «Resumen» estaba desalineada (`.solo-movil` la volvía `inline-flex` sin centrar).
- `capturas.mjs --medir-archivo <ruta.js>`: la expresión de medición por archivo — el argumento inline desde
  PowerShell se parte en los saltos de línea y en la primera comilla doble (64/64 `SyntaxError` con exit 0).

**v0.7.0** (2026-09-12) — **rediseño de Proyectos con la paleta del Tablero.** Carlos no estaba convencido de cómo
quedaba la app (12-sep); de un artifact con 3 formas de filtrar y 4 de pintar cada proyecto eligió **rail por rama** y
**reloj primero**:

- **Paleta.** `minsa-ui.css` se vendoriza ahora con `--sin-paleta` (como el tablero) y `estilo.css` trae la paleta de
  `minsa-tablero-app/app/src/estilos.css` copiada literal —claro y oscuro— más el shim de los 34 tokens semánticos
  que los `.mn-*` consumen. Ningún componente cambió. `npm test` verifica con `--sin-paleta`.
- **Equipos por icono, no por nombre.** `config.js` da a cada equipo `rama`, `icono` (trazos SVG) y `color` como
  variable de la paleta; `comun.js: iconoEquipo()` arma el SVG por DOM (sin innerHTML, por la CSP) con el nombre en
  `title`/`aria-label`. Hoja, matraz y gota son byte-idénticos al rail del tablero (y sus colores); los otros tres
  —edificio (Administración; el tablero da a Finanzas un calendario), etiqueta de precio y paquete (Ventas)— son nuevos. Se usa en el rail, la lista, la cabecera del proyecto y la tarjeta.
- **Filtro = rail por rama.** Los equipos del rail van agrupados AMBIENTAL · QUÍMICOS · ADMINISTRACIÓN con su cuenta
  de activos; las píldoras de Proyectos desaparecen. En celular (≤ 720 px), donde el rail es barra de pestañas, el
  mismo filtro es un `<select>` («Todos los equipos») arriba del buscador, sincronizado con el rail en las dos
  direcciones (la E2E lo ejercita). El elegido se marca por el fondo del botón, no rellenando el icono: el trazo
  blanco sobre los pasteles del oscuro daba 1.6–2.6:1.
- **Renglón «reloj primero».** Días grandes al fin del frente (rojo vencido · ámbar ≤ 7 d · celeste después · gris
  sin fecha · ✓ cerrado), icono, título y una línea con lo de adentro —`hechas/total · en curso · en revisión ·
  sigue: <tarjeta que vence antes> · N d`— y a la derecha (200 px fijos, para que las barras midan lo mismo entre renglones) quiénes, la barra segmentada por columna y los chips que
  C7 ya tenía («sin dueño · N»). El chip C8 «vence en N d · faltan M» sale del renglón (repetía el número
  grande) y se queda en la cabecera del proyecto. Los renglones van en UNA tarjeta con filete, no una
  por proyecto; `.renglon`/`.t` se conservan por la E2E y el driver. En celular baja el costado bajo el texto.

Medido: `npm test` verde, E2E **177 / 159 / 19** (2 pruebas nuevas: el select móvil en las dos direcciones; C8 reescrita al número grande), capturas Inicio · Proyectos · Proyectos-CALYTEK · Proyecto · Tarjeta
a 390 y 1366 × 2 temas con 0 desborde. La prueba de Inicio (tope de actividad) ahora sabe que en celular son 3, no 5:
fallaba solo bajo el arnés de capturas a 390. Sin cambio de esquema; el service worker sube a `v8`.

**v0.6.0** (2026-09-12) — **tanda 5: los 14 hallazgos que quedaban del recorrido del 12-sep, más C8 completo.** Con
esto los **36 están cerrados**. Por cubetas:

- **C · flujos.** Con rol **lectura** la tarjeta deja de decir lo mismo tres veces: sin «Mover a…», sin banda roja, una
  línea gris «Solo lectura · la mueve su asignado o cualquier colaborador» (la banda roja se queda para el proyecto
  CERRADO, que sí es una alarma; los botones se siguen armando ocultos y `moverTarea` se niega sola si alguien los
  fuerza) (C6) · las tarjetas **sin dueño** —que no salen en Mis tareas de nadie— tienen KPI en Inicio (solo si hay,
  aterriza en el proyecto que más tiene con el filtro puesto), chip «sin dueño · N» en cada renglón de proyecto y chip
  de filtro en el tablero (C7) · **Proyectos se ordena** por fin del frente ascendente, sin fecha al final y a igual
  DÍA por nombre — `ordenarProyectos()` compara los 10 caracteres del día, no el ISO entero: la app escribe
  `…T18:00:00.000Z` y la siembra `…T18:00:00Z`, y comparar la cadena rompía el empate (lo cazó la E2E) (C10) · el
  chip **«vence en 6 d · faltan 10»** (ámbar ≤ 7 d, rojo vencido) en la cabecera junto al % y en el renglón de la lista
  de Proyectos (C8 completo) · **buscador** en Proyectos (nombre, clave, descripción) y en Mis tareas (título), la
  misma normalización sin acentos del tablero (C3) · en la actividad, el renglón con tarjeta viva es un **botón** que
  abre `#p/<clave>/t/<id>` (Inicio, lateral y «Toda la actividad»), y «Toda la actividad» gana los chips **«solo
  notas» / «solo movimientos»** (C9) · en la tarjeta, **«Proyecto» es un enlace** al tablero con el chip del equipo
  (D2) · las notas se mandan con **Ctrl/Cmd+Enter**, el contador «230/250» aparece desde 200 (rojo al tope) y en
  celular «Anotar» va debajo a todo el ancho (C4).
- **D · pulido.** La **prioridad alta es un borde** izquierdo de 3 px en la tarjeta (y una columna «P» en la Lista);
  el rojo queda solo para «venció» (D4) · los contadores del rail llevan `aria-label` y `title` («1 vencida» / «4
  activos») (D5) · el pie del rail deja Actualizar y el tema a la vista, y **Equipo · Ver en SharePoint · Salir** viven
  en un menú «···» que abre hacia arriba (D6).
- **B · celular.** Inicio: KPI en **una fila de «mini»** (el 5.º cae a la fila de abajo), actividad a **3 renglones**
  (5 en escritorio; el cruce de 720 px repinta) — la página baja de ~2,400 a **2,221 px** medidos (B3) ·
  **Atrás del navegador cierra cualquier diálogo**: los siete que no viven en el hash (incluida la confirmación) empujan una entrada de historial
  sin cambiar la URL al abrirse y `popstate` los cierra. Al cerrar con el botón la entrada se queda —`history.back()`
  es asíncrono y se cruzaba con el `pushState` de lo que se abre después—: un Atrás de más que no hace nada, contra el
  gesto de Android que sacaba de la pantalla (B8).
- **E · arnés.** El refresco automático **ya no se pausa** con Equipo ni con Toda la actividad (solo con los de
  edición), y al cerrarlos relee si pasaron más de 60 s. **El evento `close` del `<dialog>` no llega bajo tiempo
  virtual** (medido: 8 s de espera y nada), así que `cerrarDialogo` avisa síncrono por `fijarAlCerrar` y el `close`
  queda como cinturón para Esc (E4).
- **Lo que la E2E nueva cazó de v0.5.0:** «Filtrar · N» no se actualizaba al pulsar un chip (solo al repintar la
  pantalla); `pintarBotonFiltros` vive ahora en `tablero.js` y se repinta con cada cambio de filtro.
- **Lo que el `revisor-entregable` cazó antes del commit** (12 hallazgos, 7 aplicados): la confirmación (`#dlg`) no
  entraba al historial de B8 (ahora sí, y Atrás sobre ella cancela) · `.mn-btn { display: inline-flex }` de la piel
  **pisaba `[hidden]`** —«ver 50 más (0 restantes)» y «ver toda» se veían con `.hidden = true` y la E2E pasaba porque
  comprobaba la propiedad— · Ctrl+Enter permitía **dos notas** durante el POST (no respeta `disabled` como el clic) ·
  `recargar()` podía correr **dos veces** al cerrar Equipo (la guarda `recargando` se ponía después de esperar el
  token) · el KPI «sin dueño» sobre un proyecto ya abierto se combinaba con un filtro previo; el chip del tablero
  dejaba pasar las hechas · en celular la línea-resumen y el chip C8 decían el reloj dos veces · lectura no veía
  «proyecto cerrado». Y dos que se declaran sin aplicar: Esc no relee (el `close` no llega bajo tiempo virtual y no
  se probó) y los renglones de vencimientos y sin movimiento ahora también abren la tarjeta, por consistencia con C9.

Medido en v0.6.0: E2E **175 / 157 / 19** (gerencia / colaborador / lectura), `npm test` verde (62 reglas), y **32
vistas × 3 anchos × 2 temas = 192 capturas con 0 desborde horizontal**; a ≤ 900 px el único objetivo < 36 px sigue
siendo la liga de texto «Oficio ASEA en el correo» dentro de un renglón de Documentos (prosa, 17 px; ya declarada
en v0.5.0) — la liga «Proyecto» de D2 medía 17 px a 820 y ahora lleva 8 px de relleno. Sin
cambio de esquema: **v0.6.0 no necesita `provisionar.html`**. SW `minsa-proyectos-v7`. Ojo del arnés: la vista
`entrar` deja la pantalla de entrada encima y el rail oculto — va **siempre la última** de `VISTAS_TODAS` (las 4
vistas nuevas se capturaron una vez después de ella y salieron en blanco).

**v0.5.0** (2026-09-12) — **tanda 4: los 16 hallazgos del recorrido del 12-sep** (la app se corrió, no se leyó:
27 pantallas a 390 / 820 / 1366 px con emulación real por CDP). Por cubetas:

- **A · defectos reproducidos (los 8).** Con la biblioteca **fuera del piloto**, «Ligar» y «Subir» quedan
  **apagados** con el porqué en el `title` y «Pegar un enlace» sigue vivo —antes llevaban a un 403 que le
  enseñaba a un colaborador la ruta de un script que no puede correr; ese 403, si se fuerza, ya solo nombra el
  script para gerencia— (A1) · **Equipo** se pinta además como **fichas** en ≤ 720 px: la tabla de 5 columnas
  medía más que el diálogo (354 px) y se cortaba después de «Rol» (A2) · entre **721 y 900 px** el tablero es
  **2 × 2** en vez de `repeat(4, 240px)` con scroll horizontal (A3) · «Copiar liga» es un **botón de icono**, así
  que el título de la tarjeta deja de partirse en tres líneas (A4) · el usuario del rail es **nombre en negrita +
  chip de rol**, con el correo en el `title` (antes partía «gerenci / a») (A5) · «Al día · leído hace N s» deja de
  salir **dos veces** en escritorio (A6) · el botón flotante **se esconde** con cualquier diálogo abierto (A7) ·
  los párrafos de ayuda usan **`.mn-help`** (cuerpo, minúsculas) en vez del rótulo en mayúsculas y mono (A8).
- **B · celular.** La cabecera del proyecto se compacta —chip + título a 2 líneas, las tres acciones en un menú
  «···», la descripción a una línea, filtros y buscador detrás de **«Filtrar · N»**—: la primera tarjeta pasa de
  ~630 px a **496 px** medidos (B1) · la lateral (Avance · Quiénes · Vencimientos · Actividad), que caía a
  ~1,900 px, es la pestaña **«Resumen»**, y bajo el título va la línea «3 en curso · 2 en revisión · vence en N d»
  (B2) · los chips de persona se quedan en **avatar** (B4) · el FAB ya no tapa el pie de la última tarjeta (B5) ·
  ningún objetivo táctil baja de 36 px **hasta 900 px** —`--control-h-sm` sube a 40 px, «→ siguiente» y «ver las N anteriores» a 36; el corte va en 900 y no en 720 porque A3 acaba de declarar tableta al rango 721-900— (B6) · la Lista
  esconde «Origen en la KB» (B7).
- **C · flujos.** **«Crear y otra»** guarda y deja el diálogo abierto conservando asignado, prioridad, columna y
  vence (capturar 17 entregables eran 17 aperturas desde cero) (C1) · **atajos de fecha** (hoy · mañana · +7 d ·
  fin del frente) bajo cada campo `Vence` (C2) · el diálogo de tarjeta se reordena por **frecuencia de uso**:
  datos → Mover a… → Notas → Documentos → Editar, la columna actual se lee «En curso · actual» y **«Borrar
  tarjeta» sale del pie** y vive dentro de «Editar» (C5).
- **D · pulido.** Bajo cada fecha, la **fecha leída** en el formato de la casa («vie 18 sep»; vacío, «día/mes/año»): el campo nativo se
  pinta en el idioma del **dispositivo** y `<html lang="es">` no lo cambia (D1) · `.mn-row` baja a una columna en
  ≤ 480 px, así que los selects dejan de truncar nombres (D3).
- **E · arnés.** El driver de capturas vive en **`herramientas-dev/capturas.mjs` + `driver.js`** (E1) · la prueba
  de «token caducado» **restaura** el MSAL falso en un `finally` —dejaba `acquireTokenSilent` roto y «Actualizar»
  fallaba después de la E2E— (E2) · el arnés copia el **meta viewport** de `index.html`, sin el cual una emulación
  móvil maqueta a 980 px (E3).
- **Lo que el `revisor-entregable` cazó con la E2E en verde, corregido antes del commit:** «Crear y otra» se quedaba
  **muerto para siempre** tras un intento sin título (se apagaba fuera del `try/finally` que lo repone) · el atajo
  «hoy» escribía **mañana a partir de las 18:00** hora de México (`toISOString()` es UTC; ahora el día se arma con
  componentes locales) y la prueba no lo veía porque calculaba el esperado con la misma expresión · la pestaña
  «Resumen» dejaba el panel **en blanco en escritorio** si se llegaba por el hash o girando el teléfono (ahora cae
  a Tablero, y el cruce de 720 px repinta) · la línea-resumen se pintaba también en escritorio, junto a la lateral
  que dice lo mismo (la clase de defecto de A6) · el barrido de capturas abría el **proyecto de UNA tarjeta** en casi
  todas las vistas (el renglón 0, por orden de fecha) — ahora abre el frente rico y `resumen` está en la lista ·
  con rol `lectura` el arnés salía con código 1 por diseño («NO APLICA» ya no cuenta como falla) · la sección
  `## Pruebas` seguía con los números de v0.4.1 (obs. 512) · y «jue 18 sep»: el 18 es viernes.
- **Hallazgo del propio barrido, que no estaba en los 36:** con ligas, **Documentos desbordaba 103 px** a 390 px
  (`.doc` con la 2.ª columna en `1fr`, cuyo mínimo es el contenido: el `select` de «tarjeta:» empujaba la página).
  Ahora `minmax(0, 1fr)`, y en celular el costado baja a su propia línea. **Lo cazó la captura, no la E2E.**

Medido en v0.5.0: E2E **144 / 128 / 18** (gerencia / colaborador / lectura) en 6 corridas, `npm test` verde, y las
**28 vistas × 3 anchos × 2 temas = 168 capturas con 0 desborde horizontal** y ningún botón < 36 px hasta 900 px
(queda una liga de texto de 17 px dentro de un renglón de Documentos: prosa, no botón). Sin cambio de
esquema: **v0.5.0 no necesita `provisionar.html`**. SW `minsa-proyectos-v6`. De los 36 hallazgos van **22**;
quedan **14** para una tanda 5: B3, B8, C3, C4, C6, C7, C9, C10, D2, D4, D5, D6, E4 — y **C8 a medias** (el
reloj del frente ya está en la cabecera; falta el mismo chip en la lista de Proyectos).

**v0.4.1** (2026-09-12) — corrección del primer defecto reportado en operación: **ligar un archivo de la
biblioteca contestaba «No se pudo ligar: no se pudo escribir en PROY_Ligas: HTTP 400. Invalid request»**
(Carlos, la LAU, un `.docx` de 2024 archivado en `98_Archivo/` con nombre de 77 caracteres). **La causa no está
demostrada** —PROY_Ligas nunca había recibido una escritura en real (el exporte del 11-sep trae 0 renglones) y el
400 de SharePoint no dice cuál campo—; la hipótesis principal es el **tope de 255** de `PROY_Ligas.Url` (texto de
una línea): el `webUrl` que Graph devuelve por un `.docx` es la forma
`…/_layouts/15/Doc.aspx?sourcedoc=%7BGUID%7D&file=<nombre>&action=default&mobileredirect=true`, que con ese
nombre mide **250** sin `&DefaultItemOpen=1` y **268** con él, y no se midió cuál de las dos da el tenant. A la
vez la búsqueda (`drive/root/search`) devolvió el archivo **sin `parentReference.path`** y la app pintó la ruta
como si estuviera en la raíz. Lo que hace v0.4.1, pensado para que sirva sea cual sea la causa: (1) al ligar
**relee el elemento por id** (`itemDeDrive`: carpeta real + `sharepointIds.listItemUniqueId`; un 404 avisa y no
liga; un archivo que resulta estar en el buzón tampoco se liga como «archivado»); (2) `urlParaLiga` guarda el
`webUrl` si cabe y si no la **forma corta** `…/Doc.aspx?sourcedoc=%7BGUID%7D&action=default` (147 caracteres,
abre lo mismo — verificado solo por razonamiento para `.docx`; para un `.pdf` con `webUrl` > 255 no está
medido); (3) `textosLargos` detiene **en la app, con el campo y su largo**, cualquier texto > 255 antes de que
salga hacia Graph — en Ligar, «Pegar un enlace» y «Subir al buzón» (aquí antes de subir las piezas); (4) **si
SharePoint contesta 400 de todos modos**, la app reintenta **una** vez con la Url corta (un 400 no escribe nada)
y, si vuelve a fallar, el aviso trae el largo de cada texto: «… · largos: Title 77 · Ruta 88 · Url 250 · …»
— con eso el siguiente diagnóstico ya tiene datos. El Graph falso de la E2E rechaza ahora el texto > 255 igual
que SharePoint (antes lo aceptaba: por eso 251 pruebas en verde no lo vieron) y admite 400 inyectados. Sin
cambio de esquema. Los fixtures llevan un nombre **sintético** del mismo largo, no el del documento real.

**También en v0.4.1** (2026-09-12, captura de Carlos): **«Actividad reciente» empujaba el Inicio hacia abajo** — cada entrada caía a una palabra por línea. Causa: `.mini .it` era una rejilla de tres columnas (`auto 1fr auto`) y la hora, en `nowrap`, se quedaba con ~100 px de los 268 de una lateral de 300 px; 8 entradas medían ~2,700 px. Arreglo: dos columnas (avatar · cuerpo) con **cabecera quién + cuándo**, la frase a todo el ancho, el título «…» en negrita y recortado a 2 líneas (íntegro en `title`), el «de X a Y» en línea propia como `X → Y`, filete entre entradas, lateral de **340 px** con principal `minmax(0, 1fr)`, y **5 entradas** en Inicio en vez de 8 («ver toda» sigue cubriendo el resto). `itemMini` ya no recibe el nombre dentro de la frase (`queHizo`, no `fraseActividad`), así que Próximos vencimientos, Sin movimiento, «Toda la actividad» y Equipo cambian de acomodo con ella. E2E 131/119/15. El CSS y el JS viajaron en el commit de la liga (20c3cf7, `-a` de una sesión paralela); la prueba en f59655d.

**v0.4.0** (2026-09-11, casi medianoche) — tanda 3 de la auditoría, los 10 P3, con lo que **cierra la auditoría
del 11-sep** (33 hallazgos: 7 + 12 + 10 hechos, 4 «NO» a propósito): **«ver toda»** la actividad (global o
del proyecto, chips por persona, de 50 en 50) · **«Ver en SharePoint»** en el rail (el `webUrl` real de
`PROY_Tareas`; Microsoft Lists puede enseñarla como Tablero: el plan B del plan) y la pantalla **Equipo**
(`PROY_Roles` de solo lectura: nombre, correo, rol, activo y las abiertas de cada quien) · **Hecho colapsada** a las 5 más recientes
con «ver las N anteriores» (Hecho siempre ordena por `HechoEl`, lo último arriba) · en celular **«Nueva tarea» flota** abajo a la derecha · las tres fechas son
**selector nativo** (`type=date`; la máscara dd/mm/aaaa se fue, `aIsoDia` sigue aceptando las dos) ·
**Documentos agrupa** «Del proyecto» y por tarjeta, chip de estado junto al nombre y chips por tipo ·
**Imprimir** (`@media print` sin rail, barra, tabs, filtros, botones ni lateral + botón = `window.print()`) · la tarjeta dice **«Creada» por quién y
cuándo** (`createdBy` / `createdDateTime` de SharePoint) · el refresco automático **conserva el scroll** · el contador rojo del rail
es **solo vencidas**. Sin cambio de esquema: **este push no necesita `provisionar.html`** (el de v0.3.0 sí,
si no se hizo).

**v0.3.0** (2026-09-11, noche, tarde ya) — tanda 2 de la auditoría, los 12 P2: **Reabrir** un proyecto cerrado (gerencia) y
la **carpeta destino** editable en el proyecto; **filtros** dentro del proyecto (persona · solo alta · solo
vencidas · texto sin acentos) y la **Lista ordena por columna**; **Subir / Bajar** dentro de la columna y
**mover la tarjeta a otro proyecto** (gerencia); el **rail marca el equipo elegido** con su contador, los
**KPI de Inicio son botones** que aterrizan en Mis tareas con el filtro puesto (los dos de vencimiento cuentan
**lo mío**, para que el número sea el que se ve al llegar; lo global sigue en «Próximos vencimientos»), y **«→ siguiente»** al pie
de cada tarjeta con **Deshacer** 5 s; en celular el tablero es **una columna con pestañas** (Por hacer 4 ·
En curso 2 …); cada PATCH lleva **If-Match** (412 = alguien cambió el renglón: se relee, no se pisa);
**sin red** hay banda y las escrituras fallan al instante con mensaje claro; y el tercer tipo de liga,
**«enlace»** (título + URL pegada, sin biblioteca). `PROY_Ligas.Tipo` gana `enlace` y
`PROY_Actividad.Accion` gana `reabrir-proyecto`: **en el tenant hay que agregarlas con `provisionar.html`
antes de publicar** (ver abajo).

**v0.2.0** (2026-09-11, noche) — tanda 1 de la auditoría (`cerebro/docs/` → artifact «Auditoría MINSA
Proyectos»): **deep links** por hash (`#p/<clave>/t/<id>`: se comparte por chat y sobrevive al F5;
«Copiar liga» en la tarjeta), **notas por tarjeta** (renglones `comentar` de `PROY_Actividad`),
**ligar y subir desde la tarjeta**, **Quitar liga** y cambiar su tarjeta, **«Buscar el archivado»**
que reemplaza la liga del lote que la skill ya acomodó, avisos como **toast** (`role=status`, sin
saltar el scroll) y **Mis tareas con lo urgente arriba** (días grandes, sin importar el proyecto).
`PROY_Actividad.Accion` gana `desligar` y `comentar`: **en el tenant hay que agregarlas con
`provisionar.html` antes de publicar** (ver abajo).

**v0.1.0** (2026-09-11) — piloto: Inicio · Proyectos · Proyecto (Tablero / Lista / Documentos) ·
Mis tareas. Fuera, a propósito: mensajes, calendario, línea de tiempo, analítica, push.

## Cómo funciona

- Entra con la cuenta de MINSA (MSAL por redirección; el popup se rompe en celulares). El token
  es `Sites.Selected`: la app alcanza solo los sitios que se le autorizaron, con el rol de cada
  persona encima. Quien escribe de verdad lo decide SharePoint.
- `PROY_Roles` elige la pantalla y las funciones de guardar lo comprueban (cinturón, no barrera):

| Acción | gerencia | colaborador | lectura |
|---|---|---|---|
| ver todo | sí | sí | sí |
| crear/editar/asignar/mover tarea; ligar/subir | sí | sí | no |
| borrar tarjeta; crear/editar/cerrar proyecto | sí | no | no |

- Cada escritura exitosa deja un renglón en `PROY_Actividad` («Lorena movió … a En revisión»):
  es la actividad reciente y la métrica de vida del piloto.
- **Documentos = ligas.** «Ligar archivo» busca en la biblioteca de la unidad (solo lectura, excluye
  el buzón). «Subir al buzón» deposita en `99_Pendiente-Archivar` con `_lote.json` al final (contrato
  1, firma `minsa-proyectos`); la skill de archivar lo acomoda después y la app lo nota sola (la
  carpeta desaparece → «ya lo acomodó la skill»). Nada se escribe fuera del buzón.
- La KB liga por la **Clave** del proyecto (`· app: lau-asea-03-001` en el marcador ⏳); un
  exportador baja las listas a JSON y los consumidores **proponen**, nunca escriben aquí.
- **La URL dice dónde estás** (v0.2.0): `#inicio` · `#proyectos` · `#mis` · `#p/<clave>` ·
  `#p/<clave>/lista` · `#p/<clave>/docs`, y `/t/<id>` con una tarjeta abierta. Se escribe con
  `pushState` (síncrono) y se lee en `popstate`/`hashchange` (`aplicarHash`, idempotente): Atrás
  cierra la tarjeta o vuelve a la pantalla anterior; una liga pegada del chat abre esa tarjeta, y
  si hay que entrar primero, el destino se guarda en `sessionStorage` y se aterriza ahí.
- **Notas** = renglones de `PROY_Actividad` con `Accion=comentar`, el texto en `Title` (250 máx.),
  pintados en orden dentro de la tarjeta; en «actividad reciente» salen como «Lorena anotó: «…»».
  A diferencia del resto de la bitácora, esa escritura ES la acción: si falla, se ve.
- **Dos personas sobre la misma tarjeta** (v0.3.0): cada renglón se lee con su `eTag` (`_etag`) y cada
  PATCH lo manda como `If-Match`. Si alguien lo cambió en medio, Graph contesta **412** y la app **relee
  y reabre la tarjeta con lo nuevo** en vez de pisar el cambio ajeno. Tras un PATCH propio el etag se
  olvida hasta la siguiente lectura (Graph no lo devuelve), así que la protección es contra el cambio
  *ajeno*, que es el que nadie ve. Si Graph rechazara la cabecera con 400, se reintenta sin ella y se
  deja de mandar en esa sesión: la app sigue escribiendo. **No se pudo medir contra el tenant desde el
  harness**: la primera escritura real de v0.3.0 es la que lo confirma (buscar en la consola «rechazó If-Match»).
- **Sin red** (v0.3.0): banda arriba, el cuerpo apaga los botones que escriben o abren una escritura, y `graph.js` falla al
  instante en cualquier escritura («sin conexión: puedes ver, no guardar»), sin los 4 reintentos a ciegas.
  Al volver la red se releen las listas; **no se reintenta el último cambio** a propósito (un cambio
  viejo aplicado solo sorprende). El service worker sigue sirviendo solo el armazón.
- **Enlace** (v0.3.0, F4) = liga `Tipo=enlace` con `Title` + `Url`, sin `Unidad`/`Ruta`/`DriveItemId`.
  Solo `http(s)`; se ofrece aunque el equipo no tenga biblioteca en el piloto (los dos Ventas) y
  desde la tarjeta. Es para lo que no vive en la biblioteca de la unidad: un correo, un oficio en Legal o
  Finanzas, una página. Se guarda la liga, no el archivo.
- **Filtro y orden dentro del proyecto** (v0.3.0) viven en `estado` y se **reinician al cambiar de
  proyecto**; el texto ignora acentos y mayúsculas y busca en título y descripción. **Subir / Bajar**
  renumera `Orden` 1..n en el orden visual y escribe **solo lo que cambia**: la primera vez en una columna
  sembrada (sin `Orden`) puede ser toda la columna; después, dos PATCH.
- **En celular** (≤ 720 px) el tablero es **una columna** y una fila de pestañas la elige (`estado.colMovil`,
  vuelve a Por hacer al cambiar de proyecto). El DOM es el mismo en escritorio: el CSS esconde las pestañas
  y enseña las cuatro columnas. Y «Nueva tarea» **flota** abajo a la derecha (v0.4.0); deshabilitado, no se ve.
- **Refresco** (v0.4.0, T3): `recargar()` repinta **siempre** y devuelve el scroll a donde estaba. «Solo
  si cambió» se intentó y se retiró en la revisión de v0.4.0: los chips «venció» / «vence hoy» y «sin
  movimiento» dependen del reloj, no de los datos, y un DOM que sobrevive engancha objetos que `cargarTodo()`
  ya reemplazó. Regla que quedó: **un handler resuelve el renglón por id al clic, nunca captura el objeto.**
- **«Ver en SharePoint»** (v0.4.0, F13) usa el `webUrl` que Graph devuelve por lista (`$select=…,webUrl`),
  no una URL deducida: la trampa de la casa es que el nombre interno no es el mostrado. Abre la lista en su
  vista por defecto; la vista Tablero de Microsoft Lists se crea allá, si se quiere (no está verificada).
- **Imprimir** (v0.4.0, U11) imprime **lo que está en pantalla** (tablero, lista o documentos) sin rail,
  barra, botones ni lateral; no fuerza la Lista. Ctrl+P hace lo mismo.
- **Hecho** (v0.4.0, U6) ordena siempre por `HechoEl` (lo último arriba), enseña 5 y «ver las N anteriores»
  (`estado.hechoTodas`, vuelve a colapsar al cambiar de proyecto, igual que el filtro de Documentos). El
  número del encabezado y el avance siempre son los reales.

## Archivos

```
index.html      un solo DOM para celular y escritorio (rail → pestañas abajo)
app.js          sesión, carga (firma T3), Inicio (KPI botones), Proyectos, Proyecto, nuevo/editar/cerrar/reabrir, sin red, toda la actividad, Equipo, imprimir
tablero.js      tablero (cubetas del proyecto + huérfanas, pestañas de columna, Hecho colapsada), lista (orden), filtros, Mis tareas, tarjeta (mover/subir-bajar/editar/borrar, creada por), 412, editor de cubetas
docs.js         Documentos: buscar, ligar, subir al buzón, pegar enlace, grupos y chips por tipo, «en el buzón» derivado en vivo
comun.js        estado, DOM sin innerHTML, avisos (toast con acción), confirmación, fechas (diaInput), PROY_Actividad
reglas.js       reglas puras (roles, PUEDE, cubetas por proyecto, avance, próximos, sin movimiento, clave, filtrar, ordenar lista, reordenar, url)
lote.js         el _lote.json (contrato 1)
graph.js        cliente Graph (copia de calytek-planta + buscarEnDrive/existeRuta)
config.js       client id, sitio, listas, equipos, bibliotecas — público por diseño
esquema.json    las 5 listas PROY_* (única fuente: provisionar.html y graph.js la leen)
minsa-ui.css    GENERADA por marca/minsa-design/ui/vendorizar.py — no editar a mano
estilo.css      lo que la piel no trae: fuentes locales, acomodo, tablero, entrada
sw.js           service worker: solo el armazón, nunca Graph ni login
test/           reglas, lote, sw, datos (guardia de datos personales) y la E2E
```

## Pruebas

```bash
npm test                     # vendorizar --verificar · selectores · reglas · lote · sw · datos
node servidor-local.js       # http://localhost:8080/
```

E2E contra Graph falso, 3 roles, desde PowerShell (Edge headless):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\test\e2e.ps1
```

Desde el 2026-09-13 `e2e.ps1` sale con **exit 2 si el puerto 8080 estaba ocupado**: el servidor muere al arrancar
y lo que Edge mediría sería la app de OTRA sesión (medido ese día desde planta con `capturas.mjs` de esta app
corriendo al lado: «278 ok» de proyectos reportados como de planta). Con dos sesiones sobre la máquina, el 8080
es un recurso compartido igual que el working tree. Y `capturas.mjs --medir` cuenta ahora los `medir: ERROR` y
ensucia el exit (obs. 591: 64/64 rotas con «64 vistas» en pantalla).

**Reglas que la E2E verde no puede ver (obs. 588, 589, 590 — las tres cazadas aquí el 2026-09-12):** (1) cada
límite del tenant que muerde en real (choice sin `allowTextEntry`, texto de una línea > 255, `If-Match`/412)
entra **el mismo día** al Graph falso de **las dos apps** (planta lo tiene desde el 13-sep), y la corrida exige
`DB.textoLargo` vacío; (2) una lista con **0 renglones** en el exporte a N días es una lista **sin prueba real**
(`PROY_Ligas: 0` desde el primer día y nadie lo leyó así): la aceptación tras publicar escribe una vez en cada
lista, no solo en la que el piloto usa; (3) cuando un rediseño choca con una aserción, se reescribe la aserción
a lo que promete la interfaz nueva — un elemento que sigue en pantalla «porque la E2E lo espera» es la prueba
dictando la interfaz (v0.7.0, el chip duplicado del reloj); (4) el barrido de capturas abre el fixture por
IDENTIDAD (`abrirProy` busca la LAU, nunca «el primero»: la ordenación pone enfrente el caso fácil) y cada
renglón de `_mediciones.txt` lleva el `hash=` de lo que midió. El `revisor-entregable` coteja las cuatro.

Y las **capturas con medidas** a anchos reales (celular 390 · tableta 820 · escritorio 1366), que ven lo que la
E2E no —desbordes, alturas, objetivos táctiles—; viven fuera del repo público:

```bash
node ../herramientas-dev/capturas.mjs --todas --anchos 390,820,1366 --temas claro,oscuro
```

**v0.6.0 (2026-09-12): 351/351** — gerencia 175 · colaborador 157 · lectura 19. Lo nuevo que cubre: la tarjeta de
lectura con una sola señal; el chip y el KPI «sin dueño» y su aterrizaje filtrado; el orden de Proyectos con el mismo
día en dos ISO distintos; el reloj «vence en 3 d · faltan N» en cabecera y lista; los buscadores de Proyectos y Mis
tareas; los chips de tipo de actividad y el renglón que abre la tarjeta; «Proyecto» como enlace; Ctrl+Enter y el
contador de la nota; la clase `.alta` y la columna «P»; los `aria-label` del rail; el menú «···» del rail y que se
cierra al elegir; Atrás cierra Equipo y cancela una confirmación (`history.state.dlg`); y la relectura al cerrar un diálogo de lectura tras 60 s.
**No cubre:** Esc sobre un diálogo (el `close` no llega bajo tiempo virtual); el gesto real de Atrás en Android.

**v0.5.0 (2026-09-12): 290/290** — gerencia 144 · colaborador 128 · lectura 18, en 6 corridas seguidas (3 anchos ×
2 temas). Lo nuevo que cubre: Ligar/Subir apagados con biblioteca fuera del piloto (y el 403 si se fuerza); las
fichas de Equipo; «Crear y otra» conserva asignado/prioridad/columna/vence y **un intento sin título no deja
muertos los botones**; el atajo «hoy» escribe **hoy en hora de México** (el esperado se calcula por otra vía, no
con la misma expresión del código) y «mañana» es +1; «Resumen» marca el proyecto y llega al hash en celular, y
**en escritorio cae a Tablero** en vez de dejar el panel en blanco; la línea-resumen de la cabecera; el orden del
diálogo de tarjeta y «Borrar» dentro de Editar; «Copiar liga» como icono con nombre accesible. El rol `lectura`
pasa de 15 a 18: antes no tocaba nada de la tanda. **No cubre:** el mensaje de 403 **para no-gerencia** («Pídelo a
gerencia», `docs.js`) — la rama vive en el `if (gerencia)` de la suite y el colaborador de la E2E trabaja sobre
CALYTEK, que sí está en el piloto; los estilos de celular (el CSS solo se ve en las capturas); Safari/iOS. El
barrido de capturas: **28 vistas × 3 anchos × 2 temas = 168, 0 desborde horizontal**; a ≤ 900 px quedan dos
objetivos de menos de 36 px que no son botones —la liga de texto «Oficio ASEA en el correo» dentro de un renglón
de Documentos (17 px de alto, prosa)— y ninguno más. Ojo del arnés: **todas las vistas abren el mismo frente** (la
LAU rica) desde esta versión —antes el renglón 0, que por orden de fecha era el proyecto de UNA tarjeta y no
scrolleaba—, así que `abrirProy` limpia filtro y pestaña de columna entre vista y vista.

**v0.4.1 (2026-09-12): 265/265** — gerencia 131 · colaborador 119 · lectura 15, estable en 2 corridas seguidas. Lo
nuevo: `archivo-l1` imita al tenant (nombre de 77, `webUrl` Doc.aspx de 268, búsqueda sin `parentReference.path`)
y la liga sale con `Ruta` real y `Url` ≤ 255; un enlace pegado de 300 se detiene con aviso; un 400 inyectado en el
primer POST se resuelve con el reintento de Url corta; dos 400 seguidos dejan el aviso con «largos:»; un archivo
del buzón sin path se detecta al releer; y el falso contesta 400 «Invalid request» a todo texto > 255 en cualquier
POST/PATCH de la corrida (`DB.textoLargo` debe quedar vacío). `npm test`: 57 reglas. Ojo del arnés: los ids de
fixture `archivo-a*` los usan también las pruebas de F2 (que empujan su propio `archivo-a3` a media corrida); los
de v0.4.1 son `archivo-l*` para no chocar.

**v0.4.0 (2026-09-11, casi medianoche): 251/251** — gerencia 124 · colaborador 112 · lectura 15, estable en 3 corridas
seguidas. El Graph falso devuelve ahora `createdBy` / `createdDateTime` / `lastModifiedDateTime` por renglón y
`webUrl` por lista. Lo nuevo que cubre: contador rojo = solo vencidas; fechas nativas (`type=date`) y la
tarea creada con la fecha bien; releer repinta y no revienta; Hecho con 7
enseña 5, cuenta 7, «ver las 2 anteriores» las trae; «Creada» con quién; Docs con dos grupos, chip junto al
nombre, chips por tipo que filtran; «ver toda» del proyecto lista toda su actividad con chips por persona;
«Ver en SharePoint» apunta al `webUrl` de `PROY_Tareas`; Equipo lista los 3 roles; «Imprimir» llama a
`window.print`. **No cubre** (CSS puro, sin navegador real): el botón flotante en celular y la hoja de impresión.

**v0.3.0 (2026-09-11, noche, tarde ya): 221/221** — gerencia 109 · colaborador 97 · lectura 15, estable en 3 corridas
seguidas; `npm test` 50 comprobaciones de reglas. El Graph falso ahora lleva **eTag por renglón** (sube en
cada PATCH) y contesta **412** a un `If-Match` viejo. Lo nuevo que cubre: KPI «vencidas» aterriza en Mis
tareas con el chip puesto y «proyectos activos» en Proyectos; el rail marca el equipo y cuenta; chips de
filtro por persona / alta / vencidas + texto sin acentos y «× limpiar»; pestañas de columna con conteo;
la Lista ordena por Vence, por Tarea y se invierte; Subir/Bajar renumera y el tablero lo refleja;
«→ siguiente» mueve sin abrir y Deshacer la regresa como «devolvió»; 412 → releer y reabrir con lo nuevo,
sin pisar; sin red → banda y la escritura falla sin llamar a Graph, y al volver se relee; enlace con
`javascript:` rechazado, guardado con tarjeta y sin ruta, repetido avisado; carpeta destino normalizada y
propuesta en el `_lote.json`; gerencia mueve una tarjeta a otro proyecto (bitácora en los dos); Reabrir
limpia el sello; colaborador sin select de proyecto ni Reabrir; lectura sin «→ siguiente», Subir/Bajar ni
enlaces.

**v0.2.0 (2026-09-11, noche): 150/150** — gerencia 72 · colaborador 64 · lectura 14, estable en 4
corridas seguidas. Lo nuevo que cubre: deep link al arrancar (lectura entra con `#p/lau-demo/t/<id>`
y aterriza en la tarjeta); el hash sigue al proyecto / pestaña / tarjeta y vuelve al cerrarla;
`#p/<clave>/t/<id>` por URL abre la tarjeta y `#mis` navega; clave desconocida avisa y va a Inicio;
toast con `role=status` y ×; nota guardada como `comentar` con tarjeta, texto y quién, pintada en
la tarjeta y en Inicio; Ligar / Subir desde la tarjeta con la tarjeta ya puesta; cambiar la tarjeta
de una liga (PATCH `TareaId`); «Buscar el archivado» reemplaza la liga del lote (nace la archivada
con la misma tarjeta, muere la del buzón, `desligar` con «reemplazó»); Quitar liga con confirmación;
Mis tareas con la vencida en «Urgentes» y los días correctos.

**Trampa del arnés (medida 2026-09-11):** con `--virtual-time-budget` los timers corren
«instantáneos» y un evento DOM encolado (el `close` de un `<dialog>`, un `hashchange`) puede llegar
DESPUÉS de que `esperar()` agotó sus 8 s virtuales, y `location.hash = x` es una navegación asíncrona
que se reordena. Por eso el hash se escribe con `pushState` y también al cerrar por código
(`cerrarDialogo`), y el arnés navega con `irHash()` (pushState + popstate). Aplica igual al arnés de
`calytek-planta-app`, que es el mismo.

**v0.1.0 (2026-09-11): 107/107** — gerencia 51 · colaborador 43 · lectura 13. Cubre: clave
inválida y duplicada rechazadas; crear, asignar y mover por las 4 columnas (sello `HechoPor` al
entrar a hecho, limpio al salir); un renglón de actividad por acción; Mis tareas por correo;
Docs: buscar (excluye el buzón), ligar, subir (`_lote.json` al final), 404 del buzón = «ya lo
acomodó la skill», subida a medias borra la carpeta; 503 reintenta; 403 nombra el permiso;
biblioteca fuera del piloto nombra el sitio; lectura sin botones y `moverTarea` niega;
colaborador no borra ni cierra aunque se fuerce el botón; token caducado vuelve al login.
**En operación desde 2026-09-11 (noche)** — `https://minsa-energy.github.io/minsa-proyectos/`: app registrada en
Entra, `Sites.Selected write` sobre Administración y Ambiental-CALYTEK, 5 listas provisionadas con
versiones, 21 renglones sembrados (10 roles, proyecto `lau-asea-03-001`, 10 tareas), exportador diario
a las 20:00. **Prueba real:** Francisco (`colaborador`) entró desde el celular y editó una tarjeta; el
exporte de las 20:34 la trae en `PROY_Actividad` con su cuenta. Sin probar todavía: las bibliotecas
fuera del piloto, y el resto del roster en el celular.

## Publicadas v0.3.0 y v0.4.0 (2026-09-12)

Carlos corrió el paso de esquema de v0.3.0 (abajo, tal cual: consentir `Sites.FullControl.All` → `-Rol manage
-SoloAdministracion` → `provisionar.html` «Crear lo que falta» → «Todo coincide con esquema.json» → `-Rol write`
→ revocar el consentimiento) y el `git push` de `02b2afb`; Pages sirve `VERSION 0.4.0` y SW `minsa-proyectos-v4`
(verificado con `curl` desde el harness). **If-Match MEDIDO contra el tenant el 2026-09-12 (Carlos, Edge, v0.4.0):**
mover una tarjeta con la consola abierta no imprime «Graph rechazó If-Match» (SharePoint acepta la cabecera), y con la
misma tarjeta en dos pestañas —mover en la 2.ª y luego en la 1.ª sin recargar— la 1.ª recibe el toast «alguien cambió
el renglón … (412)» y relee: la protección T1 funciona en real. Las dos secciones siguientes quedan como registro.

## Al publicar v0.13.0: primero el esquema, luego el push

**Hay cambio de esquema** (una opción nueva en una columna de opciones) y conviene ANTES del push: sin él, «Eliminar
proyecto» borra igual, pero el renglón «eliminó el proyecto …» de `PROY_Actividad` se rechaza (400) y se pierde en silencio.

1. **Subir Administración a rol `manage`** como en v0.11.0.
2. `npm run serve:provisionar` → Revisar. Debe reportar una sola cosa: `PROY_Actividad.Accion` **FALTA la opción
   `borrar-proyecto`** (PATCH de opciones, idempotente). → Aplicar.
3. **Regresar Administración a `write`** y revocar el consentimiento amplio.
4. `git push` (lo hace Carlos); el service worker va en `minsa-proyectos-v16`.
5. Prueba de aceptación en real (gerencia): el rótulo «PROYECTOS» cabe en el rail; en LAU el «⋮» del título abre
   Imprimir · Cubetas · Editar ▸ Editar datos · Cerrar proyecto · Eliminar proyecto (rojo); crear un proyecto de prueba con
   una tarjeta y eliminarlo → desaparece de Proyectos, la tarjeta también, y en Actividad de Inicio aparece «eliminó el
   proyecto …»; pulsar Oscuro dos veces deja Oscuro marcado y pulsar Claro pone claro; los contadores del rail son cuadrados.

## Al publicar v0.12.0: primero el esquema, luego el push

**Hay cambio de esquema** (una columna nueva) y va ANTES del push, o «Guardar cambios» y «Crear tarea» contestarán 400
(`Color` no existe en `PROY_Tareas`):

1. **Subir Administración a rol `manage`** como en v0.11.0.
2. `npm run serve:provisionar` → Revisar. Debe reportar una sola cosa: `PROY_Tareas` **FALTA la columna `Color`** (text).
   → Aplicar. Idempotente.
3. **Regresar Administración a `write`** y revocar el consentimiento amplio.
4. `git push` (lo hace Carlos); el service worker va en `minsa-proyectos-v14`.
5. Prueba de aceptación en real (gerencia): LAU → «Cubetas» → un color en «En curso» → Guardar → la columna se tiñe y el
   anillo de Avance toma ese color; abrir una tarjeta → Editar → un color → Guardar → la tarjeta se tiñe; recargar y sigue.
   La cabecera ya no trae «← Proyectos» ni el «N/M hechas»; el diálogo de Cubetas cabe sin barras.

**Aceptada el 2026-09-12 (Carlos, «si funcionó»): esquema aplicado, push hecho y la prueba del paso 5 pasó en real.**

## Al publicar v0.11.0: primero el esquema, luego el push

**Hay cambio de esquema** y va ANTES del push, o la app en Pages no podrá guardar cubetas ni mover a una nueva:

1. **Subir Administración a rol `manage`** como en la tarea 4 de `docs/setup-carlos.md` (medido en v0.2.0 y v0.3.0:
   crear una columna o hacer PATCH a una choice exige `manage`; con `write` da 403).
2. `npm run serve:provisionar` → Revisar. Debe reportar dos cosas y nada más: `PROY_Proyectos` **FALTA la columna
   `Columnas`** (note) y `PROY_Tareas.Columna` **FALTA allowTextEntry=true**. → Aplicar. Es idempotente: una segunda
   Revisar dice «Todo coincide».
3. **Regresar Administración a `write`** (y revocar el consentimiento amplio, como en v0.3.0).
4. `git push` (lo hace Carlos); el service worker va en `minsa-proyectos-v13`.
5. Prueba de aceptación en real (gerencia): abrir la LAU → «Cubetas» → renombrar «En revisión» a otra cosa y agregar una
   → Guardar → el tablero pinta 5 columnas → mover una tarjeta a la nueva (si Graph contesta 400 «no es una opción», el
   paso 1 no aplicó el `allowTextEntry`). Luego moverla de vuelta, quitar la cubeta y comprobar que `Columnas` quedó vacía
   en la lista (Microsoft Lists → PROY_Proyectos).

**Aceptada el 2026-09-12 (Carlos, «listo, sí funcionó»): esquema aplicado, push hecho y la prueba del paso 5 pasó en real.** Sin probar: el celular real y un proyecto con 7-8 cubetas en pantalla de 1366 (la rejilla las reparte a 150 px y scrollea).

## Al publicar v0.4.1

Sin cambio de esquema. `git push` (lo hace Carlos); el service worker va en `minsa-proyectos-v5`. Prueba de
aceptación en real: Docs de la LAU → «Ligar archivo» → buscar `Estudio_mercado` → Ligar; debe aparecer con
ruta `98_Archivo/…` y abrir desde la liga. Con la consola abierta (F12): si sale «PROY_Ligas rechazó la Url
larga (N)» la causa era el largo y N dice cuánto medía el `webUrl` real. Si vuelve a dar 400 pese al reintento,
el aviso trae «largos: …» — pegar ese texto es el siguiente dato del diagnóstico. **Aceptada el 2026-09-12 (Carlos): la liga funcionó en real.** Sin probar: el celular real y las bibliotecas fuera del piloto.

## Al publicar v0.4.0

Sin cambio de esquema. `git push` (lo hace Carlos); el service worker va en `minsa-proyectos-v4`. Si v0.3.0
no se publicó antes, aplica primero su paso de esquema (abajo): sus dos opciones siguen haciendo falta.

## Al publicar v0.3.0: primero el esquema, luego el push

Dos columnas *choice* sin texto libre ganan una opción: `PROY_Ligas.Tipo` → `enlace` y
`PROY_Actividad.Accion` → `reabrir-proyecto`. Hasta que el tenant las tenga, **Pegar un enlace y
Reabrir contestan 400** («no es una opción de la columna …»); todo lo demás sigue igual. Orden (el
mismo que en v0.2.0, medido: **cambiar el esquema exige rol `manage`**, con `write` el PATCH da 403):

1. Desde `app/`: `node servidor-local.js ../herramientas-dev/provisionar.html` → **Revisar** debe
   listar «FALTAN opciones: enlace» en `PROY_Ligas.Tipo` y «reabrir-proyecto» en
   `PROY_Actividad.Accion` → **Crear lo que falta** (PATCH de opciones, idempotente; nunca quita las
   que ya están). Subir Administración a `manage` como en la tarea 4 de `docs/setup-carlos.md` y
   regresarla a `write` al terminar.
2. Vuelve a **Revisar**: «Todo coincide con esquema.json».
3. `git push` (lo hace Carlos). El service worker va en `minsa-proyectos-v3`: la PWA instalada se
   actualiza sola en la siguiente apertura.
4. **Primera escritura real** (mover una tarjeta): abrir la consola del navegador y confirmar que NO
   dice «Graph rechazó If-Match». Si lo dice, la app sigue funcionando pero sin la protección del 412:
   anotarlo aquí. **Hecho el 2026-09-12: limpio, y el 412 real da el toast** (arriba).

## Lo que la app NO protege

El rol de `PROY_Roles` no es un permiso: SharePoint decide quién escribe. Por eso las listas llevan
historial de versiones activado y `PROY_Roles` no hereda permisos (Miembros = lectura). Si un día
un rol debe ser inviolable, es permiso por lista en SharePoint, no código aquí.

## Licencias

MSAL.js (MIT, Microsoft). Fuentes Saira, Barlow e IBM Plex Mono (OFL) en `vendor/fuentes`.
