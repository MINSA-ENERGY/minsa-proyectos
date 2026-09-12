// Reglas de MINSA Proyectos — funciones PURAS, sin red ni DOM, para poder probarlas con node.
//
// Aqui vive lo que la entrevista del 2026-09-11 decidio (cerebro/docs/plan-proyectos-app-2026-09-11.md).
// Cambiar un umbral es cambiar una constante en config.js; cambiar una regla de PUEDE es cambiar
// una decision, y eso se anota en el README.

export const ROLES = ['gerencia', 'colaborador', 'lectura'];
export const COLUMNAS = ['por-hacer', 'en-curso', 'en-revision', 'hecho'];

/** Rol de un correo segun PROY_Roles. Sin renglon (o inactivo) = lectura. */
export function rolDe(correo, roles) {
    const c = String(correo || '').trim().toLowerCase();
    const r = (roles || []).find(x => String(x.Title || '').trim().toLowerCase() === c && x.Activo !== false);
    return r && ROLES.includes(r.Rol) ? r.Rol : 'lectura';
}

/**
 * Decision 3: todos ven todo y colaboran; solo gerencia crea/cierra proyectos y borra tarjetas.
 * Las funciones de guardar de app.js/tablero.js/docs.js COMPRUEBAN el rol (no solo esconden el
 * boton). Quien escribe de verdad lo decide SharePoint.
 */
export const PUEDE = {
    ver: () => true,
    tarea: rol => ['gerencia', 'colaborador'].includes(rol),     // crear, editar, asignar
    mover: rol => ['gerencia', 'colaborador'].includes(rol),
    ligar: rol => ['gerencia', 'colaborador'].includes(rol),     // ligar y subir al buzon
    borrar: rol => rol === 'gerencia',
    proyecto: rol => rol === 'gerencia'                          // crear, editar, cerrar
};

/** Dias entre hoy y una fecha ISO (negativo si ya paso). null si no hay fecha o no es fecha. */
export function diasPara(fechaIso, hoy = new Date()) {
    if (!fechaIso) return null;
    const f = new Date(fechaIso);
    if (Number.isNaN(f.getTime())) return null;
    const dia = 24 * 60 * 60 * 1000;
    const a = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
    const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
    return Math.round((a - b) / dia);
}

/** YYYY-MM-DD en hora de Mexico (la fecha del lote en el buzon; heredada de captura). */
export function fechaMexico(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
    const v = k => partes.find(p => p.type === k).value;
    return `${v('year')}-${v('month')}-${v('day')}`;
}

/** Texto a slug: minusculas, sin acentos, guiones. Para claves y nombres de carpeta. */
export function slug(texto) {
    return String(texto || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/**
 * La clave de un proyecto es lo que se pega en el marcador de la KB (`· app: lau-asea-03-001`):
 * minusculas, digitos y guiones, 3 a 60 caracteres, sin empezar ni terminar en guion. Unica.
 */
export function validarClave(clave, existentes = []) {
    const c = String(clave || '').trim();
    if (!c) return { ok: false, motivo: 'la clave es obligatoria' };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c)) return { ok: false, motivo: 'solo minúsculas, dígitos y guiones (p. ej. lau-asea-03-001)' };
    if (c.length < 3 || c.length > 60) return { ok: false, motivo: 'entre 3 y 60 caracteres' };
    if ((existentes || []).some(p => String(p.Clave || '').trim().toLowerCase() === c)) return { ok: false, motivo: `ya hay un proyecto con la clave ${c}` };
    return { ok: true, clave: c };
}

/** Tareas de un proyecto. */
export function tareasDe(proyecto, tareas) {
    const id = Number(proyecto && proyecto.id !== undefined ? proyecto.id : proyecto);
    return (tareas || []).filter(t => Number(t.ProyectoId) === id);
}

/** {hechas, total, pct, porColumna} de un conjunto de tareas. */
export function avance(tareas) {
    const ts = tareas || [];
    const porColumna = {};
    for (const c of COLUMNAS) porColumna[c] = 0;
    for (const t of ts) if (porColumna[t.Columna] !== undefined) porColumna[t.Columna]++;
    const hechas = porColumna.hecho;
    return { hechas, total: ts.length, pct: ts.length ? Math.round(hechas * 100 / ts.length) : 0, porColumna };
}

/**
 * Las tareas abiertas con fecha, de la mas urgente a la menos, como mucho `n`. Las vencidas
 * van primero por construccion (dias negativos). `hoy` se pasa para poder probar.
 */
export function proximos(tareas, n = 6, hoy = new Date()) {
    return (tareas || [])
        .filter(t => t.Columna !== 'hecho' && t.Vence && diasPara(t.Vence, hoy) !== null)
        .map(t => ({ tarea: t, dias: diasPara(t.Vence, hoy) }))
        .sort((a, b) => a.dias - b.dias || String(a.tarea.Title).localeCompare(String(b.tarea.Title)))
        .slice(0, n);
}

/** Clase de estado de una fecha de vencimiento: 'danger' vencida · 'warn' vence en `pronto` dias · 'idle' lejos · null sin fecha o hecha. */
export function estadoVence(tarea, pronto = 7, hoy = new Date()) {
    if (!tarea || tarea.Columna === 'hecho') return null;
    const d = diasPara(tarea.Vence, hoy);
    if (d === null) return null;
    if (d < 0) return 'danger';
    if (d <= pronto) return 'warn';
    return 'idle';
}

/**
 * Tarjetas en «en-curso» que llevan `dias` o mas sin moverse (columna Desde). Es el aviso
 * contra el muerto de `tareas-delegadas`: una tarjeta que nadie mueve se ve en Inicio.
 * Sin `Desde` no se puede saber y no se senala (hacia el «no», que aqui es lo seguro).
 */
export function sinMovimiento(tareas, dias, hoy = new Date()) {
    return (tareas || []).filter(t => {
        if (t.Columna !== 'en-curso' || !t.Desde) return false;
        const d = diasPara(t.Desde, hoy);
        return d !== null && -d >= dias;
    });
}

/** Orden de una columna del tablero: Orden asc, luego prioridad (alta primero), luego vence, luego id. */
export function ordenar(tareas) {
    const peso = { alta: 0, normal: 1, baja: 2 };
    return [...(tareas || [])].sort((a, b) =>
        (Number(a.Orden ?? 1e9) - Number(b.Orden ?? 1e9))
        || ((peso[a.Prioridad] ?? 1) - (peso[b.Prioridad] ?? 1))
        || String(a.Vence || '9').localeCompare(String(b.Vence || '9'))
        || (Number(a.id) - Number(b.id)));
}

/** La columna que sigue a `columna` (U7, «→ siguiente»), o null en la ultima. */
export function columnaSiguiente(columna) {
    const i = COLUMNAS.indexOf(columna);
    return i >= 0 && i < COLUMNAS.length - 1 ? COLUMNAS[i + 1] : null;
}

const sinAcentos = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Filtro de tarjetas dentro de un proyecto (F9): por persona, «solo alta», «solo vencidas» y texto
 * (titulo o descripcion, sin distinguir acentos ni mayusculas). Un filtro vacio deja pasar todo.
 */
export function filtrarTareas(tareas, f = {}, hoy = new Date()) {
    const quien = String(f.quien || '').trim().toLowerCase();
    const texto = sinAcentos(f.texto).trim();
    return (tareas || []).filter(t =>
        (!quien || String(t.Asignado || '').toLowerCase() === quien)
        && (!f.alta || t.Prioridad === 'alta')
        && (!f.vencidas || estadoVence(t, 0, hoy) === 'danger')
        && (!texto || sinAcentos(t.Title).includes(texto) || sinAcentos(t.Descripcion).includes(texto)));
}

/**
 * Orden de la Lista por columna (F10): `col` = tarea | asignado | columna | vence | origen;
 * `dir` = 1 asc, -1 desc. La columna del tablero ordena por su posicion, no alfabeticamente;
 * sin fecha va al final en las dos direcciones. `nombre(correo)` pinta el asignado como se ve.
 */
export function ordenarLista(tareas, col = 'vence', dir = 1, nombre = x => x) {
    const llave = {
        tarea: t => String(t.Title || '').toLowerCase(),
        asignado: t => t.Asignado ? String(nombre(t.Asignado)).toLowerCase() : null,
        columna: t => COLUMNAS.indexOf(t.Columna),
        vence: t => t.Vence ? String(t.Vence) : null,
        origen: t => String(t.Origen || '').toLowerCase()
    }[col] || (t => t.id);
    return [...(tareas || [])].sort((a, b) => {
        const x = llave(a), y = llave(b);
        if (x === null && y === null) return a.id - b.id;
        if (x === null) return 1;
        if (y === null) return -1;
        const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
        return (c * dir) || (a.id - b.id);
    });
}

/**
 * Subir / Bajar (F11): los cambios de Orden ({ id, Orden }) que mueven `id` `delta` posiciones dentro
 * de su columna, renumerando 1..n en el orden visual (ordenar()). Devuelve SOLO los que cambian:
 * la primera vez puede ser toda la columna (las sembradas no traen Orden); despues, dos.
 */
export function reordenar(tareasColumna, id, delta) {
    const lista = ordenar(tareasColumna);
    const i = lista.findIndex(t => Number(t.id) === Number(id));
    if (i < 0) return [];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return [];
    const [t] = lista.splice(i, 1); lista.splice(j, 0, t);
    return lista.map((x, k) => ({ id: x.id, Orden: k + 1 })).filter((c, k) => Number(lista[k].Orden) !== c.Orden);
}

/** Sin esquema http(s) no es un enlace que la app pinte como liga (F4): evita javascript: y rutas locales. */
export function validarUrl(texto) {
    const s = String(texto || '').trim();
    if (!s) return { ok: false, motivo: 'pega la dirección del enlace' };
    let u;
    try { u = new URL(s); } catch (_) { return { ok: false, motivo: 'no es una dirección válida (empieza con https://)' }; }
    if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, motivo: 'solo enlaces http(s)' };
    return { ok: true, url: u.href };
}

/**
 * Que campos cambian al mover una tarea a `columna`. Al entrar a hecho se sella HechoPor/HechoEl;
 * al salir se limpia (null borra la celda en Graph). `Desde` se reescribe siempre.
 */
export function camposDeMovimiento(columna, quien, ahora = new Date()) {
    if (!COLUMNAS.includes(columna)) throw new Error(`columna desconocida: ${columna}`);
    const iso = ahora.toISOString();
    const c = { Columna: columna, Desde: iso };
    if (columna === 'hecho') { c.HechoPor = quien; c.HechoEl = iso; }
    else { c.HechoPor = null; c.HechoEl = null; }
    return c;
}

/** Iniciales de un correo o nombre, para el avatar. */
export function iniciales(quien) {
    const s = String(quien || '').split('@')[0].replace(/\d+/g, '');
    const partes = s.split(/[.\s_-]+/).filter(Boolean);
    return (partes.length >= 2 ? partes[0][0] + partes[1][0] : s.slice(0, 2)).toUpperCase() || '?';
}

/** Nombre corto de un correo: 'ana.perez@x' -> 'Ana Perez'. Si PROY_Roles trae Nombre, usa ese. */
export function nombreDe(correo, roles) {
    const c = String(correo || '').trim().toLowerCase();
    if (!c) return '—';
    const r = (roles || []).find(x => String(x.Title || '').trim().toLowerCase() === c);
    if (r && r.Nombre) return r.Nombre;
    return c.split('@')[0].replace(/\d+/g, '').split(/[._-]+/).filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join(' ') || c;
}

// ---------------------------------------------------------------- ligas: el tope de 255 de SharePoint

/** Largo maximo de una columna de texto de una linea en SharePoint; pasarlo es un 400 «Invalid request» sin mas detalle. */
export const TEXTO_MAX = 255;

/** La forma corta de SharePoint para abrir un elemento por su GUID (`sharepointIds.listItemUniqueId`): ~150 caracteres, abre lo mismo que el webUrl. null sin sitio o sin GUID. */
export function urlCortaDeGuid(sitioUrl, guid) {
    if (!sitioUrl || !guid) return null;
    const g = String(guid).replace(/[{}]/g, '').toUpperCase();
    return `${String(sitioUrl).replace(/\/+$/, '')}/_layouts/15/Doc.aspx?sourcedoc=%7B${g}%7D&action=default`;
}

/** Largo de cada campo de texto, para el aviso de un 400 que SharePoint no explica: 'Title 77 · Ruta 88 · Url 250'. */
export function resumenLargos(campos) {
    return Object.entries(campos || {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k} ${v.length}`).join(' · ');
}

/** Campos de texto que no caben en una columna de una linea: ['Url (268)', ...]. Vacio = todo cabe. */
export function textosLargos(campos, max = TEXTO_MAX) {
    return Object.entries(campos || {}).filter(([, v]) => typeof v === 'string' && v.length > max).map(([k, v]) => `${k} (${v.length})`);
}

/**
 * La URL que se guarda en PROY_Ligas.Url (texto de una linea, 255). El `webUrl` que Graph da por un
 * archivo de Office es la forma Doc.aspx?sourcedoc={GUID}&file=<nombre>&action=default&mobileredirect=true
 * (a veces &DefaultItemOpen=1): con un nombre de la convencion de la casa (60-100 caracteres) pasa de
 * 255 y SharePoint contesta 400 «Invalid request» (medido 2026-09-12 con el estudio de mercado de
 * CALYTEK, 77 caracteres de nombre). Orden: el webUrl si cabe; si no, la forma corta con el GUID del
 * elemento (`sharepointIds.listItemUniqueId`), que abre lo mismo; si no hay GUID, el Doc.aspx sin los
 * parametros que sobran; null si nada cabe — quien llama avisa en vez de mandar el 400.
 */
export function urlParaLiga(webUrl, { sitioUrl, guid } = {}, max = TEXTO_MAX) {
    const w = String(webUrl || '').trim();
    if (w && w.length <= max) return w;
    const corta = urlCortaDeGuid(sitioUrl, guid);
    if (corta && corta.length <= max) return corta;
    if (/\/_layouts\/15\/Doc\.aspx\?/i.test(w)) {
        try {
            const u = new URL(w);
            for (const p of ['file', 'mobileredirect', 'DefaultItemOpen']) u.searchParams.delete(p);
            if (u.href.length <= max) return u.href;
        } catch (_) { /* no era una URL; se cae al null */ }
    }
    return null;
}
