// Documentos de un proyecto (decision 4): LIGAS a archivos ya archivados en la biblioteca de la
// unidad (buscador Graph, solo lectura, excluye el buzon) + «Subir al buzon» 99_Pendiente-Archivar
// con `_lote.json` al final (lote.js). «En el buzon» se DERIVA en vivo: si la carpeta del lote ya
// no existe (404) es que la skill de archivar lo acomodo. Nada se escribe fuera del buzon.
//
// v0.2.0 (tanda 1 de la auditoria): una liga se QUITA y se cambia de tarjeta desde la app (F1);
// la liga cuyo lote ya acomodo la skill se REEMPLAZA buscando el archivado (F2); y ligar / subir
// se abren tambien desde la tarjeta, con esa tarjeta ya puesta (F3).
// v0.3.0 (tanda 2): el tercer tipo de liga es «enlace» (F4) — titulo + URL pegada, sin biblioteca:
// un correo, un oficio en Legal o Finanzas, una pagina. No toca permisos del tenant.
// v0.4.1: PROY_Ligas.Url y .Ruta son texto de UNA linea (255): el webUrl de Graph por un .docx con
// nombre de la convencion de la casa pasa de 255 y SharePoint contesta 400 «Invalid request» sin
// decir por que (2026-09-12, LAU). Al ligar se relee el elemento por id (ruta real + GUID), la URL se
// acorta con `urlParaLiga` y ningun texto sale hacia Graph sin pasar por `textosLargos`.

import { CONFIG } from './config.js';
import { PUEDE, tareasDe, slug, fechaMexico, nombreDe, validarUrl, urlParaLiga, urlCortaDeGuid, resumenLargos, textosLargos, TEXTO_MAX, hrefSeguro, filtrarLigas, tipoArchivo } from './reglas.js';
import { construirManifiesto, validarManifiesto, bytesDelManifiesto, nombreCarpetaLote, NOMBRE_MANIFIESTO } from './lote.js';
import { $, L, VERSION, estado, el, boton, chip, iconoArchivo, iconoSvg, avatar, avisar, abrirDialogo, cerrarDialogo, confirmar, opciones, limpiar, porId, registrarActividad, equipoDe, fechaCorta, fechaHora, aplicar, pedirRelectura, irAHash } from './comun.js';
import { esConflicto } from './graph.js';

let alCambiar = () => {};
export function alCambiarDocs(fn) { alCambiar = fn; }

/** Biblioteca de la unidad de un proyecto, o null si el equipo no tiene una en el piloto. */
export function bibliotecaDe(p) {
    const eq = equipoDe(p);
    const b = eq.unidad ? CONFIG.bibliotecas[eq.unidad] : null;
    return b ? { clave: eq.unidad, ...b } : null;
}

/** Resuelve (y cachea) el siteId de una biblioteca. `{ id, motivo }`; id null si 403/404. */
async function sitioDe(bib) {
    if (!estado.sitiosUnidad[bib.clave]) estado.sitiosUnidad[bib.clave] = await estado.cliente.sitioOpcional(CONFIG.sharepointHost, bib.sitio);
    return estado.sitiosUnidad[bib.clave];
}

/** Puede ligar/subir en este proyecto: rol, proyecto activo y biblioteca AUTORIZADA (piloto).
 *  A1 (2026-09-12): antes bastaba con que el equipo tuviera biblioteca, asi que sobre RABASA o
 *  PITEPEC los botones seguian vivos y la busqueda terminaba en un 403 con la ruta de un script
 *  que el colaborador no puede correr. El dato se sabe antes de abrir el dialogo. */
export function puedeLigarEn(p) { const b = bibliotecaDe(p); return PUEDE.ligar(estado.rol) && !!p && p.Estado === 'activo' && !!b && b.piloto !== false; }
/** Puede pegar un enlace (F4): rol y proyecto activo; la biblioteca no hace falta. */
export function puedeEnlazarEn(p) { return PUEDE.ligar(estado.rol) && !!p && p.Estado === 'activo'; }

// Con que proyecto / tarjeta se abrio el dialogo de ligar o subir (desde Docs o desde la tarjeta).
// `reemplaza` es la liga vieja que se quita al ligar el resultado (F2); `alTerminar` vuelve a la
// tarjeta si se abrio desde ahi.
let ctx = { proyecto: null, tareaId: null, reemplaza: null, alTerminar: null };

// ---------------------------------------------------------------- pintar

export async function pintarDocs(p) {
    const cont = $('docsLista'); cont.textContent = '';
    const bib = bibliotecaDe(p);
    const puede = puedeLigarEn(p);
    $('btnLigar').disabled = !puede; $('btnSubir').disabled = !puede; $('btnEnlace').disabled = !puedeEnlazarEn(p);
    // A1: si la biblioteca no esta autorizada, el boton apagado lo dice; «Pegar un enlace» sigue vivo.
    const porQue = bib && bib.piloto === false ? `Esta biblioteca (${bib.nombre}) aún no está autorizada; pídelo a gerencia. Mientras tanto: «Pegar un enlace».` : '';
    for (const id of ['btnLigar', 'btnSubir']) $(id).title = porQue;
    $('docsBiblioteca').textContent = bib
        ? (bib.piloto ? `Biblioteca: ${bib.nombre}` : `Biblioteca: ${bib.nombre} — aún sin autorizar. Se pueden pegar enlaces; ligar y subir se abren cuando gerencia otorgue el permiso.`)
        : 'Este equipo no tiene biblioteca ligada en el piloto: se ven las ligas guardadas y se pueden pegar enlaces.';
    const todas = estado.ligas.filter(l => Number(l.ProyectoId) === p.id);
    // U10: chips por tipo (solo si hay de mas de uno), grupos «Del proyecto» y por tarjeta, chip de estado junto al nombre.
    const fl = $('docsFiltro'); fl.textContent = '';
    const tipos = [...new Set(todas.map(l => l.Tipo))];
    if (tipos.length > 1) for (const [k, texto] of [[null, 'Todos'], ['archivado', 'archivado'], ['buzon', 'en el buzón'], ['enlace', 'enlace']]) {
        if (k && !tipos.includes(k)) continue;
        const b = boton(texto, estado.filtroDocs === k ? 'is-on' : '', () => { estado.filtroDocs = k; pintarDocs(p); }, { docs: k || 'todos' }); b.setAttribute('aria-pressed', estado.filtroDocs === k ? 'true' : 'false'); fl.appendChild(b);
    } else estado.filtroDocs = null;
    // v0.17.0: buscador propio de la pestaña (nombre, ruta o dirección, sin acentos) y el conteo «N de M».
    if ($('docsBusca').value !== (estado.buscaDocs || '')) $('docsBusca').value = estado.buscaDocs || '';
    $('docsBusca').hidden = todas.length < 2;
    const ligas = filtrarLigas(todas, { tipo: estado.filtroDocs, texto: estado.buscaDocs }).sort((a, b) => b.id - a.id);
    $('docsResumen').textContent = todas.length ? `${ligas.length} de ${todas.length}` : '';
    if (!ligas.length) { cont.appendChild(el('p', 'vacio', todas.length ? 'Nada con ese filtro.' : 'Sin documentos ligados todavía.')); return; }
    const puedeDe = l => puede || (l.Tipo === 'enlace' && puedeEnlazarEn(p));
    const tabla = tablaDocs(); const tb = tabla.querySelector('tbody');
    const delProyecto = ligas.filter(l => !l.TareaId);
    if (delProyecto.length) { tb.appendChild(filaGrupo(null, 'Del proyecto', delProyecto.length)); for (const l of delProyecto) tb.appendChild(filaDoc(l, { p, puede: puedeDe(l) })); }
    const porTarjeta = new Map();
    for (const l of ligas.filter(l => l.TareaId)) { const k = Number(l.TareaId); if (!porTarjeta.has(k)) porTarjeta.set(k, []); porTarjeta.get(k).push(l); }
    const tarjetas = [...porTarjeta.keys()].sort((a, b) => { const ta = porId(estado.tareas, a), tb2 = porId(estado.tareas, b); return String(ta ? ta.Title : '').localeCompare(String(tb2 ? tb2.Title : '')) || a - b; });
    for (const k of tarjetas) { const tt = porId(estado.tareas, k); tb.appendChild(filaGrupo(k, tt ? tt.Title : `Tarjeta #${k}`, porTarjeta.get(k).length)); for (const l of porTarjeta.get(k)) tb.appendChild(filaDoc(l, { p, puede: puedeDe(l) })); }
    cont.appendChild(tabla);
    // «En el buzon» en vivo: una consulta por liga de tipo buzon, cacheada por carga.
    if (bib) {
        const s = await sitioDe(bib);
        if (s.id) for (const l of ligas.filter(x => x.Tipo === 'buzon' && x.Ruta)) {
            if (estado.buzonExiste[l.Ruta] === undefined) {
                try { estado.buzonExiste[l.Ruta] = await estado.cliente.existeRuta(s.id, l.Ruta); } catch (_) { continue; }
            }
            const n = cont.querySelector(`[data-liga="${l.id}"] .estado`);
            if (n && estado.buzonExiste[l.Ruta] === false) {
                n.textContent = ''; n.appendChild(chip('ya lo acomodó la skill', 'ok'));
                // F2: buscar el archivado y reemplazar la liga en una sola operacion.
                if (puede) n.appendChild(boton('Buscar el archivado', 'mn-btn is-sm', () => abrirLigar({ proyecto: p, tareaId: l.TareaId, texto: l.Title, reemplaza: l }), { buscar: String(l.id) }));
                else n.appendChild(el('span', 'p', 'busca y reemplaza la liga'));
            }
        }
    }
}

// ---------------------------------------------------------------- v0.17.0: la tabla de documentos (Docs del proyecto y #archivos)
// Carlos (13-sep) pidio que la seccion de archivos se viera como «My Documents» de la captura de referencia: UNA tabla
// con columnas (Nombre · Tipo · Estado · Tarjeta · Ligado por · Fecha · acciones «⋯»), buscador y conteo. La agrupacion
// de v0.16.0 (pestaña que sobresale, opcion C) sobrevive como RENGLON de grupo dentro de la tabla, con la misma lengüeta.
// Sin columna «Tamaño»: PROY_Ligas no lo guarda (la busqueda de Graph si lo trae, pero no se persiste). En celular la
// tabla se apila en fichas por CSS (.dtabla), sin segunda estructura.
const TRAZOS_TARJETA = ['M4 5h16v14H4z', 'M4 10h16', 'M9 5v14'];
const TRAZOS_PROYECTO = ['M3 7h7l2 2h9v10H3z'];
export const COLUMNAS_DOCS = [['c-nombre', 'Nombre'], ['c-tipo', 'Tipo'], ['c-estado', 'Estado'], ['c-tarjeta', 'Tarjeta'], ['c-quien', 'Ligado por'], ['c-fecha', 'Fecha'], ['c-acc', '']];

/** La tabla vacia con su encabezado; el que pinta le llena el <tbody>. */
export function tablaDocs() {
    const w = el('div', 'dtabla'); const t = el('table'); const th = el('thead'); const tr = el('tr');
    for (const [cls, texto] of COLUMNAS_DOCS) { const h = el('th', cls, texto); h.scope = 'col'; if (!texto) h.setAttribute('aria-label', 'Acciones'); tr.appendChild(h); }
    th.appendChild(tr); t.appendChild(th); t.appendChild(el('tbody')); w.appendChild(t);
    return w;
}

/**
 * Renglon de grupo: la lengüeta de v0.16.0 (icono + `.grupo` con el titulo + conteo) sobre un <tr class="pest">.
 * Con `icono` (un nodo) y `alClic` es la cabecera de un PROYECTO en #archivos: la lengüeta es un boton .grupo-proy.
 */
export function filaGrupo(tareaId, titulo, n, { icono = null, alClic = null, title = '' } = {}) {
    const tr = el('tr', 'pest' + (tareaId ? '' : ' is-proyecto')); if (tareaId) tr.dataset.tarjeta = String(tareaId);
    const td = el('td'); td.colSpan = COLUMNAS_DOCS.length;
    const cab = alClic ? el('button', 'cab grupo-proy') : el('div', 'cab'); if (alClic) { cab.type = 'button'; cab.addEventListener('click', alClic); if (title) cab.title = title; }
    cab.appendChild(icono || iconoSvg(tareaId ? TRAZOS_TARJETA : TRAZOS_PROYECTO));
    cab.appendChild(el('span', 'grupo', titulo)); cab.appendChild(el('span', 'n', String(n)));
    td.appendChild(cab); tr.appendChild(td);
    return tr;
}

/**
 * Renglon de un documento. `puede` habilita el select de tarjeta y «Quitar» (Docs del proyecto); `enArchivos`
 * pinta la tarjeta como boton que la abre y marca el renglon con data-archivo (la E2E de #archivos lo cuenta).
 */
export function filaDoc(l, { p = null, puede = false, enArchivos = false, alTarjeta = null } = {}) {
    const tr = el('tr', 'doc'); tr.dataset.liga = String(l.id); if (enArchivos) tr.dataset.archivo = String(l.id);
    // Nombre: icono + titulo (liga) + ruta o direccion.
    const tdN = el('td', 'c-nombre'); const caja = el('div', 'nombre');
    caja.appendChild(iconoArchivo(l.Ruta || l.Title, l.Tipo));
    const c = el('div', 'cuerpo'); const t = el('div', 't');
    const href = hrefSeguro(l.Url);   // v0.13.1: solo http(s) llega al href, venga de donde venga la Url
    if (href) { const a = el('a', '', l.Title); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.title = l.Title; t.appendChild(a); } else t.appendChild(el('span', '', l.Title));
    c.appendChild(t);
    const sub = l.Tipo === 'enlace' ? String(l.Url || '').replace(/^https?:\/\//, '').slice(0, 90) : `${l.Unidad ? l.Unidad + '/' : ''}${l.Ruta || ''}`;
    const ps = el('div', 'p', sub); ps.title = sub; c.appendChild(ps);
    caja.appendChild(c); tdN.appendChild(caja); tr.appendChild(tdN);
    // Tipo de archivo (PDF, Word, Excel, Lote, Enlace…): la misma clave que colorea el icono.
    const ta = tipoArchivo(l.Ruta || l.Title, l.Tipo);
    const tdT = el('td', 'c-tipo'); const bt = el('span', 'mn-chip tipo is-' + ta.clave, ta.clave === 'lote' ? 'Lote' : ta.clave === 'archivo' ? ta.etiqueta.replace('Archivo ', '') : ta.etiqueta); bt.dataset.tipo = ta.clave; tdT.appendChild(bt); tr.appendChild(tdT);
    // Estado de la liga (archivado / en el buzon / enlace); el 404 del buzon lo reemplaza pintarDocs.
    const tdE = el('td', 'c-estado'); const est = el('span', 'estado'); est.appendChild(l.Tipo === 'buzon' ? chip('en el buzón', 'info') : l.Tipo === 'enlace' ? chip('enlace') : chip('archivado', 'ok')); tdE.appendChild(est); tr.appendChild(tdE);
    // Tarjeta: select (F1) si puede; boton que la abre en #archivos; texto en lectura.
    const tdC = el('td', 'c-tarjeta');
    const tt = l.TareaId ? porId(estado.tareas, l.TareaId) : null;
    if (puede && p) {
        const sel = el('select'); sel.dataset.tarjetaDe = String(l.id); sel.setAttribute('aria-label', 'Tarjeta de la liga');
        opcionesTarjetas(sel, p); sel.value = l.TareaId ? String(l.TareaId) : '';
        sel.addEventListener('change', () => reasignarLiga(l, sel.value)); tdC.appendChild(sel);
    } else if (l.TareaId && enArchivos) { tdC.appendChild(boton(tt ? tt.Title : `tarjeta #${l.TareaId}`, 'tarjeta-liga', tt && alTarjeta ? () => alTarjeta(tt) : null)); }
    else tdC.appendChild(el('span', l.TareaId ? '' : 'p', tt ? tt.Title : l.TareaId ? `tarjeta #${l.TareaId}` : 'el proyecto entero'));
    tr.appendChild(tdC);
    // Quien y cuando.
    const tdQ = el('td', 'c-quien'); if (l.LigadoPor) { const q = el('span', 'quien'); q.appendChild(avatar(l.LigadoPor)); q.appendChild(el('span', '', nombreDe(l.LigadoPor, estado.roles))); tdQ.appendChild(q); } else tdQ.appendChild(el('span', 'p', '—')); tr.appendChild(tdQ);
    const tdF = el('td', 'c-fecha'); const f = el('span', '', fechaCorta(l._creado)); if (l._creado) f.title = fechaHora(l._creado); tdF.appendChild(f); tr.appendChild(tdF);
    // Acciones «⋯»: Abrir · Quitar (si puede) · Documentos del proyecto (en #archivos).
    const tdA = el('td', 'c-acc');
    const acciones = [];
    if (href) { const a = el('a', 'mn-btn is-ghost is-sm', 'Abrir'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; acciones.push(a); }
    if (enArchivos && p) acciones.push(boton('Documentos del proyecto', 'mn-btn is-ghost is-sm', () => irAHash(`#p/${p.Clave}/docs`)));
    if (puede) acciones.push(boton('Quitar', 'mn-btn is-ghost is-sm is-peligro', () => quitarLiga(porId(estado.ligas, l.id) || l), { quitar: String(l.id) }));
    if (acciones.length) {
        const d = el('details', 'fila-menu'); const s = el('summary', 'mn-btn is-ghost is-sm is-icono', '⋯'); s.setAttribute('aria-label', 'Acciones del documento'); s.title = 'Acciones'; d.appendChild(s);
        const m = el('div', 'menu'); for (const a of acciones) m.appendChild(a); d.appendChild(m); tdA.appendChild(d);
        d.addEventListener('toggle', () => { if (d.open) for (const o of document.querySelectorAll('.fila-menu[open]')) if (o !== d) o.open = false; });
    }
    tr.appendChild(tdA);
    return tr;
}

// ---------------------------------------------------------------- quitar / cambiar de tarjeta (F1)

/**
 * Quita una liga: borra su renglon de PROY_Ligas y deja «desligó» en la bitacora. El archivo no se
 * toca. Quien liga, desliga (PUEDE.ligar). Con `reemplazadaPor` (F2) no pregunta: es la segunda
 * mitad de «ligar el archivado».
 */
export async function quitarLiga(l, reemplazadaPor = null) {
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes quitar ligas.', 'error'); return false; }
    if (!reemplazadaPor) {
        const { ok } = await confirmar({ titulo: 'Quitar la liga', ok: 'Quitar', texto: `«${l.Title}» deja de estar ligado a este proyecto. El archivo no se toca: sigue en la biblioteca${l.Tipo === 'buzon' ? ' (o donde lo haya acomodado la skill)' : ''}.` });
        if (!ok) return false;
    }
    try {
        await estado.cliente.borrarRenglon(estado.siteId, L.ligas, l.id, m => avisar(m, 'ojo'));
        estado.ligas = estado.ligas.filter(x => x.id !== l.id);
        if (!reemplazadaPor) avisar(`Liga «${l.Title}» quitada.`, 'ok');
        alCambiar();
        await registrarActividad('desligar', reemplazadaPor ? `reemplazó la liga «${l.Title.slice(0, 60)}» por «${reemplazadaPor.slice(0, 60)}»` : `desligó «${l.Title.slice(0, 80)}»`, l.ProyectoId, l.TareaId);
        alCambiar();
        return true;
    } catch (e) { avisar('No se pudo quitar la liga: ' + (e && e.message ? e.message : e), 'error'); return false; }
}

/** Cambia la tarjeta de una liga; vacio = del proyecto entero. */
async function reasignarLiga(liga, tareaId) {
    const l = porId(estado.ligas, liga.id) || liga;   // resolver por id AL CLIC: un refresco reemplaza los objetos de estado
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes cambiar ligas.', 'error'); return; }
    const nuevo = tareaId ? Number(tareaId) : null;
    if ((l.TareaId ? Number(l.TareaId) : null) === nuevo) return;
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.ligas, l.id, { TareaId: nuevo }, m => avisar(m, 'ojo'), l._etag);
        aplicar(l, { TareaId: nuevo });
        const t = nuevo ? porId(estado.tareas, nuevo) : null;
        avisar(t ? `«${l.Title}» ahora es de la tarjeta «${t.Title}».` : `«${l.Title}» ahora es del proyecto entero.`, 'ok');
        alCambiar();
        await registrarActividad('ligar', t ? `pasó la liga «${l.Title.slice(0, 60)}» a «${t.Title.slice(0, 60)}»` : `dejó la liga «${l.Title.slice(0, 60)}» para el proyecto entero`, l.ProyectoId, nuevo);
        alCambiar();
    } catch (e) {
        if (esConflicto(e)) { avisar('Alguien cambió esa liga hace un momento: se releyó.', 'ojo'); await pedirRelectura(); return; }
        avisar('No se pudo cambiar la tarjeta de la liga: ' + (e && e.message ? e.message : e), 'error'); alCambiar();
    }
}

// ---------------------------------------------------------------- ligar

function opcionesTarjetas(sel, p) {
    opciones(sel, tareasDe(p, estado.tareas), t => t.id, t => t.Title.slice(0, 70), 'el proyecto entero');
}

/**
 * Abre «Ligar archivo». Sin argumentos es el boton de Docs (proyecto abierto). Desde la tarjeta
 * (F3) llega { proyecto, tareaId, alTerminar }; desde «Buscar el archivado» (F2) llega ademas
 * { texto, reemplaza }.
 */
export function abrirLigar(opts = {}) {
    const p = opts.proyecto || estado.proyectoAbierto; const bib = p && bibliotecaDe(p);
    if (!p || !bib) return;
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes ligar documentos.', 'error'); return; }
    ctx = { proyecto: p, tareaId: opts.tareaId ? Number(opts.tareaId) : null, reemplaza: opts.reemplaza || null, alTerminar: opts.alTerminar || null };
    $('lgBiblioteca').textContent = `Busca en ${bib.nombre} (solo lectura; el buzón no aparece).`;
    $('lgNota').textContent = ctx.reemplaza ? `Al ligar el resultado se quita la liga vieja «${ctx.reemplaza.Title}».` : '';
    $('lgNota').classList.toggle('oculto', !ctx.reemplaza);
    $('lgTexto').value = opts.texto || ''; $('lgResultados').textContent = '';
    opcionesTarjetas($('lgTarea'), p);
    $('lgTarea').value = ctx.tareaId ? String(ctx.tareaId) : '';
    abrirDialogo('dlgLigar');
    if ($('lgTexto').value) buscarDocumento(); else $('lgTexto').focus();
}

async function buscarDocumento() {
    const p = ctx.proyecto; const bib = bibliotecaDe(p);
    const texto = $('lgTexto').value.trim();
    const cont = $('lgResultados'); cont.textContent = '';
    if (texto.length < 2) { avisar('Escribe al menos dos letras.', 'ojo'); return; }
    $('lgBuscar').disabled = true;
    try {
        const s = await sitioDe(bib);
        // A1: la ruta del script solo le sirve a gerencia; a los demas les toca pedirlo, no correrlo.
        if (!s.id) {
            avisar(PUEDE.proyecto(estado.rol)
                ? `Sin acceso a ${bib.nombre}: ${s.motivo}. En el piloto solo está autorizada Ambiental-CALYTEK; para las demás hay que otorgar el permiso (docs/otorgar-permiso-sitio.ps1).`
                : `Todavía no hay permiso sobre ${bib.nombre}. Pídelo a gerencia; mientras tanto puedes pegar un enlace.`, 'error');
            return;
        }
        const r = await estado.cliente.buscarEnDrive(s.id, texto, CONFIG.buzon, m => avisar(m, 'ojo'));
        if (!r.length) { cont.appendChild(el('p', 'vacio', 'Nada con ese nombre fuera del buzón.')); return; }
        for (const x of r.slice(0, 30)) {
            const fila = el('div', 'lg-resultado');
            fila.appendChild(iconoArchivo(x.nombre, null, 'sm'));   // v0.8.0
            const izq = el('div'); izq.appendChild(el('div', '', x.nombre)); izq.appendChild(el('div', 'p', `${x.rutaConocida === false ? '(carpeta: se resuelve al ligar)' : x.ruta} · ${fechaHora(x.modificado)}`));
            fila.appendChild(izq);
            fila.appendChild(boton('Ligar', 'mn-btn is-sm', () => ligarDocumento(x)));
            cont.appendChild(fila);
        }
    } catch (e) { avisar('No se pudo buscar: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('lgBuscar').disabled = false; }
}

async function ligarDocumento(x) {
    const p = ctx.proyecto; const bib = bibliotecaDe(p);
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes ligar documentos.', 'error'); return; }
    if (estado.ligas.some(l => Number(l.ProyectoId) === p.id && l.DriveItemId === x.id)) { avisar('Ese archivo ya está ligado a este proyecto.', 'ojo'); return; }
    const tareaId = $('lgTarea').value ? Number($('lgTarea').value) : undefined;
    try {
        // La busqueda no garantiza la carpeta ni trae el GUID: se relee el elemento por id. Un 404 es
        // que ya no esta (se movio o borro desde que se busco); otro fallo liga con lo que trajo la
        // busqueda (peor ruta, misma liga).
        let item = x;
        try { const s = await sitioDe(bib); if (s.id) item = { ...x, ...(await estado.cliente.itemDeDrive(s.id, x.id, m => avisar(m, 'ojo'))) }; }
        catch (e) {
            if (e && e.status === 404) { avisar(`«${x.nombre}» ya no está donde la búsqueda lo vio (lo movieron o borraron); vuelve a buscar.`, 'error'); return; }
            console.warn('itemDeDrive:', e && e.message ? e.message : e);
        }
        // Con la carpeta real ya se sabe si es del buzon, que la busqueda solo excluye cuando Graph manda la ruta.
        if (item.ruta === CONFIG.buzon || String(item.ruta || '').startsWith(CONFIG.buzon + '/')) { avisar(`«${item.nombre}» está en el buzón ${CONFIG.buzon}: todavía no está archivado. Cuando la skill lo acomode vuelve a ligarlo; si es tuyo, súbelo como lote desde «Subir al buzón».`, 'ojo'); return; }
        const sitioUrl = `https://${CONFIG.sharepointHost}${bib.sitio}`;
        const corta = urlCortaDeGuid(sitioUrl, item.guid);
        const url = urlParaLiga(item.url, { sitioUrl, guid: item.guid });
        if (!url) { avisar(`No se pudo ligar: la liga web de «${item.nombre}» mide ${String(item.url || '').length} caracteres y no cabe en los ${TEXTO_MAX} de la lista; renómbralo más corto o pega un enlace.`, 'error'); return; }
        const campos = limpiar({ Title: item.nombre, ProyectoId: p.id, TareaId: tareaId, Tipo: 'archivado', Unidad: bib.clave, Ruta: item.ruta, Url: url, DriveItemId: item.id, LigadoPor: estado.cuenta.username });
        const largos = textosLargos(campos);
        if (largos.length) { avisar(`No se pudo ligar: ${largos.join(', ')} pasa(n) de los ${TEXTO_MAX} caracteres que admite una columna de texto de SharePoint.`, 'error'); return; }
        let n;
        try { n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => avisar(m, 'ojo')); }
        catch (e) {
            // El 400 de SharePoint no dice cual campo. Si la Url iba en la forma larga de Graph y hay
            // forma corta, se reintenta UNA vez con ella (un 400 no escribe nada); si tambien falla,
            // el aviso lleva el largo de cada texto para que el siguiente diagnostico tenga datos.
            if (!(e && e.status === 400)) throw e;
            if (!corta || campos.Url === corta) throw new Error(`${e.message} · largos: ${resumenLargos(campos)}`);
            console.warn(`PROY_Ligas rechazó la Url larga (${campos.Url.length}); se reintenta con la corta (${corta.length}).`);
            campos.Url = corta;
            try { n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => avisar(m, 'ojo')); }
            catch (e2) { throw (e2 && e2.status === 400) ? new Error(`${e2.message} · largos: ${resumenLargos(campos)} (ya reintentado con la Url corta)`) : e2; }
        }
        estado.ligas.push(n);
        const vieja = ctx.reemplaza; const alTerminar = ctx.alTerminar;
        cerrarDialogo('dlgLigar');
        avisar(vieja ? `«${item.nombre}» ligado en lugar de «${vieja.Title}».` : `«${item.nombre}» ligado.`, 'ok');
        alCambiar();
        await registrarActividad('ligar', `ligó «${item.nombre.slice(0, 80)}»`, p.id, tareaId);
        if (vieja) await quitarLiga(vieja, item.nombre);   // F2: la vieja se va en la misma operacion, sin preguntar
        alCambiar();
        if (alTerminar) alTerminar();
    } catch (e) { avisar('No se pudo ligar: ' + (e && e.message ? e.message : e), 'error'); }
}

// ---------------------------------------------------------------- pegar un enlace (F4)

/** Abre «Pegar un enlace». Sin argumentos es el boton de Docs; desde la tarjeta llega { proyecto, tareaId, alTerminar }. */
export function abrirEnlace(opts = {}) {
    const p = opts.proyecto || estado.proyectoAbierto; if (!p) return;
    if (!puedeEnlazarEn(p)) { avisar(PUEDE.ligar(estado.rol) ? 'El proyecto está cerrado.' : 'Tu rol es de lectura: no puedes pegar enlaces.', 'error'); return; }
    ctx = { proyecto: p, tareaId: opts.tareaId ? Number(opts.tareaId) : null, reemplaza: null, alTerminar: opts.alTerminar || null };
    $('enTitulo').value = ''; $('enUrl').value = '';
    opcionesTarjetas($('enTarea'), p);
    $('enTarea').value = ctx.tareaId ? String(ctx.tareaId) : '';
    abrirDialogo('dlgEnlace');
    $('enTitulo').focus();
}

async function guardarEnlace(ev) {
    ev.preventDefault();
    const p = ctx.proyecto; if (!p) return;
    if (!puedeEnlazarEn(p)) { avisar('Tu rol es de lectura: no puedes pegar enlaces.', 'error'); return; }
    const titulo = $('enTitulo').value.trim();
    if (!titulo) { avisar('Di qué es el enlace.', 'error'); $('enTitulo').focus(); return; }
    const v = validarUrl($('enUrl').value);
    if (!v.ok) { avisar('Enlace: ' + v.motivo, 'error'); $('enUrl').focus(); return; }
    if (estado.ligas.some(l => Number(l.ProyectoId) === p.id && l.Tipo === 'enlace' && l.Url === v.url)) { avisar('Ese enlace ya está en este proyecto.', 'ojo'); return; }
    const tareaId = $('enTarea').value ? Number($('enTarea').value) : undefined;
    const campos = limpiar({ Title: titulo, ProyectoId: p.id, TareaId: tareaId, Tipo: 'enlace', Url: v.url, LigadoPor: estado.cuenta.username });
    const largos = textosLargos(campos);
    if (largos.length) { avisar(`Enlace: ${largos.join(', ')} pasa(n) de los ${TEXTO_MAX} caracteres que admite la lista; acórtalo (un enlace de SharePoint se acorta con «Copiar vínculo»).`, 'error'); $('enUrl').focus(); return; }
    $('enGuardar').disabled = true;
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => avisar(m, 'ojo'));
        estado.ligas.push(n);
        const alTerminar = ctx.alTerminar;
        cerrarDialogo('dlgEnlace');
        avisar(`Enlace «${titulo}» guardado.`, 'ok');
        alCambiar();
        await registrarActividad('ligar', `pegó el enlace «${titulo.slice(0, 80)}»`, p.id, tareaId);
        alCambiar();
        if (alTerminar) alTerminar();
    } catch (e) { avisar('No se pudo guardar el enlace: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('enGuardar').disabled = false; }
}

// ---------------------------------------------------------------- subir al buzon

/** Abre «Subir al buzon». Sin argumentos es el boton de Docs; desde la tarjeta (F3) llega { proyecto, tareaId, alTerminar }. */
export function abrirSubir(opts = {}) {
    const p = opts.proyecto || estado.proyectoAbierto; const bib = p && bibliotecaDe(p);
    if (!p || !bib) return;
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes subir documentos.', 'error'); return; }
    ctx = { proyecto: p, tareaId: opts.tareaId ? Number(opts.tareaId) : null, reemplaza: null, alTerminar: opts.alTerminar || null };
    $('sbBiblioteca').textContent = `Va a ${bib.nombre}/${CONFIG.buzon}/.`;
    $('sbConcepto').value = ''; $('sbArchivos').value = ''; $('sbProgreso').textContent = '';
    opcionesTarjetas($('sbTarea'), p);
    $('sbTarea').value = ctx.tareaId ? String(ctx.tareaId) : '';
    abrirDialogo('dlgSubir');
    $('sbConcepto').focus();
}

/**
 * Sube carpeta -> piezas -> `_lote.json` AL FINAL (igual que captura): el manifiesto es la prueba
 * de que el lote llego completo. Si algo falla a medias, se borra la carpeta y se avisa.
 */
async function subirAlBuzon(ev) {
    ev.preventDefault();
    const p = ctx.proyecto; const bib = bibliotecaDe(p);
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes subir documentos.', 'error'); return; }
    const concepto = $('sbConcepto').value.trim();
    const archivos = [...$('sbArchivos').files];
    if (!concepto) { avisar('Di qué es lo que subes.', 'error'); $('sbConcepto').focus(); return; }
    if (!archivos.length) { avisar('Elige al menos un archivo.', 'error'); return; }
    if (archivos.some(a => a.name === NOMBRE_MANIFIESTO)) { avisar(`Un archivo no se puede llamar ${NOMBRE_MANIFIESTO}.`, 'error'); return; }
    // v0.13.1 (auditoria de seguridad): el nombre va en la RUTA de Graph; nada que suba de carpeta ni cambie de carpeta.
    const raro = archivos.find(a => !a.name || a.name === '.' || a.name === '..' || /[\\/]/.test(a.name));
    if (raro) { avisar(`El nombre «${raro.name}» no es válido para subirlo.`, 'error'); return; }
    const tareaId = $('sbTarea').value ? Number($('sbTarea').value) : undefined;
    const fecha = fechaMexico();
    const nombreCarpeta = nombreCarpetaLote(fecha, CONFIG.etiquetaLote, p.Clave, slug(concepto));
    // Destino que la app PROPONE en el _lote.json: la Carpeta declarada en el proyecto, o el default de
    // la biblioteca. La skill de archivar lo valida contra la biblioteca real y Carlos da el OK.
    const destino = String(p.Carpeta || bib.destinoLotes || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const manifiesto = construirManifiesto({ appVersion: VERSION, unidad: bib.clave, etiqueta: CONFIG.etiquetaLote, destino, fecha, concepto, archivos: archivos.map(a => a.name), proyecto: p.Clave, tarea: tareaId });
    const v = validarManifiesto(manifiesto);
    if (!v.ok) { avisar('El lote no es válido: ' + v.motivo, 'error'); return; }
    const largos0 = textosLargos({ Title: concepto, Ruta: `${CONFIG.buzon}/${nombreCarpeta}` });
    if (largos0.length) { avisar(`No se pudo subir: ${largos0.join(', ')} pasa(n) de los ${TEXTO_MAX} caracteres que admite la lista; acorta el concepto.`, 'error'); return; }
    const prog = t => { $('sbProgreso').textContent = t; };
    $('sbGuardar').disabled = true;
    let carpeta = null; let s = null;
    try {
        s = await sitioDe(bib);
        if (!s.id) throw new Error(`sin acceso a ${bib.nombre}: ${s.motivo}`);
        prog('Creando la carpeta del lote…');
        carpeta = await estado.cliente.crearCarpeta(s.id, CONFIG.buzon, nombreCarpeta, m => prog(m));
        const ruta = `${CONFIG.buzon}/${carpeta.nombreReal}`;
        for (const [i, a] of archivos.entries()) {
            prog(`Subiendo ${i + 1} de ${archivos.length}: ${a.name}`);
            await estado.cliente.subirPieza(s.id, ruta, a.name, await a.arrayBuffer(), a.type || 'application/octet-stream', m => prog(m));
        }
        prog('Cerrando el lote…');
        await estado.cliente.subirPieza(s.id, ruta, NOMBRE_MANIFIESTO, bytesDelManifiesto(manifiesto), 'application/json', m => prog(m));
        const campos = limpiar({ Title: concepto, ProyectoId: p.id, TareaId: tareaId, Tipo: 'buzon', Unidad: bib.clave, Ruta: ruta, DriveItemId: carpeta.id, LigadoPor: estado.cuenta.username });
        const largos = textosLargos(campos);
        if (largos.length) throw new Error(`${largos.join(', ')} pasa(n) de los ${TEXTO_MAX} caracteres que admite la lista`);
        const n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => prog(m));
        estado.ligas.push(n); estado.buzonExiste[ruta] = true;
        const alTerminar = ctx.alTerminar;
        cerrarDialogo('dlgSubir');
        avisar(`Lote «${concepto}» en el buzón de ${bib.nombre} (${archivos.length} archivo(s)).`, 'ok');
        alCambiar();
        await registrarActividad('subir', `subió «${concepto.slice(0, 80)}» al buzón (${archivos.length} archivo(s))`, p.id, tareaId);
        alCambiar();
        if (alTerminar) alTerminar();
    } catch (e) {
        if (carpeta && s && s.id) { try { await estado.cliente.borrarItemDrive(s.id, carpeta.id); prog('Lote a medias borrado.'); } catch (_) { prog('Quedó una carpeta a medias en el buzón; la skill la trata como lote incompleto.'); } }
        avisar('No se pudo subir: ' + (e && e.message ? e.message : e), 'error');
    } finally { $('sbGuardar').disabled = false; }
}

// ---------------------------------------------------------------- enganche

export function engancharDocs() {
    $('btnLigar').addEventListener('click', () => abrirLigar());
    $('lgCerrar').addEventListener('click', () => cerrarDialogo('dlgLigar'));
    $('lgBuscar').addEventListener('click', buscarDocumento);
    $('lgTexto').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarDocumento(); } });
    $('btnSubir').addEventListener('click', () => abrirSubir());
    $('sbCancelar').addEventListener('click', () => cerrarDialogo('dlgSubir'));
    $('formSubir').addEventListener('submit', subirAlBuzon);
    $('btnEnlace').addEventListener('click', () => abrirEnlace());
    // v0.17.0: buscador de la pestaña; el proyecto abierto se repinta al teclear.
    $('docsBusca').addEventListener('input', () => { estado.buscaDocs = $('docsBusca').value; if (estado.proyectoAbierto) pintarDocs(estado.proyectoAbierto); });
    // Un clic fuera cierra el menu «⋯» abierto.
    document.addEventListener('click', e => { for (const o of document.querySelectorAll('.fila-menu[open]')) if (!o.contains(e.target)) o.open = false; });
    $('enCancelar').addEventListener('click', () => cerrarDialogo('dlgEnlace'));
    $('formEnlace').addEventListener('submit', guardarEnlace);
}
