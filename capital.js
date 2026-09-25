// MINSA Proyectos — v0.100.0: Capital de trabajo (Carlos, 25-sep: «una nueva pestaña para calcular cuánto capital de trabajo
// falta / es necesario … y que se ligue a algún proyecto»). Partidas ESTIMADAS en PROY_Capital (necesidad | fondeo, MXN),
// cada una con su ProyectoId. Solo gerencia la ve y la edita. Las cuentas son puras (reglas.js: resumenCapital,
// capitalPorProyecto, totalCapital, capitalPorMes, ordenarPartidas); aqui solo se pinta y se escribe.
// Sin bitacora en PROY_Actividad: su choice `Accion` no tiene opcion para esto y la actividad la lee todo el equipo.

import { esConflicto } from './graph.js';
import { PUEDE, CAPITAL_CATEGORIAS, CAPITAL_TIPOS, formatoMXN, leerMonto, validarPartida, resumenCapital, capitalPorProyecto, totalCapital, capitalPorMes, ordenarPartidas, ordenarProyectos, activosDe, diaDe } from './reglas.js';
import { $, L, estado, el, avisar, abrirDialogo, cerrarDialogo, confirmar, fijarGuarda, opciones, porId, aplicar, pedirRelectura, fechaCorta, aIsoDia, diaInput, fechaInput, limpiar, equipoDe, iconoEquipo, iconoSvg, fijarHash, hashDe, mayusculasEnVivo } from './comun.js';

let repintar = () => {};
export function alCambiarCapital(fn) { repintar = fn; }
let irAProyecto = () => {};
/** app.js le pasa como abrir un proyecto (la cabecera de cada grupo lleva a su frente). */
export function fijarIrAProyecto(fn) { irAProyecto = fn; }

const MES_LARGO = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const rotuloMes = mes => mes ? MES_LARGO.format(new Date(mes + '-01T12:00:00Z')) : 'Sin fecha';
const TIPO = Object.fromEntries(CAPITAL_TIPOS);
const COLUMNAS = [['c-concepto', 'Concepto', 'concepto'], ['c-tipo', 'Tipo', 'tipo'], ['c-cat', 'Categoría', 'categoria'], ['c-fecha', 'Fecha', 'fecha'], ['c-estado', 'Estado', 'estado'], ['c-monto', 'Monto', 'monto']];

/** ¿Esta persona ve Capital? (rol + la lista leida). La lista ausente SI se ve: es donde se avisa que falta. */
export const puedeVerCapital = () => PUEDE.capital(estado.rol);

/** Las partidas de un proyecto y su resumen (para la tarjeta del Resumen del proyecto). */
export function capitalDe(proyectoId) { return resumenCapital(estado.capital.filter(x => Number(x.ProyectoId) === Number(proyectoId))); }

/** Proyectos que ofrece el select: los activos + los que ya tienen partidas (un cerrado con partidas se sigue viendo) + el elegido. */
function proyectosDelFiltro() {
    const ids = new Set(estado.capital.map(x => Number(x.ProyectoId)));
    if (estado.filtroCapital) ids.add(estado.filtroCapital);
    return ordenarProyectos(estado.proyectos.filter(p => p.Estado === 'activo' || ids.has(p.id)));
}

export function pintarCapital() {
    const ver = puedeVerCapital();
    $('btnNuevaPartida').classList.toggle('oculto', !ver || estado.capitalLista !== true);
    const aviso = $('capitalFalta');
    const falta = estado.capitalLista === false;
    aviso.classList.toggle('oculto', !falta && !estado.capitalError);
    aviso.classList.toggle('is-error', !falta && !!estado.capitalError);
    aviso.textContent = falta ? 'Falta crear la lista PROY_Capital (ver README, «Al publicar v0.100.0»). Mientras tanto no hay partidas que mostrar; el resto de la app funciona igual.'
        : estado.capitalError ? 'No se pudo leer PROY_Capital: ' + estado.capitalError : '';
    $('capitalCuerpo').classList.toggle('oculto', !ver || estado.capitalLista !== true);
    if (!ver || estado.capitalLista !== true) return;
    // el filtro: un proyecto que ya no existe cae a «Todos»
    if (estado.filtroCapital && !porId(estado.proyectos, estado.filtroCapital)) estado.filtroCapital = null;
    const sel = $('capitalProyecto');
    opciones(sel, proyectosDelFiltro(), p => p.id, p => p.Estado === 'activo' ? p.Title : `${p.Title} (cerrado)`, 'Todos los proyectos');
    sel.value = estado.filtroCapital ? String(estado.filtroCapital) : '';
    const partidas = estado.filtroCapital ? estado.capital.filter(x => Number(x.ProyectoId) === estado.filtroCapital) : estado.capital;
    const grupos = capitalPorProyecto(partidas, estado.proyectos);
    const t = totalCapital(grupos);
    const fp = estado.filtroCapital ? porId(estado.proyectos, estado.filtroCapital) : null;
    $('capitalSub').textContent = fp ? `Capital de trabajo estimado de «${fp.Title}». En pesos (MXN).` : 'Capital de trabajo estimado por proyecto: lo necesario, lo cubierto y lo que falta. En pesos (MXN).';
    pintarKpis(t);
    pintarTabla(grupos, partidas.length);
    pintarMeses(partidas);
}

// v0.101.0 (Carlos, 25-sep; artifact QSAqBmdn ronda 3): los 4 KPI salen. El total es UN renglon con la misma forma que la
// cabecera de cada proyecto (nombre a la izquierda; Necesario · Cubierto · Falta a la derecha): arriba y abajo se leen igual.
const PARTIDAS = n => `${n} ${n === 1 ? 'partida' : 'partidas'}`;

/** Necesario · Cubierto · Falta en columnas alineadas a la derecha (el total y cada cabecera de proyecto). */
function cifras(r) {
    const c = el('div', 'ccifras');
    const par = (clave, rotulo, valor, cls = '') => {
        const d = el('div'); d.dataset.kpi = clave;
        d.appendChild(el('span', 'mn-label', rotulo)); d.appendChild(el('b', cls, valor));
        c.appendChild(d);
    };
    par('necesario', 'Necesario', formatoMXN(r.necesario));
    par('cubierto', 'Cubierto', formatoMXN(r.cubierto), 'is-ok');
    par('falta', 'Falta', r.falta > 0 ? formatoMXN(r.falta) : '—', r.falta > 0 ? 'is-danger' : 'is-ok');
    return c;
}

function pintarKpis(t) {
    const c = $('capitalKpis'); c.textContent = '';
    const nombre = el('span', 'cnombre');
    nombre.appendChild(el('span', 't', estado.filtroCapital ? 'Este proyecto' : 'Todos los proyectos'));
    const n = el('span', 'n', PARTIDAS(t.n) + (t.pagado ? ` · ${formatoMXN(t.pagado)} ya pagado` : '')); n.dataset.kpi = 'n';
    nombre.appendChild(n);
    c.appendChild(nombre); c.appendChild(cifras(t));
}

function encabezado() {
    const w = el('div', 'dtabla ctabla'); const t = el('table'); const th = el('thead'); const tr = el('tr');
    const o = estado.ordenCapital;
    for (const [cls, texto, clave] of COLUMNAS) {
        const h = el('th', cls, texto); h.scope = 'col';
        const activo = o.col === clave;
        h.dataset.sort = clave; h.tabIndex = 0;
        h.title = activo ? `Ordenar por ${texto.toLowerCase()} ${o.dir === 1 ? 'descendente' : 'ascendente'}` : `Ordenar por ${texto.toLowerCase()}`;
        if (activo) h.setAttribute('aria-sort', o.dir === 1 ? 'ascending' : 'descending');
        const elegir = () => { estado.ordenCapital = activo ? { col: clave, dir: -o.dir } : { col: clave, dir: clave === 'monto' ? -1 : 1 }; repintar(); };   // v0.102.0: repintar() cubre la seccion y la pestaña del proyecto
        h.addEventListener('click', elegir);
        h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } });
        tr.appendChild(h);
    }
    th.appendChild(tr); t.appendChild(th); t.appendChild(el('tbody')); w.appendChild(t);
    return w;
}

function pintarTabla(grupos, n) {
    const cont = $('capitalTabla'); cont.textContent = '';
    if (!n) {
        cont.appendChild(el('p', 'vacio', estado.filtroCapital ? 'Este proyecto no tiene partidas todavía. «Nueva partida» agrega la primera.' : 'Sin partidas todavía. «Nueva partida» agrega la primera: un concepto, el proyecto y el monto estimado.'));
        return;
    }
    // v0.101.0: un acordeon por proyecto (cabecera = nombre + sus tres cifras; al abrir, su tabla). Nace abierto; lo que
    // Carlos pliega se recuerda en la sesion (estado.capitalPlegados) para que un repintado no le reabra nada.
    const acor = el('div', 'cacor');
    for (const g of grupos) {
        const d = el('details', 'cgrupo'); d.dataset.capitalProyecto = String(g.proyectoId);
        d.open = !estado.capitalPlegados.has(g.proyectoId);
        d.addEventListener('toggle', () => { if (d.open) estado.capitalPlegados.delete(g.proyectoId); else estado.capitalPlegados.add(g.proyectoId); });
        const s = el('summary', 'cfila');
        s.appendChild(iconoSvg(['M9 6l6 6-6 6'], 'fl'));
        const nombre = el('span', 'cnombre');
        if (g.proyecto) {
            // el nombre es boton (abre el frente); el resto de la cabecera pliega. Un boton dentro de <summary> no la pliega.
            const b = el('button', 'cgrupo-nombre'); b.type = 'button'; b.title = 'Abrir el proyecto';
            b.appendChild(iconoEquipo(equipoDe(g.proyecto), 'sm')); b.appendChild(el('span', 't', g.proyecto.Title + (g.proyecto.Estado === 'activo' ? '' : ' (cerrado)')));
            b.addEventListener('click', () => irAProyecto(g.proyecto));
            nombre.appendChild(b);
        } else nombre.appendChild(el('span', 'cgrupo-nombre t', `Proyecto eliminado (#${g.proyectoId})`));
        nombre.appendChild(el('span', 'n', String(g.partidas.length)));
        s.appendChild(nombre); s.appendChild(cifras(g));
        d.appendChild(s);
        d.appendChild(tablaPartidas(g.partidas)); acor.appendChild(d);
    }
    cont.appendChild(acor);
}

/** La tabla de partidas (encabezado ordenable + un renglon por partida), en el orden de estado.ordenCapital. */
function tablaPartidas(partidas) {
    const w = encabezado(); const tb = w.querySelector('tbody');
    for (const x of ordenarPartidas(partidas, estado.ordenCapital.col, estado.ordenCapital.dir)) tb.appendChild(filaPartida(x));
    return w;
}

/** v0.102.0 (Carlos, 25-sep): la pestaña «Capital» DENTRO del proyecto — su total (misma forma que la seccion) y sus partidas. */
export function pintarCapitalTab(p) {
    const tot = $('pcapTotal'); tot.textContent = '';
    const mias = estado.capital.filter(x => Number(x.ProyectoId) === p.id);
    const r = resumenCapital(mias);
    const nombre = el('span', 'cnombre');
    nombre.appendChild(el('span', 't', 'Capital de trabajo'));
    nombre.appendChild(el('span', 'n', PARTIDAS(r.n) + (r.pagado ? ` · ${formatoMXN(r.pagado)} ya pagado` : '')));
    tot.appendChild(nombre); tot.appendChild(cifras(r));
    const cont = $('pcapTabla'); cont.textContent = '';
    if (!mias.length) { cont.appendChild(el('p', 'vacio', 'Este proyecto no tiene partidas todavía. «Nueva partida» agrega la primera.')); return; }
    cont.appendChild(tablaPartidas(mias));
}

function filaPartida(x) {
    const tr = el('tr', 'partida' + (x.Tipo === 'fondeo' ? ' is-fondeo' : '')); tr.dataset.partida = String(x.id);
    const tdc = el('td', 'c-concepto');
    const b = el('button', 'partida-t', x.Title || '(sin concepto)'); b.type = 'button'; b.title = 'Editar la partida';
    b.addEventListener('click', () => abrirPartida(x.id));
    tdc.appendChild(b);
    // en celular las columnas chicas se esconden y este renglon las dice (estilo.css .ctabla .p)
    tdc.appendChild(el('span', 'p', [TIPO[x.Tipo] || x.Tipo, x.Categoria, x.Fecha ? fechaCorta(x.Fecha) : 'sin fecha', x.Estado].filter(Boolean).join(' · ')));
    if (x.Notas) tdc.title = x.Notas;
    tr.appendChild(tdc);
    tr.appendChild(el('td', 'c-tipo tipo-' + (x.Tipo || 'otro'), TIPO[x.Tipo] || x.Tipo || '—'));
    tr.appendChild(el('td', 'c-cat', x.Categoria || '—'));
    tr.appendChild(el('td', 'c-fecha', x.Fecha ? fechaCorta(x.Fecha) : '—'));
    tr.appendChild(el('td', 'c-estado estado-' + (x.Estado || ''), x.Estado || '—'));
    tr.appendChild(el('td', 'c-monto', (x.Tipo === 'fondeo' ? '+ ' : '') + formatoMXN(x)));
    return tr;
}

function pintarMeses(partidas) {
    const cont = $('capitalMeses'); cont.textContent = '';
    const meses = capitalPorMes(partidas);
    if (!meses.length) { cont.appendChild(el('p', 'vacio', 'Sin partidas que repartir por mes.')); return; }
    const w = el('div', 'dtabla ctabla cmeses'); const t = el('table'); const th = el('thead'); const tr = el('tr');
    for (const [cls, texto] of [['c-mes', 'Mes'], ['c-monto', 'Necesidad'], ['c-monto', 'Fondeo'], ['c-n', 'Partidas']]) { const h = el('th', cls, texto); h.scope = 'col'; tr.appendChild(h); }
    th.appendChild(tr); t.appendChild(th); const tb = el('tbody'); t.appendChild(tb);
    for (const m of meses) {
        const f = el('tr', 'mes'); f.dataset.mes = m.mes || 'sin-fecha';
        f.appendChild(el('td', 'c-mes', rotuloMes(m.mes)));
        f.appendChild(el('td', 'c-monto', formatoMXN(m.necesidad)));
        f.appendChild(el('td', 'c-monto', m.fondeo ? '+ ' + formatoMXN(m.fondeo) : '—'));
        f.appendChild(el('td', 'c-n', String(m.n)));
        tb.appendChild(f);
    }
    w.appendChild(t); cont.appendChild(w);
}

/** La tarjeta «Capital de trabajo» del Resumen del proyecto (solo gerencia, y solo con la lista existente). */
export function pintarCapitalProyecto(p) {
    const card = $('pCapital');
    const ver = puedeVerCapital() && estado.capitalLista === true && !!p;
    card.classList.toggle('oculto', !ver);
    if (!ver) return;
    const r = capitalDe(p.id);
    const kv = $('pCapitalKv'); kv.textContent = '';
    const par = (k, v, cls) => { kv.appendChild(el('b', '', k)); kv.appendChild(el('span', cls || '', v)); };
    if (!r.n) { par('Partidas', 'ninguna todavía'); }
    else {
        par('Falta', formatoMXN(r.falta), r.falta > 0 ? 'is-danger' : 'is-ok');
        par('Necesario', formatoMXN(r.necesario)); par('Cubierto', formatoMXN(r.cubierto));
        if (r.pagado) par('Ya pagado', formatoMXN(r.pagado));
    }
    $('pCapitalIr').textContent = r.n ? `Ver las ${r.n} partida${r.n === 1 ? '' : 's'}` : 'Agregar una partida';
    $('pCapitalIr').dataset.clave = p.Clave || '';
}

// ---------------------------------------------------------------- nueva / editar / borrar partida

let enEdicionId = null, alAbrir = '', preguntando = false;
$('cpConcepto').addEventListener('input', () => mayusculasEnVivo($('cpConcepto')));   // v0.107.0
const CAMPOS = ['cpConcepto', 'cpProyecto', 'cpTipo', 'cpMonto', 'cpFecha', 'cpCategoria', 'cpEstado', 'cpNotas'];
const valores = () => JSON.stringify(CAMPOS.map(id => $(id).value));
const sucio = () => $('dlgPartida').open && valores() !== alAbrir;

/** v0.103.0: con `proyectoId` (pestaña Capital del proyecto) el select Proyecto nace fijo en ese frente y no se mueve. */
export function abrirPartida(id, proyectoId = null) {
    if (!puedeVerCapital()) { avisar('Solo gerencia ve y edita el capital de trabajo.', 'error'); return; }
    if (estado.capitalLista !== true) { avisar('Falta crear la lista PROY_Capital (ver README, «Al publicar v0.100.0»).', 'error'); return; }
    const x = id ? porId(estado.capital, id) : null;
    if (id && !x) { avisar('Esa partida ya no existe: alguien la borró.', 'error'); return; }
    enEdicionId = x ? x.id : null;
    $('cpTituloDlg').textContent = x ? 'Editar partida' : 'Nueva partida';
    $('cpGuardar').textContent = x ? 'Guardar cambios' : 'Guardar partida';
    $('cpBorrar').classList.toggle('oculto', !x);
    const lista = ordenarProyectos(activosDe(estado.proyectos));
    const actual = x ? porId(estado.proyectos, x.ProyectoId) : proyectoId ? porId(estado.proyectos, proyectoId) : null;
    if (actual && !lista.includes(actual)) lista.unshift(actual);
    opciones($('cpProyecto'), lista, p => p.id, p => p.Estado === 'activo' ? p.Title : `${p.Title} (cerrado)`, '— elige el proyecto —');
    if (x && !actual) { const o = el('option', '', `Proyecto eliminado (#${x.ProyectoId})`); o.value = String(x.ProyectoId); $('cpProyecto').appendChild(o); }
    // v0.103.0 (Carlos, 25-sep): Categoría es un plegable; una categoria vieja escrita a mano se conserva como opcion extra.
    const cats = [...CAPITAL_CATEGORIAS]; if (x && x.Categoria && !cats.includes(x.Categoria)) cats.push(x.Categoria);
    opciones($('cpCategoria'), cats, c => c, c => c, '— elige la categoría —');
    $('cpConcepto').value = x ? x.Title || '' : '';
    $('cpProyecto').value = x ? String(x.ProyectoId) : proyectoId ? String(proyectoId) : estado.filtroCapital ? String(estado.filtroCapital) : '';
    $('cpProyecto').disabled = !!proyectoId;
    $('cpTipo').value = x && x.Tipo === 'fondeo' ? 'fondeo' : 'necesidad';
    $('cpMonto').value = x ? String(x.Monto ?? '') : '';
    $('cpFecha').value = fechaInput(x && x.Fecha);
    $('cpCategoria').value = x ? x.Categoria || '' : '';
    $('cpEstado').value = x && x.Estado ? x.Estado : 'estimado';
    $('cpNotas').value = x ? x.Notas || '' : '';
    alAbrir = valores();
    abrirDialogo('dlgPartida');
    $('cpConcepto').focus();
}

async function cancelar() {
    if (!sucio()) { cerrarDialogo('dlgPartida'); return; }
    if (preguntando) return;
    preguntando = true;
    const { ok } = await confirmar({ titulo: enEdicionId ? '¿Descartar los cambios?' : '¿Descartar la partida a medio escribir?', ok: 'Descartar', texto: 'Lo que escribiste no se ha guardado.' });
    preguntando = false;
    if (ok) cerrarDialogo('dlgPartida'); else if ($('dlgPartida').open) $('cpConcepto').focus();
}

/** Lo que el formulario dice, en los nombres de la lista; null en un campo vacio (para que el PATCH lo borre). */
function leerForma() {
    const monto = leerMonto($('cpMonto').value);
    const fecha = aIsoDia($('cpFecha').value);   // lanza con mensaje si la fecha no existe
    return {
        Title: $('cpConcepto').value.trim().toLocaleUpperCase('es-MX'),   /* v0.107.0 (Carlos, 25-sep): MAYUSCULAS */ ProyectoId: Number($('cpProyecto').value) || null, Tipo: $('cpTipo').value,
        Monto: monto, Categoria: $('cpCategoria').value.trim() || null, Fecha: fecha, Estado: $('cpEstado').value, Notas: $('cpNotas').value.trim() || null
    };
}
const igual = (k, a, b) => { const n = v => v === null || v === undefined ? '' : k === 'Fecha' ? String(diaDe(v) || '') : String(v); return n(a) === n(b); };

async function guardar(ev) {
    ev.preventDefault();
    if (!puedeVerCapital()) { avisar('Solo gerencia ve y edita el capital de trabajo.', 'error'); return; }
    let c;
    try { c = leerForma(); } catch (e) { avisar(e.message, 'error'); $('cpFecha').focus(); return; }
    if (c.Monto === null && $('cpMonto').value.trim()) { avisar('Monto: escríbelo en pesos, mayor que cero y con 2 decimales a lo más (p. ej. 10000 o 10,000.50).', 'error'); $('cpMonto').focus(); return; }
    const v = validarPartida(c);
    if (!v.ok) { avisar(v.motivo, 'error'); return; }
    $('cpGuardar').disabled = true;
    let hecho = '';
    try {
        if (enEdicionId) {
            const x = porId(estado.capital, enEdicionId);
            if (!x) { cerrarDialogo('dlgPartida'); avisar('Esa partida ya no existe: alguien la borró.', 'error'); repintar(); return; }
            const campos = {}; for (const k in c) if (!igual(k, x[k], c[k])) campos[k] = c[k];
            if (!Object.keys(campos).length) { cerrarDialogo('dlgPartida'); avisar('Sin cambios que guardar.', 'ojo'); return; }
            const res = await estado.cliente.actualizarRenglon(estado.siteId, L.capital, x.id, campos, m => avisar(m, 'ojo'), x._etag);
            aplicar(porId(estado.capital, x.id) || x, campos, res && res._etag);   // tras el await se re-resuelve: una relectura pudo cambiar el objeto
            hecho = `Partida «${c.Title}» actualizada.`;
        } else {
            const nuevo = await estado.cliente.crearRenglon(estado.siteId, L.capital, limpiar({ ...c, Categoria: c.Categoria || undefined, Fecha: c.Fecha || undefined, Notas: c.Notas || undefined }), m => avisar(m, 'ojo'));
            estado.capital.push(nuevo);
            hecho = `Partida «${c.Title}» agregada: ${formatoMXN(c.Monto)}.`;
        }
    } catch (e) {
        if (esConflicto(e)) { await pedirRelectura(); avisar('Alguien cambió esta partida hace un momento: se releyó. Lo que escribiste sigue aquí; revisa y vuelve a guardar.', 'ojo'); return; }
        avisar('No se pudo guardar la partida: ' + (e && e.message ? e.message : e), 'error'); return;
    } finally { $('cpGuardar').disabled = false; }
    cerrarDialogo('dlgPartida');
    avisar(hecho, 'ok'); repintar();
}

async function borrar() {
    if (!puedeVerCapital()) { avisar('Solo gerencia ve y edita el capital de trabajo.', 'error'); return; }
    const x = enEdicionId && porId(estado.capital, enEdicionId); if (!x) return;
    const { ok } = await confirmar({ titulo: 'Borrar la partida', ok: 'Borrar', texto: `«${x.Title}» (${formatoMXN(x)}) sale del capital de trabajo. El renglón va a la papelera del sitio.` });
    if (!ok) return;
    try {
        await estado.cliente.borrarRenglon(estado.siteId, L.capital, x.id, m => avisar(m, 'ojo'));
        estado.capital = estado.capital.filter(y => y.id !== x.id);
    } catch (e) { avisar('No se pudo borrar la partida: ' + (e && e.message ? e.message : e), 'error'); return; }
    alAbrir = valores();   // ya no hay nada «a medio escribir»: el renglon se fue
    cerrarDialogo('dlgPartida');
    avisar(`Partida «${x.Title}» borrada.`, 'ok'); repintar();
}

export function engancharCapital() {
    $('btnNuevaPartida').addEventListener('click', () => abrirPartida(null));
    $('formPartida').addEventListener('submit', guardar);
    $('cpCancelar').addEventListener('click', cancelar);
    $('cpBorrar').addEventListener('click', borrar);
    fijarGuarda('dlgPartida', { sucio, intentar: cancelar });
    $('dlgPartida').addEventListener('cancel', ev => { if (sucio()) { ev.preventDefault(); cancelar(); } });   // Esc
    $('capitalProyecto').addEventListener('change', () => { estado.filtroCapital = Number($('capitalProyecto').value) || null; pintarCapital(); fijarHash(hashDe()); });
}
