# TODO

- [ ] Actualizar database.py para usar src.config.settings
- [ ] Actualizar domain entities (objetivo, usuario, movimiento, tasa_cambio) para usar src.domain.exceptions
- [ ] Actualizar repositories para usar nuevas excepciones (Not Found, Conflict, Infrastructure)
- [ ] Actualizar services para usar nuevas excepciones
- [ ] Actualizar controllers para tener UN try/except que re-raise
- [ ] Actualizar middleware/auth_middleware.py para usar src.config.settings
- [ ] Probar dynamic config reload
- [ ] Probar endpoints en /docs
