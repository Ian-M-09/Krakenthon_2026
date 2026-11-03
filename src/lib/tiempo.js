// "hace 5 minutos", "hace 2 días"... Pura: recibe `ahora` para poder testearla.
export function haceCuanto(fecha, ahora = new Date()) {
  if (!fecha) return "nunca";
  const seg = Math.max(0, Math.round((ahora - new Date(fecha)) / 1000));
  const unidades = [
    [86400, "día", "días"],
    [3600, "hora", "horas"],
    [60, "minuto", "minutos"],
  ];
  for (const [s, uno, varios] of unidades) {
    const n = Math.floor(seg / s);
    if (n >= 1) return `hace ${n} ${n === 1 ? uno : varios}`;
  }
  return "hace un momento";
}
