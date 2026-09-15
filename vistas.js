// v0.10.0 (2026-09-12): las pantallas que Carlos pidio a partir de un tablero de referencia (foto del
// 12-sep, «Product Roadmap»): Roadmap (por frente y global), Calendario, Mensajes, Archivos y Reportes.
// Todo se DERIVA de las cinco listas que ya existen (no hay esquema nuevo): el roadmap usa
// Desde/_creado -> Vence/HechoEl, el calendario Vence, Mensajes los renglones «comentar», Archivos
// PROY_Ligas y Reportes lo que avance() y estadoVence() ya calculan. Nada de innerHTML (CSP); los
// graficos son SVG por DOM o cajas con ancho en %.

import { CONFIG } from './config.js';
import { tareasDe, avance, avanceGlobal, estadoVence, diasPara, nombreDe, sinDueno, ordenarProyectos, lapsoTarea, lapsoProyecto, rangoRoadmap, barraEn, mesesDelRango, celdasDelMes, agendaPorDia, hechasPorSemana, cargaPorPersona, actividadPorPersona, ultimoComentarioPorProyecto, filtrarLigas, diaDe, mesSumar, sumarDias, diasEntre, columnasDe, claseDeColumna, enProceso, segmentosDe, segmentosGlobales, tituloSegmentos, hrefSeguro, hitosDe, acomodarHitos, sinAcentos } from './reglas.js';
import { $, estado, el, boton, avatar, chip, fechaCorta, fechaHora, porId, equipoDe, iconoEquipo, iconoArchivo, irAHash, textoConMenciones, comentariosNuevos, verboComentario, opciones, columnasDeTarea, avisar } from './comun.js';
import { pintarChat } from './chat.js';   // v0.42.0: Mensajes pinta el hilo del frente elegido en su propia columna
import { tablaDocs, filaRaiz, filasDeExpediente, ordenarDocs } from './docs.js';   // v0.17.0: la misma tabla que Docs del proyecto; v0.18.0: y el mismo orden; v0.36.0: y el mismo arbol

const SVG_NS = 'http://www.w3.org/2000/svg';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
// v0.11.0: ya no hay una lista fija de columnas; los graficos de UN proyecto van por sus cubetas
// (segmentosDe) y los globales por tres categorias (segmentosGlobales), con los mismos colores por clase.
const hoyDia = () => diaDe(new Date());
const activos = () => estado.proyectos.filter(p => p.Estado === 'activo');
const nombreMes = mes => `${MESES[+mes.slice(5, 7) - 1]} ${mes.slice(0, 4)}`;
// `tab`: desde la pestana Roadmap del proyecto se conserva la pestana (sin ella el router vuelve al tablero).
const irTarjeta = (t, tab = '') => { const p = porId(estado.proyectos, t.ProyectoId); if (p) irAHash(`#p/${p.Clave}${tab ? '/' + tab : ''}/t/${t.id}`); };
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVG_NS, tag); for (const k in attrs) e.setAttribute(k, String(attrs[k])); return e; };

// ---------------------------------------------------------------- roadmap (gantt)

/**
 * El eje de tiempo compartido por el roadmap global y el del proyecto: cabecera con los meses, una
 * linea por semana y la raya de HOY. `filas` = [{ etiqueta: Node, lapso, clase, texto, abrir, pct }].
 * v0.22.0 (iteracion 4): los meses alternan fondo (un gradiente por pista, calculado del rango), la raya
 * de hoy lleva etiqueta «hoy · 13 sep» en la cabecera, y una fila puede traer `hitos` (rombos ya acomodados
 * por acomodarHitos, con `abrirHito(a)`) y `fin` ({ left, texto, titulo }: la raya del fin de frente).
 * `opts.umbralTxt` es el % minimo de espacio libre para que un rombo lleve su titulo debajo.
 */
function gantt(cont, filas, rango, opts = {}) {
    cont.textContent = '';
    const conHitos = filas.some(f => f.hitos || f.fin);
    const g = el('div', 'gantt' + (conHitos ? ' is-hitos' : '')); g.style.setProperty('--dias', String(rango.dias));
    // cabecera: meses arriba, semanas abajo
    const cab = el('div', 'g-cab'); cab.appendChild(el('span', 'g-eti', opts.rotulo || ''));
    const eje = el('div', 'g-eje');
    const meses = el('div', 'g-meses'); const bandas = [];
    for (const [i, m] of mesesDelRango(rango).entries()) {
        const s = el('span', '', m.width >= 18 ? nombreMes(m.mes) : `${MESES_CORTOS[+m.mes.slice(5, 7) - 1]} ${m.mes.slice(2, 4)}`); s.style.left = m.left + '%'; s.style.width = m.width + '%'; s.title = nombreMes(m.mes); meses.appendChild(s);
        bandas.push(`${i % 2 ? 'color-mix(in srgb, var(--text-body) 6%, transparent)' : 'transparent'} ${m.left}% ${m.left + m.width}%`);   // tinte del texto, no surface-sunken: en oscuro no se veia y las filas de grupo ya lo traian
    }
    g.style.setProperty('--bandas', `linear-gradient(90deg, ${bandas.join(', ')})`);
    eje.appendChild(meses);
    const semanas = el('div', 'g-semanas');
    for (let d = rango.desde; d <= rango.hasta; d = sumarDias(d, 7)) { const s = el('span', '', String(+d.slice(8, 10))); s.style.left = (diasEntre(rango.desde, d) * 100 / rango.dias) + '%'; s.style.width = (7 * 100 / rango.dias) + '%'; semanas.appendChild(s); }
    eje.appendChild(semanas);
    const hoy = hoyDia(); const hoyPct = (diasEntre(rango.desde, hoy) + 0.5) * 100 / rango.dias;
    // la etiqueta de hoy va en la cabecera (fija al hacer scroll); cerca del borde derecho se lee hacia la izquierda
    if (hoyPct >= 0 && hoyPct <= 100) { const h = el('i', 'g-hoy' + (hoyPct > 85 ? ' is-der' : '')); h.style.left = hoyPct + '%'; h.appendChild(el('b', '', `hoy · ${+hoy.slice(8, 10)} ${MESES_CORTOS[+hoy.slice(5, 7) - 1]}`)); eje.appendChild(h); }
    cab.appendChild(eje); g.appendChild(cab);
    for (const f of filas) {
        const fila = el('div', 'g-fila' + (f.grupo ? ' is-grupo' : ''));
        const eti = el('div', 'g-eti'); eti.appendChild(f.etiqueta); fila.appendChild(eti);
        const pista = el('div', 'g-pista');
        for (let d = rango.desde; d <= rango.hasta; d = sumarDias(d, 7)) { const i = el('i', 'g-sem'); i.style.left = (diasEntre(rango.desde, d) * 100 / rango.dias) + '%'; pista.appendChild(i); }
        if (hoyPct >= 0 && hoyPct <= 100) { const h = el('i', 'g-hoy'); h.style.left = hoyPct + '%'; h.title = 'hoy'; pista.appendChild(h); }
        if (!f.grupo) {
            const b = f.lapso ? barraEn(f.lapso, rango) : null;
            if (b) {
                const barra = el(f.abrir ? 'button' : 'span', 'g-barra is-' + (f.clase || 'idle')); if (f.abrir) { barra.type = 'button'; barra.addEventListener('click', f.abrir); }
                barra.style.left = b.left + '%'; barra.style.width = b.width + '%'; barra.title = f.titulo || f.texto || '';
                if (f.pct !== undefined) { const p = el('i', 'g-pct'); p.style.width = f.pct + '%'; barra.appendChild(p); }
                if (f.hito) barra.classList.add('is-hito');
                if (f.dataset) for (const k in f.dataset) barra.dataset[k] = f.dataset[k];
                pista.appendChild(barra);
                // Una barra de pocos dias no tiene donde escribir: el texto va afuera, a su derecha (o a la izquierda si toca el borde).
                if (b.width < 14 && !f.hito) { barra.classList.add('is-corta'); barra.setAttribute('aria-label', f.titulo || f.texto || ''); const t = el('span', 'g-txt g-fuera', f.texto || ''); if (b.left + b.width > 80) { t.classList.add('is-izq'); t.style.right = (100 - b.left) + '%'; } else t.style.left = (b.left + b.width) + '%'; if (!conHitos) pista.appendChild(t); }   // v0.22.0: con rombos el texto de afuera chocaria con ellos; la etiqueta y el title ya lo dicen
                else barra.appendChild(el('span', 'g-txt', f.texto || ''));
            } else if (!f.hitos || !f.hitos.length) pista.appendChild(el('span', 'g-sinfecha', f.sinFecha || 'sin fecha'));   // v0.22.0: un frente sin fin pero con hitos pinta solo sus rombos
            // v0.22.0: la raya del fin de frente (se ve aunque la barra vaya en 0 %) y los rombos de las tarjetas con fecha
            if (f.fin) { const r = el('i', 'g-fin'); r.style.left = f.fin.left + '%'; r.title = f.fin.titulo || ''; r.appendChild(el('b', '', f.fin.texto || '')); pista.appendChild(r); }
            for (const a of f.hitos || []) {
                const grupo = a.hitos.length > 1;
                const r = el('button', 'g-rombo' + (a.clase ? ' is-' + a.clase : '') + (grupo ? ' is-grupo' : '')); r.type = 'button'; r.style.left = a.left + '%';
                r.title = a.titulo || ''; r.setAttribute('aria-label', a.titulo || ''); r.dataset.hito = a.hitos.map(h => h.tarea.id).join(',');
                if (f.abrirHito) r.addEventListener('click', e => { e.stopPropagation(); f.abrirHito(a); });
                pista.appendChild(r);
                // el titulo cabe si hay espacio hasta el siguiente rombo o la raya del fin; un grupo siempre dice «+N»
                if (grupo || a.espacio >= (opts.umbralTxt ?? 6)) { const t = el('span', 'g-rombo-txt' + (grupo ? ' is-grupo' : ''), grupo ? `+${a.hitos.length}` : a.hitos[0].tarea.Title); t.style.left = a.left + '%'; if (!grupo) t.style.maxWidth = `calc(${a.espacio}% - ${a.topado ? 44 : 8}px)`; pista.appendChild(t); }   // topado: la fecha del fin (dd/mm, ~36 px) vive a la izquierda de su raya
            }
        }
        fila.appendChild(pista); g.appendChild(fila);
    }
    cont.appendChild(g);
}

/** Fila-etiqueta de una tarjeta en el roadmap del proyecto: avatar + titulo (abre la tarjeta). */
function etiquetaTarea(t) {
    const b = el('button', 'g-tarea'); b.type = 'button'; b.dataset.t = String(t.id); b.title = t.Title;
    b.appendChild(avatar(t.Asignado)); b.appendChild(el('span', 't', t.Title));
    b.addEventListener('click', () => irTarjeta(t, 'roadmap'));
    return b;
}
const CLASE_BARRA = { h: 'ok', r: 'info', c: 'brand', p: 'idle' };
const claseVence = t => t.Columna === 'hecho' ? 'ok' : estadoVence(t, CONFIG.vencePronto) === 'danger' ? 'danger' : CLASE_BARRA[claseDeColumna(t.Columna, columnasDeTarea(t))];
/** v0.22.0: el title (y aria-label) de un rombo: titulo · estado con fecha · quien. */
function tituloHito(h) {
    const t = h.tarea; const d = diasPara(t.Vence);
    const estado_ = h.clase === 'hecha' ? `hecha ${fechaCorta(t.HechoEl || t.Vence)}` : d < 0 ? `venció hace ${-d} d (${fechaCorta(t.Vence)})` : d === 0 ? 'vence hoy' : `vence ${fechaCorta(t.Vence)} (en ${d} d)`;
    return `${t.Title} · ${estado_}${t.Asignado ? ' · ' + nombreDe(t.Asignado, estado.roles) : ''}`;
}

/**
 * Roadmap del proyecto (pestana «Roadmap», #p/<clave>/roadmap): un carril por columna con sus
 * tarjetas como barras (Desde/creacion -> Vence; las hechas hasta HechoEl), el fin del frente como
 * hito y la raya de hoy. Sin fecha = sin barra, con su texto. Es la foto de referencia (Carlos, 12-sep).
 */
export function pintarRoadmapProyecto(p) {
    const cont = $('tab-roadmap'); cont.textContent = '';
    const ts = tareasDe(p, estado.tareas);
    const lapsos = ts.map(lapsoTarea); const lp = lapsoProyecto(p, estado.tareas);
    const rango = rangoRoadmap([...lapsos, lp], new Date());
    const filas = []; const cols = columnasDe(p);
    // v0.11.0: un carril por cubeta del proyecto (mas las huerfanas), en el orden del tablero.
    const carriles = [...cols]; for (const t of ts) if (!carriles.some(c => c.clave === t.Columna)) carriles.push({ clave: t.Columna, nombre: t.Columna });
    for (const { clave: col, nombre } of carriles) {
        const de = ts.filter(t => t.Columna === col);
        if (!de.length) continue;
        const cab = el('span', 'g-grupo'); cab.appendChild(el('i', 'punto is-' + claseDeColumna(col, cols))); cab.appendChild(el('b', '', nombre)); cab.appendChild(el('span', 'n', String(de.length)));
        filas.push({ grupo: true, etiqueta: cab });
        for (const t of de.sort((a, b) => String(lapsoTarea(a).fin || '9').localeCompare(String(lapsoTarea(b).fin || '9')) || a.id - b.id)) {
            const l = lapsoTarea(t); const d = t.Vence ? diasPara(t.Vence) : null;
            const texto = l.fin ? (t.Columna === 'hecho' ? `hecha ${fechaCorta(t.HechoEl || t.Vence)}` : d < 0 ? `venció hace ${-d} d` : d === 0 ? 'vence hoy' : `vence ${fechaCorta(t.Vence)}`) : '';
            filas.push({ etiqueta: etiquetaTarea(t), lapso: l, clase: claseVence(t), texto, titulo: `${t.Title} · ${texto}`, abrir: () => irTarjeta(t, 'roadmap'), dataset: { roadmap: String(t.id) }, sinFecha: 'sin fecha de vencimiento' });
        }
    }
    if (p.Vence && lp.fin) {
        const eti = el('span', 'g-grupo'); eti.appendChild(iconoEquipo(equipoDe(p), 'sm')); eti.appendChild(el('b', '', 'Fin del frente'));
        filas.push({ etiqueta: eti, lapso: { inicio: lp.fin, fin: lp.fin }, clase: diasPara(p.Vence) < 0 ? 'danger' : 'hito', hito: true, texto: fechaCorta(p.Vence), titulo: `Fin del frente: ${fechaCorta(p.Vence)}` });
    }
    if (!ts.length) { cont.appendChild(el('p', 'vacio', 'Sin tarjetas todavía: el roadmap se dibuja con las fechas de vencimiento.')); return; }
    const res = el('p', 'g-resumen', `${rango.dias} días en el eje · ${lapsos.filter(l => l.fin).length} de ${ts.length} tarjetas con fecha · la barra va de «en esta columna desde» (o creación) al vencimiento; las hechas, hasta que se hicieron.`);
    cont.appendChild(res);
    const caja = el('div', 'gantt-caja'); cont.appendChild(caja);
    gantt(caja, filas, rango, { rotulo: 'Tarjeta' });
}

/**
 * Roadmap global (pantalla «Roadmap»): un frente por fila, del rail sale el filtro por equipo, la
 * barra va de la creacion del proyecto al fin del frente con su avance adentro; abajo los hitos que
 * vienen (fines de frente a 60 dias) y los KPI de la foto (total · en curso · hechas · vencidas).
 */
export function pintarRoadmap() {
    // El filtro por equipo del rail aplica PAREJO: filas, KPI e hitos (el revisor vio KPI globales con «2 frentes de CALYTEK» arriba).
    const ps = ordenarProyectos(activos().filter(p => !estado.filtroEquipo || p.Equipo === estado.filtroEquipo));
    const idsPs = new Set(ps.map(p => p.id));   // v0.13.1
    const todas = estado.tareas.filter(t => idsPs.has(Number(t.ProyectoId)));
    const abiertas = todas.filter(t => t.Columna !== 'hecho');
    const k = $('roadmapKpis'); k.textContent = '';
    const kpi = (v, l, cls) => { const d = el('div', 'mn-kpi' + (cls ? ' is-' + cls : '')); d.appendChild(el('span', 'mn-kpi-label', l)); d.appendChild(el('span', 'mn-kpi-val', String(v))); k.appendChild(d); };
    const venc = abiertas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger').length;
    kpi(todas.length, 'tarjetas en total', 'info'); kpi(abiertas.filter(t => enProceso(t, columnasDeTarea(t))).length, 'en proceso', null); kpi(todas.length - abiertas.length, 'hechas', 'ok'); kpi(venc, 'vencidas', venc ? 'danger' : null);   // v0.11.0: «en proceso» = fuera de la primera cubeta
    $('roadmapSub').textContent = estado.filtroEquipo ? `${ps.length} frente(s) de ${equipoDe({ Equipo: estado.filtroEquipo }).nombre}; quita el filtro en el rail para ver todos.` : `${ps.length} frente(s) activo(s), del que vence antes al que vence después. La barra va de la creación del proyecto a su fin de frente; el relleno es el avance.`;
    const caja = $('roadmapCaja'); caja.textContent = '';
    const ley = $('roadmapLeyenda'); ley.textContent = ''; ley.classList.toggle('oculto', !ps.length);
    if (!ps.length) { caja.appendChild(el('p', 'vacio', 'Sin proyectos activos.')); }
    else {
        // v0.22.0 (iteracion 4): cada tarjeta con Vence es un HITO (rombo) sobre la barra de su frente. Los rombos que
        // caerian encima se agrupan («+N»); el umbral sale del ancho real de la pista (14 px de rombo + aire), y si la
        // caja aun no mide (pantalla oculta) se toma 2 % del eje. El titulo del rombo se pinta si hay ~56 px libres.
        const anchoPista = caja.clientWidth ? Math.max(caja.clientWidth, window.innerWidth <= 720 ? 520 : 640) - (window.innerWidth <= 720 ? 150 : 230) : 0;
        const umbral = anchoPista ? 18 * 100 / anchoPista : 2, umbralTxt = anchoPista ? 56 * 100 / anchoPista : 6;
        const hitosPs = ps.map(p => hitosDe(tareasDe(p, estado.tareas), CONFIG.vencePronto));
        // Un frente sin ninguna fecha (ni fin ni tarjetas con vencimiento) se dibuja de su creacion a hoy, en gris; uno sin
        // fin de frente pero con tarjetas con fecha lleva la barra gris hasta su ultima tarjeta con fecha (lapsoProyecto), con
        // los rombos encima — el mockup los pintaba sin barra, pero la barra es lo que abre el frente y lo que la E2E cuenta.
        const lapsos = ps.map(p => { const l = lapsoProyecto(p, estado.tareas); return l.fin ? l : { inicio: l.inicio || hoyDia(), fin: hoyDia() }; });
        const rango = rangoRoadmap([...lapsos, ...hitosPs.flat().map(h => ({ inicio: h.dia, fin: h.dia }))], new Date(), 84);
        const filas = ps.map((p, i) => {
            const ts = tareasDe(p, estado.tareas); const a = avance(ts, columnasDe(p)); const d = diasPara(p.Vence);
            const eti = el('button', 'g-proy'); eti.type = 'button'; eti.dataset.roadmapP = String(p.id); eti.title = p.Title;
            eti.appendChild(iconoEquipo(equipoDe(p), 'sm')); const c = el('span', 'cuerpo'); c.appendChild(el('span', 't', p.Title)); c.appendChild(el('span', 'm', `${a.hechas}/${a.total} hechas${p.Vence ? ` · fin ${fechaCorta(p.Vence).slice(0, 5)}` : ' · sin fin de frente'}`));   eti.appendChild(c);   // v0.40.0: el subtitulo va sin el % (Carlos, 14-sep) — el avance ya es el relleno de la barra
            eti.addEventListener('click', () => irAHash(`#p/${p.Clave}`));
            const textoFin = !p.Vence ? 'sin fin de frente' : d < 0 ? `venció hace ${-d} d` : d === 0 ? 'vence hoy' : `vence ${fechaCorta(p.Vence)}`;
            // la fecha del fin ya la dice su raya: adentro de la barra queda solo el avance (el title trae todo)
            const fin = p.Vence && lapsos[i].fin ? { left: (diasEntre(rango.desde, lapsos[i].fin) + 1) * 100 / rango.dias, texto: fechaCorta(p.Vence).slice(0, 5), titulo: `Fin del frente: ${fechaCorta(p.Vence)}` } : null;
            const hitos = acomodarHitos(hitosPs[i], rango, umbral, fin ? fin.left : 100);
            for (const h of hitos) h.titulo = h.hitos.length > 1 ? `${h.hitos.length} tarjetas del ${fechaCorta(h.dia)} al ${fechaCorta(h.hasta)}: ${h.hitos.map(x => x.tarea.Title).join(' · ')} — abre el roadmap del frente` : tituloHito(h.hitos[0]);
            return { etiqueta: eti, lapso: lapsos[i], clase: !p.Vence ? 'idle' : d < 0 ? 'danger' : d <= CONFIG.vencePronto ? 'warn' : 'brand', pct: a.pct, texto: p.Vence ? `${a.pct}%` : `${a.pct}% · sin fin de frente`, titulo: `${p.Title} · ${textoFin} · ${a.pct}% · ${hitos.reduce((n, h) => n + h.hitos.length, 0)} hito(s)`, abrir: () => irAHash(`#p/${p.Clave}`), dataset: { roadmapBarra: String(p.id) }, sinFecha: 'sin fechas', fin, hitos, abrirHito: h => h.hitos.length > 1 ? irAHash(`#p/${p.Clave}/roadmap`) : irTarjeta(h.hitos[0].tarea) };
        });
        gantt(caja, filas, rango, { rotulo: 'Frente', umbralTxt });
        // leyenda: las cuatro clases del rombo y que es cada cosa (la N de «pronto» sale de CONFIG, como en el tablero)
        const item = (cls, texto) => { const s = el('span'); s.appendChild(el('i', 'g-rombo-mini' + (cls ? ' is-' + cls : ''))); s.appendChild(el('span', '', texto)); return s; };
        ley.appendChild(item('', 'hito pendiente')); ley.appendChild(item('pronto', `vence hoy o en ${CONFIG.vencePronto} días`)); ley.appendChild(item('vencida', 'vencido')); ley.appendChild(item('hecha', 'hecho'));
        ley.appendChild(el('span', 'fin', 'rombo = tarjeta con fecha · barra = creación → fin del frente · relleno = avance · raya = fin del frente'));
    }
    // hitos: fines de frente en los proximos 60 dias (y los ya vencidos), como «Upcoming milestones» de la foto
    const h = $('roadmapHitos'); h.textContent = '';
    const hitos = ps.filter(p => p.Vence && diasPara(p.Vence) <= 60).sort((a, b) => String(a.Vence).localeCompare(String(b.Vence)));
    for (const p of hitos) {
        const d = diasPara(p.Vence); const ts = tareasDe(p, estado.tareas); const faltan = ts.filter(t => t.Columna !== 'hecho').length;
        const it = el('button', 'hito' + (d < 0 ? ' is-danger' : d <= CONFIG.vencePronto ? ' is-warn' : '')); it.type = 'button'; it.dataset.hito = String(p.id);
        const f = el('span', 'fecha'); f.appendChild(el('small', '', MESES_CORTOS[new Date(p.Vence).getUTCMonth()])); f.appendChild(el('b', '', String(new Date(p.Vence).getUTCDate()))); it.appendChild(f);
        const c = el('span', 'cuerpo'); c.appendChild(el('span', 't', p.Title)); c.appendChild(el('span', 'm', `${equipoDe(p).nombre} · ${faltan ? `faltan ${faltan}` : 'todo hecho'}`)); it.appendChild(c);
        it.appendChild(chip(d < 0 ? `hace ${-d} d` : d === 0 ? 'hoy' : `en ${d} d`, d < 0 ? 'danger' : d <= CONFIG.vencePronto ? 'warn' : 'info'));
        it.addEventListener('click', () => irAHash(`#p/${p.Clave}`)); h.appendChild(it);
    }
    if (!hitos.length) h.appendChild(el('p', 'vacio', 'Ningún fin de frente en los próximos 60 días.'));
}

// ---------------------------------------------------------------- calendario

/**
 * Calendario mensual: las tarjetas por su Vence (abiertas y hechas, con su color) y los fines de frente.
 * En escritorio es la rejilla de 6 semanas; en celular la misma informacion como agenda (CSS decide).
 * El mes vive en estado.mesCal (YYYY-MM); «hoy» vuelve al actual.
 */
export function pintarCalendario() {
    if (!estado.mesCal) estado.mesCal = hoyDia().slice(0, 7);
    const mes = estado.mesCal; const hoy = hoyDia();
    $('calTitulo').textContent = nombreMes(mes);
    const activosF = activos().filter(p => !estado.filtroEquipo || p.Equipo === estado.filtroEquipo);
    const idsF = new Set(activosF.map(p => p.id));   // v0.13.1
    const agenda = agendaPorDia(estado.tareas.filter(t => idsF.has(Number(t.ProyectoId))), activosF);
    const celdas = celdasDelMes(mes);
    const enMes = celdas.filter(c => c.enMes);
    const nT = enMes.reduce((n, c) => n + ((agenda.get(c.dia) || { tareas: [] }).tareas.length), 0), nF = enMes.reduce((n, c) => n + ((agenda.get(c.dia) || { fines: [] }).fines.length), 0);
    $('calSub').textContent = `${nT} tarjeta(s) vencen este mes · ${nF} fin(es) de frente${estado.filtroEquipo ? ` · solo ${equipoDe({ Equipo: estado.filtroEquipo }).nombre}` : ''}`;
    const g = $('calRejilla'); g.textContent = '';
    for (const d of DIAS_CORTOS) g.appendChild(el('div', 'cal-dow', d));
    const itemTarea = (t, largo) => {
        const p = porId(estado.proyectos, t.ProyectoId);
        const b = el('button', 'cal-it is-' + claseVence(t)); b.type = 'button'; b.dataset.calT = String(t.id); b.title = `${t.Title}${p ? ' · ' + p.Title : ''}${t.Asignado ? ' · ' + nombreDe(t.Asignado, estado.roles) : ''}`;
        if (largo) b.appendChild(avatar(t.Asignado));
        b.appendChild(el('span', 't', t.Title)); if (largo && p) b.appendChild(el('span', 'm', p.Title));
        b.addEventListener('click', () => irTarjeta(t)); return b;
    };
    const itemFin = p => { const b = el('button', 'cal-it is-hito'); b.type = 'button'; b.dataset.calP = String(p.id); b.title = `Fin del frente · ${p.Title}`; b.appendChild(iconoEquipo(equipoDe(p), 'sm')); b.appendChild(el('span', 't', `Fin: ${p.Title}`)); b.addEventListener('click', () => irAHash(`#p/${p.Clave}`)); return b; };
    for (const c of celdas) {
        const a = agenda.get(c.dia) || { tareas: [], fines: [] };
        const celda = el('div', 'cal-dia' + (c.enMes ? '' : ' is-fuera') + (c.dia === hoy ? ' is-hoy' : '') + (a.tareas.length + a.fines.length ? ' con' : '')); celda.dataset.dia = c.dia;
        celda.appendChild(el('span', 'num', String(+c.dia.slice(8, 10))));
        const tope = 3;
        for (const p of a.fines) celda.appendChild(itemFin(p));
        for (const t of a.tareas.slice(0, tope)) celda.appendChild(itemTarea(t, false));
        if (a.tareas.length > tope) { const mas = boton(`+${a.tareas.length - tope} más`, 'cal-mas', () => { estado.calDia = c.dia; pintarCalendario(); $('calDetalle').scrollIntoView({ block: 'nearest' }); }); celda.appendChild(mas); }
        const elegir = () => { estado.calDia = estado.calDia === c.dia ? null : c.dia; pintarCalendario(); };
        celda.addEventListener('click', e => { if (e.target === celda || e.target.classList.contains('num')) elegir(); });
        celda.tabIndex = 0; celda.setAttribute('role', 'button'); celda.setAttribute('aria-label', `${+c.dia.slice(8, 10)} de ${MESES[+c.dia.slice(5, 7) - 1]}${a.tareas.length ? ` · ${a.tareas.length} tarjeta(s)` : ''}${a.fines.length ? ' · fin de frente' : ''}`);
        celda.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === celda) { e.preventDefault(); elegir(); } });
        if (estado.calDia === c.dia) celda.classList.add('is-elegido');
        g.appendChild(celda);
    }
    // detalle del dia elegido (escritorio) y agenda del mes (celular)
    const det = $('calDetalle'); det.textContent = '';
    if (estado.calDia) {
        const a = agenda.get(estado.calDia) || { tareas: [], fines: [] };
        det.appendChild(el('h2', '', `${DIAS_CORTOS[(new Date(estado.calDia + 'T00:00:00Z').getUTCDay() + 6) % 7]} ${+estado.calDia.slice(8, 10)} de ${MESES[+estado.calDia.slice(5, 7) - 1]}`));
        for (const p of a.fines) det.appendChild(itemFin(p)); for (const t of a.tareas) det.appendChild(itemTarea(t, true));
        if (!a.tareas.length && !a.fines.length) det.appendChild(el('p', 'vacio', 'Nada vence este día.'));
    }
    det.classList.toggle('oculto', !estado.calDia);
    const ag = $('calAgenda'); ag.textContent = '';
    for (const c of enMes) {
        const a = agenda.get(c.dia); if (!a) continue;
        const bloque = el('section', 'cal-ag' + (c.dia === hoy ? ' is-hoy' : '') + (c.dia < hoy ? ' is-pasado' : ''));
        bloque.appendChild(el('h3', '', `${DIAS_CORTOS[(new Date(c.dia + 'T00:00:00Z').getUTCDay() + 6) % 7]} ${+c.dia.slice(8, 10)}`));
        for (const p of a.fines) bloque.appendChild(itemFin(p)); for (const t of a.tareas) bloque.appendChild(itemTarea(t, true));
        ag.appendChild(bloque);
    }
    if (!ag.childNodes.length) ag.appendChild(el('p', 'vacio', 'Nada vence este mes.'));
}
/**
 * v0.26.0: la linea de tiempo del Roadmap a PANTALLA COMPLETA (Carlos, 14-sep). La tarjeta `#roadmapLinea` toma la clase
 * `is-full` (fija, ocupa la ventana entera, por encima del rail y de la barra movil) y el gantt se repinta para que el
 * umbral de los rombos salga del ancho nuevo. Esc o el mismo boton la devuelven; cambiar de pantalla tambien la cierra.
 * No usa la Fullscreen API: la PWA de iOS no la tiene, y una clase CSS se prueba en la E2E sin permisos del navegador.
 */
export function roadmapFull(activar) {
    const sec = $('roadmapLinea'), b = $('btnRoadmapFull');
    const on = activar === undefined ? !sec.classList.contains('is-full') : !!activar;
    if (on === sec.classList.contains('is-full')) return;
    sec.classList.toggle('is-full', on); document.body.classList.toggle('sin-scroll', on);
    b.textContent = on ? 'salir de pantalla completa' : 'pantalla completa'; b.setAttribute('aria-pressed', String(on));
    pintarRoadmap();   // el umbral de los rombos depende del ancho real de la pista
}
export function engancharRoadmap() {
    $('btnRoadmapFull').addEventListener('click', () => roadmapFull());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('roadmapLinea').classList.contains('is-full')) roadmapFull(false); });
}

export function engancharCalendario() {
    $('calAnterior').addEventListener('click', () => { estado.mesCal = mesSumar(estado.mesCal || hoyDia().slice(0, 7), -1); estado.calDia = null; pintarCalendario(); });
    $('calSiguiente').addEventListener('click', () => { estado.mesCal = mesSumar(estado.mesCal || hoyDia().slice(0, 7), 1); estado.calDia = null; pintarCalendario(); });
    $('calHoy').addEventListener('click', () => { estado.mesCal = hoyDia().slice(0, 7); estado.calDia = hoyDia(); pintarCalendario(); });
}

// ---------------------------------------------------------------- mensajes

/**
 * Mensajes (v0.42.0, Carlos 14-sep, artifact 17j5wESZ «bandeja + hilo solamente»): a la izquierda la bandeja en dos
 * secciones —Frentes (los que tienen chat, el mas reciente arriba) y Sin conversacion (plegada)— y a la derecha el hilo
 * del frente elegido, que es el MISMO #tab-chat de la pestana del proyecto alojado aqui (alojarChat).
 * v0.43.0 (Carlos, 15-sep): SOLO chat por frente. La seccion Personas y la ficha con la liga a Teams (v0.42.0) salieron:
 * casi no se usaban, y un chat 1:1 en la app no seria privado (la bitacora PROY_Actividad la lee todo el equipo).
 * El estado vive en estado.mensajesSel = {t:'f', k: clave}; el hash lo refleja (#mensajes/f/<clave>).
 * En celular (≤ 900) se ve una columna a la vez y «← Bandeja» regresa.
 */
let casaChat = null;   // donde vive #tab-chat en index.html (la pestana del proyecto), para devolverlo
function alojarChat(host) {
    const c = $('tab-chat'); if (!c) return;
    if (!casaChat) casaChat = { padre: c.parentNode, sig: c.nextSibling };
    if (host) { if (c.parentNode !== host) host.appendChild(c); c.classList.remove('oculto'); }
    else if (c.parentNode !== casaChat.padre) { casaChat.padre.insertBefore(c, casaChat.sig); c.classList.add('oculto'); }
}
/** app.js lo llama al repintar cualquier pantalla que no sea Mensajes: el hilo vuelve a la pestana del proyecto. */
export function devolverChat() { alojarChat(null); }

const coincide = (q, ...textos) => !q || textos.some(t => sinAcentos(String(t || '')).includes(q));

export function pintarMensajes() {
    const yo = estado.cuenta.username.toLowerCase();
    const sel = estado.mensajesSel || null;
    const q = sinAcentos(estado.buscaMensajes || '').trim();
    const ult = ultimoComentarioPorProyecto(estado.actividad);
    const lista = $('mensajesLista'); lista.textContent = '';
    let nuevosTotal = 0;
    const seccion = (titulo, n, abierta, hijos, clave) => {
        const d = el('details', 'msj-sec'); d.open = abierta; d.dataset.sec = clave;
        const s = el('summary'); s.appendChild(el('span', '', titulo)); s.appendChild(el('span', 'cnt mn-mono', String(n))); d.appendChild(s);
        for (const h of hijos) d.appendChild(h);
        if (!hijos.length) d.appendChild(el('p', 'vacio', q ? 'Nada coincide.' : '—'));
        return d;
    };
    const renglon = (p, ultimo) => {
        const nuevos = comentariosNuevos(p.id).length; nuevosTotal += nuevos;
        const on = sel && sel.t === 'f' && sel.k === p.Clave;
        const b = el('button', 'msg-proy' + (nuevos ? ' is-nuevo' : '') + (ultimo ? '' : ' is-vacio') + (on ? ' is-on' : '')); b.type = 'button'; b.dataset.mensajes = String(p.id);
        b.setAttribute('aria-current', on ? 'true' : 'false');
        b.appendChild(ultimo ? avatar(ultimo.Quien) : iconoEquipo(equipoDe(p)));
        const c = el('span', 'cuerpo');
        const cab = el('span', 'cab'); const t = el('span', 't'); t.appendChild(iconoEquipo(equipoDe(p), 'sm')); t.appendChild(el('span', '', p.Title)); cab.appendChild(t);
        cab.appendChild(el('span', 'd', ultimo ? fechaHora(ultimo.Cuando) : '')); c.appendChild(cab);
        const m = el('span', 'm');
        if (ultimo) { m.appendChild(el('b', '', (String(ultimo.Quien || '').toLowerCase() === yo ? 'Tú' : nombreDe(ultimo.Quien, estado.roles).split(' ')[0]) + (ultimo.TareaId ? ' (nota): ' : ': '))); m.appendChild(textoConMenciones(ultimo.Title, undefined, false)); }
        else m.textContent = p.Estado === 'activo' ? 'Sin conversación todavía.' : 'Cerrado · sin conversación.';
        c.appendChild(m); b.appendChild(c);
        const lado = el('span', 'lado');
        if (nuevos) { const n = el('b', 'mn-rail-hot', String(nuevos)); n.title = `${nuevos} nuevo${nuevos === 1 ? '' : 's'} desde tu última visita`; lado.appendChild(n); }
        if (p.Estado !== 'activo') lado.appendChild(chip('cerrado'));
        b.appendChild(lado);
        b.addEventListener('click', () => irAHash(`#mensajes/f/${p.Clave}`));
        return b;
    };
    const con = ult.map(x => ({ p: porId(estado.proyectos, x.proyectoId), ultimo: x.ultimo })).filter(x => x.p && coincide(q, x.p.Title, x.p.Clave, x.ultimo.Title, nombreDe(x.ultimo.Quien, estado.roles)));
    const sin = ordenarProyectos(activos().filter(p => !ult.some(x => x.proyectoId === p.id))).filter(p => coincide(q, p.Title, p.Clave));
    // el conteo de nuevos es de TODOS los frentes con chat, no solo los que pasan el buscador
    for (const x of ult) if (!con.some(y => y.p.id === x.proyectoId) && porId(estado.proyectos, x.proyectoId)) nuevosTotal += comentariosNuevos(x.proyectoId).length;
    lista.appendChild(seccion('Frentes', con.length, true, con.map(x => renglon(x.p, x.ultimo)), 'frentes'));
    lista.appendChild(seccion('Sin conversación', sin.length, !!q, sin.map(p => renglon(p, null)), 'sin'));
    $('mensajesSub').textContent = `${con.length} conversación(es) · ${nuevosTotal ? `${nuevosTotal} mensaje(s) nuevo(s) desde tu última visita` : 'nada nuevo desde tu última visita'}. Un chat por frente; escribe @nombre para avisarle a alguien.`;
    // ---- derecha: hilo del frente o el aviso de elegir
    const p = sel && sel.t === 'f' ? estado.proyectos.find(x => String(x.Clave || '') === sel.k) : null;
    $('msj').classList.toggle('is-hilo', !!p);
    $('mensajesVacio').classList.toggle('oculto', !!p);
    $('mensajesHilo').classList.toggle('oculto', !p);
    if (p) { alojarChat($('mensajesHilo')); pintarChat(p); }
    else alojarChat(null);
}
export function engancharMensajes() {
    $('mensajesBusca').addEventListener('input', () => { estado.buscaMensajes = $('mensajesBusca').value; pintarMensajes(); });
    $('mensajesVolver').addEventListener('click', () => irAHash('#mensajes'));
}
/** Cuantos mensajes nuevos hay en total (insignia del rail): suma de comentariosNuevos por proyecto activo. */
export function mensajesNuevos() {
    // El chat que esta en pantalla ya se esta leyendo: no cuenta (la pestana Chat tampoco lo pinta en ambar, app.js).
    // v0.42.0: tambien el frente cuyo hilo esta abierto en Mensajes.
    const sel = estado.pestana === 'mensajes' && estado.mensajesSel && estado.mensajesSel.t === 'f' ? estado.proyectos.find(x => String(x.Clave || '') === estado.mensajesSel.k) : null;
    const leyendo = estado.pestana === 'proyecto' && estado.tab === 'chat' && estado.proyectoAbierto ? estado.proyectoAbierto.id : sel ? sel.id : null;
    return activos().reduce((n, p) => n + (p.id === leyendo ? 0 : comentariosNuevos(p.id).length), 0);
}
// ---------------------------------------------------------------- archivos

/**
 * Archivos: todas las ligas de todos los frentes en una lista, con chips por tipo, un select por
 * proyecto y buscador; agrupadas por proyecto. Cada nombre abre el archivo; el proyecto abre sus
 * Documentos (donde se liga, se quita y se reasigna: aqui solo se encuentra).
 */
export function pintarArchivos() {
    const f = estado.filtroArchivos;
    const sel = $('archivosProyecto');
    opciones(sel, ordenarProyectos(estado.proyectos.filter(p => estado.ligas.some(l => Number(l.ProyectoId) === p.id))), p => p.id, p => p.Title, 'Todos los proyectos');
    sel.value = f.proyectoId ? String(f.proyectoId) : '';
    const chips = $('archivosTipo'); chips.textContent = '';
    for (const [k, texto] of [[null, 'Todos'], ['archivado', 'archivado'], ['buzon', 'en el buzón'], ['enlace', 'enlace']]) {
        const on = f.tipo === k; const b = boton(texto, on ? 'is-on' : '', () => { f.tipo = k; pintarArchivos(); }, { tipo: k || 'todos' }); b.setAttribute('aria-pressed', on ? 'true' : 'false'); chips.appendChild(b);
    }
    const ligas = ordenarDocs(filtrarLigas(estado.ligas, f), estado.ordenArchivos);   // v0.18.0: por la columna elegida, dentro de cada proyecto
    $('archivosSub').textContent = `${ligas.length} de ${estado.ligas.length} documento(s) ligado(s) en todos los frentes. Para ligar, quitar o cambiar de tarjeta, entra a Documentos del proyecto.`;
    // v0.17.0: cuatro cifras arriba (como la captura de referencia): total, archivados, en el buzon, enlaces.
    const k = $('archivosKpis'); k.textContent = '';
    const cuenta = tipo => estado.ligas.filter(l => l.Tipo === tipo).length;
    const kpi = (v, l, cls, id) => { const d = el('div', 'mn-kpi' + (cls ? ' is-' + cls : '')); d.dataset.kpi = id; d.appendChild(el('span', 'mn-kpi-label', l)); d.appendChild(el('span', 'mn-kpi-val', String(v))); k.appendChild(d); };
    kpi(estado.ligas.length, 'Documentos ligados', '', 'total'); kpi(cuenta('archivado'), 'Archivados', 'ok', 'archivado'); kpi(cuenta('buzon'), 'En el buzón', 'info', 'buzon'); kpi(cuenta('enlace'), 'Enlaces', '', 'enlace');
    const cont = $('archivosLista'); cont.textContent = '';
    $('archivosTodo').hidden = true;   // v0.36.0: solo con arbol pintado
    if (!ligas.length) { cont.appendChild(el('p', 'vacio', estado.ligas.length ? 'Nada con ese filtro.' : 'Ningún documento ligado todavía.')); return; }
    // v0.17.0: una sola tabla (la de Docs del proyecto). v0.36.0 (Carlos, 14-sep): y el MISMO ARBOL de expediente que Docs
    // (.is-arbol.is-frentes), con una carpeta raiz mas arriba: proyecto > tarjeta > documento. Cada raiz se pliega; las llaves
    // de estado.plegadasArchivos van prefijadas por proyecto («p7», «p7/0» = Del proyecto, «p7/t12» = tarjeta) porque los ids
    // de tarjeta y de proyecto se cruzan. Sin nodo de «tarjetas sin documentos»: aqui solo se encuentra, no se liga.
    const porP = new Map(); for (const l of ligas) { const k = Number(l.ProyectoId); if (!porP.has(k)) porP.set(k, []); porP.get(k).push(l); }
    const tabla = tablaDocs({ orden: estado.ordenArchivos, alOrdenar: o => { estado.ordenArchivos = o; pintarArchivos(); }, sinTarjeta: true }); const tb = tabla.querySelector('tbody');   // v0.45.0: sin columna «Tarjeta», la carpeta ya la nombra
    tabla.classList.add('is-arbol', 'is-frentes');
    const S = estado.plegadasArchivos; const plegada = k => S.has(k);
    const alPlegar = k => { if (S.has(k)) S.delete(k); else S.add(k); pintarArchivos(); };
    const llaves = [];
    for (const p of ordenarProyectos(estado.proyectos.filter(p => porP.has(p.id)))) {
        const kp = `p${p.id}`; const total = estado.ligas.filter(l => Number(l.ProyectoId) === p.id).length; llaves.push(kp);
        tb.appendChild(filaRaiz(p.Title, porP.get(p.id).length, total, { icono: iconoEquipo(equipoDe(p), 'sm'), plegada: plegada(kp), alPlegar: () => alPlegar(kp), alAbrir: () => irAHash(`#p/${p.Clave}/docs`), sinTarjeta: true }));
        const r = filasDeExpediente(tb, p, porP.get(p.id), { llave: k => `${kp}/${k ? 't' + k : 0}`, plegada, alPlegar, ocultas: plegada(kp), sinTarjeta: true, doc: () => ({ p, enArchivos: true, alTarjeta: irTarjeta }) });
        for (const k of r.llaves) llaves.push(`${kp}/${k ? 't' + k : 0}`);
    }
    cont.appendChild(tabla);
    // v0.36.0: «Abrir todo» / «Plegar todo», como en Docs (v0.34.0); cada boton se apaga cuando no tiene nada que hacer.
    $('archivosTodo').hidden = false;
    $('archivosAbrirTodo').disabled = llaves.every(k => !plegada(k)); $('archivosPlegarTodo').disabled = llaves.every(k => plegada(k));
    $('archivosAbrirTodo').onclick = () => { estado.plegadasArchivos = new Set(); pintarArchivos(); };
    $('archivosPlegarTodo').onclick = () => { estado.plegadasArchivos = new Set(llaves); pintarArchivos(); };
}
export function engancharArchivos() {
    $('archivosProyecto').addEventListener('change', () => { estado.filtroArchivos.proyectoId = $('archivosProyecto').value ? Number($('archivosProyecto').value) : null; pintarArchivos(); });
    $('textoArchivos').addEventListener('input', () => { estado.filtroArchivos.texto = $('textoArchivos').value; if (estado.pestana === 'archivos') pintarArchivos(); });
}

// ---------------------------------------------------------------- reportes

/**
 * Anillo de avance (SVG por DOM) con el % al centro: lo usa Reportes (segmentosGlobales) y la lateral del
 * proyecto (segmentosDe). `segs` = [[{nombre}, n, clase], ...] de Hecho a la primera; el % es el de 'h'.
 */
export function anillo(segs, total, tam = 120) {
    const hechas = segs.filter(s => s[2] === 'h').reduce((n, s) => n + s[1], 0);
    const svg = svgEl('svg', { viewBox: '0 0 42 42', class: 'anillo', width: tam, height: tam, role: 'img' });
    svg.setAttribute('aria-label', `${total ? Math.round(hechas * 100 / total) : 0}% hechas`);
    svg.appendChild(svgEl('circle', { cx: 21, cy: 21, r: 15.9, class: 'fondo' }));
    let acumulado = 0;
    for (const [col, n, cls, tono] of segs) {
        if (!n || !total) continue;
        const pct = n * 100 / total;
        const c = svgEl('circle', { cx: 21, cy: 21, r: 15.9, class: 'seg is-' + cls, ...(tono ? { 'data-tono': tono } : {}), 'stroke-dasharray': `${Math.max(pct - 1.5, 0)} ${100 - Math.max(pct - 1.5, 0)}`, 'stroke-dashoffset': String(25 - acumulado) });
        const tt = svgEl('title'); tt.textContent = `${col.nombre}: ${n}`; c.appendChild(tt);
        svg.appendChild(c); acumulado += pct;
    }
    const tx = svgEl('text', { x: 21, y: 21, class: 'pct', 'text-anchor': 'middle', 'dominant-baseline': 'central' }); tx.textContent = `${total ? Math.round(hechas * 100 / total) : 0}%`; svg.appendChild(tx);
    return svg;
}
function leyenda(segs) {
    const l = el('div', 'leyenda');
    for (const [col, n, cls, tono] of segs) { const s = el('span', 'is-' + cls); if (tono) s.dataset.tono = tono; s.appendChild(el('i')); s.appendChild(el('span', '', `${col.nombre} `)); s.appendChild(el('b', '', String(n))); l.appendChild(s); }
    return l;
}
/** Barra horizontal con segmentos por cubeta del proyecto (la misma leyenda que la lista de proyectos) y su % a la derecha. */
function barraSeg(a) {
    const w = el('div', 'rep-barra');
    const segs = segmentosDe(a);
    const b = el('div', 'segbar alta'); b.title = tituloSegmentos(segs);
    for (const [col, n, cls, tono] of segs) { const i = el('i', cls); if (tono) i.dataset.tono = tono; i.style.flex = String(n); i.title = `${col.nombre}: ${n}`; if (n) i.appendChild(el('span', '', String(n))); b.appendChild(i); }
    if (!a.total) { const i = el('i', 'p'); i.style.flex = '1'; b.appendChild(i); }
    w.appendChild(b); w.appendChild(el('b', 'mn-mono', `${a.pct}%`));
    return w;
}
/** Columnas verticales (hechas por semana): cajas con alto en %, valor encima, rotulo del lunes abajo. */
function columnas(cont, series, textoDe) {
    const max = Math.max(1, ...series.map(s => s.n));
    const g = el('div', 'rep-cols'); g.setAttribute('role', 'img'); g.setAttribute('aria-label', series.map(s => `${textoDe(s)}: ${s.n}`).join(' · '));
    for (const s of series) {
        const c = el('div', 'col-s'); c.title = `${textoDe(s)}: ${s.n}`;
        c.appendChild(el('b', '', s.n ? String(s.n) : ''));
        const barra = el('i'); barra.style.height = (s.n * 100 / max) + '%'; if (!s.n) barra.classList.add('cero'); c.appendChild(barra);
        c.appendChild(el('small', '', textoDe(s))); g.appendChild(c);
    }
    cont.appendChild(g);
}

/**
 * Reportes: lo que un tablero no enseña porque vive repartido en 4 frentes. Avance por proyecto
 * (barra segmentada + anillo global), carga por persona (abiertas con las vencidas marcadas), hechas
 * por semana (8 semanas), actividad por persona (30 dias) y los frentes que van tarde. Todo se
 * calcula del estado ya cargado; «Imprimir» saca la pantalla a PDF.
 */
export function pintarReportes() {
    const ps = activos().filter(p => !estado.filtroEquipo || p.Equipo === estado.filtroEquipo);
    const idsPs = new Set(ps.map(p => p.id));   // v0.13.1
    const todas = estado.tareas.filter(t => idsPs.has(Number(t.ProyectoId)));
    const a = avanceGlobal(todas, columnasDeTarea); const abiertas = todas.filter(t => t.Columna !== 'hecho');   // v0.11.0: entre proyectos, por categoria
    const venc = abiertas.filter(t => estadoVence(t, CONFIG.vencePronto) === 'danger');
    $('reportesSub').textContent = `${ps.length} frente(s) activo(s)${estado.filtroEquipo ? ` de ${equipoDe({ Equipo: estado.filtroEquipo }).nombre}` : ''} · ${todas.length} tarjetas · calculado de las listas al ${fechaCorta(new Date().toISOString())}.`;
    const k = $('reportesKpis'); k.textContent = '';
    const kpi = (v, l, cls, id) => { const d = el('div', 'mn-kpi' + (cls ? ' is-' + cls : '')); d.dataset.rep = id; d.appendChild(el('span', 'mn-kpi-label', l)); d.appendChild(el('span', 'mn-kpi-val', String(v))); k.appendChild(d); };
    kpi(ps.length, 'proyectos activos', 'info', 'proyectos'); kpi(abiertas.length, 'tarjetas abiertas', null, 'abiertas'); kpi(a.hechas, 'hechas', 'ok', 'hechas'); kpi(venc.length, 'vencidas', venc.length ? 'danger' : null, 'vencidas'); kpi(sinDueno(abiertas).length, 'sin dueño', sinDueno(abiertas).length ? 'warn' : null, 'sin-dueno');
    // avance global + por proyecto
    const g = $('repGlobal'); g.textContent = ''; g.appendChild(anillo(segmentosGlobales(a), a.total, 132)); g.appendChild(leyenda(segmentosGlobales(a)));
    const pp = $('repProyectos'); pp.textContent = '';
    for (const p of ordenarProyectos(ps)) {
        const ap = avance(tareasDe(p, estado.tareas), columnasDe(p)); const d = diasPara(p.Vence);
        const fila = el('button', 'rep-fila'); fila.type = 'button'; fila.dataset.repP = String(p.id); fila.addEventListener('click', () => irAHash(`#p/${p.Clave}`));
        const eti = el('span', 'eti'); eti.appendChild(iconoEquipo(equipoDe(p), 'sm')); eti.appendChild(el('span', 't', p.Title)); eti.appendChild(el('span', 'm', p.Vence ? (d < 0 ? `venció hace ${-d} d` : `vence ${fechaCorta(p.Vence)}`) : 'sin fin de frente')); fila.appendChild(eti);
        fila.appendChild(barraSeg(ap)); pp.appendChild(fila);
    }
    if (!ps.length) pp.appendChild(el('p', 'vacio', 'Sin proyectos activos.'));
    // carga por persona
    const cp = $('repPersonas'); cp.textContent = '';
    const carga = cargaPorPersona(todas, CONFIG.vencePronto); const maxC = Math.max(1, ...carga.map(c => c.abiertas));
    for (const c of carga) {
        const fila = el('div', 'rep-fila'); fila.dataset.repQ = c.quien || 'sin-dueno';
        const eti = el('span', 'eti'); eti.appendChild(avatar(c.quien)); eti.appendChild(el('span', 't', c.quien ? nombreDe(c.quien, estado.roles) : 'Sin dueño')); eti.appendChild(el('span', 'm', `${c.hechas} hechas`)); fila.appendChild(eti);
        const w = el('div', 'rep-barra'); const b = el('div', 'hbar'); b.title = `${c.abiertas} abiertas, ${c.vencidas} vencidas`;
        const ok = el('i', 'abiertas'); ok.style.width = ((c.abiertas - c.vencidas) * 100 / maxC) + '%'; b.appendChild(ok);
        if (c.vencidas) { const v = el('i', 'vencidas'); v.style.width = (c.vencidas * 100 / maxC) + '%'; v.appendChild(el('span', '', String(c.vencidas))); b.appendChild(v); }
        w.appendChild(b); w.appendChild(el('b', 'mn-mono', String(c.abiertas))); fila.appendChild(w); cp.appendChild(fila);
    }
    if (!carga.length) cp.appendChild(el('p', 'vacio', 'Sin tarjetas.'));
    // hechas por semana
    const hs = $('repSemanas'); hs.textContent = '';
    const semanas = hechasPorSemana(todas, 8); columnas(hs, semanas, s => `${+s.desde.slice(8, 10)} ${MESES_CORTOS[+s.desde.slice(5, 7) - 1]}`);
    const totalSem = semanas.reduce((n, s) => n + s.n, 0); $('repSemanasSub').textContent = totalSem ? `${totalSem} tarjeta(s) hechas en 8 semanas · ${(totalSem / 8).toFixed(1)} por semana.` : 'Ninguna tarjeta con fecha de hecho en las últimas 8 semanas.';
    // actividad por persona
    const ap = $('repActividad'); ap.textContent = '';
    const act = actividadPorPersona(estado.actividad.filter(x => !x.ProyectoId || ps.some(p => p.id === Number(x.ProyectoId))), 30); const maxA = Math.max(1, ...act.map(x => x.n));
    for (const x of act) {
        const fila = el('div', 'rep-fila'); const eti = el('span', 'eti'); eti.appendChild(avatar(x.quien)); eti.appendChild(el('span', 't', nombreDe(x.quien, estado.roles))); fila.appendChild(eti);
        const w = el('div', 'rep-barra'); const b = el('div', 'hbar'); const i = el('i', 'act'); i.style.width = (x.n * 100 / maxA) + '%'; b.appendChild(i); w.appendChild(b); w.appendChild(el('b', 'mn-mono', String(x.n))); fila.appendChild(w); ap.appendChild(fila);
    }
    if (!act.length) ap.appendChild(el('p', 'vacio', 'Sin actividad en 30 días.'));
    // tarde: tarjetas vencidas por proyecto
    const tv = $('repVencidas'); tv.textContent = '';
    for (const p of ordenarProyectos(ps)) {
        const vs = venc.filter(t => Number(t.ProyectoId) === p.id); if (!vs.length) continue;
        const cab = el('div', 'grupo'); cab.textContent = `${p.Title} · ${vs.length}`; tv.appendChild(cab);
        for (const t of vs.sort((x, y) => String(x.Vence).localeCompare(String(y.Vence)))) {
            const b = el('button', 'it clic'); b.type = 'button'; b.dataset.repV = String(t.id); b.addEventListener('click', () => irTarjeta(t));
            b.appendChild(avatar(t.Asignado)); const c = el('div'); const cab2 = el('div', 'cab'); cab2.appendChild(el('span', 'q', t.Asignado ? nombreDe(t.Asignado, estado.roles).split(' ')[0] : 'sin dueño')); cab2.appendChild(el('span', 'd is-danger', `hace ${-diasPara(t.Vence)} d`)); c.appendChild(cab2); c.appendChild(el('div', 'f', t.Title)); b.appendChild(c); tv.appendChild(b);
        }
    }
    if (!venc.length) tv.appendChild(el('p', 'vacio', 'Nada vencido.'));
}
export function engancharReportes() { $('btnImprimirReportes').addEventListener('click', () => window.print()); }
