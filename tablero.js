// Tablero de un proyecto: 4 columnas fijas, lista, «Mis tareas», la tarjeta (ver / mover / editar /
// borrar) y la tarea nueva. El movimiento canonico es el boton «Mover a…» (default del plan);
// nada de drag & drop en el piloto.

import { CONFIG } from './config.js';
import { PUEDE, ordenar, tareasDe, sinMovimiento, camposDeMovimiento, nombreDe, diasPara } from './reglas.js';
import { $, L, estado, el, boton, avatar, chip, chipVence, avisar, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, aIsoDia, opciones, limpiar, porId, registrarActividad } from './comun.js';

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
    return b;
}

// ---------------------------------------------------------------- tablero y lista

export function pintarTablero(proyecto) {
    const cont = $('tab-tablero'); cont.textContent = '';
    const ts = tareasDe(proyecto, estado.tareas);
    for (const c of CONFIG.columnas) {
        const col = el('div', 'col'); col.dataset.col = c.clave;
        const h = el('h3', '', c.nombre);
        const cs = ordenar(ts.filter(t => t.Columna === c.clave));
        h.appendChild(el('span', 'n', String(cs.length)));
        col.appendChild(h);
        if (!cs.length) col.appendChild(el('div', 'vacio', c.clave === 'por-hacer' ? 'Nada por hacer.' : '—'));
        for (const t of cs) col.appendChild(tarjeta(t));
        cont.appendChild(col);
    }
}

export function pintarLista(proyecto) {
    const cont = $('tab-lista'); cont.textContent = '';
    const ts = tareasDe(proyecto, estado.tareas).slice().sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')) || a.id - b.id);
    const tabla = el('table'); const thead = el('thead'); const tr = el('tr');
    for (const h of ['Tarea', 'Asignado', 'Columna', 'Vence', 'Origen en la KB']) tr.appendChild(el('th', '', h));
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
    if (!ts.length) { const r = el('tr'); const td = el('td', 'vacio', 'Sin tareas todavía.'); td.colSpan = 5; r.appendChild(td); tbody.appendChild(r); }
    tabla.appendChild(tbody); cont.appendChild(tabla);
}

export function pintarMisTareas() {
    const yo = estado.cuenta.username.toLowerCase();
    $('misTitulo').textContent = 'Mis tareas · ' + nombreDe(yo, estado.roles);
    const cont = $('misLista'); cont.textContent = '';
    const mias = estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === yo && t.Columna !== 'hecho')
        .sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')) || a.id - b.id);
    const porProyecto = new Map();
    for (const t of mias) { if (!porProyecto.has(t.ProyectoId)) porProyecto.set(t.ProyectoId, []); porProyecto.get(t.ProyectoId).push(t); }
    if (!mias.length) { cont.appendChild(el('p', 'vacio', 'Sin tareas abiertas asignadas a ti.')); return; }
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
    const ligas = estado.ligas.filter(l => Number(l.TareaId) === t.id);
    if (ligas.length) { const s = el('span'); for (const l of ligas) { const a = el('a', '', l.Title); if (l.Url) { a.href = l.Url; a.target = '_blank'; a.rel = 'noopener'; } s.appendChild(a); s.appendChild(el('span', '', ' ')); s.appendChild(chip(l.Tipo === 'buzon' ? 'en el buzón' : 'archivado', l.Tipo === 'buzon' ? 'info' : 'ok')); s.appendChild(el('br')); } kv.appendChild(el('b', '', 'Documentos')); kv.appendChild(s); }

    const puedeMover = PUEDE.mover(estado.rol) && !!p && p.Estado === 'activo';
    $('tDeny').classList.toggle('oculto', puedeMover);
    $('tDeny').textContent = !PUEDE.mover(estado.rol) ? 'Tu rol es de lectura: puedes ver la tarjeta, pero moverla lo hace su asignado o cualquier colaborador.' : (p && p.Estado !== 'activo' ? 'El proyecto está cerrado: sus tarjetas quedan como registro.' : '');
    const mv = $('tMover'); mv.textContent = '';
    for (const c of CONFIG.columnas) {
        const b = boton(c.nombre, 'mn-btn is-sm' + (t.Columna === c.clave ? ' is-here' : ''), () => moverTarea(t.id, c.clave), { move: c.clave });
        b.disabled = !puedeMover || t.Columna === c.clave;
        mv.appendChild(b);
    }
    $('tBorrar').disabled = !PUEDE.borrar(estado.rol);
    $('tBorrar').title = PUEDE.borrar(estado.rol) ? '' : 'Solo gerencia borra tarjetas';
    // Editar
    const puedeEditar = PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';
    $('tEditar').classList.toggle('oculto', !puedeEditar);
    $('tEditar').open = false;
    opciones($('ftAsignado'), personas(), x => x, x => nombreDe(x, estado.roles), 'sin asignar');
    $('ftTitulo').value = t.Title || ''; $('ftAsignado').value = String(t.Asignado || '').toLowerCase(); $('ftPrioridad').value = t.Prioridad || 'normal';
    $('ftVence').value = t.Vence ? fechaCorta(t.Vence) : ''; $('ftOrigen').value = t.Origen || ''; $('ftDesc').value = t.Descripcion || '';
    abrirDialogo('dlgTarea');
}

async function moverTarea(id, columna) {
    const t = porId(estado.tareas, id); if (!t) return;
    if (!PUEDE.mover(estado.rol)) { avisar('Tu rol es de lectura: no puedes mover tarjetas.', 'error'); return; }
    const p = porId(estado.proyectos, t.ProyectoId);
    if (!p || p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    const antes = t.Columna;
    const campos = camposDeMovimiento(columna, estado.cuenta.username);
    for (const b of $('tMover').querySelectorAll('button')) b.disabled = true;
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, t.id, campos, m => avisar(m, 'ojo'));
        Object.assign(t, campos);
        cerrarDialogo('dlgTarea');
        avisar(`«${t.Title}» → ${nombreColumna(columna)}.`, 'ok');
        alCambiar();
        await registrarActividad('mover-tarea', `movió «${t.Title.slice(0, 80)}» de ${nombreColumna(antes)} a ${nombreColumna(columna)}`, t.ProyectoId, t.id);
        alCambiar();
    } catch (e) {
        avisar('No se pudo mover: ' + (e && e.message ? e.message : e), 'error');
        for (const b of $('tMover').querySelectorAll('button')) b.disabled = b.dataset.move === t.Columna;
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
    $('btnGuardarTarea').disabled = true;
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, t.id, campos, m => avisar(m, 'ojo'));
        Object.assign(t, campos);
        cerrarDialogo('dlgTarea');
        avisar('Tarjeta actualizada.', 'ok');
        alCambiar();
        await registrarActividad('editar-tarea', cambioAsignado && campos.Asignado ? `asignó «${titulo.slice(0, 80)}» a ${nombreDe(campos.Asignado, estado.roles)}` : `editó «${titulo.slice(0, 80)}»`, t.ProyectoId, t.id);
        alCambiar();
    } catch (e) { avisar('No se pudo guardar: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('btnGuardarTarea').disabled = false; }
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
            try { await estado.cliente.actualizarRenglon(estado.siteId, L.ligas, l.id, { TareaId: null }); l.TareaId = null; } catch (_) { /* se queda colgada */ }
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
    $('tCerrar').addEventListener('click', () => cerrarDialogo('dlgTarea'));
    $('tBorrar').addEventListener('click', borrarTarea);
    $('formTarea').addEventListener('submit', guardarEdicion);
    $('btnNuevaTarea').addEventListener('click', abrirNuevaTarea);
    $('formNuevaTarea').addEventListener('submit', guardarNuevaTarea);
    $('ntCancelar').addEventListener('click', () => cerrarDialogo('dlgNuevaTarea'));
}
