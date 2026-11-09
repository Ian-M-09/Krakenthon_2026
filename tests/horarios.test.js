import { describe, it, expect } from "vitest";
import {
  offsetMinutos,
  convertirHorarios,
  aIntervalosUTC,
  minutosSuperpuestos,
  normalizarHorarios,
} from "../src/lib/horarios.js";

// Fecha fija: los offsets dependen del horario de verano.
const F = new Date("2026-11-06T12:00:00Z");

describe("horarios", () => {
  it("calcula el offset de cada zona en la fecha dada", () => {
    expect(offsetMinutos("America/Argentina/Salta", F)).toBe(-180);
    expect(offsetMinutos("America/Mexico_City", F)).toBe(-360);
    expect(offsetMinutos("Europe/Madrid", F)).toBe(60);
  });

  it("convierte de Argentina a México (3 h menos)", () => {
    const r = convertirHorarios([{ dia: 0, desde: "20:00", hasta: "23:30" }], "America/Argentina/Salta", "America/Mexico_City", F);
    expect(r).toEqual([{ dia: 0, desde: "17:00", hasta: "20:30" }]);
  });

  it("al convertir puede cambiar el día (Argentina → España)", () => {
    // Lunes 22:00 en Argentina = martes 02:00 en Madrid
    const r = convertirHorarios([{ dia: 0, desde: "22:00", hasta: "23:00" }], "America/Argentina/Salta", "Europe/Madrid", F);
    expect(r).toEqual([{ dia: 1, desde: "02:00", hasta: "03:00" }]);
  });

  it("un bloque que pasa la medianoche del domingo vuelve al lunes", () => {
    const r = convertirHorarios([{ dia: 6, desde: "22:00", hasta: "01:00" }], "America/Argentina/Salta", "Europe/Madrid", F);
    expect(r).toEqual([{ dia: 0, desde: "02:00", hasta: "05:00" }]);
  });

  it("calcula los minutos superpuestos entre zonas distintas", () => {
    // AR lunes 20:00-23:30 (UTC 23:00-02:30) vs MX lunes 18:00-21:00 (UTC 00:00-03:00) → 150 min
    const a = aIntervalosUTC([{ dia: 0, desde: "20:00", hasta: "23:30" }], "America/Argentina/Salta", F);
    const b = aIntervalosUTC([{ dia: 0, desde: "18:00", hasta: "21:00" }], "America/Mexico_City", F);
    expect(minutosSuperpuestos(a, b)).toBe(150);
  });

  it("descarta bloques inválidos y los ordena", () => {
    const r = normalizarHorarios([
      { dia: 2, desde: "10:00", hasta: "12:00" },
      { dia: 9, desde: "10:00", hasta: "12:00" },
      { dia: 1, desde: "25:00", hasta: "12:00" },
      { dia: 0, desde: "10:00", hasta: "10:00" },
      { dia: 0, desde: "08:00", hasta: "09:00" },
    ]);
    expect(r).toEqual([
      { dia: 0, desde: "08:00", hasta: "09:00" },
      { dia: 2, desde: "10:00", hasta: "12:00" },
    ]);
  });
});
