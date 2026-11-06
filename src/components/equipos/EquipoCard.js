import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ROLES, IDIOMAS, PAISES } from "@/lib/catalogos";
import { LABEL_TIER } from "@/lib/rangos";
import { NIVELES } from "@/lib/equipos";

export default function EquipoCard({ equipo }) {
  return (
    <Link href={`/equipos/${equipo.id}`} className="block">
      <Card className="h-full space-y-2 transition hover:border-accent">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">
            {equipo.tag && <span className="text-accent">[{equipo.tag}] </span>}
            {equipo.nombre}
          </h2>
          <Badge>{NIVELES[equipo.nivel]}</Badge>
          {equipo.reclutando && <Badge tono="success">Reclutando</Badge>}
        </div>
        {equipo.roles_buscados?.length > 0 && (
          <p className="text-sm">
            <span className="text-muted">Buscan: </span>
            {equipo.roles_buscados.map((r) => ROLES[r]).join(", ")}
          </p>
        )}
        <p className="text-xs text-muted">
          {[
            equipo.rango_minimo && `${LABEL_TIER[equipo.rango_minimo]}+`,
            equipo.idiomas?.map((i) => IDIOMAS[i]).join(", "),
            equipo.pais && PAISES[equipo.pais],
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </Card>
    </Link>
  );
}
