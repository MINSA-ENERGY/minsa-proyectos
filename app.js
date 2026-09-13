// MINSA Proyectos — proyectos multiusuario del holding. v0.1.0: piloto (Inicio · Proyectos ·
// Proyecto [Tablero / Lista / Documentos] · Mis tareas). v0.3.0: tanda 2 de la auditoria (reabrir,
// carpeta destino, filtros y orden, subir/bajar, mover de proyecto, KPI y rail vivos, «→ siguiente»
// con Deshacer, tablero por pestanas en celular, If-Match, sin red, enlaces).
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
import { crearCliente, esConflicto } from './graph.js';
import { rolDe, PUEDE, validarClave, tareasDe, avance, proximos, sinMovimiento, sinDueno, nombreDe, diasPara, estadoVence, ordenarProyectos, filtrarProyectos, columnasDe, segmentosDe, tituloSegmentos, partesEnProceso, desdeHaceDias, nuevoParaMi } from './reglas.js';
import { $, L, VERSION, estado, el, boton, avatar, chip, chipVence, avisar, limpiarAvisos, abrirDialogo, cerrarDialogo, confirmar, fechaCorta, fechaHora, aIsoDia, diaInput, opciones, limpiar, porId, registrarActividad, equipoDe, iconoEquipo, hashDe, fijarHash, irAHash, aplicar, fijarReleer, pedirRelectura, fijarAlCerrar, verboComentario, mencionesA, comentariosDe, comentariosNuevos, textoConMenciones, actividadVisible, columnasDeTarea, fusionarActividad, asegurarActividadDe, inicioVistoHasta, marcarInicioVisto, guardarVisto } from './comun.js';
import { pintarTablero, pintarLista, pintarMisTareas, engancharTablero, alCambiarTareas, abrirTarjeta, tarjetaAbiertaId, pintarFiltroTareas, pintarBotonFiltros, abrirNuevaTarea } from './tablero.js';
import { pintarDocs, engancharDocs, alCambiarDocs, abrirLigar, abrirEnlace, puedeLigarEn } from './docs.js';
import { pintarChat, engancharChat, alCambiarChat, fijarAbrirTarjeta, salirDelChat } from './chat.js';
import { pintarRoadmap, pintarRoadmapProyecto, pintarCalendario, engancharCalendario, pintarMensajes, mensajesNuevos, pintarArchivos, engancharArchivos, pintarReportes, engancharReportes, anillo } from './vistas.js';

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
        if (pca.getAllAccounts().length === 0) {
            // La ida y vuelta por login.microsoftonline.com pierde el hash: se guarda para aterrizar ahi.
            try { if (esHashDeLaApp(location.hash)) sessionStorage.setItem('proy.destino', location.hash); } catch (_) {}
            await pca.loginRedirect({ scopes: CONFIG.scopes }); return;
        }
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
    // v0.13.1 (auditoria de seguridad): el cliente pide el token VIGENTE en cada peticion (MSAL lo renueva en
    // silencio y lo cachea, asi que es barato); si la renovacion falla se usa el ultimo leido y el 401 lo dice.
    estado.cliente = crearCliente(CONFIG.graph, async () => { try { estado.token = await token(); } catch (_) { /* se queda el ultimo */ } return estado.token; });
}
/* A5 (2026-09-12): el correo + rol en un solo span se partia a media palabra («gerenci / a»).
   Ahora: nombre en negrita, rol como chip, correo en el title. */
function ponerQuien(texto) {
    const rol = texto.includes(' · ') ? texto.split(' · ').pop() : '';
    const correo = texto.split(' · ')[0];
    for (const q of document.querySelectorAll('.quien')) {
        q.textContent = ''; q.title = correo;
        q.appendChild(el('b', '', nombreDe(correo, estado.roles)));
        if (rol) { const c = el('div'); c.appendChild(chip(rol, rol === 'gerencia' ? 'info' : null)); q.appendChild(c); }
    }
    $('rolMovil').textContent = rol;
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
    // F13: la misma lista en Microsoft Lists (su vista Tablero es el plan B gratis del plan).
    const urlLista = estado.cliente.urlDeLista(L.tareas);
    for (const id of ['lnkSharePoint', 'lnkSharePointMovil']) { $(id).classList.toggle('oculto', !urlLista); if (urlLista) $(id).href = urlLista; }
    // Aterriza donde diga el hash (deep link, F5, o el destino guardado antes del login); si no, Inicio.
    let destino = null;
    try { destino = sessionStorage.getItem('proy.destino'); sessionStorage.removeItem('proy.destino'); } catch (_) {}
    if (!esHashDeLaApp(location.hash) && destino) fijarHash(destino);
    estado.pestana = null;
    aplicarHash();
}

// ---------------------------------------------------------------- carga

let recargando = false;
async function cargarTodo() {
    recargando = true; pintarSync(true);
    const c = estado.cliente, s = estado.siteId;
    try {
        // v0.13.1 (auditoria de rendimiento): PROY_Actividad se lee ACOTADA a CONFIG.actividadDias (Cuando esta
        // indexada) y el proyecto abierto se completa con todo su historial en la misma tanda. Si el tenant
        // rechazara el filtro de fecha (400), se cae a la lectura entera de antes y se avisa en consola.
        const piso = desdeHaceDias(CONFIG.actividadDias);
        const abierto = estado.proyectoAbierto ? Number(estado.proyectoAbierto.id) : 0;
        const actividadAcotada = async () => {
            if (!piso) return c.renglones(s, L.actividad);
            try { return await c.renglones(s, L.actividad, `fields/Cuando ge '${piso}'`); }
            catch (e) { if (!/HTTP 400/.test(String(e && e.message))) throw e; console.warn('PROY_Actividad: el filtro por fecha dio 400; se lee entera.', e.message); return c.renglones(s, L.actividad); }
        };
        const [proyectos, tareas, ligas, roles, actividad, delAbierto] = await Promise.all([
            c.renglones(s, L.proyectos), c.renglones(s, L.tareas), c.renglones(s, L.ligas), c.renglones(s, L.roles), actividadAcotada(),
            abierto && piso ? c.renglones(s, L.actividad, `fields/ProyectoId eq ${abierto}`).catch(() => null) : Promise.resolve(null)
        ]);
        estado.proyectos = proyectos; estado.tareas = tareas; estado.ligas = ligas; estado.roles = roles;
        estado.actividad = actividad.sort((a, b) => String(b.Cuando || '').localeCompare(String(a.Cuando || '')));
        estado.actividadCompleta = new Set(piso ? [] : proyectos.map(p => p.id));
        if (delAbierto) { estado.actividadCompleta.add(abierto); fusionarActividad(delAbierto); }
        estado.buzonExiste = {};
        estado.cargadoEl = Date.now();
        if (estado.proyectoAbierto) estado.proyectoAbierto = porId(estado.proyectos, estado.proyectoAbierto.id);
    } finally { recargando = false; pintarSync(); }
}
async function recargar() {
    // La guarda va ANTES de refrescar el token: dos cierres seguidos (cerrarDialogo + el evento close,
    // E4) o dos clics llegaban los dos a cargarTodo si el primero seguia esperando la red (revisor, 2026-09-12).
    if (recargando) return;
    recargando = true; $('btnActualizar').disabled = true;
    try {
        await refrescarCliente();
        await cargarTodo();
        estado.rol = rolDe(estado.cuenta.username, estado.roles);
        ponerQuien(`${estado.cuenta.username} · ${estado.rol}`);
        // T3: se repinta SIEMPRE (los chips «venció»/«vence hoy» dependen del reloj, y el DOM viejo
        // engancha objetos viejos), pero sin mover la posicion de lectura. «Solo si cambio» se
        // intento y se retiro en la revision de v0.4.0 por esas dos razones.
        const y = window.scrollY; repintar(); window.scrollTo({ top: y });
    } catch (e) { avisar('No se pudieron releer las listas: ' + (e && e.message ? e.message : e), 'error'); }
    finally { recargando = false; $('btnActualizar').disabled = false; pintarSync(); }
}
// Refresco automatico mientras la app esta a la vista; nunca borra un dialogo de EDICION abierto.
// E4 (v0.6.0): Equipo y Toda la actividad son de lectura y alguien los deja abiertos minutos; con
// ellos abiertos se sigue releyendo, y al cerrarlos se relee si ya pasaron 60 s (la regla de visibilitychange).
const DLG_EDICION = ['dlgTarea', 'dlgNuevaTarea', 'dlgProyecto', 'dlgCubetas', 'dlgLigar', 'dlgSubir', 'dlgEnlace', 'dlg'];
const editando = () => DLG_EDICION.some(id => $(id).open);
const rancio = () => estado.siteId && Date.now() - estado.cargadoEl > 60000;
if (CONFIG.refrescoMs > 0 && new URLSearchParams(location.search).get('refresco') !== '0') {
    setInterval(() => { if (estado.siteId && document.visibilityState === 'visible' && !editando()) recargar(); }, CONFIG.refrescoMs);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && rancio() && !editando()) recargar(); });
// v0.15.0: la marca de lectura compartida se manda agrupada (1.5 s); al ocultarse la pagina se empuja lo que quede.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarVisto(); });
window.addEventListener('pagehide', () => { guardarVisto(); });
const DLG_LECTURA = ['dlgEquipo', 'dlgActividad'];
fijarAlCerrar(id => { if (DLG_LECTURA.includes(id) && rancio() && !editando()) recargar(); });
for (const id of DLG_LECTURA) $(id).addEventListener('close', () => { if (rancio() && !editando()) recargar(); });   // Esc no pasa por cerrarDialogo
fijarReleer(recargar);   // un 412 (alguien cambio el renglon) se resuelve releyendo: la verdad esta en SharePoint

// T2: sin red se ve, no se guarda. La banda lo dice; graph.js falla YA en cualquier escritura; al
// volver la red se releen las listas (no se reintenta el ultimo cambio: un cambio viejo sorprende).
function pintarRed() {
    const sin = navigator.onLine === false;
    $('sinRed').classList.toggle('oculto', !sin);
    document.body.classList.toggle('sin-red', sin);
}
window.addEventListener('offline', pintarRed);
window.addEventListener('online', () => { pintarRed(); if (estado.siteId) recargar(); });
pintarRed();

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
    fijarHash(hashDe(tarjetaAbiertaId()));
    window.scrollTo({ top: 0 });
}
// Router por hash (v0.2.0, F8): LEE location.hash y deja la pantalla como dice; es idempotente, asi
// que las escrituras propias (fijarHash desde irA / abrirTarjeta) no repintan dos veces. Con Atras
// del navegador se cierra la tarjeta o se vuelve a la pantalla anterior, que es lo que la gente espera.
// v0.10.0: cinco pantallas mas (roadmap · calendario · mensajes · archivos · reportes) y la pestana roadmap del proyecto.
const RE_HASH = /^#(?:(inicio|proyectos|mis|roadmap|calendario|mensajes|archivos|reportes)|p\/([a-z0-9-]+)(?:\/(lista|docs|chat|tablero|resumen|roadmap))?)(?:\/t\/(\d+))?$/;
function esHashDeLaApp(h) { return RE_HASH.test(String(h || '')); }
function aplicarHash() {
    if (!estado.siteId) return;
    const m = RE_HASH.exec(location.hash || '');
    if (!m) { irA('inicio'); return; }
    if (m[2]) {
        const p = estado.proyectos.find(x => String(x.Clave || '') === m[2]);
        if (!p) { irA('inicio'); avisar(`No hay un proyecto con la clave «${m[2]}».`, 'ojo'); return; }
        const tab = m[3] || 'tablero';
        if (estado.pestana !== 'proyecto' || !estado.proyectoAbierto || estado.proyectoAbierto.id !== p.id || estado.tab !== tab) {
            fijarProyectoAbierto(p); estado.tab = tab; irA('proyecto');
        }
    } else if (estado.pestana !== m[1]) irA(m[1]);
    const id = m[4] ? Number(m[4]) : null;
    if (id) { if (tarjetaAbiertaId() !== id) { if (porId(estado.tareas, id)) abrirTarjeta(id); else avisar(`No hay una tarjeta #${id}.`, 'ojo'); } }
    else if ($('dlgTarea').open) cerrarDialogo('dlgTarea');
}
window.addEventListener('popstate', aplicarHash);     // Atras / Adelante (fijarHash escribe con pushState)
window.addEventListener('hashchange', aplicarHash);   // una URL pegada o editada a mano
/** Deja `p` como proyecto abierto; si es OTRO proyecto, el filtro de tarjetas y la columna del celular vuelven al default. */
function fijarProyectoAbierto(p) {
    if (!estado.proyectoAbierto || estado.proyectoAbierto.id !== p.id) {
        estado.filtroTareas = { quien: null, alta: false, vencidas: false, sinDueno: false, texto: '' }; $('filtroTexto').value = '';
        estado.colMovil = null; estado.ordenLista = { col: 'vence', dir: 1 };   // v0.11.0: null = la primera cubeta del proyecto
        estado.hechoTodas = false; estado.filtroDocs = null; estado.buscaDocs = '';   // v0.17.0: el buscador de Docs tampoco viaja entre proyectos
        estado.ordenDocs = { col: 'fecha', dir: -1 };   // v0.18.0: ni su orden (una columna oculta en este panel no puede quedar mandando)
    }
    estado.proyectoAbierto = p;
    // v0.13.1: la actividad de este proyecto se completa fuera de la ventana (chat y notas viejas); si trae algo
    // nuevo y el proyecto sigue abierto, se repinta. Best-effort: sin red se queda lo que hay.
    asegurarActividadDe(p.id).then(hubo => { if (hubo && estado.proyectoAbierto && estado.proyectoAbierto.id === p.id) repintar(); });
}
function repintar() {
    if (estado.pestana !== 'proyecto' || estado.tab !== 'chat') salirDelChat();   // v0.9.0: la proxima vez que se vea el chat cuenta como «entrar»
    if (estado.pestana !== 'inicio') estado.nuevosInicio = null;   // v0.15.0: la proxima visita a Inicio fija otro conjunto de «Nuevo para ti»
    document.body.classList.toggle('is-chat', estado.pestana === 'proyecto' && estado.tab === 'chat');   // v0.15.0: en celular el FAB se esconde en el chat
    pintarInsignias();
    pintarRailEquipos();
    if (estado.pestana === 'inicio') pintarInicio();
    else if (estado.pestana === 'proyectos') pintarProyectos();
    else if (estado.pestana === 'proyecto') pintarProyecto();
    else if (estado.pestana === 'mis') pintarMisTareas();
    else if (estado.pestana === 'roadmap') pintarRoadmap();
    else if (estado.pestana === 'calendario') pintarCalendario();
    else if (estado.pestana === 'mensajes') pintarMensajes();
    else if (estado.pestana === 'archivos') pintarArchivos();
    else if (estado.pestana === 'reportes') pintarReportes();
}
alCambiarTareas(repintar);
alCambiarDocs(repintar);
alCambiarChat(repintar);
fijarAbrirTarjeta(abrirTarjeta);

const activos = () => estado.proyectos.filter(p => p.Estado === 'activo');
const misAbiertas = () => { const yo = estado.cuenta.username.toLowerCase(); return estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === yo && t.Columna !== 'hecho'); };

function pintarInsignias() {
    const mias = misAbiertas();
    // T4: el contador del rail siempre es VENCIDAS (rojo) y nada si no hay; el total abierto vive en el KPI de Inicio.
    const vencidas = mias.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger').length;
    $('nMis').textContent = String(vencidas); $('nMis').hidden = vencidas === 0;
    const n = activos().length; $('nProyectos').textContent = String(n); $('nProyectos').hidden = n === 0;
    // D5: el lector de pantalla leia «Mis tareas 1» sin decir que el 1 son vencidas.
    const nombrar = (id, texto) => { $(id).setAttribute('aria-label', texto); $(id).title = texto; };
    nombrar('nMis', `${vencidas} vencida${vencidas === 1 ? '' : 's'}`);
    nombrar('nProyectos', `${n} activo${n === 1 ? '' : 's'}`);
    // v0.10.0: mensajes nuevos desde tu ultima visita (v0.9.0, por dispositivo), sumados sobre los frentes activos.
    const nm = mensajesNuevos(); $('nMensajes').textContent = String(nm); $('nMensajes').hidden = nm === 0;
    nombrar('nMensajes', `${nm} mensaje${nm === 1 ? '' : 's'} nuevo${nm === 1 ? '' : 's'}`);
}
/** Rail de equipos (U2, v0.7.0): agrupados por RAMA como el rail del Tablero de escritorio (opcion A del
 *  artifact c52cb229, Carlos 2026-09-12), cada uno con su icono en su color y cuantos proyectos activos lleva.
 *  El filtro puesto se ve (is-on) y el segundo clic lo quita. Un equipo fuera de CONFIG.ramas cae en «Otros». */
function pintarRailEquipos() {
    const c = $('railEquipos'); c.textContent = '';
    const ramas = [...CONFIG.ramas, ...CONFIG.equipos.map(e => e.rama || 'Otros').filter(r => !CONFIG.ramas.includes(r))];
    for (const r of ramas) {
        const eqs = CONFIG.equipos.filter(e => (e.rama || 'Otros') === r); if (!eqs.length) continue;
        c.appendChild(el('div', 'mn-label rama', r));
        for (const e of eqs) {
            const on = estado.filtroEquipo === e.clave;
            const b = boton('', on ? 'is-on' : '', () => { estado.filtroEquipo = on ? null : e.clave; if (['proyectos', 'roadmap', 'calendario', 'reportes'].includes(estado.pestana)) repintar(); else irA('proyectos'); }, { equipo: e.clave });   // v0.10.0: el filtro vive donde se puso
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.appendChild(iconoEquipo(e, 'sm')); b.appendChild(el('span', '', e.nombre));
            const n = activos().filter(p => p.Equipo === e.clave).length;
            if (n) b.appendChild(el('span', 'n', String(n)));
            c.appendChild(b);
        }
    }
    // En celular el rail es barra de pestanas y los equipos no caben: el mismo filtro es un <select> en Proyectos.
    const sel = $('filtroEquipoMovil');
    opciones(sel, CONFIG.equipos, e => e.clave, e => { const n = activos().filter(p => p.Equipo === e.clave).length; return n ? `${e.nombre} · ${n}` : e.nombre; }, 'Todos los equipos');
    sel.value = estado.filtroEquipo || '';
}

// ---------------------------------------------------------------- Inicio

/**
 * C8 (v0.6.0): el reloj del frente CRUZADO con lo que falta — «vence en 6 d · faltan 10» (ámbar a
 * `vencePronto` días, rojo vencido). Sin fecha, o lejos, devuelve null y la lista pinta «fin dd/mm».
 */
function chipReloj(p, ts) {
    if (p.Estado !== 'activo' || !p.Vence) return null;
    const d = diasPara(p.Vence); if (d === null || d > CONFIG.vencePronto) return null;
    const faltan = ts.filter(t => t.Columna !== 'hecho').length;
    const reloj = d < 0 ? `venció hace ${-d} d` : d === 0 ? 'vence hoy' : `vence en ${d} d`;
    const c = chip(`${reloj} · faltan ${faltan}`, d < 0 ? 'danger' : 'warn'); c.dataset.reloj = String(p.id);
    return c;
}
/**
 * v0.7.0 — «reloj primero» (opcion C del artifact c52cb229, Carlos 2026-09-12): el dato grande es cuantos dias
 * faltan para el fin del frente (rojo vencido · ambar <= vencePronto · gris lejos o sin fecha), luego el icono del
 * equipo, el titulo y una linea con lo que hay adentro (hechas/total · en curso · en revision · que tarjeta sigue)
 * y a la derecha quienes estan y la barra por columna. La lista ya viene ordenada por fecha (C10), asi que se
 * lee como agenda. El nombre del equipo NO se escribe: va en el title del icono. `.renglon` y `.t` se conservan
 * porque la E2E y el driver de capturas los usan.
 */
function renglonProyecto(p) {
    const ts = tareasDe(p, estado.tareas); const a = avance(ts, columnasDe(p)); const eq = equipoDe(p);
    const d = p.Estado === 'activo' ? diasPara(p.Vence) : null;
    const k = p.Estado !== 'activo' ? 'cerrado' : d === null ? 'idle' : d < 0 ? 'danger' : d <= CONFIG.vencePronto ? 'warn' : 'info';
    const r = el('button', 'renglon is-' + k); r.type = 'button'; r.dataset.open = String(p.id);
    // reloj
    const dias = el('span', 'dias');
    if (p.Estado !== 'activo') { dias.appendChild(el('b', '', '✓')); dias.appendChild(el('small', '', 'cerrado')); }
    else if (d === null) { dias.appendChild(el('b', '', '—')); dias.appendChild(el('small', '', 'sin fecha')); }
    else { dias.appendChild(el('b', '', d < 0 ? `−${-d}` : String(d))); dias.appendChild(el('small', '', d < 0 ? 'vencido' : d === 0 ? 'hoy' : d === 1 ? 'día' : 'días')); }
    dias.title = p.Vence ? `Fin del frente: ${fechaCorta(p.Vence)}` : 'Sin fin del frente';
    r.appendChild(dias);
    r.appendChild(iconoEquipo(eq));
    // cuerpo
    const cuerpo = el('span', 'cuerpo');
    cuerpo.appendChild(el('span', 't', p.Title));
    const partes = [`${a.hechas}/${a.total} hechas`, ...partesEnProceso(a)];   // v0.11.0: una parte por cubeta de en medio con tarjetas
    const [sig] = proximos(ts, 1);
    if (sig && p.Estado === 'activo') partes.push(`sigue: ${sig.tarea.Title}${sig.dias < 0 ? ` · ${-sig.dias} d tarde` : ` · ${sig.dias} d`}`);
    if (p.Estado === 'cerrado') partes.push(`cerrado ${fechaCorta(p.CerradoEl)}`);
    const m = el('span', 'm', partes.join(' · ')); m.title = partes.join(' · '); cuerpo.appendChild(m);
    r.appendChild(cuerpo);
    // lado: el chip «sin dueño» (C7), quienes, y la barra por columna. El chip C8 «vence en N d · faltan M» NO va
    // aqui: repetia el numero grande (revisor 12-sep); sigue en la cabecera del proyecto, y «faltan» lo dice hechas/total.
    const lado = el('span', 'lado');
    const chips = el('span', 'chips');
    const huerfanas = sinDueno(ts).length;
    if (huerfanas && p.Estado === 'activo') { const h = chip(`sin dueño · ${huerfanas}`, 'warn'); h.dataset.sinDueno = String(p.id); chips.appendChild(h); }
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))];
    const avs = el('span', 'avs'); for (const q of quienes.slice(0, 6)) avs.appendChild(avatar(q)); chips.appendChild(avs);
    lado.appendChild(chips);
    const barra = el('span', 'segbar'); barra.title = tituloSegmentos(segmentosDe(a));
    for (const [c, n, cls, tono] of segmentosDe(a)) { const i = el('i', cls); if (tono) i.dataset.tono = tono; i.style.flex = String(n); i.title = `${c.nombre}: ${n}`; barra.appendChild(i); }   // v0.12.0: el color elegido manda sobre la clase
    if (!a.total) { const i = el('i', 'p'); i.style.flex = '1'; barra.appendChild(i); }
    lado.appendChild(barra);
    r.appendChild(lado);
    r.addEventListener('click', () => abrirProyecto(p.id));
    return r;
}
/** Un renglon de mini lista (2026-09-12): cabecera = quien + cuando; debajo la frase a todo el ancho;
 *  debajo el proyecto en una linea. `texto` NO trae el nombre (lo pone la cabecera); si `texto` ES el
 *  nombre completo (lista Equipo), la cabecera lo lleva entero y no hay frase. */
function itemMini(quien, texto, sub, derecha, claseDerecha, abrir) {
    // C9 (v0.6.0): con `abrir` el renglon es un boton que lleva a la tarjeta (antes era texto que habia que buscar).
    const it = el(abrir ? 'button' : 'div', 'it' + (abrir ? ' clic' : ''));
    if (abrir) { it.type = 'button'; it.addEventListener('click', abrir); it.title = 'Abrir la tarjeta'; }
    it.appendChild(avatar(quien));
    const c = el('div');
    const nombre = nombreDe(quien, estado.roles), esNombre = texto === nombre;
    const cab = el('div', 'cab'); cab.appendChild(el('span', 'q', esNombre ? nombre : nombre.split(' ')[0]));
    cab.appendChild(el('span', 'd' + (claseDerecha ? ' is-' + claseDerecha : ''), derecha || '')); c.appendChild(cab);
    if (!esNombre) c.appendChild(fraseMarcada(texto));
    if (sub) { const w = el('div', 'w', sub); w.title = sub; c.appendChild(w); }
    it.appendChild(c);
    return it;
}
/** La frase de actividad SIN el nombre (la cabecera de itemMini ya lo lleva); el resto igual que fraseActividad. */
function queHizo(a) { return a.Accion === 'comentar' ? `${verboComentario(a)}: «${a.Title}»` : String(a.Title || ''); }
/** C9: un renglon de actividad con TareaId viva se abre en su proyecto (#p/<clave>/t/<id>); sin tarjeta, texto. */
function abridorDe(a) {
    const t = a.TareaId ? porId(estado.tareas, a.TareaId) : null; if (!t) return null;
    const p = porId(estado.proyectos, t.ProyectoId); if (!p) return null;
    return () => { if ($('dlgActividad').open) cerrarDialogo('dlgActividad'); irAHash(`#p/${p.Clave}/t/${t.id}`); };
}
/** Un renglon de actividad para las listas (Inicio, lateral, Toda la actividad). */
function itemActividad(a, conProyecto) {
    const p = porId(estado.proyectos, a.ProyectoId);
    return itemMini(a.Quien, queHizo(a), conProyecto && p ? p.Title : '', fechaHora(a.Cuando), null, abridorDe(a));
}
/** Parte «verbo «titulo» resto» en tres: el titulo en <b> (2 lineas, integro en title) y el resto en linea
 *  propia; «de X a Y» sale como «X → Y». Sin «…» (un titulo de tarjeta), texto plano. Nunca innerHTML. */
function fraseMarcada(texto) {
    const f = el('div', 'f'); const m = /^(.*?)(«[^»]*»)(.*)$/s.exec(texto);
    if (!m) { f.textContent = texto; return f; }
    f.appendChild(document.createTextNode(m[1])); const b = el('b'); b.appendChild(textoConMenciones(m[2], undefined, false)); b.title = m[2]; f.appendChild(b);   // v0.8.0: las @menciones como chip tambien aqui
    const resto = m[3].trim();
    if (resto) f.appendChild(el('span', 'sino', resto.replace(/^de (.+) a (.+)$/, '$1 → $2')));
    return f;
}
function pintarInicio() {
    const yo = nombreDe(estado.cuenta.username, estado.roles);
    $('inicioSub').textContent = `${yo} · ${estado.rol} · ${activos().length} proyecto(s) activo(s)`;
    const idsActivos = new Set(activos().map(p => p.id));   // v0.13.1: una vez, no por cada tarjeta
    const abiertas = estado.tareas.filter(t => t.Columna !== 'hecho' && idsActivos.has(Number(t.ProyectoId)));
    const mias = misAbiertas();
    // U3: los dos KPI de vencimiento cuentan lo MIO, porque el boton aterriza en Mis tareas con ese
    // filtro y el numero tiene que ser el que se ve al llegar (revision 2026-09-11). Lo global sigue
    // en «Proximos vencimientos» y «Sin movimiento», al lado.
    const s7 = mias.filter(t => estadoVence(t, CONFIG.vencePronto) === 'warn').length;
    const ven = mias.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger').length;
    const k = $('inicioKpis'); k.textContent = '';
    // U3: cada KPI es un boton que lleva a donde se ve el detalle (Mis tareas con ese filtro, o Proyectos).
    const kpi = (v, l, cls, ir) => {
        const d = el('button', 'mn-kpi is-clickable' + (cls ? ' is-' + cls : '')); d.type = 'button'; d.dataset.kpi = ir.kpi;
        d.appendChild(el('span', 'mn-kpi-label', l)); d.appendChild(el('span', 'mn-kpi-val', String(v)));
        d.addEventListener('click', () => { if (ir.mis !== undefined) estado.filtroMis = ir.mis; irA(ir.a); });
        k.appendChild(d);
    };
    kpi(activos().length, 'proyectos activos', 'info', { kpi: 'proyectos', a: 'proyectos' });
    kpi(mias.length, 'mis tareas abiertas', null, { kpi: 'mis', a: 'mis', mis: null });
    kpi(s7, 'mías que vencen en 7 d', s7 ? 'warn' : null, { kpi: 'pronto', a: 'mis', mis: 'pronto' });
    kpi(ven, 'mías vencidas', ven ? 'danger' : 'ok', { kpi: 'vencidas', a: 'mis', mis: 'vencidas' });
    // C7 (v0.6.0): las tarjetas sin dueño no salen en Mis tareas de NADIE. El KPI solo existe si hay
    // alguna, y aterriza en el proyecto que mas tiene con el filtro «sin dueño» puesto.
    const huerfanas = sinDueno(abiertas);
    if (huerfanas.length) {
        const d = el('button', 'mn-kpi is-clickable is-warn'); d.type = 'button'; d.dataset.kpi = 'sin-dueno';
        d.appendChild(el('span', 'mn-kpi-label', 'sin dueño')); d.appendChild(el('span', 'mn-kpi-val', String(huerfanas.length)));
        d.addEventListener('click', () => {
            const porProyecto = new Map(); for (const t of huerfanas) porProyecto.set(t.ProyectoId, (porProyecto.get(t.ProyectoId) || 0) + 1);
            const [pid] = [...porProyecto.entries()].sort((a, b) => b[1] - a[1])[0];
            // El filtro se pone ENTERO: si ese proyecto ya estaba abierto, fijarProyectoAbierto no lo limpia
            // y un «quien» previo se combinaria con «sin dueño» dejando el tablero vacio (revisor, 2026-09-12).
            abrirProyecto(Number(pid)); estado.filtroTareas = { quien: null, alta: false, vencidas: false, sinDueno: true, texto: '' }; $('filtroTexto').value = ''; pintarProyecto();
        });
        k.appendChild(d);
    }
    pintarAccionesRapidas();   // v0.18.0
    const lp = $('inicioProyectos'); lp.textContent = '';
    for (const p of ordenarProyectos(activos())) lp.appendChild(renglonProyecto(p));   // C10
    if (!activos().length) lp.appendChild(el('p', 'vacio', PUEDE.proyecto(estado.rol) ? 'Sin proyectos activos: crea el primero en Proyectos.' : 'Sin proyectos activos todavía.'));
    const v = $('inicioVence'); v.textContent = '';
    // C9: tambien estos renglones abren su tarjeta (el revisor vio la inconsistencia con la actividad).
    const abrirT = t => { const p = porId(estado.proyectos, t.ProyectoId); return p ? () => irAHash(`#p/${p.Clave}/t/${t.id}`) : null; };
    // v0.8.0: «Te mencionaron» — los comentarios del chat (o notas) que nombran a esta persona, lo mas nuevo arriba;
    // el renglon abre la tarjeta si la nota es de una, o el chat del proyecto. La tarjeta solo existe si hay alguna.
    // v0.15.0: «Nuevo para ti» — lo que OTROS hicieron sobre lo tuyo (te asignaron o cambiaron una tarjeta, anotaron en
    // ella, te mencionaron) desde tu ultima visita a Inicio. La marca es compartida entre tus dispositivos
    // (PROY_Roles.Visto); el piso se fija al ENTRAR (la marca sube al pintar sin vaciar la lista) y sale al cambiar de pantalla.
    // Sin marca (primera vez) son los ultimos 3 dias. Las menciones siguen ademas en «Te mencionaron» (14 d).
    // El piso se congela al entrar: la marca sube al pintar sin vaciar la lista, y lo que llegue con el refresco SE SUMA.
    if (!estado.nuevosInicio) estado.nuevosInicio = { desde: inicioVistoHasta() };
    const nuevos = nuevoParaMi(estado.actividad, estado.tareas, estado.roles, estado.cuenta.username, estado.nuevosInicio.desde);
    const fijos = nuevos;
    const nv = $('inicioNuevo'); nv.textContent = '';
    const VERBO = { asignada: 'te asignó', cambio: 'cambió tu tarjeta', nota: 'anotó en tu tarjeta', mencion: 'te mencionó' };
    for (const x of fijos.slice(0, 8)) {
        const p = porId(estado.proyectos, x.a.ProyectoId || (x.tarea && x.tarea.ProyectoId));
        const abrir = abridorDe(x.a) || (p ? () => irAHash(`#p/${p.Clave}/chat`) : null);
        const que = x.tipo === 'mencion' || x.tipo === 'nota' ? x.a.Title : x.tarea ? x.tarea.Title : x.a.Title;
        nv.appendChild(itemMini(x.a.Quien, `${VERBO[x.tipo]}: «${que}»`, p ? p.Title : '', fechaHora(x.a.Cuando), x.tipo === 'asignada' ? 'warn' : null, abrir));
    }
    $('cardNuevo').classList.toggle('oculto', fijos.length === 0);
    $('nNuevoInicio').textContent = String(fijos.length); $('nNuevoInicio').hidden = !fijos.length;
    if (nuevos.length) marcarInicioVisto(nuevos[0].a.Cuando);
    const mn = $('inicioMenciones'); mn.textContent = '';
    const menciones = mencionesA(estado.cuenta.username);
    for (const a of menciones.slice(0, 6)) {
        const p = porId(estado.proyectos, a.ProyectoId);
        const abrir = abridorDe(a) || (p ? () => irAHash(`#p/${p.Clave}/chat`) : null);
        mn.appendChild(itemMini(a.Quien, `${verboComentario(a)}: «${a.Title}»`, p ? p.Title : '', fechaHora(a.Cuando), null, abrir));
    }
    $('cardMenciones').classList.toggle('oculto', menciones.length === 0);
    for (const { tarea: t, dias } of proximos(abiertas, 6)) { const p = porId(estado.proyectos, t.ProyectoId); v.appendChild(itemMini(t.Asignado, t.Title, p ? p.Title : '', fechaCorta(t.Vence), dias < 0 ? 'danger' : dias <= CONFIG.vencePronto ? 'warn' : null, abrirT(t))); }
    if (!v.childNodes.length) v.appendChild(el('p', 'vacio', 'Nada por vencer.'));
    const sm = $('inicioSinMov'); sm.textContent = '';
    const quietas = sinMovimiento(abiertas, CONFIG.sinMovimientoDias, new Date(), columnasDeTarea);
    for (const t of quietas.slice(0, 6)) { const p = porId(estado.proyectos, t.ProyectoId); sm.appendChild(itemMini(t.Asignado, t.Title, p ? p.Title : '', `${-diasPara(t.Desde)} d`, 'warn', abrirT(t))); }
    $('cardSinMov').classList.toggle('oculto', quietas.length === 0);
    const act = $('inicioActividad'); act.textContent = '';
    // B3: en celular Inicio media 2,400 px; la actividad baja a 3 renglones. v0.14.0: en escritorio son 8 (la tarjeta
    // paso a la columna ancha, bajo Proyectos activos, donde antes sobraba media pantalla).
    const tope = enCelular.matches ? 3 : 8;
    const visible = actividadVisible();   // v0.11.0: sin movimientos entre cubetas
    for (const a of visible.slice(0, tope)) act.appendChild(itemActividad(a, true));   // C9
    if (!visible.length) act.appendChild(el('p', 'vacio', 'Sin actividad todavía.'));
    $('btnActividadInicio').hidden = visible.length <= tope;
}

/**
 * v0.18.0: acciones rapidas de Inicio (recomendacion 3 de las capturas de referencia del 13-sep): Nueva tarea ·
 * Ligar documento · Nuevo proyecto. Las dos primeras necesitan un proyecto y aqui no hay ninguno abierto: el select
 * lo elige (arranca en el activo que vence antes, el mismo orden que la lista de abajo) y la eleccion se recuerda
 * mientras dure la sesion. Cada boton abre el MISMO dialogo que su pantalla, ya parado en ese proyecto, asi que al
 * guardar se aterriza donde se ve lo creado. «Ligar documento» cae a «Pegar un enlace» si la biblioteca de la unidad
 * no esta autorizada (A1). Con rol de lectura los tres van apagados con su porque en el title, como sus originales.
 */
function pintarAccionesRapidas() {
    const ac = $('inicioAcciones'); ac.textContent = '';
    const proys = ordenarProyectos(activos());
    const sel = el('select'); sel.id = 'inicioAccProyecto'; sel.setAttribute('aria-label', 'Proyecto al que va la acción');
    opciones(sel, proys, p => p.id, p => p.Title, null);
    if (estado.accionProyectoId && proys.some(p => p.id === estado.accionProyectoId)) sel.value = String(estado.accionProyectoId);
    sel.addEventListener('change', () => { estado.accionProyectoId = Number(sel.value); });
    sel.disabled = !proys.length;
    const elegido = () => porId(estado.proyectos, Number(sel.value));
    const sinActivos = proys.length ? '' : 'Sin proyectos activos';
    const bt = boton('Nueva tarea', 'mn-btn is-primary is-sm', () => { const p = elegido(); if (!p) return; abrirProyecto(p.id); abrirNuevaTarea(); }, { accion: 'tarea' });
    bt.disabled = !proys.length || !PUEDE.tarea(estado.rol); bt.title = PUEDE.tarea(estado.rol) ? sinActivos : 'Tu rol es de lectura: no puedes crear tarjetas';
    const bl = boton('Ligar documento', 'mn-btn is-sm', () => {
        const p = elegido(); if (!p) return;
        fijarProyectoAbierto(p); estado.tab = 'docs'; irA('proyecto');
        if (puedeLigarEn(p)) abrirLigar({ proyecto: p });
        else { avisar(`La biblioteca de ${p.Title} aún no está autorizada: se pega un enlace en su lugar.`, 'ojo'); abrirEnlace({ proyecto: p }); }   // A1, y se dice al momento (revisor, 13-sep)
    }, { accion: 'ligar' });
    bl.disabled = !proys.length || !PUEDE.ligar(estado.rol); bl.title = PUEDE.ligar(estado.rol) ? sinActivos : 'Tu rol es de lectura: no puedes ligar documentos';
    const bp = boton('Nuevo proyecto', 'mn-btn is-sm', () => abrirFormaProyecto(null), { accion: 'proyecto' });
    bp.disabled = !PUEDE.proyecto(estado.rol); bp.title = PUEDE.proyecto(estado.rol) ? '' : 'Solo gerencia crea proyectos';
    // El select va pegado a los DOS botones que lo usan; «Nuevo proyecto» aparte, que no va a ningun proyecto (revisor, 13-sep).
    const en = el('label', 'en'); en.appendChild(el('span', '', 'en')); en.appendChild(sel); if (sinActivos) en.title = sinActivos;
    const fila = el('div', 'botones'); fila.appendChild(bt); fila.appendChild(bl); fila.appendChild(en); ac.appendChild(fila);
    const fila2 = el('div', 'botones'); fila2.appendChild(bp); ac.appendChild(fila2);
}

// ---------------------------------------------------------------- toda la actividad (F12) y el equipo (F13)

let acCtx = { proyectoId: null, quien: null, tipo: null, n: 50 };
/** Toda la actividad, global (proyectoId null) o de un proyecto, filtrable por persona y por tipo (C9), de 50 en 50. */
function abrirActividad(proyectoId) {
    acCtx = { proyectoId: proyectoId || null, quien: null, tipo: null, n: 50 };
    const p = proyectoId ? porId(estado.proyectos, proyectoId) : null;
    $('acTitulo').textContent = p ? `Actividad · ${p.Title}` : 'Toda la actividad';
    pintarActividad();
    abrirDialogo('dlgActividad');
}
// C9: la bitacora del sistema («creó el proyecto», «reabrió», «borró») pesa igual que las notas, que es
// lo que la gente busca: un chip las separa; «Todos» sigue siendo el default. v0.11.0: los movimientos
// entre cubetas ya no se listan (Carlos, 12-sep), asi que el chip «solo movimientos» se fue con ellos.
const TIPOS_ACTIVIDAD = [['notas', 'solo comentarios', a => a.Accion === 'comentar']];
function pintarActividad() {
    const todas = actividadVisible().filter(a => !acCtx.proyectoId || Number(a.ProyectoId) === acCtx.proyectoId);
    const quienes = [...new Set(todas.map(a => String(a.Quien || '').toLowerCase()).filter(Boolean))].sort();
    const f = $('acFiltro'); f.textContent = '';
    const chipQ = (texto, q) => { const b = boton(texto, acCtx.quien === q ? 'is-on' : '', () => { acCtx.quien = q; acCtx.n = 50; pintarActividad(); }, { quien: q || 'todos' }); b.setAttribute('aria-pressed', acCtx.quien === q ? 'true' : 'false'); f.appendChild(b); };
    chipQ('Todos', null);
    for (const q of quienes) chipQ(nombreDe(q, estado.roles), q);
    const ft = $('acTipo'); ft.textContent = '';
    for (const [k, texto] of TIPOS_ACTIVIDAD) {
        const on = acCtx.tipo === k;
        const b = boton(texto, on ? 'is-on' : '', () => { acCtx.tipo = on ? null : k; acCtx.n = 50; pintarActividad(); }, { tipo: k });
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); ft.appendChild(b);
    }
    const pasaTipo = acCtx.tipo ? TIPOS_ACTIVIDAD.find(x => x[0] === acCtx.tipo)[2] : () => true;
    const filtradas = todas.filter(a => (!acCtx.quien || String(a.Quien || '').toLowerCase() === acCtx.quien) && pasaTipo(a));
    const l = $('acLista'); l.textContent = '';
    for (const a of filtradas.slice(0, acCtx.n)) l.appendChild(itemActividad(a, !acCtx.proyectoId));
    if (!filtradas.length) l.appendChild(el('p', 'vacio', 'Sin actividad.'));
    $('acMas').hidden = filtradas.length <= acCtx.n;
    $('acMas').textContent = `ver 50 más (${filtradas.length - Math.min(acCtx.n, filtradas.length)} restantes)`;
}
/** Quien tiene que rol (PROY_Roles), solo lectura, con sus tarjetas abiertas. Cambiar roles sigue en SharePoint. */
function abrirEquipo() {
    const tb = $('eqLista'); tb.textContent = '';
    // A2: en celular la tabla de 5 columnas no cabe (354 px) y se corta despues de «Rol»; las mismas
    // filas se pintan ademas como fichas, y el CSS elige cual se ve.
    const fi = $('eqFichas'); fi.textContent = '';
    const roles = estado.roles.slice().sort((a, b) => String(a.Nombre || a.Title || '').localeCompare(String(b.Nombre || b.Title || '')));
    for (const r of roles) {
        const correo = String(r.Title || '').toLowerCase();
        const abiertas = estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === correo && t.Columna !== 'hecho').length;
        const fa = el('div', 'eq-ficha' + (r.Activo === false ? ' inactivo' : ''));
        fa.appendChild(avatar(correo));
        fa.appendChild(el('span', 'n', nombreDe(correo, estado.roles)));
        const ch = el('span', 'ch');
        ch.appendChild(chip(r.Rol || 'lectura', r.Rol === 'gerencia' ? 'info' : null));
        if (r.Activo === false) ch.appendChild(chip('inactiva', 'danger'));
        ch.appendChild(el('span', '', `${abiertas} abierta${abiertas === 1 ? '' : 's'}`));
        fa.appendChild(ch);
        fa.appendChild(el('span', 'c', correo));
        fi.appendChild(fa);
        const tr = el('tr', r.Activo === false ? 'inactivo' : '');
        const td1 = el('td'); td1.appendChild(avatar(correo)); td1.appendChild(el('span', '', ' ' + nombreDe(correo, estado.roles))); tr.appendChild(td1);
        tr.appendChild(el('td', 'mn-mono', correo));
        const tdr = el('td'); tdr.appendChild(chip(r.Rol || 'lectura', r.Rol === 'gerencia' ? 'info' : null)); tr.appendChild(tdr);
        const tda = el('td'); tda.appendChild(r.Activo === false ? chip('no', 'danger') : chip('sí', 'ok')); tr.appendChild(tda);
        tr.appendChild(el('td', 'mn-mono', String(estado.tareas.filter(t => String(t.Asignado || '').toLowerCase() === correo && t.Columna !== 'hecho').length)));
        tb.appendChild(tr);
    }
    if (!roles.length) { const tr = el('tr'); const td = el('td', 'vacio', 'PROY_Roles está vacía.'); td.colSpan = 5; tr.appendChild(td); tb.appendChild(tr); fi.appendChild(el('p', 'vacio', 'PROY_Roles está vacía.')); }
    abrirDialogo('dlgEquipo');
}

// ---------------------------------------------------------------- Proyectos

function pintarProyectos() {
    $('btnNuevoProyecto').disabled = !PUEDE.proyecto(estado.rol);
    $('btnNuevoProyecto').title = PUEDE.proyecto(estado.rol) ? '' : 'Solo gerencia crea proyectos';
    // v0.7.0: el filtro por equipo se pone desde el rail (por rama) o, en celular, desde el select; aqui solo se aplica.
    $('filtroEquipoMovil').value = estado.filtroEquipo || '';
    // C3 (v0.6.0): el mismo buscador sin acentos del tablero, sobre nombre, clave y descripcion.
    const filtro = ps => filtrarProyectos(ps.filter(p => !estado.filtroEquipo || p.Equipo === estado.filtroEquipo), estado.textoProyectos);
    const l = $('listaProyectos'); l.textContent = '';
    const act = ordenarProyectos(filtro(activos()));   // C10: vence antes primero, sin fecha al final, empate por nombre
    for (const p of act) l.appendChild(renglonProyecto(p));
    if (!act.length) l.appendChild(el('p', 'vacio', estado.textoProyectos ? 'Ningún proyecto con ese texto.' : estado.filtroEquipo ? `Sin proyectos activos de ${equipoDe({ Equipo: estado.filtroEquipo }).nombre}.` : 'Sin proyectos activos.'));
    const c = $('listaCerrados'); c.textContent = '';
    const cer = filtro(estado.proyectos.filter(p => p.Estado === 'cerrado')).sort((a, b) => String(b.CerradoEl || '').localeCompare(String(a.CerradoEl || '')));
    for (const p of cer) c.appendChild(renglonProyecto(p));
    if (!cer.length) c.appendChild(el('p', 'vacio', 'Ninguno cerrado.'));
}

function abrirProyecto(id) {
    const p = porId(estado.proyectos, id); if (!p) return;
    fijarProyectoAbierto(p); estado.tab = 'tablero';
    irA('proyecto');
}
function pintarProyecto() {
    const p = estado.proyectoAbierto; if (!p) { irA('proyectos'); return; }
    // B2: «Resumen» solo existe en celular (en escritorio la lateral se ve siempre). Sin esto, un
    // hash #p/<clave>/resumen abierto en la laptop —o girar el telefono a horizontal— dejaba el
    // panel en BLANCO y sin pestaña marcada, porque el boton para salir es .solo-movil.
    if (estado.tab === 'resumen' && !enCelular.matches) estado.tab = 'tablero';
    const eq = equipoDe(p); const ts = tareasDe(p, estado.tareas); const a = avance(ts, columnasDe(p));
    $('pEquipo').textContent = ''; $('pEquipo').appendChild(iconoEquipo(eq, 'lg'));   // v0.7.0: icono, no nombre
    $('pTitulo').textContent = p.Title; $('pDesc').textContent = p.Descripcion || '';
    $('pEstado').textContent = p.Estado === 'cerrado' ? 'Cerrado' : '';   // v0.12.0: el «N/M hechas · %» salio del titulo (Carlos, 12-sep); vive en Avance
    $('btnEditarProyecto').disabled = !PUEDE.proyecto(estado.rol) || p.Estado !== 'activo';
    $('btnCubetas').disabled = !PUEDE.proyecto(estado.rol) || p.Estado !== 'activo';   // v0.11.0
    $('btnCerrarProyecto').disabled = !PUEDE.proyecto(estado.rol) || p.Estado !== 'activo';
    const faltan = ts.filter(t => t.Columna !== 'hecho').length;
    // v0.12.0: el boton ya no cuenta («· faltan N» salio del titulo); la cuenta va en su title y en la confirmacion.
    $('btnCerrarProyecto').textContent = p.Estado !== 'activo' ? 'Cerrado' : 'Cerrar proyecto';
    $('btnCerrarProyecto').title = p.Estado !== 'activo' ? '' : faltan ? `Faltan ${faltan} tarjeta(s) por terminar` : 'Todas las tarjetas están hechas';
    // F6: un cerrado se reabre (solo gerencia); el boton solo existe en ese estado.
    $('btnReabrirProyecto').classList.toggle('oculto', !(PUEDE.proyecto(estado.rol) && p.Estado === 'cerrado'));
    $('btnEliminarProyecto').classList.toggle('oculto', !PUEDE.borrar(estado.rol));   // v0.13.0: solo gerencia, en cualquier estado
    $('btnNuevaTarea').disabled = !PUEDE.tarea(estado.rol) || p.Estado !== 'activo';
    // B2: la linea que resume el frente arriba, donde se lee sin bajar a la lateral.
    const dias = diasPara(p.Vence);
    // C8: el chip «vence en N d · faltan M» de la lista, junto al %, en escritorio y celular. Cuando
    // existe (≤ 7 d o vencido), la linea-resumen de celular NO repite el reloj.
    const caja = $('pReloj'); caja.textContent = '';
    const reloj = chipReloj(p, ts); if (reloj) caja.appendChild(reloj);
    // v0.11.0: una parte por cubeta de en medio (con o sin tarjetas: la linea dice que cubetas hay).
    const resumen = a.columnas.slice(1, -1).map(c => `${a.porColumna[c.clave]} ${c.nombre.toLowerCase()}`);
    if (dias !== null && p.Estado === 'activo' && !reloj) resumen.push(`vence en ${dias} d`);
    $('pResumen').textContent = resumen.join(' · ');
    $('pResumen').classList.remove('is-danger');
    // B1: la descripcion va a una linea en celular; el clic la abre.
    $('pDesc').title = p.Descripcion || '';
    $('pDesc').classList.remove('abierta');
    for (const b of document.querySelectorAll('.tab')) { const on = b.dataset.tab === estado.tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const t of ['tablero', 'lista', 'roadmap', 'docs', 'chat']) $('tab-' + t).classList.toggle('oculto', estado.tab !== t);
    if (estado.tab !== 'chat') salirDelChat();   // v0.9.0: cambiar de pestana dentro del proyecto tambien es salir
    document.body.classList.toggle('is-chat', estado.tab === 'chat');   // v0.15.0: pintarProyecto no pasa por repintar() al cambiar de pestana
    // v0.8.0: las pestanas dicen cuanto hay adentro (Trello): documentos ligados y comentarios del chat.
    const nDocs = estado.ligas.filter(l => Number(l.ProyectoId) === p.id).length, nChat = comentariosDe(p.id).length;
    $('nDocsTab').textContent = String(nDocs); $('nDocsTab').hidden = !nDocs;
    $('nChatTab').textContent = String(nChat); $('nChatTab').hidden = !nChat;
    // v0.9.0: el contador se pinta en ambar si hay comentarios ajenos que esta persona no ha tenido en pantalla.
    const nNuevos = estado.tab === 'chat' ? 0 : comentariosNuevos(p.id).length;
    $('nChatTab').classList.toggle('is-nuevo', nNuevos > 0);
    $('nChatTab').title = nNuevos ? `${nNuevos} nuevo${nNuevos === 1 ? '' : 's'} desde tu última visita` : '';
    // B2: «Resumen» es una pestana mas, solo en celular (en escritorio la lateral siempre se ve).
    $('p-proyecto').classList.toggle('ver-resumen', estado.tab === 'resumen');
    const sinFiltros = ['docs', 'chat', 'resumen', 'roadmap'].includes(estado.tab);
    $('filtroTareas').classList.toggle('oculto', sinFiltros);
    $('filtroTareas').classList.toggle('plegado', !estado.filtrosAbiertos);
    if (!sinFiltros) pintarFiltroTareas(p);
    pintarBotonFiltros();
    if (estado.tab === 'tablero') pintarTablero(p);
    else if (estado.tab === 'lista') pintarLista(p);
    else if (estado.tab === 'roadmap') pintarRoadmapProyecto(p);   // v0.10.0
    else if (estado.tab === 'docs') pintarDocs(p);
    else if (estado.tab === 'chat') pintarChat(p);
    // lateral
    $('pBarra').style.width = a.pct + '%';
    $('pAnillo').textContent = ''; $('pAnillo').appendChild(anillo(segmentosDe(a), a.total, 96));   // v0.10.0: el anillo de la foto; v0.11.0: por cubeta del proyecto
    const kv = $('pAvance'); kv.textContent = '';
    const par = (k, v) => { kv.appendChild(el('b', '', k)); kv.appendChild(el('span', '', v)); };
    par('Hechas', `${a.hechas} de ${a.total}`); for (const c of a.columnas.slice(1, -1)) par(c.nombre, String(a.porColumna[c.clave]));
    par('Fin del frente', fechaCorta(p.Vence)); par('Responsable', p.Responsable ? nombreDe(p.Responsable, estado.roles) : '—'); par('Clave', p.Clave);
    if (p.Carpeta) par('Carpeta', p.Carpeta);
    if (p.Estado === 'cerrado') par('Cerrado', `${nombreDe(p.CerradoPor, estado.roles)} · ${fechaCorta(p.CerradoEl)}`);
    const q = $('pQuienes'); q.textContent = '';
    const quienes = [...new Set(ts.map(x => String(x.Asignado || '').toLowerCase()).filter(Boolean))];
    for (const k of quienes) q.appendChild(itemMini(k, nombreDe(k, estado.roles), `${ts.filter(t => String(t.Asignado || '').toLowerCase() === k && t.Columna !== 'hecho').length} abiertas`, ''));
    if (!quienes.length) q.appendChild(el('p', 'vacio', 'Nadie asignado todavía.'));
    const v = $('pVence'); v.textContent = '';
    for (const { tarea: t, dias } of proximos(ts, 5)) v.appendChild(itemMini(t.Asignado, t.Title, '', fechaCorta(t.Vence), dias < 0 ? 'danger' : dias <= CONFIG.vencePronto ? 'warn' : null, () => irAHash(`#p/${p.Clave}/t/${t.id}`)));   // C9
    if (!v.childNodes.length) v.appendChild(el('p', 'vacio', 'Nada por vencer.'));
    const act = $('pActividad'); act.textContent = '';
    const deP = actividadVisible().filter(x => Number(x.ProyectoId) === p.id);   // v0.11.0: sin movimientos
    for (const x of deP.slice(0, 6)) act.appendChild(itemActividad(x, false));   // C9
    if (!act.childNodes.length) act.appendChild(el('p', 'vacio', 'Sin actividad todavía.'));
    $('btnActividadProyecto').hidden = deP.length <= 6;
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
    $('npEquipo').value = p ? p.Equipo : CONFIG.equipos[0].clave; $('npVence').value = diaInput(p && p.Vence);
    $('npResponsable').value = p ? String(p.Responsable || '').toLowerCase() : ''; $('npDesc').value = p ? (p.Descripcion || '') : '';
    $('npCarpeta').value = p ? (p.Carpeta || '') : '';
    $('npNota').textContent = p ? 'La carpeta destino es a dónde PROPONE ir lo que se sube al buzón desde Documentos (ruta relativa a la raíz de la biblioteca de la unidad); vacía = el default de la unidad. La skill de archivar la valida.' : 'La clave es lo que se pega en el marcador ⏳ de la base de conocimiento: «· app: lau-asea-03-001». No cambia después.';
    abrirDialogo('dlgProyecto');
    $('npTitulo').focus();
}
$('npTitulo').addEventListener('input', () => { if (!proyectoEnEdicion && !$('npClave').dataset.tocada) $('npClave').value = $('npTitulo').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); });
$('npClave').addEventListener('input', () => { $('npClave').dataset.tocada = '1'; });

async function guardarProyecto(ev) {
    ev.preventDefault();
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia crea o edita proyectos.', 'error'); return; }
    const titulo = $('npTitulo').value.trim();
    if (!titulo) { avisar('El proyecto necesita un nombre.', 'error'); $('npTitulo').focus(); return; }
    let vence;
    try { vence = aIsoDia($('npVence').value); } catch (e) { avisar(e.message, 'error'); return; }
    // F7: la carpeta destino se escribe como ruta relativa, sin diagonales sobrantes ni barras invertidas.
    const carpeta = $('npCarpeta').value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    $('npGuardar').disabled = true;
    try {
        if (proyectoEnEdicion) {
            const p = proyectoEnEdicion;
            const campos = { Title: titulo, Equipo: $('npEquipo').value, Vence: vence, Responsable: $('npResponsable').value || null, Descripcion: $('npDesc').value.trim() || null, Carpeta: carpeta || null };
            await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'), p._etag);
            aplicar(p, campos);
            cerrarDialogo('dlgProyecto'); avisar('Proyecto actualizado.', 'ok'); repintar();
            await registrarActividad('editar-proyecto', `editó el proyecto «${titulo.slice(0, 80)}»`, p.id, null); repintar();
            return;
        }
        // Clave: valida contra lo que hay en memoria Y contra la lista en vivo (dos gerentes a la vez).
        const v = validarClave($('npClave').value, estado.proyectos);
        if (!v.ok) { avisar('Clave: ' + v.motivo, 'error'); $('npClave').focus(); return; }
        const enVivo = await estado.cliente.renglones(estado.siteId, L.proyectos, `fields/Clave eq '${v.clave.replace(/'/g, "''")}'`);
        if (enVivo.length) { avisar(`Clave: ya hay un proyecto con la clave ${v.clave} (lo creó alguien más hace un momento).`, 'error'); return; }
        const campos = limpiar({ Title: titulo, Clave: v.clave, Equipo: $('npEquipo').value, Estado: 'activo', Vence: vence || undefined, Responsable: $('npResponsable').value || undefined, Descripcion: $('npDesc').value.trim() || undefined, Carpeta: carpeta || undefined });
        const n = await estado.cliente.crearRenglon(estado.siteId, L.proyectos, campos, m => avisar(m, 'ojo'));
        estado.proyectos.push(n);
        cerrarDialogo('dlgProyecto');
        avisar(`Proyecto «${titulo}» creado. Clave: ${v.clave}.`, 'ok');
        $('npClave').dataset.tocada = '';
        await registrarActividad('crear-proyecto', `creó el proyecto «${titulo.slice(0, 80)}»`, n.id, null);
        abrirProyecto(n.id);
    } catch (e) {
        if (esConflicto(e)) { cerrarDialogo('dlgProyecto'); avisar('Alguien cambió este proyecto hace un momento: se releyó. Revisa y vuelve a guardar.', 'ojo'); await pedirRelectura(); return; }
        avisar('No se pudo guardar el proyecto: ' + (e && e.message ? e.message : e), 'error');
    } finally { $('npGuardar').disabled = false; }
}

async function cerrarProyecto() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia cierra proyectos.', 'error'); return; }
    const faltan = tareasDe(p, estado.tareas).filter(t => t.Columna !== 'hecho').length;
    const { ok } = await confirmar({ titulo: 'Cerrar el proyecto', ok: 'Cerrar', texto: `«${p.Title}» pasa a cerrado con tu sello. Sale de Inicio; sus tarjetas quedan como registro y nada se borra.${faltan ? ` Ojo: quedan ${faltan} tarjeta(s) sin terminar.` : ''}` });
    if (!ok) return;
    const campos = { Estado: 'cerrado', CerradoPor: estado.cuenta.username, CerradoEl: new Date().toISOString() };
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'), p._etag);
        aplicar(p, campos);
        avisar(`Proyecto «${p.Title}» cerrado.`, 'ok'); repintar();
        await registrarActividad('cerrar-proyecto', `cerró el proyecto «${p.Title.slice(0, 80)}»${faltan ? ` con ${faltan} tarjeta(s) abiertas` : ''}`, p.id, null); repintar();
    } catch (e) {
        if (esConflicto(e)) { avisar('Alguien cambió este proyecto hace un momento: se releyó.', 'ojo'); await pedirRelectura(); return; }
        avisar('No se pudo cerrar: ' + (e && e.message ? e.message : e), 'error');
    }
}

/** F6: un cierre por error se deshace aqui, no en SharePoint. Solo gerencia; limpia el sello y deja «reabrió». */
async function reabrirProyecto() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.proyecto(estado.rol)) { avisar('Solo gerencia reabre proyectos.', 'error'); return; }
    if (p.Estado !== 'cerrado') return;
    const { ok } = await confirmar({ titulo: 'Reabrir el proyecto', ok: 'Reabrir', texto: `«${p.Title}» vuelve a activo y a Inicio; se borra el sello de cierre (${nombreDe(p.CerradoPor, estado.roles)} · ${fechaCorta(p.CerradoEl)}). Sus tarjetas quedan como están.` });
    if (!ok) return;
    const campos = { Estado: 'activo', CerradoPor: null, CerradoEl: null };
    try {
        await estado.cliente.actualizarRenglon(estado.siteId, L.proyectos, p.id, campos, m => avisar(m, 'ojo'), p._etag);
        aplicar(p, campos);
        avisar(`Proyecto «${p.Title}» reabierto.`, 'ok'); repintar();
        await registrarActividad('reabrir-proyecto', `reabrió el proyecto «${p.Title.slice(0, 80)}»`, p.id, null); repintar();
    } catch (e) {
        if (esConflicto(e)) { avisar('Alguien cambió este proyecto hace un momento: se releyó.', 'ojo'); await pedirRelectura(); return; }
        avisar('No se pudo reabrir: ' + (e && e.message ? e.message : e), 'error');
    }
}

/** v0.13.0 (Carlos, 12-sep): eliminar un proyecto — solo gerencia, en cualquier estado. Borra sus tarjetas, sus ligas
 *  y al final el proyecto (en ese orden: si algo falla a medias queda un proyecto vaciado, nunca tarjetas huerfanas).
 *  Los archivos de la biblioteca no se tocan; la actividad se queda como registro y se anota «borrar-proyecto». */
async function eliminarProyecto() {
    const p = estado.proyectoAbierto; if (!p) return;
    if (!PUEDE.borrar(estado.rol)) { avisar('Solo gerencia elimina proyectos.', 'error'); return; }
    const tareas = tareasDe(p, estado.tareas); const ligas = estado.ligas.filter(l => Number(l.ProyectoId) === p.id);
    const { ok } = await confirmar({ titulo: 'Eliminar el proyecto', ok: 'Eliminar', texto: `«${p.Title}» se borra con sus ${tareas.length} tarjeta(s) y ${ligas.length} liga(s) a documentos. Los archivos de la biblioteca no se tocan y la actividad queda como registro. No se puede deshacer desde la app: los renglones van a la papelera del sitio.` });
    if (!ok) return;
    const titulo = p.Title;
    try {
        for (const t of tareas) { await estado.cliente.borrarRenglon(estado.siteId, L.tareas, t.id, m => avisar(m, 'ojo')); estado.tareas = estado.tareas.filter(x => x.id !== t.id); }
        for (const l of ligas) { await estado.cliente.borrarRenglon(estado.siteId, L.ligas, l.id, m => avisar(m, 'ojo')); estado.ligas = estado.ligas.filter(x => x.id !== l.id); }
        await estado.cliente.borrarRenglon(estado.siteId, L.proyectos, p.id, m => avisar(m, 'ojo'));
        estado.proyectos = estado.proyectos.filter(x => x.id !== p.id);
        estado.proyectoAbierto = null; $('accMenu').open = false;
        irA('proyectos'); avisar(`Proyecto «${titulo}» eliminado.`, 'ok'); repintar();
        await registrarActividad('borrar-proyecto', `eliminó el proyecto «${titulo.slice(0, 80)}»${tareas.length ? ` con ${tareas.length} tarjeta(s)` : ''}`, p.id, null); repintar();
    } catch (e) { avisar('No se pudo eliminar: ' + (e && e.message ? e.message : e), 'error'); repintar(); }
}

// ---------------------------------------------------------------- tema

function aplicarTema(t) {
    if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.theme = t === 'oscuro' ? 'dark' : 'light';
    else delete document.documentElement.dataset.theme;
    const oscuro = t === 'oscuro' || (t !== 'claro' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    // v0.13.0 (Carlos, 12-sep): el boton marcado es el tema EFECTIVO —sin eleccion guardada, el del sistema—, asi siempre hay uno.
    for (const b of document.querySelectorAll('.tema button')) b.setAttribute('aria-pressed', b.dataset.tema === (oscuro ? 'oscuro' : 'claro') ? 'true' : 'false');
    const mt = $('metaTema'); if (mt) mt.content = oscuro ? '#131313' : '#f7f7f7';   // --page del Tablero (v0.7.0)   // el arnés E2E no monta el <head>
}
try { aplicarTema(localStorage.getItem('tema') || ''); } catch (_) { aplicarTema(''); }
// v0.13.0: un clic ELIGE ese tema y ya (antes el segundo clic lo apagaba y volvia al del sistema, que en una maquina oscura
// parecia «claro → oscuro sin seleccion»). Volver a «sistema» no tiene boton: se borra la llave `tema` del localStorage.
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!localStorage.getItem('tema')) aplicarTema(''); }); } catch (_) {}
for (const b of document.querySelectorAll('.tema button')) b.addEventListener('click', () => {
    const t = b.dataset.tema;
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
for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => { estado.tab = b.dataset.tab; pintarProyecto(); fijarHash(hashDe()); });
// B1: filtros plegados en celular; el boton los abre y dice cuantos hay puestos.
$('btnFiltros').addEventListener('click', () => { estado.filtrosAbiertos = !estado.filtrosAbiertos; pintarProyecto(); });
$('pDesc').addEventListener('click', () => $('pDesc').classList.toggle('abierta'));
// B1: el menu «···» del proyecto se cierra al elegir una accion y al tocar fuera.
// TRAMPA (medida 2026-09-12): un <details> CERRADO no pinta a sus hijos aunque el CSS le ponga
// `display: contents` al details y `display: flex` al hijo —lo decide el UA, no la cascada—, asi
// que en escritorio los tres botones desaparecieron. Por eso el estado `open` lo lleva el viewport:
// abierto siempre arriba de 720 px (con el summary en display:none no se nota), menu en celular.
const enCelular = window.matchMedia('(max-width: 720px)');
function acomodarAccMenu() { $('accMenu').open = !enCelular.matches; }
// Al cruzar los 720 px (girar el telefono, redimensionar la ventana) se repinta el proyecto: ahi es
// donde «Resumen» deja de existir y donde el menu «···» cambia de forma.
// B3: Inicio tambien depende del ancho (3 renglones de actividad en celular, 5 en escritorio).
enCelular.addEventListener('change', () => { acomodarAccMenu(); if (estado.siteId) repintar(); });
acomodarAccMenu();
// v0.13.0: el menu «⋮» existe en todos los anchos. Se cierra al tocar fuera y al elegir un BOTON (abrir el submenu «Editar»
// no lo cierra); al cerrarse, el submenu vuelve plegado para que la proxima vez abra limpio.
document.addEventListener('click', e => { const m = $('accMenu'); if (m.open && !m.contains(e.target)) m.open = false; });
$('accMenu').querySelector('.acciones').addEventListener('click', e => { if (e.target.closest('button')) $('accMenu').open = false; });
$('accMenu').addEventListener('toggle', () => { if (!$('accMenu').open) $('accEditar').open = false; });
// D6: el pie del rail apilaba seis controles en 60 px; Equipo, Ver en SharePoint y Salir viven en un
// menu «···» hacia arriba (Actualizar y el tema se quedan a la vista). Se cierra al elegir y al tocar fuera.
document.addEventListener('click', e => { const m = $('menuRail'); if (m.open && !m.contains(e.target)) m.open = false; });
$('menuRail').querySelector('.menu-caja').addEventListener('click', () => { $('menuRail').open = false; });
// C3: buscador en Proyectos y en Mis tareas (misma normalizacion que el del tablero).
$('filtroEquipoMovil').addEventListener('change', () => { estado.filtroEquipo = $('filtroEquipoMovil').value || null; repintar(); });
$('textoProyectos').addEventListener('input', () => { estado.textoProyectos = $('textoProyectos').value; if (estado.pestana === 'proyectos') pintarProyectos(); });
$('textoMis').addEventListener('input', () => { estado.textoMis = $('textoMis').value; if (estado.pestana === 'mis') pintarMisTareas(); });
$('btnNuevoProyecto').addEventListener('click', () => abrirFormaProyecto(null));
$('btnEditarProyecto').addEventListener('click', () => abrirFormaProyecto(estado.proyectoAbierto));
$('btnCerrarProyecto').addEventListener('click', cerrarProyecto);
$('btnReabrirProyecto').addEventListener('click', reabrirProyecto);
$('btnEliminarProyecto').addEventListener('click', eliminarProyecto);   // v0.13.0
$('formProyecto').addEventListener('submit', guardarProyecto);
$('npCancelar').addEventListener('click', () => cerrarDialogo('dlgProyecto'));
engancharTablero();
engancharDocs();
engancharChat();
engancharCalendario(); engancharArchivos(); engancharReportes();   // v0.10.0
for (const b of document.querySelectorAll('.ir-movil')) b.addEventListener('click', () => { $('menuMovil').open = false; irA(b.dataset.ir); });   // v0.10.0: Roadmap · Archivos · Reportes no caben en la barra del celular
$('btnActividadInicio').addEventListener('click', () => abrirActividad(null));
$('btnActividadProyecto').addEventListener('click', () => abrirActividad(estado.proyectoAbierto && estado.proyectoAbierto.id));
$('acCerrar').addEventListener('click', () => cerrarDialogo('dlgActividad'));
$('acMas').addEventListener('click', () => { acCtx.n += 50; pintarActividad(); });
$('btnEquipo').addEventListener('click', abrirEquipo);
$('btnEquipoMovil').addEventListener('click', () => { $('menuMovil').open = false; abrirEquipo(); });
$('eqCerrar').addEventListener('click', () => cerrarDialogo('dlgEquipo'));
$('btnImprimir').addEventListener('click', () => window.print());
$('shell').classList.add('sin-sesion');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => reg.update && reg.update()).catch(() => {});
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (recargado || !navigator.serviceWorker.controller) return; recargado = true; if (!estado.siteId) window.location.reload(); });
}

arrancar();
