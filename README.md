# Ahorro

> **Versión** 2.4.1 · **Última actualización** 2026-10-26

Libreta compartida de la casa para dos personas: gastos del día a día, ingresos, pagos fijos y únicos programados, calendario de vencimientos y eventos, y un objetivo de ahorro mensual.

| Versión | Fecha | Cambios |
|---|---|---|
| 2.4.1 | 2026-10-26 | Inicio en escritorio en dos columnas parejas (el mes y la evolución; la torta con su lista al lado y los pagos y cobros debajo). Las tarjetas que llenan la columna miden lo que su contenido en lugar de estirarse. Fijos: columnas de categoría y estado sin repetir el detalle. Los montos de las cifras no se parten. Se vuelve atrás con 2.4.0 (`6d808c7`). |
| 2.4.0 | 2026-10-26 | Solo interfaz: un único formulario para movimientos y fijos («Ahora», «Mensual», «En cuotas», «Más adelante»), categoría en un desplegable con ícono y color, almanaque para fechas y días del mes. En escritorio la página no se desplaza: Inicio en tres columnas (dos hasta 1400px) con Pagos y cobros a la vista, la libreta y las listas largas con su propia barra; las filas tipo tabla se adaptan al ancho de su tarjeta. Tema y cuenta al pie de la barra lateral. Barras de desplazamiento en color. Calendario .ics y calendarios externos desactivados por flag. Se vuelve atrás con 2.3.0 (`e6310a6`). |
| 2.3.0 | 2026-10-26 | Compras en cuotas (carga rápida «En cuotas» y Fijos; cada vencimiento muestra «3/12» y el plan termina solo), ritmo del presupuesto en la torta («A este ritmo llegan a…»), tarjeta de cierre del mes anterior en la primera quincena, calendarios (el de la app como `.ics` para el teléfono y eventos de calendarios iCal externos), copia de seguridad (base completa y CSV) e ícono `savings` de Material Symbols. Columna nueva `programados.cuotas` (en una base existente: `ALTER TABLE programados ADD COLUMN cuotas INTEGER`) y tabla `calendarios_externos` (se crea sola). Dependencias nuevas: `icalendar`, `recurring-ical-events`, `tzdata`. Se vuelve atrás con 2.2.0 (`89eb2a2`). |
| 2.2.0 | 2026-10-26 | Solo interfaz (un commit, se revierte entero): íconos (Lucide) en lugar de emojis, marca nueva, tema claro/oscuro/sistema, alta y edición de categorías dentro de Movimientos, filas con más columnas en escritorio, la torta reemplaza a «En qué se fue» (con presupuestos y «Ver todas»), próximos 7 días en el calendario y escala de espacios única. Las categorías guardan el nombre del ícono (`shopping-cart`) en lugar de un emoji. Se vuelve atrás con `783d2a0`. |
| 2.1.1 | 2026-10-26 | Endpoint `/api/proximos` (pagos pendientes y eventos de los próximos días). |
| 2.1.0 | 2026-10-25 | Gráfico de torta (reparto del gasto por categoría, filtra Movimientos en escritorio) y de líneas (ingresos, gastos y ahorro de 6 o 12 meses, endpoint `/api/evolucion`). Escritorio a dos columnas en todas las secciones; el calendario muestra los nombres en cada día. Nuevos colores por defecto de categorías. Se vuelve atrás con 2.0.0 (`2e30a41`). |
| 2.0.0 | 2026-10-25 | Reescritura completa: hogar compartido, carga rápida, pagos programados (mensuales y únicos), resumen del mes con objetivo de ahorro, calendario, sueldos. Un solo servicio (FastAPI sirve el frontend). Base nueva, sin migrar datos. Se vuelve atrás con 1.1.0 (`c7d5f08`), que es otra base y otro esquema de servicios. |
| 1.1.0 | 2026-10-25 | Solo SQLite (sin Alembic ni Postgres). Mascota desactivada por flag. |
| 1.0.0 | — | Versión con Postgres + Alembic. |

## Qué hace

- **Inicio**: cuánto les queda en el mes si se paga todo lo programado, contra el objetivo de ahorro. La barra muestra lo gastado, lo comprometido sin pagar (rayado) y la marca del objetivo. Debajo, los pagos y cobros pendientes (se marcan con un toque), la torta con el reparto del gasto contra el presupuesto de cada categoría (y el aviso «A este ritmo llegan a…» cuando una va a pasarse) y las líneas de ingresos, gastos y ahorro de los últimos 6 o 12 meses. En la primera quincena, una tarjeta con el cierre del mes anterior.
- **Cargar** (botón +): un solo formulario para todo. «Ahora» registra un movimiento; «Mensual», «En cuotas» y «Más adelante» lo programan (un pago en cuotas es un mensual que termina solo). La categoría se elige de un desplegable con su ícono y color, y la fecha o el día del mes de un almanaque. Recuerda la última categoría usada; admite pesos o dólares (se pasan a pesos con el blue del día o con la cotización que se cargue).
- **Movimientos**: la libreta del mes, por día; tocar un renglón lo edita o lo borra. La pestaña Categorías da de alta, edita (ícono, color, presupuesto), archiva o borra categorías. En escritorio, al costado, los números del mes y la torta para filtrar por categoría.
- **Fijos**: alquiler, expensas, servicios, sueldos (todos los meses, un día dado), compras en cuotas y pagos únicos con fecha, con el mismo formulario que la carga. Al registrarlos se carga el monto real.
- **Calendario**: vencimientos del mes (a pagar, vencidos, a cobrar, registrados), eventos propios (cumpleaños y aniversarios anuales, salidas, recordatorios) y los de otros calendarios conectados. En escritorio cada día muestra sus nombres; debajo del día elegido, lo que viene en los próximos 7 días.
- **Ajustes**: objetivo de ahorro mensual (en pesos o dólares), cotización del blue y copia de seguridad. El tema (claro, oscuro o el del sistema) y la cuenta están al pie de la barra lateral en escritorio y en Ajustes en el celular.

En escritorio ninguna sección desplaza la página: cada columna (y la libreta, los pagos del mes y las listas largas) se desplaza por su cuenta.

### Calendarios (desactivados)

Están apagados con `CALENDARIOS_CONECTADOS_HABILITADOS` en `frontend/src/config/features.js`; el backend sigue respondiendo.

- **De la app al teléfono**: `GET /api/calendario.ics?clave=…` publica los vencimientos (del mes anterior a 12 meses adelante, con aviso el día previo a las 9) y los eventos. No pide sesión porque los calendarios no mandan tokens: lo protege la clave, derivada de `SECRET_KEY` (cambiarla invalida el enlace). En Ajustes están «Suscribirme» (`webcal://`, para iPhone) y «Copiar enlace» (Google Calendar → Otros calendarios → Desde URL).
- **De Google (u otro) a la app**: en Ajustes se agrega la «Dirección secreta en formato iCal» del calendario. El backend la descarga, la guarda en memoria `CALENDARIO_EXTERNO_MINUTOS` y suma sus eventos (con las repeticiones, en la `ZONA_HORARIA`) al Calendario de la app. Si no responde, el mes se ve igual y avisa qué calendario faltó. La dirección completa no vuelve a mostrarse, solo su dominio.

Las dos cuentas comparten todos los datos. El registro queda abierto hasta que existen 2 cuentas (`MAX_USUARIOS`) y después se cierra solo.

## Stack

| Parte | Tecnología |
|---|---|
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, SQLite, `uv` |
| Frontend | React 19 + Vite, CSS propio (sin librería de componentes), instalable como app (manifest) |
| Cotización | [dolarapi.com](https://dolarapi.com) (blue), guardada en la base y renovada cada 6 h |
| Deploy | Railway, un servicio con `Dockerfile` en la raíz y un volumen para la base |

No hay migraciones: las tablas se crean al iniciar (`Base.metadata.create_all`). Si cambia el modelo hay que adaptar la base a mano o empezar una nueva.

## Desarrollo local

```bash
# API en :8000 (crea backend/app_ahorro.db)
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Frontend en :5173, con proxy de /api a :8000
cd frontend && npm install && npm run dev
```

Abrir http://localhost:5173 y crear la cuenta. Para empezar de cero, borrar `backend/app_ahorro.db*`.

```bash
cd backend && uv run pytest -q     # tests de la API
cd frontend && npm run lint        # lint del frontend
```

## Configuración

Variables de entorno (o `backend/.env` en local):

| Variable | Default | Uso |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/app_ahorro.db` | En Railway: `sqlite:////data/app_ahorro.db` |
| `SECRET_KEY` | clave de desarrollo | **Obligatoria en producción**; firma las sesiones |
| `TOKEN_DIAS` | `30` | Duración de la sesión |
| `MAX_USUARIOS` | `2` | Cuentas permitidas |
| `ZONA_HORARIA` | `America/Argentina/Buenos_Aires` | Hora de los eventos de calendarios externos y del .ics |
| `CALENDARIO_EXTERNO_MINUTOS` | `30` | Cada cuánto se vuelve a descargar un calendario externo |

## Deploy en Railway

1. Un solo servicio apuntando a la raíz del repo; usa `Dockerfile` y `railway.json`.
2. Volumen montado en `/data`.
3. Variables `DATABASE_URL=sqlite:////data/app_ahorro.db` y `SECRET_KEY` (una cadena larga al azar).
4. Healthcheck en `/health`.

## Copia de seguridad

En Ajustes, «Base completa» baja una copia consistente del SQLite (`VACUUM INTO`, aunque haya escrituras en curso) y «Movimientos (CSV)» los movimientos separados por `;`, para Excel o Google Sheets. Para restaurar, detener el servicio, reemplazar `/data/app_ahorro.db` del volumen por la copia (y borrar los `app_ahorro.db-wal` / `-shm` si quedaron) y volver a iniciarlo.

## Estructura

```
backend/app/
  main.py            app, routers bajo /api y servido del build del frontend
  models.py          tablas (montos en centavos)
  schemas/           entrada y salida de la API
  services/          reglas: movimientos, programados, resumen, cotización…
  routers/           endpoints delgados
  core/              excepciones de dominio, seguridad, dinero y fechas
frontend/src/
  paginas/           Inicio, Movimientos, Fijos, Calendario, Ajustes, Ingreso
  componentes/       barra del mes, hojas de carga y pago, torta, cierre del mes, calendarios…
  estado/            sesión, mes elegido, refresco de datos
  lib/               cliente de la API, formato de montos y fechas
```

La mascota (easter egg) sigue en el código, desactivada con `MASCOTA_HABILITADA` en `frontend/src/config/features.js`.
