// node test/reglas.test.js — reglas puras de MINSA Proyectos (decisiones del plan 2026-09-11).
import assert from 'node:assert/strict';
import { rolDe, PUEDE, diasPara, slug, validarClave, tareasDe, avance, proximos, estadoVence, sinMovimiento, ordenar, camposDeMovimiento, iniciales, nombreDe, COLUMNAS, columnaSiguiente, filtrarTareas, ordenarLista, reordenar, validarUrl, urlParaLiga, urlCortaDeGuid, resumenLargos, textosLargos, sinDueno, ordenarProyectos, filtrarProyectos } from '../reglas.js';

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
ok('sinMovimiento: 12 dias en curso se senala, 1 dia no, sin Desde no', sinMovimiento(tareas, 10, HOY).map(t => t.id).join(',') === '2');
ok('ordenar: Orden manda, luego prioridad, luego vence', ordenar(del10.filter(t => t.Columna === 'por-hacer')).map(t => t.id).join(',') === '4,3');
ok('ordenar sin Orden: alta antes que normal', ordenar([{ id: 9, Prioridad: 'normal' }, { id: 8, Prioridad: 'alta' }]).map(t => t.id).join(',') === '8,9');

// --- movimiento
const m = camposDeMovimiento('hecho', 'x@example.invalid', HOY);
ok('a hecho sella HechoPor/HechoEl y Desde', m.HechoPor === 'x@example.invalid' && m.HechoEl === HOY.toISOString() && m.Desde === HOY.toISOString() && m.Columna === 'hecho');
const m2 = camposDeMovimiento('en-curso', 'x@example.invalid', HOY);
ok('fuera de hecho limpia el sello', m2.HechoPor === null && m2.HechoEl === null && m2.Columna === 'en-curso');
assert.throws(() => camposDeMovimiento('terminado', 'x'), /columna desconocida/); n++;
ok('las cuatro columnas fijas', COLUMNAS.join(',') === 'por-hacer,en-curso,en-revision,hecho');

// --- v0.3.0: siguiente columna, filtro, orden de la lista, subir/bajar, enlaces
ok('columnaSiguiente recorre las 4 y termina en null', columnaSiguiente('por-hacer') === 'en-curso' && columnaSiguiente('en-revision') === 'hecho' && columnaSiguiente('hecho') === null && columnaSiguiente('x') === null);
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

console.log(`reglas: ok (${n} comprobaciones)`);
