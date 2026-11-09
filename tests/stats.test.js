import { describe, it, expect } from "vitest";
import { computeStats, compararConBenchmark, elegirBenchmark, PARTIDAS_RESUMEN } from "../src/lib/stats.js";

// Partida de 30 min con valores por defecto; cada test pisa lo que necesita.
const partida = (o = {}) => ({
  campeon: "Thresh", campeon_id: 412, posicion: "UTILITY", victoria: true,
  kills: 2, deaths: 2, assists: 10, cs: 30, vision: 60, participacion_kills: 0.6,
  duracion_seg: 1800, inicio: "2026-11-01T20:00:00Z", ...o,
});

describe("computeStats", () => {
  it("calcula el KDA sobre los totales, no como promedio de KDAs", () => {
    // (0+10)/1 = 10 y (10+0)/9 = 1.1 → promedio 5.6; sobre totales: (10+10)/10 = 2
    const r = computeStats([
      partida({ kills: 0, deaths: 1, assists: 10 }),
      partida({ kills: 10, deaths: 9, assists: 0, inicio: "2026-11-02T20:00:00Z" }),
    ]);
    expect(r.kda).toBe(2);
  });

  it("usa deaths = 1 como mínimo para no dividir por cero", () => {
    expect(computeStats([partida({ kills: 3, deaths: 0, assists: 3 })]).kda).toBe(6);
  });

  it("CS/min y visión/min se ponderan por la duración total", () => {
    // 30 + 90 CS en 30 + 30 min = 2 CS/min
    const r = computeStats([partida({ cs: 30 }), partida({ cs: 90, inicio: "2026-11-02T20:00:00Z" })]);
    expect(r.cs_min).toBe(2);
    expect(r.vision_min).toBe(2);
  });

  it(`se queda con las ${PARTIDAS_RESUMEN} más recientes y la forma va de la más nueva a la más vieja`, () => {
    const filas = Array.from({ length: PARTIDAS_RESUMEN + 5 }, (_, i) =>
      partida({ victoria: i % 2 === 0, inicio: new Date(Date.UTC(2026, 9, 1 + i)).toISOString() })
    );
    const r = computeStats(filas);
    expect(r.partidas).toBe(PARTIDAS_RESUMEN);
    expect(r.forma_reciente).toHaveLength(10);
    expect(r.forma_reciente[0]).toBe(filas.at(-1).victoria ? "W" : "L");
  });

  it("agrupa por rol y por campeón, y marca la muestra chica", () => {
    const r = computeStats([
      partida(),
      partida({ campeon: "Nautilus", campeon_id: 111, inicio: "2026-11-02T20:00:00Z" }),
      partida({ posicion: "JUNGLE", campeon: "Viego", campeon_id: 234, victoria: false, inicio: "2026-11-03T20:00:00Z" }),
    ]);
    expect(r.rol_principal).toBe("UTILITY");
    expect(r.por_rol[0]).toEqual({ posicion: "UTILITY", partidas: 2, winrate: 1 });
    expect(r.por_campeon).toHaveLength(3);
    expect(r.muestra_chica).toBe(true);
  });

  it("sin partidas devuelve ceros y no rompe", () => {
    const r = computeStats([]);
    expect(r.partidas).toBe(0);
    expect(r.winrate).toBe(0);
    expect(r.periodo).toBeNull();
  });
});

describe("benchmarks", () => {
  const benchmarks = [
    { tier: "GOLD", posicion: "ALL", kda: 2.5, cs_min: 6, vision_min: 0.6, kp: 0.48 },
    { tier: "GOLD", posicion: "UTILITY", kda: 2.6, cs_min: 1.1, vision_min: 1.75, kp: 0.58 },
  ];

  it("usa el benchmark de la posición si existe y si no el de ALL", () => {
    expect(elegirBenchmark(benchmarks, "GOLD", "UTILITY").posicion).toBe("UTILITY");
    expect(elegirBenchmark(benchmarks, "GOLD", "TOP").posicion).toBe("ALL");
    expect(elegirBenchmark(benchmarks, "IRON", "TOP")).toBeNull();
  });

  it("calcula la diferencia relativa contra la referencia", () => {
    const filas = compararConBenchmark({ kda: 3, cs_min: 6, vision_min: 0.3, kp: 0.48 }, benchmarks[0]);
    expect(filas.find((f) => f.clave === "kda").diferencia).toBe(0.2);
    expect(filas.find((f) => f.clave === "vision_min").diferencia).toBe(-0.5);
  });
});
