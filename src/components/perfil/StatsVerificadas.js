// Bloques de stats calculadas por el servidor desde la Riot API (estadisticas_jugador.resumen).
// Solo lectura: no hay forma de editarlas desde la UI ni desde el cliente (sin policies de escritura).
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ROLES } from "@/lib/catalogos";
import { urlCampeon } from "@/lib/riot/ddragon";
import { compararConBenchmark } from "@/lib/stats";
import { LABEL_TIER } from "@/lib/rangos";

const pct = (n) => `${Math.round(n * 100)}%`;

function Stat({ label, valor, detalle }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold">{valor}</p>
      {detalle && <p className="text-xs text-muted">{detalle}</p>}
    </Card>
  );
}

export function ResumenStats({ resumen }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Stats verificadas</h2>
        <span className="text-xs text-muted">
          Últimas {resumen.partidas} ranked Solo/Duo · calculadas desde la API de Riot
        </span>
        {resumen.muestra_chica && <Badge tono="warning">Muestra chica</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="Winrate"
          valor={pct(resumen.winrate)}
          detalle={`${resumen.victorias}V ${resumen.partidas - resumen.victorias}D`}
        />
        <Stat
          label="KDA"
          valor={resumen.kda.toFixed(2)}
          detalle={`${resumen.kills} / ${resumen.deaths} / ${resumen.assists}`}
        />
        <Stat label="CS/min" valor={resumen.cs_min.toFixed(1)} />
        <Stat label="Visión/min" valor={resumen.vision_min.toFixed(2)} />
        <Stat label="Kill participation" valor={pct(resumen.kp)} />
      </div>
    </section>
  );
}

export function FormaReciente({ forma }) {
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold">Forma reciente</h3>
      <p className="text-xs text-muted">De la más reciente a la más vieja</p>
      <ol className="flex flex-wrap gap-1">
        {forma.map((r, i) => (
          <li
            key={i}
            className={`flex size-8 items-center justify-center rounded text-sm font-bold ${
              r === "W" ? "bg-success text-bg" : "bg-danger text-bg"
            }`}
            title={r === "W" ? "Victoria" : "Derrota"}
          >
            {r === "W" ? "V" : "D"}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function DistribucionRoles({ porRol, total }) {
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">Roles jugados</h3>
      <ul className="space-y-2">
        {porRol.map((r) => (
          <li key={r.posicion} className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{ROLES[r.posicion] ?? r.posicion}</span>
              <span className="text-muted">
                {r.partidas} partidas · {pct(r.winrate)} WR
              </span>
            </div>
            <div className="h-2 rounded bg-surface-2">
              <div className="h-2 rounded bg-accent" style={{ width: pct(r.partidas / total) }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TablaCampeones({ campeones, version }) {
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">Campeones más jugados</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="pb-2 font-normal">Campeón</th>
            <th className="pb-2 text-right font-normal">Partidas</th>
            <th className="pb-2 text-right font-normal">WR</th>
            <th className="pb-2 text-right font-normal">KDA</th>
          </tr>
        </thead>
        <tbody>
          {campeones.map((c) => (
            <tr key={c.campeon_id} className="border-t border-border">
              <td className="py-2">
                <span className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen chica de Data Dragon */}
                  <img
                    src={urlCampeon(version, c.campeon)}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded"
                  />
                  {c.campeon}
                </span>
              </td>
              <td className="py-2 text-right">{c.partidas}</td>
              <td className="py-2 text-right">{pct(c.winrate)}</td>
              <td className="py-2 text-right">{c.kda.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function ComparacionRango({ resumen, benchmark }) {
  const filas = compararConBenchmark(resumen, benchmark);

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">
        Comparación con su rango
        {benchmark && (
          <span className="ml-2 text-sm font-normal text-muted">
            {LABEL_TIER[benchmark.tier]}
            {benchmark.posicion !== "ALL" && ` · ${ROLES[benchmark.posicion]}`}
          </span>
        )}
      </h3>
      {filas.length === 0 ? (
        <p className="text-sm text-muted">
          Sin valores de referencia para este rango todavía (o la cuenta no tiene rango).
        </p>
      ) : (
        <>
          <ul className="space-y-2 text-sm">
            {filas.map((f) => {
              const mejor = f.diferencia >= 0;
              const fmt = (n) => (f.porcentaje ? pct(n) : n.toFixed(2));
              return (
                <li key={f.clave} className="flex items-center justify-between gap-2">
                  <span>{f.label}</span>
                  <span className="text-right">
                    {fmt(f.valor)} <span className="text-muted">vs. {fmt(f.referencia)}</span>{" "}
                    <span className={mejor ? "text-success" : "text-danger"}>
                      {mejor ? "▲" : "▼"} {Math.abs(Math.round(f.diferencia * 100))}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">
            Valores de referencia estimados para el rango (no son promedios oficiales de Riot).
          </p>
        </>
      )}
    </Card>
  );
}
