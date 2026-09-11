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
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
