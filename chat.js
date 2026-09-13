// Chat por proyecto (v0.8.0, Carlos 2026-09-12): UNA conversacion por frente, para que todos lean lo
// mismo — «no sé si el archivo que adjunté es el correcto, favor de checar @francisco». Es la misma
// lista PROY_Actividad con Accion=comentar: el comentario del proyecto va SIN TareaId, y las notas
// de las tarjetas (F5) salen en el mismo hilo con su chip, asi que nada se escribe dos veces ni hay
// esquema nuevo. El tope sigue siendo el de un renglon de bitacora (Title, 250 caracteres).
//
// Menciones: `@francisco` se resuelve contra PROY_Roles (reglas.js: primer nombre, nombre.apellido o
// la parte local del correo, sin acentos). Se pintan como chip, la propia lleva `is-yo`, e Inicio
// junta «Te mencionaron». El selector aparece al teclear @ (tambien en la nota de la tarjeta).

import { PUEDE, mencionEnCurso, aliasDe, aliasParaMencion, nombreDe, sinAcentos } from './reglas.js';
import { $, L, estado, el, boton, avatar, tonoDe, avisar, porId, fechaHora, textoConMenciones, comentariosDe, iconoSvg, TRAZOS, puedeBorrarComentario, borrarComentario, chatVistoHasta, marcarChatVisto, comentariosNuevos } from './comun.js';

let alCambiar = () => {};
export function alCambiarChat(fn) { alCambiar = fn; }
let abrirTarjeta = () => {};
export function fijarAbrirTarjeta(fn) { abrirTarjeta = fn; }

const COMENTARIO_MAX = 250, COMENTARIO_AVISO = 200;
const personas = () => estado.roles.filter(r => r.Activo !== false).map(r => String(r.Title || '').toLowerCase()).filter(Boolean);
export const puedeComentarEn = p => PUEDE.tarea(estado.rol) && !!p && p.Estado === 'activo';

// ---------------------------------------------------------------- pintar

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** «hoy» · «ayer» · «martes 9 sep»: el separador de dia del hilo, en hora de Mexico. */
function rotuloDia(iso, hoy = new Date()) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
    const d = f.format(new Date(iso)), h = f.format(hoy), a = f.format(new Date(hoy.getTime() - 86400000));
    if (d === h) return 'hoy'; if (d === a) return 'ayer';
    const x = new Date(d + 'T12:00:00Z');
    return `${DIAS[x.getUTCDay()]} ${x.getUTCDate()} ${MESES[x.getUTCMonth()]}${x.getUTCFullYear() !== hoy.getFullYear() ? ' ' + x.getUTCFullYear() : ''}`;
}
const diaDe = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

export function pintarChat(p) {
    const hilo = $('chatHilo');
    const yo = estado.cuenta.username.toLowerCase();
    const cs = comentariosDe(p.id);
    // El refresco automatico (120 s) repinta el hilo: si la persona estaba leyendo arriba, se queda donde
    // estaba; solo si estaba al fondo (o es la primera pintada) se aterriza en lo ultimo (revisor, 12-sep).
    const estabaAlFondo = !hilo.dataset.pintado || hilo.scrollTop + hilo.clientHeight >= hilo.scrollHeight - 40;
    const scrollAntes = hilo.scrollTop;
    // v0.9.0: la raya «nuevos» se fija al ENTRAR al chat de este proyecto (no en cada repintado: el refresco de
    // 120 s la movería sola). La marca de visto sube al final de cada pintada.
    if (hilo.dataset.proyecto !== String(p.id)) { hilo.dataset.proyecto = String(p.id); delete hilo.dataset.pintado; hilo._nuevos = new Set(comentariosNuevos(p.id, chatVistoHasta(p.id)).map(c => c.id)); }
    const nuevos = hilo._nuevos || new Set();   // fijado al entrar: lo que llegue durante el refresco no se suma a «tu ultima visita»
    hilo.textContent = '';
    if (!cs.length) hilo.appendChild(el('p', 'vacio', puedeComentarEn(p) ? 'Nadie ha escrito todavía. Aquí va lo que el equipo necesita leer del frente; con @nombre avisas a alguien.' : 'Nadie ha escrito todavía.'));
    let dia = null; let anterior = null; let rayaPuesta = false;
    for (const c of cs) {
        const d = c.Cuando ? diaDe(c.Cuando) : '';
        if (d !== dia) { dia = d; hilo.appendChild(el('div', 'dia', c.Cuando ? rotuloDia(c.Cuando) : '—')); anterior = null; }
        if (!rayaPuesta && nuevos.has(c.id)) { rayaPuesta = true; hilo.appendChild(el('div', 'nuevos', `${nuevos.size} nuevo${nuevos.size === 1 ? '' : 's'} desde tu última visita`)); anterior = null; }
        const quien = String(c.Quien || '').toLowerCase();
        // Mensajes seguidos de la misma persona (en el mismo dia, y sin tarjeta de por medio) se agrupan: sin avatar ni nombre.
        const seguido = anterior && String(anterior.Quien || '').toLowerCase() === quien && !c.TareaId && !anterior.TareaId;
        const m = el('div', 'msg' + (quien === yo ? ' is-mio' : '') + (seguido ? ' is-seguido' : '')); m.dataset.comentario = String(c.id);
        if (quien) m.dataset.tono = String(tonoDe(quien));   // v0.14.0: burbuja del color de la persona
        m.appendChild(seguido ? el('span', 'av-hueco') : avatar(quien));
        const cuerpo = el('div', 'cuerpo');
        if (!seguido) { const cab = el('div', 'cab'); cab.appendChild(el('span', 'q', nombreDe(quien, estado.roles))); cab.appendChild(el('span', 'h mn-mono', fechaHora(c.Cuando))); cuerpo.appendChild(cab); }
        if (c.TareaId) {
            // La nota de una tarjeta: el chip la nombra y la abre (la nota vive en la tarjeta; aqui se lee en contexto).
            const t = porId(estado.tareas, c.TareaId);
            const ref = boton('', 'ref', () => { if (t) abrirTarjeta(t.id); }, { tarjeta: String(c.TareaId) });
            ref.appendChild(iconoSvg(TRAZOS.tarjeta)); ref.appendChild(el('span', '', t ? t.Title : 'tarjeta borrada')); ref.title = t ? 'Abrir la tarjeta' : 'La tarjeta ya no existe'; ref.disabled = !t;
            cuerpo.appendChild(ref);
        }
        const texto = el('p', 't'); texto.appendChild(textoConMenciones(c.Title, yo));
        if (seguido) texto.title = fechaHora(c.Cuando);
        cuerpo.appendChild(texto);
        m.appendChild(cuerpo);
        // v0.9.0: borrar — lo propio, o cualquiera si gerencia; el boton vive en el mensaje y se ve al pasar el raton (siempre en tactil).
        if (puedeBorrarComentario(c, p)) {
            const b = boton('', 'borrar-msg', async () => { if (await borrarComentario(c, p)) { pintarChat(p); alCambiar(); } }, { borrar: String(c.id) });
            b.title = c.TareaId ? 'Borrar esta nota' : 'Borrar este comentario'; b.setAttribute('aria-label', b.title);
            b.appendChild(iconoSvg(TRAZOS.basura));
            m.classList.add('has-borrar'); m.appendChild(b);
        }
        hilo.appendChild(m);
        anterior = c;
    }
    // v0.9.0: lo que ya estuvo en pantalla deja de ser nuevo (la raya se queda hasta salir del chat).
    if (cs.length) marcarChatVisto(p.id, cs[cs.length - 1].Cuando);
    const puede = puedeComentarEn(p);
    $('formChat').classList.toggle('oculto', !puede);
    $('chatSoloLectura').classList.toggle('oculto', puede);
    $('chatSoloLectura').textContent = !p || p.Estado !== 'activo' ? 'El proyecto está cerrado: la conversación queda como registro.' : 'Solo lectura · tu rol no escribe en el chat.';
    contar();
    // El hilo se lee como chat: lo ultimo abajo, y al entrar se aterriza ahi.
    hilo.dataset.pintado = '1';
    hilo.scrollTop = estabaAlFondo ? hilo.scrollHeight : scrollAntes;
}
/** v0.9.0: app.js lo llama cuando el chat deja de estar en pantalla; la proxima pintada cuenta como «entrar». */
export function salirDelChat() { const h = $('chatHilo'); if (h) { delete h.dataset.proyecto; delete h.dataset.pintado; h._nuevos = null; } }
/** Tras enviar, siempre al fondo (es mi mensaje). */
function alFondo() { const h = $('chatHilo'); h.scrollTop = h.scrollHeight; }

function contar() {
    const n = $('chatTexto').value.length; const c = $('chatCont');
    c.textContent = n >= COMENTARIO_AVISO ? `${n}/${COMENTARIO_MAX}` : '';
    c.classList.toggle('is-danger', n >= COMENTARIO_MAX);
}

// ---------------------------------------------------------------- enviar

async function enviar(ev) {
    ev.preventDefault();
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.tarea(estado.rol)) { avisar('Tu rol es de lectura: no puedes comentar.', 'error'); return; }
    if (p.Estado !== 'activo') { avisar('El proyecto está cerrado.', 'error'); return; }
    if (navigator.onLine === false) { avisar('Sin conexión: el comentario se manda cuando regrese la red (vuelve a intentarlo).', 'ojo'); return; }   // T2: Ctrl+Enter no pasa por pointer-events
    if ($('chatEnviar').disabled) return;   // Ctrl+Enter no respeta `disabled` como el clic (C4)
    const texto = $('chatTexto').value.trim();
    if (!texto) { $('chatTexto').focus(); return; }
    if (texto.length > COMENTARIO_MAX) { avisar(`El comentario no cabe: máximo ${COMENTARIO_MAX} caracteres (es un renglón de la bitácora).`, 'error'); return; }
    $('chatEnviar').disabled = true;
    try {
        const r = { Title: texto, Accion: 'comentar', Quien: estado.cuenta.username, Cuando: new Date().toISOString(), ProyectoId: Number(p.id) };
        const n = await estado.cliente.crearRenglon(estado.siteId, L.actividad, r, m => avisar(m, 'ojo'));
        estado.actividad.unshift(n);
        $('chatTexto').value = ''; cerrarSelector($('chatTexto'));
        pintarChat(p); alFondo();
        alCambiar();
        $('chatTexto').focus();
    } catch (e) { avisar('No se pudo enviar: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('chatEnviar').disabled = false; }
}

// ---------------------------------------------------------------- selector de @menciones

/**
 * Bajo un textarea, la lista de personas cuando el cursor esta en un «@ali» a medio escribir; elegir
 * una reemplaza lo tecleado por «@alias » (el alias que aliasParaMencion garantiza inequivoco).
 * Teclado: ↑/↓ recorre, Enter/Tab elige, Esc cierra; Ctrl/Cmd+Enter sigue enviando el formulario.
 */
export function engancharSelectorMenciones(idTexto, idCaja, enviarForma) {
    const ta = $(idTexto), caja = $(idCaja);
    ta._selector = { caja, i: 0, opciones: [] };
    // ARIA del combo: el textarea es el «combobox» y la caja su listbox; la opcion marcada va en aria-activedescendant.
    ta.setAttribute('aria-autocomplete', 'list'); ta.setAttribute('aria-controls', idCaja); ta.setAttribute('aria-expanded', 'false');
    ta.addEventListener('input', () => pintarSelector(ta));
    ta.addEventListener('click', () => pintarSelector(ta));
    // Mover el cursor con flechas/Inicio/Fin cambia donde esta la mencion en curso (o si la hay).
    ta.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) pintarSelector(ta); });
    // El boton «@» (y cualquier clic que devuelva el foco al textarea) NO cierra el selector: con el foco de
    // vuelta en `ta` 120 ms despues, se queda (revisor 12-sep: el boton lo abria y se cerraba solo).
    ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta && !caja.contains(document.activeElement)) cerrarSelector(ta); }, 120));
    ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); cerrarSelector(ta); enviarForma(); return; }
        const s = ta._selector; if (caja.classList.contains('oculto') || !s.opciones.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); s.i = (s.i + 1) % s.opciones.length; marcar(ta); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); s.i = (s.i - 1 + s.opciones.length) % s.opciones.length; marcar(ta); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); elegir(ta, s.opciones[s.i]); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarSelector(ta); }
    });
}
function pintarSelector(ta) {
    const s = ta._selector; const caja = s.caja;
    const m = mencionEnCurso(ta.value, ta.selectionStart);
    if (!m) { cerrarSelector(ta); return; }
    const q = sinAcentos(m.alias);
    const yo = estado.cuenta.username.toLowerCase();
    s.opciones = personas().filter(c => c !== yo && (!q || aliasDe(c, estado.roles).some(a => a.startsWith(q)) || sinAcentos(nombreDe(c, estado.roles)).includes(q))).slice(0, 8);
    s.i = 0; s.desde = m.desde; s.hasta = m.hasta;   // la palabra entera: «@fra|ncisco» se reemplaza completa
    caja.textContent = '';
    if (!s.opciones.length) { cerrarSelector(ta); return; }
    for (const [k, c] of s.opciones.entries()) {
        const b = boton('', '', () => elegir(ta, c), { mencionar: c }); b.setAttribute('role', 'option'); b.id = `${caja.id}-op-${k}`;
        b.appendChild(avatar(c)); b.appendChild(el('span', 'n', nombreDe(c, estado.roles))); b.appendChild(el('span', 'a mn-mono', '@' + aliasParaMencion(c, estado.roles)));
        b.addEventListener('mousedown', e => e.preventDefault());   // que el textarea no pierda el foco antes del clic
        caja.appendChild(b);
    }
    caja.classList.remove('oculto'); ta.setAttribute('aria-expanded', 'true'); marcar(ta);
}
function marcar(ta) {
    const s = ta._selector;
    for (const [k, b] of [...s.caja.querySelectorAll('button')].entries()) { b.classList.toggle('is-on', k === s.i); b.setAttribute('aria-selected', k === s.i ? 'true' : 'false'); }
    ta.setAttribute('aria-activedescendant', `${s.caja.id}-op-${s.i}`);
}
function elegir(ta, correo) {
    const s = ta._selector; if (!correo) return;
    const alias = '@' + aliasParaMencion(correo, estado.roles) + ' ';
    ta.value = ta.value.slice(0, s.desde) + alias + ta.value.slice(s.hasta);
    const pos = s.desde + alias.length; ta.setSelectionRange(pos, pos);
    cerrarSelector(ta); ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));   // el contador y quien escuche
}
export function cerrarSelector(ta) {
    if (!ta || !ta._selector) return;
    ta._selector.caja.classList.add('oculto'); ta._selector.caja.textContent = ''; ta._selector.opciones = [];
    ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant');
}

// ---------------------------------------------------------------- enganche

export function engancharChat() {
    $('formChat').addEventListener('submit', enviar);
    $('chatTexto').addEventListener('input', contar);
    engancharSelectorMenciones('chatTexto', 'chatSelector', () => $('formChat').requestSubmit());
    // El boton «@» mete una arroba donde esta el cursor y abre el selector (en celular no hay tecla a la mano).
    $('chatArroba').addEventListener('click', () => {
        const ta = $('chatTexto'); const i = ta.selectionStart || ta.value.length;
        const antes = ta.value.slice(0, i); const sep = antes && !/\s$/.test(antes) ? ' ' : '';
        ta.value = antes + sep + '@' + ta.value.slice(i); const pos = i + sep.length + 1; ta.focus(); ta.setSelectionRange(pos, pos);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
}
