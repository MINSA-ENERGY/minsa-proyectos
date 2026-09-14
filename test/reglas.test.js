// node test/reglas.test.js — reglas puras de MINSA Proyectos (decisiones del plan 2026-09-11).
import assert from 'node:assert/strict';
import { ordenarLigas, direccionInicial, nombreHumano, nombreDeLiga, rolDe, PUEDE, diasPara, slug, validarClave, tareasDe, avance, proximos, estadoVence, semaforo, vencidasEn, sinMovimiento, ordenar, camposDeMovimiento, iniciales, nombreDe, COLUMNAS, COLUMNAS_DEFAULT, columnasDe, normalizarColumnas, COLORES, colorValido, nombreColumnaEn, claseDeColumna, categoriaDe, enProceso, avanceGlobal, segmentosDe, segmentosGlobales, tituloSegmentos, partesEnProceso, filtrarTareas, ordenarLista, reordenar, validarUrl, urlParaLiga, urlCortaDeGuid, resumenLargos, textosLargos, sinDueno, ordenarProyectos, filtrarProyectos, extensionDe, tipoArchivo, aliasDe, aliasParaMencion, trozosConMenciones, mencionesEn, mencionEnCurso, diaDe, sumarDias, diasEntre, lunesDe, mesSumar, lapsoTarea, lapsoProyecto, rangoRoadmap, barraEn, mesesDelRango, celdasDelMes, agendaPorDia, hechasPorSemana, cargaPorPersona, actividadPorPersona, ultimoComentarioPorProyecto, filtrarLigas, hrefSeguro, desdeHaceDias, nuevoParaMi, delegadas, vistosDe, leerVisto, fundirVisto } from '../reglas.js';

const HOY = new Date('2026-09-11T18:00:00Z');
let n = 0;
const ok = (nombre, cond) => { assert.ok(cond, nombre); n++; };

// --- roles y permisos (decision 3)
const roles = [
    { Title: 'Gerente@Example.Invalid', Nombre: 'Gerente', Rol: 'gerencia', Activo: true },
    { Title: 'colab@example.invalid', Rol: 'colaborador', Activo: true },
    { Title: 'baja@example.invalid', Rol: 'gerencia', Activo: false },
    { Title: 'raro@example.invalid', Rol: 'superusuario', Activo: true }
];
ok('rol por correo, sin importar mayusculas', rolDe('gerente@example.invalid', roles) === 'gerencia');
ok('sin renglon = lectura', rolDe('nadie@example.invalid', roles) === 'lectura');
ok('inactivo = lectura', rolDe('baja@example.invalid', roles) === 'lectura');
ok('rol desconocido = lectura', rolDe('raro@example.invalid', roles) === 'lectura');
ok('gerencia puede todo', ['tarea', 'mover', 'ligar', 'borrar', 'proyecto'].every(a => PUEDE[a]('gerencia')));
ok('colaborador crea, mueve y liga', ['tarea', 'mover', 'ligar'].every(a => PUEDE[a]('colaborador')));
ok('colaborador NO borra ni cierra proyectos', !PUEDE.borrar('colaborador') && !PUEDE.proyecto('colaborador'));
ok('lectura solo ve', PUEDE.ver('lectura') && ['tarea', 'mover', 'ligar', 'borrar', 'proyecto'].every(a => !PUEDE[a]('lectura')));

// --- fechas
ok('diasPara: manana = 1', diasPara('2026-09-12T00:00:00Z', HOY) === 1);
ok('diasPara: ayer = -1', diasPara('2026-09-10T23:59:00Z', HOY) === -1);
ok('diasPara: sin fecha = null', diasPara('', HOY) === null && diasPara('no-fecha', HOY) === null);

// --- slug y clave
ok('slug quita acentos y espacios', slug('LAU ASEA-03-001 (Licencia Única)') === 'lau-asea-03-001-licencia-unica');
ok('clave valida', validarClave('lau-asea-03-001').ok === true);
ok('clave con mayusculas se rechaza', validarClave('LAU-ASEA').ok === false);
ok('clave con espacio se rechaza', validarClave('lau asea').ok === false);
ok('clave que empieza en guion se rechaza', validarClave('-lau').ok === false);
ok('clave corta se rechaza', validarClave('ab').ok === false);
ok('clave duplicada se rechaza', validarClave('lau-asea-03-001', [{ Clave: 'LAU-ASEA-03-001' }]).ok === false);
ok('clave vacia se rechaza', validarClave('').motivo === 'la clave es obligatoria');

// --- avance, proximos, sin movimiento, orden
const tareas = [
    { id: 1, ProyectoId: 10, Title: 'A', Columna: 'hecho', Vence: '2026-09-01T00:00:00Z', Prioridad: 'alta' },
    { id: 2, ProyectoId: 10, Title: 'B', Columna: 'en-curso', Vence: '2026-09-09T00:00:00Z', Prioridad: 'normal', Desde: '2026-08-30T00:00:00Z' },
    { id: 3, ProyectoId: 10, Title: 'C', Columna: 'por-hacer', Vence: '2026-09-16T00:00:00Z', Prioridad: 'alta', Orden: 2 },
    { id: 4, ProyectoId: 10, Title: 'D', Columna: 'por-hacer', Prioridad: 'baja', Orden: 1 },
    { id: 5, ProyectoId: 11, Title: 'E', Columna: 'en-curso', Vence: '2026-09-13T00:00:00Z', Desde: '2026-09-10T00:00:00Z' },
    { id: 6, ProyectoId: 10, Title: 'F', Columna: 'en-revision', Vence: '2026-10-30T00:00:00Z' }
];
const del10 = tareasDe({ id: 10 }, tareas);
ok('tareasDe filtra por proyecto', del10.length === 5 && tareasDe(11, tareas).length === 1);
const a = avance(del10);
ok('avance cuenta hechas y pct', a.hechas === 1 && a.total === 5 && a.pct === 20 && a.porColumna['por-hacer'] === 2);
ok('avance vacio = 0%', avance([]).pct === 0);
const px = proximos(tareas, 3, HOY);
ok('proximos: vencida primero, luego por fecha, hechas fuera', px.map(x => x.tarea.id).join(',') === '2,5,3' && px[0].dias === -2);
ok('estadoVence: vencida / pronto / lejos / hecha / sin fecha',
    estadoVence(tareas[1], 7, HOY) === 'danger' && estadoVence(tareas[2], 7, HOY) === 'warn'
    && estadoVence(tareas[5], 7, HOY) === 'idle' && estadoVence(tareas[0], 7, HOY) === null && estadoVence(tareas[3], 7, HOY) === null);
// v0.20.0 (iteracion 2): el filete izquierdo es semaforo de fecha, con ventana propia (3) mas corta que la del chip (7).
ok('semaforo: vencida / pronto (2 dias) / hoy = pronto / 5 dias = en tiempo con ventana 3 / hecha / sin fecha / lejos',
    semaforo(tareas[1], 3, HOY) === 'vencida' && semaforo(tareas[4], 3, HOY) === 'pronto'
    && semaforo({ Columna: 'por-hacer', Vence: '2026-09-11T23:00:00Z' }, 3, HOY) === 'pronto'
    && semaforo(tareas[2], 3, HOY) === '' && semaforo(tareas[2], 7, HOY) === 'pronto'
    && semaforo(tareas[0], 3, HOY) === 'hecha' && semaforo(tareas[3], 3, HOY) === '' && semaforo(tareas[5], 3, HOY) === '' && semaforo(null) === '');
ok('vencidasEn cuenta solo las vencidas abiertas (la hecha con fecha pasada no)', vencidasEn(tareas, HOY) === 1 && vencidasEn([], HOY) === 0 && vencidasEn([tareas[0]], HOY) === 0);
ok('sinMovimiento: 12 dias en curso se senala, 1 dia no, sin Desde no', sinMovimiento(tareas, 10, HOY).map(t => t.id).join(',') === '2');
ok('ordenar: Orden manda, luego prioridad, luego vence', ordenar(del10.filter(t => t.Columna === 'por-hacer')).map(t => t.id).join(',') === '4,3');
ok('ordenar sin Orden: alta antes que normal', ordenar([{ id: 9, Prioridad: 'normal' }, { id: 8, Prioridad: 'alta' }]).map(t => t.id).join(',') === '8,9');

// --- movimiento
const m = camposDeMovimiento('hecho', 'x@example.invalid', HOY);
ok('a hecho sella HechoPor/HechoEl y Desde', m.HechoPor === 'x@example.invalid' && m.HechoEl === HOY.toISOString() && m.Desde === HOY.toISOString() && m.Columna === 'hecho');
const m2 = camposDeMovimiento('en-curso', 'x@example.invalid', HOY);
ok('fuera de hecho limpia el sello', m2.HechoPor === null && m2.HechoEl === null && m2.Columna === 'en-curso');
assert.throws(() => camposDeMovimiento('terminado', 'x'), /columna desconocida/); n++;
ok('las cuatro columnas del default', COLUMNAS.join(',') === 'por-hacer,en-curso,en-revision,hecho');

// --- v0.11.0: cubetas por proyecto
ok('columnasDe: sin Columnas, el default (copia)', JSON.stringify(columnasDe({})) === JSON.stringify(COLUMNAS_DEFAULT) && columnasDe(null) !== COLUMNAS_DEFAULT);
ok('columnasDe: JSON roto o basura = default, sin lanzar', columnasDe({ Columnas: '{no' }).length === 4 && columnasDe({ Columnas: '[]' }).length === 4 && columnasDe({ Columnas: 7 }).length === 4);
const propias = columnasDe({ Columnas: JSON.stringify([{ clave: 'ideas', nombre: 'Ideas' }, { clave: 'hecho', nombre: 'Cerrado' }, { clave: 'haciendo', nombre: 'Haciendo' }]) });
ok('columnasDe: lee las propias y manda hecho al final aunque venga en medio', propias.map(c => c.clave).join(',') === 'ideas,haciendo,hecho' && propias[2].nombre === 'Cerrado');
ok('columnasDe: sin hecho en la lista, se agrega al final', columnasDe({ Columnas: '[{"clave":"a","nombre":"A"}]' }).map(c => c.clave).join(',') === 'a,hecho');
const nz = normalizarColumnas([{ clave: '', nombre: '  Por  revisar ' }, { clave: 'por-hacer', nombre: 'Por hacer' }, { clave: 'hecho', nombre: 'Hecho' }, { clave: '', nombre: 'Por revisar!' }]);
// v0.12.0: colores
ok('colorValido: solo claves de la paleta, en minusculas; lo demas es vacio', colorValido('Azul') === 'azul' && colorValido('ambar') === 'ambar' && colorValido('#ff0000') === '' && colorValido(null) === '' && COLORES.length === 8);
const nc = normalizarColumnas([{ clave: 'por-hacer', nombre: 'Por hacer', color: 'verde' }, { clave: 'en-curso', nombre: 'En curso', color: 'fucsia' }, { clave: 'hecho', nombre: 'Hecho', color: '' }]);
ok('normalizarColumnas: conserva el color valido, descarta el invalido y no escribe la llave cuando esta vacio', nc.ok && nc.columnas[0].color === 'verde' && !('color' in nc.columnas[1]) && !('color' in nc.columnas[2]), JSON.stringify(nc));
ok('columnasDe: el color viaja en el JSON de la lista y segmentosDe lo devuelve en 4.º lugar', columnasDe({ Columnas: JSON.stringify(nc.columnas) })[0].color === 'verde' && segmentosDe(avance([], columnasDe({ Columnas: JSON.stringify(nc.columnas) }))).find(s => s[0].clave === 'por-hacer')[3] === 'verde' && segmentosDe(avance([], COLUMNAS_DEFAULT))[0][3] === '');
ok('normalizarColumnas: clave nueva del nombre (slug), nombre limpio, y la repetida se numera', nz.ok && nz.columnas.map(c => c.clave).join(',') === 'por-revisar,por-hacer,por-revisar-2,hecho' && nz.columnas[0].nombre === 'Por revisar', JSON.stringify(nz));
ok('normalizarColumnas estricto: una NUEVA llamada «Hecho» se rechaza con palabras, no con la clave', !normalizarColumnas([{ nombre: 'A' }, { clave: 'hecho', nombre: 'Cerrado' }, { nombre: 'Hecho' }]).ok && !/clave/.test(normalizarColumnas([{ nombre: 'A' }, { clave: 'hecho', nombre: 'Cerrado' }, { nombre: 'Hecho' }]).motivo));
ok('normalizarColumnas estricto: nombre vacio es error', !normalizarColumnas([{ nombre: '' }, { clave: 'hecho', nombre: 'Hecho' }]).ok);
ok('normalizarColumnas estricto: dos con el mismo nombre es error', !normalizarColumnas([{ nombre: 'A' }, { nombre: 'a' }, { clave: 'hecho', nombre: 'Hecho' }]).ok);
ok('normalizarColumnas: solo hecho es error (falta una abierta); 9 es error (max 8)', !normalizarColumnas([{ clave: 'hecho', nombre: 'Hecho' }]).ok && !normalizarColumnas(Array.from({ length: 9 }, (_, i) => ({ nombre: 'C' + i }))).ok && normalizarColumnas(Array.from({ length: 7 }, (_, i) => ({ nombre: 'C' + i }))).ok);
ok('normalizarColumnas: el nombre se recorta a 30', normalizarColumnas([{ nombre: 'x'.repeat(50) }]).columnas[0].nombre.length === 30);
ok('nombreColumnaEn: nombre por clave, y la clave misma si no existe (huerfana)', nombreColumnaEn('en-curso', COLUMNAS_DEFAULT) === 'En curso' && nombreColumnaEn('zzz', COLUMNAS_DEFAULT) === 'zzz');
ok('claseDeColumna por posicion: p c r r h; una clave ajena cuenta como p', ['por-hacer', 'en-curso', 'en-revision', 'hecho'].map(c => claseDeColumna(c, COLUMNAS_DEFAULT)).join('') === 'pcrh' && claseDeColumna('x', COLUMNAS_DEFAULT) === 'p' && claseDeColumna('c3', [{ clave: 'a' }, { clave: 'b' }, { clave: 'c3' }, { clave: 'hecho' }]) === 'r');
ok('categoriaDe / enProceso: primera = por-hacer, en medio = en-proceso, hecho = hecho', categoriaDe({ Columna: 'por-hacer' }, COLUMNAS_DEFAULT) === 'por-hacer' && categoriaDe({ Columna: 'en-revision' }, COLUMNAS_DEFAULT) === 'en-proceso' && categoriaDe({ Columna: 'hecho' }, COLUMNAS_DEFAULT) === 'hecho' && enProceso({ Columna: 'en-curso' }, COLUMNAS_DEFAULT) && !enProceso({ Columna: 'por-hacer' }, COLUMNAS_DEFAULT));
const aP = avance(del10, propias);
ok('avance con cubetas propias: porColumna por sus claves y porCategoria suma todo (las ajenas como por-hacer)', Object.keys(aP.porColumna).join(',') === 'ideas,haciendo,hecho' && aP.porCategoria['por-hacer'] === 4 && aP.porCategoria.hecho === 1 && aP.porCategoria['en-proceso'] === 0 && aP.hechas === 1, JSON.stringify(aP.porCategoria));
const aG = avanceGlobal(tareas, t => t.ProyectoId === 11 ? propias : COLUMNAS_DEFAULT);
ok('avanceGlobal: categorias con las cubetas de cada proyecto', aG.total === tareas.length && aG.porCategoria.hecho === 1 && aG.porCategoria['en-proceso'] === 2 && aG.porCategoria['por-hacer'] === tareas.length - 3, JSON.stringify(aG.porCategoria));
ok('segmentosDe: de hecho a la primera, con clase; tituloSegmentos en minusculas', segmentosDe(a).map(s => s[2]).join('') === 'hrcp' && tituloSegmentos(segmentosDe(a)) === '1 hecho · 1 en revisión · 1 en curso · 2 por hacer', tituloSegmentos(segmentosDe(a)));
ok('segmentosGlobales: tres categorias', segmentosGlobales(aG).map(s => s[2]).join('') === 'hcp');
ok('partesEnProceso: solo las de en medio con tarjetas', partesEnProceso(a).join(' · ') === '1 en curso · 1 en revisión' && partesEnProceso(aP).length === 0);
ok('sinMovimiento con cubetas propias: en «haciendo» 12 dias se senala; en la primera no', sinMovimiento([{ id: 1, Columna: 'haciendo', Desde: '2026-08-30T00:00:00Z' }, { id: 2, Columna: 'ideas', Desde: '2026-08-30T00:00:00Z' }], 10, HOY, () => propias).map(t => t.id).join(',') === '1');
ok('camposDeMovimiento con cubetas propias: acepta las suyas y rechaza las del default', camposDeMovimiento('haciendo', 'x', HOY, propias).Columna === 'haciendo' && (() => { try { camposDeMovimiento('en-curso', 'x', HOY, propias); return false; } catch (e) { return /desconocida/.test(e.message); } })());
ok('ordenarLista por columna con cubetas propias = su posicion', ordenarLista([{ id: 1, Columna: 'hecho' }, { id: 2, Columna: 'haciendo' }, { id: 3, Columna: 'ideas' }], 'columna', 1, x => x, propias).map(t => t.id).join(',') === '3,2,1');

// --- v0.3.0: filtro, orden de la lista, subir/bajar, enlaces
const t10 = [...del10, { id: 7, ProyectoId: 10, Title: 'Revisión del plano', Columna: 'por-hacer', Asignado: 'Ana@example.invalid', Descripcion: 'con Colega' }];
ok('filtrarTareas vacio deja pasar todo', filtrarTareas(t10, {}, HOY).length === 6);
ok('filtrarTareas por persona ignora mayusculas', filtrarTareas(t10, { quien: 'ana@example.invalid' }, HOY).map(t => t.id).join(',') === '7');
ok('filtrarTareas solo alta', filtrarTareas(t10, { alta: true }, HOY).map(t => t.id).join(',') === '1,3');
ok('filtrarTareas solo vencidas (hechas fuera)', filtrarTareas(t10, { vencidas: true }, HOY).map(t => t.id).join(',') === '2');
ok('filtrarTareas texto sin acentos, en titulo o descripcion', filtrarTareas(t10, { texto: 'revision' }, HOY).map(t => t.id).join(',') === '7' && filtrarTareas(t10, { texto: 'COLEGA' }, HOY).length === 1 && filtrarTareas(t10, { texto: 'zzz' }, HOY).length === 0);
ok('filtrarTareas combina', filtrarTareas(t10, { alta: true, texto: 'c' }, HOY).map(t => t.id).join(',') === '3');
// --- v0.6.0: sin dueño (C7), orden de proyectos (C10), busqueda de proyectos (C3)
const conHuerfana = [...t10, { id: 8, ProyectoId: 10, Title: 'Huérfana abierta', Columna: 'por-hacer', Asignado: '  ' }, { id: 9, ProyectoId: 10, Title: 'Huérfana hecha', Columna: 'hecho' }];
ok('filtrarTareas sinDueno: sin asignado (o solo espacios), hechas fuera como en «solo vencidas»', filtrarTareas(conHuerfana, { sinDueno: true }, HOY).map(t => t.id).join(',') === '2,3,4,6,8');
ok('sinDueno(): abiertas sin asignado, las hechas fuera', sinDueno(conHuerfana).map(t => t.id).join(',') === '2,3,4,6,8');
const proys = [{ id: 1, Title: 'Zeta', Vence: '2026-10-31T18:00:00Z' }, { id: 2, Title: 'Sin fecha' }, { id: 3, Title: 'Alfa', Vence: '2026-10-31T18:00:00.000Z' }, { id: 4, Title: 'Pronto', Vence: '2026-09-18T18:00:00Z' }];
ok('ordenarProyectos: vence antes primero, empate por nombre (mismo dia aunque el ISO difiera), sin fecha al final', ordenarProyectos(proys).map(p => p.id).join(',') === '4,3,1,2');
ok('ordenarProyectos no muta la entrada', proys[0].id === 1);
ok('filtrarProyectos por nombre, clave o descripcion sin acentos', filtrarProyectos([{ Title: 'Licencia Única', Clave: 'lau-asea', Descripcion: 'fianza' }, { Title: 'Otro', Clave: 'otro' }], 'UNICA').length === 1 && filtrarProyectos([{ Title: 'x', Clave: 'lau-asea' }], 'asea').length === 1 && filtrarProyectos([{ Title: 'x', Descripcion: 'la fianza' }], 'fianza').length === 1 && filtrarProyectos([{ Title: 'x' }], '').length === 1);
ok('ordenarLista por vence: sin fecha al final en las dos direcciones', ordenarLista(t10, 'vence', 1).map(t => t.id).join(',') === '1,2,3,6,4,7' && ordenarLista(t10, 'vence', -1).map(t => t.id).join(',') === '6,3,2,1,4,7');
ok('ordenarLista por columna = posicion en el tablero', ordenarLista(t10, 'columna', 1).map(t => t.Columna).join(',') === 'por-hacer,por-hacer,por-hacer,en-curso,en-revision,hecho');
ok('ordenarLista por tarea alfabetico', ordenarLista(t10, 'tarea', 1)[0].id === 1 && ordenarLista(t10, 'tarea', -1)[0].id === 7);
ok('ordenarLista por asignado usa el nombre visible y deja sin asignar al final', ordenarLista(t10, 'asignado', 1, c => 'Zoe').map(t => t.id)[0] === 7 && ordenarLista(t10, 'asignado', 1).slice(1).every(t => !t.Asignado));
ok('reordenar: bajar la primera renumera solo lo que cambia', JSON.stringify(reordenar([{ id: 4, Orden: 1 }, { id: 3, Orden: 2 }], 4, 1)) === '[{"id":3,"Orden":1},{"id":4,"Orden":2}]');
ok('reordenar: subir la ultima de una columna sin Orden numera toda la columna', JSON.stringify(reordenar([{ id: 8, Prioridad: 'alta' }, { id: 9 }], 9, -1)) === '[{"id":9,"Orden":1},{"id":8,"Orden":2}]');
ok('reordenar: fuera de rango o id ajeno = sin cambios', reordenar([{ id: 4, Orden: 1 }], 4, -1).length === 0 && reordenar([{ id: 4, Orden: 1 }], 4, 1).length === 0 && reordenar([{ id: 4 }], 99, 1).length === 0);
ok('validarUrl acepta http(s) y normaliza', validarUrl(' https://Example.invalid/oficio ').url === 'https://example.invalid/oficio');
ok('validarUrl rechaza vacio, javascript: y texto suelto', !validarUrl('').ok && !validarUrl('javascript:alert(1)').ok && !validarUrl('oficio 123').ok && !validarUrl('file:///C:/x').ok);

// --- ligas: el tope de 255 de una columna de texto (v0.4.1, 2026-09-12)
const NOMBRE_LARGO = '2024-10-23_CALYTEK_Estudio_mercado-tema-de-ejemplo-sintetico-xx_borrador.docx';
const DOC_ASPX = `https://minsaenergy.sharepoint.com/sites/Ambiental-CALYTEK/_layouts/15/Doc.aspx?sourcedoc=%7B8F2C4E1A-1111-2222-3333-444455556666%7D&file=${NOMBRE_LARGO}&action=default&mobileredirect=true&DefaultItemOpen=1`;
const SITIO = 'https://minsaenergy.sharepoint.com/sites/Ambiental-CALYTEK';
ok('textosLargos nombra el campo y su largo, ignora numeros y lo que cabe', JSON.stringify(textosLargos({ Url: DOC_ASPX, Title: NOMBRE_LARGO, ProyectoId: 3 })) === '["Url (268)"]' && textosLargos({ Url: 'x'.repeat(255) }).length === 0);
ok('urlParaLiga deja pasar lo que cabe', urlParaLiga('https://example.invalid/a.pdf', { sitioUrl: SITIO, guid: 'g' }) === 'https://example.invalid/a.pdf');
ok('urlParaLiga: con GUID arma la forma corta de Doc.aspx (llaves fuera, mayusculas)', urlParaLiga(DOC_ASPX, { sitioUrl: SITIO + '/', guid: '{8f2c4e1a-1111-2222-3333-444455556666}' }) === SITIO + '/_layouts/15/Doc.aspx?sourcedoc=%7B8F2C4E1A-1111-2222-3333-444455556666%7D&action=default');
ok('urlParaLiga: sin GUID recorta file/mobileredirect/DefaultItemOpen y conserva sourcedoc', (() => { const u = urlParaLiga(DOC_ASPX, {}); return u.length <= 255 && u.includes('sourcedoc=%7B8F2C4E1A') && !u.includes('file=') && u.includes('action=default'); })());
ok('urlCortaDeGuid: null sin sitio o sin GUID; con los dos, 147 caracteres', urlCortaDeGuid(SITIO, null) === null && urlCortaDeGuid('', 'x') === null && urlCortaDeGuid(SITIO, '8f2c4e1a-1111-2222-3333-444455556666').length === 147);
ok('resumenLargos: solo textos, con su largo', resumenLargos({ Title: 'abc', ProyectoId: 3, Url: 'xy' }) === 'Title 3 · Url 2');
ok('urlParaLiga: una URL larga que no es Doc.aspx y sin GUID da null', urlParaLiga('https://example.invalid/' + 'a'.repeat(300), {}) === null && urlParaLiga('', {}) === null);

// --- nombres
ok('iniciales de correo', iniciales('ana.perez@example.invalid') === 'AP' && iniciales('juan.lopez17@example.invalid') === "JL");
ok('nombreDe usa PROY_Roles si trae Nombre', nombreDe('gerente@example.invalid', roles) === 'Gerente');
ok('nombreDe deriva del correo si no', nombreDe('ana.perez@example.invalid', roles) === 'Ana Perez' && nombreDe('', roles) === '—');

// --- archivos y menciones (v0.8.0)
ok('extensionDe: minusculas, ultima extension, ruta con diagonales', extensionDe('informe.PDF') === 'pdf' && extensionDe('04_SGI/x.tar.gz') === 'gz' && extensionDe('a\\b\\c.DOCX') === 'docx' && extensionDe('sin-extension') === '' && extensionDe('.oculto') === '');
ok('tipoArchivo por extension', tipoArchivo('a.pdf').clave === 'pdf' && tipoArchivo('a.docx').clave === 'word' && tipoArchivo('a.xlsm').clave === 'excel' && tipoArchivo('a.pptx').clave === 'ppt' && tipoArchivo('a.JPG').clave === 'imagen' && tipoArchivo('a.msg').clave === 'correo' && tipoArchivo('a.dwg').clave === 'plano' && tipoArchivo('a.zip').clave === 'zip');
ok('tipoArchivo: desconocido = archivo con la extension en la etiqueta; el tipo de liga manda', tipoArchivo('a.xyz').etiqueta === 'Archivo .xyz' && tipoArchivo('a', null).etiqueta === 'Archivo' && tipoArchivo('a.pdf', 'buzon').clave === 'lote' && tipoArchivo('a.pdf', 'enlace').clave === 'enlace');
const gente = [
    { Title: 'francisco.perez@example.invalid', Nombre: 'Francisco Pérez', Rol: 'colaborador', Activo: true },
    { Title: 'ana.lopez@example.invalid', Nombre: 'Ana López', Rol: 'colaborador', Activo: true },
    { Title: 'ana.ruiz@example.invalid', Nombre: 'Ana Ruiz', Rol: 'lectura', Activo: true },
    { Title: 'baja@example.invalid', Nombre: 'Persona Baja', Rol: 'colaborador', Activo: false }
];
ok('aliasDe: primer nombre sin acentos, nombre.apellido y parte local', JSON.stringify(aliasDe('francisco.perez@example.invalid', gente)) === '["francisco","francisco.perez"]' && aliasDe('sin.rol@example.invalid', gente).includes('sin.rol'));
ok('aliasParaMencion: primer nombre; si choca, la parte local', aliasParaMencion('francisco.perez@example.invalid', gente) === 'francisco' && aliasParaMencion('ana.lopez@example.invalid', gente) === 'ana.lopez');
ok('mencionesEn resuelve @nombre sin acentos ni mayusculas y el punto final no cuenta', JSON.stringify(mencionesEn('favor de checar @Francisco.', gente)) === '["francisco.perez@example.invalid"]');
ok('mencionesEn: dos Anas — «@ana» es AMBIGUO y queda como texto; la parte local es inequivoca', mencionesEn('@ana y @ana.ruiz', gente).length === 1 && mencionesEn('@ana.ruiz', gente)[0] === 'ana.ruiz@example.invalid' && mencionesEn('@ana.lopez', gente)[0] === 'ana.lopez@example.invalid');
ok('mencionesEn: acento tecleado («@Fráncisco») resuelve igual; guion o guion bajo pegados al final no cuentan', mencionesEn('@Fráncisco', gente)[0] === 'francisco.perez@example.invalid' && mencionesEn('@francisco- y @francisco_', gente).length === 1);
const conPunto = [{ Title: 'ma.angeles@example.invalid', Nombre: 'Ma. de los Ángeles Ruiz', Rol: 'colaborador', Activo: true }];
ok('aliasDe sin punto final («Ma.» -> «ma»), y lo que el selector escribe se resuelve', aliasDe('ma.angeles@example.invalid', conPunto)[0] === 'ma' && mencionesEn('@' + aliasParaMencion('ma.angeles@example.invalid', conPunto) + ' hola', conPunto).length === 1);
ok('mencionesEn: un correo no es mencion, un @nadie tampoco, una inactiva tampoco', mencionesEn('escribe a x@francisco.com o @nadie o @baja', gente).length === 0);
ok('trozosConMenciones parte el texto y conserva lo escrito', JSON.stringify(trozosConMenciones('ok @Francisco?', gente)) === '[{"texto":"ok "},{"mencion":"francisco.perez@example.invalid","texto":"@Francisco"},{"texto":"?"}]');
ok('mencionEnCurso: alias a medio escribir donde esta el cursor, y la palabra entera hasta su fin', JSON.stringify(mencionEnCurso('hola @fra', 9)) === '{"alias":"fra","desde":5,"hasta":9}' && mencionEnCurso('hola @fra x', 11) === null && mencionEnCurso('@', 1).alias === '' && mencionEnCurso('a@b', 3) === null && mencionEnCurso('hola @francisco resto', 9).hasta === 15 && mencionEnCurso('hola @josé', 10).alias === 'josé');

// --- v0.10.0: roadmap, calendario, reportes
ok('diaDe: dia UTC del ISO; basura = null', diaDe('2026-09-12T23:30:00Z') === '2026-09-12' && diaDe('') === null && diaDe('x') === null);
ok('sumarDias / diasEntre / lunesDe / mesSumar', sumarDias('2026-09-30', 1) === '2026-10-01' && diasEntre('2026-09-01', '2026-09-11') === 10 && lunesDe('2026-09-12') === '2026-09-07' && lunesDe('2026-09-07') === '2026-09-07' && mesSumar('2026-12', 1) === '2027-01' && mesSumar('2026-01', -1) === '2025-12');
const tA = { Columna: 'en-curso', Desde: '2026-09-05T12:00:00Z', Vence: '2026-09-20T18:00:00Z', _creado: '2026-09-01T00:00:00Z' };
const tH = { Columna: 'hecho', Vence: '2026-09-20T18:00:00Z', HechoEl: '2026-09-10T18:00:00Z', _creado: '2026-09-01T00:00:00Z' };
const tS = { Columna: 'por-hacer', _creado: '2026-09-01T00:00:00Z' };
ok('lapsoTarea: Desde -> Vence; hecha termina en HechoEl; sin Desde usa la creacion; sin fin no hay barra', JSON.stringify(lapsoTarea(tA)) === '{"inicio":"2026-09-05","fin":"2026-09-20"}' && lapsoTarea(tH).fin === '2026-09-10' && lapsoTarea(tH).inicio === '2026-09-01' && lapsoTarea(tS).fin === null);
ok('lapsoTarea: un Desde posterior al fin se recorta al fin', lapsoTarea({ Columna: 'en-curso', Desde: '2026-09-25T00:00:00Z', Vence: '2026-09-20T00:00:00Z' }).inicio === '2026-09-20');
const pr = { id: 7, Vence: '2026-10-31T18:00:00Z', _creado: '2026-09-01T00:00:00Z' };
ok('lapsoProyecto: de su creacion a su fin de frente; sin fin, la tarjeta que vence al ultimo', lapsoProyecto(pr, [{ ProyectoId: 7, ...tA }]).fin === '2026-10-31' && lapsoProyecto({ id: 7 }, [{ ProyectoId: 7, ...tA }]).fin === '2026-09-20');
const R = rangoRoadmap([{ inicio: '2026-09-01', fin: '2026-10-31' }], HOY);
ok('rangoRoadmap: lunes antes del primero, domingo despues del ultimo, contiene hoy', R.desde === '2026-08-31' && R.hasta === '2026-11-01' && R.dias === 63);
ok('rangoRoadmap: sin lapsos, el minimo de dias desde hoy', rangoRoadmap([], HOY).dias >= 56 && rangoRoadmap([], HOY).desde <= '2026-09-11');
ok('barraEn: posicion y ancho en %, recortada al rango; fuera = null', Math.round(barraEn({ inicio: '2026-09-10', fin: '2026-09-20' }, R).left * 10) / 10 === 15.9 && Math.round(barraEn({ inicio: '2026-08-01', fin: '2026-09-01' }, R).left) === 0 && barraEn({ inicio: '2027-01-01', fin: '2027-01-05' }, R) === null && barraEn({ inicio: null, fin: null }, R) === null);
ok('mesesDelRango: los meses que cruza el eje suman 100 %', mesesDelRango(R).map(m => m.mes).join(',') === '2026-08,2026-09,2026-10,2026-11' && Math.round(mesesDelRango(R).reduce((n, m) => n + m.width, 0)) === 100);
const celdas = celdasDelMes('2026-09');
ok('celdasDelMes: 42 celdas desde el lunes anterior, 30 en el mes', celdas.length === 42 && celdas[0].dia === '2026-08-31' && !celdas[0].enMes && celdas.filter(c => c.enMes).length === 30);
const ag = agendaPorDia([{ Title: 'b', Vence: '2026-09-20T18:00:00Z', Columna: 'hecho' }, { Title: 'a', Vence: '2026-09-20T18:00:00Z', Columna: 'por-hacer' }, { Title: 'sin', Columna: 'por-hacer' }], [{ Title: 'P', Estado: 'activo', Vence: '2026-09-20T18:00:00Z' }, { Title: 'C', Estado: 'cerrado', Vence: '2026-09-21T18:00:00Z' }]);
ok('agendaPorDia: tarjetas por Vence (abiertas antes que hechas) y fines de frente solo de activos', ag.get('2026-09-20').tareas.map(t => t.Title).join(',') === 'a,b' && ag.get('2026-09-20').fines.length === 1 && !ag.has('2026-09-21') && ag.size === 1);
const hs = hechasPorSemana([{ Columna: 'hecho', HechoEl: '2026-09-10T00:00:00Z' }, { Columna: 'hecho', HechoEl: '2026-09-01T00:00:00Z' }, { Columna: 'hecho' }, { Columna: 'en-curso', HechoEl: '2026-09-10T00:00:00Z' }], 3, HOY);
ok('hechasPorSemana: 3 semanas terminando en la de hoy, solo hechas con HechoEl', hs.map(x => x.desde).join(',') === '2026-08-24,2026-08-31,2026-09-07' && hs.map(x => x.n).join(',') === '0,1,1');
const cp = cargaPorPersona([{ Asignado: 'A@x', Columna: 'por-hacer', Vence: '2026-09-01T00:00:00Z' }, { Asignado: 'a@x', Columna: 'hecho' }, { Asignado: 'b@x', Columna: 'en-curso' }, { Asignado: 'b@x', Columna: 'en-curso' }, { Columna: 'por-hacer' }], 7, HOY);
ok('cargaPorPersona: abiertas/vencidas/hechas por correo (sin mayusculas), mas abiertas primero, sin dueño al final', cp.map(x => `${x.quien}:${x.abiertas}/${x.vencidas}/${x.hechas}`).join(' ') === 'b@x:2/0/0 a@x:1/1/1 :1/0/0');
ok('actividadPorPersona: solo los ultimos N dias', actividadPorPersona([{ Quien: 'a', Cuando: '2026-09-10T00:00:00Z' }, { Quien: 'a', Cuando: '2026-09-11T00:00:00Z' }, { Quien: 'b', Cuando: '2026-07-01T00:00:00Z' }], 30, HOY).map(x => `${x.quien}:${x.n}`).join(',') === 'a:2');
ok('ultimoComentarioPorProyecto: el mas reciente de cada frente, frentes del mas reciente al mas viejo', ultimoComentarioPorProyecto([{ Accion: 'comentar', ProyectoId: 1, Cuando: '2026-09-01T00:00:00Z', Title: 'v' }, { Accion: 'comentar', ProyectoId: 1, Cuando: '2026-09-05T00:00:00Z', Title: 'n' }, { Accion: 'comentar', ProyectoId: 2, Cuando: '2026-09-09T00:00:00Z', Title: 'o' }, { Accion: 'mover-tarea', ProyectoId: 3, Cuando: '2026-09-10T00:00:00Z' }]).map(x => `${x.proyectoId}:${x.ultimo.Title}`).join(',') === '2:o,1:n');
const ligas = [{ Title: 'Plan de contingencia', ProyectoId: 1, Tipo: 'archivado', Ruta: '04_SGI/plan.pdf' }, { Title: 'Oficio', ProyectoId: 2, Tipo: 'enlace', Url: 'https://x/ofício' }];
ok('filtrarLigas: por proyecto, tipo y texto sin acentos sobre nombre/ruta/url', filtrarLigas(ligas, { proyectoId: 1 }).length === 1 && filtrarLigas(ligas, { tipo: 'enlace' })[0].Title === 'Oficio' && filtrarLigas(ligas, { texto: 'oficio' }).length === 1 && filtrarLigas(ligas, { texto: '04_sgi' }).length === 1 && filtrarLigas(ligas, {}).length === 2);

// --- v0.13.1: auditoria de rendimiento y seguridad
ok('hrefSeguro: solo http(s) llega al href; javascript:, data:, rutas y basura dan null', hrefSeguro('https://x.sharepoint.com/a b') === 'https://x.sharepoint.com/a%20b' && hrefSeguro('http://x/') === 'http://x/' && hrefSeguro('javascript:alert(1)') === null && hrefSeguro('data:text/html,x') === null && hrefSeguro('/local') === null && hrefSeguro('') === null && hrefSeguro(null) === null && hrefSeguro(' HTTPS://X/') === 'https://x/');
ok('desdeHaceDias: ISO de hace N dias; 0, negativo o basura = null (sin piso)', desdeHaceDias(90, HOY) === new Date(HOY.getTime() - 90 * 86400000).toISOString() && desdeHaceDias(0) === null && desdeHaceDias(-1) === null && desdeHaceDias('x') === null);

// --- v0.15.0: el mismo canal (nuevo para ti · delegadas · vistos · marca compartida)
const rolesV = [{ Title: 'yo@x', Nombre: 'Yo Mismo', Rol: 'colaborador', Activo: true }, { Title: 'ana@x', Nombre: 'Ana Prueba', Rol: 'gerencia', Activo: true }];
const tareasV = [{ id: 1, Asignado: 'YO@x', Columna: 'por-hacer' }, { id: 2, Asignado: 'ana@x', Columna: 'por-hacer', _creadoPor: 'yo@x' }, { id: 3, Asignado: 'ana@x', Columna: 'hecho', _creadoPor: 'yo@x' }, { id: 4, Asignado: 'ana@x', Columna: 'en-curso' }, { id: 5, Asignado: 'yo@x', Columna: 'hecho' }];
const actV = [
    { id: 10, Accion: 'crear-tarea', Quien: 'ana@x', TareaId: 1, Cuando: '2026-09-12T10:00:00Z', Title: 'creó «A»' },
    { id: 11, Accion: 'editar-tarea', Quien: 'ana@x', TareaId: 1, Cuando: '2026-09-12T11:00:00Z', Title: 'cambió la fecha de «A»' },
    { id: 12, Accion: 'comentar', Quien: 'ana@x', TareaId: 1, Cuando: '2026-09-12T12:00:00Z', Title: 'nota en la mía' },
    { id: 13, Accion: 'comentar', Quien: 'ana@x', Cuando: '2026-09-12T13:00:00Z', Title: '@yo ya viste', ProyectoId: 1 },
    { id: 14, Accion: 'comentar', Quien: 'yo@x', TareaId: 1, Cuando: '2026-09-12T14:00:00Z', Title: 'mi propia nota' },
    { id: 15, Accion: 'crear-tarea', Quien: 'ana@x', TareaId: 4, Cuando: '2026-09-12T15:00:00Z', Title: 'creó «ajena»' },
    { id: 16, Accion: 'editar-tarea', Quien: 'ana@x', TareaId: 1, Cuando: '2026-09-01T11:00:00Z', Title: 'asignó «A» a Yo' },
    { id: 17, Accion: 'editar-tarea', Quien: 'yo@x', TareaId: 4, Cuando: '2026-09-12T16:00:00Z', Title: 'asignó «ajena» a Ana' },
    { id: 18, Accion: 'visto', Quien: 'ana@x', Cuando: '2026-09-12T17:00:00Z', Title: '13', ProyectoId: 1 },
    { id: 19, Accion: 'visto', Quien: 'yo@x', Cuando: '2026-09-12T16:30:00Z', Title: '13', ProyectoId: 1 },
    { id: 20, Accion: 'visto', Quien: 'ana@x', Cuando: '2026-09-12T18:00:00Z', Title: '12', ProyectoId: 1 }
];
const nv = nuevoParaMi(actV, tareasV, rolesV, 'yo@x', '2026-09-12T09:00:00Z');
ok('nuevoParaMi: asignada/cambio/nota/mencion ajenas sobre lo mio, mas nuevo arriba; ni lo propio ni lo ajeno ni lo anterior a la marca', nv.map(x => `${x.tipo}:${x.a.id}`).join(' ') === 'mencion:13 nota:12 cambio:11 asignada:10');
ok('nuevoParaMi: sin marca toma los ultimos 3 dias', nuevoParaMi(actV, tareasV, rolesV, 'yo@x', '', new Date('2026-09-13T00:00:00Z')).length === 4 && nuevoParaMi(actV, tareasV, rolesV, 'yo@x', '', new Date('2026-09-20T00:00:00Z')).length === 0);
ok('nuevoParaMi: «asignó …» ajeno cuenta como asignada', nuevoParaMi(actV, tareasV, rolesV, 'yo@x', '2026-08-01T00:00:00Z').find(x => x.a.id === 16).tipo === 'asignada');
ok('delegadas: abiertas de otro que yo cree (createdBy) o asigne (bitacora); no las hechas ni las mias', delegadas(tareasV, actV, 'yo@x').map(t => t.id).join(',') === '2,4');
ok('vistosDe: una vez por persona, en orden de marca', vistosDe(actV, 13).map(a => a.Quien).join(',') === 'yo@x,ana@x' && vistosDe(actV, 99).length === 0);
ok('leerVisto: tolera vacio, basura y tipos raros', leerVisto('').inicio === '' && leerVisto('{no').inicio === '' && leerVisto('{"inicio":5,"chat":"x"}').inicio === '' && leerVisto('{"inicio":"2026-09-01","chat":{"1":"2026-09-02"}}').chat['1'] === '2026-09-02');
const fv = fundirVisto('{"inicio":"2026-09-01","chat":{"1":"2026-09-05","2":"2026-09-01"}}', { inicio: '2026-09-03', chat: { 1: '2026-09-04', 3: '2026-09-09' } });
ok('fundirVisto: gana la fecha mayor por llave, une los chats', fv.inicio === '2026-09-03' && fv.chat['1'] === '2026-09-05' && fv.chat['2'] === '2026-09-01' && fv.chat['3'] === '2026-09-09');

// v0.18.0: orden de la tabla de documentos por columna.
const lg = [
    { id: 1, Title: 'beta.pdf', Ruta: 'x/beta.pdf', Tipo: 'archivado', TareaId: 2, LigadoPor: 'zoe@example.invalid', _creado: '2026-09-01T10:00:00Z' },
    { id: 2, Title: 'Alfa.docx', Ruta: 'x/Alfa.docx', Tipo: 'archivado', TareaId: null, LigadoPor: 'ana@example.invalid', _creado: '2026-09-03T10:00:00Z' },
    { id: 3, Title: 'gamma', Url: 'https://x', Tipo: 'enlace', TareaId: 1, LigadoPor: null, _creado: '2026-09-02T10:00:00Z' },
    { id: 4, Title: 'lote', Ruta: '99_Pendiente-Archivar/l', Tipo: 'buzon', TareaId: null, LigadoPor: 'ana@example.invalid', _creado: null }
];
const ids = (col, dir, o) => ordenarLigas(lg, col, dir, o).map(l => l.id).join(',');
ok('ordenarLigas: por omision Fecha con la mas nueva arriba y sin fecha al final', ids() === '2,3,1,4' && ids('fecha', 1) === '1,3,2,4');
ok('ordenarLigas por nombre: alfabetico sin importar mayusculas, invertible', ids('nombre', 1) === '2,1,3,4' && ids('nombre', -1) === '4,3,1,2');
ok('ordenarLigas por tipo: por la etiqueta visible (Enlace, Lote en el buzon, PDF, Word)', ids('tipo', 1) === '3,4,1,2');
ok('ordenarLigas por estado: archivado, buzon, enlace; empate = mas nueva arriba', ids('estado', 1) === '2,1,4,3');
ok('ordenarLigas por tarjeta usa el titulo que se ve y deja «el proyecto entero» al final', ids('tarjeta', 1, { tarjeta: id => id === 1 ? 'Zeta' : 'Alfa' }) === '1,3,4,2');
ok('ordenarLigas por quien usa el nombre visible y deja sin quien al final', ids('quien', 1, { nombre: c => c.startsWith('zoe') ? 'Zoe' : 'Ana' }) === '4,2,1,3');
ok('ordenarLigas: columna desconocida no revienta ni pierde ligas', ordenarLigas(lg, 'nada', 1).length === 4 && ordenarLigas(null).length === 0);
ok('direccionInicial: Fecha arranca descendente, el resto ascendente', direccionInicial('fecha') === -1 && direccionInicial('nombre') === 1);

// v0.19.0: nombre humano + fecha del documento
{ const h = nombreHumano('2026-07-01_Latina_Alcance_sistema-organico_SOLPED-1000000001.pdf');
  ok('nombreHumano: convencion completa → fecha, emisor, titulo con « · », mayuscula inicial y el ID entero', h.fecha === '2026-07-01' && h.emisor === 'Latina' && h.titulo === 'Alcance · sistema organico · SOLPED-1000000001' && h.rev === null && h.original.endsWith('.pdf')); }
{ const h = nombreHumano('CALYTEK/04_SGI/2026-08-19_MINSA_Propuesta-tecnica_desemulsificante-RD-EB-26_RAB-000000-PT_con-anexos_rev2.pdf');
  ok('nombreHumano: rev al final sale aparte, la ruta no estorba, kebab → espacios (aunque traiga mayusculas) salvo el ID sin minusculas', h.rev === 'rev2' && h.emisor === 'MINSA' && h.titulo === 'Propuesta tecnica · desemulsificante RD EB 26 · RAB-000000-PT · con anexos'); }
ok('nombreHumano: rev02 / v3 / v3.0 tambien; solo digitos es ID; el detalle en minusculas arranca en mayuscula', nombreHumano('2025-07-01_MINSA_matriz-riesgos_rev02.pdf').rev === 'rev02' && nombreHumano('2025-07-01_MINSA_matriz-riesgos_rev02.pdf').titulo === 'Matriz riesgos' && nombreHumano('2026-01-17_PITEPEC_OC_xileno_4500000000.pdf').titulo === 'OC · xileno · 4500000000' && nombreHumano('a_b_V3.docx').rev === 'v3' && nombreHumano('2025-06_MINSA_Politica_integral-qhse_v3.0.pdf').rev === 'v3.0');
ok('nombreHumano: prefijo de solo año o año-mes cuenta como fecha (se pinta tal cual) y deja el emisor', nombreHumano('2025-06_MINSA_Politica_integral-qhse.pdf').fecha === '2025-06' && nombreHumano('2025-06_MINSA_Politica_integral-qhse.pdf').emisor === 'MINSA' && nombreHumano('2025_MINSA_Politica_x.pdf').fecha === '2025');
{ const h = nombreHumano('2020-08-17 Escritura 1,234 Acta Constitutiva.pdf');
  ok('nombreHumano: fecha con espacio y sin guiones bajos → fecha si, emisor no, titulo entero', h.fecha === '2020-08-17' && h.emisor === null && h.titulo === 'Escritura 1,234 Acta Constitutiva'); }
{ const h = nombreHumano('PODER EJEMPLO NUM. 1,234.pdf');
  ok('nombreHumano: fuera de la convencion nada se inventa: titulo = nombre sin extension, sin fecha ni emisor', h.fecha === null && h.emisor === null && h.rev === null && h.titulo === 'PODER EJEMPLO NUM. 1,234'); }
ok('nombreHumano: vacio y sin extension no revientan; un nombre libre no se retoca (ni la mayuscula)', nombreHumano('').titulo === '' && nombreHumano('gamma').titulo === 'gamma' && nombreHumano(null).original === '');
ok('nombreDeLiga: un enlace se lee tal cual aunque su titulo parezca de la convencion; un archivado se parte', nombreDeLiga({ Tipo: 'enlace', Title: '2026-09-01_Portal de LATINA' }).titulo === '2026-09-01_Portal de LATINA' && nombreDeLiga({ Tipo: 'enlace', Title: '2026-09-01_Portal' }).fecha === null && nombreDeLiga({ Tipo: 'archivado', Title: '2026-09-01_X_Portal.pdf' }).fecha === '2026-09-01');
{ const lg2 = [{ id: 1, Title: '2026-01-05_X_b.pdf', Tipo: 'archivado', _creado: '2026-09-01T00:00:00Z' }, { id: 2, Title: 'sin-fecha.pdf', Tipo: 'archivado', _creado: '2026-09-02T00:00:00Z' }, { id: 3, Title: '2026-03-01_X_a.pdf', Tipo: 'archivado', _creado: '2026-09-03T00:00:00Z' }, { id: 4, Title: '2026-09-01_Portal', Url: 'https://x', Tipo: 'enlace', _creado: '2026-09-04T00:00:00Z' }];
  const o = (c, d) => ordenarLigas(lg2, c, d).map(l => l.id).join(',');
  ok('ordenarLigas por del: la fecha del documento, sin fecha y enlaces al final (aunque el titulo del enlace empiece por fecha), arranca descendente', o('del', -1) === '3,1,4,2' && o('del', 1) === '1,3,4,2' && direccionInicial('del') === -1);
  ok('ordenarLigas por nombre usa lo que se ve — [emisor] titulo — no el nombre del archivo: «2026-09-01_Portal» (enlace) < «sin fecha» < «X A» < «X B»', o('nombre', 1) === '4,2,3,1'); }
ok('filtrarLigas: busca tambien por el titulo humano que se ve («propuesta tecnica» con espacio), ademas de nombre, ruta y url', filtrarLigas([{ Title: '2026-08-19_MINSA_Propuesta-tecnica_x.pdf', Ruta: 'a/b', Tipo: 'archivado' }], { texto: 'propuesta tecnica' }).length === 1 && filtrarLigas([{ Title: '2026-08-19_MINSA_Propuesta-tecnica_x.pdf', Ruta: 'a/b', Tipo: 'archivado' }], { texto: 'propuesta-tecnica' }).length === 1);

console.log(`reglas: ok (${n} comprobaciones)`);
