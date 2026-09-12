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

import { CONFIG } from './config.js';
import { PUEDE, tareasDe, slug, fechaMexico, nombreDe, validarUrl } from './reglas.js';
import { construirManifiesto, validarManifiesto, bytesDelManifiesto, nombreCarpetaLote, NOMBRE_MANIFIESTO } from './lote.js';
import { $, L, VERSION, estado, el, boton, chip, avisar, abrirDialogo, cerrarDialogo, confirmar, opciones, limpiar, porId, registrarActividad, equipoDe, fechaHora, aplicar, pedirRelectura } from './comun.js';
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

/** Puede ligar/subir en este proyecto: rol, proyecto activo y biblioteca en el piloto. */
export function puedeLigarEn(p) { return PUEDE.ligar(estado.rol) && !!p && p.Estado === 'activo' && !!bibliotecaDe(p); }
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
    $('docsBiblioteca').textContent = bib ? `Biblioteca: ${bib.nombre}${bib.piloto ? '' : ' (fuera del piloto: sin permiso todavía)'}` : 'Este equipo no tiene biblioteca ligada en el piloto: se ven las ligas guardadas y se pueden pegar enlaces.';
    const todas = estado.ligas.filter(l => Number(l.ProyectoId) === p.id);
    // U10: chips por tipo (solo si hay de mas de uno), grupos «Del proyecto» y por tarjeta, chip de estado junto al nombre.
    const fl = $('docsFiltro'); fl.textContent = '';
    const tipos = [...new Set(todas.map(l => l.Tipo))];
    if (tipos.length > 1) for (const [k, texto] of [[null, 'Todos'], ['archivado', 'archivado'], ['buzon', 'en el buzón'], ['enlace', 'enlace']]) {
        if (k && !tipos.includes(k)) continue;
        const b = boton(texto, estado.filtroDocs === k ? 'is-on' : '', () => { estado.filtroDocs = k; pintarDocs(p); }, { docs: k || 'todos' }); b.setAttribute('aria-pressed', estado.filtroDocs === k ? 'true' : 'false'); fl.appendChild(b);
    } else estado.filtroDocs = null;
    const ligas = todas.filter(l => !estado.filtroDocs || l.Tipo === estado.filtroDocs).sort((a, b) => b.id - a.id);
    if (!ligas.length) { cont.appendChild(el('p', 'vacio', todas.length ? 'Nada con ese filtro.' : 'Sin documentos ligados todavía.')); return; }
    const puedeDe = l => puede || (l.Tipo === 'enlace' && puedeEnlazarEn(p));
    const delProyecto = ligas.filter(l => !l.TareaId);
    if (delProyecto.length) { cont.appendChild(el('div', 'grupo', 'Del proyecto')); for (const l of delProyecto) cont.appendChild(doc(l, p, puedeDe(l))); }
    const porTarjeta = new Map();
    for (const l of ligas.filter(l => l.TareaId)) { const k = Number(l.TareaId); if (!porTarjeta.has(k)) porTarjeta.set(k, []); porTarjeta.get(k).push(l); }
    const tarjetas = [...porTarjeta.keys()].sort((a, b) => { const ta = porId(estado.tareas, a), tb = porId(estado.tareas, b); return String(ta ? ta.Title : '').localeCompare(String(tb ? tb.Title : '')) || a - b; });
    for (const k of tarjetas) { const tt = porId(estado.tareas, k); cont.appendChild(el('div', 'grupo', tt ? `Tarjeta · ${tt.Title}` : `Tarjeta #${k}`)); for (const l of porTarjeta.get(k)) cont.appendChild(doc(l, p, puedeDe(l))); }
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

function doc(l, p, puede) {
    const d = el('div', 'doc'); d.dataset.liga = String(l.id);
    const ext = String(l.Ruta || l.Title || '').split('.').pop().slice(0, 4);
    d.appendChild(el('span', 'ico', l.Tipo === 'buzon' ? 'lote' : l.Tipo === 'enlace' ? 'link' : ext));
    const c = el('div');
    const t = el('div', 't');
    const est = el('span', 'estado'); est.appendChild(l.Tipo === 'buzon' ? chip('en el buzón', 'info') : l.Tipo === 'enlace' ? chip('enlace') : chip('archivado', 'ok')); t.appendChild(est);
    if (l.Url) { const a = el('a', '', l.Title); a.href = l.Url; a.target = '_blank'; a.rel = 'noopener'; t.appendChild(a); } else t.appendChild(el('span', '', l.Title));
    c.appendChild(t);
    c.appendChild(el('div', 'p', l.Tipo === 'enlace' ? String(l.Url || '').replace(/^https?:\/\//, '').slice(0, 90) : `${l.Unidad ? l.Unidad + '/' : ''}${l.Ruta || ''}`));
    if (puede) {
        // F1: la tarjeta de la liga se cambia aqui mismo (o se deja para el proyecto entero).
        const fila = el('label', 'p tarjeta-de'); fila.appendChild(el('span', '', 'tarjeta: '));
        const sel = el('select'); sel.dataset.tarjetaDe = String(l.id); sel.setAttribute('aria-label', 'Tarjeta de la liga');
        opcionesTarjetas(sel, p); sel.value = l.TareaId ? String(l.TareaId) : '';
        sel.addEventListener('change', () => reasignarLiga(l, sel.value));
        fila.appendChild(sel); c.appendChild(fila);
    } else if (l.TareaId) { const tt = porId(estado.tareas, l.TareaId); c.appendChild(el('div', 'p', tt ? `tarjeta: ${tt.Title}` : `tarjeta #${l.TareaId}`)); }
    d.appendChild(c);
    const lado = el('div', 'lado');
    if (l.LigadoPor) lado.appendChild(el('span', 'p', nombreDe(l.LigadoPor, estado.roles)));
    if (puede) lado.appendChild(boton('Quitar', 'mn-btn is-ghost is-sm', () => quitarLiga(l), { quitar: String(l.id) }));
    d.appendChild(lado);
    return d;
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
        if (!s.id) { avisar(`Sin acceso a ${bib.nombre}: ${s.motivo}. En el piloto solo está autorizada Ambiental-CALYTEK; para las demás hay que otorgar el permiso (docs/otorgar-permiso-sitio.ps1).`, 'error'); return; }
        const r = await estado.cliente.buscarEnDrive(s.id, texto, CONFIG.buzon, m => avisar(m, 'ojo'));
        if (!r.length) { cont.appendChild(el('p', 'vacio', 'Nada con ese nombre fuera del buzón.')); return; }
        for (const x of r.slice(0, 30)) {
            const fila = el('div', 'lg-resultado');
            const izq = el('div'); izq.appendChild(el('div', '', x.nombre)); izq.appendChild(el('div', 'p', `${x.ruta} · ${fechaHora(x.modificado)}`));
            fila.appendChild(izq);
            fila.appendChild(boton('Ligar', 'mn-btn is-primary is-sm', () => ligarDocumento(x)));
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
    const campos = limpiar({ Title: x.nombre, ProyectoId: p.id, TareaId: tareaId, Tipo: 'archivado', Unidad: bib.clave, Ruta: x.ruta, Url: x.url, DriveItemId: x.id, LigadoPor: estado.cuenta.username });
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => avisar(m, 'ojo'));
        estado.ligas.push(n);
        const vieja = ctx.reemplaza; const alTerminar = ctx.alTerminar;
        cerrarDialogo('dlgLigar');
        avisar(vieja ? `«${x.nombre}» ligado en lugar de «${vieja.Title}».` : `«${x.nombre}» ligado.`, 'ok');
        alCambiar();
        await registrarActividad('ligar', `ligó «${x.nombre.slice(0, 80)}»`, p.id, tareaId);
        if (vieja) await quitarLiga(vieja, x.nombre);   // F2: la vieja se va en la misma operacion, sin preguntar
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
    const tareaId = $('sbTarea').value ? Number($('sbTarea').value) : undefined;
    const fecha = fechaMexico();
    const nombreCarpeta = nombreCarpetaLote(fecha, CONFIG.etiquetaLote, p.Clave, slug(concepto));
    // Destino que la app PROPONE en el _lote.json: la Carpeta declarada en el proyecto, o el default de
    // la biblioteca. La skill de archivar lo valida contra la biblioteca real y Carlos da el OK.
    const destino = String(p.Carpeta || bib.destinoLotes || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const manifiesto = construirManifiesto({ appVersion: VERSION, unidad: bib.clave, etiqueta: CONFIG.etiquetaLote, destino, fecha, concepto, archivos: archivos.map(a => a.name), proyecto: p.Clave, tarea: tareaId });
    const v = validarManifiesto(manifiesto);
    if (!v.ok) { avisar('El lote no es válido: ' + v.motivo, 'error'); return; }
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
    $('enCancelar').addEventListener('click', () => cerrarDialogo('dlgEnlace'));
    $('formEnlace').addEventListener('submit', guardarEnlace);
}
