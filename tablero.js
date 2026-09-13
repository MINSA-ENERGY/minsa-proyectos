// Tablero de un proyecto: sus cubetas (columnas), lista, «Mis tareas», la tarjeta (ver / mover /
// editar / borrar), la tarea nueva y el editor de cubetas. El movimiento canonico es el boton
// «Mover a…» (default del plan); nada de drag & drop en el piloto. v0.3.0 sumo el filtro y el orden
// dentro del proyecto (F9/F10), Subir/Bajar y mover de proyecto (F11), las pestanas de columna en
// celular (U5) y el 412 de If-Match (T1): se relee, no se pisa. v0.11.0 (Carlos, 12-sep): las
// cubetas se renombran, agregan y quitan POR PROYECTO (PROY_Proyectos.Columnas); el atajo
// «→ siguiente» de la cara de la tarjeta se quito, y «Origen en la KB» ya no se ensena ni se pide.

import { CONFIG } from './config.js';
import { PUEDE, ordenar, tareasDe, sinMovimiento, camposDeMovimiento, nombreDe, diasPara, estadoVence, filtrarTareas, ordenarLista, reordenar, sinAcentos, columnasDe, normalizarColumnas, nombreColumnaEn, claseDeColumna, HECHO, MAX_COLUMNAS, MAX_NOMBRE_COLUMNA } from './reglas.js';
import { $, L, estado, el, boton, avatar, chip, chipVence, avisar, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, fechaHora, aIsoDia, diaInput, atajosFecha, opciones, limpiar, porId, registrarActividad, hashDe, fijarHash, irAHash, ligaDeTarjeta, notasDe, aplicar, pedirRelectura, equipoDe, iconoEquipo, iconoArchivo, textoConMenciones, insignia, TRAZOS, iconoSvg, puedeBorrarComentario, borrarComentario, columnasDeTarea } from './comun.js';
import { abrirLigar, abrirSubir, abrirEnlace, quitarLiga, puedeLigarEn, puedeEnlazarEn } from './docs.js';
import { esConflicto } from './graph.js';
import { engancharSelectorMenciones } from './chat.js';

let alCambiar = () => {};   // app.js la pone: repinta la pantalla actual tras una escritura
export function alCambiarTareas(fn) { alCambiar = fn; }

/** Nombre de la cubeta de una tarjeta segun SU proyecto (v0.11.0: ya no hay una lista global). */
const nombreColumna = t => nombreColumnaEn(t.Columna, columnasDeTarea(t));
/** Chip de cubeta: verde hecho, azul en proceso, sin color la primera. */
const chipColumna = t => chip(nombreColumna(t), t.Columna === HECHO ? 'ok' : claseDeColumna(t.Columna, columnasDeTarea(t)) === 'p' ? null : 'info');
/**
 * Las cubetas de un proyecto MAS las huerfanas: una tarjeta cuya cubeta alguien quito (o que llego de
 * otro proyecto con una clave que aqui no existe) no desaparece: se pinta en una columna de nombre
 * igual a su clave, marcada, para que alguien la mueva. La E2E lo prueba.
 */
function columnasConHuerfanas(p, ts) {
    const cols = columnasDe(p);
    for (const t of ts) if (!cols.some(c => c.clave === t.Columna)) cols.push({ clave: t.Columna, nombre: t.Columna, huerfana: true });
    return cols;
}
const personas = () => estado.roles.filter(r => r.Activo !== false).map(r => String(r.Title || '').toLowerCase()).filter(Boolean);

// ---------------------------------------------------------------- tarjeta (elemento)

export function tarjeta(t, conProyecto = false) {
    // D4 (v0.6.0): la prioridad alta es un atributo estable y va como BORDE izquierdo; el chip rojo
    // se queda solo para «venció» — dos rojos lado a lado se leian como dos vencimientos.
    const b = el('button', 'tarjeta' + (t.Prioridad === 'alta' ? ' alta' : '')); b.type = 'button'; b.dataset.t = String(t.id);
    if (t.Prioridad === 'alta') b.title = 'Prioridad alta';
    b.appendChild(el('span', 't', t.Title));
    const f = el('span', 'f');
    f.appendChild(avatar(t.Asignado));
    f.appendChild(el('span', '', t.Asignado ? nombreDe(t.Asignado, estado.roles).split(' ')[0] : 'sin asignar'));
    if (conProyecto) { const p = porId(estado.proyectos, t.ProyectoId); if (p) f.appendChild(chip(p.Clave)); }
    if (conProyecto) f.appendChild(chipColumna(t));
    const v = chipVence(t); if (v) f.appendChild(v);
    if (estado.ligas.some(l => Number(l.TareaId) === t.id && l.Tipo === 'buzon')) f.appendChild(chip('en el buzón', 'info'));
    if (sinMovimiento([t], CONFIG.sinMovimientoDias, new Date(), columnasDeTarea).length) f.appendChild(el('span', 'stale', `· sin movimiento ${-diasPara(t.Desde)} días`));
    // v0.8.0: insignias de la cara (Trello): cuantas notas y cuantos documentos trae, sin abrirla.
    const nNotas = notasDe(t.id).length, nDocs = estado.ligas.filter(l => Number(l.TareaId) === t.id).length;
    if (nNotas) f.appendChild(insignia(TRAZOS.burbuja, nNotas, `${nNotas} nota${nNotas === 1 ? '' : 's'}`, 'is-notas'));
    if (nDocs) f.appendChild(insignia(TRAZOS.clip, nDocs, `${nDocs} documento${nDocs === 1 ? '' : 's'}`, 'is-docs'));
    b.appendChild(f);
    b.addEventListener('click', () => abrirTarjeta(t.id));
    // La caja se conserva (la rejilla de Mis tareas y la E2E la conocen); desde v0.11.0 solo trae la
    // tarjeta: el atajo «→ siguiente» (U7) se quito a pedido de Carlos — mover es abrir y «Mover a…».
    const caja = el('div', 'tarjeta-caja'); caja.appendChild(b);
    return caja;
}

// ---------------------------------------------------------------- filtro dentro del proyecto (F9)

const CHIPS_FILTRO = [['alta', 'solo alta'], ['vencidas', 'solo vencidas'], ['sinDueno', 'sin dueño']];   // C7 (v0.6.0)
/** Chips de filtro: una por persona con tarjetas en el proyecto, «solo alta» y «solo vencidas». El texto vive en #filtroTexto. */
export function pintarFiltroTareas(proyecto) {
    const f = estado.filtroTareas; const c = $('filtroChips'); c.textContent = '';
    const ts = tareasDe(proyecto, estado.tareas);
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))].sort();
    const chipBtn = (texto, on, alClic, datos, conAvatar) => {
        const b = boton('', on ? 'is-on' : '', () => { alClic(); pintarFiltroTareas(proyecto); pintarSoloTareas(); }, datos);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (conAvatar) b.appendChild(avatar(conAvatar));
        // B4: en celular el nombre se oculta por CSS y queda el avatar; el nombre vive en el title.
        b.appendChild(el('span', 'nom', texto)); if (conAvatar) b.title = texto; c.appendChild(b);
    };
    const pilas = quienes.map(q => nombreDe(q, estado.roles).split(' ')[0]);
    for (const [i, q] of quienes.entries()) {
        const nombre = pilas.filter(x => x === pilas[i]).length > 1 ? nombreDe(q, estado.roles) : pilas[i];   // dos «Ana»: nombre completo
        chipBtn(nombre, f.quien === q, () => { f.quien = f.quien === q ? null : q; }, { quien: q }, q);
    }
    for (const [k, texto] of CHIPS_FILTRO) chipBtn(texto, !!f[k], () => { f[k] = !f[k]; }, { filtro: k });
    const activo = !!(f.quien || f.alta || f.vencidas || f.sinDueno || f.texto);
    if (activo) chipBtn('× limpiar', false, () => { estado.filtroTareas = { quien: null, alta: false, vencidas: false, sinDueno: false, texto: '' }; $('filtroTexto').value = ''; }, { filtro: 'limpiar' });
}
/** B1: «Filtrar» dice cuantos filtros hay puestos; sin eso, plegarlos los esconde en silencio.
 *  v0.6.0: vive aqui (no en app.js) para repintarse con CADA cambio de filtro — un chip pulsado
 *  dejaba el boton en «Filtrar» hasta el siguiente repintado de la pantalla (lo cazo la E2E de C7). */
export function pintarBotonFiltros() {
    const f = estado.filtroTareas;
    const n = [f.quien, f.alta, f.vencidas, f.sinDueno, f.texto].filter(Boolean).length;
    const b = $('btnFiltros');
    b.textContent = n ? `Filtrar · ${n}` : 'Filtrar';
    b.classList.toggle('is-on', !!n || estado.filtrosAbiertos);
    b.setAttribute('aria-expanded', estado.filtrosAbiertos ? 'true' : 'false');
    b.classList.toggle('oculto', ['docs', 'chat', 'resumen'].includes(estado.tab));
}
/** Repinta solo el tablero o la lista (no la pantalla entera: el foco del cuadro de texto se queda). */
function pintarSoloTareas() {
    const p = estado.proyectoAbierto; if (!p) return;
    pintarBotonFiltros();
    if (estado.tab === 'tablero') pintarTablero(p); else if (estado.tab === 'lista') pintarLista(p);
}
const tareasVisibles = proyecto => filtrarTareas(tareasDe(proyecto, estado.tareas), estado.filtroTareas);

// ---------------------------------------------------------------- tablero y lista

const HECHO_VISIBLES = 5;
export function pintarTablero(proyecto) {
    const cont = $('tableroCols'); cont.textContent = '';
    const ts = tareasVisibles(proyecto);
    const filtrado = ts.length !== tareasDe(proyecto, estado.tareas).length;
    // v0.11.0: las cubetas son las del proyecto (mas las huerfanas, si una tarjeta quedo en una que ya no existe).
    const columnas = columnasConHuerfanas(proyecto, tareasDe(proyecto, estado.tareas));
    // U5: en celular se ve UNA columna y estas pestanas la eligen; en escritorio el CSS las esconde.
    const tabs = $('colTabs'); tabs.textContent = '';
    if (!columnas.some(c => c.clave === estado.colMovil)) estado.colMovil = columnas[0].clave;
    for (const c of columnas) {
        const n = ts.filter(t => t.Columna === c.clave).length;
        const b = boton('', estado.colMovil === c.clave ? 'is-on' : '', () => { estado.colMovil = c.clave; pintarTablero(proyecto); }, { colTab: c.clave });
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', estado.colMovil === c.clave ? 'true' : 'false');
        b.appendChild(el('span', '', c.nombre)); b.appendChild(el('span', 'n', String(n)));
        tabs.appendChild(b);
    }
    // Mas de 4 cubetas: la rejilla las reparte (el CSS lee data-n); en celular sigue siendo una a la vez.
    $('tableroCols').dataset.n = String(columnas.length);
    for (const [i, c] of columnas.entries()) {
        const col = el('div', 'col' + (estado.colMovil === c.clave ? ' is-activa' : '') + (c.huerfana ? ' is-huerfana' : '')); col.dataset.col = c.clave;
        col.dataset.cls = claseDeColumna(c.clave, columnas);   // v0.11.0: el color del punto va por POSICION, no por nombre
        const h = el('h3'); h.appendChild(el('i', 'punto')); h.appendChild(el('span', '', c.nombre));   // v0.8.0: el punto lleva el color de la barra segmentada
        if (c.huerfana) h.title = 'Esta cubeta ya no existe en el proyecto: mueve sus tarjetas a otra.';
        let cs = ordenar(ts.filter(t => t.Columna === c.clave));
        h.appendChild(el('span', 'n', String(cs.length)));
        col.appendChild(h);
        if (!cs.length) col.appendChild(el('div', 'vacio', filtrado ? 'Nada con ese filtro.' : i === 0 ? 'Nada por hacer.' : '—'));
        // U6: Hecho enseña las ultimas HECHO_VISIBLES (por HechoEl) y un boton para el resto; la cuenta de arriba es la real.
        let ocultas = 0;
        if (c.clave === HECHO) {
            cs = cs.slice().sort((a, b) => String(b.HechoEl || '').localeCompare(String(a.HechoEl || '')) || a.id - b.id);   // lo ultimo hecho, arriba
            if (!estado.hechoTodas && cs.length > HECHO_VISIBLES) { ocultas = cs.length - HECHO_VISIBLES; cs = cs.slice(0, HECHO_VISIBLES); }
        }
        for (const t of cs) col.appendChild(tarjeta(t));
        if (ocultas) col.appendChild(boton(`ver las ${ocultas} anteriores`, 'mn-btn is-ghost is-sm mas', () => { estado.hechoTodas = true; pintarTablero(proyecto); }, { mas: 'hecho' }));
        cont.appendChild(col);
    }
}

// D4: la columna «P» lleva el mismo borde de prioridad alta que la tarjeta; no ordena (es un atributo, no una llave).
// v0.11.0: la columna «Origen en la KB» salio de la Lista (Carlos, 12-sep: a nadie le importa de donde vino).
const COLUMNAS_LISTA = [['prioridad', 'P'], ['tarea', 'Tarea'], ['asignado', 'Asignado'], ['columna', 'Cubeta'], ['vence', 'Vence']];
export function pintarLista(proyecto) {
    const cont = $('tab-lista'); cont.textContent = '';
    const o = estado.ordenLista;
    const ts = ordenarLista(tareasVisibles(proyecto), o.col, o.dir, c => nombreDe(c, estado.roles), columnasDe(proyecto));
    const tabla = el('table'); const thead = el('thead'); const tr = el('tr');
    // F10: clic en el encabezado ordena; segundo clic invierte. La flecha va en el activo (aria-sort).
    for (const [clave, texto] of COLUMNAS_LISTA) {
        const th = el('th', clave === 'prioridad' ? 'col-p' : '', texto);
        if (clave === 'prioridad') { th.title = 'Prioridad alta'; th.setAttribute('aria-label', 'Prioridad'); tr.appendChild(th); continue; }
        th.dataset.sort = clave;
        if (o.col === clave) th.setAttribute('aria-sort', o.dir === 1 ? 'ascending' : 'descending');
        th.addEventListener('click', () => { estado.ordenLista = o.col === clave ? { col: clave, dir: -o.dir } : { col: clave, dir: 1 }; pintarLista(proyecto); });
        tr.appendChild(th);
    }
    thead.appendChild(tr); tabla.appendChild(thead);
    const tbody = el('tbody');
    for (const t of ts) {
        const r = el('tr', 'clic' + (t.Prioridad === 'alta' ? ' alta' : '')); r.dataset.t = String(t.id);
        const tdp = el('td', 'col-p'); if (t.Prioridad === 'alta') { tdp.appendChild(el('i', 'p-alta')); tdp.title = 'Prioridad alta'; } r.appendChild(tdp);
        r.appendChild(el('td', '', t.Title));
        r.appendChild(el('td', '', t.Asignado ? nombreDe(t.Asignado, estado.roles) : '—'));
        const tdc = el('td'); tdc.appendChild(chipColumna(t)); r.appendChild(tdc);
        r.appendChild(el('td', 'mn-mono', fechaCorta(t.Vence)));
        r.addEventListener('click', () => abrirTarjeta(t.id));
        tbody.appendChild(r);
    }
    if (!ts.length) { const r = el('tr'); const td = el('td', 'vacio', tareasDe(proyecto, estado.tareas).length ? 'Nada con ese filtro.' : 'Sin tareas todavía.'); td.colSpan = COLUMNAS_LISTA.length; r.appendChild(td); tbody.appendChild(r); }
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
    // C3 (v0.6.0): buscador por titulo, sin acentos, encima del filtro por vencimiento.
    const q = sinAcentos(estado.textoMis).trim();
    const conTexto = q ? todas.filter(t => sinAcentos(t.Title).includes(q)) : todas;
    const mias = estado.filtroMis === 'vencidas' ? conTexto.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger')
        : estado.filtroMis === 'pronto' ? conTexto.filter(t => estadoVence(t, CONFIG.vencePronto) === 'warn') : conTexto;
    if (!mias.length) { cont.appendChild(el('p', 'vacio', todas.length ? (q ? 'Ninguna con ese texto.' : 'Nada con ese filtro.') : 'Sin tareas abiertas asignadas a ti.')); return; }
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
    const par = (k, v, clase) => { kv.appendChild(el('b', '', k)); const s = el('span', clase || '', typeof v === 'string' ? v : null); if (typeof v !== 'string') s.appendChild(v); kv.appendChild(s); return s; };
    // D2 (v0.6.0): desde Mis tareas, «Proyecto» era texto plano; ahora lleva al tablero y trae el chip del equipo.
    if (p) {
        const caja = el('span', 'proy'); const eq = equipoDe(p);
        const a = el('a', '', p.Title); a.href = `#p/${p.Clave}`; a.dataset.proyecto = p.Clave;
        a.addEventListener('click', ev => { ev.preventDefault(); cerrarDialogo('dlgTarea'); irAHash(`#p/${p.Clave}`); });
        caja.appendChild(a);
        caja.appendChild(iconoEquipo(eq, 'sm'));   // v0.7.0: el equipo por icono (nombre en el title)
        par('Proyecto', caja);
    } else par('Proyecto', '—');
    par('Asignado', t.Asignado ? nombreDe(t.Asignado, estado.roles) : 'sin asignar');
    par('Cubeta', nombreColumna(t));
    par('Vence', fechaCorta(t.Vence));
    par('Prioridad', t.Prioridad || 'normal');
    // v0.11.0: «Origen» (el puntero a la KB) ya no se ensena; el dato sigue en la lista para los scripts.
    if (t.Descripcion) par('Descripción', t.Descripcion);
    if (t.HechoPor) par('Hecho por', `${nombreDe(t.HechoPor, estado.roles)} · ${fechaCorta(t.HechoEl)}`);
    if (t._creado) par('Creada', `${t._creadoPor ? nombreDe(t._creadoPor, estado.roles) + ' · ' : ''}${fechaHora(t._creado)}`, 'creada');
    pintarDocsDeTarjeta(t, p);
    pintarNotas(t, p);

    const puedeMover = PUEDE.mover(estado.rol) && !!p && p.Estado === 'activo';
    // C6 (v0.6.0): con rol lectura la tarjeta decia lo mismo tres veces (cuatro botones apagados, la
    // banda roja y «Borrar» apagado). Ahora: sin «Mover a…», y una linea gris de una frase. La banda
    // roja se queda para el proyecto CERRADO, que si es una alarma. Los botones se siguen armando
    // (ocultos): moverTarea se niega sola aunque alguien los fuerce (la E2E lo prueba).
    const lectura = !PUEDE.mover(estado.rol);
    $('tSoloLectura').classList.toggle('oculto', !lectura);
    $('tMoverEtiqueta').classList.toggle('oculto', lectura); $('tMover').classList.toggle('oculto', lectura);
    const cerrado = !!p && p.Estado !== 'activo';
    $('tDeny').classList.toggle('oculto', !cerrado);   // tambien lectura ve «cerrado»
    $('tDeny').textContent = cerrado ? 'El proyecto está cerrado: sus tarjetas quedan como registro.' : '';
    const mv = $('tMover'); mv.textContent = '';
    // v0.11.0: las cubetas de SU proyecto (+ la huerfana en la que este, para que se lea como «actual»).
    for (const c of columnasConHuerfanas(p, [t])) {
        // C5: la columna actual se lee como «X · actual», no como el boton que hay que pulsar.
        const aqui = t.Columna === c.clave;
        const b = boton(aqui ? `${c.nombre} · actual` : c.nombre, 'mn-btn is-sm' + (aqui ? ' is-here' : ''), () => moverTarea(t.id, c.clave), { move: c.clave });
        if (aqui) b.setAttribute('aria-current', 'true');
        b.disabled = !puedeMover || aqui || !!c.huerfana;
        mv.appendChild(b);
    }
    // F11: Subir / Bajar dentro de la columna (renumera Orden en el orden visual).
    const or = $('tOrden'); or.textContent = '';
    if (puedeMover) {
        const hermanas = ordenar(tareasDe(p, estado.tareas).filter(x => x.Columna === t.Columna));
        const i = hermanas.findIndex(x => x.id === t.id);
        if (hermanas.length > 1) {
            or.appendChild(el('span', '', `Orden en ${nombreColumna(t)}: ${i + 1} de ${hermanas.length}`));
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
    $('ftVence').value = diaInput(t.Vence); $('ftDesc').value = t.Descripcion || '';
    atajosFecha('ftVence', 'ftAtajos', p && p.Vence);   // C2 + D1
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
        fila.appendChild(iconoArchivo(l.Ruta || l.Title, l.Tipo, 'sm'));   // v0.8.0
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
        const texto = el('p'); texto.appendChild(textoConMenciones(n.Title)); cuerpo.appendChild(cab); cuerpo.appendChild(texto);   // v0.8.0: @menciones como chips
        it.appendChild(cuerpo);
        // v0.9.0: borrar la nota (propia, o cualquiera si gerencia) — el mismo renglon que ve el chat.
        if (puedeBorrarComentario(n, p)) {
            const b = boton('', 'borrar-msg', async () => { if (await borrarComentario(n, p)) { pintarNotas(t, p); alCambiar(); } }, { borrar: String(n.id) });
            b.title = 'Borrar esta nota'; b.setAttribute('aria-label', b.title); b.appendChild(iconoSvg(TRAZOS.basura));
            it.classList.add('has-borrar'); it.appendChild(b);
        }
        c.appendChild(it);
    }
    if (!notas.length) c.appendChild(el('span', 'vacio', 'Sin notas todavía.'));
    const puede = PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';
    $('formNota').classList.toggle('oculto', !puede);
    $('tNota').value = ''; contarNota();
}
/** C4: el contador «180/250» aparece a partir de 200 caracteres; antes el placeholder era la unica pista del limite. */
const NOTA_MAX = 250, NOTA_AVISO = 200;
function contarNota() {
    const n = $('tNota').value.length; const c = $('tNotaCont');
    c.textContent = n >= NOTA_AVISO ? `${n}/${NOTA_MAX}` : '';
    c.classList.toggle('is-danger', n >= NOTA_MAX);
}

async function anotar(ev) {
    ev.preventDefault();
    const t = tarjetaAbierta; if (!t) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes anotar.', 'error'); return; }
    if (navigator.onLine === false) { avisar('Sin conexión: la nota se guarda cuando regrese la red (vuelve a intentarlo).', 'ojo'); return; }   // T2 (v0.8.0): Ctrl+Enter no pasa por pointer-events
    if ($('tAnotar').disabled) return;   // C4: Ctrl+Enter no respeta `disabled` como el clic; sin esto, dos renglones
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

/** Nucleo de mover: PATCH con If-Match, sello, bitacora. Devuelve la cubeta anterior. */
async function ejecutarMovimiento(t, columna) {
    const antes = t.Columna; const cols = columnasDeTarea(t);
    const campos = camposDeMovimiento(columna, estado.cuenta.username, new Date(), cols);
    await estado.cliente.actualizarRenglon(estado.siteId, L.tareas, t.id, campos, m => avisar(m, 'ojo'), t._etag);
    const deNombre = nombreColumnaEn(antes, cols);
    aplicar(t, campos);
    alCambiar();
    // Se sigue escribiendo en la bitacora (metrica del piloto); desde v0.11.0 no se pinta en Actividad.
    await registrarActividad('mover-tarea', `movió «${t.Title.slice(0, 80)}» de ${deNombre} a ${nombreColumnaEn(columna, cols)}`, t.ProyectoId, t.id);
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
        avisar(`«${t.Title}» → ${nombreColumna(t)}.`, 'ok');
    } catch (e) {
        if (esConflicto(e)) { await conflicto(t); return; }
        avisar('No se pudo mover: ' + (e && e.message ? e.message : e), 'error');
        for (const b of $('tMover').querySelectorAll('button')) b.disabled = b.dataset.move === t.Columna;
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
        Descripcion: $('ftDesc').value.trim() || null   // v0.11.0: Origen ya no se edita desde la app (se conserva lo que traiga)
    };
    const cambioAsignado = String(t.Asignado || '').toLowerCase() !== String(campos.Asignado || '').toLowerCase();
    // F11: a otro frente (solo gerencia). Cae al final de su cubeta en el proyecto nuevo y arrastra sus ligas.
    // v0.11.0: si el proyecto nuevo no tiene esa cubeta, cae en la PRIMERA (hecha sigue en hecho: existe siempre).
    const proyectoNuevo = !$('ftProyectoCampo').classList.contains('oculto') && $('ftProyecto').value && Number($('ftProyecto').value) !== Number(t.ProyectoId) ? porId(estado.proyectos, $('ftProyecto').value) : null;
    if (proyectoNuevo && !PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia mueve tarjetas entre proyectos.', 'error'); return; }
    if (proyectoNuevo && proyectoNuevo.Estado !== 'activo') { avisar('Ese proyecto está cerrado.', 'error'); return; }
    if (proyectoNuevo) {
        const colsNuevo = columnasDe(proyectoNuevo);
        const colDestino = colsNuevo.some(c => c.clave === t.Columna) ? t.Columna : colsNuevo[0].clave;
        if (colDestino !== t.Columna) { campos.Columna = colDestino; campos.Desde = new Date().toISOString(); }
        campos.ProyectoId = proyectoNuevo.id; campos.Orden = tareasDe(proyectoNuevo, estado.tareas).filter(x => x.Columna === colDestino).length + 1;
    }
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
    const cols = columnasDe(p);   // v0.11.0: las cubetas de este proyecto; nace en la primera
    opciones($('ntColumna'), cols, c => c.clave, c => c.nombre, null);
    $('ntColumna').value = cols[0].clave;
    $('ntTitulo').value = ''; $('ntPrioridad').value = 'normal'; $('ntVence').value = ''; $('ntDesc').value = '';
    atajosFecha('ntVence', 'ntAtajos', p.Vence);   // C2 + D1
    abrirDialogo('dlgNuevaTarea');
    $('ntTitulo').focus();
}

/**
 * C1 (v0.5.0): «Crear y otra» guarda y deja el dialogo abierto con asignado, prioridad, columna y
 * vence puestos: capturar los 17 entregables de un frente eran 17 aperturas con todo desde cero.
 */
async function guardarNuevaTarea(ev, seguirCapturando = false) {
    if (ev) ev.preventDefault();
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes crear tarjetas.', 'error'); return; }
    const titulo = $('ntTitulo').value.trim();
    if (!titulo) { avisar('La tarea necesita un título.', 'error'); $('ntTitulo').focus(); return; }
    let vence;
    try { vence = aIsoDia($('ntVence').value); } catch (e) { avisar(e.message, 'error'); return; }
    const cols = columnasDe(p);
    const columna = cols.some(c => c.clave === $('ntColumna').value) ? $('ntColumna').value : cols[0].clave;
    const ahora = new Date().toISOString();
    const campos = limpiar({
        Title: titulo, ProyectoId: p.id, Columna: columna, Asignado: $('ntAsignado').value || undefined,
        Vence: vence || undefined, Prioridad: $('ntPrioridad').value, Orden: tareasDe(p, estado.tareas).filter(t => t.Columna === columna).length + 1,
        Descripcion: $('ntDesc').value.trim() || undefined, Desde: ahora,
        HechoPor: columna === HECHO ? estado.cuenta.username : undefined, HechoEl: columna === HECHO ? ahora : undefined
    });
    // Los dos botones se apagan AQUI, dentro del alcance del `finally` que los repone: apagar
    // «Crear y otra» en su propio manejador lo dejaba muerto para siempre si la validacion de
    // arriba retornaba antes (p. ej. tarea sin titulo) — cazado por el revisor el 2026-09-12.
    $('ntGuardar').disabled = true; $('ntGuardarYOtra').disabled = true;
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.tareas, campos, m => avisar(m, 'ojo'));
        estado.tareas.push(n);
        if (seguirCapturando) {
            // Se limpia lo que cambia de una tarjeta a otra; lo demas se queda puesto a proposito.
            $('ntTitulo').value = ''; $('ntDesc').value = '';
            $('ntTitulo').focus();
        } else cerrarDialogo('dlgNuevaTarea');
        avisar(`Tarea creada en ${nombreColumnaEn(columna, cols)}.`, 'ok');
        alCambiar();
        await registrarActividad('crear-tarea', `creó «${titulo.slice(0, 80)}»${campos.Asignado ? ' para ' + nombreDe(campos.Asignado, estado.roles) : ''}`, p.id, n.id);
        alCambiar();
    } catch (e) { avisar('No se pudo crear: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('ntGuardar').disabled = false; $('ntGuardarYOtra').disabled = false; }
}

// ---------------------------------------------------------------- cubetas del proyecto (v0.11.0)
//
// Solo gerencia (es estructura del frente, como editarlo). Se edita una copia en memoria y se guarda
// de un golpe en PROY_Proyectos.Columnas (PATCH con If-Match). Reglas que el editor hace visibles:
// «Hecho» se renombra pero no se quita ni se mueve (siempre al final); una cubeta CON tarjetas no se
// quita (dice cuantas: primero se mueven); minimo 1 abierta + Hecho, maximo MAX_COLUMNAS. La clave de
// una cubeta nueva sale de su nombre y ya no cambia al renombrarla: las tarjetas no se pierden.

let cubetasEdicion = null;   // [{clave, nombre, nueva?}] mientras el dialogo esta abierto
export function abrirCubetas() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia cambia las cubetas del proyecto.', 'error'); return; }
    if (p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    cubetasEdicion = columnasDe(p);
    pintarCubetas();
    abrirDialogo('dlgCubetas');
}
function pintarCubetas() {
    const p = estado.proyectoAbierto; const ts = tareasDe(p, estado.tareas);
    const l = $('cbLista'); l.textContent = '';
    for (const [i, c] of cubetasEdicion.entries()) {
        const esHecho = c.clave === HECHO; const n = ts.filter(t => t.Columna === c.clave).length;
        const fila = el('div', 'cubeta' + (esHecho ? ' is-hecho' : '')); fila.dataset.cubeta = c.clave;
        fila.appendChild(el('i', 'punto is-' + claseDeColumna(c.clave, cubetasEdicion)));
        const inp = el('input'); inp.value = c.nombre; inp.maxLength = MAX_NOMBRE_COLUMNA; inp.setAttribute('aria-label', `Nombre de la cubeta ${i + 1}`); inp.placeholder = 'Nombre de la cubeta';
        inp.addEventListener('input', () => { c.nombre = inp.value; });
        fila.appendChild(inp);
        fila.appendChild(el('span', 'n', n ? `${n} tarjeta${n === 1 ? '' : 's'}` : (c.nueva ? 'nueva' : 'vacía')));
        const up = boton('↑', 'mn-btn is-ghost is-sm is-icono', () => { [cubetasEdicion[i - 1], cubetasEdicion[i]] = [cubetasEdicion[i], cubetasEdicion[i - 1]]; pintarCubetas(); }, { sube: c.clave });
        up.title = 'Subir'; up.setAttribute('aria-label', 'Subir'); up.disabled = esHecho || i === 0; fila.appendChild(up);
        const dn = boton('↓', 'mn-btn is-ghost is-sm is-icono', () => { [cubetasEdicion[i + 1], cubetasEdicion[i]] = [cubetasEdicion[i], cubetasEdicion[i + 1]]; pintarCubetas(); }, { baja: c.clave });
        dn.title = 'Bajar'; dn.setAttribute('aria-label', 'Bajar'); dn.disabled = esHecho || i >= cubetasEdicion.length - 2; fila.appendChild(dn);   // la penultima no baja: abajo esta Hecho
        const q = boton('Quitar', 'mn-btn is-ghost is-sm', () => { cubetasEdicion.splice(i, 1); pintarCubetas(); }, { quita: c.clave });
        q.disabled = esHecho || n > 0 || cubetasEdicion.length <= 2;
        q.title = esHecho ? '«Hecho» no se quita: es la cubeta que cierra las tarjetas.' : n ? `Tiene ${n} tarjeta(s): muévelas antes de quitarla.` : cubetasEdicion.length <= 2 ? 'Hace falta al menos una cubeta abierta.' : 'Quitar esta cubeta';
        fila.appendChild(q);
        l.appendChild(fila);
    }
    $('cbAgregar').disabled = cubetasEdicion.length >= MAX_COLUMNAS;
    $('cbAgregar').title = cubetasEdicion.length >= MAX_COLUMNAS ? `Máximo ${MAX_COLUMNAS} cubetas.` : '';
}
function agregarCubeta() {
    if (cubetasEdicion.length >= MAX_COLUMNAS) return;
    cubetasEdicion.splice(cubetasEdicion.length - 1, 0, { clave: '', nombre: '', nueva: true });   // antes de Hecho
    pintarCubetas();
    const inputs = $('cbLista').querySelectorAll('input'); inputs[inputs.length - 2].focus();
}
async function guardarCubetas(ev) {
    ev.preventDefault();
    const p = estado.proyectoAbierto; if (!p || !cubetasEdicion) return;
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia cambia las cubetas del proyecto.', 'error'); return; }
    // Las claves ya usadas no cambian; una nueva nace del nombre y no puede chocar con una existente.
    const v = normalizarColumnas(cubetasEdicion.map(c => ({ clave: c.nueva ? '' : c.clave, nombre: c.nombre })));
    if (!v.ok) { avisar('Cubetas: ' + v.motivo, 'error'); return; }
    const antes = columnasDe(p); const nuevas = v.columnas;
    const quitadas = antes.filter(c => !nuevas.some(n => n.clave === c.clave)).map(c => c.clave);
    const igual = JSON.stringify(antes) === JSON.stringify(nuevas);
    if (igual) { cerrarDialogo('dlgCubetas'); return; }
    // Vacio si son exactamente las de siempre: el default no se guarda (una lista limpia sigue leyendose igual).
    const esDefault = JSON.stringify(nuevas) === JSON.stringify(columnasDe(null));
    const campos = { Columnas: esDefault ? null : JSON.stringify(nuevas) };
    $('cbGuardar').disabled = true;
    try {
        // Al quitar una cubeta se cuenta EN VIVO (no en la copia de hace hasta 120 s): alguien pudo mover una
        // tarjeta ahi despues de la ultima relectura, y el If-Match de PROY_Proyectos no lo ve (revisor 12-sep).
        if (quitadas.length) {
            const enVivo = await estado.cliente.renglones(estado.siteId, L.tareas, `fields/ProyectoId eq ${Number(p.id)}`);
            const perdidas = enVivo.filter(t => quitadas.includes(t.Columna));
            if (perdidas.length) { avisar(`Hay ${perdidas.length} tarjeta(s) en una cubeta que quieres quitar (alguien las movió hace un momento): se releyó, muévelas primero.`, 'error'); await pedirRelectura(); pintarCubetas(); return; }
        }
        await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'), p._etag);
        aplicar(p, campos);
        cerrarDialogo('dlgCubetas');
        estado.colMovil = null;
        avisar(`Cubetas guardadas: ${nuevas.map(c => c.nombre).join(' · ')}.`, 'ok');
        alCambiar();
        const cambio = nuevas.length !== antes.length ? `dejó ${nuevas.length} cubetas` : 'renombró u ordenó las cubetas';
        await registrarActividad('editar-proyecto', `${cambio} del proyecto «${p.Title.slice(0, 60)}»: ${nuevas.map(c => c.nombre).join(' · ').slice(0, 120)}`, p.id, null);
        alCambiar();
    } catch (e) {
        if (esConflicto(e)) { cerrarDialogo('dlgCubetas'); avisar('Alguien cambió este proyecto hace un momento: se releyó. Revisa y vuelve a intentarlo.', 'ojo'); await pedirRelectura(); return; }
        avisar('No se pudieron guardar las cubetas: ' + (e && e.message ? e.message : e), 'error');
    } finally { $('cbGuardar').disabled = false; }
}

// ---------------------------------------------------------------- enganche

export function engancharTablero() {
    $('btnCubetas').addEventListener('click', abrirCubetas);   // v0.11.0
    $('formCubetas').addEventListener('submit', guardarCubetas);
    $('cbAgregar').addEventListener('click', agregarCubeta);
    $('cbCancelar').addEventListener('click', () => cerrarDialogo('dlgCubetas'));
    $('filtroTexto').addEventListener('input', () => { estado.filtroTareas.texto = $('filtroTexto').value; if (estado.proyectoAbierto) pintarFiltroTareas(estado.proyectoAbierto); pintarSoloTareas(); });
    $('tCerrar').addEventListener('click', () => cerrarDialogo('dlgTarea'));
    $('dlgTarea').addEventListener('close', () => { fijarHash(hashDe()); });   // al cerrar (boton, Esc o Atras) el hash vuelve a la pantalla
    $('tCompartir').addEventListener('click', compartirTarjeta);
    $('formNota').addEventListener('submit', anotar);
    // C4: Ctrl/Cmd+Enter envia la nota (el unico envio era el boton) y el contador sigue al teclado.
    // v0.8.0: el selector de @menciones del chat tambien aqui; Ctrl+Enter lo enruta el mismo enganche.
    $('tNota').addEventListener('input', contarNota);
    engancharSelectorMenciones('tNota', 'tNotaSelector', () => $('formNota').requestSubmit());
    $('tBorrar').addEventListener('click', borrarTarea);
    $('formTarea').addEventListener('submit', guardarEdicion);
    $('btnNuevaTarea').addEventListener('click', abrirNuevaTarea);
    $('formNuevaTarea').addEventListener('submit', guardarNuevaTarea);
    $('ntGuardarYOtra').addEventListener('click', () => guardarNuevaTarea(null, true));   // C1
    $('ntCancelar').addEventListener('click', () => cerrarDialogo('dlgNuevaTarea'));
}
