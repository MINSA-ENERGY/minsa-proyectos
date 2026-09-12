# MINSA Proyectos

PWA de proyectos multiusuario de MINSA ENERGY: cada **proyecto** es un frente con fin (una licencia,
un arranque de planta, un servicio), con su **tablero** de cuatro columnas, tareas asignadas a gente
de la casa, y **documentos** ligados a la biblioteca de la unidad. Diez cuentas ven lo mismo y
mueven sus tarjetas desde el celular; el estado vive en listas de SharePoint del sitio
Administración, no en la app.

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

## Archivos

```
index.html      un solo DOM para celular y escritorio (rail → pestañas abajo)
app.js          sesión, carga, Inicio, Proyectos, Proyecto, nuevo/editar/cerrar proyecto
tablero.js      tablero, lista, Mis tareas, tarjeta (mover/editar/borrar), nueva tarea
docs.js         Documentos: buscar, ligar, subir al buzón, «en el buzón» derivado en vivo
comun.js        estado, DOM sin innerHTML, avisos, confirmación, fechas, PROY_Actividad
reglas.js       reglas puras (roles, PUEDE, avance, próximos, sin movimiento, clave)
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

## Al publicar v0.2.0: primero el esquema, luego el push

`PROY_Actividad.Accion` es una columna *choice* sin texto libre: hasta que el tenant tenga
`desligar` y `comentar`, **Quitar liga, Buscar el archivado y Anotar contestan 400** («no es una
opción de la columna Accion»); todo lo demás sigue igual. Orden:

1. Desde `app/`: `node servidor-local.js ../herramientas-dev/provisionar.html` → **Revisar** debe
   listar «Agregando opciones a PROY_Actividad.Accion: desligar, comentar» → **Crear lo que falta**
   (es un PATCH de opciones, idempotente; nunca quita las que ya están). Si contesta 403 con rol
   `write`, subir Administración a `manage` como en la tarea 4 de `docs/setup-carlos.md` y regresarla.
2. Vuelve a **Revisar**: «Todo coincide con esquema.json».
3. `git push` (lo hace Carlos). El service worker ya va en `minsa-proyectos-v2`: la PWA instalada
   se actualiza sola en la siguiente apertura.

## Lo que la app NO protege

El rol de `PROY_Roles` no es un permiso: SharePoint decide quién escribe. Por eso las listas llevan
historial de versiones activado y `PROY_Roles` no hereda permisos (Miembros = lectura). Si un día
un rol debe ser inviolable, es permiso por lista en SharePoint, no código aquí.

## Licencias

MSAL.js (MIT, Microsoft). Fuentes Saira, Barlow e IBM Plex Mono (OFL) en `vendor/fuentes`.
