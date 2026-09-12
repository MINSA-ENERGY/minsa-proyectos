// Lo que comparten app.js, tablero.js y docs.js: el estado, las utilerias de DOM (sin innerHTML:
// todo textContent, regla heredada de captura y planta), los avisos, el dialogo de confirmacion y
// la bitacora PROY_Actividad.

import { CONFIG } from './config.js';
import { iniciales, nombreDe, diasPara, estadoVence } from './reglas.js';

export const VERSION = '0.6.0';
export const $ = id => document.getElementById(id);
export const L = CONFIG.listas;

export const estado = {
    cuenta: null, token: null, cliente: null, siteId: null, rol: 'lectura',
    proyectos: [], tareas: [], ligas: [], roles: [], actividad: [],
    proyectoAbierto: null,   // renglon de PROY_Proyectos
    pestana: 'inicio', tab: 'tablero',
    filtroEquipo: null,
    // v0.3.0: filtro y orden dentro del proyecto (F9/F10), columna visible en celular (U5), filtro de Mis tareas (U3)
    filtroTareas: { quien: null, alta: false, vencidas: false, sinDueno: false, texto: '' },
    // v0.6.0 (C3): buscador fuera del proyecto — Proyectos (nombre, clave, descripcion) y Mis tareas (titulo).
    textoProyectos: '', textoMis: '',
    // v0.5.0 (B1): en celular los chips + buscador van plegados detras de «Filtrar»; en escritorio
    // el CSS los muestra siempre y esta bandera no se nota.
    filtrosAbiertos: false,
    ordenLista: { col: 'vence', dir: 1 },
    colMovil: 'por-hacer',
    filtroMis: null,
    // v0.4.0: «ver las N anteriores» de Hecho (U6), filtro de Documentos (U10), firma de la ultima carga (T3)
    hechoTodas: false,
    filtroDocs: null,
    cargadoEl: 0,
    // Sitios de bibliotecas de unidad ya resueltos: clave -> { id, motivo }
    sitiosUnidad: {},
    // Rutas del buzon ya consultadas en esta carga: ruta -> true|false (existe)
    buzonExiste: {}
};

// ---------------------------------------------------------------- DOM

export function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined && texto !== null) e.textContent = String(texto);
    return e;
}
export function vaciar(id) { $(id).textContent = ''; }
export function opciones(sel, items, valor, textoDe, primera = '— elige —') {
    sel.textContent = '';
    if (primera !== null) { const o = el('option', '', primera); o.value = ''; sel.appendChild(o); }
    for (const it of items) { const op = el('option', '', textoDe(it)); op.value = String(valor(it)); sel.appendChild(op); }
}
export function boton(texto, clase, alClic, atributos = {}) {
    const b = el('button', clase, texto); b.type = 'button';
    for (const k in atributos) b.dataset[k] = atributos[k];
    if (alClic) b.addEventListener('click', alClic);
    return b;
}
export function avatar(correo) {
    const a = el('span', 'av', iniciales(correo));
    a.title = nombreDe(correo, estado.roles);
    if (!correo) a.classList.add('is-tercero');
    return a;
}
export function chip(texto, estado2) { return el('span', 'mn-chip' + (estado2 ? ' is-' + estado2 : ''), texto); }
export function limpiar(obj) { const o = {}; for (const k in obj) if (obj[k] !== undefined && obj[k] !== '') o[k] = obj[k]; return o; }
export function porId(coleccion, id) { return coleccion.find(x => x.id === Number(id)) || null; }

// ---------------------------------------------------------------- avisos

/**
 * Un aviso REEMPLAZA al anterior: la pantalla dice el estado de la ultima accion, no la historia.
 * Es un TOAST fijo abajo (v0.2.0, U1 de la auditoria): no mueve el scroll, lo anuncia el lector de
 * pantalla (#avisos lleva role=status), el ok/info se va solo a los 4 s y el error se queda hasta
 * cerrarlo. Dentro de un dialogo abierto se pinta en su .dlg-avisos, como antes.
 */
let temporizadorAviso = 0;
/** `opts.accion` + `opts.alClic` ponen un boton en el toast («Deshacer», U7); `opts.ms` cambia cuanto dura. */
export function avisar(texto, clase = '', opts = {}) {
    limpiarAvisos();
    const d = el('div', 'mensaje' + (clase ? ' ' + clase : ''));
    d.appendChild(el('span', 'texto', texto));
    if (opts.accion) d.appendChild(boton(opts.accion, 'accion', () => { limpiarAvisos(); if (opts.alClic) opts.alClic(); }, { accion: '1' }));
    const dlg = document.querySelector('dialog[open] .dlg-avisos');
    if (dlg) { dlg.appendChild(d); return; }
    const x = boton('×', 'cerrar', limpiarAvisos); x.setAttribute('aria-label', 'Cerrar el aviso'); d.appendChild(x);
    $('avisos').appendChild(d);
    if (clase !== 'error') temporizadorAviso = setTimeout(limpiarAvisos, opts.ms || CONFIG.avisoMs);
}
/** Tras un PATCH propio el `_etag` leido ya no vale (Graph no lo devuelve): se olvida hasta la siguiente lectura. */
export function aplicar(renglon, campos) { Object.assign(renglon, campos); delete renglon._etag; return renglon; }
// Releer las listas (la pone app.js): es lo que hace un modulo al recibir 412 — la verdad esta en SharePoint.
let releer = async () => {};
export function fijarReleer(fn) { releer = fn; }
export function pedirRelectura() { return releer(); }
export function limpiarAvisos() {
    clearTimeout(temporizadorAviso);
    $('avisos').textContent = '';
    for (const z of document.querySelectorAll('.dlg-avisos')) z.textContent = '';
}
/**
 * B8 (v0.6.0): Atras del navegador cierra CUALQUIER dialogo, no solo la tarjeta. La tarjeta ya vive
 * en el hash; los otros seis empujan una entrada de historial SIN cambiar el hash al abrirse, y
 * popstate los cierra. Al cerrar con su boton la entrada se queda (history.back() es asincrono y
 * se cruzaria con el pushState de lo que la persona abra despues — medido con la E2E): un Atras de
 * mas que no hace nada, contra el gesto de Android que sacaba de la pantalla con el dialogo abierto.
 */
export function abrirDialogo(id) {
    const d = $(id); limpiarAvisos();
    if (!d.open) {
        if (id !== 'dlgTarea') { history.pushState({ dlg: id }, '', location.href); d.dataset.enHistorial = '1'; }
        d.showModal();
    }
    d.scrollTo({ top: 0 });
}
// E4: app.js se entera SINCRONO de cada cierre (el evento `close` del <dialog> no llega bajo tiempo virtual).
let alCerrar = () => {};
export function fijarAlCerrar(fn) { alCerrar = fn; }
export function cerrarDialogo(id) {
    const d = $(id); if (d.open) { d.close(); alCerrar(id); }
    delete d.dataset.enHistorial;
    // La tarjeta vive en el hash: al cerrarla por codigo el hash vuelve AQUI, sincrono. El evento
    // `close` (Esc, Atras) lo repite en tablero.js; con tiempo virtual (E2E) ese evento llega tarde.
    if (id === 'dlgTarea') fijarHash(hashDe());
}
window.addEventListener('popstate', () => {
    for (const d of document.querySelectorAll('dialog[open][data-en-historial]')) { delete d.dataset.enHistorial; d.close(); if (d.id !== 'dlg') alCerrar(d.id); }   // #dlg avisa desde su onclose
});
/** Navega como lo haria una URL pegada: escribe el hash y dispara el router (app.js escucha popstate). */
export function irAHash(h) { fijarHash(h); window.dispatchEvent(new PopStateEvent('popstate')); }

/** Confirmacion propia (sustituye al confirm() nativo). Devuelve {ok, motivo}. */
export function confirmar({ titulo, texto, ok = 'Confirmar', motivo = false, etiquetaMotivo = 'Motivo' }) {
    return new Promise(resolver => {
        const d = $('dlg');
        $('dlgTitulo').textContent = titulo;
        $('dlgTexto').textContent = texto || '';
        $('dlgOk').textContent = ok;
        $('dlgMotivoEtiqueta').textContent = etiquetaMotivo + (motivo === true ? ' · obligatorio' : '');
        $('dlgMotivoCampo').classList.toggle('oculto', !motivo);
        $('dlgMotivo').value = '';
        $('dlgError').classList.add('oculto');
        const cerrar = ok2 => {
            $('dlgOk').onclick = $('dlgCancelar').onclick = d.onclose = null;
            delete d.dataset.enHistorial;
            if (d.open) { d.close(); alCerrar('dlg'); }
            resolver({ ok: ok2, motivo: $('dlgMotivo').value.trim() });
        };
        $('dlgOk').onclick = () => {
            if (motivo === true && !$('dlgMotivo').value.trim()) { $('dlgError').classList.remove('oculto'); $('dlgMotivo').focus(); return; }
            cerrar(true);
        };
        $('dlgCancelar').onclick = () => cerrar(false);
        d.onclose = () => cerrar(false);
        $('dlgMotivo').oninput = () => $('dlgError').classList.add('oculto');
        // B8: tambien la confirmacion se cierra con Atras (popstate → close → onclose → cerrar(false)).
        history.pushState({ dlg: 'dlg' }, '', location.href); d.dataset.enHistorial = '1';
        d.showModal();
        if (motivo) $('dlgMotivo').focus();
    });
}

// ---------------------------------------------------------------- ruta (hash) — v0.2.0, F8 de la auditoria

/**
 * El hash que describe lo que esta en pantalla: #inicio · #proyectos · #mis · #p/<clave> ·
 * #p/<clave>/lista · #p/<clave>/docs, y con una tarjeta abierta se le pega /t/<id> (tambien sobre
 * #mis). Es lo que se comparte («abre esta tarjeta») y lo que sobrevive a un F5. app.js lo LEE en
 * hashchange (aplicarHash); aqui solo se ESCRIBE. La clave del proyecto es un slug estable, hecho
 * para esto.
 */
export function hashDe(tareaId) {
    let h;
    if (estado.pestana === 'proyecto' && estado.proyectoAbierto) {
        h = '#p/' + estado.proyectoAbierto.Clave;
        if (estado.tab && estado.tab !== 'tablero') h += '/' + estado.tab;
    } else h = '#' + (estado.pestana || 'inicio');
    if (tareaId) h += '/t/' + tareaId;
    return h;
}
/**
 * Escribe el hash con pushState (SINCRONO y sin evento): `location.hash = x` es una navegacion que
 * el navegador puede diferir y reordenar —medido en Edge headless el 2026-09-11: el close del
 * dialogo y el hash se cruzaban y la pantalla se quedaba con el hash viejo—. Atras/Adelante llegan
 * por popstate y una URL pegada por hashchange; los dos caen en aplicarHash (app.js), que es idempotente.
 */
export function fijarHash(h) { if (location.hash !== h) history.pushState(null, '', h); }
/** La liga COMPLETA de una tarjeta, siempre por su proyecto (para compartir, aunque se abra desde Mis tareas). */
export function ligaDeTarjeta(t) {
    const p = porId(estado.proyectos, t.ProyectoId);
    const base = location.href.split('#')[0];
    return p ? `${base}#p/${p.Clave}/t/${t.id}` : `${base}#mis/t/${t.id}`;
}

// ---------------------------------------------------------------- fechas (dd/mm/aaaa en pantalla, ISO en SharePoint)

export function fechaCorta(iso) {
    if (!iso) return '—';
    const s = String(iso);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s;
}
export function fechaHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
/** Acepta dd/mm/aaaa y aaaa-mm-dd. Vacio = null; otra cosa es un error que se muestra, nunca una fecha adivinada. */
export function aIsoDia(texto) {
    const s = String(texto || '').trim();
    if (!s) return null;
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
    let y, mo, d;
    if (m) { d = +m[1]; mo = +m[2]; y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; }
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else throw new Error(`Fecha «${s}» no válida: elígela en el calendario (o escríbela como aaaa-mm-dd)`);
    const f = new Date(Date.UTC(y, mo - 1, d, 18));
    if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) throw new Error(`Fecha «${s}» no existe: elígela en el calendario`);
    return f.toISOString();
}
/** Valor para un <input type="date"> (U9, v0.4.0): la parte de dia del ISO guardado, o vacio. */
export function diaInput(iso) { const s = String(iso || ''); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; }
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** D1: «jue 18 sep» — el input type=date se pinta en el idioma del DISPOSITIVO (mm/dd/yyyy en una
 *  laptop en ingles) y <html lang="es"> no lo cambia; esta linea dice en el formato de la casa lo
 *  que quedo escrito. */
export function fechaLegible(iso) {
    const s = diaInput(iso); if (!s) return '';
    const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12));
    return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
/**
 * C2 + D1: bajo un campo de fecha, los cuatro atajos (hoy · mañana · +7 d · fin del frente) y la
 * fecha leida en el formato de la casa. El calendario nativo obliga a navegar para «mañana».
 * `finDelFrente` es el Vence del proyecto, o null.
 */
export function atajosFecha(idInput, idCaja, finDelFrente) {
    const inp = $(idInput), caja = $(idCaja); if (!inp || !caja) return;
    // El dia se arma con los componentes LOCALES. Con `toISOString()` —que es UTC y aqui vamos
    // UTC-6— «hoy» pasaba a ser MAÑANA a partir de las 18:00 hora de México, y eso no se pinta
    // mal: se ESCRIBE mal en SharePoint (cazado por el revisor el 2026-09-12).
    const dia = n => {
        const d = new Date(); d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const pintar = () => {
        caja.textContent = '';
        const opciones = [['hoy', dia(0)], ['mañana', dia(1)], ['+7 d', dia(7)]];
        const fin = diaInput(finDelFrente);
        if (fin) opciones.push(['fin del frente', fin]);
        for (const [texto, valor] of opciones) {
            const b = boton(texto, inp.value === valor ? 'is-on' : '', () => { inp.value = valor; pintar(); }, { fecha: valor });
            caja.appendChild(b);
        }
        // D1: con valor, la fecha leida en el formato de la casa; vacio, el formato que se espera
        // (el campo nativo enseña mm/dd/yyyy si el DISPOSITIVO esta en ingles, que es el caso que
        // motivo D1: justo cuando la persona va a teclear no habia ninguna pista).
        caja.appendChild(el('span', 'leida', inp.value ? fechaLegible(inp.value) : 'día/mes/año'));
    };
    // El manejador se pone UNA vez y llama al `pintar` vigente: cada apertura del dialogo trae otro
    // proyecto (otro «fin del frente»), y un `oninput = pintar` ademas pisaria cualquier otro manejador.
    inp._pintarAtajos = pintar;
    if (inp.dataset.atajos !== '1') { inp.addEventListener('input', () => inp._pintarAtajos()); inp.dataset.atajos = '1'; }
    pintar();
}
/** Chip de vencimiento de una tarea (vencida / vence pronto / vence), o null. */
export function chipVence(t) {
    const e = estadoVence(t, CONFIG.vencePronto);
    if (!e) return null;
    const d = diasPara(t.Vence);
    if (e === 'danger') return chip(`venció ${fechaCorta(t.Vence)}`, 'danger');
    if (e === 'warn') return chip(d === 0 ? 'vence hoy' : `vence ${fechaCorta(t.Vence)}`, 'warn');
    return chip(`vence ${fechaCorta(t.Vence)}`);
}

// ---------------------------------------------------------------- bitacora

/**
 * Un renglon en PROY_Actividad, DESPUES de una escritura exitosa y best-effort: si falla, la
 * accion ya quedo en su lista y solo se pierde la bitacora (se avisa en consola, no en pantalla).
 */
export async function registrarActividad(accion, frase, proyectoId, tareaId) {
    const r = {
        Title: frase.slice(0, 250), Accion: accion, Quien: estado.cuenta.username, Cuando: new Date().toISOString(),
        ProyectoId: proyectoId ? Number(proyectoId) : undefined, TareaId: tareaId ? Number(tareaId) : undefined
    };
    try {
        const n = await estado.cliente.crearRenglon(estado.siteId, L.actividad, limpiar(r));
        estado.actividad.unshift(n);
    } catch (e) { console.warn('no se pudo registrar la actividad:', e && e.message ? e.message : e); }
}

/** Frase de un renglon de actividad para las listas de «actividad reciente»: «Lorena movió …»; una nota va entre comillas. */
export function fraseActividad(a) {
    const quien = nombreDe(a.Quien, estado.roles).split(' ')[0];
    return a.Accion === 'comentar' ? `${quien} anotó: «${a.Title}»` : `${quien} ${a.Title}`;
}
/** Las notas de una tarjeta (Accion=comentar), de la mas vieja a la mas nueva. */
export function notasDe(tareaId) {
    return estado.actividad.filter(a => a.Accion === 'comentar' && Number(a.TareaId) === Number(tareaId))
        .sort((a, b) => String(a.Cuando || '').localeCompare(String(b.Cuando || '')));
}

/** Equipo (config) de un proyecto. */
export function equipoDe(p) { return CONFIG.equipos.find(e => e.clave === (p && p.Equipo)) || { clave: p && p.Equipo, nombre: p && p.Equipo, unidad: null, color: '#94a2b8' }; }
