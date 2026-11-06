import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { claseBoton } from "@/components/ui/Button";
import { claseCampo } from "@/components/ui/Input";
import HorariosVista from "@/components/perfil/HorariosVista";
import AgregarMiembro from "@/components/equipos/AgregarMiembro";
import { ROLES, IDIOMAS, PAISES } from "@/lib/catalogos";
import { LABEL_TIER } from "@/lib/rangos";
import { NIVELES, ROLES_EQUIPO, esUuid } from "@/lib/equipos";
import { agregarMiembro, cambiarRolMiembro, quitarMiembro, eliminarEquipo } from "../actions";

export const metadata = { title: "Equipo" };

export default function EquipoPage({ params }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-4 sm:p-6">
      <Suspense fallback={<Spinner />}>
        <Equipo params={params} />
      </Suspense>
    </main>
  );
}

async function Equipo({ params }) {
  const { id } = await params;
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: equipo }, { data: miembros }, { data: authData }] = await Promise.all([
    supabase.from("equipos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("miembros_equipo")
      .select("usuario_id, rol, perfiles(nombre_usuario)")
      .eq("equipo_id", id)
      .order("unido_en"),
    supabase.auth.getUser(),
  ]);
  if (!equipo) notFound();

  const userId = authData?.user?.id;
  const miRol = miembros?.find((m) => m.usuario_id === userId)?.rol;
  const esDueno = miRol === "dueno";
  const esStaff = esDueno || miRol === "reclutador";

  // Link al buscador con los filtros del equipo ya cargados.
  const filtros = new URLSearchParams({ equipo: id, buscando: "1" });
  if (equipo.roles_buscados.length) filtros.set("rol", equipo.roles_buscados.join(","));
  if (equipo.rango_minimo) filtros.set("rangoMin", equipo.rango_minimo);

  return (
    <>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {equipo.tag && <span className="text-accent">[{equipo.tag}] </span>}
            {equipo.nombre}
          </h1>
          <Badge>{NIVELES[equipo.nivel]}</Badge>
          {equipo.reclutando ? <Badge tono="success">Reclutando</Badge> : <Badge>No recluta</Badge>}
        </div>
        {equipo.descripcion && <p className="whitespace-pre-line text-sm">{equipo.descripcion}</p>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Roles que buscan</dt>
            <dd>{equipo.roles_buscados.map((r) => ROLES[r]).join(", ") || "Cualquiera"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Rango mínimo</dt>
            <dd>{equipo.rango_minimo ? LABEL_TIER[equipo.rango_minimo] : "Sin mínimo"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Idiomas</dt>
            <dd>{equipo.idiomas.map((i) => IDIOMAS[i]).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">País</dt>
            <dd>{equipo.pais ? PAISES[equipo.pais] : "—"}</dd>
          </div>
        </dl>
        <div>
          <p className="text-xs text-muted">Horarios de práctica</p>
          <HorariosVista horarios={equipo.horarios} zonaJugador={equipo.zona_horaria} quien="El equipo" />
        </div>
        {esStaff && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={`/jugadores?${filtros}`} className={claseBoton("primario")}>
              Buscar jugadores para este equipo
            </Link>
            <Link href={`/equipos/${id}/editar`} className={claseBoton("secundario")}>
              Editar equipo
            </Link>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Miembros</h2>
        <ul className="divide-y divide-border">
          {(miembros ?? []).map((m) => (
            <li key={m.usuario_id} className="flex flex-wrap items-center gap-2 py-2">
              <Link href={`/jugadores/${m.perfiles.nombre_usuario}`} className="font-medium hover:text-accent">
                {m.perfiles.nombre_usuario}
              </Link>
              <Badge tono={m.rol === "dueno" ? "accent" : "neutro"}>{ROLES_EQUIPO[m.rol]}</Badge>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {esDueno && m.rol !== "dueno" && (
                  <>
                    <form action={cambiarRolMiembro.bind(null, id, m.usuario_id)} className="flex gap-1">
                      <select name="rol" defaultValue={m.rol} aria-label="Rol" className={`${claseCampo} w-36 py-1 text-sm`}>
                        <option value="jugador">Jugador</option>
                        <option value="reclutador">Reclutador</option>
                      </select>
                      <button className={claseBoton("ghost", "px-2 py-1 text-sm")}>Cambiar</button>
                    </form>
                    <form action={quitarMiembro.bind(null, id, m.usuario_id)}>
                      <button className={claseBoton("ghost", "px-2 py-1 text-sm text-danger")}>Quitar</button>
                    </form>
                  </>
                )}
                {m.usuario_id === userId && m.rol !== "dueno" && (
                  <form action={quitarMiembro.bind(null, id, m.usuario_id)}>
                    <button className={claseBoton("ghost", "px-2 py-1 text-sm text-danger")}>Salir del equipo</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        {esDueno && <AgregarMiembro action={agregarMiembro.bind(null, id)} />}
      </Card>

      {esDueno && (
        <form action={eliminarEquipo.bind(null, id)} className="text-right">
          <button className={claseBoton("ghost", "text-sm text-danger")}>Eliminar equipo</button>
        </form>
      )}
    </>
  );
}
