// Cliente de Microsoft Graph para listas y documentos — copia literal de calytek-planta-app/app/graph.js
// (2026-09-11) mas tres metodos para Docs: `buscarEnDrive`, `existeRuta` y `sitioOpcional`.
//
// Todo pasa por conReintento: en un celular, un fallo de red o un 429 es el caso normal. Lo que
// NO se reintenta es un 403 o un 404: esos no mejoran repitiendo.

const REINTENTOS = 4;
const dormir = ms => new Promise(res => setTimeout(res, ms));

function valeReintentar(estado) {
    return estado === 429 || estado === 503 || estado === 504 || estado === 0;
}

export async function conReintento(hacer, alAvisar) {
    let espera = 800;
    for (let intento = 1; intento <= REINTENTOS; intento++) {
        let r;
        try {
            r = await hacer();
        } catch (e) {
            if (intento === REINTENTOS) throw e;
            if (alAvisar) alAvisar(`sin conexión, reintentando (${intento}/${REINTENTOS - 1})`);
            await dormir(espera); espera *= 2;
            continue;
        }
        if (r.ok) return r;
        if (!valeReintentar(r.status) || intento === REINTENTOS) return r;
        const dice = Number(r.headers.get('Retry-After'));
        const cuanto = Number.isFinite(dice) && dice > 0 ? dice * 1000 : espera;
        if (alAvisar) alAvisar(`el servidor pidió esperar, reintentando (${intento}/${REINTENTOS - 1})`);
        await dormir(cuanto);
        espera *= 2;
    }
    throw new Error('se agotaron los reintentos');
}

/** Mensaje util a partir de una respuesta fallida. No nombra la operacion: la pone quien llama. */
export async function motivo(r) {
    let detalle = '';
    try {
        const j = await r.json();
        detalle = j?.error?.message || j?.error?.code || '';
    } catch (_) { /* no era JSON */ }
    if (r.status === 403) return `sin permiso (403). ${detalle}`;
    if (r.status === 404) return `no existe (404). ${detalle}`;
    if (r.status === 401) return 'la sesión caducó (401). Vuelve a entrar.';
    return `HTTP ${r.status}. ${detalle}`;
}

/** Codifica una ruta para Graph SIN destruir las diagonales. */
export function rutaUrl(ruta) {
    return String(ruta).split('/').filter(s => s !== '').map(encodeURIComponent).join('/');
}

/**
 * Convierte un item de Graph (con .fields) en un objeto plano con `id` numerico.
 * Las columnas se leen por su nombre INTERNO (esquema.json).
 */
export function aplanar(item) {
    const f = item && item.fields ? item.fields : (item || {});
    const etag = item && (item.eTag || item['@odata.etag']);
    // `_etag` (v0.3.0, T1): la version del renglon al leerlo; actualizarRenglon lo manda como If-Match.
    // `_creado*` / `_modificado` (v0.4.0, U12/T3): lo que SharePoint sabe y la app no pedia.
    const quien = u => (u && u.user && (u.user.email || u.user.displayName)) || undefined;
    return {
        ...f, id: Number(item.id ?? f.id), ...(etag ? { _etag: String(etag) } : {}),
        _creado: item && item.createdDateTime || undefined, _creadoPor: quien(item && item.createdBy),
        _modificado: item && item.lastModifiedDateTime || undefined
    };
}

/** Error con `status` (412 = alguien cambio el renglon; 0 = sin red) para que quien llama distinga. */
function errorHttp(mensaje, status) { const e = new Error(mensaje); e.status = status; return e; }
export const esConflicto = e => !!e && e.status === 412;
export const esSinRed = e => !!e && e.sinRed === true;

export function crearCliente(graph, token) {
    const cab = { Authorization: 'Bearer ' + token };
    const json = { 'Content-Type': 'application/json' };
    const listasPorNombre = new Map();
    const urlPorNombre = new Map();   // webUrl de cada lista (F13: «Ver en SharePoint»)
    // Si Graph rechazara la cabecera If-Match con 400 (no se pudo medir contra el tenant desde el
    // harness), se reintenta sin ella y se deja de mandar en esta sesion: la app sigue escribiendo.
    let ifMatchSirve = true;

    async function pedir(url, opciones = {}, avisar) {
        // T2 (v0.3.0): sin red, una escritura falla YA con un mensaje claro, sin 4 reintentos a ciegas.
        if (typeof navigator !== 'undefined' && navigator.onLine === false && (opciones.method || 'GET') !== 'GET') {
            const e = errorHttp('sin conexión: puedes ver, no guardar. Vuelve a intentarlo cuando regrese la red.', 0); e.sinRed = true; throw e;
        }
        return conReintento(() => fetch(url, {
            ...opciones,
            headers: { ...cab, ...(opciones.headers || {}) }
        }), avisar);
    }

    return {
        async sitio(host, ruta) {
            const r = await pedir(`${graph}/sites/${host}:${ruta}`);
            if (!r.ok) throw new Error(`no se pudo abrir el sitio ${ruta}: ` + await motivo(r));
            return (await r.json()).id;
        },

        /** Lista los nombres de listas del sitio (para provisionar y para resolver ids). */
        async listas(siteId) {
            const r = await pedir(`${graph}/sites/${siteId}/lists?$select=id,name,displayName,webUrl&$top=200`);
            if (!r.ok) throw new Error('no se pudieron ver las listas del sitio: ' + await motivo(r));
            const v = (await r.json()).value;
            for (const l of v) { listasPorNombre.set(l.displayName, l.id); listasPorNombre.set(l.name, l.id); if (l.webUrl) { urlPorNombre.set(l.displayName, l.webUrl); urlPorNombre.set(l.name, l.webUrl); } }
            return v;
        },

        /** La URL web de una lista ya vista por `listas()` (o null): es lo que abre Microsoft Lists, con su vista Tablero. */
        urlDeLista(nombre) { return urlPorNombre.get(nombre) || null; },

        async idDeLista(siteId, nombre) {
            if (!listasPorNombre.has(nombre)) await this.listas(siteId);
            const id = listasPorNombre.get(nombre);
            if (!id) throw new Error(`no existe la lista ${nombre} en el sitio: hay que provisionarla (herramientas-dev/provisionar.html)`);
            return id;
        },

        /** Columnas reales de una lista (nombre interno + tipo), para cotejar contra esquema.json. */
        async columnas(siteId, listaId) {
            const r = await pedir(`${graph}/sites/${siteId}/lists/${listaId}/columns?$top=200`);
            if (!r.ok) throw new Error('no se pudieron leer las columnas: ' + await motivo(r));
            return (await r.json()).value;
        },

        async crearLista(siteId, cuerpo) {
            const r = await pedir(`${graph}/sites/${siteId}/lists`, {
                method: 'POST', headers: json, body: JSON.stringify(cuerpo)
            });
            if (!r.ok) throw new Error(`no se pudo crear la lista ${cuerpo.displayName}: ` + await motivo(r));
            return await r.json();
        },

        async agregarColumna(siteId, listaId, columna) {
            const r = await pedir(`${graph}/sites/${siteId}/lists/${listaId}/columns`, {
                method: 'POST', headers: json, body: JSON.stringify(columna)
            });
            if (!r.ok) throw new Error(`no se pudo crear la columna ${columna.name}: ` + await motivo(r));
            return await r.json();
        },

        /**
         * Todos los renglones de una lista, aplanados. $top=500 y sigue @odata.nextLink: a
         * 8 gondolas/dia son ~2,000 embarques/ano, asi que hay que paginar de verdad.
         * @param {string} [filtro]  OData, p. ej. "fields/Estado eq 'firmada'" (necesita columna indexada o la
         *                            cabecera Prefer: HonorNonIndexedQueriesWarningMayFailRandomly)
         */
        async renglones(siteId, nombreLista, filtro, avisar) {
            const listaId = await this.idDeLista(siteId, nombreLista);
            let url = `${graph}/sites/${siteId}/lists/${listaId}/items?expand=fields&$top=500`
                + (filtro ? `&$filter=${encodeURIComponent(filtro)}` : '');
            const todos = [];
            while (url) {
                const r = await pedir(url, { headers: { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' } }, avisar);
                if (!r.ok) throw new Error(`no se pudieron leer los renglones de ${nombreLista}: ` + await motivo(r));
                const j = await r.json();
                for (const it of j.value) todos.push(aplanar(it));
                url = j['@odata.nextLink'] || null;
            }
            return todos;
        },

        async crearRenglon(siteId, nombreLista, campos, avisar) {
            const listaId = await this.idDeLista(siteId, nombreLista);
            const r = await pedir(`${graph}/sites/${siteId}/lists/${listaId}/items`, {
                method: 'POST', headers: json, body: JSON.stringify({ fields: campos })
            }, avisar);
            if (!r.ok) throw new Error(`no se pudo escribir en ${nombreLista}: ` + await motivo(r));
            return aplanar(await r.json());
        },

        /**
         * PATCH de campos. Con `etag` (el `_etag` leido, T1) va como If-Match: si alguien cambio el
         * renglon en medio, Graph contesta 412 y aqui se lanza un error con status 412 — quien llama
         * relee y avisa, en vez de pisar el cambio ajeno sin enterarse. Sin etag es incondicional.
         */
        async actualizarRenglon(siteId, nombreLista, id, campos, avisar, etag) {
            const listaId = await this.idDeLista(siteId, nombreLista);
            const url = `${graph}/sites/${siteId}/lists/${listaId}/items/${id}/fields`;
            const hacer = conEtag => pedir(url, { method: 'PATCH', headers: conEtag ? { ...json, 'If-Match': etag } : json, body: JSON.stringify(campos) }, avisar);
            let r = await hacer(ifMatchSirve && !!etag);
            if (r.status === 400 && ifMatchSirve && etag) {
                // ¿El 400 fue por la cabecera? Se repite sin ella: si tambien falla, era el cuerpo.
                ifMatchSirve = false; r = await hacer(false);
                if (r.status === 400) ifMatchSirve = true; else console.warn('Graph rechazó If-Match en esta lista; se deja de mandar en esta sesión.');
            }
            if (r.status === 412) throw errorHttp(`alguien cambió el renglón ${id} de ${nombreLista} hace un momento (412)`, 412);
            if (!r.ok) throw errorHttp(`no se pudo actualizar el renglón ${id} de ${nombreLista}: ` + await motivo(r), r.status);
            return await r.json();
        },

        /** Borra un renglon. Solo para lo que NUNCA tuvo folio ni firma (app.js decide); lo demas se ANULA, no se borra. */
        async borrarRenglon(siteId, nombreLista, id, avisar) {
            const listaId = await this.idDeLista(siteId, nombreLista);
            const r = await pedir(`${graph}/sites/${siteId}/lists/${listaId}/items/${id}`, { method: 'DELETE' }, avisar);
            if (!r.ok && r.status !== 404) throw new Error(`no se pudo borrar el renglón ${id} de ${nombreLista}: ` + await motivo(r));
        },

        /** Cambia las opciones (u otro atributo) de una columna existente: PATCH sobre la definicion. */
        async actualizarColumna(siteId, listaId, columnaId, cuerpo, avisar) {
            const r = await pedir(`${graph}/sites/${siteId}/lists/${listaId}/columns/${columnaId}`, {
                method: 'PATCH', headers: json, body: JSON.stringify(cuerpo)
            }, avisar);
            if (!r.ok) throw new Error(`no se pudo actualizar la columna ${columnaId}: ` + await motivo(r));
            return await r.json();
        },

        /** Borra una carpeta o archivo de la biblioteca por id. Solo se usa para deshacer un lote que quedo a medias. */
        async borrarItemDrive(siteId, itemId, avisar) {
            const r = await pedir(`${graph}/sites/${siteId}/drive/items/${itemId}`, { method: 'DELETE' }, avisar);
            if (!r.ok && r.status !== 404) throw new Error(`no se pudo borrar el elemento ${itemId}: ` + await motivo(r));
        },

        /** Carpeta en la biblioteca (para la evidencia). conflictBehavior rename: dos lotes iguales no se mezclan. */
        async crearCarpeta(siteId, rutaPadre, nombre, avisar) {
            const r = await pedir(`${graph}/sites/${siteId}/drive/root:/${rutaUrl(rutaPadre)}:/children`, {
                method: 'POST', headers: json,
                body: JSON.stringify({ name: nombre, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' })
            }, avisar);
            if (!r.ok) throw new Error(`no se pudo crear la carpeta ${nombre}: ` + await motivo(r));
            const j = await r.json();
            return { nombreReal: j.name, id: j.id };
        },

        async subirPieza(siteId, rutaCarpeta, nombreArchivo, bytes, tipoMime, avisar) {
            const url = `${graph}/sites/${siteId}/drive/root:/${rutaUrl(rutaCarpeta)}/${rutaUrl(nombreArchivo)}:/content`;
            const r = await pedir(url, { method: 'PUT', headers: { 'Content-Type': tipoMime }, body: bytes }, avisar);
            if (!r.ok) throw new Error(`no se pudo subir ${nombreArchivo}: ` + await motivo(r));
            return await r.json();
        },

        // ------------------------------------------------------------ Docs (MINSA Proyectos)

        /**
         * Como `sitio`, pero un 403/404 NO revienta: devuelve `{ id: null, motivo }` para que Docs
         * diga «sin permiso sobre Quimicos-PITEPEC» en vez de tirar la pantalla. En el piloto solo
         * dos sitios estan autorizados (config.js `bibliotecas[].piloto`).
         */
        async sitioOpcional(host, ruta) {
            const r = await pedir(`${graph}/sites/${host}:${ruta}`);
            if (r.ok) return { id: (await r.json()).id, motivo: null };
            return { id: null, motivo: await motivo(r) };
        },

        /**
         * Busca archivos por nombre en la biblioteca del sitio (solo lectura). Excluye el buzon y
         * las carpetas: una liga apunta a un documento ya acomodado por la skill de archivar.
         * Devuelve [{ id, nombre, ruta, url, modificado, tamano }] con `ruta` relativa a la raiz.
         */
        async buscarEnDrive(siteId, texto, buzon, avisar) {
            const q = encodeURIComponent(String(texto || '').trim());
            if (!q) return [];
            const r = await pedir(`${graph}/sites/${siteId}/drive/root/search(q='${q}')?$select=id,name,file,folder,webUrl,parentReference,lastModifiedDateTime,size&$top=50`, {}, avisar);
            if (!r.ok) throw new Error('no se pudo buscar en la biblioteca: ' + await motivo(r));
            const v = (await r.json()).value || [];
            const salida = [];
            for (const it of v) {
                if (!it.file) continue;
                // parentReference.path viene como '/drive/root:/01_Empresa/Sub'; lo de despues de 'root:' es la ruta.
                const p = String((it.parentReference && it.parentReference.path) || '');
                const i = p.indexOf('root:');
                const carpeta = i >= 0 ? decodeURIComponent(p.slice(i + 5)).replace(/^\//, '') : '';
                if (buzon && (carpeta === buzon || carpeta.startsWith(buzon + '/'))) continue;
                salida.push({
                    id: it.id, nombre: it.name, ruta: carpeta ? `${carpeta}/${it.name}` : it.name,
                    url: it.webUrl, modificado: it.lastModifiedDateTime, tamano: it.size
                });
            }
            return salida;
        },

        /**
         * ¿Sigue existiendo esta ruta en la biblioteca? Es como Docs deriva «en el buzon»: la
         * carpeta del lote desaparece cuando la skill de archivar lo acomoda (404), y nadie tiene
         * que actualizar la liga a mano. Devuelve true | false; otro error revienta.
         */
        async existeRuta(siteId, ruta, avisar) {
            const r = await pedir(`${graph}/sites/${siteId}/drive/root:/${rutaUrl(ruta)}?$select=id`, {}, avisar);
            if (r.ok) return true;
            if (r.status === 404) return false;
            throw new Error(`no se pudo consultar ${ruta}: ` + await motivo(r));
        }
    };
}

/**
 * Traduce una columna de esquema.json al cuerpo que Graph espera en POST /columns.
 * Tipos: text | note | number | dateTime | boolean | choice.
 */
export function columnaGraph(c) {
    const base = { name: c.name || c.nombre, displayName: c.titulo || c.displayName, required: !!c.obligatorio, indexed: !!c.indexada };
    switch (c.tipo) {
        case 'text': return { ...base, text: { allowMultipleLines: false, maxLength: 255 } };
        case 'note': return { ...base, text: { allowMultipleLines: true, textType: 'plain' } };
        case 'number': return { ...base, number: { decimalPlaces: 'automatic' } };
        case 'dateTime': return { ...base, dateTime: { format: 'dateTime' } };
        case 'boolean': return { ...base, boolean: {} };
        case 'choice': return { ...base, choice: { allowTextEntry: false, choices: c.opciones || [], displayAs: 'dropDownMenu' } };
        default: throw new Error(`tipo de columna desconocido: ${c.tipo}`);
    }
}
