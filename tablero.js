// Tablero de un proyecto: 4 columnas fijas, lista, «Mis tareas», la tarjeta (ver / mover / editar /
// borrar) y la tarea nueva. El movimiento canonico es el boton «Mover a…» (default del plan);
// nada de drag & drop en el piloto. v0.3.0 suma «→ siguiente» con Deshacer (U7), el filtro y el
// orden dentro del proyecto (F9/F10), Subir/Bajar y mover de proyecto (F11), las pestanas de
// columna en celular (U5) y el 412 de If-Match (T1): se relee, no se pisa.

import { CONFIG } from './config.js';
import { PUEDE, ordenar, tareasDe, sinMovimiento, camposDeMovimiento, nombreDe, diasPara, estadoVence, columnaSiguiente, filtrarTareas, ordenarLista, reordenar } from './reglas.js';
import { $, L, estado, el, boton, avatar, chip, chipVence, avisar, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, fechaHora, aIsoDia, opciones, limpiar, porId, registrarActividad, hashDe, fijarHash, ligaDeTarjeta, notasDe, aplicar, pedirRelectura } from './comun.js';
import { abrirLigar, abrirSubir, abrirEnlace, quitarLiga, puedeLigarEn, puedeEnlazarEn } from './docs.js';
import { esConflicto } from './graph.js';

let alCambiar = () => {};   // app.js la pone: repinta la pantalla actual tras una escritura
export function alCambiarTareas(fn) { alCambiar = fn; }

const nombreColumna = clave => (CONFIG.columnas.find(c => c.clave === clave) || { nombre: clave }).nombre;
const personas = () => estado.roles.filter(r => r.Activo !== false).map(r => String(r.Title || '').toLowerCase()).filter(Boolean);

// ---------------------------------------------------------------- tarjeta (elemento)

export function tarjeta(t, conProyecto = false) {
    const b = el('button', 'tarjeta'); b.type = 'button'; b.dataset.t = String(t.id);
    b.appendChild(el('span', 't', t.Title));
    const f = el('span', 'f');
    f.appendChild(avatar(t.Asignado));
    f.appendChild(el('span', '', t.Asignado ? nombreDe(t.Asignado, estado.roles).split(' ')[0] : 'sin asignar'));
    if (conProyecto) { const p = porId(estado.proyectos, t.ProyectoId); if (p) f.appendChild(chip(p.Clave)); }
    if (conProyecto) f.appendChild(chip(nombreColumna(t.Columna), t.Columna === 'hecho' ? 'ok' : t.Columna === 'en-curso' ? 'info' : null));
    const v = chipVence(t); if (v) f.appendChild(v);
    if (t.Prioridad === 'alta') f.appendChild(chip('alta', 'danger'));
    if (estado.ligas.some(l => Number(l.TareaId) === t.id && l.Tipo === 'buzon')) f.appendChild(chip('en el buzón', 'info'));
    if (sinMovimiento([t], CONFIG.sinMovimientoDias).length) f.appendChild(el('span', 'stale', `· sin movimiento ${-diasPara(t.Desde)} días`));
    b.appendChild(f);
    if (t.Origen) b.appendChild(el('span', 'src', t.Origen));
    b.addEventListener('click', () => abrirTarjeta(t.id));
    // U7: la accion mas frecuente sin abrir el dialogo. Va como HERMANO (un <button> no anida otro).
    const caja = el('div', 'tarjeta-caja'); caja.appendChild(b);
    const sig = columnaSiguiente(t.Columna); const p = porId(estado.proyectos, t.ProyectoId);
    if (sig && PUEDE.mover(estado.rol) && p && p.Estado === 'activo') {
        const s = boton(`→ ${nombreColumna(sig)}`, 'sig', () => moverSiguiente(t.id), { sig: String(t.id) });
        s.title = `Mover a ${nombreColumna(sig)}`; caja.appendChild(s);
    }
    return caja;
}

// ---------------------------------------------------------------- filtro dentro del proyecto (F9)

const CHIPS_FILTRO = [['alta', 'solo alta'], ['vencidas', 'solo vencidas']];
/** Chips de filtro: una por persona con tarjetas en el proyecto, «solo alta» y «solo vencidas». El texto vive en #filtroTexto. */
export function pintarFiltroTareas(proyecto) {
    const f = estado.filtroTareas; const c = $('filtroChips'); c.textContent = '';
    const ts = tareasDe(proyecto, estado.tareas);
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))].sort();
    const chipBtn = (texto, on, alClic, datos, conAvatar) => {
        const b = boton('', on ? 'is-on' : '', () => { alClic(); pintarFiltroTareas(proyecto); pintarSoloTareas(); }, datos);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (conAvatar) b.appendChild(avatar(conAvatar));
        b.appendChild(el('span', '', texto)); c.appendChild(b);
    };
    const pilas = quienes.map(q => nombreDe(q, estado.roles).split(' ')[0]);
    for (const [i, q] of quienes.entries()) {
        const nombre = pilas.filter(x => x === pilas[i]).length > 1 ? nombreDe(q, estado.roles) : pilas[i];   // dos «Ana»: nombre completo
        chipBtn(nombre, f.quien === q, () => { f.quien = f.quien === q ? null : q; }, { quien: q }, q);
    }
    for (const [k, texto] of CHIPS_FILTRO) chipBtn(texto, !!f[k], () => { f[k] = !f[k]; }, { filtro: k });
    const activo = !!(f.quien || f.alta || f.vencidas || f.texto);
    if (activo) chipBtn('× limpiar', false, () => { estado.filtroTareas = { quien: null, alta: false, vencidas: false, texto: '' }; $('filtroTexto').value = ''; }, { filtro: 'limpiar' });
}
/** Repinta solo el tablero o la lista (no la pantalla entera: el foco del cuadro de texto se queda). */
function pintarSoloTareas() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (estado.tab === 'tablero') pintarTablero(p); else if (estado.tab === 'lista') pintarLista(p);
}
const tareasVisibles = proyecto => filtrarTareas(tareasDe(proyecto, estado.tareas), estado.filtroTareas);

// ---------------------------------------------------------------- tablero y lista

export function pintarTablero(proyecto) {
    const cont = $('tableroCols'); cont.textContent = '';
    const ts = tareasVisibles(proyecto);
    const filtrado = ts.length !== tareasDe(proyecto, estado.tareas).length;
    // U5: en celular se ve UNA columna y estas pestanas la eligen; en escritorio el CSS las esconde.
    const tabs = $('colTabs'); tabs.textContent = '';
    if (!CONFIG.columnas.some(c => c.clave === estado.colMovil)) estado.colMovil = 'por-hacer';
    for (const c of CONFIG.columnas) {
        const n = ts.filter(t => t.Columna === c.clave).length;
        const b = boton('', estado.colMovil === c.clave ? 'is-on' : '', () => { estado.colMovil = c.clave; pintarTablero(proyecto); }, { colTab: c.clave });
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', estado.colMovil === c.clave ? 'true' : 'false');
        b.appendChild(el('span', '', c.nombre)); b.appendChild(el('span', 'n', String(n)));
        tabs.appendChild(b);
    }
    for (const c of CONFIG.columnas) {
        const col = el('div', 'col' + (estado.colMovil === c.clave ? ' is-activa' : '')); col.dataset.col = c.clave;
        const h = el('h3', '', c.nombre);
        const cs = ordenar(ts.filter(t => t.Columna === c.clave));
        h.appendChild(el('span', 'n', String(cs.length)));
        col.appendChild(h);
        if (!cs.length) col.appendChild(el('div', 'vacio', filtrado ? 'Nada con ese filtro.' : c.clave === 'por-hacer' ? 'Nada por hacer.' : '—'));
        for (const t of cs) col.appendChild(tarjeta(t));
        cont.appendChild(col);
    }
}

const COLUMNAS_LISTA = [['tarea', 'Tarea'], ['asignado', 'Asignado'], ['columna', 'Columna'], ['vence', 'Vence'], ['origen', 'Origen en la KB']];
export function pintarLista(proyecto) {
    const cont = $('tab-lista'); cont.textContent = '';
    const o = estado.ordenLista;
    const ts = ordenarLista(tareasVisibles(proyecto), o.col, o.dir, c => nombreDe(c, estado.roles));
    const tabla = el('table'); const thead = el('thead'); const tr = el('tr');
    // F10: clic en el encabezado ordena; segundo clic invierte. La flecha va en el activo (aria-sort).
    for (const [clave, texto] of COLUMNAS_LISTA) {
        const th = el('th', '', texto); th.dataset.sort = clave;
        if (o.col === clave) th.setAttribute('aria-sort', o.dir === 1 ? 'ascending' : 'descending');
        th.addEventListener('click', () => { estado.ordenLista = o.col === clave ? { col: clave, dir: -o.dir } : { col: clave, dir: 1 }; pintarLista(proyecto); });
        tr.appendChild(th);
    }
    thead.appendChild(tr); tabla.appendChild(thead);
    const tbody = el('tbody');
    for (const t of ts) {
        const r = el('tr', 'clic'); r.dataset.t = String(t.id);
        r.appendChild(el('td', '', t.Title));
        r.appendChild(el('td', '', t.Asignado ? nombreDe(t.Asignado, estado.roles) : '—'));
        const tdc = el('td'); tdc.appendChild(chip(nombreColumna(t.Columna), t.Columna === 'hecho' ? 'ok' : t.Columna === 'en-curso' ? 'info' : null)); r.appendChild(tdc);
        r.appendChild(el('td', 'mn-mono', fechaCorta(t.Vence)));
        r.appendChild(el('td', 'src', t.Origen || ''));
        r.addEventListener('click', () => abrirTarjeta(t.id));
        tbody.appendChild(r);
    }
    if (!ts.length) { const r = el('tr'); const td = el('td', 'vacio', tareasDe(proyecto, estado.tareas).length ? 'Nada con ese filtro.' : 'Sin tareas todavía.'); td.colSpan = 5; r.appendChild(td); tbody.appendChild(r); }
    tabla.appendChild(tbody); cont.appendChild(tabla);
}

/**
 * Mis tareas (U4 de la auditoria, v0.2.0): ARRIBA las urgentes de todos los proyectos —vencidas y
 * las que vencen en `vencePronto` dias— con el numero de dias grande; abajo la bandeja por proyecto
 * con el resto. El mismo acomodo que Pendientes del tablero de escritorio.
 */
const FILTROS_MIS = [[null, 'Todas'], ['vencidas', 'Vencidas'], ['pronto', 'Vencen en 7 días']];
export function pintarMisTareas() {
    const yo = estado.cuenta.username.toLowerCase();
    $('misTitulo').textContent = 'Mis tareas · ' + nombreDe(yo, estado.roles);
    // U3: los KPI de Inicio aterrizan aqui con el filtro puesto; estos chips lo muestran y lo cambian.
    const fm = $('filtroMis'); fm.textContent = '';
    for (const [k, texto] of FILTROS_MIS) {
        const b = boton(texto, estado.filtroMis === k ? 'is-on' : '', () => { estado.filtroMis = k; pintarMisTareas(); }, { mis: k || 'todas' });
        b.setAttribute('aria-pressed', estado.filtroMis === k ? 'true' : 'false'); fm.appendChild(b);
    }
    const cont = $('misLista'); cont.textContent = '';
    const todas = estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === yo && t.Columna !== 'hecho')
        .sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')) || a.id - b.id);
    const mias = estado.filtroMis === 'vencidas' ? todas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger')
        : estado.filtroMis === 'pronto' ? todas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'warn') : todas;
    if (!mias.length) { cont.appendChild(el('p', 'vacio', todas.length ? 'Nada con ese filtro.' : 'Sin tareas abiertas asignadas a ti.')); return; }
    const urgentes = mias.filter(t => ['danger', 'warn'].includes(estadoVence(t, CONFIG.vencePronto)));
    if (urgentes.length) {
        const card = el('section', 'mn-card urgentes');
        card.appendChild(el('h2', '', `Urgentes · ${urgentes.length}`));
        const grid = el('div', 'urgentes-grid');
        for (const t of urgentes) {
            const d = diasPara(t.Vence);
            const caja = el('div', 'urgente' + (d < 0 ? ' is-danger' : ' is-warn'));
            const k = el('span', 'k'); k.appendChild(el('b', '', String(Math.abs(d)))); k.appendChild(el('small', '', d < 0 ? (d === -1 ? 'día vencida' : 'días vencida') : d === 0 ? 'vence hoy' : d === 1 ? 'día' : 'días'));
            caja.appendChild(k);
            caja.appendChild(tarjeta(t, true));
            grid.appendChild(caja);
        }
        card.appendChild(grid); cont.appendChild(card);
    }
    const resto = mias.filter(t => !urgentes.includes(t));
    const porProyecto = new Map();
    for (const t of resto) { if (!porProyecto.has(t.ProyectoId)) porProyecto.set(t.ProyectoId, []); porProyecto.get(t.ProyectoId).push(t); }
    for (const [pid, ts] of porProyecto) {
        const p = porId(estado.proyectos, pid);
        const card = el('section', 'mn-card');
        card.appendChild(el('h2', '', p ? p.Title : `proyecto #${pid}`));
        const grid = el('div', 'tablero'); grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
        for (const t of ts) grid.appendChild(tarjeta(t, true));
        card.appendChild(grid); cont.appendChild(card);
    }
}

// ---------------------------------------------------------------- tarjeta (dialogo)

let tarjetaAbierta = null;
/** Id de la tarjeta abierta en el dialogo, o null (lo lee el router de app.js). */
export function tarjetaAbiertaId() { return $('dlgTarea').open && tarjetaAbierta ? tarjetaAbierta.id : null; }

export function abrirTarjeta(id) {
    const t = porId(estado.tareas, id); if (!t) return;
    tarjetaAbierta = t;
    const p = porId(estado.proyectos, t.ProyectoId);
    $('tTitulo').textContent = t.Title;
    const kv = $('tKv'); kv.textContent = '';
    const par = (k, v, clase) => { kv.appendChild(el('b', '', k)); kv.appendChild(el('span', clase || '', v)); };
    par('Proyecto', p ? p.Title : '—');
    par('Asignado', t.Asignado ? nombreDe(t.Asignado, estado.roles) : 'sin asignar');
    par('Columna', nombreColumna(t.Columna));
    par('Vence', fechaCorta(t.Vence));
    par('Prioridad', t.Prioridad || 'normal');
    if (t.Origen) par('Origen', t.Origen, 'src');
    if (t.Descripcion) par('Descripción', t.Descripcion);
    if (t.HechoPor) par('Hecho por', `${nombreDe(t.HechoPor, estado.roles)} · ${fechaCorta(t.HechoEl)}`);
    pintarDocsDeTarjeta(t, p);
    pintarNotas(t, p);

    const puedeMover = PUEDE.mover(estado.rol) && !!p && p.Estado === 'activo';
    $('tDeny').classList.toggle('oculto', puedeMover);
    $('tDeny').textContent = !PUEDE.mover(estado.rol) ? 'Tu rol es de lectura: puedes ver la tarjeta, pero moverla lo hace su asignado o cualquier colaborador.' : (p && p.Estado !== 'activo' ? 'El proyecto está cerrado: sus tarjetas quedan como registro.' : '');
    const mv = $('tMover'); mv.textContent = '';
    for (const c of CONFIG.columnas) {
        const b = boton(c.nombre, 'mn-btn is-sm' + (t.Columna === c.clave ? ' is-here' : ''), () => moverTarea(t.id, c.clave), { move: c.clave });
        b.disabled = !puedeMover || t.Columna === c.clave;
        mv.appendChild(b);
    }
    // F11: Subir / Bajar dentro de la columna (renumera Orden en el orden visual).
    const or = $('tOrden'); or.textContent = '';
    if (puedeMover) {
        const hermanas = ordenar(tareasDe(p, estado.tareas).filter(x => x.Columna === t.Columna));
        const i = hermanas.findIndex(x => x.id === t.id);
        if (hermanas.length > 1) {
            or.appendChild(el('span', '', `Orden en ${nombreColumna(t.Columna)}: ${i + 1} de ${hermanas.length}`));
            const up = boton('↑ Subir', 'mn-btn is-ghost is-sm', () => reordenarTarea(t.id, -1), { orden: 'subir' }); up.disabled = i <= 0; or.appendChild(up);
            const dn = boton('↓ Bajar', 'mn-btn is-ghost is-sm', () => reordenarTarea(t.id, 1), { orden: 'bajar' }); dn.disabled = i >= hermanas.length - 1; or.appendChild(dn);
        }
    }
    $('tBorrar').disabled = !PUEDE.borrar(estado.rol);
    $('tBorrar').title = PUEDE.borrar(estado.rol) ? '' : 'Solo gerencia borra tarjetas';
    // Editar
    const puedeEditar = PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';
    $('tEditar').classList.toggle('oculto', !puedeEditar);
    $('tEditar').open = false;
    opciones($('ftAsignado'), personas(), x => x, x => nombreDe(x, estado.roles), 'sin asignar');
    // F11: mover la tarjeta a otro frente (solo gerencia): select con los proyectos activos.
    const puedeMoverProyecto = PUEDE.proyecto(estado.rol) && puedeEditar;
    $('ftProyectoCampo').classList.toggle('oculto', !puedeMoverProyecto);
    opciones($('ftProyecto'), estado.proyectos.filter(x => x.Estado === 'activo'), x => x.id, x => x.Title, null);
    $('ftProyecto').value = String(t.ProyectoId);
    $('ftTitulo').value = t.Title || ''; $('ftAsignado').value = String(t.Asignado || '').toLowerCase(); $('ftPrioridad').value = t.Prioridad || 'normal';
    $('ftVence').value = t.Vence ? fechaCorta(t.Vence) : ''; $('ftOrigen').value = t.Origen || ''; $('ftDesc').value = t.Descripcion || '';
    abrirDialogo('dlgTarea');
    fijarHash(hashDe(t.id));
}

/** Documentos de la tarjeta (F3): las ligas con «Quitar», y «Ligar archivo» / «Subir al buzón» con esta tarjeta ya puesta. */
function pintarDocsDeTarjeta(t, p) {
    const c = $('tDocs'); c.textContent = '';
    const ligas = estado.ligas.filter(l => Number(l.TareaId) === t.id);
    const puede = puedeLigarEn(p);
    for (const l of ligas) {
        const fila = el('div', 'tdoc');
        const a = el('a', '', l.Title); if (l.Url) { a.href = l.Url; a.target = '_blank'; a.rel = 'noopener'; }
        fila.appendChild(a);
        fila.appendChild(chip(l.Tipo === 'buzon' ? 'en el buzón' : l.Tipo === 'enlace' ? 'enlace' : 'archivado', l.Tipo === 'buzon' ? 'info' : l.Tipo === 'enlace' ? null : 'ok'));
        if (puede || (l.Tipo === 'enlace' && puedeEnlazarEn(p))) fila.appendChild(boton('Quitar', 'mn-btn is-ghost is-sm', async () => { if (await quitarLiga(l)) pintarDocsDeTarjeta(t, p); }, { quitar: String(l.id) }));
        c.appendChild(fila);
    }
    if (!ligas.length) c.appendChild(el('span', 'vacio', puede ? 'Sin documentos: liga uno de la biblioteca, sube al buzón o pega un enlace.' : puedeEnlazarEn(p) ? 'Sin documentos: pega un enlace.' : 'Sin documentos.'));
    if (puede) {
        const acciones = el('div', 'tdoc-acciones');
        const volver = () => abrirTarjeta(t.id);
        acciones.appendChild(boton('Ligar archivo', 'mn-btn is-sm', () => { cerrarDialogo('dlgTarea'); abrirLigar({ proyecto: p, tareaId: t.id, alTerminar: volver }); }, { ligar: String(t.id) }));
        acciones.appendChild(boton('Subir al buzón', 'mn-btn is-sm', () => { cerrarDialogo('dlgTarea'); abrirSubir({ proyecto: p, tareaId: t.id, alTerminar: volver }); }, { subir: String(t.id) }));
        c.appendChild(acciones);
    }
    // F4: un enlace no necesita biblioteca; se ofrece aunque el equipo no tenga una en el piloto.
    if (puedeEnlazarEn(p)) {
        const acc = c.querySelector('.tdoc-acciones') || c.appendChild(el('div', 'tdoc-acciones'));
        acc.appendChild(boton('Pegar un enlace', 'mn-btn is-ghost is-sm', () => { cerrarDialogo('dlgTarea'); abrirEnlace({ proyecto: p, tareaId: t.id, alTerminar: () => abrirTarjeta(t.id) }); }, { enlace: String(t.id) }));
    }
}

/** Notas de la tarjeta (F5): renglones de PROY_Actividad con Accion=comentar, en orden, y el campo para anotar. */
function pintarNotas(t, p) {
    const c = $('tNotasLista'); c.textContent = '';
    const notas = notasDe(t.id);
    for (const n of notas) {
        const it = el('div', 'nota');
        it.appendChild(avatar(n.Quien));
        const cuerpo = el('div');
        const cab = el('div', 'w'); cab.appendChild(el('span', '', nombreDe(n.Quien, estado.roles))); cab.appendChild(el('span', 'mn-mono', ' · ' + fechaHora(n.Cuando)));
        cuerpo.appendChild(cab); cuerpo.appendChild(el('p', '', n.Title));
        it.appendChild(cuerpo); c.appendChild(it);
    }
    if (!notas.length) c.appendChild(el('span', 'vacio', 'Sin notas todavía.'));
    const puede = PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';
    $('formNota').classList.toggle('oculto', !puede);
    $('tNota').value = '';
}

async function anotar(ev) {
    ev.preventDefault();
    const t = tarjetaAbierta; if (!t) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes anotar.', 'error'); return; }
    const texto = $('tNota').value.trim();
    if (!texto) { $('tNota').focus(); return; }
    if (texto.length > 250) { avisar('La nota no cabe: máximo 250 caracteres (es un renglón de la bitácora).', 'error'); return; }
    $('tAnotar').disabled = true;
    try {
        // A diferencia del resto de la bitacora, aqui la escritura ES la accion: si falla, se ve.
        const r = { Title: texto, Accion: 'comentar', Quien: estado.cuenta.username, Cuando: new Date().toISOString(), ProyectoId: Number(t.ProyectoId), TareaId: t.id };
        const n = await estado.cliente.crearRenglon(estado.siteId, L.actividad, r, m => avisar(m, 'ojo'));
        estado.actividad.unshift(n);
        pintarNotas(t, porId(estado.proyectos, t.ProyectoId));
        avisar('Nota guardada.', 'ok');
        alCambiar();
    } catch (e) { avisar('No se pudo guardar la nota: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('tAnotar').disabled = false; }
}

/** «Copiar liga» (F8): comparte o copia la URL de la tarjeta por su proyecto; si nada de eso existe, la deja en el aviso. */
async function compartirTarjeta() {
    const t = tarjetaAbierta; if (!t) return;
    const url = ligaDeTarjeta(t);
    try {
        if (navigator.share) { await navigator.share({ title: t.Title, url }); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); avisar('Liga copiada: pégala en el chat.', 'ok'); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    avisar(url, 'ojo');
}

/**
 * Un 412 (T1): alguien cambio la tarjeta desde que se leyo. No se pisa: se releen las listas, se avisa
 * y, si el dialogo estaba abierto, se vuelve a abrir con lo nuevo para que la persona decida.
 */
async function conflicto(t) {
    const estabaAbierta = $('dlgTarea').open;
    await pedirRelectura();
    const fresca = porId(estado.tareas, t.id);
    if (estabaAbierta && fresca) abrirTarjeta(t.id);   // abrir limpia los avisos: el aviso va DESPUES, dentro del dialogo
    avisar(fresca ? `Alguien cambió «${fresca.Title.slice(0, 60)}» hace un momento: se releyó. Revisa y vuelve a intentarlo.` : 'Esa tarjeta ya no existe: alguien la borró hace un momento.', 'ojo');
}

/** Nucleo de mover: PATCH con If-Match, sello, bitacora. Devuelve true si se movio. `deshacer` cambia el verbo. */
async function ejecutarMovimiento(t, columna, deshacer = false) {
    const antes = t.Columna;
    const campos = camposDeMovimiento(columna, estado.cuenta.username);
    await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, t.id, campos, m => avisar(m, 'ojo'), t._etag);
    aplicar(t, campos);
    alCambiar();
    await registrarActividad('mover-tarea', `${deshacer ? 'devolvió' : 'movió'} «${t.Title.slice(0, 80)}» de ${nombreColumna(antes)} a ${nombreColumna(columna)}`, t.ProyectoId, t.id);
    alCambiar();
    return antes;
}

async function moverTarea(id, columna) {
    const t = porId(estado.tareas, id); if (!t) return;
    if (!PUEDE.mover(estado.rol)) { avisar('Tu rol es de lectura: no puedes mover tarjetas.', 'error'); return; }
    const p = porId(estado.proyectos, t.ProyectoId);
    if (!p || p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    for (const b of $('tMover').querySelectorAll('button')) b.disabled = true;
    try {
        await ejecutarMovimiento(t, columna);
        cerrarDialogo('dlgTarea');
        avisar(`«${t.Title}» → ${nombreColumna(columna)}.`, 'ok');
    } catch (e) {
        if (esConflicto(e)) { await conflicto(t); return; }
        avisar('No se pudo mover: ' + (e && e.message ? e.message : e), 'error');
        for (const b of $('tMover').querySelectorAll('button')) b.disabled = b.dataset.move === t.Columna;
    }
}

/** U7: «→ siguiente» desde la tarjeta, con «Deshacer» en el toast durante 5 s (mueve de vuelta y lo registra). */
async function moverSiguiente(id) {
    const t = porId(estado.tareas, id); if (!t) return;
    if (!PUEDE.mover(estado.rol)) { avisar('Tu rol es de lectura: no puedes mover tarjetas.', 'error'); return; }
    const p = porId(estado.proyectos, t.ProyectoId);
    if (!p || p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    const columna = columnaSiguiente(t.Columna); if (!columna) return;
    try {
        const antes = await ejecutarMovimiento(t, columna);
        avisar(`«${t.Title}» → ${nombreColumna(columna)}.`, 'ok', { ms: 5000, accion: 'Deshacer', alClic: async () => {
            const viva = porId(estado.tareas, t.id);   // un refresco en esos 5 s reemplaza los objetos de estado
            if (!viva) { avisar('Esa tarjeta ya no está.', 'ojo'); return; }
            try { await ejecutarMovimiento(viva, antes, true); avisar(`«${viva.Title}» de vuelta en ${nombreColumna(antes)}.`, 'ok'); }
            catch (e) { if (esConflicto(e)) { await conflicto(viva); return; } avisar('No se pudo deshacer: ' + (e && e.message ? e.message : e), 'error'); }
        } });
    } catch (e) {
        if (esConflicto(e)) { await conflicto(t); return; }
        avisar('No se pudo mover: ' + (e && e.message ? e.message : e), 'error');
    }
}

/** F11: Subir / Bajar. Renumera lo que cambie (reordenar()); cada cambio es un PATCH con If-Match. */
async function reordenarTarea(id, delta) {
    const t = porId(estado.tareas, id); if (!t) return;
    if (!PUEDE.mover(estado.rol)) { avisar('Tu rol es de lectura: no puedes reordenar.', 'error'); return; }
    const p = porId(estado.proyectos, t.ProyectoId);
    if (!p || p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    const cambios = reordenar(tareasDe(p, estado.tareas).filter(x => x.Columna === t.Columna), t.id, delta);
    if (!cambios.length) return;
    for (const b of $('tOrden').querySelectorAll('button')) b.disabled = true;
    try {
        for (const c of cambios) {
            const x = porId(estado.tareas, c.id);
            await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, x.id, { Orden: c.Orden }, m => avisar(m, 'ojo'), x._etag);
            aplicar(x, { Orden: c.Orden });
        }
        alCambiar();
        abrirTarjeta(t.id);
        avisar(delta < 0 ? 'Subida un lugar.' : 'Bajada un lugar.', 'ok');
    } catch (e) {
        if (esConflicto(e)) { await conflicto(t); return; }
        // Los PATCH van en serie: si fallo el segundo, el primero ya aplico. Se relee para no quedar a medias.
        await pedirRelectura(); if (porId(estado.tareas, t.id)) abrirTarjeta(t.id);
        avisar('No se pudo reordenar: ' + (e && e.message ? e.message : e), 'error');
    }
}

async function guardarEdicion(ev) {
    ev.preventDefault();
    const t = tarjetaAbierta; if (!t) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes editar tarjetas.', 'error'); return; }
    let vence;
    try { vence = aIsoDia($('ftVence').value); } catch (e) { avisar(e.message, 'error'); return; }
    const titulo = $('ftTitulo').value.trim();
    if (!titulo) { avisar('La tarea necesita un título.', 'error'); $('ftTitulo').focus(); return; }
    const campos = {
        Title: titulo, Asignado: $('ftAsignado').value || null, Prioridad: $('ftPrioridad').value, Vence: vence,
        Origen: $('ftOrigen').value.trim() || null, Descripcion: $('ftDesc').value.trim() || null
    };
    const cambioAsignado = String(t.Asignado || '').toLowerCase() !== String(campos.Asignado || '').toLowerCase();
    // F11: a otro frente (solo gerencia). Cae al final de por-hacer/su columna en el proyecto nuevo y arrastra sus ligas.
    const proyectoNuevo = !$('ftProyectoCampo').classList.contains('oculto') && $('ftProyecto').value && Number($('ftProyecto').value) !== Number(t.ProyectoId) ? porId(estado.proyectos, $('ftProyecto').value) : null;
    if (proyectoNuevo && !PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia mueve tarjetas entre proyectos.', 'error'); return; }
    if (proyectoNuevo && proyectoNuevo.Estado !== 'activo') { avisar('Ese proyecto está cerrado.', 'error'); return; }
    if (proyectoNuevo) { campos.ProyectoId = proyectoNuevo.id; campos.Orden = tareasDe(proyectoNuevo, estado.tareas).filter(x => x.Columna === t.Columna).length + 1; }
    const proyectoViejo = t.ProyectoId;
    $('btnGuardarTarea').disabled = true;
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, t.id, campos, m => avisar(m, 'ojo'), t._etag);
        aplicar(t, campos);
        cerrarDialogo('dlgTarea');
        avisar(proyectoNuevo ? `«${titulo}» ahora es de «${proyectoNuevo.Title}».` : 'Tarjeta actualizada.', 'ok');
        alCambiar();
        if (proyectoNuevo) {
            for (const l of estado.ligas) if (Number(l.TareaId) === t.id) {
                try { await estado.cliente.actualizarRenglon(estado.siteId, L.ligas, l.id, { ProyectoId: proyectoNuevo.id }, undefined, l._etag); aplicar(l, { ProyectoId: proyectoNuevo.id }); } catch (_) { /* la liga se queda en el proyecto viejo; Docs la muestra ahi */ }
            }
            await registrarActividad('editar-tarea', `pasó «${titulo.slice(0, 80)}» al proyecto «${proyectoNuevo.Title.slice(0, 60)}»`, proyectoViejo, t.id);
            await registrarActividad('editar-tarea', `trajo «${titulo.slice(0, 80)}» de otro proyecto`, proyectoNuevo.id, t.id);
        } else await registrarActividad('editar-tarea', cambioAsignado && campos.Asignado ? `asignó «${titulo.slice(0, 80)}» a ${nombreDe(campos.Asignado, estado.roles)}` : `editó «${titulo.slice(0, 80)}»`, t.ProyectoId, t.id);
        alCambiar();
    } catch (e) {
        if (esConflicto(e)) { await conflicto(t); return; }
        avisar('No se pudo guardar: ' + (e && e.message ? e.message : e), 'error');
    } finally { $('btnGuardarTarea').disabled = false; }
}

async function borrarTarea() {
    const t = tarjetaAbierta; if (!t) return;
    if (!PUEDE.borrar(estado.rol)) { avisar('Solo gerencia borra tarjetas.', 'error'); return; }
    const { ok } = await confirmar({ titulo: 'Borrar la tarjeta', texto: `«${t.Title}» se borra de PROY_Tareas. Sus ligas a documentos se quedan en el proyecto. No se puede deshacer desde la app.`, ok: 'Borrar' });
    if (!ok) return;
    try {
        await estado.cliente.borrarRenglon(estado.siteId, L.tareas, t.id, m => avisar(m, 'ojo'));
        estado.tareas = estado.tareas.filter(x => x.id !== t.id);
        // Las ligas de la tarjeta se quedan en el proyecto, ya sin tarjeta (best-effort: si falla, el
        // Docs las muestra como «tarjeta #N» y nada mas).
        for (const l of estado.ligas) if (Number(l.TareaId) === t.id) {
            try { await estado.cliente.actualizarRenglon(estado.siteId, L.ligas, l.id, { TareaId: null }, undefined, l._etag); aplicar(l, { TareaId: null }); } catch (_) { /* se queda colgada */ }
        }
        cerrarDialogo('dlgTarea');
        avisar('Tarjeta borrada.', 'ok');
        alCambiar();
        await registrarActividad('borrar-tarea', `borró «${t.Title.slice(0, 80)}»`, t.ProyectoId, null);
        alCambiar();
    } catch (e) { avisar('No se pudo borrar: ' + (e && e.message ? e.message : e), 'error'); }
}

// ---------------------------------------------------------------- nueva tarea

export function abrirNuevaTarea() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes crear tarjetas.', 'error'); return; }
    if (p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    opciones($('ntAsignado'), personas(), x => x, x => nombreDe(x, estado.roles), 'sin asignar');
    $('ntAsignado').value = personas().includes(estado.cuenta.username.toLowerCase()) ? estado.cuenta.username.toLowerCase() : '';
    opciones($('ntColumna'), CONFIG.columnas, c => c.clave, c => c.nombre, null);
    $('ntColumna').value = 'por-hacer';
    $('ntTitulo').value = ''; $('ntPrioridad').value = 'normal'; $('ntVence').value = ''; $('ntOrigen').value = ''; $('ntDesc').value = '';
    abrirDialogo('dlgNuevaTarea');
    $('ntTitulo').focus();
}

async function guardarNuevaTarea(ev) {
    ev.preventDefault();
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes crear tarjetas.', 'error'); return; }
    const titulo = $('ntTitulo').value.trim();
    if (!titulo) { avisar('La tarea necesita un título.', 'error'); $('ntTitulo').focus(); return; }
    let vence;
    try { vence = aIsoDia($('ntVence').value); } catch (e) { avisar(e.message, 'error'); return; }
    const columna = $('ntColumna').value || 'por-hacer';
    const ahora = new Date().toISOString();
    const campos = limpiar({
        Title: titulo, ProyectoId: p.id, Columna: columna, Asignado: $('ntAsignado').value || undefined,
        Vence: vence || undefined, Prioridad: $('ntPrioridad').value, Orden: tareasDe(p, estado.tareas).filter(t => t.Columna === columna).length + 1,
        Origen: $('ntOrigen').value.trim() || undefined, Descripcion: $('ntDesc').value.trim() || undefined, Desde: ahora,
        HechoPor: columna === 'hecho' ? estado.cuenta.username : undefined, HechoEl: columna === 'hecho' ? ahora : undefined
    });
    $('ntGuardar').disabled = true;
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.tareas, campos, m => avisar(m, 'ojo'));
        estado.tareas.push(n);
        cerrarDialogo('dlgNuevaTarea');
        avisar(`Tarea creada en ${nombreColumna(columna)}.`, 'ok');
        alCambiar();
        await registrarActividad('crear-tarea', `creó «${titulo.slice(0, 80)}»${campos.Asignado ? ' para ' + nombreDe(campos.Asignado, estado.roles) : ''}`, p.id, n.id);
        alCambiar();
    } catch (e) { avisar('No se pudo crear: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('ntGuardar').disabled = false; }
}

// ---------------------------------------------------------------- enganche

export function engancharTablero() {
    $('filtroTexto').addEventListener('input', () => { estado.filtroTareas.texto = $('filtroTexto').value; if (estado.proyectoAbierto) pintarFiltroTareas(estado.proyectoAbierto); pintarSoloTareas(); });
    $('tCerrar').addEventListener('click', () => cerrarDialogo('dlgTarea'));
    $('dlgTarea').addEventListener('close', () => { fijarHash(hashDe()); });   // al cerrar (boton, Esc o Atras) el hash vuelve a la pantalla
    $('tCompartir').addEventListener('click', compartirTarjeta);
    $('formNota').addEventListener('submit', anotar);
    $('tBorrar').addEventListener('click', borrarTarea);
    $('formTarea').addEventListener('submit', guardarEdicion);
    $('btnNuevaTarea').addEventListener('click', abrirNuevaTarea);
    $('formNuevaTarea').addEventListener('submit', guardarNuevaTarea);
    $('ntCancelar').addEventListener('click', () => cerrarDialogo('dlgNuevaTarea'));
}
