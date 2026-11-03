// Lo que el jugador declara (editable en /perfil/editar). Se muestra separado de las stats
// verificadas para que quede claro qué sale de Riot y qué no.
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ROLES, IDIOMAS, PAISES, TIPOS_CONTACTO, VISIBILIDADES } from "@/lib/catalogos";
import HorariosVista from "./HorariosVista";

function Fila({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <div>{children}</div>
    </div>
  );
}

const lista = (codigos, catalogo) =>
  codigos?.length ? codigos.map((c) => catalogo[c] ?? c).join(", ") : "—";

export function DatosDeclarados({ datos }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Disponibilidad y datos declarados</h2>
        {datos?.buscando_equipo && <Badge tono="accent">Buscando equipo</Badge>}
      </div>
      <p className="text-xs text-muted">Los carga el jugador; no salen de la API de Riot.</p>
      {!datos ? (
        <p className="text-sm text-muted">Todavía no completó sus datos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Fila label="Roles que juega">{lista(datos.roles, ROLES)}</Fila>
          <Fila label="Idiomas">{lista(datos.idiomas, IDIOMAS)}</Fila>
          <Fila label="País">{datos.pais ? PAISES[datos.pais] ?? datos.pais : "—"}</Fila>
          <div className="sm:col-span-2">
            <Fila label="Horarios para jugar">
              <HorariosVista horarios={datos.horarios} zonaJugador={datos.zona_horaria} />
            </Fila>
          </div>
          {datos.bio && (
            <div className="sm:col-span-2">
              <Fila label="Sobre mí">
                <p className="whitespace-pre-line text-sm">{datos.bio}</p>
              </Fila>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// El RLS ya filtró: si `contacto` es null, no existe o quien mira no tiene permiso para verlo.
export function Contacto({ contacto, esPropio }) {
  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">Contacto</h2>
      {contacto ? (
        <>
          <p>
            <span className="text-muted">{TIPOS_CONTACTO[contacto.tipo]}:</span> {contacto.valor}
          </p>
          {esPropio && (
            <p className="text-xs text-muted">Visibilidad: {VISIBILIDADES[contacto.visibilidad]}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">
          {esPropio
            ? "No cargaste un contacto. Agregalo desde \"Editar disponibilidad\"."
            : "No disponible. Algunos jugadores solo muestran su contacto a miembros de equipos registrados."}
        </p>
      )}
    </Card>
  );
}
