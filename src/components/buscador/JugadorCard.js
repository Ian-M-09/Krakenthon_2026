import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ROLES, IDIOMAS, PAISES } from "@/lib/catalogos";
import { labelRango } from "@/lib/rangos";
import { urlIconoPerfil } from "@/lib/riot/ddragon";
import Compatibilidad from "./Compatibilidad";

export default function JugadorCard({ jugador: j, version, compat, equipoNombre }) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <Link href={`/jugadores/${j.nombre_usuario}`} className="flex items-center gap-3 hover:text-accent">
        {j.profile_icon_id != null ? (
          /* eslint-disable-next-line @next/next/no-img-element -- ícono chico de Data Dragon */
          <img
            src={urlIconoPerfil(version, j.profile_icon_id)}
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-lg border border-border"
          />
        ) : (
          <div className="size-12 rounded-lg border border-border bg-surface-2" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{j.nombre_usuario}</p>
          <p className="truncate text-xs text-muted">
            {j.game_name ? `${j.game_name}#${j.tag_line}` : "Sin cuenta vinculada"}
          </p>
        </div>
      </Link>
      <div className="flex flex-wrap gap-1">
        {j.game_name &&
          (j.verificada ? <Badge tono="success">✓ Verificada</Badge> : <Badge tono="warning">No verificada</Badge>)}
        {j.buscando_equipo && <Badge tono="accent">Buscando equipo</Badge>}
      </div>
      <p className="text-sm font-medium">{labelRango(j.rango_tier, j.rango_division, j.rango_lp)}</p>
      <p className="text-xs text-muted">
        {[
          j.roles?.map((r) => ROLES[r]).join(", "),
          j.idiomas?.map((i) => IDIOMAS[i]).join(", "),
          j.pais && PAISES[j.pais],
        ]
          .filter(Boolean)
          .join(" · ") || "Sin datos declarados"}
      </p>
      {compat && (
        <div className="mt-auto">
          <Compatibilidad resultado={compat} equipoNombre={equipoNombre} />
        </div>
      )}
    </Card>
  );
}
