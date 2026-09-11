# MINSA Proyectos

PWA de proyectos multiusuario de MINSA ENERGY: cada **proyecto** es un frente con fin (una licencia,
un arranque de planta, un servicio), con su **tablero** de cuatro columnas, tareas asignadas a gente
de la casa, y **documentos** ligados a la biblioteca de la unidad. Diez cuentas ven lo mismo y
mueven sus tarjetas desde el celular; el estado vive en listas de SharePoint del sitio
Administración, no en la app.

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

**v0.1.0 (2026-09-11): 107/107** — gerencia 51 · colaborador 43 · lectura 13. Cubre: clave
inválida y duplicada rechazadas; crear, asignar y mover por las 4 columnas (sello `HechoPor` al
entrar a hecho, limpio al salir); un renglón de actividad por acción; Mis tareas por correo;
Docs: buscar (excluye el buzón), ligar, subir (`_lote.json` al final), 404 del buzón = «ya lo
acomodó la skill», subida a medias borra la carpeta; 503 reintenta; 403 nombra el permiso;
biblioteca fuera del piloto nombra el sitio; lectura sin botones y `moverTarea` niega;
colaborador no borra ni cierra aunque se fuerce el botón; token caducado vuelve al login.
Sin probar todavía: login real, celular, y las bibliotecas fuera del piloto.

## Lo que la app NO protege

El rol de `PROY_Roles` no es un permiso: SharePoint decide quién escribe. Por eso las listas llevan
historial de versiones activado y `PROY_Roles` no hereda permisos (Miembros = lectura). Si un día
un rol debe ser inviolable, es permiso por lista en SharePoint, no código aquí.

## Licencias

MSAL.js (MIT, Microsoft). Fuentes Saira, Barlow e IBM Plex Mono (OFL) en `vendor/fuentes`.
