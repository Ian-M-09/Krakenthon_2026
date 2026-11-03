"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button, { claseBoton } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { opcionesPlataforma, PLATAFORMA_DEFAULT, PLATAFORMAS } from "@/lib/riot/regions";
import { labelRango } from "@/lib/rangos";

// POST a nuestra API → { ok, data } | { ok, error }. Si la red falla, devuelve un error amigable.
async function postApi(url, body) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch {
    return { ok: false, error: { message: "No pudimos conectarnos. Revisá tu conexión." } };
  }
}

// Solo el sync "actualizado" trae rango; en cooldown/stale se mantiene el que ya mostramos.
const datosRango = (sync) =>
  sync?.estado === "actualizado"
    ? { rango_tier: sync.rango_tier, rango_division: sync.rango_division, rango_lp: sync.rango_lp }
    : {};

const pendiente = (c) =>
  c && !c.verificada && c.icono_verificacion != null && new Date(c.verificacion_expira) > new Date();

export default function VincularCliente({ inicial }) {
  const router = useRouter();
  const [cuenta, setCuenta] = useState(inicial);
  const [paso, setPaso] = useState(
    inicial?.verificada ? "listo" : pendiente(inicial) ? "verificar" : "datos"
  );
  const [cargando, setCargando] = useState(null); // "vincular" | "verificar" | "sync"
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  async function vincular(riotId, plataforma) {
    setCargando("vincular");
    setError(null);
    const res = await postApi("/api/riot/vincular", { riotId, plataforma });
    setCargando(null);
    if (!res.ok) return setError(res.error.message);
    setCuenta(res.data);
    setPaso("verificar");
  }

  async function verificar() {
    setCargando("verificar");
    setError(null);
    const res = await postApi("/api/riot/verificar");
    setCargando(null);
    if (!res.ok) {
      if (res.error.code === "EXPIRED") setPaso("datos");
      return setError(res.error.message);
    }
    setCuenta((c) => ({ ...c, verificada: true, ...datosRango(res.data.sync) }));
    setAviso(res.data.sync?.mensaje ?? null);
    setPaso("listo");
    router.refresh();
  }

  async function sincronizar() {
    setCargando("sync");
    setError(null);
    const res = await postApi("/api/riot/sincronizar");
    setCargando(null);
    if (!res.ok) return setError(res.error.message);
    const { estado, nuevas, mensaje } = res.data;
    setCuenta((c) => ({ ...c, ...datosRango(res.data) }));
    setAviso(estado === "actualizado" ? `Listo: ${nuevas} partidas nuevas.` : mensaje);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {paso === "datos" && (
        <FormDatos cuenta={cuenta} onSubmit={vincular} cargando={cargando === "vincular"} />
      )}

      {paso === "verificar" && cuenta && (
        <Card className="space-y-4">
          <p className="text-sm text-muted">Paso 2 de 2</p>
          <p>
            Para probar que <strong>{cuenta.game_name}#{cuenta.tag_line}</strong> es tuya, poné este
            ícono de perfil:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono chico de Data Dragon */}
          <img
            src={cuenta.icono_url}
            alt={`Ícono de verificación ${cuenta.icono_verificacion}`}
            width={96}
            height={96}
            className="mx-auto rounded-lg border-2 border-accent"
          />
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Abrí el cliente de LoL y entrá a tu perfil.</li>
            <li>Hacé clic en tu ícono → elegí el de arriba → guardar.</li>
            <li>Volvé acá y tocá &quot;Verificar&quot;. Después podés volver a tu ícono de siempre.</li>
          </ol>
          <p className="text-xs text-muted">
            Tenés 15 minutos (hasta las{" "}
            {new Date(cuenta.verificacion_expira).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            ).
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={verificar} loading={cargando === "verificar"}>
              Verificar
            </Button>
            <Button variante="secundario" onClick={() => setPaso("datos")} disabled={!!cargando}>
              Cambiar cuenta
            </Button>
            <Link href="/" className={claseBoton("ghost")}>
              Verificar después
            </Link>
          </div>
          <p className="text-xs text-muted">
            Si verificás después, tu perfil muestra el badge &quot;no verificada&quot;.
          </p>
        </Card>
      )}

      {paso === "listo" && cuenta && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong>
              {cuenta.game_name}#{cuenta.tag_line}
            </strong>
            <Badge tono="neutro">{PLATAFORMAS[cuenta.plataforma]?.label}</Badge>
            <Badge tono="success">✓ Verificada</Badge>
          </div>
          {"rango_tier" in cuenta && (
            <p className="text-sm text-muted">
              {labelRango(cuenta.rango_tier, cuenta.rango_division, cuenta.rango_lp)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={sincronizar} loading={cargando === "sync"}>
              Actualizar datos de Riot
            </Button>
          </div>
        </Card>
      )}

      {aviso && <p className="text-sm text-muted">{aviso}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FormDatos({ cuenta, onSubmit, cargando }) {
  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit(String(form.get("riotId")), String(form.get("plataforma")));
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">Paso 1 de 2</p>
      <Input
        label="Riot ID"
        name="riotId"
        required
        placeholder="Nombre#TAG"
        defaultValue={cuenta ? `${cuenta.game_name}#${cuenta.tag_line}` : ""}
        ayuda="Lo ves arriba a la derecha en el cliente de Riot, con el # y el tag."
      />
      <Select
        label="Región"
        name="plataforma"
        opciones={opcionesPlataforma}
        defaultValue={cuenta?.plataforma ?? PLATAFORMA_DEFAULT}
      />
      <Button type="submit" loading={cargando} className="w-full">
        {cargando ? "Buscando cuenta..." : "Continuar"}
      </Button>
    </Card>
  );
}
