# MINSA Proyectos

PWA de proyectos multiusuario de MINSA ENERGY: cada **proyecto** es un frente con fin (una licencia,
un arranque de planta, un servicio), con su **tablero** de cuatro columnas, tareas asignadas a gente
de la casa, y **documentos** ligados a la biblioteca de la unidad. Diez cuentas ven lo mismo y
mueven sus tarjetas desde el celular; el estado vive en listas de SharePoint del sitio
Administración, no en la app.

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
tablero.js      tablero (pestañas de columna, Hecho colapsada), lista (orden), filtros, Mis tareas, tarjeta (mover/«→ siguiente»/subir-bajar/editar/borrar, creada por), 412
docs.js         Documentos: buscar, ligar, subir al buzón, pegar enlace, grupos y chips por tipo, «en el buzón» derivado en vivo
comun.js        estado, DOM sin innerHTML, avisos (toast con acción), confirmación, fechas (diaInput), PROY_Actividad
reglas.js       reglas puras (roles, PUEDE, avance, próximos, sin movimiento, clave, filtrar, ordenar lista, reordenar, url)
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
