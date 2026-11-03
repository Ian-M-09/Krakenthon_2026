import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { claseBoton } from "@/components/ui/Button";
import { labelRango } from "@/lib/rangos";
import { PLATAFORMAS } from "@/lib/riot/regions";
import { urlIconoPerfil } from "@/lib/riot/ddragon";
import { haceCuanto } from "@/lib/tiempo";
import BotonSincronizar from "./BotonSincronizar";

export default function PerfilHeader({ perfil, cuenta, version, esPropio, ahora }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {cuenta?.profile_icon_id != null && (
        /* eslint-disable-next-line @next/next/no-img-element -- ícono chico de Data Dragon */
        <img
          src={urlIconoPerfil(version, cuenta.profile_icon_id)}
          alt=""
          width={80}
          height={80}
          className="size-20 rounded-lg border border-border"
        />
      )}
      <div className="flex-1 space-y-1">
        <h1 className="text-2xl font-bold">{perfil.nombre_usuario}</h1>
        {cuenta ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                {cuenta.game_name}
                <span className="text-muted">#{cuenta.tag_line}</span>
              </span>
              <Badge>{PLATAFORMAS[cuenta.plataforma]?.label}</Badge>
              {cuenta.verificada ? (
                <Badge tono="success">✓ Cuenta verificada</Badge>
              ) : (
                <Badge tono="warning">No verificada</Badge>
              )}
            </div>
            <p className="font-semibold">
              {labelRango(cuenta.rango_tier, cuenta.rango_division, cuenta.rango_lp)}
              {cuenta.rango_wins != null && (
                <span className="ml-2 text-sm font-normal text-muted">
                  {cuenta.rango_wins}V {cuenta.rango_losses}D en Solo/Duo
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              Datos de la API de Riot · actualizado {haceCuanto(cuenta.sincronizado_en, ahora)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Todavía no vinculó una cuenta de League of Legends.</p>
        )}
      </div>
      {esPropio && (
        <div className="flex flex-col gap-2 sm:items-end">
          {cuenta?.verificada === false && (
            <Link href="/perfil/vincular" className={claseBoton("primario", "text-sm")}>
              Verificar cuenta
            </Link>
          )}
          {cuenta && <BotonSincronizar />}
          <Link href="/perfil/editar" className={claseBoton("ghost", "text-sm")}>
            Editar disponibilidad
          </Link>
        </div>
      )}
    </Card>
  );
}
