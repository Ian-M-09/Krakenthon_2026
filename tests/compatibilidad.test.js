import { describe, it, expect } from "vitest";
import { calcularCompatibilidad, PESOS } from "../src/lib/compatibilidad.js";
import { parsearFiltros, juegaEnFranja } from "../src/lib/busqueda.js";

const F = new Date("2026-11-06T12:00:00Z");
const jugador = {
  roles: ["JUNGLE"], rol_principal: "JUNGLE", rango_tier: "BRONZE", rango_division: "III",
  idiomas: ["es"], zona_horaria: "America/Argentina/Salta",
  horarios: [{ dia: 4, desde: "21:00", hasta: "02:00" }],
};
const equipo = {
  roles_buscados: ["JUNGLE", "UTILITY"], rango_minimo: "SILVER", idiomas: ["es"],
  zona_horaria: "America/Mexico_City", horarios: [{ dia: 4, desde: "19:00", hasta: "23:00" }],
};
const puntos = (r, clave) => r.desglose.find((d) => d.clave === clave).puntos;

describe("calcularCompatibilidad", () => {
  it("los pesos suman 100", () => {
    expect(Object.values(PESOS).reduce((a, b) => a + b)).toBe(100);
  });

  it("caso completo: rol, idioma y horario al máximo; rango 3 divisiones abajo", () => {
    const r = calcularCompatibilidad(jugador, equipo, F);
    expect(puntos(r, "rol")).toBe(35);
    expect(puntos(r, "rango")).toBe(10); // Bronce III → Plata IV = 3 divisiones → 25 - 15
    expect(puntos(r, "idioma")).toBe(20);
    expect(puntos(r, "horario")).toBe(20); // MX 19-23 = AR 22-02, el jugador cubre todo
    expect(r.total).toBe(85);
  });

  it("sin datos del equipo usa los puntajes neutros de la fórmula", () => {
    const r = calcularCompatibilidad(jugador, { roles_buscados: [], idiomas: [], horarios: [] }, F);
    expect(puntos(r, "rol")).toBe(15);
    expect(puntos(r, "rango")).toBe(25);
    expect(puntos(r, "idioma")).toBe(10);
    expect(puntos(r, "horario")).toBe(10);
  });

  it("jugador sin rango recibe 12 en rango y nunca baja de 0", () => {
    expect(puntos(calcularCompatibilidad({ ...jugador, rango_tier: null }, equipo, F), "rango")).toBe(12);
    expect(puntos(calcularCompatibilidad({ ...jugador, rango_tier: "IRON", rango_division: "IV" }, { ...equipo, rango_minimo: "DIAMOND" }, F), "rango")).toBe(0);
  });

  it("no suma rol si no juega lo que el equipo busca", () => {
    expect(puntos(calcularCompatibilidad({ ...jugador, roles: ["TOP"], rol_principal: "TOP" }, equipo, F), "rol")).toBe(0);
  });
});

describe("filtros del buscador (whitelist)", () => {
  it("descarta valores que no están en la lista", () => {
    const f = parsearFiltros({ rol: "UTILITY,HACK", rangoMin: "x';drop", idioma: "es,zz", equipo: "no-uuid" });
    expect(f.roles).toEqual(["UTILITY"]);
    expect(f.rangoMin).toBeNull();
    expect(f.idiomas).toEqual(["es"]);
    expect(f.equipo).toBeNull();
  });

  it("da vuelta el rango si viene al revés", () => {
    const f = parsearFiltros({ rangoMin: "DIAMOND", rangoMax: "GOLD" });
    expect([f.rangoMin, f.rangoMax]).toEqual(["GOLD", "DIAMOND"]);
  });

  it("la franja 'noche' de quien busca se compara en la zona de cada jugador", () => {
    const k1 = { zona_horaria: "America/Argentina/Salta", horarios: [{ dia: 0, desde: "20:00", hasta: "23:00" }] };
    const noche = { desde: "19:00", hasta: "24:00", dias: [] };
    expect(juegaEnFranja(k1, noche, "America/Argentina/Salta", F)).toBe(true);
    // La noche de Madrid (19-24) son las 15-20 en Argentina: no se superpone con 20-23.
    expect(juegaEnFranja(k1, noche, "Europe/Madrid", F)).toBe(false);
    expect(juegaEnFranja({ ...k1, horarios: [] }, noche, "America/Argentina/Salta", F)).toBe(false);
  });
});
