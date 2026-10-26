const CLAVE_TOKEN = 'ahorro.token';

export class ErrorApi extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

export const token = {
  leer: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar: (valor) => {
    try {
      if (valor) localStorage.setItem(CLAVE_TOKEN, valor);
      else localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // Sin storage la sesión dura lo que la pestaña
    }
  },
};

/** Arma "/ruta?a=1" ignorando parámetros vacíos. */
export function conParams(ruta, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, valor]) => valor !== null && valor !== undefined && valor !== ''),
  ).toString();
  return query ? `${ruta}?${query}` : ruta;
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const sesion = token.leer();
  if (sesion) headers.Authorization = `Bearer ${sesion}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ErrorApi('Sin conexión con el servidor. Revisá internet y probá de nuevo.', 0);
  }

  if (respuesta.status === 401 && sesion) window.dispatchEvent(new Event('ahorro:sesion-vencida'));
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new ErrorApi(typeof datos.detail === 'string' ? datos.detail : 'El servidor respondió con un error', respuesta.status);
  }
  return respuesta.status === 204 ? null : respuesta.json();
}
