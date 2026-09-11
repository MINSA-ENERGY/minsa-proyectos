// Documentos de un proyecto (decision 4): LIGAS a archivos ya archivados en la biblioteca de la
// unidad (buscador Graph, solo lectura, excluye el buzon) + «Subir al buzon» 99_Pendiente-Archivar
// con `_lote.json` al final (lote.js). «En el buzon» se DERIVA en vivo: si la carpeta del lote ya
// no existe (404) es que la skill de archivar lo acomodo. Nada se escribe fuera del buzon.

import { CONFIG } from './config.js';
import { PUEDE, tareasDe, slug, fechaMexico, nombreDe } from './reglas.js';
import { construirManifiesto, validarManifiesto, bytesDelManifiesto, nombreCarpetaLote, NOMBRE_MANIFIESTO } from './lote.js';
import { $, L, VERSION, estado, el, boton, chip, avisar, abrirDialogo, cerrarDialogo, opciones, limpiar, porId, registrarActividad, equipoDe, fechaHora } from './comun.js';

let alCambiar = () => {};
export function alCambiarDocs(fn) { alCambiar = fn; }

/** Biblioteca de la unidad del proyecto abierto, o null si el equipo no tiene una en el piloto. */
function bibliotecaDe(p) {
    const eq = equipoDe(p);
    const b = eq.unidad ? CONFIG.bibliotecas[eq.unidad] : null;
    return b ? { clave: eq.unidad, ...b } : null;
}

/** Resuelve (y cachea) el siteId de una biblioteca. `{ id, motivo }`; id null si 403/404. */
async function sitioDe(bib) {
    if (!estado.sitiosUnidad[bib.clave]) estado.sitiosUnidad[bib.clave] = await estado.cliente.sitioOpcional(CONFIG.sharepointHost, bib.sitio);
    return estado.sitiosUnidad[bib.clave];
}

// ---------------------------------------------------------------- pintar

export async function pintarDocs(p) {
    const cont = $('docsLista'); cont.textContent = '';
    const bib = bibliotecaDe(p);
    const puede = PUEDE.ligar(estado.rol) && p.Estado === 'activo' && !!bib;
    $('btnLigar').disabled = !puede; $('btnSubir').disabled = !puede;
    $('docsBiblioteca').textContent = bib ? `Biblioteca: ${bib.nombre}${bib.piloto ? '' : ' (fuera del piloto: sin permiso todavía)'}` : 'Este equipo no tiene biblioteca ligada en el piloto: solo se ven ligas ya guardadas.';
    const ligas = estado.ligas.filter(l => Number(l.ProyectoId) === p.id).sort((a, b) => b.id - a.id);
    if (!ligas.length) { cont.appendChild(el('p', 'vacio', 'Sin documentos ligados todavía.')); return; }
    for (const l of ligas) cont.appendChild(doc(l, p));
    // «En el buzon» en vivo: una consulta por liga de tipo buzon, cacheada por carga.
    if (bib) {
        const s = await sitioDe(bib);
        if (s.id) for (const l of ligas.filter(x => x.Tipo === 'buzon' && x.Ruta)) {
            if (estado.buzonExiste[l.Ruta] === undefined) {
                try { estado.buzonExiste[l.Ruta] = await estado.cliente.existeRuta(s.id, l.Ruta); } catch (_) { continue; }
            }
            const n = cont.querySelector(`[data-liga="${l.id}"] .estado`);
            if (n && estado.buzonExiste[l.Ruta] === false) { n.textContent = ''; n.appendChild(chip('ya lo acomodó la skill', 'ok')); n.appendChild(el('span', 'p', 'busca y reemplaza la liga')); }
        }
    }
}

function doc(l, p) {
    const d = el('div', 'doc'); d.dataset.liga = String(l.id);
    const ext = String(l.Ruta || l.Title || '').split('.').pop().slice(0, 4);
    d.appendChild(el('span', 'ico', l.Tipo === 'buzon' ? 'lote' : ext));
    const c = el('div');
    const t = el('div', 't');
    if (l.Url) { const a = el('a', '', l.Title); a.href = l.Url; a.target = '_blank'; a.rel = 'noopener'; t.appendChild(a); } else t.textContent = l.Title;
    c.appendChild(t);
    c.appendChild(el('div', 'p', `${l.Unidad ? l.Unidad + '/' : ''}${l.Ruta || ''}`));
    if (l.TareaId) { const tt = porId(estado.tareas, l.TareaId); c.appendChild(el('div', 'p', tt ? `tarjeta: ${tt.Title}` : `tarjeta #${l.TareaId}`)); }
    d.appendChild(c);
    const lado = el('div', 'lado');
    const est = el('span', 'estado'); est.appendChild(l.Tipo === 'buzon' ? chip('en el buzón', 'info') : chip('archivado', 'ok')); lado.appendChild(est);
    if (l.LigadoPor) lado.appendChild(el('span', 'p', nombreDe(l.LigadoPor, estado.roles)));
    d.appendChild(lado);
    return d;
}

// ---------------------------------------------------------------- ligar

function opcionesTarjetas(sel, p) {
    opciones(sel, tareasDe(p, estado.tareas), t => t.id, t => t.Title.slice(0, 70), 'el proyecto entero');
}

export function abrirLigar() {
    const p = estado.proyectoAbierto; const bib = p && bibliotecaDe(p);
    if (!p || !bib) return;
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes ligar documentos.', 'error'); return; }
    $('lgBiblioteca').textContent = `Busca en ${bib.nombre} (solo lectura; el buzón no aparece).`;
    $('lgTexto').value = ''; $('lgResultados').textContent = '';
    opcionesTarjetas($('lgTarea'), p);
    abrirDialogo('dlgLigar');
    $('lgTexto').focus();
}

async function buscarDocumento() {
    const p = estado.proyectoAbierto; const bib = bibliotecaDe(p);
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
    const p = estado.proyectoAbierto; const bib = bibliotecaDe(p);
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes ligar documentos.', 'error'); return; }
    if (estado.ligas.some(l => Number(l.ProyectoId) === p.id && l.DriveItemId === x.id)) { avisar('Ese archivo ya está ligado a este proyecto.', 'ojo'); return; }
    const tareaId = $('lgTarea').value ? Number($('lgTarea').value) : undefined;
    const campos = limpiar({ Title: x.nombre, ProyectoId: p.id, TareaId: tareaId, Tipo: 'archivado', Unidad: bib.clave, Ruta: x.ruta, Url: x.url, DriveItemId: x.id, LigadoPor: estado.cuenta.username });
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.ligas, campos, m => avisar(m, 'ojo'));
        estado.ligas.push(n);
        cerrarDialogo('dlgLigar');
        avisar(`«${x.nombre}» ligado.`, 'ok');
        alCambiar();
        await registrarActividad('ligar', `ligó «${x.nombre.slice(0, 80)}»`, p.id, tareaId);
        alCambiar();
    } catch (e) { avisar('No se pudo ligar: ' + (e && e.message ? e.message : e), 'error'); }
}

// ---------------------------------------------------------------- subir al buzon

export function abrirSubir() {
    const p = estado.proyectoAbierto; const bib = p && bibliotecaDe(p);
    if (!p || !bib) return;
    if (!PUEDE.ligar(estado.rol)) { avisar('Tu rol es de lectura: no puedes subir documentos.', 'error'); return; }
    $('sbBiblioteca').textContent = `Va a ${bib.nombre}/${CONFIG.buzon}/.`;
    $('sbConcepto').value = ''; $('sbArchivos').value = ''; $('sbProgreso').textContent = '';
    opcionesTarjetas($('sbTarea'), p);
    abrirDialogo('dlgSubir');
    $('sbConcepto').focus();
}

/**
 * Sube carpeta -> piezas -> `_lote.json` AL FINAL (igual que captura): el manifiesto es la prueba
 * de que el lote llego completo. Si algo falla a medias, se borra la carpeta y se avisa.
 */
async function subirAlBuzon(ev) {
    ev.preventDefault();
    const p = estado.proyectoAbierto; const bib = bibliotecaDe(p);
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
        cerrarDialogo('dlgSubir');
        avisar(`Lote «${concepto}» en el buzón de ${bib.nombre} (${archivos.length} archivo(s)).`, 'ok');
        alCambiar();
        await registrarActividad('subir', `subió «${concepto.slice(0, 80)}» al buzón (${archivos.length} archivo(s))`, p.id, tareaId);
        alCambiar();
    } catch (e) {
        if (carpeta && s && s.id) { try { await estado.cliente.borrarItemDrive(s.id, carpeta.id); prog('Lote a medias borrado.'); } catch (_) { prog('Quedó una carpeta a medias en el buzón; la skill la trata como lote incompleto.'); } }
        avisar('No se pudo subir: ' + (e && e.message ? e.message : e), 'error');
    } finally { $('sbGuardar').disabled = false; }
}

// ---------------------------------------------------------------- enganche

export function engancharDocs() {
    $('btnLigar').addEventListener('click', abrirLigar);
    $('lgCerrar').addEventListener('click', () => cerrarDialogo('dlgLigar'));
    $('lgBuscar').addEventListener('click', buscarDocumento);
    $('lgTexto').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarDocumento(); } });
    $('btnSubir').addEventListener('click', abrirSubir);
    $('sbCancelar').addEventListener('click', () => cerrarDialogo('dlgSubir'));
    $('formSubir').addEventListener('submit', subirAlBuzon);
}
