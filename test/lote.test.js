// node test/lote.test.js — el manifiesto que la app deja en el buzon (contrato 1, firma minsa-proyectos).
import assert from 'node:assert/strict';
import { construirManifiesto, validarManifiesto, bytesDelManifiesto, nombreCarpetaLote, APP, CONTRATO, NOMBRE_MANIFIESTO } from '../lote.js';

let n = 0;
const ok = (nombre, cond) => { assert.ok(cond, nombre); n++; };

const base = { appVersion: '0.1.0', unidad: 'CALYTEK', etiqueta: 'Proyecto', destino: '03_Predios/Arrocera/Federal (ASEA) - LAU', fecha: '2026-09-11', concepto: 'Filosofía de operación', archivos: ['a.pdf', 'b.pdf'], proyecto: 'lau-asea-03-001', tarea: 17 };
const m = construirManifiesto(base);
ok('firma y contrato', m.app === APP && m.app === 'minsa-proyectos' && m.contrato === CONTRATO && CONTRATO === 1);
ok('tipo documento y paginas = archivos', m.tipo === 'documento' && m.paginas === 2);
ok('proyecto y tarea viajan', m.proyecto === 'lau-asea-03-001' && m.tarea === 17);
ok('sin tarea = null', construirManifiesto({ ...base, tarea: undefined }).tarea === null);
ok('manifiesto valido', validarManifiesto(m).ok === true);
ok('otra app se rechaza', validarManifiesto({ ...m, app: 'minsa-captura' }).ok === false);
ok('sin proyecto se rechaza', validarManifiesto({ ...m, proyecto: '' }).motivo === 'sin proyecto');
ok('sin archivos se rechaza', validarManifiesto({ ...m, archivos: [] }).ok === false);
ok('destino al buzon se rechaza', validarManifiesto({ ...m, destino: '99_Pendiente-Archivar/x' }).motivo === 'el destino apunta al propio buzon');
ok('destino con .. se rechaza', validarManifiesto({ ...m, destino: '../fuera' }).ok === false);
ok('fecha mal se rechaza', validarManifiesto({ ...m, fecha: '11/09/2026' }).ok === false);
ok('no se lista a si mismo', validarManifiesto({ ...m, archivos: ['a.pdf', NOMBRE_MANIFIESTO] }).ok === false);
const bytes = bytesDelManifiesto(m);
ok('bytes UTF-8 con salto final', bytes[bytes.length - 1] === 10 && JSON.parse(new TextDecoder().decode(bytes)).concepto === 'Filosofía de operación');
ok('nombre de carpeta', nombreCarpetaLote('2026-09-11', 'Proyecto', 'lau-asea-03-001', 'filosofia-de-operacion') === '2026-09-11_Proyecto_lau-asea-03-001_filosofia-de-operacion');
console.log(`lote: ok (${n} comprobaciones)`);
