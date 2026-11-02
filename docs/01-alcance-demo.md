# 01 — Alcance de la demo (entrega 9/11)

## Propuesta en una línea
Identidad competitiva **verificada** para jugadores de LoL de LATAM: stats que salen de la Riot API y no se pueden editar, más los datos que op.gg no tiene (contacto, idioma, roles, horarios), para que equipos amateur y semi-pro recluten con confianza. La IA resume y busca.

## Usuarios y flujo principal (lo que se muestra en la demo)
1. Me registro → "¿Venís a buscar equipo o jugadores?" (solo decide la pantalla inicial).
2. Vinculo mi Riot ID y lo verifico con el ícono → se sincronizan mis partidas.
3. Veo mi perfil: rango, winrate, KDA, CS/min, visión, campeones, roles, forma reciente y comparación con mi rango.
4. Completo los datos declarados: roles, idiomas, horarios, contacto y visibilidad.
5. Genero mi **informe de scouting IA**.
6. Como reclutador: creo un equipo → busco "support Esmeralda+ que hable español y juegue de noche" → veo resultados con el **% de compatibilidad** → abro un perfil y veo el contacto (porque soy equipo registrado).
7. (Si llega) Torneo: creo → deposito el premio (sandbox) → publico → se inscriben equipos → declaro ganador → se libera el pago menos la comisión.

## Funcionalidades y criterios de aceptación

### P1 — Auth y vinculación
- Registro/login con email + contraseña (Supabase Auth). Logout.
- Onboarding obligatorio: `nombre_usuario` único (3-20, letras/números/_) + intención.
- Vincular 1 cuenta de LoL por usuario (Riot ID + región: LAS, LAN, BR, NA).
- Verificación por ícono de perfil, con expiración de 15 min. Una cuenta verificada no puede ser reclamada por otro usuario.
- ✅ Acepta si: con una cuenta real, el flujo completo termina con el badge "Verificada" y queda registrado en la BD.

### P2 — Perfil del jugador
- Stats **calculadas por el servidor** sobre las últimas 20 ranked solo/duo (cola 420): winrate, KDA, CS/min, visión/min, kill participation, por campeón (top 5), por rol y forma reciente (10).
- Rango solo/duo (tier, división, LP, W/L).
- Comparación vs. el promedio de su tier (benchmarks estimados; en la UI se aclara "valores de referencia estimados").
- Datos declarados editables; las stats **no** (no hay ninguna policy de escritura para el cliente).
- Contacto visible según `visibilidad`: público / solo miembros de equipos / oculto.
- Horarios guardados con la zona horaria IANA del jugador y mostrados convertidos a la del visitante.
- "Actualizar datos" con un cooldown de 10 min; muestra "actualizado hace X".
- ✅ Acepta si: el perfil carga en < 2 s desde el caché y, con la Riot API caída, sigue mostrando los datos guardados.

### P3 — Informe de scouting IA
- Generado con Gemini **solo** con las stats verificadas + benchmarks. JSON estructurado: resumen, fortalezas, debilidades, campeones destacados, comparación con el rango y rol recomendado.
- Cacheado: no se regenera si las stats no cambiaron.
- ✅ Acepta si: genera en < 15 s, no inventa números (todo lo que cita está en el input) y, si Gemini falla, se muestra un error amigable sin romper el perfil.

### P4 — Equipos y búsqueda
- CRUD de equipo: nombre, tag, nivel (amateur/semi-pro), rango mínimo, roles buscados, idiomas, país, horarios + zona horaria, "reclutando".
- Miembros con rol: dueño (1, quien lo crea), reclutador y jugador.
- Buscador con filtros combinables en la URL.
- Lenguaje natural → filtros (el LLM nunca escribe SQL) con chips editables.
- Compatibilidad jugador-equipo 0-100% con desglose (rol, rango, idioma, horario).
- ✅ Acepta si: la frase de ejemplo de la demo devuelve los filtros correctos 5 de 5 veces.

### P5 — Torneos (si da el tiempo)
- Estados: `borrador → premio_depositado → publicado → en_curso → finalizado → pagado`.
- El pago es **simulado** (o Mercado Pago sandbox si sobra tiempo). Comisión configurable (ej. 10%), visible en el resumen.
- ✅ Acepta si: se recorre el flujo completo sin errores y se ve el cálculo premio/comisión.

## Fuera de alcance (va al roadmap, no se hace sin el OK de Ian)
- Valorant, TFT, CS2/Steam y otros juegos.
- RSO (Riot Sign On): requiere una production key aprobada. En la demo se verifica por ícono.
- Pagos reales, KYC, facturación.
- Chat interno, notificaciones por email, app mobile.
- Más de una cuenta de LoL por usuario o colas que no sean solo/duo.
- Benchmarks calculados con datos propios (en la demo son estimados).
- Panel de administración y moderación.
