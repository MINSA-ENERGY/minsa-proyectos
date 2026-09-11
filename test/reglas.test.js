// node test/reglas.test.js — reglas puras de MINSA Proyectos (decisiones del plan 2026-09-11).
import assert from 'node:assert/strict';
import { rolDe, PUEDE, diasPara, slug, validarClave, tareasDe, avance, proximos, estadoVence, sinMovimiento, ordenar, camposDeMovimiento, iniciales, nombreDe, COLUMNAS } from '../reglas.js';

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

// --- nombres
ok('iniciales de correo', iniciales('ana.perez@example.invalid') === 'AP' && iniciales('juan.lopez17@example.invalid') === "JL");
ok('nombreDe usa PROY_Roles si trae Nombre', nombreDe('gerente@example.invalid', roles) === 'Gerente');
ok('nombreDe deriva del correo si no', nombreDe('ana.perez@example.invalid', roles) === 'Ana Perez' && nombreDe('', roles) === '—');

console.log(`reglas: ok (${n} comprobaciones)`);
