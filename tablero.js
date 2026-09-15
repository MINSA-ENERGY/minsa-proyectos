// Tablero de un proyecto: sus cubetas (columnas), lista, «Mis tareas», la tarjeta (ver / mover /
// editar / borrar), la tarea nueva y el editor de cubetas. El movimiento canonico es el boton
// «Mover a…» (default del plan); nada de drag & drop en el piloto. v0.3.0 sumo el filtro y el orden
// dentro del proyecto (F9/F10), Subir/Bajar y mover de proyecto (F11), las pestanas de columna en
// celular (U5) y el 412 de If-Match (T1): se relee, no se pisa. v0.11.0 (Carlos, 12-sep): las
// cubetas se renombran, agregan y quitan POR PROYECTO (PROY_Proyectos.Columnas); el atajo
// «→ siguiente» de la cara de la tarjeta se quito, y «Origen en la KB» ya no se ensena ni se pide.

import { CONFIG } from './config.js';
import { PUEDE, ordenar, tareasDe, sinMovimiento, camposDeMovimiento, nombreDe, diasPara, estadoVence, semaforo, vencidasEn, filtrarTareas, ordenarLista, reordenar, sinAcentos, columnasDe, normalizarColumnas, nombreColumnaEn, claseDeColumna, HECHO, MAX_COLUMNAS, MAX_NOMBRE_COLUMNA, COLORES, colorValido, hrefSeguro, delegadas } from './reglas.js';
import { $, L, estado, el, boton, avatar, chip, chipVence, avisar, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, fechaHora, aIsoDia, diaInput, atajosFecha, opciones, limpiar, porId, registrarActividad, hashDe, fijarHash, irAHash, ligaDeTarjeta, notasDe, aplicar, pedirRelectura, equipoDe, iconoEquipo, iconoArchivo, textoConMenciones, insignia, TRAZOS, iconoSvg, puedeBorrarComentario, borrarComentario, columnasDeTarea, notasPorTarea, ligasPorTarea, buzonPorTarea } from './comun.js';
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

// ---------------------------------------------------------------- selector de color (v0.12.0)
//
// Una fila de circulos (sin color + los 8 de COLORES) con aria-pressed; el valor vive en cont.dataset.valor.
// Sirve para la cubeta (editor de cubetas) y para la tarjeta (editar / nueva). `alElegir` es opcional.
// Accesible como grupo de radios (revisor 12-sep): role=radio + aria-checked, UN solo tab por fila (roving tabindex)
// y flechas para moverse; asi «Cubetas» con 5 filas no son 45 tabulaciones hasta «Guardar».
export function selectorTonos(cont, actual, alElegir, rotulo = 'Color') {
    cont.textContent = ''; cont.dataset.valor = colorValido(actual); cont.setAttribute('role', 'radiogroup');
    const opciones = [{ clave: '', nombre: 'Sin color' }, ...COLORES];
    const marcar = clave => { cont.dataset.valor = clave; for (const x of cont.children) { const on = x.dataset.tono === clave; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; } };
    for (const c of opciones) {
        const b = el('button'); b.type = 'button'; b.dataset.tono = c.clave; b.title = c.nombre; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `${rotulo}: ${c.nombre}`);
        b.addEventListener('click', () => { marcar(c.clave); if (alElegir) alElegir(c.clave); });
        b.addEventListener('keydown', ev => {
            const d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0; if (!d) return;
            ev.preventDefault(); const i = (opciones.findIndex(o => o.clave === c.clave) + d + opciones.length) % opciones.length;
            marcar(opciones[i].clave); cont.children[i].focus(); if (alElegir) alElegir(opciones[i].clave);
        });
        cont.appendChild(b);
    }
    marcar(cont.dataset.valor);
    return cont;
}

export function tarjeta(t, conProyecto = false) {
    // D4 (v0.6.0): la prioridad alta es un atributo estable (clase .alta); el chip rojo se queda solo
    // para «venció». v0.20.0 (iteracion 2): el filete izquierdo pasa a ser SEMAFORO de fecha
    // (.is-vencida / .is-pronto / .is-hecha; gris en tiempo) y la prioridad alta se pinta como un
    // PUNTO de marca junto al titulo — el borde ya no puede decir dos cosas.
    const sem = semaforo(t, CONFIG.semaforoDias);
    const b = el('button', 'tarjeta' + (t.Prioridad === 'alta' ? ' alta' : '') + (sem ? ' is-' + sem : '')); b.type = 'button'; b.dataset.t = String(t.id);
    if (colorValido(t.Color)) b.dataset.tono = colorValido(t.Color);   // v0.12.0: el color elegido tiñe la tarjeta
    // En compacto el titulo va a una linea con puntos suspensivos: el completo vive en el title.
    const compacto = !conProyecto && estado.densidad === 'compacto';
    const enTitle = [t.Prioridad === 'alta' ? 'Prioridad alta' : ''];   // lo que el compacto esconde se suma abajo y va al hover
    const tt = el('span', 't');
    if (t.Prioridad === 'alta') { const p = el('i', 'p-alta'); p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Prioridad alta'); tt.appendChild(p); }
    tt.appendChild(document.createTextNode(t.Title));
    b.appendChild(tt);
    const f = el('span', 'f');
    f.appendChild(avatar(t.Asignado));
    const quien = t.Asignado ? nombreDe(t.Asignado, estado.roles).split(' ')[0] : 'sin asignar';
    f.appendChild(el('span', 'nom', quien)); enTitle.push(quien);
    if (conProyecto) { const p = porId(estado.proyectos, t.ProyectoId); if (p) f.appendChild(chip(p.Clave)); }
    if (conProyecto) f.appendChild(chipColumna(t));
    const v = chipVence(t);
    if (v) {
        v.classList.add('vence');   // .vence: lo unico que el compacto no esconde
        // Compacto: el chip pierde el año y el verbo («12/09», «hoy»): el color del chip y el filete ya dicen si
        // venció — con «venció 12/09/2026» entero el titulo quedaba en cuatro letras a 1366 (medido, revisor).
        if (compacto) { enTitle.push(v.textContent); v.textContent = v.textContent.replace(/\/\d{4}$/, '').replace(/^venci[oó] |^vence /, ''); }
        f.appendChild(v);
    }
    // v0.13.1: indices por tarjeta calculados una vez por pintada (antes cada tarjeta recorria toda la actividad y todas las ligas).
    if (buzonPorTarea().get(t.id)) { f.appendChild(chip('en el buzón', 'info')); enTitle.push('en el buzón'); }
    if (sinMovimiento([t], CONFIG.sinMovimientoDias, new Date(), columnasDeTarea).length) { const s = `sin movimiento ${-diasPara(t.Desde)} días`; f.appendChild(el('span', 'stale', '· ' + s)); enTitle.push(s); }
    // v0.8.0: insignias de la cara (Trello): cuantas notas y cuantos documentos trae, sin abrirla.
    const nNotas = notasPorTarea().get(t.id) || 0, nDocs = ligasPorTarea().get(t.id) || 0;
    if (nNotas) { const s = `${nNotas} nota${nNotas === 1 ? '' : 's'}`; f.appendChild(insignia(TRAZOS.burbuja, nNotas, s, 'is-notas')); enTitle.push(s); }
    if (nDocs) { const s = `${nDocs} documento${nDocs === 1 ? '' : 's'}`; f.appendChild(insignia(TRAZOS.clip, nDocs, s, 'is-docs')); enTitle.push(s); }
    b.appendChild(f);
    // Compacto: el hover trae el titulo completo y todo lo que la linea esconde (spec: «quedan en el hover y en la ficha»).
    b.title = (compacto ? [t.Title, ...enTitle] : enTitle.slice(0, 1)).filter(Boolean).join(' · ');
    b.addEventListener('click', () => abrirTarjeta(t.id));
    // La caja se conserva (la rejilla de Mis tareas y la E2E la conocen); desde v0.11.0 solo trae la
    // tarjeta: el atajo «→ siguiente» (U7) se quito a pedido de Carlos — mover es abrir y «Mover a…».
    const caja = el('div', 'tarjeta-caja'); caja.appendChild(b);
    return caja;
}

// ---------------------------------------------------------------- filtro dentro del proyecto (F9)

const CHIPS_FILTRO = [['alta', 'solo alta'], ['vencidas', 'solo vencidas']];   // C7 (v0.6.0); v0.30.0: «sin dueño» vive en el menu «Quién»
/**
 * Filtro de tarjetas dentro del proyecto. v0.30.0 (Carlos, 14-sep; artifact YLnjhT3a, opcion F3): las personas
 * ya no son una pildora cada una — viven en un MENU PLEGABLE «Quién» (details) con casillas y el conteo de
 * tarjetas de cada quien, que permite marcar VARIAS (f.quien es array) y trae abajo «Sin dueño» y «Quitar».
 * El summary lleva el avatar de la primera marcada y cuantas hay. Fuera del menu quedan «solo alta»,
 * «solo vencidas» y «× limpiar»; el texto vive en #filtroTexto. Como se repinta entero con cada cambio,
 * el menu conserva su estado abierto/cerrado entre repintados.
 */
export function pintarFiltroTareas(proyecto) {
    const f = estado.filtroTareas; const c = $('filtroChips');
    const abierto = !!c.querySelector('.menu-quien[open]'); c.textContent = '';
    if (!Array.isArray(f.quien)) f.quien = f.quien ? [String(f.quien).toLowerCase()] : [];
    const ts = tareasDe(proyecto, estado.tareas);
    // Conteo por persona (todas sus tarjetas, hechas incluidas: es lo que su casilla deja pasar); el de «sin dueño» solo
    // las huerfanas ABIERTAS, que es lo que filtra esa casilla (reglas.js: huerfana).
    const conteo = {}; for (const t of ts) { const q = String(t.Asignado || '').toLowerCase(); if (q || t.Columna !== 'hecho') conteo[q] = (conteo[q] || 0) + 1; }
    const quienes = Object.keys(conteo).filter(Boolean).sort();
    const repintar = () => { pintarFiltroTareas(proyecto); pintarSoloTareas(); };
    const chipBtn = (texto, on, alClic, datos) => {
        const b = boton(texto, on ? 'is-on' : '', () => { alClic(); repintar(); }, datos);
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); c.appendChild(b);
    };
    // ---- el menu «Quién»
    const menu = el('details', 'menu-quien'); menu.open = abierto; menu.dataset.menu = 'quien';
    const sum = el('summary'); sum.className = 'mn-btn is-sm' + (f.quien.length || f.sinDueno ? ' is-on' : '');
    const pilas = quienes.map(q => nombreDe(q, estado.roles).split(' ')[0]);
    const etiqueta = q => { const i = quienes.indexOf(q); return i >= 0 && pilas.filter(x => x === pilas[i]).length > 1 ? nombreDe(q, estado.roles) : nombreDe(q, estado.roles).split(' ')[0]; };   // dos «Ana»: nombre completo
    // Una sola persona (sin «sin dueño») → su avatar y su nombre; cualquier otra combinacion → «Quién» + cuantas marcas.
    const marcas = f.quien.length + (f.sinDueno ? 1 : 0);
    if (f.quien.length) sum.appendChild(avatar(f.quien[0]));
    sum.appendChild(el('span', 'nom', marcas === 1 && f.quien.length === 1 ? etiqueta(f.quien[0]) : 'Quién'));
    if (marcas && !(marcas === 1 && f.quien.length === 1)) sum.appendChild(el('span', 'n', String(marcas)));
    sum.appendChild(iconoSvg(['M6 9l6 6 6-6']));
    sum.title = 'Filtrar por persona'; menu.appendChild(sum);
    const caja = el('div', 'caja'); caja.setAttribute('role', 'group'); caja.setAttribute('aria-label', 'Personas con tarjetas en este frente');
    caja.appendChild(el('span', 'mn-label tit', 'Con tarjetas en este frente'));
    // Cada cambio repinta la fila entera (el input enfocado se destruye): la casilla se vuelve a enfocar por su data-*
    // para que el teclado no caiga al inicio del documento (revisor, 14-sep).
    const casilla = (texto, on, alCambiar, datos, av) => {
        const l = el('label'); for (const k in datos) l.dataset[k] = datos[k];
        const sel = Object.keys(datos).map(k => '[data-' + k + '="' + datos[k] + '"]').join('');
        const i = el('input'); i.type = 'checkbox'; i.checked = on; i.addEventListener('change', () => { alCambiar(i.checked); repintar(); const n = c.querySelector('.menu-quien label' + sel + ' input'); if (n) n.focus({ preventScroll: true }); });
        l.appendChild(i); l.appendChild(av); l.appendChild(el('span', 'nom', texto)); return l;
    };
    for (const [i, q] of quienes.entries()) {
        const l = casilla(etiqueta(q), f.quien.includes(q), on => { f.quien = on ? [...f.quien, q] : f.quien.filter(x => x !== q); }, { quien: q }, avatar(q));
        l.appendChild(el('span', 'n mn-mono', String(conteo[q]))); caja.appendChild(l);
    }
    if (!quienes.length) caja.appendChild(el('span', 'vacio', 'Ninguna tarjeta asignada.'));
    caja.appendChild(el('hr'));
    const lsd = casilla('Sin dueño', !!f.sinDueno, on => { f.sinDueno = on; }, { filtro: 'sinDueno' }, avatar(''));
    if (conteo['']) lsd.appendChild(el('span', 'n mn-mono', String(conteo['']))); caja.appendChild(lsd);
    if (f.quien.length || f.sinDueno) caja.appendChild(boton('Quitar el filtro de persona', 'limp', () => { f.quien = []; f.sinDueno = false; repintar(); }, { filtro: 'quitarQuien' }));
    menu.appendChild(caja); c.appendChild(menu);
    // ---- los fijos
    for (const [k, texto] of CHIPS_FILTRO) chipBtn(texto, !!f[k], () => { f[k] = !f[k]; }, { filtro: k });
    const activo = !!(f.quien.length || f.alta || f.vencidas || f.sinDueno || f.texto);
    if (activo) chipBtn('× limpiar', false, () => { estado.filtroTareas = { quien: [], alta: false, vencidas: false, sinDueno: false, texto: '' }; $('filtroTexto').value = ''; }, { filtro: 'limpiar' });
}
/** B1: «Filtrar» dice cuantos filtros hay puestos; sin eso, plegarlos los esconde en silencio.
 *  v0.6.0: vive aqui (no en app.js) para repintarse con CADA cambio de filtro — un chip pulsado
 *  dejaba el boton en «Filtrar» hasta el siguiente repintado de la pantalla (lo cazo la E2E de C7). */
export function pintarBotonFiltros() {
    const f = estado.filtroTareas;
    const n = [f.quien && f.quien.length, f.alta, f.vencidas, f.sinDueno, f.texto].filter(Boolean).length;   // v0.30.0: quien es array
    const b = $('btnFiltros');
    b.textContent = n ? `Filtrar · ${n}` : 'Filtrar';
    b.classList.toggle('is-on', !!n || estado.filtrosAbiertos);
    b.setAttribute('aria-expanded', estado.filtrosAbiertos ? 'true' : 'false');
    b.classList.toggle('oculto', ['docs', 'chat', 'resumen'].includes(estado.tab));
    $('densidad').classList.toggle('oculto', estado.tab !== 'tablero');   // v0.20.0: el conmutador solo tiene sentido en el tablero
}

// ---------------------------------------------------------------- densidad del tablero (v0.20.0, iteracion 2)

const LLAVE_DENSIDAD = 'densidad';
/** Cómodo / Compacto: se lee del dispositivo al arrancar (localStorage; sin él, cómodo) y se guarda al cambiar. */
function leerDensidad() {
    let v = ''; try { v = localStorage.getItem(LLAVE_DENSIDAD) || ''; } catch (_) {}
    estado.densidad = v === 'compacto' ? 'compacto' : 'comodo';
}
function fijarDensidad(d) {
    estado.densidad = d === 'compacto' ? 'compacto' : 'comodo';
    try { localStorage.setItem(LLAVE_DENSIDAD, estado.densidad); } catch (_) {}
    pintarSoloTareas();
}
/** Marca el botón activo del conmutador (aria-pressed); la clase del tablero la pone pintarTablero. */
function pintarDensidad() {
    for (const b of document.querySelectorAll('#densidad button')) b.setAttribute('aria-pressed', b.dataset.densidad === estado.densidad ? 'true' : 'false');
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
        const enCubeta = ts.filter(t => t.Columna === c.clave);
        const b = boton('', estado.colMovil === c.clave ? 'is-on' : '', () => { estado.colMovil = c.clave; pintarTablero(proyecto); }, { colTab: c.clave });
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', estado.colMovil === c.clave ? 'true' : 'false');
        b.appendChild(el('span', '', c.nombre)); b.appendChild(el('span', 'n' + (vencidasEn(enCubeta) ? ' is-hot' : ''), String(enCubeta.length)));   // v0.20.0: rojo si trae vencidas
        tabs.appendChild(b);
    }
    // v0.47.0: la rejilla tiene tantas columnas como cubetas (el CSS lee `--n`; data-n queda para el caso de 1 en tableta); en celular sigue siendo una a la vez.
    $('tableroCols').dataset.n = String(columnas.length); $('tableroCols').style.setProperty('--n', String(columnas.length));
    cont.classList.toggle('is-compacto', estado.densidad === 'compacto');   // v0.20.0: una linea por tarjeta
    pintarDensidad();
    for (const [i, c] of columnas.entries()) {
        const col = el('div', 'col' + (estado.colMovil === c.clave ? ' is-activa' : '') + (c.huerfana ? ' is-huerfana' : '')); col.dataset.col = c.clave;
        col.dataset.cls = claseDeColumna(c.clave, columnas);   // v0.11.0: el color del punto va por POSICION, no por nombre
        if (c.color) col.dataset.tono = c.color;   // v0.12.0: salvo que la cubeta tenga color elegido
        const h = el('h3'); h.appendChild(el('i', 'punto')); h.appendChild(el('span', '', c.nombre));   // v0.8.0: el punto lleva el color de la barra segmentada
        if (c.huerfana) h.title = 'Esta cubeta ya no existe en el proyecto: mueve sus tarjetas a otra.';
        let cs = ordenar(ts.filter(t => t.Columna === c.clave));
        // v0.20.0: el contador se pone rojo y dice cuantas vencidas trae la cubeta (mockup de la iteracion 2).
        // El detalle «· 1 vencida» solo cabe en cubetas anchas (container query): a 1366 con lateral miden 195 px.
        const nv = vencidasEn(cs);
        const cnt = el('span', 'n' + (nv ? ' is-hot' : ''), String(cs.length));
        if (nv) { cnt.appendChild(el('span', 'largo', ` · ${nv} vencida${nv === 1 ? '' : 's'}`)); cnt.title = `${nv} tarjeta${nv === 1 ? '' : 's'} con la fecha vencida`; }
        h.appendChild(cnt);
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
        const tdp = el('td', 'col-p'); if (t.Prioridad === 'alta') { const p = el('i', 'p-alta'); p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Prioridad alta'); tdp.appendChild(p); tdp.title = 'Prioridad alta'; } r.appendChild(tdp);
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
const FILTROS_MIS = [[null, 'Todas'], ['vencidas', 'Vencidas'], ['pronto', 'Vencen en 7 días'], ['delegadas', 'Las que delegué']];   // v0.15.0: quien reparte no las pierde de vista
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
    // v0.15.0: «Las que delegué» = abiertas de OTRO que yo cree o asigne (createdBy o la bitacora); la tarjeta enseña a quien.
    const delego = estado.filtroMis === 'delegadas';
    $('misSub').textContent = delego ? 'Tarjetas abiertas de otros que tú creaste o asignaste. Las vencidas arriba.' : 'Tus tarjetas abiertas, en todos los proyectos. Las vencidas arriba.';
    const todas = delego ? delegadas(estado.tareas, estado.actividad, yo) : estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === yo && t.Columna !== 'hecho')
        .sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')) || a.id - b.id);
    // C3 (v0.6.0): buscador por titulo, sin acentos, encima del filtro por vencimiento.
    const q = sinAcentos(estado.textoMis).trim();
    const conTexto = q ? todas.filter(t => sinAcentos(t.Title).includes(q)) : todas;
    const mias = estado.filtroMis === 'vencidas' ? conTexto.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger')
        : estado.filtroMis === 'pronto' ? conTexto.filter(t => estadoVence(t, CONFIG.vencePronto) === 'warn') : conTexto;
    if (!mias.length) { cont.appendChild(el('p', 'vacio', todas.length ? (q ? 'Ninguna con ese texto.' : 'Nada con ese filtro.') : delego ? 'No has delegado ninguna tarjeta abierta: las que crees o asignes a otros salen aquí.' : 'Sin tareas abiertas asignadas a ti.')); return; }
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
    // v0.24.0 (iteracion 6): asignado · cubeta · vence · prioridad son CHIPS bajo el titulo —«Persona · Por hacer ·
    // venció 11/09 · alta» se lee en un golpe— y la tabla de 7 renglones se va; la descripcion es un parrafo. Un clic
    // en el chip de asignado, de vence o de prioridad abre «Editar la tarjeta» en ese campo, si se puede editar.
    const puedeEditar = PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';
    const chips = $('tChips'); chips.textContent = '';
    const ponerChip = (nodo, clave, campo) => {
        nodo.dataset.chip = clave;
        if (!campo || !puedeEditar) { chips.appendChild(nodo); return; }
        const b = el('button', 'chip-btn'); b.type = 'button'; b.title = 'Cambiar en «Editar la tarjeta»'; b.dataset.edita = campo;
        b.appendChild(nodo);
        b.addEventListener('click', () => { $('tEditar').open = true; const f = $(campo); f.scrollIntoView({ block: 'nearest' }); f.focus(); });
        chips.appendChild(b);
    };
    const quien = chip(t.Asignado ? nombreDe(t.Asignado, estado.roles) : 'sin asignar', t.Asignado ? 'ok' : 'warn');
    if (t.Asignado) quien.prepend(avatar(t.Asignado));
    ponerChip(quien, 'asignado', 'ftAsignado');
    ponerChip(chipColumna(t), 'cubeta');
    // Sin fecha, un chip gris que lo dice; hecha con fecha, la fecha a secas en verde (chipVence calla en «hecho»: ya no vence).
    ponerChip(chipVence(t) || chip(t.Vence ? (t.Columna === HECHO ? fechaCorta(t.Vence) : `vence ${fechaCorta(t.Vence)}`) : 'sin fecha', t.Vence && t.Columna === HECHO ? 'ok' : null), 'vence', 'ftVence');
    ponerChip(chip(t.Prioridad === 'alta' ? 'alta' : t.Prioridad === 'baja' ? 'baja' : 'normal', t.Prioridad === 'alta' ? 'warn' : null), 'prioridad', 'ftPrioridad');
    $('tDesc').textContent = t.Descripcion || ''; $('tDesc').classList.toggle('oculto', !t.Descripcion);

    // La columna derecha: lo que se consulta del frente (Proyecto · Hecho por · Creada · Último cambio).
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
    // v0.11.0: «Origen» (el puntero a la KB) ya no se ensena; el dato sigue en la lista para los scripts.
    if (t.HechoPor) par('Hecho por', `${nombreDe(t.HechoPor, estado.roles)} · ${fechaCorta(t.HechoEl)}`);
    if (t._creado) par('Creada', `${t._creadoPor ? nombreDe(t._creadoPor, estado.roles) + ' · ' : ''}${fechaHora(t._creado)}`, 'creada');
    // SharePoint no dice QUIEN modifico (graph.js solo trae lastModifiedDateTime); si coincide con la creacion, no se repite.
    if (t._modificado && t._modificado !== t._creado) par('Último cambio', fechaHora(t._modificado), 'creada');
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
    // Editar (puedeEditar se calculo arriba, con los chips)
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
    selectorTonos($('ftColor'), t.Color, null, 'Color de la tarjeta');   // v0.12.0
    atajosFecha('ftVence', 'ftAtajos', p && p.Vence);   // C2 + D1
    abrirDialogo('dlgTarea');
    fijarHash(hashDe(t.id));
}

/** Documentos de la tarjeta (F3): las ligas con «Quitar», y «Ligar archivo» / «Subir al buzón» con esta tarjeta ya puesta. */
function pintarDocsDeTarjeta(t, p) {
    const c = $('tDocs'); c.textContent = '';
    const ligas = estado.ligas.filter(l => Number(l.TareaId) === t.id);
    $('tDocsN').textContent = ligas.length ? String(ligas.length) : '';   // v0.24.0: «Documentos · 2»
    const puede = puedeLigarEn(p);
    for (const l of ligas) {
        const fila = el('div', 'tdoc');
        fila.appendChild(iconoArchivo(l.Ruta || l.Title, l.Tipo, 'sm'));   // v0.8.0
        const a = el('a', '', l.Title); const href = hrefSeguro(l.Url); if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }   // v0.13.1: solo http(s)
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
        acc.appendChild(boton('Pegar un enlace', 'mn-btn is-sm', () => { cerrarDialogo('dlgTarea'); abrirEnlace({ proyecto: p, tareaId: t.id, alTerminar: () => abrirTarjeta(t.id) }); }, { enlace: String(t.id) }));
    }
}

/** Notas de la tarjeta (F5): renglones de PROY_Actividad con Accion=comentar, en orden, y el campo para anotar. */
function pintarNotas(t, p) {
    const c = $('tNotasLista'); c.textContent = '';
    const notas = notasDe(t.id);
    $('tNotasN').textContent = notas.length ? String(notas.length) : '';   // v0.24.0: «Notas · 2»
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
        Descripcion: $('ftDesc').value.trim() || null,   // v0.11.0: Origen ya no se edita desde la app (se conserva lo que traiga)
        ...(($('ftColor').dataset.valor || '') !== colorValido(t.Color) ? { Color: $('ftColor').dataset.valor || null } : {})   // v0.12.0: solo si cambio (antes de provisionar, un Color siempre presente daria 400 en toda edicion — revisor)
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
    selectorTonos($('ntColor'), '', null, 'Color de la tarjeta');   // v0.12.0
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
        Descripcion: $('ntDesc').value.trim() || undefined, Desde: ahora, Color: $('ntColor').dataset.valor || undefined,   // v0.12.0
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
        const punto = el('i', 'punto is-' + claseDeColumna(c.clave, cubetasEdicion)); if (c.color) punto.dataset.tono = c.color; fila.appendChild(punto);
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
        // v0.12.0: el color de la cubeta; cambia el punto al instante, se guarda con las demas.
        fila.appendChild(selectorTonos(el('div', 'tonos'), c.color, v => { c.color = v; if (v) punto.dataset.tono = v; else delete punto.dataset.tono; }, `Color de «${c.nombre || 'la cubeta'}»`));
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
    const v = normalizarColumnas(cubetasEdicion.map(c => ({ clave: c.nueva ? '' : c.clave, nombre: c.nombre, color: c.color || '' })));
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
    leerDensidad();   // v0.20.0: lo que este dispositivo eligió la última vez
    for (const b of document.querySelectorAll('#densidad button')) b.addEventListener('click', () => fijarDensidad(b.dataset.densidad));
    $('leyendaPronto').textContent = `hoy o en ${CONFIG.semaforoDias} días`;   // la leyenda dice lo que CONFIG manda
    $('btnCubetas').addEventListener('click', abrirCubetas);   // v0.11.0
    $('formCubetas').addEventListener('submit', guardarCubetas);
    $('cbAgregar').addEventListener('click', agregarCubeta);
    $('cbCancelar').addEventListener('click', () => cerrarDialogo('dlgCubetas'));
    $('filtroTexto').addEventListener('input', () => { estado.filtroTareas.texto = $('filtroTexto').value; if (estado.proyectoAbierto) pintarFiltroTareas(estado.proyectoAbierto); pintarSoloTareas(); });
    // v0.30.0 (F3): el menu «Quién» se cierra al hacer clic fuera o con Esc (un details abierto no se cierra solo).
    // Se juzga por ANCESTRO del nodo pulsado (closest), no por contains: «Quitar el filtro» repinta en fase objetivo y cuando el
    // evento llega aqui el boton ya esta desprendido — con contains el menu nuevo se cerraba (revisor, 14-sep).
    document.addEventListener('click', e => { const m = document.querySelector('#filtroChips .menu-quien[open]'); if (m && !(e.target.closest && e.target.closest('.menu-quien'))) m.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = document.querySelector('#filtroChips .menu-quien[open]'); if (m) { m.open = false; m.querySelector('summary').focus(); } } });
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
