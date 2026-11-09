// Créditos + aviso legal. El disclaimer de Riot es obligatorio según sus políticas (docs/04-riot-api.md).
const GITHUB_AUTOR = "https://github.com/Ian-M-09";
const ANIO = 2026; // fijo: con cacheComponents, new Date() en el layout obligaría a renderizarlo por request

export default function Footer() {
  return (
    <footer className="space-y-2 border-t border-border px-4 py-6 text-center text-xs text-muted">
      <p>
        Desarrollado por{" "}
        <a
          href={GITHUB_AUTOR}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-text underline-offset-2 hover:text-accent hover:underline"
        >
          Ian Miño
        </a>{" "}
        · © {ANIO} Krakethon. Todos los derechos reservados.
      </p>
      <p className="mx-auto max-w-3xl">
        Krakethon es un desarrollo personal e independiente. No está respaldado por Riot Games y no
        refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o
        gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son
        marcas comerciales o marcas registradas de Riot Games, Inc.
      </p>
    </footer>
  );
}
