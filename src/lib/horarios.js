// Horarios semanales y conversión entre zonas horarias. Funciones puras (sin Next ni Supabase).
// Formato guardado (perfiles_jugador.horarios / equipos.horarios), en la zona_horaria del dueño:
//   [{ dia: 0-6, desde: "HH:MM", hasta: "HH:MM" }]   con 0 = lunes … 6 = domingo.
// Si hasta <= desde, el bloque termina al día siguiente (ej. 22:00 → 01:00).

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MIN_DIA = 24 * 60;
const MIN_SEMANA = 7 * MIN_DIA;
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Zonas que ofrece el formulario (LATAM + algunas de referencia).
export const ZONAS_HORARIAS = [
  { valor: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { valor: "America/Argentina/Salta", label: "Argentina · Salta (UTC-3)" },
  { valor: "America/Montevideo", label: "Uruguay (UTC-3)" },
  { valor: "America/Sao_Paulo", label: "Brasil · São Paulo (UTC-3)" },
  { valor: "America/Santiago", label: "Chile" },
  { valor: "America/Asuncion", label: "Paraguay" },
  { valor: "America/La_Paz", label: "Bolivia (UTC-4)" },
  { valor: "America/Caracas", label: "Venezuela (UTC-4)" },
  { valor: "America/Lima", label: "Perú (UTC-5)" },
  { valor: "America/Bogota", label: "Colombia (UTC-5)" },
  { valor: "America/Guayaquil", label: "Ecuador (UTC-5)" },
  { valor: "America/Mexico_City", label: "México · CDMX (UTC-6)" },
  { valor: "America/Costa_Rica", label: "Costa Rica (UTC-6)" },
  { valor: "America/New_York", label: "EE. UU. · Este" },
  { valor: "Europe/Madrid", label: "España" },
];

export const esZonaValida = (tz) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const aHHMM = (min) => {
  const m = ((min % MIN_DIA) + MIN_DIA) % MIN_DIA;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const mod = (n, m) => ((n % m) + m) % m;

// Diferencia en minutos entre la hora local de `tz` y UTC en el instante `fecha` (ej. Argentina → -180).
// Se calcula con la fecha para respetar el horario de verano (Chile, Paraguay, EE. UU.).
export function offsetMinutos(tz, fecha = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value])
  );
  const comoUTC = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute);
  const real = Math.floor(fecha.getTime() / 60000) * 60000;
  return Math.round((comoUTC - real) / 60000);
}

// Valida y normaliza lo que viene del formulario. Descarta bloques inválidos.
export function normalizarHorarios(horarios) {
  if (!Array.isArray(horarios)) return [];
  return horarios
    .filter(
      (h) =>
        Number.isInteger(h?.dia) && h.dia >= 0 && h.dia <= 6 &&
        HORA_VALIDA.test(h.desde) && HORA_VALIDA.test(h.hasta) && h.desde !== h.hasta
    )
    .map(({ dia, desde, hasta }) => ({ dia, desde, hasta }))
    .sort((a, b) => a.dia - b.dia || aMinutos(a.desde) - aMinutos(b.desde));
}

// Lee los campos de <EditorHorarios> (dia_N_activo / dia_N_desde / dia_N_hasta) sin validar.
export function horariosDesdeFormData(formData) {
  const horarios = [];
  for (let dia = 0; dia < 7; dia++) {
    if (formData.get(`dia_${dia}_activo`)) {
      horarios.push({
        dia,
        desde: String(formData.get(`dia_${dia}_desde`) ?? ""),
        hasta: String(formData.get(`dia_${dia}_hasta`) ?? ""),
      });
    }
  }
  return horarios;
}

// Bloques → intervalos en minutos de la semana UTC: [{ inicio, fin }] con 0 = lunes 00:00 UTC.
// `fin` puede pasar de MIN_SEMANA si el bloque cruza el domingo a la noche.
export function aIntervalosUTC(horarios, tz, fecha = new Date()) {
  const offset = offsetMinutos(tz, fecha);
  return normalizarHorarios(horarios).map(({ dia, desde, hasta }) => {
    const ini = aMinutos(desde);
    let fin = aMinutos(hasta);
    if (fin <= ini) fin += MIN_DIA;
    const inicio = mod(dia * MIN_DIA + ini - offset, MIN_SEMANA);
    return { inicio, fin: inicio + (fin - ini) };
  });
}

// Convierte los bloques de la zona `origen` a la zona `destino` (lo que ve el visitante).
export function convertirHorarios(horarios, origen, destino, fecha = new Date()) {
  const offsetDestino = offsetMinutos(destino, fecha);
  return aIntervalosUTC(horarios, origen, fecha)
    .map(({ inicio, fin }) => {
      const local = mod(inicio + offsetDestino, MIN_SEMANA);
      return {
        dia: Math.floor(local / MIN_DIA),
        desde: aHHMM(local),
        hasta: aHHMM(local + (fin - inicio)),
      };
    })
    .sort((a, b) => a.dia - b.dia || aMinutos(a.desde) - aMinutos(b.desde));
}

// Minutos por semana en que se superponen dos listas de intervalos UTC (para compatibilidad, T18).
export function minutosSuperpuestos(a, b) {
  // Partimos los que cruzan el fin de semana para comparar dentro de [0, MIN_SEMANA).
  const partir = (ivs) =>
    ivs.flatMap(({ inicio, fin }) =>
      fin > MIN_SEMANA
        ? [{ inicio, fin: MIN_SEMANA }, { inicio: 0, fin: fin - MIN_SEMANA }]
        : [{ inicio, fin }]
    );
  let total = 0;
  for (const x of partir(a)) {
    for (const y of partir(b)) {
      total += Math.max(0, Math.min(x.fin, y.fin) - Math.max(x.inicio, y.inicio));
    }
  }
  return total;
}
