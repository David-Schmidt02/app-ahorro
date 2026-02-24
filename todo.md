# TODO

- [x] Actualizar database.py para usar src.config.settings
- [x] Actualizar middleware/auth_middleware.py para usar src.config.settings
- [x] Probar dynamic config reload
- [x] Probar endpoints en /docs
- [x] Eliminar todo lo que tiene que ver con csv
- [x] Que se devuelva todo en dólares + la tasa de conversion. Si se almacena un movimiento/objetivo en pesos -> se convierte a dólares antes de persistir.
- [x] Vencimiento establecido (manual) y Vencimiento estimado (regresión) mostrados por separado en el frontend.
- [x] Migrar a PostgreSQL y deployear en Railway

 Mi idea es generar dos cosas:
  1. Un tutorial muy ligero para la aplicacion, vi que un frontend developer realizó uno para un proyecto en
  ángular si queres te lo señalo, mi idea sería algo asi, con un toque más de "risa-pareja-divertido"
  2. Un mensaje al mail de cada usuario, estaría bueno generar la abstraccion para que en un futuro podamos agregar
   distintas alertas a mail o a wpp