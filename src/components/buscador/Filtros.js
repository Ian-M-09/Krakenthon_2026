import Link from "next/link";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { claseBoton } from "@/components/ui/Button";
import { ROLES, IDIOMAS, PAISES, aOpciones } from "@/lib/catalogos";
import { LABEL_TIER } from "@/lib/rangos";

const conVacio = (label, catalogo) => [{ valor: "", label }, ...aOpciones(catalogo)];

// Formulario GET: los filtros quedan en la URL (se pueden compartir y volver atrás).
// Sin JavaScript: el navegador arma la query string solo.
export default function Filtros({ filtros, equipos }) {
  return (
    <Card as="form" action="/jugadores" className="space-y-3">
      <h2 className="font-semibold">Filtros</h2>
      {equipos.length > 0 && (
        <Select
          label="Compatibilidad con"
          name="equipo"
          defaultValue={filtros.equipo ?? equipos[0].id}
          opciones={equipos.map((e) => ({ valor: e.id, label: e.nombre }))}
        />
      )}
      {/* Un solo valor por select; desde el link del equipo pueden venir varios (rol=A,B). */}
      <Select label="Rol" name="rol" defaultValue={filtros.roles.join(",")} opciones={[
        ...conVacio("Cualquiera", ROLES),
        ...(filtros.roles.length > 1 ? [{ valor: filtros.roles.join(","), label: filtros.roles.map((r) => ROLES[r]).join(" / ") }] : []),
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <Select label="Rango mín." name="rangoMin" defaultValue={filtros.rangoMin ?? ""} opciones={conVacio("—", LABEL_TIER)} />
        <Select label="Rango máx." name="rangoMax" defaultValue={filtros.rangoMax ?? ""} opciones={conVacio("—", LABEL_TIER)} />
      </div>
      <Select label="Idioma" name="idioma" defaultValue={filtros.idiomas[0] ?? ""} opciones={conVacio("Cualquiera", IDIOMAS)} />
      <Select label="País" name="pais" defaultValue={filtros.paises[0] ?? ""} opciones={conVacio("Cualquiera", PAISES)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verificados" value="1" defaultChecked={filtros.verificados} />
        Solo cuentas verificadas
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="buscando" value="1" defaultChecked={filtros.buscando} />
        Solo buscando equipo
      </label>
      <div className="flex gap-2">
        <button className={claseBoton("primario", "flex-1")}>Buscar</button>
        <Link href="/jugadores" className={claseBoton("ghost")}>
          Limpiar
        </Link>
      </div>
    </Card>
  );
}
