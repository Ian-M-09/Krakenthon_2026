import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getVersion, urlIconoPerfil } from "@/lib/riot/ddragon";
import Spinner from "@/components/ui/Spinner";
import VincularCliente from "./VincularCliente";

export const metadata = { title: "Vincular cuenta de LoL" };

export default function VincularPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Tu cuenta de League of Legends</h1>
      <Suspense fallback={<Spinner />}>
        <EstadoCuenta />
      </Suspense>
    </main>
  );
}

// Lee la cuenta actual (si hay) y arranca la UI en el paso que corresponde.
async function EstadoCuenta() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: cuenta }, version] = await Promise.all([
    supabase
      .from("cuentas_riot")
      .select(
        "game_name, tag_line, plataforma, verificada, icono_verificacion, verificacion_expira, rango_tier, rango_division, rango_lp, sincronizado_en"
      )
      .eq("usuario_id", user.id)
      .maybeSingle(),
    getVersion(),
  ]);

  const inicial = cuenta && {
    ...cuenta,
    icono_url:
      cuenta.icono_verificacion != null ? urlIconoPerfil(version, cuenta.icono_verificacion) : null,
  };

  return <VincularCliente inicial={inicial} />;
}
