// Lo que comparten app.js, tablero.js y docs.js: el estado, las utilerias de DOM (sin innerHTML:
// todo textContent, regla heredada de captura y planta), los avisos, el dialogo de confirmacion y
// la bitacora PROY_Actividad.

import { CONFIG } from './config.js';
import { iniciales, nombreDe, diasPara, estadoVence } from './reglas.js';

export const VERSION = '0.1.0';
export const $ = id => document.getElementById(id);
export const L = CONFIG.listas;

export const estado = {
    cuenta: null, token: null, cliente: null, siteId: null, rol: 'lectura',
    proyectos: [], tareas: [], ligas: [], roles: [], actividad: [],
    proyectoAbierto: null,   // renglon de PROY_Proyectos
    pestana: 'inicio', tab: 'tablero',
    filtroEquipo: null,
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

/** Un aviso REEMPLAZA al anterior: la pantalla dice el estado de la ultima accion, no la historia. */
export function avisar(texto, clase = '') {
    limpiarAvisos();
    const d = el('div', 'mensaje' + (clase ? ' ' + clase : ''), texto);
    $('avisos').appendChild(d);
    const dlg = document.querySelector('dialog[open] .dlg-avisos');
    if (dlg) { dlg.textContent = ''; dlg.appendChild(d.cloneNode(true)); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
export function limpiarAvisos() { $('avisos').textContent = ''; for (const z of document.querySelectorAll('.dlg-avisos')) z.textContent = ''; }
export function abrirDialogo(id) { const d = $(id); limpiarAvisos(); if (!d.open) d.showModal(); d.scrollTo({ top: 0 }); }
export function cerrarDialogo(id) { const d = $(id); if (d.open) d.close(); }

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
            if (d.open) d.close();
            resolver({ ok: ok2, motivo: $('dlgMotivo').value.trim() });
        };
        $('dlgOk').onclick = () => {
            if (motivo === true && !$('dlgMotivo').value.trim()) { $('dlgError').classList.remove('oculto'); $('dlgMotivo').focus(); return; }
            cerrar(true);
        };
        $('dlgCancelar').onclick = () => cerrar(false);
        d.onclose = () => cerrar(false);
        $('dlgMotivo').oninput = () => $('dlgError').classList.add('oculto');
        d.showModal();
        if (motivo) $('dlgMotivo').focus();
    });
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
    else throw new Error(`Fecha «${s}» no válida: escríbela como dd/mm/aaaa`);
    const f = new Date(Date.UTC(y, mo - 1, d, 18));
    if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) throw new Error(`Fecha «${s}» no existe: escríbela como dd/mm/aaaa`);
    return f.toISOString();
}
export function activarMascaraFechas() {
    for (const inp of document.querySelectorAll('input.fecha')) inp.addEventListener('input', () => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) { inp.value = fechaCorta(inp.value); return; }
        const dig = inp.value.replace(/\D/g, '').slice(0, 8);
        inp.value = dig.length > 4 ? `${dig.slice(0, 2)}/${dig.slice(2, 4)}/${dig.slice(4)}` : dig.length > 2 ? `${dig.slice(0, 2)}/${dig.slice(2)}` : dig;
    });
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

/** Equipo (config) de un proyecto. */
export function equipoDe(p) { return CONFIG.equipos.find(e => e.clave === (p && p.Equipo)) || { clave: p && p.Equipo, nombre: p && p.Equipo, unidad: null, color: '#94a2b8' }; }
