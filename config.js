// Configuracion de MINSA Proyectos (proyectos multiusuario del holding).
//
// TODO ESTO ES PUBLICO POR DISENO (misma regla que calytek-planta-app): en una app de pagina
// unica el client id y el tenant id no son secretos; lo que impide que alguien monte una
// pagina falsa con este client id es la lista de URL de redireccion registradas en Entra.
// NUNCA agregar aqui un client secret: esta app no lleva ninguno.

export const CONFIG = {
    // App registration "MINSA Proyectos" — la crea Carlos (docs/setup-carlos.md, tarea 1) y
    // pega aqui el Application (client) ID. Mientras diga PENDIENTE la app no puede entrar.
    clientId: '6bc9c04a-9908-4195-a35e-40c06518edf3',
    tenantId: 'c28754af-c62e-44db-a72a-3eeab634074b',

    // Sites.Selected: el token NO alcanza nada por si mismo. El acceso lo da la autorizacion
    // de la app sobre cada sitio (docs/otorgar-permiso-sitio.ps1), y encima aplican los
    // permisos de la persona en ese sitio.
    scopes: ['https://graph.microsoft.com/Sites.Selected'],

    graph: 'https://graph.microsoft.com/v1.0',
    sharepointHost: 'minsaenergy.sharepoint.com',

    // Donde viven las listas PROY_*: el sitio transversal del holding. Ruta VERIFICADA contra
    // el tenant el 2026-08-16 (ahi vivio CAT_Evidencia_MINSA de la app de captura). Nunca
    // deducirla del nombre de la biblioteca.
    sitio: '/sites/Administracion',

    // Prefijo comun de las listas (esquema.json). Cambiarlo obliga a re-provisionar.
    listas: {
        proyectos: 'PROY_Proyectos',
        tareas: 'PROY_Tareas',
        ligas: 'PROY_Ligas',
        roles: 'PROY_Roles',
        actividad: 'PROY_Actividad'
    },

    // Las cuatro columnas del tablero, en orden. Fijas a proposito (default del implementador):
    // un tablero con columnas por proyecto es otro producto.
    columnas: [
        { clave: 'por-hacer', nombre: 'Por hacer' },
        { clave: 'en-curso', nombre: 'En curso' },
        { clave: 'en-revision', nombre: 'En revisión' },
        { clave: 'hecho', nombre: 'Hecho' }
    ],

    // Equipos = unidades del holding (etiqueta y filtro, nunca permiso). `unidad` es la clave de
    // la biblioteca donde Docs busca y sube; sin `unidad`, Docs solo muestra ligas ya guardadas.
    // Las rutas de sitio estan VERIFICADAS contra el tenant (minsa-captura-app/app/config.js,
    // 2026-08-16); Finanzas es 'Administracion-Documentos' en la URL aunque OneDrive la
    // muestre como 'Administracion-Finanzas' — no es un error de dedo.
    // PILOTO (2026-09-11): Sites.Selected write solo sobre Administracion y Ambiental-CALYTEK.
    // Las demas bibliotecas quedan declaradas pero contestan 403 hasta que se autoricen
    // (docs/otorgar-permiso-sitio.ps1); la app lo dice en pantalla nombrando el sitio.
    equipos: [
        { clave: 'CALYTEK', nombre: 'CALYTEK', unidad: 'CALYTEK', color: '#3fae4b' },
        { clave: 'PITEPEC', nombre: 'PITEPEC', unidad: 'PITEPEC', color: '#2ea6ec' },
        { clave: 'RABASA', nombre: 'RABASA', unidad: 'RABASA', color: '#f5ad2e' },
        { clave: 'Ventas Quimicos', nombre: 'Ventas Químicos', unidad: null, color: '#8fb2f6' },
        { clave: 'Ventas Ambiental', nombre: 'Ventas Ambiental', unidad: null, color: '#a3e0aa' },
        { clave: 'Administracion', nombre: 'Administración', unidad: 'LEGAL', color: '#94a2b8' }
    ],
    bibliotecas: {
        // `destinoLotes`: a donde PROPONE el _lote.json que vaya lo subido si el proyecto no declara
        // su Carpeta. Zonas que existen hoy en cada biblioteca (archivar-*/taxonomia); la skill valida.
        CALYTEK: { nombre: 'Ambiental-CALYTEK', sitio: '/sites/Ambiental-CALYTEK', piloto: true, destinoLotes: '08_Otros-Varios' },
        PITEPEC: { nombre: 'Quimicos-PITEPEC', sitio: '/sites/Quimicos-PITEPEC', piloto: false, destinoLotes: '01_Servicios' },
        RABASA: { nombre: 'Quimicos-RABASA', sitio: '/sites/Quimicos-RABASA', piloto: false, destinoLotes: '10_Interno' },
        LEGAL: { nombre: 'Administracion-Legal', sitio: '/sites/Administracion-Legal', piloto: false, destinoLotes: '05_Contratos' },
        FINANZAS: { nombre: 'Administracion-Finanzas', sitio: '/sites/Administracion-Documentos', piloto: false, destinoLotes: '06_Soporte-Fiscal' }
    },

    // Donde deja lo que se sube desde Docs: el buzon de la biblioteca de la unidad, en una
    // carpeta por lote con `_lote.json` al final (contrato 1, lote.js). La skill de archivar de
    // esa unidad lo acomoda despues. Nada se escribe fuera del buzon.
    buzon: '99_Pendiente-Archivar',
    etiquetaLote: 'Proyecto',

    // Una tarjeta en «en-curso» sin movimiento estos dias se senala en Inicio. Solo informa.
    sinMovimientoDias: 10,
    // Ventana de «vence pronto» en Inicio y en Mis tareas.
    vencePronto: 7,
    // Cada cuanto se releen las listas mientras la app esta a la vista (ms). 0 = solo con Actualizar.
    refrescoMs: 120000
};
