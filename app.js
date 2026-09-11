// MINSA Proyectos — proyectos multiusuario del holding. v0.1.0: piloto (Inicio · Proyectos ·
// Proyecto [Tablero / Lista / Documentos] · Mis tareas).
//
// Estructura heredada de calytek-planta-app: MSAL por REDIRECCION (el popup se rompe en celulares),
// token en sessionStorage, nada de innerHTML (todo textContent), y la app es DUEÑA del estado
// (decision 1 del plan 2026-09-11): asignado, columna y vence viven en listas PROY_* del sitio
// Administracion; la KB liga por la Clave del proyecto.
//
// Lo que la app NO protege: quien decide que puede escribir cada persona es SharePoint. Los roles
// de PROY_Roles eligen la pantalla y las funciones de guardar los comprueban (cinturon), pero la
// traza real de quien hizo que la deja SharePoint en Creado por / Modificado por y en PROY_Actividad.

import { CONFIG } from './config.js';
import { crearCliente } from './graph.js';
import { rolDe, PUEDE, validarClave, tareasDe, avance, proximos, sinMovimiento, nombreDe, diasPara, estadoVence } from './reglas.js';
import { $, L, VERSION, estado, el, boton, avatar, chip, chipVence, avisar, limpiarAvisos, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, fechaHora, aIsoDia, activarMascaraFechas, opciones, limpiar, porId, registrarActividad, equipoDe } from './comun.js';
import { pintarTablero, pintarLista, pintarMisTareas, engancharTablero, alCambiarTareas } from './tablero.js';
import { pintarDocs, engancharDocs, alCambiarDocs } from './docs.js';

// NO llamar `msal` a esta variable: taparia el global del bundle UMD.
const pca = new msal.PublicClientApplication({
    auth: {
        clientId: CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
        redirectUri: new URL('./', window.location.href).href
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false }
});

$('pie').textContent = `MINSA Proyectos v${VERSION}`;

// ---------------------------------------------------------------- sesion

async function token() {
    const cuentas = pca.getAllAccounts();
    const r = await pca.acquireTokenSilent({ scopes: CONFIG.scopes, account: cuentas[0] });
    return r.accessToken;
}
let msalListo = false;
async function prepararMsal() {
    if (msalListo) return null;
    await pca.initialize();
    const respuesta = await pca.handleRedirectPromise();
    msalListo = true;
    return respuesta;
}
async function entrar() {
    $('btnEntrar').disabled = true;
    $('textoEntrar').textContent = 'Entrando…';
    try {
        if (CONFIG.clientId.startsWith('PENDIENTE')) throw new Error('la app todavía no está registrada en Entra (docs/setup-carlos.md, tarea 1).');
        await prepararMsal();
        if (pca.getAllAccounts().length === 0) { await pca.loginRedirect({ scopes: CONFIG.scopes }); return; }
        await sesionIniciada();
    } catch (e) {
        avisar('No se pudo entrar: ' + (e && e.message ? e.message : e), 'error');
        $('btnEntrar').disabled = false;
        $('textoEntrar').textContent = 'Vuelve a intentarlo.';
    }
}
async function arrancar() {
    if (window.self !== window.top) return;
    try {
        const respuesta = await prepararMsal();
        if (respuesta || pca.getAllAccounts().length > 0) {
            $('btnEntrar').disabled = true;
            $('textoEntrar').textContent = 'Entrando…';
            await sesionIniciada();
        }
    } catch (e) {
        avisar('No se pudo terminar el inicio de sesión: ' + (e && e.message ? e.message : e), 'error');
        $('btnEntrar').disabled = false;
    }
}
async function salir() {
    const { ok } = await confirmar({ titulo: 'Salir de la app', ok: 'Salir', texto: 'Se cierra la sesión de MINSA en este dispositivo. Lo guardado ya está en las listas.' });
    if (!ok) return;
    try { await pca.logoutRedirect({ account: estado.cuenta }); }
    catch (_) { sessionStorage.clear(); window.location.reload(); }
}
async function refrescarCliente() {
    try {
        estado.token = await token();
    } catch (e) {
        const pideInteraccion = (typeof msal !== 'undefined' && msal.InteractionRequiredAuthError && e instanceof msal.InteractionRequiredAuthError)
            || (e && e.errorCode === 'interaction_required');
        if (pideInteraccion) { avisar('La sesión caducó: volviendo a entrar…', 'ojo'); await pca.acquireTokenRedirect({ scopes: CONFIG.scopes, account: pca.getAllAccounts()[0] }); }
        throw e;
    }
    estado.cliente = crearCliente(CONFIG.graph, estado.token);
}
function ponerQuien(texto) {
    for (const q of document.querySelectorAll('.quien')) q.textContent = texto;
    $('rolMovil').textContent = texto.includes(' · ') ? texto.split(' · ').pop() : '';
}
function pintarSync(leyendo = false) {
    const t = Date.now() - estado.cargadoEl;
    const hace = !estado.cargadoEl ? '' : t < 60000 ? `hace ${Math.max(1, Math.round(t / 1000))} s` : t < 3600000 ? `hace ${Math.round(t / 60000)} min` : `hace ${Math.round(t / 3600000)} h`;
    for (const x of document.querySelectorAll('.sync')) {
        x.textContent = leyendo ? 'Leyendo las listas…' : estado.cargadoEl ? `Al día · leído ${hace}` : '';
        x.classList.toggle('viejo', !leyendo && t > 300000);
    }
}
setInterval(() => { if (estado.siteId) pintarSync(recargando); }, 15000);

async function sesionIniciada() {
    estado.cuenta = pca.getAllAccounts()[0];
    await refrescarCliente();
    ponerQuien(estado.cuenta.username);
    $('textoEntrar').textContent = 'Abriendo el sitio Administración…';
    estado.siteId = await estado.cliente.sitio(CONFIG.sharepointHost, CONFIG.sitio);
    await cargarTodo();
    estado.rol = rolDe(estado.cuenta.username, estado.roles);
    ponerQuien(`${estado.cuenta.username} · ${estado.rol}`);
    $('pantallaEntrar').classList.add('oculto');
    $('shell').classList.remove('sin-sesion');
    $('rail').classList.remove('oculto');
    $('barraMovil').classList.remove('oculto');
    $('syncMovil').classList.remove('oculto'); pintarSync();
    pintarRailEquipos();
    irA('inicio');
}

// ---------------------------------------------------------------- carga

let recargando = false;
async function cargarTodo() {
    recargando = true; pintarSync(true);
    const c = estado.cliente, s = estado.siteId;
    try {
        const [proyectos, tareas, ligas, roles, actividad] = await Promise.all([
            c.renglones(s, L.proyectos), c.renglones(s, L.tareas), c.renglones(s, L.ligas), c.renglones(s, L.roles), c.renglones(s, L.actividad)
        ]);
        estado.proyectos = proyectos; estado.tareas = tareas; estado.ligas = ligas; estado.roles = roles;
        estado.actividad = actividad.sort((a, b) => String(b.Cuando || '').localeCompare(String(a.Cuando || '')));
        estado.buzonExiste = {};
        estado.cargadoEl = Date.now();
        if (estado.proyectoAbierto) estado.proyectoAbierto = porId(estado.proyectos, estado.proyectoAbierto.id);
    } finally { recargando = false; pintarSync(); }
}
async function recargar() {
    if (recargando) return;
    $('btnActualizar').disabled = true;
    try {
        await refrescarCliente();
        await cargarTodo();
        estado.rol = rolDe(estado.cuenta.username, estado.roles);
        ponerQuien(`${estado.cuenta.username} · ${estado.rol}`);
        repintar();
    } catch (e) { avisar('No se pudieron releer las listas: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('btnActualizar').disabled = false; }
}
// Refresco automatico mientras la app esta a la vista; nunca borra un dialogo abierto.
if (CONFIG.refrescoMs > 0 && new URLSearchParams(location.search).get('refresco') !== '0') {
    setInterval(() => { if (estado.siteId && document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) recargar(); }, CONFIG.refrescoMs);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado.siteId && Date.now() - estado.cargadoEl > 60000 && !document.querySelector('dialog[open]')) recargar(); });

// ---------------------------------------------------------------- navegacion

function irA(p) {
    estado.pestana = p;
    for (const s of document.querySelectorAll('.pantalla')) s.classList.add('oculto');
    $('p-' + (p === 'proyecto' ? 'proyecto' : p)).classList.remove('oculto');
    for (const b of document.querySelectorAll('#pestanas button')) {
        const on = b.dataset.p === p || (p === 'proyecto' && b.dataset.p === 'proyectos');
        b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    limpiarAvisos();
    repintar();
    window.scrollTo({ top: 0 });
}
function repintar() {
    pintarInsignias();
    if (estado.pestana === 'inicio') pintarInicio();
    else if (estado.pestana === 'proyectos') pintarProyectos();
    else if (estado.pestana === 'proyecto') pintarProyecto();
    else if (estado.pestana === 'mis') pintarMisTareas();
}
alCambiarTareas(repintar);
alCambiarDocs(repintar);

const activos = () => estado.proyectos.filter(p => p.Estado === 'activo');
const misAbiertas = () => { const yo = estado.cuenta.username.toLowerCase(); return estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === yo && t.Columna !== 'hecho'); };

function pintarInsignias() {
    const mias = misAbiertas();
    const vencidas = mias.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger').length;
    $('nMis').textContent = String(vencidas || mias.length); $('nMis').hidden = mias.length === 0;
    $('nMis').classList.toggle('is-danger', vencidas > 0);
    const n = activos().length; $('nProyectos').textContent = String(n); $('nProyectos').hidden = n === 0;
}
function pintarRailEquipos() {
    const c = $('railEquipos'); c.textContent = '';
    c.appendChild(el('div', 'mn-label', 'Equipos'));
    for (const e of CONFIG.equipos) {
        const b = boton('', '', () => { estado.filtroEquipo = estado.filtroEquipo === e.clave ? null : e.clave; irA('proyectos'); });
        const i = el('i'); i.style.background = e.color; b.appendChild(i); b.appendChild(el('span', '', e.nombre));
        c.appendChild(b);
    }
}

// ---------------------------------------------------------------- Inicio

function renglonProyecto(p) {
    const ts = tareasDe(p, estado.tareas); const a = avance(ts); const eq = equipoDe(p);
    const r = el('button', 'renglon'); r.type = 'button'; r.dataset.open = String(p.id);
    const t = el('span', 't'); const punto = el('span', 'punto'); punto.style.background = eq.color; t.appendChild(punto); t.appendChild(el('span', '', p.Title)); r.appendChild(t);
    r.appendChild(el('span', 'mn-mono pct', `${a.hechas}/${a.total} · ${a.pct}%`));
    const m = el('span', 'm');
    m.appendChild(chip(eq.nombre));
    if (p.Estado === 'cerrado') m.appendChild(chip(`cerrado ${fechaCorta(p.CerradoEl)}`, 'ok'));
    else if (p.Vence) { const d = diasPara(p.Vence); m.appendChild(d < 0 ? chip(`venció ${fechaCorta(p.Vence)}`, 'danger') : chip(`fin ${fechaCorta(p.Vence)}`, d <= CONFIG.vencePronto ? 'warn' : null)); }
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))];
    const avs = el('span', 'avs'); for (const q of quienes.slice(0, 6)) avs.appendChild(avatar(q)); m.appendChild(avs);
    r.appendChild(m);
    const barra = el('span', 'barra'); const i = el('i'); i.style.width = a.pct + '%'; barra.appendChild(i); r.appendChild(barra);
    r.addEventListener('click', () => abrirProyecto(p.id));
    return r;
}
function itemMini(quien, texto, sub, derecha, claseDerecha) {
    const it = el('div', 'it');
    it.appendChild(avatar(quien));
    const c = el('div'); c.appendChild(el('span', '', texto)); if (sub) c.appendChild(el('div', 'w', sub)); it.appendChild(c);
    it.appendChild(el('span', 'd' + (claseDerecha ? ' is-' + claseDerecha : ''), derecha || ''));
    return it;
}
function pintarInicio() {
    const yo = nombreDe(estado.cuenta.username, estado.roles);
    $('inicioSub').textContent = `${yo} · ${estado.rol} · ${activos().length} proyecto(s) activo(s)`;
    const abiertas = estado.tareas.filter(t => t.Columna !== 'hecho' && activos().some(p => p.id === Number(t.ProyectoId)));
    const mias = misAbiertas();
    const s7 = abiertas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'warn').length;
    const ven = abiertas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger').length;
    const k = $('inicioKpis'); k.textContent = '';
    const kpi = (v, l, cls) => { const d = el('div', 'mn-kpi' + (cls ? ' is-' + cls : '')); d.appendChild(el('span', 'mn-kpi-label', l)); d.appendChild(el('span', 'mn-kpi-val', String(v))); k.appendChild(d); };
    kpi(activos().length, 'proyectos activos', 'info'); kpi(mias.length, 'mis tareas abiertas'); kpi(s7, 'vencen en 7 días', s7 ? 'warn' : null); kpi(ven, 'vencidas', ven ? 'danger' : 'ok');
    const lp = $('inicioProyectos'); lp.textContent = '';
    for (const p of activos().sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')))) lp.appendChild(renglonProyecto(p));
    if (!activos().length) lp.appendChild(el('p', 'vacio', PUEDE.proyecto(estado.rol) ? 'Sin proyectos activos: crea el primero en Proyectos.' : 'Sin proyectos activos todavía.'));
    const v = $('inicioVence'); v.textContent = '';
    for (const { tarea: t, dias } of proximos(abiertas, 6)) { const p = porId(estado.proyectos, t.ProyectoId); v.appendChild(itemMini(t.Asignado, t.Title, p ? p.Title : '', fechaCorta(t.Vence), dias < 0 ? 'danger' : dias <= CONFIG.vencePronto ? 'warn' : null)); }
    if (!v.childNodes.length) v.appendChild(el('p', 'vacio', 'Nada por vencer.'));
    const sm = $('inicioSinMov'); sm.textContent = '';
    const quietas = sinMovimiento(abiertas, CONFIG.sinMovimientoDias);
    for (const t of quietas.slice(0, 6)) { const p = porId(estado.proyectos, t.ProyectoId); sm.appendChild(itemMini(t.Asignado, t.Title, p ? p.Title : '', `${-diasPara(t.Desde)} d`, 'warn')); }
    $('cardSinMov').classList.toggle('oculto', quietas.length === 0);
    const act = $('inicioActividad'); act.textContent = '';
    for (const a of estado.actividad.slice(0, 8)) { const p = porId(estado.proyectos, a.ProyectoId); act.appendChild(itemMini(a.Quien, `${nombreDe(a.Quien, estado.roles).split(' ')[0]} ${a.Title}`, p ? p.Title : '', fechaHora(a.Cuando))); }
    if (!estado.actividad.length) act.appendChild(el('p', 'vacio', 'Sin actividad todavía.'));
}

// ---------------------------------------------------------------- Proyectos

function pintarProyectos() {
    $('btnNuevoProyecto').disabled = !PUEDE.proyecto(estado.rol);
    $('btnNuevoProyecto').title = PUEDE.proyecto(estado.rol) ? '' : 'Solo gerencia crea proyectos';
    const f = $('filtroEquipos'); f.textContent = '';
    f.appendChild(boton('Todos', estado.filtroEquipo ? '' : 'is-on', () => { estado.filtroEquipo = null; pintarProyectos(); }));
    for (const e of CONFIG.equipos) f.appendChild(boton(e.nombre, estado.filtroEquipo === e.clave ? 'is-on' : '', () => { estado.filtroEquipo = estado.filtroEquipo === e.clave ? null : e.clave; pintarProyectos(); }));
    const filtro = p => !estado.filtroEquipo || p.Equipo === estado.filtroEquipo;
    const l = $('listaProyectos'); l.textContent = '';
    const act = activos().filter(filtro).sort((a, b) => String(a.Vence || '9').localeCompare(String(b.Vence || '9')));
    for (const p of act) l.appendChild(renglonProyecto(p));
    if (!act.length) l.appendChild(el('p', 'vacio', estado.filtroEquipo ? `Sin proyectos activos de ${estado.filtroEquipo}.` : 'Sin proyectos activos.'));
    const c = $('listaCerrados'); c.textContent = '';
    const cer = estado.proyectos.filter(p => p.Estado === 'cerrado' && filtro(p)).sort((a, b) => String(b.CerradoEl || '').localeCompare(String(a.CerradoEl || '')));
    for (const p of cer) c.appendChild(renglonProyecto(p));
    if (!cer.length) c.appendChild(el('p', 'vacio', 'Ninguno cerrado.'));
}

function abrirProyecto(id) {
    const p = porId(estado.proyectos, id); if (!p) return;
    estado.proyectoAbierto = p; estado.tab = 'tablero';
    irA('proyecto');
}
function pintarProyecto() {
    const p = estado.proyectoAbierto; if (!p) { irA('proyectos'); return; }
    const eq = equipoDe(p); const ts = tareasDe(p, estado.tareas); const a = avance(ts);
    $('pEquipo').textContent = eq.nombre; $('pEquipo').style.background = eq.color + '33';
    $('pTitulo').textContent = p.Title; $('pDesc').textContent = p.Descripcion || '';
    $('pPct').textContent = `${a.hechas}/${a.total} hechas · ${a.pct}%${p.Estado === 'cerrado' ? ' · CERRADO' : ''}`;
    $('btnEditarProyecto').disabled = !PUEDE.proyecto(estado.rol) || p.Estado !== 'activo';
    $('btnCerrarProyecto').disabled = !PUEDE.proyecto(estado.rol) || p.Estado !== 'activo';
    const faltan = ts.filter(t => t.Columna !== 'hecho').length;
    $('btnCerrarProyecto').textContent = p.Estado !== 'activo' ? 'Cerrado' : faltan ? `Cerrar proyecto · faltan ${faltan}` : 'Cerrar proyecto';
    $('btnNuevaTarea').disabled = !PUEDE.tarea(estado.rol) || p.Estado !== 'activo';
    for (const b of document.querySelectorAll('.tab')) b.classList.toggle('is-on', b.dataset.tab === estado.tab);
    for (const t of ['tablero', 'lista', 'docs']) $('tab-' + t).classList.toggle('oculto', estado.tab !== t);
    if (estado.tab === 'tablero') pintarTablero(p);
    else if (estado.tab === 'lista') pintarLista(p);
    else pintarDocs(p);
    // lateral
    $('pBarra').style.width = a.pct + '%';
    const kv = $('pAvance'); kv.textContent = '';
    const par = (k, v) => { kv.appendChild(el('b', '', k)); kv.appendChild(el('span', '', v)); };
    par('Hechas', `${a.hechas} de ${a.total}`); par('En curso', String(a.porColumna['en-curso'])); par('En revisión', String(a.porColumna['en-revision']));
    par('Fin del frente', fechaCorta(p.Vence)); par('Responsable', p.Responsable ? nombreDe(p.Responsable, estado.roles) : '—'); par('Clave', p.Clave);
    if (p.Carpeta) par('Carpeta', p.Carpeta);
    if (p.Estado === 'cerrado') par('Cerrado', `${nombreDe(p.CerradoPor, estado.roles)} · ${fechaCorta(p.CerradoEl)}`);
    const q = $('pQuienes'); q.textContent = '';
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))];
    for (const k of quienes) q.appendChild(itemMini(k, nombreDe(k, estado.roles), `${ts.filter(t => String(t.Asignado || '').toLowerCase() === k && t.Columna !== 'hecho').length} abiertas`, ''));
    if (!quienes.length) q.appendChild(el('p', 'vacio', 'Nadie asignado todavía.'));
    const v = $('pVence'); v.textContent = '';
    for (const { tarea: t, dias } of proximos(ts, 5)) v.appendChild(itemMini(t.Asignado, t.Title, '', fechaCorta(t.Vence), dias < 0 ? 'danger' : dias <= CONFIG.vencePronto ? 'warn' : null));
    if (!v.childNodes.length) v.appendChild(el('p', 'vacio', 'Nada por vencer.'));
    const act = $('pActividad'); act.textContent = '';
    for (const x of estado.actividad.filter(x => Number(x.ProyectoId) === p.id).slice(0, 6)) act.appendChild(itemMini(x.Quien, `${nombreDe(x.Quien, estado.roles).split(' ')[0]} ${x.Title}`, '', fechaHora(x.Cuando)));
    if (!act.childNodes.length) act.appendChild(el('p', 'vacio', 'Sin actividad todavía.'));
}

// ---------------------------------------------------------------- nuevo / editar / cerrar proyecto

let proyectoEnEdicion = null;
function abrirFormaProyecto(p) {
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia crea o edita proyectos.', 'error'); return; }
    proyectoEnEdicion = p || null;
    $('npTituloDlg').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
    $('npGuardar').textContent = p ? 'Guardar cambios' : 'Crear proyecto';
    opciones($('npEquipo'), CONFIG.equipos, e => e.clave, e => e.nombre, null);
    const personas = estado.roles.filter(r => r.Activo !== false).map(r => String(r.Title || '').toLowerCase()).filter(Boolean);
    opciones($('npResponsable'), personas, x => x, x => nombreDe(x, estado.roles), 'sin responsable');
    $('npTitulo').value = p ? p.Title : ''; $('npClave').value = p ? p.Clave : ''; $('npClave').disabled = !!p;
    $('npEquipo').value = p ? p.Equipo : CONFIG.equipos[0].clave; $('npVence').value = p && p.Vence ? fechaCorta(p.Vence) : '';
    $('npResponsable').value = p ? String(p.Responsable || '').toLowerCase() : ''; $('npDesc').value = p ? (p.Descripcion || '') : '';
    $('npNota').textContent = p ? `Carpeta destino en la biblioteca: ${p.Carpeta || '(default de la unidad)'} — se cambia desde la lista PROY_Proyectos.` : 'La clave es lo que se pega en el marcador ⏳ de la base de conocimiento: «· app: lau-asea-03-001». No cambia después.';
    abrirDialogo('dlgProyecto');
    $('npTitulo').focus();
}
$('npTitulo').addEventListener('input', () => { if (!proyectoEnEdicion && !$('npClave').dataset.tocada) $('npClave').value = $('npTitulo').value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); });
$('npClave').addEventListener('input', () => { $('npClave').dataset.tocada = '1'; });

async function guardarProyecto(ev) {
    ev.preventDefault();
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia crea o edita proyectos.', 'error'); return; }
    const titulo = $('npTitulo').value.trim();
    if (!titulo) { avisar('El proyecto necesita un nombre.', 'error'); $('npTitulo').focus(); return; }
    let vence;
    try { vence = aIsoDia($('npVence').value); } catch (e) { avisar(e.message, 'error'); return; }
    $('npGuardar').disabled = true;
    try {
        if (proyectoEnEdicion) {
            const p = proyectoEnEdicion;
            const campos = { Title: titulo, Equipo: $('npEquipo').value, Vence: vence, Responsable: $('npResponsable').value || null, Descripcion: $('npDesc').value.trim() || null };
            await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'));
            Object.assign(p, campos);
            cerrarDialogo('dlgProyecto'); avisar('Proyecto actualizado.', 'ok'); repintar();
            await registrarActividad('editar-proyecto', `editó el proyecto «${titulo.slice(0, 80)}»`, p.id, null); repintar();
            return;
        }
        // Clave: valida contra lo que hay en memoria Y contra la lista en vivo (dos gerentes a la vez).
        const v = validarClave($('npClave').value, estado.proyectos);
        if (!v.ok) { avisar('Clave: ' + v.motivo, 'error'); $('npClave').focus(); return; }
        const enVivo = await estado.cliente.renglones(estado.siteId, L.proyectos, `fields/Clave eq '${v.clave.replace(/'/g, "''")}'`);
        if (enVivo.length) { avisar(`Clave: ya hay un proyecto con la clave ${v.clave} (lo creó alguien más hace un momento).`, 'error'); return; }
        const campos = limpiar({ Title: titulo, Clave: v.clave, Equipo: $('npEquipo').value, Estado: 'activo', Vence: vence || undefined, Responsable: $('npResponsable').value || undefined, Descripcion: $('npDesc').value.trim() || undefined });
        const n = await estado.cliente.crearRenglon(estado.siteId, L.proyectos, campos, m => avisar(m, 'ojo'));
        estado.proyectos.push(n);
        cerrarDialogo('dlgProyecto');
        avisar(`Proyecto «${titulo}» creado. Clave: ${v.clave}.`, 'ok');
        $('npClave').dataset.tocada = '';
        await registrarActividad('crear-proyecto', `creó el proyecto «${titulo.slice(0, 80)}»`, n.id, null);
        abrirProyecto(n.id);
    } catch (e) { avisar('No se pudo guardar el proyecto: ' + (e && e.message ? e.message : e), 'error'); }
    finally { $('npGuardar').disabled = false; }
}

async function cerrarProyecto() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia cierra proyectos.', 'error'); return; }
    const faltan = tareasDe(p, estado.tareas).filter(t => t.Columna !== 'hecho').length;
    const { ok } = await confirmar({ titulo: 'Cerrar el proyecto', ok: 'Cerrar', texto: `«${p.Title}» pasa a cerrado con tu sello. Sale de Inicio; sus tarjetas quedan como registro y nada se borra.${faltan ? ` Ojo: quedan ${faltan} tarjeta(s) sin terminar.` : ''}` });
    if (!ok) return;
    const campos = { Estado: 'cerrado', CerradoPor: estado.cuenta.username, CerradoEl: new Date().toISOString() };
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'));
        Object.assign(p, campos);
        avisar(`Proyecto «${p.Title}» cerrado.`, 'ok'); repintar();
        await registrarActividad('cerrar-proyecto', `cerró el proyecto «${p.Title.slice(0, 80)}»${faltan ? ` con ${faltan} tarjeta(s) abiertas` : ''}`, p.id, null); repintar();
    } catch (e) { avisar('No se pudo cerrar: ' + (e && e.message ? e.message : e), 'error'); }
}

// ---------------------------------------------------------------- tema

function aplicarTema(t) {
    if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.theme = t === 'oscuro' ? 'dark' : 'light';
    else delete document.documentElement.dataset.theme;
    for (const b of document.querySelectorAll('.tema button')) b.setAttribute('aria-pressed', b.dataset.tema === t ? 'true' : 'false');
    const oscuro = t === 'oscuro' || (t !== 'claro' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const mt = $('metaTema'); if (mt) mt.content = oscuro ? '#0b1220' : '#f7f9fc';   // el arnés E2E no monta el <head>
}
try { aplicarTema(localStorage.getItem('tema') || ''); } catch (_) { aplicarTema(''); }
for (const b of document.querySelectorAll('.tema button')) b.addEventListener('click', () => {
    const t = b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.tema;
    try { if (t) localStorage.setItem('tema', t); else localStorage.removeItem('tema'); } catch (_) {}
    aplicarTema(t);
});

// ---------------------------------------------------------------- enganche

$('btnEntrar').addEventListener('click', entrar);
$('btnSalir').addEventListener('click', salir);
$('btnSalirMovil').addEventListener('click', salir);
$('btnActualizar').addEventListener('click', recargar);
$('btnActualizarMovil').addEventListener('click', () => { $('menuMovil').open = false; recargar(); });
for (const b of document.querySelectorAll('#pestanas button')) b.addEventListener('click', () => irA(b.dataset.p));
for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => { estado.tab = b.dataset.tab; pintarProyecto(); });
$('btnVolver').addEventListener('click', () => irA('proyectos'));
$('btnNuevoProyecto').addEventListener('click', () => abrirFormaProyecto(null));
$('btnEditarProyecto').addEventListener('click', () => abrirFormaProyecto(estado.proyectoAbierto));
$('btnCerrarProyecto').addEventListener('click', cerrarProyecto);
$('formProyecto').addEventListener('submit', guardarProyecto);
$('npCancelar').addEventListener('click', () => cerrarDialogo('dlgProyecto'));
engancharTablero();
engancharDocs();
activarMascaraFechas();
$('shell').classList.add('sin-sesion');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => reg.update && reg.update()).catch(() => {});
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargado || !navigator.serviceWorker.controller) return; recargado = true; if (!estado.siteId) window.location.reload(); });
}

arrancar();
